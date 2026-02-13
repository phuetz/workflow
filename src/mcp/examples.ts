/**
 * MCP Integration Examples
 * Practical examples for using the MCP implementation
 */

import { logger } from '../services/SimpleLogger';
import {
  MCPClient,
  MCPServer,
  MCPToolRegistry,
  MCPResourceProvider,
  MCPOrchestrator,
  WorkflowTools,
  DataTools,
  ExecutionTools,
} from './index';

// ============================================================================
// Example 1: Simple MCP Client
// ============================================================================

export async function simpleClientExample() {
  // Create and initialize client
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

  try {
    // Connect and initialize
    const initResult = await client.initialize();
    logger.debug('Connected to server:', initResult.serverInfo.name);

    // List available tools
    const tools = await client.listTools();
    logger.debug(`Found ${tools.length} tools:`);
    tools.forEach((tool) => {
      logger.debug(`  - ${tool.name}: ${tool.description}`);
    });

    // Execute a tool
    const result = await client.callTool('list_workflows', {});
    if (!result.isError) {
      const content = result.content[0];
      logger.debug('Workflows:', content.type === 'text' ? content.text : JSON.stringify(content));
    }

    // Clean up
    client.disconnect();
  } catch (error) {
    logger.error('Client error:', error);
  }
}

// ============================================================================
// Example 2: MCP Server with Custom Tools
// ============================================================================

export async function customServerExample() {
  // Create tool registry
  const toolRegistry = new MCPToolRegistry({
    validation: true,
    monitoring: true,
  });

  // Register custom tool
  toolRegistry.registerTool({
    tool: {
      name: 'greet_user',
      description: 'Greet a user by name',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'User name',
            required: true,
          },
          language: {
            type: 'string',
            description: 'Language for greeting',
            enum: ['en', 'es', 'fr'],
            default: 'en',
          },
        },
        required: ['name'],
      },
    },
    handler: async (params) => {
      const greetings: Record<string, string> = {
        en: 'Hello',
        es: 'Hola',
        fr: 'Bonjour',
      };

      const greeting = greetings[params.language as string] || greetings.en;
      const message = `${greeting}, ${params.name}!`;

      return {
        content: [{ type: 'text', text: message }],
      };
    },
    tags: ['greeting', 'user'],
    metadata: {
      category: 'utility',
      author: 'workflow-app',
    },
  });

  // Create and start server
  const server = new MCPServer(
    {
      name: 'custom-server',
      version: '1.0.0',
      capabilities: {
        tools: { listChanged: true },
      },
    },
    toolRegistry
  );

  await server.start(8080);
  logger.debug('Server started on port 8080');

  // Server will run until stopped
  // await server.stop();
}

// ============================================================================
// Example 3: Resource Provider
// ============================================================================

export async function resourceProviderExample() {
  const resourceProvider = new MCPResourceProvider({
    caching: true,
    defaultTTL: 60000, // 1 minute
    monitoring: true,
  });

  // Register a dynamic resource
  resourceProvider.registerResource({
    resource: {
      uri: 'weather://current',
      name: 'Current Weather',
      description: 'Real-time weather data',
      mimeType: 'application/json',
    },
    provider: async (uri) => {
      // Fetch weather data (mock)
      const weather = {
        temperature: 72,
        condition: 'sunny',
        humidity: 45,
        wind: 8,
      };

      return {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(weather, null, 2),
      };
    },
    cacheable: true,
    ttl: 300000, // 5 minutes
  });

  // Read resource
  const contents = await resourceProvider.readResource('weather://current');
  logger.debug('Weather data:', contents.text);

  // Check cache stats
  const stats = resourceProvider.getCacheStats();
  logger.debug('Cache stats:', stats);
}

// ============================================================================
// Example 4: Workflow Tools Integration
// ============================================================================

