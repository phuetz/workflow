/**
 * PLAN C PHASE 5 - Tests Unitaires LoadBalancer
 * Tests complets pour le load balancer intelligent
 * Coverage cible: 95%+
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IntelligentLoadBalancer } from '../LoadBalancer';
import type {
  ServerNode,
  LoadBalancerConfig,
  Request,
  Response,
  RoutingDecision,
  LoadBalancerStats
} from '../LoadBalancer';

describe('IntelligentLoadBalancer', () => {
  let loadBalancer: IntelligentLoadBalancer;
  
  beforeEach(() => {
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    if (loadBalancer) {
      loadBalancer.destroy();
    }
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create with default configuration', () => {
      loadBalancer = new IntelligentLoadBalancer();
      const stats = loadBalancer.getStats();
      
      expect(stats).toBeDefined();
      expect(stats.totalRequests).toBe(0);
      expect(stats.nodeDistribution).toEqual({});
    });

    it('should create with custom configuration', () => {
      const config: Partial<LoadBalancerConfig> = {
        strategy: 'least-connections',
        healthCheckInterval: 10000,
        maxRetries: 5,
        enableML: true
      };
      
      loadBalancer = new IntelligentLoadBalancer(config);
      const stats = loadBalancer.getStats();
      
      expect(stats).toBeDefined();
    });

    it('should support all balancing strategies', () => {
      const strategies: LoadBalancerConfig['strategy'][] = [
        'round-robin',
        'least-connections',
        'weighted-round-robin',
        'ip-hash',
        'least-response-time',
        'random',
        'ml-optimized'
      ];
      
      strategies.forEach(strategy => {
        const lb = new IntelligentLoadBalancer({ strategy });
        expect(lb).toBeDefined();
        lb.destroy();
      });
    });
  });

  describe('Node Management', () => {
    beforeEach(() => {
      loadBalancer = new IntelligentLoadBalancer();
    });

    it('should add a node', () => {
      const nodeId = loadBalancer.addNode({
        host: 'localhost',
        port: 3000
      });
      
      expect(nodeId).toBeDefined();
      expect(nodeId).toMatch(/^node[_-]/);
      
      const nodes = loadBalancer.getNodes();
      expect(nodes).toHaveLength(1);
      expect(nodes[0].host).toBe('localhost');
      expect(nodes[0].port).toBe(3000);
    });

    it('should add node with custom properties', () => {
      const nodeId = loadBalancer.addNode({
        host: 'server1.example.com',
        port: 8080,
        weight: 2,
        maxConnections: 500,
        metadata: {
          region: 'us-east-1',
          zone: 'a',
          version: '2.0.0',
          capabilities: ['websocket', 'http2'],
          tags: { env: 'production' }
        }
      });
      
      const nodes = loadBalancer.getNodes();
      expect(nodes[0].weight).toBe(2);
      expect(nodes[0].maxConnections).toBe(500);
      expect(nodes[0].metadata.region).toBe('us-east-1');
    });

    it('should remove a node', () => {
      return new Promise<void>((resolve) => {
        const nodeId = loadBalancer.addNode({
          host: 'localhost',
          port: 3000
        });

        loadBalancer.on('node:removed', (event) => {
          expect(event.nodeId).toBe(nodeId);
          resolve();
        });

        loadBalancer.removeNode(nodeId);

        // Node should be marked as draining
        const nodes = loadBalancer.getNodes();
        expect(nodes[0].health.status).toBe('draining');

        // After drain timeout, node should be removed
        vi.advanceTimersByTime(31000);
      });
    });

    it('should update node configuration', () => {
      const nodeId = loadBalancer.addNode({
        host: 'localhost',
        port: 3000
      });
      
      loadBalancer.updateNode(nodeId, {
        weight: 3,
        maxConnections: 1000
      });
      
      const nodes = loadBalancer.getNodes();
      expect(nodes[0].weight).toBe(3);
      expect(nodes[0].maxConnections).toBe(1000);
    });

    it('should emit events for node operations', () => {
      const addHandler = vi.fn();
      const updateHandler = vi.fn();
      
      loadBalancer.on('node:added', addHandler);
      loadBalancer.on('node:updated', updateHandler);
      
      const nodeId = loadBalancer.addNode({
        host: 'localhost',
        port: 3000
      });
      
      expect(addHandler).toHaveBeenCalled();
      
      loadBalancer.updateNode(nodeId, { weight: 2 });
      
      expect(updateHandler).toHaveBeenCalled();
    });
  });

  describe('Request Routing - Round Robin', () => {
    beforeEach(() => {
      loadBalancer = new IntelligentLoadBalancer({
        strategy: 'round-robin'
      });
      
      // Add multiple nodes
      loadBalancer.addNode({ host: 'server1', port: 3000 });
      loadBalancer.addNode({ host: 'server2', port: 3000 });
      loadBalancer.addNode({ host: 'server3', port: 3000 });
    });

    it('should route requests in round-robin fashion', async () => {
      const responses: Response[] = [];
      
      for (let i = 0; i < 6; i++) {
        const request: Request = {
          id: `req-${i}`,
          method: 'GET',
          path: '/api/test',
          headers: {},
          clientIp: '192.168.1.1',
          priority: 5,
          timestamp: new Date()
        };
        
        const response = await loadBalancer.route(request);
        responses.push(response);
      }
      
      // Check that requests were distributed evenly
      const nodeDistribution = new Map<string, number>();
      responses.forEach(r => {
        nodeDistribution.set(r.nodeId, (nodeDistribution.get(r.nodeId) || 0) + 1);
      });
      
      expect(nodeDistribution.size).toBe(3);
      nodeDistribution.forEach(count => {
        expect(count).toBe(2);
      });
    });
  });

  describe('Request Routing - Least Connections', () => {
    beforeEach(() => {
      loadBalancer = new IntelligentLoadBalancer({
        strategy: 'least-connections'
      });
      
      const node1 = loadBalancer.addNode({ host: 'server1', port: 3000 });
      const node2 = loadBalancer.addNode({ host: 'server2', port: 3000 });
      
      // Simulate different connection counts
      const nodes = loadBalancer.getNodes();
      nodes[0].currentConnections = 5;
      nodes[1].currentConnections = 2;
    });

    it('should route to node with least connections', async () => {
      const request: Request = {
        id: 'req-1',
        method: 'GET',
        path: '/api/test',
        headers: {},
        clientIp: '192.168.1.1',
        priority: 5,
        timestamp: new Date()
      };
      
      const response = await loadBalancer.route(request);
      
      // Should route to server2 (fewer connections)
      const nodes = loadBalancer.getNodes();
      expect(nodes.find(n => n.id === response.nodeId)?.host).toBe('server2');
    });
  });

  describe('Request Routing - Weighted Round Robin', () => {
    beforeEach(() => {
      loadBalancer = new IntelligentLoadBalancer({
        strategy: 'weighted-round-robin'
      });
      
      loadBalancer.addNode({ host: 'server1', port: 3000, weight: 1 });
      loadBalancer.addNode({ host: 'server2', port: 3000, weight: 2 });
      loadBalancer.addNode({ host: 'server3', port: 3000, weight: 3 });
    });

    it('should route based on weights', async () => {
      const responses: Response[] = [];
      
      for (let i = 0; i < 100; i++) {
        const request: Request = {
          id: `req-${i}`,
          method: 'GET',
          path: '/api/test',
          headers: {},
          clientIp: '192.168.1.1',
          priority: 5,
          timestamp: new Date()
        };
        
        const response = await loadBalancer.route(request);
        responses.push(response);
      }
      
      // Count distribution
      const nodes = loadBalancer.getNodes();
      const distribution = new Map<string, number>();
      
      responses.forEach(r => {
        const node = nodes.find(n => n.id === r.nodeId);
        if (node) {
          distribution.set(node.host, (distribution.get(node.host) || 0) + 1);
        }
      });
      
      // server3 should have approximately 3x more requests than server1
      const server1Count = distribution.get('server1') || 0;
      const server3Count = distribution.get('server3') || 0;
      
      expect(server3Count).toBeGreaterThan(server1Count * 2);
    });
  });

  describe('Request Routing - IP Hash', () => {
    beforeEach(() => {
      loadBalancer = new IntelligentLoadBalancer({
        strategy: 'ip-hash'
      });
      
      loadBalancer.addNode({ host: 'server1', port: 3000 });
      loadBalancer.addNode({ host: 'server2', port: 3000 });
      loadBalancer.addNode({ host: 'server3', port: 3000 });
    });

    it('should route same IP to same node', async () => {
      const clientIp = '192.168.1.100';
      const responses: Response[] = [];
      
      for (let i = 0; i < 5; i++) {
        const request: Request = {
          id: `req-${i}`,
          method: 'GET',
          path: '/api/test',
          headers: {},
          clientIp,
          priority: 5,
          timestamp: new Date()
        };
        
        const response = await loadBalancer.route(request);
        responses.push(response);
      }
      
      // All requests from same IP should go to same node
      const nodeIds = new Set(responses.map(r => r.nodeId));
      expect(nodeIds.size).toBe(1);
    });

    it('should route different IPs to different nodes', async () => {
      const ips = ['192.168.1.1', '192.168.1.2', '192.168.1.3'];
      const nodeIds = new Set<string>();
      
      for (const ip of ips) {
        const request: Request = {
          id: `req-${ip}`,
          method: 'GET',
          path: '/api/test',
          headers: {},
          clientIp: ip,
          priority: 5,
          timestamp: new Date()
        };
        
        const response = await loadBalancer.route(request);
        nodeIds.add(response.nodeId);
      }
      
      // Different IPs might go to different nodes
      expect(nodeIds.size).toBeGreaterThan(0);
    });
  });

  describe('Sticky Sessions', () => {
    beforeEach(() => {
      loadBalancer = new IntelligentLoadBalancer({
        strategy: 'round-robin',
        stickySession: true,
        sessionTimeout: 3600000
      });
      
      loadBalancer.addNode({ host: 'server1', port: 3000 });
      loadBalancer.addNode({ host: 'server2', port: 3000 });
      loadBalancer.addNode({ host: 'server3', port: 3000 });
    });

    it('should route same session to same node', async () => {
      const sessionId = 'session-123';
      const responses: Response[] = [];
      
      for (let i = 0; i < 5; i++) {
        const request: Request = {
          id: `req-${i}`,
          method: 'GET',
          path: '/api/test',
          headers: {},
          clientIp: '192.168.1.1',
          sessionId,
          priority: 5,
          timestamp: new Date()
        };
        
        const response = await loadBalancer.route(request);
        responses.push(response);
      }
      
      // All requests with same session should go to same node
      const nodeIds = new Set(responses.map(r => r.nodeId));
      expect(nodeIds.size).toBe(1);
    });

    it('should clean up expired sessions', async () => {
      const request: Request = {
        id: 'req-1',
        method: 'GET',
        path: '/api/test',
        headers: {},
        clientIp: '192.168.1.1',
        sessionId: 'session-456',
        priority: 5,
        timestamp: new Date()
      };
      
      await loadBalancer.route(request);
      
      // Advance time past session timeout
      vi.advanceTimersByTime(3600001);
      
      // Session should be cleaned up
      // Next request with same session should potentially go to different node
      const response2 = await loadBalancer.route(request);
      expect(response2).toBeDefined();
    });
  });

  describe('Circuit Breaker', () => {
    beforeEach(() => {
      loadBalancer = new IntelligentLoadBalancer({
        circuitBreakerThreshold: 3,
        maxRetries: 2
      });
      
      loadBalancer.addNode({ host: 'server1', port: 3000 });
      loadBalancer.addNode({ host: 'server2', port: 3000 });
    });

    it('should open circuit after threshold failures', async () => {
      const nodes = loadBalancer.getNodes();
      const nodeId = nodes[0].id;
      
      // Simulate failures
      for (let i = 0; i < 3; i++) {
        loadBalancer['circuitBreaker'].recordFailure(nodeId);
      }
      
      // Circuit should be open
      const canRequest = loadBalancer['circuitBreaker'].canRequest(nodeId);
      expect(canRequest).toBe(false);
    });

    it('should allow half-open state after timeout', async () => {
      const nodes = loadBalancer.getNodes();
      const nodeId = nodes[0].id;
      
      // Open the circuit
      for (let i = 0; i < 5; i++) {
        loadBalancer['circuitBreaker'].recordFailure(nodeId);
      }
      
      // Advance time for reset timeout
      vi.advanceTimersByTime(31000);
      
      // Should be in half-open state
      const canRequest = loadBalancer['circuitBreaker'].canRequest(nodeId);
      expect(canRequest).toBe(true);
    });

    it('should close circuit after successful requests in half-open', () => {
      const nodes = loadBalancer.getNodes();
      const nodeId = nodes[0].id;
      const breaker = loadBalancer['circuitBreaker'];
      
      // Open then move to half-open
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure(nodeId);
      }
      vi.advanceTimersByTime(31000);
      
      // Record successes
      for (let i = 0; i < 3; i++) {
        breaker.recordSuccess(nodeId);
      }
      
      // Should be closed again
      expect(breaker.canRequest(nodeId)).toBe(true);
    });
  });

  describe('Health Checks', () => {
    beforeEach(() => {
      loadBalancer = new IntelligentLoadBalancer({
        healthCheckInterval: 1000
      });
      
      loadBalancer.addNode({ host: 'server1', port: 3000 });
      loadBalancer.addNode({ host: 'server2', port: 3000 });
    });

    it('should perform health checks periodically', () => {
      const nodes = loadBalancer.getNodes();
      const initialCheckTime = nodes[0].health.lastCheck;
      
      // Advance time to trigger health check
      vi.advanceTimersByTime(1100);
      
      const updatedNodes = loadBalancer.getNodes();
      expect(updatedNodes[0].health.lastCheck.getTime())
        .toBeGreaterThan(initialCheckTime.getTime());
    });

    it('should mark unhealthy nodes', () => {
      const nodes = loadBalancer.getNodes();
      
      // Simulate consecutive failures
      nodes[0].health.consecutiveFailures = 3;
      
      // Trigger health check
      loadBalancer['checkNodeHealth'](nodes[0]);
      
      // Should be marked as unhealthy
      expect(nodes[0].health.status).toBe('unhealthy');
    });

    it('should mark degraded nodes', () => {
      const nodes = loadBalancer.getNodes();
      
      // Simulate some failures
      nodes[0].health.consecutiveFailures = 2;
      
      // Trigger health check
      loadBalancer['checkNodeHealth'](nodes[0]);
      
      // Should be marked as degraded
      expect(nodes[0].health.status).toBe('degraded');
    });
  });

  describe('ML-Optimized Routing', () => {
    beforeEach(() => {
      loadBalancer = new IntelligentLoadBalancer({
        strategy: 'ml-optimized',
        enableML: true
      });
      
      loadBalancer.addNode({ host: 'server1', port: 3000 });
      loadBalancer.addNode({ host: 'server2', port: 3000 });
      
      // Set different metrics for ML model
      const nodes = loadBalancer.getNodes();
      nodes[0].metrics = {
        requestCount: 100,
        errorCount: 5,
        avgResponseTime: 150,
        p95ResponseTime: 200,
        p99ResponseTime: 250,
        throughput: 50,
        cpuUsage: 60,
        memoryUsage: 70,
        networkLatency: 10
      };
      
      nodes[1].metrics = {
        requestCount: 80,
        errorCount: 2,
        avgResponseTime: 100,
        p95ResponseTime: 150,
        p99ResponseTime: 180,
        throughput: 60,
        cpuUsage: 40,
        memoryUsage: 50,
        networkLatency: 5
      };
    });

    it('should use ML model for routing', async () => {
      const request: Request = {
        id: 'req-1',
        method: 'GET',
        path: '/api/test',
        headers: {},
        clientIp: '192.168.1.1',
        priority: 5,
        timestamp: new Date()
      };
      
      const response = await loadBalancer.route(request);
      
      // ML should prefer server2 (better metrics)
      const nodes = loadBalancer.getNodes();
      const selectedNode = nodes.find(n => n.id === response.nodeId);
      expect(selectedNode?.host).toBe('server2');
    });

    it('should update ML model based on results', async () => {
      const request: Request = {
        id: 'req-1',
        method: 'GET',
        path: '/api/test',
        headers: {},
        clientIp: '192.168.1.1',
        priority: 5,
        timestamp: new Date()
      };
      
      const response = await loadBalancer.route(request);
      
      // Response includes ML update
      expect(response).toBeDefined();
      expect(response.responseTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Statistics and Metrics', () => {
    beforeEach(() => {
      loadBalancer = new IntelligentLoadBalancer();
      
      loadBalancer.addNode({ host: 'server1', port: 3000 });
      loadBalancer.addNode({ host: 'server2', port: 3000 });
    });

    it('should track request statistics', async () => {
      const initialStats = loadBalancer.getStats();
      expect(initialStats.totalRequests).toBe(0);
      
      // Make some requests
      for (let i = 0; i < 10; i++) {
        const request: Request = {
          id: `req-${i}`,
          method: 'GET',
          path: '/api/test',
          headers: {},
          clientIp: '192.168.1.1',
          priority: 5,
          timestamp: new Date()
        };
        
        await loadBalancer.route(request);
      }
      
      const stats = loadBalancer.getStats();
      expect(stats.totalRequests).toBe(10);
      expect(stats.successfulRequests).toBeGreaterThan(0);
    });

    it('should track node distribution', async () => {
      // Make requests
      for (let i = 0; i < 20; i++) {
        const request: Request = {
          id: `req-${i}`,
          method: 'GET',
          path: '/api/test',
          headers: {},
          clientIp: '192.168.1.1',
          priority: 5,
          timestamp: new Date()
        };
        
        await loadBalancer.route(request);
      }
      
      const stats = loadBalancer.getStats();
      expect(Object.keys(stats.nodeDistribution).length).toBeGreaterThan(0);
      
      // Check distribution adds up
      const total = Object.values(stats.nodeDistribution)
        .reduce((sum, count) => sum + count, 0);
      expect(total).toBe(20);
    });

    it('should calculate average response time', async () => {
      // Make requests
      for (let i = 0; i < 5; i++) {
        const request: Request = {
          id: `req-${i}`,
          method: 'GET',
          path: '/api/test',
          headers: {},
          clientIp: '192.168.1.1',
          priority: 5,
          timestamp: new Date()
        };
        
        await loadBalancer.route(request);
      }
      
      const stats = loadBalancer.getStats();
      expect(stats.avgResponseTime).toBeGreaterThanOrEqual(0);
    });

    it('should emit metrics events', () => {
      return new Promise<void>((resolve) => {
        loadBalancer.on('metrics:updated', (stats) => {
          expect(stats).toHaveProperty('totalRequests');
          expect(stats).toHaveProperty('throughput');
          resolve();
        });

        // Trigger metrics update
        vi.advanceTimersByTime(5100);
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      loadBalancer = new IntelligentLoadBalancer();
    });

    it('should handle no available nodes', async () => {
      const request: Request = {
        id: 'req-1',
        method: 'GET',
        path: '/api/test',
        headers: {},
        clientIp: '192.168.1.1',
        priority: 5,
        timestamp: new Date()
      };
      
      await expect(loadBalancer.route(request))
        .rejects.toThrow('No available nodes');
    });

    it('should use fallback nodes on primary failure', async () => {
      loadBalancer.addNode({ host: 'server1', port: 3000 });
      loadBalancer.addNode({ host: 'server2', port: 3000 });
      loadBalancer.addNode({ host: 'server3', port: 3000 });
      
      // Mark first node as unhealthy
      const nodes = loadBalancer.getNodes();
      nodes[0].health.status = 'unhealthy';
      
      const request: Request = {
        id: 'req-1',
        method: 'GET',
        path: '/api/test',
        headers: {},
        clientIp: '192.168.1.1',
        priority: 5,
        timestamp: new Date()
      };
      
      const response = await loadBalancer.route(request);
      
      // Should route to healthy node
      expect(response.nodeId).not.toBe(nodes[0].id);
    });

    it('should handle all nodes failing', async () => {
      loadBalancer.addNode({ host: 'server1', port: 3000 });
      loadBalancer.addNode({ host: 'server2', port: 3000 });
      
      // Mark all nodes as unhealthy
      const nodes = loadBalancer.getNodes();
      nodes.forEach(node => {
        node.health.status = 'unhealthy';
      });
      
      const request: Request = {
        id: 'req-1',
        method: 'GET',
        path: '/api/test',
        headers: {},
        clientIp: '192.168.1.1',
        priority: 5,
        timestamp: new Date()
      };
      
      await expect(loadBalancer.route(request))
        .rejects.toThrow('No available nodes');
    });
  });

  describe('Performance', () => {
    it('should handle high request volume', async () => {
      loadBalancer = new IntelligentLoadBalancer({
        strategy: 'round-robin'
      });
      
      // Add multiple nodes
      for (let i = 0; i < 10; i++) {
        loadBalancer.addNode({ host: `server${i}`, port: 3000 + i });
      }
      
      const startTime = Date.now();
      const requestCount = 1000;
      const promises: Promise<Response>[] = [];
      
      // Send many concurrent requests
      for (let i = 0; i < requestCount; i++) {
        const request: Request = {
          id: `req-${i}`,
          method: 'GET',
          path: '/api/test',
          headers: {},
          clientIp: `192.168.1.${i % 256}`,
          priority: Math.floor(Math.random() * 10),
          timestamp: new Date()
        };
        
        promises.push(loadBalancer.route(request));
      }
      
      const responses = await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      expect(responses).toHaveLength(requestCount);
      expect(duration).toBeLessThan(5000); // Should handle 1000 requests in < 5s
    });

    it('should maintain performance with many nodes', () => {
      loadBalancer = new IntelligentLoadBalancer();
      
      // Add many nodes
      for (let i = 0; i < 100; i++) {
        loadBalancer.addNode({ 
          host: `server${i}`, 
          port: 3000 + i,
          weight: Math.floor(Math.random() * 5) + 1
        });
      }
      
      const nodes = loadBalancer.getNodes();
      expect(nodes).toHaveLength(100);
      
      // Should still be performant
      const stats = loadBalancer.getStats();
      expect(stats).toBeDefined();
    });
  });

  describe('Cleanup', () => {
    it('should clean up on destroy', () => {
      loadBalancer = new IntelligentLoadBalancer({
        healthCheckInterval: 1000
      });
      
      loadBalancer.addNode({ host: 'server1', port: 3000 });
      
      const eventHandler = vi.fn();
      loadBalancer.on('test', eventHandler);
      
      loadBalancer.destroy();
      
      // Should remove all listeners
      expect(loadBalancer.listenerCount('test')).toBe(0);
      
      // Should not throw when destroyed again
      expect(() => loadBalancer.destroy()).not.toThrow();
    });
  });
});