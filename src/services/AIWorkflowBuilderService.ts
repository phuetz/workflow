 
/* eslint-disable @typescript-eslint/no-unused-vars */

import { WorkflowNode, WorkflowEdge } from '../types/workflow';
// import { nodeTypes } from '../data/nodeTypes';
import { logger } from './SimpleLogger';

interface WorkflowPrompt {
  description: string;
  context?: {
    industry?: string;
    complexity?: 'simple' | 'medium' | 'complex';
    integrations?: string[];
  };
}

interface OptimizationSuggestion {
  type: 'performance' | 'cost' | 'reliability' | 'simplification';
  severity: 'low' | 'medium' | 'high';
  description: string;
  impact: string;
  suggestedChanges: Array<{
    nodeId: string;
    changeType: 'config' | 'replacement' | 'optimization';
    details: Record<string, unknown>;
  }>;
}

interface PotentialIssue {
  nodeId: string;
  issueType: 'configuration' | 'connectivity' | 'performance' | 'security';
  probability: number;
  description: string;
  preventiveMeasures: string[];
}

interface Bottleneck {
  nodeId: string;
  severity: number;
}

interface WorkflowInput {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

interface NodeSuggestion {
  nodeType: string;
  reason: string;
  confidence: number;
  alternatives?: string[];
}

export interface GeneratedWorkflow {
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  metadata?: {
    generatedAt: Date;
    prompt: string;
    confidence: number;
    estimatedExecutionTime: number;
    requiredIntegrations: string[];
  };
  optimizations?: OptimizationSuggestion[];
  predictions?: PotentialIssue[];
}

export class AIWorkflowBuilderService {
  private static instance: AIWorkflowBuilderService;
  private nlpPatterns: Map<string, string[]>;
  private workflowTemplates: Map<string, GeneratedWorkflow>;

  private constructor() {
    this.nlpPatterns = this.initializeNLPPatterns();
    this.workflowTemplates = this.initializeTemplates();
  }

  static getInstance(): AIWorkflowBuilderService {
    if (!AIWorkflowBuilderService.instance) {
      AIWorkflowBuilderService.instance = new AIWorkflowBuilderService();
    }
    return AIWorkflowBuilderService.instance;
  }

  /**
   * Génère un workflow complet à partir d'une description en langage naturel
   */
  async generateFromPrompt(prompt: WorkflowPrompt): Promise<GeneratedWorkflow> {
    logger.info('🤖 Generating workflow from prompt:', prompt.description);

    // Analyser le prompt pour extraire les intentions
    const intentions = this.analyzePrompt(prompt.description);

    // Identifier les intégrations nécessaires
    const requiredIntegrations = this.identifyRequiredIntegrations(intentions);

    // Générer la structure du workflow
    const workflowStructure = this.generateWorkflowStructure(intentions, requiredIntegrations);

    // Optimiser automatiquement
    const optimizedWorkflow = await this.optimizeGeneratedWorkflow(workflowStructure);

    return {
      nodes: (optimizedWorkflow as any).nodes || workflowStructure.nodes,
      edges: (optimizedWorkflow as any).edges || workflowStructure.edges,
      metadata: {
        generatedAt: new Date(),
        prompt: prompt.description,
        confidence: this.calculateConfidence(intentions, optimizedWorkflow),
        estimatedExecutionTime: this.estimateExecutionTime(optimizedWorkflow),
        requiredIntegrations
      }
    };
  }

  /**
   * Suggère les prochains nœuds possibles basés sur le workflow actuel
   */
  async suggestNextNode(currentWorkflow: { nodes: WorkflowNode[], edges: WorkflowEdge[] }): Promise<{
    nodeType: string;
    reason: string;
    confidence: number;
    alternatives: string[];
  }[]> {
    // const _suggestions = [];

    // Analyser le dernier nœud ajouté
    const lastNode = currentWorkflow.nodes[currentWorkflow.nodes.length - 1];
    if (!lastNode) return [];

    // Patterns communs basés sur le type de nœud
    const patternSuggestions = this.getCommonNodePatterns(lastNode.data.type);

    // Machine learning simulé basé sur l'historique
    const mlSuggestions = this.getMachineLearningPredictions(currentWorkflow);

    // Analyser le contexte du workflow
    const contextSuggestions = this.getContextualSuggestions(currentWorkflow);

    // Combiner et scorer les suggestions
    const allSuggestions = [...patternSuggestions, ...mlSuggestions, ...contextSuggestions];

    return this.rankSuggestions(allSuggestions, currentWorkflow) as {
      nodeType: string;
      reason: string;
      confidence: number;
      alternatives: string[];
    }[];
  }

