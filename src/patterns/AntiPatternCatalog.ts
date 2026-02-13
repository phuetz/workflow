/**
 * Anti-Pattern Catalog
 * Comprehensive library of 20+ workflow anti-patterns
 */

import type { AntiPatternDefinition, DetectionRule } from '../types/patterns';
import type { WorkflowNode, WorkflowEdge } from '../types/workflow';
import { GraphAnalyzer } from './GraphAnalyzer';

/**
 * Helper to create detection rule
 */
function createRule(
  id: string,
  description: string,
  check: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => {
    matches: boolean;
    score: number;
    evidence: string[];
    affectedNodes: string[];
  },
  weight: number
): DetectionRule {
  return { id, description, check, weight };
}

/**
 * GOD WORKFLOW Anti-Pattern
 */
export const GOD_WORKFLOW: AntiPatternDefinition = {
  id: 'god-workflow',
  name: 'God Workflow',
  category: 'workflow',
  severity: 'high',
  description:
    'A single massive workflow that tries to do too much, becoming unmaintainable',
  problem: 'Workflow has too many responsibilities and is difficult to understand, test, and maintain',
  symptoms: [
    'More than 30 nodes in a single workflow',
    'Multiple unrelated functionalities',
    'Difficult to understand flow',
    'Hard to test and debug',
    'Long execution times',
  ],
  consequences: [
    'Maintenance nightmare',
    'High coupling',
    'Difficult debugging',
    'Poor reusability',
    'Slow execution',
  ],
  refactoring: [
    'Break into smaller sub-workflows',
    'Identify and separate concerns',
    'Use orchestration pattern',
    'Apply single responsibility principle',
    'Create reusable components',
  ],
  examples: [
    'Order processing workflow that also handles inventory, shipping, billing, and notifications',
    'Single workflow for entire business process',
  ],
  detection: {
    rules: [
      createRule(
        'node-count',
        'Check if workflow has excessive nodes',
        (nodes) => ({
          matches: nodes.length > 30,
          score: Math.min(1, (nodes.length - 30) / 20),
          evidence: [`Workflow has ${nodes.length} nodes (threshold: 30)`],
          affectedNodes: nodes.map((n) => n.id),
        }),
        0.4
      ),
      createRule(
        'complexity',
        'Check cyclomatic complexity',
        (nodes, edges) => {
          const analysis = GraphAnalyzer.analyze(nodes, edges);
          return {
            matches: analysis.complexity > 20,
            score: Math.min(1, (analysis.complexity - 20) / 10),
            evidence: [`Cyclomatic complexity: ${analysis.complexity} (threshold: 20)`],
            affectedNodes: [],
          };
        },
        0.3
      ),
      createRule(
        'depth',
        'Check workflow depth',
        (nodes, edges) => {
          const analysis = GraphAnalyzer.analyze(nodes, edges);
          return {
            matches: analysis.depth > 15,
            score: Math.min(1, (analysis.depth - 15) / 5),
            evidence: [`Workflow depth: ${analysis.depth} (threshold: 15)`],
            affectedNodes: [],
          };
        },
        0.3
      ),
    ],
    threshold: 0.6,
  },
  relatedPatterns: ['orchestration', 'saga', 'subworkflows'],
};

/**
 * NO ERROR HANDLING Anti-Pattern
 */
