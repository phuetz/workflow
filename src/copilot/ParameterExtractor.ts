/**
 * Parameter Extractor for AI Copilot Studio
 *
 * Extracts parameters from natural language using:
 * 1. Named Entity Recognition (NER)
 * 2. Pattern matching
 * 3. Type inference
 * 4. Context-aware extraction
 */

import { ExtractedParameter, ParameterExtractionConfig } from './types/copilot';
import { logger } from '../services/SimpleLogger';

/**
 * Entity pattern for parameter extraction
 */
interface EntityPattern {
  name: string;
  type: ExtractedParameter['type'];
  patterns: RegExp[];
  validator?: (value: string) => boolean;
  transformer?: (value: string) => any;
  priority: number;
}

/**
 * Parameter extractor with NER and pattern matching
 */
export class ParameterExtractor {
  private config: ParameterExtractionConfig;
  private entityPatterns: EntityPattern[];

  constructor(config?: Partial<ParameterExtractionConfig>) {
    this.config = {
      extractNumbers: true,
      extractDates: true,
      extractUrls: true,
      extractEmails: true,
      extractIntegrations: true,
      extractConditions: true,
      customPatterns: [],
      ...config
    };

    this.entityPatterns = this.initializeEntityPatterns();
  }

  /**
   * Extract parameters from natural language text
   */
  async extract(text: string, context?: Record<string, any>): Promise<ExtractedParameter[]> {
    const parameters: ExtractedParameter[] = [];
    const normalizedText = text.toLowerCase();

    // Extract all entity types
    for (const pattern of this.entityPatterns) {
      const extracted = this.extractByPattern(normalizedText, pattern, text);
      parameters.push(...extracted);
    }

    // Deduplicate and resolve conflicts
    const deduplicated = this.deduplicateParameters(parameters);

    // Apply context-aware refinement
    const refined = await this.refineWithContext(deduplicated, context);

    // Infer missing parameters
    const inferred = await this.inferMissingParameters(refined, text, context);

    logger.info(`Extracted ${inferred.length} parameters from text`);

    return inferred;
  }

  /**
   * Extract specific parameter type
   */
  async extractType(
    text: string,
    type: ExtractedParameter['type']
  ): Promise<ExtractedParameter[]> {
    const pattern = this.entityPatterns.find(p => p.type === type);
    if (!pattern) {
      return [];
    }

    return this.extractByPattern(text.toLowerCase(), pattern, text);
  }

  /**
   * Validate extracted parameters
   */
  validateParameters(parameters: ExtractedParameter[]): {
    valid: ExtractedParameter[];
    invalid: ExtractedParameter[];
    warnings: string[];
  } {
    const valid: ExtractedParameter[] = [];
    const invalid: ExtractedParameter[] = [];
    const warnings: string[] = [];

    for (const param of parameters) {
      if (param.confidence < 0.5) {
        warnings.push(`Low confidence for parameter: ${param.name} (${param.confidence})`);
      }

      if (this.isValidParameter(param)) {
        valid.push(param);
      } else {
        invalid.push(param);
      }
    }

    return { valid, invalid, warnings };
  }

