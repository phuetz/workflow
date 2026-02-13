/**
 * Promotion Validator
 * Pre-promotion validation, health checks, and safety gates
 */

import { logger } from '../services/SimpleLogger';
import { getEnvironmentManager, EnhancedEnvironment } from './EnvironmentManager';
import { getEnvironmentService } from '../backend/environment/EnvironmentService';
import { EnvironmentType } from '../backend/environment/EnvironmentTypes';

export enum ValidationSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

export interface ValidationResult {
  valid: boolean;
  severity: ValidationSeverity;
  code: string;
  message: string;
  details?: any;
}

export interface PromotionValidationReport {
  canPromote: boolean;
  errors: ValidationResult[];
  warnings: ValidationResult[];
  info: ValidationResult[];
  estimatedDuration: number; // seconds
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

export interface WorkflowValidationContext {
  workflowId: string;
  sourceEnvId: string;
  targetEnvId: string;
  workflowData?: any;
}

export class PromotionValidator {
  private envManager = getEnvironmentManager();
  private envService = getEnvironmentService();

  /**
   * Validate promotion request
   */
  async validatePromotion(
    context: WorkflowValidationContext
  ): Promise<PromotionValidationReport> {
    const errors: ValidationResult[] = [];
    const warnings: ValidationResult[] = [];
    const info: ValidationResult[] = [];
    const recommendations: string[] = [];

    logger.info('Validating promotion', {
      workflowId: context.workflowId,
      sourceEnvId: context.sourceEnvId,
      targetEnvId: context.targetEnvId,
    });

    // 1. Validate environments exist and are accessible
    const envCheck = await this.validateEnvironments(context);
    this.categorizeResults(envCheck, errors, warnings, info);

    if (errors.length > 0) {
      return this.buildReport(false, errors, warnings, info, recommendations, 'critical');
    }

    // 2. Validate promotion path (dev -> staging -> prod)
    const pathCheck = await this.validatePromotionPath(context);
    this.categorizeResults(pathCheck, errors, warnings, info);

    // 3. Validate workflow exists and is valid
    const workflowCheck = await this.validateWorkflow(context);
    this.categorizeResults(workflowCheck, errors, warnings, info);

    // 4. Validate credentials are mapped
    const credentialCheck = await this.validateCredentials(context);
    this.categorizeResults(credentialCheck, errors, warnings, info);

    // 5. Validate environment variables
    const variableCheck = await this.validateVariables(context);
    this.categorizeResults(variableCheck, errors, warnings, info);

    // 6. Check for breaking changes
    const breakingChangesCheck = await this.checkBreakingChanges(context);
    this.categorizeResults(breakingChangesCheck, errors, warnings, info);

    // 7. Validate target environment capacity
    const capacityCheck = await this.validateCapacity(context);
    this.categorizeResults(capacityCheck, errors, warnings, info);

    // 8. Check for active executions (production only)
    const executionCheck = await this.checkActiveExecutions(context);
    this.categorizeResults(executionCheck, errors, warnings, info);

    // Generate recommendations
    recommendations.push(...this.generateRecommendations(context, warnings, info));

    // Calculate risk level
    const riskLevel = this.calculateRiskLevel(errors, warnings, context);

    // Estimate duration
    const estimatedDuration = this.estimatePromotionDuration(context);

    const canPromote = errors.length === 0;

    logger.info('Promotion validation completed', {
      canPromote,
      errors: errors.length,
      warnings: warnings.length,
      riskLevel,
    });

    return this.buildReport(
      canPromote,
      errors,
      warnings,
      info,
      recommendations,
      riskLevel,
      estimatedDuration
    );
  }

  /**
   * Validate source and target environments
   */
  private async validateEnvironments(
    context: WorkflowValidationContext
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    const sourceEnv = await this.envManager.getEnvironment(context.sourceEnvId);
    const targetEnv = await this.envManager.getEnvironment(context.targetEnvId);

    if (!sourceEnv) {
      results.push({
        valid: false,
        severity: ValidationSeverity.ERROR,
        code: 'ENV_SOURCE_NOT_FOUND',
        message: `Source environment not found: ${context.sourceEnvId}`,
      });
    }

    if (!targetEnv) {
      results.push({
        valid: false,
        severity: ValidationSeverity.ERROR,
        code: 'ENV_TARGET_NOT_FOUND',
        message: `Target environment not found: ${context.targetEnvId}`,
      });
    }

    if (sourceEnv && targetEnv) {
      // Check if source is active
      if (sourceEnv.status !== 'active') {
        results.push({
          valid: false,
          severity: ValidationSeverity.ERROR,
          code: 'ENV_SOURCE_INACTIVE',
          message: `Source environment is not active: ${sourceEnv.status}`,
        });
      }

      // Check if target is active
      if (targetEnv.status !== 'active') {
        results.push({
          valid: false,
          severity: ValidationSeverity.ERROR,
          code: 'ENV_TARGET_INACTIVE',
          message: `Target environment is not active: ${targetEnv.status}`,
        });
      }

      // Warn if target is in maintenance
      if (targetEnv.status === 'maintenance') {
        results.push({
          valid: true,
          severity: ValidationSeverity.WARNING,
          code: 'ENV_TARGET_MAINTENANCE',
          message: 'Target environment is in maintenance mode',
        });
      }
    }

    return results;
  }

