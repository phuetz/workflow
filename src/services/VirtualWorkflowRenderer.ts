// PERFORMANCE IMPROVEMENT #2: Virtual DOM pour grandes workflows
// Rendu virtuel pour améliorer les performances avec de nombreux nœuds

import { WorkflowNode, WorkflowEdge } from '../types/workflow';
import { logger } from './SimpleLogger';

export interface ViewportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
}

export interface RenderableNode extends WorkflowNode {
  isVisible: boolean;
  isInViewport: boolean;
  renderPriority: number;
  lastRenderTime?: number;
}

export interface RenderableEdge extends WorkflowEdge {
  isVisible: boolean;
  isInViewport: boolean;
  path?: string;
}

export interface RenderPerformanceMetrics {
  visibleNodes: number;
  totalNodes: number;
  visibleEdges: number;
  totalEdges: number;
  renderTime: number;
  fps: number;
  memoryUsage: number;
}

export class VirtualWorkflowRenderer {
  private nodes: Map<string, RenderableNode> = new Map();
  private edges: Map<string, RenderableEdge> = new Map();
  private viewport: ViewportBounds = { x: 0, y: 0, width: 1920, height: 1080, zoom: 1 };
  private renderQueue: Set<string> = new Set();
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private performanceMetrics: RenderPerformanceMetrics = {
    visibleNodes: 0,
    totalNodes: 0,
    visibleEdges: 0,
    totalEdges: 0,
    renderTime: 0,
    fps: 60,
    memoryUsage: 0
  };

  // Configuration du rendu
  private config = {
    maxVisibleNodes: 100,      // Nombre max de nœuds à rendre
    nodePadding: 50,           // Padding autour du viewport
    cullDistance: 100,         // Distance de culling
    lodDistance: 200,          // Distance pour niveau de détail
    updateThrottle: 16,        // Throttle des mises à jour (60 FPS)
    enableLOD: true,           // Activer le niveau de détail
    enableCulling: true,       // Activer le culling
    enableBatching: true       // Activer le batching
  };

