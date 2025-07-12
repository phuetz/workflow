import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import { createHealthServer } from '../backend/server.js';

let server: any;
let port: number;

describe('health endpoint', () => {
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

  it('returns status ok', async () => {
    const res = await fetch(`http://localhost:${port}/api/v1/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(typeof data.uptime).toBe('number');
  });
});
