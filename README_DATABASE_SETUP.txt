AV PROP MISSION - Full SQL Database Edition

This package includes:
- SQLite database (better-sqlite3)
- Express backend server
- Automatic saving of all app data
- Shared data across all devices
- Persistent storage for:
  - User logins
  - HR logins
  - Admin logins
  - Projects
  - Assignments
  - Submissions
  - Callback requests
  - Offer letters
  - Registration requests

Local Setup:
1. Install Node.js 22 LTS
2. Run:
   npm install
   npm start
3. Open:
   http://localhost:3000

Database file:
- Local: data/avprop.db
- Render: /var/data/avprop.db

Deployment:
- Recommended: Render (render.yaml included)
- Netlify cannot host this database backend because Netlify does not support persistent Node.js servers.