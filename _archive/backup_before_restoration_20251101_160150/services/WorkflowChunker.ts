// PERFORMANCE IMPROVEMENT #2: Lazy Loading pour workflows sectionnés
// Charger les parties du workflow à la demande pour économiser les ressources

import { WorkflowNode, WorkflowEdge } from '../types/workflow';

export interface WorkflowChunk {
  id: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  isLoaded: boolean;
  lastAccessed: number;
  size: number;
  priority: number;
}

export interface ChunkMetadata {
  id: string;
  nodeCount: number;
  edgeCount: number;
  bounds: WorkflowChunk['bounds'];
  dependencies: string[]; // IDs des chunks dont celui-ci dépend
}

export interface ChunkingConfig {
  chunkSize: number;          // Nombre max de nœuds par chunk
  overlapFactor: number;      // Facteur de chevauchement entre chunks
  maxLoadedChunks: number;    // Nombre max de chunks chargés en mémoire
  preloadDistance: number;    // Distance pour précharger les chunks
  unloadDelay: number;        // Délai avant déchargement (ms)
}

export class WorkflowChunker {
  private chunks: Map<string, WorkflowChunk> = new Map();
  private chunkMetadata: Map<string, ChunkMetadata> = new Map();
  private loadedChunks: Set<string> = new Set();
  private nodeToChunk: Map<string, string> = new Map();
  private edgeToChunk: Map<string, string> = new Map();
  private config: ChunkingConfig = {
    chunkSize: 50,
    overlapFactor: 0.1,
    maxLoadedChunks: 10,
    preloadDistance: 500,
    unloadDelay: 30000 // 30 secondes
  };
  private unloadTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config?: Partial<ChunkingConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  // Diviser un workflow en chunks
  async chunkWorkflow(nodes: WorkflowNode[], edges: WorkflowEdge[]): Promise<string[]> {
    this.clear();
    
    // Calculer les limites globales
    
    // Créer une grille de chunks
    
    // Stocker les chunks et leurs métadonnées
    chunks.forEach(chunk => {
      this.chunks.set(chunk.id, chunk);
      this.chunkMetadata.set(chunk.id, {
        id: chunk.id,
        nodeCount: chunk.nodes.length,
        edgeCount: chunk.edges.length,
        bounds: chunk.bounds,
        dependencies: this.calculateChunkDependencies(chunk, chunks)
      });
    });
    
    return Array.from(this.chunks.keys());
  }

  // Créer les chunks basés sur une grille spatiale
  private createChunks(
    nodes: WorkflowNode[], 
    edges: WorkflowEdge[], 
    globalBounds: { minX: number; maxX: number; minY: number; maxY: number }
  ): WorkflowChunk[] {
    const chunks: WorkflowChunk[] = [];
    
    // Calculer la taille de la grille
    
    // Calculer le nombre de cellules
    
    
    // Créer les chunks pour chaque cellule
    for (let __row = 0; row < gridRows; row++) {
      for (let __col = 0; col < gridCols; col++) {
        
        // Calculer les limites avec chevauchement
          minX: globalBounds.minX + col * cellWidth - cellWidth * overlap,
          maxX: globalBounds.minX + (col + 1) * cellWidth + cellWidth * overlap,
          minY: globalBounds.minY + row * cellHeight - cellHeight * overlap,
          maxY: globalBounds.minY + (row + 1) * cellHeight + cellHeight * overlap
        };
        
        // Trouver les nœuds dans cette cellule
          node.position.x >= bounds.minX &&
          node.position.x <= bounds.maxX &&
          node.position.y >= bounds.minY &&
          node.position.y <= bounds.maxY
        );
        
        if (chunkNodes.length === 0) continue;
        
        // Marquer l'appartenance des nœuds
        chunkNodes.forEach(node => {
          this.nodeToChunk.set(node.id, chunkId);
        });
        
        // Trouver les arêtes associées
          nodeIds.has(edge.source) || nodeIds.has(edge.target)
        );
        
        // Marquer l'appartenance des arêtes
        chunkEdges.forEach(edge => {
          this.edgeToChunk.set(edgeId, chunkId);
        });
        
