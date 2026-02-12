const db = require('./backend/config/database');

console.log('=== Testing Staff Query ===');

try {
    const staff = db.prepare("SELECT * FROM users WHERE role != 'admin' ORDER BY name").all();
    console.log('Staff count:', staff.length);
    console.log('Staff members:');
    staff.forEach(s => {
        console.log(`  ${s.name}: ${s.role}`);
    });
} catch (error) {
    console.error('Query error:', error.message);
}
