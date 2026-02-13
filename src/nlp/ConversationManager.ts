/**
 * Conversation Manager
 * Handles multi-turn dialogue for workflow creation
 * Manages context, clarifications, and refinements
 */

import {
  ConversationContext,
  ConversationMessage,
  ClarificationRequest,
  Intent,
  WorkflowGenerationResult,
  TextToWorkflowResult,
  NLPMetrics
} from '../types/nlp';
import { IntentRecognizer } from './IntentRecognizer';
import { WorkflowGenerator } from './WorkflowGenerator';
import { ParameterInferencer } from './ParameterInferencer';
import { logger } from '../services/SimpleLogger';

export class ConversationManager {
  private contexts: Map<string, ConversationContext> = new Map();
  private readonly intentRecognizer: IntentRecognizer;
  private readonly workflowGenerator: WorkflowGenerator;
  private readonly parameterInferencer: ParameterInferencer;
  private readonly contextTimeout: number;

  constructor(options: { contextTimeout?: number } = {}) {
    this.contextTimeout = options.contextTimeout || 300000; // 5 minutes default
    this.intentRecognizer = new IntentRecognizer();
    this.workflowGenerator = new WorkflowGenerator();
    this.parameterInferencer = new ParameterInferencer();

    // Cleanup stale contexts every minute
    setInterval(() => this.cleanupStaleContexts(), 60000);

    logger.info('ConversationManager initialized');
  }

  /**
   * Start a new conversation
   */
  startConversation(): string {
    const contextId = this.generateContextId();
    const context: ConversationContext = {
      id: contextId,
      messages: [],
      clarifications: [],
      startTime: Date.now(),
      lastUpdateTime: Date.now()
    };

    this.contexts.set(contextId, context);
    logger.info('Started new conversation', { contextId });

    return contextId;
  }

