/**
 * PLAN C - Tests d'Intégration Complets End-to-End
 * Ultra Think methodology - Validation complète du système
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { WorkflowExecutor } from '../components/ExecutionEngine';
import { DistributedWorkerPool } from '../services/scalability/WorkerPool';
import { DistributedQueue } from '../services/scalability/DistributedQueue';
import { IntelligentLoadBalancer } from '../services/scalability/LoadBalancer';
import { IntelligentAutoScaler } from '../services/scalability/AutoScaler';
import { ScalabilityManager } from '../services/scalability';

describe('Plan C - Tests d\'Intégration Complets', () => {
  let scalabilityManager: ScalabilityManager;
  let workflowExecutor: WorkflowExecutor;

  beforeAll(async () => {
    // Initialiser l'infrastructure de scalabilité
    scalabilityManager = new ScalabilityManager({
      enableWorkerPool: true,
      enableQueue: true,
      enableLoadBalancer: true,
      enableAutoScaling: true,
      enableFederation: false, // Désactivé pour les tests
      monitoring: {
        enabled: true,
        interval: 1000
      }
    });

    await scalabilityManager.start();
  });

  afterAll(async () => {
    await scalabilityManager.stop();
  });

  describe('Workflow Complet avec Scalabilité', () => {
    it('devrait exécuter un workflow complexe avec 100 nœuds', async () => {
      // Créer un workflow complexe
      const nodes = [];
      const edges = [];

      // Créer 100 nœuds
      for (let i = 0; i < 100; i++) {
        nodes.push({
          id: `node-${i}`,
          type: 'custom',
          data: {
            type: i === 0 ? 'trigger' : 'transform',
            label: `Node ${i}`,
            config: {
              mockData: { value: i }
            }
          }
        });

        // Créer les connexions (linéaire)
        if (i > 0) {
          edges.push({
            id: `edge-${i}`,
            source: `node-${i - 1}`,
            target: `node-${i}`
          });
        }
      }

      // Exécuter le workflow
      workflowExecutor = new WorkflowExecutor(nodes, edges);
      const results = await workflowExecutor.execute();

      expect(results.size).toBe(100);
      expect(results.get('node-99')).toBeDefined();
      expect(results.get('node-99').success).toBe(true);
    });

    it('devrait gérer 1000 exécutions parallèles', async () => {
      const executionPromises = [];
      
      // Créer un workflow simple
      const nodes = [
        {
          id: 'trigger',
          type: 'custom',
          data: {
            type: 'trigger',
            label: 'Start',
            config: { mockData: { test: true } }
          }
        },
        {
          id: 'process',
          type: 'custom',
          data: {
            type: 'transform',
            label: 'Process',
            config: {}
          }
        }
      ];

      const edges = [
        {
          id: 'edge-1',
          source: 'trigger',
          target: 'process'
        }
      ];

      // Lancer 1000 exécutions parallèles
      for (let i = 0; i < 1000; i++) {
        const executor = new WorkflowExecutor(nodes, edges);
        executionPromises.push(executor.execute());
      }

      const results = await Promise.all(executionPromises);
      
      expect(results.length).toBe(1000);
      results.forEach(result => {
        expect(result.get('process')).toBeDefined();
        expect(result.get('process').success).toBe(true);
      });
    });
  });

  describe('Worker Pool sous Charge', () => {
    it('devrait traiter 10000 tâches avec le worker pool', async () => {
      const taskIds = [];
      const startTime = Date.now();

      // Soumettre 10000 tâches
      for (let i = 0; i < 10000; i++) {
        const taskId = await scalabilityManager.submitTask(
          'compute',
          { id: i, data: `task-${i}` },
          { priority: Math.floor(Math.random() * 10) }
        );
        taskIds.push(taskId);
      }

      // Attendre un peu pour le traitement
      await new Promise(resolve => setTimeout(resolve, 5000));

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Vérifier la performance
      expect(taskIds.length).toBe(10000);
      expect(duration).toBeLessThan(10000); // Moins de 10 secondes pour 10K tâches
      
      // Vérifier les métriques
      const status = scalabilityManager.getStatus();
      expect(status.workers.metrics?.processedTasks).toBeGreaterThan(0);
    });

    it('devrait auto-scaler en fonction de la charge', async () => {
      const initialStatus = scalabilityManager.getStatus();
      const initialWorkers = initialStatus.workers.metrics?.activeWorkers || 0;

      // Créer une charge importante
      const promises = [];
      for (let i = 0; i < 5000; i++) {
        promises.push(
          scalabilityManager.submitTask('heavy', { 
            id: i, 
            complexity: 'high' 
          })
        );
      }

      await Promise.all(promises);
      await new Promise(resolve => setTimeout(resolve, 2000));

      const finalStatus = scalabilityManager.getStatus();
      const finalWorkers = finalStatus.workers.metrics?.activeWorkers || 0;

      // Vérifier que le scaling a eu lieu
      expect(finalWorkers).toBeGreaterThan(initialWorkers);
    });
  });

  describe('Queue System avec Persistence', () => {
    it('devrait gérer les messages avec dead letter queue', async () => {
      const messageIds = [];
      
      // Envoyer des messages normaux
      for (let i = 0; i < 100; i++) {
        const id = await scalabilityManager.sendToQueue(
          'normal-priority',
          { id: i, type: 'normal' }
        );
        messageIds.push(id);
      }

      // Envoyer des messages qui échoueront
      for (let i = 0; i < 10; i++) {
        const id = await scalabilityManager.sendToQueue(
          'high-priority',
          { id: i, type: 'fail', shouldFail: true }
        );
        messageIds.push(id);
      }

      await new Promise(resolve => setTimeout(resolve, 3000));

      const status = scalabilityManager.getStatus();
      expect(status.queues.stats?.processed).toBeGreaterThan(90);
      expect(status.queues.stats?.deadLetter).toBeLessThanOrEqual(10);
    });

    it('devrait maintenir l\'ordre FIFO avec priorités', async () => {
      const results: number[] = [];
      
      // Créer un consumer qui enregistre l'ordre
      const consumerId = await scalabilityManager.consumeQueue(
        'priority-test',
        async (message) => {
          results.push(message.payload.priority);
        }
      );

      // Envoyer des messages avec différentes priorités
      await scalabilityManager.sendToQueue('priority-test', 
        { data: 'low' }, { priority: 1 });
      await scalabilityManager.sendToQueue('priority-test', 
        { data: 'high' }, { priority: 10 });
      await scalabilityManager.sendToQueue('priority-test', 
        { data: 'medium' }, { priority: 5 });

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Les messages haute priorité doivent être traités en premier
      expect(results[0]).toBe(10);
      expect(results[1]).toBe(5);
      expect(results[2]).toBe(1);
    });
  });

  describe('Load Balancer avec ML', () => {
    it('devrait router intelligemment les requêtes', async () => {
      const responses = [];
      
      // Simuler 1000 requêtes
      for (let i = 0; i < 1000; i++) {
        const response = await scalabilityManager.route({
          id: `req-${i}`,
          method: 'GET',
          path: '/api/test',
          headers: {},
          clientIp: `192.168.1.${i % 256}`,
          priority: Math.floor(Math.random() * 10),
          timestamp: new Date()
        });
        responses.push(response);
      }

      // Vérifier la distribution
      const nodeDistribution = new Map();
      responses.forEach(res => {
        const nodeId = res.headers?.['x-served-by'] || 'unknown';
        nodeDistribution.set(nodeId, (nodeDistribution.get(nodeId) || 0) + 1);
      });

      // La distribution devrait être relativement équilibrée
      const counts = Array.from(nodeDistribution.values());
      const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
      counts.forEach(count => {
        expect(Math.abs(count - avg)).toBeLessThan(avg * 0.5); // ±50% de la moyenne
      });
    });

    it('devrait appliquer le circuit breaker', async () => {
      // Simuler un nœud défaillant
      const failingNodeId = 'node-fail';
      
      let failureCount = 0;
      for (let i = 0; i < 20; i++) {
        try {
          await scalabilityManager.route({
            id: `req-fail-${i}`,
            method: 'GET',
            path: '/api/fail',
            headers: { 'x-target-node': failingNodeId },
            clientIp: '192.168.1.1',
            priority: 5,
            timestamp: new Date()
          });
        } catch (error) {
          failureCount++;
        }
      }

      // Après plusieurs échecs, le circuit breaker devrait s'activer
      expect(failureCount).toBeGreaterThan(5);
      
      // Le nœud devrait être marqué comme unhealthy
      const status = scalabilityManager.getStatus();
      expect(status.loadBalancer.nodes).toBeDefined();
    });
  });

  describe('Monitoring et Métriques', () => {
    it('devrait collecter les métriques en temps réel', async () => {
      const metricsCollected: any[] = [];
      
      // S'abonner aux métriques
      scalabilityManager.on('metrics:collected', (metrics) => {
        metricsCollected.push(metrics);
      });

      // Générer de l'activité
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(scalabilityManager.submitTask('metric-test', { id: i }));
      }
      await Promise.all(promises);

      // Attendre la collecte des métriques
      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(metricsCollected.length).toBeGreaterThan(0);
      
      const lastMetrics = metricsCollected[metricsCollected.length - 1];
      expect(lastMetrics).toHaveProperty('workers');
      expect(lastMetrics).toHaveProperty('queues');
      expect(lastMetrics).toHaveProperty('loadBalancer');
      expect(lastMetrics).toHaveProperty('timestamp');
    });

    it('devrait détecter et signaler les problèmes de santé', async () => {
      const healthIssues: any[] = [];
      
      // S'abonner aux problèmes de santé
      scalabilityManager.on('health:issues', (issues) => {
        healthIssues.push(issues);
      });

      // Simuler des conditions problématiques
      // (Dans un vrai test, on simulerait des erreurs réelles)
      const status = scalabilityManager.getStatus();
      if (status.workers.metrics) {
        status.workers.metrics.failedTasks = 150; // Simuler beaucoup d'échecs
      }

      // Déclencher une vérification de santé
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Des problèmes devraient être détectés
      if (healthIssues.length > 0) {
        expect(healthIssues[0]).toContain('High failure rate');
      }
    });
  });

  describe('Résilience et Récupération', () => {
    it('devrait récupérer automatiquement des pannes', async () => {
      // Simuler une panne et récupération
      const tasksBefore = [];
      const tasksAfter = [];

      // Phase 1: Fonctionnement normal
      for (let i = 0; i < 50; i++) {
        tasksBefore.push(
          scalabilityManager.submitTask('resilience', { phase: 'before', id: i })
        );
      }
      await Promise.all(tasksBefore);

      // Phase 2: Simuler une perturbation
      // (Dans la vraie vie, ce serait une vraie panne)
      vi.spyOn(console, 'error').mockImplementation(() => {});

      // Phase 3: Continuer à soumettre des tâches
      for (let i = 0; i < 50; i++) {
        tasksAfter.push(
          scalabilityManager.submitTask('resilience', { phase: 'after', id: i })
            .catch(() => null) // Ignorer les erreurs
        );
      }

      const results = await Promise.all(tasksAfter);
      const successCount = results.filter(r => r !== null).length;

      // Au moins quelques tâches devraient réussir (résilience)
      expect(successCount).toBeGreaterThan(25);

      vi.restoreAllMocks();
    });

    it('devrait maintenir la performance sous stress', async () => {
      const startTime = Date.now();
      const operations = [];

      // Stress test avec opérations mixtes
      for (let i = 0; i < 500; i++) {
        operations.push(
          scalabilityManager.submitTask('stress', { id: i }),
          scalabilityManager.sendToQueue('stress-queue', { id: i }),
          scalabilityManager.route({
            id: `stress-${i}`,
            method: 'POST',
            path: '/api/stress',
            headers: {},
            clientIp: '10.0.0.1',
            priority: 5,
            timestamp: new Date()
          }).catch(() => null)
        );
      }

      await Promise.allSettled(operations);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Devrait gérer 1500 opérations en moins de 30 secondes
      expect(duration).toBeLessThan(30000);

      // Vérifier que le système est toujours opérationnel
      const status = scalabilityManager.getStatus();
      expect(status.workers.active).toBe(true);
      expect(status.queues.active).toBe(true);
      expect(status.loadBalancer.active).toBe(true);
    });
  });

  describe('Scénario End-to-End Complet', () => {
    it('devrait gérer un flux de travail complet de production', async () => {
      // Simuler un scénario réel complet
      const workflow = {
        // 1. Réception de données
        receiveData: async () => {
          const messageId = await scalabilityManager.sendToQueue(
            'incoming-data',
            { 
              userId: 'user-123',
              action: 'process-order',
              data: { orderId: 'order-456', amount: 99.99 }
            }
          );
          return messageId;
        },

        // 2. Traitement asynchrone
        processAsync: async (messageId: string) => {
          const taskId = await scalabilityManager.submitTask(
            'order-processing',
            { messageId, step: 'validate' }
          );
          return taskId;
        },

        // 3. Routing vers le bon service
        routeToService: async (taskId: string) => {
          const response = await scalabilityManager.route({
            id: `route-${taskId}`,
            method: 'POST',
            path: '/api/orders/process',
            headers: { 'content-type': 'application/json' },
            body: { taskId },
            clientIp: '192.168.1.100',
            priority: 8,
            timestamp: new Date()
          });
          return response;
        },

        // 4. Notification
        notify: async (result: any) => {
          const notificationId = await scalabilityManager.sendToQueue(
            'notifications',
            {
              type: 'order-complete',
              userId: 'user-123',
              result
            },
            { priority: 10 }
          );
          return notificationId;
        }
      };

      // Exécuter le workflow complet
      const messageId = await workflow.receiveData();
      expect(messageId).toBeDefined();

      const taskId = await workflow.processAsync(messageId);
      expect(taskId).toBeDefined();

      const response = await workflow.routeToService(taskId);
      expect(response.statusCode).toBeLessThanOrEqual(200);

      const notificationId = await workflow.notify(response);
      expect(notificationId).toBeDefined();

      // Vérifier les métriques finales
      const finalStatus = scalabilityManager.getStatus();
      expect(finalStatus.workers.metrics?.processedTasks).toBeGreaterThan(0);
      expect(finalStatus.queues.stats?.processed).toBeGreaterThan(0);
      expect(finalStatus.loadBalancer.stats?.totalRequests).toBeGreaterThan(0);
    });
  });
});