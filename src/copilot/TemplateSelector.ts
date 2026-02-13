/**
 * Template Selector for AI Copilot Studio
 *
 * Matches user requests to workflow templates using:
 * 1. Semantic similarity
 * 2. Keyword matching
 * 3. Category classification
 * 4. Usage-based ranking
 */

import { WorkflowTemplate, TemplateMatchResult, ExtractedParameter } from './types/copilot';
import { logger } from '../services/SimpleLogger';

/**
 * Template selector with intelligent matching
 */
export class TemplateSelector {
  private templates: WorkflowTemplate[];
  private categoryKeywords: Map<string, string[]>;

  constructor() {
    this.templates = this.initializeTemplates();
    this.categoryKeywords = this.initializeCategoryKeywords();
  }

  /**
   * Select best matching template
   */
  async selectTemplate(
    description: string,
    parameters: ExtractedParameter[],
    context?: Record<string, any>
  ): Promise<TemplateMatchResult | null> {
    const matches = await this.findMatches(description, parameters);

    if (matches.length === 0) {
      return null;
    }

    // Return best match
    return matches[0];
  }

  /**
   * Find all matching templates
   */
  async findMatches(
    description: string,
    parameters: ExtractedParameter[],
    limit: number = 5
  ): Promise<TemplateMatchResult[]> {
    const results: TemplateMatchResult[] = [];

    for (const template of this.templates) {
      const match = await this.matchTemplate(template, description, parameters);
      results.push(match);
    }

    // Sort by similarity (descending)
    results.sort((a, b) => b.similarity - a.similarity);

    return results.slice(0, limit);
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: string): WorkflowTemplate[] {
    return this.templates.filter(t => t.category === category);
  }

