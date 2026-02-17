const db = require('./backend/config/database');

try {
  console.log('🔍 Testing job query...');
  
  // Test the exact query that's failing
  const jobDetails = db.prepare(`
    SELECT j.*, 
           c.name as customer_name, c.email as customer_email,
           COALESCE(u.name, 'Staff') as staff_name,
           COALESCE(s.name, 'Service') as service_name, 
           COALESCE(s.price, 0) as service_price
    FROM jobs j
    LEFT JOIN customers c ON j.customer_id = c.id
    LEFT JOIN users u ON j.assigned_to = u.id
    LEFT JOIN services s ON j.service_id = s.id
    WHERE j.id = ?
  `).get(3);
  
  console.log('✅ Job query successful:');
  console.log('   Job found:', !!jobDetails);
  if (jobDetails) {
    console.log('   Customer:', jobDetails.customer_name);
    console.log('   Email:', jobDetails.customer_email);
    console.log('   Service:', jobDetails.service_name);
  }
  
} catch (error) {
  console.log('❌ Job query failed:');
  console.log('   Error:', error.message);
  console.log('   Code:', error.code);
}