  constructor(config?: Partial<typeof VirtualWorkflowRenderer.prototype.config>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  // Initialiser avec des nœuds et arêtes
  initialize(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
    try {
      if (!nodes || !edges) {
        logger.error('Invalid input to initialize');
        return;
      }
      
      this.nodes.clear();
      this.edges.clear();
      
      // Convertir en nœuds renderables
      nodes.forEach(node => {
        try {
          const renderableNode: RenderableNode = {
            ...node,
            isVisible: true,
            isInViewport: false,
            renderPriority: this.calculateNodePriority(node)
          };
          this.nodes.set(node.id, renderableNode);
        } catch (error) {
          logger.error('Error processing node ${node.id}:', error);
        }
      });
      
      // Convertir en arêtes renderables
      edges.forEach(edge => {
        try {
          const renderableEdge: RenderableEdge = {
            ...edge,
            isVisible: true,
            isInViewport: false
          };
          this.edges.set(edge.id, renderableEdge);
        } catch (error) {
          logger.error('Error processing edge ${edge.source}-${edge.target}:', error);
        }
      });
      
      // Mettre à jour les métriques
      this.performanceMetrics.totalNodes = nodes.length;
      this.performanceMetrics.totalEdges = edges.length;
      
      // Effectuer un premier rendu
      this.updateVisibility();
    } catch (error) {
      logger.error('Error in initialize:', error);
    }
  }

  // Mettre à jour le viewport
  updateViewport(bounds: ViewportBounds) {
    const hasChanged =
      this.viewport.x !== bounds.x ||
      this.viewport.y !== bounds.y ||
      this.viewport.width !== bounds.width ||
      this.viewport.height !== bounds.height ||
      this.viewport.zoom !== bounds.zoom;

    if (hasChanged) {
      this.viewport = { ...bounds };
      this.updateVisibility();
    }
  }

  // Calculer la priorité de rendu d'un nœud
  private calculateNodePriority(node: WorkflowNode): number {
    let priority = 0;
    const criticalTypes = ['trigger', 'webhook', 'start', 'end'];
    const connectionCount = this.getNodeConnectionCount(node.id);

    // Les nœuds critiques ont une priorité plus élevée
    if (criticalTypes.includes(node.data.type)) {
      priority += 10;
    }

    // Les nœuds avec plus de connexions sont prioritaires
    priority += Math.min(connectionCount * 2, 20);

    // Les nœuds récemment modifiés sont prioritaires
    const nodeData = node.data as any;
    if (nodeData.lastModified) {
      const age = Date.now() - new Date(nodeData.lastModified).getTime();
      if (age < 60000) { // Moins d'une minute
        priority += 5;
      }
    }

    return priority;
  }

  // Obtenir le nombre de connexions d'un nœud
  private getNodeConnectionCount(nodeId: string): number {
    let count = 0;
    this.edges.forEach(edge => {
      if (edge.source === nodeId || edge.target === nodeId) {
        count++;
      }
    });
    return count;
  }

  // Mettre à jour la visibilité des éléments
  private updateVisibility() {
    const startTime = performance.now();

    // Calculer les limites du viewport avec padding
    const viewportBounds = {
      minX: this.viewport.x - this.config.nodePadding,
      maxX: this.viewport.x + this.viewport.width + this.config.nodePadding,
      minY: this.viewport.y - this.config.nodePadding,
      maxY: this.viewport.y + this.viewport.height + this.config.nodePadding
    };

    const visibleNodes = new Set<string>();
    let visibleNodeCount = 0;
    let visibleEdgeCount = 0;

    // Helper function to check if node is in viewport
    const isNodeInViewport = (node: RenderableNode): boolean => {
      return (
        node.position.x >= viewportBounds.minX &&
        node.position.x <= viewportBounds.maxX &&
        node.position.y >= viewportBounds.minY &&
        node.position.y <= viewportBounds.maxY
      );
    };
    
    
    // Vérifier la visibilité des nœuds
    this.nodes.forEach((node, nodeId) => {
      const isInViewport = isNodeInViewport(node);
      node.isInViewport = isInViewport;

      if (isInViewport) {
        visibleNodes.add(nodeId);
        visibleNodeCount++;
      }
    });

    // Vérifier la visibilité des arêtes
    this.edges.forEach(edge => {
      const sourceVisible = this.nodes.get(edge.source)?.isInViewport || false;
      const targetVisible = this.nodes.get(edge.target)?.isInViewport || false;

      edge.isInViewport = sourceVisible || targetVisible;
      if (edge.isInViewport) {
        visibleEdgeCount++;
      }
    });
    
    // Si trop de nœuds visibles, prioriser
    if (this.config.enableCulling && visibleNodeCount > this.config.maxVisibleNodes) {
      this.prioritizeCulling(visibleNodes);
    }
    
    // Mettre à jour les métriques
    this.performanceMetrics.visibleNodes = visibleNodeCount;
    this.performanceMetrics.visibleEdges = visibleEdgeCount;
    this.performanceMetrics.renderTime = performance.now() - startTime;
    
    // Calculer les FPS
    this.updateFPS();
  }

  // Vérifier si un nœud est dans le viewport
  private isNodeInViewport(node: RenderableNode, bounds: { minX: number; maxX: number; minY: number; maxY: number }): boolean {
    const nodeWidth = 200;
    const nodeHeight = 100;
    const nodeLeft = node.position.x;
    const nodeRight = node.position.x + nodeWidth;
    const nodeTop = node.position.y;
    const nodeBottom = node.position.y + nodeHeight;

    return !(
      nodeRight < bounds.minX ||
      nodeLeft > bounds.maxX ||
      nodeBottom < bounds.minY ||
      nodeTop > bounds.maxY
    );
  }

  // Prioriser le culling des nœuds
  private prioritizeCulling(visibleNodes: Set<string>) {
    // Trier les nœuds visibles par priorité
    const centerX = this.viewport.x + this.viewport.width / 2;
    const centerY = this.viewport.y + this.viewport.height / 2;

    const sortedNodes = Array.from(visibleNodes)
      .map(id => {
        const node = this.nodes.get(id);
        return node ? { id, node } : null;
      })
      .filter((item): item is { id: string; node: RenderableNode } => item !== null)
      .sort((a, b) => {
        // D'abord par priorité
        const nodeDataA = a.node.data as any;
        const nodeDataB = b.node.data as any;
        const priorityA = nodeDataA?.priority || 0;
        const priorityB = nodeDataB?.priority || 0;
        const priorityDiff = priorityB - priorityA;
        if (priorityDiff !== 0) return priorityDiff;

        // Ensuite par distance au centre du viewport
        const distA = Math.sqrt(
          Math.pow(a.node.position.x - centerX, 2) +
          Math.pow(a.node.position.y - centerY, 2)
        );
        const distB = Math.sqrt(
          Math.pow(b.node.position.x - centerX, 2) +
          Math.pow(b.node.position.y - centerY, 2)
        );

        return distA - distB;
      });

    // Marquer seulement les N premiers comme visibles
    sortedNodes.forEach((item, index) => {
      const node = this.nodes.get(item.id);
      if (node) {
        node.isVisible = index < this.config.maxVisibleNodes;
      }
    });
  }

  // Obtenir les nœuds à rendre
  getVisibleNodes(): RenderableNode[] {
    const nodes: RenderableNode[] = [];
    
    this.nodes.forEach(node => {
      if (node.isInViewport && node.isVisible) {
        nodes.push(node);
      }
    });
    
    // Trier par priorité pour le rendu
    return nodes.sort((a, b) => b.renderPriority - a.renderPriority);
  }

  // Obtenir les arêtes à rendre
  getVisibleEdges(): RenderableEdge[] {
    const edges: RenderableEdge[] = [];
    
    this.edges.forEach(edge => {
      if (edge.isInViewport && edge.isVisible) {
        edges.push(edge);
      }
    });
    
    return edges;
  }

  // Obtenir le niveau de détail pour un nœud
  getNodeLOD(node: RenderableNode): 'high' | 'medium' | 'low' {
    if (!this.config.enableLOD) return 'high';

    const centerX = this.viewport.x + this.viewport.width / 2;
    const centerY = this.viewport.y + this.viewport.height / 2;

    const distance = Math.sqrt(
      Math.pow(node.position.x - centerX, 2) +
      Math.pow(node.position.y - centerY, 2)
    );

    const scaledDistance = distance / this.viewport.zoom;

    if (scaledDistance < this.config.lodDistance) {
      return 'high';
    } else if (scaledDistance < this.config.lodDistance * 2) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  // Mise à jour incrémentale d'un nœud
  updateNode(nodeId: string, updates: Partial<WorkflowNode>) {
    const node = this.nodes.get(nodeId);
    if (node) {
      // SECURITY FIX: Prevent prototype pollution by filtering dangerous properties
      const safeUpdates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(updates)) {
        if (key !== '__proto__' && key !== 'constructor' && key !== 'prototype') {
          safeUpdates[key] = value;
        }
      }
      Object.assign(node, safeUpdates);
      node.renderPriority = this.calculateNodePriority(node);
      node.lastRenderTime = Date.now();
      
      // Ajouter à la queue de rendu
      this.renderQueue.add(nodeId);
      
      // Planifier un rendu
      this.scheduleRender();
    }
  }

  // Planifier un rendu
  private renderTimeout: number | null = null;
  private isSchedulingRender: boolean = false;

  private scheduleRender() {
    // Éviter les appels concurrents
    if (this.renderTimeout || this.isSchedulingRender) return;

    this.isSchedulingRender = true;
    try {
      // Bind method to avoid closure capturing 'this'
      const boundProcessRenderQueue = this.processRenderQueue.bind(this);

      this.renderTimeout = window.setTimeout(() => {
        // Check if instance is still valid (not destroyed)
        if (this.renderTimeout !== null) {
          this.renderTimeout = null;
          this.isSchedulingRender = false;
          boundProcessRenderQueue();
        }
      }, this.config.updateThrottle);
    } catch (error) {
      this.isSchedulingRender = false;
      logger.error('Error scheduling render:', error);
    }
  }

  // Traiter la queue de rendu
  private processRenderQueue() {
    if (this.renderQueue.size === 0) return;

    const startTime = performance.now();

    // Créer une copie de la queue pour éviter les modifications concurrentes
    const nodesToProcess = Array.from(this.renderQueue);

    // Vider la queue immédiatement
    this.renderQueue.clear();

    // Traiter les nœuds
    nodesToProcess.forEach(nodeId => {
      const node = this.nodes.get(nodeId);
      if (node) {
        // Émettre un événement de mise à jour
        const event = new CustomEvent('nodeUpdate', {
          detail: { nodeId, node }
        });
        window.dispatchEvent(event);
      }
    });

    // Mettre à jour les métriques
    this.performanceMetrics.renderTime = performance.now() - startTime;
  }

  // Mettre à jour les FPS
  private updateFPS() {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;

    if (deltaTime >= 1000) {
      this.performanceMetrics.fps = (this.frameCount * 1000) / deltaTime;
      this.frameCount = 0;
      this.lastFrameTime = currentTime;
    }

    this.frameCount++;
  }

  // Obtenir les métriques de performance
  getPerformanceMetrics(): RenderPerformanceMetrics {
    // Estimer l'utilisation mémoire
    const nodeMemory = this.nodes.size * 500; // ~500 bytes par noeud
    const edgeMemory = this.edges.size * 200; // ~200 bytes par arête
    this.performanceMetrics.memoryUsage = (nodeMemory + edgeMemory) / (1024 * 1024); // En MB

    return { ...this.performanceMetrics };
  }

  // Optimiser le rendu pour mobile
  optimizeForMobile() {
    this.config.maxVisibleNodes = 50;
    this.config.enableLOD = true;
    this.config.enableCulling = true;
    this.config.cullDistance = 50;
    this.config.lodDistance = 100;
    
    this.updateVisibility();
  }

  // Optimiser le rendu pour desktop
  optimizeForDesktop() {
    this.config.maxVisibleNodes = 200;
    this.config.enableLOD = true;
    this.config.enableCulling = true;
    this.config.cullDistance = 100;
    this.config.lodDistance = 200;
    
    this.updateVisibility();
  }

  // Précharger les nœuds autour du viewport
  preloadAroundViewport(factor: number = 1.5) {
    const preloadBounds = {
      x: this.viewport.x - (this.viewport.width * (factor - 1)) / 2,
      y: this.viewport.y - (this.viewport.height * (factor - 1)) / 2,
      width: this.viewport.width * factor,
      height: this.viewport.height * factor,
      zoom: this.viewport.zoom
    };

    // Marquer les nœuds pour préchargement
    this.nodes.forEach(node => {
      const bounds = {
        minX: preloadBounds.x,
        maxX: preloadBounds.x + preloadBounds.width,
        minY: preloadBounds.y,
        maxY: preloadBounds.y + preloadBounds.height
      };

      const isInPreload = node.position.x >= bounds.minX &&
                          node.position.x <= bounds.maxX &&
                          node.position.y >= bounds.minY &&
                          node.position.y <= bounds.maxY;

      if (isInPreload && !node.isInViewport) {
        // Émettre un événement de préchargement
        const event = new CustomEvent('nodePreload', {
          detail: { nodeId: node.id, node }
        });
        window.dispatchEvent(event);
      }
    });
  }

  // Nettoyer les ressources
  destroy() {
    this.nodes.clear();
    this.edges.clear();
    this.renderQueue.clear();
    
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
      this.renderTimeout = null;
    }
  }
}

