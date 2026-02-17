const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'fieldops.db');
console.log('📂 Database path:', dbPath);
console.log('');

try {
  const db = new Database(dbPath);
  
  // Check tables
  console.log('📋 Available tables:');
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();
  tables.forEach(t => console.log('   ✓', t.name));
  
  console.log('');
  
  // Check services
  console.log('🔍 Services table:');
  const services = db.prepare('SELECT * FROM services').all();
  console.log('   Count:', services.length);
  if (services.length > 0) {
    console.log('   Examples:');
    services.slice(0, 3).forEach(s => {
      console.log(`     - ${s.name} ($${s.price}) - Active: ${s.is_active}`);
    });
  } else {
    console.log('   ❌ NO SERVICES FOUND - Need to seed data!');
  }
  
  console.log('');
  
  // Check jobs
  console.log('🔍 Jobs table:');
  const jobs = db.prepare('SELECT COUNT(*) as count FROM jobs').get();
  console.log('   Count:', jobs.count);
  
  if (jobs.count > 0) {
    const latestJob = db.prepare('SELECT * FROM jobs ORDER BY created_at DESC LIMIT 1').get();
    console.log('   Latest job status:', latestJob.status);
    console.log('   Created:', latestJob.created_at);
  }
  
  console.log('');
  
  // Check users
  console.log('🔍 Users table:');
  const users = db.prepare('SELECT COUNT(*) as count FROM users').get();
  console.log('   Count:', users.count);
  if (users.count > 0) {
    console.log('   ✅ Admin users exist');
  } else {
    console.log('   ❌ NO USERS FOUND - Need to create admin!');
  }
  
  db.close();
  
} catch (error) {
  console.error('❌ Error:', error.message);
}
