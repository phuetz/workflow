// AI-POWERED WORKFLOW SERVICE: Intelligence artificielle pour workflows
/* eslint-disable @typescript-eslint/no-unused-vars */

import { WorkflowNode, WorkflowEdge } from '../types/workflow';
import { useWorkflowStore } from '../store/workflowStore';
import { logger } from './SimpleLogger';
import { ConfigHelpers } from '../config/environment';

export interface SuggestedNode {
  nodeType: string;
  confidence: number;
  reason: string;
  position: { x: number; y: number };
  config?: unknown;
}

export interface WorkflowPattern {
  id: string;
  name: string;
  description: string;
  frequency: number;
  nodes: string[];
  edges: Array<{ source: string; target: string }>;
}

export interface OptimizationSuggestion {
  type: 'parallel' | 'cache' | 'remove' | 'replace' | 'reorder';
  nodeIds: string[];
  description: string;
  impact: {
    performance: number; // -100 to +100
    reliability: number;
    cost: number;
  };
}

export interface AnomalyDetection {
  nodeId: string;
  type: 'performance' | 'error_rate' | 'unusual_data' | 'timeout';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestion: string;
}

class AIWorkflowService {
  private executionHistory: Map<string, unknown[]> = new Map();
  private patternCache: Map<string, WorkflowPattern> = new Map();
  private nodeSequenceModel: Map<string, Map<string, number>> = new Map();
  private performanceBaseline: Map<string, { avg: number; std: number }> = new Map();
  private readonly MAX_HISTORY_SIZE = 1000; // Limite pour éviter les fuites mémoire
  private readonly MAX_CACHE_SIZE = 100; // Limite pour le cache de patterns
  private baselineUpdateQueue: Map<string, unknown[]> = new Map(); // Queue pour éviter les race conditions

  // AI: Prédiction des prochains nœuds
  predictNextNodes(currentNodes: WorkflowNode[], currentEdges: WorkflowEdge[]): SuggestedNode[] {
    try {
      const suggestions: SuggestedNode[] = [];
      
      if (!currentNodes || currentNodes.length === 0) {
        // Suggestions pour commencer un workflow
        return this.getSuggestionsForEmptyWorkflow();
      }

      // Analyser le dernier nœud ajouté
      const lastNode = currentNodes[currentNodes.length - 1];
      if (!lastNode || !lastNode.data) {
        logger.error('Invalid last node in predictNextNodes');
        return [];
      }

      const lastNodeType = lastNode.data.type;

      // Obtenir les prédictions basées sur l'historique
      const predictions = this.getPredictionsFromHistory(lastNodeType);

      // Analyser le contexte du workflow
      const context = this.analyzeWorkflowContext(currentNodes, currentEdges);

      // Générer des suggestions
      predictions.forEach((prediction, nodeType) => {
        try {
          const confidence = this.calculateConfidence(prediction, context, nodeType);

          if (confidence > 0.3) { // Seuil de confiance
            suggestions.push({
              nodeType,
              confidence,
              reason: this.generateReason(nodeType, lastNodeType, context),
              position: this.calculateOptimalPosition(lastNode, currentNodes),
              config: this.generateDefaultConfig(nodeType, context)
            });
          }
        } catch (error) {
          logger.error('Error generating suggestion for nodeType ${nodeType}:', error);
        }
      });

      // Ajouter des suggestions basées sur les patterns détectés
      try {
        const patternSuggestions = this.getPatternBasedSuggestions(currentNodes, currentEdges);
        suggestions.push(...patternSuggestions);
      } catch (error) {
        logger.error('Error getting pattern-based suggestions:', error);
      }

      // Trier par confiance décroissante
      return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
    } catch (error) {
      logger.error('Error in predictNextNodes:', error);
      return [];
    }
  }

