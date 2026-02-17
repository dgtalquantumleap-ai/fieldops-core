const axios = require('axios');

async function resetAdminPassword() {
    try {
        console.log('🔄 Creating new admin user...');
        
        // First, try to register a new admin user
        try {
            const registerResponse = await axios.post('https://fieldops-production-6b97.up.railway.app/api/auth/register', {
                name: 'Admin User',
                email: 'admin@fieldops.com',
                password: 'admin123',
                phone: '555-123-4567',
                role: 'admin'
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('✅ New admin user created successfully!');
            console.log('📧 Email: admin@fieldops.com');
            console.log('🔑 Password: admin123');
            
        } catch (registerError) {
            console.log('⚠️  Registration failed, trying login with new admin...');
            
            // If registration fails, try to login with the new admin
            try {
                const loginResponse = await axios.post('https://fieldops-production-6b97.up.railway.app/api/auth/login', {
                    email: 'admin@fieldops.com',
                    password: 'admin123'
                }, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log('✅ Login successful with admin@fieldops.com!');
                console.log('📧 Email: admin@fieldops.com');
                console.log('🔑 Password: admin123');
                console.log('🎫 Token:', loginResponse.data.token?.substring(0, 50) + '...');
                
            } catch (loginError) {
                console.log('❌ Both registration and login failed');
                console.log('Registration error:', registerError.response?.data || registerError.message);
                console.log('Login error:', loginError.response?.data || loginError.message);
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

resetAdminPassword();