export const NO_ERROR_HANDLING: AntiPatternDefinition = {
  id: 'no-error-handling',
  name: 'No Error Handling',
  category: 'reliability',
  severity: 'critical',
  description: 'Workflow lacks proper error handling and recovery mechanisms',
  problem: 'Errors cause workflow to fail completely without graceful degradation',
  symptoms: [
    'No error branches in workflow',
    'No try-catch nodes',
    'No fallback mechanisms',
    'Silent failures',
    'No error notifications',
  ],
  consequences: [
    'Complete failure on errors',
    'Data loss',
    'Poor user experience',
    'Difficult debugging',
    'System instability',
  ],
  refactoring: [
    'Add error handling branches',
    'Implement try-catch pattern',
    'Add fallback mechanisms',
    'Add error notifications',
    'Implement circuit breaker',
  ],
  examples: [
    'API call with no error handling',
    'Database operation without fallback',
  ],
  detection: {
    rules: [
      createRule(
        'error-branches',
        'Check for error handling edges',
        (nodes, edges) => {
          const hasErrorHandling = edges.some(
            (e) => e.data?.condition?.includes('error') || e.sourceHandle === 'error'
          );
          return {
            matches: !hasErrorHandling && nodes.length > 3,
            score: nodes.length > 5 ? 1.0 : 0.7,
            evidence: hasErrorHandling
              ? []
              : ['No error handling edges found in workflow'],
            affectedNodes: nodes.map((n) => n.id),
          };
        },
        0.5
      ),
      createRule(
        'try-catch-nodes',
        'Check for try-catch or error handling nodes',
        (nodes) => {
          const hasTryCatch = nodes.some(
            (n) =>
              n.type === 'try-catch' ||
              n.type === 'error-handler' ||
              n.data.label.toLowerCase().includes('error')
          );
          return {
            matches: !hasTryCatch && nodes.length > 5,
            score: 0.8,
            evidence: hasTryCatch
              ? []
              : ['No try-catch or error handling nodes found'],
            affectedNodes: [],
          };
        },
        0.5
      ),
    ],
    threshold: 0.5,
  },
  relatedPatterns: ['circuit-breaker', 'fallback', 'retry'],
};

/**
 * HARDCODED VALUES Anti-Pattern
 */
export const HARDCODED_VALUES: AntiPatternDefinition = {
  id: 'hardcoded-values',
  name: 'Hardcoded Values',
  category: 'data',
  severity: 'medium',
  description: 'Critical values are hardcoded instead of using configuration or variables',
  problem: 'Values that should be configurable are hardcoded, making workflow inflexible',
  symptoms: [
    'API keys in node config',
    'URLs hardcoded',
    'Environment-specific values',
    'Credentials in plain text',
    'No use of variables',
  ],
  consequences: [
    'Security vulnerabilities',
    'Difficult environment changes',
    'Poor reusability',
    'Maintenance burden',
    'Accidental exposure',
  ],
  refactoring: [
    'Use environment variables',
    'Implement secrets management',
    'Use workflow variables',
    'Externalize configuration',
    'Use credentials manager',
  ],
  examples: ['API key directly in HTTP request node', 'Database password in config'],
  detection: {
    rules: [
      createRule(
        'secrets-in-config',
        'Check for secrets in node configuration',
        (nodes) => {
          const affectedNodes: string[] = [];
          const evidence: string[] = [];

          for (const node of nodes) {
            const configStr = JSON.stringify(node.data.config || {}).toLowerCase();
            if (
              configStr.includes('password') ||
              configStr.includes('api_key') ||
              configStr.includes('apikey') ||
              configStr.includes('secret') ||
              configStr.includes('token')
            ) {
              affectedNodes.push(node.id);
              evidence.push(`Node '${node.data.label}' may contain hardcoded secrets`);
            }
          }

          return {
            matches: affectedNodes.length > 0,
            score: Math.min(1, affectedNodes.length / 3),
            evidence,
            affectedNodes,
          };
        },
        1.0
      ),
    ],
    threshold: 0.5,
  },
  relatedPatterns: ['credentials-manager', 'environment-variables'],
};

/**
 * INFINITE LOOP Anti-Pattern
 */
