/**
 * MCP Server
 * Host an MCP server to expose tools and resources
 */

import { WebSocket } from 'ws';
import type { Server as WebSocketServer } from 'ws';
import type {
  MCPServerConfig,
  MCPServerStats,
  MCPCapabilities,
  MCPInitializeParams,
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCNotification,
  MCPEvent,
  MCPEventHandler,
} from '../types/mcp';
import { MCPErrorCode } from '../types/mcp';
import { MCPProtocol } from './MCPProtocol';
import { MCPToolRegistry } from './MCPToolRegistry';
import { MCPResourceProvider } from './MCPResourceProvider';
import { MCPPromptRegistry } from './MCPPromptRegistry';
import { logger } from '../services/SimpleLogger';

interface Client {
  id: string;
  ws: WebSocket;
  initialized: boolean;
  capabilities?: MCPCapabilities;
  clientInfo?: { name: string; version: string };
}

export class MCPServer {
  private config: MCPServerConfig;
  private protocol: MCPProtocol;
  private toolRegistry: MCPToolRegistry;
  private resourceProvider: MCPResourceProvider;
  private promptRegistry: MCPPromptRegistry;
  private wss?: WebSocketServer;
  private clients = new Map<string, Client>();
  private nextClientId = 1;
  private stats: MCPServerStats;
  private eventHandlers: MCPEventHandler[] = [];
  private startTime = Date.now();

  constructor(
    config: MCPServerConfig,
    toolRegistry?: MCPToolRegistry,
    resourceProvider?: MCPResourceProvider,
    promptRegistry?: MCPPromptRegistry
  ) {
    this.config = {
      maxClients: 100,
      ...config,
    };
    this.protocol = new MCPProtocol();
    this.toolRegistry = toolRegistry || new MCPToolRegistry({});
    this.resourceProvider = resourceProvider || new MCPResourceProvider({});
    this.promptRegistry = promptRegistry || new MCPPromptRegistry({});
    this.stats = {
      connectedClients: 0,
      totalRequests: 0,
      totalErrors: 0,
      uptime: 0,
      toolCalls: {},
      resourceAccess: {},
    };
  }

