const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const sql = fs.readFileSync('./db/update.sql', 'utf8');
const db = new sqlite3.Database('./db/app.db'); 

db.exec(sql, (err) => {
    if (err) {
        console.error('Error updating database:', err);
    } else {
        console.log('Database updated successfully');
    }
    db.close();
});