  /**
   * Get popular templates
   */
  getPopularTemplates(limit: number = 10): WorkflowTemplate[] {
    return [...this.templates]
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  /**
   * Get highly rated templates
   */
  getTopRatedTemplates(limit: number = 10): WorkflowTemplate[] {
    return [...this.templates]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
  }

  /**
   * Match template against description
   */
  private async matchTemplate(
    template: WorkflowTemplate,
    description: string,
    parameters: ExtractedParameter[]
  ): Promise<TemplateMatchResult> {
    const normalizedDesc = description.toLowerCase();
    const normalizedName = template.name.toLowerCase();
    const normalizedTemplateDesc = template.description.toLowerCase();

    let similarity = 0;
    const matchedKeywords: string[] = [];
    const missingParameters: string[] = [];

    // Keyword matching (40% weight)
    const keywords = this.extractKeywords(normalizedDesc);
    const templateKeywords = [...template.tags, ...this.extractKeywords(normalizedTemplateDesc)];

    for (const keyword of keywords) {
      if (templateKeywords.some(tk => tk.includes(keyword) || keyword.includes(tk))) {
        matchedKeywords.push(keyword);
      }
    }

    if (keywords.length > 0) {
      similarity += (matchedKeywords.length / keywords.length) * 0.4;
    }

    // Title similarity (20% weight)
    const titleSimilarity = this.calculateStringSimilarity(normalizedDesc, normalizedName);
    similarity += titleSimilarity * 0.2;

    // Description similarity (20% weight)
    const descSimilarity = this.calculateStringSimilarity(normalizedDesc, normalizedTemplateDesc);
    similarity += descSimilarity * 0.2;

    // Parameter coverage (15% weight)
    const parameterNames = parameters.map(p => p.name);
    const templateParamNames = template.requiredParameters.map(p => p.name);

    for (const requiredParam of template.requiredParameters) {
      if (!parameterNames.includes(requiredParam.name)) {
        missingParameters.push(requiredParam.name);
      }
    }

    const paramCoverage = templateParamNames.length > 0
      ? (templateParamNames.length - missingParameters.length) / templateParamNames.length
      : 1;
    similarity += paramCoverage * 0.15;

    // Popularity boost (5% weight)
    const maxUsage = Math.max(...this.templates.map(t => t.usageCount));
    const popularityScore = maxUsage > 0 ? template.usageCount / maxUsage : 0;
    similarity += popularityScore * 0.05;

    // Rating boost (bonus)
    if (template.rating >= 4.5) {
      similarity += 0.05;
    }

    // Generate reasoning
    const reasoning = this.generateMatchReasoning(
      template,
      matchedKeywords,
      missingParameters,
      similarity
    );

    // Calculate confidence
    const confidence = this.calculateConfidence(similarity, missingParameters.length);

    return {
      template,
      similarity: Math.min(1, similarity),
      matchedKeywords,
      missingParameters,
      confidence,
      reasoning
    };
  }

  /**
   * Calculate string similarity (Jaccard similarity)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    // Remove stop words
    const stopWords = new Set([
      'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'can', 'to', 'of', 'in', 'for', 'on', 'with',
      'at', 'by', 'from', 'as', 'and', 'or', 'but', 'not', 'so', 'than',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
    ]);

    return text
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .filter((word, index, self) => self.indexOf(word) === index); // unique
  }

  /**
   * Generate match reasoning
   */
  private generateMatchReasoning(
    template: WorkflowTemplate,
    matchedKeywords: string[],
    missingParameters: string[],
    similarity: number
  ): string {
    const reasons: string[] = [];

    if (matchedKeywords.length > 0) {
      reasons.push(`Matched keywords: ${matchedKeywords.slice(0, 5).join(', ')}`);
    }

    if (similarity >= 0.8) {
      reasons.push('Very high similarity match');
    } else if (similarity >= 0.6) {
      reasons.push('High similarity match');
    } else if (similarity >= 0.4) {
      reasons.push('Moderate similarity match');
    }

    if (missingParameters.length > 0) {
      reasons.push(`Missing parameters: ${missingParameters.join(', ')}`);
    } else {
      reasons.push('All parameters available');
    }

    if (template.rating >= 4.5) {
      reasons.push('Highly rated template');
    }

    if (template.usageCount > 100) {
      reasons.push('Popular template');
    }

    return reasons.join('; ');
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(similarity: number, missingParamCount: number): number {
    let confidence = similarity;

    // Penalize missing parameters
    const penalty = missingParamCount * 0.1;
    confidence = Math.max(0, confidence - penalty);

    return Math.min(1, confidence);
  }

  /**
   * Initialize category keywords
   */
  private initializeCategoryKeywords(): Map<string, string[]> {
    return new Map([
      ['email', ['email', 'mail', 'message', 'send', 'notify', 'inbox', 'gmail', 'outlook']],
      ['data', ['data', 'database', 'sql', 'query', 'store', 'save', 'fetch']],
      ['api', ['api', 'rest', 'http', 'webhook', 'request', 'endpoint']],
      ['integration', ['integrate', 'connect', 'sync', 'link', 'combine']],
      ['notification', ['notify', 'alert', 'message', 'slack', 'teams', 'discord']],
      ['schedule', ['schedule', 'cron', 'timer', 'recurring', 'periodic', 'daily', 'hourly']],
      ['file', ['file', 'document', 'pdf', 'csv', 'upload', 'download', 'storage']],
      ['crm', ['crm', 'customer', 'lead', 'salesforce', 'hubspot', 'contact']],
      ['analytics', ['analytics', 'report', 'metrics', 'dashboard', 'chart', 'stats']],
      ['automation', ['automate', 'workflow', 'process', 'pipeline', 'flow']]
    ]);
  }

  /**
   * Initialize workflow templates
   */
  private initializeTemplates(): WorkflowTemplate[] {
    return [
      // Email automation templates
      {
        id: 'email-send-simple',
        name: 'Send Email',
        description: 'Send an email with custom content',
        category: 'email',
        tags: ['email', 'send', 'notify', 'message'],
        complexity: 'simple',
        nodes: [],
        edges: [],
        requiredParameters: [
          { name: 'to', type: 'string', description: 'Recipient email address' },
          { name: 'subject', type: 'string', description: 'Email subject' },
          { name: 'body', type: 'string', description: 'Email body content' }
        ],
        usageCount: 1523,
        rating: 4.8,
        estimatedTime: 2,
        estimatedCost: 0.01
      },
      {
        id: 'email-on-webhook',
        name: 'Email on Webhook',
        description: 'Send email when webhook is triggered',
        category: 'email',
        tags: ['webhook', 'email', 'trigger', 'automation'],
        complexity: 'simple',
        nodes: [],
        edges: [],
        requiredParameters: [
          { name: 'webhookUrl', type: 'string', description: 'Webhook URL' },
          { name: 'to', type: 'string', description: 'Recipient email' }
        ],
        usageCount: 892,
        rating: 4.6,
        estimatedTime: 3,
        estimatedCost: 0.02
      },

      // Slack automation templates
      {
        id: 'slack-notify',
        name: 'Slack Notification',
        description: 'Send notification to Slack channel',
        category: 'notification',
        tags: ['slack', 'notify', 'message', 'alert'],
        complexity: 'simple',
        nodes: [],
        edges: [],
        requiredParameters: [
          { name: 'channel', type: 'string', description: 'Slack channel' },
          { name: 'message', type: 'string', description: 'Message content' }
        ],
        usageCount: 2134,
        rating: 4.9,
        estimatedTime: 2,
        estimatedCost: 0.01
      },

      // Data processing templates
      {
        id: 'csv-to-database',
        name: 'CSV to Database',
        description: 'Import CSV file data into database',
        category: 'data',
        tags: ['csv', 'database', 'import', 'data', 'etl'],
        complexity: 'moderate',
        nodes: [],
        edges: [],
        requiredParameters: [
          { name: 'csvFile', type: 'string', description: 'CSV file path or URL' },
          { name: 'tableName', type: 'string', description: 'Database table name' }
        ],
        usageCount: 456,
        rating: 4.4,
        estimatedTime: 5,
        estimatedCost: 0.05
      },

      // API integration templates
      {
        id: 'http-to-slack',
        name: 'API to Slack',
        description: 'Fetch data from API and post to Slack',
        category: 'integration',
        tags: ['api', 'http', 'slack', 'integration'],
        complexity: 'moderate',
        nodes: [],
        edges: [],
        requiredParameters: [
          { name: 'apiUrl', type: 'string', description: 'API endpoint URL' },
          { name: 'slackChannel', type: 'string', description: 'Slack channel' }
        ],
        usageCount: 723,
        rating: 4.7,
        estimatedTime: 4,
        estimatedCost: 0.03
      },

      // Schedule templates
      {
        id: 'daily-report',
        name: 'Daily Report',
        description: 'Generate and send daily report',
        category: 'schedule',
        tags: ['schedule', 'daily', 'report', 'cron', 'recurring'],
        complexity: 'moderate',
        nodes: [],
        edges: [],
        requiredParameters: [
          { name: 'schedule', type: 'string', description: 'Schedule expression' },
          { name: 'reportType', type: 'string', description: 'Type of report' }
        ],
        usageCount: 634,
        rating: 4.5,
        estimatedTime: 10,
        estimatedCost: 0.08
      },

      // File processing templates
      {
        id: 'file-upload-process',
        name: 'File Upload Processing',
        description: 'Process files when uploaded',
        category: 'file',
        tags: ['file', 'upload', 'process', 'storage', 'trigger'],
        complexity: 'moderate',
        nodes: [],
        edges: [],
        requiredParameters: [
          { name: 'watchPath', type: 'string', description: 'Path to watch for files' }
        ],
        usageCount: 512,
        rating: 4.3,
        estimatedTime: 6,
        estimatedCost: 0.04
      },

      // CRM templates
      {
        id: 'salesforce-lead-sync',
        name: 'Salesforce Lead Sync',
        description: 'Sync leads to Salesforce',
        category: 'crm',
        tags: ['salesforce', 'crm', 'lead', 'sync', 'integration'],
        complexity: 'complex',
        nodes: [],
        edges: [],
        requiredParameters: [
          { name: 'salesforceInstance', type: 'string', description: 'Salesforce instance URL' },
          { name: 'dataSource', type: 'string', description: 'Source of lead data' }
        ],
        usageCount: 289,
        rating: 4.6,
        estimatedTime: 8,
        estimatedCost: 0.10
      },

      // Multi-step templates
      {
        id: 'webhook-process-notify',
        name: 'Webhook → Process → Notify',
        description: 'Receive webhook, process data, send notification',
        category: 'automation',
        tags: ['webhook', 'process', 'notify', 'workflow', 'automation'],
        complexity: 'moderate',
        nodes: [],
        edges: [],
        requiredParameters: [
          { name: 'webhookUrl', type: 'string', description: 'Webhook URL' },
          { name: 'notificationChannel', type: 'string', description: 'Notification channel' }
        ],
        usageCount: 981,
        rating: 4.7,
        estimatedTime: 5,
        estimatedCost: 0.04
      },

      // Analytics templates
      {
        id: 'google-analytics-report',
        name: 'Google Analytics Report',
        description: 'Generate Google Analytics report',
        category: 'analytics',
        tags: ['google', 'analytics', 'report', 'metrics', 'dashboard'],
        complexity: 'complex',
        nodes: [],
        edges: [],
        requiredParameters: [
          { name: 'propertyId', type: 'string', description: 'GA4 property ID' },
          { name: 'metrics', type: 'array', description: 'Metrics to include' }
        ],
        usageCount: 345,
        rating: 4.4,
        estimatedTime: 7,
        estimatedCost: 0.06
      }
    ];
  }
}

/**
 * Singleton instance
 */
export const templateSelector = new TemplateSelector();
