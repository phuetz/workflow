import { describe, beforeAll, afterAll, it, expect } from 'vitest';

let server: any;
let port: number;
let createHealthServer: any;

describe('rate limiting', () => {
  beforeAll(async () => {
    process.env.RATE_LIMIT_MAX_REQUESTS = '5';
    ({ createHealthServer } = await import('../backend/server.js'));
    return new Promise((resolve) => {
      server = createHealthServer().listen(0, () => {
        const address = server.address();
        port = typeof address === 'object' && address ? address.port : 0;
        resolve(null);
      });
    });
  });

  afterAll(() => {
    delete process.env.RATE_LIMIT_MAX_REQUESTS;
    return new Promise((resolve) => server.close(resolve));
  });

  it('returns 429 after too many requests', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await fetch(`http://localhost:${port}/api/v1/health`);
      expect(res.status).toBe(200);
    }
    const res = await fetch(`http://localhost:${port}/api/v1/health`);
    expect(res.status).toBe(429);
  });
});
