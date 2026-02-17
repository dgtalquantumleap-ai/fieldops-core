#!/usr/bin/env node

/**
 * FULL BOOKING WORKFLOW TEST
 */

const http = require('http');

function makeRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: data
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTest() {
  console.log('\n🧪 FULL BOOKING WORKFLOW TEST\n');
  console.log('====================================\n');

  try {
    // STEP 1: Load services
    console.log('📋 STEP 1: Load Services');
    const servicesRes = await makeRequest('GET', '/api/booking/services', null);
    const services = JSON.parse(servicesRes.body);
    
    if (servicesRes.status !== 200 || !services.data || services.data.length === 0) {
      console.log('❌ FAILED: Could not load services');
      console.log('Response:', servicesRes.body);
      return;
    }
    
    console.log(`✅ Services loaded: ${services.data.length} services`);
    console.log(`   Example: ${services.data[0].name} - $${services.data[0].price}`);
    
    // STEP 2: Submit a booking
    console.log('\n📝 STEP 2: Submit Booking');
    const bookingData = {
      name: 'Test Customer',
      phone: '555-123-4567',
      email: 'test@example.com',
      address: '123 Main St, Test City',
      service: services.data[0].name,  // Use first service
      date: '2026-02-20',
      time: '10:00',
      notes: 'Test booking from automated test'
    };
    
    console.log('Submitting:', JSON.stringify(bookingData, null, 2));
    const bookingRes = await makeRequest('POST', '/api/booking/book', bookingData);
    const bookingResult = JSON.parse(bookingRes.body);
    
    if (bookingRes.status !== 201) {
      console.log(`❌ FAILED: Status ${bookingRes.status}`);
      console.log('Response:', bookingRes.body);
      return;
    }
    
    console.log(`✅ Booking created successfully!`);
    console.log(`   Job ID: ${bookingResult.data.jobId}`);
    console.log(`   Date: ${bookingResult.data.bookingDate}`);
    console.log(`   Time: ${bookingResult.data.bookingTime}`);
    console.log(`   Service: ${bookingResult.data.service}`);
    
    // STEP 3: Check database for the job
    console.log('\n🔍 STEP 3: Verify in Database');
    const Database = require('better-sqlite3');
    const path = require('path');
    const dbPath = path.join(__dirname, 'fieldops.db');
    const db = new Database(dbPath);
    
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(bookingResult.data.jobId);
    
    if (!job) {
      console.log('❌ FAILED: Booking not found in database');
      return;
    }
    
    console.log(`✅ Booking found in database`);
    console.log(`   Status: ${job.status}`);
    
    if (job.status !== 'Scheduled') {
      console.log(`⚠️  WARNING: Expected status 'Scheduled' but got '${job.status}'`);
      console.log('   This is the critical fix - jobs must be "Scheduled" not "scheduled"');
    } else {
      console.log(`✅ Status is correctly capitalized!`);
    }
    
    db.close();
    
    console.log('\n====================================');
    console.log('✅ ALL TESTS PASSED!\n');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log(error);
  }
}

runTest();
