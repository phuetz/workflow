/**
 * Policy Templates - 50+ Pre-defined Governance Policies
 * Enterprise-grade policy templates across all categories
 */

import {
  Policy,
  PolicyCategory,
  PolicyAction,
  PolicySeverity,
  PolicyCondition,
} from './types/governance';

/**
 * Generate a unique policy ID
 */
function generatePolicyId(category: string, name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  return `policy_${category}_${slug}`;
}

/**
 * Create a policy template
 */
function createPolicy(
  name: string,
  description: string,
  category: PolicyCategory,
  severity: PolicySeverity,
  action: PolicyAction,
  conditions: PolicyCondition[],
  remediationSteps?: string[]
): Policy {
  return {
    id: generatePolicyId(category, name),
    name,
    description,
    category,
    severity,
    enabled: true,
    action,
    conditions,
    remediationSteps,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    version: '1.0.0',
    tags: [category],
  };
}

// ============================================================================
// Security Policies (15 policies)
// ============================================================================

export const securityPolicies: Policy[] = [
  createPolicy(
    'No PII in Public Workflows',
    'Prevent workflows containing PII from being set to public visibility',
    PolicyCategory.SECURITY,
    PolicySeverity.CRITICAL,
    PolicyAction.BLOCK,
    [
      {
        type: 'pii_detection',
        operator: 'equals',
        value: true,
      },
      {
        type: 'data_access',
        operator: 'equals',
        value: 'public',
      },
    ],
    [
      'Remove PII from workflow data',
      'Change workflow visibility to private or team',
      'Implement data masking for sensitive fields',
    ]
  ),

  createPolicy(
    'Require Encryption for Sensitive Data',
    'All confidential and restricted data must be encrypted at rest and in transit',
    PolicyCategory.SECURITY,
    PolicySeverity.CRITICAL,
    PolicyAction.BLOCK,
    [
      {
        type: 'data_access',
        operator: 'in',
        value: ['confidential', 'restricted'],
      },
    ],
    [
      'Enable encryption for data storage',
      'Use TLS/SSL for data transmission',
      'Implement field-level encryption for sensitive fields',
    ]
  ),

  createPolicy(
    'Multi-Factor Authentication Required',
    'Agents accessing critical systems must use MFA',
    PolicyCategory.SECURITY,
    PolicySeverity.HIGH,
    PolicyAction.REQUIRE_APPROVAL,
    [
      {
        type: 'user_permission',
        operator: 'contains',
        value: 'critical_system_access',
      },
    ],
    ['Enable MFA for user account', 'Configure authenticator app', 'Test MFA flow']
  ),

  createPolicy(
    'No External API Calls Without Approval',
    'External API calls from agents require security team approval',
    PolicyCategory.SECURITY,
    PolicySeverity.HIGH,
    PolicyAction.REQUIRE_APPROVAL,
    [
      {
        type: 'api_call',
        operator: 'equals',
        value: 'external',
      },
    ],
    [
      'Submit external API integration request',
      'Security team review and approval',
      'Whitelist approved API endpoints',
    ]
  ),

  createPolicy(
    'Rate Limit External Calls',
    'Limit external API calls to 100 per minute per agent',
    PolicyCategory.SECURITY,
    PolicySeverity.MEDIUM,
    PolicyAction.BLOCK,
    [
      {
        type: 'api_call',
        operator: 'greater_than',
        value: 100,
      },
    ],
    ['Implement exponential backoff', 'Batch API requests', 'Cache responses']
  ),

  createPolicy(
    'Credential Rotation Required',
    'API keys and tokens must be rotated every 90 days',
    PolicyCategory.SECURITY,
    PolicySeverity.HIGH,
    PolicyAction.WARN,
    [
      {
        type: 'custom',
        operator: 'greater_than',
        value: 90,
        metadata: { checkType: 'credential_age_days' },
      },
    ],
    ['Generate new credentials', 'Update agent configuration', 'Revoke old credentials']
  ),

  createPolicy(
    'No Hardcoded Secrets',
    'Secrets must be stored in secure credential manager, not hardcoded',
    PolicyCategory.SECURITY,
    PolicySeverity.CRITICAL,
    PolicyAction.BLOCK,
    [
      {
        type: 'custom',
        operator: 'contains',
        value: 'hardcoded_secret',
      },
    ],
    ['Move secrets to credential manager', 'Remove hardcoded values', 'Update code references']
  ),

  createPolicy(
    'Minimum TLS Version 1.2',
    'All network communications must use TLS 1.2 or higher',
    PolicyCategory.SECURITY,
    PolicySeverity.HIGH,
    PolicyAction.BLOCK,
    [
      {
        type: 'custom',
        operator: 'less_than',
        value: '1.2',
        metadata: { checkType: 'tls_version' },
      },
    ],
    ['Update TLS configuration', 'Disable legacy protocols', 'Test connectivity']
  ),

  createPolicy(
    'Session Timeout 30 Minutes',
    'Agent sessions must timeout after 30 minutes of inactivity',
    PolicyCategory.SECURITY,
    PolicySeverity.MEDIUM,
    PolicyAction.AUTO_REMEDIATE,
    [
      {
        type: 'custom',
        operator: 'greater_than',
        value: 30,
        metadata: { checkType: 'session_inactive_minutes' },
      },
    ],
    ['Configure session timeout', 'Implement activity tracking', 'Add re-authentication flow']
  ),

  createPolicy(
    'IP Whitelist for Production',
    'Production agents can only be accessed from whitelisted IP addresses',
    PolicyCategory.SECURITY,
    PolicySeverity.HIGH,
    PolicyAction.BLOCK,
    [
      {
        type: 'custom',
        operator: 'not_in',
        value: 'whitelisted_ips',
        metadata: { environment: 'production' },
      },
    ],
    ['Add IP to whitelist', 'Use VPN connection', 'Request security exception']
  ),

  createPolicy(
    'Audit All Admin Actions',
    'All administrative actions must be logged to immutable audit trail',
    PolicyCategory.SECURITY,
    PolicySeverity.CRITICAL,
    PolicyAction.AUTO_REMEDIATE,
    [
      {
        type: 'user_permission',
        operator: 'contains',
        value: 'admin',
      },
    ],
    ['Enable audit logging', 'Configure log retention', 'Set up log monitoring']
  ),

  createPolicy(
    'Data Loss Prevention',
    'Prevent sensitive data from leaving organizational boundaries',
    PolicyCategory.SECURITY,
    PolicySeverity.CRITICAL,
    PolicyAction.BLOCK,
    [
      {
        type: 'data_access',
        operator: 'in',
        value: ['confidential', 'restricted'],
      },
      {
        type: 'custom',
        operator: 'equals',
        value: 'external_destination',
      },
    ],
    ['Review data transfer request', 'Implement data masking', 'Use secure file transfer']
  ),

  createPolicy(
    'Vulnerability Scanning Required',
    'All agent code must pass vulnerability scanning before deployment',
    PolicyCategory.SECURITY,
    PolicySeverity.HIGH,
    PolicyAction.BLOCK,
    [
      {
        type: 'custom',
        operator: 'equals',
        value: 'deployment',
      },
    ],
    ['Run security scanner', 'Fix identified vulnerabilities', 'Re-scan and verify']
  ),

  createPolicy(
    'Least Privilege Access',
    'Agents must operate with minimum required permissions',
    PolicyCategory.SECURITY,
    PolicySeverity.MEDIUM,
    PolicyAction.WARN,
    [
      {
        type: 'user_permission',
        operator: 'greater_than',
        value: 'minimum_required',
      },
    ],
    ['Review current permissions', 'Remove unnecessary permissions', 'Test with reduced permissions']
  ),

  createPolicy(
    'Disable Default Credentials',
    'Default usernames and passwords must be changed before deployment',
    PolicyCategory.SECURITY,
    PolicySeverity.CRITICAL,
    PolicyAction.BLOCK,
    [
      {
        type: 'custom',
        operator: 'equals',
        value: 'default_credentials',
      },
    ],
    ['Generate strong credentials', 'Update configuration', 'Test authentication']
  ),
];

