/**
 * Prompt Injection Shield - Attack Prevention
 * Detects and blocks 8 types of prompt injection attacks
 */

import { EventEmitter } from 'events';
import type {
  PromptInjectionResult,
  PromptInjectionType,
  InjectionPattern,
  PolicySeverity,
} from './types/governance';

/**
 * Prompt Injection Shield Configuration
 */
interface ShieldConfig {
  enableBlocking: boolean;
  enableSanitization: boolean;
  enableLogging: boolean;
  confidenceThreshold: number; // 0-1
  maxInputLength: number;
}

/**
 * Prompt Injection Shield - Prevents prompt injection attacks
 */
export class PromptInjectionShield extends EventEmitter {
  private config: ShieldConfig;
  private patterns: InjectionPattern[];
  private detectionCount = 0;
  private blockCount = 0;

  constructor(config: Partial<ShieldConfig> = {}) {
    super();

    this.config = {
      enableBlocking: config.enableBlocking ?? true,
      enableSanitization: config.enableSanitization ?? true,
      enableLogging: config.enableLogging ?? true,
      confidenceThreshold: config.confidenceThreshold ?? 0.7,
      maxInputLength: config.maxInputLength ?? 10000,
    };

    this.patterns = this.initializePatterns();
  }

  // ============================================================================
  // Pattern Initialization
  // ============================================================================

