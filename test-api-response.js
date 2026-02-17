const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'fieldops.db');

try {
  const db = new Database(dbPath);
  
  console.log('🔍 Simulating API /api/booking/services response:\n');
  
  const services = db.prepare(
    'SELECT id, name, price, description FROM services WHERE is_active = 1 ORDER BY name'
  ).all();
  
  const response = {
    success: true,
    data: services,
    count: services.length
  };
  
  console.log('Response object:');
  console.log(JSON.stringify(response, null, 2));
  
  console.log('\n✅ Services returned:', services.length);
  console.log('Expected format: { success: true, data: [...], count: N }');
  console.log('Frontend expects: result.data || result');
  
  if (services.length === 0) {
    console.log('\n❌ ERROR: No services in database!');
  } else {
    console.log('\n✅ Database has services - API should work');
  }
  
  db.close();
  
} catch (error) {
  console.error('❌ Error:', error.message);
}
