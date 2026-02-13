/**
 * Documentation Generator Tests
 * Comprehensive tests for the visual documentation generator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentationGenerator } from '../documentation/DocumentationGenerator';
import { WorkflowAnalyzer } from '../documentation/WorkflowAnalyzer';
import { MermaidGenerator } from '../documentation/diagrams/MermaidGenerator';
import { MarkdownExporter } from '../documentation/exporters/MarkdownExporter';
import { JSONExporter } from '../documentation/exporters/JSONExporter';
import { OpenAPIExporter } from '../documentation/exporters/OpenAPIExporter';
import type { WorkflowNode, WorkflowEdge } from '../types/workflow';
import type { DocumentationConfig } from '../types/workflowDocumentation';

describe('DocumentationGenerator', () => {
  let generator: DocumentationGenerator;
  let testWorkflow: { nodes: WorkflowNode[]; edges: WorkflowEdge[] };

  beforeEach(() => {
    generator = new DocumentationGenerator();

    // Create a test workflow
    testWorkflow = {
      nodes: [
        {
          id: 'webhook-1',
          type: 'webhook',
          position: { x: 100, y: 100 },
          data: {
            id: 'webhook-1',
            type: 'webhook',
            label: 'Customer Webhook',
            position: { x: 100, y: 100 },
            icon: 'webhook',
            color: '#4CAF50',
            inputs: 0,
            outputs: 1,
            config: {
              method: 'POST',
              path: '/customer/onboard',
            },
          },
        },
        {
          id: 'validate-1',
          type: 'validate',
          position: { x: 300, y: 100 },
          data: {
            id: 'validate-1',
            type: 'validate',
            label: 'Validate Data',
            position: { x: 300, y: 100 },
            icon: 'check',
            color: '#2196F3',
            inputs: 1,
            outputs: 1,
            config: {
              schema: {
                type: 'object',
                required: ['email', 'name'],
              },
            },
          },
        },
        {
          id: 'email-1',
          type: 'email',
          position: { x: 500, y: 100 },
          data: {
            id: 'email-1',
            type: 'email',
            label: 'Send Welcome Email',
            position: { x: 500, y: 100 },
            icon: 'mail',
            color: '#FF9800',
            inputs: 1,
            outputs: 0,
            config: {
              to: '{{email}}',
              subject: 'Welcome!',
              template: 'welcome',
            },
          },
        },
      ],
      edges: [
        {
          id: 'e1',
          source: 'webhook-1',
          target: 'validate-1',
          sourceHandle: 'output-0',
          targetHandle: 'input-0',
        },
        {
          id: 'e2',
          source: 'validate-1',
          target: 'email-1',
          sourceHandle: 'output-0',
          targetHandle: 'input-0',
        },
      ],
    };
  });

  describe('generate', () => {
    it('should generate complete documentation', async () => {
      const config: DocumentationConfig = DocumentationGenerator.getDefaultConfig();

      const result = await generator.generate(
        'test-workflow',
        testWorkflow.nodes,
        testWorkflow.edges,
        config,
        {
          name: 'Customer Onboarding',
          description: 'Automated customer onboarding workflow',
          version: '1.0.0',
          author: 'Test Author',
        }
      );

      expect(result).toBeDefined();
      expect(result.workflowId).toBe('test-workflow');
      expect(result.format).toBe('markdown');
      expect(result.content).toContain('Customer Onboarding');
      expect(result.diagrams).toBeDefined();
      expect(result.generationTime).toBeGreaterThan(0);
    });

    it('should generate documentation in under 3 seconds for 50 nodes', async () => {
      // Create a workflow with 50 nodes
      const largeWorkflow = createLargeWorkflow(50);
      const config = DocumentationGenerator.getDefaultConfig();

      const startTime = performance.now();
      const result = await generator.generate(
        'large-workflow',
        largeWorkflow.nodes,
        largeWorkflow.edges,
        config
      );
      const endTime = performance.now();

      const generationTime = endTime - startTime;
      expect(generationTime).toBeLessThan(3000); // Less than 3 seconds
      expect(result.content).toBeDefined();
    });

    it('should include diagrams when embedDiagrams is true', async () => {
      const config: DocumentationConfig = {
        ...DocumentationGenerator.getDefaultConfig(),
        embedDiagrams: true,
      };

      const result = await generator.generate(
        'test-workflow',
        testWorkflow.nodes,
        testWorkflow.edges,
        config
      );

      expect(result.diagrams).toBeDefined();
      expect(result.diagrams!.length).toBeGreaterThan(0);
      expect(result.diagrams![0].format).toBe('mermaid');
    });
  });

  describe('analyze', () => {
    it('should analyze workflow structure', async () => {
      const analysis = await generator.analyze('test-workflow', testWorkflow.nodes, testWorkflow.edges);

      expect(analysis).toBeDefined();
      expect(analysis.metadata.id).toBe('test-workflow');
      expect(analysis.nodes.length).toBe(3);
      expect(analysis.connections.length).toBe(2);
      expect(analysis.statistics.totalNodes).toBe(3);
      expect(analysis.statistics.totalConnections).toBe(2);
    });

    it('should identify entry and exit points', async () => {
      const analysis = await generator.analyze('test-workflow', testWorkflow.nodes, testWorkflow.edges);

      expect(analysis.structure.entryPoints).toContain('webhook-1');
      expect(analysis.structure.exitPoints).toContain('email-1');
    });

    it('should calculate maximum depth', async () => {
      const analysis = await generator.analyze('test-workflow', testWorkflow.nodes, testWorkflow.edges);

      expect(analysis.statistics.maxDepth).toBeGreaterThan(0);
    });
  });

  describe('export', () => {
    it('should export to markdown', async () => {
      const analysis = await generator.analyze('test-workflow', testWorkflow.nodes, testWorkflow.edges, {
        name: 'Test Workflow',
      });

      const markdown = await generator.export(analysis, 'markdown');

      expect(markdown).toContain('# Test Workflow');
      expect(markdown).toContain('## Workflow Diagram');
      expect(markdown).toContain('## Node Documentation');
    });

    it('should export to JSON', async () => {
      const analysis = await generator.analyze('test-workflow', testWorkflow.nodes, testWorkflow.edges);

      const json = await generator.export(analysis, 'json');
      const parsed = JSON.parse(json);

      expect(parsed.workflow).toBeDefined();
      expect(parsed.workflow.nodes.length).toBe(3);
    });

    it('should export to OpenAPI for webhook workflows', async () => {
      const analysis = await generator.analyze('test-workflow', testWorkflow.nodes, testWorkflow.edges);

      const openapi = await generator.export(analysis, 'openapi');

      expect(openapi).toContain('openapi:');
      expect(openapi).toContain('paths:');
    });
  });

  describe('estimateGenerationTime', () => {
    it('should estimate generation time based on node count', () => {
      const time50Nodes = generator.estimateGenerationTime(50, 'markdown');
      const time100Nodes = generator.estimateGenerationTime(100, 'markdown');

      expect(time100Nodes).toBeGreaterThan(time50Nodes);
    });

    it('should estimate longer time for PDF format', () => {
      const markdownTime = generator.estimateGenerationTime(50, 'markdown');
      const pdfTime = generator.estimateGenerationTime(50, 'pdf');

      expect(pdfTime).toBeGreaterThan(markdownTime);
    });
  });
});

describe('WorkflowAnalyzer', () => {
  let analyzer: WorkflowAnalyzer;

  beforeEach(() => {
    analyzer = new WorkflowAnalyzer();
  });

  it('should detect branches in workflow', async () => {
    const nodes: WorkflowNode[] = [
      createNode('start', 'trigger', { x: 0, y: 0 }),
      createNode('condition', 'if', { x: 100, y: 0 }),
      createNode('branch-a', 'action', { x: 200, y: -50 }),
      createNode('branch-b', 'action', { x: 200, y: 50 }),
    ];

    const edges: WorkflowEdge[] = [
      createEdge('e1', 'start', 'condition'),
      createEdge('e2', 'condition', 'branch-a'),
      createEdge('e3', 'condition', 'branch-b'),
    ];

    const analysis = await analyzer.analyzeWorkflow('test', nodes, edges);

    expect(analysis.structure.branches.length).toBeGreaterThan(0);
  });

  it('should extract variables from node configurations', async () => {
    const nodes: WorkflowNode[] = [
      {
        id: 'node1',
        type: 'email',
        position: { x: 0, y: 0 },
        data: {
          id: 'node1',
          type: 'email',
          label: 'Send Email',
          position: { x: 0, y: 0 },
          icon: 'mail',
          color: '#FF9800',
          inputs: 1,
          outputs: 1,
          config: {
            to: '{{userEmail}}',
            subject: 'Hello {{userName}}',
          },
        },
      },
    ];

    const analysis = await analyzer.analyzeWorkflow('test', nodes, []);

    expect(analysis.variables.length).toBeGreaterThan(0);
    expect(analysis.variables.some((v) => v.name === 'userEmail')).toBe(true);
    expect(analysis.variables.some((v) => v.name === 'userName')).toBe(true);
  });
});

describe('MermaidGenerator', () => {
  let generator: MermaidGenerator;

  beforeEach(() => {
    generator = new MermaidGenerator();
  });

  it('should generate valid Mermaid syntax', async () => {
    const analyzer = new WorkflowAnalyzer();
    const nodes: WorkflowNode[] = [
      createNode('node1', 'trigger', { x: 0, y: 0 }),
      createNode('node2', 'action', { x: 100, y: 0 }),
    ];
    const edges: WorkflowEdge[] = [createEdge('e1', 'node1', 'node2')];

    const analysis = await analyzer.analyzeWorkflow('test', nodes, edges);
    const mermaid = generator.generate(analysis);

    expect(mermaid).toContain('graph');
    expect(mermaid).toContain('node1');
    expect(mermaid).toContain('node2');
    expect(mermaid).toContain('-->');
  });

  it('should use different shapes for different node types', async () => {
    const analyzer = new WorkflowAnalyzer();
    const nodes: WorkflowNode[] = [
      createNode('webhook', 'webhook', { x: 0, y: 0 }),
      createNode('condition', 'if', { x: 100, y: 0 }),
    ];
    const edges: WorkflowEdge[] = [createEdge('e1', 'webhook', 'condition')];

    const analysis = await analyzer.analyzeWorkflow('test', nodes, edges);
    const mermaid = generator.generate(analysis);

    // Webhook should use stadium shape ([])
    // Condition should use diamond shape {}
    expect(mermaid).toContain('([');
    expect(mermaid).toContain('{');
  });

  it('should validate Mermaid syntax', () => {
    const validMermaid = 'graph LR\n  A[Start] --> B[End]';
    const invalidMermaid = 'invalid syntax';

    const validResult = generator.validate(validMermaid);
    const invalidResult = generator.validate(invalidMermaid);

    expect(validResult.valid).toBe(true);
    expect(invalidResult.valid).toBe(false);
  });
});

describe('MarkdownExporter', () => {
  let exporter: MarkdownExporter;

  beforeEach(() => {
    exporter = new MarkdownExporter();
  });

  it('should generate GitHub-flavored markdown', async () => {
    const analyzer = new WorkflowAnalyzer();
    const nodes: WorkflowNode[] = [createNode('node1', 'trigger', { x: 0, y: 0 })];

    const analysis = await analyzer.analyzeWorkflow('test', nodes, [], {
      name: 'Test Workflow',
      description: 'A test workflow',
    });

    const config = DocumentationGenerator.getDefaultConfig();
    const markdown = exporter.export(analysis, config);

    expect(markdown).toContain('# Test Workflow');
    expect(markdown).toContain('## Overview');
    expect(markdown).toContain('## Node Documentation');
  });

  it('should include table of contents', async () => {
    const analyzer = new WorkflowAnalyzer();
    const analysis = await analyzer.analyzeWorkflow('test', [createNode('n1', 'trigger', { x: 0, y: 0 })], []);
    const config = DocumentationGenerator.getDefaultConfig();
    const markdown = exporter.export(analysis, config);

    expect(markdown).toContain('## Table of Contents');
    expect(markdown).toContain('[Overview](#overview)');
  });
});

describe('JSONExporter', () => {
  let exporter: JSONExporter;

  beforeEach(() => {
    exporter = new JSONExporter();
  });

  it('should export valid JSON', async () => {
    const analyzer = new WorkflowAnalyzer();
    const analysis = await analyzer.analyzeWorkflow('test', [createNode('n1', 'trigger', { x: 0, y: 0 })], []);
    const config = DocumentationGenerator.getDefaultConfig();

    const json = exporter.export(analysis, config);
    const parsed = JSON.parse(json);

    expect(parsed.$schema).toBeDefined();
    expect(parsed.workflow).toBeDefined();
    expect(parsed.workflow.nodes).toBeInstanceOf(Array);
  });

  it('should include JSON schema', () => {
    const analyzer = new WorkflowAnalyzer();
    const config = DocumentationGenerator.getDefaultConfig();

    // Access private method through any
    const schema = (exporter as any).generateJSONSchema();
    const parsed = JSON.parse(schema);

    expect(parsed.$schema).toBeDefined();
    expect(parsed.properties.workflow).toBeDefined();
  });
});

describe('OpenAPIExporter', () => {
  let exporter: OpenAPIExporter;

  beforeEach(() => {
    exporter = new OpenAPIExporter();
  });

  it('should generate OpenAPI spec for webhook workflows', async () => {
    const analyzer = new WorkflowAnalyzer();
    const nodes: WorkflowNode[] = [
      {
        id: 'webhook-1',
        type: 'webhook',
        position: { x: 0, y: 0 },
        data: {
          id: 'webhook-1',
          type: 'webhook',
          label: 'API Endpoint',
          position: { x: 0, y: 0 },
          icon: 'webhook',
          color: '#4CAF50',
          inputs: 0,
          outputs: 1,
          config: {
            method: 'POST',
            path: '/api/data',
          },
        },
      },
    ];

    const analysis = await analyzer.analyzeWorkflow('test', nodes, [], {
      name: 'API Workflow',
      version: '1.0.0',
    });

    const spec = exporter.exportJSON(analysis);
    const parsed = JSON.parse(spec);

    expect(parsed.openapi).toBe('3.0.0');
    expect(parsed.info.title).toBe('API Workflow');
    expect(parsed.paths).toBeDefined();
  });

  it('should validate OpenAPI spec', () => {
    const validSpec = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: { '/test': {} },
    };

    const invalidSpec = {
      openapi: '3.0.0',
      // Missing required fields
    };

    const validResult = exporter.validate(validSpec as any);
    const invalidResult = exporter.validate(invalidSpec as any);

    expect(validResult.valid).toBe(true);
    expect(invalidResult.valid).toBe(false);
  });
});

// Helper functions

function createNode(id: string, type: string, position: { x: number; y: number }): WorkflowNode {
  return {
    id,
    type,
    position,
    data: {
      id,
      type,
      label: `${type}-${id}`,
      position,
      icon: 'default',
      color: '#666',
      inputs: 1,
      outputs: 1,
      config: {},
    },
  };
}

function createEdge(id: string, source: string, target: string): WorkflowEdge {
  return {
    id,
    source,
    target,
    sourceHandle: 'output-0',
    targetHandle: 'input-0',
  };
}

function createLargeWorkflow(nodeCount: number): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];

  // Create nodes
  for (let i = 0; i < nodeCount; i++) {
    nodes.push(createNode(`node-${i}`, i === 0 ? 'trigger' : 'action', { x: i * 100, y: 0 }));
  }

  // Create linear connections
  for (let i = 0; i < nodeCount - 1; i++) {
    edges.push(createEdge(`edge-${i}`, `node-${i}`, `node-${i + 1}`));
  }

  return { nodes, edges };
}
