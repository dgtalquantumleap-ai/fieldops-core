const db = require('./backend/config/database');

console.log('=== Users Table Analysis ===');

try {
    // Get table structure
    const schema = db.prepare("PRAGMA table_info(users)").all();
    console.log('Users table structure:');
    schema.forEach(col => {
        console.log(`  ${col.name}: ${col.type}`);
    });
    
    // Get all users
    const users = db.prepare("SELECT * FROM users LIMIT 5").all();
    console.log('\nSample users:');
    users.forEach(user => {
        console.log(user);
    });
    
} catch (error) {
    console.error('Error:', error.message);
}
