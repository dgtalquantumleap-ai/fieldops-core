const sqlite3 = require('sqlite3').verbose();

const dbPath = './backend/fieldops.db';
const db = new sqlite3.Database(dbPath);

console.log('🔍 Checking database and providing login credentials...');

// Check if users table exists
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
    if (err) {
        console.error('❌ Database error:', err);
        return;
    }
    
    if (!row) {
        console.log('❌ Users table not found in local database');
        console.log('');
        console.log('🌐 PRODUCTION LOGIN CREDENTIALS:');
        console.log('📧 Email: john@fieldops.com');
        console.log('🔑 Password: admin123');
        console.log('🌐 URL: https://fieldops-production-6b97.up.railway.app/admin/login.html');
        console.log('');
        console.log('📧 Email: dgtalquantumleap@gmail.com');
        console.log('🔑 Password: fieldops123');
        console.log('🌐 URL: https://fieldops-production-6b97.up.railway.app/admin/login.html');
        console.log('');
        console.log('🎯 Try these credentials to log in');
    } else {
        console.log('✅ Users table found');
        
        // Get all users
        db.all('SELECT email, name, role FROM users WHERE is_active = 1', (err, rows) => {
            if (err) {
                console.error('❌ Error:', err);
                return;
            }
            
            console.log('📋 Active users in database:');
            rows.forEach(user => {
                console.log(`👤 ${user.name} (${user.email}) - ${user.role}`);
            });
            
            console.log('');
            console.log('🔑 TRY THESE LOGIN CREDENTIALS:');
            console.log('');
            console.log('Option 1:');
            console.log('📧 Email: john@fieldops.com');
            console.log('🔑 Password: admin123');
            console.log('');
            console.log('Option 2:');
            console.log('📧 Email: dgtalquantumleap@gmail.com');
            console.log('🔑 Password: fieldops123');
            console.log('');
            console.log('🌐 Login URL: https://fieldops-production-6b97.up.railway.app/admin/login.html');
        });
    }
    
    db.close();
});
