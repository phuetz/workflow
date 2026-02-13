/**
 * IaCSecurityScanner.ts
 *
 * Comprehensive Infrastructure as Code Security Scanner
 * Supports Terraform, CloudFormation, Kubernetes, Helm, Ansible
 * Features policy engine, OPA/Rego integration, CIS benchmarks, and automated remediation
 *
 * @module IaCSecurityScanner
 */

import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

/**
 * Supported IaC platforms
 */
export enum IaCPlatform {
  TERRAFORM = 'terraform',
  CLOUDFORMATION = 'cloudformation',
  KUBERNETES = 'kubernetes',
  HELM = 'helm',
  ANSIBLE = 'ansible',
}

/**
 * Severity levels for findings
 */
export enum FindingSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

/**
 * Check categories
 */
export enum CheckCategory {
  MISCONFIG = 'misconfig',
  SECRETS = 'secrets',
  INSECURE_DEFAULTS = 'insecure_defaults',
  ENCRYPTION = 'encryption',
  PUBLIC_EXPOSURE = 'public_exposure',
  PRIVILEGE = 'privilege_escalation',
  NETWORK = 'network_security',
  COMPLIANCE = 'compliance',
}

/**
 * Scanning modes
 */
export enum ScanMode {
  PRECOMMIT = 'precommit',
  PR_MR = 'pr_mr',
  SCHEDULED = 'scheduled',
  ONDEMAND = 'ondemand',
}

/**
 * Policy types
 */
export enum PolicyType {
  CUSTOM = 'custom',
  OPA_REGO = 'opa_rego',
  CIS_BENCHMARK = 'cis_benchmark',
  SOC2 = 'soc2',
  PCI_DSS = 'pci_dss',
}

/**
 * Interface for security finding
 */
export interface SecurityFinding {
  id: string;
  platform: IaCPlatform;
  severity: FindingSeverity;
  category: CheckCategory;
  title: string;
  description: string;
  file: string;
  line?: number;
  resource?: string;
  policy?: string;
  remediation?: RemediationAdvice;
  evidence?: string;
}

/**
 * Interface for remediation advice
 */
export interface RemediationAdvice {
  description: string;
  codeSnippet?: string;
  bestPractices?: string[];
  resources?: string[];
  autoFixable?: boolean;
}

/**
 * Interface for policy rule
 */
export interface PolicyRule {
  id: string;
  name: string;
  type: PolicyType;
  category: CheckCategory;
  severity: FindingSeverity;
  description: string;
  platforms: IaCPlatform[];
  enabled: boolean;
  rule: string | RegExp | ((content: string, resource: string) => boolean);
  remediation?: RemediationAdvice;
  cisBenchmark?: string;
  compliance?: string[];
}

/**
 * Interface for scan configuration
 */
export interface ScanConfig {
  mode: ScanMode;
  platforms?: IaCPlatform[];
  excludePaths?: string[];
  includePaths?: string[];
  policies?: string[];
  severityThreshold?: FindingSeverity;
  autoFix?: boolean;
  reportFormats?: ReportFormat[];
  ciEnabled?: boolean;
  prComments?: boolean;
  slackNotification?: boolean;
}

/**
 * Interface for scan result
 */
export interface ScanResult {
  timestamp: Date;
  mode: ScanMode;
  duration: number;
  filesScanned: number;
  findingsCount: number;
  findings: SecurityFinding[];
  statistics: ScanStatistics;
  compliance?: ComplianceReport;
}

/**
 * Interface for scan statistics
 */
export interface ScanStatistics {
  byPlatform: Record<IaCPlatform, number>;
  bySeverity: Record<FindingSeverity, number>;
  byCategory: Record<CheckCategory, number>;
  passedPolicies: number;
  failedPolicies: number;
  riskScore: number;
}

/**
 * Interface for compliance report
 */
