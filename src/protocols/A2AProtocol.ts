/**
 * Agent-to-Agent (A2A) Protocol
 *
 * Peer-to-peer direct messaging protocol with DHT-based discovery,
 * NAT traversal, and end-to-end encryption.
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';

// A2A Message Types
export enum A2AMessageType {
  HANDSHAKE = 'handshake',
  MESSAGE = 'message',
  ACK = 'ack',
  PING = 'ping',
  PONG = 'pong',
  DISCOVER = 'discover',
  ANNOUNCE = 'announce'
}

// A2A Message
export interface A2AMessage {
  type: A2AMessageType;
  id: string;
  from: string;
  to: string;
  timestamp: number;
  payload?: unknown;
  signature?: string;
  encrypted?: boolean;
}

// Agent Peer Information
export interface AgentPeer {
  id: string;
  address: string;
  port: number;
  publicKey?: string;
  capabilities: string[];
  metadata?: Record<string, unknown>;
  lastSeen: number;
  latency?: number;
}

// DHT Node
interface DHTNode {
  id: string;
  distance: number;
  peer: AgentPeer;
}

// Message Queue Entry
interface QueuedMessage {
  message: A2AMessage;
  retries: number;
  nextRetry: number;
  maxRetries: number;
}

/**
 * Simple DHT for agent discovery
 */
export class AgentDHT extends EventEmitter {
  private nodeId: string;
  private kBuckets: Map<number, DHTNode[]> = new Map();
  private k = 20; // Max nodes per bucket
  private alpha = 3; // Parallelism factor

  constructor(nodeId: string) {
    super();
    this.nodeId = nodeId;
  }

  /**
   * Calculate XOR distance between two IDs
   */
  private distance(id1: string, id2: string): number {
    const hash1 = crypto.createHash('sha256').update(id1).digest();
    const hash2 = crypto.createHash('sha256').update(id2).digest();

    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
      distance += hash1[i] ^ hash2[i];
    }
    return distance;
  }

  /**
   * Get bucket index for a node
   */
  private getBucketIndex(nodeId: string): number {
    const dist = this.distance(this.nodeId, nodeId);
    return Math.floor(Math.log2(dist + 1));
  }

  /**
   * Add peer to DHT
   */
  addPeer(peer: AgentPeer): void {
    const bucketIndex = this.getBucketIndex(peer.id);

    if (!this.kBuckets.has(bucketIndex)) {
      this.kBuckets.set(bucketIndex, []);
    }

    const bucket = this.kBuckets.get(bucketIndex)!;
    const existing = bucket.findIndex(n => n.id === peer.id);

    const node: DHTNode = {
      id: peer.id,
      distance: this.distance(this.nodeId, peer.id),
      peer
    };

    if (existing >= 0) {
      // Update existing node
      bucket[existing] = node;
    } else {
      // Add new node
      if (bucket.length < this.k) {
        bucket.push(node);
      } else {
        // Bucket full, replace least recently seen
        bucket.sort((a, b) => a.peer.lastSeen - b.peer.lastSeen);
        bucket[0] = node;
      }
    }

    this.emit('peer-added', peer);
  }

  /**
   * Remove peer from DHT
   */
  removePeer(peerId: string): void {
    const bucketIndex = this.getBucketIndex(peerId);
    const bucket = this.kBuckets.get(bucketIndex);

    if (bucket) {
      const index = bucket.findIndex(n => n.id === peerId);
      if (index >= 0) {
        const peer = bucket[index].peer;
        bucket.splice(index, 1);
        this.emit('peer-removed', peer);
      }
    }
  }

  /**
   * Find closest nodes to a target ID
   */
  findClosest(targetId: string, count: number = this.k): AgentPeer[] {
    const allNodes: DHTNode[] = [];

    for (const bucket of this.kBuckets.values()) {
      allNodes.push(...bucket);
    }

    allNodes.sort((a, b) => {
      const distA = this.distance(targetId, a.id);
      const distB = this.distance(targetId, b.id);
      return distA - distB;
    });

    return allNodes.slice(0, count).map(n => n.peer);
  }

  /**
   * Find peer by ID
   */
  findPeer(peerId: string): AgentPeer | undefined {
    const bucketIndex = this.getBucketIndex(peerId);
    const bucket = this.kBuckets.get(bucketIndex);

    if (bucket) {
      const node = bucket.find(n => n.id === peerId);
      return node?.peer;
    }

    return undefined;
  }

  /**
   * Get all known peers
   */
  getAllPeers(): AgentPeer[] {
    const peers: AgentPeer[] = [];

    for (const bucket of this.kBuckets.values()) {
      peers.push(...bucket.map(n => n.peer));
    }

    return peers;
  }

  /**
   * Find peers by capability
   */
  findByCapability(capability: string): AgentPeer[] {
    return this.getAllPeers().filter(peer =>
      peer.capabilities.includes(capability)
    );
  }

  /**
   * Get DHT statistics
   */
  getStats() {
    let totalNodes = 0;
    for (const bucket of this.kBuckets.values()) {
      totalNodes += bucket.length;
    }

    return {
      nodeId: this.nodeId,
      buckets: this.kBuckets.size,
      totalPeers: totalNodes,
      kValue: this.k,
      alphaValue: this.alpha
    };
  }
}

