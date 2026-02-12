const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'fieldops.db'));

console.log('🔍 Checking admin user...');

try {
    const admin = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@fieldops.com');
    
    if (admin) {
        console.log('✅ Admin user found:');
        console.table(admin);
        
        // Check if role needs to be updated
        if (admin.role !== 'admin') {
            console.log('\n🔧 Updating admin role...');
            db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', admin.id);
            console.log('✅ Admin role updated to "admin"');
        }
    } else {
        console.log('❌ Admin user not found');
    }
    
    // Check all users
    const allUsers = db.prepare('SELECT id, name, email, role, status FROM users').all();
    console.log('\n📋 All users:');
    console.table(allUsers);
    
} catch (error) {
    console.error('❌ Error:', error);
} finally {
    db.close();
}