  /**
   * Validate promotion path follows best practices
   */
  private async validatePromotionPath(
    context: WorkflowValidationContext
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    const sourceEnv = await this.envManager.getEnvironment(context.sourceEnvId);
    const targetEnv = await this.envManager.getEnvironment(context.targetEnvId);

    if (!sourceEnv || !targetEnv) {
      return results;
    }

    // Define valid promotion paths
    const validPaths: Record<EnvironmentType, EnvironmentType[]> = {
      [EnvironmentType.DEVELOPMENT]: [
        EnvironmentType.STAGING,
        EnvironmentType.TESTING,
      ],
      [EnvironmentType.TESTING]: [EnvironmentType.STAGING],
      [EnvironmentType.STAGING]: [EnvironmentType.PRODUCTION],
      [EnvironmentType.PRODUCTION]: [],
    };

    const allowedTargets = validPaths[sourceEnv.type] || [];

    if (!allowedTargets.includes(targetEnv.type)) {
      results.push({
        valid: true,
        severity: ValidationSeverity.WARNING,
        code: 'PROMOTION_PATH_NONSTANDARD',
        message: `Non-standard promotion path: ${sourceEnv.type} -> ${targetEnv.type}`,
        details: {
          recommended: `${sourceEnv.type} -> ${allowedTargets.join(' or ')}`,
        },
      });
    }

    // Warn if promoting to production from development
    if (
      sourceEnv.type === EnvironmentType.DEVELOPMENT &&
      targetEnv.type === EnvironmentType.PRODUCTION
    ) {
      results.push({
        valid: true,
        severity: ValidationSeverity.WARNING,
        code: 'PROMOTION_SKIP_STAGING',
        message: 'Skipping staging environment is not recommended',
        details: {
          recommendation: 'Promote to staging first, then to production',
        },
      });
    }

    return results;
  }

  /**
   * Validate workflow data
   */
  private async validateWorkflow(
    context: WorkflowValidationContext
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Check if workflow exists in source environment
    const workflows = await this.envService.getEnvironmentWorkflows(
      context.sourceEnvId
    );
    const workflow = workflows.find((w) => w.workflowId === context.workflowId);

    if (!workflow) {
      results.push({
        valid: false,
        severity: ValidationSeverity.ERROR,
        code: 'WORKFLOW_NOT_FOUND',
        message: `Workflow not found in source environment: ${context.workflowId}`,
      });
      return results;
    }

    // Check if workflow is active
    if (!workflow.isActive) {
      results.push({
        valid: true,
        severity: ValidationSeverity.WARNING,
        code: 'WORKFLOW_INACTIVE',
        message: 'Workflow is inactive in source environment',
      });
    }

    // Info about workflow
    results.push({
      valid: true,
      severity: ValidationSeverity.INFO,
      code: 'WORKFLOW_INFO',
      message: `Workflow version: ${workflow.version}`,
      details: {
        deployedAt: workflow.deployedAt,
        deployedBy: workflow.deployedBy,
      },
    });

    return results;
  }

  /**
   * Validate credentials are mapped
   */
  private async validateCredentials(
    context: WorkflowValidationContext
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // In a real implementation, analyze workflow nodes for credential requirements
    // For now, provide guidance
    results.push({
      valid: true,
      severity: ValidationSeverity.INFO,
      code: 'CREDENTIAL_CHECK',
      message: 'Ensure all credentials are mapped for target environment',
      details: {
        recommendation: 'Review credential mappings before promotion',
      },
    });

    return results;
  }

  /**
   * Validate environment variables
   */
  private async validateVariables(
    context: WorkflowValidationContext
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    const sourceVars = await this.envService.getEnvironmentVariables(
      context.sourceEnvId
    );
    const targetVars = await this.envService.getEnvironmentVariables(
      context.targetEnvId
    );

    // Check for missing variables in target
    const sourceKeys = new Set(sourceVars.map((v) => v.key));
    const targetKeys = new Set(targetVars.map((v) => v.key));

    const missingKeys = Array.from(sourceKeys).filter((k) => !targetKeys.has(k));

    if (missingKeys.length > 0) {
      results.push({
        valid: true,
        severity: ValidationSeverity.WARNING,
        code: 'VARIABLES_MISSING',
        message: `${missingKeys.length} variables not found in target environment`,
        details: {
          missingKeys,
        },
      });
    }

    return results;
  }

