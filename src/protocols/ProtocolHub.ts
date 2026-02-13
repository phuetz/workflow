/**
 * Protocol Hub
 *
 * Unified interface for multiple agent communication protocols
 * with automatic protocol translation and intelligent routing.
 */

import { EventEmitter } from 'events';
import { ACPClient, ACPMessage } from './ACPProtocol';
import { A2AClient, A2AMessage, AgentPeer } from './A2AProtocol';

// Protocol Types
export enum ProtocolType {
  MCP = 'mcp',
  ACP = 'acp',
  A2A = 'a2a',
  OPENAI_SWARM = 'openai-swarm',
  AUTO = 'auto'
}

// Universal Message Format
export interface UniversalMessage {
  id: string;
  protocol: ProtocolType;
  from: string;
  to: string;
  timestamp: number;
  type: string;
  payload: unknown;
  metadata?: Record<string, unknown>;
}

// Protocol Adapter Interface
export interface ProtocolAdapter {
  protocol: ProtocolType;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(message: UniversalMessage): Promise<void>;
  request(message: UniversalMessage): Promise<unknown>;
  subscribe(topic: string, handler: (message: UniversalMessage) => void): void;
  unsubscribe(topic: string): void;
  isConnected(): boolean;
  getCapabilities(): string[];
}

// MCP Adapter (stub - would connect to actual MCP implementation)
class MCPAdapter extends EventEmitter implements ProtocolAdapter {
  protocol = ProtocolType.MCP;
  private connected = false;
  private subscriptions: Map<string, Set<(message: UniversalMessage) => void>> = new Map();

  async connect(): Promise<void> {
    // Connect to MCP server
    this.connected = true;
    this.emit('connected');
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.subscriptions.clear();
    this.emit('disconnected');
  }

  async send(message: UniversalMessage): Promise<void> {
    if (!this.connected) {
      throw new Error('MCP adapter not connected');
    }

    // Convert to MCP format and send
    this.emit('send', message);
  }

  async request(message: UniversalMessage): Promise<unknown> {
    if (!this.connected) {
      throw new Error('MCP adapter not connected');
    }

    // Convert to MCP request format
    return { success: true, data: message.payload };
  }

  subscribe(topic: string, handler: (message: UniversalMessage) => void): void {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }
    this.subscriptions.get(topic)!.add(handler);
  }

  unsubscribe(topic: string): void {
    this.subscriptions.delete(topic);
  }

  isConnected(): boolean {
    return this.connected;
  }

  getCapabilities(): string[] {
    return ['request-response', 'server-tools', 'resource-access'];
  }
}

// ACP Adapter
class ACPAdapterImpl extends EventEmitter implements ProtocolAdapter {
  protocol = ProtocolType.ACP;
  private client: ACPClient;
  private subscriptions: Map<string, Set<(message: UniversalMessage) => void>> = new Map();

  constructor(config: { url: string; agentId: string; apiKey?: string }) {
    super();
    this.client = new ACPClient(config);

    // Forward events
    this.client.on('connected', () => this.emit('connected'));
    this.client.on('disconnected', () => this.emit('disconnected'));
    this.client.on('error', (error) => this.emit('error', error));
  }

  async connect(): Promise<void> {
    await this.client.connect();

    // Register message handler
    this.client.registerMethod('message', async (params: any) => {
      const message = this.acpToUniversal(params);
      this.notifySubscribers(message);
      return { status: 'received' };
    });
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
    this.subscriptions.clear();
  }

  async send(message: UniversalMessage): Promise<void> {
    const acpMessage = this.universalToAcp(message);
    this.client.notify('message', acpMessage);
  }

  async request(message: UniversalMessage): Promise<unknown> {
    const acpMessage = this.universalToAcp(message);
    return await this.client.request('message', acpMessage);
  }