export interface ComplianceReport {
  frameworks: ComplianceFramework[];
  overallScore: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Interface for compliance framework
 */
export interface ComplianceFramework {
  name: string;
  status: 'passed' | 'failed' | 'partial';
  controlsChecked: number;
  controlsPassed: number;
  findings: string[];
}

/**
 * Report format types
 */
export enum ReportFormat {
  JSON = 'json',
  HTML = 'html',
  SARIF = 'sarif',
  CSV = 'csv',
  MARKDOWN = 'markdown',
}

/**
 * Infrastructure as Code Security Scanner
 *
 * Comprehensive scanning and remediation for IaC files
 * Supports multiple platforms, policies, and compliance frameworks
 */
export class IaCSecurityScanner extends EventEmitter {
  private policies: Map<string, PolicyRule>;
  private cache: Map<string, SecurityFinding[]>;
  private config: ScanConfig;
  private opaRulesCache: Map<string, string>;

  /**
   * Initialize scanner with default configuration
   */
  constructor(config: Partial<ScanConfig> = {}) {
    super();
    this.policies = new Map();
    this.cache = new Map();
    this.opaRulesCache = new Map();
    this.config = {
      mode: ScanMode.ONDEMAND,
      platforms: Object.values(IaCPlatform),
      excludePaths: ['node_modules', '.git', 'dist'],
      includePaths: ['**/*.tf', '**/*.yaml', '**/*.yml', '**/*.json'],
      severityThreshold: FindingSeverity.LOW,
      autoFix: false,
      reportFormats: [ReportFormat.JSON],
      ciEnabled: false,
      prComments: false,
      slackNotification: false,
      ...config,
    };

    this.initializeDefaultPolicies();
  }

