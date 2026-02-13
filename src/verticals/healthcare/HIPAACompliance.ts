/**
 * HIPAA Compliance Module
 * Automatic PHI detection, encryption, access control, breach notification
 */

import crypto from 'crypto';
import { logger } from '../../services/SimpleLogger';
import type {
  PHIType,
  PHIElement,
  HIPAAAccessLog,
  HIPAABreachNotification,
  EncryptedPHI,
  HIPAAConsentRecord,
} from './types/healthcare';

export class HIPAACompliance {
  private encryptionKey: Buffer;
  private accessLogs: HIPAAAccessLog[] = [];
  private breaches: HIPAABreachNotification[] = [];
  private consents: Map<string, HIPAAConsentRecord[]> = new Map();

  constructor(encryptionKey?: string) {
    // Use provided key or generate one (in production, load from secure vault)
    this.encryptionKey = encryptionKey
      ? Buffer.from(encryptionKey, 'base64')
      : crypto.randomBytes(32);
  }

  /**
   * Detect PHI in data
   */
  detectPHI(data: any, path = ''): PHIElement[] {
    const elements: PHIElement[] = [];

    if (typeof data === 'string') {
      elements.push(...this.detectPHIInString(data, path));
    } else if (Array.isArray(data)) {
      data.forEach((item, index) => {
        elements.push(...this.detectPHI(item, `${path}[${index}]`));
      });
    } else if (typeof data === 'object' && data !== null) {
      for (const [key, value] of Object.entries(data)) {
        const fieldPath = path ? `${path}.${key}` : key;

        // Check field name for PHI indicators
        const fieldPHI = this.detectPHIFromFieldName(key, value, fieldPath);
        if (fieldPHI) {
          elements.push(fieldPHI);
        }

        // Recursively check value
        elements.push(...this.detectPHI(value, fieldPath));
      }
    }

    return elements;
  }

  /**
   * Detect PHI from field name
   */
  private detectPHIFromFieldName(
    fieldName: string,
    value: any,
    path: string
  ): PHIElement | null {
    const lowerField = fieldName.toLowerCase();

    const fieldPatterns: Record<string, PHIType> = {
      name: 'name',
      firstname: 'name',
      lastname: 'name',
      fullname: 'name',
      address: 'address',
      street: 'address',
      city: 'address',
      zip: 'address',
      zipcode: 'address',
      postalcode: 'address',
      dob: 'dob',
      birthdate: 'dob',
      dateofbirth: 'dob',
      ssn: 'ssn',
      socialsecurity: 'ssn',
      mrn: 'mrn',
      medicalrecord: 'mrn',
      patientid: 'mrn',
      phone: 'phone',
      telephone: 'phone',
      mobile: 'phone',
      email: 'email',
      emailaddress: 'email',
    };

    for (const [pattern, type] of Object.entries(fieldPatterns)) {
      if (lowerField.includes(pattern)) {
        return {
          type,
          value: String(value),
          location: path,
          confidence: 0.9,
        };
      }
    }

    return null;
  }

  /**
   * Detect PHI in string value
   */
  private detectPHIInString(value: string, path: string): PHIElement[] {
    const elements: PHIElement[] = [];

    // SSN pattern (XXX-XX-XXXX or XXXXXXXXX)
    const ssnPattern = /\b\d{3}-\d{2}-\d{4}\b|\b\d{9}\b/g;
    const ssnMatches = value.match(ssnPattern);
    if (ssnMatches) {
      elements.push({
        type: 'ssn',
        value: ssnMatches[0],
        location: path,
        confidence: 0.95,
      });
    }

    // Phone pattern (XXX-XXX-XXXX, (XXX) XXX-XXXX, etc.)
    const phonePattern = /\b(?:\+?1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})\b/g;
    const phoneMatches = value.match(phonePattern);
    if (phoneMatches) {
      elements.push({
        type: 'phone',
        value: phoneMatches[0],
        location: path,
        confidence: 0.85,
      });
    }