  /**
   * Start the MCP server
   */
  async start(port?: number): Promise<void> {
    const serverPort = port || this.config.port || 8080;

    // Import WebSocketServer dynamically
    const ws = await import('ws');
    this.wss = new ws.WebSocketServer({ port: serverPort }) as any as WebSocketServer;

    this.wss.on('connection', (ws: WebSocket) => {
      this.handleConnection(ws);
    });

    this.wss.on('error', (error: Error) => {
      logger.error('WebSocket server error:', error);
      this.emitEvent({
        type: 'error',
        timestamp: new Date(),
        error,
      });
    });

    logger.debug(`MCP Server started on port ${serverPort}`);
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    // Disconnect all clients
    this.clients.forEach((client, id) => {
      client.ws.close();
      this.clients.delete(id);
    });

    // Close WebSocket server
    if (this.wss) {
      await new Promise<void>((resolve, reject) => {
        this.wss!.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      this.wss = undefined;
    }

    logger.debug('MCP Server stopped');
  }

  /**
   * Handle new client connection
   */
  private handleConnection(ws: WebSocket): void {
    // Check max clients limit
    if (this.clients.size >= (this.config.maxClients || 100)) {
      ws.close(1008, 'Server at capacity');
      return;
    }

    const clientId = `client-${this.nextClientId++}`;
    const client: Client = {
      id: clientId,
      ws,
      initialized: false,
    };

    this.clients.set(clientId, client);
    this.stats.connectedClients = this.clients.size;

    ws.on('message', (data: Buffer) => {
      this.handleMessage(clientId, data.toString());
    });

    ws.on('close', () => {
      this.handleDisconnect(clientId);
    });

    ws.on('error', (error: Error) => {
      logger.error(`Client ${clientId} error:`, error);
      this.handleDisconnect(clientId);
    });

    this.emitEvent({
      type: 'connected',
      timestamp: new Date(),
      data: { clientId },
    });
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(clientId: string): void {
    this.clients.delete(clientId);
    this.stats.connectedClients = this.clients.size;

    this.emitEvent({
      type: 'disconnected',
      timestamp: new Date(),
      data: { clientId },
    });
  }

  /**
   * Handle incoming message from client
   */
  private async handleMessage(clientId: string, data: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    this.stats.totalRequests++;

    const parsed = this.protocol.parseMessage(data);

    if (parsed.error) {
      this.stats.totalErrors++;
      this.sendError(client.ws, 0, parsed.error.code as MCPErrorCode, parsed.error.message);
      return;
    }

    const message = parsed.message as JSONRPCRequest | JSONRPCNotification;

    // Handle request (expects response)
    if ('id' in message && typeof message.id !== 'undefined') {
      await this.handleRequest(client, message as JSONRPCRequest);
    }
    // Handle notification (no response)
    else {
      await this.handleNotification(client, message as JSONRPCNotification);
    }
  }

  /**
   * Handle JSON-RPC request
   */
  private async handleRequest(client: Client, request: JSONRPCRequest): Promise<void> {
    try {
      let result: unknown;

      switch (request.method) {
        case 'initialize':
          result = await this.handleInitialize(client, request.params as unknown as MCPInitializeParams);
          break;

        case 'tools/list':
          this.ensureInitialized(client);
          result = await this.handleToolsList();
          break;

        case 'tools/call':
          this.ensureInitialized(client);
          result = await this.handleToolCall(request.params as any);
          break;

        case 'resources/list':
          this.ensureInitialized(client);
          result = await this.handleResourcesList();
          break;

        case 'resources/read':
          this.ensureInitialized(client);
          result = await this.handleResourceRead(request.params as any);
          break;

        case 'resources/subscribe':
          this.ensureInitialized(client);
          result = await this.handleResourceSubscribe(request.params as any);
          break;

        case 'resources/unsubscribe':
          this.ensureInitialized(client);
          result = await this.handleResourceUnsubscribe(request.params as any);
          break;

        case 'prompts/list':
          this.ensureInitialized(client);
          result = await this.handlePromptsList();
          break;

        case 'prompts/get':
          this.ensureInitialized(client);
          result = await this.handlePromptGet(request.params as any);
          break;

        case 'ping':
          result = { pong: true };
          break;

        default:
          throw new Error(`Method not found: ${request.method}`);
      }

      this.sendResponse(client.ws, request.id, result);
    } catch (error) {
      this.stats.totalErrors++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.sendError(
        client.ws,
        request.id,
        MCPErrorCode.INTERNAL_ERROR,
        errorMessage
      );
    }
  }

  /**
   * Handle JSON-RPC notification
   */
  private async handleNotification(client: Client, notification: JSONRPCNotification): Promise<void> {
    try {
      switch (notification.method) {
        case 'notifications/initialized':
          // Client acknowledges initialization
          break;

        case 'logging/message':
          // Handle log message from client
          logger.debug('Client log:', notification.params);
          break;

        default:
          logger.warn(`Unknown notification: ${notification.method}`);
      }
    } catch (error) {
      logger.error('Notification handler error:', error);
    }
  }

  /**
   * Handle initialize request
   */
  private async handleInitialize(
    client: Client,
    params: MCPInitializeParams
  ): Promise<unknown> {
    // Validate protocol version
    if (!this.protocol.validateProtocolVersion(params.protocolVersion)) {
      throw new Error(
        `Protocol version mismatch: ${params.protocolVersion} vs ${this.protocol.getProtocolVersion()}`
      );
    }

    // Negotiate capabilities
    const negotiatedCapabilities = this.protocol.negotiateCapabilities(
      params.capabilities,
      this.config.capabilities
    );

    // Update client state
    client.initialized = true;
    client.capabilities = negotiatedCapabilities;
    client.clientInfo = params.clientInfo;

    return this.protocol.createInitializeResponse(
      0,
      this.config.name,
      this.config.version,
      this.config.capabilities
    ).result;
  }

  /**
   * Handle tools/list request
   */
  private async handleToolsList(): Promise<{ tools: unknown[] }> {
    const tools = this.toolRegistry.listTools();
    return { tools };
  }

  /**
   * Handle tools/call request
   */
  private async handleToolCall(params: { name: string; arguments?: Record<string, unknown> }): Promise<unknown> {
    const result = await this.toolRegistry.executeTool(params.name, params.arguments || {});

    // Update stats
    this.stats.toolCalls[params.name] = (this.stats.toolCalls[params.name] || 0) + 1;

    this.emitEvent({
      type: 'toolCalled',
      timestamp: new Date(),
      data: { toolName: params.name },
    });

    return result;
  }

  /**
   * Handle resources/list request
   */
  private async handleResourcesList(): Promise<{ resources: unknown[] }> {
    const resources = this.resourceProvider.listResources();
    return { resources };
  }

  /**
   * Handle resources/read request
   */
  private async handleResourceRead(params: { uri: string }): Promise<unknown> {
    const contents = await this.resourceProvider.readResource(params.uri);

    // Update stats
    this.stats.resourceAccess[params.uri] = (this.stats.resourceAccess[params.uri] || 0) + 1;

    this.emitEvent({
      type: 'resourceAccessed',
      timestamp: new Date(),
      data: { uri: params.uri },
    });

    return { contents: [contents] };
  }

  /**
   * Handle resources/subscribe request
   */
  private async handleResourceSubscribe(params: { uri: string }): Promise<void> {
    await this.resourceProvider.subscribe(params.uri);
  }

  /**
   * Handle resources/unsubscribe request
   */
  private async handleResourceUnsubscribe(params: { uri: string }): Promise<void> {
    await this.resourceProvider.unsubscribe(params.uri);
  }

  /**
   * Handle prompts/list request
   */
  private async handlePromptsList(): Promise<{ prompts: unknown[] }> {
    const prompts = this.promptRegistry.listPrompts();
    return { prompts };
  }

  /**
   * Handle prompts/get request
   */
  private async handlePromptGet(params: { name: string; arguments?: Record<string, string> }): Promise<unknown> {
    const result = await this.promptRegistry.executePrompt({
      name: params.name,
      arguments: params.arguments,
    });

    this.emitEvent({
      type: 'promptsListChanged',
      timestamp: new Date(),
      data: { promptName: params.name },
    });

    return result;
  }

  /**
   * Send response to client
   */
  private sendResponse(ws: WebSocket, id: string | number, result: unknown): void {
    const response = this.protocol.createResponse(id, result);
    ws.send(JSON.stringify(response));
  }

  /**
   * Send error to client
   */
  private sendError(
    ws: WebSocket,
    id: string | number,
    code: MCPErrorCode,
    message: string,
    data?: unknown
  ): void {
    const response = this.protocol.createErrorResponse(id, code, message, data);
    ws.send(JSON.stringify(response));
  }

  /**
   * Broadcast notification to all initialized clients
   */
  private broadcastNotification(method: string, params?: Record<string, unknown>): void {
    const notification = this.protocol.createNotification(method, params);
    const message = JSON.stringify(notification);

    this.clients.forEach((client) => {
      if (client.initialized) {
        client.ws.send(message);
      }
    });
  }

  /**
   * Notify clients that tools list has changed
   */
  notifyToolsListChanged(): void {
    this.broadcastNotification('notifications/tools/list_changed');
  }

  /**
   * Notify clients that resources list has changed
   */
  notifyResourcesListChanged(): void {
    this.broadcastNotification('notifications/resources/list_changed');
  }

  /**
   * Notify clients that a resource has been updated
   */
  notifyResourceUpdated(uri: string): void {
    this.broadcastNotification('notifications/resources/updated', { uri });
  }

  /**
   * Ensure client is initialized
   */
  private ensureInitialized(client: Client): void {
    if (!client.initialized) {
      throw new Error('Client not initialized');
    }
  }

  /**
   * Get server statistics
   */
  getStats(): MCPServerStats {
    return {
      ...this.stats,
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Get tool registry
   */
  getToolRegistry(): MCPToolRegistry {
    return this.toolRegistry;
  }

  /**
   * Get resource provider
   */
  getResourceProvider(): MCPResourceProvider {
    return this.resourceProvider;
  }

  /**
   * Get prompt registry
   */
  getPromptRegistry(): MCPPromptRegistry {
    return this.promptRegistry;
  }

  /**
   * Notify clients that prompts list has changed
   */
  notifyPromptsListChanged(): void {
    this.broadcastNotification('notifications/prompts/list_changed');
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
  getConfig(): MCPServerConfig {
    return { ...this.config };
  }
}

export default MCPServer;
