/**
 * Test Utilities
 * PLAN C - Helper functions for tests
 */

import { vi } from 'vitest';

export const mockWorkflowData = {
  nodes: [
    { id: '1', type: 'trigger', position: { x: 0, y: 0 }, data: { label: 'Start' } },
    { id: '2', type: 'action', position: { x: 100, y: 100 }, data: { label: 'Process' } }
  ],
  edges: [
    { id: 'e1', source: '1', target: '2' }
  ]
};

export const createMockExecution = (options = {}) => ({
  id: 'exec-123',
  status: 'success',
  startTime: Date.now(),
  endTime: Date.now() + 1000,
  results: new Map(),
  ...options
});

export const waitForAsync = (ms = 0) => 
  new Promise(resolve => setTimeout(resolve, ms));

export const createMockServer = (port = 3000) => ({
  listen: vi.fn((p, cb) => cb && cb()),
  close: vi.fn(cb => cb && cb()),
  address: () => ({ port })
});
