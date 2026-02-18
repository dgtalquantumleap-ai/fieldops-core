const db = require('./backend/config/database');

try {
  console.log('Checking database tables...');
  
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Available tables:');
  tables.forEach(t => console.log('  - ' + t.name));
  
  // Check if staff table exists
  const staffTableExists = tables.some(t => t.name === 'staff');
  console.log('\nStaff table exists:', staffTableExists);
  
  if (!staffTableExists) {
    console.log('Creating staff table...');
    
    // Create staff table
    db.prepare(`
      CREATE TABLE IF NOT EXISTS staff (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        role TEXT DEFAULT 'Staff',
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    
    console.log('✅ Staff table created');
    
    // Insert sample staff member
    const result = db.prepare(`
      INSERT INTO staff (name, email, phone, role) 
      VALUES (?, ?, ?, ?)
    `).run('John Staff', 'staff@stiltheights.com', '+1-555-0123', 'Staff');
    
    console.log('✅ Sample staff member created (ID:', result.lastInsertRowid, ')');
  }
  
} catch (error) {
  console.error('❌ Database error:', error.message);
}
