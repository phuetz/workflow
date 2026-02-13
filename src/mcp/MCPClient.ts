/**
 * MCP Client
 * High-level client for connecting to MCP servers
 */

import type {
  MCPConnectionConfig,
  MCPCapabilities,
  MCPServerInfo,
  MCPTool,
  MCPResource,
  MCPPrompt,
  MCPToolCallParams,
  MCPToolCallResult,
  MCPReadResourceParams,
  MCPReadResourceResult,
  MCPGetPromptParams,
  MCPGetPromptResult,
  MCPEvent,
  MCPEventHandler,
  MCPHealthCheck,
  MCPInitializeResult,
} from '../types/mcp';
import { MCPConnection } from './MCPConnection';
import { MCPProtocol } from './MCPProtocol';
import { logger } from '../services/SimpleLogger';

export interface MCPClientConfig extends MCPConnectionConfig {
  clientName: string;
  clientVersion: string;
  capabilities?: MCPCapabilities;
}

export class MCPClient {
  private config: MCPClientConfig;
  private connection: MCPConnection;
  private protocol: MCPProtocol;
  private serverInfo?: MCPServerInfo;
  private negotiatedCapabilities?: MCPCapabilities;
  private tools: MCPTool[] = [];
  private resources: MCPResource[] = [];
  private prompts: MCPPrompt[] = [];
  private initialized = false;

  constructor(config: MCPClientConfig) {
    this.config = {
      capabilities: {
        tools: { listChanged: true },
        resources: { subscribe: true, listChanged: true },
        prompts: { listChanged: true },
      },
      ...config,
    };

    this.connection = new MCPConnection(config);
    this.protocol = new MCPProtocol();

    // Listen to connection events
    this.connection.on(this.handleConnectionEvent.bind(this));
  }

  /**
   * Initialize connection and perform handshake
   */
  async initialize(): Promise<MCPInitializeResult> {
    if (this.initialized) {
      throw new Error('Client already initialized');
    }

    // Connect to server
    await this.connection.connect();

    // Send initialize request
    const result = (await this.connection.sendRequest('initialize', {
      protocolVersion: this.protocol.getProtocolVersion(),
      capabilities: this.config.capabilities,
      clientInfo: {
        name: this.config.clientName,
        version: this.config.clientVersion,
      },
    })) as MCPInitializeResult;

    // Validate protocol version
    if (!this.protocol.validateProtocolVersion(result.protocolVersion)) {
      throw new Error(
        `Protocol version mismatch: client=${this.protocol.getProtocolVersion()}, server=${result.protocolVersion}`
      );
    }

    // Store server info and negotiated capabilities
    this.serverInfo = result.serverInfo;
    this.negotiatedCapabilities = this.protocol.negotiateCapabilities(
      this.config.capabilities!,
      result.capabilities
    );

    // Send initialized notification
    this.connection.sendNotification('notifications/initialized');

    this.initialized = true;

    // Load available tools, resources, and prompts
    await Promise.all([
      this.refreshTools(),
      this.refreshResources(),
      this.refreshPrompts(),
    ]);

    return result;
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    this.connection.disconnect();
    this.initialized = false;
    this.serverInfo = undefined;
    this.negotiatedCapabilities = undefined;
    this.tools = [];
    this.resources = [];
    this.prompts = [];
  }

  /**
   * List available tools
   */
  async listTools(): Promise<MCPTool[]> {
    this.ensureInitialized();

    const result = (await this.connection.sendRequest('tools/list')) as { tools: MCPTool[] };
    this.tools = result.tools || [];
    return this.tools;
  }

  /**
   * Call a tool
   */
  async callTool(name: string, args?: Record<string, unknown>): Promise<MCPToolCallResult> {
    this.ensureInitialized();

    const params: MCPToolCallParams = {
      name,
      arguments: args,
    };

    const result = (await this.connection.sendRequest('tools/call', params as unknown as Record<string, unknown>)) as MCPToolCallResult;
    return result;
  }

  /**
   * List available resources
   */
  async listResources(): Promise<MCPResource[]> {
    this.ensureInitialized();

    const result = (await this.connection.sendRequest('resources/list')) as {
      resources: MCPResource[];
    };
    this.resources = result.resources || [];
    return this.resources;
  }

  /**
   * Read a resource
   */
  async readResource(uri: string): Promise<MCPReadResourceResult> {
    this.ensureInitialized();

    const params: MCPReadResourceParams = { uri };
    const result = (await this.connection.sendRequest(
      'resources/read',
      params as unknown as Record<string, unknown>
    )) as MCPReadResourceResult;
    return result;
  }

