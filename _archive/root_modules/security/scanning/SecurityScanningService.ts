/**
 * Security Scanning Service
 * Vulnerability scanning, dependency checking, and security assessments
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';

export interface VulnerabilityReport {
  id: string;
  timestamp: Date;
  scanType: ScanType;
  target: string;
  status: ScanStatus;
  vulnerabilities: Vulnerability[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    total: number;
  };
  scanDuration: number;
  metadata: Record<string, unknown>;
}

export enum ScanType {
  DEPENDENCY = 'dependency',
  CODE = 'code',
  CONTAINER = 'container',
  INFRASTRUCTURE = 'infrastructure',
  WEB = 'web',
  API = 'api',
  NETWORK = 'network',
  COMPLIANCE = 'compliance'
}

export enum ScanStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface Vulnerability {
  id: string;
  title: string;
  description: string;
  severity: VulnerabilitySeverity;
  cvssScore?: number;
  cveId?: string;
  category: VulnerabilityCategory;
  location: {
    file?: string;
    line?: number;
    component?: string;
    url?: string;
  };
  impact: string;
  remediation: {
    description: string;
    references: string[];
    fixAvailable: boolean;
    fixVersion?: string;
  };
  metadata: Record<string, unknown>;
}

export enum VulnerabilitySeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info'
}

export enum VulnerabilityCategory {
  INJECTION = 'injection',
  AUTHENTICATION = 'authentication',
  SENSITIVE_DATA = 'sensitive_data',
  XSS = 'xss',
  ACCESS_CONTROL = 'access_control',
  MISCONFIGURATION = 'misconfiguration',
  KNOWN_VULNERABILITIES = 'known_vulnerabilities',
  LOGGING_MONITORING = 'logging_monitoring',
  DESERIALIZATION = 'deserialization',
  COMPONENTS = 'components'
}

export interface ScanConfig {
  type: ScanType;
  target: string;
  options: {
    recursive?: boolean;
    includePatterns?: string[];
    excludePatterns?: string[];
    severityThreshold?: VulnerabilitySeverity;
    timeout?: number;
    concurrent?: boolean;
    authentication?: {
      type: 'none' | 'basic' | 'bearer' | 'api_key';
      credentials?: Record<string, string>;
    };
  };
}

export interface ScanRule {
  id: string;
  name: string;
  description: string;
  category: VulnerabilityCategory;
  severity: VulnerabilitySeverity;
  pattern: RegExp | string;
  fileTypes: string[];
  enabled: boolean;
  customRule: boolean;
  metadata: Record<string, unknown>;
}

export interface DependencyInfo {
  name: string;
  version: string;
  type: 'direct' | 'transitive';
  path: string[];
  license?: string;
  vulnerabilities: Vulnerability[];
}

export interface CodeIssue {
  file: string;
  line: number;
  column: number;
  rule: string;
  severity: VulnerabilitySeverity;
  message: string;
  code: string;
  fixSuggestion?: string;
}

export class SecurityScanningService extends EventEmitter {
  private reports: Map<string, VulnerabilityReport> = new Map();
  private scanRules: Map<string, ScanRule> = new Map();
  private activescans: Map<string, AbortController> = new Map();
  private vulnerabilityDatabase: Map<string, unknown> = new Map();
  
  constructor() {
    super();
    this.initializeScanRules();
    this.loadVulnerabilityDatabase();
  }
  
  private initializeScanRules(): void {
    const defaultRules: Omit<ScanRule, 'id'>[] = [
      {
        name: 'Hardcoded Secrets',
        description: 'Detect hardcoded passwords, API keys, and secrets',
        category: VulnerabilityCategory.SENSITIVE_DATA,
        severity: VulnerabilitySeverity.HIGH,
        pattern: /(password|secret|key|token)\s*[:=]\s*['"]\w+['"]|[a-zA-Z0-9]{32,}/gi,
        fileTypes: ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.php'],
        enabled: true,
        customRule: false,
        metadata: {}
      },
      {
        name: 'SQL Injection',
        description: 'Detect potential SQL injection vulnerabilities',
        category: VulnerabilityCategory.INJECTION,
        severity: VulnerabilitySeverity.HIGH,
        pattern: /query\s*\+\s*|execute\s*\(\s*["']\s*\+|sql.*\+.*\+/gi,
        fileTypes: ['.js', '.ts', '.py', '.php', '.java'],
        enabled: true,
        customRule: false,
        metadata: {}
      },
      {
        name: 'Cross-Site Scripting (XSS)',
        description: 'Detect potential XSS vulnerabilities',
        category: VulnerabilityCategory.XSS,
        severity: VulnerabilitySeverity.MEDIUM,
        pattern: /innerHTML\s*=|document\.write\s*\(|eval\s*\(/gi,
        fileTypes: ['.js', '.ts', '.jsx', '.tsx'],
        enabled: true,
        customRule: false,
        metadata: {}
      },
      {
        name: 'Weak Cryptography',
        description: 'Detect use of weak cryptographic algorithms',
        category: VulnerabilityCategory.MISCONFIGURATION,
        severity: VulnerabilitySeverity.MEDIUM,
        pattern: /md5|sha1|des\b|rc4/gi,
        fileTypes: ['.js', '.ts', '.py', '.java', '.php'],
        enabled: true,
        customRule: false,
        metadata: {}
      },
      {
        name: 'Debug Code',
        description: 'Detect debug code that should not be in production',
        category: VulnerabilityCategory.MISCONFIGURATION,
        severity: VulnerabilitySeverity.LOW,
        pattern: /console\.log|debugger|TODO|FIXME/gi,
        fileTypes: ['.js', '.ts', '.jsx', '.tsx'],
        enabled: true,
        customRule: false,
        metadata: {}
      },
      {
        name: 'Insecure Random',
        description: 'Detect use of insecure random number generation',
        category: VulnerabilityCategory.MISCONFIGURATION,
        severity: VulnerabilitySeverity.MEDIUM,
        pattern: /Math\.random\(\)/gi,
        fileTypes: ['.js', '.ts'],
        enabled: true,
        customRule: false,
        metadata: {}
      }
    ];
    
    for (const ruleData of defaultRules) {
      const rule: ScanRule = {
        ...ruleData,
        id: crypto.randomUUID()
      };
      this.scanRules.set(rule.id, rule);
    }
  }
  
  private loadVulnerabilityDatabase(): void {
    // Load known vulnerabilities (would typically come from external databases)
    const knownVulnerabilities = [
      {
        package: 'lodash',
        versions: ['<4.17.12'],
        cve: 'CVE-2019-10744',
        severity: 'high',
        description: 'Prototype pollution vulnerability'
      },
      {
        package: 'axios',
        versions: ['<0.21.1'],
        cve: 'CVE-2020-28168',
        severity: 'medium',
        description: 'Server-side request forgery vulnerability'
      },
      {
        package: 'node-fetch',
        versions: ['<2.6.1'],
        cve: 'CVE-2020-15168',
        severity: 'medium',
        description: 'Request smuggling vulnerability'
      }
    ];
    
    for (const vuln of knownVulnerabilities) {
      this.vulnerabilityDatabase.set(`${vuln.package}:${vuln.cve}`, vuln);
    }
  }
  
  // Scanning Methods
  
  public async startScan(config: ScanConfig): Promise<string> {
    const scanId = crypto.randomUUID();
    const abortController = new AbortController();
    
    this.activescans.set(scanId, abortController);
    
    const report: VulnerabilityReport = {
      id: scanId,
      timestamp: new Date(),
      scanType: config.type,
      target: config.target,
      status: ScanStatus.PENDING,
      vulnerabilities: [],
      summary: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
        total: 0
      },
      scanDuration: 0,
      metadata: { config }
    };
    
    this.reports.set(scanId, report);
    
    // Start scan asynchronously
    this.performScan(scanId, config, abortController.signal).catch(error => {
      report.status = ScanStatus.FAILED;
      report.metadata.error = error.message;
      this.emit('scanFailed', { scanId, error: error.message });
    });
    
    this.emit('scanStarted', { scanId, config });
    
    return scanId;
  }
  
  private async performScan(
    scanId: string,
    config: ScanConfig,
    signal: AbortSignal
  ): Promise<void> {
    const startTime = Date.now();
    const report = this.reports.get(scanId)!;
    
    report.status = ScanStatus.RUNNING;
    this.emit('scanProgress', { scanId, status: 'running' });
    
    try {
      let vulnerabilities: Vulnerability[] = [];
      
      switch (config.type) {
        case ScanType.DEPENDENCY:
          vulnerabilities = await this.scanDependencies(config, signal);
          break;
        case ScanType.CODE:
          vulnerabilities = await this.scanCode(config, signal);
          break;
        case ScanType.CONTAINER:
          vulnerabilities = await this.scanContainer(config, signal);
          break;
        case ScanType.WEB:
          vulnerabilities = await this.scanWeb(config, signal);
          break;
        case ScanType.API:
          vulnerabilities = await this.scanAPI(config, signal);
          break;
        case ScanType.NETWORK:
          vulnerabilities = await this.scanNetwork(config, signal);
          break;
        case ScanType.COMPLIANCE:
          vulnerabilities = await this.scanCompliance(config, signal);
          break;
        default:
          throw new Error(`Unsupported scan type: ${config.type}`);
      }
      
      if (signal.aborted) {
        report.status = ScanStatus.CANCELLED;
        return;
      }
      
      // Filter by severity threshold if specified
      if (config.options.severityThreshold) {
        const severityLevels = ['info', 'low', 'medium', 'high', 'critical'];
        const thresholdIndex = severityLevels.indexOf(config.options.severityThreshold);
        vulnerabilities = vulnerabilities.filter(v => 
          severityLevels.indexOf(v.severity) >= thresholdIndex
        );
      }
      
      report.vulnerabilities = vulnerabilities;
      report.summary = this.calculateSummary(vulnerabilities);
      report.scanDuration = Date.now() - startTime;
      report.status = ScanStatus.COMPLETED;
      
      this.emit('scanCompleted', { 
        scanId, 
        vulnerabilities: vulnerabilities.length,
        summary: report.summary 
      });
      
    } catch (error) {
      if (signal.aborted) {
        report.status = ScanStatus.CANCELLED;
      } else {
        throw error;
      }
    } finally {
      this.activescans.delete(scanId);
    }
  }
  
  private async scanDependencies(config: ScanConfig, signal: AbortSignal): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];
    
    try {
      // Read package.json or equivalent
      const packageJsonPath = path.join(config.target, 'package.json');
      
      if (!fs.existsSync(packageJsonPath)) {
        throw new Error('package.json not found');
      }
      
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const dependencies = {
        ...packageJson.dependencies || {},
        ...packageJson.devDependencies || {}
      };
      
      // Check each dependency against vulnerability database
      for (const [name, version] of Object.entries(dependencies)) {
        if (signal.aborted) break;
        
        const vulns = await this.checkPackageVulnerabilities(name, version as string);
        vulnerabilities.push(...vulns);
      }
      
      // Check for outdated packages
      const outdatedVulns = await this.checkOutdatedPackages(dependencies);
      vulnerabilities.push(...outdatedVulns);
      
    } catch (error) {
      console.error('Dependency scan error:', error);
    }
    
    return vulnerabilities;
  }
  
  private async checkPackageVulnerabilities(name: string, version: string): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];
    
    // Check against local vulnerability database
    for (const [key, vuln] of this.vulnerabilityDatabase.entries()) {
      if (key.startsWith(`${name}:`)) {
        // Simple version matching (in production, would use semver)
        if (this.versionMatches(version, vuln.versions)) {
          vulnerabilities.push({
            id: crypto.randomUUID(),
            title: `${name} - ${vuln.description}`,
            description: vuln.description,
            severity: vuln.severity as VulnerabilitySeverity,
            cveId: vuln.cve,
            category: VulnerabilityCategory.KNOWN_VULNERABILITIES,
            location: {
              component: `${name}@${version}`
            },
            impact: `Vulnerable version of ${name}`,
            remediation: {
              description: `Update ${name} to a safe version`,
              references: [`https://cve.mitre.org/cgi-bin/cvename.cgi?name=${vuln.cve}`],
              fixAvailable: true,
              fixVersion: 'latest'
            },
            metadata: { package: name, version, cve: vuln.cve }
          });
        }
      }
    }
    
    return vulnerabilities;
  }
  
  private versionMatches(version: string, patterns: string[]): boolean {
    // Simplified version matching - in production would use semver
    for (const pattern of patterns) {
      if (pattern.startsWith('<') && pattern.length > 1) {
        const targetVersion = pattern.substring(1);
        return this.compareVersions(version, targetVersion) < 0;
      }
    }
    return false;
  }
  
  private compareVersions(v1: string, v2: string): number {
    // Simplified version comparison
    const parts1 = v1.replace(/[^\d.]/g, '').split('.').map(Number);
    const parts2 = v2.replace(/[^\d.]/g, '').split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const a = parts1[i] || 0;
      const b = parts2[i] || 0;
      if (a !== b) return a - b;
    }
    return 0;
  }
  
  private async checkOutdatedPackages(dependencies: Record<string, string>): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];
    
    // Simulate checking for outdated packages
    for (const [name, version] of Object.entries(dependencies)) {
      // In production, would check npm registry for latest versions
      const isOutdated = Math.random() > 0.8; // Simulate 20% outdated
      
      if (isOutdated) {
        vulnerabilities.push({
          id: crypto.randomUUID(),
          title: `Outdated Package: ${name}`,
          description: `Package ${name} is outdated and may contain known vulnerabilities`,
          severity: VulnerabilitySeverity.LOW,
          category: VulnerabilityCategory.COMPONENTS,
          location: {
            component: `${name}@${version}`
          },
          impact: 'May contain known security vulnerabilities',
          remediation: {
            description: `Update ${name} to the latest version`,
            references: [`https://www.npmjs.com/package/${name}`],
            fixAvailable: true,
            fixVersion: 'latest'
          },
          metadata: { package: name, currentVersion: version }
        });
      }
    }
    
    return vulnerabilities;
  }
  
  private async scanCode(config: ScanConfig, signal: AbortSignal): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];
    
    try {
      const files = await this.findFilesToScan(config.target, config.options);
      
      for (const file of files) {
        if (signal.aborted) break;
        
        const fileVulns = await this.scanFile(file);
        vulnerabilities.push(...fileVulns);
      }
      
    } catch (error) {
      console.error('Code scan error:', error);
    }
    
    return vulnerabilities;
  }
  
  private async findFilesToScan(target: string, options: ScanConfig['options']): Promise<string[]> {
    const files: string[] = [];
    
    const walkDir = (dir: string) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (options.recursive !== false) {
            // Skip node_modules and other common directories
            if (!['node_modules', '.git', 'dist', 'build'].includes(item)) {
              walkDir(fullPath);
            }
          }
        } else {
          const ext = path.extname(fullPath);
          
          // Check include/exclude patterns
          if (options.includePatterns && 
              !options.includePatterns.some(pattern => fullPath.includes(pattern))) {
            continue;
          }
          
          if (options.excludePatterns && 
              options.excludePatterns.some(pattern => fullPath.includes(pattern))) {
            continue;
          }
          
          // Check file types supported by rules
          const supportedExts = new Set<string>();
          for (const rule of this.scanRules.values()) {
            if (rule.enabled) {
              rule.fileTypes.forEach(type => supportedExts.add(type));
            }
          }
          
          if (supportedExts.has(ext)) {
            files.push(fullPath);
          }
        }
      }
    };
    
    if (fs.statSync(target).isDirectory()) {
      walkDir(target);
    } else {
      files.push(target);
    }
    
    return files;
  }
  
  private async scanFile(filePath: string): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const ext = path.extname(filePath);
      
      for (const rule of this.scanRules.values()) {
        if (!rule.enabled || !rule.fileTypes.includes(ext)) {
          continue;
        }
        
        const pattern = typeof rule.pattern === 'string' 
          ? new RegExp(rule.pattern, 'gi') 
          : rule.pattern;
        
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const lineNumber = this.getLineNumber(content, match.index);
          
          vulnerabilities.push({
            id: crypto.randomUUID(),
            title: rule.name,
            description: rule.description,
            severity: rule.severity,
            category: rule.category,
            location: {
              file: filePath,
              line: lineNumber
            },
            impact: `Potential security issue in code`,
            remediation: {
              description: `Fix ${rule.name.toLowerCase()} in ${path.basename(filePath)}`,
              references: [],
              fixAvailable: false
            },
            metadata: {
              rule: rule.id,
              match: match[0],
              pattern: rule.pattern.toString()
            }
          });
        }
      }
      
    } catch (error) {
      console.error(`Error scanning file ${filePath}:`, error);
    }
    
    return vulnerabilities;
  }
  
  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }
  
  private async scanContainer(config: ScanConfig, _signal: AbortSignal): Promise<Vulnerability[]> { // eslint-disable-line @typescript-eslint/no-unused-vars
    const vulnerabilities: Vulnerability[] = [];
    
    // Simulate container scanning
    const commonIssues = [
      {
        title: 'Running as Root User',
        description: 'Container is running as root user which increases security risk',
        severity: VulnerabilitySeverity.HIGH,
        category: VulnerabilityCategory.MISCONFIGURATION
      },
      {
        title: 'Outdated Base Image',
        description: 'Base image contains known vulnerabilities',
        severity: VulnerabilitySeverity.MEDIUM,
        category: VulnerabilityCategory.KNOWN_VULNERABILITIES
      },
      {
        title: 'Exposed Sensitive Ports',
        description: 'Container exposes potentially sensitive ports',
        severity: VulnerabilitySeverity.LOW,
        category: VulnerabilityCategory.MISCONFIGURATION
      }
    ];
    
    // Randomly simulate some issues
    for (const issue of commonIssues) {
      if (Math.random() > 0.6) {
        vulnerabilities.push({
          id: crypto.randomUUID(),
          title: issue.title,
          description: issue.description,
          severity: issue.severity,
          category: issue.category,
          location: {
            component: config.target
          },
          impact: 'Container security vulnerability',
          remediation: {
            description: `Fix ${issue.title.toLowerCase()}`,
            references: [],
            fixAvailable: true
          },
          metadata: { containerImage: config.target }
        });
      }
    }
    
    return vulnerabilities;
  }
  
  private async scanWeb(config: ScanConfig, _signal: AbortSignal): Promise<Vulnerability[]> { // eslint-disable-line @typescript-eslint/no-unused-vars
    const vulnerabilities: Vulnerability[] = [];
    
    // Simulate web application scanning
    const webVulns = [
      {
        title: 'Missing Security Headers',
        description: 'Application is missing important security headers',
        severity: VulnerabilitySeverity.MEDIUM,
        category: VulnerabilityCategory.MISCONFIGURATION
      },
      {
        title: 'Insecure Cookie Configuration',
        description: 'Cookies are not configured with secure flags',
        severity: VulnerabilitySeverity.LOW,
        category: VulnerabilityCategory.MISCONFIGURATION
      },
      {
        title: 'Information Disclosure',
        description: 'Application leaks sensitive information in responses',
        severity: VulnerabilitySeverity.MEDIUM,
        category: VulnerabilityCategory.SENSITIVE_DATA
      }
    ];
    
    for (const vuln of webVulns) {
      if (Math.random() > 0.5) {
        vulnerabilities.push({
          id: crypto.randomUUID(),
          title: vuln.title,
          description: vuln.description,
          severity: vuln.severity,
          category: vuln.category,
          location: {
            url: config.target
          },
          impact: 'Web application security vulnerability',
          remediation: {
            description: `Fix ${vuln.title.toLowerCase()}`,
            references: ['https://owasp.org/'],
            fixAvailable: true
          },
          metadata: { url: config.target }
        });
      }
    }
    
    return vulnerabilities;
  }
  
  private async scanAPI(config: ScanConfig, _signal: AbortSignal): Promise<Vulnerability[]> { // eslint-disable-line @typescript-eslint/no-unused-vars
    const vulnerabilities: Vulnerability[] = [];
    
    // Simulate API security scanning
    const apiVulns = [
      {
        title: 'Missing Rate Limiting',
        description: 'API endpoints lack proper rate limiting',
        severity: VulnerabilitySeverity.MEDIUM,
        category: VulnerabilityCategory.ACCESS_CONTROL
      },
      {
        title: 'Insufficient Authentication',
        description: 'Some API endpoints have weak authentication',
        severity: VulnerabilitySeverity.HIGH,
        category: VulnerabilityCategory.AUTHENTICATION
      },
      {
        title: 'Data Exposure',
        description: 'API returns more data than necessary',
        severity: VulnerabilitySeverity.LOW,
        category: VulnerabilityCategory.SENSITIVE_DATA
      }
    ];
    
    for (const vuln of apiVulns) {
      if (Math.random() > 0.4) {
        vulnerabilities.push({
          id: crypto.randomUUID(),
          title: vuln.title,
          description: vuln.description,
          severity: vuln.severity,
          category: vuln.category,
          location: {
            url: config.target
          },
          impact: 'API security vulnerability',
          remediation: {
            description: `Fix ${vuln.title.toLowerCase()}`,
            references: ['https://owasp.org/www-project-api-security/'],
            fixAvailable: true
          },
          metadata: { apiEndpoint: config.target }
        });
      }
    }
    
    return vulnerabilities;
  }
  
  private async scanNetwork(config: ScanConfig, _signal: AbortSignal): Promise<Vulnerability[]> { // eslint-disable-line @typescript-eslint/no-unused-vars
    const vulnerabilities: Vulnerability[] = [];
    
    // Simulate network scanning
    const networkVulns = [
      {
        title: 'Open Sensitive Ports',
        description: 'Network has sensitive ports exposed',
        severity: VulnerabilitySeverity.HIGH,
        category: VulnerabilityCategory.MISCONFIGURATION
      },
      {
        title: 'Weak SSL/TLS Configuration',
        description: 'SSL/TLS configuration uses weak ciphers',
        severity: VulnerabilitySeverity.MEDIUM,
        category: VulnerabilityCategory.MISCONFIGURATION
      }
    ];
    
    for (const vuln of networkVulns) {
      if (Math.random() > 0.7) {
        vulnerabilities.push({
          id: crypto.randomUUID(),
          title: vuln.title,
          description: vuln.description,
          severity: vuln.severity,
          category: vuln.category,
          location: {
            component: config.target
          },
          impact: 'Network security vulnerability',
          remediation: {
            description: `Fix ${vuln.title.toLowerCase()}`,
            references: [],
            fixAvailable: true
          },
          metadata: { target: config.target }
        });
      }
    }
    
    return vulnerabilities;
  }
  
  private async scanCompliance(config: ScanConfig, _signal: AbortSignal): Promise<Vulnerability[]> { // eslint-disable-line @typescript-eslint/no-unused-vars
    const vulnerabilities: Vulnerability[] = [];
    
    // Simulate compliance scanning
    const complianceIssues = [
      {
        title: 'GDPR Compliance Issue',
        description: 'Data processing lacks proper consent mechanisms',
        severity: VulnerabilitySeverity.HIGH,
        category: VulnerabilityCategory.SENSITIVE_DATA
      },
      {
        title: 'PCI DSS Compliance Issue',
        description: 'Payment data handling does not meet PCI DSS requirements',
        severity: VulnerabilitySeverity.CRITICAL,
        category: VulnerabilityCategory.SENSITIVE_DATA
      },
      {
        title: 'SOX Compliance Issue',
        description: 'Financial data access lacks proper audit trails',
        severity: VulnerabilitySeverity.MEDIUM,
        category: VulnerabilityCategory.LOGGING_MONITORING
      }
    ];
    
    for (const issue of complianceIssues) {
      if (Math.random() > 0.8) {
        vulnerabilities.push({
          id: crypto.randomUUID(),
          title: issue.title,
          description: issue.description,
          severity: issue.severity,
          category: issue.category,
          location: {
            component: config.target
          },
          impact: 'Compliance violation',
          remediation: {
            description: `Address ${issue.title.toLowerCase()}`,
            references: [],
            fixAvailable: true
          },
          metadata: { compliance: true }
        });
      }
    }
    
    return vulnerabilities;
  }
  
  private calculateSummary(vulnerabilities: Vulnerability[]): VulnerabilityReport['summary'] {
    const summary = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
      total: vulnerabilities.length
    };
    
    for (const vuln of vulnerabilities) {
      summary[vuln.severity]++;
    }
    
    return summary;
  }
  
  // Scan Management
  
  public cancelScan(scanId: string): boolean {
    const controller = this.activescans.get(scanId);
    if (controller) {
      controller.abort();
      return true;
    }
    return false;
  }
  
  public getScanReport(scanId: string): VulnerabilityReport | undefined {
    return this.reports.get(scanId);
  }
  
  public getAllScanReports(filter?: {
    type?: ScanType;
    status?: ScanStatus;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): VulnerabilityReport[] {
    let reports = Array.from(this.reports.values());
    
    if (filter) {
      if (filter.type) {
        reports = reports.filter(r => r.scanType === filter.type);
      }
      if (filter.status) {
        reports = reports.filter(r => r.status === filter.status);
      }
      if (filter.startDate) {
        reports = reports.filter(r => r.timestamp >= filter.startDate!);
      }
      if (filter.endDate) {
        reports = reports.filter(r => r.timestamp <= filter.endDate!);
      }
    }
    
    reports.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    if (filter?.limit) {
      reports = reports.slice(0, filter.limit);
    }
    
    return reports;
  }
  
  public deleteScanReport(scanId: string): boolean {
    return this.reports.delete(scanId);
  }
  
  // Rule Management
  
  public createScanRule(ruleData: Omit<ScanRule, 'id'>): ScanRule {
    const rule: ScanRule = {
      ...ruleData,
      id: crypto.randomUUID()
    };
    
    this.scanRules.set(rule.id, rule);
    
    this.emit('scanRuleCreated', { ruleId: rule.id, name: rule.name });
    
    return rule;
  }
  
  public updateScanRule(ruleId: string, updates: Partial<Omit<ScanRule, 'id'>>): ScanRule {
    const rule = this.scanRules.get(ruleId);
    
    if (!rule) {
      throw new Error('Scan rule not found');
    }
    
    Object.assign(rule, updates);
    
    this.emit('scanRuleUpdated', { ruleId, updates });
    
    return rule;
  }
  
  public deleteScanRule(ruleId: string): boolean {
    const rule = this.scanRules.get(ruleId);
    
    if (!rule) {
      return false;
    }
    
    if (!rule.customRule) {
      throw new Error('Cannot delete default scan rules');
    }
    
    const deleted = this.scanRules.delete(ruleId);
    
    if (deleted) {
      this.emit('scanRuleDeleted', { ruleId });
    }
    
    return deleted;
  }
  
  public getScanRule(ruleId: string): ScanRule | undefined {
    return this.scanRules.get(ruleId);
  }
  
  public getAllScanRules(): ScanRule[] {
    return Array.from(this.scanRules.values());
  }
  
  // Statistics and Reporting
  
  public getStats(): {
    totalScans: number;
    activeScans: number;
    completedScans: number;
    totalVulnerabilities: number;
    vulnerabilitiesByType: Record<VulnerabilityCategory, number>;
    vulnerabilitiesBySeverity: Record<VulnerabilitySeverity, number>;
    scanRules: number;
  } {
    const reports = Array.from(this.reports.values());
    const vulnerabilities = reports.flatMap(r => r.vulnerabilities);
    
    const vulnerabilitiesByType: Record<VulnerabilityCategory, number> = {} as Record<VulnerabilityCategory, number>;
    const vulnerabilitiesBySeverity: Record<VulnerabilitySeverity, number> = {} as Record<VulnerabilitySeverity, number>;
    
    // Initialize counters
    Object.values(VulnerabilityCategory).forEach(cat => {
      vulnerabilitiesByType[cat] = 0;
    });
    Object.values(VulnerabilitySeverity).forEach(sev => {
      vulnerabilitiesBySeverity[sev] = 0;
    });
    
    // Count vulnerabilities
    for (const vuln of vulnerabilities) {
      vulnerabilitiesByType[vuln.category]++;
      vulnerabilitiesBySeverity[vuln.severity]++;
    }
    
    return {
      totalScans: reports.length,
      activeScans: reports.filter(r => r.status === ScanStatus.RUNNING).length,
      completedScans: reports.filter(r => r.status === ScanStatus.COMPLETED).length,
      totalVulnerabilities: vulnerabilities.length,
      vulnerabilitiesByType,
      vulnerabilitiesBySeverity,
      scanRules: this.scanRules.size
    };
  }
  
  public generateComplianceReport(standards: string[]): {
    standard: string;
    compliant: boolean;
    issues: Vulnerability[];
    score: number;
  }[] {
    const reports = Array.from(this.reports.values());
    const vulnerabilities = reports.flatMap(r => r.vulnerabilities);
    
    return standards.map(standard => {
      // Filter vulnerabilities relevant to this standard
      const relevantVulns = vulnerabilities.filter(v => 
        this.isRelevantToStandard(v, standard)
      );
      
      const criticalIssues = relevantVulns.filter(v => 
        v.severity === VulnerabilitySeverity.CRITICAL || 
        v.severity === VulnerabilitySeverity.HIGH
      );
      
      const compliant = criticalIssues.length === 0;
      const score = Math.max(0, 100 - (relevantVulns.length * 10));
      
      return {
        standard,
        compliant,
        issues: relevantVulns,
        score
      };
    });
  }
  
  private isRelevantToStandard(vulnerability: Vulnerability, standard: string): boolean {
    const mappings: Record<string, VulnerabilityCategory[]> = {
      'OWASP': Object.values(VulnerabilityCategory),
      'GDPR': [VulnerabilityCategory.SENSITIVE_DATA, VulnerabilityCategory.ACCESS_CONTROL],
      'PCI DSS': [VulnerabilityCategory.SENSITIVE_DATA, VulnerabilityCategory.AUTHENTICATION],
      'SOX': [VulnerabilityCategory.LOGGING_MONITORING, VulnerabilityCategory.ACCESS_CONTROL],
      'HIPAA': [VulnerabilityCategory.SENSITIVE_DATA, VulnerabilityCategory.ACCESS_CONTROL]
    };
    
    const categories = mappings[standard] || [];
    return categories.includes(vulnerability.category);
  }
  
  // Cleanup
  
  public cleanup(retentionDays: number = 90): number {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    let deletedCount = 0;
    
    for (const [reportId, report] of this.reports.entries()) {
      if (report.timestamp < cutoffDate) {
        this.reports.delete(reportId);
        deletedCount++;
      }
    }
    
    this.emit('cleanupCompleted', { deletedReports: deletedCount });
    
    return deletedCount;
  }
  
  public destroy(): void {
    // Cancel all active scans
    for (const [_scanId, controller] of this.activescans.entries()) { // eslint-disable-line @typescript-eslint/no-unused-vars
      controller.abort();
    }
    
    this.reports.clear();
    this.scanRules.clear();
    this.activescans.clear();
    this.vulnerabilityDatabase.clear();
    
    this.emit('serviceDestroyed');
  }
}