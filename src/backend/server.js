import http from 'http';
import os from 'os';
import { fileURLToPath } from 'url';

// Simple in-memory metrics for the queue system
const queueMetrics = {
  'workflow-execution': {
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
    paused: 0,
  },
  'webhook-processing': {
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
    paused: 0,
  },
  'email-sending': {
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
    paused: 0,
  },
};

function startMetricsUpdates(server) {
  const interval = setInterval(() => {
    for (const name of Object.keys(queueMetrics)) {
      const current = queueMetrics[name];
      queueMetrics[name] = {
        waiting: Math.floor(Math.random() * 20),
        active: Math.floor(Math.random() * 5),
        completed: current.completed + Math.floor(Math.random() * 3),
        failed: current.failed + Math.floor(Math.random() * 1),
        delayed: Math.floor(Math.random() * 3),
        paused: 0,
      };
    }
  }, 5000);

  server.on('close', () => clearInterval(interval));
}

export function createHealthServer() {
  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/api/v1/health') {
      const payload = {
        status: 'ok',
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage().rss,
        cpuLoad: os.loadavg()[0],
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload));
    } else if (req.method === 'GET' && req.url === '/api/v1/queues/metrics') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(queueMetrics));
    } else {
      res.statusCode = 404;
      res.end('Not Found');
    }
  });

  startMetricsUpdates(server);
  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = process.env.PORT || 3001;
  createHealthServer().listen(port, () => {
    console.log(`Health server listening on ${port}`);
  });
}
