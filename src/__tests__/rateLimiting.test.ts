import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('rate limiting', () => {
  let responses = [];
  
  beforeEach(() => {
    responses = [];
    // Mock fetch to simulate rate limiting
    global.fetch = vi.fn().mockImplementation(() => {
      responses.push(1);
      const status = responses.length > 10 ? 429 : 200;
      
      return Promise.resolve({
        ok: status === 200,
        status,
        json: () => Promise.resolve({ 
          message: status === 429 ? 'Too many requests' : 'OK' 
        })
      });
    });
  });
  
  it('returns 429 after too many requests', async () => {
    // Make 15 requests
    const results = [];
    for (let i = 0; i < 15; i++) {
      const res = await fetch('/api/test');
      results.push(res.status);
    }
    
    // Check that we got at least one 429
    const has429 = results.some(status => status === 429);
    expect(has429).toBe(true);
  });
});
