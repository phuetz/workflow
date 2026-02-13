/* eslint-disable no-useless-escape */
// PERFORMANCE IMPROVEMENT #2: Web Workers for Parallel Execution
// Exécution parallèle des nœuds avec Web Workers pour améliorer les performances

import { WorkflowNode, WorkflowEdge } from '../types/workflow';
import { ExecutionContext, ExecutionResult } from '../architecture/ExecutionStrategy';
import { logger } from './LoggingService';

export interface WorkerMessage {
  type: 'execute' | 'result' | 'error' | 'progress' | 'memory';
  nodeId: string;
  data?: unknown;
  error?: string;
  progress?: number;
  memoryUsage?: number;
}

export interface NodeExecutionJob {
  nodeId: string;
  nodeType: string;
  config: unknown;
  context: ExecutionContext;
  dependencies: string[];
}

export class WorkerExecutionEngine {
  private workers: Worker[] = [];
  private workerPool: Worker[] = [];
  private activeJobs: Map<string, { worker: Worker; job: NodeExecutionJob }> = new Map();
  private jobQueue: NodeExecutionJob[] = [];
  private maxWorkers: number;
  private executionResults: Map<string, ExecutionResult> = new Map();
  private executionCallbacks: Map<string, (result: ExecutionResult) => void> = new Map();
  private processingQueue: boolean = false; // Éviter le traitement concurrent de la queue
  private workerEventHandlers: Map<Worker, { message: (e: MessageEvent) => void; error: (e: ErrorEvent) => void }> = new Map();
  
  constructor(maxWorkers: number = navigator.hardwareConcurrency || 4) {
    this.maxWorkers = Math.min(maxWorkers, 8); // Cap à 8 workers max
    this.initializeWorkerPool();
  }

  // Initialiser le pool de workers
  private initializeWorkerPool() {
    try {
      for (let __i = 0; i < this.maxWorkers; i++) {
        this.workers.push(worker);
        this.workerPool.push(worker);
      }
    } catch (error) {
      logger.error('Error initializing worker pool:', error);
      // Ensure at least one worker is available
      if (this.workers.length === 0) {
        throw new Error('Failed to initialize any workers');
      }
    }
  }