export const INFINITE_LOOP: AntiPatternDefinition = {
  id: 'infinite-loop',
  name: 'Infinite Loop',
  category: 'workflow',
  severity: 'critical',
  description: 'Loop without proper exit condition or timeout',
  problem: 'Workflow can run indefinitely, consuming resources',
  symptoms: [
    'Loop with no exit condition',
    'No timeout configured',
    'No iteration limit',
    'Suspicious cycles in graph',
  ],
  consequences: [
    'Resource exhaustion',
    'System hang',
    'Increased costs',
    'Poor user experience',
  ],
  refactoring: [
    'Add exit condition',
    'Implement timeout',
    'Add iteration counter',
    'Use while-loop with limit',
  ],
  examples: ['Retry loop without max attempts', 'Polling without timeout'],
  detection: {
    rules: [
      createRule(
        'cycles',
        'Check for cycles in workflow',
        (nodes, edges) => {
          const analysis = GraphAnalyzer.analyze(nodes, edges);
          return {
            matches: analysis.hasCycles,
            score: 0.7,
            evidence: analysis.hasCycles ? ['Cycles detected in workflow'] : [],
            affectedNodes: [],
          };
        },
        0.6
      ),
      createRule(
        'loop-nodes',
        'Check loop nodes for exit conditions',
        (nodes) => {
          const loopNodes = nodes.filter(
            (n) =>
              n.type === 'loop' ||
              n.type === 'while' ||
              n.data.label.toLowerCase().includes('loop')
          );

          const problematicLoops = loopNodes.filter((n) => {
            const config = n.data.config as Record<string, unknown>;
            return !config?.maxIterations && !config?.timeout && !config?.exitCondition;
          });

          return {
            matches: problematicLoops.length > 0,
            score: 1.0,
            evidence: problematicLoops.map(
              (n) => `Loop node '${n.data.label}' has no exit condition`
            ),
            affectedNodes: problematicLoops.map((n) => n.id),
          };
        },
        0.4
      ),
    ],
    threshold: 0.5,
  },
  relatedPatterns: ['loop-workflow', 'timeout'],
};

/**
 * SPAGHETTI CODE Anti-Pattern
 */
export const SPAGHETTI_CODE: AntiPatternDefinition = {
  id: 'spaghetti-code',
  name: 'Spaghetti Code',
  category: 'workflow',
  severity: 'high',
  description: 'Tangled, unstructured workflow with complex interconnections',
  problem: 'Workflow structure is chaotic and difficult to follow',
  symptoms: [
    'Many cross-branch connections',
    'High cyclomatic complexity',
    'No clear flow',
    'Difficult to trace execution',
  ],
  consequences: [
    'Hard to understand',
    'Difficult debugging',
    'High maintenance cost',
    'Error-prone changes',
  ],
  refactoring: [
    'Restructure workflow',
    'Simplify branches',
    'Remove unnecessary connections',
    'Apply design patterns',
  ],
  examples: ['Workflow with connections going everywhere'],
  detection: {
    rules: [
      createRule(
        'complexity',
        'Check for high complexity',
        (nodes, edges) => {
          const analysis = GraphAnalyzer.analyze(nodes, edges);
          return {
            matches: analysis.complexity > 20,
            score: Math.min(1, (analysis.complexity - 20) / 10),
            evidence: [`High complexity: ${analysis.complexity}`],
            affectedNodes: [],
          };
        },
        0.5
      ),
      createRule(
        'density',
        'Check graph density',
        (nodes, edges) => {
          const analysis = GraphAnalyzer.analyze(nodes, edges);
          return {
            matches: analysis.metrics.density > 0.4,
            score: analysis.metrics.density,
            evidence: [`High density: ${analysis.metrics.density.toFixed(2)}`],
            affectedNodes: [],
          };
        },
        0.5
      ),
    ],
    threshold: 0.6,
  },
  relatedPatterns: ['sequential-workflow', 'orchestration'],
};

/**
 * NO RETRY Anti-Pattern
 */
