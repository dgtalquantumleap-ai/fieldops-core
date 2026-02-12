const db = require('./backend/config/database');

console.log('=== User Roles Analysis ===');

try {
    const users = db.prepare("SELECT id, name, role FROM users").all();
    console.log('All users and their roles:');
    users.forEach(user => {
        console.log(`  ${user.name}: role = "${user.role}"`);
    });
    
    // Test the staff query
    console.log('\n=== Testing Staff Query ===');
    try {
        const staffQuery = db.prepare('SELECT * FROM users WHERE role != "admin" ORDER BY name');
        const staff = staffQuery.all();
        console.log('Staff query result:', staff.length, 'staff members');
        staff.forEach(staff => {
            console.log(`  ${staff.name}: ${staff.role}`);
        });
    } catch (err) {
        console.log('Staff query error:', err.message);
    }
    
} catch (error) {
    console.error('Error:', error.message);
}