  // AI: Optimisation automatique du workflow
  optimizeWorkflow(nodes: WorkflowNode[], edges: WorkflowEdge[]): OptimizationSuggestion[] {
    try {
      if (!nodes || !edges) {
        logger.error('Invalid input to optimizeWorkflow');
        return [];
      }
      
      const suggestions: OptimizationSuggestion[] = [];

      // 1. Détecter les nœuds qui peuvent être parallélisés
      try {
        const parallelizableNodes = this.findParallelizableNodes(nodes, edges);
        if (parallelizableNodes.length > 0) {
          suggestions.push({
            type: 'parallel',
            nodeIds: parallelizableNodes.map(n => n.id),
            description: 'Ces nœuds peuvent être exécutés en parallèle pour améliorer les performances',
            impact: {
              performance: 40,
              reliability: 0,
              cost: -10
            }
          });
        }
      } catch (error) {
        logger.error('Error finding parallelizable nodes:', error);
      }

      // 2. Identifier les nœuds dont les résultats peuvent être mis en cache
      try {
        const cacheableNodes = this.findCacheableNodes(nodes);
        cacheableNodes.forEach(node => {
          suggestions.push({
            type: 'cache',
            nodeIds: [node.id],
            description: `Le nœud "${node.data.label || node.id}" produit des résultats déterministes qui peuvent être mis en cache`,
            impact: {
              performance: 30,
              reliability: 5,
              cost: -20
            }
          });
        });
      } catch (error) {
        logger.error('Error finding cacheable nodes:', error);
      }

      // 3. Détecter les nœuds redondants
      try {
        const redundantNodes = this.findRedundantNodes(nodes, edges);
        redundantNodes.forEach(node => {
          suggestions.push({
            type: 'remove',
            nodeIds: [node.id],
            description: `Le nœud "${node.data.label || node.id}" semble redondant et peut être supprimé`,
            impact: {
              performance: 20,
              reliability: 0,
              cost: -15
            }
          });
        });
      } catch (error) {
        logger.error('Error finding redundant nodes:', error);
      }

      // 4. Suggérer des remplacements plus efficaces
      try {
        const replaceablePairs = this.findReplaceableNodePairs(nodes);
        replaceablePairs.forEach(pair => {
          suggestions.push({
            type: 'replace',
            nodeIds: (pair as { oldNodes: WorkflowNode[]; newNodeType: string }).oldNodes.map(n => n.id),
            description: `Remplacer ${(pair as { oldNodes: WorkflowNode[] }).oldNodes.length} nœuds par un seul nœud "${(pair as { newNodeType: string }).newNodeType}"`,
            impact: {
              performance: 25,
              reliability: 10,
              cost: -5
            }
          });
        });
      } catch (error) {
        logger.error('Error finding replaceable node pairs:', error);
      }

      // 5. Optimiser l'ordre d'exécution
      try {
        const reorderSuggestion = this.suggestOptimalOrder(nodes, edges);
        if (reorderSuggestion) {
          suggestions.push(reorderSuggestion);
        }
      } catch (error) {
        logger.error('Error suggesting optimal order:', error);
      }

      return suggestions;
    } catch (error) {
      logger.error('Error in optimizeWorkflow:', error);
      return [];
    }
  }

  // AI: Détection de patterns dans l'historique
  detectPatterns(workflows: unknown[]): WorkflowPattern[] {
    const patterns: WorkflowPattern[] = [];
    const sequenceMap = new Map<string, number>();

    // Analyser toutes les séquences de nœuds
    workflows.forEach(workflow => {
      const sequences = this.extractNodeSequences(
        (workflow as { nodes?: WorkflowNode[] }).nodes || [],
        (workflow as { edges?: WorkflowEdge[] }).edges || []
      );
      sequences.forEach(seq => {
        const key = seq.join('->');
        sequenceMap.set(key, (sequenceMap.get(key) || 0) + 1);
      });
    });

    // Identifier les patterns fréquents
    sequenceMap.forEach((count, sequence) => {
      if (count >= 3) { // Pattern trouvé au moins 3 fois
        const nodes = sequence.split('->');
        patterns.push({
          id: `pattern-${patterns.length + 1}`,
          name: this.generatePatternName(nodes),
          description: this.generatePatternDescription(nodes),
          frequency: count,
          nodes,
          edges: this.generatePatternEdges(nodes)
        });
      }
    });

    // Mettre en cache les patterns avec limite (éviter les race conditions)
    patterns.forEach(p => {
      // Utiliser une approche atomique pour la gestion du cache
      const currentSize = this.patternCache.size;
      if (currentSize >= this.MAX_CACHE_SIZE) {
        // Supprimer le plus ancien pattern
        const firstKey = this.patternCache.keys().next().value;
        if (firstKey && this.patternCache.has(firstKey)) {
          this.patternCache.delete(firstKey);
        }
      }
      // Vérifier à nouveau avant d'ajouter
      if (this.patternCache.size < this.MAX_CACHE_SIZE) {
        this.patternCache.set(p.id, p);
      }
    });

    return patterns.sort((a, b) => b.frequency - a.frequency);
  }

