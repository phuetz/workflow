# MCP Integration Guide

## Overview

This guide provides comprehensive documentation for the Model Context Protocol (MCP) integration in the workflow automation platform. MCP enables seamless communication between AI models and external systems through a standardized protocol.

## Table of Contents

1. [Architecture](#architecture)
2. [Getting Started](#getting-started)
3. [MCP Client](#mcp-client)
4. [MCP Server](#mcp-server)
5. [Tools System](#tools-system)
6. [Resources System](#resources-system)
7. [Orchestration](#orchestration)
8. [Workflow Integration](#workflow-integration)
9. [UI Components](#ui-components)
10. [Testing](#testing)
11. [Best Practices](#best-practices)
12. [Troubleshooting](#troubleshooting)

---

## Architecture

### Core Components

The MCP integration consists of several layers:

```
┌─────────────────────────────────────────────────────────┐
│                    UI Layer                              │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │ MCPDashboard │  │ MCPToolsPanel│                    │
│  └──────────────┘  └──────────────┘                    │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                Orchestration Layer                       │
│              ┌──────────────────┐                       │
│              │ MCPOrchestrator  │                       │
│              └──────────────────┘                       │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                  Client/Server Layer                     │
│  ┌───────────┐              ┌───────────┐              │
│  │ MCPClient │              │ MCPServer │              │
│  └───────────┘              └───────────┘              │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                   Protocol Layer                         │
│        ┌────────────┐    ┌─────────────┐               │
│        │MCPProtocol │    │MCPConnection│               │
│        └────────────┘    └─────────────┘               │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                  Registry Layer                          │
│  ┌────────────────┐  ┌──────────────────┐             │
│  │ MCPToolRegistry│  │MCPResourceProvider│             │
│  └────────────────┘  └──────────────────┘             │
└─────────────────────────────────────────────────────────┘
```

### Protocol Specification

- **Protocol Version**: 2024-11-05
- **Transport**: WebSocket (primary), SSE, stdio
- **Message Format**: JSON-RPC 2.0
- **Authentication**: Bearer token, API key, Basic auth

---

## Getting Started

### Installation

The MCP integration is built-in. No additional installation required.

### Quick Start - Client

```typescript
import { MCPClient } from './mcp/MCPClient';

// Create client
const client = new MCPClient({
  url: 'ws://localhost:8080',
  transport: 'websocket',
  clientName: 'workflow-app',
  clientVersion: '1.0.0',
  capabilities: {
    tools: { listChanged: true },
    resources: { subscribe: true, listChanged: true },
  },
});

// Initialize and connect
await client.initialize();

// List available tools
const tools = await client.listTools();

// Execute a tool
const result = await client.callTool('list_workflows', {});

// Disconnect
client.disconnect();
```

### Quick Start - Server

```typescript
import { MCPServer } from './mcp/MCPServer';
import { MCPToolRegistry } from './mcp/MCPToolRegistry';
import { MCPResourceProvider } from './mcp/MCPResourceProvider';

// Create registries
const toolRegistry = new MCPToolRegistry({});
const resourceProvider = new MCPResourceProvider({});

// Register a tool
toolRegistry.registerTool({
  tool: {
    name: 'echo',
    description: 'Echo a message',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', required: true },
      },
      required: ['message'],
    },
  },
  handler: async (params) => ({
    content: [{ type: 'text', text: params.message as string }],
  }),
});

// Create and start server
const server = new MCPServer(
  {
    name: 'workflow-server',
    version: '1.0.0',
    capabilities: {
      tools: { listChanged: true },
      resources: { subscribe: true, listChanged: true },
    },
  },
  toolRegistry,
  resourceProvider
);

await server.start(8080);
```

---

## MCP Client

### Configuration

```typescript
interface MCPClientConfig {
  url: string;                     // Server URL
  transport: 'websocket' | 'sse';  // Transport type
  clientName: string;              // Client identifier
  clientVersion: string;           // Client version
  capabilities?: MCPCapabilities;  // Client capabilities
  reconnect?: boolean;             // Auto-reconnect (default: true)
  reconnectDelay?: number;         // Reconnect delay ms (default: 1000)
  maxReconnectAttempts?: number;   // Max attempts (default: 10)
  timeout?: number;                // Request timeout ms (default: 30000)
  authentication?: {
    type: 'bearer' | 'apiKey' | 'basic';
    token?: string;
    apiKey?: string;
    username?: string;
    password?: string;
  };
}
```

### Methods

#### `initialize(): Promise<MCPInitializeResult>`

Performs the MCP handshake with the server.

```typescript
const result = await client.initialize();
console.log('Server:', result.serverInfo.name);
console.log('Protocol:', result.protocolVersion);
```

#### `listTools(): Promise<MCPTool[]>`

Lists all available tools from the server.

```typescript
const tools = await client.listTools();
tools.forEach(tool => {
  console.log(`${tool.name}: ${tool.description}`);
});
```

#### `callTool(name: string, args?: Record<string, unknown>): Promise<MCPToolCallResult>`

Executes a tool with given arguments.

```typescript
const result = await client.callTool('create_workflow', {
  name: 'New Workflow',
});

if (result.isError) {
  console.error('Error:', result.content[0].text);
} else {
  console.log('Success:', result.content[0].text);
}
```

#### `listResources(): Promise<MCPResource[]>`

Lists all available resources.

```typescript
const resources = await client.listResources();
```

#### `readResource(uri: string): Promise<MCPReadResourceResult>`

Reads a resource by URI.

```typescript
const result = await client.readResource('workflow://my-workflow');
console.log(result.contents[0].text);
```

#### `subscribeResource(uri: string): Promise<void>`

Subscribes to resource updates.

```typescript
await client.subscribeResource('workflow://my-workflow');
```

### Events

Listen to client events:

```typescript
client.on((event) => {
  switch (event.type) {
    case 'connected':
      console.log('Connected to server');
      break;
    case 'disconnected':
      console.log('Disconnected');
      break;
    case 'toolsListChanged':
      console.log('Tools list updated');
      break;
    case 'error':
      console.error('Error:', event.error);
      break;
  }
});
```

---

## MCP Server

### Configuration

```typescript
interface MCPServerConfig {
  name: string;                    // Server name
  version: string;                 // Server version
  capabilities: MCPCapabilities;   // Server capabilities
  port?: number;                   // Listen port (default: 8080)
  maxClients?: number;             // Max clients (default: 100)
  authentication?: {
    type: 'bearer' | 'apiKey';
    // Authentication config
  };
  cors?: {
    origin: string | string[];
    credentials?: boolean;
  };
}
```

### Starting the Server

```typescript
const server = new MCPServer(config, toolRegistry, resourceProvider);

// Start listening
await server.start(8080);
console.log('MCP Server running on port 8080');

// Stop server
await server.stop();
```

### Notifications

Notify clients of changes:

```typescript
// Notify tools list changed
server.notifyToolsListChanged();

// Notify resources list changed
server.notifyResourcesListChanged();

// Notify specific resource updated
server.notifyResourceUpdated('workflow://my-workflow');
```

### Statistics

Get server statistics:

```typescript
const stats = server.getStats();
console.log('Connected clients:', stats.connectedClients);
console.log('Total requests:', stats.totalRequests);
console.log('Uptime:', stats.uptime);
```

---

## Tools System

### Tool Definition

```typescript
interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, MCPToolParameter>;
    required?: string[];
  };
}
```

### Registering Tools

```typescript
const toolRegistry = new MCPToolRegistry({
  namespace: 'workflow',      // Optional namespace
  versioning: false,          // Enable versioning
  validation: true,           // Validate arguments
  monitoring: true,           // Track statistics
});

toolRegistry.registerTool({
  tool: {
    name: 'list_workflows',
    description: 'List all workflows',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  handler: async (params) => {
    const workflows = await getWorkflows();
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(workflows, null, 2),
      }],
    };
  },
  tags: ['workflows', 'list'],
  metadata: {
    category: 'workflow-management',
  },
});
```

### Tool Parameters

```typescript
properties: {
  workflowId: {
    type: 'string',
    description: 'The workflow ID',
    required: true,
  },
  limit: {
    type: 'number',
    description: 'Max results',
    default: 10,
  },
  status: {
    type: 'string',
    enum: ['active', 'inactive', 'all'],
    description: 'Filter by status',
  },
  config: {
    type: 'object',
    description: 'Configuration object',
    properties: {
      timeout: { type: 'number' },
      retries: { type: 'number' },
    },
  },
}
```

### Tool Handler

```typescript
handler: async (params: Record<string, unknown>) => {
  try {
    // Execute tool logic
    const result = await doSomething(params);

    // Return success
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result),
      }],
    };
  } catch (error) {
    // Return error
    return {
      content: [{
        type: 'text',
        text: `Error: ${error.message}`,
      }],
      isError: true,
    };
  }
}
```

### Tool Statistics

```typescript
const stats = toolRegistry.getStats();

// Per-tool stats
Object.entries(stats).forEach(([toolName, toolStats]) => {
  console.log(`${toolName}:`);
  console.log(`  Calls: ${toolStats.calls}`);
  console.log(`  Errors: ${toolStats.errors}`);
  console.log(`  Avg Time: ${toolStats.avgTime}ms`);
});
```

---

## Resources System

### Resource Definition

```typescript
interface MCPResource {
  uri: string;           // Unique resource identifier
  name: string;          // Human-readable name
  description?: string;  // Resource description
  mimeType?: string;     // Content type
}
```

### Registering Resources

```typescript
const resourceProvider = new MCPResourceProvider({
  caching: true,           // Enable caching
  defaultTTL: 60000,       // Cache TTL (1 minute)
  maxCacheSize: 100,       // Max cached items
  monitoring: true,        // Track statistics
});

resourceProvider.registerResource({
  resource: {
    uri: 'workflow://list',
    name: 'Workflows List',
    description: 'All available workflows',
    mimeType: 'application/json',
  },
  provider: async (uri) => {
    const workflows = await getWorkflows();
    return {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(workflows),
    };
  },
  cacheable: true,
  ttl: 30000,  // 30 seconds
});
```

### Resource Provider

```typescript
provider: async (uri: string) => {
  // Extract resource ID from URI
  const id = uri.split('//')[1];

  // Fetch resource data
  const data = await fetchResourceData(id);

  // Return resource contents
  return {
    uri,
    mimeType: 'application/json',
    text: JSON.stringify(data),
  };
}
```

### Cache Management

```typescript
// Invalidate specific resource
resourceProvider.invalidateCache('workflow://my-workflow');

// Clear all cache
resourceProvider.clearCache();

// Get cache statistics
const stats = resourceProvider.getCacheStats();
console.log('Cache size:', stats.size);
console.log('Hit rate:', (stats.hitRate * 100).toFixed(1) + '%');
```

---

## Orchestration

### MCPOrchestrator

Coordinates multiple MCP servers with load balancing and failover.

```typescript
import { MCPOrchestrator } from './mcp/MCPOrchestrator';

const orchestrator = new MCPOrchestrator({
  servers: [
    {
      url: 'ws://server1:8080',
      transport: 'websocket',
    },
    {
      url: 'ws://server2:8080',
      transport: 'websocket',
    },
  ],
  loadBalancing: 'round-robin',  // 'round-robin', 'priority', 'random'
  healthCheckInterval: 30000,     // 30 seconds
  failoverEnabled: true,
});

// Initialize all servers
await orchestrator.initialize();

// Call tool (automatically routes to available server)
const result = await orchestrator.callTool('execute_workflow', {
  workflowId: 'wf-123',
});
```

### Load Balancing Strategies

#### Round-Robin
```typescript
loadBalancing: 'round-robin'
```
Distributes requests evenly across servers.

#### Priority
```typescript
loadBalancing: 'priority'
```
Routes to highest priority server first.

#### Random
```typescript
loadBalancing: 'random'
```
Randomly selects a server.

#### Least Connections
```typescript
loadBalancing: 'least-connections'
```
Routes to server with fewest active connections.

### Failover

Automatic failover when enabled:

```typescript
failoverEnabled: true
```

If a server fails, the orchestrator automatically retries on another server.

### Statistics

```typescript
const stats = orchestrator.getStats();
console.log('Total servers:', stats.totalServers);
console.log('Connected:', stats.connectedServers);
console.log('Total tools:', stats.totalTools);
console.log('Requests:', stats.requestsProcessed);
console.log('Failovers:', stats.failovers);
console.log('Avg latency:', stats.averageLatency.toFixed(2) + 'ms');
```

---

## Workflow Integration

### Workflow Tools

Expose workflows as MCP tools:

```typescript
import { WorkflowTools } from './mcp/tools/WorkflowTool';

const workflowTools = new WorkflowTools({
  getWorkflows: async () => {
    // Return all workflows
    return workflowStore.getState().workflows;
  },
  getWorkflow: async (id) => {
    // Return specific workflow
    return workflowStore.getState().workflows.find(w => w.id === id);
  },
  createWorkflow: async (name, nodes, edges) => {
    // Create new workflow
    const id = generateId();
    workflowStore.getState().addWorkflow({ id, name, nodes, edges });
    return id;
  },
  updateWorkflow: async (id, updates) => {
    // Update workflow
    workflowStore.getState().updateWorkflow(id, updates);
  },
  deleteWorkflow: async (id) => {
    // Delete workflow
    workflowStore.getState().deleteWorkflow(id);
  },
  validateWorkflow: async (id) => {
    // Validate workflow
    return workflowValidator.validate(id);
  },
});

// Register all workflow tools
const tools = workflowTools.getTools();
tools.forEach(tool => toolRegistry.registerTool(tool));
```

### Data Tools

Expose data operations:

```typescript
import { DataTools } from './mcp/tools/DataTool';

const dataTools = new DataTools({
  getData: async (key) => localStorage.getItem(key),
  setData: async (key, value) => localStorage.setItem(key, JSON.stringify(value)),
  deleteData: async (key) => localStorage.removeItem(key),
  listKeys: async (prefix) => {
    const keys = Object.keys(localStorage);
    return prefix ? keys.filter(k => k.startsWith(prefix)) : keys;
  },
  query: async (filter) => {
    // Query data with filters
    return queryDatabase(filter);
  },
});

dataTools.getTools().forEach(tool => toolRegistry.registerTool(tool));
```

### Execution Tools

Control workflow execution:

```typescript
import { ExecutionTools } from './mcp/tools/ExecutionTool';

const executionTools = new ExecutionTools({
  executeWorkflow: async (workflowId, input) => {
    const executionId = generateId();
    await workflowExecutor.execute(workflowId, input, executionId);
    return executionId;
  },
  getExecutionStatus: async (executionId) => {
    return executionStore.getStatus(executionId);
  },
  stopExecution: async (executionId) => {
    await workflowExecutor.stop(executionId);
  },
  getExecutionHistory: async (workflowId, limit = 10) => {
    return executionStore.getHistory(workflowId, limit);
  },
  getExecutionLogs: async (executionId) => {
    return executionStore.getLogs(executionId);
  },
});

executionTools.getTools().forEach(tool => toolRegistry.registerTool(tool));
```

---

## UI Components

### MCPDashboard

Overview and management UI:

```tsx
import { MCPDashboard } from './components/MCPDashboard';

function App() {
  const [orchestrator, setOrchestrator] = useState<MCPOrchestrator>();

  return (
    <MCPDashboard
      connections={orchestrator?.getConnections() || []}
      stats={orchestrator?.getStats() || defaultStats}
      tools={orchestrator?.listAllTools() || []}
      resources={orchestrator?.listAllResources() || []}
      onRefresh={() => orchestrator?.initialize()}
      darkMode={true}
    />
  );
}
```

### MCPToolsPanel

Tool execution UI:

```tsx
import { MCPToolsPanel } from './components/MCPToolsPanel';

function ToolsView() {
  const [orchestrator, setOrchestrator] = useState<MCPOrchestrator>();

  return (
    <MCPToolsPanel
      tools={orchestrator?.listAllTools() || []}
      onExecuteTool={async (name, args) => {
        return orchestrator?.callTool(name, args);
      }}
      darkMode={true}
    />
  );
}
```

---

## Testing

### Running Tests

```bash
# Run all MCP tests
npm test src/__tests__/mcp.test.ts

# Run with coverage
npm run test:coverage -- src/__tests__/mcp.test.ts
```

### Test Coverage

The test suite includes 30+ tests covering:

- Protocol message creation and validation
- Protocol negotiation and handshake
- Tool registration and execution
- Tool argument validation
- Resource registration and access
- Resource caching
- Statistics tracking
- Error handling

### Example Test

```typescript
import { MCPProtocol } from '../mcp/MCPProtocol';

describe('MCPProtocol', () => {
  it('should create a valid request', () => {
    const protocol = new MCPProtocol();
    const request = protocol.createRequest('test', { param: 'value' });

    expect(request.jsonrpc).toBe('2.0');
    expect(request.method).toBe('test');
    expect(request.params).toEqual({ param: 'value' });
  });
});
```

---

## Best Practices

### 1. Connection Management

```typescript
// Use reconnection for production
const client = new MCPClient({
  url: 'ws://server:8080',
  reconnect: true,
  reconnectDelay: 1000,
  maxReconnectAttempts: 10,
});

// Handle connection events
client.on((event) => {
  if (event.type === 'disconnected') {
    // Notify user or retry
  }
});
```

### 2. Error Handling

```typescript
// Always handle tool execution errors
try {
  const result = await client.callTool('my_tool', params);
  if (result.isError) {
    console.error('Tool error:', result.content[0].text);
  }
} catch (error) {
  console.error('Connection error:', error);
}
```

### 3. Resource Caching

```typescript
// Use caching for frequently accessed resources
resourceProvider.registerResource({
  resource: { uri: 'data://config', name: 'Config' },
  provider: async () => fetchConfig(),
  cacheable: true,
  ttl: 300000,  // 5 minutes
});
```

### 4. Tool Validation

```typescript
// Enable validation in production
const registry = new MCPToolRegistry({
  validation: true,
  monitoring: true,
});
```

### 5. Orchestration

```typescript
// Use orchestrator for multiple servers
const orchestrator = new MCPOrchestrator({
  servers: [...],
  loadBalancing: 'round-robin',
  failoverEnabled: true,
  healthCheckInterval: 30000,
});
```

---

## Troubleshooting

### Connection Issues

**Problem**: Client cannot connect to server

**Solutions**:
- Check server is running: `netstat -an | grep 8080`
- Verify URL is correct
- Check firewall settings
- Verify authentication credentials

### Protocol Version Mismatch

**Problem**: Protocol version not supported

**Solutions**:
- Update client/server to matching versions
- Check `protocolVersion` in initialize response

### Tool Not Found

**Problem**: Tool execution fails with "Tool not found"

**Solutions**:
- List available tools: `client.listTools()`
- Check tool name spelling
- Verify tool is registered on server

### Resource Access Denied

**Problem**: Cannot read resource

**Solutions**:
- Check resource URI is correct
- Verify resource is registered
- Check authentication/permissions

### High Latency

**Problem**: Slow tool execution

**Solutions**:
- Check network latency
- Review tool implementation performance
- Consider caching frequently accessed data
- Use load balancing with orchestrator

### Memory Leaks

**Problem**: Memory usage increases over time

**Solutions**:
- Implement cache size limits
- Clear old cache entries
- Disconnect unused clients
- Monitor resource provider cache

---

## API Reference

### MCPProtocol

- `createRequest(method, params?)`
- `createNotification(method, params?)`
- `createResponse(id, result)`
- `createErrorResponse(id, code, message, data?)`
- `validateMessage(message)`
- `parseMessage(data)`
- `negotiateCapabilities(client, server)`

### MCPClient

- `initialize()`
- `disconnect()`
- `listTools()`
- `callTool(name, args?)`
- `listResources()`
- `readResource(uri)`
- `subscribeResource(uri)`
- `unsubscribeResource(uri)`
- `listPrompts()`
- `getPrompt(name, args?)`
- `healthCheck()`
- `on(handler)`
- `off(handler)`

### MCPServer

- `start(port?)`
- `stop()`
- `notifyToolsListChanged()`
- `notifyResourcesListChanged()`
- `notifyResourceUpdated(uri)`
- `getStats()`
- `on(handler)`
- `off(handler)`

### MCPToolRegistry

- `registerTool(definition)`
- `unregisterTool(name, version?)`
- `getTool(name, version?)`
- `listTools()`
- `executeTool(name, args)`
- `searchByTag(tag)`
- `searchByName(pattern)`
- `getStats(name?)`
- `deprecateTool(name, version?)`

### MCPResourceProvider

- `registerResource(definition)`
- `unregisterResource(uri)`
- `getResource(uri)`
- `listResources()`
- `readResource(uri)`
- `subscribe(uri)`
- `unsubscribe(uri)`
- `invalidateCache(uri)`
- `clearCache()`
- `getStats(uri?)`
- `getCacheStats()`

### MCPOrchestrator

- `initialize()`
- `disconnectAll()`
- `listAllTools()`
- `listAllResources()`
- `callTool(name, args?)`
- `getConnections()`
- `getStats()`
- `on(handler)`
- `off(handler)`

---

## Support

For issues or questions:

1. Check this guide first
2. Review test examples
3. Check protocol specification: https://spec.modelcontextprotocol.io/
4. Open an issue on GitHub

---

## License

MIT License - See LICENSE file for details