export async function workflowToolsExample() {
  // Mock workflow store
  const workflows: Array<{
    id: string;
    name: string;
    nodes: any[];
    edges: any[];
  }> = [];

  // Create workflow tools
  const workflowTools = new WorkflowTools({
    getWorkflows: async () => workflows,

    getWorkflow: async (id) => workflows.find((w) => w.id === id) || null,

    createWorkflow: async (name, nodes = [], edges = []) => {
      const id = `wf-${Date.now()}`;
      workflows.push({ id, name, nodes, edges });
      return id;
    },

    updateWorkflow: async (id, updates) => {
      const workflow = workflows.find((w) => w.id === id);
      if (workflow) {
        Object.assign(workflow, updates);
      }
    },

    deleteWorkflow: async (id) => {
      const index = workflows.findIndex((w) => w.id === id);
      if (index > -1) {
        workflows.splice(index, 1);
      }
    },

    validateWorkflow: async (id) => {
      const workflow = workflows.find((w) => w.id === id);
      if (!workflow) {
        return { valid: false, errors: ['Workflow not found'] };
      }
      return { valid: true, errors: [] };
    },
  });

  // Register all workflow tools
  const toolRegistry = new MCPToolRegistry({});
  workflowTools.getTools().forEach((tool) => toolRegistry.registerTool(tool));

  // Execute workflow tools
  await toolRegistry.executeTool('create_workflow', {
    name: 'My Workflow',
  });

  const result = await toolRegistry.executeTool('list_workflows', {});
  const content = result.content[0];
  logger.debug('Workflows:', content.type === 'text' ? content.text : JSON.stringify(content));
}

// ============================================================================
// Example 5: Multi-Server Orchestration
// ============================================================================

export async function orchestrationExample() {
  // Create orchestrator with multiple servers
  const orchestrator = new MCPOrchestrator({
    servers: [
      {
        url: 'ws://server1.example.com:8080',
        transport: 'websocket',
      },
      {
        url: 'ws://server2.example.com:8080',
        transport: 'websocket',
      },
      {
        url: 'ws://server3.example.com:8080',
        transport: 'websocket',
      },
    ],
    loadBalancing: 'round-robin',
    healthCheckInterval: 30000,
    failoverEnabled: true,
  });

  try {
    // Initialize all connections
    await orchestrator.initialize();

    // Get all available tools from all servers
    const allTools = orchestrator.listAllTools();
    logger.debug(`Total tools available: ${allTools.length}`);

    // Execute tool (automatically routed to best server)
    const result = await orchestrator.callTool('execute_workflow', {
      workflowId: 'wf-123',
    });

    // Get orchestrator statistics
    const stats = orchestrator.getStats();
    logger.debug('Orchestrator stats:', {
      servers: stats.totalServers,
      connected: stats.connectedServers,
      tools: stats.totalTools,
      requests: stats.requestsProcessed,
      failovers: stats.failovers,
      avgLatency: stats.averageLatency.toFixed(2) + 'ms',
    });

    // Listen to events
    orchestrator.on((event) => {
      logger.debug('Event:', event.type, event.serverId);
    });

    // Clean up
    await orchestrator.disconnectAll();
  } catch (error) {
    logger.error('Orchestration error:', error);
  }
}

// ============================================================================
// Example 6: Full Stack Integration
// ============================================================================

export async function fullStackExample() {
  // 1. Create server with all tools
  const toolRegistry = new MCPToolRegistry({});
  const resourceProvider = new MCPResourceProvider({});

  // Register workflow tools
  const workflowTools = new WorkflowTools({
    getWorkflows: async () => [],
    getWorkflow: async () => null,
    createWorkflow: async () => 'wf-1',
    updateWorkflow: async () => {},
    deleteWorkflow: async () => {},
    validateWorkflow: async () => ({ valid: true, errors: [] }),
  });

  workflowTools.getTools().forEach((tool) => toolRegistry.registerTool(tool));

  // Register data tools
  const dataStore = new Map<string, unknown>();
  const dataTools = new DataTools({
    getData: async (key) => dataStore.get(key),
    setData: async (key, value) => {
      dataStore.set(key, value);
    },
    deleteData: async (key) => {
      dataStore.delete(key);
    },
    listKeys: async (prefix) =>
      Array.from(dataStore.keys()).filter((k) => !prefix || k.startsWith(prefix)),
    query: async () => Array.from(dataStore.values()),
  });

  dataTools.getTools().forEach((tool) => toolRegistry.registerTool(tool));

  // Register execution tools
  const executionTools = new ExecutionTools({
    executeWorkflow: async () => 'exec-1',
    getExecutionStatus: async () => [],
    stopExecution: async () => {},
    getExecutionHistory: async () => [],
    getExecutionLogs: async () => [],
  });

  executionTools.getTools().forEach((tool) => toolRegistry.registerTool(tool));

  // 2. Start server
  const server = new MCPServer(
    {
      name: 'workflow-mcp-server',
      version: '1.0.0',
      capabilities: {
        tools: { listChanged: true },
        resources: { subscribe: true, listChanged: true },
      },
      port: 8080,
    },
    toolRegistry,
    resourceProvider
  );

  await server.start();
  logger.debug('MCP Server running with', toolRegistry.count(), 'tools');

  // 3. Create client and connect
  const client = new MCPClient({
    url: 'ws://localhost:8080',
    transport: 'websocket',
    clientName: 'workflow-client',
    clientVersion: '1.0.0',
  });

  await client.initialize();

  // 4. Use the system
  const tools = await client.listTools();
  logger.debug('Available tools:', tools.map((t) => t.name));

  // Create a workflow
  await client.callTool('create_workflow', { name: 'Test Workflow' });

  // Store some data
  await client.callTool('set_data', { key: 'test', value: { foo: 'bar' } });

  // Retrieve data
  const data = await client.callTool('get_data', { key: 'test' });
  const dataContent = data.content[0];
  logger.debug('Retrieved data:', dataContent.type === 'text' ? dataContent.text : JSON.stringify(dataContent));

  // Clean up
  client.disconnect();
  await server.stop();
}

