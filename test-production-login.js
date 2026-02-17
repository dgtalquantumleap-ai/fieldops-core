const axios = require('axios');

async function testProductionLogin() {
    try {
        console.log('🧪 Testing Production Login...');
        
        const response = await axios.post('https://fieldops-production-6b97.up.railway.app/api/auth/login', {
                email: 'dgtalquantumleap@gmail.com',
                password: '1f7nfy6io1td'
        }, {
                headers: {
                        'Content-Type': 'application/json'
                }
        });
        
        console.log('✅ Login Response:', response.data);
        console.log('🎫 Token:', response.data.token ? 'SUCCESS' : 'FAILED');
        
    } catch (error) {
        console.log('❌ Login Error:', error.response?.data || error.message);
    }
}

testProductionLogin();
