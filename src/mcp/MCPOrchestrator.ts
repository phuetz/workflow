/**
 * MCP Orchestrator
 * Coordinates multiple MCP servers with load balancing and failover
 */

import type {
  MCPOrchestratorConfig,
  MCPOrchestratorStats,
  MCPServerConnection,
  MCPTool,
  MCPResource,
  MCPToolCallResult,
  MCPEvent,
  MCPEventHandler,
  MCPConnectionConfig,
} from '../types/mcp';
import { MCPClient, MCPClientConfig } from './MCPClient';
import { logger } from '../services/SimpleLogger';

export class MCPOrchestrator {
  private config: MCPOrchestratorConfig;
  private connections = new Map<string, MCPServerConnection>();
  private clients = new Map<string, MCPClient>();
  private stats: MCPOrchestratorStats;
  private eventHandlers: MCPEventHandler[] = [];
  private healthCheckInterval?: NodeJS.Timeout;
  private currentServerIndex = 0;

  constructor(config: MCPOrchestratorConfig) {
    this.config = {
      loadBalancing: 'round-robin',
      healthCheckInterval: 30000,
      failoverEnabled: true,
      toolRouting: 'any',
      ...config,
    };

    this.stats = {
      totalServers: 0,
      connectedServers: 0,
      totalTools: 0,
      totalResources: 0,
      requestsProcessed: 0,
      failovers: 0,
      averageLatency: 0,
    };
  }

  /**
   * Initialize all server connections
   */
  async initialize(): Promise<void> {
    const connectionPromises = this.config.servers.map(async (serverConfig) => {
      try {
        await this.connectServer(serverConfig);
      } catch (error) {
        logger.error(`Failed to connect to server ${serverConfig.url}:`, error);
      }
    });

    await Promise.all(connectionPromises);

    // Start health check
    this.startHealthCheck();

    this.updateStats();
  }

