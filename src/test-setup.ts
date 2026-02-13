import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Mock Node.js crypto module
vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    default: {
      ...actual,
      randomUUID: () => `uuid-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    },
    randomUUID: () => `uuid-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
  };
});

// Cleanup après chaque test
afterEach(() => {
  cleanup();
});

// Mock des APIs navigateur
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock de fetch
global.fetch = vi.fn();

// Mock de localStorage with actual storage functionality
function createStorageMock(): Storage {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
}

const localStorageMock = createStorageMock();
const sessionStorageMock = createStorageMock();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

Object.defineProperty(global, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
  configurable: true,
});

// Mock de crypto (pour randomUUID)
const cryptoMock = {
  randomUUID: () => `uuid-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
  getRandomValues: (arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  },
  subtle: {} as SubtleCrypto,
};
Object.defineProperty(global, 'crypto', {
  value: cryptoMock,
  writable: true,
  configurable: true,
});

// Mock de ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock de IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
  takeRecords: vi.fn(),
}));

// Suppress console errors in tests (but keep them for debugging)
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: ReactDOM.render') ||
     args[0].includes('Warning: useLayoutEffect') ||
     args[0].includes('Warning: Not implemented'))
  ) {
    return;
  }
  originalError.call(console, ...args);
};

console.warn = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: ReactDOM.render') ||
     args[0].includes('Warning: useLayoutEffect'))
  ) {
    return;
  }
  originalWarn.call(console, ...args);
};