// ============================================================================
// Compliance Policies (12 policies)
// ============================================================================

export const compliancePolicies: Policy[] = [
  createPolicy(
    'GDPR Data Residency',
    'EU citizen data must be stored in EU data centers',
    PolicyCategory.COMPLIANCE,
    PolicySeverity.CRITICAL,
    PolicyAction.BLOCK,
    [
      {
        type: 'data_residency',
        operator: 'not_in',
        value: ['EU', 'UK'],
        metadata: { gdpr_applicable: true },
      },
    ],
    ['Configure EU data center', 'Migrate existing data', 'Update data routing']
  ),

  createPolicy(
    'Approval Required for Data Deletion',
    'Permanent data deletion requires manager approval (GDPR Article 17)',
    PolicyCategory.COMPLIANCE,
    PolicySeverity.HIGH,
    PolicyAction.REQUIRE_APPROVAL,
    [
      {
        type: 'data_access',
        operator: 'equals',
        value: 'delete',
      },
    ],
    ['Submit deletion request', 'Manager review and approval', 'Verify data removal']
  ),

  createPolicy(
    'HIPAA Minimum Necessary',
    'Healthcare data access must be limited to minimum necessary (HIPAA)',
    PolicyCategory.COMPLIANCE,
    PolicySeverity.CRITICAL,
    PolicyAction.BLOCK,
    [
      {
        type: 'custom',
        operator: 'equals',
        value: 'healthcare_data',
      },
    ],
    ['Define minimum data set', 'Implement field-level access control', 'Audit data access']
  ),

  createPolicy(
    'SOC2 Encryption at Rest',
    'All data at rest must be encrypted (SOC2 CC6.7)',
    PolicyCategory.COMPLIANCE,
    PolicySeverity.CRITICAL,
    PolicyAction.BLOCK,
    [
      {
        type: 'compliance_framework',
        operator: 'equals',
        value: 'SOC2',
      },
    ],
    ['Enable database encryption', 'Configure storage encryption', 'Verify encryption status']
  ),

  createPolicy(
    'Data Retention 7 Years',
    'Financial records must be retained for 7 years (SOX compliance)',
    PolicyCategory.COMPLIANCE,
    PolicySeverity.HIGH,
    PolicyAction.AUTO_REMEDIATE,
    [
      {
        type: 'custom',
        operator: 'equals',
        value: 'financial_record',
      },
    ],
    ['Configure retention policy', 'Set up automated archival', 'Prevent premature deletion']
  ),

  createPolicy(
    'PCI DSS Cardholder Data',
    'Credit card data must meet PCI DSS requirements',
    PolicyCategory.COMPLIANCE,
    PolicySeverity.CRITICAL,
    PolicyAction.BLOCK,
    [
      {
        type: 'pii_detection',
        operator: 'contains',
        value: 'credit_card',
      },
    ],
    ['Implement PCI DSS controls', 'Use tokenization', 'Complete PCI audit']
  ),

  createPolicy(
    'CCPA Right to Access',
    'Users must be able to access their data within 45 days (CCPA)',
    PolicyCategory.COMPLIANCE,
    PolicySeverity.HIGH,
    PolicyAction.REQUIRE_APPROVAL,
    [
      {
        type: 'custom',
        operator: 'equals',
        value: 'data_access_request',
        metadata: { framework: 'CCPA' },
      },
    ],
    ['Verify user identity', 'Compile user data', 'Deliver data within 45 days']
  ),

  createPolicy(
    'ISO 27001 Access Control',
    'Implement role-based access control (ISO 27001 A.9.2)',
    PolicyCategory.COMPLIANCE,
    PolicySeverity.HIGH,
    PolicyAction.BLOCK,
    [
      {
        type: 'compliance_framework',
        operator: 'equals',
        value: 'ISO27001',
      },
    ],
    ['Define user roles', 'Assign permissions by role', 'Review access quarterly']
  ),

  createPolicy(
    'Audit Log Immutability',
    'Audit logs must be tamper-proof and immutable',
    PolicyCategory.COMPLIANCE,
    PolicySeverity.CRITICAL,
    PolicyAction.AUTO_REMEDIATE,
    [
      {
        type: 'custom',
        operator: 'equals',
        value: 'audit_log',
      },
    ],
    ['Enable write-once storage', 'Implement cryptographic hashing', 'Set up integrity verification']
  ),

  createPolicy(
    'Business Continuity Testing',
    'Disaster recovery plans must be tested quarterly',
    PolicyCategory.COMPLIANCE,
    PolicySeverity.MEDIUM,
    PolicyAction.WARN,
    [
      {
        type: 'custom',
        operator: 'greater_than',
        value: 90,
        metadata: { checkType: 'days_since_dr_test' },
      },
    ],
    ['Schedule DR test', 'Execute test plan', 'Document results and improvements']
  ),

  createPolicy(
    'Third-Party Risk Assessment',
    'All third-party integrations require security assessment',
    PolicyCategory.COMPLIANCE,
    PolicySeverity.HIGH,
    PolicyAction.REQUIRE_APPROVAL,
    [
      {
        type: 'api_call',
        operator: 'equals',
        value: 'third_party',
      },
    ],
    ['Complete vendor questionnaire', 'Security team review', 'Sign data processing agreement']
  ),

  createPolicy(
    'Privacy Impact Assessment',
    'High-risk data processing requires privacy impact assessment',
    PolicyCategory.COMPLIANCE,
    PolicySeverity.HIGH,
    PolicyAction.REQUIRE_APPROVAL,
    [
      {
        type: 'data_access',
        operator: 'in',
        value: ['confidential', 'restricted'],
      },
      {
        type: 'custom',
        operator: 'equals',
        value: 'high_risk_processing',
      },
    ],
    ['Conduct PIA', 'Document findings', 'Implement risk mitigation measures']
  ),
];