  // AI: Détection d'anomalies en temps réel
  detectAnomalies(
    nodeId: string, 
    executionData: unknown, 
    historicalData: unknown[]
  ): AnomalyDetection[] {
    try {
      if (!nodeId || !executionData) {
        logger.error('Invalid input to detectAnomalies');
        return [];
      }
      
      const anomalies: AnomalyDetection[] = [];

      // 1. Anomalie de performance
      try {
        const performanceAnomaly = this.detectPerformanceAnomaly(nodeId, executionData, historicalData);
        if (performanceAnomaly) {
          anomalies.push(performanceAnomaly);
        }
      } catch (error) {
        logger.error('Error detecting performance anomaly:', error);
      }

      // 2. Taux d'erreur anormal
      try {
        const errorRateAnomaly = this.detectErrorRateAnomaly(nodeId, executionData, historicalData);
        if (errorRateAnomaly) {
          anomalies.push(errorRateAnomaly);
        }
      } catch (error) {
        logger.error('Error detecting error rate anomaly:', error);
      }

      // 3. Données inhabituelles
      try {
        const dataAnomaly = this.detectDataAnomaly(nodeId, executionData, historicalData);
        if (dataAnomaly) {
          anomalies.push(dataAnomaly);
        }
      } catch (error) {
        logger.error('Error detecting data anomaly:', error);
      }

      // 4. Timeouts fréquents
      try {
        const timeoutAnomaly = this.detectTimeoutAnomaly(nodeId, executionData, historicalData);
        if (timeoutAnomaly) {
          anomalies.push(timeoutAnomaly);
        }
      } catch (error) {
        logger.error('Error detecting timeout anomaly:', error);
      }

      return anomalies;
    } catch (error) {
      logger.error('Error in detectAnomalies:', error);
      return [];
    }
  }

  // Méthodes privées pour l'IA

  private getSuggestionsForEmptyWorkflow(): SuggestedNode[] {
    return [
      {
        nodeType: 'trigger',
        confidence: 0.95,
        reason: 'Tout workflow commence généralement par un déclencheur',
        position: { x: 250, y: 250 },
        config: { schedule: '0 9 * * *' }
      },
      {
        nodeType: 'webhook',
        confidence: 0.85,
        reason: 'Les webhooks sont un point de départ populaire pour les intégrations',
        position: { x: 250, y: 250 },
        config: {}
      },
      {
        nodeType: 'httpRequest',
        confidence: 0.75,
        reason: 'Récupérer des données depuis une API est souvent la première étape',
        position: { x: 250, y: 250 },
        config: { method: 'GET' }
      }
    ];
  }

  private getPredictionsFromHistory(lastNodeType: string): Map<string, number> {
    const predictions = new Map<string, number>();

    // Utiliser le modèle de séquence entraîné
    const nodeModel = this.nodeSequenceModel.get(lastNodeType);
    if (nodeModel) {
      nodeModel.forEach((probability, nextNode) => {
        predictions.set(nextNode, probability);
      });
    }

    // Ajouter des prédictions basées sur des règles métier
    switch (lastNodeType) {
      case 'httpRequest':
        predictions.set('transform', 0.8);
        predictions.set('condition', 0.6);
        predictions.set('database', 0.4);
        break;
      case 'database':
        predictions.set('transform', 0.7);
        predictions.set('emailSend', 0.5);
        predictions.set('slack', 0.4);
        break;
      case 'transform':
        predictions.set('condition', 0.6);
        predictions.set('database', 0.5);
        predictions.set('httpRequest', 0.4);
        break;
      case 'condition':
        predictions.set('emailSend', 0.6);
        predictions.set('slack', 0.5);
        predictions.set('database', 0.4);
        break;
    }

    return predictions;
  }

