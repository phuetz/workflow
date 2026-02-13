/**
 * Parameter Suggester
 *
 * Suggests default values and configurations for node parameters
 * based on node type, usage patterns, and best practices.
 */

import { WorkflowNode } from '../types/workflow';

export interface ParameterSuggestion {
  field: string;
  value: any;
  description: string;
  confidence: number;
  source: 'default' | 'pattern' | 'history' | 'best-practice';
}

export interface ConfigTemplate {
  name: string;
  description: string;
  config: Record<string, any>;
  useCase: string;
}

export class ParameterSuggester {
  private usageHistory = new Map<string, Map<string, any>>();

  /**
   * Get parameter suggestions for a node
   */
  suggestParameters(
    nodeType: string,
    existingConfig: Record<string, any> = {}
  ): ParameterSuggestion[] {
    const suggestions: ParameterSuggestion[] = [];

    // Get type-specific suggestions
    const typeSuggestions = this.getTypeSpecificSuggestions(nodeType, existingConfig);
    suggestions.push(...typeSuggestions);

    // Get best practice suggestions
    const bestPractices = this.getBestPracticeSuggestions(nodeType);
    suggestions.push(...bestPractices);

    // Get history-based suggestions
    const historySuggestions = this.getHistoryBasedSuggestions(nodeType);
    suggestions.push(...historySuggestions);

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get type-specific parameter suggestions
   */
  private getTypeSpecificSuggestions(
    nodeType: string,
    existingConfig: Record<string, any>
  ): ParameterSuggestion[] {
    const suggestions: ParameterSuggestion[] = [];

    switch (nodeType) {
      case 'httpRequest':
        if (!existingConfig.timeout) {
          suggestions.push({
            field: 'timeout',
            value: 30000,
            description: 'Request timeout in milliseconds',
            confidence: 85,
            source: 'best-practice'
          });
        }

        if (!existingConfig.retry) {
          suggestions.push({
            field: 'retry',
            value: { attempts: 3, delay: 1000 },
            description: 'Retry configuration for failed requests',
            confidence: 80,
            source: 'best-practice'
          });
        }

        if (!existingConfig.headers) {
          suggestions.push({
            field: 'headers',
            value: { 'Content-Type': 'application/json' },
            description: 'Common HTTP headers',
            confidence: 75,
            source: 'default'
          });
        }
        break;

      case 'database':
      case 'mysql':
      case 'postgres':
        if (!existingConfig.timeout) {
          suggestions.push({
            field: 'timeout',
            value: 60000,
            description: 'Query timeout in milliseconds',
            confidence: 85,
            source: 'best-practice'
          });
        }

        if (!existingConfig.maxRetries) {
          suggestions.push({
            field: 'maxRetries',
            value: 3,
            description: 'Maximum retry attempts for failed queries',
            confidence: 80,
            source: 'best-practice'
          });
        }
        break;

      case 'email':
      case 'sendgrid':
        if (!existingConfig.from) {
          suggestions.push({
            field: 'from',
            value: '{{$env.EMAIL_FROM}}',
            description: 'Sender email address from environment',
            confidence: 90,
            source: 'best-practice'
          });
        }

        if (!existingConfig.replyTo) {
          suggestions.push({
            field: 'replyTo',
            value: '{{$env.EMAIL_REPLY_TO}}',
            description: 'Reply-to email address',
            confidence: 70,
            source: 'default'
          });
        }
        break;

      case 'slack':
        if (!existingConfig.channel) {
          suggestions.push({
            field: 'channel',
            value: '#general',
            description: 'Default Slack channel',
            confidence: 75,
            source: 'default'
          });
        }

        if (!existingConfig.username) {
          suggestions.push({
            field: 'username',
            value: 'Workflow Bot',
            description: 'Bot display name',
            confidence: 70,
            source: 'default'
          });
        }
        break;

      case 'forEach':
        if (!existingConfig.batchSize) {
          suggestions.push({
            field: 'batchSize',
            value: 100,
            description: 'Process items in batches to avoid memory issues',
            confidence: 80,
            source: 'best-practice'
          });
        }
        break;

      case 'schedule':
        if (!existingConfig.cron) {
          suggestions.push({
            field: 'cron',
            value: '0 9 * * *',
            description: 'Run daily at 9 AM',
            confidence: 75,
            source: 'pattern'
          });
        }
        break;
    }

    return suggestions;
  }

  /**
   * Get best practice suggestions
   */
  private getBestPracticeSuggestions(nodeType: string): ParameterSuggestion[] {
    const suggestions: ParameterSuggestion[] = [];

    // Error handling suggestions
    if (['httpRequest', 'database', 'webhook'].includes(nodeType)) {
      suggestions.push({
        field: 'errorHandling',
        value: { enabled: true, continueOnError: false },
        description: 'Enable error handling for reliability',
        confidence: 85,
        source: 'best-practice'
      });
    }

    // Logging suggestions
    if (['database', 'payment', 'stripe'].includes(nodeType)) {
      suggestions.push({
        field: 'logging',
        value: { enabled: true, level: 'info' },
        description: 'Enable logging for critical operations',
        confidence: 80,
        source: 'best-practice'
      });
    }

    return suggestions;
  }

  /**
   * Get history-based suggestions
   */
  private getHistoryBasedSuggestions(nodeType: string): ParameterSuggestion[] {
    const suggestions: ParameterSuggestion[] = [];

    const history = this.usageHistory.get(nodeType);
    if (!history) return suggestions;

    for (const [field, value] of history.entries()) {
      suggestions.push({
        field,
        value,
        description: `Frequently used value for ${field}`,
        confidence: 70,
        source: 'history'
      });
    }

    return suggestions;
  }

  /**
   * Get configuration templates for common use cases
   */
  getConfigTemplates(nodeType: string): ConfigTemplate[] {
    const templates: ConfigTemplate[] = [];

    switch (nodeType) {
      case 'slack':
        templates.push(
          {
            name: 'Simple Message',
            description: 'Send a simple text message',
            config: {
              channel: '#general',
              message: 'Hello from workflow!',
              username: 'Workflow Bot'
            },
            useCase: 'Basic notification'
          },
          {
            name: 'Rich Message with Blocks',
            description: 'Send formatted message with blocks',
            config: {
              channel: '#alerts',
              blocks: [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: '*Alert:* {{$json.message}}'
                  }
                }
              ],
              username: 'Alert Bot'
            },
            useCase: 'Formatted alerts'
          }
        );
        break;

      case 'sendgrid':
        templates.push(
          {
            name: 'Welcome Email',
            description: 'Send welcome email to new user',
            config: {
              from: '{{$env.EMAIL_FROM}}',
              to: '{{$json.email}}',
              subject: 'Welcome to our service!',
              html: '<h1>Welcome!</h1><p>Thanks for signing up.</p>'
            },
            useCase: 'User onboarding'
          },
          {
            name: 'Password Reset',
            description: 'Send password reset email',
            config: {
              from: '{{$env.EMAIL_FROM}}',
              to: '{{$json.email}}',
              subject: 'Reset your password',
              html: '<p>Click here to reset: {{$json.resetLink}}</p>'
            },
            useCase: 'Account recovery'
          }
        );
        break;

      case 'stripe':
        templates.push(
          {
            name: 'Create Payment Intent',
            description: 'Create a new payment intent',
            config: {
              operation: 'createPaymentIntent',
              amount: '{{$json.amount}}',
              currency: 'usd',
              paymentMethod: '{{$json.paymentMethodId}}',
              confirm: true
            },
            useCase: 'Accept payments'
          },
          {
            name: 'Create Customer',
            description: 'Create a new Stripe customer',
            config: {
              operation: 'createCustomer',
              email: '{{$json.email}}',
              name: '{{$json.name}}',
              metadata: {
                userId: '{{$json.userId}}'
              }
            },
            useCase: 'Customer management'
          }
        );
        break;

      case 'httpRequest':
        templates.push(
          {
            name: 'GET Request with Auth',
            description: 'Authenticated GET request',
            config: {
              method: 'GET',
              url: 'https://api.example.com/users',
              headers: {
                'Authorization': 'Bearer {{$env.API_TOKEN}}',
                'Content-Type': 'application/json'
              },
              timeout: 30000,
              retry: { attempts: 3 }
            },
            useCase: 'Fetch data from API'
          },
          {
            name: 'POST Request with JSON',
            description: 'POST request with JSON body',
            config: {
              method: 'POST',
              url: 'https://api.example.com/users',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer {{$env.API_TOKEN}}'
              },
              body: {
                name: '{{$json.name}}',
                email: '{{$json.email}}'
              },
              timeout: 30000
            },
            useCase: 'Create resource via API'
          }
        );
        break;
    }

    return templates;
  }

  /**
   * Track parameter usage for learning
   */
  trackUsage(nodeType: string, field: string, value: any): void {
    if (!this.usageHistory.has(nodeType)) {
      this.usageHistory.set(nodeType, new Map());
    }

    this.usageHistory.get(nodeType)!.set(field, value);
  }

  /**
   * Get default value suggestion for a field
   */
  getDefaultValue(nodeType: string, field: string): any {
    const defaults: Record<string, Record<string, any>> = {
      httpRequest: {
        timeout: 30000,
        method: 'GET',
        retry: { attempts: 3, delay: 1000 }
      },
      database: {
        timeout: 60000,
        maxRetries: 3
      },
      email: {
        from: '{{$env.EMAIL_FROM}}'
      },
      slack: {
        channel: '#general',
        username: 'Workflow Bot'
      },
      schedule: {
        cron: '0 9 * * *', // Daily at 9 AM
        timezone: 'UTC'
      },
      forEach: {
        batchSize: 100
      }
    };

    return defaults[nodeType]?.[field];
  }

  /**
   * Validate and suggest corrections for parameter values
   */
  validateAndSuggest(
    nodeType: string,
    field: string,
    value: any
  ): { valid: boolean; suggestion?: any; message?: string } {
    // Timeout validation
    if (field === 'timeout') {
      if (typeof value !== 'number') {
        return {
          valid: false,
          suggestion: 30000,
          message: 'Timeout should be a number in milliseconds'
        };
      }

      if (value < 1000) {
        return {
          valid: false,
          suggestion: 30000,
          message: 'Timeout is too low (< 1 second). Recommended: 30000ms'
        };
      }

      if (value > 300000) {
        return {
          valid: true,
          message: 'Timeout is very high (> 5 minutes). Consider reducing it.'
        };
      }
    }

    // Email validation
    if (field === 'email' || field === 'to' || field === 'from') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isVariable = typeof value === 'string' && (value.includes('{{') || value.includes('$'));

      if (!isVariable && !emailRegex.test(value)) {
        return {
          valid: false,
          message: 'Invalid email format'
        };
      }
    }

    // URL validation
    if (field === 'url') {
      const isVariable = typeof value === 'string' && (value.includes('{{') || value.includes('$'));

      if (!isVariable) {
        try {
          new URL(value);

          // Check if HTTP instead of HTTPS
          if (value.startsWith('http://')) {
            return {
              valid: true,
              suggestion: value.replace('http://', 'https://'),
              message: 'Consider using HTTPS for security'
            };
          }
        } catch {
          return {
            valid: false,
            message: 'Invalid URL format'
          };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Clear usage history
   */
  clearHistory(): void {
    this.usageHistory.clear();
  }
}

export const parameterSuggester = new ParameterSuggester();