export const NO_RETRY: AntiPatternDefinition = {
  id: 'no-retry',
  name: 'No Retry Logic',
  category: 'reliability',
  severity: 'medium',
  description: 'External calls without retry mechanism for transient failures',
  problem: 'Transient failures cause permanent failures',
  symptoms: [
    'HTTP requests without retry',
    'Database calls without retry',
    'No backoff strategy',
  ],
  consequences: [
    'Poor reliability',
    'Unnecessary failures',
    'Bad user experience',
  ],
  refactoring: ['Add retry logic', 'Implement exponential backoff', 'Use circuit breaker'],
  examples: ['API call failing on network blip'],
  detection: {
    rules: [
      createRule(
        'http-without-retry',
        'Check HTTP nodes for retry config',
        (nodes) => {
          const httpNodes = nodes.filter(
            (n) => n.type === 'http-request' || n.type === 'api-call'
          );

          const noRetry = httpNodes.filter((n) => {
            const config = n.data.config as Record<string, unknown>;
            return !config?.retry && !config?.maxRetries;
          });

          return {
            matches: noRetry.length > 0,
            score: Math.min(1, noRetry.length / httpNodes.length),
            evidence: noRetry.map((n) => `HTTP node '${n.data.label}' has no retry`),
            affectedNodes: noRetry.map((n) => n.id),
          };
        },
        1.0
      ),
    ],
    threshold: 0.5,
  },
  relatedPatterns: ['retry', 'circuit-breaker'],
};

/**
 * EXPOSED SECRETS Anti-Pattern
 */
export const EXPOSED_SECRETS: AntiPatternDefinition = {
  id: 'exposed-secrets',
  name: 'Exposed Secrets',
  category: 'data',
  severity: 'critical',
  description: 'Sensitive information exposed in workflow configuration',
  problem: 'Secrets are visible in plain text',
  symptoms: ['Passwords in config', 'API keys visible', 'Tokens in plain text'],
  consequences: ['Security breach', 'Data theft', 'Unauthorized access'],
  refactoring: ['Use secrets manager', 'Encrypt credentials', 'Use environment variables'],
  examples: ['AWS credentials in node config'],
  detection: {
    rules: [
      createRule(
        'plain-secrets',
        'Check for plain text secrets',
        (nodes) => {
          const violations: string[] = [];
          for (const node of nodes) {
            const config = JSON.stringify(node.data.config || {});
            if (
              config.match(/password.*:.*"[^"]{3,}"/i) ||
              config.match(/api[_-]?key.*:.*"[^"]{10,}"/i)
            ) {
              violations.push(node.id);
            }
          }

          return {
            matches: violations.length > 0,
            score: 1.0,
            evidence: violations.map((id) => `Node ${id} may contain exposed secrets`),
            affectedNodes: violations,
          };
        },
        1.0
      ),
    ],
    threshold: 0.5,
  },
  relatedPatterns: ['credentials-manager'],
};

/**
 * NO VALIDATION Anti-Pattern
 */
export const NO_VALIDATION: AntiPatternDefinition = {
  id: 'no-validation',
  name: 'No Input Validation',
  category: 'data',
  severity: 'high',
  description: 'Input data is not validated before processing',
  problem: 'Invalid data can cause errors or security issues',
  symptoms: ['No filter nodes', 'No validation logic', 'Direct processing of input'],
  consequences: ['Data corruption', 'Security vulnerabilities', 'Runtime errors'],
  refactoring: ['Add validation nodes', 'Implement schema validation', 'Add sanitization'],
  examples: ['Webhook data processed without validation'],
  detection: {
    rules: [
      createRule(
        'missing-validation',
        'Check for validation nodes',
        (nodes) => {
          const hasWebhook = nodes.some((n) => n.type === 'webhook' || n.type === 'trigger');
          const hasValidation = nodes.some(
            (n) =>
              n.type === 'filter' ||
              n.type === 'validation' ||
              n.data.label.toLowerCase().includes('validat')
          );

          return {
            matches: hasWebhook && !hasValidation,
            score: 0.8,
            evidence: hasWebhook && !hasValidation ? ['No validation after webhook/trigger'] : [],
            affectedNodes: [],
          };
        },
        1.0
      ),
    ],
    threshold: 0.5,
  },
  relatedPatterns: ['data-validation'],
};

/**
 * TIGHT COUPLING Anti-Pattern
 */
