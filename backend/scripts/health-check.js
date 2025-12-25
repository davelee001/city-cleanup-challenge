const http = require('http');
const port = process.env.PORT || 3000;

http.get(`http://localhost:${port}/health`, (res) => {
  let body = '';
  res.on('data', (chunk) => (body += chunk));
  res.on('end', () => {
    try {
      const json = JSON.parse(body);
      if (json && json.status === 'ok') {
        console.log('Health OK:', json);
        process.exit(0);
      } else {
        console.error('Unexpected health response:', json);
        process.exit(1);
      }
    } catch (e) {
      console.error('Invalid JSON response:', body);
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error('Health check failed:', err.message);
  process.exit(1);
});
