/**
 * Healing Engine
 * Main orchestrator for auto-healing workflows
 * Diagnoses errors and applies healing strategies automatically
 */

import {
  WorkflowError,
  HealingContext,
  HealingResult,
  HealingAttempt,
  HealingProgress,
  HealingConfiguration,
  Diagnosis,
  ErrorSeverity
} from '../types/healing';
import { ErrorDiagnostician } from './ErrorDiagnostician';
import { HealingStrategyRegistry, healingStrategyRegistry } from './HealingStrategies';
import { HealingAnalytics, healingAnalytics } from './HealingAnalytics';
import { LearningEngine, learningEngine } from './LearningEngine';
import { logger } from '../services/SimpleLogger';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const errorDiagnostician = new ErrorDiagnostician();

export class HealingEngine {
  private config: HealingConfiguration;
  private diagnostician: ErrorDiagnostician;
  private strategyRegistry: HealingStrategyRegistry;
  private analytics: HealingAnalytics;
  private learningEngine: LearningEngine;
  private activeHealings: Map<string, HealingAttempt[]> = new Map();

  constructor(config?: Partial<HealingConfiguration>) {
    this.config = {
      enabled: true,
      maxHealingAttempts: 5,
      maxHealingDuration: 300000, // 5 minutes
      minConfidenceThreshold: 0.6,
      enabledStrategies: [],
      disabledStrategies: [],
      strategyTimeout: 60000,
      learningEnabled: true,
      adaptivePriority: true,
      minSampleSize: 10,
      escalateAfterAttempts: 3,
      escalateAfterDuration: 180000, // 3 minutes
      escalationNotifications: [],
      trackAnalytics: true,
      detailedLogging: false,
      ...config
    };

    this.diagnostician = errorDiagnostician;
    this.strategyRegistry = healingStrategyRegistry;
    this.analytics = healingAnalytics;
    this.learningEngine = learningEngine;

    logger.info('HealingEngine initialized');
  }

