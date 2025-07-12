import http from 'http';
import os from 'os';
import { fileURLToPath } from 'url';

export function createHealthServer() {
  return http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/api/v1/health') {
      const payload = {
        status: 'ok',
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage().rss,
        cpuLoad: os.loadavg()[0],
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload));
    } else {
      res.statusCode = 404;
      res.end('Not Found');
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = process.env.PORT || 3001;
  createHealthServer().listen(port, () => {
    console.log(`Health server listening on ${port}`);
  });
}
