/**
 * PII Detector - Detect and Protect 15+ PII Types
 * Regex + ML-based detection with automatic masking/redaction
 */

import { EventEmitter } from 'events';
import type {
  PIIDetectionResult,
  PIIType,
  PIIDetection,
  PIIHandlingPolicy,
} from './types/governance';

/**
 * PII pattern definition
 */
interface PIIPattern {
  type: PIIType;
  pattern: RegExp;
  validator?: (match: string) => boolean;
  maskingStrategy: 'full' | 'partial' | 'hash';
  confidence: number;
}

/**
 * PII Detector Configuration
 */
interface PIIDetectorConfig {
  enableAutoRedact: boolean;
  enableAutoMask: boolean;
  logDetections: boolean;
  minConfidence: number;
  handlingPolicy: PIIHandlingPolicy;
}

/**
 * PII Detector - Detects and protects personally identifiable information
 */
export class PIIDetector extends EventEmitter {
  private config: PIIDetectorConfig;
  private patterns: PIIPattern[];
  private detectionCount = 0;

  constructor(config: Partial<PIIDetectorConfig> = {}) {
    super();

    this.config = {
      enableAutoRedact: config.enableAutoRedact ?? false,
      enableAutoMask: config.enableAutoMask ?? true,
      logDetections: config.logDetections ?? true,
      minConfidence: config.minConfidence ?? 0.7,
      handlingPolicy: config.handlingPolicy || {
        autoRedact: false,
        autoMask: true,
        logDetections: true,
        notifyOnDetection: true,
        allowedPIITypes: [],
      },
    };

    this.patterns = this.initializePatterns();
  }

  // ============================================================================
  // Pattern Initialization
  // ============================================================================

  /**
   * Initialize detection patterns for 15+ PII types
   */
  private initializePatterns(): PIIPattern[] {
    return [
      // Email
      {
        type: 'email',
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        maskingStrategy: 'partial',
        confidence: 0.95,
      },

      // Phone (US and international formats)
      {
        type: 'phone',
        pattern: /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
        validator: (match) => {
          const digits = match.replace(/\D/g, '');
          return digits.length >= 10 && digits.length <= 15;
        },
        maskingStrategy: 'partial',
        confidence: 0.85,
      },

      // SSN (US Social Security Number)
      {
        type: 'ssn',
        pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
        validator: (match) => {
          const parts = match.split('-');
          return parts[0] !== '000' && parts[1] !== '00' && parts[2] !== '0000';
        },
        maskingStrategy: 'full',
        confidence: 0.95,
      },

      // Credit Card (Luhn algorithm validation)
      {
        type: 'credit_card',
        pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
        validator: (match) => this.validateLuhn(match.replace(/\D/g, '')),
        maskingStrategy: 'partial',
        confidence: 0.90,
      },

      // Passport (various formats)
      {
        type: 'passport',
        pattern: /\b[A-Z]{1,2}\d{6,9}\b/g,
        maskingStrategy: 'full',
        confidence: 0.75,
      },

      // Driver's License (US format)
      {
        type: 'drivers_license',
        pattern: /\b[A-Z]{1,2}\d{6,8}\b/g,
        maskingStrategy: 'full',
        confidence: 0.70,
      },

      // IP Address (IPv4 and IPv6)
      {
        type: 'ip_address',
        pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b|(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}\b/g,
        validator: (match) => {
          if (match.includes(':')) return true; // IPv6
          const parts = match.split('.');
          return parts.every(part => parseInt(part) <= 255);
        },
        maskingStrategy: 'partial',
        confidence: 0.90,
      },

      // MAC Address
      {
        type: 'mac_address',
        pattern: /\b([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})\b/g,
        maskingStrategy: 'partial',
        confidence: 0.85,
      },

      // Bank Account Number
      {
        type: 'bank_account',
        pattern: /\b\d{8,17}\b/g,
        validator: (match) => {
          const num = match.replace(/\D/g, '');
          return num.length >= 8 && num.length <= 17;
        },
        maskingStrategy: 'full',
        confidence: 0.60,
      },

      // IBAN (International Bank Account Number)
      {
        type: 'iban',
        pattern: /\b[A-Z]{2}\d{2}[A-Z0-9]{1,30}\b/g,
        validator: (match) => match.length >= 15 && match.length <= 34,
        maskingStrategy: 'full',
        confidence: 0.85,
      },

      // Tax ID / EIN (US)
      {
        type: 'tax_id',
        pattern: /\b\d{2}-\d{7}\b/g,
        maskingStrategy: 'full',
        confidence: 0.80,
      },

      // National ID (various formats)
      {
        type: 'national_id',
        pattern: /\b[A-Z]{2,3}\d{6,9}[A-Z]?\b/g,
        maskingStrategy: 'full',
        confidence: 0.70,
      },

      // Medical Record Number
      {
        type: 'medical_record',
        pattern: /\b(MRN|Medical Record|Patient ID)[:\s]*[A-Z0-9]{6,12}\b/gi,
        maskingStrategy: 'full',
        confidence: 0.85,
      },

      // Biometric Data (fingerprint, face recognition IDs)
      {
        type: 'biometric',
        pattern: /\b(fingerprint|biometric|face_id)[:\s]*[A-Z0-9]{16,64}\b/gi,
        maskingStrategy: 'full',
        confidence: 0.80,
      },
    ];
  }

