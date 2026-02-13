/**
 * Security Scanner - Automated Code Analysis for Community Nodes
 * Scans for vulnerabilities, dangerous patterns, and permission issues
 */

import { logger } from '../services/SimpleLogger';
import {
  CommunityNode,
  SecurityScanResult,
  SecurityFinding,
} from '../types/marketplace';

export class SecurityScanner {
  // Dangerous patterns to detect
  private readonly DANGEROUS_PATTERNS = [
    { pattern: /eval\s*\(/g, message: 'Use of eval() detected', severity: 'critical' as const },
    { pattern: /Function\s*\(/g, message: 'Use of Function constructor detected', severity: 'critical' as const },
    { pattern: /exec\s*\(/g, message: 'Use of exec() detected', severity: 'error' as const },
    { pattern: /spawn\s*\(/g, message: 'Use of spawn() detected', severity: 'warning' as const },
    { pattern: /require\s*\(\s*['"`]child_process['"`]\s*\)/g, message: 'child_process module usage', severity: 'warning' as const },
    { pattern: /require\s*\(\s*['"`]fs['"`]\s*\)/g, message: 'fs module usage - file system access', severity: 'warning' as const },
    { pattern: /\.rm\s*\(/g, message: 'File removal operation detected', severity: 'error' as const },
    { pattern: /\.unlink\s*\(/g, message: 'File deletion operation detected', severity: 'error' as const },
    { pattern: /process\.env/g, message: 'Environment variable access', severity: 'info' as const },
    { pattern: /__dirname/g, message: 'Directory path access', severity: 'info' as const },
    { pattern: /__filename/g, message: 'File path access', severity: 'info' as const },
    { pattern: /crypto\.createHash/g, message: 'Cryptographic operations', severity: 'info' as const },
    { pattern: /https?:\/\//g, message: 'HTTP/HTTPS request detected', severity: 'info' as const },
    { pattern: /fetch\s*\(/g, message: 'Fetch API usage', severity: 'info' as const },
    { pattern: /XMLHttpRequest/g, message: 'XMLHttpRequest usage', severity: 'info' as const },
    { pattern: /localStorage/g, message: 'localStorage access', severity: 'info' as const },
    { pattern: /sessionStorage/g, message: 'sessionStorage access', severity: 'info' as const },
    { pattern: /document\.cookie/g, message: 'Cookie access detected', severity: 'warning' as const },
    { pattern: /innerHTML\s*=/g, message: 'innerHTML assignment - XSS risk', severity: 'warning' as const },
    { pattern: /outerHTML\s*=/g, message: 'outerHTML assignment - XSS risk', severity: 'warning' as const },
    { pattern: /\.write\s*\(/g, message: 'document.write usage', severity: 'warning' as const },
    { pattern: /atob\s*\(/g, message: 'Base64 decode operation', severity: 'info' as const },
    { pattern: /btoa\s*\(/g, message: 'Base64 encode operation', severity: 'info' as const },
  ];

  // Known vulnerable packages (simplified - should be maintained database)
  private readonly VULNERABLE_PACKAGES = [
    'event-stream@3.3.6',
    'flatmap-stream',
    'eslint-scope@3.7.2',
  ];

  /**
   * Scan node for security issues
   */
  async scanNode(node: CommunityNode): Promise<SecurityScanResult> {
    const findings: SecurityFinding[] = [];

    try {
      // 1. Code pattern analysis
      const patternFindings = await this.analyzeCodePatterns(node);
      findings.push(...patternFindings);

      // 2. Dependency scanning
      const dependencyFindings = await this.scanDependencies(node);
      findings.push(...dependencyFindings);

      // 3. Permission analysis
      const permissionFindings = await this.analyzePermissions(node);
      findings.push(...permissionFindings);

      // 4. Code complexity analysis
      const complexityFindings = await this.analyzeComplexity(node);
      findings.push(...complexityFindings);

      // Calculate risk level
      const riskLevel = this.calculateRiskLevel(findings);

      // Calculate security score (0-100)
      const score = this.calculateSecurityScore(findings);

      // Determine if scan passed
      const passed = riskLevel !== 'critical' && score >= 60;

      return {
        passed,
        scannedAt: new Date(),
        findings,
        riskLevel,
        score,
      };
    } catch (error) {
      logger.error('Security scan error:', error);

      // Return failed scan result
      return {
        passed: false,
        scannedAt: new Date(),
        findings: [
          {
            type: 'vulnerability',
            severity: 'error',
            message: 'Security scan failed to complete',
            recommendation: 'Please resubmit the node for scanning',
          },
        ],
        riskLevel: 'high',
        score: 0,
      };
    }
  }

  /**
   * Analyze code for dangerous patterns
   */
  private async analyzeCodePatterns(node: CommunityNode): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    // Simulate fetching code content
    const codeContent = await this.fetchNodeCode(node.codeUrl);

    // Check each pattern
    for (const { pattern, message, severity } of this.DANGEROUS_PATTERNS) {
      const matches = codeContent.match(pattern);
      if (matches) {
        findings.push({
          type: 'pattern',
          severity,
          message: `${message} (${matches.length} occurrence${matches.length > 1 ? 's' : ''})`,
          location: 'code',
          recommendation: this.getRecommendation(message),
        });
      }
    }

    return findings;
  }

  /**
   * Scan dependencies for known vulnerabilities
   */
  private async scanDependencies(node: CommunityNode): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    // Check npm dependencies
    if (node.dependencies.npm) {
      for (const dep of node.dependencies.npm) {
        if (this.VULNERABLE_PACKAGES.includes(dep)) {
          findings.push({
            type: 'dependency',
            severity: 'critical',
            message: `Vulnerable package detected: ${dep}`,
            location: 'package.json',
            recommendation: 'Update to latest secure version',
          });
        }

        // Check for outdated packages (simplified)
        if (dep.includes('@')) {
          const [pkg, version] = dep.split('@');
          if (version && version.startsWith('0.')) {
            findings.push({
              type: 'dependency',
              severity: 'warning',
              message: `Pre-1.0 package: ${pkg}@${version}`,
              location: 'package.json',
              recommendation: 'Consider using stable versions',
            });
          }
        }
      }
    }

    // Check Python dependencies
    if (node.dependencies.python) {
      for (const dep of node.dependencies.python) {
        // Simplified check - in production, use safety or pip-audit
        if (dep.includes('==2.')) {
          findings.push({
            type: 'dependency',
            severity: 'info',
            message: `Python 2 package detected: ${dep}`,
            location: 'requirements.txt',
            recommendation: 'Consider upgrading to Python 3 compatible version',
          });
        }
      }
    }

    return findings;
  }

  /**
   * Analyze permissions requested by node
   */
  private async analyzePermissions(node: CommunityNode): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    // Check network permission
    if (node.permissions.network) {
      findings.push({
        type: 'permission',
        severity: 'info',
        message: 'Node requests network access',
        recommendation: 'Ensure network calls are necessary and secure',
      });
    }

    // Check filesystem permission
    if (node.permissions.filesystem) {
      findings.push({
        type: 'permission',
        severity: 'warning',
        message: 'Node requests filesystem access',
        recommendation: 'Validate all file operations and paths',
      });
    }

    // Check subprocess permission
    if (node.permissions.subprocess) {
      findings.push({
        type: 'permission',
        severity: 'warning',
        message: 'Node requests subprocess execution',
        recommendation: 'Ensure subprocess commands are validated',
      });
    }

    // Flag high-risk permission combinations
    if (node.permissions.network && node.permissions.filesystem && node.permissions.subprocess) {
      findings.push({
        type: 'permission',
        severity: 'error',
        message: 'Node requests multiple high-risk permissions',
        recommendation: 'Review if all permissions are necessary',
      });
    }

    return findings;
  }

  /**
   * Analyze code complexity
   */
  private async analyzeComplexity(node: CommunityNode): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];
    const codeContent = await this.fetchNodeCode(node.codeUrl);

    // Count lines of code
    const lines = codeContent.split('\n').length;
    if (lines > 1000) {
      findings.push({
        type: 'pattern',
        severity: 'warning',
        message: `Large code file: ${lines} lines`,
        recommendation: 'Consider breaking into smaller modules',
      });
    }

    // Check for nested callbacks (simplified complexity metric)
    const nestedCallbacks = (codeContent.match(/function\s*\(/g) || []).length;
    if (nestedCallbacks > 20) {
      findings.push({
        type: 'pattern',
        severity: 'info',
        message: 'High number of function definitions detected',
        recommendation: 'Consider refactoring for maintainability',
      });
    }

    return findings;
  }

  /**
   * Calculate overall risk level
   */
  private calculateRiskLevel(findings: SecurityFinding[]): 'low' | 'medium' | 'high' | 'critical' {
    const criticalCount = findings.filter((f) => f.severity === 'critical').length;
    const errorCount = findings.filter((f) => f.severity === 'error').length;
    const warningCount = findings.filter((f) => f.severity === 'warning').length;

    if (criticalCount > 0) return 'critical';
    if (errorCount > 2) return 'high';
    if (errorCount > 0 || warningCount > 5) return 'medium';
    return 'low';
  }

  /**
   * Calculate security score (0-100)
   */
  private calculateSecurityScore(findings: SecurityFinding[]): number {
    let score = 100;

    findings.forEach((finding) => {
      switch (finding.severity) {
        case 'critical':
          score -= 30;
          break;
        case 'error':
          score -= 15;
          break;
        case 'warning':
          score -= 5;
          break;
        case 'info':
          score -= 1;
          break;
      }
    });

    return Math.max(0, score);
  }

  /**
   * Get recommendation for specific finding
   */
  private getRecommendation(message: string): string {
    if (message.includes('eval')) {
      return 'Replace eval() with safer alternatives like JSON.parse()';
    }
    if (message.includes('innerHTML')) {
      return 'Use textContent or sanitize HTML input';
    }
    if (message.includes('exec')) {
      return 'Avoid executing shell commands or validate all inputs';
    }
    return 'Review and validate this usage for security implications';
  }

  /**
   * Fetch node code for analysis
   * In production, this would fetch from repository
   */
  private async fetchNodeCode(codeUrl: string): Promise<string> {
    // Simulate code fetch
    // In production: fetch actual code from GitHub/GitLab
    return `
      // Sample node code
      function processData(input) {
        const result = JSON.parse(input);
        return result;
      }

      module.exports = { processData };
    `;
  }

  /**
   * Generate security report
   */
  generateReport(scanResult: SecurityScanResult): string {
    let report = '# Security Scan Report\n\n';
    report += `**Status:** ${scanResult.passed ? 'PASSED' : 'FAILED'}\n`;
    report += `**Risk Level:** ${scanResult.riskLevel.toUpperCase()}\n`;
    report += `**Security Score:** ${scanResult.score}/100\n`;
    report += `**Scanned At:** ${scanResult.scannedAt.toISOString()}\n\n`;

    if (scanResult.findings.length === 0) {
      report += 'No security issues found.\n';
    } else {
      report += '## Findings\n\n';

      const critical = scanResult.findings.filter((f) => f.severity === 'critical');
      const errors = scanResult.findings.filter((f) => f.severity === 'error');
      const warnings = scanResult.findings.filter((f) => f.severity === 'warning');
      const info = scanResult.findings.filter((f) => f.severity === 'info');

      if (critical.length > 0) {
        report += `### Critical (${critical.length})\n`;
        critical.forEach((f) => {
          report += `- ${f.message}\n`;
          if (f.recommendation) report += `  *${f.recommendation}*\n`;
        });
        report += '\n';
      }

      if (errors.length > 0) {
        report += `### Errors (${errors.length})\n`;
        errors.forEach((f) => {
          report += `- ${f.message}\n`;
          if (f.recommendation) report += `  *${f.recommendation}*\n`;
        });
        report += '\n';
      }

      if (warnings.length > 0) {
        report += `### Warnings (${warnings.length})\n`;
        warnings.forEach((f) => {
          report += `- ${f.message}\n`;
        });
        report += '\n';
      }

      if (info.length > 0) {
        report += `### Info (${info.length})\n`;
        info.forEach((f) => {
          report += `- ${f.message}\n`;
        });
      }
    }

    return report;
  }
}
