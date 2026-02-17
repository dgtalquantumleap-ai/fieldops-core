const sqlite3 = require('sqlite3').verbose();

// Check if bcrypt is available in the project
let bcrypt;
try {
    bcrypt = require('bcrypt');
} catch (e) {
    console.log('❌ bcrypt not available, using simple hash');
    // Fallback to simple hash (not secure for production)
    const crypto = require('crypto');
    bcrypt = {
        hashSync: (password, salt) => crypto.createHash('sha256').update(password + salt).digest('hex')
    };
}

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
        
        // Also check if we need to update the production database
        console.log('');
        console.log('🔄 If this doesn\'t work, you may need to:');
        console.log('1. Check if the production database has been updated');
        console.log('2. Try the admin credentials: john@fieldops.com / admin123');
        console.log('3. Or create a new admin user in production');
    }
    
    db.close();
});
