const http = require('http');

const bookingData = {
    customer_name: "Test Olumide",
    customer_email: "test@example.com", 
    customer_phone: "1234567890",
    service_name: "Carpet Cleaning",
    job_date: "2026-01-27",
    job_time: "14:00",
    location: "Test Location",
    notes: "Test booking for olumide issue"
};

const postData = JSON.stringify(bookingData);

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/booking/create',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

console.log('🧪 Testing booking endpoint...');
console.log('Data:', JSON.stringify(bookingData, null, 2));

const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}`);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('Response:', data);
        try {
            const response = JSON.parse(data);
            if (res.statusCode === 200) {
                console.log('✅ Booking endpoint working correctly');
            } else {
                console.log('❌ Booking endpoint returned error:', response.error || data);
            }
        } catch (e) {
            console.log('❌ Invalid JSON response:', data);
        }
    });
});

req.on('error', (e) => {
    console.error('❌ Request error:', e);
});

req.write(postData);
req.end();
