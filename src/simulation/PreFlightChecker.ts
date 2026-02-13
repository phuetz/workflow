/**
 * Pre-Flight Checker - Comprehensive Safety Validation
 * Validates workflows before execution to prevent failures
 */

import { v4 as uuidv4 } from 'uuid';
import { WorkflowNode, WorkflowEdge } from '../types/workflow';
import {
  PreFlightCheck,
  CredentialValidation,
  QuotaInfo,
  CheckCategory,
  Severity,
} from '../types/simulation';
import { logger } from '../services/SimpleLogger';

export interface PreFlightOptions {
  skipCredentialValidation?: boolean;
  skipQuotaCheck?: boolean;
  skipCostCheck?: boolean;
  maxCostThreshold?: number; // USD
  strictMode?: boolean;
}

/**
 * Pre-flight checker performs comprehensive validation before execution
 */
export class PreFlightChecker {
  private credentialValidations: CredentialValidation[] = [];
  private quotaStatus: QuotaInfo[] = [];

  /**
   * Run all pre-flight checks
   */
  async runChecks(
    workflow: { nodes: WorkflowNode[]; edges: WorkflowEdge[] },
    options: PreFlightOptions = {}
  ): Promise<PreFlightCheck[]> {
    const checks: PreFlightCheck[] = [];

    logger.info(`Running pre-flight checks for ${workflow.nodes.length} nodes`);

    // Security checks
    checks.push(...(await this.runSecurityChecks(workflow)));

    // Credential validation
    if (!options.skipCredentialValidation) {
      checks.push(...(await this.runCredentialChecks(workflow)));
    }

    // Quota checks
    if (!options.skipQuotaCheck) {
      checks.push(...(await this.runQuotaChecks(workflow)));
    }

    // Cost checks
    if (!options.skipCostCheck) {
      checks.push(...(await this.runCostChecks(workflow, options.maxCostThreshold)));
    }

    // Configuration checks
    checks.push(...this.runConfigurationChecks(workflow));

    // Data validation checks
    checks.push(...this.runDataValidationChecks(workflow));

    // Dependency checks
    checks.push(...this.runDependencyChecks(workflow));

    // Performance checks
    checks.push(...this.runPerformanceChecks(workflow));

    // Compatibility checks
    checks.push(...this.runCompatibilityChecks(workflow));

    // Integration checks
    checks.push(...this.runIntegrationChecks(workflow));

    logger.info(`Pre-flight checks completed: ${checks.length} checks, ${checks.filter(c => !c.passed).length} failures`);

    return checks;
  }

