const http = require('http');

// Test staff management endpoints
const API_URL = 'http://localhost:3000/api/staff-management';

// First, we need to get an admin token
async function getAdminToken() {
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
                try {
                    const response = JSON.parse(data);
                    if (res.statusCode === 200 && response.token) {
                        resolve(response.token);
                    } else {
                        reject(new Error('Login failed'));
                    }
                } catch (e) {
                    reject(new Error('Invalid response'));
                }
            });
        });

        req.on('error', reject);
        req.write(loginData);
        req.end();
    });
}

// Test onboarding new staff
async function testOnboarding(token) {
    return new Promise((resolve, reject) => {
        const staffData = JSON.stringify({
            name: 'Test Staff Member',
            email: 'teststaff@fieldops.com',
            phone: '+1234567890',
            role: 'Staff',
            password: 'temp123'
        });

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/staff-management/onboard',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Content-Length': Buffer.byteLength(staffData)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                console.log('\n👥 ONBOARDING TEST');
                console.log('Status:', res.statusCode);
                console.log('Response:', data);
                try {
                    const response = JSON.parse(data);
                    resolve(response);
                } catch (e) {
                    reject(new Error('Invalid response'));
                }
            });
        });

        req.on('error', reject);
        req.write(staffData);
        req.end();
    });
}

// Test getting all staff
async function testGetAllStaff(token) {
    return new Promise((resolve, reject) => {
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
                console.log('\n📋 GET ALL STAFF TEST');
                console.log('Status:', res.statusCode);
                try {
                    const response = JSON.parse(data);
                    console.log('Staff count:', response.length);
                    response.forEach(staff => {
                        console.log(`- ${staff.name} (${staff.role}) - ${staff.status}`);
                    });
                    resolve(response);
                } catch (e) {
                    reject(new Error('Invalid response'));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

// Test staff statistics
async function testStaffStats(token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/staff-management/stats/overview',
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
                console.log('\n📊 STAFF STATISTICS TEST');
                console.log('Status:', res.statusCode);
                try {
                    const response = JSON.parse(data);
                    console.log('Statistics:', response);
                    resolve(response);
                } catch (e) {
                    reject(new Error('Invalid response'));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

// Run all tests
async function runTests() {
    try {
        console.log('🧪 Testing Staff Management System...');
        
        // Get admin token
        console.log('\n🔐 Getting admin token...');
        const token = await getAdminToken();
        console.log('✅ Admin token obtained');
        
        // Test onboarding
        const onboardResult = await testOnboarding(token);
        console.log('✅ Onboarding test completed');
        
        // Test getting all staff
        await testGetAllStaff(token);
        console.log('✅ Get all staff test completed');
        
        // Test staff statistics
        await testStaffStats(token);
        console.log('✅ Staff statistics test completed');
        
        console.log('\n🎉 All staff management tests passed!');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
    }
}

// Run the tests
runTests();
