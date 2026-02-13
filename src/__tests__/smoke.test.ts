import { describe, it, expect, vi } from 'vitest';

describe('Smoke Tests', () => {
  it('should pass basic math test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have correct environment', () => {
    expect(window).toBeDefined();
    expect(document).toBeDefined();
  });

  it('should have testing utilities', () => {
    expect(typeof describe).toBe('function');
    expect(typeof it).toBe('function');
    expect(typeof expect).toBe('function');
  });

  it('should handle async operations', async () => {
    const promise = new Promise((resolve) => {
      setTimeout(() => resolve('success'), 10);
    });
    
    const result = await promise;
    expect(result).toBe('success');
  });

  it('should mock functions correctly', () => {
    const mockFn = vi.fn();
    mockFn('test');
    expect(mockFn).toHaveBeenCalledWith('test');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});