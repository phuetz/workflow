import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import { createHealthServer } from '../backend/server.js';

let server: any;
let port: number;

describe('users API endpoints', () => {
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

  it('creates and retrieves a user', async () => {
    const createRes = await fetch(`http://localhost:${port}/api/v1/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' })
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.email).toBe('test@example.com');

    const getRes = await fetch(`http://localhost:${port}/api/v1/users/${created.id}`);
    expect(getRes.status).toBe(200);
    const user = await getRes.json();
    expect(user.id).toBe(created.id);
  });

  it('lists users', async () => {
    const res = await fetch(`http://localhost:${port}/api/v1/users`);
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(Array.isArray(list.users)).toBe(true);
  });
});
