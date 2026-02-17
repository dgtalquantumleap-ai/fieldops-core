const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const dbPath = './backend/fieldops.db';
const sqlPath = './backend/scripts/create-scheduling-tables.sql';

console.log('🗄️ Creating scheduling tables...');

// Read SQL file
const sql = fs.readFileSync(sqlPath, 'utf8');

// Connect to database
const db = new sqlite3.Database(dbPath);

// Execute SQL
db.exec(sql, (err) => {
    if (err) {
        console.error('❌ Error creating tables:', err);
    } else {
        console.log('✅ Scheduling tables created successfully');
    }
});

// Close database
db.close();
