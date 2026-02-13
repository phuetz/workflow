/**
 * Template Customizer
 * Interactive template customization through conversational interface
 * Allows users to refine templates via natural language
 */

import {
  GeneratedTemplate,
  CustomizationSession,
  CustomizationQuestion,
  ConversationMessage,
  ValidationResult,
  TemplateCustomizerService
} from '../types/aiTemplate';
import { WorkflowNode } from '../types/workflow';
import { logger } from '../services/SimpleLogger';
import { v4 as uuidv4 } from 'uuid';

export class TemplateCustomizer implements TemplateCustomizerService {
  private sessions: Map<string, CustomizationSession> = new Map();
  private readonly sessionTimeout = 30 * 60 * 1000; // 30 minutes

  constructor() {
    logger.info('TemplateCustomizer initialized');

    // Cleanup abandoned sessions every 10 minutes
    setInterval(() => this.cleanupAbandonedSessions(), 10 * 60 * 1000);
  }

  /**
   * Start a new customization session
   */
  startCustomization(template: GeneratedTemplate): CustomizationSession {
    const sessionId = uuidv4();

    // Generate initial questions based on template analysis
    const pendingQuestions = this.generateInitialQuestions(template);

    const session: CustomizationSession = {
      id: sessionId,
      templateId: template.name,
      template,
      conversation: [{
        id: uuidv4(),
        role: 'assistant',
        content: this.generateWelcomeMessage(template),
        timestamp: new Date()
      }],
      pendingQuestions,
      completedAnswers: {},
      status: 'active',
      startedAt: new Date(),
      updatedAt: new Date()
    };

    this.sessions.set(sessionId, session);

    logger.info('Customization session started', {
      sessionId,
      templateName: template.name,
      questionsCount: pendingQuestions.length
    });

    return session;
  }

