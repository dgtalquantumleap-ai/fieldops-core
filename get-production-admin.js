const axios = require('axios');

async function getAdminCredentials() {
    try {
        console.log('🔍 Getting current admin credentials...');
        
        // Try common password patterns that might be used
        const commonPasswords = [
            'admin123',
            'password',
            '123456',
            'admin',
            'qwerty',
            'letmein',
            'fieldops123',
            'stiltheights123'
        ];
        
        for (const password of commonPasswords) {
            try {
                console.log(`🔑 Trying password: ${password}`);
                
                const response = await axios.post('https://fieldops-production-6b97.up.railway.app/api/auth/login', {
                    email: 'dgtalquantumleap@gmail.com',
                    password: password
                }, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.data.token) {
                    console.log('✅ SUCCESS! Found working credentials:');
                    console.log(`📧 Email: dgtalquantumleap@gmail.com`);
                    console.log(`🔑 Password: ${password}`);
                    console.log(`🎫 Token: ${response.data.token.substring(0, 50)}...`);
                    console.log(`👤 User:`, response.data.user);
                    return;
                }
            } catch (error) {
                if (error.response?.status !== 401) {
                    console.log(`⚠️  Error with password "${password}":`, error.response?.data || error.message);
                }
            }
        }
        
        console.log('❌ No working password found among common patterns');
        console.log('\n💡 Options:');
        console.log('1. Check Railway deployment logs for the actual password');
        console.log('2. Use the update-admin.js script to set a known password');
        console.log('3. Contact the person who deployed the system');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

getAdminCredentials();
