/**
 * Multi-Agent Audit Trail System
 * Complete audit trail for all agent actions with immutable logs
 */

import { logger } from '../services/SimpleLogger';
import type {
  AgentAuditEntry,
  AgentAuthentication,
  AgentPermission,
  AgentActivity,
  AgentError,
  AnomalyDetectionResult,
  PermissionCondition,
} from '../types/security';

export class MultiAgentAudit {
  private auditLog: AgentAuditEntry[] = [];
  private agentPermissions: Map<string, AgentPermission[]> = new Map();
  private agentActivity: Map<string, AgentActivity> = new Map();
  private agentAuth: Map<string, AgentAuthentication> = new Map();

  // Configuration
  private config = {
    maxAuditLogSize: 100000,
    auditRetentionDays: 90,
    anomalyThreshold: 0.7,
    maxActionsPerMinute: 100,
  };

  // ================================
  // AUDIT LOGGING
  // ================================

  /**
   * Log agent action - core audit function
   */
  async logAction(
    action: Omit<AgentAuditEntry, 'id' | 'timestamp' | 'signature'>
  ): Promise<AgentAuditEntry> {
    const entry: AgentAuditEntry = {
      id: this.generateAuditId(),
      timestamp: new Date().toISOString(),
      signature: await this.signEntry(action),
      ...action,
    };

    // Add to audit log
    this.auditLog.push(entry);

    // Maintain max size
    if (this.auditLog.length > this.config.maxAuditLogSize) {
      // Remove oldest entries (keep last 90%)
      this.auditLog = this.auditLog.slice(-Math.floor(this.config.maxAuditLogSize * 0.9));
    }

    // Update agent activity
    await this.updateAgentActivity(entry);

    // Check for anomalies
    const anomaly = await this.detectAnomaly(entry);
    if (anomaly.isAnomaly && (anomaly.severity === 'high' || anomaly.severity === 'critical')) {
      logger.warn('Agent anomaly detected', {
        agentId: entry.agentId,
        anomaly: anomaly.description,
      });
      await this.handleAnomaly(entry, anomaly);
    }

    logger.debug('Agent action logged', {
      agentId: entry.agentId,
      action: entry.action,
      success: entry.success,
    });

    return entry;
  }

