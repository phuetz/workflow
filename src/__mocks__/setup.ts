/**
 * Test setup mocks
 * Provides common mocks used across multiple test files
 */

import { vi } from 'vitest';

// Mock ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock IntersectionObserver
class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
  root = null;
  rootMargin = '';
  thresholds = [];
}

// Mock matchMedia
const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

// Mock fetch
const fetchMock = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({}),
  text: () => Promise.resolve(''),
  blob: () => Promise.resolve(new Blob()),
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
});

// Mock window.URL.createObjectURL
const createObjectURLMock = vi.fn().mockReturnValue('blob:test');
const revokeObjectURLMock = vi.fn();

// Mock console methods to reduce noise in tests
const consoleMock = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

// Mock crypto for tests that need randomUUID
const cryptoMock = {
  randomUUID: () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  getRandomValues: (arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  },
};

/**
 * Setup all common mocks for tests
 */
export function setupMocks(): void {
  // Setup global mocks
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).ResizeObserver = ResizeObserverMock;
    (globalThis as any).IntersectionObserver = IntersectionObserverMock;
  }

  // Setup window mocks
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'ResizeObserver', {
      value: ResizeObserverMock,
      writable: true,
    });

    Object.defineProperty(window, 'IntersectionObserver', {
      value: IntersectionObserverMock,
      writable: true,
    });

    Object.defineProperty(window, 'matchMedia', {
      value: matchMediaMock,
      writable: true,
    });

    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    Object.defineProperty(window, 'sessionStorage', {
      value: sessionStorageMock,
      writable: true,
    });

    if (window.URL) {
      Object.defineProperty(window.URL, 'createObjectURL', {
        value: createObjectURLMock,
        writable: true,
      });

      Object.defineProperty(window.URL, 'revokeObjectURL', {
        value: revokeObjectURLMock,
        writable: true,
      });
    }
  }

  // Setup global fetch mock
  if (typeof global !== 'undefined') {
    (global as any).fetch = fetchMock;
  }

  // Setup crypto mock for environments that don't have randomUUID
  if (typeof globalThis !== 'undefined' && (!globalThis.crypto || !globalThis.crypto.randomUUID)) {
    (globalThis as any).crypto = { ...globalThis.crypto, ...cryptoMock };
  }
}

/**
 * Reset all mocks
 */
export function resetMocks(): void {
  vi.clearAllMocks();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  sessionStorageMock.getItem.mockClear();
  sessionStorageMock.setItem.mockClear();
  sessionStorageMock.removeItem.mockClear();
  sessionStorageMock.clear.mockClear();
  fetchMock.mockClear();
  matchMediaMock.mockClear();
  createObjectURLMock.mockClear();
  revokeObjectURLMock.mockClear();
}

/**
 * Cleanup mocks after tests
 */
export function cleanupMocks(): void {
  resetMocks();
}

// Export mocks for direct access in tests
export {
  ResizeObserverMock,
  IntersectionObserverMock,
  matchMediaMock,
  localStorageMock,
  sessionStorageMock,
  fetchMock,
  createObjectURLMock,
  revokeObjectURLMock,
  consoleMock,
  cryptoMock,
};
