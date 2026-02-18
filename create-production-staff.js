const createProductionStaff = async () => {
  try {
    console.log('🔧 Creating staff table and sample staff in production...');
    
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
    
    console.log('✅ Logged in, creating staff table...');
    
    // Create staff table via admin endpoint (we need to add this endpoint)
    // For now, let's try to create staff members directly
    const staffMembers = [
      {
        name: 'John Staff',
        email: 'john.staff@stiltheights.com',
        phone: '5550101001',
        role: 'Staff',
        is_active: 1
      },
      {
        name: 'Sarah Cleaner',
        email: 'sarah.cleaner@stiltheights.com',
        phone: '5550102002',
        role: 'Senior Staff',
        is_active: 1
      },
      {
        name: 'Mike Technician',
        email: 'mike.tech@stiltheights.com',
        phone: '5550103003',
        role: 'Staff',
        is_active: 1
      }
    ];
    
    // Try to create staff via staff management endpoint
    console.log('👥 Creating staff members...');
    for (const staff of staffMembers) {
      try {
        const response = await fetch('https://fieldops-production-6b97.up.railway.app/api/staff-management/onboard', {
          method: 'POST',
          headers,
          body: JSON.stringify(staff)
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Created staff:', staff.name, result);
        } else {
          const error = await response.text();
          console.log('❌ Failed to create staff:', staff.name, error);
          
          // Try alternative endpoint
          const altResponse = await fetch('https://fieldops-production-6b97.up.railway.app/api/staff', {
            method: 'POST',
            headers,
            body: JSON.stringify(staff)
          });
          
          if (altResponse.ok) {
            console.log('✅ Created staff via alt endpoint:', staff.name);
          } else {
            console.log('❌ Alt endpoint also failed:', await altResponse.text());
          }
        }
      } catch (error) {
        console.log('❌ Error creating staff:', staff.name, error.message);
      }
    }
    
    console.log('🎉 Staff creation completed!');
    
    // Test booking validation
    console.log('🧪 Testing booking validation...');
    const testBooking = {
      customer_id: 1,
      name: 'Test Customer',
      phone: '5550101001',
      email: 'test@email.com',
      address: '123 Test St',
      service: 'Standard Cleaning',
      date: new Date().toISOString().split('T')[0],
      time: '14:00',
      notes: 'Test booking'
    };
    
    const validationResponse = await fetch('https://fieldops-production-6b97.up.railway.app/api/scheduling/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testBooking)
    });
    
    const validationResult = await validationResponse.json();
    console.log('📋 Booking validation result:', validationResult);
    
    if (validationResult.success) {
      console.log('✅ Booking validation successful!');
    } else {
      console.log('❌ Booking validation still failing:', validationResult.error);
    }
    
  } catch (error) {
    console.error('❌ Error creating production staff:', error.message);
  }
};

createProductionStaff();
