const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const dbPath = './backend/fieldops.db';
const db = new sqlite3.Database(dbPath);

console.log('🔧 Resetting password for dgtalquantumleap@gmail.com...');

const email = 'dgtalquantumleap@gmail.com';
const newPassword = 'fieldops123';

// Hash the new password
const hashedPassword = bcrypt.hashSync(newPassword, 10);

// Update the password
db.run(`
    UPDATE users 
    SET password = ?, updated_at = datetime('now')
    WHERE email = ?
`, [hashedPassword, email], function(err) {
    if (err) {
        console.error('❌ Error updating password:', err);
    } else {
        console.log('✅ Password reset successful!');
        console.log('');
        console.log('📧 Email:', email);
        console.log('🔑 New Password:', newPassword);
        console.log('🌐 Login URL: https://fieldops-production-6b97.up.railway.app/admin/login.html');
        console.log('');
        console.log('🎯 Try logging in with these credentials');
    }
    
    db.close();
});