  /**
   * Subscribe to resource updates
   */
  async subscribeResource(uri: string): Promise<void> {
    this.ensureInitialized();

    if (!this.hasCapability('resources.subscribe')) {
      throw new Error('Server does not support resource subscriptions');
    }

    await this.connection.sendRequest('resources/subscribe', { uri });
  }

  /**
   * Unsubscribe from resource updates
   */
  async unsubscribeResource(uri: string): Promise<void> {
    this.ensureInitialized();

    if (!this.hasCapability('resources.subscribe')) {
      throw new Error('Server does not support resource subscriptions');
    }

    await this.connection.sendRequest('resources/unsubscribe', { uri });
  }

  /**
   * List available prompts
   */
  async listPrompts(): Promise<MCPPrompt[]> {
    this.ensureInitialized();

    const result = (await this.connection.sendRequest('prompts/list')) as {
      prompts: MCPPrompt[];
    };
    this.prompts = result.prompts || [];
    return this.prompts;
  }

  /**
   * Get a prompt
   */
  async getPrompt(name: string, args?: Record<string, string>): Promise<MCPGetPromptResult> {
    this.ensureInitialized();

    const params: MCPGetPromptParams = {
      name,
      arguments: args,
    };

    const result = (await this.connection.sendRequest(
      'prompts/get',
      params as unknown as Record<string, unknown>
    )) as MCPGetPromptResult;
    return result;
  }

  /**
   * Set logging level
   */
  async setLogLevel(level: string): Promise<void> {
    this.ensureInitialized();

    await this.connection.sendRequest('logging/setLevel', { level });
  }

  /**
   * Perform health check
   */
  async healthCheck(): Promise<MCPHealthCheck> {
    const healthy = this.connection.isConnected() && this.initialized;
    const checks = {
      connection: this.connection.isConnected(),
      protocol: this.initialized,
      tools: this.tools.length > 0,
      resources: this.resources.length > 0,
    };

    return {
      healthy,
      timestamp: new Date(),
      checks,
      errors: healthy ? undefined : ['Not connected or not initialized'],
    };
  }

  /**
   * Refresh tools list
   */
  private async refreshTools(): Promise<void> {
    try {
      await this.listTools();
    } catch (error) {
      logger.error('Failed to refresh tools:', error);
    }
  }

  /**
   * Refresh resources list
   */
  private async refreshResources(): Promise<void> {
    try {
      await this.listResources();
    } catch (error) {
      logger.error('Failed to refresh resources:', error);
    }
  }

  /**
   * Refresh prompts list
   */
  private async refreshPrompts(): Promise<void> {
    try {
      await this.listPrompts();
    } catch (error) {
      logger.error('Failed to refresh prompts:', error);
    }
  }

  /**
   * Handle connection events
   */
  private handleConnectionEvent(event: MCPEvent): void {
    switch (event.type) {
      case 'disconnected':
        this.initialized = false;
        break;

      case 'toolsListChanged':
        this.refreshTools();
        break;

      case 'resourcesListChanged':
        this.refreshResources();
        break;

      case 'promptsListChanged':
        this.refreshPrompts();
        break;
    }
  }

  /**
   * Check if a capability is supported
   */
  hasCapability(capability: string): boolean {
    if (!this.negotiatedCapabilities) {
      return false;
    }
    return this.protocol.hasCapability(this.negotiatedCapabilities, capability);
  }

  /**
   * Get server info
   */
  getServerInfo(): MCPServerInfo | undefined {
    return this.serverInfo;
  }

  /**
   * Get negotiated capabilities
   */
  getCapabilities(): MCPCapabilities | undefined {
    return this.negotiatedCapabilities;
  }

  /**
   * Get cached tools
   */
  getCachedTools(): MCPTool[] {
    return [...this.tools];
  }

  /**
   * Get cached resources
   */
  getCachedResources(): MCPResource[] {
    return [...this.resources];
  }

  /**
   * Get cached prompts
   */
  getCachedPrompts(): MCPPrompt[] {
    return [...this.prompts];
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connection.isConnected();
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return this.connection.getStatus();
  }

  /**
   * Add event listener
   */
  on(handler: MCPEventHandler): void {
    this.connection.on(handler);
  }

  /**
   * Remove event listener
   */
  off(handler: MCPEventHandler): void {
    this.connection.off(handler);
  }

  /**
   * Ensure client is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Client not initialized. Call initialize() first.');
    }
  }

  /**
   * Get configuration
   */
  getConfig(): MCPClientConfig {
    return { ...this.config };
  }
}
