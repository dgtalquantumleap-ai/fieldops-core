const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'fieldops.db'));

console.log('🔍 Checking users table schema...');

try {
    const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get();
    if (schema) {
        console.log('Users table schema:');
        console.log(schema.sql);
    } else {
        console.log('❌ Users table not found');
    }
    
    // Check columns
    const columns = db.prepare("PRAGMA table_info(users)").all();
    console.log('\n📋 Users table columns:');
    console.table(columns);
    
    // Check sample data
    const sample = db.prepare("SELECT * FROM users LIMIT 3").all();
    console.log('\n📄 Sample data:');
    console.table(sample);
    
} catch (error) {
    console.error('❌ Error:', error);
} finally {
    db.close();
}