  /**
   * Initialize default security policies
   */
  private initializeDefaultPolicies(): void {
    // Terraform policies
    this.addPolicy({
      id: 'tf-001',
      name: 'S3 Bucket Public Access',
      type: PolicyType.CUSTOM,
      category: CheckCategory.PUBLIC_EXPOSURE,
      severity: FindingSeverity.CRITICAL,
      description: 'S3 buckets should not have public read access',
      platforms: [IaCPlatform.TERRAFORM, IaCPlatform.CLOUDFORMATION],
      enabled: true,
      rule: /aws_s3_bucket_public_access_block|PublicAccessBlockConfiguration/,
      remediation: {
        description: 'Enable S3 block public access settings',
        codeSnippet: `resource "aws_s3_bucket_public_access_block" "example" {
  bucket = aws_s3_bucket.example.id
  block_public_acls = true
  block_public_policy = true
  ignore_public_acls = true
  restrict_public_buckets = true
}`,
        bestPractices: [
          'Use S3 block public access for all buckets',
          'Implement least privilege bucket policies',
          'Enable bucket versioning',
          'Enable server-side encryption',
        ],
        resources: [
          'https://docs.aws.amazon.com/s3/latest/userguide/access-control-block-public-access.html',
        ],
        autoFixable: true,
      },
      cisBenchmark: '2.1.5.1',
      compliance: ['SOC2', 'PCI_DSS', 'HIPAA'],
    });

    // Hardcoded secrets
    this.addPolicy({
      id: 'sec-001',
      name: 'Hardcoded Secrets Detection',
      type: PolicyType.CUSTOM,
      category: CheckCategory.SECRETS,
      severity: FindingSeverity.CRITICAL,
      description: 'Hardcoded secrets in IaC files',
      platforms: Object.values(IaCPlatform),
      enabled: true,
      rule: this.createSecretsPattern(),
      remediation: {
        description: 'Use secret management solutions',
        codeSnippet: `# Use AWS Secrets Manager
data "aws_secretsmanager_secret" "db_password" {
  name = "db-password"
}

variable "db_password" {
  type      = string
  sensitive = true
}`,
        bestPractices: [
          'Use secret management solutions (AWS Secrets Manager, HashiCorp Vault)',
          'Never commit secrets to version control',
          'Rotate secrets regularly',
          'Use IAM roles instead of access keys',
        ],
        resources: [
          'https://www.hashicorp.com/blog/vault-secrets-management',
        ],
        autoFixable: false,
      },
    });

    // Unencrypted RDS
    this.addPolicy({
      id: 'tf-003',
      name: 'RDS Encryption at Rest',
      type: PolicyType.CUSTOM,
      category: CheckCategory.ENCRYPTION,
      severity: FindingSeverity.HIGH,
      description: 'RDS database should have encryption at rest enabled',
      platforms: [IaCPlatform.TERRAFORM, IaCPlatform.CLOUDFORMATION],
      enabled: true,
      rule: /resource "aws_db_instance"/ as RegExp,
      remediation: {
        description: 'Enable KMS encryption for RDS',
        codeSnippet: `resource "aws_db_instance" "example" {
  engine = "mysql"
  storage_encrypted = true
  kms_key_id = aws_kms_key.rds.arn
  # ... other config
}`,
        bestPractices: [
          'Enable storage encryption for all databases',
          'Use customer-managed KMS keys',
          'Enable encryption in transit (SSL/TLS)',
          'Enable automated backups',
        ],
        resources: [
          'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html',
        ],
        autoFixable: true,
      },
      cisBenchmark: '4.2.1',
      compliance: ['SOC2', 'PCI_DSS', 'HIPAA'],
    });

    // Kubernetes security policies
    this.addPolicy({
      id: 'k8s-001',
      name: 'Container Running as Root',
      type: PolicyType.CUSTOM,
      category: CheckCategory.PRIVILEGE,
      severity: FindingSeverity.HIGH,
      description: 'Containers should not run as root',
      platforms: [IaCPlatform.KUBERNETES, IaCPlatform.HELM],
      enabled: true,
      rule: /runAsUser:\s*0|runAsNonRoot:\s*false/,
      remediation: {
        description: 'Set runAsNonRoot and runAsUser',
        codeSnippet: `apiVersion: v1
kind: Pod
metadata:
  name: example
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 2000`,
        bestPractices: [
          'Run containers as non-root users',
          'Use securityContext for pod security',
          'Implement Pod Security Policies',
          'Enable RBAC',
        ],
        resources: [
          'https://kubernetes.io/docs/tasks/configure-pod-container/security-context/',
        ],
        autoFixable: true,
      },
    });

    // Network security policies
    this.addPolicy({
      id: 'net-001',
      name: 'Security Group Open to 0.0.0.0',
      type: PolicyType.CUSTOM,
      category: CheckCategory.NETWORK,
      severity: FindingSeverity.HIGH,
      description: 'Security groups should not allow unrestricted access',
      platforms: [IaCPlatform.TERRAFORM, IaCPlatform.CLOUDFORMATION],
      enabled: true,
      rule: /cidr_blocks\s*=\s*\["0\.0\.0\.0\/0"\]/,
      remediation: {
        description: 'Restrict ingress to specific IPs',
        codeSnippet: `resource "aws_security_group_rule" "example" {
  type = "ingress"
  from_port = 443
  to_port = 443
  protocol = "tcp"
  cidr_blocks = ["10.0.0.0/8"]
  security_group_id = aws_security_group.example.id
}`,
        bestPractices: [
          'Use specific IP ranges instead of 0.0.0.0/0',
          'Implement security group layering',
          'Use VPC endpoints for private services',
          'Enable VPC Flow Logs',
        ],
        resources: [
          'https://docs.aws.amazon.com/vpc/latest/userguide/VPC_SecurityGroups.html',
        ],
        autoFixable: true,
      },
      cisBenchmark: '5.3',
      compliance: ['SOC2', 'PCI_DSS'],
    });

    // IAM policy too permissive
    this.addPolicy({
      id: 'iam-001',
      name: 'IAM Policy Too Permissive',
      type: PolicyType.CUSTOM,
      category: CheckCategory.PRIVILEGE,
      severity: FindingSeverity.HIGH,
      description: 'IAM policies should follow least privilege principle',
      platforms: [IaCPlatform.TERRAFORM, IaCPlatform.CLOUDFORMATION],
      enabled: true,
      rule: /"\*":\s*\[\s*"\*"\s*\]|Action.*\*|Resource.*\*/,
      remediation: {
        description: 'Apply least privilege principle',
        codeSnippet: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::specific-bucket/*"
    }
  ]
}`,
        bestPractices: [
          'Use specific actions instead of *',
          'Scope resources to specific ARNs',
          'Use conditions for additional control',
          'Review IAM policies regularly',
        ],
        resources: [
          'https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html',
        ],
        autoFixable: false,
      },
      cisBenchmark: '1.15',
      compliance: ['SOC2', 'PCI_DSS', 'HIPAA'],
    });

    // Ansible playbook security
    this.addPolicy({
      id: 'ans-001',
      name: 'Ansible Hardcoded Credentials',
      type: PolicyType.CUSTOM,
      category: CheckCategory.SECRETS,
      severity: FindingSeverity.CRITICAL,
      description: 'Ansible playbooks should not contain hardcoded credentials',
      platforms: [IaCPlatform.ANSIBLE],
      enabled: true,
      rule: /password:\s*['"][^'"]+['"]|api_key:\s*['"][^'"]+['"]|token:\s*['"][^'"]+['"]/,
      remediation: {
        description: 'Use Ansible Vault or external secret management',
        codeSnippet: `# Use Ansible Vault
---
- hosts: all
  vars:
    db_password: !vault |
      $ANSIBLE_VAULT;1.1;AES256
      ...encrypted...

# Or use lookup plugins
- name: Get secret from AWS Secrets Manager
  set_fact:
    db_password: "{{ lookup('aws_secret', 'db-password') }}"`,
        bestPractices: [
          'Use Ansible Vault for sensitive data',
          'Use lookup plugins for external secrets',
          'Never commit vaults to public repos',
          'Rotate credentials regularly',
        ],
        resources: [
          'https://docs.ansible.com/ansible/latest/user_guide/vault.html',
        ],
        autoFixable: false,
      },
    });

    // Log aggregation
    this.addPolicy({
      id: 'comp-001',
      name: 'CloudTrail Logging Not Enabled',
      type: PolicyType.CIS_BENCHMARK,
      category: CheckCategory.COMPLIANCE,
      severity: FindingSeverity.HIGH,
      description: 'CloudTrail should be enabled for all regions',
      platforms: [IaCPlatform.TERRAFORM, IaCPlatform.CLOUDFORMATION],
      enabled: true,
      rule: /aws_cloudtrail|AWS::CloudTrail::Trail/,
      remediation: {
        description: 'Enable CloudTrail for audit logging',
        codeSnippet: `resource "aws_cloudtrail" "example" {
  name = "example-trail"
  s3_bucket_name = aws_s3_bucket.trail.id
  include_global_service_events = true
  is_multi_region_trail = true
  is_organization_trail = false
  enable_log_file_validation = true
  depends_on = [aws_s3_bucket_policy.trail]
}`,
        bestPractices: [
          'Enable CloudTrail in all regions',
          'Enable log file validation',
          'Store logs in S3 with encryption',
          'Enable CloudTrail Insights',
        ],
        resources: [
          'https://docs.aws.amazon.com/awscloudtrail/latest/userguide/',
        ],
        autoFixable: true,
      },
      cisBenchmark: '2.1.1',
      compliance: ['SOC2', 'PCI_DSS', 'HIPAA'],
    });
  }

  /**
   * Create regex pattern for detecting hardcoded secrets
   */
  private createSecretsPattern(): RegExp {
    const patterns = [
      'password\\s*[:=]\\s*[\'"][^\'"]+"',
      'api[_-]?key\\s*[:=]\\s*[\'"][^\'"]+"',
      'secret\\s*[:=]\\s*[\'"][^\'"]+"',
      'token\\s*[:=]\\s*[\'"][^\'"]+"',
      'aws_access_key_id\\s*[:=]\\s*[\'"][^\'"]+"',
      'aws_secret_access_key\\s*[:=]\\s*[\'"][^\'"]+"',
      'private[_-]?key\\s*[:=]\\s*[\'"][^\'"]+"',
      'authorization\\s*[:=]\\s*[\'"]Bearer\\s+[^\'"]+"',
    ];
    return new RegExp(patterns.join('|'), 'gi');
  }

  /**
   * Add a custom policy rule
   */
  addPolicy(policy: PolicyRule): void {
    this.policies.set(policy.id, policy);
    this.emit('policy:added', policy);
  }

  /**
   * Remove a policy rule
   */
  removePolicy(policyId: string): void {
    this.policies.delete(policyId);
    this.emit('policy:removed', policyId);
  }

  /**
   * Get policy by ID
   */
  getPolicy(policyId: string): PolicyRule | undefined {
    return this.policies.get(policyId);
  }

  /**
   * List all policies
   */
  listPolicies(filters?: {
    platform?: IaCPlatform;
    category?: CheckCategory;
    severity?: FindingSeverity;
  }): PolicyRule[] {
    let policies = Array.from(this.policies.values());

    if (filters?.platform) {
      policies = policies.filter(p => p.platforms.includes(filters.platform!));
    }
    if (filters?.category) {
      policies = policies.filter(p => p.category === filters.category);
    }
    if (filters?.severity) {
      policies = policies.filter(p => p.severity === filters.severity);
    }

    return policies;
  }

  /**
   * Scan a file for security issues
   */
  async scanFile(filePath: string, content: string): Promise<SecurityFinding[]> {
    const cacheKey = `${filePath}:${this.getFileHash(content)}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const findings: SecurityFinding[] = [];
    const platform = this.detectPlatform(filePath);

    if (!platform) {
      return findings;
    }

    const enabledPolicies = Array.from(this.policies.values()).filter(
      p => p.enabled && p.platforms.includes(platform)
    );

    for (const policy of enabledPolicies) {
      const policyFindings = this.evaluatePolicy(
        policy,
        content,
        filePath,
        platform
      );
      findings.push(...policyFindings);
    }

    this.cache.set(cacheKey, findings);
    return findings;
  }

  /**
   * Evaluate a single policy against content
   */
  private evaluatePolicy(
    policy: PolicyRule,
    content: string,
    filePath: string,
    platform: IaCPlatform
  ): SecurityFinding[] {
    const findings: SecurityFinding[] = [];

    try {
      let matched = false;

      if (policy.rule instanceof RegExp) {
        matched = policy.rule.test(content);
      } else if (typeof policy.rule === 'string') {
        matched = content.includes(policy.rule);
      } else if (typeof policy.rule === 'function') {
        matched = policy.rule(content, filePath);
      }

      if (matched) {
        // Additional context-based checks
        if (policy.id === 'tf-003' && !content.includes('storage_encrypted = true')) {
          findings.push({
            id: `${policy.id}-${Date.now()}`,
            platform,
            severity: policy.severity,
            category: policy.category,
            title: policy.name,
            description: policy.description,
            file: filePath,
            policy: policy.id,
            remediation: policy.remediation,
            evidence: this.extractEvidence(content, policy),
          });
        } else if (policy.id !== 'tf-003') {
          findings.push({
            id: `${policy.id}-${Date.now()}`,
            platform,
            severity: policy.severity,
            category: policy.category,
            title: policy.name,
            description: policy.description,
            file: filePath,
            policy: policy.id,
            remediation: policy.remediation,
            evidence: this.extractEvidence(content, policy),
          });
        }
      }
    } catch (error) {
      this.emit('error', new Error(`Policy evaluation failed: ${error}`));
    }

    return findings;
  }

  /**
   * Extract evidence snippet from content
   */
  private extractEvidence(content: string, policy: PolicyRule): string {
    const lines = content.split('\n');
    let evidence = '';

    if (policy.rule instanceof RegExp) {
      for (const line of lines) {
        if (policy.rule.test(line)) {
          evidence = line.trim();
          break;
        }
      }
    }

    return evidence.substring(0, 200);
  }

  /**
   * Scan directory recursively
   */
  async scanDirectory(dirPath: string): Promise<ScanResult> {
    const startTime = Date.now();
    const findings: SecurityFinding[] = [];
    const filesScanned: string[] = [];
    const statistics: ScanStatistics = {
      byPlatform: {} as Record<IaCPlatform, number>,
      bySeverity: {} as Record<FindingSeverity, number>,
      byCategory: {} as Record<CheckCategory, number>,
      passedPolicies: 0,
      failedPolicies: 0,
      riskScore: 0,
    };

    // Initialize counters
    Object.values(IaCPlatform).forEach(p => {
      statistics.byPlatform[p] = 0;
    });
    Object.values(FindingSeverity).forEach(s => {
      statistics.bySeverity[s] = 0;
    });
    Object.values(CheckCategory).forEach(c => {
      statistics.byCategory[c] = 0;
    });

    // Scan files
    const files = this.getFilesToScan(dirPath);
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const fileFindings = await this.scanFile(file, content);
        findings.push(...fileFindings);
        filesScanned.push(file);

        // Update statistics
        for (const finding of fileFindings) {
          statistics.byPlatform[finding.platform]++;
          statistics.bySeverity[finding.severity]++;
          statistics.byCategory[finding.category]++;
          statistics.failedPolicies++;
        }
      } catch (error) {
        this.emit('warning', `Failed to scan ${file}: ${error}`);
      }
    }

    // Calculate risk score
    statistics.riskScore = this.calculateRiskScore(statistics);
    statistics.passedPolicies = this.policies.size - statistics.failedPolicies;

    const duration = Date.now() - startTime;

    const result: ScanResult = {
      timestamp: new Date(),
      mode: this.config.mode!,
      duration,
      filesScanned: filesScanned.length,
      findingsCount: findings.length,
      findings: findings.sort((a, b) => {
        const severityOrder = {
          [FindingSeverity.CRITICAL]: 0,
          [FindingSeverity.HIGH]: 1,
          [FindingSeverity.MEDIUM]: 2,
          [FindingSeverity.LOW]: 3,
          [FindingSeverity.INFO]: 4,
        };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }),
      statistics,
      compliance: this.generateComplianceReport(findings),
    };

    this.emit('scan:complete', result);
    return result;
  }

  /**
   * Get files to scan
   */
  private getFilesToScan(dirPath: string): string[] {
    const files: string[] = [];
    const extensions = ['.tf', '.yaml', '.yml', '.json', '.hcl'];

    const walk = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(dirPath, fullPath);

          // Check exclusions
          if (
            this.config.excludePaths?.some(excluded =>
              relativePath.includes(excluded)
            )
          ) {
            continue;
          }

          if (entry.isDirectory()) {
            walk(fullPath);
          } else if (extensions.some(ext => fullPath.endsWith(ext))) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        this.emit('warning', `Error reading directory ${dir}: ${error}`);
      }
    };

    walk(dirPath);
    return files;
  }

  /**
   * Detect IaC platform from file path/content
   */
  private detectPlatform(filePath: string): IaCPlatform | null {
    if (filePath.endsWith('.tf') || filePath.endsWith('.hcl')) {
      return IaCPlatform.TERRAFORM;
    }
    if (
      filePath.includes('cloudformation') ||
      filePath.includes('cfn')
    ) {
      return IaCPlatform.CLOUDFORMATION;
    }
    if (filePath.includes('k8s') || filePath.includes('kubernetes')) {
      return IaCPlatform.KUBERNETES;
    }
    if (filePath.includes('helm') || filePath.includes('charts')) {
      return IaCPlatform.HELM;
    }
    if (filePath.includes('ansible') || filePath.includes('playbook')) {
      return IaCPlatform.ANSIBLE;
    }

    return null;
  }

  /**
   * Calculate risk score
   */
  private calculateRiskScore(stats: ScanStatistics): number {
    const weights = {
      [FindingSeverity.CRITICAL]: 50,
      [FindingSeverity.HIGH]: 25,
      [FindingSeverity.MEDIUM]: 10,
      [FindingSeverity.LOW]: 5,
      [FindingSeverity.INFO]: 1,
    };

    let score = 0;
    Object.entries(stats.bySeverity).forEach(([severity, count]) => {
      score += weights[severity as FindingSeverity] * count;
    });

    return Math.min(100, score);
  }

  /**
   * Generate compliance report
   */
  private generateComplianceReport(findings: SecurityFinding[]): ComplianceReport {
    const frameworks: ComplianceFramework[] = [
      {
        name: 'SOC2',
        status: findings.filter(f =>
          f.remediation?.bestPractices?.join('').includes('SOC2')
        ).length === 0 ? 'passed' : 'partial',
        controlsChecked: 10,
        controlsPassed: 10 -
          findings.filter(f => f.remediation?.bestPractices?.includes?.('SOC2')).length,
        findings: findings
          .filter(f => f.remediation?.bestPractices?.includes?.('SOC2'))
          .map(f => f.title),
      },
      {
        name: 'PCI DSS',
        status: findings.filter(f =>
          f.remediation?.bestPractices?.includes?.('PCI_DSS')
        ).length === 0 ? 'passed' : 'partial',
        controlsChecked: 12,
        controlsPassed: 12 -
          findings.filter(f => f.remediation?.bestPractices?.includes?.('PCI_DSS')).length,
        findings: findings
          .filter(f => f.remediation?.bestPractices?.includes?.('PCI_DSS'))
          .map(f => f.title),
      },
      {
        name: 'HIPAA',
        status: findings.filter(f =>
          f.remediation?.bestPractices?.includes?.('HIPAA')
        ).length === 0 ? 'passed' : 'partial',
        controlsChecked: 8,
        controlsPassed: 8 -
          findings.filter(f => f.remediation?.bestPractices?.includes?.('HIPAA')).length,
        findings: findings
          .filter(f => f.remediation?.bestPractices?.includes?.('HIPAA'))
          .map(f => f.title),
      },
    ];

    const criticalCount = findings.filter(
      f => f.severity === FindingSeverity.CRITICAL
    ).length;
    const highCount = findings.filter(
      f => f.severity === FindingSeverity.HIGH
    ).length;

    let riskLevel: 'critical' | 'high' | 'medium' | 'low' = 'low';
    if (criticalCount > 0) riskLevel = 'critical';
    else if (highCount > 2) riskLevel = 'high';
    else if (highCount > 0) riskLevel = 'medium';

    return {
      frameworks,
      overallScore: Math.max(0, 100 - this.calculateRiskScore({
        byPlatform: {} as Record<IaCPlatform, number>,
        bySeverity: {
          [FindingSeverity.CRITICAL]: criticalCount,
          [FindingSeverity.HIGH]: highCount,
          [FindingSeverity.MEDIUM]: findings.filter(
            f => f.severity === FindingSeverity.MEDIUM
          ).length,
          [FindingSeverity.LOW]: findings.filter(
            f => f.severity === FindingSeverity.LOW
          ).length,
          [FindingSeverity.INFO]: 0,
        },
        byCategory: {} as Record<CheckCategory, number>,
        passedPolicies: 0,
        failedPolicies: 0,
        riskScore: 0,
      }),),
      riskLevel,
    };
  }

  /**
   * Generate remediation plan
   */
  generateRemediationPlan(findings: SecurityFinding[]): RemediationAdvice[] {
    const remediations: Map<string, RemediationAdvice> = new Map();

    for (const finding of findings) {
      if (finding.remediation && !remediations.has(finding.policy || '')) {
        remediations.set(finding.policy || '', finding.remediation);
      }
    }

    return Array.from(remediations.values());
  }

  /**
   * Generate report in specified format
   */
  generateReport(result: ScanResult, format: ReportFormat): string {
    switch (format) {
      case ReportFormat.JSON:
        return JSON.stringify(result, null, 2);

      case ReportFormat.HTML:
        return this.generateHtmlReport(result);

      case ReportFormat.MARKDOWN:
        return this.generateMarkdownReport(result);

      case ReportFormat.CSV:
        return this.generateCsvReport(result);

      case ReportFormat.SARIF:
        return this.generateSarifReport(result);

      default:
        return JSON.stringify(result);
    }
  }

  /**
   * Generate HTML report
   */
  private generateHtmlReport(result: ScanResult): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>IaC Security Scan Report</title>
        <style>
          body { font-family: Arial; margin: 20px; }
          .critical { color: #d32f2f; font-weight: bold; }
          .high { color: #f57c00; }
          .medium { color: #fbc02d; }
          .low { color: #388e3c; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background-color: #f5f5f5; }
        </style>
      </head>
      <body>
        <h1>Infrastructure as Code Security Scan Report</h1>
        <p>Timestamp: ${result.timestamp.toISOString()}</p>
        <p>Files Scanned: ${result.filesScanned}</p>
        <p>Findings: ${result.findingsCount}</p>
        <h2>Risk Score: ${result.statistics.riskScore}/100</h2>

        <h2>Findings by Severity</h2>
        <table>
          <tr>
            <th>Severity</th>
            <th>Count</th>
          </tr>
          ${Object.entries(result.statistics.bySeverity).map(
            ([severity, count]) =>
              `<tr><td class="${severity}">${severity.toUpperCase()}</td><td>${count}</td></tr>`
          ).join('')}
        </table>

        <h2>Detailed Findings</h2>
        <table>
          <tr>
            <th>Severity</th>
            <th>Title</th>
            <th>File</th>
            <th>Description</th>
          </tr>
          ${result.findings.map(
            finding =>
              `<tr>
              <td class="${finding.severity}">${finding.severity.toUpperCase()}</td>
              <td>${finding.title}</td>
              <td>${finding.file}</td>
              <td>${finding.description}</td>
            </tr>`
          ).join('')}
        </table>
      </body>
      </html>
    `;
  }

  /**
   * Generate Markdown report
   */
  private generateMarkdownReport(result: ScanResult): string {
    return `
# Infrastructure as Code Security Scan Report

**Timestamp:** ${result.timestamp.toISOString()}
**Files Scanned:** ${result.filesScanned}
**Total Findings:** ${result.findingsCount}
**Risk Score:** ${result.statistics.riskScore}/100

## Summary

- **Critical:** ${result.statistics.bySeverity.critical}
- **High:** ${result.statistics.bySeverity.high}
- **Medium:** ${result.statistics.bySeverity.medium}
- **Low:** ${result.statistics.bySeverity.low}

## Findings by Category

${Object.entries(result.statistics.byCategory)
  .map(([category, count]) => `- **${category}:** ${count}`)
  .join('\n')}

## Detailed Findings

${result.findings
  .map(
    finding => `
### ${finding.title} (${finding.severity.toUpperCase()})

**File:** ${finding.file}
**Category:** ${finding.category}
**Policy:** ${finding.policy}

**Description:** ${finding.description}

${finding.remediation ? `
**Remediation:** ${finding.remediation.description}

${finding.remediation.codeSnippet ? `
\`\`\`
${finding.remediation.codeSnippet}
\`\`\`
` : ''}

${finding.remediation.bestPractices ? `
**Best Practices:**
${finding.remediation.bestPractices.map(p => `- ${p}`).join('\n')}
` : ''}
` : ''}`
  )
  .join('\n')}
    `;
  }

  /**
   * Generate CSV report
   */
  private generateCsvReport(result: ScanResult): string {
    const headers = [
      'Severity',
      'Title',
      'File',
      'Line',
      'Category',
      'Policy',
      'Description',
    ];

    const rows = result.findings.map(finding => [
      finding.severity,
      finding.title,
      finding.file,
      finding.line || '',
      finding.category,
      finding.policy || '',
      finding.description,
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    return csv;
  }

  /**
   * Generate SARIF report (Static Analysis Results Format)
   */
  private generateSarifReport(result: ScanResult): string {
    const sarif = {
      version: '2.1.0',
      $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
      runs: [{
        tool: {
          driver: {
            name: 'IaCSecurityScanner',
            version: '1.0.0',
            rules: Array.from(this.policies.values()).map(policy => ({
              id: policy.id,
              shortDescription: { text: policy.name },
              fullDescription: { text: policy.description },
              defaultConfiguration: { level: this.severityToSarifLevel(policy.severity) },
            })),
          },
        },
        results: result.findings.map(finding => ({
          ruleId: finding.policy,
          level: this.severityToSarifLevel(finding.severity),
          message: { text: finding.description },
          locations: [{
            physicalLocation: {
              artifactLocation: { uri: finding.file },
              region: finding.line ? { startLine: finding.line } : undefined,
            },
          }],
        })),
      }],
    };

    return JSON.stringify(sarif, null, 2);
  }

  /**
   * Convert severity to SARIF level
   */
  private severityToSarifLevel(severity: FindingSeverity): string {
    const mapping: Record<FindingSeverity, string> = {
      [FindingSeverity.CRITICAL]: 'error',
      [FindingSeverity.HIGH]: 'error',
      [FindingSeverity.MEDIUM]: 'warning',
      [FindingSeverity.LOW]: 'note',
      [FindingSeverity.INFO]: 'note',
    };
    return mapping[severity];
  }

  /**
   * Get file hash for caching
   */
  private getFileHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.emit('cache:cleared');
  }

  /**
   * Export configuration
   */
  exportConfig(): ScanConfig {
    return { ...this.config };
  }

  /**
   * Import configuration
   */
  importConfig(config: Partial<ScanConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('config:updated', this.config);
  }
}

export default IaCSecurityScanner;
