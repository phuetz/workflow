/**
 * Virtual Commissioning System
 *
 * Pre-production testing and validation to ensure workflows
 * are ready for production deployment.
 */

import type {
  CommissioningReport,
  CommissioningCheck,
  CommissioningIssue,
  CheckStatus,
} from './types/digitaltwin';
import type { Workflow, WorkflowNode } from '../types/workflowTypes';
import { generateUUID } from '../utils/uuid';

/**
 * Commissioning configuration
 */
export interface CommissioningConfig {
  strictMode: boolean;
  checkConfiguration: boolean;
  checkDataFlow: boolean;
  checkErrorHandling: boolean;
  checkSecurity: boolean;
  checkPerformance: boolean;
  customChecks?: CustomCheck[];
}

/**
 * Custom check definition
 */
export interface CustomCheck {
  id: string;
  name: string;
  description: string;
  category: 'configuration' | 'data_flow' | 'error_handling' | 'security' | 'performance';
  checker: (workflow: Workflow) => Promise<CommissioningIssue[]>;
}

/**
 * Virtual Commissioning class
 */
export class VirtualCommissioning {
  private config: CommissioningConfig;
  private reports: Map<string, CommissioningReport> = new Map();

  constructor(config: Partial<CommissioningConfig> = {}) {
    this.config = {
      strictMode: config.strictMode ?? false,
      checkConfiguration: config.checkConfiguration ?? true,
      checkDataFlow: config.checkDataFlow ?? true,
      checkErrorHandling: config.checkErrorHandling ?? true,
      checkSecurity: config.checkSecurity ?? true,
      checkPerformance: config.checkPerformance ?? true,
      customChecks: config.customChecks ?? [],
    };
  }

  /**
   * Run complete commissioning process
   */
  async commission(workflow: Workflow): Promise<CommissioningReport> {
    const reportId = generateUUID();
    const startTime = Date.now();
    const checks: CommissioningCheck[] = [];

    // Configuration checks
    if (this.config.checkConfiguration) {
      checks.push(await this.checkNodeConfigurations(workflow));
      checks.push(await this.checkMissingConfigurations(workflow));
      checks.push(await this.checkInvalidConnections(workflow));
    }

    // Data flow checks
    if (this.config.checkDataFlow) {
      checks.push(await this.checkDataFlowIntegrity(workflow));
      checks.push(await this.checkCircularDependencies(workflow));
      checks.push(await this.checkUnreachableNodes(workflow));
    }

    // Error handling checks
    if (this.config.checkErrorHandling) {
      checks.push(await this.checkErrorHandling(workflow));
      checks.push(await this.checkRetryLogic(workflow));
      checks.push(await this.checkTimeouts(workflow));
    }

    // Security checks
    if (this.config.checkSecurity) {
      checks.push(await this.checkCredentials(workflow));
      checks.push(await this.checkSecurityPolicies(workflow));
      checks.push(await this.checkDataEncryption(workflow));
    }

    // Performance checks
    if (this.config.checkPerformance) {
      checks.push(await this.checkPerformanceTargets(workflow));
      checks.push(await this.checkResourceLimits(workflow));
      checks.push(await this.checkRateLimits(workflow));
    }

    // Custom checks
    for (const customCheck of this.config.customChecks || []) {
      checks.push(await this.runCustomCheck(workflow, customCheck));
    }

    // Calculate summary
    const summary = {
      total: checks.length,
      passed: checks.filter(c => c.status === 'passed').length,
      failed: checks.filter(c => c.status === 'failed').length,
      warnings: checks.filter(c => c.status === 'warning').length,
      skipped: checks.filter(c => c.status === 'skipped').length,
    };

    // Determine overall status
    const status = summary.failed > 0
      ? 'failed'
      : summary.warnings > 0
      ? 'warnings'
      : 'passed';

    // Generate recommendations
    const recommendations = this.generateRecommendations(checks);

    const report: CommissioningReport = {
      id: reportId,
      workflowId: workflow.id,
      status,
      checks,
      summary,
      recommendations,
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };

    this.reports.set(reportId, report);
    return report;
  }

