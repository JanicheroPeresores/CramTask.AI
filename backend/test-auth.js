require('dotenv').config();
const http = require('http');

const request = (path, body) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body: responseBody }));
      }
    );

    req.on('error', reject);
    req.write(data);
    req.end();
  });
};

(async () => {
  try {
    const signup = await request('/api/auth/signup', {
      username: 'testuser0123456',
      email: 'testuser0123456@example.com',
      password: 'Password1!',
      confirmPassword: 'Password1!',
    });
    console.log('signup', signup);

    const login = await request('/api/auth/login', {
      username: 'testuser0123456',
      password: 'Password1!',
    });
    console.log('login', login);
  } catch (err) {
    console.error('ERROR', err);
  }
})();