  subscribe(topic: string, handler: (message: UniversalMessage) => void): void {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }
    this.subscriptions.get(topic)!.add(handler);
  }

  unsubscribe(topic: string): void {
    this.subscriptions.delete(topic);
  }

  isConnected(): boolean {
    const stats = this.client.getPoolStats();
    return stats.connected > 0;
  }

  getCapabilities(): string[] {
    return ['request-response', 'pub-sub', 'connection-pooling', 'authentication'];
  }

  private universalToAcp(message: UniversalMessage): Record<string, unknown> {
    return {
      id: message.id,
      from: message.from,
      to: message.to,
      timestamp: message.timestamp,
      type: message.type,
      payload: message.payload,
      metadata: message.metadata
    };
  }

  private acpToUniversal(params: any): UniversalMessage {
    return {
      id: params.id,
      protocol: ProtocolType.ACP,
      from: params.from,
      to: params.to,
      timestamp: params.timestamp,
      type: params.type,
      payload: params.payload,
      metadata: params.metadata
    };
  }

  private notifySubscribers(message: UniversalMessage): void {
    for (const [topic, handlers] of this.subscriptions.entries()) {
      if (this.matchesTopic(message.type, topic)) {
        for (const handler of handlers) {
          handler(message);
        }
      }
    }
  }

  private matchesTopic(messageType: string, topic: string): boolean {
    if (topic === '*') return true;
    if (topic === messageType) return true;
    return messageType.startsWith(topic + '.');
  }
}

// A2A Adapter
class A2AAdapterImpl extends EventEmitter implements ProtocolAdapter {
  protocol = ProtocolType.A2A;
  private client: A2AClient;
  private subscriptions: Map<string, Set<(message: UniversalMessage) => void>> = new Map();

  constructor(agentId: string, config?: any) {
    super();
    this.client = new A2AClient(agentId, config);

    // Forward events
    this.client.on('message', (message: A2AMessage) => {
      const universal = this.a2aToUniversal(message);
      this.notifySubscribers(universal);
    });

    this.client.on('shutdown', () => this.emit('disconnected'));
  }

  async connect(): Promise<void> {
    // A2A is connectionless, just register
    await this.client.registerAgent(['messaging'], {});
    this.emit('connected');
  }

  async disconnect(): Promise<void> {
    await this.client.shutdown();
    this.subscriptions.clear();
  }

  async send(message: UniversalMessage): Promise<void> {
    await this.client.sendMessage(message.to, message.payload, { guaranteed: false });
  }

  async request(message: UniversalMessage): Promise<unknown> {
    await this.client.sendMessage(message.to, message.payload, { guaranteed: true });
    // In real implementation, wait for response
    return { status: 'sent' };
  }

  subscribe(topic: string, handler: (message: UniversalMessage) => void): void {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }
    this.subscriptions.get(topic)!.add(handler);
  }

  unsubscribe(topic: string): void {
    this.subscriptions.delete(topic);
  }

  isConnected(): boolean {
    const stats = this.client.getStats();
    return stats.dht.totalPeers > 0;
  }

  getCapabilities(): string[] {
    return ['peer-to-peer', 'dht-discovery', 'encryption', 'guaranteed-delivery'];
  }

  private a2aToUniversal(message: A2AMessage): UniversalMessage {
    return {
      id: message.id,
      protocol: ProtocolType.A2A,
      from: message.from,
      to: message.to,
      timestamp: message.timestamp,
      type: message.type,
      payload: message.payload
    };
  }

  private notifySubscribers(message: UniversalMessage): void {
    for (const [topic, handlers] of this.subscriptions.entries()) {
      if (this.matchesTopic(message.type, topic)) {
        for (const handler of handlers) {
          handler(message);
        }
      }
    }
  }

  private matchesTopic(messageType: string, topic: string): boolean {
    if (topic === '*') return true;
    if (topic === messageType) return true;
    return messageType.startsWith(topic + '.');
  }
}

// OpenAI Swarm Adapter (stub)
class OpenAISwarmAdapter extends EventEmitter implements ProtocolAdapter {
  protocol = ProtocolType.OPENAI_SWARM;
  private connected = false;
  private subscriptions: Map<string, Set<(message: UniversalMessage) => void>> = new Map();

  async connect(): Promise<void> {
    this.connected = true;
    this.emit('connected');
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.subscriptions.clear();
    this.emit('disconnected');
  }

  async send(message: UniversalMessage): Promise<void> {
    if (!this.connected) {
      throw new Error('OpenAI Swarm adapter not connected');
    }
    this.emit('send', message);
  }

  async request(message: UniversalMessage): Promise<unknown> {
    if (!this.connected) {
      throw new Error('OpenAI Swarm adapter not connected');
    }
    return { success: true, data: message.payload };
  }

