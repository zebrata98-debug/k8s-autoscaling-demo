const http = require('http');

const APP_VERSION = process.env.APP_VERSION || '1.0';
const PORT = process.env.PORT || 3001;

function heavyWork() {
  let result = 0;
  for (let i = 0; i < 1000000; i++) {
    result += Math.sqrt(i);
  }
  return result;
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200);
    res.end('OK');
    return;
  }

  if (req.url === '/compute') {
    const start = Date.now();
    const result = heavyWork();
    const duration = Date.now() - start;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      service: 'backend',
      version: APP_VERSION,
      result: result,
      duration_ms: duration,
      pod: process.env.HOSTNAME
    }));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    service: 'backend',
    version: APP_VERSION,
    pod: process.env.HOSTNAME
  }));
});

server.listen(PORT, () => {
  console.log(`Backend v${APP_VERSION} running on port ${PORT}`);
});