  /**
   * Initialize detection patterns for all attack types
   */
  private initializePatterns(): InjectionPattern[] {
    return [
      // Instruction Override Patterns
      {
        id: 'instruction_override_1',
        name: 'Ignore Previous Instructions',
        type: 'instruction_override',
        pattern: /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|commands|prompts?)/i,
        severity: 'critical' as PolicySeverity,
        description: 'Attempts to override system instructions',
      },
      {
        id: 'instruction_override_2',
        name: 'Disregard Instructions',
        type: 'instruction_override',
        pattern: /disregard\s+(all\s+)?(previous|above|system)\s+(instructions|rules)/i,
        severity: 'critical' as PolicySeverity,
        description: 'Attempts to disregard system rules',
      },
      {
        id: 'instruction_override_3',
        name: 'New Instructions',
        type: 'instruction_override',
        pattern: /forget\s+(everything|all)\s+(and|then)\s+(follow|do|execute)/i,
        severity: 'critical' as PolicySeverity,
        description: 'Attempts to inject new instructions',
      },

      // Context Manipulation Patterns
      {
        id: 'context_manipulation_1',
        name: 'Context Reset',
        type: 'context_manipulation',
        pattern: /reset\s+(context|conversation|chat|session)/i,
        severity: 'high' as PolicySeverity,
        description: 'Attempts to reset conversation context',
      },
      {
        id: 'context_manipulation_2',
        name: 'Clear Context',
        type: 'context_manipulation',
        pattern: /clear\s+(all\s+)?(previous|current)\s+(context|memory|history)/i,
        severity: 'high' as PolicySeverity,
        description: 'Attempts to clear context',
      },

      // Role Confusion Patterns
      {
        id: 'role_confusion_1',
        name: 'You Are Now',
        type: 'role_confusion',
        pattern: /you\s+are\s+now\s+(a|an|the)\s+/i,
        severity: 'high' as PolicySeverity,
        description: 'Attempts to reassign AI role',
      },
      {
        id: 'role_confusion_2',
        name: 'Act As',
        type: 'role_confusion',
        pattern: /act\s+as\s+(a|an|if\s+you\s+are)\s+/i,
        severity: 'high' as PolicySeverity,
        description: 'Attempts to change AI behavior',
      },
      {
        id: 'role_confusion_3',
        name: 'Pretend To Be',
        type: 'role_confusion',
        pattern: /pretend\s+(to\s+be|you\s+are)\s+/i,
        severity: 'high' as PolicySeverity,
        description: 'Attempts role impersonation',
      },

      // Goal Hijacking Patterns
      {
        id: 'goal_hijacking_1',
        name: 'Your New Goal',
        type: 'goal_hijacking',
        pattern: /your\s+(new|actual|real)\s+goal\s+(is|should\s+be)/i,
        severity: 'critical' as PolicySeverity,
        description: 'Attempts to change AI goals',
      },
      {
        id: 'goal_hijacking_2',
        name: 'Primary Objective',
        type: 'goal_hijacking',
        pattern: /primary\s+objective\s+(is|changed|now)/i,
        severity: 'critical' as PolicySeverity,
        description: 'Attempts to override primary objective',
      },

      // Data Exfiltration Patterns
      {
        id: 'data_exfiltration_1',
        name: 'System Prompt Leak',
        type: 'data_exfiltration',
        pattern: /(show|tell|reveal|display)\s+(me\s+)?(your\s+)?(system\s+)?(prompt|instructions)/i,
        severity: 'critical' as PolicySeverity,
        description: 'Attempts to leak system prompt',
      },
      {
        id: 'data_exfiltration_2',
        name: 'Configuration Leak',
        type: 'data_exfiltration',
        pattern: /(print|output|display)\s+(your\s+)?(configuration|settings|parameters)/i,
        severity: 'critical' as PolicySeverity,
        description: 'Attempts to leak configuration',
      },
      {
        id: 'data_exfiltration_3',
        name: 'Training Data Leak',
        type: 'data_exfiltration',
        pattern: /what\s+(were|are)\s+you\s+trained\s+(on|with)/i,
        severity: 'medium' as PolicySeverity,
        description: 'Attempts to extract training data info',
      },

      // Privilege Escalation Patterns
      {
        id: 'privilege_escalation_1',
        name: 'Admin Access',
        type: 'privilege_escalation',
        pattern: /(grant|give)\s+(me\s+)?(admin|administrator|root|sudo)\s+(access|privileges|rights)/i,
        severity: 'critical' as PolicySeverity,
        description: 'Attempts to escalate privileges',
      },
      {
        id: 'privilege_escalation_2',
        name: 'Override Restrictions',
        type: 'privilege_escalation',
        pattern: /override\s+(all\s+)?(security|safety|restrictions|limitations)/i,
        severity: 'critical' as PolicySeverity,
        description: 'Attempts to bypass security restrictions',
      },

      // System Prompt Leak Patterns
      {
        id: 'system_prompt_leak_1',
        name: 'Repeat System Prompt',
        type: 'system_prompt_leak',
        pattern: /repeat\s+(everything|all)\s+(above|before|in\s+the\s+system\s+prompt)/i,
        severity: 'critical' as PolicySeverity,
        description: 'Attempts to repeat system prompt',
      },
      {
        id: 'system_prompt_leak_2',
        name: 'Output Instructions',
        type: 'system_prompt_leak',
        pattern: /output\s+(the\s+)?(initial|original|system)\s+(prompt|instructions)/i,
        severity: 'critical' as PolicySeverity,
        description: 'Attempts to output system instructions',
      },

      // Jailbreak Patterns
      {
        id: 'jailbreak_1',
        name: 'DAN Mode',
        type: 'jailbreak',
        pattern: /(do|act)\s+anything\s+now/i,
        severity: 'critical' as PolicySeverity,
        description: 'DAN (Do Anything Now) jailbreak attempt',
      },
      {
        id: 'jailbreak_2',
        name: 'Developer Mode',
        type: 'jailbreak',
        pattern: /enable\s+(developer|debug|unsafe)\s+mode/i,
        severity: 'critical' as PolicySeverity,
        description: 'Developer mode jailbreak attempt',
      },
      {
        id: 'jailbreak_3',
        name: 'No Restrictions',
        type: 'jailbreak',
        pattern: /without\s+any\s+(restrictions|limitations|rules|guidelines)/i,
        severity: 'critical' as PolicySeverity,
        description: 'Attempts to remove all restrictions',
      },
    ];
  }

  // ============================================================================
  // Detection
  // ============================================================================

  /**
   * Analyze input for prompt injection attacks
   */
  async analyze(input: string): Promise<PromptInjectionResult> {
    const startTime = Date.now();

    // Length check
    if (input.length > this.config.maxInputLength) {
      return this.createResult(
        true,
        1.0,
        'jailbreak',
        'critical' as PolicySeverity,
        ['Input exceeds maximum length'],
        input.substring(0, this.config.maxInputLength)
      );
    }

    // Check against all patterns
    const detectedPatterns: string[] = [];
    const attackTypes: Set<PromptInjectionType> = new Set();
    let maxSeverity: PolicySeverity = 'low' as PolicySeverity;
    let maxConfidence = 0;

    for (const pattern of this.patterns) {
      if (pattern.pattern.test(input)) {
        detectedPatterns.push(pattern.name);
        attackTypes.add(pattern.type);
        maxConfidence = Math.max(maxConfidence, 0.9); // Pattern match = high confidence

        // Track highest severity
        if (this.compareSeverity(pattern.severity, maxSeverity) > 0) {
          maxSeverity = pattern.severity;
        }
      }
    }

    const isInjection = detectedPatterns.length > 0;
    const attackType = attackTypes.size > 0 ? Array.from(attackTypes)[0] : undefined;

    // Additional heuristic checks
    const heuristicScore = this.runHeuristicChecks(input);
    if (heuristicScore > this.config.confidenceThreshold) {
      maxConfidence = Math.max(maxConfidence, heuristicScore);
    }

    // Sanitize if enabled
    const sanitizedInput = this.config.enableSanitization && isInjection
      ? this.sanitizeInput(input, detectedPatterns)
      : undefined;

    const result = this.createResult(
      isInjection,
      maxConfidence,
      attackType,
      maxSeverity,
      detectedPatterns,
      sanitizedInput
    );

    // Track statistics
    this.detectionCount++;
    if (isInjection) {
      this.blockCount++;
    }

    // Emit event
    if (isInjection && this.config.enableLogging) {
      this.emit('injection:detected', {
        result,
        input: input.substring(0, 100), // Log only first 100 chars
        duration: Date.now() - startTime,
      });
    }

    return result;
  }

  /**
   * Create result object
   */
  private createResult(
    isInjection: boolean,
    confidence: number,
    attackType: PromptInjectionType | undefined,
    severity: PolicySeverity,
    detectedPatterns: string[],
    sanitizedInput?: string
  ): PromptInjectionResult {
    return {
      isInjection,
      confidence,
      attackType,
      severity,
      detectedPatterns,
      sanitizedInput,
      blockedAt: new Date(),
    };
  }

  /**
   * Run heuristic checks for suspicious patterns
   */
  private runHeuristicChecks(input: string): number {
    let suspicionScore = 0;

    // Check for unusual instruction phrases
    const instructionWords = ['ignore', 'forget', 'disregard', 'override', 'bypass'];
    const instructionCount = instructionWords.filter(word =>
      input.toLowerCase().includes(word)
    ).length;
    suspicionScore += Math.min(0.3, instructionCount * 0.1);

    // Check for role-changing language
    const roleWords = ['you are', 'act as', 'pretend', 'behave like'];
    const roleCount = roleWords.filter(phrase =>
      input.toLowerCase().includes(phrase)
    ).length;
    suspicionScore += Math.min(0.3, roleCount * 0.15);

    // Check for system access attempts
    const systemWords = ['system prompt', 'instructions', 'configuration', 'admin'];
    const systemCount = systemWords.filter(word =>
      input.toLowerCase().includes(word)
    ).length;
    suspicionScore += Math.min(0.4, systemCount * 0.2);

    return suspicionScore;
  }

  /**
   * Sanitize input by removing detected patterns
   */
  private sanitizeInput(input: string, detectedPatterns: string[]): string {
    let sanitized = input;

    // Remove detected pattern matches
    for (const pattern of this.patterns) {
      if (detectedPatterns.includes(pattern.name)) {
        sanitized = sanitized.replace(pattern.pattern, '[FILTERED]');
      }
    }

    return sanitized;
  }

  /**
   * Compare severity levels
   */
  private compareSeverity(a: PolicySeverity, b: PolicySeverity): number {
    const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
    return severityOrder[a] - severityOrder[b];
  }

  // ============================================================================
  // Pattern Management
  // ============================================================================

  /**
   * Add custom pattern
   */
  addPattern(pattern: InjectionPattern): void {
    this.patterns.push(pattern);
    this.emit('pattern:added', { pattern });
  }

  /**
   * Remove pattern
   */
  removePattern(patternId: string): void {
    const index = this.patterns.findIndex(p => p.id === patternId);
    if (index !== -1) {
      this.patterns.splice(index, 1);
      this.emit('pattern:removed', { patternId });
    }
  }

  /**
   * Get all patterns
   */
  getPatterns(): InjectionPattern[] {
    return [...this.patterns];
  }

  /**
   * Get patterns by type
   */
  getPatternsByType(type: PromptInjectionType): InjectionPattern[] {
    return this.patterns.filter(p => p.type === type);
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get detection statistics
   */
  getStatistics() {
    const byType: Record<string, number> = {};

    for (const pattern of this.patterns) {
      byType[pattern.type] = (byType[pattern.type] || 0) + 1;
    }

    return {
      totalPatterns: this.patterns.length,
      patternsByType: byType,
      totalDetections: this.detectionCount,
      totalBlocks: this.blockCount,
      blockRate: this.detectionCount > 0
        ? (this.blockCount / this.detectionCount) * 100
        : 0,
    };
  }

  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.detectionCount = 0;
    this.blockCount = 0;
    this.emit('statistics:reset');
  }
}

/**
 * Singleton instance
 */
export const promptInjectionShield = new PromptInjectionShield();
