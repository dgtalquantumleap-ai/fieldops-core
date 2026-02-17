import db from './backend/config/database.js';
import bcrypt from 'bcryptjs';

async function checkAdminUsers() {
    console.log('🔍 Checking admin users in database...\n');

    try {
    // Check all users
    const users = db.prepare('SELECT id, name, email, role, created_at FROM users ORDER BY id').all();
    
    console.log(`📋 Found ${users.length} users:`);
    users.forEach(user => {
        console.log(`   ID: ${user.id} | Name: ${user.name} | Email: ${user.email} | Role: ${user.role} | Created: ${user.created_at}`);
    });
    
    // Check specifically for admin role
    const admins = db.prepare('SELECT id, name, email FROM users WHERE role = ?').all('admin');
    
    console.log(`\n👑 Admin users (${admins.length}):`);
    admins.forEach(admin => {
        console.log(`   ID: ${admin.id} | Name: ${admin.name} | Email: ${admin.email}`);
    });
    
    // Check if john@fieldops.com exists
    const johnUser = db.prepare('SELECT id, name, email, role FROM users WHERE email = ?').get('john@fieldops.com');
    
    if (johnUser) {
        console.log(`\n✅ Found john@fieldops.com:`);
        console.log(`   ID: ${johnUser.id} | Name: ${johnUser.name} | Role: ${johnUser.role}`);
    } else {
        console.log(`\n❌ john@fieldops.com NOT found in database`);
        console.log(`💡 Creating john@fieldops.com admin user...`);
        
        // Create john@fieldops.com admin user
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        const result = db.prepare(`
            INSERT INTO users (name, email, password, role, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run('John Admin', 'john@fieldops.com', hashedPassword, 'admin', new Date().toISOString(), new Date().toISOString());
        
        console.log(`✅ Created john@fieldops.com admin user with ID: ${result.lastInsertRowid}`);
        console.log(`🔑 Password: admin123 (change after first login)`);
    }
    
    } catch (error) {
        console.error('❌ Error checking users:', error.message);
    }
}

checkAdminUsers().then(() => process.exit(0));