// ============================================================================
// Performance Policies (10 policies)
// ============================================================================

export const performancePolicies: Policy[] = [
  createPolicy(
    'Max Execution Time 5 Minutes',
    'Agent tasks must complete within 5 minutes',
    PolicyCategory.PERFORMANCE,
    PolicySeverity.MEDIUM,
    PolicyAction.WARN,
    [
      {
        type: 'execution_time',
        operator: 'greater_than',
        value: 300000, // 5 minutes in ms
      },
    ],
    ['Optimize query performance', 'Implement caching', 'Consider async processing']
  ),

  createPolicy(
    'Max API Calls 100/Second',
    'Limit API calls to prevent rate limiting and performance degradation',
    PolicyCategory.PERFORMANCE,
    PolicySeverity.MEDIUM,
    PolicyAction.BLOCK,
    [
      {
        type: 'resource_usage',
        operator: 'greater_than',
        value: 100,
        metadata: { metric: 'api_calls_per_second' },
      },
    ],
    ['Implement request batching', 'Add rate limiting', 'Use connection pooling']
  ),

  createPolicy(
    'Memory Limit 2GB',
    'Agent memory usage must not exceed 2GB',
    PolicyCategory.PERFORMANCE,
    PolicySeverity.HIGH,
    PolicyAction.BLOCK,
    [
      {
        type: 'resource_usage',
        operator: 'greater_than',
        value: 2048,
        metadata: { metric: 'memory_mb' },
      },
    ],
    ['Optimize data structures', 'Implement pagination', 'Clear unused references']
  ),

  createPolicy(
    'Database Query Timeout 30s',
    'Database queries must complete within 30 seconds',
    PolicyCategory.PERFORMANCE,
    PolicySeverity.MEDIUM,
    PolicyAction.WARN,
    [
      {
        type: 'custom',
        operator: 'greater_than',
        value: 30000,
        metadata: { checkType: 'db_query_time_ms' },
      },
    ],
    ['Add database indexes', 'Optimize query', 'Implement query caching']
  ),

  createPolicy(
    'Concurrent Executions Limit 50',
    'Maximum 50 concurrent agent executions per team',
    PolicyCategory.PERFORMANCE,
    PolicySeverity.MEDIUM,
    PolicyAction.BLOCK,
    [
      {
        type: 'resource_usage',
        operator: 'greater_than',
        value: 50,
        metadata: { metric: 'concurrent_executions' },
      },
    ],
    ['Implement execution queue', 'Stagger execution times', 'Increase resource allocation']
  ),

  createPolicy(
    'Cache Hit Ratio > 80%',
    'Maintain cache hit ratio above 80% for optimal performance',
    PolicyCategory.PERFORMANCE,
    PolicySeverity.LOW,
    PolicyAction.WARN,
    [
      {
        type: 'custom',
        operator: 'less_than',
        value: 0.8,
        metadata: { metric: 'cache_hit_ratio' },
      },
    ],
    ['Review cache configuration', 'Increase cache size', 'Optimize cache key strategy']
  ),

  createPolicy(
    'Response Time SLA 2s',
    'API response times must be under 2 seconds (95th percentile)',
    PolicyCategory.PERFORMANCE,
    PolicySeverity.MEDIUM,
    PolicyAction.WARN,
    [
      {
        type: 'custom',
        operator: 'greater_than',
        value: 2000,
        metadata: { metric: 'response_time_p95_ms' },
      },
    ],
    ['Profile slow endpoints', 'Optimize hot paths', 'Add performance monitoring']
  ),

  createPolicy(
    'Max Payload Size 10MB',
    'Request/response payloads must not exceed 10MB',
    PolicyCategory.PERFORMANCE,
    PolicySeverity.MEDIUM,
    PolicyAction.BLOCK,
    [
      {
        type: 'custom',
        operator: 'greater_than',
        value: 10485760,
        metadata: { metric: 'payload_size_bytes' },
      },
    ],
    ['Implement compression', 'Use pagination', 'Store large files externally']
  ),

  createPolicy(
    'Error Rate < 1%',
    'Agent error rate must be below 1%',
    PolicyCategory.PERFORMANCE,
    PolicySeverity.HIGH,
    PolicyAction.WARN,
    [
      {
        type: 'custom',
        operator: 'greater_than',
        value: 0.01,
        metadata: { metric: 'error_rate' },
      },
    ],
    ['Investigate error patterns', 'Improve error handling', 'Add retry logic']
  ),

  createPolicy(
    'Connection Pool Size 20',
    'Database connection pools limited to 20 connections',
    PolicyCategory.PERFORMANCE,
    PolicySeverity.MEDIUM,
    PolicyAction.WARN,
    [
      {
        type: 'custom',
        operator: 'greater_than',
        value: 20,
        metadata: { metric: 'db_connections' },
      },
    ],
    ['Review connection usage', 'Implement connection reuse', 'Tune pool settings']
  ),
];

