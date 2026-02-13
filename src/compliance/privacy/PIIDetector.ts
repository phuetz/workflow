/**
 * PII Detector
 * Detects and classifies Personally Identifiable Information
 */

import { PIIType, PIIDetectionResult, DataClassification } from '../../types/compliance';

export class PIIDetector {
  private patterns: Map<PIIType, RegExp> = new Map();

  constructor() {
    this.initializePatterns();
  }

  /**
   * Detect PII in data
   */
  detect(data: unknown): PIIDetectionResult {
    const detected: PIIType[] = [];
    const locations: PIIDetectionResult['locations'] = [];

    const searchableData = this.flattenData(data);

    for (const [type, pattern] of this.patterns.entries()) {
      for (const [field, value] of Object.entries(searchableData)) {
        if (typeof value !== 'string') continue;

        const matches = value.match(pattern);
        if (matches) {
          detected.push(type);
          locations.push({
            type,
            field,
            value: this.maskValue(value, type),
            confidence: this.calculateConfidence(value, type),
          });
        }
      }
    }

    const classification = this.determineClassification(detected);
    const recommendations = this.generateRecommendations(detected);

    return {
      detected: detected.length > 0,
      types: [...new Set(detected)],
      locations,
      classification,
      recommendations,
    };
  }

  /**
   * Initialize detection patterns
   */
  private initializePatterns(): void {
    this.patterns.set(PIIType.EMAIL, /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    this.patterns.set(PIIType.PHONE, /\b(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/);
    this.patterns.set(PIIType.SSN, /\b\d{3}-\d{2}-\d{4}\b/);
    this.patterns.set(PIIType.CREDIT_CARD, /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/);
    this.patterns.set(PIIType.IP_ADDRESS, /\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    this.patterns.set(PIIType.PASSPORT, /\b[A-Z]{1,2}\d{6,9}\b/);
    this.patterns.set(PIIType.DRIVERS_LICENSE, /\b[A-Z]{1,2}\d{5,8}\b/);
  }

  /**
   * Flatten nested data structure
   */
  private flattenData(data: unknown, prefix = ''): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    if (data === null || data === undefined) {
      return result;
    }

    if (typeof data !== 'object') {
      result[prefix] = data;
      return result;
    }

    for (const [key, value] of Object.entries(data)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(result, this.flattenData(value, newKey));
      } else {
        result[newKey] = value;
      }
    }

    return result;
  }

  /**
   * Mask sensitive value
   */
  private maskValue(value: string, type: PIIType): string {
    switch (type) {
      case PIIType.EMAIL:
        const [local, domain] = value.split('@');
        return `${local.substring(0, 2)}***@${domain}`;
      case PIIType.PHONE:
        return `***-***-${value.slice(-4)}`;
      case PIIType.SSN:
        return `***-**-${value.slice(-4)}`;
      case PIIType.CREDIT_CARD:
        return `****-****-****-${value.slice(-4)}`;
      default:
        return value.substring(0, 3) + '***';
    }
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(value: string, type: PIIType): number {
    // Simple heuristic - can be enhanced with ML
    const pattern = this.patterns.get(type);
    if (!pattern) return 0;

    const match = value.match(pattern);
    if (!match) return 0;

    // Higher confidence if exact match
    if (match[0] === value) return 0.95;

    // Medium confidence if partial match
    return 0.75;
  }

  /**
   * Determine data classification based on PII types
   */
  private determineClassification(detected: PIIType[]): DataClassification {
    if (detected.includes(PIIType.MEDICAL_RECORD)) {
      return DataClassification.PHI;
    }

    if (detected.includes(PIIType.SSN) || detected.includes(PIIType.CREDIT_CARD)) {
      return DataClassification.RESTRICTED;
    }

    if (detected.length > 0) {
      return DataClassification.PII;
    }

    return DataClassification.PUBLIC;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(detected: PIIType[]): string[] {
    const recommendations: string[] = [];

    if (detected.length === 0) {
      return ['No PII detected'];
    }

    recommendations.push('Encrypt data at rest and in transit');
    recommendations.push('Implement access controls');
    recommendations.push('Enable audit logging');

    if (detected.includes(PIIType.SSN) || detected.includes(PIIType.CREDIT_CARD)) {
      recommendations.push('Consider tokenization');
      recommendations.push('Minimize retention period');
      recommendations.push('Implement strong encryption (AES-256)');
    }

    if (detected.includes(PIIType.MEDICAL_RECORD)) {
      recommendations.push('Ensure HIPAA compliance');
      recommendations.push('Implement BAA with vendors');
    }

    if (detected.includes(PIIType.EMAIL) || detected.includes(PIIType.NAME)) {
      recommendations.push('Enable GDPR data subject rights');
      recommendations.push('Obtain proper consent');
    }

    return recommendations;
  }
}