  /**
   * Ask next question or process user response
   */
  async askQuestion(
    sessionId: string,
    userResponse: string
  ): Promise<CustomizationQuestion | null> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'active') {
      throw new Error('Session is not active');
    }

    // Add user message to conversation
    const userMessage: ConversationMessage = {
      id: uuidv4(),
      role: 'user',
      content: userResponse,
      timestamp: new Date()
    };
    session.conversation.push(userMessage);

    // Process the response
    await this.processUserResponse(session, userResponse);

    // Get next question
    const nextQuestion = this.getNextQuestion(session);

    if (nextQuestion) {
      // Add question to conversation
      const assistantMessage: ConversationMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: nextQuestion.question,
        timestamp: new Date()
      };
      session.conversation.push(assistantMessage);
    } else {
      // No more questions, mark session as completed
      session.status = 'completed';

      const completionMessage: ConversationMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: 'Great! Your template is fully customized and ready to use.',
        timestamp: new Date()
      };
      session.conversation.push(completionMessage);
    }

    session.updatedAt = new Date();
    this.sessions.set(sessionId, session);

    return nextQuestion;
  }

  /**
   * Apply customizations to template
   */
  async applyCustomization(
    sessionId: string,
    updates: Record<string, unknown>
  ): Promise<GeneratedTemplate> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    logger.info('Applying customizations', {
      sessionId,
      updatesCount: Object.keys(updates).length
    });

    // Apply updates to template
    const customizedTemplate = { ...session.template };

    // Update node properties based on answers
    customizedTemplate.nodes = this.applyNodeUpdates(
      session.template.nodes,
      session.completedAnswers
    );

    // Update template metadata
    if (updates.name) {
      customizedTemplate.name = updates.name as string;
    }

    if (updates.description) {
      customizedTemplate.description = updates.description as string;
    }

    if (updates.tags) {
      customizedTemplate.tags = updates.tags as string[];
    }

    // Update session
    session.template = customizedTemplate;
    session.updatedAt = new Date();
    this.sessions.set(sessionId, session);

    logger.info('Customizations applied successfully', {
      sessionId,
      templateName: customizedTemplate.name
    });

    return customizedTemplate;
  }

  /**
   * Get customization progress (0-100)
   */
  getProgress(sessionId: string): number {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return 0;
    }

    const totalQuestions = session.pendingQuestions.length + Object.keys(session.completedAnswers).length;
    const answeredQuestions = Object.keys(session.completedAnswers).length;

    if (totalQuestions === 0) {
      return 100;
    }

    return Math.round((answeredQuestions / totalQuestions) * 100);
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): CustomizationSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): CustomizationSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === 'active');
  }

  /**
   * Cancel a session
   */
  cancelSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'abandoned';
      session.updatedAt = new Date();
      this.sessions.set(sessionId, session);
      logger.info('Session cancelled', { sessionId });
    }
  }

  // ============================================================
  // PRIVATE HELPER METHODS
  // ============================================================

  /**
   * Generate welcome message for customization session
   */
  private generateWelcomeMessage(template: GeneratedTemplate): string {
    return `I've generated a workflow template called "${template.name}" with ${template.nodes.length} nodes.

Let me ask you a few questions to customize it for your specific needs. This will only take a few minutes.

Ready to get started?`;
  }

  /**
   * Generate initial customization questions
   */
  private generateInitialQuestions(template: GeneratedTemplate): CustomizationQuestion[] {
    const questions: CustomizationQuestion[] = [];
    let priority = 10;

    // Question about template name
    questions.push({
      id: uuidv4(),
      type: 'text',
      question: `Would you like to rename this template? Current name: "${template.name}"`,
      context: 'Template naming',
      field: 'templateName',
      required: false,
      defaultValue: template.name,
      priority: priority--
    });

    // Questions about each node
    template.nodes.forEach((node, index) => {
      // Skip trigger nodes (usually don't need customization)
      if (['webhook', 'schedule', 'manual_trigger'].includes(node.type)) {
        // But ask about schedule if it's a schedule trigger
        if (node.type === 'schedule') {
          questions.push({
            id: uuidv4(),
            type: 'text',
            question: `How often should this workflow run? (e.g., "every hour", "daily at 9am", "every monday")`,
            context: 'Schedule configuration',
            field: 'schedule',
            nodeId: node.id,
            required: true,
            validation: {
              pattern: '.+' // Any non-empty string
            },
            priority: priority--
          });
        }
        return;
      }

      // Ask about node configuration
      const nodeConfig = this.analyzeNodeRequirements(node);

      if (nodeConfig.needsCredentials) {
        questions.push({
          id: uuidv4(),
          type: 'credential',
          question: `Which ${node.type} account would you like to use for "${node.data.label}"?`,
          context: `${node.data.label} configuration`,
          field: 'credentials',
          nodeId: node.id,
          required: true,
          priority: priority--
        });
      }

      if (nodeConfig.configurableFields.length > 0) {
        nodeConfig.configurableFields.forEach(field => {
          questions.push({
            id: uuidv4(),
            type: this.inferQuestionType(field),
            question: this.generateFieldQuestion(node, field),
            context: `${node.data.label} - ${field}`,
            field,
            nodeId: node.id,
            required: field.includes('required'),
            priority: priority--
          });
        });
      }
    });

    // Sort by priority
    questions.sort((a, b) => b.priority - a.priority);

    // Limit to top 10 most important questions
    return questions.slice(0, 10);
  }

  /**
   * Analyze what a node needs for configuration
   */
  private analyzeNodeRequirements(node: WorkflowNode): {
    needsCredentials: boolean;
    configurableFields: string[];
  } {
    const credentialTypes = [
      'slack', 'email', 'gmail', 'postgres', 'mysql', 'mongodb',
      'stripe', 'salesforce', 'hubspot', 'shopify', 'twitter'
    ];

    const needsCredentials = credentialTypes.includes(node.type);

    // Fields that should be excluded from customization questions
    const excludedFields = new Set([
      'operation', 'data', 'result', 'status', 'errorHandling',
      'onError', 'retryCount', 'retryDelay', 'inputs', 'outputs'
    ]);

    // Analyze properties to find empty/placeholder values
    const configurableFields: string[] = [];

    if (node.data.config) {
      Object.entries(node.data.config).forEach(([key, value]) => {
        // Skip excluded system fields
        if (excludedFields.has(key)) {
          return;
        }
        // Skip non-string values (like objects for errorHandling)
        if (typeof value === 'object' && value !== null) {
          return;
        }
        if (value === '' || value === null || value === undefined) {
          configurableFields.push(key);
        }
        if (typeof value === 'string' && value.includes('{{') && value.includes('}}')) {
          // Has expression placeholder
          configurableFields.push(key);
        }
      });
    }

    return {
      needsCredentials,
      configurableFields
    };
  }

  /**
   * Infer question type from field name
   */
  private inferQuestionType(field: string): CustomizationQuestion['type'] {
    if (field.includes('email')) return 'text';
    if (field.includes('url') || field.includes('webhook')) return 'text';
    if (field.includes('channel')) return 'text';
    if (field.includes('message') || field.includes('content')) return 'text';
    if (field.includes('enabled') || field.includes('active')) return 'confirm';

    return 'text';
  }

  /**
   * Generate a human-friendly question for a field
   */
  private generateFieldQuestion(node: WorkflowNode, field: string): string {
    const questions: Record<string, string> = {
      'channel': `Which Slack channel should "${node.data.label}" post to?`,
      'message': `What message should "${node.data.label}" send?`,
      'email': `What email address should "${node.data.label}" use?`,
      'subject': `What should the email subject line be?`,
      'url': `What URL should "${node.data.label}" call?`,
      'method': `Which HTTP method should be used? (GET, POST, PUT, DELETE)`,
      'database': `Which database should "${node.data.label}" connect to?`,
      'table': `Which table should "${node.data.label}" use?`,
      'query': `What query should "${node.data.label}" execute?`
    };

    return questions[field] || `Please provide a value for "${field}" in "${node.data.label}":`;
  }

  /**
   * Process user response and update session
   */
  private async processUserResponse(
    session: CustomizationSession,
    response: string
  ): Promise<void> {
    // Get current question
    const currentQuestion = session.pendingQuestions[0];

    if (!currentQuestion) {
      return; // No questions pending
    }

    // Validate response
    const validation = this.validateResponse(currentQuestion, response);

    if (!validation.valid) {
      // Invalid response, add error message
      const errorMessage: ConversationMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: `Sorry, ${validation.message}. ${currentQuestion.question}`,
        timestamp: new Date()
      };
      session.conversation.push(errorMessage);
      return; // Don't remove question, ask again
    }

    // Store answer
    const answerKey = currentQuestion.nodeId ?
      `${currentQuestion.nodeId}.${currentQuestion.field}` :
      currentQuestion.field;

    session.completedAnswers[answerKey] = this.parseResponse(currentQuestion, response);

    // Remove question from pending
    session.pendingQuestions.shift();
  }

  /**
   * Validate user response against question requirements
   */
  private validateResponse(
    question: CustomizationQuestion,
    response: string
  ): ValidationResult {
    // Check if required
    if (question.required && (!response || response.trim() === '')) {
      return {
        field: question.field,
        valid: false,
        message: 'This field is required'
      };
    }

    // Check pattern if specified
    if (question.validation?.pattern) {
      const regex = new RegExp(question.validation.pattern);
      if (!regex.test(response)) {
        return {
          field: question.field,
          valid: false,
          message: 'The format is not valid'
        };
      }
    }

    // Check min/max for numbers
    if (question.type === 'text' && question.validation) {
      if (question.validation.min && response.length < question.validation.min) {
        return {
          field: question.field,
          valid: false,
          message: `Must be at least ${question.validation.min} characters`
        };
      }

      if (question.validation.max && response.length > question.validation.max) {
        return {
          field: question.field,
          valid: false,
          message: `Must be no more than ${question.validation.max} characters`
        };
      }
    }

    return {
      field: question.field,
      valid: true
    };
  }

  /**
   * Parse user response based on question type
   */
  private parseResponse(question: CustomizationQuestion, response: string): unknown {
    switch (question.type) {
      case 'confirm':
        return /^(yes|y|true|1)$/i.test(response.trim());

      case 'select':
        // Find matching option
        const option = question.options?.find(opt =>
          opt.label.toLowerCase() === response.toLowerCase() ||
          String(opt.value).toLowerCase() === response.toLowerCase()
        );
        return option?.value || response;

      case 'multiselect':
        // Parse comma-separated values
        return response.split(',').map(v => v.trim());

      case 'text':
      case 'credential':
      default:
        return response.trim();
    }
  }

  /**
   * Get next unanswered question
   */
  private getNextQuestion(session: CustomizationSession): CustomizationQuestion | null {
    if (session.pendingQuestions.length === 0) {
      return null;
    }

    return session.pendingQuestions[0];
  }

  /**
   * Apply answers to template nodes
   */
  private applyNodeUpdates(
    nodes: WorkflowNode[],
    answers: Record<string, unknown>
  ): WorkflowNode[] {
    return nodes.map(node => {
      const updatedNode = { ...node };

      // Find answers for this node
      const nodeAnswers = Object.entries(answers).filter(([key]) =>
        key.startsWith(`${node.id}.`)
      );

      if (nodeAnswers.length > 0) {
        updatedNode.data = {
          ...updatedNode.data,
          config: {
            ...updatedNode.data.config
          }
        };

        // Apply each answer
        nodeAnswers.forEach(([key, value]) => {
          const field = key.split('.')[1];
          if (updatedNode.data.config) {
            updatedNode.data.config[field] = value;
          }
        });
      }

      return updatedNode;
    });
  }

  /**
   * Clean up abandoned sessions
   */
  private cleanupAbandonedSessions(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of Array.from(this.sessions.entries())) {
      const age = now - session.updatedAt.getTime();

      if (age > this.sessionTimeout && session.status === 'active') {
        session.status = 'abandoned';
        this.sessions.set(sessionId, session);
        cleaned++;
      }

      // Remove very old sessions (24 hours)
      if (age > 24 * 60 * 60 * 1000) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} old customization sessions`);
    }
  }

  /**
   * Get statistics about customization sessions
   */
  getStats() {
    const sessions = Array.from(this.sessions.values());

    return {
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => s.status === 'active').length,
      completedSessions: sessions.filter(s => s.status === 'completed').length,
      abandonedSessions: sessions.filter(s => s.status === 'abandoned').length,
      averageQuestionsPerSession: sessions.length > 0 ?
        sessions.reduce((sum, s) => sum + s.pendingQuestions.length, 0) / sessions.length : 0
    };
  }
}

// Export singleton instance
export const templateCustomizer = new TemplateCustomizer();
