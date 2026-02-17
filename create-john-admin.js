import db from './backend/config/database.js';
import bcrypt from 'bcryptjs';

console.log('🔍 Checking users table structure...\n');

try {
    // Get table schema
    const schema = db.prepare("PRAGMA table_info(users)").all();
    
    console.log('📋 Users table columns:');
    schema.forEach(column => {
        console.log(`   ${column.name}: ${column.type} ${column.notnull ? 'NOT NULL' : 'NULL'} ${column.pk ? '(PRIMARY KEY)' : ''}`);
    });
    
    // Check if updated_at column exists
    const hasUpdatedAt = schema.some(col => col.name === 'updated_at');
    
    if (!hasUpdatedAt) {
        console.log('\n➕ Adding updated_at column...');
        db.prepare('ALTER TABLE users ADD COLUMN updated_at TEXT').run();
        console.log('✅ updated_at column added successfully');
    } else {
        console.log('\n✅ updated_at column already exists');
    }
    
    // Now create john@fieldops.com user
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get('john@fieldops.com');
    
    if (!existingUser) {
        console.log('\n👤 Creating john@fieldops.com admin user...');
        
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const now = new Date().toISOString();
        
        const result = db.prepare(`
            INSERT INTO users (name, email, password, role, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run('John Admin', 'john@fieldops.com', hashedPassword, 'admin', now, now);
        
        console.log(`✅ Created john@fieldops.com admin user with ID: ${result.lastInsertRowid}`);
        console.log(`🔑 Password: admin123 (change after first login)`);
    } else {
        console.log('\n✅ john@fieldops.com already exists');
    }
    
    // Verify creation
    const johnUser = db.prepare('SELECT id, name, email, role FROM users WHERE email = ?').get('john@fieldops.com');
    
    if (johnUser) {
        console.log('\n🎉 SUCCESS! Admin credentials ready:');
        console.log(`   📧 Email: ${johnUser.email}`);
        console.log(`   👤 Name: ${johnUser.name}`);
        console.log(`   🔑 Role: ${johnUser.role}`);
        console.log(`   🔐 Password: admin123`);
        console.log(`\n🌐 Login at: http://localhost:3000/admin`);
    }
    
} catch (error) {
    console.error('❌ Error:', error.message);
}

process.exit(0);
