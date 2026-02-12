const db = require('./backend/config/database');

console.log('=== Checking New Job from Booking ===');

try {
    // Check all recent jobs
    const jobs = db.prepare(`
        SELECT j.*, c.name as customer_name, c.email as customer_email, s.name as service_name
        FROM jobs j
        LEFT JOIN customers c ON j.customer_id = c.id
        LEFT JOIN services s ON j.service_id = s.id
        ORDER BY j.created_at DESC 
        LIMIT 5
    `).all();
    
    console.log(`Total recent jobs found: ${jobs.length}`);
    
    jobs.forEach((job, index) => {
        console.log(`\n${index + 1}. Job ID: ${job.id}`);
        console.log(`   Customer: ${job.customer_name}`);
        console.log(`   Email: ${job.customer_email}`);
        console.log(`   Service: ${job.service_name}`);
        console.log(`   Date: ${job.job_date}`);
        console.log(`   Time: ${job.job_time}`);
        console.log(`   Location: ${job.location}`);
        console.log(`   Status: ${job.status}`);
        console.log(`   Notes: ${job.notes}`);
        console.log(`   Created: ${job.created_at}`);
    });
    
    // Check if there's a job for olumide Akinsola
    const specificJob = db.prepare(`
        SELECT j.*, c.name as customer_name, c.email as customer_email, s.name as service_name
        FROM jobs j
        LEFT JOIN customers c ON j.customer_id = c.id
        LEFT JOIN services s ON j.service_id = s.id
        WHERE c.name LIKE '%olumide%' OR c.email = 'info@ebenova.net'
        ORDER BY j.created_at DESC
    `).all();
    
    if (specificJob.length > 0) {
        console.log(`\n✅ Found job for olumide Akinsola:`);
        specificJob.forEach(job => {
            console.log(`   Job ID: ${job.id}`);
            console.log(`   Customer: ${job.customer_name}`);
            console.log(`   Email: ${job.customer_email}`);
            console.log(`   Service: ${job.service_name}`);
            console.log(`   Date: ${job.job_date} at ${job.job_time}`);
            console.log(`   Location: ${job.location}`);
            console.log(`   Status: ${job.status}`);
        });
    } else {
        console.log('\n❌ No job found for olumide Akinsola');
    }
    
    // Check for any jobs created today
    const todayJobs = db.prepare(`
        SELECT j.*, c.name as customer_name, s.name as service_name
        FROM jobs j
        LEFT JOIN customers c ON j.customer_id = c.id
        LEFT JOIN services s ON j.service_id = s.id
        WHERE DATE(j.created_at) = DATE('now')
        ORDER BY j.created_at DESC
    `).all();
    
    console.log(`\nJobs created today (${todayJobs.length}):`);
    todayJobs.forEach(job => {
        console.log(`  - ${job.customer_name}: ${job.service_name} on ${job.job_date}`);
    });
    
} catch (error) {
    console.error('Error checking jobs:', error.message);
}
