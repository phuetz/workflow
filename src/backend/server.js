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

// In-memory workflow storage
const workflows = new Map();
let workflowCounter = 1;

// In-memory credentials storage
const credentials = new Map();
let credentialCounter = 1;

function parseJsonBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

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
  const server = http.createServer(async (req, res) => {
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
    } else if (req.url && req.url.startsWith('/api/v1/workflows')) {
      const url = new URL(req.url, 'http://localhost');
      const id = url.pathname.split('/')[4];

      if (req.method === 'GET' && url.pathname === '/api/v1/workflows') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ workflows: Array.from(workflows.values()) }));
      } else if (req.method === 'POST' && url.pathname === '/api/v1/workflows') {
        const body = await parseJsonBody(req);
        const workflow = { id: String(workflowCounter++), ...body };
        workflows.set(workflow.id, workflow);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(workflow));
      } else if (req.method === 'GET' && id) {
        const wf = workflows.get(id);
        if (wf) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(wf));
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      } else if (req.method === 'PUT' && id) {
        const body = await parseJsonBody(req);
        const wf = workflows.get(id);
        if (wf) {
          const updated = { ...wf, ...body };
          workflows.set(id, updated);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(updated));
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      } else if (req.method === 'DELETE' && id) {
        const existed = workflows.delete(id);
        res.writeHead(existed ? 200 : 404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: existed }));
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    } else if (req.url && req.url.startsWith('/api/v1/credentials')) {
      const url = new URL(req.url, 'http://localhost');
      const id = url.pathname.split('/')[4];

      if (req.method === 'GET' && url.pathname === '/api/v1/credentials') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ credentials: Array.from(credentials.values()) }));
      } else if (req.method === 'POST' && url.pathname === '/api/v1/credentials') {
        const body = await parseJsonBody(req);
        const credential = { id: String(credentialCounter++), ...body };
        credentials.set(credential.id, credential);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(credential));
      } else if (req.method === 'GET' && id) {
        const cred = credentials.get(id);
        if (cred) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(cred));
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      } else if (req.method === 'PUT' && id) {
        const body = await parseJsonBody(req);
        const cred = credentials.get(id);
        if (cred) {
          const updated = { ...cred, ...body };
          credentials.set(id, updated);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(updated));
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      } else if (req.method === 'DELETE' && id) {
        const existed = credentials.delete(id);
        res.writeHead(existed ? 200 : 404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: existed }));
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
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
