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

// In-memory webhook storage
const webhooks = new Map();
let webhookCounter = 1;

// In-memory user storage
const users = new Map();
let userCounter = 1;

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
      const parts = url.pathname.split('/');
      const id = parts[4];

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
      } else if (req.method === 'POST' && parts[5] === 'duplicate' && id) {
        const wf = workflows.get(id);
        if (wf) {
          const newId = String(workflowCounter++);
          const copy = {
            ...wf,
            id: newId,
            name: `${wf.name || 'Workflow'} (Copy)`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          workflows.set(newId, copy);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(copy));
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
    } else if (req.url && req.url.startsWith('/api/v1/webhooks')) {
      const url = new URL(req.url, 'http://localhost');
      const id = url.pathname.split('/')[4];

      if (req.method === 'GET' && url.pathname === '/api/v1/webhooks') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ webhooks: Array.from(webhooks.values()) }));
      } else if (req.method === 'POST' && url.pathname === '/api/v1/webhooks') {
        const body = await parseJsonBody(req);
        const webhook = { id: String(webhookCounter++), ...body };
        webhooks.set(webhook.id, webhook);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(webhook));
      } else if (req.method === 'GET' && id) {
        const wh = webhooks.get(id);
        if (wh) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(wh));
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      } else if (req.method === 'PUT' && id) {
        const body = await parseJsonBody(req);
        const wh = webhooks.get(id);
        if (wh) {
          const updated = { ...wh, ...body };
          webhooks.set(id, updated);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(updated));
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      } else if (req.method === 'DELETE' && id) {
        const existed = webhooks.delete(id);
        res.writeHead(existed ? 200 : 404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: existed }));
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    } else if (req.url && req.url.startsWith('/api/v1/users')) {
      const url = new URL(req.url, 'http://localhost');
      const id = url.pathname.split('/')[4];

      if (req.method === 'GET' && url.pathname === '/api/v1/users') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ users: Array.from(users.values()) }));
      } else if (req.method === 'POST' && url.pathname === '/api/v1/users') {
        const body = await parseJsonBody(req);
        const user = { id: String(userCounter++), ...body };
        users.set(user.id, user);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(user));
      } else if (req.method === 'GET' && id) {
        const u = users.get(id);
        if (u) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(u));
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      } else if (req.method === 'PUT' && id) {
        const body = await parseJsonBody(req);
        const u = users.get(id);
        if (u) {
          const updated = { ...u, ...body };
          users.set(id, updated);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(updated));
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      } else if (req.method === 'DELETE' && id) {
        const existed = users.delete(id);
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