  subscribe(topic: string, handler: (message: UniversalMessage) => void): void {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }
    this.subscriptions.get(topic)!.add(handler);
  }

  unsubscribe(topic: string): void {
    this.subscriptions.delete(topic);
  }

  isConnected(): boolean {
    return this.connected;
  }

  getCapabilities(): string[] {
    return ['agent-orchestration', 'context-transfer', 'handoffs'];
  }
}

/**
 * Protocol Hub - Unified multi-protocol interface
 */
export class ProtocolHub extends EventEmitter {
  private adapters: Map<ProtocolType, ProtocolAdapter> = new Map();
  private activeProtocol?: ProtocolType;
  private fallbackOrder: ProtocolType[] = [
    ProtocolType.ACP,
    ProtocolType.A2A,
    ProtocolType.MCP,
    ProtocolType.OPENAI_SWARM
  ];
  private routingRules: Map<string, ProtocolType> = new Map();

  constructor() {
    super();
  }

  /**
   * Register a protocol adapter
   */
  registerAdapter(adapter: ProtocolAdapter): void {
    this.adapters.set(adapter.protocol, adapter);

    // Forward adapter events (cast to EventEmitter since all implementations extend it)
    const eventEmitter = adapter as unknown as EventEmitter;
    eventEmitter.on('connected', () => this.emit('protocol-connected', adapter.protocol));
    eventEmitter.on('disconnected', () => this.emit('protocol-disconnected', adapter.protocol));
    eventEmitter.on('error', (error) => this.emit('protocol-error', adapter.protocol, error));
  }

  /**
   * Register ACP adapter
   */
  registerACP(config: { url: string; agentId: string; apiKey?: string }): void {
    const adapter = new ACPAdapterImpl(config);
    this.registerAdapter(adapter);
  }

  /**
   * Register A2A adapter
   */
  registerA2A(agentId: string, config?: any): void {
    const adapter = new A2AAdapterImpl(agentId, config);
    this.registerAdapter(adapter);
  }

  /**
   * Register MCP adapter
   */
  registerMCP(): void {
    const adapter = new MCPAdapter();
    this.registerAdapter(adapter);
  }

  /**
   * Register OpenAI Swarm adapter
   */
  registerOpenAISwarm(): void {
    const adapter = new OpenAISwarmAdapter();
    this.registerAdapter(adapter);
  }

  /**
   * Connect all registered adapters
   */
  async connectAll(): Promise<void> {
    const promises = Array.from(this.adapters.values()).map(adapter =>
      adapter.connect().catch(error => {
        this.emit('connection-failed', adapter.protocol, error);
      })
    );

    await Promise.all(promises);
  }

  /**
   * Connect specific protocol
   */
  async connect(protocol: ProtocolType): Promise<void> {
    const adapter = this.adapters.get(protocol);
    if (!adapter) {
      throw new Error(`Protocol adapter not found: ${protocol}`);
    }

    await adapter.connect();
    if (!this.activeProtocol) {
      this.activeProtocol = protocol;
    }
  }

  /**
   * Disconnect all adapters
   */
  async disconnectAll(): Promise<void> {
    const promises = Array.from(this.adapters.values()).map(adapter =>
      adapter.disconnect().catch(error => {
        this.emit('disconnection-error', adapter.protocol, error);
      })
    );

    await Promise.all(promises);
  }

  /**
   * Disconnect specific protocol
   */
  async disconnect(protocol: ProtocolType): Promise<void> {
    const adapter = this.adapters.get(protocol);
    if (adapter) {
      await adapter.disconnect();
    }
  }

  /**
   * Set fallback protocol order
   */
  setFallbackOrder(order: ProtocolType[]): void {
    this.fallbackOrder = order;
  }

  /**
   * Add routing rule
   */
  addRoutingRule(agentId: string, protocol: ProtocolType): void {
    this.routingRules.set(agentId, protocol);
  }

  /**
   * Get best protocol for target agent
   */
  private getBestProtocol(targetAgent: string, preferredProtocol?: ProtocolType): ProtocolType {
    // Check routing rules
    const rule = this.routingRules.get(targetAgent);
    if (rule && this.adapters.get(rule)?.isConnected()) {
      return rule;
    }

    // Use preferred protocol if specified and available
    if (preferredProtocol && preferredProtocol !== ProtocolType.AUTO) {
      const adapter = this.adapters.get(preferredProtocol);
      if (adapter?.isConnected()) {
        return preferredProtocol;
      }
    }

    // Use fallback order
    for (const protocol of this.fallbackOrder) {
      const adapter = this.adapters.get(protocol);
      if (adapter?.isConnected()) {
        return protocol;
      }
    }

    throw new Error('No available protocol');
  }

