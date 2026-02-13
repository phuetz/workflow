/**
 * Parameter Inferencer
 * Smart parameter inference and defaults
 * Infers missing parameters from context and provides intelligent defaults
 */

import {
  InferredParameter,
  ConversationContext,
  Intent
} from '../types/nlp';
import { logger } from '../services/SimpleLogger';

export class ParameterInferencer {
  // Default values for common parameters
  private readonly defaults: Record<string, Record<string, unknown>> = {
    slack: {
      channel: '#general',
      username: 'Workflow Bot',
      icon_emoji: ':robot_face:'
    },
    email: {
      subject: 'Workflow Notification',
      from: 'workflows@example.com'
    },
    httpRequest: {
      method: 'GET',
      headers: {},
      timeout: 30000
    },
    postgres: {
      operation: 'insert',
      returnFields: '*'
    },
    schedule: {
      schedule: '0 9 * * *', // 9 AM daily
      timezone: 'UTC',
      enabled: true
    },
    openai: {
      model: 'gpt-4',
      temperature: 0.7,
      max_tokens: 1000
    },
    filter: {
      mode: 'all',
      continueOnFail: false
    },
    transform: {
      mode: 'jsonata'
    }
  };

  // Pattern-based value extraction
  private readonly valuePatterns: Record<string, RegExp[]> = {
    email: [
      /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
      /send to ([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i
    ],
    url: [
      /(https?:\/\/[^\s]+)/g,
      /fetch from (https?:\/\/[^\s]+)/i,
      /api[:\s]+(https?:\/\/[^\s]+)/i
    ],
    channel: [
      /#([a-z0-9-_]+)/gi,
      /channel[:\s]+#?([a-z0-9-_]+)/i,
      /slack channel[:\s]+#?([a-z0-9-_]+)/i
    ],
    schedule: [
      /every (morning|afternoon|evening|night|day|hour|minute|week|month)/gi,
      /at (\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/gi,
      /(daily|hourly|weekly|monthly)/gi,
      /every (\d+) (minutes?|hours?|days?)/gi
    ],
    table: [
      /table[:\s]+([a-z_][a-z0-9_]*)/i,
      /into ([a-z_][a-z0-9_]*) table/i,
      /from ([a-z_][a-z0-9_]*) table/i
    ],
    database: [
      /(postgres|postgresql|mysql|mongodb|redis)(?:ql)?/gi
    ]
  };

  /**
   * Infer parameter value from text
   */
  async inferValue(
    paramName: string,
    text: string,
    context?: ConversationContext
  ): Promise<unknown> {
    logger.debug('Inferring parameter value', { paramName, text });

    // Try to extract from text using patterns
    const extracted = this.extractFromText(paramName, text);
    if (extracted !== null) {
      return extracted;
    }

    // Try to infer from context
    if (context) {
      const fromContext = this.inferFromContext(paramName, context);
      if (fromContext !== null) {
        return fromContext;
      }
    }

    // Return smart default
    return this.getSmartDefault(paramName, text);
  }

  /**
   * Infer all parameters for an intent
   */
  async inferParameters(
    intent: Intent,
    context?: ConversationContext
  ): Promise<InferredParameter[]> {
    const inferred: InferredParameter[] = [];

    // Infer trigger parameters
    if (intent.trigger) {
      if (intent.trigger.type === 'schedule' && !intent.trigger.schedule) {
        const schedule = await this.inferValue(
          'schedule',
          intent.originalText,
          context
        ) as string;

        inferred.push({
          name: 'trigger.schedule',
          value: schedule,
          confidence: 0.8,
          source: 'inferred',
          reasoning: 'Inferred from time-based keywords in text'
        });
      }

      if (intent.trigger.type === 'webhook' && !intent.trigger.webhookPath) {
        inferred.push({
          name: 'trigger.webhookPath',
          value: `/webhook/${Math.random().toString(36).substring(7)}`,
          confidence: 1.0,
          source: 'default',
          reasoning: 'Generated unique webhook path'
        });
      }
    }

    // Infer action parameters
    intent.actions.forEach((action, index) => {
      const actionParams = this.inferActionParameters(
        action.type,
        action.service || action.nodeType || '',
        intent.originalText,
        context
      );

      actionParams.forEach(param => {
        inferred.push({
          ...param,
          name: `action_${index}_${param.name}`
        });
      });
    });

    return inferred;
  }

  /**
   * Extract value from text using patterns
   */
  private extractFromText(paramName: string, text: string): unknown | null {
    const patterns = this.valuePatterns[paramName];
    if (!patterns) return null;

    for (const pattern of patterns) {
      const match = pattern.exec(text);
      if (match) {
        const value = match[1] || match[0];
        logger.debug('Extracted parameter from text', {
          paramName,
          value,
          pattern: pattern.source
        });
        return value;
      }
    }

    return null;
  }

  /**
   * Infer value from conversation context
   */
  private inferFromContext(
    paramName: string,
    context: ConversationContext
  ): unknown | null {
    // Look through previous messages for relevant information
    for (const message of context.messages) {
      if (message.role !== 'user') continue;

      const extracted = this.extractFromText(paramName, message.content);
      if (extracted !== null) {
        return extracted;
      }
    }

    // Check if we have stored preferences
    if (context.userPreferences) {
      const prefKey = `default_${paramName}`;
      if (context.userPreferences[prefKey]) {
        return context.userPreferences[prefKey];
      }
    }

    return null;
  }

  /**
   * Get smart default value
   */
  private getSmartDefault(paramName: string, text: string): unknown {
    // Time-based defaults
    if (paramName === 'schedule') {
      return this.inferScheduleFromText(text);
    }

    // Channel defaults
    if (paramName === 'channel') {
      if (text.includes('alert') || text.includes('critical')) {
        return '#alerts';
      }
      if (text.includes('notification')) {
        return '#notifications';
      }
      return '#general';
    }

    // Email defaults
    if (paramName === 'from') {
      return 'workflows@example.com';
    }

    // Subject defaults
    if (paramName === 'subject') {
      if (text.includes('error') || text.includes('failed')) {
        return 'Workflow Error Alert';
      }
      if (text.includes('report')) {
        return 'Automated Report';
      }
      return 'Workflow Notification';
    }

    // Method defaults
    if (paramName === 'method') {
      if (text.includes('post') || text.includes('send') || text.includes('create')) {
        return 'POST';
      }
      if (text.includes('update')) {
        return 'PUT';
      }
      if (text.includes('delete')) {
        return 'DELETE';
      }
      return 'GET';
    }

    // Model defaults for AI
    if (paramName === 'model') {
      if (text.includes('claude') || text.includes('anthropic')) {
        return 'claude-3-sonnet';
      }
      return 'gpt-4';
    }

    return null;
  }

  /**
   * Infer schedule from text
   */
  private inferScheduleFromText(text: string): string {
    const textLower = text.toLowerCase();

    // Time-based patterns
    const timePatterns: Record<string, string> = {
      'morning': '0 9 * * *',
      '9am': '0 9 * * *',
      '9 am': '0 9 * * *',
      'afternoon': '0 14 * * *',
      'evening': '0 18 * * *',
      'night': '0 22 * * *',
      'midnight': '0 0 * * *',
      'noon': '0 12 * * *'
    };

    for (const [keyword, cron] of Object.entries(timePatterns)) {
      if (textLower.includes(keyword)) {
        return cron;
      }
    }

    // Frequency patterns
    if (textLower.includes('hourly')) return '0 * * * *';
    if (textLower.includes('daily') || textLower.includes('every day')) return '0 0 * * *';
    if (textLower.includes('weekly')) return '0 0 * * 0';
    if (textLower.includes('monthly')) return '0 0 1 * *';

    // Interval patterns
    const intervalMatch = textLower.match(/every (\d+) (minute|hour|day)s?/);
    if (intervalMatch) {
      const count = parseInt(intervalMatch[1]);
      const unit = intervalMatch[2];

      if (unit === 'minute') return `*/${count} * * * *`;
      if (unit === 'hour') return `0 */${count} * * *`;
      if (unit === 'day') return `0 0 */${count} * *`;
    }

    // Default to daily at 9 AM
    return '0 9 * * *';
  }

  /**
   * Infer parameters for specific action
   */
  private inferActionParameters(
    actionType: string,
    service: string,
    text: string,
    context?: ConversationContext
  ): InferredParameter[] {
    const params: InferredParameter[] = [];

    // Service-specific parameters
    if (service === 'slack' || service.includes('slack')) {
      const channel = this.extractFromText('channel', text);
      if (channel) {
        params.push({
          name: 'channel',
          value: channel.toString().startsWith('#') ? channel : `#${channel}`,
          confidence: 0.9,
          source: 'explicit',
          reasoning: 'Channel mentioned in text'
        });
      } else {
        params.push({
          name: 'channel',
          value: '#general',
          confidence: 0.6,
          source: 'default',
          reasoning: 'Using default channel'
        });
      }
    }

    if (service === 'email' || actionType === 'email') {
      const email = this.extractFromText('email', text);
      if (email) {
        params.push({
          name: 'to',
          value: email,
          confidence: 0.95,
          source: 'explicit'
        });
      }

      params.push({
        name: 'subject',
        value: this.getSmartDefault('subject', text),
        confidence: 0.7,
        source: 'inferred',
        reasoning: 'Subject inferred from context'
      });
    }

    if (actionType === 'fetch' || actionType === 'post') {
      const url = this.extractFromText('url', text);
      if (url) {
        params.push({
          name: 'url',
          value: url,
          confidence: 0.95,
          source: 'explicit'
        });
      }

      params.push({
        name: 'method',
        value: this.getSmartDefault('method', text),
        confidence: 0.8,
        source: 'inferred'
      });
    }

    if (actionType === 'save' || actionType === 'store') {
      const table = this.extractFromText('table', text);
      if (table) {
        params.push({
          name: 'table',
          value: table,
          confidence: 0.9,
          source: 'explicit'
        });
      }
    }

    return params;
  }

  /**
   * Get default value for node type
   */
  getDefault(nodeType: string, paramName: string): unknown {
    return this.defaults[nodeType]?.[paramName] || null;
  }

  /**
   * Get all defaults for node type
   */
  getAllDefaults(nodeType: string): Record<string, unknown> {
    return this.defaults[nodeType] || {};
  }
}