    // Email pattern
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emailMatches = value.match(emailPattern);
    if (emailMatches) {
      elements.push({
        type: 'email',
        value: emailMatches[0],
        location: path,
        confidence: 0.9,
      });
    }

    // Date of birth pattern (MM/DD/YYYY, MM-DD-YYYY)
    const dobPattern = /\b(0?[1-9]|1[0-2])[/-](0?[1-9]|[12][0-9]|3[01])[/-](19|20)\d{2}\b/g;
    const dobMatches = value.match(dobPattern);
    if (dobMatches) {
      elements.push({
        type: 'dob',
        value: dobMatches[0],
        location: path,
        confidence: 0.8,
      });
    }

    // IP address pattern
    const ipPattern = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;
    const ipMatches = value.match(ipPattern);
    if (ipMatches) {
      elements.push({
        type: 'ip',
        value: ipMatches[0],
        location: path,
        confidence: 0.7,
      });
    }

    return elements;
  }

  /**
   * Encrypt PHI data
   */
  encryptPHI(data: string): EncryptedPHI {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      algorithm: 'AES-256-GCM',
      keyId: this.encryptionKey.toString('base64').substring(0, 16),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  }

  /**
   * Decrypt PHI data
   */
  decryptPHI(encryptedData: EncryptedPHI): string {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      Buffer.from(encryptedData.iv, 'base64')
    );

    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'base64'));

    let decrypted = decipher.update(encryptedData.encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Redact PHI from data
   */
  redactPHI(data: any, phiElements: PHIElement[]): any {
    if (typeof data === 'string') {
      let redacted = data;
      for (const phi of phiElements) {
        redacted = redacted.replace(phi.value, this.getRedactionMask(phi.type));
      }
      return redacted;
    }

    if (Array.isArray(data)) {
      return data.map((item, index) => {
        const itemPath = `[${index}]`;
        const itemPHI = phiElements.filter(phi => phi.location.startsWith(itemPath));
        return this.redactPHI(item, itemPHI);
      });
    }

    if (typeof data === 'object' && data !== null) {
      const redacted: any = {};
      for (const [key, value] of Object.entries(data)) {
        const fieldPHI = phiElements.filter(phi =>
          phi.location === key || phi.location.startsWith(`${key}.`)
        );

        if (fieldPHI.some(phi => phi.location === key)) {
          redacted[key] = this.getRedactionMask(fieldPHI[0].type);
        } else {
          redacted[key] = this.redactPHI(value, fieldPHI);
        }
      }
      return redacted;
    }

    return data;
  }

  /**
   * Get redaction mask for PHI type
   */
  private getRedactionMask(type: PHIType): string {
    const masks: Record<PHIType, string> = {
      name: '[REDACTED NAME]',
      address: '[REDACTED ADDRESS]',
      dob: '[REDACTED DOB]',
      ssn: '***-**-****',
      mrn: '[REDACTED MRN]',
      phone: '***-***-****',
      email: '[REDACTED EMAIL]',
      ip: '***.***.***.***',
      biometric: '[REDACTED BIOMETRIC]',
      photo: '[REDACTED PHOTO]',
      account: '[REDACTED ACCOUNT]',
      license: '[REDACTED LICENSE]',
      device: '[REDACTED DEVICE]',
    };

    return masks[type] || '[REDACTED]';
  }

  /**
   * Log access to PHI
   */
  logAccess(log: Omit<HIPAAAccessLog, 'timestamp'>): void {
    this.accessLogs.push({
      ...log,
      timestamp: new Date(),
    });

    // In production, persist to audit database
    logger.debug('[HIPAA Audit]', log);
  }

  /**
   * Get access logs
   */
  getAccessLogs(filters?: {
    userId?: string;
    patientId?: string;
    action?: HIPAAAccessLog['action'];
    startDate?: Date;
    endDate?: Date;
  }): HIPAAAccessLog[] {
    let logs = this.accessLogs;

    if (filters) {
      if (filters.userId) {
        logs = logs.filter(log => log.userId === filters.userId);
      }
      if (filters.patientId) {
        logs = logs.filter(log => log.patientId === filters.patientId);
      }
      if (filters.action) {
        logs = logs.filter(log => log.action === filters.action);
      }
      if (filters.startDate) {
        logs = logs.filter(log => log.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        logs = logs.filter(log => log.timestamp <= filters.endDate!);
      }
    }

    return logs;
  }

  /**
   * Check for unusual access patterns (potential breach)
   */
  detectAnomalousAccess(): HIPAAAccessLog[] {
    const anomalies: HIPAAAccessLog[] = [];
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Group logs by user in last hour
    const recentLogs = this.accessLogs.filter(log => log.timestamp >= oneHourAgo);
    const userAccess = new Map<string, HIPAAAccessLog[]>();

    for (const log of recentLogs) {
      const logs = userAccess.get(log.userId) || [];
      logs.push(log);
      userAccess.set(log.userId, logs);
    }

    // Detect anomalies
    for (const [userId, logs] of userAccess) {
      // Too many patients accessed in short time
      const uniquePatients = new Set(logs.map(l => l.patientId).filter(Boolean));
      if (uniquePatients.size > 20) {
        anomalies.push(...logs);
      }

      // Too many exports
      const exports = logs.filter(l => l.action === 'export');
      if (exports.length > 10) {
        anomalies.push(...exports);
      }

      // Access from multiple IPs
      const uniqueIPs = new Set(logs.map(l => l.ipAddress));
      if (uniqueIPs.size > 3) {
        anomalies.push(...logs);
      }

      // Access outside business hours (assuming 8 AM - 6 PM)
      const afterHoursLogs = logs.filter(log => {
        const hour = log.timestamp.getHours();
        return hour < 8 || hour > 18;
      });
      if (afterHoursLogs.length > 5) {
        anomalies.push(...afterHoursLogs);
      }
    }

    return anomalies;
  }

  /**
   * Report a breach
   */
  reportBreach(breach: Omit<HIPAABreachNotification, 'id' | 'timestamp' | 'reported'>): string {
    const breachId = `BREACH-${Date.now()}`;

    this.breaches.push({
      ...breach,
      id: breachId,
      timestamp: new Date(),
      reported: false,
    });

    // In production, trigger notification workflow
    logger.error('[HIPAA BREACH]', breach);

    // Auto-report if >500 patients affected
    if (breach.affectedRecords > 500) {
      this.notifyOCR(breachId);
    }

    return breachId;
  }

  /**
   * Notify OCR (Office for Civil Rights) about breach
   */
  private notifyOCR(breachId: string): void {
    const breach = this.breaches.find(b => b.id === breachId);
    if (!breach) return;

    // In production, send to OCR via secure channel
    logger.debug('[OCR Notification]', {
      breachId,
      affectedRecords: breach.affectedRecords,
      severity: breach.severity,
    });

    breach.reported = true;
    breach.reportedDate = new Date();
  }

  /**
   * Get breaches
   */
  getBreaches(): HIPAABreachNotification[] {
    return this.breaches;
  }

  /**
   * Record patient consent
   */
  recordConsent(consent: HIPAAConsentRecord): void {
    const consents = this.consents.get(consent.patientId) || [];
    consents.push(consent);
    this.consents.set(consent.patientId, consents);
  }

  /**
   * Check if patient has given consent
   */
  hasConsent(
    patientId: string,
    consentType: HIPAAConsentRecord['consentType']
  ): boolean {
    const consents = this.consents.get(patientId) || [];
    const now = new Date();

    const validConsent = consents.find(
      c =>
        c.consentType === consentType &&
        c.granted &&
        !c.revokedDate &&
        (!c.expirationDate || c.expirationDate > now)
    );

    return !!validConsent;
  }

  /**
   * Revoke consent
   */
  revokeConsent(patientId: string, consentType: HIPAAConsentRecord['consentType']): void {
    const consents = this.consents.get(patientId) || [];

    for (const consent of consents) {
      if (consent.consentType === consentType && consent.granted && !consent.revokedDate) {
        consent.revokedDate = new Date();
      }
    }
  }

  /**
   * Get patient consents
   */
  getConsents(patientId: string): HIPAAConsentRecord[] {
    return this.consents.get(patientId) || [];
  }

  /**
   * Perform minimum necessary check
   */
  checkMinimumNecessary(
    requestedFields: string[],
    purpose: string,
    role: string
  ): { allowed: string[]; denied: string[] } {
    const allowed: string[] = [];
    const denied: string[] = [];

    // Define minimum necessary by purpose and role
    const minNecessary: Record<string, Record<string, string[]>> = {
      treatment: {
        doctor: ['*'], // All fields
        nurse: ['patientId', 'name', 'dob', 'conditions', 'medications', 'allergies'],
        admin: ['patientId', 'name', 'dob', 'insurance'],
      },
      payment: {
        billing: ['patientId', 'name', 'insurance', 'charges'],
        admin: ['patientId', 'name', 'insurance'],
      },
      operations: {
        analyst: ['patientId', 'age', 'diagnosis', 'outcome'], // No direct identifiers
        admin: ['patientId', 'name'],
      },
    };

    const allowedFields = minNecessary[purpose]?.[role] || [];

    for (const field of requestedFields) {
      if (allowedFields.includes('*') || allowedFields.includes(field)) {
        allowed.push(field);
      } else {
        denied.push(field);
      }
    }

    return { allowed, denied };
  }

  /**
   * Generate HIPAA compliance report
   */
  generateComplianceReport(startDate: Date, endDate: Date): any {
    const logs = this.getAccessLogs({ startDate, endDate });
    const breaches = this.breaches.filter(
      b => b.timestamp >= startDate && b.timestamp <= endDate
    );

    const totalAccess = logs.length;
    const uniqueUsers = new Set(logs.map(l => l.userId)).size;
    const uniquePatients = new Set(logs.map(l => l.patientId).filter(Boolean)).size;

    const accessByAction = logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const anomalies = this.detectAnomalousAccess();

    return {
      period: { startDate, endDate },
      access: {
        total: totalAccess,
        uniqueUsers,
        uniquePatients,
        byAction: accessByAction,
      },
      breaches: {
        total: breaches.length,
        byType: breaches.reduce((acc, b) => {
          acc[b.severity] = (acc[b.severity] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        reported: breaches.filter(b => b.reported).length,
        affectedRecords: breaches.reduce((sum, b) => sum + b.affectedRecords, 0),
      },
      anomalies: {
        total: anomalies.length,
        users: [...new Set(anomalies.map(a => a.userId))],
      },
      compliance: {
        score: this.calculateComplianceScore(logs, breaches, anomalies),
        status: breaches.length === 0 && anomalies.length === 0 ? 'COMPLIANT' : 'AT_RISK',
      },
    };
  }

  /**
   * Calculate compliance score (0-100)
   */
  private calculateComplianceScore(
    logs: HIPAAAccessLog[],
    breaches: HIPAABreachNotification[],
    anomalies: HIPAAAccessLog[]
  ): number {
    let score = 100;

    // Deduct for breaches
    score -= breaches.length * 10;
    score -= breaches.filter(b => !b.reported).length * 5;

    // Deduct for anomalies
    score -= Math.min(anomalies.length * 2, 20);

    // Deduct for missing audit logs
    const logsPerDay = logs.length / Math.max(1, (Date.now() - logs[0]?.timestamp.getTime()) / (1000 * 60 * 60 * 24));
    if (logsPerDay < 10) {
      score -= 10; // Too few logs might indicate incomplete logging
    }

    return Math.max(0, Math.min(100, score));
  }
}

export default HIPAACompliance;
