const db = require('./backend/config/database');

console.log('=== Checking Service ID 4 ===');

try {
    // Check service ID 4
    const service = db.prepare('SELECT * FROM services WHERE id = 4').get();
    
    if (service) {
        console.log('✅ Service ID 4 found:');
        console.log(`   Name: ${service.name}`);
        console.log(`   Price: ${service.price}`);
        console.log(`   Description: ${service.description}`);
    } else {
        console.log('❌ Service ID 4 not found');
    }
    
    // Check all services
    const allServices = db.prepare('SELECT * FROM services ORDER BY id').all();
    console.log(`\nAll services (${allServices.length}):`);
    allServices.forEach(service => {
        console.log(`  ID: ${service.id} - ${service.name}`);
    });
    
    // Test the jobs query manually
    console.log('\n=== Testing Jobs Query ===');
    const jobsQuery = db.prepare(`
        SELECT j.*, 
               c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
               u.name as staff_name, u.email as staff_email,
               s.name as service_name, s.price as service_price, s.description as service_description
        FROM jobs j
        LEFT JOIN customers c ON j.customer_id = c.id
        LEFT JOIN users u ON j.assigned_to = u.id
        LEFT JOIN services s ON j.service_id = s.id
        ORDER BY j.created_at DESC
        LIMIT 10
    `);
    
    const jobs = jobsQuery.all();
    console.log(`\nJobs query returned ${jobs.length} jobs`);
    
    // Look for job ID 21 specifically
    const job21 = jobs.find(job => job.id === 21);
    if (job21) {
        console.log('✅ Job ID 21 found in query results');
        console.log(`   Customer: ${job21.customer_name}`);
        console.log(`   Service: ${job21.service_name}`);
    } else {
        console.log('❌ Job ID 21 NOT found in query results');
        
        // Check if job 21 exists without joins
        const rawJob21 = db.prepare('SELECT * FROM jobs WHERE id = 21').get();
        if (rawJob21) {
            console.log('✅ Job ID 21 exists in raw jobs table');
            console.log(`   Customer ID: ${rawJob21.customer_id}`);
            console.log(`   Service ID: ${rawJob21.service_id}`);
        } else {
            console.log('❌ Job ID 21 not found in raw jobs table');
        }
    }
    
} catch (error) {
    console.error('Error checking service:', error.message);
}
