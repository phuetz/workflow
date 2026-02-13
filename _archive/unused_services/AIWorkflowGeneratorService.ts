/**
 * AI Workflow Generator Service
 * Converts natural language descriptions into executable workflows
 */

import { LLMService } from './LLMService';
import { WorkflowNode, WorkflowEdge } from '../types/workflow';
import { logger } from './LoggingService';
import { workflowTemplateLibrary } from '../templates/comprehensiveTemplateLibrary';

export interface WorkflowGenerationRequest {
  prompt: string;
  context?: {
    existingNodes?: WorkflowNode[];
    existingEdges?: WorkflowEdge[];
    preferredServices?: string[];
    complexity?: 'simple' | 'medium' | 'complex';
  };
  constraints?: {
    maxNodes?: number;
    budgetLimit?: number;
    requiredIntegrations?: string[];
    excludeIntegrations?: string[];
  };
}

export interface WorkflowGenerationResponse {
  workflow: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    description: string;
  };
  confidence: number;
  explanation: string;
  alternatives?: Array<{
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    description: string;
    score: number;
  }>;
  estimatedCost?: number;
  estimatedExecutionTime?: number;
  suggestedTemplates?: string[];
}

export class AIWorkflowGeneratorService {
  private llmService: LLMService;
  private nodeTypeRegistry: Map<string, any> = new Map();

  constructor(llmService: LLMService) {
    this.llmService = llmService;
    this.initializeNodeRegistry();
  }

