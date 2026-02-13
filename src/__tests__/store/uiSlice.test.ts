/**
 * uiSlice Unit Tests
 * Tests for the Zustand UI slice - manages UI state (dark mode, debug mode, alerts, metrics)
 *
 * Task: T2.5 - Tests Store Slices (uiSlice)
 * Created: 2026-01-07
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createUISlice,
  UISlice,
  Alert,
  SystemMetrics
} from '../../store/slices/uiSlice';

// Helper to create a minimal Zustand-like store for testing
function createTestStore() {
  let state: UISlice;

  const setState = (partial: Partial<UISlice> | ((state: UISlice) => Partial<UISlice>)) => {
    if (typeof partial === 'function') {
      const newState = partial(state);
      state = { ...state, ...newState };
    } else {
      state = { ...state, ...partial };
    }
  };

  const getState = () => state;

  // Initialize with the slice
  const slice = createUISlice(setState as any, getState as any, {} as any);
  state = { ...slice };

  return {
    getState,
    setState,
    reset: () => {
      const freshSlice = createUISlice(setState as any, getState as any, {} as any);
      state = { ...freshSlice };
    }
  };
}

// Test fixtures
const createTestAlert = (overrides: Partial<Alert> = {}): Alert => ({
  id: `alert-${Date.now()}`,
  type: 'info',
  message: 'Test alert message',
  timestamp: new Date().toISOString(),
  ...overrides
});

const createTestMetrics = (overrides: Partial<SystemMetrics> = {}): SystemMetrics => ({
  cpu: 45,
  memory: 60,
  uptime: 3600,
  requestCount: 1000,
  errorCount: 5,
  lastBackup: new Date().toISOString(),
  ...overrides
});

describe('uiSlice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  // ============================================
  // Initial State Tests
  // ============================================
  describe('Initial State', () => {
    it('should have darkMode as false', () => {
      expect(store.getState().darkMode).toBe(false);
    });

    it('should have debugMode as false', () => {
      expect(store.getState().debugMode).toBe(false);
    });

    it('should have stepByStep as false', () => {
      expect(store.getState().stepByStep).toBe(false);
    });

    it('should have empty alerts array', () => {
      expect(store.getState().alerts).toEqual([]);
    });

    it('should have initialized systemMetrics', () => {
      expect(store.getState().systemMetrics).toEqual({
        cpu: 0,
        memory: 0,
        uptime: 0,
        requestCount: 0,
        errorCount: 0,
        lastBackup: null
      });
    });

    it('should have systemMetrics.cpu as 0', () => {
      expect(store.getState().systemMetrics.cpu).toBe(0);
    });

    it('should have systemMetrics.memory as 0', () => {
      expect(store.getState().systemMetrics.memory).toBe(0);
    });

    it('should have systemMetrics.lastBackup as null', () => {
      expect(store.getState().systemMetrics.lastBackup).toBeNull();
    });
  });

  // ============================================
  // Dark Mode Tests
  // ============================================
  describe('toggleDarkMode', () => {
    it('should toggle darkMode from false to true', () => {
      expect(store.getState().darkMode).toBe(false);

      store.getState().toggleDarkMode();

      expect(store.getState().darkMode).toBe(true);
    });

    it('should toggle darkMode from true to false', () => {
      store.getState().toggleDarkMode(); // false -> true
      expect(store.getState().darkMode).toBe(true);

      store.getState().toggleDarkMode(); // true -> false
      expect(store.getState().darkMode).toBe(false);
    });

    it('should toggle multiple times correctly', () => {
      // Toggle 5 times
      store.getState().toggleDarkMode(); // true
      store.getState().toggleDarkMode(); // false
      store.getState().toggleDarkMode(); // true
      store.getState().toggleDarkMode(); // false
      store.getState().toggleDarkMode(); // true

      expect(store.getState().darkMode).toBe(true);
    });

    it('should not affect other state properties', () => {
      store.getState().toggleDarkMode();

      expect(store.getState().debugMode).toBe(false);
      expect(store.getState().stepByStep).toBe(false);
      expect(store.getState().alerts).toEqual([]);
    });
  });

  // ============================================
  // Debug Mode Tests
  // ============================================
  describe('toggleDebugMode', () => {
    it('should toggle debugMode from false to true', () => {
      expect(store.getState().debugMode).toBe(false);

      store.getState().toggleDebugMode();

      expect(store.getState().debugMode).toBe(true);
    });

    it('should toggle debugMode from true to false', () => {
      store.getState().toggleDebugMode(); // false -> true
      expect(store.getState().debugMode).toBe(true);

      store.getState().toggleDebugMode(); // true -> false
      expect(store.getState().debugMode).toBe(false);
    });

    it('should toggle multiple times correctly', () => {
      store.getState().toggleDebugMode(); // true
      store.getState().toggleDebugMode(); // false
      store.getState().toggleDebugMode(); // true

      expect(store.getState().debugMode).toBe(true);
    });

    it('should not affect other state properties', () => {
      store.getState().toggleDebugMode();

      expect(store.getState().darkMode).toBe(false);
      expect(store.getState().stepByStep).toBe(false);
    });
  });

  // ============================================
  // Step By Step Mode Tests
  // ============================================
  describe('toggleStepByStep', () => {
    it('should toggle stepByStep from false to true', () => {
      expect(store.getState().stepByStep).toBe(false);

      store.getState().toggleStepByStep();

      expect(store.getState().stepByStep).toBe(true);
    });

    it('should toggle stepByStep from true to false', () => {
      store.getState().toggleStepByStep(); // false -> true
      expect(store.getState().stepByStep).toBe(true);

      store.getState().toggleStepByStep(); // true -> false
      expect(store.getState().stepByStep).toBe(false);
    });

    it('should toggle multiple times correctly', () => {
      store.getState().toggleStepByStep(); // true
      store.getState().toggleStepByStep(); // false
      store.getState().toggleStepByStep(); // true
      store.getState().toggleStepByStep(); // false

      expect(store.getState().stepByStep).toBe(false);
    });

    it('should not affect other state properties', () => {
      store.getState().toggleStepByStep();

      expect(store.getState().darkMode).toBe(false);
      expect(store.getState().debugMode).toBe(false);
    });
  });

  // ============================================
  // Combined Toggle Tests
  // ============================================
  describe('Combined Toggles', () => {
    it('should handle all toggles independently', () => {
      // Toggle each independently
      store.getState().toggleDarkMode();
      store.getState().toggleDebugMode();
      store.getState().toggleStepByStep();

      expect(store.getState().darkMode).toBe(true);
      expect(store.getState().debugMode).toBe(true);
      expect(store.getState().stepByStep).toBe(true);
    });

    it('should maintain state consistency after mixed toggles', () => {
      store.getState().toggleDarkMode();    // dark: true
      store.getState().toggleDebugMode();   // debug: true
      store.getState().toggleDarkMode();    // dark: false
      store.getState().toggleStepByStep();  // step: true
      store.getState().toggleDebugMode();   // debug: false

      expect(store.getState().darkMode).toBe(false);
      expect(store.getState().debugMode).toBe(false);
      expect(store.getState().stepByStep).toBe(true);
    });

    it('should preserve alerts when toggling modes', () => {
      // Manually set alerts (simulating external update)
      store.setState({
        alerts: [
          createTestAlert({ id: 'alert-1', type: 'error', message: 'Error occurred' })
        ]
      });

      store.getState().toggleDarkMode();
      store.getState().toggleDebugMode();

      expect(store.getState().alerts).toHaveLength(1);
      expect(store.getState().alerts[0].id).toBe('alert-1');
    });

    it('should preserve systemMetrics when toggling modes', () => {
      // Manually set metrics (simulating external update)
      const metrics = createTestMetrics({ cpu: 75, memory: 80 });
      store.setState({ systemMetrics: metrics });

      store.getState().toggleDarkMode();
      store.getState().toggleStepByStep();

      expect(store.getState().systemMetrics.cpu).toBe(75);
      expect(store.getState().systemMetrics.memory).toBe(80);
    });
  });

  // ============================================
  // State Shape Tests
  // ============================================
  describe('State Shape', () => {
    it('should have correct alert structure', () => {
      const alert = createTestAlert({
        id: 'test-alert',
        type: 'warning',
        message: 'Warning message'
      });

      store.setState({ alerts: [alert] });

      const storedAlert = store.getState().alerts[0];
      expect(storedAlert).toHaveProperty('id');
      expect(storedAlert).toHaveProperty('type');
      expect(storedAlert).toHaveProperty('message');
      expect(storedAlert).toHaveProperty('timestamp');
    });

    it('should support all alert types', () => {
      const alerts: Alert[] = [
        createTestAlert({ id: '1', type: 'info' }),
        createTestAlert({ id: '2', type: 'warning' }),
        createTestAlert({ id: '3', type: 'error' }),
        createTestAlert({ id: '4', type: 'success' })
      ];

      store.setState({ alerts });

      expect(store.getState().alerts).toHaveLength(4);
      expect(store.getState().alerts.map(a => a.type)).toEqual([
        'info', 'warning', 'error', 'success'
      ]);
    });

    it('should have correct systemMetrics structure', () => {
      const metrics = store.getState().systemMetrics;

      expect(metrics).toHaveProperty('cpu');
      expect(metrics).toHaveProperty('memory');
      expect(metrics).toHaveProperty('uptime');
      expect(metrics).toHaveProperty('requestCount');
      expect(metrics).toHaveProperty('errorCount');
      expect(metrics).toHaveProperty('lastBackup');
    });

    it('should allow setting systemMetrics values', () => {
      store.setState({
        systemMetrics: {
          cpu: 95,
          memory: 88,
          uptime: 86400,
          requestCount: 50000,
          errorCount: 100,
          lastBackup: '2026-01-07T10:00:00Z'
        }
      });

      const metrics = store.getState().systemMetrics;
      expect(metrics.cpu).toBe(95);
      expect(metrics.memory).toBe(88);
      expect(metrics.uptime).toBe(86400);
      expect(metrics.requestCount).toBe(50000);
      expect(metrics.errorCount).toBe(100);
      expect(metrics.lastBackup).toBe('2026-01-07T10:00:00Z');
    });
  });

  // ============================================
  // Edge Cases Tests
  // ============================================
  describe('Edge Cases', () => {
    it('should handle rapid toggle operations', () => {
      // Rapid toggles
      for (let i = 0; i < 100; i++) {
        store.getState().toggleDarkMode();
      }

      // Even number of toggles = back to initial state
      expect(store.getState().darkMode).toBe(false);
    });

    it('should handle large number of alerts', () => {
      const manyAlerts = Array.from({ length: 1000 }, (_, i) =>
        createTestAlert({ id: `alert-${i}`, message: `Alert ${i}` })
      );

      store.setState({ alerts: manyAlerts });

      expect(store.getState().alerts).toHaveLength(1000);
    });

    it('should handle empty alert message', () => {
      store.setState({
        alerts: [createTestAlert({ message: '' })]
      });

      expect(store.getState().alerts[0].message).toBe('');
    });

    it('should handle systemMetrics at boundary values', () => {
      store.setState({
        systemMetrics: {
          cpu: 100,
          memory: 100,
          uptime: Number.MAX_SAFE_INTEGER,
          requestCount: 0,
          errorCount: 0,
          lastBackup: null
        }
      });

      const metrics = store.getState().systemMetrics;
      expect(metrics.cpu).toBe(100);
      expect(metrics.memory).toBe(100);
      expect(metrics.uptime).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle state reset', () => {
      // Modify state
      store.getState().toggleDarkMode();
      store.getState().toggleDebugMode();
      store.setState({
        alerts: [createTestAlert()],
        systemMetrics: createTestMetrics({ cpu: 50 })
      });

      // Reset store
      store.reset();

      // Verify reset to initial state
      expect(store.getState().darkMode).toBe(false);
      expect(store.getState().debugMode).toBe(false);
      expect(store.getState().stepByStep).toBe(false);
      expect(store.getState().alerts).toEqual([]);
      expect(store.getState().systemMetrics.cpu).toBe(0);
    });
  });

  // ============================================
  // Type Safety Tests
  // ============================================
  describe('Type Safety', () => {
    it('should have boolean type for darkMode', () => {
      expect(typeof store.getState().darkMode).toBe('boolean');
      store.getState().toggleDarkMode();
      expect(typeof store.getState().darkMode).toBe('boolean');
    });

    it('should have boolean type for debugMode', () => {
      expect(typeof store.getState().debugMode).toBe('boolean');
      store.getState().toggleDebugMode();
      expect(typeof store.getState().debugMode).toBe('boolean');
    });

    it('should have boolean type for stepByStep', () => {
      expect(typeof store.getState().stepByStep).toBe('boolean');
      store.getState().toggleStepByStep();
      expect(typeof store.getState().stepByStep).toBe('boolean');
    });

    it('should have array type for alerts', () => {
      expect(Array.isArray(store.getState().alerts)).toBe(true);
    });

    it('should have object type for systemMetrics', () => {
      expect(typeof store.getState().systemMetrics).toBe('object');
      expect(store.getState().systemMetrics).not.toBeNull();
    });

    it('should have number type for metric values', () => {
      const metrics = store.getState().systemMetrics;
      expect(typeof metrics.cpu).toBe('number');
      expect(typeof metrics.memory).toBe('number');
      expect(typeof metrics.uptime).toBe('number');
      expect(typeof metrics.requestCount).toBe('number');
      expect(typeof metrics.errorCount).toBe('number');
    });
  });
});
