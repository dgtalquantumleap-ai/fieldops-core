const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

// This script would need to run on the production server
// For now, let's create a local admin user with known credentials

async function createKnownAdmin() {
    try {
        console.log('🔧 Creating admin user with known credentials...');
        
        // Hash the password
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        console.log('📝 Hashed password:', hashedPassword);
        
        // SQL to update admin user password
        const updateSQL = `
            UPDATE users 
            SET password = ? 
            WHERE email = 'dgtalquantumleap@gmail.com'
        `;
        
        console.log('🔄 SQL to execute:');
        console.log(updateSQL);
        console.log('📧 With password hash:', hashedPassword);
        
        console.log('\n💡 To fix this issue:');
        console.log('1. SSH into the Railway production server');
        console.log('2. Navigate to the app directory');
        console.log('3. Run this SQL command:');
        console.log(`   sqlite3 /app/fieldops.db "${updateSQL.replace('?', `'${hashedPassword}'`)}"`);
        console.log('4. Or create a simple script to update the password');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

createKnownAdmin();
