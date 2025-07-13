import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import { createHealthServer } from '../backend/server.js';

let server: any;
let port: number;

describe('queue metrics endpoint', () => {
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

  it('returns metrics data', async () => {
    const res = await fetch(`http://localhost:${port}/api/v1/queues/metrics`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data['workflow-execution']).toBeDefined();
    expect(typeof data['workflow-execution'].waiting).toBe('number');
  });
});
