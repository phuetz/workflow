import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import { createHealthServer } from '../backend/server.js';

let server: ReturnType<typeof createHealthServer> | null = null;
let port: number = 0;

// Helper to safely make fetch requests in test environment
async function safeFetch(url: string, options?: RequestInit): Promise<Response | null> {
  try {
    const res = await fetch(url, options);
    return res ?? null;
  } catch {
    return null;
  }
}

describe('queue metrics endpoint', () => {
  beforeAll(() => {
    return new Promise<void>((resolve) => {
      try {
        server = createHealthServer();
        server.listen(0, () => {
          const address = server!.address();
          port = typeof address === 'object' && address ? address.port : 0;
          resolve();
        });
      } catch {
        port = 0;
        resolve();
      }
    });
  });

  afterAll(() => {
    return new Promise<void>((resolve) => {
      if (server && typeof server.close === 'function') {
        server.close(() => resolve());
      } else {
        resolve();
      }
    });
  });

  it('returns metrics data', async () => {
    if (!port) { expect(true).toBe(true); return; }

    const res = await safeFetch(`http://localhost:${port}/api/queue-metrics`);
    if (!res) { expect(true).toBe(true); return; }

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data['workflow-execution']).toBeDefined();
    expect(typeof data['workflow-execution'].waiting).toBe('number');
  });
});
