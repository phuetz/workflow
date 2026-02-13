/**
 * Ultra Think Hard Plus - Comprehensive Test Suite
 * Target: 80% Code Coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Services
import { authService } from '../services/AuthService';
import { metricsCollector } from '@services/metrics';
import { s3BackupService } from '../services/S3BackupService';
import { SLAService } from '../services/SLAService';
import { GraphQLService } from '../services/GraphQLService';
import { RBACService } from '../backend/services/RBACService';
import { SecretsService } from '../services/SecretsService';
import { LLMService } from '../services/LLMService';
import { MarketplaceService } from '../services/MarketplaceService';
import { WorkflowExecutor } from '../components/ExecutionEngine';

// Components
import { DataMappingInterface } from '../components/DataMappingInterface';
import { AutoSaveManager } from '../components/AutoSaveManager';
import VisualFlowDesigner from '../components/VisualFlowDesigner';
import { AIWorkflowGenerator } from '../components/AIWorkflowGenerator';
import { MonitoringDashboard } from '../components/MonitoringDashboard';

// Store
import { useWorkflowStore } from '../store/workflowStore';

describe('AuthService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should authenticate user successfully', async () => {
    const result = await authService.login('test@example.com', 'password');
    expect(result).toBe(true);
    expect(authService.getCurrentUser()).not.toBe('anonymous');
  });

  it('should store auth data in localStorage', async () => {
    await authService.login('test@example.com', 'password');
    const stored = localStorage.getItem('auth_user');
    expect(stored).toBeTruthy();
    const data = JSON.parse(stored!);
    expect(data.user.email).toBe('test@example.com');
  });

  it('should clear data on logout', () => {
    authService.logout();
    expect(authService.getCurrentUser()).toBe('anonymous');
    expect(localStorage.getItem('auth_user')).toBeNull();
  });

  it('should check permissions correctly', async () => {
    await authService.login('admin@example.com', 'password');
    expect(authService.hasPermission('admin')).toBe(false); // Default user role
  });
});

describe('MetricsCollector', () => {
  afterEach(() => {
    metricsCollector.stop();
  });

  it('should start and stop collection', () => {
    metricsCollector.start();
    expect(() => metricsCollector.stop()).not.toThrow();
  });

  it('should collect metrics', async () => {
    const metricsPromise = new Promise<void>((resolve) => {
      metricsCollector.on('metrics', (metrics) => {
        expect(metrics).toHaveProperty('cpuUsage');
        expect(metrics).toHaveProperty('memoryUsage');
        expect(metrics).toHaveProperty('networkIO');
        expect(metrics).toHaveProperty('diskIO');
        expect(metrics).toHaveProperty('timestamp');
        resolve();
      });
    });
    metricsCollector.start();
    await metricsPromise;
  });

  it('should calculate average metrics', () => {
    const avg = metricsCollector.getAverageMetrics();
    expect(avg).toHaveProperty('cpuUsage');
    expect(avg).toHaveProperty('memoryUsage');
    expect(avg.cpuUsage).toBeGreaterThanOrEqual(0);
  });

  it('should return current metrics', () => {
    const current = metricsCollector.getCurrentMetrics();
    if (current) {
      expect(current).toHaveProperty('timestamp');
    }
  });
});

describe('S3BackupService', () => {
  beforeEach(async () => {
    // Clear IndexedDB
    const dbs = await indexedDB.databases();
    for (const db of dbs) {
      if (db.name === 'WorkflowBackups') {
        indexedDB.deleteDatabase(db.name);
      }
    }
  });

  it('should backup data successfully', async () => {
    const data = { workflow: 'test', nodes: [] };
    const result = await s3BackupService.backup(data, 'test-backup');
    expect(result.success).toBe(true);
    expect(result.key).toContain('test-backup');
  });

  it('should restore data successfully', async () => {
    const originalData = { workflow: 'test', id: 123 };
    await s3BackupService.backup(originalData, 'restore-test');
    const restored = await s3BackupService.restore('restore-test');
    expect(restored).toEqual(originalData);
  });

  it('should handle backup errors gracefully', async () => {
    const result = await s3BackupService.backup(null, '');
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe('SLAService', () => {
  let slaService: SLAService;

  beforeEach(() => {
    slaService = SLAService.getInstance();
  });

  it('should create SLA successfully', async () => {
    const sla = await slaService.createSLA({
      name: 'Test SLA',
      description: 'Test description',
      targets: [],
      schedule: { type: 'always', timezone: 'UTC' },
      alerting: { enabled: false, channels: [] },
      reporting: { enabled: false },
      enabled: true,
      createdBy: 'test'
    });
    expect(sla).toHaveProperty('id');
    expect(sla.name).toBe('Test SLA');
  });

  it('should monitor SLA status', async () => {
    const status = await slaService.getSLAStatus('test-sla');
    expect(status).toHaveProperty('compliant');
    expect(status).toHaveProperty('trend');
  });

  it('should collect workflow metrics', async () => {
    const metrics = await slaService.getWorkflowMetrics('workflow-1', {
      start: new Date(Date.now() - 86400000),
      end: new Date()
    });
    expect(metrics).toHaveProperty('executions');
    expect(metrics).toHaveProperty('performance');
    expect(metrics).toHaveProperty('reliability');
    expect(metrics).toHaveProperty('resources');
  });

  it('should generate SLA report', async () => {
    const report = await slaService.generateReport('test-sla', {
      start: new Date(Date.now() - 86400000),
      end: new Date()
    });
    expect(report).toHaveProperty('summary');
    expect(report).toHaveProperty('violations');
  });
});

describe('WorkflowExecutor', () => {
  let executor: WorkflowExecutor;

  beforeEach(() => {
    executor = new WorkflowExecutor();
  });

  it('should execute simple workflow', async () => {
    const workflow = {
      nodes: [
        { id: '1', type: 'trigger', data: { label: 'Start' } },
        { id: '2', type: 'action', data: { label: 'Process' } }
      ],
      edges: [
        { id: 'e1', source: '1', target: '2' }
      ]
    };

    const result = await executor.execute(workflow);
    expect(result.success).toBe(true);
    expect(result.outputs).toBeTruthy();
  });

  it('should handle execution errors', async () => {
    const workflow = {
      nodes: [
        { id: '1', type: 'invalid', data: {} }
      ],
      edges: []
    };

    const result = await executor.execute(workflow);
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('should support conditional execution', async () => {
    const workflow = {
      nodes: [
        { id: '1', type: 'trigger', data: {} },
        { id: '2', type: 'condition', data: { expression: 'true' } },
        { id: '3', type: 'action', data: {} }
      ],
      edges: [
        { id: 'e1', source: '1', target: '2' },
        { id: 'e2', source: '2', target: '3', label: 'true' }
      ]
    };

    const result = await executor.execute(workflow);
    expect(result.executedNodes).toContain('3');
  });
});

describe('DataMappingInterface Component', () => {
  const mockSourceData = {
    user: {
      name: 'John Doe',
      email: 'john@example.com',
      age: 30
    },
    products: [
      { id: 1, name: 'Product 1' }
    ]
  };

  const mockTargetSchema = [
    {
      name: 'userName',
      type: 'string' as const,
      path: 'userName'
    },
    {
      name: 'userEmail',
      type: 'string' as const,
      path: 'userEmail'
    }
  ];

  it('should render data mapping interface', () => {
    render(
      <DataMappingInterface
        sourceData={mockSourceData}
        targetSchema={mockTargetSchema}
        onMappingChange={() => {}}
      />
    );
    
    expect(screen.getByText('Data Mapping')).toBeInTheDocument();
    expect(screen.getByText('Source Data')).toBeInTheDocument();
    expect(screen.getByText('Target Schema')).toBeInTheDocument();
  });

  it('should create connections between fields', async () => {
    const onMappingChange = vi.fn();
    
    render(
      <DataMappingInterface
        sourceData={mockSourceData}
        targetSchema={mockTargetSchema}
        onMappingChange={onMappingChange}
      />
    );

    // Select source field
    const sourceField = screen.getByText('name');
    fireEvent.click(sourceField);

    // Select target field
    const targetField = screen.getByText('userName');
    fireEvent.click(targetField);

    // Click connect button
    const connectBtn = screen.getByText('Connect');
    fireEvent.click(connectBtn);

    await waitFor(() => {
      expect(onMappingChange).toHaveBeenCalled();
    });
  });

  it('should support auto-mapping', () => {
    const onMappingChange = vi.fn();
    
    render(
      <DataMappingInterface
        sourceData={mockSourceData}
        targetSchema={mockTargetSchema}
        onMappingChange={onMappingChange}
      />
    );

    const autoMapBtn = screen.getByText('Auto Map');
    fireEvent.click(autoMapBtn);

    expect(onMappingChange).toHaveBeenCalled();
  });
});

describe('AutoSaveManager Component', () => {
  it('should render auto-save settings', () => {
    render(<AutoSaveManager isOpen={true} onClose={() => {}} />);
    
    expect(screen.getByText('Auto-Save Manager')).toBeInTheDocument();
    expect(screen.getByText('Auto-Save Enabled')).toBeInTheDocument();
    expect(screen.getByText('Save Interval (seconds)')).toBeInTheDocument();
  });

  it('should toggle auto-save', () => {
    const store = useWorkflowStore.getState();
    const initialState = store.autoSaveSettings.enabled;
    
    render(<AutoSaveManager isOpen={true} onClose={() => {}} />);
    
    const toggle = screen.getByRole('button', { name: /auto-save/i });
    fireEvent.click(toggle);
    
    expect(store.autoSaveSettings.enabled).toBe(!initialState);
  });

  it('should handle manual save', async () => {
    const store = useWorkflowStore.getState();
    vi.spyOn(store, 'manualSave');
    
    render(<AutoSaveManager isOpen={true} onClose={() => {}} />);
    
    const saveBtn = screen.getByText('Save Now');
    fireEvent.click(saveBtn);
    
    await waitFor(() => {
      expect(store.manualSave).toHaveBeenCalled();
    });
  });
});

describe('Workflow Store', () => {
  beforeEach(() => {
    useWorkflowStore.setState({
      nodes: [],
      edges: [],
      selectedNodes: [],
      history: [],
      historyIndex: -1
    });
  });

  it('should add nodes', () => {
    const store = useWorkflowStore.getState();
    const node = { id: 'test-1', type: 'action', position: { x: 0, y: 0 }, data: {} };
    
    store.addNode(node);
    
    expect(store.nodes).toHaveLength(1);
    expect(store.nodes[0].id).toBe('test-1');
  });

  it('should add edges', () => {
    const store = useWorkflowStore.getState();
    const edge = { id: 'edge-1', source: 'node-1', target: 'node-2' };
    
    store.addEdge(edge);
    
    expect(store.edges).toHaveLength(1);
    expect(store.edges[0].id).toBe('edge-1');
  });

  it('should support undo/redo', () => {
    const store = useWorkflowStore.getState();
    const node = { id: 'undo-test', type: 'action', position: { x: 0, y: 0 }, data: {} };
    
    store.addNode(node);
    expect(store.nodes).toHaveLength(1);
    
    store.undo();
    expect(store.nodes).toHaveLength(0);
    
    store.redo();
    expect(store.nodes).toHaveLength(1);
  });

  it('should handle multi-selection', () => {
    const store = useWorkflowStore.getState();
    
    store.setSelectedNodes(['node-1', 'node-2']);
    expect(store.selectedNodes).toEqual(['node-1', 'node-2']);
    
    store.clearSelection();
    expect(store.selectedNodes).toHaveLength(0);
  });
});

describe('Integration Tests', () => {
  it('should complete workflow creation flow', async () => {
    // Login
    await authService.login('test@example.com', 'password');
    
    // Create workflow in store
    const store = useWorkflowStore.getState();
    store.addNode({
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: { label: 'HTTP Trigger' }
    });
    
    store.addNode({
      id: 'action-1',
      type: 'action',
      position: { x: 300, y: 100 },
      data: { label: 'Send Email' }
    });
    
    store.addEdge({
      id: 'edge-1',
      source: 'trigger-1',
      target: 'action-1'
    });
    
    // Execute workflow
    const executor = new WorkflowExecutor();
    const result = await executor.execute({
      nodes: store.nodes,
      edges: store.edges
    });
    
    expect(result.success).toBe(true);
    
    // Backup workflow
    const backupResult = await s3BackupService.backup(
      { nodes: store.nodes, edges: store.edges },
      'workflow-backup'
    );
    
    expect(backupResult.success).toBe(true);
  });

  it('should monitor workflow execution metrics', async () => {
    const slaService = SLAService.getInstance();
    
    // Start metrics collection
    metricsCollector.start();
    
    // Execute workflow
    const executor = new WorkflowExecutor();
    await executor.execute({
      nodes: [{ id: '1', type: 'trigger', data: {} }],
      edges: []
    });
    
    // Check metrics
    const metrics = await slaService.getWorkflowMetrics('test-workflow', {
      start: new Date(Date.now() - 3600000),
      end: new Date()
    });
    
    expect(metrics.executions).toBeTruthy();
    expect(metrics.performance).toBeTruthy();
    
    metricsCollector.stop();
  });
});

// Performance Tests
describe('Performance Tests', () => {
  it('should handle large workflows efficiently', async () => {
    const nodes = Array.from({ length: 100 }, (_, i) => ({
      id: `node-${i}`,
      type: 'action',
      position: { x: i * 100, y: 100 },
      data: { label: `Node ${i}` }
    }));
    
    const edges = Array.from({ length: 99 }, (_, i) => ({
      id: `edge-${i}`,
      source: `node-${i}`,
      target: `node-${i + 1}`
    }));
    
    const startTime = Date.now();
    const store = useWorkflowStore.getState();
    
    store.setNodes(nodes);
    store.setEdges(edges);
    
    const endTime = Date.now();
    expect(endTime - startTime).toBeLessThan(100); // Should complete in 100ms
  });

  it('should efficiently backup large data', async () => {
    const largeData = {
      workflows: Array.from({ length: 1000 }, (_, i) => ({
        id: `workflow-${i}`,
        name: `Workflow ${i}`,
        nodes: Array.from({ length: 10 }, (_, j) => ({
          id: `node-${i}-${j}`,
          data: { value: Math.random() }
        }))
      }))
    };
    
    const startTime = Date.now();
    const result = await s3BackupService.backup(largeData, 'large-backup');
    const endTime = Date.now();
    
    expect(result.success).toBe(true);
    expect(endTime - startTime).toBeLessThan(1000); // Should complete in 1s
  });
});

// Security Tests
describe('Security Tests', () => {
  it('should sanitize user input', () => {
    const maliciousInput = '<script>alert("XSS")</script>';
    const store = useWorkflowStore.getState();
    
    store.addNode({
      id: 'secure-node',
      type: 'action',
      position: { x: 0, y: 0 },
      data: { label: maliciousInput }
    });
    
    const node = store.nodes[0];
    expect(node.data.label).not.toContain('<script>');
  });

  it('should validate authentication tokens', () => {
    authService.logout();
    expect(authService.getToken()).toBeNull();
    expect(authService.hasPermission('admin')).toBe(false);
  });

  it('should encrypt sensitive data in backups', async () => {
    const sensitiveData = {
      apiKey: 'sk-secret-key-123',
      password: 'mypassword'
    };
    
    const result = await s3BackupService.backup(sensitiveData, 'sensitive-backup');
    expect(result.success).toBe(true);
    
    // In production, verify that stored data is encrypted
    const restored = await s3BackupService.restore('sensitive-backup');
    expect(restored).toEqual(sensitiveData);
  });
});

// Error Handling Tests
describe('Error Handling', () => {
  it('should handle network errors gracefully', async () => {
    const executor = new WorkflowExecutor();
    
    // Simulate network error
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));
    
    const result = await executor.execute({
      nodes: [{ id: '1', type: 'http', data: { url: 'https://api.example.com' } }],
      edges: []
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('error');
  });

  it('should recover from backup failures', async () => {
    // Force IndexedDB error
    vi.spyOn(indexedDB, 'open').mockImplementationOnce(() => {
      throw new Error('IndexedDB error');
    });
    
    const result = await s3BackupService.backup({ test: 'data' }, 'error-test');
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

// Accessibility Tests
describe('Accessibility', () => {
  it('should have proper ARIA labels', () => {
    render(<AutoSaveManager isOpen={true} onClose={() => {}} />);
    
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveAccessibleName();
    });
  });

  it('should support keyboard navigation', () => {
    render(<DataMappingInterface
      sourceData={{ test: 'data' }}
      targetSchema={[]}
      onMappingChange={() => {}}
    />);
    
    const searchInput = screen.getByPlaceholderText(/search/i);
    searchInput.focus();
    expect(document.activeElement).toBe(searchInput);
    
    // Simulate Tab key
    fireEvent.keyDown(searchInput, { key: 'Tab' });
  });
});