// ============================================================================
// Cost Policies (8 policies)
// ============================================================================

export const costPolicies: Policy[] = [
  createPolicy(
    'Max Cost $100 Per Run',
    'Individual workflow execution cost must not exceed $100',
    PolicyCategory.COST,
    PolicySeverity.HIGH,
    PolicyAction.BLOCK,
    [
      {
        type: 'cost_threshold',
        operator: 'greater_than',
        value: 100,
      },
    ],
    ['Optimize resource usage', 'Review API call costs', 'Implement cost monitoring']
  ),

  createPolicy(
    'Alert on $50+ Spend',
    'Send alert when execution cost exceeds $50',
    PolicyCategory.COST,
    PolicySeverity.MEDIUM,
    PolicyAction.WARN,
    [
      {
        type: 'cost_threshold',
        operator: 'greater_than',
        value: 50,
      },
    ],
    ['Review cost breakdown', 'Identify expensive operations', 'Consider cost optimization']
  ),

  createPolicy(
    'Monthly Budget $10,000',
    'Team monthly spending must not exceed $10,000',
    PolicyCategory.COST,
    PolicySeverity.HIGH,
    PolicyAction.REQUIRE_APPROVAL,
    [
      {
        type: 'custom',
        operator: 'greater_than',
        value: 10000,
        metadata: { metric: 'monthly_spend' },
      },
    ],
    ['Request budget increase', 'Optimize existing workflows', 'Pause non-critical agents']
  ),

  createPolicy(
    'Idle Resource Cleanup',
    'Automatically cleanup resources idle for 24 hours',
    PolicyCategory.COST,
    PolicySeverity.LOW,
    PolicyAction.AUTO_REMEDIATE,
    [
      {
        type: 'custom',
        operator: 'greater_than',
        value: 24,
        metadata: { metric: 'idle_hours' },
      },
    ],
    ['Review idle resources', 'Confirm no longer needed', 'Deallocate resources']
  ),

  createPolicy(
    'Use Spot Instances for Dev',
    'Development environments must use cost-optimized compute',
    PolicyCategory.COST,
    PolicySeverity.LOW,
    PolicyAction.WARN,
    [
      {
        type: 'custom',
        operator: 'equals',
        value: 'on_demand',
        metadata: { environment: 'development' },
      },
    ],
    ['Switch to spot instances', 'Configure auto-scaling', 'Implement graceful interruption handling']
  ),

  createPolicy(
    'Data Transfer Monitoring',
    'Monitor and limit cross-region data transfer costs',
    PolicyCategory.COST,
    PolicySeverity.MEDIUM,
    PolicyAction.WARN,
    [
      {
        type: 'custom',
        operator: 'greater_than',
        value: 1000,
        metadata: { metric: 'cross_region_transfer_gb' },
      },
    ],
    ['Use regional data caching', 'Optimize data locality', 'Review architecture']
  ),

  createPolicy(
    'Storage Lifecycle Policies',
    'Implement tiered storage to reduce costs',
    PolicyCategory.COST,
    PolicySeverity.LOW,
    PolicyAction.AUTO_REMEDIATE,
    [
      {
        type: 'custom',
        operator: 'greater_than',
        value: 90,
        metadata: { metric: 'data_age_days' },
      },
    ],
    ['Configure lifecycle rules', 'Move to cold storage', 'Archive old data']
  ),

  createPolicy(
    'API Call Cost Optimization',
    'Monitor expensive API calls and optimize usage',
    PolicyCategory.COST,
    PolicySeverity.MEDIUM,
    PolicyAction.WARN,
    [
      {
        type: 'custom',
        operator: 'greater_than',
        value: 1000,
        metadata: { metric: 'api_calls_per_day' },
      },
    ],
    ['Implement response caching', 'Batch API requests', 'Review usage patterns']
  ),
];

