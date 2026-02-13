// PERFORMANCE IMPROVEMENT #2: Virtual DOM pour grandes workflows
// Rendu virtuel pour améliorer les performances avec de nombreux nœuds

import { WorkflowNode, WorkflowEdge } from '../types/workflow';
import { logger } from './LoggingService';

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
          this.edges.set(edgeId, renderableEdge);
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
    
    // Les nœuds critiques ont une priorité plus élevée
    if (criticalTypes.includes(node.data.type)) {
      priority += 10;
    }
    
    // Les nœuds avec plus de connexions sont prioritaires
    priority += Math.min(connectionCount * 2, 20);
    
    // Les nœuds récemment modifiés sont prioritaires
    if (node.data.lastModified) {
      if (age < 60000) { // Moins d'une minute
        priority += 5;
      }
    }
    
    return priority;
  }

  // Obtenir le nombre de connexions d'un nœud
  private getNodeConnectionCount(nodeId: string): number {
    this.edges.forEach(edge => {
      if (edge.source === nodeId || edge.target === nodeId) {
        count++;
      }
    });
    return count;
  }

  // Mettre à jour la visibilité des éléments
  private updateVisibility() {
    
    // Calculer les limites du viewport avec padding
      minX: this.viewport.x - this.config.nodePadding,
      maxX: this.viewport.x + this.viewport.width + this.config.nodePadding,
      minY: this.viewport.y - this.config.nodePadding,
      maxY: this.viewport.y + this.viewport.height + this.config.nodePadding
    };
    
    
    // Vérifier la visibilité des nœuds
    this.nodes.forEach((node, nodeId) => {
      node.isInViewport = isInViewport;
      
      if (isInViewport) {
        visibleNodes.add(nodeId);
        visibleNodeCount++;
      }
    });
    
    // Vérifier la visibilité des arêtes
    this.edges.forEach(edge => {
      
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
  private isNodeInViewport(node: RenderableNode, bounds: Record<string, unknown>): boolean {
    
    
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
      .map(id => {
        return node ? { id, node } : null;
      })
      .filter((item): item is { id: string; node: RenderableNode } => item !== null)
      .sort((a, b) => {
        // D'abord par priorité
        if (priorityDiff !== 0) return priorityDiff;
        
        // Ensuite par distance au centre du viewport
        
          a.node.position.x - centerX,
          a.node.position.y - centerY
        );
          b.node.position.x - centerX,
          b.node.position.y - centerY
        );
        
        return distA - distB;
      });
    
    // Marquer seulement les N premiers comme visibles
    sortedNodes.forEach((item, index) => {
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
    
    
      node.position.x - centerX,
      node.position.y - centerY
    );
    
    
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
  private renderTimeout: ReturnType<typeof setTimeout> | null = null;
  private isSchedulingRender: boolean = false;
  
  private scheduleRender() {
    // Éviter les appels concurrents
    if (this.renderTimeout || this.isSchedulingRender) return;
    
    this.isSchedulingRender = true;
    try {
      // Bind method to avoid closure capturing 'this'
      
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
    
    
    // Créer une copie de la queue pour éviter les modifications concurrentes
    
    // Vider la queue immédiatement
    this.renderQueue.clear();
    
    // Traiter les nœuds
    nodesToProcess.forEach(nodeId => {
      if (node) {
        // Émettre un événement de mise à jour
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
      x: this.viewport.x - (this.viewport.width * (factor - 1)) / 2,
      y: this.viewport.y - (this.viewport.height * (factor - 1)) / 2,
      width: this.viewport.width * factor,
      height: this.viewport.height * factor,
      zoom: this.viewport.zoom
    };
    
    // Marquer les nœuds pour préchargement
    this.nodes.forEach(node => {
        minX: preloadBounds.x,
        maxX: preloadBounds.x + preloadBounds.width,
        minY: preloadBounds.y,
        maxY: preloadBounds.y + preloadBounds.height
      });
      
      if (isInPreload && !node.isInViewport) {
        // Émettre un événement de préchargement
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
    virtualRenderer.initialize(nodes, edges);
  };
  
    virtualRenderer.updateViewport(bounds);
  };
  
  
    virtualRenderer.updateNode(nodeId, updates);
  };
  
  
  
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