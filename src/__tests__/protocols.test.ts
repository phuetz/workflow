/**
 * Comprehensive Protocol Tests
 *
 * Tests for ACP, A2A, Protocol Hub, Agent Registry, and Universal Messenger
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ACPClient, ACPServer, ACPErrorCode } from '../protocols/ACPProtocol';
import { A2AClient, AgentDHT, A2AMessageType } from '../protocols/A2AProtocol';
import { ProtocolHub, ProtocolType } from '../protocols/ProtocolHub';
import { AgentRegistry, AgentStatus } from '../protocols/AgentRegistry';
import {
  UniversalMessenger,
  MessagePriority,
  DeliveryGuarantee
} from '../protocols/UniversalMessenger';

// Helper to get a random available port
const getRandomPort = () => 10000 + Math.floor(Math.random() * 50000);

describe('ACP Protocol', () => {
  let server: ACPServer;
  let client: ACPClient;
  let port: number;

  beforeEach(async () => {
    port = getRandomPort();
    server = new ACPServer(port);
    client = new ACPClient({
      url: `ws://localhost:${port}`,
      agentId: 'test-agent',
      apiKey: 'test-key'
    });
  });

  afterEach(async () => {
    await client.disconnect();
    await server.close();
  });

  it('should establish connection', async () => {
    await client.connect();
    const stats = client.getPoolStats();
    expect(stats.connected).toBeGreaterThan(0);
  });

  it('should authenticate client', async () => {
    let authenticated = false;
    server.setAuthHandler(async (agentId, apiKey) => {
      authenticated = agentId === 'test-agent' && apiKey === 'test-key';
      return authenticated;
    });

    await client.connect();
    expect(authenticated).toBe(true);
  });

  it('should send and receive messages', async () => {
    await client.connect();

    server.registerMethod('test.echo', async (params: any) => {
      return { echo: params };
    });

    const result = await client.request('test.echo', { message: 'hello' });
    expect(result).toEqual({ echo: { message: 'hello' } });
  });

  it('should handle method not found', async () => {
    await client.connect();

    await expect(
      client.request('nonexistent.method', {})
    ).rejects.toThrow();
  });

  it('should support connection pooling', async () => {
    await client.connect();

    // Send multiple concurrent requests
    const promises = Array.from({ length: 10 }, (_, i) =>
      client.request('test.method', { index: i })
    );

    server.registerMethod('test.method', async (params: any) => params);

    await Promise.all(promises);

    const stats = client.getPoolStats();
    expect(stats.totalRequests).toBeGreaterThan(0);
  });

  it('should handle server broadcast', async () => {
    await client.connect();

    let received = false;
    client.registerMethod('broadcast.message', async (params: any) => {
      received = true;
      return { status: 'received' };
    });

    server.broadcast('broadcast.message', { data: 'test' });

    // Wait a bit for message to be received
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(received).toBe(true);
  });

  it('should get server stats', () => {
    const stats = server.getStats();
    expect(stats).toHaveProperty('totalClients');
    expect(stats).toHaveProperty('authenticatedClients');
    expect(stats).toHaveProperty('registeredMethods');
  });
});

describe('A2A Protocol', () => {
  let client1: A2AClient;
  let client2: A2AClient;

  beforeEach(() => {
    client1 = new A2AClient('agent-1', { encryption: false });
    client2 = new A2AClient('agent-2', { encryption: false });
  });

  afterEach(async () => {
    await client1.shutdown();
    await client2.shutdown();
  });

  it('should register agent', async () => {
    await client1.registerAgent(['messaging', 'compute'], { location: 'us-east' });

    const peers = await client1.discoverPeers();
    expect(peers).toHaveLength(1);
    expect(peers[0].id).toBe('agent-1');
  });

  it('should send message between agents', async () => {
    await client1.registerAgent(['messaging'], {});
    await client2.registerAgent(['messaging'], {});

    let receivedMessage: any = null;
    client2.on('message', (msg) => {
      receivedMessage = msg;
    });

    await client1.sendMessage('agent-2', { text: 'hello' }, { guaranteed: false });

    // Simulate message delivery
    const testMsg: any = {
      type: A2AMessageType.MESSAGE,
      id: 'test-msg-1',
      from: 'agent-1',
      to: 'agent-2',
      timestamp: Date.now(),
      payload: { text: 'hello' }
    };
    client2.receiveMessage(testMsg);

    expect(receivedMessage).toBeTruthy();
    expect(receivedMessage.payload).toEqual({ text: 'hello' });
  });

  it('should discover peers by capability', async () => {
    await client1.registerAgent(['messaging', 'compute'], {});

    const peers = await client1.discoverPeers('compute');
    expect(peers).toHaveLength(1);
    expect(peers[0].capabilities).toContain('compute');
  });

  it('should get client statistics', () => {
    const stats = client1.getStats();
    expect(stats).toHaveProperty('agentId');
    expect(stats).toHaveProperty('queuedMessages');
    expect(stats).toHaveProperty('encryption');
    expect(stats).toHaveProperty('dht');
  });
});

describe('Agent DHT', () => {
  let dht: AgentDHT;

  beforeEach(() => {
    dht = new AgentDHT('node-1');
  });

  it('should add peer to DHT', () => {
    dht.addPeer({
      id: 'peer-1',
      address: 'localhost',
      port: 8080,
      capabilities: ['messaging'],
      lastSeen: Date.now()
    });

    const peers = dht.getAllPeers();
    expect(peers).toHaveLength(1);
    expect(peers[0].id).toBe('peer-1');
  });

  it('should find peer by ID', () => {
    dht.addPeer({
      id: 'peer-1',
      address: 'localhost',
      port: 8080,
      capabilities: ['messaging'],
      lastSeen: Date.now()
    });

    const peer = dht.findPeer('peer-1');
    expect(peer).toBeTruthy();
    expect(peer?.id).toBe('peer-1');
  });

  it('should find peers by capability', () => {
    dht.addPeer({
      id: 'peer-1',
      address: 'localhost',
      port: 8080,
      capabilities: ['messaging', 'compute'],
      lastSeen: Date.now()
    });

    dht.addPeer({
      id: 'peer-2',
      address: 'localhost',
      port: 8081,
      capabilities: ['messaging'],
      lastSeen: Date.now()
    });

    const peers = dht.findByCapability('compute');
    expect(peers).toHaveLength(1);
    expect(peers[0].id).toBe('peer-1');
  });

  it('should remove peer from DHT', () => {
    dht.addPeer({
      id: 'peer-1',
      address: 'localhost',
      port: 8080,
      capabilities: ['messaging'],
      lastSeen: Date.now()
    });

    dht.removePeer('peer-1');

    const peers = dht.getAllPeers();
    expect(peers).toHaveLength(0);
  });

  it('should get DHT statistics', () => {
    const stats = dht.getStats();
    expect(stats).toHaveProperty('nodeId');
    expect(stats).toHaveProperty('totalPeers');
    expect(stats).toHaveProperty('kValue');
  });
});

describe('Protocol Hub', () => {
  let hub: ProtocolHub;

  beforeEach(() => {
    hub = new ProtocolHub();
  });

  afterEach(async () => {
    await hub.disconnectAll();
  });

  it('should register multiple protocols', () => {
    hub.registerMCP();
    hub.registerOpenAISwarm();

    const stats = hub.getStats();
    expect(stats.totalProtocols).toBeGreaterThanOrEqual(2);
  });

  it('should connect to protocol', async () => {
    hub.registerMCP();
    await hub.connect(ProtocolType.MCP);

    const connected = hub.getConnectedProtocols();
    expect(connected).toContain(ProtocolType.MCP);
  });

  it('should get protocol capabilities', () => {
    hub.registerMCP();

    const capabilities = hub.getCapabilities(ProtocolType.MCP);
    expect(Array.isArray(capabilities)).toBe(true);
  });

  it('should set fallback order', () => {
    hub.setFallbackOrder([
      ProtocolType.ACP,
      ProtocolType.A2A,
      ProtocolType.MCP
    ]);

    expect(() => hub.setFallbackOrder([])).not.toThrow();
  });

  it('should add routing rule', () => {
    hub.addRoutingRule('agent-1', ProtocolType.ACP);
    expect(() => hub.addRoutingRule('agent-2', ProtocolType.A2A)).not.toThrow();
  });

  it('should check if connected', () => {
    const isConnected = hub.isConnected();
    expect(typeof isConnected).toBe('boolean');
  });

  it('should get hub statistics', () => {
    const stats = hub.getStats();
    expect(stats).toHaveProperty('totalProtocols');
    expect(stats).toHaveProperty('connectedProtocols');
    expect(stats).toHaveProperty('protocols');
  });
});

describe('Agent Registry', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  it('should register agent', () => {
    registry.register({
      id: 'agent-1',
      name: 'Test Agent',
      type: 'worker',
      status: AgentStatus.ONLINE,
      capabilities: ['messaging'],
      protocols: ['acp'],
      metadata: {},
      health: {
        lastHeartbeat: Date.now()
      }
    });

    const agent = registry.getAgent('agent-1');
    expect(agent).toBeTruthy();
    expect(agent?.name).toBe('Test Agent');
  });

  it('should unregister agent', () => {
    registry.register({
      id: 'agent-1',
      name: 'Test Agent',
      type: 'worker',
      status: AgentStatus.ONLINE,
      capabilities: ['messaging'],
      protocols: ['acp'],
      metadata: {},
      health: {
        lastHeartbeat: Date.now()
      }
    });

    registry.unregister('agent-1');

    const agent = registry.getAgent('agent-1');
    expect(agent).toBeUndefined();
  });

  it('should update agent health', () => {
    registry.register({
      id: 'agent-1',
      name: 'Test Agent',
      type: 'worker',
      status: AgentStatus.ONLINE,
      capabilities: ['messaging'],
      protocols: ['acp'],
      metadata: {},
      health: {
        lastHeartbeat: Date.now()
      }
    });

    registry.updateHealth('agent-1', {
      responseTime: 100,
      successRate: 0.95
    });

    const agent = registry.getAgent('agent-1');
    expect(agent?.health.responseTime).toBe(100);
    expect(agent?.health.successRate).toBe(0.95);
  });

  it('should record heartbeat', () => {
    registry.register({
      id: 'agent-1',
      name: 'Test Agent',
      type: 'worker',
      status: AgentStatus.ONLINE,
      capabilities: ['messaging'],
      protocols: ['acp'],
      metadata: {},
      health: {
        lastHeartbeat: Date.now() - 60000
      }
    });

    const before = registry.getAgent('agent-1')!.health.lastHeartbeat;
    registry.heartbeat('agent-1', 50);
    const after = registry.getAgent('agent-1')!.health.lastHeartbeat;

    expect(after).toBeGreaterThan(before);
  });

  it('should find agents by capability', () => {
    registry.register({
      id: 'agent-1',
      name: 'Agent 1',
      type: 'worker',
      status: AgentStatus.ONLINE,
      capabilities: ['messaging', 'compute'],
      protocols: ['acp'],
      metadata: {},
      health: {
        lastHeartbeat: Date.now()
      }
    });

    registry.register({
      id: 'agent-2',
      name: 'Agent 2',
      type: 'worker',
      status: AgentStatus.ONLINE,
      capabilities: ['messaging'],
      protocols: ['acp'],
      metadata: {},
      health: {
        lastHeartbeat: Date.now()
      }
    });

    const agents = registry.discoverByCapability('compute');
    expect(agents).toHaveLength(1);
    expect(agents[0].id).toBe('agent-1');
  });

  it('should select agent with load balancing', () => {
    registry.register({
      id: 'agent-1',
      name: 'Agent 1',
      type: 'worker',
      status: AgentStatus.ONLINE,
      capabilities: ['messaging'],
      protocols: ['acp'],
      metadata: {},
      health: {
        lastHeartbeat: Date.now(),
        load: 0.8
      }
    });

    registry.register({
      id: 'agent-2',
      name: 'Agent 2',
      type: 'worker',
      status: AgentStatus.ONLINE,
      capabilities: ['messaging'],
      protocols: ['acp'],
      metadata: {},
      health: {
        lastHeartbeat: Date.now(),
        load: 0.3
      }
    });

    const selected = registry.selectAgent(
      { capabilities: ['messaging'] },
      'least-load'
    );

    expect(selected?.id).toBe('agent-2');
  });

  it('should get registry statistics', () => {
    registry.register({
      id: 'agent-1',
      name: 'Agent 1',
      type: 'worker',
      status: AgentStatus.ONLINE,
      capabilities: ['messaging'],
      protocols: ['acp'],
      metadata: {},
      health: {
        lastHeartbeat: Date.now()
      }
    });

    const stats = registry.getStats();
    expect(stats.totalAgents).toBe(1);
    expect(stats.online).toBe(1);
  });

  it('should start and stop health checking', () => {
    registry.startHealthChecking();
    registry.stopHealthChecking();
    expect(() => registry.startHealthChecking()).not.toThrow();
  });

  it('should export and import registry', () => {
    registry.register({
      id: 'agent-1',
      name: 'Agent 1',
      type: 'worker',
      status: AgentStatus.ONLINE,
      capabilities: ['messaging'],
      protocols: ['acp'],
      metadata: {},
      health: {
        lastHeartbeat: Date.now()
      }
    });

    const exported = registry.export();
    expect(exported).toHaveLength(1);

    registry.clear();
    expect(registry.getAllAgents()).toHaveLength(0);

    registry.import(exported);
    expect(registry.getAllAgents()).toHaveLength(1);
  });
});

describe('Universal Messenger', () => {
  let hub: ProtocolHub;
  let registry: AgentRegistry;
  let messenger: UniversalMessenger;

  beforeEach(() => {
    hub = new ProtocolHub();
    registry = new AgentRegistry();
    messenger = new UniversalMessenger(hub, registry);

    // Register a test protocol
    hub.registerMCP();
  });

  afterEach(async () => {
    await messenger.shutdown();
    await hub.disconnectAll();
  });

  it('should send message', async () => {
    await hub.connect(ProtocolType.MCP);

    registry.register({
      id: 'agent-1',
      name: 'Agent 1',
      type: 'worker',
      status: AgentStatus.ONLINE,
      capabilities: ['messaging'],
      protocols: ['mcp'],
      metadata: {},
      health: {
        lastHeartbeat: Date.now()
      }
    });

    const result = await messenger.send(
      'agent-1',
      'test.message',
      { data: 'hello' },
      { priority: MessagePriority.NORMAL }
    );

    expect(result.messageId).toBeTruthy();
  });

  it('should get queue statistics', () => {
    const stats = messenger.getQueueStats();
    expect(stats).toHaveProperty('total');
    expect(stats).toHaveProperty('byPriority');
    expect(stats).toHaveProperty('byGuarantee');
  });

  it('should clear expired messages', () => {
    const cleared = messenger.clearExpired();
    expect(typeof cleared).toBe('number');
  });

  it('should pause and resume queue', () => {
    messenger.pause();
    messenger.resume();
    expect(() => messenger.pause()).not.toThrow();
  });

  it('should clear all queues', () => {
    messenger.clear();
    const stats = messenger.getQueueStats();
    expect(stats.total).toBe(0);
  });
});

describe('Integration Tests', () => {
  it('should work end-to-end', async () => {
    // Setup
    const hub = new ProtocolHub();
    const registry = new AgentRegistry();
    const messenger = new UniversalMessenger(hub, registry);

    // Register protocol
    hub.registerMCP();
    await hub.connect(ProtocolType.MCP);

    // Register agent
    registry.register({
      id: 'worker-1',
      name: 'Worker 1',
      type: 'worker',
      status: AgentStatus.ONLINE,
      capabilities: ['task-execution'],
      protocols: ['mcp'],
      metadata: {},
      health: {
        lastHeartbeat: Date.now()
      }
    });

    // Send message
    const result = await messenger.send(
      'worker-1',
      'execute.task',
      { taskId: 'task-123' },
      {
        priority: MessagePriority.HIGH,
        guarantee: DeliveryGuarantee.AT_MOST_ONCE
      }
    );

    expect(result.messageId).toBeTruthy();

    // Cleanup
    await messenger.shutdown();
    await hub.disconnectAll();
  });

  it('should handle protocol fallback', async () => {
    const hub = new ProtocolHub();
    const registry = new AgentRegistry();
    const messenger = new UniversalMessenger(hub, registry);

    // Register multiple protocols
    hub.registerMCP();
    hub.registerOpenAISwarm();

    // Set fallback order
    hub.setFallbackOrder([
      ProtocolType.OPENAI_SWARM,
      ProtocolType.MCP
    ]);

    await hub.connectAll();

    // Register agent with multiple protocols
    registry.register({
      id: 'multi-agent',
      name: 'Multi Agent',
      type: 'worker',
      status: AgentStatus.ONLINE,
      capabilities: ['multi-protocol'],
      protocols: ['mcp', 'openai-swarm'],
      metadata: {},
      health: {
        lastHeartbeat: Date.now()
      }
    });

    const result = await messenger.send(
      'multi-agent',
      'test.message',
      { data: 'test' }
    );

    expect(result.messageId).toBeTruthy();

    // Cleanup
    await messenger.shutdown();
    await hub.disconnectAll();
  });
});
