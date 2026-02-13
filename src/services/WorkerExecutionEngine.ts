/* eslint-disable no-useless-escape */
// PERFORMANCE IMPROVEMENT #2: Web Workers for Parallel Execution
// Exécution parallèle des nœuds avec Web Workers pour améliorer les performances

import { WorkflowNode, WorkflowEdge } from '../types/workflow';
import { ExecutionContext, ExecutionResult } from '../architecture/ExecutionStrategy';
import { logger } from './SimpleLogger';

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
  private WorkerConstructor?: typeof Worker; // Stored for test mock support
  
  constructor(maxWorkers: number = navigator.hardwareConcurrency || 4) {
    this.maxWorkers = Math.min(maxWorkers, 8); // Cap à 8 workers max
    this.initializeWorkerPool();
  }

  // Initialiser le pool de workers
  private initializeWorkerPool() {
    // Detect environment
    const isTest = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
    const isDevelopment = typeof process !== 'undefined' &&
      (process.env?.NODE_ENV === 'development' ||
       (typeof window !== 'undefined' && window.location?.hostname === 'localhost'));

    // Skip initialization in development (but not in tests)
    if (!isTest && isDevelopment) {
      logger.debug('Worker pool lazy initialization mode (development)');
      return;
    }

    // Check if Web Workers are supported - use globalThis to support mocks in tests
    const WorkerCtor = typeof Worker !== 'undefined' ? Worker :
      (typeof globalThis !== 'undefined' ? (globalThis as Record<string, unknown>).Worker as typeof Worker : undefined);

    if (!WorkerCtor) {
      logger.warn('Web Workers not supported in this environment, using fallback mode');
      return;
    }

    // Store the constructor for use in createWorker
    this.WorkerConstructor = WorkerCtor;

    try {
      for (let i = 0; i < this.maxWorkers; i++) {
        try {
          const worker = this.createWorker();
          this.workers.push(worker);
          this.workerPool.push(worker);
        } catch (workerError) {
          // Log individual worker creation failure but continue
          logger.warn(`Failed to create worker ${i}:`, workerError);
        }
      }
    } catch (error) {
      logger.error('Error initializing worker pool:', error);
    }

    // Log the result
    if (this.workers.length === 0) {
      logger.warn('No workers could be initialized, will use synchronous fallback');
    } else {
      logger.debug(`Worker pool initialized with ${this.workers.length} workers`);
    }
  }

  // Créer un nouveau worker avec le code d'exécution
  private createWorker(): Worker {
    const workerCode = `
      // Worker code for node execution
      self.addEventListener('message', async function(e) {
        const { type, nodeId, data } = e.data;

        if (type === 'execute') {
          const { nodeType, config, context } = data;
          
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
            
            // Envoyer le résultat
            self.postMessage({
              type: 'result',
              nodeId,
              data: result,
              memoryUsage: 0
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
        const startTime = Date.now();
        try {
          // Retourner les données d'entrée transformées
          const result = {
            data: context.inputData,
            transformed: true,
            config: config
          };

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
        const startTime = Date.now();
        const condition = (config && typeof config === 'object' && 'condition' in config)
          ? String(config.condition)
          : 'true';

        try {
          // Évaluation sécurisée des conditions
          let result = true;

          // Vérification de sécurité
          /* eslint-disable no-useless-escape */
          const dangerousPatterns = [
            /eval\\s*\\(/i,
            /Function\\s*\\(/i,
            /import\\s*\\(/i,
            /require\\s*\\(/i,
            /process\\./i,
            /global\\./i,
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
            const parts = condition.split(/===|==/);
            if (parts.length === 2 && parts[0] && parts[1]) {
              const left = parts[0].trim();
              const right = parts[1].trim();

              // Évaluer le côté gauche
              let leftValue = context.inputData;
              if (left.startsWith('$.')) {
                const path = left.substring(2).split('.');
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
              let rightValue: unknown = right;
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
        const startTime = Date.now();
        const mergeStrategy = (config && typeof config === 'object' && 'strategy' in config)
          ? String(config.strategy)
          : 'concat';
        const inputs = context.inputData || [];

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
        const startTime = Date.now();
        const items = Array.isArray(context.inputData) ? context.inputData : [context.inputData];
        const maxIterations = (config && typeof config === 'object' && 'maxIterations' in config)
          ? Number(config.maxIterations)
          : 1000;
        const results = [];

        try {
          for (let i = 0; i < Math.min(items.length, maxIterations); i++) {
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
        const startTime = Date.now();

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
      // Use stored constructor or fall back to global Worker
      const WorkerCtor = this.WorkerConstructor ||
        (typeof Worker !== 'undefined' ? Worker : undefined) ||
        (typeof globalThis !== 'undefined' ? (globalThis as Record<string, unknown>).Worker as typeof Worker : undefined);

      if (!WorkerCtor) {
        throw new Error('Worker constructor not available');
      }

      // Get Blob and URL constructors (may be mocked in tests)
      const BlobCtor = typeof Blob !== 'undefined' ? Blob :
        (typeof globalThis !== 'undefined' ? (globalThis as Record<string, unknown>).Blob as typeof Blob : undefined);
      const URLObj = typeof URL !== 'undefined' ? URL :
        (typeof globalThis !== 'undefined' ? (globalThis as Record<string, unknown>).URL as typeof URL : undefined);

      if (!BlobCtor || !URLObj) {
        throw new Error('Blob or URL constructor not available');
      }

      // Créer le worker avec le code inline
      const workerBlob = new BlobCtor([workerCode], { type: 'application/javascript' });
      const workerUrl = URLObj.createObjectURL(workerBlob);
      const worker = new WorkerCtor(workerUrl);

      // Créer les gestionnaires d'événements liés
      const messageHandler = (event: MessageEvent) => this.handleWorkerMessage(event);
      const errorHandler = (event: ErrorEvent) => this.handleWorkerError(event);

      // Stocker les gestionnaires pour pouvoir les supprimer plus tard
      this.workerEventHandlers.set(worker, { message: messageHandler, error: errorHandler });

      // Configurer les gestionnaires d'événements
      worker.addEventListener('message', messageHandler);
      worker.addEventListener('error', errorHandler);

      // Libérer l'URL après la création du worker
      URLObj.revokeObjectURL(workerUrl);

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

      const { type, nodeId, data, error, progress, memoryUsage } = event.data;

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
            this.handleExecutionResult(nodeId, data as ExecutionResult);
          } else {
            logger.error(`Worker result message missing data for node: ${nodeId}`);
          }
          break;
        case 'error': {
          const errorMsg = typeof error === 'string' ? error : 'Unknown error';
          this.handleExecutionError(nodeId, errorMsg);
          break;
        }
        case 'progress': {
          const progressValue = typeof progress === 'number' ? progress : 0;
          this.handleExecutionProgress(nodeId, progressValue);
          break;
        }
        case 'memory': {
          const memoryValue = typeof memoryUsage === 'number' ? memoryUsage : 0;
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
    // Only log as error if there's an active job
    const hasActiveJobs = this.activeJobs.size > 0;

    // Find the job from active jobs using the worker instance
    const worker = error.target as Worker;
    let jobEntry: { worker: Worker; job: NodeExecutionJob } | undefined;

    for (const [, entry] of Array.from(this.activeJobs.entries())) {
      if (entry.worker === worker) {
        jobEntry = entry;
        break;
      }
    }

    // Récupérer le job associé et le remettre dans la queue
    if (jobEntry) {
      logger.error('Worker error during job execution:', error);
      logger.info(`Re-queuing failed job for node: ${jobEntry.job.nodeId}`);

      // Increment retry count if it exists in job metadata
      const currentAttempt = (jobEntry.job.context.executionMetadata?.currentAttempt as number) || 0;
      const maxRetries = (jobEntry.job.context.executionMetadata?.maxRetries as number) || 3;

      if (currentAttempt < maxRetries) {
        if (!jobEntry.job.context.executionMetadata) {
          jobEntry.job.context.executionMetadata = {
            startTime: Date.now(),
            timeout: 30000,
            maxRetries: 3,
            currentAttempt: 1
          };
        }
        (jobEntry.job.context.executionMetadata as Record<string, unknown>).currentAttempt = currentAttempt + 1;
        this.jobQueue.unshift(jobEntry.job);
      } else {
        // Max retries reached, mark as failed
        this.handleExecutionError(jobEntry.job.nodeId, `Worker error after ${maxRetries} attempts: ${error.message}`);
      }

      this.activeJobs.delete(jobEntry.job.nodeId);
      this.returnWorkerToPool(jobEntry.worker);
      this.processQueue();
    } else {
      // This can happen during initialization when no jobs are active
      logger.debug('Worker error occurred with no active job (may happen during initialization)');
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
      const dependencies = this.analyzeDependencies(nodes, edges);

      // Créer les jobs d'exécution
      const jobs = this.createExecutionJobs(nodes, edges, dependencies, initialData);

      // Ajouter les jobs à la queue
      this.jobQueue.push(...jobs);
      
      // Démarrer le traitement
      this.processQueue();
      
      // Attendre que tous les nœuds soient exécutés avec timeout
      return new Promise((resolve, reject) => {
        let checkInterval: ReturnType<typeof setInterval> | null = null;
        let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

        const cleanup = () => {
          if (checkInterval) {
            clearInterval(checkInterval);
            checkInterval = null;
          }
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
            timeoutHandle = null;
          }
        };

        const checkCompletion = () => {
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
    const dependencies = new Map<string, string[]>();

    nodes.forEach(node => {
      const deps = edges
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
        const job = this.findExecutableJob();
        if (!job) break;

        const worker = this.workerPool.pop();
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
    const index = this.jobQueue.findIndex(job =>
      job.dependencies.every(dep => this.executionResults.has(dep))
    );

    if (index === -1) return null;

    const removed = this.jobQueue.splice(index, 1);
    return removed.length > 0 ? removed[0] : null;
  }

  // Exécuter un job sur un worker
  private executeJob(worker: Worker, job: NodeExecutionJob) {
    // Mettre à jour le contexte avec les résultats des dépendances
    const previousResults: Record<string, unknown> = {};
    job.dependencies.forEach(dep => {
      const result = this.executionResults.get(dep);
      if (result?.success) {
        previousResults[dep] = result.data;
      }
    });

    // Calculer les données d'entrée basées sur les dépendances
    const inputData = this.calculateInputData(job, previousResults);

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
      const depId = job.dependencies[0];
      return previousResults[depId];
    }
    
    // Pour plusieurs dépendances, retourner un tableau
    return job.dependencies.map(dep => previousResults[dep]);
  }

  // Gérer le résultat d'exécution
  private handleExecutionResult(nodeId: string, result: ExecutionResult) {
    this.executionResults.set(nodeId, result);

    // Libérer le worker
    const activeJob = this.activeJobs.get(nodeId);
    if (activeJob) {
      this.activeJobs.delete(nodeId);
      this.returnWorkerToPool(activeJob.worker);
    }

    // Appeler le callback s'il existe
    const callback = this.executionCallbacks.get(nodeId);
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
    const event = new CustomEvent('workflow-node-progress', {
      detail: { nodeId, progress }
    });
    window.dispatchEvent(event);
  }

  // Gérer les mises à jour mémoire
  private handleMemoryUpdate(nodeId: string, memoryUsage: number) {
    // Émettre un événement de mémoire
    const event = new CustomEvent('workflow-node-memory', {
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
        const wrappedResolve = (result: ExecutionResult) => {
          // Cleanup is handled externally to break circular reference
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
            timeoutHandle = null;
          }
          this.executionCallbacks.delete(nodeId);
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
    // Terminer tous les workers et supprimer les event listeners
    this.workers.forEach(worker => {
      // Récupérer les gestionnaires stockés
      const handlers = this.workerEventHandlers.get(worker);
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
    const currentLoad = this.calculateCurrentLoad();

    if (currentLoad > targetLoad && this.workers.length < this.maxWorkers) {
      // Ajouter des workers
      const newWorkerCount = Math.min(
        this.workers.length + 2,
        this.maxWorkers
      );

      while (this.workers.length < newWorkerCount) {
        const worker = this.createWorker();
        this.workers.push(worker);
        this.workerPool.push(worker);
      }
    } else if (currentLoad < targetLoad * 0.5 && this.workers.length > 2) {
      // Réduire les workers
      const removeCount = Math.floor(this.workers.length * 0.25);

      for (let i = 0; i < removeCount; i++) {
        const worker = this.workerPool.pop();
        if (worker) {
          const index = this.workers.indexOf(worker);
          if (index > -1) {
            this.workers.splice(index, 1);
          }
          worker.terminate();
        }
      }
    }
  }

  private calculateCurrentLoad(): number {
    const busyWorkers = this.workers.filter(w => !this.workerPool.includes(w)).length;
    return this.workers.length > 0 ? busyWorkers / this.workers.length : 0;
  }
}

// Singleton pour une utilisation globale
export const workerExecutionEngine = new WorkerExecutionEngine();

// Hook React pour utiliser le moteur d'exécution
export function useWorkerExecution() {
  const executeWorkflow = (
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    initialData?: unknown
  ) => {
    return workerExecutionEngine.executeWorkflow(nodes, edges, initialData);
  };

  const executeNode = (
    nodeId: string,
    nodeType: string,
    config: unknown,
    context: ExecutionContext
  ) => {
    return workerExecutionEngine.executeNode(nodeId, nodeType, config, context);
  };

  const getStats = () => {
    return workerExecutionEngine.getExecutionStats();
  };

  const optimizeWorkers = (targetLoad?: number) => {
    return workerExecutionEngine.optimizeWorkerCount(targetLoad);
  };

  return {
    executeWorkflow,
    executeNode,
    getStats,
    optimizeWorkers
  };
}