  /**
   * Heal a workflow error
   */
  async heal(error: WorkflowError, context?: Partial<HealingContext>): Promise<HealingResult> {
    if (!this.config.enabled) {
      logger.info('Auto-healing is disabled');
      return this.createFailureResult(error, 'Auto-healing disabled', []);
    }

    const startTime = new Date();
    const executionId = error.executionId;

    // Check workflow-specific overrides
    const workflowConfig = this.config.workflowOverrides?.[error.workflowId];
    if (workflowConfig && !workflowConfig.enabled) {
      logger.info(`Auto-healing disabled for workflow ${error.workflowId}`);
      return this.createFailureResult(error, 'Auto-healing disabled for this workflow', []);
    }

    // Step 1: Diagnose error
    logger.info(`Starting diagnosis for error ${error.id}`);
    const diagnosis = await this.diagnostician.diagnose(error);

    if (!diagnosis.healable) {
      logger.warn(`Error ${error.id} is not healable`);
      return this.createFailureResult(error, 'Error is not healable', []);
    }

    if (diagnosis.confidence < this.config.minConfidenceThreshold) {
      logger.warn(`Diagnosis confidence ${diagnosis.confidence} below threshold`);
      return this.createFailureResult(error, 'Diagnosis confidence too low', []);
    }

    // Step 2: Build healing context
    const healingContext: HealingContext = {
      workflowId: error.workflowId,
      executionId: error.executionId,
      nodeId: error.nodeId,
      maxAttempts: workflowConfig?.maxAttempts || this.config.maxHealingAttempts,
      maxDuration: workflowConfig?.maxDuration || this.config.maxHealingDuration,
      allowedStrategies: workflowConfig?.allowedStrategies || this.config.enabledStrategies,
      disallowedStrategies: workflowConfig?.disallowedStrategies || this.config.disabledStrategies,
      backupServices: context?.backupServices || [],
      cacheAvailable: context?.cacheAvailable || false,
      attemptNumber: 0,
      startTime,
      previousAttempts: this.activeHealings.get(executionId) || [],
      ...context
    };

    // Step 3: Apply healing strategies
    const attempts: HealingAttempt[] = [];
    this.activeHealings.set(executionId, attempts);

    for (const strategyRef of diagnosis.suggestedStrategies) {
      // Check if we've exceeded max attempts
      if (healingContext.attemptNumber >= healingContext.maxAttempts) {
        logger.warn('Max healing attempts reached');
        break;
      }

      // Check if we've exceeded max duration
      const elapsed = Date.now() - startTime.getTime();
      if (elapsed >= healingContext.maxDuration) {
        logger.warn('Max healing duration reached');
        break;
      }

      // Get strategy
      const strategy = this.strategyRegistry.get(strategyRef.strategyId);
      if (!strategy) {
        logger.warn(`Strategy ${strategyRef.strategyId} not found`);
        continue;
      }

      // Check if strategy is allowed
      if (!this.isStrategyAllowed(strategy.id, healingContext)) {
        logger.info(`Strategy ${strategy.id} not allowed`);
        continue;
      }

      // Apply strategy
      healingContext.attemptNumber++;
      const attempt = await this.applyStrategy(strategy, error, healingContext);
      attempts.push(attempt);

      // Check if healing succeeded
      if (attempt.result?.success) {
        logger.info(`Healing succeeded with strategy ${strategy.name}`);
        
        // Record success in analytics
        if (this.config.trackAnalytics) {
          await this.analytics.recordHealingAttempt(error, diagnosis, attempt.result);
        }

        // Learn from success
        if (this.config.learningEnabled) {
          await this.learningEngine.learn(error, strategy, attempt.result);
        }

        this.activeHealings.delete(executionId);
        return attempt.result;
      }
    }

    // All strategies failed
    logger.error(`All healing strategies failed for error ${error.id}`);
    
    // Check if we should escalate
    const shouldEscalate = this.shouldEscalate(healingContext, attempts);
    
    const failureResult = this.createFailureResult(
      error,
      'All healing strategies failed',
      attempts,
      shouldEscalate
    );

    // Record failure in analytics
    if (this.config.trackAnalytics) {
      await this.analytics.recordHealingAttempt(error, diagnosis, failureResult);
    }

    // Escalate if needed
    if (shouldEscalate) {
      await this.escalate(error, diagnosis, attempts);
    }

    this.activeHealings.delete(executionId);
    return failureResult;
  }

  /**
   * Apply a healing strategy
   */
  private async applyStrategy(
    strategy: any,
    error: WorkflowError,
    context: HealingContext
  ): Promise<HealingAttempt> {
    const attemptId = uuidv4();
    const startTime = new Date();

    logger.info(`Applying strategy: ${strategy.name}`);

    // Notify callback
    if (context.onStrategyStart) {
      context.onStrategyStart(strategy);
    }

    try {
      // Apply strategy with timeout
      const result = await Promise.race([
        strategy.apply(error, context),
        this.createTimeoutPromise(this.config.strategyTimeout)
      ]);

      const attempt: HealingAttempt = {
        id: attemptId,
        strategyId: strategy.id,
        strategyName: strategy.name,
        startTime,
        endTime: new Date(),
        duration: Date.now() - startTime.getTime(),
        result
      };

      // Notify callback
      if (context.onStrategyComplete) {
        context.onStrategyComplete(strategy, result);
      }

      return attempt;
    } catch (err) {
      const error = err as Error;
      logger.error(`Strategy ${strategy.name} failed: ${error.message}`);

      return {
        id: attemptId,
        strategyId: strategy.id,
        strategyName: strategy.name,
        startTime,
        endTime: new Date(),
        duration: Date.now() - startTime.getTime(),
        result: null,
        error: error.message
      };
    }
  }

  /**
   * Check if strategy is allowed
   */
  private isStrategyAllowed(strategyId: string, context: HealingContext): boolean {
    // Check disallowed list first
    if (context.disallowedStrategies && context.disallowedStrategies.length > 0) {
      if (context.disallowedStrategies.includes(strategyId)) {
        return false;
      }
    }

    // Check allowed list
    if (context.allowedStrategies && context.allowedStrategies.length > 0) {
      return context.allowedStrategies.includes(strategyId);
    }

    return true;
  }

