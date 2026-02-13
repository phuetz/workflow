/**
 * WorkflowStateManager Tests
 * Tests for centralized workflow state operations
 */

import { 
  WorkflowStateManager,
  Workflow,
  WorkflowNode,
  WorkflowEdge
} from '../WorkflowStateManager';

describe('WorkflowStateManager', () => {
  describe('Workflow Creation', () => {
    it('should create a new workflow with default settings', () => {
      const workflow = WorkflowStateManager.createWorkflow('Test Workflow', {
        description: 'A test workflow',
        category: 'Testing',
        tags: ['test', 'example']
      });

      expect(workflow.id).toMatch(/^workflow_/);
      expect(workflow.name).toBe('Test Workflow');
      expect(workflow.description).toBe('A test workflow');
      expect(workflow.category).toBe('Testing');
      expect(workflow.tags).toEqual(['test', 'example']);
      expect(workflow.nodes).toEqual([]);
      expect(workflow.edges).toEqual([]);
      expect(workflow.settings).toBeDefined();
      expect(workflow.createdAt).toBeLessThanOrEqual(Date.now());
      expect(workflow.updatedAt).toBe(workflow.createdAt);
    });

    it('should create workflow from template', () => {
      const template: Partial<Workflow> = {
        nodes: [
          { id: 'node1', type: 'trigger', position: { x: 0, y: 0 }, data: {} },
          { id: 'node2', type: 'action', position: { x: 100, y: 0 }, data: {} }
        ],
        edges: [
          { id: 'edge1', source: 'node1', target: 'node2' }
        ],
        variables: { apiKey: 'test-key' }
      };

      const workflow = WorkflowStateManager.createWorkflow('Templated Workflow', {
        template
      });

      expect(workflow.nodes).toHaveLength(2);
      expect(workflow.edges).toHaveLength(1);
      expect(workflow.variables).toEqual({ apiKey: 'test-key' });
    });
  });

  describe('Workflow Cloning', () => {
    it('should clone a workflow with new IDs', () => {
      const original = WorkflowStateManager.createWorkflow('Original', {
        template: {
          nodes: [
            { id: 'n1', type: 'trigger', position: { x: 0, y: 0 }, data: { value: 1 } },
            { id: 'n2', type: 'action', position: { x: 100, y: 0 }, data: { value: 2 } }
          ],
          edges: [
            { id: 'e1', source: 'n1', target: 'n2' }
          ]
        }
      });

      const cloned = WorkflowStateManager.cloneWorkflow(original, 'Cloned Workflow');

      expect(cloned.id).not.toBe(original.id);
      expect(cloned.name).toBe('Cloned Workflow');
      expect(cloned.nodes).toHaveLength(2);
      expect(cloned.edges).toHaveLength(1);
      
      // Verify nodes have new IDs
      expect(cloned.nodes[0].id).not.toBe(original.nodes[0].id);
      expect(cloned.nodes[1].id).not.toBe(original.nodes[1].id);
      
      // Verify edges have new IDs and updated references
      expect(cloned.edges[0].id).not.toBe(original.edges[0].id);
      expect(cloned.edges[0].source).not.toBe(original.edges[0].source);
      expect(cloned.edges[0].target).not.toBe(original.edges[0].target);
      
      // Verify data is preserved
      expect(cloned.nodes[0].data).toEqual(original.nodes[0].data);
      expect(cloned.nodes[1].data).toEqual(original.nodes[1].data);
    });
  });

  describe('Workflow Validation', () => {
    it('should validate a correct workflow', () => {
      const workflow = WorkflowStateManager.createWorkflow('Valid Workflow', {
        template: {
          nodes: [
            { id: 'n1', type: 'trigger', position: { x: 0, y: 0 }, data: {} },
            { id: 'n2', type: 'action', position: { x: 100, y: 0 }, data: {} }
          ],
          edges: [
            { id: 'e1', source: 'n1', target: 'n2' }
          ]
        }
      });

      const validation = WorkflowStateManager.validateWorkflow(workflow);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.warnings).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidWorkflow = {
        id: '',
        name: '',
        nodes: null,
        edges: undefined
      } as Workflow;

      const validation = WorkflowStateManager.validateWorkflow(invalidWorkflow);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Workflow must have an ID');
      expect(validation.errors).toContain('Workflow must have a name');
      expect(validation.errors).toContain('Workflow must have nodes array');
      expect(validation.errors).toContain('Workflow must have edges array');
    });

    it('should detect invalid node references in edges', () => {
      const workflow = WorkflowStateManager.createWorkflow('Invalid Edge', {
        template: {
          nodes: [
            { id: 'n1', type: 'trigger', position: { x: 0, y: 0 }, data: {} }
          ],
          edges: [
            { id: 'e1', source: 'n1', target: 'nonexistent' }
          ]
        }
      });

      const validation = WorkflowStateManager.validateWorkflow(workflow);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Edge e1 references non-existent target node: nonexistent');
    });

    it('should detect duplicate node IDs', () => {
      const workflow = WorkflowStateManager.createWorkflow('Duplicate IDs', {
        template: {
          nodes: [
            { id: 'n1', type: 'trigger', position: { x: 0, y: 0 }, data: {} },
            { id: 'n1', type: 'action', position: { x: 100, y: 0 }, data: {} }
          ],
          edges: []
        }
      });

      const validation = WorkflowStateManager.validateWorkflow(workflow);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Duplicate node ID: n1');
    });

    it('should warn about self-loops', () => {
      const workflow = WorkflowStateManager.createWorkflow('Self Loop', {
        template: {
          nodes: [
            { id: 'n1', type: 'action', position: { x: 0, y: 0 }, data: {} }
          ],
          edges: [
            { id: 'e1', source: 'n1', target: 'n1' }
          ]
        }
      });

      const validation = WorkflowStateManager.validateWorkflow(workflow);

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('Edge e1 creates a self-loop on node n1');
    });
  });

  describe('Circular Dependency Detection', () => {
    it('should detect simple circular dependencies', () => {
      const nodes: WorkflowNode[] = [
        { id: 'n1', type: 'action', position: { x: 0, y: 0 }, data: {} },
        { id: 'n2', type: 'action', position: { x: 100, y: 0 }, data: {} },
        { id: 'n3', type: 'action', position: { x: 200, y: 0 }, data: {} }
      ];

      const edges: WorkflowEdge[] = [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3' },
        { id: 'e3', source: 'n3', target: 'n1' } // Creates cycle
      ];

      const cycles = WorkflowStateManager.detectCircularDependencies(nodes, edges);

      expect(cycles).toHaveLength(1);
      expect(cycles[0]).toContain('n1 → n2 → n3 → n1');
    });

    it('should handle workflows without cycles', () => {
      const nodes: WorkflowNode[] = [
        { id: 'n1', type: 'trigger', position: { x: 0, y: 0 }, data: {} },
        { id: 'n2', type: 'action', position: { x: 100, y: 0 }, data: {} },
        { id: 'n3', type: 'action', position: { x: 200, y: 0 }, data: {} }
      ];

      const edges: WorkflowEdge[] = [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n1', target: 'n3' }
      ];

      const cycles = WorkflowStateManager.detectCircularDependencies(nodes, edges);

      expect(cycles).toHaveLength(0);
    });
  });

  describe('Unreachable Node Detection', () => {
    it('should find unreachable nodes', () => {
      const nodes: WorkflowNode[] = [
        { id: 'n1', type: 'trigger', position: { x: 0, y: 0 }, data: {} },
        { id: 'n2', type: 'action', position: { x: 100, y: 0 }, data: {} },
        { id: 'n3', type: 'action', position: { x: 200, y: 0 }, data: {} },
        { id: 'n4', type: 'action', position: { x: 300, y: 0 }, data: {} }
      ];

      const edges: WorkflowEdge[] = [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n3', target: 'n4' } // n3 and n4 are unreachable from n1
      ];

      const unreachable = WorkflowStateManager.findUnreachableNodes(nodes, edges);

      expect(unreachable).toHaveLength(2);
      expect(unreachable).toContain('n3');
      expect(unreachable).toContain('n4');
    });

    it('should handle fully connected workflows', () => {
      const nodes: WorkflowNode[] = [
        { id: 'n1', type: 'trigger', position: { x: 0, y: 0 }, data: {} },
        { id: 'n2', type: 'action', position: { x: 100, y: 0 }, data: {} },
        { id: 'n3', type: 'action', position: { x: 200, y: 0 }, data: {} }
      ];

      const edges: WorkflowEdge[] = [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3' }
      ];

      const unreachable = WorkflowStateManager.findUnreachableNodes(nodes, edges);

      expect(unreachable).toHaveLength(0);
    });
  });

  describe('Execution Context', () => {
    it('should create execution context', () => {
      const workflow = WorkflowStateManager.createWorkflow('Test');
      const variables = { apiKey: 'test', baseUrl: 'https://api.example.com' };
      const context = WorkflowStateManager.createExecutionContext(workflow.id, variables);

      expect(context.workflowId).toBe(workflow.id);
      expect(context.executionId).toMatch(/^execution_/);
      expect(context.variables).toEqual(variables);
      expect(context.results).toEqual({});
      expect(context.status).toBe('running');
      expect(context.startTime).toBeLessThanOrEqual(Date.now());
    });

    it('should update execution results', () => {
      const workflow = WorkflowStateManager.createWorkflow('Test');
      let context = WorkflowStateManager.createExecutionContext(workflow.id, {});

      // Update with running status
      context = WorkflowStateManager.updateExecutionResult(context, 'node1', {
        status: 'running',
        startTime: Date.now()
      });

      expect(context.results.node1).toBeDefined();
      expect(context.results.node1.status).toBe('running');
      expect(context.currentNodeId).toBe('node1');

      // Update with success status
      const endTime = Date.now();
      context = WorkflowStateManager.updateExecutionResult(context, 'node1', {
        status: 'success',
        endTime,
        output: { result: 'test' }
      });

      expect(context.results.node1.status).toBe('success');
      expect(context.results.node1.duration).toBeGreaterThan(0);
      expect(context.results.node1.output).toEqual({ result: 'test' });
    });

    it('should calculate execution statistics', () => {
      const workflow = WorkflowStateManager.createWorkflow('Test');
      const context = WorkflowStateManager.createExecutionContext(workflow.id, {});

      // Add some execution results
      context.results = {
        node1: { nodeId: 'node1', status: 'success', duration: 100 },
        node2: { nodeId: 'node2', status: 'success', duration: 200 },
        node3: { nodeId: 'node3', status: 'error' },
        node4: { nodeId: 'node4', status: 'running' },
        node5: { nodeId: 'node5', status: 'pending' }
      } as Record<string, { nodeId: string; status: string; duration?: number; }>;

      const stats = WorkflowStateManager.getExecutionStatistics(context);

      expect(stats.totalNodes).toBe(5);
      expect(stats.completedNodes).toBe(2);
      expect(stats.failedNodes).toBe(1);
      expect(stats.runningNodes).toBe(1);
      expect(stats.pendingNodes).toBe(1);
      expect(stats.averageDuration).toBe(150);
      expect(stats.totalDuration).toBe(300);
    });
  });

  describe('Workflow Merging', () => {
    it('should merge workflows using latest strategy', () => {
      const base = WorkflowStateManager.createWorkflow('Base');
      base.updatedAt = Date.now() - 1000;

      const incoming = WorkflowStateManager.createWorkflow('Incoming');
      incoming.updatedAt = Date.now();

      const merged = WorkflowStateManager.mergeWorkflows(base, incoming, 'latest');

      expect(merged).toBe(incoming);
    });

    it('should merge workflows using smart strategy', () => {
      const base = WorkflowStateManager.createWorkflow('Base', {
        template: {
          nodes: [
            { id: 'n1', type: 'trigger', position: { x: 0, y: 0 }, data: { value: 1 } },
            { id: 'n2', type: 'action', position: { x: 100, y: 0 }, data: { value: 2 } }
          ],
          edges: [
            { id: 'e1', source: 'n1', target: 'n2' }
          ],
          variables: { var1: 'base' }
        }
      });

      const incoming = WorkflowStateManager.createWorkflow('Incoming', {
        template: {
          nodes: [
            { id: 'n2', type: 'action', position: { x: 150, y: 0 }, data: { value: 3, extra: true } },
            { id: 'n3', type: 'action', position: { x: 200, y: 0 }, data: { value: 4 } }
          ],
          edges: [
            { id: 'e2', source: 'n2', target: 'n3' }
          ],
          variables: { var2: 'incoming' }
        }
      });

      const merged = WorkflowStateManager.mergeWorkflows(base, incoming, 'smart');

      expect(merged.nodes).toHaveLength(3);
      expect(merged.edges).toHaveLength(2);
      expect(merged.variables).toEqual({ var1: 'base', var2: 'incoming' });

      // Check node n2 was merged
      const n2 = merged.nodes.find(n => n.id === 'n2');
      expect(n2?.position.x).toBe(150); // From incoming
      expect(n2?.data).toEqual({ value: 3, extra: true }); // Merged data
    });

    it('should throw error for manual merge strategy', () => {
      const base = WorkflowStateManager.createWorkflow('Base');
      const incoming = WorkflowStateManager.createWorkflow('Incoming');

      expect(() => {
        WorkflowStateManager.mergeWorkflows(base, incoming, 'manual');
      }).toThrow('Manual merge required');
    });
  });

  describe('ID Generation', () => {
    it('should generate unique IDs', () => {
      const ids = new Set<string>();

      for (let i = 0; i < 1000; i++) {
        const id = WorkflowStateManager.generateId('test');
        expect(id).toMatch(/^test_\d+_[a-z0-9]{9}$/);
        ids.add(id);
      }

      // All IDs should be unique
      expect(ids.size).toBe(1000);
    });
  });
});