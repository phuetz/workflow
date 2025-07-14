import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import { createHealthServer } from '../backend/server.js';

let server: any;
let port: number;

describe('webhooks API endpoints', () => {
  beforeAll(() => {
    return new Promise((resolve) => {
      server = createHealthServer().listen(0, () => {
        const address = server.address();
        port = typeof address === 'object' && address ? address.port : 0;
        resolve(null);
      });
    });
  });

  afterAll(() => {
    return new Promise((resolve) => server.close(resolve));
  });

  it('creates and retrieves a webhook', async () => {
    const createRes = await fetch(`http://localhost:${port}/api/v1/webhooks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/webhook' })
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.url).toBe('https://example.com/webhook');

    const getRes = await fetch(`http://localhost:${port}/api/v1/webhooks/${created.id}`);
    expect(getRes.status).toBe(200);
    const wh = await getRes.json();
    expect(wh.id).toBe(created.id);
  });

  it('lists webhooks', async () => {
    const res = await fetch(`http://localhost:${port}/api/v1/webhooks`);
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(Array.isArray(list.webhooks)).toBe(true);
  });
});