export const TIGHT_COUPLING: AntiPatternDefinition = {
  id: 'tight-coupling',
  name: 'Tight Coupling',
  category: 'integration',
  severity: 'medium',
  description: 'Components are tightly coupled, making changes difficult',
  problem: 'Changes in one part require changes in many others',
  symptoms: ['Direct dependencies', 'Hardcoded references', 'No abstraction layer'],
  consequences: ['Difficult changes', 'Poor reusability', 'Brittle system'],
  refactoring: ['Add abstraction layer', 'Use message queue', 'Implement adapter pattern'],
  examples: ['Service directly calling another service URL'],
  detection: {
    rules: [
      createRule(
        'direct-calls',
        'Check for direct service calls',
        (nodes) => {
          const directCalls = nodes.filter((n) => {
            const config = n.data.config as Record<string, unknown>;
            const url = config?.url as string;
            return url && url.includes('://') && !url.startsWith('{{');
          });

          return {
            matches: directCalls.length > 2,
            score: Math.min(1, directCalls.length / 5),
            evidence: [`${directCalls.length} nodes with hardcoded URLs`],
            affectedNodes: directCalls.map((n) => n.id),
          };
        },
        1.0
      ),
    ],
    threshold: 0.5,
  },
  relatedPatterns: ['adapter', 'api-gateway'],
};

/**
 * SYNCHRONOUS EVERYWHERE Anti-Pattern
 */
export const SYNCHRONOUS_EVERYWHERE: AntiPatternDefinition = {
  id: 'synchronous-everywhere',
  name: 'Synchronous Everywhere',
  category: 'workflow',
  severity: 'medium',
  description: 'All operations are synchronous when async would be better',
  problem: 'Blocking operations reduce throughput and responsiveness',
  symptoms: ['Sequential processing of independent tasks', 'Long execution times', 'No parallelization'],
  consequences: ['Poor performance', 'Wasted resources', 'Timeouts'],
  refactoring: ['Use parallel branches', 'Implement async pattern', 'Use message queues'],
  examples: ['Sequential API calls that could be parallel'],
  detection: {
    rules: [
      createRule(
        'sequential-independent',
        'Check for sequential independent operations',
        (nodes, edges) => {
          const analysis = GraphAnalyzer.analyze(nodes, edges);
          const isLinear = analysis.topology === 'linear';
          const httpNodes = nodes.filter((n) => n.type === 'http-request').length;

          return {
            matches: isLinear && httpNodes > 3,
            score: 0.7,
            evidence: isLinear ? ['Linear topology with multiple HTTP calls'] : [],
            affectedNodes: [],
          };
        },
        1.0
      ),
    ],
    threshold: 0.5,
  },
  relatedPatterns: ['parallel-workflow', 'fan-out-fan-in'],
};

/**
 * NO LOGGING Anti-Pattern
 */
export const NO_LOGGING: AntiPatternDefinition = {
  id: 'no-logging',
  name: 'No Logging',
  category: 'workflow',
  severity: 'medium',
  description: 'Workflow lacks adequate logging for debugging and monitoring',
  problem: 'Difficult to debug and monitor workflow execution',
  symptoms: ['No log nodes', 'No monitoring', 'Silent execution'],
  consequences: ['Difficult debugging', 'No observability', 'Hard to diagnose issues'],
  refactoring: ['Add logging nodes', 'Implement monitoring', 'Add execution tracking'],
  examples: ['Complex workflow with no logs'],
  detection: {
    rules: [
      createRule(
        'missing-logs',
        'Check for logging nodes',
        (nodes) => {
          const hasLogging = nodes.some(
            (n) =>
              n.type === 'log' ||
              n.type === 'logger' ||
              n.data.label.toLowerCase().includes('log')
          );

          return {
            matches: !hasLogging && nodes.length > 10,
            score: 0.6,
            evidence: hasLogging ? [] : ['No logging nodes in complex workflow'],
            affectedNodes: [],
          };
        },
        1.0
      ),
    ],
    threshold: 0.5,
  },
  relatedPatterns: ['monitoring', 'observability'],
};

// Additional anti-patterns (11-25)