// ============================================================================
// Ethical AI Policies (5 policies)
// ============================================================================

export const ethicalAIPolicies: Policy[] = [
  createPolicy(
    'No Bias in Decision-Making',
    'AI agents must not discriminate based on protected characteristics',
    PolicyCategory.ETHICAL_AI,
    PolicySeverity.CRITICAL,
    PolicyAction.BLOCK,
    [
      {
        type: 'custom',
        operator: 'equals',
        value: 'bias_detected',
      },
    ],
    ['Review decision logic', 'Implement bias testing', 'Use fairness metrics']
  ),

  createPolicy(
    'Human in Loop for High-Risk',
    'High-risk decisions require human review and approval',
    PolicyCategory.ETHICAL_AI,
    PolicySeverity.CRITICAL,
    PolicyAction.REQUIRE_APPROVAL,
    [
      {
        type: 'custom',
        operator: 'in',
        value: ['hiring', 'lending', 'healthcare', 'legal'],
      },
    ],
    ['Configure approval workflow', 'Train reviewers', 'Document decision rationale']
  ),

  createPolicy(
    'Explainable AI Required',
    'AI decisions must be explainable and auditable',
    PolicyCategory.ETHICAL_AI,
    PolicySeverity.HIGH,
    PolicyAction.REQUIRE_APPROVAL,
    [
      {
        type: 'custom',
        operator: 'equals',
        value: 'black_box_model',
      },
    ],
    ['Implement model interpretability', 'Generate explanation reports', 'Document decision factors']
  ),

  createPolicy(
    'Data Diversity Requirements',
    'Training data must be diverse and representative',
    PolicyCategory.ETHICAL_AI,
    PolicySeverity.HIGH,
    PolicyAction.WARN,
    [
      {
        type: 'custom',
        operator: 'less_than',
        value: 0.7,
        metadata: { metric: 'dataset_diversity_score' },
      },
    ],
    ['Audit training data', 'Add underrepresented samples', 'Re-train model']
  ),

  createPolicy(
    'Transparency in AI Usage',
    'Users must be informed when interacting with AI agents',
    PolicyCategory.ETHICAL_AI,
    PolicySeverity.MEDIUM,
    PolicyAction.REQUIRE_APPROVAL,
    [
      {
        type: 'custom',
        operator: 'equals',
        value: 'user_facing',
      },
    ],
    ['Add AI disclosure', 'Provide opt-out mechanism', 'Document AI capabilities']
  ),
];