// Instance singleton
export const virtualRenderer = new VirtualWorkflowRenderer();

// Hook React pour utiliser le rendu virtuel
export function useVirtualRenderer() {
  const initialize = (nodes: any[], edges: any[]) => {
    virtualRenderer.initialize(nodes, edges);
  };

  const updateViewport = (bounds: any) => {
    virtualRenderer.updateViewport(bounds);
  };

  const updateNode = (nodeId: string, updates: any) => {
    virtualRenderer.updateNode(nodeId, updates);
  };

  const getVisibleNodes = () => virtualRenderer.getVisibleNodes();
  const getVisibleEdges = () => virtualRenderer.getVisibleEdges();
  const getNodeLOD = (nodeId: string) => {
    const node = virtualRenderer['nodes'].get(nodeId);
    return node ? virtualRenderer.getNodeLOD(node) : 'high';
  };
  const getPerformanceMetrics = () => virtualRenderer.getPerformanceMetrics();

  const optimizeForDevice = (isMobile: boolean) => {
    if (isMobile) {
      virtualRenderer.optimizeForMobile();
    } else {
      virtualRenderer.optimizeForDesktop();
    }
  };

  return {
    initialize,
    updateViewport,
    getVisibleNodes,
    getVisibleEdges,
    updateNode,
    getNodeLOD,
    getPerformanceMetrics,
    optimizeForDevice
  };
}