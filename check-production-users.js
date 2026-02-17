const axios = require('axios');

async function checkUsers() {
    try {
        console.log('🔍 Checking production users...');
        
        // Try to login with the documented credentials
        const response = await axios.post('https://fieldops-production-6b97.up.railway.app/api/auth/login', {
            email: 'dgtalquantumleap@gmail.com',
            password: 'admin123'
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Login successful!');
        console.log('Token:', response.data.token?.substring(0, 20) + '...');
        console.log('User:', response.data.user);
        
    } catch (error) {
        console.log('❌ Login failed:', error.response?.data || error.message);
        
        // Try to get users list (might be protected)
        try {
            const usersResponse = await axios.get('https://fieldops-production-6b97.up.railway.app/api/users', {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            console.log('Users:', usersResponse.data);
        } catch (usersError) {
            console.log('❌ Cannot fetch users:', usersError.response?.data || usersError.message);
        }
    }
}

checkUsers();