  private analyzeWorkflowContext(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
    return {
      hasDatabase: nodes.some(n => n.data.type === 'database'),
      hasHttpRequest: nodes.some(n => n.data.type === 'httpRequest'),
      hasCondition: nodes.some(n => n.data.type === 'condition'),
      hasLoop: this.detectLoop(nodes, edges),
      nodeCount: nodes.length,
      avgDegree: edges.length / Math.max(nodes.length, 1),
      mainFlow: this.identifyMainFlow(nodes, edges)
    };
  }

  private calculateConfidence(
    baseProbability: number,
    context: { hasErrorHandler?: boolean; hasHttpRequest?: boolean; hasDatabase?: boolean; nodeCount?: number; hasCondition?: boolean; hasLoop?: boolean },
    nodeType: string
  ): number {
    let confidence = baseProbability;

    // Ajuster selon le contexte
    if (nodeType === 'errorHandler' && !context.hasErrorHandler) {
      confidence += 0.2; // Boost pour la gestion d'erreurs manquante
    }

    if (nodeType === 'database' && context.hasHttpRequest && !context.hasDatabase) {
      confidence += 0.15; // Boost si on a des données mais pas de stockage
    }

    if (nodeType === 'condition' && (context.nodeCount || 0) > 5 && !context.hasCondition) {
      confidence += 0.1; // Boost pour ajouter de la logique
    }

    // Pénaliser si le nœud créerait une boucle indésirable
    if (this.wouldCreateLoop(nodeType, context)) {
      confidence -= 0.3;
    }

    return Math.min(Math.max(confidence, 0), 1);
  }

  private generateReason(nodeType: string, lastNodeType: string, _context: unknown): string {
    const reasons: Record<string, string> = {
      transform: `Après ${lastNodeType}, il est courant de transformer les données`,
      condition: 'Ajouter une logique conditionnelle pour router le flux',
      database: 'Sauvegarder les données pour une utilisation future',
      emailSend: 'Notifier les utilisateurs des résultats',
      slack: 'Envoyer une notification à l\'équipe',
      errorHandler: 'Gérer les erreurs potentielles dans le workflow',
      merge: 'Combiner plusieurs branches du workflow',
      loop: 'Traiter une liste d\'éléments'
    };

    return reasons[nodeType] || `${nodeType} est souvent utilisé après ${lastNodeType}`;
  }

  private calculateOptimalPosition(lastNode: WorkflowNode, allNodes: WorkflowNode[]) {
    // Position intelligente basée sur le layout existant
    const baseX = lastNode.position.x + 200;
    const baseY = lastNode.position.y;

    // Éviter les chevauchements
    const occupied = allNodes.some(n =>
      Math.abs(n.position.x - baseX) < 100 &&
      Math.abs(n.position.y - baseY) < 100
    );

    if (occupied) {
      return {
        x: baseX,
        y: baseY + 150
      };
    }

    return { x: baseX, y: baseY };
  }

  private generateDefaultConfig(nodeType: string, context: { hasHttpRequest?: boolean }): unknown {
    const configs: Record<string, unknown> = {
      httpRequest: {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        timeout: ConfigHelpers.getTimeout('aiWorkflow')
      },
      database: {
        operation: context.hasHttpRequest ? 'insert' : 'select',
        table: 'workflow_data'
      },
      transform: {
        expression: '{\n  "result": $.data\n}'
      },
      condition: {
        condition: '$.status === "success"'
      },
      emailSend: {
        subject: 'Workflow Notification',
        template: 'default'
      }
    };

    return configs[nodeType] || {};
  }

  private findParallelizableNodes(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
    const parallelizable: WorkflowNode[] = [];

    nodes.forEach(node => {
      const deps = this.getDependencies(node.id, edges);
      const siblings = nodes.filter(n => {
        const nDeps = this.getDependencies(n.id, edges);
        return n.id !== node.id &&
               deps.length === nDeps.length &&
               deps.every(d => nDeps.includes(d));
      });

      if (siblings.length > 0 && !parallelizable.includes(node)) {
        parallelizable.push(node, ...siblings);
      }
    });

    return Array.from(new Set(parallelizable));
  }

