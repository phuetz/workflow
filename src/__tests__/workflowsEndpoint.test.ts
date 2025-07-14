import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import { createHealthServer } from '../backend/server.js';

let server: any;
let port: number;

describe('workflows API endpoints', () => {
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

  it('creates and retrieves a workflow', async () => {
    const createRes = await fetch(`http://localhost:${port}/api/v1/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test WF' })
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.name).toBe('Test WF');

    const getRes = await fetch(`http://localhost:${port}/api/v1/workflows/${created.id}`);
    expect(getRes.status).toBe(200);
    const wf = await getRes.json();
    expect(wf.id).toBe(created.id);
  });

  it('lists workflows', async () => {
    const res = await fetch(`http://localhost:${port}/api/v1/workflows`);
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(Array.isArray(list.workflows)).toBe(true);
  });

  it('duplicates a workflow', async () => {
    const createRes = await fetch(`http://localhost:${port}/api/v1/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Dup Source' })
    });
    const created = await createRes.json();

    const dupRes = await fetch(`http://localhost:${port}/api/v1/workflows/${created.id}/duplicate`, {
      method: 'POST'
    });
    expect(dupRes.status).toBe(201);
    const copy = await dupRes.json();
    expect(copy.id).not.toBe(created.id);
    expect(copy.name).toContain('Copy');
  });
});