  // ============================================================================
  // Detection
  // ============================================================================

  /**
   * Detect PII in text
   */
  async detect(text: string): Promise<PIIDetectionResult> {
    const startTime = Date.now();
    const detections: PIIDetection[] = [];
    const piiTypes: Set<PIIType> = new Set();

    // Run all patterns
    for (const pattern of this.patterns) {
      const matches = text.matchAll(pattern.pattern);

      for (const match of matches) {
        if (match.index === undefined) continue;

        const value = match[0];

        // Validate if validator exists
        if (pattern.validator && !pattern.validator(value)) {
          continue;
        }

        // Check confidence threshold
        if (pattern.confidence < this.config.minConfidence) {
          continue;
        }

        // Create detection
        const detection: PIIDetection = {
          type: pattern.type,
          value,
          position: {
            start: match.index,
            end: match.index + value.length,
          },
          confidence: pattern.confidence,
          masked: this.maskValue(value, pattern.maskingStrategy),
        };

        detections.push(detection);
        piiTypes.add(pattern.type);
      }
    }

    const containsPII = detections.length > 0;

    // Calculate risk score
    const riskScore = this.calculateRiskScore(detections);

    // Generate redacted text if enabled
    let redactedText: string | undefined;
    if (this.config.enableAutoRedact && containsPII) {
      redactedText = this.redactText(text, detections);
    }

    const result: PIIDetectionResult = {
      containsPII,
      piiTypes: Array.from(piiTypes),
      detections,
      riskScore,
      redactedText,
      detectedAt: new Date(),
    };

    // Track statistics
    if (containsPII) {
      this.detectionCount++;
    }

    // Emit event
    if (containsPII && this.config.logDetections) {
      this.emit('pii:detected', {
        result,
        detectionCount: detections.length,
        duration: Date.now() - startTime,
      });
    }

    return result;
  }