  private getDependencies(nodeId: string, edges: WorkflowEdge[]): string[] {
    return edges.filter(e => e.target === nodeId).map(e => e.source);
  }

  private findCacheableNodes(nodes: WorkflowNode[]): WorkflowNode[] {
    const cacheableTypes = ['httpRequest', 'transform', 'database'];
    return nodes.filter(node => {
      // Nœuds avec résultats déterministes
      return cacheableTypes.includes(node.data.type) &&
             !this.hasSideEffects(node);
    });
  }

  private findRedundantNodes(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
    const redundant: WorkflowNode[] = [];

    nodes.forEach(node => {
      // Nœuds de transformation consécutifs qui pourraient être fusionnés
      const outputs = edges.filter(e => e.source === node.id);
      if (outputs.length === 1 && outputs[0]) {
        const nextNode = nodes.find(n => n.id === outputs[0].target);
        if (nextNode && node.data.type === 'transform' && nextNode.data.type === 'transform') {
          redundant.push(node);
        }
      }
    });

    return redundant;
  }

  private findReplaceableNodePairs(nodes: WorkflowNode[]): unknown[] {
    const pairs: unknown[] = [];

    // Détecter les patterns qui peuvent être remplacés par un seul nœud
    for (let i = 0; i < nodes.length - 1; i++) {
      if (nodes[i].data.type === 'httpRequest' && nodes[i + 1].data.type === 'transform') {
        pairs.push({
          oldNodes: [nodes[i], nodes[i + 1]],
          newNodeType: 'httpRequestWithTransform'
        });
      }
    }

    return pairs;
  }

  private suggestOptimalOrder(nodes: WorkflowNode[], edges: WorkflowEdge[]): OptimizationSuggestion | null {
    // Analyser si l'ordre actuel est optimal pour les performances
    const criticalPath = this.findCriticalPath(nodes, edges);
    const optimizedPath = this.optimizePath(criticalPath);

    if (JSON.stringify(criticalPath) !== JSON.stringify(optimizedPath)) {
      return {
        type: 'reorder',
        nodeIds: optimizedPath.map(n => n.id),
        description: 'Réorganiser les nœuds pour optimiser le chemin critique',
        impact: {
          performance: 35,
          reliability: 5,
          cost: 0
        }
      };
    }

    return null;
  }

  private detectPerformanceAnomaly(
    nodeId: string,
    executionData: unknown,
    historicalData: unknown[]
  ): AnomalyDetection | null {
    const baseline = this.performanceBaseline.get(nodeId);
    if (!baseline || historicalData.length < 10) return null;

    const currentDuration = (executionData as { duration?: number }).duration || 0;
    const zScore = (currentDuration - baseline.avg) / Math.max(baseline.std, 1);

    if (Math.abs(zScore) > 3) { // 3 écarts-types
      return {
        nodeId,
        type: 'performance',
        severity: Math.abs(zScore) > 4 ? 'critical' : 'high',
        description: `Performance ${zScore > 0 ? 'dégradée' : 'améliorée'} de ${Math.abs(zScore).toFixed(1)}σ`,
        suggestion: zScore > 0
          ? 'Vérifier les ressources système et optimiser la configuration'
          : 'Performance exceptionnelle détectée, considérer la mise à jour de la baseline'
      };
    }

    return null;
  }

  private detectErrorRateAnomaly(
    nodeId: string,
    executionData: unknown,
    historicalData: unknown[]
  ): AnomalyDetection | null {
    const hasError = (executionData as { error?: boolean }).error || false;
    const errorRate = hasError ? 1 : 0;
    const historicalErrorRate = historicalData.filter(d => (d as { error?: boolean }).error).length / Math.max(historicalData.length, 1);

    if (errorRate > historicalErrorRate * 2 && errorRate > 0.1) {
      return {
        nodeId,
        type: 'error_rate',
        severity: errorRate > 0.5 ? 'critical' : 'high',
        description: `Taux d'erreur anormal: ${(errorRate * 100).toFixed(1)}%`,
        suggestion: 'Examiner les logs récents et vérifier les dépendances externes'
      };
    }

    return null;
  }