  /**
   * Optimise un workflow existant pour améliorer les performances
   */
  async optimizeWorkflow(workflow: { nodes: WorkflowNode[], edges: WorkflowEdge[] }): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];

    // Détecter les nœuds redondants
    const redundantNodes = this.detectRedundantNodes(workflow);
    if (redundantNodes.length > 0) {
      suggestions.push({
        type: 'simplification',
        severity: 'medium',
        description: 'Nœuds redondants détectés',
        impact: `Réduction de ${redundantNodes.length} nœuds pourrait améliorer les performances de 15%`,
        suggestedChanges: redundantNodes.map((n: WorkflowNode) => ({
          nodeId: n.id,
          changeType: 'replacement' as const,
          details: { action: 'remove' }
        }))
      });
    }

    // Optimiser les requêtes parallèles
    const parallelizableNodes = this.findParallelizableNodes(workflow);
    if (parallelizableNodes.length > 0) {
      suggestions.push({
        type: 'performance',
        severity: 'high',
        description: 'Opportunités de parallélisation détectées',
        impact: 'Réduction du temps d\'exécution jusqu\'à 60%',
        suggestedChanges: parallelizableNodes.map((group: string[]) => ({
          nodeId: group[0] || 'unknown',
          changeType: 'optimization' as const,
          details: { action: 'parallelize', nodeIds: group }
        }))
      });
    }

    // Suggérer la mise en cache
    const cacheableNodes = this.identifyCacheableNodes(workflow);
    if (cacheableNodes.length > 0) {
      suggestions.push({
        type: 'performance',
        severity: 'low',
        description: 'Mise en cache recommandée',
        impact: 'Réduction des appels API de 40%',
        suggestedChanges: cacheableNodes.map((n: WorkflowNode) => ({
          nodeId: n.id,
          changeType: 'config' as const,
          details: { action: 'add_cache', ttl: 3600 }
        }))
      });
    }

    // Optimiser les coûts
    const costOptimizations = this.analyzeCostOptimizations(workflow);
    suggestions.push(...costOptimizations);

