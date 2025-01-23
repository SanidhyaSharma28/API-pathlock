// db.js

const sqlite3 = require('sqlite3').verbose();

// Set up the SQLite connection using the path from the .env file
const db = new sqlite3.Database(process.env.DB_PATH, (err) => {
    if (err) {
        console.error('Failed to connect to the database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

module.exports = db;  // Export db for use in other files
