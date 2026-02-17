const axios = require('axios');

async function testJobCompletion() {
    try {
        console.log('🔧 Testing Job Completion API...');
        
        // Login first
        const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
            email: 'dgtalquantumleap@gmail.com',
            password: 'admin123'
        });
        
        const token = loginResponse.data.token;
        const headers = { 'Authorization': `Bearer ${token}` };
        
        // First, check available jobs
        console.log('\n📋 Checking available jobs...');
        const jobsResponse = await axios.get('http://localhost:3000/api/jobs?page=1&limit=10', { headers });
        console.log('   Jobs found:', jobsResponse.data.data?.length || 0);
        
        if (jobsResponse.data.data && jobsResponse.data.data.length > 0) {
            const jobId = jobsResponse.data.data[0].id;
            console.log('   Using Job ID:', jobId);
            console.log('   Current Status:', jobsResponse.data.data[0].status);
            
            // Now try to mark it as completed
            console.log('\n✅ Marking job as completed...');
            const updateResponse = await axios.patch(`http://localhost:3000/api/jobs/${jobId}/status`, {
                status: 'completed'
            }, { headers });
            
            console.log('   Success:', updateResponse.data.success);
            console.log('   Message:', updateResponse.data.message);
        } else {
            console.log('   No jobs found to test with');
        }
        
    } catch (error) {
        console.log('❌ Test failed:');
        if (error.response) {
            console.log('   Status:', error.response.status);
            console.log('   Data:', error.response.data);
        } else {
            console.log('   Error:', error.message);
        }
    }
}

testJobCompletion();