  private detectDataAnomaly(
    nodeId: string,
    executionData: unknown,
    historicalData: unknown[]
  ): AnomalyDetection | null {
    // Détection simple basée sur la taille des données
    const dataSize = JSON.stringify(executionData).length;
    let totalSize = 0;
    historicalData.forEach((d: unknown) => {
      totalSize += JSON.stringify(d).length;
    });
    const avgSize: number = totalSize / Math.max(historicalData.length, 1);

    if (dataSize > avgSize * 5 || dataSize < avgSize * 0.1) {
      return {
        nodeId,
        type: 'unusual_data',
        severity: 'medium',
        description: `Taille de données inhabituelle: ${dataSize} octets (moyenne: ${avgSize.toFixed(0)})`,
        suggestion: 'Vérifier la source de données et les transformations appliquées'
      };
    }

    return null;
  }

  private detectTimeoutAnomaly(
    nodeId: string,
    executionData: unknown,
    historicalData: unknown[]
  ): AnomalyDetection | null {
    const recentTimeouts = historicalData.slice(-10).filter(d => (d as { timeout?: boolean }).timeout).length;

    if (recentTimeouts >= 3) {
      return {
        nodeId,
        type: 'timeout',
        severity: recentTimeouts >= 5 ? 'critical' : 'high',
        description: `${recentTimeouts} timeouts dans les 10 dernières exécutions`,
        suggestion: 'Augmenter le délai d\'expiration ou optimiser l\'opération'
      };
    }

    return null;
  }

  // Méthodes utilitaires

  private extractNodeSequences(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[][] {
    const sequences: string[][] = [];
    const visited = new Set<string>();

    const dfs = (nodeId: string, currentPath: string[]) => {
      if (visited.has(nodeId) || currentPath.length > 10) return;

      visited.add(nodeId);
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;

      currentPath.push(node.data.type);

      const outgoing = edges.filter(e => e.source === nodeId);
      if (outgoing.length === 0 && currentPath.length >= 2) {
        sequences.push([...currentPath]);
      }

      outgoing.forEach(edge => {
        dfs(edge.target, [...currentPath]);
      });
    };

    // Trouver les nœuds de départ
    const startNodes = nodes.filter(n =>
      !edges.some(e => e.target === n.id)
    );

    startNodes.forEach(node => {
      dfs(node.id, []);
    });

    return sequences;
  }

  private generatePatternName(nodes: string[]): string {
    const key = nodes.join('-');
    const names: Record<string, string> = {
      'httpRequest-transform-database': 'API to Database',
      'trigger-httpRequest-condition': 'Conditional API Call',
      'database-transform-emailSend': 'Database Report Email',
      'webhook-transform-slack': 'Webhook to Slack'
    };

    if (names[key]) return names[key];
    
    // Safely handle empty arrays
    if (nodes.length === 0) return 'Empty Pattern';
    if (nodes.length === 1) return `Pattern ${nodes[0]}`;
    
    return `Pattern ${nodes[0]} → ${nodes[nodes.length - 1]}`;
  }

  private generatePatternDescription(nodes: string[]): string {
    return `Séquence de ${nodes.length} nœuds couramment utilisée`;
  }

  private generatePatternEdges(nodes: string[]): Array<{ source: string; target: string }> {
    const edges: Array<{ source: string; target: string }> = [];

    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({
        source: nodes[i],
        target: nodes[i + 1]
      });
    }

    return edges;
  }

  private getPatternBasedSuggestions(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): SuggestedNode[] {
    const suggestions: SuggestedNode[] = [];
    const currentSequence = this.extractCurrentSequence(nodes, edges);

    this.patternCache.forEach(pattern => {
      if (this.matchesPatternPrefix(currentSequence, pattern.nodes)) {
        const nextInPattern = pattern.nodes[currentSequence.length];
        if (nextInPattern) {
          suggestions.push({
            nodeType: nextInPattern,
            confidence: 0.7 + (pattern.frequency / 100),
            reason: `Fait partie du pattern populaire "${pattern.name}"`,
            position: this.calculateOptimalPosition(nodes[nodes.length - 1], nodes),
            config: {}
          });
        }
      }
    });

    return suggestions;
  }