// ============================================================================
// Export All Policy Templates
// ============================================================================

/**
 * Get all policy templates (50+ total)
 */
export function getAllPolicyTemplates(): Policy[] {
  return [
    ...securityPolicies,
    ...compliancePolicies,
    ...performancePolicies,
    ...costPolicies,
    ...ethicalAIPolicies,
  ];
}

/**
 * Get policies by category
 */
export function getPoliciesByCategory(category: PolicyCategory): Policy[] {
  return getAllPolicyTemplates().filter(p => p.category === category);
}

/**
 * Get policies by severity
 */
export function getPoliciesBySeverity(severity: PolicySeverity): Policy[] {
  return getAllPolicyTemplates().filter(p => p.severity === severity);
}

/**
 * Get critical policies
 */
export function getCriticalPolicies(): Policy[] {
  return getPoliciesBySeverity(PolicySeverity.CRITICAL);
}

/**
 * Get enabled policies
 */
export function getEnabledPolicies(): Policy[] {
  return getAllPolicyTemplates().filter(p => p.enabled);
}

/**
 * Policy statistics
 */
export function getPolicyStatistics() {
  const all = getAllPolicyTemplates();

  return {
    total: all.length,
    byCategory: {
      security: securityPolicies.length,
      compliance: compliancePolicies.length,
      performance: performancePolicies.length,
      cost: costPolicies.length,
      ethical_ai: ethicalAIPolicies.length,
    },
    bySeverity: {
      critical: all.filter(p => p.severity === PolicySeverity.CRITICAL).length,
      high: all.filter(p => p.severity === PolicySeverity.HIGH).length,
      medium: all.filter(p => p.severity === PolicySeverity.MEDIUM).length,
      low: all.filter(p => p.severity === PolicySeverity.LOW).length,
    },
    byAction: {
      allow: all.filter(p => p.action === PolicyAction.ALLOW).length,
      warn: all.filter(p => p.action === PolicyAction.WARN).length,
      block: all.filter(p => p.action === PolicyAction.BLOCK).length,
      require_approval: all.filter(p => p.action === PolicyAction.REQUIRE_APPROVAL).length,
      auto_remediate: all.filter(p => p.action === PolicyAction.AUTO_REMEDIATE).length,
    },
  };
}