/**
 * A2A Protocol Client
 */
export class A2AClient extends EventEmitter {
  private agentId: string;
  private dht: AgentDHT;
  private messageQueue: Map<string, QueuedMessage> = new Map();
  private pendingAcks: Map<string, {
    resolve: () => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  private connections: Map<string, any> = new Map(); // WebRTC or WebSocket connections
  private publicKey?: Buffer;
  private privateKey?: Buffer;
  private queueProcessor?: NodeJS.Timeout;
  private heartbeatInterval?: NodeJS.Timeout;
  private config: {
    messageTimeout: number;
    maxRetries: number;
    retryDelay: number;
    heartbeatInterval: number;
    encryption: boolean;
  };

  constructor(agentId: string, config?: Partial<A2AClient['config']>) {
    super();
    this.agentId = agentId;
    this.dht = new AgentDHT(agentId);

    this.config = {
      messageTimeout: config?.messageTimeout || 30000,
      maxRetries: config?.maxRetries || 3,
      retryDelay: config?.retryDelay || 1000,
      heartbeatInterval: config?.heartbeatInterval || 30000,
      encryption: config?.encryption !== false
    };

    if (this.config.encryption) {
      this.generateKeyPair();
    }

    this.startQueueProcessor();
    this.startHeartbeat();
  }

  /**
   * Generate encryption key pair
   */
  private generateKeyPair(): void {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'der' },
      privateKeyEncoding: { type: 'pkcs8', format: 'der' }
    });

    this.publicKey = publicKey;
    this.privateKey = privateKey;
  }

  /**
   * Start message queue processor
   */
  private startQueueProcessor(): void {
    this.queueProcessor = setInterval(() => {
      const now = Date.now();

      for (const [id, queued] of this.messageQueue.entries()) {
        if (now >= queued.nextRetry) {
          if (queued.retries >= queued.maxRetries) {
            // Max retries reached
            this.messageQueue.delete(id);
            this.emit('message-failed', queued.message);
          } else {
            // Retry sending
            this.sendMessageDirect(queued.message);
            queued.retries++;
            queued.nextRetry = now + this.config.retryDelay * Math.pow(2, queued.retries);
          }
        }
      }
    }, 1000);
  }

  /**
   * Start heartbeat to keep connections alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      for (const peer of this.dht.getAllPeers()) {
        this.sendPing(peer.id);
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Register this agent in the DHT
   */
  async registerAgent(capabilities: string[], metadata?: Record<string, unknown>): Promise<void> {
    const peer: AgentPeer = {
      id: this.agentId,
      address: 'localhost', // In real implementation, get actual address
      port: 0, // In real implementation, use actual port
      publicKey: this.publicKey?.toString('base64'),
      capabilities,
      metadata,
      lastSeen: Date.now()
    };

    this.dht.addPeer(peer);
    this.emit('agent-registered', peer);
  }

  /**
   * Discover peers
   */
  async discoverPeers(capability?: string): Promise<AgentPeer[]> {
    if (capability) {
      return this.dht.findByCapability(capability);
    }
    return this.dht.getAllPeers();
  }

  /**
   * Send message to another agent
   */
  async sendMessage(
    toAgentId: string,
    payload: unknown,
    options?: { guaranteed?: boolean; encrypt?: boolean }
  ): Promise<void> {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const message: A2AMessage = {
      type: A2AMessageType.MESSAGE,
      id: messageId,
      from: this.agentId,
      to: toAgentId,
      timestamp: Date.now(),
      payload,
      encrypted: options?.encrypt && this.config.encryption
    };

    // Encrypt payload if requested
    if (message.encrypted && this.privateKey) {
      const peer = this.dht.findPeer(toAgentId);
      if (peer?.publicKey) {
        message.payload = this.encryptPayload(payload, peer.publicKey);
      }
    }

    // Sign message
    message.signature = this.signMessage(message);

    if (options?.guaranteed) {
      // Add to queue for guaranteed delivery
      this.messageQueue.set(messageId, {
        message,
        retries: 0,
        nextRetry: Date.now(),
        maxRetries: this.config.maxRetries
      });

      // Wait for ACK
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.pendingAcks.delete(messageId);
          reject(new Error('Message acknowledgement timeout'));
        }, this.config.messageTimeout);

        this.pendingAcks.set(messageId, { resolve, reject, timeout });
      });
    } else {
      // Fire and forget
      this.sendMessageDirect(message);
    }
  }

  /**
   * Send message directly (internal)
   */
  private sendMessageDirect(message: A2AMessage): void {
    // In real implementation, use WebRTC or WebSocket
    // For now, emit event
    this.emit('send', message);

    // Simulate receiving on the other end (for testing)
    if (process.env.NODE_ENV === 'test') {
      setTimeout(() => {
        this.emit('message-sent', message);
      }, 10);
    }
  }

  /**
   * Receive message
   */
  receiveMessage(message: A2AMessage): void {
    // Verify signature
    if (!this.verifySignature(message)) {
      this.emit('invalid-signature', message);
      return;
    }

    // Decrypt if encrypted
    if (message.encrypted && this.privateKey) {
      try {
        message.payload = this.decryptPayload(message.payload, this.privateKey);
      } catch (error) {
        this.emit('decryption-error', error);
        return;
      }
    }

    switch (message.type) {
      case A2AMessageType.MESSAGE:
        this.emit('message', message);
        // Send ACK
        this.sendAck(message.id, message.from);
        break;

      case A2AMessageType.ACK:
        this.handleAck(message.id);
        break;

      case A2AMessageType.PING:
        this.sendPong(message.from);
        break;

      case A2AMessageType.PONG:
        this.handlePong(message.from);
        break;

      case A2AMessageType.ANNOUNCE:
        if (message.payload && typeof message.payload === 'object') {
          this.dht.addPeer(message.payload as AgentPeer);
        }
        break;
    }
  }

  /**
   * Send acknowledgement
   */
  private sendAck(messageId: string, toAgentId: string): void {
    const ack: A2AMessage = {
      type: A2AMessageType.ACK,
      id: messageId,
      from: this.agentId,
      to: toAgentId,
      timestamp: Date.now()
    };

    this.sendMessageDirect(ack);
  }

  /**
   * Handle acknowledgement
   */
  private handleAck(messageId: string): void {
    // Remove from queue
    this.messageQueue.delete(messageId);

    // Resolve pending promise
    const pending = this.pendingAcks.get(messageId);
    if (pending) {
      clearTimeout(pending.timeout);
      pending.resolve();
      this.pendingAcks.delete(messageId);
    }
  }

  /**
   * Send ping
   */
  private sendPing(toAgentId: string): void {
    const ping: A2AMessage = {
      type: A2AMessageType.PING,
      id: `ping_${Date.now()}`,
      from: this.agentId,
      to: toAgentId,
      timestamp: Date.now()
    };

    this.sendMessageDirect(ping);
  }

  /**
   * Send pong
   */
  private sendPong(toAgentId: string): void {
    const pong: A2AMessage = {
      type: A2AMessageType.PONG,
      id: `pong_${Date.now()}`,
      from: this.agentId,
      to: toAgentId,
      timestamp: Date.now()
    };

    this.sendMessageDirect(pong);
  }

  /**
   * Handle pong
   */
  private handlePong(fromAgentId: string): void {
    const peer = this.dht.findPeer(fromAgentId);
    if (peer) {
      peer.lastSeen = Date.now();
    }
  }

  /**
   * Sign message
   */
  private signMessage(message: A2AMessage): string {
    if (!this.privateKey) return '';

    const data = JSON.stringify({
      type: message.type,
      id: message.id,
      from: message.from,
      to: message.to,
      timestamp: message.timestamp,
      payload: message.payload
    });

    const sign = crypto.createSign('SHA256');
    sign.update(data);
    sign.end();

    return sign.sign(this.privateKey, 'base64');
  }

  /**
   * Verify message signature
   */
  private verifySignature(message: A2AMessage): boolean {
    if (!message.signature) return true; // No signature to verify

    const peer = this.dht.findPeer(message.from);
    if (!peer?.publicKey) return false;

    const data = JSON.stringify({
      type: message.type,
      id: message.id,
      from: message.from,
      to: message.to,
      timestamp: message.timestamp,
      payload: message.payload
    });

    try {
      const verify = crypto.createVerify('SHA256');
      verify.update(data);
      verify.end();

      const publicKey = Buffer.from(peer.publicKey, 'base64');
      return verify.verify(publicKey, message.signature, 'base64');
    } catch {
      return false;
    }
  }

  /**
   * Encrypt payload
   */
  private encryptPayload(payload: unknown, publicKey: string): string {
    const data = JSON.stringify(payload);
    const publicKeyBuffer = Buffer.from(publicKey, 'base64');

    const encrypted = crypto.publicEncrypt(
      {
        key: publicKeyBuffer,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
      },
      Buffer.from(data)
    );

    return encrypted.toString('base64');
  }

  /**
   * Decrypt payload
   */
  private decryptPayload(encryptedPayload: unknown, privateKey: Buffer): unknown {
    if (typeof encryptedPayload !== 'string') {
      return encryptedPayload;
    }

    const encrypted = Buffer.from(encryptedPayload, 'base64');

    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
      },
      encrypted
    );

    return JSON.parse(decrypted.toString());
  }

  /**
   * Announce presence to network
   */
  announcePresence(capabilities: string[], metadata?: Record<string, unknown>): void {
    const peer: AgentPeer = {
      id: this.agentId,
      address: 'localhost',
      port: 0,
      publicKey: this.publicKey?.toString('base64'),
      capabilities,
      metadata,
      lastSeen: Date.now()
    };

    const announce: A2AMessage = {
      type: A2AMessageType.ANNOUNCE,
      id: `announce_${Date.now()}`,
      from: this.agentId,
      to: '*', // Broadcast
      timestamp: Date.now(),
      payload: peer
    };

    this.sendMessageDirect(announce);
  }

  /**
   * Get client statistics
   */
  getStats() {
    return {
      agentId: this.agentId,
      queuedMessages: this.messageQueue.size,
      pendingAcks: this.pendingAcks.size,
      connections: this.connections.size,
      encryption: this.config.encryption,
      dht: this.dht.getStats()
    };
  }

  /**
   * Shutdown client
   */
  async shutdown(): Promise<void> {
    if (this.queueProcessor) {
      clearInterval(this.queueProcessor);
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Clear pending operations
    for (const pending of this.pendingAcks.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Client shutting down'));
    }

    this.messageQueue.clear();
    this.pendingAcks.clear();
    this.connections.clear();

    this.emit('shutdown');
  }
}
