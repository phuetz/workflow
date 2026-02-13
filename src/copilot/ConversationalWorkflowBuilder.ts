/**
 * Conversational Workflow Builder for AI Copilot Studio
 *
 * Multi-turn conversation engine providing:
 * 1. Context-aware dialogue management
 * 2. Intent-driven conversation flow
 * 3. Progressive workflow construction
 * 4. Clarification handling
 * 5. Real-time feedback and suggestions
 */

import {
  CopilotSession,
  ConversationTurn,
  ClarificationQuestion,
  WorkflowSuggestion
} from './types/copilot';
import { Workflow } from '../types/workflowTypes';
import { intentClassifier } from './IntentClassifier';
import { parameterExtractor } from './ParameterExtractor';
import { workflowGenerator } from './WorkflowGenerator';
import { copilotMemory } from './CopilotMemory';
import { workflowOptimizer } from './WorkflowOptimizer';
import { logger } from '../services/SimpleLogger';

/**
 * Conversation state
 */
type ConversationState =
  | 'initial'
  | 'gathering_requirements'
  | 'building_workflow'
  | 'refining'
  | 'completed';

/**
 * Conversational workflow builder with multi-turn support
 */
export class ConversationalWorkflowBuilder {
  private sessions: Map<string, CopilotSession> = new Map();
  private maxTurns: number = 50;
  private contextWindow: number = 10;

  constructor() {
    logger.info('Conversational Workflow Builder initialized');
  }

  /**
   * Start new conversation session
   */
  async startSession(userId: string, initialMessage?: string): Promise<CopilotSession> {
    const sessionId = this.generateSessionId();

    const session: CopilotSession = {
      id: sessionId,
      userId,
      currentTurn: 0,
      turns: [],
      workflowDraft: undefined,
      context: {
        state: 'initial' as ConversationState,
        userId
      },
      startedAt: new Date(),
      lastActivityAt: new Date(),
      status: 'active'
    };

    this.sessions.set(sessionId, session);

    logger.info(`Started session ${sessionId} for user ${userId}`);

    // Process initial message if provided
    if (initialMessage) {
      await this.processMessage(sessionId, initialMessage);
    }

    return session;
  }

  /**
   * Process user message in conversation
   */
  async processMessage(sessionId: string, message: string): Promise<ConversationTurn> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (session.status !== 'active') {
      throw new Error(`Session is not active: ${session.status}`);
    }

    session.currentTurn++;
    session.lastActivityAt = new Date();

    // Get conversation context
    const recentTurns = session.turns.slice(-this.contextWindow);
    const context = this.buildContext(session, recentTurns);

    // Classify intent
    const intent = await intentClassifier.classify(message, context);

    // Extract parameters
    const parameters = await parameterExtractor.extract(message, context);

    // Generate copilot response
    const {
      response,
      suggestions,
      clarifications,
      workflowUpdate
    } = await this.generateResponse(session, message, intent, parameters);

    // Create conversation turn
    const turn: ConversationTurn = {
      id: this.generateId(),
      userMessage: message,
      copilotResponse: response,
      intent,
      extractedParameters: parameters,
      suggestions,
      workflow: workflowUpdate,
      timestamp: new Date(),
      confidence: intent.confidence,
      requiresClarification: clarifications.length > 0,
      clarificationQuestions: clarifications
    };

    session.turns.push(turn);

    // Update workflow draft
    if (workflowUpdate) {
      session.workflowDraft = { ...session.workflowDraft, ...workflowUpdate };
    }

    // Update session state
    this.updateSessionState(session, intent);

    // Check if session should complete
    if (this.shouldCompleteSession(session)) {
      session.status = 'completed';
      await this.finalizeSession(session);
    }

    logger.info(`Processed turn ${session.currentTurn} in session ${sessionId}`);