// ============================================================================
// Example 7: Error Handling
// ============================================================================

export async function errorHandlingExample() {
  const client = new MCPClient({
    url: 'ws://localhost:8080',
    transport: 'websocket',
    clientName: 'error-example',
    clientVersion: '1.0.0',
    reconnect: true,
    maxReconnectAttempts: 5,
    timeout: 10000,
  });

  // Handle connection events
  client.on((event) => {
    switch (event.type) {
      case 'connected':
        logger.debug('✓ Connected');
        break;
      case 'disconnected':
        logger.debug('✗ Disconnected');
        break;
      case 'reconnecting':
        logger.debug('⟳ Reconnecting...');
        break;
      case 'error':
        logger.error('✗ Error:', event.error);
        break;
    }
  });

  try {
    await client.initialize();

    // Call tool with error handling
    try {
      const result = await client.callTool('non_existent_tool', {});
      if (result.isError) {
        const errorContent = result.content[0];
        logger.error('Tool error:', errorContent.type === 'text' ? errorContent.text : JSON.stringify(errorContent));
      }
    } catch (error) {
      logger.error('Execution error:', error);
    }
  } catch (error) {
    logger.error('Connection error:', error);
  } finally {
    client.disconnect();
  }
}

// ============================================================================
// Example 8: Monitoring and Statistics
// ============================================================================

export async function monitoringExample() {
  const toolRegistry = new MCPToolRegistry({
    monitoring: true,
  });

  // Register some tools
  for (let i = 1; i <= 5; i++) {
    toolRegistry.registerTool({
      tool: {
        name: `tool_${i}`,
        description: `Test tool ${i}`,
        inputSchema: { type: 'object', properties: {} },
      },
      handler: async () => {
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));
        return { content: [{ type: 'text', text: `Result from tool ${i}` }] };
      },
    });
  }

  // Execute tools multiple times
  for (let i = 0; i < 20; i++) {
    const toolName = `tool_${(i % 5) + 1}`;
    await toolRegistry.executeTool(toolName, {});
  }

  // Get statistics
  const stats = toolRegistry.getStats();
  logger.debug('\nTool Statistics:');
  Object.entries(stats).forEach(([name, stat]) => {
    logger.debug(`${name}:`);
    logger.debug(`  Calls: ${stat.calls}`);
    logger.debug(`  Errors: ${stat.errors}`);
    logger.debug(`  Avg Time: ${stat.avgTime.toFixed(2)}ms`);
  });
}

// ============================================================================
// Run Examples
// ============================================================================

if (require.main === module) {
  logger.debug('=== MCP Integration Examples ===\n');

  // Uncomment to run specific examples
  // simpleClientExample();
  // customServerExample();
  // resourceProviderExample();
  // workflowToolsExample();
  // orchestrationExample();
  // fullStackExample();
  // errorHandlingExample();
  // monitoringExample();
}