  // Créer un nouveau worker avec le code d'exécution
  private createWorker(): Worker {
      // Worker code for node execution
      self.addEventListener('message', async function(e) {
        const { _type, nodeId, data } = e.data;
        
        if (type === 'execute') {
          const { _nodeType, config, context } = data;
          
          try {
            // Mesurer l'utilisation mémoire
            
            // Envoyer une mise à jour de progression
            self.postMessage({
              type: 'progress',
              nodeId,
              progress: 0.1
            });
            
            // Exécuter selon le type de nœud
            let result;
            switch (nodeType) {
              case 'transform':
                result = await executeTransform(config, context);
                break;
              case 'condition':
                result = await executeCondition(config, context);
                break;
              case 'merge':
                result = await executeMerge(config, context);
                break;
              case 'loop':
                result = await executeLoop(config, context);
                break;
              default:
                // Pour les autres types, utiliser l'exécution standard
                result = await executeGeneric(nodeType, config, context);
            }
            
            // Calculer l'utilisation mémoire finale
            
            // Envoyer le résultat
            self.postMessage({
              type: 'result',
              nodeId,
              data: result,
              memoryUsage
            });
            
          } catch (error) {
            self.postMessage({
              type: 'error',
              nodeId,
              error: error.message || 'Unknown error'
            });
          }
        }
      });

      // Fonction d'exécution pour transform
      async function executeTransform(config, context) {
        
        try {
          // Évaluation sécurisée sans new Function()
          let result;
          
          // Vérification de sécurité basique
          /* eslint-disable no-useless-escape */
          const dangerousPatterns = [
            /eval\s*\(/i,
            /Function\s*\(/i,
            /import\s*\(/i,
            /require\s*\(/i,
            /process\./i,
            /global\./i,
            /__proto__/i,
            /constructor\s*\[/i
          ];
          /* eslint-enable no-useless-escape */
          
          for (const pattern of dangerousPatterns) {
            if (pattern.test(expression)) {
              throw new Error('Expression contains potentially dangerous code');
            }
          }
          
          // Simple expression parser pour les cas courants
          if (expression === 'return $;' || expression === '$') {
            result = context.inputData;
          } else if (expression.startsWith('$.')) {
            // Accès simple aux propriétés
            result = context.inputData;
            for (const key of path) {
              if (result && typeof result === 'object' && key in result) {
                result = result[key];
              } else {
                result = undefined;
                break;
              }
            }
          } else {
            // Pour les expressions complexes, utiliser une évaluation limitée
            result = { 
              expression: expression,
              input: context.inputData,
              warning: 'Complex expressions are limited for security'
            };
          }
          
          return {
            success: true,
            data: result,
            duration: Date.now() - startTime,
            metadata: {
              nodeType: 'transform',
              executedAt: new Date().toISOString(),
              retryCount: 0
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: Date.now() - startTime,
            metadata: {
              nodeType: 'transform',
              executedAt: new Date().toISOString(),
              retryCount: 0
            }
          };
        }
      }

      // Fonction d'exécution pour condition
      async function executeCondition(config, context) {
        
        try {
          // Évaluation sécurisée des conditions
          let __result = true;
          
          // Vérification de sécurité
          /* eslint-disable no-useless-escape */
            /eval\s*\(/i,
            /Function\s*\(/i,
            /import\s*\(/i,
            /require\s*\(/i,
            /process\./i,
            /global\./i,
            /__proto__/i
          ];
          /* eslint-enable no-useless-escape */
          
          for (const pattern of dangerousPatterns) {
            if (pattern.test(condition)) {
              throw new Error('Condition contains potentially dangerous code');
            }
          }
          
          // Évaluation simple des conditions
          if (condition === 'true') {
            result = true;
          } else if (condition === 'false') {
            result = false;
          } else if (condition.includes('===') || condition.includes('==')) {
            // Comparaison simple
            if (parts.length === 2 && parts[0] && parts[1]) {
              
              // Évaluer le côté gauche
              let __leftValue = context.inputData;
              if (left.startsWith('$.')) {
                for (const key of path) {
                  if (leftValue && typeof leftValue === 'object' && key in leftValue) {
                    leftValue = leftValue[key];
                  } else {
                    leftValue = undefined;
                    break;
                  }
                }
              }
              
              // Évaluer le côté droit
              let __rightValue = right;
              if (right === 'true') rightValue = true;
              else if (right === 'false') rightValue = false;
              else if (right === 'null') rightValue = null;
              else if (right === 'undefined') rightValue = undefined;
              /* eslint-disable no-useless-escape */
              else if (/^\d+$/.test(right)) rightValue = parseInt(right);
              else if (/^\d+\.\d+$/.test(right)) rightValue = parseFloat(right);
              /* eslint-enable no-useless-escape */
              else if (right.startsWith('"') && right.endsWith('"')) {
                rightValue = right.slice(1, -1);
              }
              
              result = condition.includes('===') 
                ? leftValue === rightValue 
                : leftValue == rightValue;
            }
          } else {
            // Pour les conditions complexes, toujours false par sécurité
            result = false;
          }
          
          return {
            success: true,
            data: { conditionMet: !!result, branch: result ? 'true' : 'false' },
            duration: Date.now() - startTime,
            metadata: {
              nodeType: 'condition',
              executedAt: new Date().toISOString(),
              retryCount: 0
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: Date.now() - startTime,
            metadata: {
              nodeType: 'condition',
              executedAt: new Date().toISOString(),
              retryCount: 0
            }
          };
        }
      }

      // Fonction d'exécution pour merge
      async function executeMerge(config, context) {
        
        try {
          let result;
          
          switch (mergeStrategy) {
            case 'concat':
              // Vérifier que tous les inputs sont des tableaux
              if (Array.isArray(inputs) && inputs.every(i => Array.isArray(i))) {
                result = [].concat(...inputs);
              } else {
                result = inputs;
              }
              break;
            case 'zip':
              // Vérifier que le premier input est un tableau
              if (Array.isArray(inputs) && inputs.length > 0 && Array.isArray(inputs[0])) {
                result = inputs[0].map((_, i) => 
                  inputs.map(arr => Array.isArray(arr) ? arr[i] : undefined)
                );
              } else {
                result = [];
              }
              break;
            case 'object':
              // Vérifier que tous les inputs sont des objets
              if (Array.isArray(inputs) && inputs.every(i => i && typeof i === 'object' && !Array.isArray(i))) {
                // SECURITY FIX: Prevent prototype pollution in object merge
                result = {};
                for (const input of inputs) {
                  for (const [key, value] of Object.entries(input)) {
                    if (key !== '__proto__' && key !== 'constructor' && key !== 'prototype') {
                      result[key] = value;
                    }
                  }
                }
              } else {
                result = {};
              }
              break;
            default:
              result = inputs;
          }
          
          return {
            success: true,
            data: result,
            duration: Date.now() - startTime,
            metadata: {
              nodeType: 'merge',
              executedAt: new Date().toISOString(),
              retryCount: 0
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            duration: Date.now() - startTime,
            metadata: {
              nodeType: 'merge',
              executedAt: new Date().toISOString(),
              retryCount: 0
            }
          };
        }
      }

      // Fonction d'exécution pour loop
      async function executeLoop(config, context) {
        
        try {
          
          for (let __i = 0; i < Math.min(items.length, maxIterations); i++) {
            // Simuler le traitement de chaque élément
            results.push({
              index: i,
              item: items[i],
              processed: true
            });
            
            // Envoyer une mise à jour de progression
            if (i % 10 === 0) {
              self.postMessage({
                type: 'progress',
                nodeId: context.nodeId,
                progress: (i / items.length) * 0.8 + 0.1
              });
            }
          }
          
          return {
            success: true,
            data: results,
            duration: Date.now() - startTime,
            metadata: {
              nodeType: 'loop',
              executedAt: new Date().toISOString(),
              retryCount: 0,
              itemsProcessed: results.length
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            duration: Date.now() - startTime,
            metadata: {
              nodeType: 'loop',
              executedAt: new Date().toISOString(),
              retryCount: 0
            }
          };
        }
      }

      // Fonction d'exécution générique
      async function executeGeneric(nodeType, config, context) {
        
        return {
          success: true,
          data: context.inputData,
          duration: Date.now() - startTime,
          metadata: {
            nodeType,
            executedAt: new Date().toISOString(),
            retryCount: 0,
            workerExecuted: true
          }
        };
      }
    `;

    try {
      // Créer le worker avec le code inline

      // Créer les gestionnaires d'événements liés
      
      // Stocker les gestionnaires pour pouvoir les supprimer plus tard
      this.workerEventHandlers.set(worker, { message: messageHandler, error: errorHandler });
      
      // Configurer les gestionnaires d'événements
      worker.addEventListener('message', messageHandler);
      worker.addEventListener('error', errorHandler);

      // Libérer l'URL après la création du worker
      URL.revokeObjectURL(workerUrl);

      return worker;
    } catch (error) {
      logger.error('Error creating worker:', error);
      throw new Error(`Failed to create worker: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Gestionnaire de messages du worker
  private handleWorkerMessage(event: MessageEvent<WorkerMessage>) {
    try {
      // Validate message structure
      if (!event.data || typeof event.data !== 'object') {
        logger.error('Invalid worker message: missing or invalid data');
        return;
      }

      const { _type, nodeId, data, error, progress, memoryUsage } = event.data;

      // Validate required fields
      if (!type || !nodeId) {
        logger.error('Invalid worker message: missing type or nodeId');
        return;
      }

      // Validate nodeId is string and not too long (prevent potential attacks)
      if (typeof nodeId !== 'string' || nodeId.length > 100) {
        logger.error('Invalid worker message: invalid nodeId');
        return;
      }

      switch (type) {
        case 'result':
          if (data !== undefined) {
            this.handleExecutionResult(nodeId, data);
          } else {
            logger.error(`Worker result message missing data for node: ${nodeId}`);
          }
          break;
        case 'error': {
          this.handleExecutionError(nodeId, errorMsg);
          break;
        }
        case 'progress': {
          this.handleExecutionProgress(nodeId, progressValue);
          break;
        }
        case 'memory': {
          this.handleMemoryUpdate(nodeId, memoryValue);
          break;
        }
        default:
          logger.warn(`Unknown worker message type: ${type}`);
      }
    } catch (error) {
      logger.error('Error handling worker message:', error);
    }
  }

  // Gestionnaire d'erreurs du worker
  private handleWorkerError(error: ErrorEvent) {
    logger.error('Worker error:', error);
    
    // Find the correct worker instance from the error target
    
    // Récupérer le job associé et le remettre dans la queue
    if (job) {
      logger.info(`Re-queuing failed job for node: ${job.job.nodeId}`);
      
      // Increment retry count if it exists in job metadata
      if (job.job.context.executionMetadata.currentAttempt < job.job.context.executionMetadata.maxRetries) {
        job.job.context.executionMetadata.currentAttempt++;
        this.jobQueue.unshift(job.job);
      } else {
        // Max retries reached, mark as failed
        this.handleExecutionError(job.job.nodeId, `Worker error after ${job.job.context.executionMetadata.maxRetries} attempts: ${error.message}`);
      }
      
      this.activeJobs.delete(job.job.nodeId);
      this.returnWorkerToPool(job.worker);
      this.processQueue();
    } else {
      logger.error('Could not find job for failed worker');
    }
  }

  // Exécuter un workflow complet
  async executeWorkflow(
    nodes: WorkflowNode[], 
    edges: WorkflowEdge[],
    initialData: unknown = {}
  ): Promise<Map<string, ExecutionResult>> {
    try {
      // Cas edge: workflow vide
      if (!nodes || nodes.length === 0) {
        return new Map();
      }

      // Réinitialiser les résultats
      this.executionResults.clear();
      this.executionCallbacks.clear();
      
      // Analyser les dépendances
      
      // Créer les jobs d'exécution
      
      // Ajouter les jobs à la queue
      this.jobQueue.push(...jobs);
      
      // Démarrer le traitement
      this.processQueue();
      
      // Attendre que tous les nœuds soient exécutés avec timeout
      return new Promise((resolve, reject) => {
        let checkInterval: ReturnType<typeof setInterval> | null = null;
        let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
        
          if (checkInterval) {
            clearInterval(checkInterval);
            checkInterval = null;
          }
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
            timeoutHandle = null;
          }
        };
        
          if (this.executionResults.size === nodes.length) {
            cleanup();
            // Créer une copie pour éviter les modifications concurrentes
            resolve(new Map(this.executionResults));
          }
        };
        
        // Timeout de sécurité (5 minutes)
        timeoutHandle = setTimeout(() => {
          cleanup();
          reject(new Error(`Workflow execution timeout after 5 minutes. Completed ${this.executionResults.size}/${nodes.length} nodes.`));
        }, 5 * 60 * 1000);
        
        // Vérifier immédiatement au cas où
        checkCompletion();
        
        // Puis vérifier périodiquement
        if (this.executionResults.size < nodes.length) {
          checkInterval = setInterval(checkCompletion, 100);
        }
      });
    } catch (error) {
      logger.error('Error in executeWorkflow:', error);
      throw error;
    }
  }

  // Analyser les dépendances entre nœuds
  private analyzeDependencies(
    nodes: WorkflowNode[], 
    edges: WorkflowEdge[]
  ): Map<string, string[]> {
    
    nodes.forEach(node => {
        .filter(edge => edge.target === node.id)
        .map(edge => edge.source);
      dependencies.set(node.id, deps);
    });
    
    return dependencies;
  }

  // Créer les jobs d'exécution
  private createExecutionJobs(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    dependencies: Map<string, string[]>,
    initialData: unknown
  ): NodeExecutionJob[] {
    return nodes.map(node => ({
      nodeId: node.id,
      nodeType: node.data.type,
      config: node.data.config || {},
      context: {
        nodeId: node.id,
        inputData: initialData,
        globalVariables: {},
        previousResults: {},
        executionMetadata: {
          startTime: Date.now(),
          timeout: 30000,
          maxRetries: 3,
          currentAttempt: 1
        }
      },
      dependencies: dependencies.get(node.id) || []
    }));
  }

  // Traiter la queue de jobs
  private processQueue() {
    // Éviter le traitement concurrent
    if (this.processingQueue) return;
    this.processingQueue = true;
    
    try {
      while (this.workerPool.length > 0 && this.jobQueue.length > 0) {
        if (!job) break;
        
        if (worker) {
          this.executeJob(worker, job);
        }
      }
    } finally {
      this.processingQueue = false;
    }
  }

  // Trouver un job exécutable (toutes les dépendances satisfaites)
  private findExecutableJob(): NodeExecutionJob | null {
      job.dependencies.every(dep => this.executionResults.has(dep))
    );
    
    if (index === -1) return null;
    
    return removed.length > 0 ? removed[0] : null;
  }

  // Exécuter un job sur un worker
  private executeJob(worker: Worker, job: NodeExecutionJob) {
    // Mettre à jour le contexte avec les résultats des dépendances
    const previousResults: Record<string, unknown> = {};
    job.dependencies.forEach(dep => {
      if (result?.success) {
        previousResults[dep] = result.data;
      }
    });
    
    // Calculer les données d'entrée basées sur les dépendances
    
    // Mettre à jour le contexte
    job.context.previousResults = previousResults;
    job.context.inputData = inputData;
    
    // Enregistrer le job actif
    this.activeJobs.set(job.nodeId, { worker, job });
    
    // Envoyer le job au worker
    worker.postMessage({
      type: 'execute',
      nodeId: job.nodeId,
      data: {
        nodeType: job.nodeType,
        config: job.config,
        context: job.context
      }
    });
  }

  // Calculer les données d'entrée pour un nœud
  private calculateInputData(job: NodeExecutionJob, previousResults: Record<string, unknown>): unknown {
    if (job.dependencies.length === 0) {
      return job.context.inputData;
    }
    
    if (job.dependencies.length === 1 && job.dependencies[0]) {
      return previousResults[depId];
    }
    
    // Pour plusieurs dépendances, retourner un tableau
    return job.dependencies.map(dep => previousResults[dep]);
  }

  // Gérer le résultat d'exécution
  private handleExecutionResult(nodeId: string, result: ExecutionResult) {
    this.executionResults.set(nodeId, result);
    
    // Libérer le worker
    if (activeJob) {
      this.activeJobs.delete(nodeId);
      this.returnWorkerToPool(activeJob.worker);
    }
    
    // Appeler le callback s'il existe
    if (callback) {
      callback(result);
      this.executionCallbacks.delete(nodeId);
    }
    
    // Traiter la queue
    this.processQueue();
  }

  // Gérer les erreurs d'exécution
  private handleExecutionError(nodeId: string, error: string) {
    const result: ExecutionResult = {
      success: false,
      error,
      duration: 0,
      metadata: {
        nodeType: 'unknown',
        executedAt: new Date().toISOString(),
        retryCount: 0
      }
    };
    
    this.handleExecutionResult(nodeId, result);
  }

  // Gérer les mises à jour de progression
  private handleExecutionProgress(nodeId: string, progress: number) {
    // Émettre un événement de progression
      detail: { nodeId, progress }
    });
    window.dispatchEvent(event);
  }

  // Gérer les mises à jour mémoire
  private handleMemoryUpdate(nodeId: string, memoryUsage: number) {
    // Émettre un événement de mémoire
      detail: { nodeId, memoryUsage }
    });
    window.dispatchEvent(event);
  }

  // Retourner un worker au pool
  private returnWorkerToPool(worker: Worker) {
    this.workerPool.push(worker);
  }

  // Exécuter un seul nœud (pour les tests)
  async executeNode(
    nodeId: string,
    nodeType: string,
    config: unknown,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    return new Promise((resolve, reject) => {
      try {
        let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
        
        // MEMORY LEAK FIX: Avoid circular reference by not capturing cleanup in callback
          // Cleanup is handled externally to break circular reference
          resolve(result);
        };
        
        // Timeout de sécurité (2 minutes pour un nœud)
        timeoutHandle = setTimeout(() => {
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
            timeoutHandle = null;
          }
          this.executionCallbacks.delete(nodeId);
          reject(new Error(`Node execution timeout after 2 minutes for node ${nodeId}`));
        }, 2 * 60 * 1000);
        
        this.executionCallbacks.set(nodeId, wrappedResolve);
        
        const job: NodeExecutionJob = {
          nodeId,
          nodeType,
          config,
          context,
          dependencies: []
        };
        
        this.jobQueue.push(job);
        this.processQueue();
      } catch (error) {
        logger.error('Error in executeNode:', error);
        reject(error);
      }
    });
  }

  // Nettoyer les resources
  destroy() {
    // Clear any pending intervals
    if (checkInterval) {
      clearInterval(checkInterval);
    }
    
    // Terminer tous les workers et supprimer les event listeners
    this.workers.forEach(worker => {
      // Récupérer les gestionnaires stockés
      if (handlers) {
        // Supprimer les event listeners avec les bonnes références
        worker.removeEventListener('message', handlers.message);
        worker.removeEventListener('error', handlers.error);
        this.workerEventHandlers.delete(worker);
      }
      worker.terminate();
    });
    
    // Nettoyer toutes les collections
    this.workers = [];
    this.workerPool = [];
    this.activeJobs.clear();
    this.jobQueue = [];
    this.executionResults.clear();
    this.executionCallbacks.clear();
    this.workerEventHandlers.clear();
  }

  // Obtenir les statistiques d'exécution
  getExecutionStats() {
    return {
      totalWorkers: this.workers.length,
      activeWorkers: this.activeJobs.size,
      idleWorkers: this.workerPool.length,
      queuedJobs: this.jobQueue.length,
      completedJobs: this.executionResults.size
    };
  }

  // Optimiser le nombre de workers selon la charge
  optimizeWorkerCount(targetLoad: number = 0.8) {
    
    if (currentLoad > targetLoad && this.workers.length < this.maxWorkers) {
      // Ajouter des workers
        this.workers.length + 2, 
        this.maxWorkers
      );
      
      while (this.workers.length < newWorkerCount) {
        this.workers.push(worker);
        this.workerPool.push(worker);
      }
    } else if (currentLoad < targetLoad * 0.5 && this.workers.length > 2) {
      // Réduire les workers
      
      for (let __i = 0; i < removeCount; i++) {
        if (worker) {
          if (index > -1) {
            this.workers.splice(index, 1);
          }
          worker.terminate();
        }
      }
    }
  }
}

// Singleton pour une utilisation globale
export const workerExecutionEngine = new WorkerExecutionEngine();

// Hook React pour utiliser le moteur d'exécution
export function useWorkerExecution() {
    nodes: WorkflowNode[], 
    edges: WorkflowEdge[],
    initialData?: unknown
  ) => {
    return workerExecutionEngine.executeWorkflow(nodes, edges, initialData);
  };

    nodeId: string,
    nodeType: string,
    config: unknown,
    context: ExecutionContext
  ) => {
    return workerExecutionEngine.executeNode(nodeId, nodeType, config, context);
  };



  return {
    executeWorkflow,
    executeNode,
    getStats,
    optimizeWorkers
  };
}