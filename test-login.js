const testLogin = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'dgtalquantumleap@gmail.com',
        password: 'admin123'
      })
    });

    const result = await response.json();
    console.log('Login test result:', result);
    console.log('Status:', response.status);
  } catch (error) {
    console.error('Login test error:', error.message);
  }
};

testLogin();
