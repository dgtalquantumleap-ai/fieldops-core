const comprehensiveTest = async () => {
  console.log('🔍 Starting comprehensive application testing...\n');
  
  const results = {
    adminDashboard: { status: 'pending', issues: [] },
    bookingFlow: { status: 'pending', issues: [] },
    staffManagement: { status: 'pending', issues: [] },
    customerManagement: { status: 'pending', issues: [] },
    invoiceSystem: { status: 'pending', issues: [] },
    authentication: { status: 'pending', issues: [] }
  };
  
  try {
    // 1. Test Authentication
    console.log('🔐 Testing authentication...');
    const loginResponse = await fetch('https://fieldops-production-6b97.up.railway.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'dgtalquantumleap@gmail.com',
        password: 'admin123'
      })
    });
    
    const loginResult = await loginResponse.json();
    
    if (loginResult.success) {
      console.log('✅ Authentication successful');
      results.authentication.status = 'pass';
      const token = loginResult.token;
      const headers = { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token 
      };
      
      // 2. Test Admin Dashboard Data Loading
      console.log('\n📊 Testing admin dashboard data loading...');
      try {
        const [jobsRes, customersRes, invoicesRes] = await Promise.all([
          fetch('https://fieldops-production-6b97.up.railway.app/api/jobs', { headers }),
          fetch('https://fieldops-production-6b97.up.railway.app/api/customers', { headers }),
          fetch('https://fieldops-production-6b97.up.railway.app/api/invoices', { headers })
        ]);
        
        const jobsData = await jobsRes.json();
        const customersData = await customersRes.json();
        const invoicesData = await invoicesRes.json();
        
        console.log(`📋 Jobs: ${jobsData.data?.length || 0} items`);
        console.log(`👥 Customers: ${customersData.data?.length || 0} items`);
        console.log(`💰 Invoices: ${invoicesData.data?.length || 0} items`);
        
        if (jobsData.data?.length > 0 && customersData.data?.length > 0) {
          console.log('✅ Dashboard data loading successful');
          results.adminDashboard.status = 'pass';
        } else {
          console.log('⚠️ Dashboard has no data (might be expected)');
          results.adminDashboard.issues.push('No sample data found');
        }
        
      } catch (error) {
        console.log('❌ Dashboard data loading failed:', error.message);
        results.adminDashboard.status = 'fail';
        results.adminDashboard.issues.push(error.message);
      }
      
      // 3. Test Booking Flow
      console.log('\n📅 Testing booking flow...');
      try {
        const bookingTest = {
          customer_id: 1,
          name: 'Test Booking',
          phone: '5550101001',
          email: 'test@booking.com',
          address: '123 Test Street',
          service: 'Standard Cleaning',
          date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
          time: '10:00',
          notes: 'Comprehensive test booking'
        };
        
        const validateResponse = await fetch('https://fieldops-production-6b97.up.railway.app/api/scheduling/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bookingTest)
        });
        
        const validationResult = await validateResponse.json();
        
        if (validationResult.success) {
          console.log('✅ Booking validation successful');
          console.log(`👤 Assigned staff: ${validationResult.data?.staffAssignment?.recommended?.name || 'None'}`);
          
          // Test actual booking creation
          const confirmResponse = await fetch('https://fieldops-production-6b97.up.railway.app/api/scheduling/confirm-booking', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              customer_id: bookingTest.customer_id,
              service_id: 1,
              date: bookingTest.date,
              time: bookingTest.time,
              address: bookingTest.address
            })
          });
          
          const confirmResult = await confirmResponse.json();
          
          if (confirmResult.success) {
            console.log('✅ Booking creation successful');
            results.bookingFlow.status = 'pass';
          } else {
            console.log('❌ Booking creation failed:', confirmResult.error);
            results.bookingFlow.status = 'fail';
            results.bookingFlow.issues.push(confirmResult.error);
          }
          
        } else {
          console.log('❌ Booking validation failed:', validationResult.error);
          results.bookingFlow.status = 'fail';
          results.bookingFlow.issues.push(validationResult.error);
        }
        
      } catch (error) {
        console.log('❌ Booking flow test failed:', error.message);
        results.bookingFlow.status = 'fail';
        results.bookingFlow.issues.push(error.message);
      }
      
      // 4. Test Staff Management
      console.log('\n👥 Testing staff management...');
      try {
        const staffResponse = await fetch('https://fieldops-production-6b97.up.railway.app/api/staff-management', { headers });
        const staffData = await staffResponse.json();
        
        console.log(`👥 Staff members: ${staffData.data?.length || 0}`);
        
        if (staffData.data?.length > 0) {
          console.log('✅ Staff management working');
          results.staffManagement.status = 'pass';
        } else {
          console.log('⚠️ No staff found');
          results.staffManagement.issues.push('No staff members found');
        }
        
      } catch (error) {
        console.log('❌ Staff management test failed:', error.message);
        results.staffManagement.status = 'fail';
        results.staffManagement.issues.push(error.message);
      }
      
      // 5. Test Customer Management
      console.log('\n👤 Testing customer management...');
      try {
        const customerCreateResponse = await fetch('https://fieldops-production-6b97.up.railway.app/api/customers', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: 'Test Customer',
            email: 'test@example.com',
            phone: '5550101999',
            address: '123 Test St'
          })
        });
        
        const customerResult = await customerCreateResponse.json();
        
        if (customerResult.success) {
          console.log('✅ Customer creation successful');
          results.customerManagement.status = 'pass';
        } else {
          console.log('❌ Customer creation failed:', customerResult.error);
          results.customerManagement.status = 'fail';
          results.customerManagement.issues.push(customerResult.error);
        }
        
      } catch (error) {
        console.log('❌ Customer management test failed:', error.message);
        results.customerManagement.status = 'fail';
        results.customerManagement.issues.push(error.message);
      }
      
      // 6. Test Invoice System
      console.log('\n💰 Testing invoice system...');
      try {
        // First create a job to invoice
        const jobResponse = await fetch('https://fieldops-production-6b97.up.railway.app/api/jobs', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            customer_id: 1,
            service_id: 1,
            job_date: new Date().toISOString().split('T')[0],
            job_time: '15:00',
            status: 'Completed'
          })
        });
        
        const jobResult = await jobResponse.json();
        
        if (jobResult.success) {
          // Now create invoice for that job
          const invoiceResponse = await fetch('https://fieldops-production-6b97.up.railway.app/api/invoices/create', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              job_id: jobResult.data?.id || 1,
              amount: 250.00,
              status: 'paid'
            })
          });
          
          const invoiceResult = await invoiceResponse.json();
          
          if (invoiceResult.success) {
            console.log('✅ Invoice creation successful');
            results.invoiceSystem.status = 'pass';
          } else {
            console.log('❌ Invoice creation failed:', invoiceResult.error);
            results.invoiceSystem.status = 'fail';
            results.invoiceSystem.issues.push(invoiceResult.error);
          }
        } else {
          console.log('❌ Job creation for invoice test failed:', jobResult.error);
          results.invoiceSystem.status = 'fail';
          results.invoiceSystem.issues.push(jobResult.error);
        }
        
      } catch (error) {
        console.log('❌ Invoice system test failed:', error.message);
        results.invoiceSystem.status = 'fail';
        results.invoiceSystem.issues.push(error.message);
      }
      
    } else {
      console.log('❌ Authentication failed:', loginResult.error);
      results.authentication.status = 'fail';
      results.authentication.issues.push(loginResult.error);
    }
    
  } catch (error) {
    console.error('❌ Comprehensive test failed:', error.message);
  }
  
  // Generate Report
  console.log('\n' + '='.repeat(60));
  console.log('📋 COMPREHENSIVE TEST REPORT');
  console.log('='.repeat(60));
  
  const allTests = [
    { name: 'Authentication', ...results.authentication },
    { name: 'Admin Dashboard', ...results.adminDashboard },
    { name: 'Booking Flow', ...results.bookingFlow },
    { name: 'Staff Management', ...results.staffManagement },
    { name: 'Customer Management', ...results.customerManagement },
    { name: 'Invoice System', ...results.invoiceSystem }
  ];
  
  let passCount = 0;
  let failCount = 0;
  
  allTests.forEach(test => {
    const status = test.status === 'pass' ? '✅ PASS' : '❌ FAIL';
    console.log(`\n${status} ${test.name}`);
    
    if (test.issues.length > 0) {
      test.issues.forEach(issue => console.log(`   ⚠️  ${issue}`));
    }
    
    if (test.status === 'pass') passCount++;
    else failCount++;
  });
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 SUMMARY: ${passCount}/${allTests.length} tests passed`);
  console.log(`🎯 Success Rate: ${Math.round((passCount/allTests.length) * 100)}%`);
  
  if (failCount === 0) {
    console.log('🎉 ALL SYSTEMS FUNCTIONAL - Ready for client handover!');
  } else {
    console.log(`⚠️  ${failCount} system(s) need attention before handover`);
  }
  
  console.log('='.repeat(60));
  
  return {
    summary: {
      total: allTests.length,
      passed: passCount,
      failed: failCount,
      successRate: Math.round((passCount/allTests.length) * 100)
    },
    details: results
  };
};

comprehensiveTest();