  /**
   * Get audit log with filters
   */
  getAuditLog(filters?: {
    agentId?: string;
    agentType?: string;
    action?: string;
    resourceType?: string;
    success?: boolean;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): AgentAuditEntry[] {
    let filtered = [...this.auditLog];

    if (filters?.agentId) {
      filtered = filtered.filter(e => e.agentId === filters.agentId);
    }

    if (filters?.agentType) {
      filtered = filtered.filter(e => e.agentType === filters.agentType);
    }

    if (filters?.action) {
      filtered = filtered.filter(e => e.action.includes(filters.action!));
    }

    if (filters?.resourceType) {
      filtered = filtered.filter(e => e.resourceType === filters.resourceType);
    }

    if (filters?.success !== undefined) {
      filtered = filtered.filter(e => e.success === filters.success);
    }

    if (filters?.startDate) {
      filtered = filtered.filter(e => e.timestamp >= filters.startDate!);
    }

    if (filters?.endDate) {
      filtered = filtered.filter(e => e.timestamp <= filters.endDate!);
    }

    // Sort by timestamp descending
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply limit
    if (filters?.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  }

  /**
   * Verify audit entry integrity
   */
  async verifyEntry(entry: AgentAuditEntry): Promise<boolean> {
    const expectedSignature = await this.signEntry({
      agentId: entry.agentId,
      agentType: entry.agentType,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      input: entry.input,
      output: entry.output,
      duration: entry.duration,
      success: entry.success,
      error: entry.error,
      userId: entry.userId,
      sessionId: entry.sessionId,
      parentAgentId: entry.parentAgentId,
    });

    return entry.signature === expectedSignature;
  }

  // ================================
  // AGENT AUTHENTICATION
  // ================================

  /**
   * Authenticate agent
   */
  async authenticateAgent(
    agentId: string,
    publicKey: string,
    signature: string
  ): Promise<AgentAuthentication> {
    logger.info('Authenticating agent', { agentId });

    const verified = await this.verifyAgentSignature(agentId, signature, publicKey);

    const auth: AgentAuthentication = {
      agentId,
      publicKey,
      signature,
      timestamp: new Date().toISOString(),
      verified,
    };

    if (verified) {
      this.agentAuth.set(agentId, auth);
      logger.info('Agent authenticated', { agentId });
    } else {
      logger.warn('Agent authentication failed', { agentId });
    }

    return auth;
  }

  /**
   * Check if agent is authenticated
   */
  isAuthenticated(agentId: string): boolean {
    const auth = this.agentAuth.get(agentId);
    if (!auth) return false;

    // Check if authentication is still valid (within last hour)
    const authTime = new Date(auth.timestamp).getTime();
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    return auth.verified && (now - authTime) < oneHour;
  }

  // ================================
  // PERMISSION MANAGEMENT
  // ================================

  /**
   * Grant permission to agent
   */
  grantPermission(permission: AgentPermission): void {
    logger.info('Granting permission', {
      agentId: permission.agentId,
      resource: permission.resource,
      actions: permission.actions,
    });

    const existing = this.agentPermissions.get(permission.agentId) || [];
    existing.push(permission);
    this.agentPermissions.set(permission.agentId, existing);
  }

  /**
   * Revoke permission from agent
   */
  revokePermission(agentId: string, resource: string): boolean {
    const permissions = this.agentPermissions.get(agentId) || [];
    const filtered = permissions.filter(p => p.resource !== resource);

    if (filtered.length < permissions.length) {
      this.agentPermissions.set(agentId, filtered);
      logger.info('Permission revoked', { agentId, resource });
      return true;
    }

    return false;
  }

  /**
   * Check if agent has permission
   */
  async hasPermission(
    agentId: string,
    resource: string,
    action: string,
    context?: Record<string, unknown>
  ): Promise<{ allowed: boolean; reason: string }> {
    // Check authentication
    if (!this.isAuthenticated(agentId)) {
      return { allowed: false, reason: 'Agent not authenticated' };
    }

    // Get permissions
    const permissions = this.agentPermissions.get(agentId) || [];
    const resourcePermissions = permissions.filter(p =>
      p.resource === resource || p.resource === '*'
    );

    if (resourcePermissions.length === 0) {
      return { allowed: false, reason: 'No permission for resource' };
    }

    // Check action
    for (const perm of resourcePermissions) {
      if (perm.actions.includes(action) || perm.actions.includes('*')) {
        // Check conditions
        if (perm.conditions && perm.conditions.length > 0) {
          const conditionsMet = await this.checkConditions(perm.conditions, context);
          if (!conditionsMet) {
            return { allowed: false, reason: 'Permission conditions not met' };
          }
        }

        // Check expiration
        if (perm.expiresAt && new Date(perm.expiresAt) < new Date()) {
          return { allowed: false, reason: 'Permission expired' };
        }

        return { allowed: true, reason: 'Permission granted' };
      }
    }

    return { allowed: false, reason: 'Action not allowed' };
  }

  /**
   * List agent permissions
   */
  listPermissions(agentId: string): AgentPermission[] {
    return this.agentPermissions.get(agentId) || [];
  }

  // ================================
  // ACTIVITY MONITORING
  // ================================

  /**
   * Get agent activity summary
   */
  getAgentActivity(agentId: string): AgentActivity | undefined {
    return this.agentActivity.get(agentId);
  }

  /**
   * Get all agent activities
   */
  getAllActivities(): AgentActivity[] {
    return Array.from(this.agentActivity.values());
  }

  /**
   * Update agent activity
   */
  private async updateAgentActivity(entry: AgentAuditEntry): Promise<void> {
    const existing = this.agentActivity.get(entry.agentId);

    if (!existing) {
      // Create new activity record
      const activity: AgentActivity = {
        agentId: entry.agentId,
        totalActions: 1,
        successRate: entry.success ? 100 : 0,
        averageDuration: entry.duration,
        lastActive: entry.timestamp,
        resources: entry.resourceId ? [entry.resourceId] : [],
        errors: entry.error ? [{
          timestamp: entry.timestamp,
          action: entry.action,
          error: entry.error,
          resourceId: entry.resourceId,
          severity: 'medium',
        }] : [],
      };

      this.agentActivity.set(entry.agentId, activity);
    } else {
      // Update existing activity
      existing.totalActions += 1;
      existing.successRate = ((existing.successRate * (existing.totalActions - 1)) + (entry.success ? 100 : 0)) / existing.totalActions;
      existing.averageDuration = ((existing.averageDuration * (existing.totalActions - 1)) + entry.duration) / existing.totalActions;
      existing.lastActive = entry.timestamp;

      if (entry.resourceId && !existing.resources.includes(entry.resourceId)) {
        existing.resources.push(entry.resourceId);
      }

      if (entry.error) {
        existing.errors.push({
          timestamp: entry.timestamp,
          action: entry.action,
          error: entry.error,
          resourceId: entry.resourceId,
          severity: this.determineSeverity(entry.error),
        });

        // Keep only last 100 errors
        if (existing.errors.length > 100) {
          existing.errors = existing.errors.slice(-100);
        }
      }

      this.agentActivity.set(entry.agentId, existing);
    }
  }

  // ================================
  // ANOMALY DETECTION
  // ================================

  /**
   * Detect anomalies in agent behavior
   */
  private async detectAnomaly(entry: AgentAuditEntry): Promise<AnomalyDetectionResult> {
    const activity = this.agentActivity.get(entry.agentId);

    // Check rate anomaly
    const rateAnomaly = this.detectRateAnomaly(entry.agentId);
    if (rateAnomaly.isAnomaly) {
      return rateAnomaly;
    }

    // Check pattern anomaly
    if (activity) {
      const patternAnomaly = this.detectPatternAnomaly(entry, activity);
      if (patternAnomaly.isAnomaly) {
        return patternAnomaly;
      }

      // Check resource anomaly
      const resourceAnomaly = this.detectResourceAnomaly(entry, activity);
      if (resourceAnomaly.isAnomaly) {
        return resourceAnomaly;
      }
    }

    return {
      isAnomaly: false,
      score: 0,
      type: 'other',
      description: 'No anomaly detected',
      severity: 'low',
      recommendations: [],
    };
  }

  /**
   * Detect high rate of actions
   */
  private detectRateAnomaly(agentId: string): AnomalyDetectionResult {
    const oneMinuteAgo = Date.now() - 60000;
    const recentActions = this.auditLog.filter(
      e => e.agentId === agentId && new Date(e.timestamp).getTime() > oneMinuteAgo
    );

    if (recentActions.length > this.config.maxActionsPerMinute) {
      return {
        isAnomaly: true,
        score: 0.9,
        type: 'rate',
        description: `Agent exceeded maximum actions per minute (${recentActions.length} > ${this.config.maxActionsPerMinute})`,
        severity: 'high',
        recommendations: [
          'Review agent configuration',
          'Implement rate limiting',
          'Check for infinite loops',
        ],
      };
    }

    return {
      isAnomaly: false,
      score: 0,
      type: 'rate',
      description: 'Normal action rate',
      severity: 'low',
      recommendations: [],
    };
  }

  /**
   * Detect unusual patterns
   */
  private detectPatternAnomaly(
    entry: AgentAuditEntry,
    activity: AgentActivity
  ): AnomalyDetectionResult {
    // Check for unusual failure rate
    if (!entry.success && activity.successRate > 90) {
      return {
        isAnomaly: true,
        score: 0.8,
        type: 'pattern',
        description: 'Unexpected failure for normally reliable agent',
        severity: 'medium',
        recommendations: [
          'Check resource availability',
          'Review agent configuration',
          'Verify permissions',
        ],
      };
    }

    // Check for unusual duration
    if (entry.duration > activity.averageDuration * 5) {
      return {
        isAnomaly: true,
        score: 0.75,
        type: 'behavior',
        description: `Action duration ${entry.duration}ms significantly exceeds average ${activity.averageDuration}ms`,
        severity: 'medium',
        recommendations: [
          'Monitor resource usage',
          'Check for performance issues',
          'Review data size',
        ],
      };
    }

    return {
      isAnomaly: false,
      score: 0,
      type: 'pattern',
      description: 'Normal pattern',
      severity: 'low',
      recommendations: [],
    };
  }

  /**
   * Detect unusual resource access
   */
  private detectResourceAnomaly(
    entry: AgentAuditEntry,
    activity: AgentActivity
  ): AnomalyDetectionResult {
    // Check for new resource type
    if (entry.resourceId && !activity.resources.includes(entry.resourceId)) {
      const hasPermission = this.agentPermissions.get(entry.agentId)?.some(
        p => p.resource === entry.resourceType || p.resource === '*'
      );

      if (!hasPermission) {
        return {
          isAnomaly: true,
          score: 0.95,
          type: 'resource',
          description: 'Agent accessing resource without permission',
          severity: 'critical',
          recommendations: [
            'Revoke agent access',
            'Review permission grants',
            'Audit agent code',
          ],
        };
      }
    }

    return {
      isAnomaly: false,
      score: 0,
      type: 'resource',
      description: 'Normal resource access',
      severity: 'low',
      recommendations: [],
    };
  }

  /**
   * Handle detected anomaly
   */
  private async handleAnomaly(
    entry: AgentAuditEntry,
    anomaly: AnomalyDetectionResult
  ): Promise<void> {
    logger.warn('Handling agent anomaly', {
      agentId: entry.agentId,
      anomaly: anomaly.description,
      severity: anomaly.severity,
    });

    // Log special audit entry
    await this.logAction({
      agentId: 'system',
      agentType: 'security',
      action: 'anomaly_detected',
      resourceType: 'agent',
      resourceId: entry.agentId,
      input: { anomaly },
      duration: 0,
      success: true,
      sessionId: 'system',
    });

    // Take action based on severity
    if (anomaly.severity === 'critical') {
      // Revoke all permissions
      this.agentPermissions.delete(entry.agentId);
      logger.warn('Agent permissions revoked due to critical anomaly', {
        agentId: entry.agentId,
      });
    }
  }

  // ================================
  // PRIVATE HELPER METHODS
  // ================================

  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }

  private async signEntry(entry: Partial<AgentAuditEntry>): Promise<string> {
    // Create deterministic string from entry
    const data = JSON.stringify({
      agentId: entry.agentId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      success: entry.success,
    });

    // In production, would use proper HMAC or digital signature
    return `sig_${Buffer.from(data).toString('base64').slice(0, 32)}`;
  }

  private async verifyAgentSignature(
    agentId: string,
    signature: string,
    publicKey: string
  ): Promise<boolean> {
    logger.debug('Verifying agent signature', { agentId });
    // In production, would use proper signature verification
    return signature.length > 0 && publicKey.length > 0;
  }

  private async checkConditions(
    conditions: PermissionCondition[],
    context?: Record<string, unknown>
  ): Promise<boolean> {
    if (!context) return false;

    for (const condition of conditions) {
      const contextValue = context[condition.type];
      if (!this.evaluateCondition(contextValue, condition.operator, condition.value)) {
        return false;
      }
    }

    return true;
  }

  private evaluateCondition(
    contextValue: unknown,
    operator: string,
    expectedValue: unknown
  ): boolean {
    switch (operator) {
      case 'eq':
        return contextValue === expectedValue;
      case 'ne':
        return contextValue !== expectedValue;
      case 'gt':
        return Number(contextValue) > Number(expectedValue);
      case 'lt':
        return Number(contextValue) < Number(expectedValue);
      case 'gte':
        return Number(contextValue) >= Number(expectedValue);
      case 'lte':
        return Number(contextValue) <= Number(expectedValue);
      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(contextValue);
      case 'not_in':
        return Array.isArray(expectedValue) && !expectedValue.includes(contextValue);
      default:
        return false;
    }
  }

  private determineSeverity(error: string): 'low' | 'medium' | 'high' | 'critical' {
    const lowerError = error.toLowerCase();

    if (lowerError.includes('permission') || lowerError.includes('unauthorized')) {
      return 'critical';
    }

    if (lowerError.includes('timeout') || lowerError.includes('connection')) {
      return 'high';
    }

    if (lowerError.includes('validation') || lowerError.includes('invalid')) {
      return 'medium';
    }

    return 'low';
  }

  // ================================
  // PUBLIC UTILITY METHODS
  // ================================

  /**
   * Export audit log
   */
  exportAuditLog(format: 'json' | 'csv'): string {
    if (format === 'csv') {
      const headers = [
        'ID',
        'Timestamp',
        'Agent ID',
        'Agent Type',
        'Action',
        'Resource Type',
        'Resource ID',
        'Success',
        'Duration',
        'Error',
      ];

      const rows = this.auditLog.map(entry => [
        entry.id,
        entry.timestamp,
        entry.agentId,
        entry.agentType,
        entry.action,
        entry.resourceType,
        entry.resourceId || '',
        entry.success.toString(),
        entry.duration.toString(),
        entry.error || '',
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    return JSON.stringify(this.auditLog, null, 2);
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      totalAuditEntries: this.auditLog.length,
      authenticatedAgents: this.agentAuth.size,
      agentsWithPermissions: this.agentPermissions.size,
      activeAgents: this.agentActivity.size,
      successRate:
        this.auditLog.filter(e => e.success).length / this.auditLog.length * 100 || 0,
    };
  }

  /**
   * Clear old audit entries
   */
  clearOldEntries(days: number = 90): number {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const before = this.auditLog.length;

    this.auditLog = this.auditLog.filter(e => e.timestamp >= cutoffDate);

    const removed = before - this.auditLog.length;
    logger.info(`Cleared ${removed} old audit entries`);

    return removed;
  }
}

// Export singleton instance
export const multiAgentAudit = new MultiAgentAudit();
