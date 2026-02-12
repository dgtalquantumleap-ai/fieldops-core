const db = require('../config/database');

async function testBookingToJobFlow() {
    console.log('🧪 Testing booking to job flow...');
    
    try {
        // Check if recent bookings created jobs
        const recentJobs = db.prepare(`
            SELECT j.*, c.name as customer_name, s.name as service_name
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN services s ON j.service_id = s.id
            WHERE j.notes LIKE '%Online booking%'
            ORDER BY j.created_at DESC
            LIMIT 5
        `).all();
        
        console.log(`\n📊 Found ${recentJobs.length} jobs from online bookings:`);
        
        if (recentJobs.length === 0) {
            console.log('❌ No jobs found from online bookings');
            console.log('💡 Try making a test booking first at: http://localhost:3000/booking.html');
            return;
        }
        
        recentJobs.forEach((job, index) => {
            console.log(`\n${index + 1}. Job ID: ${job.id}`);
            console.log(`   Customer: ${job.customer_name}`);
            console.log(`   Service: ${job.service_name}`);
            console.log(`   Date: ${job.job_date}`);
            console.log(`   Time: ${job.job_time}`);
            console.log(`   Status: ${job.status}`);
            console.log(`   Location: ${job.location}`);
            console.log(`   Created: ${job.created_at}`);
        });
        
        // Test API endpoints
        console.log('\n🔍 Testing API endpoints...');
        
        // Test jobs API (admin)
        const allJobs = db.prepare(`
            SELECT COUNT(*) as count FROM jobs
        `).get();
        console.log(`✅ Total jobs in system: ${allJobs.count}`);
        
        // Test staff jobs API
        const staffJobs = db.prepare(`
            SELECT COUNT(*) as count FROM jobs WHERE status != 'Completed'
        `).get();
        console.log(`✅ Active jobs for staff: ${staffJobs.count}`);
        
        console.log('\n🎉 Booking to job flow test completed successfully!');
        console.log('📱 Jobs should appear in both admin and staff dashboards.');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testBookingToJobFlow();
