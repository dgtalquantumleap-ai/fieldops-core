const createSampleData = async () => {
  try {
    console.log('🔧 Creating sample data for production...');
    
    // First login to get token
    const loginResponse = await fetch('https://fieldops-production-6b97.up.railway.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'dgtalquantumleap@gmail.com',
        password: 'admin123'
      })
    });
    
    const loginResult = await loginResponse.json();
    
    if (!loginResult.success) {
      console.log('❌ Login failed:', loginResult);
      return;
    }
    
    const token = loginResult.token;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    };
    
    console.log('✅ Logged in, creating sample data...');
    
    // 1. Create sample customers
    const customers = [
      {
        name: 'John Smith',
        email: 'john.smith@email.com',
        phone: '5550101001',
        address: '123 Main St, City, State 12345'
      },
      {
        name: 'Sarah Johnson',
        email: 'sarah.j@email.com', 
        phone: '5550102002',
        address: '456 Oak Ave, City, State 12345'
      },
      {
        name: 'Mike Wilson',
        email: 'mike.w@email.com',
        phone: '5550103003', 
        address: '789 Pine Rd, City, State 12345'
      }
    ];
    
    console.log('👥 Creating customers...');
    for (const customer of customers) {
      const response = await fetch('https://fieldops-production-6b97.up.railway.app/api/customers', {
        method: 'POST',
        headers,
        body: JSON.stringify(customer)
      });
      
      if (response.ok) {
        console.log('✅ Created customer:', customer.name);
      } else {
        console.log('❌ Failed to create customer:', customer.name, await response.text());
      }
    }
    
    // 2. Create sample jobs
    const jobs = [
      {
        customer_id: 1,
        service_id: 1,
        job_date: new Date().toISOString().split('T')[0],
        job_time: '09:00',
        status: 'Completed',
        notes: 'Regular cleaning service'
      },
      {
        customer_id: 2,
        service_id: 1,
        job_date: new Date().toISOString().split('T')[0],
        job_time: '11:00',
        status: 'Scheduled',
        notes: 'Deep cleaning service'
      },
      {
        customer_id: 3,
        service_id: 1,
        job_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
        job_time: '14:00',
        status: 'Scheduled',
        notes: 'Move-in cleaning'
      }
    ];
    
    console.log('📋 Creating jobs...');
    for (const job of jobs) {
      const response = await fetch('https://fieldops-production-6b97.up.railway.app/api/jobs', {
        method: 'POST',
        headers,
        body: JSON.stringify(job)
      });
      
      if (response.ok) {
        console.log('✅ Created job for customer ID:', job.customer_id);
      } else {
        console.log('❌ Failed to create job:', await response.text());
      }
    }
    
    // 3. Create sample invoices
    const invoices = [
      {
        customer_id: 1,
        job_id: 1,
        amount: 150.00,
        status: 'paid',
        issued_at: new Date().toISOString().split('T')[0]
      },
      {
        customer_id: 2,
        job_id: 2,
        amount: 200.00,
        status: 'unpaid',
        issued_at: new Date().toISOString().split('T')[0]
      }
    ];
    
    console.log('💰 Creating invoices...');
    for (const invoice of invoices) {
      const response = await fetch('https://fieldops-production-6b97.up.railway.app/api/invoices/create', {
        method: 'POST',
        headers,
        body: JSON.stringify(invoice)
      });
      
      if (response.ok) {
        console.log('✅ Created invoice for customer ID:', invoice.customer_id);
      } else {
        console.log('❌ Failed to create invoice:', await response.text());
      }
    }
    
    console.log('🎉 Sample data creation completed!');
    console.log('📊 Dashboard should now show:');
    console.log('   - 3 customers');
    console.log('   - 2 scheduled jobs');
    console.log('   - 1 completed job');
    console.log('   - 2 invoices (1 paid, 1 unpaid)');
    console.log('   - $150 total revenue');
    
  } catch (error) {
    console.error('❌ Error creating sample data:', error.message);
  }
};

createSampleData();