  /**
   * Initialize entity patterns
   */
  private initializeEntityPatterns(): EntityPattern[] {
    const patterns: EntityPattern[] = [];

    // Numbers
    if (this.config.extractNumbers) {
      patterns.push({
        name: 'number',
        type: 'number',
        patterns: [
          /\b(\d+(?:\.\d+)?)\s*(seconds?|minutes?|hours?|days?|weeks?|months?|years?)\b/gi,
          /\b(\d+(?:\.\d+)?)\s*(%|percent|percentage)\b/gi,
          /\b(\d+(?:\.\d+)?)\s*(mb|gb|tb|kb)\b/gi,
          /\$(\d+(?:\.\d+)?)/gi,
          /\b(\d+(?:\.\d+)?)\b/gi
        ],
        transformer: (value: string) => parseFloat(value),
        priority: 5
      });
    }

    // Dates and times
    if (this.config.extractDates) {
      patterns.push({
        name: 'date',
        type: 'string',
        patterns: [
          /\b(daily|hourly|weekly|monthly|yearly)\b/gi,
          /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
          /\b(\d{1,2}:\d{2}(?:\s*(?:am|pm))?)\b/gi,
          /\b(\d{4}-\d{2}-\d{2})\b/gi,
          /\b(every\s+\d+\s+(?:minutes?|hours?|days?))\b/gi
        ],
        priority: 8
      });
    }

    // URLs
    if (this.config.extractUrls) {
      patterns.push({
        name: 'url',
        type: 'string',
        patterns: [
          /(https?:\/\/[^\s]+)/gi,
          /\b([a-z0-9-]+\.(?:com|org|net|io|dev|app)[^\s]*)\b/gi
        ],
        validator: (value: string) => {
          try {
            new URL(value.startsWith('http') ? value : `https://${value}`);
            return true;
          } catch {
            return false;
          }
        },
        priority: 9
      });
    }

    // Emails
    if (this.config.extractEmails) {
      patterns.push({
        name: 'email',
        type: 'string',
        patterns: [
          /\b([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})\b/gi
        ],
        validator: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        priority: 10
      });
    }

    // Integrations
    if (this.config.extractIntegrations) {
      patterns.push({
        name: 'integration',
        type: 'node',
        patterns: [
          /\b(slack|teams|discord|email|gmail|outlook)\b/gi,
          /\b(google\s+(?:sheets|drive|calendar|docs))\b/gi,
          /\b(dropbox|onedrive|box)\b/gi,
          /\b(github|gitlab|bitbucket)\b/gi,
          /\b(salesforce|hubspot|pipedrive|zendesk)\b/gi,
          /\b(stripe|paypal|square)\b/gi,
          /\b(aws|azure|gcp|google\s+cloud)\b/gi,
          /\b(postgres|mysql|mongodb|redis)\b/gi,
          /\b(jira|asana|trello|monday|clickup)\b/gi,
          /\b(zapier|ifttt|n8n)\b/gi
        ],
        priority: 9
      });
    }

    // Triggers
    patterns.push({
      name: 'trigger',
      type: 'trigger',
      patterns: [
        /\b(when|whenever|on|trigger(?:ed)?\s+(?:by|on|when))\s+([^,.]+)/gi,
        /\b(if|once)\s+([^,.]+)/gi,
        /\b(webhook|schedule|cron|manual|api\s+call)\b/gi
      ],
      priority: 8
    });

    // Conditions
    if (this.config.extractConditions) {
      patterns.push({
        name: 'condition',
        type: 'condition',
        patterns: [
          /\b(if|when|where|only\s+if)\s+([^,.]+)/gi,
          /\b(greater\s+than|less\s+than|equal\s+to|contains|matches)\s+([^,.]+)/gi,
          /\b(>|<|>=|<=|==|!=|===)\s*([^\s]+)/gi
        ],
        priority: 7
      });
    }

    // File paths
    patterns.push({
      name: 'file',
      type: 'string',
      patterns: [
        /\b([a-z]:\\(?:[^\\/:*?"<>|\r\n]+\\)*[^\\/:*?"<>|\r\n]*)/gi,
        /\b(\/(?:[^\/\s]+\/)*[^\/\s]+)/gi,
        /\b([a-z0-9_-]+\.(?:pdf|csv|xlsx|json|xml|txt|doc|docx))\b/gi
      ],
      priority: 6
    });

    // Actions
    patterns.push({
      name: 'action',
      type: 'node',
      patterns: [
        /\b(send|create|update|delete|fetch|get|post|put|patch)\s+([^,.]+)/gi,
        /\b(notify|alert|email|message|call)\b/gi,
        /\b(save|store|write|read|load)\b/gi,
        /\b(process|transform|convert|parse|format)\b/gi,
        /\b(calculate|compute|sum|count|average)\b/gi
      ],
      priority: 7
    });

    // Variables
    patterns.push({
      name: 'variable',
      type: 'string',
      patterns: [
        /\{\{([^}]+)\}\}/gi,
        /\$\{([^}]+)\}/gi,
        /\b(set|store|save)\s+(\w+)\s+(?:to|=|as)\s+([^,.]+)/gi
      ],
      priority: 6
    });

    // Custom patterns from config
    if (this.config.customPatterns) {
      for (const custom of this.config.customPatterns) {
        patterns.push({
          name: custom.name,
          type: custom.type as ExtractedParameter['type'],
          patterns: [custom.pattern],
          priority: 5
        });
      }
    }

    return patterns.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Extract parameters by pattern
   */
  private extractByPattern(
    normalizedText: string,
    pattern: EntityPattern,
    originalText: string
  ): ExtractedParameter[] {
    const parameters: ExtractedParameter[] = [];

    for (const regex of pattern.patterns) {
      const matches = Array.from(normalizedText.matchAll(regex));

      for (const match of matches) {
        const value = match[1] || match[0];
        const startPos = match.index || 0;
        const endPos = startPos + match[0].length;

        // Validate if validator exists
        if (pattern.validator && !pattern.validator(value)) {
          continue;
        }

        // Transform value if transformer exists
        const transformedValue = pattern.transformer ? pattern.transformer(value) : value;

        // Calculate confidence based on pattern priority and validation
        let confidence = pattern.priority / 10;
        if (pattern.validator) {
          confidence = Math.min(1, confidence + 0.2);
        }

        parameters.push({
          name: pattern.name,
          value: transformedValue,
          type: pattern.type,
          confidence,
          source: 'explicit',
          position: {
            start: startPos,
            end: endPos
          }
        });
      }
    }

    return parameters;
  }