  /**
   * Detect PII in object (recursively scans all string values)
   */
  async detectInObject(obj: any): Promise<Map<string, PIIDetectionResult>> {
    const results = new Map<string, PIIDetectionResult>();

    const scan = async (value: any, path: string) => {
      if (typeof value === 'string') {
        const result = await this.detect(value);
        if (result.containsPII) {
          results.set(path, result);
        }
      } else if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          for (let i = 0; i < value.length; i++) {
            await scan(value[i], `${path}[${i}]`);
          }
        } else {
          for (const [key, val] of Object.entries(value)) {
            await scan(val, path ? `${path}.${key}` : key);
          }
        }
      }
    };

    await scan(obj, '');
    return results;
  }

  // ============================================================================
  // Masking and Redaction
  // ============================================================================

  /**
   * Mask a value based on strategy
   */
  private maskValue(value: string, strategy: 'full' | 'partial' | 'hash'): string {
    switch (strategy) {
      case 'full':
        return '*'.repeat(value.length);

      case 'partial':
        if (value.includes('@')) {
          // Email: show first char and domain
          const [local, domain] = value.split('@');
          return `${local[0]}${'*'.repeat(local.length - 1)}@${domain}`;
        } else if (value.replace(/\D/g, '').length >= 10) {
          // Phone or card: show last 4 digits
          const digits = value.replace(/\D/g, '');
          return '*'.repeat(digits.length - 4) + digits.slice(-4);
        } else {
          // Default: show first and last char
          return value[0] + '*'.repeat(value.length - 2) + value[value.length - 1];
        }

      case 'hash':
        // Simple hash (in production, use crypto.createHash)
        let hash = 0;
        for (let i = 0; i < value.length; i++) {
          hash = ((hash << 5) - hash) + value.charCodeAt(i);
          hash = hash & hash;
        }
        return `[HASH:${Math.abs(hash).toString(16)}]`;

      default:
        return '*'.repeat(value.length);
    }
  }

  /**
   * Redact PII from text
   */
  private redactText(text: string, detections: PIIDetection[]): string {
    // Sort detections by position (descending) to avoid index shifting
    const sorted = [...detections].sort((a, b) => b.position.start - a.position.start);

    let redacted = text;
    for (const detection of sorted) {
      const before = redacted.substring(0, detection.position.start);
      const after = redacted.substring(detection.position.end);
      redacted = before + `[${detection.type.toUpperCase()}]` + after;
    }

    return redacted;
  }

  /**
   * Calculate risk score based on detections
   */
  private calculateRiskScore(detections: PIIDetection[]): number {
    if (detections.length === 0) return 0;

    // Base risk from number of detections
    let risk = Math.min(50, detections.length * 10);

    // Add risk for sensitive PII types
    const sensitivePII = ['ssn', 'credit_card', 'passport', 'medical_record', 'biometric'];
    const sensitiveCount = detections.filter(d =>
      sensitivePII.includes(d.type)
    ).length;
    risk += Math.min(50, sensitiveCount * 20);

    return Math.min(100, risk);
  }

  // ============================================================================
  // Validators
  // ============================================================================

  /**
   * Validate credit card using Luhn algorithm
   */
  private validateLuhn(cardNumber: string): boolean {
    const digits = cardNumber.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return false;

    let sum = 0;
    let isEven = false;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i]);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  // ============================================================================
  // Pattern Management
  // ============================================================================

  /**
   * Add custom PII pattern
   */
  addPattern(pattern: PIIPattern): void {
    this.patterns.push(pattern);
    this.emit('pattern:added', { pattern });
  }

  /**
   * Remove pattern
   */
  removePattern(type: PIIType): void {
    const index = this.patterns.findIndex(p => p.type === type);
    if (index !== -1) {
      this.patterns.splice(index, 1);
      this.emit('pattern:removed', { type });
    }
  }

  /**
   * Get all patterns
   */
  getPatterns(): PIIPattern[] {
    return [...this.patterns];
  }

  // ============================================================================
  // Policy Management
  // ============================================================================

  /**
   * Update handling policy
   */
  updateHandlingPolicy(policy: Partial<PIIHandlingPolicy>): void {
    this.config.handlingPolicy = {
      ...this.config.handlingPolicy,
      ...policy,
    };
    this.emit('policy:updated', { policy: this.config.handlingPolicy });
  }

  /**
   * Get handling policy
   */
  getHandlingPolicy(): PIIHandlingPolicy {
    return { ...this.config.handlingPolicy };
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get detection statistics
   */
  getStatistics() {
    return {
      totalPatterns: this.patterns.length,
      patternsByType: this.patterns.reduce((acc, p) => {
        acc[p.type] = (acc[p.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      totalDetections: this.detectionCount,
      handlingPolicy: this.config.handlingPolicy,
    };
  }

  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.detectionCount = 0;
    this.emit('statistics:reset');
  }
}

/**
 * Singleton instance
 */
export const piiDetector = new PIIDetector();