    return suggestions;
  }

  /**
   * Prédit les potentielles erreurs dans un workflow
   */
  async predictFailures(workflow: { nodes: WorkflowNode[], edges: WorkflowEdge[] }): Promise<PotentialIssue[]> {
    const issues: PotentialIssue[] = [];

    // Vérifier les configurations manquantes
    workflow.nodes.forEach(node => {
      const missingConfigs = this.checkMissingConfigurations(node);
      if (missingConfigs.length > 0) {
        issues.push({
          nodeId: node.id,
          issueType: 'configuration',
          probability: 0.9,
          description: `Configuration manquante: ${missingConfigs.join(', ')}`,
          preventiveMeasures: [
            'Compléter la configuration du nœud',
            'Utiliser des valeurs par défaut',
            'Ajouter une validation'
          ]
        });
      }
    });

    // Détecter les goulots d'étranglement
    const bottlenecks = this.detectBottlenecks(workflow);
    bottlenecks.forEach((bottleneck: Bottleneck) => {
      issues.push({
        nodeId: bottleneck.nodeId,
        issueType: 'performance',
        probability: 0.7,
        description: 'Goulot d\'étranglement potentiel détecté',
        preventiveMeasures: [
          'Implémenter une file d\'attente',
          'Ajouter une limite de débit',
          'Utiliser la parallélisation'
        ]
      });
    });

    // Analyser la sécurité
    const securityIssues = this.analyzeSecurityIssues(workflow);
    issues.push(...securityIssues);

    return issues;
  }

  // Méthodes privées d'assistance

  private initializeNLPPatterns(): Map<string, string[]> {
    const patterns = new Map<string, string[]>();
    patterns.set('email', ['email', 'mail', 'envoyer', 'send', 'notify', 'notification']);
    patterns.set('database', ['database', 'db', 'sql', 'query', 'insert', 'update']);
    patterns.set('api', ['api', 'http', 'request', 'webhook', 'rest', 'endpoint']);
    patterns.set('schedule', ['schedule', 'cron', 'daily', 'weekly', 'periodic', 'every']);
    patterns.set('condition', ['if', 'when', 'condition', 'filter', 'check']);
    patterns.set('transform', ['transform', 'convert', 'format', 'map', 'process']);

    return patterns;
  }

  private initializeTemplates(): Map<string, GeneratedWorkflow> {
    const templates = new Map<string, GeneratedWorkflow>();
    // Template: Email automation
    templates.set('email_automation', {
      nodes: [
        {
          id: 'trigger_1',
          type: 'custom',
          position: { x: 100, y: 100 },
          data: {
            id: 'trigger_1',
            type: 'webhook',
            label: 'New Contact',
            icon: 'Webhook',
            color: 'bg-green-500',
            config: {},
            position: { x: 100, y: 100 },
            inputs: 0,
            outputs: 1
          }
        },
        {
          id: 'email_1',
          type: 'custom',
          position: { x: 300, y: 100 },
          data: {
            id: 'email_1',
            type: 'email',
            label: 'Send Welcome Email',
            icon: 'Mail',
            color: 'bg-blue-500',
            config: {},
            position: { x: 300, y: 100 },
            inputs: 1,
            outputs: 1
          }
        }
      ],
      edges: [
        {
          id: 'e1-2',
          source: 'trigger_1',
          target: 'email_1'
        }
      ],
      metadata: {
        generatedAt: new Date(),
        prompt: 'email_automation',
        confidence: 0.9,
        estimatedExecutionTime: 500,
        requiredIntegrations: ['email', 'webhook']
      }
    });

    return templates;
  }

  private analyzePrompt(prompt: string): string[] {
    const intentions: string[] = [];
    const lowerPrompt = prompt.toLowerCase();

    this.nlpPatterns.forEach((keywords, intent) => {
      if (keywords.some(keyword => lowerPrompt.includes(keyword))) {
        intentions.push(intent);
      }
    });

    return intentions;
  }

  private identifyRequiredIntegrations(intentions: string[]): string[] {
    const integrationMap: Record<string, string[]> = {
      email: ['gmail', 'smtp', 'sendgrid'],
      database: ['mysql', 'postgres', 'mongodb'],
      api: ['http', 'webhook'],
      schedule: ['cron'],
      transform: ['code', 'jsonata']
    };

    const integrations = new Set<string>();
    intentions.forEach(intent => {
      if (integrationMap[intent]) {
        integrationMap[intent].forEach(int => integrations.add(int));
      }
    });

    return Array.from(integrations);
  }

  private generateWorkflowStructure(intentions: string[], integrations: string[]): {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  } {
    const nodes: WorkflowNode[] = [];
    const edges: WorkflowEdge[] = [];
    let yPosition = 100;
    const triggerId = `trigger_${Date.now()}`;
    let previousNodeId = triggerId;

    // Toujours commencer par un trigger
    nodes.push({
      id: triggerId,
      type: 'custom',
      position: { x: 100, y: yPosition },
      data: {
        id: triggerId,
        type: intentions.includes('schedule') ? 'schedule' : 'webhook',
        label: intentions.includes('schedule') ? 'Scheduled Trigger' : 'Webhook Trigger',
        icon: intentions.includes('schedule') ? 'Clock' : 'Webhook',
        color: 'bg-green-500',
        config: {},
        position: { x: 100, y: yPosition },
        inputs: 0,
        outputs: 1
      }
    });

    yPosition += 150;

    // Ajouter des nœuds basés sur les intentions
    intentions.forEach((intent, index) => {
      if (intent === 'schedule') return; // Déjà géré

      const nodeId = `node_${intent}_${index}`;
      const nodeType = this.getNodeTypeForIntent(intent);

      nodes.push({
        id: nodeId,
        type: 'custom',
        position: { x: 100, y: yPosition },
        data: {
          id: nodeId,
          type: nodeType,
          label: this.getLabelForIntent(intent),
          icon: this.getIconForIntent(intent),
          color: this.getColorForIntent(intent),
          config: {},
          position: { x: 100, y: yPosition },
          inputs: 1,
          outputs: 1
        }
      });

      edges.push({
        id: `edge_${previousNodeId}_${nodeId}`,
        source: previousNodeId,
        target: nodeId
      });

      previousNodeId = nodeId;
      yPosition += 150;
    });

    return { nodes, edges };
  }

  private getNodeTypeForIntent(intent: string): string {
    const intentToNodeType: Record<string, string> = {
      email: 'email',
      database: 'mysql',
      api: 'httpRequest',
      condition: 'condition',
      transform: 'transform'
    };
    return intentToNodeType[intent] || 'function';
  }

  private getLabelForIntent(intent: string): string {
    const intentToLabel: Record<string, string> = {
      email: 'Send Email',
      database: 'Database Operation',
      api: 'HTTP Request',
      condition: 'Check Condition',
      transform: 'Transform Data'
    };
    return intentToLabel[intent] || 'Process Data';
  }

  private getIconForIntent(intent: string): string {
    const intentToIcon: Record<string, string> = {
      email: 'Mail',
      database: 'Database',
      api: 'Globe',
      condition: 'GitBranch',
      transform: 'Shuffle'
    };
    return intentToIcon[intent] || 'Settings';
  }

  private getColorForIntent(intent: string): string {
    const intentToColor: Record<string, string> = {
      email: 'bg-blue-500',
      database: 'bg-purple-500',
      api: 'bg-green-500',
      condition: 'bg-yellow-500',
      transform: 'bg-orange-500'
    };
    return intentToColor[intent] || 'bg-gray-500';
  }

  private async optimizeGeneratedWorkflow(workflow: unknown): Promise<unknown> {
    // Simulation d'optimisation
    return workflow;
  }

  private calculateConfidence(intentions: string[], workflow: unknown): number {
    // Plus il y a d'intentions reconnues, plus la confiance est élevée
    const baseConfidence = intentions.length > 0 ? 0.5 : 0.3;
    const nodeConfidence = (workflow as any).nodes ? (workflow as any).nodes.length * 0.1 : 0;
    return Math.min(baseConfidence + nodeConfidence, 1);
  }

  private estimateExecutionTime(workflow: unknown): number {
    // Estimation basée sur le nombre de nœuds et leurs types
    let totalTime = 0;
    const nodeExecutionTimes: Record<string, number> = {
      webhook: 10,
      schedule: 10,
      email: 500,
      httpRequest: 1000,
      database: 300,
      transform: 50,
      condition: 20
    };

    const workflowTyped = workflow as Partial<WorkflowInput>;
    if (workflowTyped.nodes) {
      workflowTyped.nodes.forEach((node: WorkflowNode) => {
        totalTime += nodeExecutionTimes[node.data?.type] || 100;
      });
    }

    return totalTime;
  }

  private getCommonNodePatterns(nodeType: string): unknown[] {
    const patterns: Record<string, unknown[]> = {
      webhook: [
        { nodeType: 'transform', reason: 'Valider et formater les données webhook', confidence: 0.9 },
        { nodeType: 'condition', reason: 'Filtrer les requêtes', confidence: 0.7 }
      ],
      httpRequest: [
        { nodeType: 'condition', reason: 'Vérifier le statut de la réponse', confidence: 0.8 },
        { nodeType: 'transform', reason: 'Parser la réponse JSON', confidence: 0.9 }
      ],
      database: [
        { nodeType: 'transform', reason: 'Formater les résultats', confidence: 0.7 },
        { nodeType: 'condition', reason: 'Vérifier si des données existent', confidence: 0.6 }
      ]
    };

    return patterns[nodeType] || [];
  }

  private getMachineLearningPredictions(workflow: unknown): unknown[] {
    // Simulation de prédictions ML
    return [
      { 
        nodeType: 'errorHandler', 
        reason: 'Pattern détecté: workflows similaires utilisent la gestion d\'erreur', 
        confidence: 0.75,
        alternatives: ['logger', 'notification']
      }
    ];
  }

  private getContextualSuggestions(workflow: unknown): unknown[] {
    const suggestions: unknown[] = [];

    // Si le workflow a des opérations de données, suggérer la validation
    const workflowTyped = workflow as Partial<WorkflowInput>;
    const hasDataOps = workflowTyped.nodes?.some((n: WorkflowNode) =>
      ['database', 'transform', 'httpRequest'].includes(n.data?.type)
    ) ?? false;

    if (hasDataOps) {
      suggestions.push({
        nodeType: 'validator',
        reason: 'Valider l\'intégrité des données',
        confidence: 0.65,
        alternatives: ['condition', 'filter']
      });
    }

    return suggestions;
  }

  private rankSuggestions(suggestions: unknown[], _workflow: unknown): NodeSuggestion[] {
    // Trier par confiance décroissante
    return (suggestions as NodeSuggestion[])
      .sort((a: NodeSuggestion, b: NodeSuggestion) => (b.confidence || 0) - (a.confidence || 0))
      .slice(0, 5); // Top 5 suggestions
  }

  private detectRedundantNodes(workflow: unknown): WorkflowNode[] {
    const redundant: WorkflowNode[] = [];
    const nodeGroups = new Map<string, WorkflowNode[]>();

    // Grouper les nœuds par type
    const workflowTyped = workflow as Partial<WorkflowInput>;
    if (workflowTyped.nodes) {
      workflowTyped.nodes.forEach((node: WorkflowNode) => {
        const key = node.data?.type || 'unknown';
        if (!nodeGroups.has(key)) {
          nodeGroups.set(key, []);
        }
        nodeGroups.get(key)!.push(node);
      });
    }

    // Détecter les doublons potentiels
    nodeGroups.forEach((nodes, type) => {
      if (nodes.length > 1 && ['transform', 'condition'].includes(type)) {
        // Vérifier si les configurations sont similaires
        for (let i = 1; i < nodes.length; i++) {
          if (this.areSimilarConfigs(nodes[0].data?.config, nodes[i].data?.config)) {
            redundant.push(nodes[i]);
          }
        }
      }
    });

    return redundant;
  }

  private areSimilarConfigs(config1: unknown, config2: unknown): boolean {
    // Comparaison simplifiée des configurations
    return JSON.stringify(config1) === JSON.stringify(config2);
  }

  private findParallelizableNodes(workflow: unknown): string[][] {
    const parallelGroups: string[][] = [];
    const visited = new Set<string>();

    const workflowTyped = workflow as Partial<WorkflowInput>;
    if (workflowTyped.nodes) {
      workflowTyped.nodes.forEach((node: WorkflowNode) => {
        if (visited.has(node.id)) return;

        // Trouver les nœuds qui peuvent s'exécuter en parallèle
        const siblings = this.findSiblingNodes(node, workflow);
        if (siblings.length > 1) {
          parallelGroups.push(siblings.map((n: WorkflowNode) => n.id));
          siblings.forEach((s: WorkflowNode) => visited.add(s.id));
        }
      });
    }

    return parallelGroups;
  }

  private findSiblingNodes(node: unknown, workflow: unknown): WorkflowNode[] {
    // Trouver les nœuds qui ont le même parent
    const nodeTyped = node as WorkflowNode;
    const workflowTyped = workflow as Partial<WorkflowInput>;

    const parentEdges = workflowTyped.edges?.filter((e: WorkflowEdge) => e.target === nodeTyped.id) || [];
    if (parentEdges.length === 0) return [nodeTyped];

    const parentId = parentEdges[0]?.source;
    const siblingEdges = workflowTyped.edges?.filter((e: WorkflowEdge) => e.source === parentId) || [];

    return siblingEdges.map((e: WorkflowEdge) =>
      workflowTyped.nodes?.find((n: WorkflowNode) => n.id === e.target)
    ).filter((n): n is WorkflowNode => n !== undefined);
  }

  private identifyCacheableNodes(workflow: unknown): WorkflowNode[] {
    // Les nœuds qui font des appels externes coûteux
    const workflowTyped = workflow as Partial<WorkflowInput>;
    if (!workflowTyped.nodes) return [];

    return workflowTyped.nodes.filter((node: WorkflowNode) =>
      ['httpRequest', 'database', 'openai'].includes(node.data?.type)
    );
  }

  private analyzeCostOptimizations(workflow: unknown): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Compter les appels API coûteux
    const workflowTyped = workflow as Partial<WorkflowInput>;
    const expensiveNodes = workflowTyped.nodes?.filter((n: WorkflowNode) =>
      ['openai', 'anthropic', 'googleAI'].includes(n.data?.type)
    ) || [];

    if (expensiveNodes.length > 0) {
      suggestions.push({
        type: 'cost',
        severity: 'medium',
        description: 'Optimisation des coûts IA possible',
        impact: 'Réduction des coûts jusqu\'à 30%',
        suggestedChanges: [
          {
            nodeId: expensiveNodes[0].id || 'unknown',
            changeType: 'optimization' as const,
            details: {
              action: 'batch_requests',
              nodeIds: expensiveNodes.map((n: WorkflowNode) => n.id)
            }
          },
          {
            nodeId: expensiveNodes[0].id || 'unknown',
            changeType: 'config' as const,
            details: {
              action: 'use_smaller_model',
              suggestion: 'gpt-3.5-turbo au lieu de gpt-4'
            }
          }
        ]
      });
    }

    return suggestions;
  }

  private checkMissingConfigurations(node: unknown): string[] {
    const requiredConfigs: Record<string, string[]> = {
      email: ['to', 'subject', 'body'],
      httpRequest: ['url', 'method'],
      database: ['query', 'connectionString'],
      openai: ['apiKey', 'model', 'prompt']
    };

    const nodeTyped = node as WorkflowNode;
    const nodeType = nodeTyped.data?.type;
    const missing: string[] = [];

    if (nodeType && requiredConfigs[nodeType]) {
      const config = nodeTyped.data?.config || {};
      requiredConfigs[nodeType].forEach(key => {
        if (!config[key]) {
          missing.push(key);
        }
      });
    }

    return missing;
  }

  private detectBottlenecks(workflow: unknown): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];
    const workflowTyped = workflow as Partial<WorkflowInput>;

    if (!workflowTyped.nodes || !workflowTyped.edges) return bottlenecks;

    // Nœuds avec beaucoup de connexions entrantes
    workflowTyped.nodes.forEach((node: WorkflowNode) => {
      const incomingEdges = workflowTyped.edges!.filter((e: WorkflowEdge) => e.target === node.id);
      if (incomingEdges.length > 3) {
        bottlenecks.push({
          nodeId: node.id,
          severity: incomingEdges.length
        });
      }
    });

    return bottlenecks;
  }

  private analyzeSecurityIssues(workflow: unknown): PotentialIssue[] {
    const issues: PotentialIssue[] = [];
    const workflowTyped = workflow as Partial<WorkflowInput>;

    if (!workflowTyped.nodes) return issues;

    workflowTyped.nodes.forEach((node: WorkflowNode) => {
      // Vérifier les credentials exposés
      if (node.data?.config) {
        const configStr = JSON.stringify(node.data.config);
        if (configStr.includes('password') || configStr.includes('apiKey')) {
          issues.push({
            nodeId: node.id,
            issueType: 'security',
            probability: 0.95,
            description: 'Credentials potentiellement exposés',
            preventiveMeasures: [
              'Utiliser le gestionnaire de credentials',
              'Implémenter le chiffrement',
              'Utiliser des variables d\'environnement'
            ]
          });
        }
      }

      // Vérifier les injections SQL potentielles
      const query = node.data?.config?.query as string | undefined;
      if (node.data?.type === 'database' && query?.includes('${')) {
        issues.push({
          nodeId: node.id,
          issueType: 'security',
          probability: 0.8,
          description: 'Risque d\'injection SQL',
          preventiveMeasures: [
            'Utiliser des requêtes préparées',
            'Valider les entrées',
            'Échapper les caractères spéciaux'
          ]
        });
      }
    });

    return issues;
  }
}

// Export singleton instance
export const aiWorkflowBuilder = AIWorkflowBuilderService.getInstance();