  /**
   * Deduplicate parameters
   */
  private deduplicateParameters(parameters: ExtractedParameter[]): ExtractedParameter[] {
    const seen = new Map<string, ExtractedParameter>();

    for (const param of parameters) {
      const key = `${param.name}-${param.value}`;

      if (!seen.has(key)) {
        seen.set(key, param);
      } else {
        const existing = seen.get(key)!;
        // Keep the one with higher confidence
        if (param.confidence > existing.confidence) {
          seen.set(key, param);
        }
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Refine parameters with context
   */
  private async refineWithContext(
    parameters: ExtractedParameter[],
    context?: Record<string, any>
  ): Promise<ExtractedParameter[]> {
    if (!context) {
      return parameters;
    }

    return parameters.map(param => {
      // Boost confidence if parameter is in context
      if (context[param.name]) {
        return {
          ...param,
          confidence: Math.min(1, param.confidence + 0.1),
          source: 'explicit' as const
        };
      }

      return param;
    });
  }

  /**
   * Infer missing parameters
   */
  private async inferMissingParameters(
    parameters: ExtractedParameter[],
    text: string,
    context?: Record<string, any>
  ): Promise<ExtractedParameter[]> {
    const inferred = [...parameters];
    const normalizedText = text.toLowerCase();

    // If no trigger found, infer from context
    if (!parameters.some(p => p.type === 'trigger')) {
      const inferredTrigger = this.inferTrigger(normalizedText);
      if (inferredTrigger) {
        inferred.push(inferredTrigger);
      }
    }

    // If no action found, infer from verbs
    if (!parameters.some(p => p.type === 'node' && p.name === 'action')) {
      const inferredAction = this.inferAction(normalizedText);
      if (inferredAction) {
        inferred.push(inferredAction);
      }
    }

    // Infer missing required parameters based on detected action type
    const requiredParams = this.inferRequiredParameters(normalizedText, parameters);
    inferred.push(...requiredParams);

    return inferred;
  }

  /**
   * Infer required parameters based on action type
   */
  private inferRequiredParameters(
    text: string,
    existingParams: ExtractedParameter[]
  ): ExtractedParameter[] {
    const inferred: ExtractedParameter[] = [];

    // For messaging/communication actions, infer recipient
    if ((text.includes('send') || text.includes('message') || text.includes('email') || text.includes('notify')) &&
        !existingParams.some(p => p.name === 'recipient' || p.name === 'email' || p.name === 'to')) {
      inferred.push({
        name: 'recipient',
        value: undefined,
        type: 'string',
        confidence: 0.6,
        source: 'inferred',
        required: true
      });
    }

    // For API/fetch actions, infer endpoint
    if ((text.includes('fetch') || text.includes('api') || text.includes('request') || text.includes('get')) &&
        !existingParams.some(p => p.name === 'url' || p.name === 'endpoint')) {
      inferred.push({
        name: 'endpoint',
        value: undefined,
        type: 'string',
        confidence: 0.6,
        source: 'inferred',
        required: true
      });
    }

    // For file operations, infer file path
    if ((text.includes('file') || text.includes('save') || text.includes('read') || text.includes('load')) &&
        !existingParams.some(p => p.name === 'file' || p.name === 'path')) {
      inferred.push({
        name: 'filePath',
        value: undefined,
        type: 'string',
        confidence: 0.5,
        source: 'inferred',
        required: true
      });
    }

    return inferred;
  }

  /**
   * Infer trigger from text
   */
  private inferTrigger(text: string): ExtractedParameter | null {
    const triggerKeywords = [
      { keyword: 'schedule', value: 'schedule', confidence: 0.7 },
      { keyword: 'webhook', value: 'webhook', confidence: 0.8 },
      { keyword: 'email', value: 'email', confidence: 0.7 },
      { keyword: 'file', value: 'file', confidence: 0.6 },
      { keyword: 'manual', value: 'manual', confidence: 0.5 }
    ];

    for (const { keyword, value, confidence } of triggerKeywords) {
      if (text.includes(keyword)) {
        return {
          name: 'trigger',
          value,
          type: 'trigger',
          confidence,
          source: 'inferred'
        };
      }
    }

    return null;
  }

  /**
   * Infer action from text
   */
  private inferAction(text: string): ExtractedParameter | null {
    const actionKeywords = [
      { keyword: 'send', value: 'send', confidence: 0.8 },
      { keyword: 'create', value: 'create', confidence: 0.7 },
      { keyword: 'update', value: 'update', confidence: 0.7 },
      { keyword: 'delete', value: 'delete', confidence: 0.7 },
      { keyword: 'fetch', value: 'http_request', confidence: 0.6 },
      { keyword: 'save', value: 'save', confidence: 0.6 }
    ];

    for (const { keyword, value, confidence } of actionKeywords) {
      if (text.includes(keyword)) {
        return {
          name: 'action',
          value,
          type: 'node',
          confidence,
          source: 'inferred'
        };
      }
    }

    return null;
  }

  /**
   * Validate parameter
   */
  private isValidParameter(param: ExtractedParameter): boolean {
    // Basic validation
    if (!param.name || param.value === undefined || param.value === null) {
      return false;
    }

    // Type-specific validation
    switch (param.type) {
      case 'number':
        return typeof param.value === 'number' && !isNaN(param.value);
      case 'boolean':
        return typeof param.value === 'boolean';
      case 'string':
        return typeof param.value === 'string' && param.value.length > 0;
      case 'array':
        return Array.isArray(param.value);
      case 'object':
        return typeof param.value === 'object' && param.value !== null;
      default:
        return true;
    }
  }
}

/**
 * Singleton instance
 */
export const parameterExtractor = new ParameterExtractor();