    return turn;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): CopilotSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * End session
   */
  async endSession(sessionId: string, outcome: 'completed' | 'abandoned'): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return;
    }

    session.status = outcome === 'completed' ? 'completed' : 'abandoned';

    await this.finalizeSession(session);

    logger.info(`Session ${sessionId} ended with outcome: ${outcome}`);
  }

  /**
   * Generate copilot response
   */
  private async generateResponse(
    session: CopilotSession,
    userMessage: string,
    intent: any,
    parameters: any[]
  ): Promise<{
    response: string;
    suggestions: WorkflowSuggestion[];
    clarifications: ClarificationQuestion[];
    workflowUpdate?: Partial<Workflow>;
  }> {
    const state = session.context.state as ConversationState;
    const suggestions: WorkflowSuggestion[] = [];
    const clarifications: ClarificationQuestion[] = [];
    let response = '';
    let workflowUpdate: Partial<Workflow> | undefined;

    // Handle based on intent and state
    switch (intent.intent) {
      case 'create':
        if (state === 'initial' || state === 'gathering_requirements') {
          // Generate workflow
          const result = await workflowGenerator.generate({
            naturalLanguageDescription: userMessage,
            context: session.context
          });

          if (result.success && result.workflow) {
            workflowUpdate = result.workflow;
            response = this.generateCreationResponse(result.workflow, result.confidence);

            // Add optimization suggestions
            const optimizations = await workflowOptimizer.optimize(result.workflow);
            suggestions.push(...this.convertOptimizationsToSuggestions(optimizations));
          } else {
            response = `I had trouble generating that workflow. ${result.reasoning}`;

            if (result.missingParameters && result.missingParameters.length > 0) {
              // Request missing parameters
              clarifications.push(...this.createParameterClarifications(result.missingParameters));
            }
          }
        } else {
          response = "We're already building a workflow. Would you like to modify it or start over?";
        }
        break;

      case 'modify':
        if (session.workflowDraft) {
          const result = await workflowGenerator.generate({
            naturalLanguageDescription: userMessage,
            context: session.context,
            existingWorkflow: session.workflowDraft
          });

          if (result.success && result.workflow) {
            workflowUpdate = result.workflow;
            response = "I've updated the workflow based on your request.";
          } else {
            response = `I couldn't make that modification. ${result.reasoning}`;
          }
        } else {
          response = "There's no workflow to modify yet. Would you like to create one?";
        }
        break;

      case 'explain':
        if (session.workflowDraft) {
          response = this.explainWorkflow(session.workflowDraft);
        } else {
          response = "I can help explain workflows. What would you like to know?";
        }
        break;

      case 'optimize':
        if (session.workflowDraft) {
          const optimizations = await workflowOptimizer.getHighPriorityOptimizations(
            session.workflowDraft as Workflow
          );
          response = this.generateOptimizationResponse(optimizations);
          suggestions.push(...this.convertOptimizationsToSuggestions(optimizations));
        } else {
          response = "Create a workflow first, and I'll help optimize it!";
        }
        break;

      case 'test':
        response = "To test the workflow, I'll need to set up some sample data. What kind of test scenario would you like?";
        break;

      case 'deploy':
        if (session.workflowDraft) {
          response = "Your workflow is ready to deploy! I'll guide you through the deployment process.";
        } else {
          response = "You need to create a workflow before deploying.";
        }
        break;

      default:
        // Get memory-based suggestions
        const memorySuggestions = await copilotMemory.getSuggestions(session.userId, userMessage);
        response = `I understand you want to ${intent.intent}. ${memorySuggestions.length > 0 ? 'Here are some suggestions based on your history:' : ''}`;
        break;
    }

    return {
      response,
      suggestions,
      clarifications,
      workflowUpdate
    };
  }

  /**
   * Build conversation context
   */
  private buildContext(session: CopilotSession, recentTurns: ConversationTurn[]): Record<string, any> {
    return {
      sessionId: session.id,
      userId: session.userId,
      state: session.context.state,
      currentTurn: session.currentTurn,
      hasWorkflowDraft: !!session.workflowDraft,
      recentIntents: recentTurns.map(t => t.intent.intent),
      allParameters: recentTurns.flatMap(t => t.extractedParameters)
    };
  }

  /**
   * Update session state
   */
  private updateSessionState(session: CopilotSession, intent: any): void {
    const currentState = session.context.state as ConversationState;

    switch (intent.intent) {
      case 'create':
        if (currentState === 'initial') {
          session.context.state = 'gathering_requirements';
        } else if (currentState === 'gathering_requirements') {
          session.context.state = 'building_workflow';
        }
        break;

      case 'modify':
      case 'optimize':
        session.context.state = 'refining';
        break;

      case 'deploy':
        session.context.state = 'completed';
        break;
    }
  }

  /**
   * Check if session should complete
   */
  private shouldCompleteSession(session: CopilotSession): boolean {
    // Complete if explicitly deployed
    if (session.context.state === 'completed') {
      return true;
    }

    // Complete if max turns reached
    if (session.currentTurn >= this.maxTurns) {
      return true;
    }

    // Complete if idle for too long (would need timestamp checking)
    return false;
  }

  /**
   * Finalize session
   */
  private async finalizeSession(session: CopilotSession): Promise<void> {
    // Save to user memory
    await copilotMemory.addConversation(session.userId, {
      sessionId: session.id,
      turns: session.turns,
      finalWorkflow: session.workflowDraft as Workflow,
      outcome: session.status === 'completed' ? 'completed' : 'abandoned',
      startedAt: session.startedAt,
      completedAt: new Date()
    });

    // Clean up session
    this.sessions.delete(session.id);
  }

  /**
   * Generate creation response
   */
  private generateCreationResponse(workflow: Partial<Workflow>, confidence: number): string {
    const nodeCount = workflow.nodes?.length || 0;
    const name = workflow.name || 'your workflow';

    let response = `I've created "${name}" with ${nodeCount} node${nodeCount !== 1 ? 's' : ''}. `;

    if (confidence >= 0.9) {
      response += "I'm very confident this matches what you're looking for.";
    } else if (confidence >= 0.7) {
      response += "This should be close to what you need, but let me know if you'd like any changes.";
    } else {
      response += "I've made my best guess based on your description. Please review and let me know what needs adjustment.";
    }

    return response;
  }

  /**
   * Explain workflow
   */
  private explainWorkflow(workflow: Partial<Workflow>): string {
    const nodeCount = workflow.nodes?.length || 0;
    const edgeCount = workflow.edges?.length || 0;

    let explanation = `This workflow has ${nodeCount} node${nodeCount !== 1 ? 's' : ''} connected by ${edgeCount} edge${edgeCount !== 1 ? 's' : ''}. `;

    if (workflow.nodes && workflow.nodes.length > 0) {
      explanation += `It starts with a ${workflow.nodes[0].type} node`;

      if (workflow.nodes.length > 1) {
        explanation += `, followed by ${workflow.nodes.slice(1).map(n => n.type).join(', ')}`;
      }

      explanation += '.';
    }

    return explanation;
  }

  /**
   * Generate optimization response
   */
  private generateOptimizationResponse(optimizations: any[]): string {
    if (optimizations.length === 0) {
      return "Your workflow looks great! I don't see any major optimizations needed.";
    }

    let response = `I found ${optimizations.length} optimization${optimizations.length !== 1 ? 's' : ''}: `;
    response += optimizations.slice(0, 3).map(o => o.title).join(', ');

    if (optimizations.length > 3) {
      response += `, and ${optimizations.length - 3} more`;
    }

    response += '. Would you like me to apply any of these?';

    return response;
  }

  /**
   * Convert optimizations to suggestions
   */
  private convertOptimizationsToSuggestions(optimizations: any[]): WorkflowSuggestion[] {
    return optimizations.map(opt => ({
      id: opt.id,
      type: 'optimization',
      title: opt.title,
      description: opt.description,
      confidence: 0.8,
      priority: opt.priority >= 8 ? 'high' : opt.priority >= 5 ? 'medium' : 'low',
      applicability: opt.priority * 10,
      reasoning: opt.proposedChange
    }));
  }

  /**
   * Create parameter clarifications
   */
  private createParameterClarifications(missingParams: string[]): ClarificationQuestion[] {
    return missingParams.map(param => ({
      id: this.generateId(),
      question: `What should I use for ${param}?`,
      type: 'text' as const,
      required: true,
      context: `Missing parameter: ${param}`
    }));
  }

  /**
   * Generate IDs
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Singleton instance
 */
export const conversationalWorkflowBuilder = new ConversationalWorkflowBuilder();