  /**
   * Security validation checks
   */
  private async runSecurityChecks(workflow: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  }): Promise<PreFlightCheck[]> {
    const checks: PreFlightCheck[] = [];

    // Check for hardcoded credentials
    const hardcodedCredsCheck = this.checkHardcodedCredentials(workflow.nodes);
    checks.push(hardcodedCredsCheck);

    // Check for insecure HTTP connections
    const httpCheck = this.checkInsecureConnections(workflow.nodes);
    checks.push(httpCheck);

    // Check for exposed secrets
    const secretsCheck = this.checkExposedSecrets(workflow.nodes);
    checks.push(secretsCheck);

    // Check for SQL injection vulnerabilities
    const sqlCheck = this.checkSQLInjection(workflow.nodes);
    checks.push(sqlCheck);

    return checks;
  }

  /**
   * Check for hardcoded credentials
   */
  private checkHardcodedCredentials(nodes: WorkflowNode[]): PreFlightCheck {
    const sensitivePatterns = [
      /password\s*[:=]\s*["'](?!{{)[^"']+["']/i,
      /api[_-]?key\s*[:=]\s*["'](?!{{)[^"']+["']/i,
      /token\s*[:=]\s*["'](?!{{)[^"']+["']/i,
      /secret\s*[:=]\s*["'](?!{{)[^"']+["']/i,
    ];

    const violations: string[] = [];

    nodes.forEach(node => {
      const configStr = JSON.stringify(node.data.config || {});
      sensitivePatterns.forEach(pattern => {
        if (pattern.test(configStr)) {
          violations.push(`Node "${node.data.label}" (${node.id})`);
        }
      });
    });

    return {
      id: uuidv4(),
      name: 'Hardcoded Credentials Check',
      category: 'security',
      severity: 'error',
      passed: violations.length === 0,
      message:
        violations.length === 0
          ? 'No hardcoded credentials detected'
          : `Hardcoded credentials found in ${violations.length} node(s)`,
      fix: 'Use credential management system instead of hardcoding sensitive values',
      metadata: { violations },
    };
  }

  /**
   * Check for insecure HTTP connections
   */
  private checkInsecureConnections(nodes: WorkflowNode[]): PreFlightCheck {
    const insecureNodes: string[] = [];

    nodes.forEach(node => {
      const config = node.data.config as any;
      if (
        (node.type === 'httpRequest' || node.type === 'webhook') &&
        config?.url &&
        typeof config.url === 'string' &&
        config.url.startsWith('http://')
      ) {
        insecureNodes.push(`${node.data.label} (${node.id})`);
      }
    });

    return {
      id: uuidv4(),
      name: 'Insecure HTTP Connections',
      category: 'security',
      severity: 'warning',
      passed: insecureNodes.length === 0,
      message:
        insecureNodes.length === 0
          ? 'All HTTP connections use HTTPS'
          : `${insecureNodes.length} node(s) use insecure HTTP`,
      fix: 'Use HTTPS instead of HTTP for secure connections',
      metadata: { insecureNodes },
    };
  }

  /**
   * Check for exposed secrets in outputs
   */
  private checkExposedSecrets(nodes: WorkflowNode[]): PreFlightCheck {
    // Check if sensitive data might be logged or exposed
    const riskyNodes: string[] = [];

    nodes.forEach(node => {
      if (
        ['logger', 'debug', 'console', 'httpResponse'].includes(node.type) &&
        node.data.config
      ) {
        riskyNodes.push(`${node.data.label} (${node.id})`);
      }
    });

    return {
      id: uuidv4(),
      name: 'Secret Exposure Risk',
      category: 'security',
      severity: 'warning',
      passed: riskyNodes.length === 0,
      message:
        riskyNodes.length === 0
          ? 'No secret exposure risks detected'
          : `${riskyNodes.length} node(s) may expose sensitive data`,
      fix: 'Review logging and output nodes to ensure secrets are not exposed',
      metadata: { riskyNodes },
    };
  }

  /**
   * Check for SQL injection vulnerabilities
   */
  private checkSQLInjection(nodes: WorkflowNode[]): PreFlightCheck {
    const vulnerableNodes: string[] = [];
    const dbNodes = ['mysql', 'postgres', 'mongodb', 'mssql', 'oracle'];

    nodes.forEach(node => {
      if (dbNodes.includes(node.type)) {
        const config = node.data.config as any;
        const query = config?.query || config?.sql || '';

        // Check for string concatenation in queries
        if (
          typeof query === 'string' &&
          (query.includes('${') || query.includes('+') || query.includes('concat'))
        ) {
          vulnerableNodes.push(`${node.data.label} (${node.id})`);
        }
      }
    });

    return {
      id: uuidv4(),
      name: 'SQL Injection Risk',
      category: 'security',
      severity: 'error',
      passed: vulnerableNodes.length === 0,
      message:
        vulnerableNodes.length === 0
          ? 'No SQL injection risks detected'
          : `${vulnerableNodes.length} node(s) have SQL injection risks`,
      fix: 'Use parameterized queries instead of string concatenation',
      metadata: { vulnerableNodes },
    };
  }

  /**
   * Credential validation checks
   */
  private async runCredentialChecks(workflow: {
    nodes: WorkflowNode[];
  }): Promise<PreFlightCheck[]> {
    const checks: PreFlightCheck[] = [];
    this.credentialValidations = [];

    const credentialRequiringNodes = workflow.nodes.filter(node =>
      this.requiresCredentials(node.type)
    );

    if (credentialRequiringNodes.length === 0) {
      checks.push({
        id: uuidv4(),
        name: 'Credential Validation',
        category: 'credentials',
        severity: 'info',
        passed: true,
        message: 'No nodes require credentials',
      });
      return checks;
    }

    // Validate credentials for each node
    const missingCreds: string[] = [];
    const expiredCreds: string[] = [];
    const validCreds: string[] = [];

    for (const node of credentialRequiringNodes) {
      const config = node.data.config as any;
      const credentialId = config?.credentialId;

      if (!credentialId) {
        missingCreds.push(`${node.data.label} (${node.id})`);
        this.credentialValidations.push({
          credentialId: 'none',
          credentialType: node.type,
          valid: false,
          issues: ['No credential configured'],
        });
        continue;
      }

      // Simulate credential validation
      const validation = await this.validateCredential(credentialId, node.type);
      this.credentialValidations.push(validation);

      if (!validation.valid) {
        if (validation.expiresAt && validation.expiresAt < new Date()) {
          expiredCreds.push(`${node.data.label} (${node.id})`);
        } else {
          missingCreds.push(`${node.data.label} (${node.id})`);
        }
      } else {
        validCreds.push(`${node.data.label} (${node.id})`);
      }
    }

    // Missing credentials check
    checks.push({
      id: uuidv4(),
      name: 'Credentials Valid',
      category: 'credentials',
      severity: 'error',
      passed: missingCreds.length === 0,
      message:
        missingCreds.length === 0
          ? 'All credentials are configured and valid'
          : `${missingCreds.length} node(s) missing or invalid credentials`,
      fix: 'Configure valid credentials in credential manager',
      metadata: { missingCreds, validCreds },
    });

    // Expired credentials check
    if (expiredCreds.length > 0) {
      checks.push({
        id: uuidv4(),
        name: 'Credentials Not Expired',
        category: 'credentials',
        severity: 'error',
        passed: false,
        message: `${expiredCreds.length} credential(s) have expired`,
        fix: 'Refresh or reconfigure expired credentials',
        metadata: { expiredCreds },
      });
    }

    return checks;
  }

  /**
   * Check if node type requires credentials
   */
  private requiresCredentials(nodeType: string): boolean {
    const credentialNodes = [
      'slack',
      'email',
      'gmail',
      'mysql',
      'postgres',
      'mongodb',
      'aws_s3',
      'aws_lambda',
      'openai',
      'anthropic',
      'salesforce',
      'stripe',
      'hubspot',
      'google_sheets',
      'github',
      'gitlab',
    ];
    return credentialNodes.includes(nodeType);
  }

  /**
   * Validate a credential
   */
  private async validateCredential(
    credentialId: string,
    credentialType: string
  ): Promise<CredentialValidation> {
    // Simulate credential validation
    // In production, this would call the actual credential service
    const isValid = Math.random() > 0.1; // 90% valid rate for simulation
    const expiresIn = Math.random() * 90; // Days

    return {
      credentialId,
      credentialType,
      valid: isValid,
      expiresAt: new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000),
      scopes: ['read', 'write'],
      issues: isValid ? [] : ['Authentication failed'],
    };
  }

  /**
   * Quota checks for API services
   */
  private async runQuotaChecks(workflow: {
    nodes: WorkflowNode[];
  }): Promise<PreFlightCheck[]> {
    const checks: PreFlightCheck[] = [];
    this.quotaStatus = [];

    const apiNodes = workflow.nodes.filter(
      node =>
        ['openai', 'anthropic', 'gmail', 'slack', 'stripe'].includes(node.type) ||
        node.type.startsWith('aws_') ||
        node.type.startsWith('gcp_')
    );

    if (apiNodes.length === 0) {
      checks.push({
        id: uuidv4(),
        name: 'API Quota Check',
        category: 'quota',
        severity: 'info',
        passed: true,
        message: 'No API quota checks required',
      });
      return checks;
    }

    // Check quota for each service
    const quotaWarnings: string[] = [];
    const quotaErrors: string[] = [];

    for (const node of apiNodes) {
      const quota = await this.checkQuota(node.type);
      this.quotaStatus.push(quota);

      if (quota.percentage >= 100) {
        quotaErrors.push(`${quota.service} - Quota exceeded`);
      } else if (quota.percentage >= 90) {
        quotaWarnings.push(
          `${quota.service} - ${quota.percentage.toFixed(0)}% used`
        );
      }
    }

    // Quota exceeded check
    if (quotaErrors.length > 0) {
      checks.push({
        id: uuidv4(),
        name: 'API Quota Available',
        category: 'quota',
        severity: 'error',
        passed: false,
        message: `${quotaErrors.length} service(s) have exceeded quota`,
        fix: 'Wait for quota reset or upgrade plan',
        metadata: { quotaErrors },
      });
    }

    // Quota warning check
    if (quotaWarnings.length > 0) {
      checks.push({
        id: uuidv4(),
        name: 'API Quota Healthy',
        category: 'quota',
        severity: 'warning',
        passed: false,
        message: `${quotaWarnings.length} service(s) approaching quota limit`,
        fix: 'Consider rate limiting or upgrading plan',
        metadata: { quotaWarnings },
      });
    }

    if (quotaErrors.length === 0 && quotaWarnings.length === 0) {
      checks.push({
        id: uuidv4(),
        name: 'API Quota Available',
        category: 'quota',
        severity: 'info',
        passed: true,
        message: 'All API quotas are healthy',
      });
    }

    return checks;
  }

  /**
   * Check quota for a service
   */
  private async checkQuota(service: string): Promise<QuotaInfo> {
    // Simulate quota check
    const usage = Math.random();
    const limit = 1000;
    const current = Math.floor(usage * limit);

    return {
      service,
      current,
      limit,
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      percentage: (current / limit) * 100,
    };
  }

  /**
   * Cost checks
   */
  private async runCostChecks(
    workflow: { nodes: WorkflowNode[] },
    maxCost: number = 10.0
  ): Promise<PreFlightCheck[]> {
    const checks: PreFlightCheck[] = [];

    // Estimate total cost
    let estimatedCost = 0;
    const expensiveNodes: string[] = [];

    workflow.nodes.forEach(node => {
      const nodeCost = this.estimateNodeCost(node);
      estimatedCost += nodeCost;

      if (nodeCost > 0.1) {
        expensiveNodes.push(`${node.data.label} ($${nodeCost.toFixed(4)})`);
      }
    });

    // Cost within budget check
    checks.push({
      id: uuidv4(),
      name: 'Cost Within Budget',
      category: 'cost',
      severity: estimatedCost > maxCost ? 'warning' : 'info',
      passed: estimatedCost <= maxCost,
      message:
        estimatedCost <= maxCost
          ? `Estimated cost $${estimatedCost.toFixed(4)} is within budget of $${maxCost}`
          : `Estimated cost $${estimatedCost.toFixed(4)} exceeds budget of $${maxCost}`,
      fix: 'Consider optimizing workflow or increasing budget',
      metadata: { estimatedCost, maxCost, expensiveNodes },
    });

    // High cost nodes warning
    if (expensiveNodes.length > 0) {
      checks.push({
        id: uuidv4(),
        name: 'Expensive Nodes',
        category: 'cost',
        severity: 'warning',
        passed: false,
        message: `${expensiveNodes.length} node(s) have significant cost`,
        fix: 'Review expensive nodes for optimization opportunities',
        metadata: { expensiveNodes },
      });
    }

    return checks;
  }

  /**
   * Estimate cost for a single node
   */
  private estimateNodeCost(node: WorkflowNode): number {
    const costs: Record<string, number> = {
      openai: 0.03,
      anthropic: 0.015,
      'gpt-4': 0.06,
      llm: 0.02,
      stripe: 0.001,
      aws_lambda: 0.0001,
      aws_s3: 0.0001,
      sendgrid: 0.0001,
      twilio: 0.01,
    };

    return costs[node.type] || 0;
  }

  /**
   * Configuration validation checks
   */
  private runConfigurationChecks(workflow: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  }): PreFlightCheck[] {
    const checks: PreFlightCheck[] = [];
    const misconfigured: string[] = [];

    workflow.nodes.forEach(node => {
      if (this.isMisconfigured(node)) {
        misconfigured.push(`${node.data.label} (${node.id})`);
      }
    });

    checks.push({
      id: uuidv4(),
      name: 'Node Configuration Valid',
      category: 'integration',
      severity: 'error',
      passed: misconfigured.length === 0,
      message:
        misconfigured.length === 0
          ? 'All nodes are properly configured'
          : `${misconfigured.length} node(s) are misconfigured`,
      fix: 'Review and complete node configuration',
      metadata: { misconfigured },
    });

    return checks;
  }

  /**
   * Check if node is misconfigured
   */
  private isMisconfigured(node: WorkflowNode): boolean {
    const config = node.data.config as any;

    switch (node.type) {
      case 'httpRequest':
        return !config?.url;
      case 'email':
      case 'gmail':
        return !config?.recipient && !config?.to;
      case 'slack':
        return !config?.channel;
      case 'mysql':
      case 'postgres':
        return !config?.query;
      default:
        return false;
    }
  }

  /**
   * Data validation checks
   */
  private runDataValidationChecks(workflow: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  }): PreFlightCheck[] {
    const checks: PreFlightCheck[] = [];

    // Check for orphaned nodes
    const orphanedNodes = this.findOrphanedNodes(workflow.nodes, workflow.edges);
    checks.push({
      id: uuidv4(),
      name: 'No Orphaned Nodes',
      category: 'data',
      severity: 'warning',
      passed: orphanedNodes.length === 0,
      message:
        orphanedNodes.length === 0
          ? 'No orphaned nodes detected'
          : `${orphanedNodes.length} orphaned node(s) detected`,
      fix: 'Connect or remove orphaned nodes',
      metadata: { orphanedNodes },
    });

    // Check for required fields
    const missingFields = this.findMissingRequiredFields(workflow.nodes);
    if (missingFields.length > 0) {
      checks.push({
        id: uuidv4(),
        name: 'Required Fields Present',
        category: 'data',
        severity: 'error',
        passed: false,
        message: `${missingFields.length} node(s) missing required fields`,
        fix: 'Configure all required fields',
        metadata: { missingFields },
      });
    }

    return checks;
  }

  /**
   * Find orphaned nodes (nodes with no connections)
   */
  private findOrphanedNodes(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): string[] {
    const orphaned: string[] = [];
    const connectedNodes = new Set<string>();

    edges.forEach(edge => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });

    nodes.forEach(node => {
      // Triggers don't need incoming connections
      const isTrigger = node.type === 'trigger' || node.type === 'webhook' || node.type === 'schedule';

      if (!isTrigger && !connectedNodes.has(node.id)) {
        orphaned.push(`${node.data.label} (${node.id})`);
      }
    });

    return orphaned;
  }

  /**
   * Find nodes missing required fields
   */
  private findMissingRequiredFields(nodes: WorkflowNode[]): string[] {
    const missing: string[] = [];

    nodes.forEach(node => {
      const requiredFields = this.getRequiredFields(node.type);
      const config = node.data.config as any;

      const missingInNode = requiredFields.filter(field => !config?.[field]);
      if (missingInNode.length > 0) {
        missing.push(`${node.data.label} - Missing: ${missingInNode.join(', ')}`);
      }
    });

    return missing;
  }

  /**
   * Get required fields for node type
   */
  private getRequiredFields(nodeType: string): string[] {
    const fields: Record<string, string[]> = {
      httpRequest: ['url', 'method'],
      email: ['recipient', 'subject'],
      slack: ['channel', 'message'],
      mysql: ['query'],
      postgres: ['query'],
    };

    return fields[nodeType] || [];
  }

  /**
   * Dependency validation checks
   */
  private runDependencyChecks(workflow: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  }): PreFlightCheck[] {
    const checks: PreFlightCheck[] = [];

    // Check for circular dependencies
    const hasCircular = this.detectCircularDependencies(workflow.nodes, workflow.edges);
    checks.push({
      id: uuidv4(),
      name: 'No Circular Dependencies',
      category: 'integration',
      severity: 'error',
      passed: !hasCircular,
      message: hasCircular
        ? 'Circular dependencies detected in workflow'
        : 'No circular dependencies detected',
      fix: 'Remove circular connections between nodes',
    });

    return checks;
  }

  /**
   * Detect circular dependencies
   */
  private detectCircularDependencies(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): boolean {
    const graph = new Map<string, string[]>();
    nodes.forEach(node => graph.set(node.id, []));
    edges.forEach(edge => {
      const neighbors = graph.get(edge.source) || [];
      neighbors.push(edge.target);
      graph.set(edge.source, neighbors);
    });

    const visited = new Set<string>();
    const recStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      visited.add(nodeId);
      recStack.add(nodeId);

      const neighbors = graph.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          return true;
        }
      }

      recStack.delete(nodeId);
      return false;
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (hasCycle(node.id)) return true;
      }
    }

    return false;
  }

  /**
   * Performance validation checks
   */
  private runPerformanceChecks(workflow: {
    nodes: WorkflowNode[];
  }): PreFlightCheck[] {
    const checks: PreFlightCheck[] = [];

    // Check for excessive nodes
    const nodeCount = workflow.nodes.length;
    checks.push({
      id: uuidv4(),
      name: 'Reasonable Node Count',
      category: 'performance',
      severity: nodeCount > 100 ? 'warning' : 'info',
      passed: nodeCount <= 100,
      message:
        nodeCount <= 100
          ? `Node count (${nodeCount}) is reasonable`
          : `High node count (${nodeCount}) may impact performance`,
      fix: 'Consider breaking into sub-workflows',
      metadata: { nodeCount },
    });

    // Check for missing delays in loops
    const loopsWithoutDelay = this.findLoopsWithoutDelay(workflow.nodes);
    if (loopsWithoutDelay.length > 0) {
      checks.push({
        id: uuidv4(),
        name: 'Loops Have Delays',
        category: 'performance',
        severity: 'warning',
        passed: false,
        message: `${loopsWithoutDelay.length} loop(s) without delay may cause high CPU usage`,
        fix: 'Add delay nodes to prevent tight loops',
        metadata: { loopsWithoutDelay },
      });
    }

    return checks;
  }

  /**
   * Find loops without delay
   */
  private findLoopsWithoutDelay(nodes: WorkflowNode[]): string[] {
    return nodes
      .filter(
        node =>
          node.type === 'loop' &&
          !(node.data.config as any)?.delay &&
          !(node.data.config as any)?.delayMs
      )
      .map(node => `${node.data.label} (${node.id})`);
  }

  /**
   * Compatibility checks
   */
  private runCompatibilityChecks(workflow: {
    nodes: WorkflowNode[];
  }): PreFlightCheck[] {
    const checks: PreFlightCheck[] = [];

    // Check for deprecated nodes
    const deprecated = this.findDeprecatedNodes(workflow.nodes);
    if (deprecated.length > 0) {
      checks.push({
        id: uuidv4(),
        name: 'No Deprecated Nodes',
        category: 'compatibility',
        severity: 'warning',
        passed: false,
        message: `${deprecated.length} deprecated node(s) in use`,
        fix: 'Replace deprecated nodes with modern alternatives',
        metadata: { deprecated },
      });
    }

    return checks;
  }

  /**
   * Find deprecated nodes
   */
  private findDeprecatedNodes(nodes: WorkflowNode[]): string[] {
    const deprecatedTypes = ['oldHttp', 'legacyEmail', 'v1Api'];
    return nodes
      .filter(node => deprecatedTypes.includes(node.type))
      .map(node => `${node.data.label} (${node.type})`);
  }

  /**
   * Integration checks
   */
  private runIntegrationChecks(workflow: {
    nodes: WorkflowNode[];
  }): PreFlightCheck[] {
    const checks: PreFlightCheck[] = [];

    // Check for API version mismatches
    const versionIssues = this.findVersionMismatches(workflow.nodes);
    if (versionIssues.length > 0) {
      checks.push({
        id: uuidv4(),
        name: 'API Versions Compatible',
        category: 'integration',
        severity: 'warning',
        passed: false,
        message: `${versionIssues.length} potential API version mismatch(es)`,
        fix: 'Verify API versions are compatible',
        metadata: { versionIssues },
      });
    }

    return checks;
  }

  /**
   * Find API version mismatches
   */
  private findVersionMismatches(nodes: WorkflowNode[]): string[] {
    // Placeholder for version checking logic
    return [];
  }

  /**
   * Get credential validations
   */
  getCredentialValidations(): CredentialValidation[] {
    return this.credentialValidations;
  }

  /**
   * Get quota status
   */
  getQuotaStatus(): QuotaInfo[] {
    return this.quotaStatus;
  }
}
