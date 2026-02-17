const db = require('./backend/config/database');

try {
  const result = db.prepare('PRAGMA table_info(invoices)').all();
  console.log('Invoices table columns:');
  result.forEach(col => console.log(`  - ${col.name} (${col.type})`));
} catch (e) {
  console.log('Error:', e.message);
}
