const http = require('http');

const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://backend-service:3001';
const APP_VERSION = process.env.APP_VERSION || '1.0';

function callBackend(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BACKEND_URL}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200);
    res.end('OK');
    return;
  }

  if (req.url === '/compute') {
    try {
      const result = await callBackend('/compute');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        frontend_pod: process.env.HOSTNAME,
        frontend_version: APP_VERSION,
        backend_response: result
      }));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    service: 'frontend',
    version: APP_VERSION,
    pod: process.env.HOSTNAME,
    message: 'Try /compute to trigger backend processing'
  }));
});

server.listen(PORT, () => {
  console.log(`Frontend v${APP_VERSION} running on port ${PORT}`);
});