  /**
   * Generate a workflow from a natural language description
   */
  async generateWorkflow(request: WorkflowGenerationRequest): Promise<WorkflowGenerationResponse> {
    try {
      logger.info('Generating workflow from prompt:', request.prompt);

      // Step 1: Analyze the intent
      const intent = await this.analyzeIntent(request.prompt);

      // Step 2: Find similar templates
      const similarTemplates = this.findSimilarTemplates(intent, request.constraints);

      // Step 3: Generate workflow using LLM
      const generatedWorkflow = await this.generateWithLLM(request, intent, similarTemplates);

      // Step 4: Validate and optimize
      const validatedWorkflow = this.validateWorkflow(generatedWorkflow);

      // Step 5: Calculate metrics
      const metrics = this.calculateMetrics(validatedWorkflow);

      return {
        workflow: validatedWorkflow,
        confidence: metrics.confidence,
        explanation: this.generateExplanation(validatedWorkflow, intent),
        alternatives: await this.generateAlternatives(request, intent),
        estimatedCost: metrics.estimatedCost,
        estimatedExecutionTime: metrics.estimatedExecutionTime,
        suggestedTemplates: similarTemplates.map(t => t.id).slice(0, 3)
      };
    } catch (error) {
      logger.error('Error generating workflow:', error);
      throw new Error('Failed to generate workflow: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  /**
   * Analyze user intent from natural language prompt
   */
  private async analyzeIntent(prompt: string): Promise<any> {
    const analysisPrompt = `
Analyze this workflow automation request and extract key information:

Request: "${prompt}"

Extract and return in JSON format:
{
  "goal": "main objective",
  "triggers": ["what starts the workflow"],
  "actions": ["what actions to perform"],
  "integrations": ["required services/tools"],
  "conditions": ["any conditional logic"],
  "notifications": ["where to send notifications"],
  "dataFlow": "how data moves through workflow",
  "complexity": "simple|medium|complex"
}
    `;

    try {
      const response = await this.llmService.generateText(
        'gpt-4',
        [{ role: 'user', content: analysisPrompt }],
        { temperature: 0.3, maxTokens: 500 }
      );

      const intent = JSON.parse(response.content);
      return intent;
    } catch (error) {
      logger.error('Error analyzing intent:', error);
      // Fallback to basic analysis
      return this.basicIntentAnalysis(prompt);
    }
  }

  /**
   * Basic intent analysis without LLM
   */
  private basicIntentAnalysis(prompt: string): any {
    const lowerPrompt = prompt.toLowerCase();

    const triggers = [];
    if (lowerPrompt.includes('when') || lowerPrompt.includes('trigger')) {
      triggers.push('webhook');
    }
    if (lowerPrompt.includes('schedule') || lowerPrompt.includes('daily') || lowerPrompt.includes('hourly')) {
      triggers.push('schedule');
    }

    const integrations = [];
    if (lowerPrompt.includes('slack')) integrations.push('slack');
    if (lowerPrompt.includes('email')) integrations.push('email');
    if (lowerPrompt.includes('database') || lowerPrompt.includes('sql')) integrations.push('database');
    if (lowerPrompt.includes('api') || lowerPrompt.includes('http')) integrations.push('httpRequest');

    return {
      goal: prompt,
      triggers,
      actions: ['process', 'transform'],
      integrations,
      conditions: lowerPrompt.includes('if') || lowerPrompt.includes('condition') ? ['conditional'] : [],
      notifications: [],
      dataFlow: 'sequential',
      complexity: integrations.length > 3 ? 'complex' : integrations.length > 1 ? 'medium' : 'simple'
    };
  }

  /**
   * Find similar workflow templates based on intent
   */
  private findSimilarTemplates(intent: any, constraints?: any): any[] {
    const templates = workflowTemplateLibrary;
    const scores = templates.map(template => ({
      template,
      score: this.calculateTemplateSimilarity(template, intent, constraints)
    }));

    return scores
      .sort((a, b) => b.score - a.score)
      .filter(s => s.score > 0.3)
      .map(s => s.template)
      .slice(0, 5);
  }

  /**
   * Calculate similarity between template and intent
   */
  private calculateTemplateSimilarity(template: any, intent: any, constraints?: any): number {
    let score = 0;

    // Check if template tags match intent integrations
    const templateTags = template.tags || [];
    const intentIntegrations = intent.integrations || [];

    const matchingTags = templateTags.filter((tag: string) =>
      intentIntegrations.some((int: string) => tag.toLowerCase().includes(int.toLowerCase()))
    );
    score += matchingTags.length * 0.3;

    // Check complexity match
    if (template.difficulty === intent.complexity) {
      score += 0.2;
    }

    // Check constraints
    if (constraints?.requiredIntegrations) {
      const hasRequired = constraints.requiredIntegrations.every((req: string) =>
        template.requiredIntegrations?.includes(req)
      );
      if (hasRequired) score += 0.3;
    }

    if (constraints?.excludeIntegrations) {
      const hasExcluded = constraints.excludeIntegrations.some((exc: string) =>
        template.requiredIntegrations?.includes(exc)
      );
      if (hasExcluded) score -= 0.5;
    }

    return Math.min(score, 1);
  }

  /**
   * Generate workflow using LLM with context
   */
  private async generateWithLLM(
    request: WorkflowGenerationRequest,
    intent: any,
    similarTemplates: any[]
  ): Promise<any> {
    const systemPrompt = `You are an expert workflow automation designer. Generate workflow configurations based on user requirements.

Available node types: webhook, schedule, httpRequest, database, email, slack, transform, condition, loop, merge, split, delay, error handler.

Return workflow as JSON with this structure:
{
  "description": "clear description of workflow",
  "nodes": [
    {
      "id": "unique-id",
      "type": "node-type",
      "position": { "x": number, "y": number },
      "data": {
        "label": "descriptive label",
        "type": "node-type",
        "properties": { /* node-specific config */ }
      }
    }
  ],
  "edges": [
    {
      "id": "edge-id",
      "source": "source-node-id",
      "target": "target-node-id"
    }
  ]
}`;

    const userPrompt = `
Create a workflow for: "${request.prompt}"

Intent Analysis:
${JSON.stringify(intent, null, 2)}

${similarTemplates.length > 0 ? `
Similar templates for reference:
${similarTemplates.map((t, i) => `${i + 1}. ${t.name}: ${t.description}`).join('\n')}
` : ''}

${request.constraints ? `
Constraints:
${JSON.stringify(request.constraints, null, 2)}
` : ''}

Generate an efficient, well-structured workflow.
    `;

    try {
      const response = await this.llmService.generateText(
        'gpt-4',
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        { temperature: 0.4, maxTokens: 2000 }
      );

      const workflow = JSON.parse(response.content);
      return workflow;
    } catch (error) {
      logger.error('Error generating workflow with LLM:', error);
      // Fallback to template-based generation
      return this.generateFromTemplate(intent, similarTemplates[0]);
    }
  }

  /**
   * Generate workflow from template when LLM fails
   */
  private generateFromTemplate(intent: any, template: any): any {
    if (!template) {
      // Create a basic workflow
      return {
        description: intent.goal,
        nodes: [
          {
            id: 'start-1',
            type: 'webhook',
            position: { x: 100, y: 100 },
            data: {
              label: 'Start',
              type: 'webhook',
              properties: { path: '/webhook' }
            }
          },
          {
            id: 'process-1',
            type: 'javascript',
            position: { x: 300, y: 100 },
            data: {
              label: 'Process',
              type: 'javascript',
              properties: { code: '// Process data\nreturn $input.item;' }
            }
          }
        ],
        edges: [
          {
            id: 'e1',
            source: 'start-1',
            target: 'process-1'
          }
        ]
      };
    }

    // Use template as base
    return {
      description: `Based on ${template.name}: ${intent.goal}`,
      nodes: template.workflow.nodes,
      edges: template.workflow.edges
    };
  }

  /**
   * Validate generated workflow
   */
  private validateWorkflow(workflow: any): any {
    // Ensure all nodes have required fields
    const validatedNodes = workflow.nodes.map((node: any, index: number) => ({
      id: node.id || `node-${index}`,
      type: node.type || 'javascript',
      position: node.position || { x: 100 + index * 200, y: 100 },
      data: {
        label: node.data?.label || node.type,
        type: node.type || 'javascript',
        properties: node.data?.properties || {},
        ...node.data
      }
    }));

    // Validate edges
    const nodeIds = new Set(validatedNodes.map((n: any) => n.id));
    const validatedEdges = workflow.edges.filter((edge: any) =>
      nodeIds.has(edge.source) && nodeIds.has(edge.target)
    );

    return {
      description: workflow.description || 'Generated workflow',
      nodes: validatedNodes,
      edges: validatedEdges
    };
  }

  /**
   * Calculate workflow metrics
   */
  private calculateMetrics(workflow: any): any {
    const nodeCount = workflow.nodes.length;
    const edgeCount = workflow.edges.length;
    const complexity = nodeCount * 0.5 + edgeCount * 0.3;

    return {
      confidence: Math.max(0.5, Math.min(0.95, 1 - (complexity * 0.05))),
      estimatedCost: this.estimateCost(workflow.nodes),
      estimatedExecutionTime: this.estimateExecutionTime(workflow.nodes)
    };
  }

  /**
   * Estimate execution cost based on nodes
   */
  private estimateCost(nodes: any[]): number {
    const costs: Record<string, number> = {
      httpRequest: 0.001,
      database: 0.002,
      email: 0.005,
      slack: 0.001,
      transform: 0.0001,
      javascript: 0.0001,
      default: 0.001
    };

    return nodes.reduce((total, node) => {
      return total + (costs[node.type] || costs.default);
    }, 0);
  }

  /**
   * Estimate execution time based on nodes
   */
  private estimateExecutionTime(nodes: any[]): number {
    const times: Record<string, number> = {
      httpRequest: 500,
      database: 300,
      email: 1000,
      slack: 200,
      transform: 50,
      javascript: 50,
      delay: 0,
      default: 100
    };

    return nodes.reduce((total, node) => {
      if (node.type === 'delay') {
        return total + (node.data?.properties?.delay || 0);
      }
      return total + (times[node.type] || times.default);
    }, 0);
  }

  /**
   * Generate human-readable explanation
   */
  private generateExplanation(workflow: any, intent: any): string {
    const nodeCount = workflow.nodes.length;
    const triggerNode = workflow.nodes.find((n: any) =>
      ['webhook', 'schedule', 'emailTrigger'].includes(n.type)
    );

    let explanation = `This workflow ${workflow.description.toLowerCase()}. `;

    if (triggerNode) {
      explanation += `It starts with a ${triggerNode.type} trigger. `;
    }

    explanation += `It consists of ${nodeCount} steps that process data `;

    const integrations = [...new Set(workflow.nodes.map((n: any) => n.type))];
    if (integrations.length > 2) {
      explanation += `using ${integrations.slice(0, -1).join(', ')} and ${integrations.slice(-1)}. `;
    } else {
      explanation += `using ${integrations.join(' and ')}. `;
    }

    return explanation;
  }

  /**
   * Generate alternative workflow implementations
   */
  private async generateAlternatives(
    request: WorkflowGenerationRequest,
    intent: any
  ): Promise<any[]> {
    // For now, return empty array
    // In production, would generate multiple approaches
    return [];
  }

  /**
   * Initialize node type registry
   */
  private initializeNodeRegistry(): void {
    const nodeTypes = [
      'webhook', 'schedule', 'httpRequest', 'database', 'email', 'slack',
      'transform', 'javascript', 'condition', 'if', 'switch', 'loop',
      'merge', 'split', 'delay', 'errorHandler', 'subworkflow'
    ];

    nodeTypes.forEach(type => {
      this.nodeTypeRegistry.set(type, {
        type,
        defaultProperties: {},
        requiredProperties: []
      });
    });
  }

  /**
   * Generate workflow from user conversation
   */
  async generateFromConversation(messages: Array<{ role: string; content: string }>): Promise<WorkflowGenerationResponse> {
    const conversationSummary = messages.map(m => `${m.role}: ${m.content}`).join('\n');

    const summaryPrompt = `
Based on this conversation, create a workflow automation request:

${conversationSummary}

Extract the core workflow requirement and return as a single sentence starting with "Build a workflow that..."
    `;

    try {
      const response = await this.llmService.generateText(
        'gpt-4',
        [{ role: 'user', content: summaryPrompt }],
        { temperature: 0.3, maxTokens: 200 }
      );

      const extractedPrompt = response.content;
      return this.generateWorkflow({ prompt: extractedPrompt });
    } catch (error) {
      logger.error('Error generating from conversation:', error);
      throw new Error('Failed to extract workflow from conversation');
    }
  }

  /**
   * Enhance existing workflow with AI suggestions
   */
  async enhanceWorkflow(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    enhancementGoal: string
  ): Promise<WorkflowGenerationResponse> {
    const enhancementPrompt = `
Current workflow has ${nodes.length} nodes.
Goal: ${enhancementGoal}

Suggest improvements or additions to this workflow.
    `;

    const request: WorkflowGenerationRequest = {
      prompt: enhancementPrompt,
      context: {
        existingNodes: nodes,
        existingEdges: edges
      }
    };

    return this.generateWorkflow(request);
  }
}

// Export singleton instance
let aiGeneratorService: AIWorkflowGeneratorService | null = null;

export const getAIWorkflowGenerator = (llmService: LLMService): AIWorkflowGeneratorService => {
  if (!aiGeneratorService) {
    aiGeneratorService = new AIWorkflowGeneratorService(llmService);
  }
  return aiGeneratorService;
};
