const db = require('./backend/config/database');

try {
  const result = db.prepare('PRAGMA table_info(services)').all();
  console.log('Services table columns:');
  result.forEach(col => console.log(`  - ${col.name} (${col.type})`));
  
  const services = db.prepare('SELECT * FROM services LIMIT 5').all();
  console.log('\nSample services:');
  services.forEach(service => console.log(`  - ${service.name}: $${service.price}`));
} catch (e) {
  console.log('Error:', e.message);
}