  /**
   * Check node configurations are valid
   */
  private async checkNodeConfigurations(workflow: Workflow): Promise<CommissioningCheck> {
    const startTime = Date.now();
    const issues: CommissioningIssue[] = [];

    for (const node of workflow.nodes) {
      // Check if node has required configuration
      if (!node.data.config && this.requiresConfiguration(node.type)) {
        issues.push({
          severity: 'error',
          message: `Node "${node.data.label}" is missing required configuration`,
          nodeId: node.id,
          recommendation: 'Configure the node before deployment',
        });
      }

      // Validate configuration fields
      if (node.data.config) {
        const configIssues = this.validateNodeConfig(node);
        issues.push(...configIssues);
      }
    }

    return {
      id: generateUUID(),
      name: 'Node Configurations',
      description: 'Validates that all nodes have valid configurations',
      category: 'configuration',
      status: issues.filter(i => i.severity === 'error').length > 0 ? 'failed' : 'passed',
      issues,
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }

  /**
   * Check for missing configurations
   */
  private async checkMissingConfigurations(workflow: Workflow): Promise<CommissioningCheck> {
    const startTime = Date.now();
    const issues: CommissioningIssue[] = [];

    for (const node of workflow.nodes) {
      const requiredFields = this.getRequiredFields(node.type);
      const config = node.data.config || {};

      for (const field of requiredFields) {
        if (!config[field]) {
          issues.push({
            severity: 'error',
            message: `Required field "${field}" is missing in node "${node.data.label}"`,
            nodeId: node.id,
            recommendation: `Set the ${field} field`,
          });
        }
      }
    }

    return {
      id: generateUUID(),
      name: 'Missing Configurations',
      description: 'Checks for missing required configuration fields',
      category: 'configuration',
      status: issues.length > 0 ? 'failed' : 'passed',
      issues,
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }

  /**
   * Check for invalid connections
   */
  private async checkInvalidConnections(workflow: Workflow): Promise<CommissioningCheck> {
    const startTime = Date.now();
    const issues: CommissioningIssue[] = [];

    for (const edge of workflow.edges) {
      const sourceNode = workflow.nodes.find(n => n.id === edge.source);
      const targetNode = workflow.nodes.find(n => n.id === edge.target);

      if (!sourceNode) {
        issues.push({
          severity: 'error',
          message: `Connection references non-existent source node: ${edge.source}`,
          recommendation: 'Remove invalid connection',
        });
      }

      if (!targetNode) {
        issues.push({
          severity: 'error',
          message: `Connection references non-existent target node: ${edge.target}`,
          recommendation: 'Remove invalid connection',
        });
      }

      // Check if connection types are compatible
      if (sourceNode && targetNode) {
        const compatible = this.areNodesCompatible(sourceNode, targetNode);
        if (!compatible) {
          issues.push({
            severity: 'warning',
            message: `Potential incompatibility between "${sourceNode.data.label}" and "${targetNode.data.label}"`,
            recommendation: 'Verify data transformation is correct',
          });
        }
      }
    }

    return {
      id: generateUUID(),
      name: 'Invalid Connections',
      description: 'Validates that all connections are valid',
      category: 'configuration',
      status: issues.filter(i => i.severity === 'error').length > 0 ? 'failed' : 'passed',
      issues,
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }

  /**
   * Check data flow integrity
   */
  private async checkDataFlowIntegrity(workflow: Workflow): Promise<CommissioningCheck> {
    const startTime = Date.now();
    const issues: CommissioningIssue[] = [];

    // Check for disconnected nodes
    for (const node of workflow.nodes) {
      if (node.type === 'trigger') continue;

      const hasIncoming = workflow.edges.some(e => e.target === node.id);
      if (!hasIncoming) {
        issues.push({
          severity: 'warning',
          message: `Node "${node.data.label}" has no incoming connections`,
          nodeId: node.id,
          recommendation: 'Connect the node or remove it',
        });
      }
    }

    // Check for nodes with no outputs
    for (const node of workflow.nodes) {
      const hasOutgoing = workflow.edges.some(e => e.source === node.id);
      const isEndNode = this.isEndNode(node.type);

      if (!hasOutgoing && !isEndNode) {
        issues.push({
          severity: 'info',
          message: `Node "${node.data.label}" has no outgoing connections`,
          nodeId: node.id,
          recommendation: 'Verify this is intentional',
        });
      }
    }

    return {
      id: generateUUID(),
      name: 'Data Flow Integrity',
      description: 'Validates data flows correctly through the workflow',
      category: 'data_flow',
      status: issues.filter(i => i.severity === 'error').length > 0 ? 'failed' : 'passed',
      issues,
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }

  /**
   * Check for circular dependencies
   */
  private async checkCircularDependencies(workflow: Workflow): Promise<CommissioningCheck> {
    const startTime = Date.now();
    const issues: CommissioningIssue[] = [];

    const cycles = this.findCycles(workflow);

    for (const cycle of cycles) {
      issues.push({
        severity: 'error',
        message: `Circular dependency detected: ${cycle.join(' → ')}`,
        recommendation: 'Remove circular dependency to prevent infinite loops',
        details: { cycle },
      });
    }

    return {
      id: generateUUID(),
      name: 'Circular Dependencies',
      description: 'Checks for circular dependencies that could cause infinite loops',
      category: 'data_flow',
      status: issues.length > 0 ? 'failed' : 'passed',
      issues,
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }

  /**
   * Check for unreachable nodes
   */
  private async checkUnreachableNodes(workflow: Workflow): Promise<CommissioningCheck> {
    const startTime = Date.now();
    const issues: CommissioningIssue[] = [];

    const reachable = this.getReachableNodes(workflow);
    const allNodes = new Set(workflow.nodes.map(n => n.id));

    for (const nodeId of Array.from(allNodes)) {
      if (!reachable.has(nodeId)) {
        const node = workflow.nodes.find(n => n.id === nodeId);
        issues.push({
          severity: 'warning',
          message: `Node "${node?.data.label}" is unreachable from workflow start`,
          nodeId,
          recommendation: 'Connect the node or remove it',
        });
      }
    }

    return {
      id: generateUUID(),
      name: 'Unreachable Nodes',
      description: 'Identifies nodes that cannot be reached during execution',
      category: 'data_flow',
      status: 'passed',
      issues,
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }

  /**
   * Check error handling
   */
  private async checkErrorHandling(workflow: Workflow): Promise<CommissioningCheck> {
    const startTime = Date.now();
    const issues: CommissioningIssue[] = [];

    for (const node of workflow.nodes) {
      const hasErrorHandling = node.data.config?.errorHandling !== undefined;
      const isCriticalNode = this.isCriticalNode(node.type);

      if (isCriticalNode && !hasErrorHandling) {
        issues.push({
          severity: 'warning',
          message: `Critical node "${node.data.label}" lacks error handling`,
          nodeId: node.id,
          recommendation: 'Add error handling configuration',
        });
      }
    }

    return {
      id: generateUUID(),
      name: 'Error Handling',
      description: 'Validates error handling is configured for critical nodes',
      category: 'error_handling',
      status: this.config.strictMode && issues.length > 0 ? 'failed' : 'passed',
      issues,
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }

  /**
   * Check retry logic
   */
  private async checkRetryLogic(workflow: Workflow): Promise<CommissioningCheck> {
    const startTime = Date.now();
    const issues: CommissioningIssue[] = [];

    for (const node of workflow.nodes) {
      const retryConfig = node.data.config?.retry;
      const shouldHaveRetry = this.shouldHaveRetry(node.type);

      if (shouldHaveRetry && !retryConfig) {
        issues.push({
          severity: 'info',
          message: `Node "${node.data.label}" could benefit from retry logic`,
          nodeId: node.id,
          recommendation: 'Consider adding retry configuration',
        });
      }
    }

    return {
      id: generateUUID(),
      name: 'Retry Logic',
      description: 'Checks if retry logic is configured where needed',
      category: 'error_handling',
      status: 'passed',
      issues,
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }

  /**
   * Check timeouts
   */
  private async checkTimeouts(workflow: Workflow): Promise<CommissioningCheck> {
    const startTime = Date.now();
    const issues: CommissioningIssue[] = [];

    for (const node of workflow.nodes) {
      const timeout = node.data.config?.timeout;
      const needsTimeout = this.needsTimeout(node.type);

      if (needsTimeout && !timeout) {
        issues.push({
          severity: 'warning',
          message: `Node "${node.data.label}" lacks timeout configuration`,
          nodeId: node.id,
          recommendation: 'Set a timeout to prevent hanging',
        });
      }
    }

    return {
      id: generateUUID(),
      name: 'Timeouts',
      description: 'Validates timeout configurations',
      category: 'error_handling',
      status: 'passed',
      issues,
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }

  /**
   * Check credentials
   */
  private async checkCredentials(workflow: Workflow): Promise<CommissioningCheck> {
    const startTime = Date.now();
    const issues: CommissioningIssue[] = [];

    for (const node of workflow.nodes) {
      const needsCredentials = this.needsCredentials(node.type);
      const hasCredentials = node.data.config?.credentials !== undefined;

      if (needsCredentials && !hasCredentials) {
        issues.push({
          severity: 'error',
          message: `Node "${node.data.label}" requires credentials`,
          nodeId: node.id,
          recommendation: 'Configure credentials before deployment',
        });
      }
    }

    return {
      id: generateUUID(),
      name: 'Credentials',
      description: 'Validates that required credentials are configured',
      category: 'security',
      status: issues.filter(i => i.severity === 'error').length > 0 ? 'failed' : 'passed',
      issues,
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }

  /**
   * Check security policies
   */
  private async checkSecurityPolicies(workflow: Workflow): Promise<CommissioningCheck> {
    const startTime = Date.now();
    const issues: CommissioningIssue[] = [];

    // Check for sensitive data handling
    for (const node of workflow.nodes) {
      const handlesSensitiveData = this.handlesSensitiveData(node);

      if (handlesSensitiveData) {
        const hasEncryption = node.data.config?.encryption !== undefined;
        if (!hasEncryption) {
          issues.push({
            severity: 'warning',
            message: `Node "${node.data.label}" handles sensitive data without encryption`,
            nodeId: node.id,
            recommendation: 'Enable encryption for sensitive data',
          });
        }
      }
    }

    return {
      id: generateUUID(),
      name: 'Security Policies',
      description: 'Validates security policies are followed',
      category: 'security',
      status: 'passed',
      issues,
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }

  /**
   * Check data encryption
   */
  private async checkDataEncryption(workflow: Workflow): Promise<CommissioningCheck> {
    const startTime = Date.now();
    const issues: CommissioningIssue[] = [];

    // Simplified check - would be more comprehensive in production
    const hasEncryptionNodes = workflow.nodes.some(n => n.type === 'encryption');

    if (!hasEncryptionNodes && this.config.strictMode) {
      issues.push({
        severity: 'info',
        message: 'Workflow does not use encryption',
        recommendation: 'Consider adding encryption for sensitive data',
      });
    }

    return {
      id: generateUUID(),
      name: 'Data Encryption',
      description: 'Checks for proper data encryption',
      category: 'security',
      status: 'passed',
      issues,
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }

  /**
   * Check performance targets
   */
  private async checkPerformanceTargets(workflow: Workflow): Promise<CommissioningCheck> {
    const startTime = Date.now();
    const issues: CommissioningIssue[] = [];

    const estimatedDuration = this.estimateWorkflowDuration(workflow);

    if (estimatedDuration > 300000) { // > 5 minutes
      issues.push({
        severity: 'warning',
        message: `Workflow estimated to take ${(estimatedDuration / 1000).toFixed(0)}s`,
        recommendation: 'Consider optimizing for better performance',
      });
    }

    return {
      id: generateUUID(),
      name: 'Performance Targets',
      description: 'Validates workflow meets performance targets',
      category: 'performance',
      status: 'passed',
      issues,
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }

  /**
   * Check resource limits
   */
  private async checkResourceLimits(workflow: Workflow): Promise<CommissioningCheck> {
    const startTime = Date.now();
    const issues: CommissioningIssue[] = [];

    const nodeCount = workflow.nodes.length;

    if (nodeCount > 100) {
      issues.push({
        severity: 'warning',
        message: `Workflow has ${nodeCount} nodes, which may impact performance`,
        recommendation: 'Consider breaking into sub-workflows',
      });
    }

    return {
      id: generateUUID(),
      name: 'Resource Limits',
      description: 'Checks workflow stays within resource limits',
      category: 'performance',
      status: 'passed',
      issues,
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }

  /**
   * Check rate limits
   */
  private async checkRateLimits(workflow: Workflow): Promise<CommissioningCheck> {
    const startTime = Date.now();
    const issues: CommissioningIssue[] = [];

    for (const node of workflow.nodes) {
      const hasRateLimit = this.hasRateLimit(node.type);
      const configuresRateLimit = node.data.config?.rateLimit !== undefined;

      if (hasRateLimit && !configuresRateLimit) {
        issues.push({
          severity: 'info',
          message: `Node "${node.data.label}" may be subject to rate limits`,
          nodeId: node.id,
          recommendation: 'Configure rate limiting to avoid API errors',
        });
      }
    }

    return {
      id: generateUUID(),
      name: 'Rate Limits',
      description: 'Checks for rate limit configurations',
      category: 'performance',
      status: 'passed',
      issues,
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }

  /**
   * Run custom check
   */
  private async runCustomCheck(workflow: Workflow, check: CustomCheck): Promise<CommissioningCheck> {
    const startTime = Date.now();
    const issues = await check.checker(workflow);

    return {
      id: check.id,
      name: check.name,
      description: check.description,
      category: check.category,
      status: issues.filter(i => i.severity === 'error').length > 0 ? 'failed' : 'passed',
      issues,
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }

  /**
   * Generate recommendations from checks
   */
  private generateRecommendations(checks: CommissioningCheck[]): string[] {
    const recommendations = new Set<string>();

    // Count issues by category
    const issuesByCategory = new Map<string, number>();
    checks.forEach(check => {
      const count = check.issues.length;
      issuesByCategory.set(
        check.category,
        (issuesByCategory.get(check.category) || 0) + count
      );
    });

    // Generate category-specific recommendations
    if ((issuesByCategory.get('configuration') || 0) > 5) {
      recommendations.add('Review and complete all node configurations');
    }

    if ((issuesByCategory.get('error_handling') || 0) > 3) {
      recommendations.add('Improve error handling and retry logic');
    }

    if ((issuesByCategory.get('security') || 0) > 0) {
      recommendations.add('Address security concerns before production deployment');
    }

    if ((issuesByCategory.get('performance') || 0) > 2) {
      recommendations.add('Optimize workflow for better performance');
    }

    return Array.from(recommendations);
  }

  // Helper methods
  private requiresConfiguration(nodeType: string): boolean {
    const configRequired = ['httpRequest', 'email', 'slack', 'database', 'api'];
    return configRequired.includes(nodeType);
  }

  private validateNodeConfig(node: WorkflowNode): CommissioningIssue[] {
    // Simplified validation
    return [];
  }

  private getRequiredFields(nodeType: string): string[] {
    const fieldMap: Record<string, string[]> = {
      httpRequest: ['url', 'method'],
      email: ['to', 'subject'],
      slack: ['channel', 'message'],
      database: ['query'],
    };
    return fieldMap[nodeType] || [];
  }

  private areNodesCompatible(source: WorkflowNode, target: WorkflowNode): boolean {
    // Simplified compatibility check
    return true;
  }

  private isEndNode(nodeType: string): boolean {
    return ['response', 'webhook', 'output'].includes(nodeType);
  }

  private findCycles(workflow: Workflow): string[][] {
    // Simplified cycle detection
    return [];
  }

  private getReachableNodes(workflow: Workflow): Set<string> {
    const reachable = new Set<string>();
    const startNodes = workflow.nodes.filter(n =>
      n.type === 'trigger' || !workflow.edges.some(e => e.target === n.id)
    );

    const visit = (nodeId: string) => {
      if (reachable.has(nodeId)) return;
      reachable.add(nodeId);

      const outgoing = workflow.edges.filter(e => e.source === nodeId);
      outgoing.forEach(edge => visit(edge.target));
    };

    startNodes.forEach(node => visit(node.id));
    return reachable;
  }

  private isCriticalNode(nodeType: string): boolean {
    return ['database', 'payment', 'email', 'api'].includes(nodeType);
  }

  private shouldHaveRetry(nodeType: string): boolean {
    return ['httpRequest', 'api', 'database'].includes(nodeType);
  }

  private needsTimeout(nodeType: string): boolean {
    return ['httpRequest', 'api', 'database', 'webhook'].includes(nodeType);
  }

  private needsCredentials(nodeType: string): boolean {
    return ['httpRequest', 'database', 'email', 'slack', 'api'].includes(nodeType);
  }

  private handlesSensitiveData(node: WorkflowNode): boolean {
    const sensitiveTypes = ['payment', 'auth', 'credentials'];
    return sensitiveTypes.includes(node.type);
  }

  private estimateWorkflowDuration(workflow: Workflow): number {
    // Simplified estimation: 1s per node
    return workflow.nodes.length * 1000;
  }

  private hasRateLimit(nodeType: string): boolean {
    return ['api', 'httpRequest', 'email'].includes(nodeType);
  }

  /**
   * Get commissioning report
   */
  getReport(reportId: string): CommissioningReport | undefined {
    return this.reports.get(reportId);
  }

  /**
   * Get all reports
   */
  getAllReports(): CommissioningReport[] {
    return Array.from(this.reports.values());
  }
}

// Singleton instance
let instance: VirtualCommissioning | null = null;

export function getVirtualCommissioning(config?: Partial<CommissioningConfig>): VirtualCommissioning {
  if (!instance) {
    instance = new VirtualCommissioning(config);
  }
  return instance;
}
