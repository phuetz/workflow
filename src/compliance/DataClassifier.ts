/**
 * Data Classifier
 * Automatically classifies data based on content and context
 */

import { DataClassification, PIIType } from '../types/compliance';

export class DataClassifier {
  private classificationRules: Map<
    DataClassification,
    Array<(data: unknown) => boolean>
  > = new Map();

  constructor() {
    this.initializeRules();
  }

  /**
   * Classify data
   */
  classify(data: unknown, context?: Record<string, unknown>): DataClassification {
    // Check for PHI first (most restrictive)
    if (this.isPHI(data, context)) {
      return DataClassification.PHI;
    }

    // Check for PII
    if (this.isPII(data)) {
      return DataClassification.PII;
    }

    // Check for restricted
    if (this.isRestricted(data, context)) {
      return DataClassification.RESTRICTED;
    }

    // Check for confidential
    if (this.isConfidential(data, context)) {
      return DataClassification.CONFIDENTIAL;
    }

    // Check for internal
    if (this.isInternal(context)) {
      return DataClassification.INTERNAL;
    }

    return DataClassification.PUBLIC;
  }

  private isPHI(data: unknown, context?: Record<string, unknown>): boolean {
    if (!data || typeof data !== 'object') return false;

    const healthKeywords = ['diagnosis', 'medical', 'health', 'patient', 'treatment', 'prescription'];
    const dataStr = JSON.stringify(data).toLowerCase();

    return (
      healthKeywords.some(keyword => dataStr.includes(keyword)) ||
      (context?.type === 'health_data') ||
      (context?.hipaa === true)
    );
  }

  private isPII(data: unknown): boolean {
    if (!data) return false;

    const dataStr = JSON.stringify(data);
    const patterns = [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // Phone
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    ];

    return patterns.some(pattern => pattern.test(dataStr));
  }

  private isRestricted(data: unknown, context?: Record<string, unknown>): boolean {
    if (context?.classification === 'restricted') return true;
    if (context?.confidentialityLevel === 'high') return true;

    const restrictedKeywords = ['secret', 'confidential', 'restricted', 'classified'];
    const dataStr = JSON.stringify(data).toLowerCase();

    return restrictedKeywords.some(keyword => dataStr.includes(keyword));
  }

  private isConfidential(data: unknown, context?: Record<string, unknown>): boolean {
    if (context?.classification === 'confidential') return true;
    if (context?.internal === true) return true;

    const confidentialKeywords = ['internal', 'private', 'proprietary'];
    const dataStr = JSON.stringify(data).toLowerCase();

    return confidentialKeywords.some(keyword => dataStr.includes(keyword));
  }

  private isInternal(context?: Record<string, unknown>): boolean {
    return context?.public === false || context?.internal === true;
  }

  private initializeRules(): void {
    // Placeholder for future rule-based classification
  }
}
