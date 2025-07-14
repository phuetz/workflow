import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import { createHealthServer } from '../backend/server.js';

let server: any;
let port: number;

describe('credentials API endpoints', () => {
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

  it('creates and retrieves a credential', async () => {
    const createRes = await fetch(`http://localhost:${port}/api/v1/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Cred', type: 'apiKey' })
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.name).toBe('Test Cred');

    const getRes = await fetch(`http://localhost:${port}/api/v1/credentials/${created.id}`);
    expect(getRes.status).toBe(200);
    const cred = await getRes.json();
    expect(cred.id).toBe(created.id);
  });

  it('lists credentials', async () => {
    const res = await fetch(`http://localhost:${port}/api/v1/credentials`);
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(Array.isArray(list.credentials)).toBe(true);
  });
});