  /**
   * Process user message and generate response
   */
  async processMessage(
    contextId: string,
    userMessage: string
  ): Promise<TextToWorkflowResult> {
    const startTime = Date.now();

    try {
      // Get or create context
      let context = this.contexts.get(contextId);
      if (!context) {
        contextId = this.startConversation();
        context = this.contexts.get(contextId)!;
      }

      // Update context
      context.lastUpdateTime = Date.now();

      // Add user message
      const userMsg: ConversationMessage = {
        id: this.generateMessageId(),
        role: 'user',
        content: userMessage,
        timestamp: Date.now()
      };
      context.messages.push(userMsg);

      logger.debug('Processing user message', {
        contextId,
        messageLength: userMessage.length,
        conversationTurns: context.messages.length
      });

      // Check if this is a clarification response
      const isClarification = this.isClarificationResponse(context, userMessage);

      let intent: Intent;
      let workflow: WorkflowGenerationResult | undefined;

      if (isClarification && context.currentIntent) {
        // Apply clarification to existing intent
        intent = await this.applyClarification(
          context,
          context.currentIntent,
          userMessage
        );
      } else {
        // Recognize new intent
        const recognition = await this.intentRecognizer.recognize(userMessage);
        intent = recognition.primaryIntent!;

        if (!intent || recognition.confidence < 0.5) {
          return this.createLowConfidenceResponse(
            contextId,
            recognition.suggestions || [],
            Date.now() - startTime
          );
        }
      }

      // Store current intent
      context.currentIntent = intent;

      // Try to generate workflow
      workflow = await this.workflowGenerator.generate(intent);

      // Check if we need clarification
      const clarification = this.checkForClarification(workflow, context);

      if (clarification) {
        // Add assistant message requesting clarification
        const assistantMsg: ConversationMessage = {
          id: this.generateMessageId(),
          role: 'assistant',
          content: clarification.question,
          timestamp: Date.now(),
          clarificationNeeded: clarification,
          workflowPreview: workflow
        };
        context.messages.push(assistantMsg);
        context.clarifications.push(clarification.field);

        return {
          success: false,
          workflow,
          conversation: context,
          needsClarification: true,
          clarificationRequest: clarification,
          metrics: this.calculateMetrics(context, Date.now() - startTime)
        };
      }

      // Workflow is complete
      context.partialWorkflow = workflow;

      // Add success message
      const assistantMsg: ConversationMessage = {
        id: this.generateMessageId(),
        role: 'assistant',
        content: this.generateSuccessMessage(workflow),
        timestamp: Date.now(),
        intent,
        workflowPreview: workflow
      };
      context.messages.push(assistantMsg);

      return {
        success: true,
        workflow,
        conversation: context,
        needsClarification: false,
        metrics: this.calculateMetrics(context, Date.now() - startTime)
      };

    } catch (error) {
      logger.error('Error processing message:', error);
      return {
        success: false,
        needsClarification: false,
        metrics: {
          intentRecognitionTime: 0,
          workflowGenerationTime: 0,
          totalProcessingTime: Date.now() - startTime,
          entitiesExtracted: 0,
          confidence: 0
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Refine existing workflow based on user feedback
   */
  async refineWorkflow(
    contextId: string,
    refinementRequest: string
  ): Promise<TextToWorkflowResult> {
    const context = this.contexts.get(contextId);
    if (!context || !context.partialWorkflow) {
      throw new Error('No active workflow to refine');
    }

    logger.info('Refining workflow', { contextId, request: refinementRequest });

    // Add refinement as user message
    const userMsg: ConversationMessage = {
      id: this.generateMessageId(),
      role: 'user',
      content: refinementRequest,
      timestamp: Date.now()
    };
    context.messages.push(userMsg);

    // Process refinement
    // For now, treat as new message
    return this.processMessage(contextId, refinementRequest);
  }

  /**
   * Get conversation history
   */
  getConversation(contextId: string): ConversationContext | null {
    return this.contexts.get(contextId) || null;
  }

  /**
   * Clear conversation
   */
  clearConversation(contextId: string): void {
    this.contexts.delete(contextId);
    logger.info('Cleared conversation', { contextId });
  }

  /**
   * Check if message is a clarification response
   */
  private isClarificationResponse(
    context: ConversationContext,
    message: string
  ): boolean {
    if (context.messages.length < 2) return false;

    const lastAssistantMsg = [...context.messages]
      .reverse()
      .find(m => m.role === 'assistant');

    return !!lastAssistantMsg?.clarificationNeeded;
  }

  /**
   * Apply clarification to intent
   */
  private async applyClarification(
    context: ConversationContext,
    intent: Intent,
    clarification: string
  ): Promise<Intent> {
    const lastMsg = context.messages
      .slice()
      .reverse()
      .find(m => m.role === 'assistant' && m.clarificationNeeded);

    if (!lastMsg?.clarificationNeeded) {
      return intent;
    }

    const request = lastMsg.clarificationNeeded;
    const updatedIntent = { ...intent };

    // Infer parameter value from clarification
    const inferredValue = await this.parameterInferencer.inferValue(
      request.field,
      clarification,
      context
    );

    // Update intent based on field
    if (request.field === 'schedule') {
      if (updatedIntent.trigger) {
        updatedIntent.trigger.schedule = inferredValue as string;
      }
    } else if (request.field.startsWith('action_')) {
      // Update action parameter
      const actionIndex = parseInt(request.field.split('_')[1]);
      if (updatedIntent.actions[actionIndex]) {
        const paramName = request.field.split('_')[2];
        updatedIntent.actions[actionIndex].parameters = {
          ...updatedIntent.actions[actionIndex].parameters,
          [paramName]: inferredValue
        };
      }
    }

    return updatedIntent;
  }

  /**
   * Check if clarification is needed
   */
  private checkForClarification(
    workflow: WorkflowGenerationResult,
    context: ConversationContext
  ): ClarificationRequest | null {
    // Don't ask same question twice
    const alreadyAsked = context.clarifications;

    // Check for missing parameters
    if (workflow.missingParameters && workflow.missingParameters.length > 0) {
      const missing = workflow.missingParameters[0];

      // Parse parameter format: "NodeLabel: missing 'paramName'"
      const match = missing.match(/missing "(\w+)"/);
      if (match) {
        const paramName = match[1];

        if (!alreadyAsked.includes(paramName)) {
          return this.createClarificationRequest(paramName, workflow);
        }
      }
    }

    // Check for low confidence actions
    const lowConfidenceAction = workflow.intent.actions.find(
      a => a.confidence < 0.7
    );

    if (lowConfidenceAction && !alreadyAsked.includes('service')) {
      return {
        type: 'ambiguous_intent',
        question: `Which service should I use for "${lowConfidenceAction.type}"?`,
        field: 'service',
        suggestions: ['Slack', 'Email', 'Discord', 'Teams']
      };
    }

    return null;
  }

  /**
   * Create clarification request for parameter
   */
  private createClarificationRequest(
    paramName: string,
    workflow: WorkflowGenerationResult
  ): ClarificationRequest {
    const questions: Record<string, ClarificationRequest> = {
      channel: {
        type: 'missing_parameter',
        question: 'Which Slack channel should I send messages to?',
        field: 'channel',
        suggestions: ['#general', '#notifications', '#alerts']
      },
      to: {
        type: 'missing_parameter',
        question: 'What email address should I send to?',
        field: 'to',
        suggestions: []
      },
      url: {
        type: 'missing_parameter',
        question: 'What URL should I fetch data from?',
        field: 'url',
        suggestions: []
      },
      schedule: {
        type: 'missing_parameter',
        question: 'When should this workflow run? (e.g., "every morning", "hourly", "daily at 9am")',
        field: 'schedule',
        suggestions: ['Every morning at 9am', 'Hourly', 'Daily at 6pm', 'Every Monday']
      },
      table: {
        type: 'missing_parameter',
        question: 'Which database table should I use?',
        field: 'table',
        suggestions: ['users', 'orders', 'products', 'logs']
      },
      subject: {
        type: 'missing_parameter',
        question: 'What should the email subject be?',
        field: 'subject',
        suggestions: []
      }
    };

    return questions[paramName] || {
      type: 'missing_parameter',
      question: `Please provide a value for "${paramName}"`,
      field: paramName,
      suggestions: []
    };
  }

  /**
   * Generate success message
   */
  private generateSuccessMessage(workflow: WorkflowGenerationResult): string {
    const nodeCount = workflow.nodes.length;
    const workflowName = workflow.intent.metadata?.suggestedName || 'workflow';

    let message = `Great! I've created a ${workflowName} with ${nodeCount} nodes. `;

    if (workflow.warnings && workflow.warnings.length > 0) {
      message += `\n\nNote: ${workflow.warnings[0]}`;
    }

    if (workflow.suggestions && workflow.suggestions.length > 0) {
      message += `\n\nSuggestion: ${workflow.suggestions[0]}`;
    }

    message += '\n\nYou can now execute this workflow or make further refinements!';

    return message;
  }

  /**
   * Create low confidence response
   */
  private createLowConfidenceResponse(
    contextId: string,
    suggestions: string[],
    processingTime: number
  ): TextToWorkflowResult {
    const context = this.contexts.get(contextId);

    const assistantMsg: ConversationMessage = {
      id: this.generateMessageId(),
      role: 'assistant',
      content: `I'm not quite sure what workflow you want to create. ${suggestions[0] || 'Could you provide more details?'}`,
      timestamp: Date.now()
    };

    if (context) {
      context.messages.push(assistantMsg);
    }

    return {
      success: false,
      conversation: context,
      needsClarification: true,
      clarificationRequest: {
        type: 'ambiguous_intent',
        question: 'Could you describe the workflow in more detail?',
        field: 'intent',
        suggestions: [
          'Every morning fetch data and send to Slack',
          'When webhook received, save to database',
          'Watch for new files and process them'
        ]
      },
      metrics: {
        intentRecognitionTime: processingTime,
        workflowGenerationTime: 0,
        totalProcessingTime: processingTime,
        entitiesExtracted: 0,
        confidence: 0,
        conversationTurns: context?.messages.length || 0
      }
    };
  }

  /**
   * Calculate metrics
   */
  private calculateMetrics(
    context: ConversationContext,
    totalTime: number
  ): NLPMetrics {
    return {
      intentRecognitionTime: totalTime * 0.3,
      workflowGenerationTime: totalTime * 0.7,
      totalProcessingTime: totalTime,
      entitiesExtracted: context.currentIntent?.entities.length || 0,
      confidence: context.currentIntent?.confidence || 0,
      conversationTurns: context.messages.filter(m => m.role === 'user').length
    };
  }

  /**
   * Cleanup stale contexts
   */
  private cleanupStaleContexts(): void {
    const now = Date.now();
    let cleaned = 0;

    this.contexts.forEach((context, id) => {
      if (now - context.lastUpdateTime > this.contextTimeout) {
        this.contexts.delete(id);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} stale conversation contexts`);
    }
  }

  /**
   * Generate context ID
   */
  private generateContextId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Generate message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}
