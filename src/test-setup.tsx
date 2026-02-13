// Configuration pour les tests
import { vi } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';

// Make Jest/Vitest compatibility
(global as Record<string, unknown>).jest = vi;

// Storage stores
const localStorageStore = new Map<string, string>();
const sessionStorageStore = new Map<string, string>();
const originalConsole = console;

// Mock des APIs du navigateur
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
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

// Mock de localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn((key: string) => localStorageStore.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => localStorageStore.set(key, value)),
    removeItem: vi.fn((key: string) => localStorageStore.delete(key)),
    clear: vi.fn(() => localStorageStore.clear()),
  },
  writable: true,
});

// Mock de sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: vi.fn((key: string) => sessionStorageStore.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => sessionStorageStore.set(key, value)),
    removeItem: vi.fn((key: string) => sessionStorageStore.delete(key)),
    clear: vi.fn(() => sessionStorageStore.clear()),
  },
  writable: true,
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
}));

// Mock de performance
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn(),
    getEntriesByType: vi.fn(),
  },
  writable: true,
});

// Mock de crypto pour les tests
Object.defineProperty(window, 'crypto', {
  value: {
    getRandomValues: vi.fn().mockReturnValue(new Uint32Array(1)),
    randomUUID: vi.fn().mockReturnValue('test-uuid'),
  },
  writable: true,
});

// Mock de fetch
global.fetch = vi.fn().mockImplementation(() => 
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
);

// Mock de console pour les tests
global.console = {
  ...originalConsole,
  error: vi.fn(),
  warn: vi.fn(),
  log: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

// Mock de process pour les tests navigateur
if (typeof process === 'undefined') {
  (global as Record<string, unknown>).process = {
    env: {},
    memoryUsage: vi.fn().mockReturnValue({
      rss: 1000000,
      heapTotal: 1000000,
      heapUsed: 500000,
      external: 100000,
      arrayBuffers: 100000,
    }),
  };
}

// Mock de require pour les tests
if (typeof require === 'undefined') {
  (global as Record<string, unknown>).require = vi.fn().mockImplementation((module) => {
    if (module === 'dagre') {
      return {
        graphlib: {
          Graph: vi.fn().mockImplementation(() => ({
            setDefaultEdgeLabel: vi.fn(),
            setGraph: vi.fn(),
            setNode: vi.fn(),
            setEdge: vi.fn(),
            node: vi.fn().mockReturnValue({ x: 100, y: 100 }),
          })),
        },
        layout: vi.fn(),
      };
    }
    return {};
  });
}

// Configuration pour les tests React
export const mockReactFlowProvider = ({ children }: { children: React.ReactNode }) => {
  return children;
};

// Mock React Router hooks
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
    useParams: () => ({}),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

// Test wrapper for React Router
export const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return <BrowserRouter>{children}</BrowserRouter>;
};

// Configuration pour Zustand
export const mockZustandStore = {
  nodes: [],
  edges: [],
  selectedNode: null,
  selectedEdge: null,
  darkMode: false,
  isExecuting: false,
  setNodes: vi.fn(),
  setEdges: vi.fn(),
  setSelectedNode: vi.fn(),
  setSelectedEdge: vi.fn(),
  updateNodeConfig: vi.fn(),
  saveWorkflow: vi.fn(),
  exportWorkflow: vi.fn(),
  importWorkflow: vi.fn(),
};

// Mock pour le logger
vi.mock('./services/LoggingService', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    startTimer: vi.fn(() => vi.fn()),
  },
}));

// Mock pour les services Node.js
vi.mock('events', () => ({
  EventEmitter: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    removeAllListeners: vi.fn(),
  })),
}));

vi.mock('crypto', () => ({
  randomBytes: vi.fn(() => Buffer.from('test')),
  createHash: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn(() => 'hash'),
  })),
}));