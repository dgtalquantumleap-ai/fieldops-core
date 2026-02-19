#!/usr/bin/env node
/**
 * Reset Admin Password
 * Sets the password for the existing admin account
 */

const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbPath = path.join(__dirname, 'fieldops.db');

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║           ADMIN PASSWORD RESET UTILITY                     ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

try {
  const db = new Database(dbPath);
  
  // Define which admin accounts to reset
  const adminAccounts = [
    { email: 'dgtalquantumleap@gmail.com', password: 'Admin@123456' },
    { email: 'admin@stiltheights.com', password: 'Admin@12345678' }
  ];
  
  console.log('🔄 Resetting admin passwords...\n');
  
  adminAccounts.forEach(account => {
    const user = db.prepare('SELECT id, email, role FROM users WHERE email = ?').get(account.email);
    
    if (user && user.role === 'admin') {
      const hashedPassword = bcrypt.hashSync(account.password, 10);
      db.prepare('UPDATE users SET password = ? WHERE id = ?')
        .run(hashedPassword, user.id);
      
      console.log(`✅ Password reset for: ${account.email}`);
      console.log(`   Password: ${account.password}\n`);
    } else {
      console.log(`⚠️  Admin account not found: ${account.email}\n`);
    }
  });
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                  PASSWORDS RESET COMPLETE                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log('📌 YOU CAN NOW LOGIN WITH EITHER:\n');
  console.log('Option 1 (Recommended):');
  console.log('   Email:    admin@stiltheights.com');
  console.log('   Password: Admin@12345678\n');
  
  console.log('Option 2:');
  console.log('   Email:    dgtalquantumleap@gmail.com');
  console.log('   Password: Admin@123456\n');
  
  console.log('🚀 Try logging in now!\n');
  
  db.close();

} catch (err) {
  console.error('\n❌ ERROR:', err.message);
  process.exit(1);
}
