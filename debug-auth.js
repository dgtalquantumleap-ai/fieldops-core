const http = require('http');

// Debug authentication
async function debugAuth() {
    return new Promise((resolve, reject) => {
        const loginData = JSON.stringify({
            email: 'admin@fieldops.com',
            password: 'admin123'
        });

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(loginData)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                console.log('Login Status:', res.statusCode);
                console.log('Login Response:', data);
                
                try {
                    const response = JSON.parse(data);
                    if (response.token) {
                        console.log('Token obtained:', response.token.substring(0, 50) + '...');
                        
                        // Now test the staff management endpoint with this token
                        testStaffEndpoint(response.token);
                    } else {
                        console.log('No token in response');
                    }
                } catch (e) {
                    console.log('Failed to parse login response:', e.message);
                }
            });
        });

        req.on('error', reject);
        req.write(loginData);
        req.end();
    });
}

function testStaffEndpoint(token) {
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/staff-management',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            console.log('\nStaff Management Status:', res.statusCode);
            console.log('Staff Management Response:', data);
        });
    });

    req.on('error', (error) => {
        console.log('Staff endpoint error:', error.message);
    });

    req.end();
}

debugAuth();
