/**
 * AI Template Generator
 * Generates workflow templates from natural language descriptions
 * Leverages NLP and pattern matching for intelligent template creation
 */

import {
  GeneratedTemplate,
  TemplateContext,
  TemplateIntent,
  TemplateAction,
  ValidationResult,
  QualityScoreComponents,
  NLPAnalysis,
  ExtractedEntity,
  AITemplateGeneratorService
} from '../types/aiTemplate';
import { WorkflowNode, WorkflowEdge } from '../types/workflow';
import { TemplateCategory } from '../types/templates';
import { IntentRecognizer } from '../nlp/IntentRecognizer';
import { logger } from '../services/SimpleLogger';
import { v4 as uuidv4 } from 'uuid';

export class AITemplateGenerator implements AITemplateGeneratorService {
  private intentRecognizer: IntentRecognizer;
  private generationCount = 0;

  // Node type mappings for common actions
  private readonly actionNodeTypes: Record<string, string> = {
    'api_call': 'httpRequest',
    'transformation': 'transform',
    'notification': 'slack',
    'email': 'email',
    'storage': 'postgres',
    'filter': 'filter',
    'validation': 'validate',
    'enrichment': 'httpRequest',
    'aggregation': 'aggregate',
    'logging': 'log'
  };

  // Category inference keywords
  private readonly categoryKeywords: Partial<Record<TemplateCategory, string[]>> = {
    'business_automation': ['lead', 'invoice', 'approval', 'onboarding', 'crm'],
    'marketing': ['campaign', 'email', 'social', 'newsletter', 'analytics'],
    'sales': ['deal', 'opportunity', 'pipeline', 'quote', 'proposal'],
    'customer_support': ['ticket', 'support', 'helpdesk', 'feedback', 'survey'],
    'data_processing': ['etl', 'sync', 'transform', 'validate', 'clean'],
    'notifications': ['alert', 'notify', 'message', 'remind', 'update'],
    'social_media': ['twitter', 'facebook', 'linkedin', 'instagram', 'post'],
    'ecommerce': ['order', 'product', 'inventory', 'shipping', 'cart'],
    'finance': ['payment', 'invoice', 'expense', 'transaction', 'billing'],
    'hr': ['employee', 'onboarding', 'payroll', 'leave', 'recruitment'],
    'development': ['deploy', 'ci/cd', 'build', 'test', 'git'],
    'analytics': ['report', 'dashboard', 'metrics', 'kpi', 'analysis'],
    'productivity': ['task', 'meeting', 'calendar', 'todo', 'schedule'],
    'integration': ['sync', 'connect', 'api', 'webhook', 'integration'],
    'monitoring': ['health', 'uptime', 'alert', 'performance', 'log']
  };

  constructor() {
    this.intentRecognizer = new IntentRecognizer();
    logger.info('AITemplateGenerator initialized');
  }

