/**
 * MCP Integration Test Suite
 * Comprehensive tests for Model Context Protocol implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MCPProtocol } from '../mcp/MCPProtocol';
import { MCPToolRegistry } from '../mcp/MCPToolRegistry';
import { MCPResourceProvider } from '../mcp/MCPResourceProvider';
import type {
  MCPCapabilities,
  MCPTool,
  MCPToolDefinition,
  MCPResourceDefinition,
  MCPToolCallResult,
  MCPResourceContents,
} from '../types/mcp';

describe('MCPProtocol', () => {
  let protocol: MCPProtocol;

  beforeEach(() => {
    protocol = new MCPProtocol();
  });

  describe('JSON-RPC Message Creation', () => {
    it('should create a valid request', () => {
      const request = protocol.createRequest('test_method', { param: 'value' });

      expect(request.jsonrpc).toBe('2.0');
      expect(request.method).toBe('test_method');
      expect(request.params).toEqual({ param: 'value' });
      expect(request.id).toBeDefined();
    });

    it('should create requests with incrementing IDs', () => {
      const req1 = protocol.createRequest('method1');
      const req2 = protocol.createRequest('method2');

      expect(req2.id).toBeGreaterThan(req1.id as number);
    });

    it('should create a valid notification', () => {
      const notification = protocol.createNotification('test_event', { data: 'test' });

      expect(notification.jsonrpc).toBe('2.0');
      expect(notification.method).toBe('test_event');
      expect(notification.params).toEqual({ data: 'test' });
      expect('id' in notification).toBe(false);
    });

    it('should create a valid success response', () => {
      const response = protocol.createResponse(1, { success: true });

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(1);
      expect(response.result).toEqual({ success: true });
      expect('error' in response).toBe(false);
    });

    it('should create a valid error response', () => {
      const response = protocol.createErrorResponse(1, -32600, 'Invalid request');

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(1);
      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(-32600);
      expect(response.error?.message).toBe('Invalid request');
    });
  });

  describe('Message Validation', () => {
    it('should validate a correct request', () => {
      const message = {
        jsonrpc: '2.0',
        id: 1,
        method: 'test',
        params: {},
      };

      const result = protocol.validateMessage(message);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid JSON-RPC version', () => {
      const message = {
        jsonrpc: '1.0',
        id: 1,
        method: 'test',
      };

      const result = protocol.validateMessage(message);
      expect(result.valid).toBe(false);
    });

    it('should validate a notification without id', () => {
      const message = {
        jsonrpc: '2.0',
        method: 'test',
      };

      const result = protocol.validateMessage(message);
      expect(result.valid).toBe(true);
    });

    it('should reject message without jsonrpc field', () => {
      const message = {
        id: 1,
        method: 'test',
      };

      const result = protocol.validateMessage(message);
      expect(result.valid).toBe(false);
    });
  });

  describe('Protocol Negotiation', () => {
    it('should validate matching protocol versions', () => {
      const isValid = protocol.validateProtocolVersion('2024-11-05');
      expect(isValid).toBe(true);
    });

    it('should reject non-matching protocol versions', () => {
      const isValid = protocol.validateProtocolVersion('2023-01-01');
      expect(isValid).toBe(false);
    });

    it('should negotiate capabilities correctly', () => {
      const clientCaps: MCPCapabilities = {
        tools: { listChanged: true },
        resources: { subscribe: true, listChanged: true },
      };

      const serverCaps: MCPCapabilities = {
        tools: { listChanged: true },
        resources: { subscribe: false, listChanged: true },
      };

      const negotiated = protocol.negotiateCapabilities(clientCaps, serverCaps);

      expect(negotiated.tools?.listChanged).toBe(true);
      expect(negotiated.resources?.subscribe).toBe(false);
      expect(negotiated.resources?.listChanged).toBe(true);
    });

    it('should handle missing capabilities', () => {
      const clientCaps: MCPCapabilities = {
        tools: { listChanged: true },
      };

      const serverCaps: MCPCapabilities = {
        resources: { subscribe: true },
      };

      const negotiated = protocol.negotiateCapabilities(clientCaps, serverCaps);

      expect(negotiated.tools).toBeUndefined();
      expect(negotiated.resources).toBeUndefined();
    });
  });

  describe('Initialize Handshake', () => {
    it('should create a valid initialize request', () => {
      const capabilities: MCPCapabilities = {
        tools: { listChanged: true },
      };

      const request = protocol.createInitializeRequest('test-client', '1.0.0', capabilities);

      expect(request.method).toBe('initialize');
      expect(request.params).toBeDefined();
      const params = request.params as any;
      expect(params.clientInfo.name).toBe('test-client');
      expect(params.clientInfo.version).toBe('1.0.0');
    });

    it('should create a valid initialize response', () => {
      const capabilities: MCPCapabilities = {
        tools: { listChanged: true },
      };

      const response = protocol.createInitializeResponse(
        1,
        'test-server',
        '1.0.0',
        capabilities,
        'Test instructions'
      );

      expect(response.id).toBe(1);
      expect(response.result).toBeDefined();
      const result = response.result as any;
      expect(result.serverInfo.name).toBe('test-server');
      expect(result.instructions).toBe('Test instructions');
    });
  });
});

describe('MCPToolRegistry', () => {
  let registry: MCPToolRegistry;

  beforeEach(() => {
    registry = new MCPToolRegistry({ validation: true, monitoring: true });
  });

  describe('Tool Registration', () => {
    it('should register a tool successfully', () => {
      const tool: MCPTool = {
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      };

      const definition: MCPToolDefinition = {
        tool,
        handler: async () => ({ content: [{ type: 'text', text: 'test' }] }),
      };

      expect(() => registry.registerTool(definition)).not.toThrow();
      expect(registry.has('test_tool')).toBe(true);
    });

    it('should reject duplicate tool registration', () => {
      const tool: MCPTool = {
        name: 'duplicate_tool',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      };

      const definition: MCPToolDefinition = {
        tool,
        handler: async () => ({ content: [{ type: 'text', text: 'test' }] }),
      };

      registry.registerTool(definition);
      expect(() => registry.registerTool(definition)).toThrow();
    });

    it('should validate tool definition', () => {
      const invalidTool = {
        tool: {
          name: '',
          description: 'Invalid',
          inputSchema: { type: 'object', properties: {} },
        },
        handler: async () => ({ content: [] }),
      } as MCPToolDefinition;

      expect(() => registry.registerTool(invalidTool)).toThrow();
    });
  });

  describe('Tool Execution', () => {
    it('should execute a tool successfully', async () => {
      const tool: MCPTool = {
        name: 'echo_tool',
        description: 'Echoes input',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string', required: true },
          },
          required: ['message'],
        },
      };

      const definition: MCPToolDefinition = {
        tool,
        handler: async (params) => ({
          content: [{ type: 'text', text: params.message as string }],
        }),
      };

      registry.registerTool(definition);

      const result = await registry.executeTool('echo_tool', { message: 'Hello' });

      expect(result.isError).toBeUndefined();
      expect(result.content[0]).toEqual({ type: 'text', text: 'Hello' });
    });

    it('should return error for non-existent tool', async () => {
      const result = await registry.executeTool('non_existent', {});

      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
    });

    it('should validate tool arguments', async () => {
      const tool: MCPTool = {
        name: 'strict_tool',
        description: 'Requires specific arguments',
        inputSchema: {
          type: 'object',
          properties: {
            required_param: { type: 'string', required: true },
          },
          required: ['required_param'],
        },
      };

      const definition: MCPToolDefinition = {
        tool,
        handler: async () => ({ content: [{ type: 'text', text: 'success' }] }),
      };

      registry.registerTool(definition);

      const result = await registry.executeTool('strict_tool', {});

      expect(result.isError).toBe(true);
    });

    it('should handle tool execution errors', async () => {
      const tool: MCPTool = {
        name: 'error_tool',
        description: 'Always errors',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      };

      const definition: MCPToolDefinition = {
        tool,
        handler: async () => {
          throw new Error('Tool error');
        },
      };

      registry.registerTool(definition);

      const result = await registry.executeTool('error_tool', {});

      expect(result.isError).toBe(true);
    });
  });

  describe('Tool Management', () => {
    it('should list all registered tools', () => {
      const tools = [
        { name: 'tool1', description: 'Tool 1', inputSchema: { type: 'object' as const, properties: {} } },
        { name: 'tool2', description: 'Tool 2', inputSchema: { type: 'object' as const, properties: {} } },
      ];

      tools.forEach((tool) => {
        registry.registerTool({
          tool,
          handler: async () => ({ content: [] }),
        });
      });

      const listed = registry.listTools();
      expect(listed).toHaveLength(2);
    });

    it('should unregister a tool', () => {
      const tool: MCPTool = {
        name: 'temp_tool',
        description: 'Temporary',
        inputSchema: { type: 'object', properties: {} },
      };

      registry.registerTool({
        tool,
        handler: async () => ({ content: [] }),
      });

      expect(registry.has('temp_tool')).toBe(true);

      registry.unregisterTool('temp_tool');

      expect(registry.has('temp_tool')).toBe(false);
    });

    it('should search tools by name', () => {
      const tools = [
        { name: 'list_items', description: 'List items', inputSchema: { type: 'object' as const, properties: {} } },
        { name: 'create_item', description: 'Create item', inputSchema: { type: 'object' as const, properties: {} } },
        { name: 'delete_user', description: 'Delete user', inputSchema: { type: 'object' as const, properties: {} } },
      ];

      tools.forEach((tool) => {
        registry.registerTool({
          tool,
          handler: async () => ({ content: [] }),
        });
      });

      const results = registry.searchByName('item');
      expect(results).toHaveLength(2);
    });
  });

  describe('Tool Statistics', () => {
    it('should track execution statistics', async () => {
      const tool: MCPTool = {
        name: 'stats_tool',
        description: 'For stats',
        inputSchema: { type: 'object', properties: {} },
      };

      registry.registerTool({
        tool,
        handler: async () => ({ content: [{ type: 'text', text: 'ok' }] }),
      });

      await registry.executeTool('stats_tool', {});
      await registry.executeTool('stats_tool', {});

      const stats = registry.getStats('stats_tool');
      expect(stats['stats_tool'].calls).toBe(2);
      expect(stats['stats_tool'].errors).toBe(0);
    });
  });
});

describe('MCPResourceProvider', () => {
  let provider: MCPResourceProvider;

  beforeEach(() => {
    provider = new MCPResourceProvider({ caching: true, monitoring: true });
  });

  describe('Resource Registration', () => {
    it('should register a resource successfully', () => {
      const resource: MCPResourceDefinition = {
        resource: {
          uri: 'test://resource',
          name: 'Test Resource',
          description: 'A test resource',
        },
        provider: async () => ({
          uri: 'test://resource',
          text: 'test content',
        }),
      };

      expect(() => provider.registerResource(resource)).not.toThrow();
      expect(provider.has('test://resource')).toBe(true);
    });

    it('should reject duplicate resource registration', () => {
      const resource: MCPResourceDefinition = {
        resource: {
          uri: 'test://duplicate',
          name: 'Duplicate',
        },
        provider: async () => ({ uri: 'test://duplicate', text: '' }),
      };

      provider.registerResource(resource);
      expect(() => provider.registerResource(resource)).toThrow();
    });
  });

  describe('Resource Access', () => {
    it('should read a resource successfully', async () => {
      const resource: MCPResourceDefinition = {
        resource: {
          uri: 'test://content',
          name: 'Content Resource',
        },
        provider: async () => ({
          uri: 'test://content',
          text: 'Hello World',
        }),
      };

      provider.registerResource(resource);

      const contents = await provider.readResource('test://content');

      expect(contents.uri).toBe('test://content');
      expect(contents.text).toBe('Hello World');
    });

    it('should throw error for non-existent resource', async () => {
      await expect(provider.readResource('test://nonexistent')).rejects.toThrow();
    });

    it('should cache resource contents', async () => {
      let callCount = 0;

      const resource: MCPResourceDefinition = {
        resource: {
          uri: 'test://cached',
          name: 'Cached Resource',
        },
        provider: async () => {
          callCount++;
          return { uri: 'test://cached', text: 'cached content' };
        },
        cacheable: true,
      };

      provider.registerResource(resource);

      await provider.readResource('test://cached');
      await provider.readResource('test://cached');

      // Should only call provider once due to caching
      expect(callCount).toBe(1);
    });

    it('should respect non-cacheable resources', async () => {
      let callCount = 0;

      const resource: MCPResourceDefinition = {
        resource: {
          uri: 'test://nocache',
          name: 'Non-cached Resource',
        },
        provider: async () => {
          callCount++;
          return { uri: 'test://nocache', text: 'dynamic content' };
        },
        cacheable: false,
      };

      provider.registerResource(resource);

      await provider.readResource('test://nocache');
      await provider.readResource('test://nocache');

      // Should call provider twice
      expect(callCount).toBe(2);
    });
  });

  describe('Resource Management', () => {
    it('should list all resources', () => {
      const resources = [
        { uri: 'test://r1', name: 'Resource 1' },
        { uri: 'test://r2', name: 'Resource 2' },
      ];

      resources.forEach((res) => {
        provider.registerResource({
          resource: res,
          provider: async () => ({ uri: res.uri, text: '' }),
        });
      });

      const listed = provider.listResources();
      expect(listed).toHaveLength(2);
    });

    it('should unregister a resource', () => {
      const resource: MCPResourceDefinition = {
        resource: {
          uri: 'test://temp',
          name: 'Temporary',
        },
        provider: async () => ({ uri: 'test://temp', text: '' }),
      };

      provider.registerResource(resource);
      expect(provider.has('test://temp')).toBe(true);

      provider.unregisterResource('test://temp');
      expect(provider.has('test://temp')).toBe(false);
    });

    it('should search resources by name', () => {
      const resources = [
        { uri: 'test://workflow1', name: 'My Workflow' },
        { uri: 'test://workflow2', name: 'Another Workflow' },
        { uri: 'test://data1', name: 'Data Source' },
      ];

      resources.forEach((res) => {
        provider.registerResource({
          resource: res,
          provider: async () => ({ uri: res.uri, text: '' }),
        });
      });

      const results = provider.searchByName('workflow');
      expect(results).toHaveLength(2);
    });
  });

  describe('Cache Management', () => {
    it('should invalidate cache for a resource', async () => {
      let callCount = 0;

      const resource: MCPResourceDefinition = {
        resource: {
          uri: 'test://invalidate',
          name: 'Invalidate Test',
        },
        provider: async () => {
          callCount++;
          return { uri: 'test://invalidate', text: `call${callCount}` };
        },
        cacheable: true,
      };

      provider.registerResource(resource);

      await provider.readResource('test://invalidate');
      provider.invalidateCache('test://invalidate');
      await provider.readResource('test://invalidate');

      expect(callCount).toBe(2);
    });

    it('should clear all cache', async () => {
      const resources = [
        { uri: 'test://cache1', name: 'Cache 1' },
        { uri: 'test://cache2', name: 'Cache 2' },
      ];

      resources.forEach((res) => {
        provider.registerResource({
          resource: res,
          provider: async () => ({ uri: res.uri, text: 'cached' }),
          cacheable: true,
        });
      });

      await provider.readResource('test://cache1');
      await provider.readResource('test://cache2');

      const statsBefore = provider.getCacheStats();
      expect(statsBefore.size).toBe(2);

      provider.clearCache();

      const statsAfter = provider.getCacheStats();
      expect(statsAfter.size).toBe(0);
    });
  });

  describe('Resource Statistics', () => {
    it('should track access statistics', async () => {
      const resource: MCPResourceDefinition = {
        resource: {
          uri: 'test://stats',
          name: 'Stats Resource',
        },
        provider: async () => ({ uri: 'test://stats', text: 'content' }),
      };

      provider.registerResource(resource);

      await provider.readResource('test://stats');
      await provider.readResource('test://stats');

      const stats = provider.getStats('test://stats');
      expect(stats['test://stats'].reads).toBeGreaterThan(0);
    });
  });
});