  private detectLoop(nodes: WorkflowNode[], edges: WorkflowEdge[]): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasLoop = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoing = edges.filter(e => e.source === nodeId);
      for (const edge of outgoing) {
        if (!visited.has(edge.target)) {
          if (hasLoop(edge.target)) return true;
        } else if (recursionStack.has(edge.target)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (hasLoop(node.id)) return true;
      }
    }

    return false;
  }

  private identifyMainFlow(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
    // Trouver le chemin le plus long dans le graphe
    const paths: string[][] = [];
    const visited = new Set<string>();
    const startNodes = nodes.filter(n => !edges.some(e => e.target === n.id));
    const edgeMap = new Map<string, WorkflowEdge[]>();

    edges.forEach(edge => {
      if (!edgeMap.has(edge.source)) {
        edgeMap.set(edge.source, []);
      }
      edgeMap.get(edge.source)!.push(edge);
    });

    const dfs = (nodeId: string, currentPath: string[]) => {
      currentPath.push(nodeId);
      visited.add(nodeId);

      const outgoing = edgeMap.get(nodeId) || [];

      if (outgoing.length === 0) {
        paths.push([...currentPath]);
      } else {
        outgoing.forEach(edge => {
          if (!visited.has(edge.target)) {
            dfs(edge.target, [...currentPath]);
          }
        });
      }
    };

    startNodes.forEach(node => dfs(node.id, []));

    return paths.reduce((longest, current) => 
      current.length > longest.length ? current : longest, []
    );
  }

  private wouldCreateLoop(nodeType: string, context: unknown): boolean {
    // Logique simple pour éviter les boucles indésirables
    return nodeType === 'loop' && (context as { hasLoop?: boolean }).hasLoop;
  }

  private buildDependencyGraph(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): Map<string, string[]> {
    const dependencies = new Map<string, string[]>();

    nodes.forEach(node => {
      const deps = edges
        .filter(e => e.target === node.id)
        .map(e => e.source);
      dependencies.set(node.id, deps);
    });

    return dependencies;
  }

  private hasSideEffects(node: WorkflowNode): boolean {
    const sideEffectTypes = ['database', 'emailSend', 'slack', 'httpRequest'];
    return sideEffectTypes.includes(node.data.type);
  }

  private findCriticalPath(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
    // Algorithme simplifié pour trouver le chemin critique
    const startNodes = nodes.filter(n => !edges.some(e => e.target === n.id));
    const edgeMap = new Map<string, WorkflowEdge[]>();
    const nodeMap = new Map<string, WorkflowNode>();

    nodes.forEach(n => nodeMap.set(n.id, n));
    edges.forEach(edge => {
      if (!edgeMap.has(edge.source)) {
        edgeMap.set(edge.source, []);
      }
      edgeMap.get(edge.source)!.push(edge);
    });

    let longestPath: WorkflowNode[] = [];

    const dfs = (nodeId: string, currentPath: WorkflowNode[]) => {
      const node = nodeMap.get(nodeId);
      if (!node) return;

      currentPath.push(node);

      const outgoing = edgeMap.get(nodeId) || [];

      if (outgoing.length === 0) {
        if (currentPath.length > longestPath.length) {
          longestPath = [...currentPath];
        }
      } else {
        outgoing.forEach(edge => {
          dfs(edge.target, [...currentPath]);
        });
      }
    };

    startNodes.forEach(node => dfs(node.id, []));
    
    return longestPath;
  }

  private optimizePath(path: WorkflowNode[]): WorkflowNode[] {
    // Réorganiser pour mettre les opérations coûteuses en dernier si possible
    const costlyOperations = ['database', 'httpRequest', 'transform'];
    const aCostly = (a: WorkflowNode) => costlyOperations.includes(a.data.type) ? 1 : 0;
    const bCostly = (b: WorkflowNode) => costlyOperations.includes(b.data.type) ? 1 : 0;

    return [...path].sort((a, b) => {
      return aCostly(a) - bCostly(b);
    });
  }

  private extractCurrentSequence(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
    if (nodes.length === 0) return [];

    // Trouver la séquence depuis le début jusqu'au dernier nœud
    const sequence: string[] = [];
    const visited = new Set<string>();
    const lastNode = nodes[nodes.length - 1];

    let current: WorkflowNode | undefined = lastNode;
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      sequence.unshift(current.data.type);
      const incoming = edges.find(e => e.target === current!.id);
      if (incoming) {
        current = nodes.find(n => n.id === incoming.source);
      } else {
        current = undefined;
      }
    }

    return sequence;
  }

  private matchesPatternPrefix(current: string[], pattern: string[]): boolean {
    if (current.length >= pattern.length) return false;
    
    return current.every((type, index) => type === pattern[index]);
  }

  // Méthode pour entraîner le modèle avec des données historiques
  trainModel(historicalWorkflows: unknown[]) {
    // Construire le modèle de transition de nœuds
    historicalWorkflows.forEach(workflow => {
      const sequences = this.extractNodeSequences(
        (workflow as { nodes?: WorkflowNode[] }).nodes || [],
        (workflow as { edges?: WorkflowEdge[] }).edges || []
      );
      sequences.forEach(sequence => {
        for (let i = 0; i < sequence.length - 1; i++) {
          const current = sequence[i];
          const next = sequence[i + 1];
          if (!this.nodeSequenceModel.has(current)) {
            this.nodeSequenceModel.set(current, new Map());
          }
          const transitions = this.nodeSequenceModel.get(current);
          if (transitions) {
            transitions.set(next, (transitions.get(next) || 0) + 1);
          }
        }
      });
    });

    // Normaliser les probabilités
    this.nodeSequenceModel.forEach(transitions => {
      const total = Array.from(transitions.values()).reduce((sum, count) => sum + count, 0);
      if (total > 0) { // Éviter la division par zéro
        transitions.forEach((count, next) => {
          transitions.set(next, count / total);
        });
      }
    });

    // Calculer les baselines de performance
    historicalWorkflows.forEach(workflow => {
      const workflowTyped = workflow as { executionHistory?: unknown[] };
      workflowTyped.executionHistory?.forEach((execution: unknown) => {
        const executionTyped = execution as { nodeTimings?: Record<string, unknown> };
        Object.entries(executionTyped.nodeTimings || {}).forEach(([nodeId, timing]: [string, unknown]) => {
          if (!this.performanceBaseline.has(nodeId)) {
            this.performanceBaseline.set(nodeId, { avg: 0, std: 0 });
          }

          // Mise à jour incrémentale de la moyenne et écart-type
          const baseline = this.performanceBaseline.get(nodeId);
          if (baseline) {
            const timingTyped = timing as { duration?: number };
            const n = 1; // Simplification: traiter chaque timing comme un nouvel échantillon
            const newAvg = baseline.avg + (timingTyped.duration || 0) / (n + 1);
            // Calcul simplifié de l'écart-type
            baseline.avg = newAvg;
            baseline.std = Math.sqrt((baseline.std ** 2 * n + ((timingTyped.duration || 0) - newAvg) ** 2) / (n + 1));
          }
        });
      });
    });
  }
}

