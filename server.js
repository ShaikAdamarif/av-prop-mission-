const express = require('express');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

const dataDir = process.env.RENDER ? '/var/data' : path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'avprop.db'));

db.exec(`
CREATE TABLE IF NOT EXISTS app_data (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  actor_role TEXT,
  actor_email TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  payload TEXT
);

INSERT OR IGNORE INTO app_data (id, json) VALUES (1, '{}');
`);

app.use(express.json({ limit: '20mb' }));
app.use(express.static(__dirname));

app.get('/api/data', (req, res) => {
  const row = db.prepare('SELECT json FROM app_data WHERE id = 1').get();
  res.json(JSON.parse(row.json || '{}'));
});

app.post('/api/data', (req, res) => {
  const data = req.body || {};
  db.prepare('UPDATE app_data SET json = ? WHERE id = 1')
    .run(JSON.stringify(data));

  db.prepare(`
    INSERT INTO audit_log (event_type, payload)
    VALUES (?, ?)
  `).run('save', JSON.stringify({
    keys: Object.keys(data),
    timestamp: new Date().toISOString()
  }));

  res.json({ success: true });
});

app.get('/api/audit-log', (req, res) => {
  const rows = db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 500').all();
  res.json(rows);
});

app.listen(PORT, () => {
  console.log(`AV PROP MISSION running on http://localhost:${PORT}`);
  console.log(`Database file: ${path.join(dataDir, 'avprop.db')}`);
});