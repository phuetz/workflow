// Provider pour gérer les performances du workflow de manière globale
import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { usePerformanceOptimization } from '../../hooks/usePerformanceOptimization';
import { workerExecutionEngine } from '../../services/WorkerExecutionEngine';
import { virtualRenderer } from '../../services/VirtualWorkflowRenderer';
import { workflowChunker } from '../../services/WorkflowChunker';
import { aiWorkflowService } from '../../services/AIWorkflowService';
import { logger } from '../../services/SimpleLogger';

interface PerformanceContextType {
  isInitialized: boolean;
  isOptimizing: boolean;
  performanceScore: number;
  recommendations: string[];
  initializePerformance: () => Promise<void>;
  optimizePerformance: () => Promise<void>;
  getMetrics: () => any;
  cleanup: () => void;
}

const PerformanceContext = createContext<PerformanceContextType | null>(null);

export function useWorkflowPerformance() {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error('useWorkflowPerformance must be used within WorkflowPerformanceProvider');
  }
  return context;
}

interface Props {
  children: ReactNode;
}

export function WorkflowPerformanceProvider({ children }: Props) {
  const { nodes, edges, executionHistory } = useWorkflowStore();
  const performanceOptimization = usePerformanceOptimization();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [performanceScore, setPerformanceScore] = useState(100);

  // Initialiser les systèmes de performance
  const initializePerformanceSystems = async () => {
    if (isInitialized) return;
    
    try {
      // Initialiser le rendu virtuel
      virtualRenderer.initialize(nodes, edges);
      
      // Chunker le workflow si nécessaire
      if (nodes.length > 50) {
        await workflowChunker.chunkWorkflow(nodes, edges);
      }
      
      // Entraîner le modèle AI avec l'historique
      if (executionHistory.length > 0) {
        aiWorkflowService.trainModel([{
          nodes,
          edges,
          executionHistory
        }]);
      }
      
      // Optimiser selon le contexte
      performanceOptimization.optimizeForCurrentContext();
      
      setIsInitialized(true);
    } catch (error) {
      logger.error('Failed to initialize performance systems:', error);
    }
  };

  useEffect(() => {
    initializePerformanceSystems();
  }, [nodes, edges, executionHistory, isInitialized, performanceOptimization]);

  // Optimiser les performances
  const optimizePerformance = async () => {
    setIsOptimizing(true);
    
    try {
      // Obtenir les optimisations suggérées par l'AI
      const suggestions = await performanceOptimization.getAIOptimizationSuggestions();
      
      // Appliquer les optimisations automatiques
      workerExecutionEngine.optimizeWorkerCount();
      
      // Optimiser le rendu selon le contexte
      if (performanceOptimization.context.isMobile) {
        virtualRenderer.optimizeForMobile();
        workflowChunker.optimizeForMobile();
      } else {
        virtualRenderer.optimizeForDesktop();
        workflowChunker.optimizeForDesktop();
      }
      
      // Forcer le garbage collection si disponible
      performanceOptimization.forceGarbageCollection();
      
      // Calculer le nouveau score de performance
      const newScore = performanceOptimization.calculateScore({
        nodeCount: nodes.length,
        edgeCount: edges.length,
        isMobile: performanceOptimization.context.isMobile
      });
      setPerformanceScore(newScore);
      
    } finally {
      setIsOptimizing(false);
    }
  };

  // Obtenir toutes les métriques
  const getAllMetrics = useCallback(() => {
    return {
      render: virtualRenderer.getPerformanceMetrics(),
      workers: workerExecutionEngine.getExecutionStats(),
      chunks: workflowChunker.getChunkStats(),
      context: performanceOptimization.context
    };
  }, [performanceOptimization]);

  // Calculer le score de performance
  const calculatePerformanceScore = (metrics: any) => {
    let score = 100;
    
    // Pénalités basées sur les métriques
    if (metrics.render.fps < 30) score -= 20;
    else if (metrics.render.fps < 50) score -= 10;
    
    if (metrics.render.renderTime > 33) score -= 15;
    else if (metrics.render.renderTime > 16) score -= 5;
    
    if (metrics.workers.queuedJobs > 20) score -= 15;
    else if (metrics.workers.queuedJobs > 10) score -= 5;
    
    if (metrics.chunks.loadedMemory > 100) score -= 20;
    else if (metrics.chunks.loadedMemory > 50) score -= 10;
    
    if (metrics.context.memoryPressure) score -= 15;
    if (metrics.context.cpuPressure) score -= 15;
    
    return Math.max(0, Math.min(100, score));
  };

  // Nettoyer les ressources
  const cleanupResources = useCallback(() => {
    virtualRenderer.destroy();
    workflowChunker.clear();
    workerExecutionEngine.destroy();
    setIsInitialized(false);
  }, []);

  // Auto-initialisation quand les nœuds changent significativement
  useEffect(() => {
    if (nodes.length > 0 && !isInitialized) {
      initializePerformanceSystems();
    }
  }, [nodes.length, isInitialized]); // Removed initializePerformanceSystems to prevent re-runs

  // Surveiller les performances et optimiser automatiquement
  useEffect(() => {
    if (!isInitialized) return;
    
    const interval = setInterval(() => {
      const metrics = getAllMetrics();
      const score = calculatePerformanceScore(metrics);
      setPerformanceScore(score);
      
      // Auto-optimiser si le score est trop bas
      if (score < 50 && !isOptimizing) {
        optimizePerformance();
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isInitialized]); // Removed isOptimizing, getMetrics, optimizePerformance to prevent re-runs

  // Nettoyer à la destruction
  useEffect(() => {
    return cleanupResources;
  }, [cleanupResources]);

  const value: PerformanceContextType = {
    isInitialized,
    isOptimizing,
    performanceScore,
    recommendations: performanceOptimization.recommendations,
    initializePerformance: initializePerformanceSystems,
    optimizePerformance,
    getMetrics: getAllMetrics,
    cleanup: cleanupResources
  };

  return (
    <PerformanceContext.Provider value={value}>
      {children}
    </PerformanceContext.Provider>
  );
}