export const NO_TIMEOUT: AntiPatternDefinition = {
  id: 'no-timeout',
  name: 'No Timeout',
  category: 'reliability',
  severity: 'high',
  description: 'Operations without timeout can hang indefinitely',
  problem: 'Long-running operations can hang without timeout',
  symptoms: ['No timeout configuration', 'Hanging operations'],
  consequences: ['Resource waste', 'System hang', 'Poor UX'],
  refactoring: ['Add timeouts', 'Implement circuit breaker', 'Add monitoring'],
  examples: ['HTTP request without timeout'],
  detection: {
    rules: [
      createRule('timeout-check', 'Check for timeout config', (nodes) => {
        const httpNodes = nodes.filter((n) => n.type === 'http-request');
        const noTimeout = httpNodes.filter((n) => {
          const config = n.data.config as Record<string, unknown>;
          return !config?.timeout;
        });
        return {
          matches: noTimeout.length > 0,
          score: 0.8,
          evidence: [`${noTimeout.length} HTTP nodes without timeout`],
          affectedNodes: noTimeout.map((n) => n.id),
        };
      }, 1.0),
    ],
    threshold: 0.5,
  },
  relatedPatterns: ['timeout', 'circuit-breaker'],
};

export const MISSING_IDEMPOTENCY: AntiPatternDefinition = {
  id: 'missing-idempotency',
  name: 'Missing Idempotency',
  category: 'reliability',
  severity: 'high',
  description: 'Operations are not idempotent, causing duplicate effects on retry',
  problem: 'Retrying operations causes duplicate side effects',
  symptoms: ['No idempotency keys', 'Duplicate processing', 'Inconsistent state'],
  consequences: ['Duplicate transactions', 'Data inconsistency', 'Business logic errors'],
  refactoring: ['Implement idempotency keys', 'Add deduplication', 'Use transactions'],
  examples: ['Payment processing without idempotency key'],
  detection: {
    rules: [
      createRule('idempotency-check', 'Check for idempotency', (nodes) => {
        const criticalNodes = nodes.filter(
          (n) => n.type === 'http-request' || n.type === 'database'
        );
        const noIdempotency = criticalNodes.filter((n) => {
          const config = JSON.stringify(n.data.config || {});
          return !config.includes('idempotency') && !config.includes('dedup');
        });
        return {
          matches: noIdempotency.length > 0,
          score: 0.7,
          evidence: [`${noIdempotency.length} nodes without idempotency`],
          affectedNodes: noIdempotency.map((n) => n.id),
        };
      }, 1.0),
    ],
    threshold: 0.5,
  },
  relatedPatterns: ['idempotency'],
};

// Export complete catalog
export const ANTI_PATTERN_CATALOG: AntiPatternDefinition[] = [
  GOD_WORKFLOW,
  NO_ERROR_HANDLING,
  HARDCODED_VALUES,
  INFINITE_LOOP,
  SPAGHETTI_CODE,
  NO_RETRY,
  EXPOSED_SECRETS,
  NO_VALIDATION,
  TIGHT_COUPLING,
  SYNCHRONOUS_EVERYWHERE,
  NO_LOGGING,
  NO_TIMEOUT,
  MISSING_IDEMPOTENCY,
  // Add more as needed...
];

/**
 * Get anti-pattern by ID
 */
export function getAntiPatternById(id: string): AntiPatternDefinition | undefined {
  return ANTI_PATTERN_CATALOG.find((ap) => ap.id === id);
}

/**
 * Get anti-patterns by severity
 */
export function getAntiPatternsBySeverity(
  severity: 'low' | 'medium' | 'high' | 'critical'
): AntiPatternDefinition[] {
  return ANTI_PATTERN_CATALOG.filter((ap) => ap.severity === severity);
}

/**
 * Anti-pattern statistics
 */
export const ANTI_PATTERN_STATS = {
  total: ANTI_PATTERN_CATALOG.length,
  bySeverity: {
    critical: getAntiPatternsBySeverity('critical').length,
    high: getAntiPatternsBySeverity('high').length,
    medium: getAntiPatternsBySeverity('medium').length,
    low: getAntiPatternsBySeverity('low').length,
  },
};