// Export singleton
export const aiWorkflowService = new AIWorkflowService();

// Hook React pour utiliser le service AI
export function useAIWorkflowService() {
  const { nodes, edges, executionHistory } = useWorkflowStore();

  const predictNextNodes = (nodesToPredict: WorkflowNode[]) => {
    return aiWorkflowService.predictNextNodes(nodesToPredict, edges);
  };

  const optimizeWorkflow = (nodesToOptimize: WorkflowNode[]) => {
    return aiWorkflowService.optimizeWorkflow(nodesToOptimize, edges);
  };

  const detectPatterns = () => {
    return aiWorkflowService.detectPatterns(executionHistory);
  };

  const detectAnomalies = (nodeId: string, executionData: unknown) => {
    const nodeHistory = executionHistory
      .filter((h: unknown) => (h as { nodeExecutions?: Record<string, unknown> }).nodeExecutions?.[nodeId])
      .map((h: unknown) => (h as { nodeExecutions: Record<string, unknown> }).nodeExecutions[nodeId]);

    return aiWorkflowService.detectAnomalies(nodeId, executionData, nodeHistory);
  };

  return {
    predictNextNodes,
    optimizeWorkflow,
    detectPatterns,
    detectAnomalies,
    trainModel: aiWorkflowService.trainModel.bind(aiWorkflowService)
  };
}