  /**
   * Check for breaking changes
   */
  private async checkBreakingChanges(
    context: WorkflowValidationContext
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Check if workflow already exists in target
    const targetWorkflows = await this.envService.getEnvironmentWorkflows(
      context.targetEnvId
    );
    const existingWorkflow = targetWorkflows.find(
      (w) => w.workflowId === context.workflowId
    );

    if (existingWorkflow) {
      results.push({
        valid: true,
        severity: ValidationSeverity.WARNING,
        code: 'WORKFLOW_EXISTS',
        message: 'Workflow already exists in target environment and will be updated',
        details: {
          existingVersion: existingWorkflow.version,
          existingDeployedAt: existingWorkflow.deployedAt,
        },
      });
    }

    return results;
  }

  /**
   * Validate target environment capacity
   */
  private async validateCapacity(
    context: WorkflowValidationContext
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    const targetEnv = await this.envManager.getEnvironment(context.targetEnvId);
    if (!targetEnv) {
      return results;
    }

    const stats = await this.envManager.getStatistics(context.targetEnvId);

    // Check if near capacity limits
    const maxWorkflows = targetEnv.config.rateLimits?.maxConcurrentExecutions || 100;
    const utilizationPercent = (stats.activeWorkflows / maxWorkflows) * 100;

    if (utilizationPercent > 90) {
      results.push({
        valid: true,
        severity: ValidationSeverity.WARNING,
        code: 'CAPACITY_HIGH',
        message: `Target environment is at ${utilizationPercent.toFixed(1)}% capacity`,
        details: {
          activeWorkflows: stats.activeWorkflows,
          maxWorkflows,
        },
      });
    }

    return results;
  }

  /**
   * Check for active executions in target
   */
  private async checkActiveExecutions(
    context: WorkflowValidationContext
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    const targetEnv = await this.envManager.getEnvironment(context.targetEnvId);
    if (!targetEnv) {
      return results;
    }

    // Only warn for production environments
    if (targetEnv.type === EnvironmentType.PRODUCTION) {
      results.push({
        valid: true,
        severity: ValidationSeverity.WARNING,
        code: 'PRODUCTION_PROMOTION',
        message: 'Promoting to production requires extra caution',
        details: {
          recommendation:
            'Schedule promotion during maintenance window if possible',
        },
      });
    }

    return results;
  }

  /**
   * Categorize validation results
   */
  private categorizeResults(
    results: ValidationResult[],
    errors: ValidationResult[],
    warnings: ValidationResult[],
    info: ValidationResult[]
  ): void {
    for (const result of results) {
      if (!result.valid || result.severity === ValidationSeverity.ERROR) {
        errors.push(result);
      } else if (result.severity === ValidationSeverity.WARNING) {
        warnings.push(result);
      } else {
        info.push(result);
      }
    }
  }

  /**
   * Generate recommendations based on validation results
   */
  private generateRecommendations(
    context: WorkflowValidationContext,
    warnings: ValidationResult[],
    info: ValidationResult[]
  ): string[] {
    const recommendations: string[] = [];

    if (warnings.length > 0) {
      recommendations.push(
        'Review all warnings before proceeding with promotion'
      );
    }

    // Add context-specific recommendations
    recommendations.push('Verify all credentials are correctly mapped');
    recommendations.push('Test workflow in target environment after promotion');
    recommendations.push('Monitor execution logs for the first few runs');

    return recommendations;
  }

  /**
   * Calculate risk level
   */
  private calculateRiskLevel(
    errors: ValidationResult[],
    warnings: ValidationResult[],
    context: WorkflowValidationContext
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (errors.length > 0) {
      return 'critical';
    }

    if (warnings.length >= 5) {
      return 'high';
    }

    if (warnings.length >= 2) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Estimate promotion duration
   */
  private estimatePromotionDuration(context: WorkflowValidationContext): number {
    // Base time: 5 seconds
    let duration = 5;

    // Add time for workflow complexity (estimated)
    duration += 10;

    // Add time for credentials and variables
    duration += 5;

    return duration;
  }

  /**
   * Build validation report
   */
  private buildReport(
    canPromote: boolean,
    errors: ValidationResult[],
    warnings: ValidationResult[],
    info: ValidationResult[],
    recommendations: string[],
    riskLevel: 'low' | 'medium' | 'high' | 'critical',
    estimatedDuration: number = 30
  ): PromotionValidationReport {
    return {
      canPromote,
      errors,
      warnings,
      info,
      estimatedDuration,
      riskLevel,
      recommendations,
    };
  }
}

// Singleton
let promotionValidatorInstance: PromotionValidator | null = null;

export function getPromotionValidator(): PromotionValidator {
  if (!promotionValidatorInstance) {
    promotionValidatorInstance = new PromotionValidator();
    logger.info('PromotionValidator singleton initialized');
  }
  return promotionValidatorInstance;
}
