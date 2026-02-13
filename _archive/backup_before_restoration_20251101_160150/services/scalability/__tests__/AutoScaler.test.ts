/**
 * PLAN C PHASE 5 - Tests Unitaires AutoScaler
 * Tests complets pour le système d'auto-scaling avec ML
 * Coverage cible: 95%+
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IntelligentAutoScaler } from '../AutoScaler';
import type {
  AutoScalerConfig,
  ScalingPolicy,
  ScalingRule,
  Instance,
  ScalingMetrics,
  ScalingDecision,
  PredictionData
} from '../AutoScaler';

describe('IntelligentAutoScaler', () => {
  let autoScaler: IntelligentAutoScaler;
  
  beforeEach(() => {
    vi.useFakeTimers();
  });
  
  afterEach(async () => {
    if (autoScaler) {
      await autoScaler.stop();
      autoScaler.destroy();
    }
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create with default configuration', () => {
      autoScaler = new IntelligentAutoScaler();
      const metrics = autoScaler.getMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.currentInstances).toBe(0);
      expect(metrics.targetInstances).toBeGreaterThan(0);
    });

    it('should create with custom configuration', () => {
      const config: Partial<AutoScalerConfig> = {
        minInstances: 3,
        maxInstances: 50,
        targetUtilization: 75,
        scaleUpThreshold: 85,
        scaleDownThreshold: 25,
        predictionEnabled: true,
        costOptimization: true
      };
      
      autoScaler = new IntelligentAutoScaler(config);
      const metrics = autoScaler.getMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.targetInstances).toBe(3);
    });

    it('should support different scaling policies', () => {
      const policies: ScalingPolicy['type'][] = [
        'reactive',
        'predictive',
        'scheduled',
        'hybrid'
      ];
      
      policies.forEach(type => {
        const scaler = new IntelligentAutoScaler({
          scalingPolicy: { type, rules: [] }
        });
        expect(scaler).toBeDefined();
        scaler.destroy();
      });
    });
  });

  describe('Instance Management', () => {
    beforeEach(() => {
      autoScaler = new IntelligentAutoScaler({
        minInstances: 2,
        maxInstances: 10,
        warmupTime: 100
      });
    });

    it('should start and create initial instances', async () => {
      const startHandler = vi.fn();
      autoScaler.on('autoscaler:started', startHandler);
      
      await autoScaler.start();
      
      // Wait for instances to be created
      await vi.advanceTimersByTimeAsync(150);
      
      expect(startHandler).toHaveBeenCalled();
      
      const instances = autoScaler.getInstances();
      expect(instances).toHaveLength(2);
      expect(instances[0].status).toBe('running');
    });

    it('should stop and terminate all instances', async () => {
      await autoScaler.start();
      await vi.advanceTimersByTimeAsync(150);
      
      const stopHandler = vi.fn();
      autoScaler.on('autoscaler:stopped', stopHandler);
      
      await autoScaler.stop();
      
      expect(stopHandler).toHaveBeenCalled();
      
      // After termination delay
      await vi.advanceTimersByTimeAsync(31000);
      
      const instances = autoScaler.getInstances();
      expect(instances).toHaveLength(0);
    });

    it('should track instance lifecycle', async () => {
      const readyHandler = vi.fn();
      const terminatedHandler = vi.fn();
      
      autoScaler.on('instance:ready', readyHandler);
      autoScaler.on('instance:terminated', terminatedHandler);
      
      await autoScaler.start();
      await vi.advanceTimersByTimeAsync(150);
      
      expect(readyHandler).toHaveBeenCalledTimes(2);
      
      await autoScaler.stop();
      await vi.advanceTimersByTimeAsync(31000);
      
      expect(terminatedHandler).toHaveBeenCalledTimes(2);
    });

    it('should get instance details', async () => {
      await autoScaler.start();
      await vi.advanceTimersByTimeAsync(150);
      
      const instances = autoScaler.getInstances();
      
      expect(instances).toHaveLength(2);
      instances.forEach(instance => {
        expect(instance).toHaveProperty('id');
        expect(instance).toHaveProperty('type');
        expect(instance).toHaveProperty('status');
        expect(instance).toHaveProperty('resources');
        expect(instance).toHaveProperty('metrics');
        expect(instance).toHaveProperty('createdAt');
        expect(instance).toHaveProperty('cost');
      });
    });
  });

  describe('Manual Scaling', () => {
    beforeEach(async () => {
      autoScaler = new IntelligentAutoScaler({
        minInstances: 2,
        maxInstances: 10,
        warmupTime: 100
      });
      await autoScaler.start();
      await vi.advanceTimersByTimeAsync(150);
    });

    it('should scale to specific number', async () => {
      await autoScaler.scaleTo(5);
      await vi.advanceTimersByTimeAsync(150);
      
      const instances = autoScaler.getInstances();
      expect(instances).toHaveLength(5);
    });

    it('should respect minimum instances', async () => {
      await autoScaler.scaleTo(0);
      await vi.advanceTimersByTimeAsync(150);
      
      const instances = autoScaler.getInstances();
      expect(instances).toHaveLength(2); // min is 2
    });

    it('should respect maximum instances', async () => {
      await autoScaler.scaleTo(20);
      await vi.advanceTimersByTimeAsync(150);
      
      const instances = autoScaler.getInstances();
      expect(instances).toHaveLength(10); // max is 10
    });

    it('should handle scale down', async () => {
      await autoScaler.scaleTo(5);
      await vi.advanceTimersByTimeAsync(150);
      
      await autoScaler.scaleTo(3);
      await vi.advanceTimersByTimeAsync(31000);
      
      const instances = autoScaler.getInstances();
      expect(instances).toHaveLength(3);
    });
  });

  describe('Reactive Scaling', () => {
    beforeEach(async () => {
      autoScaler = new IntelligentAutoScaler({
        minInstances: 2,
        maxInstances: 10,
        scaleUpThreshold: 80,
        scaleDownThreshold: 30,
        cooldownPeriod: 5000,
        scalingPolicy: {
          type: 'reactive',
          rules: []
        }
      });
      await autoScaler.start();
      await vi.advanceTimersByTimeAsync(150);
    });

    it('should scale up on high CPU usage', async () => {
      const scaleHandler = vi.fn();
      autoScaler.on('autoscaler:scaled', scaleHandler);
      
      // Simulate high CPU
      const instances = autoScaler.getInstances();
      instances.forEach(instance => {
        instance.metrics.cpuUsage = 85;
      });
      
      // Trigger evaluation
      await vi.advanceTimersByTimeAsync(11000);
      
      expect(scaleHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'scale-up'
        })
      );
    });

    it('should scale down on low usage', async () => {
      // First scale up
      await autoScaler.scaleTo(5);
      await vi.advanceTimersByTimeAsync(150);
      
      // Wait for cooldown
      await vi.advanceTimersByTimeAsync(6000);
      
      const scaleHandler = vi.fn();
      autoScaler.on('autoscaler:scaled', scaleHandler);
      
      // Simulate low usage
      const instances = autoScaler.getInstances();
      instances.forEach(instance => {
        instance.metrics.cpuUsage = 20;
        instance.metrics.memoryUsage = 25;
      });
      
      // Trigger evaluation
      await vi.advanceTimersByTimeAsync(11000);
      
      expect(scaleHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'scale-down'
        })
      );
    });

    it('should respect cooldown period', async () => {
      const cooldownHandler = vi.fn();
      autoScaler.on('autoscaler:cooldown', cooldownHandler);
      
      // Trigger first scaling
      const instances = autoScaler.getInstances();
      instances.forEach(instance => {
        instance.metrics.cpuUsage = 85;
      });
      
      await vi.advanceTimersByTimeAsync(11000);
      
      // Try to scale again immediately
      instances.forEach(instance => {
        instance.metrics.cpuUsage = 90;
      });
      
      await vi.advanceTimersByTimeAsync(1000);
      
      expect(cooldownHandler).toHaveBeenCalled();
    });
  });

  describe('Predictive Scaling', () => {
    beforeEach(async () => {
      autoScaler = new IntelligentAutoScaler({
        minInstances: 2,
        maxInstances: 10,
        predictionEnabled: true,
        scalingPolicy: {
          type: 'predictive',
          rules: []
        }
      });
      await autoScaler.start();
      await vi.advanceTimersByTimeAsync(150);
    });

    it('should predict future load', () => {
      const prediction = autoScaler.predictLoad(30);
      
      expect(prediction).toBeDefined();
      expect(prediction).toHaveProperty('predictedLoad');
      expect(prediction).toHaveProperty('confidence');
      expect(prediction).toHaveProperty('horizon');
      expect(prediction?.confidence).toBeGreaterThan(0);
      expect(prediction?.confidence).toBeLessThanOrEqual(1);
    });

    it('should cache predictions', () => {
      const prediction1 = autoScaler.predictLoad(30);
      const prediction2 = autoScaler.predictLoad(30);
      
      // Should return same prediction (cached)
      expect(prediction1?.timestamp).toEqual(prediction2?.timestamp);
    });

    it('should emit prediction events', (done) => {
      autoScaler.on('autoscaler:prediction', (prediction) => {
        expect(prediction).toHaveProperty('predictedLoad');
        expect(prediction).toHaveProperty('confidence');
        done();
      });
      
      // Trigger prediction interval
      vi.advanceTimersByTime(61000);
    });

    it('should scale based on predictions', async () => {
      const scaleHandler = vi.fn();
      autoScaler.on('autoscaler:scaled', scaleHandler);
      
      // Mock high predicted load
      vi.spyOn(autoScaler, 'predictLoad').mockReturnValue({
        timestamp: new Date(),
        predictedLoad: 150,
        confidence: 0.9,
        horizon: 30
      });
      
      // Trigger evaluation
      await vi.advanceTimersByTimeAsync(11000);
      
      expect(scaleHandler).toHaveBeenCalled();
    });
  });

  describe('Scheduled Scaling', () => {
    beforeEach(async () => {
      autoScaler = new IntelligentAutoScaler({
        minInstances: 2,
        maxInstances: 10,
        scalingPolicy: {
          type: 'scheduled',
          rules: [],
          schedule: [
            {
              cronExpression: '9 * * * *', // 9 AM
              targetInstances: 8,
              duration: 3600000
            },
            {
              cronExpression: '17 * * * *', // 5 PM
              targetInstances: 4,
              duration: 3600000
            }
          ]
        }
      });
      await autoScaler.start();
      await vi.advanceTimersByTimeAsync(150);
    });

    it('should scale based on schedule', async () => {
      const scaleHandler = vi.fn();
      autoScaler.on('autoscaler:scaled', scaleHandler);
      
      // Mock current time to 9 AM
      const mockDate = new Date();
      mockDate.setHours(9, 0, 0, 0);
      vi.setSystemTime(mockDate);
      
      // Trigger evaluation
      await vi.advanceTimersByTimeAsync(11000);
      
      expect(scaleHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'Scheduled scaling'
        })
      );
    });
  });

  describe('Hybrid Scaling', () => {
    beforeEach(async () => {
      autoScaler = new IntelligentAutoScaler({
        minInstances: 2,
        maxInstances: 10,
        predictionEnabled: true,
        scalingPolicy: {
          type: 'hybrid',
          rules: []
        }
      });
      await autoScaler.start();
      await vi.advanceTimersByTimeAsync(150);
    });

    it('should combine reactive and predictive decisions', async () => {
      const scaleHandler = vi.fn();
      autoScaler.on('autoscaler:scaled', scaleHandler);
      
      // Set high current usage
      const instances = autoScaler.getInstances();
      instances.forEach(instance => {
        instance.metrics.cpuUsage = 85;
      });
      
      // Also mock high predicted load
      vi.spyOn(autoScaler, 'predictLoad').mockReturnValue({
        timestamp: new Date(),
        predictedLoad: 120,
        confidence: 0.8,
        horizon: 30
      });
      
      // Trigger evaluation
      await vi.advanceTimersByTimeAsync(11000);
      
      expect(scaleHandler).toHaveBeenCalled();
    });
  });

  describe('Cost Optimization', () => {
    beforeEach(async () => {
      autoScaler = new IntelligentAutoScaler({
        minInstances: 2,
        maxInstances: 10,
        costOptimization: true
      });
      await autoScaler.start();
      await vi.advanceTimersByTimeAsync(150);
    });

    it('should track instance costs', () => {
      const instances = autoScaler.getInstances();
      
      instances.forEach(instance => {
        expect(instance.cost).toBeGreaterThan(0);
      });
    });

    it('should calculate total cost per hour', () => {
      const metrics = autoScaler.getMetrics();
      
      expect(metrics.costPerHour).toBeGreaterThan(0);
      expect(metrics.costPerHour).toBe(
        autoScaler.getInstances().reduce((sum, i) => sum + i.cost, 0)
      );
    });

    it('should consider cost in scaling decisions', async () => {
      const decision = autoScaler['makeScalingDecision']();
      
      expect(decision).toHaveProperty('estimatedCost');
    });
  });

  describe('Health Monitoring', () => {
    beforeEach(async () => {
      autoScaler = new IntelligentAutoScaler({
        minInstances: 2,
        maxInstances: 10,
        healthCheckInterval: 1000
      });
      await autoScaler.start();
      await vi.advanceTimersByTimeAsync(150);
    });

    it('should perform health checks', async () => {
      const instances = autoScaler.getInstances();
      const initialHealthCheck = instances[0].lastHealthCheck;
      
      // Advance time to trigger health check
      await vi.advanceTimersByTimeAsync(31000);
      
      const updatedInstances = autoScaler.getInstances();
      expect(updatedInstances[0].lastHealthCheck.getTime())
        .toBeGreaterThan(initialHealthCheck.getTime());
    });

    it('should replace unhealthy instances', async () => {
      const unhealthyHandler = vi.fn();
      autoScaler.on('instance:unhealthy', unhealthyHandler);
      
      // Force unhealthy instance (mock random to always fail)
      vi.spyOn(Math, 'random').mockReturnValue(0.01);
      
      // Trigger health check
      await vi.advanceTimersByTimeAsync(31000);
      
      expect(unhealthyHandler).toHaveBeenCalled();
      
      vi.spyOn(Math, 'random').mockRestore();
    });
  });

  describe('Metrics Collection', () => {
    beforeEach(async () => {
      autoScaler = new IntelligentAutoScaler({
        minInstances: 3,
        maxInstances: 10,
        metricsWindow: 30000
      });
      await autoScaler.start();
      await vi.advanceTimersByTimeAsync(150);
    });

    it('should collect metrics periodically', async () => {
      const metricsHandler = vi.fn();
      autoScaler.on('metrics:collected', metricsHandler);
      
      // Trigger metrics collection
      await vi.advanceTimersByTimeAsync(11000);
      
      expect(metricsHandler).toHaveBeenCalled();
      expect(metricsHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          currentInstances: 3,
          avgCpuUsage: expect.any(Number),
          avgMemoryUsage: expect.any(Number),
          avgResponseTime: expect.any(Number),
          throughput: expect.any(Number)
        })
      );
    });

    it('should maintain metrics history', async () => {
      // Collect metrics multiple times
      for (let i = 0; i < 5; i++) {
        await vi.advanceTimersByTimeAsync(11000);
      }
      
      // History should be maintained (internal)
      const metrics = autoScaler.getMetrics();
      expect(metrics).toBeDefined();
    });

    it('should calculate efficiency', () => {
      const metrics = autoScaler.getMetrics();
      
      expect(metrics).toHaveProperty('efficiency');
      expect(metrics.efficiency).toBeGreaterThanOrEqual(0);
      expect(metrics.efficiency).toBeLessThanOrEqual(1);
    });
  });

  describe('Scaling Rules', () => {
    beforeEach(async () => {
      const rules: ScalingRule[] = [
        {
          id: 'high-queue',
          metric: 'queue',
          operator: 'gt',
          threshold: 50,
          action: 'scale-up',
          amount: 3,
          cooldown: 300
        },
        {
          id: 'low-cpu',
          metric: 'cpu',
          operator: 'lt',
          threshold: 20,
          action: 'scale-down',
          amount: '10%',
          cooldown: 600
        }
      ];
      
      autoScaler = new IntelligentAutoScaler({
        minInstances: 2,
        maxInstances: 10,
        scalingPolicy: {
          type: 'reactive',
          rules
        }
      });
      await autoScaler.start();
      await vi.advanceTimersByTimeAsync(150);
    });

    it('should apply custom scaling rules', async () => {
      const scaleHandler = vi.fn();
      autoScaler.on('autoscaler:scaled', scaleHandler);
      
      // Simulate high queue length
      autoScaler['metrics'].queueLength = 60;
      
      // Trigger evaluation
      await vi.advanceTimersByTimeAsync(11000);
      
      // Should scale based on rule
      expect(scaleHandler).toHaveBeenCalled();
    });

    it('should handle percentage-based scaling', async () => {
      // Scale up first
      await autoScaler.scaleTo(10);
      await vi.advanceTimersByTimeAsync(150);
      
      // Wait for cooldown
      await vi.advanceTimersByTimeAsync(6000);
      
      // Simulate low CPU
      const instances = autoScaler.getInstances();
      instances.forEach(instance => {
        instance.metrics.cpuUsage = 15;
      });
      
      const initialCount = instances.length;
      
      // Trigger evaluation
      await vi.advanceTimersByTimeAsync(11000);
      
      // Should scale down by 10%
      const newInstances = autoScaler.getInstances();
      expect(newInstances.length).toBeLessThan(initialCount);
    });
  });

  describe('Event Emissions', () => {
    beforeEach(async () => {
      autoScaler = new IntelligentAutoScaler({
        minInstances: 2,
        maxInstances: 10
      });
    });

    it('should emit lifecycle events', async () => {
      const startedHandler = vi.fn();
      const stoppedHandler = vi.fn();
      
      autoScaler.on('autoscaler:started', startedHandler);
      autoScaler.on('autoscaler:stopped', stoppedHandler);
      
      await autoScaler.start();
      expect(startedHandler).toHaveBeenCalled();
      
      await autoScaler.stop();
      expect(stoppedHandler).toHaveBeenCalled();
    });

    it('should emit scaling events', async () => {
      const scaledUpHandler = vi.fn();
      const scaledDownHandler = vi.fn();
      
      autoScaler.on('autoscaler:scaled-up', scaledUpHandler);
      autoScaler.on('autoscaler:scaled-down', scaledDownHandler);
      
      await autoScaler.start();
      await vi.advanceTimersByTimeAsync(150);
      
      // Scale up
      await autoScaler.scaleTo(5);
      await vi.advanceTimersByTimeAsync(150);
      expect(scaledUpHandler).toHaveBeenCalled();
      
      // Scale down
      await autoScaler.scaleTo(3);
      await vi.advanceTimersByTimeAsync(31000);
      expect(scaledDownHandler).toHaveBeenCalled();
    });

    it('should emit health issue events', (done) => {
      autoScaler.on('health:issues', (issues) => {
        expect(Array.isArray(issues)).toBe(true);
        expect(issues.length).toBeGreaterThan(0);
        done();
      });
      
      autoScaler.start().then(() => {
        // Simulate high CPU
        const instances = autoScaler.getInstances();
        instances.forEach(instance => {
          instance.metrics.cpuUsage = 85;
        });
        
        // Trigger health check
        vi.advanceTimersByTime(11000);
      });
    });
  });

  describe('Performance', () => {
    it('should handle rapid scaling requests', async () => {
      autoScaler = new IntelligentAutoScaler({
        minInstances: 1,
        maxInstances: 100,
        warmupTime: 10
      });
      
      await autoScaler.start();
      
      const scalingRequests = [10, 20, 30, 25, 15, 40, 35];
      
      for (const target of scalingRequests) {
        await autoScaler.scaleTo(target);
        await vi.advanceTimersByTimeAsync(50);
      }
      
      const instances = autoScaler.getInstances();
      expect(instances.length).toBe(35); // Last requested value
    });

    it('should maintain performance with many instances', async () => {
      autoScaler = new IntelligentAutoScaler({
        minInstances: 1,
        maxInstances: 100,
        warmupTime: 10
      });
      
      await autoScaler.start();
      await autoScaler.scaleTo(100);
      await vi.advanceTimersByTimeAsync(150);
      
      const startTime = Date.now();
      const metrics = autoScaler.getMetrics();
      const duration = Date.now() - startTime;
      
      expect(metrics).toBeDefined();
      expect(duration).toBeLessThan(100); // Should be fast
    });
  });

  describe('Cleanup', () => {
    it('should clean up on destroy', async () => {
      autoScaler = new IntelligentAutoScaler();
      await autoScaler.start();
      
      const eventHandler = vi.fn();
      autoScaler.on('test', eventHandler);
      
      autoScaler.destroy();
      
      // Should remove all listeners
      expect(autoScaler.listenerCount('test')).toBe(0);
    });

    it('should handle multiple destroy calls', () => {
      autoScaler = new IntelligentAutoScaler();
      
      autoScaler.destroy();
      expect(() => autoScaler.destroy()).not.toThrow();
    });
  });
});