  /**
   * Send message using best available protocol
   */
  async sendMessage(
    targetAgent: string,
    message: Omit<UniversalMessage, 'protocol'>,
    options?: { preferredProtocol?: ProtocolType }
  ): Promise<void> {
    const protocol = this.getBestProtocol(targetAgent, options?.preferredProtocol);
    const adapter = this.adapters.get(protocol)!;

    const fullMessage: UniversalMessage = {
      ...message,
      protocol
    };

    await adapter.send(fullMessage);
    this.emit('message-sent', fullMessage);
  }

  /**
   * Send request and wait for response
   */
  async request(
    targetAgent: string,
    message: Omit<UniversalMessage, 'protocol'>,
    options?: { preferredProtocol?: ProtocolType; timeout?: number }
  ): Promise<unknown> {
    const protocol = this.getBestProtocol(targetAgent, options?.preferredProtocol);
    const adapter = this.adapters.get(protocol)!;

    const fullMessage: UniversalMessage = {
      ...message,
      protocol
    };

    const timeout = options?.timeout || 30000;

    const result = await Promise.race([
      adapter.request(fullMessage),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      )
    ]);

    this.emit('request-completed', fullMessage);
    return result;
  }

  /**
   * Subscribe to messages
   */
  subscribe(
    topic: string,
    handler: (message: UniversalMessage) => void,
    protocols?: ProtocolType[]
  ): void {
    const targetProtocols = protocols || Array.from(this.adapters.keys());

    for (const protocol of targetProtocols) {
      const adapter = this.adapters.get(protocol);
      if (adapter) {
        adapter.subscribe(topic, handler);
      }
    }
  }

  /**
   * Unsubscribe from messages
   */
  unsubscribe(topic: string, protocols?: ProtocolType[]): void {
    const targetProtocols = protocols || Array.from(this.adapters.keys());

    for (const protocol of targetProtocols) {
      const adapter = this.adapters.get(protocol);
      if (adapter) {
        adapter.unsubscribe(topic);
      }
    }
  }

  /**
   * Broadcast message to all protocols
   */
  async broadcast(message: Omit<UniversalMessage, 'protocol'>): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const [protocol, adapter] of this.adapters.entries()) {
      if (adapter.isConnected()) {
        const fullMessage: UniversalMessage = {
          ...message,
          protocol
        };
        promises.push(adapter.send(fullMessage));
      }
    }

    await Promise.all(promises);
    this.emit('broadcast-sent', message);
  }

  /**
   * Get protocol capabilities
   */
  getCapabilities(protocol: ProtocolType): string[] {
    const adapter = this.adapters.get(protocol);
    return adapter?.getCapabilities() || [];
  }

  /**
   * Get all capabilities across all protocols
   */
  getAllCapabilities(): Map<ProtocolType, string[]> {
    const capabilities = new Map<ProtocolType, string[]>();

    for (const [protocol, adapter] of this.adapters.entries()) {
      capabilities.set(protocol, adapter.getCapabilities());
    }

    return capabilities;
  }

  /**
   * Get hub statistics
   */
  getStats() {
    const stats: any = {
      totalProtocols: this.adapters.size,
      connectedProtocols: 0,
      activeProtocol: this.activeProtocol,
      protocols: {}
    };

    for (const [protocol, adapter] of this.adapters.entries()) {
      const connected = adapter.isConnected();
      if (connected) {
        stats.connectedProtocols++;
      }

      stats.protocols[protocol] = {
        connected,
        capabilities: adapter.getCapabilities()
      };
    }

    return stats;
  }

  /**
   * Check if any protocol is connected
   */
  isConnected(): boolean {
    for (const adapter of this.adapters.values()) {
      if (adapter.isConnected()) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get connected protocols
   */
  getConnectedProtocols(): ProtocolType[] {
    const connected: ProtocolType[] = [];

    for (const [protocol, adapter] of this.adapters.entries()) {
      if (adapter.isConnected()) {
        connected.push(protocol);
      }
    }

    return connected;
  }
}