  /**
   * Connect to a server
   */
  private async connectServer(serverConfig: MCPConnectionConfig): Promise<void> {
    const serverId = this.generateServerId(serverConfig.url);

    const clientConfig: MCPClientConfig = {
      ...serverConfig,
      clientName: 'workflow-orchestrator',
      clientVersion: '1.0.0',
    };

    const client = new MCPClient(clientConfig);

    // Listen to client events
    client.on(this.handleClientEvent.bind(this, serverId));

    try {
      const result = await client.initialize();

      const connection: MCPServerConnection = {
        id: serverId,
        name: result.serverInfo.name,
        url: serverConfig.url,
        status: client.getConnectionStatus(),
        capabilities: result.capabilities,
        tools: client.getCachedTools(),
        resources: client.getCachedResources(),
        lastPing: new Date(),
        priority: 1,
      };

      this.connections.set(serverId, connection);
      this.clients.set(serverId, client);

      this.emitEvent({
        type: 'connected',
        timestamp: new Date(),
        serverId,
        data: { serverName: connection.name },
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Disconnect from a server
   */
  async disconnectServer(serverId: string): Promise<void> {
    const client = this.clients.get(serverId);
    if (client) {
      client.disconnect();
      this.clients.delete(serverId);
    }

    this.connections.delete(serverId);
    this.updateStats();

    this.emitEvent({
      type: 'disconnected',
      timestamp: new Date(),
      serverId,
    });
  }

  /**
   * Disconnect all servers
   */
  async disconnectAll(): Promise<void> {
    this.stopHealthCheck();

    const disconnectPromises = Array.from(this.connections.keys()).map((serverId) =>
      this.disconnectServer(serverId)
    );

    await Promise.all(disconnectPromises);
  }

  /**
   * List all available tools from all servers
   */
  listAllTools(): MCPTool[] {
    const tools: MCPTool[] = [];
    const toolNames = new Set<string>();

    for (const connection of this.connections.values()) {
      if (connection.tools) {
        for (const tool of connection.tools) {
          if (!toolNames.has(tool.name)) {
            tools.push(tool);
            toolNames.add(tool.name);
          }
        }
      }
    }

    return tools;
  }

  /**
   * List all available resources from all servers
   */
  listAllResources(): MCPResource[] {
    const resources: MCPResource[] = [];
    const resourceUris = new Set<string>();

    for (const connection of this.connections.values()) {
      if (connection.resources) {
        for (const resource of connection.resources) {
          if (!resourceUris.has(resource.uri)) {
            resources.push(resource);
            resourceUris.add(resource.uri);
          }
        }
      }
    }

    return resources;
  }

  /**
   * Call a tool across servers
   */
  async callTool(
    toolName: string,
    args?: Record<string, unknown>
  ): Promise<MCPToolCallResult> {
    const startTime = Date.now();

    try {
      // Find servers that have this tool
      const serversWithTool = this.findServersWithTool(toolName);

      if (serversWithTool.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `Tool not found: ${toolName}`,
            },
          ],
          isError: true,
        };
      }

      // Select server based on load balancing strategy
      const server = this.selectServer(serversWithTool);
      const client = this.clients.get(server.id);

      if (!client) {
        return {
          content: [
            {
              type: 'text',
              text: `Server not available: ${server.name}`,
            },
          ],
          isError: true,
        };
      }

      // Execute tool
      const result = await client.callTool(toolName, args);

      // Update stats
      this.stats.requestsProcessed++;
      const latency = Date.now() - startTime;
      this.stats.averageLatency =
        (this.stats.averageLatency * (this.stats.requestsProcessed - 1) + latency) /
        this.stats.requestsProcessed;

      this.emitEvent({
        type: 'toolCalled',
        timestamp: new Date(),
        serverId: server.id,
        data: { toolName, latency },
      });

      return result;
    } catch (error) {
      // Try failover if enabled
      if (this.config.failoverEnabled) {
        return this.handleFailover(toolName, args, error);
      }

      return {
        content: [
          {
            type: 'text',
            text: `Error calling tool: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Handle failover for tool execution
   */
  private async handleFailover(
    toolName: string,
    args: Record<string, unknown> | undefined,
    originalError: unknown
  ): Promise<MCPToolCallResult> {
    const serversWithTool = this.findServersWithTool(toolName);

    // Try remaining servers
    for (const server of serversWithTool) {
      const client = this.clients.get(server.id);
      if (!client) continue;

      try {
        const result = await client.callTool(toolName, args);
        this.stats.failovers++;

        this.emitEvent({
          type: 'toolCalled',
          timestamp: new Date(),
          serverId: server.id,
          data: { toolName, failover: true },
        });

        return result;
      } catch (error) {
        logger.error(`Failover attempt failed on ${server.name}:`, error);
      }
    }

    // All servers failed
    return {
      content: [
        {
          type: 'text',
          text: `All servers failed: ${originalError instanceof Error ? originalError.message : String(originalError)}`,
        },
      ],
      isError: true,
    };
  }

  /**
   * Find servers that have a specific tool
   */
  private findServersWithTool(toolName: string): MCPServerConnection[] {
    const servers: MCPServerConnection[] = [];

    for (const connection of this.connections.values()) {
      if (connection.tools?.some((t) => t.name === toolName)) {
        servers.push(connection);
      }
    }

    return servers.sort((a, b) => (b.priority || 1) - (a.priority || 1));
  }

  /**
   * Select a server based on load balancing strategy
   */
  private selectServer(servers: MCPServerConnection[]): MCPServerConnection {
    if (servers.length === 0) {
      throw new Error('No servers available');
    }

    if (servers.length === 1) {
      return servers[0];
    }

    switch (this.config.loadBalancing) {
      case 'round-robin':
        const server = servers[this.currentServerIndex % servers.length];
        this.currentServerIndex++;
        return server;

      case 'priority':
        return servers[0]; // Already sorted by priority

      case 'random':
        return servers[Math.floor(Math.random() * servers.length)];

      case 'least-connections':
        // Simple implementation: use the first server
        // In production, you'd track active connections per server
        return servers[0];

      default:
        return servers[0];
    }
  }

  /**
   * Start health check interval
   */
  private startHealthCheck(): void {
    this.stopHealthCheck();

    this.healthCheckInterval = setInterval(async () => {
      for (const [serverId, client] of this.clients.entries()) {
        try {
          const health = await client.healthCheck();
          const connection = this.connections.get(serverId);

          if (connection) {
            connection.lastPing = new Date();
            connection.status = client.getConnectionStatus();
          }

          if (!health.healthy && this.config.failoverEnabled) {
            logger.warn(`Server ${serverId} is unhealthy, attempting reconnection...`);
            // Attempt to reconnect
            client.disconnect();
            await client.initialize();
          }
        } catch (error) {
          logger.error(`Health check failed for ${serverId}:`, error);
        }
      }

      this.updateStats();
    }, this.config.healthCheckInterval || 30000);
  }

  /**
   * Stop health check interval
   */
  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  /**
   * Handle client events
   */
  private handleClientEvent(serverId: string, event: MCPEvent): void {
    const connection = this.connections.get(serverId);
    if (!connection) return;

    switch (event.type) {
      case 'disconnected':
        this.stats.connectedServers = this.getConnectedServerCount();
        break;

      case 'toolsListChanged':
        // Refresh tools
        const client = this.clients.get(serverId);
        if (client) {
          connection.tools = client.getCachedTools();
          this.updateStats();
        }
        break;

      case 'resourcesListChanged':
        // Refresh resources
        const resourceClient = this.clients.get(serverId);
        if (resourceClient) {
          connection.resources = resourceClient.getCachedResources();
          this.updateStats();
        }
        break;
    }

    // Forward event
    this.emitEvent({ ...event, serverId });
  }

  /**
   * Update statistics
   */
  private updateStats(): void {
    this.stats.totalServers = this.connections.size;
    this.stats.connectedServers = this.getConnectedServerCount();
    this.stats.totalTools = this.listAllTools().length;
    this.stats.totalResources = this.listAllResources().length;
  }

  /**
   * Get count of connected servers
   */
  private getConnectedServerCount(): number {
    let count = 0;
    for (const connection of this.connections.values()) {
      if (connection.status.state === 'connected') {
        count++;
      }
    }
    return count;
  }

  /**
   * Generate server ID from URL
   */
  private generateServerId(url: string): string {
    return `server-${url.replace(/[^a-zA-Z0-9]/g, '-')}`;
  }

  /**
   * Get all server connections
   */
  getConnections(): MCPServerConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get a specific client
   */
  getClient(serverId: string): MCPClient | undefined {
    return this.clients.get(serverId);
  }

  /**
   * Get orchestrator statistics
   */
  getStats(): MCPOrchestratorStats {
    return { ...this.stats };
  }

  /**
   * Add event listener
   */
  on(handler: MCPEventHandler): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Remove event listener
   */
  off(handler: MCPEventHandler): void {
    const index = this.eventHandlers.indexOf(handler);
    if (index > -1) {
      this.eventHandlers.splice(index, 1);
    }
  }

  /**
   * Emit event to all handlers
   */
  private emitEvent(event: MCPEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        logger.error('Event handler error:', error);
      }
    }
  }

  /**
   * Get configuration
   */
  getConfig(): MCPOrchestratorConfig {
    return { ...this.config };
  }
}