  /**
   * Should escalate to human
   */
  private shouldEscalate(context: HealingContext, attempts: HealingAttempt[]): boolean {
    // Check attempt threshold
    if (attempts.length >= this.config.escalateAfterAttempts) {
      return true;
    }

    // Check duration threshold
    const elapsed = Date.now() - context.startTime.getTime();
    if (elapsed >= this.config.escalateAfterDuration) {
      return true;
    }

    return false;
  }

  /**
   * Escalate to human intervention
   */
  private async escalate(
    error: WorkflowError,
    diagnosis: Diagnosis,
    attempts: HealingAttempt[]
  ): Promise<void> {
    logger.warn(`Escalating error ${error.id} to human intervention`);

    // Send notifications based on config.escalationNotifications
    const notifications = this.config.escalationNotifications || [];

    for (const notificationConfig of notifications) {
      try {
        await this.sendEscalationNotification(notificationConfig, error, diagnosis, attempts);
      } catch (notifyError) {
        logger.error(`Failed to send escalation notification via ${notificationConfig.channel}:`, notifyError);
      }
    }

    // Create in-app notification for workflow owner
    try {
      // Get workflow to find owner
      const workflow = await prisma.workflow.findFirst({
        where: { id: error.workflowId },
        select: { userId: true, name: true }
      });

      if (workflow?.userId) {
        await prisma.notification.create({
          data: {
            userId: workflow.userId,
            type: 'SYSTEM_ALERT',
            title: 'Auto-Healing Escalation',
            message: `Workflow "${workflow.name || error.workflowId}" requires manual intervention. Error: ${error.message}`,
            priority: 'HIGH',
            data: {
              errorId: error.id,
              workflowId: error.workflowId,
              nodeId: error.nodeId,
              diagnosisType: diagnosis.errorType,
              attemptCount: attempts.length,
              strategies: attempts.map(a => a.strategyId),
            }
          }
        });
        logger.info(`Created in-app notification for user ${workflow.userId}`);
      }
    } catch (dbError) {
      logger.error('Failed to create in-app notification:', dbError);
    }
  }

  /**
   * Send escalation notification via configured channel
   */
  private async sendEscalationNotification(
    config: { channel: 'email' | 'slack' | 'webhook' | 'pagerduty'; recipients: string[]; severity: ErrorSeverity[] },
    error: WorkflowError,
    diagnosis: Diagnosis,
    attempts: HealingAttempt[]
  ): Promise<void> {
    const message = this.formatEscalationMessage(error, diagnosis, attempts);
    const destination = config.recipients[0]; // Use first recipient as destination

    switch (config.channel) {
      case 'email':
        await this.sendEmailNotification(destination, message, error);
        break;

      case 'slack':
        await this.sendSlackNotification(destination, message, error);
        break;

      case 'webhook':
        await this.sendWebhookNotification(destination, error, diagnosis, attempts);
        break;

      case 'pagerduty':
        await this.sendPagerDutyNotification(destination, message, error);
        break;

      default:
        logger.warn(`Unknown notification type: ${config.channel}`);
    }
  }

