// Tests pour le service AI de workflow
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { aiWorkflowService } from '../../services/AIWorkflowService';
import { WorkflowNode, WorkflowEdge } from '../../types/workflow';

describe('AIWorkflowService', () => {
  beforeEach(() => {
    // Réinitialiser le service avant chaque test
    vi.clearAllMocks();
  });

  describe('predictNextNodes', () => {
    it('devrait suggérer des nœuds de départ pour un workflow vide', () => {
      const suggestions = aiWorkflowService.predictNextNodes([], []);
      expect(suggestions).toHaveLength(3);
      expect(suggestions[0].nodeType).toBe('trigger');
      expect(suggestions[0].confidence).toBeGreaterThan(0.8);
      expect(suggestions[0].reason).toContain('déclencheur');
    });

    it('devrait suggérer des transformations après httpRequest', () => {
      const nodes: WorkflowNode[] = [{
        id: 'node1',
        type: 'custom',
        position: { x: 100, y: 100 },
        data: { type: 'httpRequest', label: 'HTTP Request', config: {} }
      }];

      const suggestions = aiWorkflowService.predictNextNodes(nodes, []);
      const transformSuggestion = suggestions.find(s => s.nodeType === 'transform');
      expect(transformSuggestion).toBeDefined();
      expect(transformSuggestion!.confidence).toBeGreaterThan(0.5);
    });

    it('devrait limiter les suggestions à 5 maximum', () => {
      const nodes: WorkflowNode[] = Array(10).fill(null).map((_, i) => ({
        id: `node${i}`,
        type: 'custom',
        position: { x: 100 * i, y: 100 },
        data: { type: 'httpRequest', label: 'HTTP Request', config: {} }
      }));
      const suggestions = aiWorkflowService.predictNextNodes(nodes, []);
      expect(suggestions.length).toBeLessThanOrEqual(5);
    });
  });

  describe('optimizeWorkflow', () => {
    it('devrait détecter les nœuds parallélisables', () => {
      const nodes: WorkflowNode[] = [
        {
          id: 'node1',
          type: 'custom',
          position: { x: 100, y: 100 },
          data: { type: 'trigger', label: 'Trigger', config: {} }
        },
        {
          id: 'node2',
          type: 'custom',
          position: { x: 300, y: 50 },
          data: { type: 'httpRequest', label: 'API 1', config: {} }
        },
        {
          id: 'node3',
          type: 'custom',
          position: { x: 300, y: 150 },
          data: { type: 'httpRequest', label: 'API 2', config: {} }
        }
      ];
      
      const edges: WorkflowEdge[] = [
        { id: 'e1', source: 'node1', target: 'node2', type: 'smoothstep' },
        { id: 'e2', source: 'node1', target: 'node3', type: 'smoothstep' }
      ];

      const optimizations = aiWorkflowService.optimizeWorkflow(nodes, edges);
      const parallelOptimization = optimizations.find(o => o.type === 'parallelization');
      expect(parallelOptimization).toBeDefined();
      expect(parallelOptimization!.nodeIds).toContain('node2');
      expect(parallelOptimization!.nodeIds).toContain('node3');
    });

    it('devrait identifier les nœuds cachables', () => {
      const nodes: WorkflowNode[] = [
        {
          id: 'node1',
          type: 'custom',
          position: { x: 100, y: 100 },
          data: { type: 'transform', label: 'Transform', config: {} }
        }
      ];

      const optimizations = aiWorkflowService.optimizeWorkflow(nodes, []);
      const cacheOptimization = optimizations.find(o => o.type === 'caching');
      expect(cacheOptimization).toBeDefined();
      expect(cacheOptimization!.nodeIds).toContain('node1');
    });
  });

  describe('detectPatterns', () => {
    it('devrait détecter les patterns répétés', () => {
      const historicalWorkflows = [
        {
          nodes: [
            { id: '1', data: { type: 'httpRequest' } },
            { id: '2', data: { type: 'transform' } },
            { id: '3', data: { type: 'database' } }
          ],
          edges: [
            { source: '1', target: '2' },
            { source: '2', target: '3' }
          ]
        },
        {
          nodes: [
            { id: '4', data: { type: 'httpRequest' } },
            { id: '5', data: { type: 'transform' } },
            { id: '6', data: { type: 'database' } }
          ],
          edges: [
            { source: '4', target: '5' },
            { source: '5', target: '6' }
          ]
        },
        {
          nodes: [
            { id: '7', data: { type: 'httpRequest' } },
            { id: '8', data: { type: 'transform' } },
            { id: '9', data: { type: 'database' } }
          ],
          edges: [
            { source: '7', target: '8' },
            { source: '8', target: '9' }
          ]
        }
      ];

      const patterns = aiWorkflowService.detectPatterns(historicalWorkflows);
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].name).toBe('API to Database');
      expect(patterns[0].frequency).toBe(3);
    });
  });

  describe('detectAnomalies', () => {
    it('devrait détecter les anomalies de performance', () => {
      // Entraîner le modèle avec des données normales
      const normalHistory = Array(20).fill(null).map(() => ({
        duration: 100 + Math.random() * 20,
        error: false,
        output: { success: true }
      }));

      // Exécution anormalement lente
      const slowExecution = {
        duration: 500,
        error: false,
        output: { success: true }
      };

      const anomalies = aiWorkflowService.detectAnomalies('node1', [...normalHistory, slowExecution]);
      const perfAnomaly = anomalies.find(a => a.type === 'performance');
      expect(perfAnomaly).toBeDefined();
      expect(perfAnomaly!.severity).toMatch(/high|critical/);
    });

    it('devrait détecter les taux d\'erreur anormaux', () => {
      const history = Array(20).fill(null).map((_, i) => ({
        duration: 100,
        error: i >= 15, // 25% d'erreurs dans les dernières exécutions
        output: {}
      }));

      const newError = {
        duration: 100,
        error: true,
        output: {}
      };

      const anomalies = aiWorkflowService.detectAnomalies('node1', [...history, newError]);
      const errorAnomaly = anomalies.find(a => a.type === 'error_rate');
      expect(errorAnomaly).toBeDefined();
    });
  });

  describe('trainModel', () => {
    it('devrait entraîner le modèle avec des workflows historiques', () => {
      const historicalWorkflows = [
        {
          nodes: [
            { id: '1', data: { type: 'trigger' } },
            { id: '2', data: { type: 'httpRequest' } },
            { id: '3', data: { type: 'transform' } }
          ],
          edges: [
            { source: '1', target: '2' },
            { source: '2', target: '3' }
          ],
          executionHistory: []
        }
      ];

      // Entraîner le modèle
      aiWorkflowService.trainModel(historicalWorkflows);

      // Vérifier que le modèle a appris
      const nodes: WorkflowNode[] = [{
        id: 'test1',
        type: 'custom',
        position: { x: 100, y: 100 },
        data: { type: 'httpRequest', label: 'HTTP', config: {} }
      }];

      const suggestions = aiWorkflowService.predictNextNodes(nodes, []);
      const transformPrediction = suggestions.find(s => s.nodeType === 'transform');
      expect(transformPrediction).toBeDefined();
      expect(transformPrediction!.confidence).toBeGreaterThan(0.6);
    });
  });
});