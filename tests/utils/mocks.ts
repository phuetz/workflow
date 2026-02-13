/**
 * Test Mocks and Stubs
 * Common mocks for testing
 */

import { vi } from 'vitest';

/**
 * Mock fetch response builder
 */
export class MockFetchBuilder {
  private response: {
    ok: boolean;
    status: number;
    statusText: string;
    headers: Map<string, string>;
    body: unknown;
  } = {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Map([['content-type', 'application/json']]),
    body: {}
  };

  success(data: unknown): MockFetchBuilder {
    this.response.ok = true;
    this.response.status = 200;
    this.response.body = data;
    return this;
  }

  error(status: number, message: string): MockFetchBuilder {
    this.response.ok = false;
    this.response.status = status;
    this.response.statusText = message;
    this.response.body = { error: message };
    return this;
  }

  status(code: number): MockFetchBuilder {
    this.response.status = code;
    this.response.ok = code >= 200 && code < 300;
    return this;
  }

  header(name: string, value: string): MockFetchBuilder {
    this.response.headers.set(name, value);
    return this;
  }

  body(data: unknown): MockFetchBuilder {
    this.response.body = data;
    return this;
  }

  build(): () => Promise<Response> {
    const { ok, status, statusText, headers, body } = this.response;

    return vi.fn().mockResolvedValue({
      ok,
      status,
      statusText,
      headers: {
        get: (name: string) => headers.get(name.toLowerCase()) || null,
        has: (name: string) => headers.has(name.toLowerCase()),
        entries: () => headers.entries(),
        forEach: (callback: (value: string, key: string) => void) => {
          headers.forEach(callback);
        }
      },
      json: async () => body,
      text: async () => typeof body === 'string' ? body : JSON.stringify(body),
      blob: async () => new Blob([JSON.stringify(body)]),
      arrayBuffer: async () => new ArrayBuffer(0)
    });
  }
}

/**
 * Mock WebSocket
 */
export class MockWebSocket {
  public readyState = 1; // OPEN
  public url: string;
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;

  private listeners: Map<string, Set<EventListener>> = new Map();

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }

  send(data: string | ArrayBuffer | Blob): void {
    // Mock send - could be extended to trigger responses
    console.log('WebSocket send:', data);
  }

  close(code?: number, reason?: string): void {
    this.readyState = 3; // CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }));
    }
  }

  addEventListener(type: string, listener: EventListener): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  dispatchEvent(event: Event): boolean {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => listener(event));
    }
    return true;
  }

  // Helper to simulate receiving a message
  simulateMessage(data: unknown): void {
    const event = new MessageEvent('message', {
      data: typeof data === 'string' ? data : JSON.stringify(data)
    });

    if (this.onmessage) {
      this.onmessage(event);
    }

    const listeners = this.listeners.get('message');
    if (listeners) {
      listeners.forEach(listener => listener(event));
    }
  }

  // Helper to simulate an error
  simulateError(error?: Error): void {
    const event = new Event('error');
    if (this.onerror) {
      this.onerror(event);
    }
  }
}

/**
 * Mock Redis Client
 */
export class MockRedis {
  private store: Map<string, string> = new Map();
  private expirations: Map<string, number> = new Map();

  async get(key: string): Promise<string | null> {
    this.checkExpiration(key);
    return this.store.get(key) || null;
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<string> {
    this.store.set(key, value);
    if (mode === 'EX' && duration) {
      this.expirations.set(key, Date.now() + duration * 1000);
    }
    return 'OK';
  }

  async del(key: string): Promise<number> {
    const existed = this.store.has(key);
    this.store.delete(key);
    this.expirations.delete(key);
    return existed ? 1 : 0;
  }

  async exists(key: string): Promise<number> {
    this.checkExpiration(key);
    return this.store.has(key) ? 1 : 0;
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (this.store.has(key)) {
      this.expirations.set(key, Date.now() + seconds * 1000);
      return 1;
    }
    return 0;
  }

  async ttl(key: string): Promise<number> {
    const expiration = this.expirations.get(key);
    if (!expiration) return -1;
    const ttl = Math.ceil((expiration - Date.now()) / 1000);
    return ttl > 0 ? ttl : -2;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return Array.from(this.store.keys()).filter(key => regex.test(key));
  }

  async flushall(): Promise<string> {
    this.store.clear();
    this.expirations.clear();
    return 'OK';
  }

  async hget(key: string, field: string): Promise<string | null> {
    const data = this.store.get(key);
    if (!data) return null;
    try {
      const hash = JSON.parse(data);
      return hash[field] || null;
    } catch {
      return null;
    }
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    let hash: Record<string, string> = {};
    const existing = this.store.get(key);
    if (existing) {
      try {
        hash = JSON.parse(existing);
      } catch {
        // Invalid JSON, start fresh
      }
    }
    const isNew = !(field in hash);
    hash[field] = value;
    this.store.set(key, JSON.stringify(hash));
    return isNew ? 1 : 0;
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const data = this.store.get(key);
    if (!data) return {};
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  private checkExpiration(key: string): void {
    const expiration = this.expirations.get(key);
    if (expiration && Date.now() > expiration) {
      this.store.delete(key);
      this.expirations.delete(key);
    }
  }

  // Helper methods for testing
  clear(): void {
    this.store.clear();
    this.expirations.clear();
  }

  getStore(): Map<string, string> {
    return this.store;
  }
}

/**
 * Create mock functions with common patterns
 */
export const createMocks = () => ({
  fetch: new MockFetchBuilder(),
  websocket: (url: string) => new MockWebSocket(url),
  redis: new MockRedis(),

  timer: () => {
    vi.useFakeTimers();
    return {
      advance: (ms: number) => vi.advanceTimersByTime(ms),
      runAll: () => vi.runAllTimers(),
      clear: () => vi.clearAllTimers(),
      restore: () => vi.useRealTimers()
    };
  },

  console: () => {
    const originalConsole = { ...console };
    const mocked = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn()
    };

    Object.assign(console, mocked);

    return {
      mocked,
      restore: () => Object.assign(console, originalConsole)
    };
  }
});
