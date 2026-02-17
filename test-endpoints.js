#!/usr/bin/env node

/**
 * COMPREHENSIVE ENDPOINT TEST
 * Tests all critical booking endpoints
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
const endpoints = [
  { method: 'GET', path: '/booking.html', name: 'Booking Page' },
  { method: 'GET', path: '/api/booking/services', name: 'Services API' },
  { method: 'POST', path: '/api/booking/book', name: 'Booking API' }
];

function testEndpoint(method, path) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
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
          statusText: res.statusMessage,
          headers: res.headers,
          body: data.substring(0, 200) // First 200 chars
        });
      });
    });

    req.on('error', reject);
    
    if (method === 'POST') {
      req.write('{}');
    }
    req.end();
  });
}

async function runTests() {
  console.log('\n🚀 ENDPOINT TEST - Checking Server Availability\n');
  console.log('=====================================\n');

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing: ${endpoint.name}`);
      console.log(`  ${endpoint.method} ${endpoint.path}`);
      
      const result = await testEndpoint(endpoint.method, endpoint.path);
      
      const statusEmoji = result.status === 200 ? '✅' : 
                         result.status === 404 ? '❌' :
                         result.status === 500 ? '💥' : '⚠️ ';
      
      console.log(`  Status: ${statusEmoji} ${result.status} ${result.statusText}`);
      
      if (result.status !== 200) {
        console.log(`  Body: ${result.body}`);
      }
      
      console.log('');
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}\n`);
    }
  }
  
  console.log('=====================================');
  console.log('\n📋 If all are 200 ✅, the server is working!\n');
}

runTests().catch(console.error);