        // Créer le chunk
        chunks.push({
          id: chunkId,
          nodes: chunkNodes,
          edges: chunkEdges,
          bounds,
          isLoaded: false,
          lastAccessed: 0,
          size: this.calculateChunkSize(chunkNodes, chunkEdges),
          priority: this.calculateChunkPriority(chunkNodes)
        });
      }
    }
    
    return chunks;
  }

  // Calculer les limites d'un ensemble de nœuds
  private calculateBounds(nodes: WorkflowNode[]): { minX: number; maxX: number; minY: number; maxY: number } {
    if (nodes.length === 0) {
      return { minX: 0, maxX: 100, minY: 0, maxY: 100 };
    }
    
    let __minX = Infinity, maxX = -Infinity;
    let __minY = Infinity, maxY = -Infinity;
    
    nodes.forEach(node => {
      minX = Math.min(minX, node.position.x);
      maxX = Math.max(maxX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxY = Math.max(maxY, node.position.y);
    });
    
    // Ajouter une marge
    return {
      minX: minX - margin,
      maxX: maxX + margin,
      minY: minY - margin,
      maxY: maxY + margin
    };
  }

  // Calculer la taille d'un chunk en mémoire
  private calculateChunkSize(nodes: WorkflowNode[], edges: WorkflowEdge[]): number {
    // Estimation approximative en octets
    return nodes.length * nodeSize + edges.length * edgeSize;
  }

  // Calculer la priorité d'un chunk
  private calculateChunkPriority(nodes: WorkflowNode[]): number {
    
    // Les chunks avec des nœuds critiques sont prioritaires
    nodes.forEach(node => {
      if (criticalTypes.includes(node.data.type)) {
        priority += 10;
      }
    });
    
    // Les chunks denses sont prioritaires
    priority += Math.min(nodes.length / 10, 10);
    
    return priority;
  }

  // Calculer les dépendances entre chunks
  private calculateChunkDependencies(
    chunk: WorkflowChunk, 
    allChunks: WorkflowChunk[] // Parameter for future dependency analysis
  ): string[] {
    
    chunk.edges.forEach(edge => {
      // Trouver le chunk source
      if (sourceChunk && sourceChunk !== chunk.id) {
        dependencies.add(sourceChunk);
      }
      
      // Trouver le chunk cible
      if (targetChunk && targetChunk !== chunk.id) {
        dependencies.add(targetChunk);
      }
    });
    
    return Array.from(dependencies);
  }

  // Charger un chunk
  async loadChunk(chunkId: string): Promise<WorkflowChunk | null> {
    if (!chunk) return null;
    
    // Annuler le timer de déchargement s'il existe
    if (timer) {
      clearTimeout(timer);
      this.unloadTimers.delete(chunkId);
    }
    
    // Si déjà chargé, mettre à jour l'accès
    if (chunk.isLoaded) {
      chunk.lastAccessed = Date.now();
      return chunk;
    }
    
    // Vérifier la limite de chunks chargés
    if (this.loadedChunks.size >= this.config.maxLoadedChunks) {
      await this.unloadLeastUsedChunk();
    }
    
    // Simuler le chargement (en production, cela pourrait être depuis le serveur)
    await this.simulateLoading(chunk.size);
    
    // Marquer comme chargé
    chunk.isLoaded = true;
    chunk.lastAccessed = Date.now();
    this.loadedChunks.add(chunkId);
    
    // Émettre un événement
      detail: { chunkId, chunk }
    });
    window.dispatchEvent(event);
    
    return chunk;
  }

  // Décharger un chunk
  async unloadChunk(chunkId: string): Promise<void> {
    if (!chunk || !chunk.isLoaded) return;
    
    // Sauvegarder l'état si nécessaire
    await this.saveChunkState(chunk);
    
    // Marquer comme déchargé
    chunk.isLoaded = false;
    this.loadedChunks.delete(chunkId);
    
    // Libérer la mémoire (en production)
    // chunk.nodes = [];
    // chunk.edges = [];
    
    // Émettre un événement
      detail: { chunkId }
    });
    window.dispatchEvent(event);
  }

  // Décharger le chunk le moins utilisé
  private async unloadLeastUsedChunk(): Promise<void> {
    let leastUsedChunk: WorkflowChunk | null = null;
    
    this.loadedChunks.forEach(chunkId => {
      if (chunk && chunk.lastAccessed < oldestAccess) {
        oldestAccess = chunk.lastAccessed;
        leastUsedChunk = chunk;
      }
    });
    
    if (leastUsedChunk) {
      await this.unloadChunk(leastUsedChunk.id);
    }
  }

  // Obtenir les chunks visibles dans un viewport
  async getVisibleChunks(viewport: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): Promise<WorkflowChunk[]> {
    const visibleChunks: WorkflowChunk[] = [];
    
    for (const [chunkId, metadata] of this.chunkMetadata) {
      if (this.isChunkInViewport(metadata.bounds, viewport)) {
        if (chunk) {
          visibleChunks.push(chunk);
        }
      }
    }
    
    // Précharger les chunks adjacents
    this.preloadAdjacentChunks(visibleChunks, viewport);
    
    return visibleChunks;
  }

  // Vérifier si un chunk est dans le viewport
  private isChunkInViewport(
    chunkBounds: WorkflowChunk['bounds'], 
    viewport: { x: number; y: number; width: number; height: number }
  ): boolean {
    return !(
      chunkBounds.maxX < viewport.x ||
      chunkBounds.minX > viewport.x + viewport.width ||
      chunkBounds.maxY < viewport.y ||
      chunkBounds.minY > viewport.y + viewport.height
    );
  }

  // Précharger les chunks adjacents
  private async preloadAdjacentChunks(
    visibleChunks: WorkflowChunk[], 
    viewport: { x: number; y: number; width: number; height: number }
  ): Promise<void> {
      x: viewport.x - this.config.preloadDistance,
      y: viewport.y - this.config.preloadDistance,
      width: viewport.width + 2 * this.config.preloadDistance,
      height: viewport.height + 2 * this.config.preloadDistance
    };
    
    for (const [chunkId, metadata] of this.chunkMetadata) {
      if (chunk && !chunk.isLoaded && 
          this.isChunkInViewport(metadata.bounds, preloadViewport)) {
        // Charger en arrière-plan avec priorité basse
        setTimeout(() => this.loadChunk(chunkId), 100);
      }
    }
  }

  // Planifier le déchargement d'un chunk
  scheduleUnload(chunkId: string): void {
    // Annuler le timer existant
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Créer un nouveau timer
      this.unloadChunk(chunkId);
      this.unloadTimers.delete(chunkId);
    }, this.config.unloadDelay);
    
    this.unloadTimers.set(chunkId, timer);
  }

  // Obtenir les statistiques des chunks
  getChunkStats(): {
    totalChunks: number;
    loadedChunks: number;
    totalMemory: number;
    loadedMemory: number;
  } {
    
    this.chunks.forEach(chunk => {
      totalMemory += chunk.size;
      if (chunk.isLoaded) {
        loadedMemory += chunk.size;
      }
    });
    
    return {
      totalChunks: this.chunks.size,
      loadedChunks: this.loadedChunks.size,
      totalMemory: totalMemory / (1024 * 1024), // En MB
      loadedMemory: loadedMemory / (1024 * 1024) // En MB
    };
  }

  // Simuler le chargement
  private async simulateLoading(size: number): Promise<void> {
    // Simuler un délai proportionnel à la taille
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Sauvegarder l'état d'un chunk
  private async saveChunkState(chunk: WorkflowChunk): Promise<void> {
    // En production, sauvegarder dans IndexedDB ou sur le serveur
      id: chunk.id,
      nodes: chunk.nodes.map(n => ({ id: n.id, position: n.position })),
      lastAccessed: chunk.lastAccessed
    };
    
    // Simuler la sauvegarde
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // Nettoyer toutes les ressources
  clear(): void {
    // Annuler tous les timers
    this.unloadTimers.forEach(timer => clearTimeout(timer));
    this.unloadTimers.clear();
    
    // Vider les structures
    this.chunks.clear();
    this.chunkMetadata.clear();
    this.loadedChunks.clear();
    this.nodeToChunk.clear();
    this.edgeToChunk.clear();
  }

  // Optimiser la configuration pour mobile
  optimizeForMobile(): void {
    this.config.chunkSize = 25;
    this.config.maxLoadedChunks = 5;
    this.config.preloadDistance = 200;
    this.config.unloadDelay = 15000; // 15 secondes
  }

  // Optimiser la configuration pour desktop
  optimizeForDesktop(): void {
    this.config.chunkSize = 100;
    this.config.maxLoadedChunks = 20;
    this.config.preloadDistance = 1000;
    this.config.unloadDelay = 60000; // 60 secondes
  }
}

// Instance singleton
export const workflowChunker = new WorkflowChunker();

// Hook React pour utiliser le chunker
export function useWorkflowChunker() {
    return workflowChunker.chunkWorkflow(nodes, edges);
  };
  
    return workflowChunker.getVisibleChunks(viewport);
  };
  
    return workflowChunker.loadChunk(chunkId);
  };
  
    return workflowChunker.unloadChunk(chunkId);
  };
  
    workflowChunker.scheduleUnload(chunkId);
  };
  
  
    if (isMobile) {
      workflowChunker.optimizeForMobile();
    } else {
      workflowChunker.optimizeForDesktop();
    }
  };
  
  return {
    chunkWorkflow,
    getVisibleChunks,
    loadChunk,
    unloadChunk,
    scheduleUnload,
    getChunkStats,
    optimizeForDevice
  };
}