  /**
   * Generate a workflow template from natural language description
   */
  async generateTemplate(
    description: string,
    context?: TemplateContext
  ): Promise<GeneratedTemplate> {
    const startTime = Date.now();
    this.generationCount++;

    try {
      logger.info('Generating template from description', {
        description: description.substring(0, 100),
        context
      });

      // Step 1: Analyze the description with NLP
      const nlpAnalysis = await this.analyzeDescription(description);

      // Step 2: Extract template intent
      const intent = await this.extractTemplateIntent(nlpAnalysis, description);

      // Step 3: Apply context constraints
      if (context?.constraints) {
        this.applyContextConstraints(intent, context.constraints);
      }

      // Step 4: Generate workflow nodes
      const nodes = await this.generateNodes(intent, context);

      // Step 5: Generate connections (edges)
      const edges = this.generateEdges(nodes, intent);

      // Step 6: Generate documentation
      const documentation = this.generateDocumentation(description, intent, nodes);

      // Step 7: Calculate quality score
      const suggestedName = this.generateTemplateName(intent);
      const qualityScore = this.calculateQualityScore({
        name: suggestedName,
        description,
        category: nlpAnalysis.suggestedCategory,
        nodes,
        edges,
        documentation,
        version: '1.0.0',
        tags: nlpAnalysis.keywords,
        qualityScore: 0,
        metadata: {
          generatedAt: new Date(),
          generationMethod: 'ai',
          promptUsed: description,
          contextUsed: context,
          iterationsCount: 1,
          confidenceScore: nlpAnalysis.confidence,
          usedPatterns: nlpAnalysis.detectedPatterns
        }
      });

      // Step 8: Assemble final template
      const template: GeneratedTemplate = {
        name: suggestedName,
        description,
        category: nlpAnalysis.suggestedCategory,
        nodes,
        edges,
        documentation,
        version: '1.0.0',
        tags: this.generateTags(description, nlpAnalysis),
        qualityScore,
        metadata: {
          generatedAt: new Date(),
          generationMethod: 'ai',
          promptUsed: description,
          contextUsed: context,
          iterationsCount: 1,
          confidenceScore: nlpAnalysis.confidence,
          usedPatterns: nlpAnalysis.detectedPatterns
        }
      };

      const duration = Date.now() - startTime;
      logger.info('Template generated successfully', {
        name: template.name,
        nodesCount: nodes.length,
        qualityScore,
        duration
      });

      return template;

    } catch (error) {
      logger.error('Template generation failed', error);
      throw new Error(`Failed to generate template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Refine an existing template based on feedback
   */
  async refineTemplate(
    template: GeneratedTemplate,
    feedback: string
  ): Promise<GeneratedTemplate> {
    logger.info('Refining template', { templateName: template.name, feedback });

    // Analyze feedback
    const feedbackAnalysis = await this.analyzeDescription(feedback);

    // Apply refinements based on feedback
    const refinedTemplate = { ...template };

    // Check if feedback requests node additions
    if (feedbackAnalysis.intent.includes('add') || feedbackAnalysis.intent.includes('include')) {
      const newNodes = await this.generateNodesFromFeedback(feedbackAnalysis, template);
      refinedTemplate.nodes = [...template.nodes, ...newNodes];
    }

    // Check if feedback requests node removal
    if (feedbackAnalysis.intent.includes('remove') || feedbackAnalysis.intent.includes('delete')) {
      refinedTemplate.nodes = this.removeNodesFromFeedback(feedbackAnalysis, template);
    }

    // Update edges to match new node structure
    refinedTemplate.edges = this.regenerateEdges(refinedTemplate.nodes, template.edges);

    // Update metadata
    refinedTemplate.metadata = {
      ...refinedTemplate.metadata,
      iterationsCount: (refinedTemplate.metadata.iterationsCount || 1) + 1,
      generatedAt: new Date()
    };

    // Recalculate quality score
    refinedTemplate.qualityScore = this.calculateQualityScore(refinedTemplate);

    logger.info('Template refined successfully', {
      name: refinedTemplate.name,
      iterations: refinedTemplate.metadata.iterationsCount
    });

    return refinedTemplate;
  }

  /**
   * Validate a generated template
   */
  async validateTemplate(template: GeneratedTemplate): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Check if template has nodes
    if (template.nodes.length === 0) {
      results.push({
        field: 'nodes',
        valid: false,
        message: 'Template must have at least one node',
        suggestion: 'Add trigger and action nodes to the template'
      });
    }

    // Check if template has a trigger
    const hasTrigger = template.nodes.some(node =>
      ['webhook', 'schedule', 'email_trigger', 'manual_trigger'].includes(node.type)
    );
    if (!hasTrigger) {
      results.push({
        field: 'trigger',
        valid: false,
        message: 'Template should have a trigger node',
        suggestion: 'Add a webhook, schedule, or manual trigger'
      });
    }

    // Check if all nodes are connected
    const connectedNodes = this.getConnectedNodes(template.edges);
    const disconnectedNodes = template.nodes.filter(node => !connectedNodes.has(node.id));
    if (disconnectedNodes.length > 0) {
      results.push({
        field: 'edges',
        valid: false,
        message: `${disconnectedNodes.length} node(s) are not connected`,
        suggestion: 'Ensure all nodes are connected in the workflow'
      });
    }

    // Check documentation quality
    if (!template.documentation.overview || template.documentation.overview.length < 50) {
      results.push({
        field: 'documentation',
        valid: false,
        message: 'Documentation overview is too brief',
        suggestion: 'Provide a detailed overview of the template functionality'
      });
    }

    // Check for error handling
    const hasErrorHandling = template.nodes.some(node => {
      const config = node.data.config as Record<string, unknown> | undefined;
      return config?.errorHandling || config?.onError;
    });
    if (!hasErrorHandling) {
      results.push({
        field: 'errorHandling',
        valid: false,
        message: 'Template lacks error handling',
        suggestion: 'Add error handling nodes or configure retry logic'
      });
    }

    // If all checks passed
    if (results.length === 0) {
      results.push({
        field: 'overall',
        valid: true,
        message: 'Template validation passed'
      });
    }

    return results;
  }

  /**
   * Calculate quality score for a template
   */
  calculateQualityScore(template: GeneratedTemplate): number {
    const components: QualityScoreComponents = {
      completeness: this.scoreCompleteness(template),
      documentation: this.scoreDocumentation(template),
      nodeSelection: this.scoreNodeSelection(template),
      errorHandling: this.scoreErrorHandling(template),
      performance: this.scorePerformance(template),
      usability: this.scoreUsability(template),
      maintainability: this.scoreMaintainability(template)
    };

    // Weighted average
    const weights = {
      completeness: 0.20,
      documentation: 0.15,
      nodeSelection: 0.20,
      errorHandling: 0.15,
      performance: 0.10,
      usability: 0.10,
      maintainability: 0.10
    };

    const score = Object.entries(components).reduce((total, [key, value]) => {
      return total + (value * weights[key as keyof typeof weights]);
    }, 0);

    logger.debug('Quality score calculated', { score, components });

    return Math.round(score);
  }

  // ============================================================
  // PRIVATE HELPER METHODS
  // ============================================================

  /**
   * Analyze description using NLP
   */
  private async analyzeDescription(description: string): Promise<NLPAnalysis> {
    const intentResult = await this.intentRecognizer.recognize(description);
    let primaryIntent = intentResult.primaryIntent;

    // If NLP can't recognize intent, create a fallback generic intent
    if (!primaryIntent) {
      primaryIntent = this.createFallbackIntent(description);
    }

    // Extract entities
    const entities: ExtractedEntity[] = intentResult.entities.map(entity => ({
      type: entity.type as ExtractedEntity['type'],
      value: entity.value,
      confidence: entity.confidence,
      position: [entity.startIndex, entity.endIndex],
      metadata: entity.metadata
    }));

    // Infer category
    const suggestedCategory = this.inferCategory(description);

    // Determine complexity
    const complexity = primaryIntent.actions.length > 5 ? 'complex' :
                      primaryIntent.actions.length > 2 ? 'moderate' : 'simple';

    const analysis: NLPAnalysis = {
      intent: primaryIntent.type,
      entities,
      keywords: this.extractKeywords(description),
      sentiment: 0.5, // Neutral for workflow descriptions
      confidence: primaryIntent.confidence,
      suggestedCategory,
      detectedPatterns: this.detectPatterns(description, entities),
      complexity
    };

    return analysis;
  }

  /**
   * Extract template intent structure
   */
  private async extractTemplateIntent(
    nlpAnalysis: NLPAnalysis,
    description: string
  ): Promise<TemplateIntent> {
    const intentResult = await this.intentRecognizer.recognize(description);
    let primaryIntent = intentResult.primaryIntent;

    // If NLP can't recognize intent, create a fallback
    if (!primaryIntent) {
      primaryIntent = this.createFallbackIntent(description) as any;
    }

    // Build template intent
    const intent: TemplateIntent = {
      primaryGoal: description,
      trigger: {
        type: primaryIntent.trigger?.type || 'manual',
        event: this.extractEventType(description),
        schedule: primaryIntent.trigger?.schedule
      },
      actions: primaryIntent.actions.map(action => ({
        type: this.mapActionType(action.type),
        service: action.service,
        operation: action.operation || action.type,
        inputs: this.extractInputs(action),
        outputs: this.extractOutputs(action),
        optional: false
      })),
      dataFlow: this.extractDataFlow(primaryIntent.actions),
      errorHandling: {
        strategy: 'retry',
        retryCount: 3,
        notificationChannel: 'slack'
      },
      conditions: primaryIntent.conditions?.map(cond => {
        // Map condition operators to the allowed types
        const operator = cond.operator as 'equals' | 'contains' | 'greater_than' | 'less_than' | 'exists';
        return {
          field: cond.field,
          operator,
          value: cond.value,
          thenAction: 'continue',
          elseAction: 'skip'
        };
      }) || [],
      integrations: this.extractIntegrations(nlpAnalysis.entities)
    };

    return intent;
  }

  /**
   * Generate workflow nodes from intent
   */
  private async generateNodes(
    intent: TemplateIntent,
    context?: TemplateContext
  ): Promise<WorkflowNode[]> {
    const nodes: WorkflowNode[] = [];
    let yPosition = 100;
    const xSpacing = 250;

    // Generate trigger node
    const triggerId = `trigger-${uuidv4().substring(0, 8)}`;
    const triggerType = this.getTriggerNodeType(intent.trigger.type);
    nodes.push({
      id: triggerId,
      type: triggerType,
      position: { x: 100, y: yPosition },
      data: {
        id: triggerId,
        type: triggerType,
        label: this.getTriggerLabel(intent.trigger),
        position: { x: 100, y: yPosition },
        icon: 'play',
        color: '#4CAF50',
        inputs: 0,
        outputs: 1,
        config: this.getTriggerProperties(intent.trigger)
      }
    });

    let previousNodeId = triggerId;
    yPosition += 100;

    // Generate action nodes
    intent.actions.forEach((action, index) => {
      const nodeId = `action-${uuidv4().substring(0, 8)}`;
      const nodeType = this.getActionNodeType(action);
      const xPos = 100 + (index % 3) * xSpacing;

      nodes.push({
        id: nodeId,
        type: nodeType,
        position: { x: xPos, y: yPosition },
        data: {
          id: nodeId,
          type: nodeType,
          label: this.getActionLabel(action),
          position: { x: xPos, y: yPosition },
          icon: 'settings',
          color: '#2196F3',
          inputs: 1,
          outputs: 1,
          config: this.getActionProperties(action)
        }
      });

      previousNodeId = nodeId;
      if ((index + 1) % 3 === 0) {
        yPosition += 150;
      }
    });

    // Add condition nodes if needed
    if (intent.conditions.length > 0) {
      const conditionId = `condition-${uuidv4().substring(0, 8)}`;
      nodes.push({
        id: conditionId,
        type: 'condition',
        position: { x: 100, y: yPosition },
        data: {
          id: conditionId,
          type: 'condition',
          label: 'Filter Conditions',
          position: { x: 100, y: yPosition },
          icon: 'filter',
          color: '#FF9800',
          inputs: 1,
          outputs: 2,
          config: {
            conditions: intent.conditions
          }
        }
      });
      yPosition += 150;
    }

    // Add error handling node
    if (context?.constraints?.performanceRequirements?.includes('error_handling')) {
      const errorId = `error-${uuidv4().substring(0, 8)}`;
      nodes.push({
        id: errorId,
        type: 'slack',
        position: { x: 400, y: yPosition },
        data: {
          id: errorId,
          type: 'slack',
          label: 'Error Notification',
          position: { x: 400, y: yPosition },
          icon: 'bell',
          color: '#F44336',
          inputs: 1,
          outputs: 1,
          config: {
            channel: '#alerts',
            message: 'Workflow error: {{$error.message}}'
          }
        }
      });
    }

    return nodes;
  }

  /**
   * Generate edges connecting nodes
   */
  private generateEdges(nodes: WorkflowNode[], intent: TemplateIntent): WorkflowEdge[] {
    const edges: WorkflowEdge[] = [];

    // Connect nodes sequentially
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({
        id: `edge-${i}`,
        source: nodes[i].id,
        target: nodes[i + 1].id,
        animated: false
      });
    }

    // Add conditional branches if conditions exist
    if (intent.conditions.length > 0) {
      const conditionNode = nodes.find(n => n.type === 'condition');
      if (conditionNode) {
        const nextNodes = nodes.filter(n =>
          n.position.y > conditionNode.position.y && n.id !== conditionNode.id
        );

        if (nextNodes.length >= 2) {
          edges.push({
            id: `edge-true`,
            source: conditionNode.id,
            target: nextNodes[0].id,
            sourceHandle: 'true',
            animated: false
          });

          edges.push({
            id: `edge-false`,
            source: conditionNode.id,
            target: nextNodes[1]?.id || nextNodes[0].id,
            sourceHandle: 'false',
            animated: false
          });
        }
      }
    }

    return edges;
  }

  /**
   * Generate comprehensive documentation
   */
  private generateDocumentation(
    description: string,
    intent: TemplateIntent,
    nodes: WorkflowNode[]
  ) {
    const overview = `This workflow automates: ${description}

**Trigger:** ${this.describeTrigger(intent.trigger)}

**Actions:**
${intent.actions.map((action, i) => `${i + 1}. ${this.describeAction(action)}`).join('\n')}

**Total Nodes:** ${nodes.length}
**Estimated Execution Time:** ${this.estimateExecutionTime(nodes)} seconds`;

    const setup = [
      {
        step: 1,
        title: 'Configure Credentials',
        description: 'Set up required credentials for the integrations used in this workflow',
        screenshot: ''
      },
      {
        step: 2,
        title: 'Customize Parameters',
        description: 'Review and customize the workflow parameters to match your use case',
        screenshot: ''
      },
      {
        step: 3,
        title: 'Test the Workflow',
        description: 'Run a test execution to verify the workflow works as expected',
        screenshot: ''
      },
      {
        step: 4,
        title: 'Enable and Monitor',
        description: 'Enable the workflow and monitor its execution in the dashboard',
        screenshot: ''
      }
    ];

    const usage = `To use this workflow:

1. Make sure all required credentials are configured
2. Customize the workflow parameters as needed
3. Test the workflow with sample data
4. Enable the workflow to start automation

The workflow will ${this.describeWorkflowBehavior(intent)}.`;

    const troubleshooting = [
      {
        problem: 'Workflow not triggering',
        solution: 'Check that the trigger configuration is correct and credentials are valid',
        links: []
      },
      {
        problem: 'Node execution failing',
        solution: 'Review the node configuration and ensure all required fields are filled',
        links: []
      },
      {
        problem: 'Data not flowing correctly',
        solution: 'Check the expressions and data mappings between nodes',
        links: []
      }
    ];

    return {
      overview,
      setup,
      usage,
      troubleshooting,
      relatedTemplates: []
    };
  }

  /**
   * Apply context constraints to intent
   */
  private applyContextConstraints(intent: TemplateIntent, constraints: any): void {
    // Apply max nodes constraint
    if (constraints.maxNodes && intent.actions.length > constraints.maxNodes - 1) {
      intent.actions = intent.actions.slice(0, constraints.maxNodes - 1);
    }

    // Filter forbidden integrations
    if (constraints.forbiddenIntegrations) {
      intent.actions = intent.actions.filter(action =>
        !constraints.forbiddenIntegrations.includes(action.service || '')
      );
    }

    // Ensure required integrations are present
    if (constraints.requiredIntegrations) {
      constraints.requiredIntegrations.forEach((integration: string) => {
        const hasIntegration = intent.integrations.some(i => i.service === integration);
        if (!hasIntegration) {
          intent.integrations.push({
            service: integration,
            operations: [],
            required: true
          });
        }
      });
    }
  }

  // ============================================================
  // SCORING METHODS
  // ============================================================

  private scoreCompleteness(template: GeneratedTemplate): number {
    let score = 0;
    if (template.nodes.length > 0) score += 30;
    if (template.edges.length > 0) score += 20;
    if (template.description) score += 20;
    if (template.documentation.overview) score += 15;
    if (template.tags.length > 0) score += 15;
    return score;
  }

  private scoreDocumentation(template: GeneratedTemplate): number {
    let score = 0;
    const doc = template.documentation;
    if (doc.overview && doc.overview.length > 100) score += 40;
    if (doc.setup && doc.setup.length > 0) score += 30;
    if (doc.usage && doc.usage.length > 50) score += 20;
    if (doc.troubleshooting && doc.troubleshooting.length > 0) score += 10;
    return score;
  }

  private scoreNodeSelection(template: GeneratedTemplate): number {
    const hasTrigger = template.nodes.some(n =>
      ['webhook', 'schedule', 'manual_trigger'].includes(n.type)
    );
    const hasActions = template.nodes.some(n =>
      !['webhook', 'schedule', 'manual_trigger'].includes(n.type)
    );
    const diverseTypes = new Set(template.nodes.map(n => n.type)).size;

    const triggerScore = hasTrigger ? 40 : 0;
    const actionScore = hasActions ? 30 : 0;
    const diversityScore = Math.min(diverseTypes * 5, 30);

    return triggerScore + actionScore + diversityScore;
  }

  private scoreErrorHandling(template: GeneratedTemplate): number {
    const hasErrorHandling = template.nodes.some(n => {
      const config = n.data.config as Record<string, unknown> | undefined;
      return config?.errorHandling || config?.onError;
    });
    return hasErrorHandling ? 100 : 30;
  }

  private scorePerformance(template: GeneratedTemplate): number {
    const nodeCount = template.nodes.length;
    if (nodeCount <= 5) return 100;
    if (nodeCount <= 10) return 80;
    if (nodeCount <= 15) return 60;
    return 40;
  }

  private scoreUsability(template: GeneratedTemplate): number {
    let score = 0;
    const hasGoodNames = template.nodes.every(n => n.data.label && n.data.label.length > 3);
    const hasDescriptions = template.description && template.description.length > 50;
    if (hasGoodNames) score += 50;
    if (hasDescriptions) score += 50;
    return score;
  }

  private scoreMaintainability(template: GeneratedTemplate): number {
    const nodeCount = template.nodes.length;
    const avgConnectionsPerNode = template.edges.length / Math.max(nodeCount, 1);

    let score = 100;
    if (nodeCount > 20) score -= 30;
    if (avgConnectionsPerNode > 3) score -= 20;

    return Math.max(score, 0);
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  private inferCategory(description: string): TemplateCategory {
    const lowerDesc = description.toLowerCase();

    // Score each category by match count for more accurate categorization
    let bestCategory: TemplateCategory = 'integration';
    let bestScore = 0;

    for (const [category, keywords] of Object.entries(this.categoryKeywords)) {
      const matchCount = keywords.filter(kw => lowerDesc.includes(kw)).length;
      // Give bonus points to certain high-priority keywords
      let score = matchCount;

      // Strong indicators for ecommerce
      if (category === 'ecommerce' && (lowerDesc.includes('shopify') || lowerDesc.includes('order') || lowerDesc.includes('inventory'))) {
        score += 2;
      }
      // Strong indicators for social media
      if (category === 'social_media' && (lowerDesc.includes('twitter') || lowerDesc.includes('facebook') || lowerDesc.includes('mention') || lowerDesc.includes('social'))) {
        score += 2;
      }

      if (score > bestScore) {
        bestScore = score;
        bestCategory = category as TemplateCategory;
      }
    }

    return bestCategory;
  }

  private extractKeywords(description: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
    const words = description.toLowerCase().split(/\s+/);
    return words
      .filter(w => w.length > 3 && !stopWords.has(w))
      .slice(0, 10);
  }

  private detectPatterns(description: string, entities: ExtractedEntity[]): string[] {
    const patterns: string[] = [];

    if (/schedule|cron|daily|hourly/.test(description)) patterns.push('scheduled-automation');
    if (/webhook|api|http/.test(description)) patterns.push('api-integration');
    if (/email|notify|alert/.test(description)) patterns.push('notification');
    if (/database|sql|query/.test(description)) patterns.push('database-operation');
    if (/transform|map|convert/.test(description)) patterns.push('data-transformation');

    return patterns;
  }

  private extractEventType(description: string): string | undefined {
    const events = ['order_created', 'user_registered', 'payment_received', 'file_uploaded'];
    return events.find(event => description.toLowerCase().includes(event.replace('_', ' ')));
  }

  private mapActionType(actionType: string): TemplateAction['type'] {
    const mapping: Record<string, TemplateAction['type']> = {
      'fetch': 'api_call',
      'post': 'api_call',
      'notify': 'notification',
      'email': 'notification',
      'save': 'storage',
      'transform': 'transformation',
      'filter': 'transformation',
      'execute': 'custom'
    };
    return mapping[actionType] || 'custom';
  }

  private extractInputs(action: any): string[] {
    return action.parameters ? Object.keys(action.parameters) : ['data'];
  }

  private extractOutputs(action: any): string[] {
    return ['result', 'status'];
  }

  private extractDataFlow(actions: any[]) {
    return actions.slice(0, -1).map((action, i) => ({
      from: `action-${i}`,
      to: `action-${i + 1}`,
      transformation: 'passthrough'
    }));
  }

  private extractIntegrations(entities: ExtractedEntity[]) {
    const services = entities.filter(e => e.type === 'service');
    return services.map(s => ({
      service: s.value,
      operations: [],
      required: true
    }));
  }

  private getTriggerNodeType(type: string): string {
    const types: Record<string, string> = {
      'webhook': 'webhook',
      'schedule': 'schedule',
      'manual': 'manual_trigger',
      'email': 'email_trigger',
      'database': 'database_trigger'
    };
    return types[type] || 'manual_trigger';
  }

  private getTriggerLabel(trigger: any): string {
    if (trigger.type === 'schedule') {
      return `Schedule: ${trigger.schedule || 'Daily'}`;
    }
    if (trigger.type === 'webhook') {
      return 'Webhook Trigger';
    }
    return 'Manual Trigger';
  }

  private getTriggerProperties(trigger: any): Record<string, unknown> {
    if (trigger.type === 'schedule') {
      return { cron: trigger.schedule || '0 9 * * *' };
    }
    if (trigger.type === 'webhook') {
      return { path: trigger.webhookPath || '/webhook/auto' };
    }
    return {};
  }

  private getActionNodeType(action: TemplateAction): string {
    if (action.service) {
      return action.service.toLowerCase();
    }
    return this.actionNodeTypes[action.type] || 'transform';
  }

  private getActionLabel(action: TemplateAction): string {
    if (action.service) {
      return `${action.service}: ${action.operation}`;
    }
    return action.operation;
  }

  private getActionProperties(action: TemplateAction): Record<string, unknown> {
    return {
      operation: action.operation,
      ...action.inputs.reduce((acc, input) => ({ ...acc, [input]: '' }), {}),
      // Add default error handling config to pass validation
      errorHandling: {
        strategy: 'retry',
        retryCount: 3,
        retryDelay: 1000
      }
    };
  }

  private describeTrigger(trigger: any): string {
    if (trigger.type === 'schedule') {
      return `Runs on schedule: ${trigger.schedule || 'Daily at 9 AM'}`;
    }
    if (trigger.type === 'webhook') {
      return `Triggered by incoming webhook`;
    }
    return 'Manual execution';
  }

  private describeAction(action: TemplateAction): string {
    return `${action.type}: ${action.operation}${action.service ? ` (${action.service})` : ''}`;
  }

  private describeWorkflowBehavior(intent: TemplateIntent): string {
    const trigger = intent.trigger.type === 'schedule' ? 'run on schedule' : 'trigger when called';
    const actionCount = intent.actions.length;
    return `${trigger} and execute ${actionCount} action${actionCount > 1 ? 's' : ''}`;
  }

  private estimateExecutionTime(nodes: WorkflowNode[]): number {
    return nodes.length * 2; // Rough estimate: 2 seconds per node
  }

  private getConnectedNodes(edges: WorkflowEdge[]): Set<string> {
    const connected = new Set<string>();
    edges.forEach(edge => {
      connected.add(edge.source);
      connected.add(edge.target);
    });
    return connected;
  }

  private generateTemplateName(intent: TemplateIntent): string {
    const trigger = intent.trigger.type === 'schedule' ? 'Scheduled' : 'Automated';
    const mainAction = intent.actions[0]?.operation || 'Workflow';
    return `${trigger} ${mainAction}`;
  }

  private generateTags(description: string, analysis: NLPAnalysis): string[] {
    const tags = new Set<string>();

    // Add category as tag
    tags.add(analysis.suggestedCategory);

    // Add entity values as tags
    analysis.entities.forEach(entity => {
      if (entity.type === 'service' || entity.type === 'action') {
        tags.add(entity.value.toLowerCase());
      }
    });

    // Add detected patterns
    analysis.detectedPatterns.forEach(pattern => tags.add(pattern));

    // Add complexity
    tags.add(analysis.complexity);

    return Array.from(tags).slice(0, 10);
  }

  private async generateNodesFromFeedback(
    analysis: NLPAnalysis,
    template: GeneratedTemplate
  ): Promise<WorkflowNode[]> {
    const newNodes: WorkflowNode[] = [];

    // Extract services mentioned in feedback
    const services = analysis.entities.filter(e => e.type === 'service');

    services.forEach((service, index) => {
      const nodeId = `added-${uuidv4().substring(0, 8)}`;
      const nodeType = service.value.toLowerCase();
      const xPos = 100;
      const yPos = (template.nodes.length + index) * 150;
      newNodes.push({
        id: nodeId,
        type: nodeType,
        position: {
          x: xPos,
          y: yPos
        },
        data: {
          id: nodeId,
          type: nodeType,
          label: `New ${service.value}`,
          position: { x: xPos, y: yPos },
          icon: 'settings',
          color: '#2196F3',
          inputs: 1,
          outputs: 1,
          config: {}
        }
      });
    });

    return newNodes;
  }

  private removeNodesFromFeedback(
    analysis: NLPAnalysis,
    template: GeneratedTemplate
  ): WorkflowNode[] {
    // Simple removal: remove last node if feedback says "remove"
    return template.nodes.slice(0, -1);
  }

  private regenerateEdges(nodes: WorkflowNode[], oldEdges: WorkflowEdge[]): WorkflowEdge[] {
    const edges: WorkflowEdge[] = [];

    // Keep existing edges that still have valid nodes
    const nodeIds = new Set(nodes.map(n => n.id));
    oldEdges.forEach(edge => {
      if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
        edges.push(edge);
      }
    });

    // Add sequential connections for new nodes
    for (let i = 0; i < nodes.length - 1; i++) {
      const existingEdge = edges.find(e => e.source === nodes[i].id);
      if (!existingEdge) {
        edges.push({
          id: `edge-${i}`,
          source: nodes[i].id,
          target: nodes[i + 1].id,
          animated: false
        });
      }
    }

    return edges;
  }

  /**
   * Get generation statistics
   */
  getStats() {
    return {
      totalGenerations: this.generationCount,
      cacheSize: this.intentRecognizer ? 1 : 0
    };
  }

  /**
   * Create a fallback intent for descriptions that NLP cannot recognize
   */
  private createFallbackIntent(description: string): {
    type: string;
    trigger?: { type: string; schedule?: string };
    actions: Array<{ type: string; service?: string; operation: string; parameters?: Record<string, unknown> }>;
    conditions?: Array<{ field: string; operator: string; value: string }>;
    confidence: number;
  } {
    const lowerDesc = description.toLowerCase();

    // Determine trigger type from description
    let triggerType = 'manual';
    if (/every|daily|hourly|weekly|schedule|cron|morning|afternoon/i.test(lowerDesc)) {
      triggerType = 'schedule';
    } else if (/webhook|http|api/i.test(lowerDesc)) {
      triggerType = 'webhook';
    } else if (/watch|monitor|detect/i.test(lowerDesc)) {
      triggerType = 'watch';
    }

    // Create basic actions based on common keywords
    const actions: Array<{ type: string; service?: string; operation: string; parameters?: Record<string, unknown> }> = [];

    // Check for common action keywords
    if (/process|workflow|step/i.test(lowerDesc)) {
      actions.push({ type: 'transform', operation: 'process', parameters: {} });
    }
    if (/transform|convert|map/i.test(lowerDesc)) {
      actions.push({ type: 'transform', operation: 'transform', parameters: {} });
    }
    if (/fetch|get|retrieve|data/i.test(lowerDesc)) {
      actions.push({ type: 'fetch', service: 'http', operation: 'fetch', parameters: {} });
    }
    if (/save|store|database/i.test(lowerDesc)) {
      actions.push({ type: 'save', service: 'postgres', operation: 'save', parameters: {} });
    }
    if (/send|email|notify|notification/i.test(lowerDesc)) {
      actions.push({ type: 'notify', service: 'email', operation: 'send', parameters: {} });
    }
    if (/sync|synchronize/i.test(lowerDesc)) {
      actions.push({ type: 'sync', operation: 'synchronize', parameters: {} });
    }

    // If still no actions, add a generic process action
    if (actions.length === 0) {
      actions.push({ type: 'transform', operation: 'process', parameters: {} });
      actions.push({ type: 'notify', service: 'email', operation: 'send', parameters: {} });
    }

    return {
      type: triggerType,
      trigger: {
        type: triggerType,
        schedule: triggerType === 'schedule' ? '0 9 * * *' : undefined
      },
      actions,
      conditions: [],
      confidence: 0.6
    };
  }
}

// Export singleton instance
export const aiTemplateGenerator = new AITemplateGenerator();