  /**
   * Format escalation message
   */
  private formatEscalationMessage(
    error: WorkflowError,
    diagnosis: Diagnosis,
    attempts: HealingAttempt[]
  ): string {
    return `
Auto-Healing Escalation Required

Workflow: ${error.workflowId}
Node: ${error.nodeId || 'N/A'}
Error: ${error.message}

Diagnosis: ${diagnosis.errorType} (${Math.round(diagnosis.confidence * 100)}% confidence)
Root Cause: ${diagnosis.rootCause || 'Unknown'}

Healing Attempts: ${attempts.length}
${attempts.map((a, i) => `  ${i + 1}. ${a.strategyId}: ${a.result?.success ? 'Success' : 'Failed'}`).join('\n')}

Action Required: Please investigate and resolve manually.
    `.trim();
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    destination: string,
    message: string,
    error: WorkflowError
  ): Promise<void> {
    try {
      const response = await fetch(process.env.EMAIL_SERVICE_URL || 'http://localhost:3001/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: destination,
          subject: `[URGENT] Auto-Healing Escalation: ${error.workflowId}`,
          text: message,
          html: `<pre>${message}</pre>`,
        }),
      });

      if (!response.ok) {
        throw new Error(`Email service returned ${response.status}`);
      }

      logger.info(`Sent escalation email to ${destination}`);
    } catch (emailError) {
      logger.error('Failed to send escalation email:', emailError);
      throw emailError;
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(
    webhookUrl: string,
    message: string,
    error: WorkflowError
  ): Promise<void> {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 *Auto-Healing Escalation*`,
          attachments: [{
            color: 'danger',
            title: `Workflow: ${error.workflowId}`,
            text: message,
            fields: [
              { title: 'Error ID', value: error.id, short: true },
              { title: 'Node', value: error.nodeId || 'N/A', short: true },
            ],
            footer: 'Healing Engine',
            ts: Math.floor(Date.now() / 1000),
          }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Slack webhook returned ${response.status}`);
      }

      logger.info('Sent escalation to Slack');
    } catch (slackError) {
      logger.error('Failed to send Slack notification:', slackError);
      throw slackError;
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(
    url: string,
    error: WorkflowError,
    diagnosis: Diagnosis,
    attempts: HealingAttempt[]
  ): Promise<void> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'healing.escalated',
          timestamp: new Date().toISOString(),
          error: {
            id: error.id,
            workflowId: error.workflowId,
            nodeId: error.nodeId,
            message: error.message,
            stack: error.stack,
          },
          diagnosis: {
            type: diagnosis.errorType,
            confidence: diagnosis.confidence,
            rootCause: diagnosis.rootCause,
          },
          attempts: attempts.map(a => ({
            strategyId: a.strategyId,
            success: a.result?.success || false,
            duration: a.duration,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}`);
      }

      logger.info('Sent escalation to webhook');
    } catch (webhookError) {
      logger.error('Failed to send webhook notification:', webhookError);
      throw webhookError;
    }
  }

  /**
   * Send PagerDuty notification
   */
  private async sendPagerDutyNotification(
    routingKey: string,
    message: string,
    error: WorkflowError
  ): Promise<void> {
    try {
      const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routing_key: routingKey,
          event_action: 'trigger',
          dedup_key: `healing-${error.id}`,
          payload: {
            summary: `Auto-Healing Escalation: ${error.workflowId}`,
            severity: 'critical',
            source: 'healing-engine',
            custom_details: {
              error_id: error.id,
              workflow_id: error.workflowId,
              node_id: error.nodeId,
              message: error.message,
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`PagerDuty returned ${response.status}`);
      }

      logger.info('Sent escalation to PagerDuty');
    } catch (pdError) {
      logger.error('Failed to send PagerDuty notification:', pdError);
      throw pdError;
    }
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Strategy timeout')), timeout);
    });
  }

  /**
   * Create failure result
   */
  private createFailureResult(
    error: WorkflowError,
    reason: string,
    attempts: HealingAttempt[],
    escalated: boolean = false
  ): HealingResult {
    return {
      success: false,
      strategyId: 'none',
      strategyName: 'No strategy',
      attempts: attempts.length,
      duration: attempts.reduce((sum, a) => sum + (a.duration || 0), 0),
      error: reason,
      actionsTaken: [],
      timestamp: new Date(),
      escalated,
      escalationReason: escalated ? reason : undefined
    };
  }

  /**
   * Get configuration
   */
  getConfig(): HealingConfiguration {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<HealingConfiguration>): void {
    this.config = { ...this.config, ...updates };
    logger.info('HealingEngine configuration updated');
  }

  /**
   * Get active healings
   */
  getActiveHealings(): Map<string, HealingAttempt[]> {
    return new Map(this.activeHealings);
  }
}

// Export singleton
export const healingEngine = new HealingEngine();
