const express = require('express');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

/*
=========================================================
DATABASE LOCATION
=========================================================
Priority:
1. DATABASE_PATH environment variable
2. /var/data/avprop.db on Render (persistent disk)
3. ./data/avprop.db for local development
=========================================================
*/

let dbPath;

if (process.env.DATABASE_PATH) {
  dbPath = process.env.DATABASE_PATH;
} else if (process.env.RENDER) {
  // Render persistent disk
  dbPath = '/var/data/avprop.db';
} else {
  // Local development
  const localDataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(localDataDir)) {
    fs.mkdirSync(localDataDir, { recursive: true });
  }
  dbPath = path.join(localDataDir, 'avprop.db');
}

// Ensure directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

console.log('Database Path:', dbPath);

// Open database
const db = new Database(dbPath);

// Better performance & reliability
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

// Create tables
db.exec(`
CREATE TABLE IF NOT EXISTS app_data (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  actor_role TEXT,
  actor_email TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  payload TEXT
);

INSERT OR IGNORE INTO app_data (id, json)
VALUES (1, '{}');
`);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static frontend files
app.use(express.static(__dirname));

/*
=========================================================
GET COMPLETE APPLICATION DATA
=========================================================
This returns everything:
- User registrations
- HR registrations
- Login accounts
- Applications
- Offer letters
- Dashboard data
=========================================================
*/
app.get('/api/data', (req, res) => {
  try {
    const row = db
      .prepare('SELECT json FROM app_data WHERE id = 1')
      .get();

    const data = row && row.json ? JSON.parse(row.json) : {};
    res.json(data);
  } catch (error) {
    console.error('GET /api/data error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/*
=========================================================
SAVE COMPLETE APPLICATION DATA
=========================================================
Stores all frontend data permanently
=========================================================
*/
app.post('/api/data', (req, res) => {
  try {
    const data = req.body || {};

    db.prepare(`
      UPDATE app_data
      SET json = ?
      WHERE id = 1
    `).run(JSON.stringify(data));

    db.prepare(`
      INSERT INTO audit_log (event_type, payload)
      VALUES (?, ?)
    `).run(
      'save',
      JSON.stringify({
        keys: Object.keys(data),
        timestamp: new Date().toISOString()
      })
    );

    res.json({
      success: true,
      message: 'Data saved successfully'
    });
  } catch (error) {
    console.error('POST /api/data error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/*
=========================================================
GET AUDIT LOG
=========================================================
*/
app.get('/api/audit-log', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT *
      FROM audit_log
      ORDER BY id DESC
      LIMIT 1000
    `).all();

    res.json(rows);
  } catch (error) {
    console.error('GET /api/audit-log error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/*
=========================================================
HEALTH CHECK
=========================================================
*/
app.get('/api/health', (req, res) => {
  try {
    const row = db.prepare('SELECT COUNT(*) AS count FROM app_data').get();

    res.json({
      success: true,
      status: 'OK',
      database: dbPath,
      rows: row.count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /api/health error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/*
=========================================================
FRONTEND ROUTING (Express 5 Compatible)
=========================================================
*/
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

/*
=========================================================
START SERVER
=========================================================
*/
app.listen(PORT, () => {
  console.log(`AV PROP MISSION running on port ${PORT}`);
  console.log(`Database file: ${dbPath}`);
});