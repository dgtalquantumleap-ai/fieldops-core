const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

async function setPermanentAdmin() {
    try {
        console.log('🔧 Setting permanent admin credentials...');
        
        // Hash the permanent password
        const hashedPassword = await bcrypt.hash('FieldOps2024!', 10);
        
        console.log('📝 Hashed password:', hashedPassword);
        
        // SQL to update admin user
        const updateSQL = `
            UPDATE users 
            SET password = ? 
            WHERE email = 'dgtalquantumleap@gmail.com'
        `;
        
        console.log('\n💡 To set permanent password:');
        console.log('1. Add this to Railway environment variables:');
        console.log('   ADMIN_PASSWORD=FieldOps2024!');
        console.log('2. Update setupDb.js to use this password');
        console.log('3. Or run this SQL in production:');
        console.log(`   UPDATE users SET password = '${hashedPassword}' WHERE email = 'dgtalquantumleap@gmail.com';`);
        
        console.log('\n🔐 New permanent credentials:');
        console.log('📧 Email: dgtalquantumleap@gmail.com');
        console.log('🔑 Password: FieldOps2024!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

setPermanentAdmin();
