// Tests pour le rendu virtuel de workflow
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VirtualWorkflowRenderer } from '../../services/VirtualWorkflowRenderer';
import { WorkflowNode, WorkflowEdge } from '../../types/workflow';

describe('VirtualWorkflowRenderer', () => {
  let renderer: VirtualWorkflowRenderer;
  let mockNodes: WorkflowNode[];
  let mockEdges: WorkflowEdge[];

  beforeEach(() => {
    renderer = new VirtualWorkflowRenderer({
      maxVisibleNodes: 10,
      enableCulling: true,
      enableLOD: true
    });

    // Créer des nœuds de test disposés en grille
    mockNodes = Array(25).fill(null).map((_, i) => ({
      id: `node${i}`,
      type: 'custom',
      position: { 
        x: (i % 5) * 300, 
        y: Math.floor(i / 5) * 200 
      },
      data: { 
        type: i === 0 ? 'trigger' : 'transform', 
        label: `Node ${i}`, 
        config: {} 
      }
    }));

    mockEdges = Array(20).fill(null).map((_, i) => ({
      id: `edge${i}`,
      source: `node${i}`,
      target: `node${i + 1}`,
      type: 'smoothstep'
    }));
  });

  describe('initialize', () => {
    it('devrait initialiser avec des nœuds et arêtes', () => {
      renderer.initialize(mockNodes, mockEdges);

      const metrics = renderer.getPerformanceMetrics();
      expect(metrics.totalNodes).toBe(25);
      expect(metrics.totalEdges).toBe(20);
    });
  });

  describe('updateViewport', () => {
    it('devrait mettre à jour la visibilité selon le viewport', () => {
      renderer.initialize(mockNodes, mockEdges);

      // Viewport qui ne montre que les premiers nœuds
      renderer.updateViewport({
        x: 0,
        y: 0,
        width: 800,
        height: 600,
        zoom: 1
      });

      const visibleNodes = renderer.getVisibleNodes();
      expect(visibleNodes.length).toBeLessThanOrEqual(10); // Max visible nodes

      // Vérifier que les nœuds visibles sont dans le viewport
      visibleNodes.forEach(node => {
        expect(node.position.x).toBeLessThanOrEqual(800);
        expect(node.position.y).toBeLessThanOrEqual(600);
      });
    });

    it('devrait respecter la limite de nœuds visibles', () => {
      renderer.initialize(mockNodes, mockEdges);

      renderer.updateViewport({
        x: 0,
        y: 0,
        width: 2000,
        height: 2000,
        zoom: 1
      });

      const visibleNodes = renderer.getVisibleNodes();
      expect(visibleNodes.length).toBeLessThanOrEqual(10);
    });
  });

  describe('getNodeLOD', () => {
    it('devrait retourner le bon niveau de détail selon la distance', () => {
      renderer.initialize(mockNodes, mockEdges);

      renderer.updateViewport({
        x: 500,
        y: 500,
        width: 1000,
        height: 1000,
        zoom: 1
      });

      const visibleNodes = renderer.getVisibleNodes();
      visibleNodes.forEach(node => {
        const lod = renderer.getNodeLOD(node.id);
        expect(['high', 'medium', 'low']).toContain(lod);

        // Les nœuds proches du centre devraient avoir un LOD plus élevé
        const distanceFromCenter = Math.sqrt(
          Math.pow(node.position.x - 1000, 2) +
          Math.pow(node.position.y - 1000, 2)
        );

        if (distanceFromCenter < 200) {
          expect(lod).toBe('high');
        }
      });
    });
  });

  describe('updateNode', () => {
    it('devrait mettre à jour un nœud et l\'ajouter à la queue de rendu', () => {
      renderer.initialize(mockNodes, mockEdges);

      const updateSpy = vi.fn();
      window.addEventListener('node-render-update', updateSpy);

      renderer.updateNode('node5', {
        position: { x: 1000, y: 1000 }
      });

      // Attendre le prochain frame
      setTimeout(() => {
        expect(updateSpy).toHaveBeenCalled();
      }, 20);
    });
  });

  describe('getPerformanceMetrics', () => {
    it('devrait retourner les métriques de performance', () => {
      renderer.initialize(mockNodes, mockEdges);

      renderer.updateViewport({
        x: 0,
        y: 0,
        width: 800,
        height: 600,
        zoom: 1
      });

      const metrics = renderer.getPerformanceMetrics();
      expect(metrics).toHaveProperty('visibleNodes');
      expect(metrics).toHaveProperty('totalNodes');
      expect(metrics).toHaveProperty('visibleEdges');
      expect(metrics).toHaveProperty('totalEdges');
      expect(metrics).toHaveProperty('renderTime');
      expect(metrics).toHaveProperty('fps');
      expect(metrics).toHaveProperty('memoryUsage');

      expect(metrics.visibleNodes).toBeLessThanOrEqual(metrics.totalNodes);
    });
  });

  describe('optimizeForMobile', () => {
    it('devrait réduire les limites pour mobile', () => {
      renderer.initialize(mockNodes, mockEdges);

      renderer.optimizeForMobile();

      renderer.updateViewport({
        x: 0,
        y: 0,
        width: 2000,
        height: 2000,
        zoom: 1
      });

      const visibleNodes = renderer.getVisibleNodes();
      expect(visibleNodes.length).toBeLessThanOrEqual(50); // Limite mobile
    });
  });

  describe('preloadAroundViewport', () => {
    it('devrait émettre des événements de préchargement', () => {
      renderer.initialize(mockNodes, mockEdges);

      const preloadSpy = vi.fn();
      window.addEventListener('node-preload', preloadSpy);

      renderer.updateViewport({
        x: 0,
        y: 0,
        width: 400,
        height: 400,
        zoom: 1
      });

      renderer.preloadAroundViewport(1.5);

      // Devrait précharger des nœuds en dehors du viewport
      expect(preloadSpy).toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('devrait nettoyer toutes les ressources', () => {
      renderer.initialize(mockNodes, mockEdges);

      renderer.destroy();

      const metrics = renderer.getPerformanceMetrics();
      expect(metrics.totalNodes).toBe(0);
      expect(metrics.totalEdges).toBe(0);
    });
  });
});