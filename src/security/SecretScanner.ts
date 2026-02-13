/**
 * Secret Scanner Service
 *
 * Detects exposed secrets in code:
 * - API keys, tokens, passwords
 * - Private keys, certificates
 * - Database credentials
 * - OAuth secrets
 * - AWS, GitHub, Stripe keys
 *
 * Uses pattern matching with high-confidence detection
 *
 * @module security/SecretScanner
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

export interface SecretPattern {
  id: string;
  name: string;
  description: string;
  pattern: RegExp;
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: 'high' | 'medium' | 'low';
  category: string;
}

export interface SecretMatch {
  patternId: string;
  patternName: string;
  file: string;
  line: number;
  column: number;
  match: string;
  context: string;
  severity: string;
  confidence: string;
  category: string;
}

export interface ScanResult {
  scannedFiles: number;
  matchesFound: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  matches: SecretMatch[];
  duration: number;
  timestamp: Date;
}

/**
 * Secret Scanner Class
 */
export class SecretScanner {
  private patterns: SecretPattern[] = [];

  constructor() {
    this.initializePatterns();
  }

  /**
   * Initialize secret detection patterns
   */
  private initializePatterns(): void {
    this.patterns = [
      // AWS Keys
      {
        id: 'aws-access-key',
        name: 'AWS Access Key ID',
        description: 'AWS Access Key ID detected',
        pattern: /AKIA[0-9A-Z]{16}/g,
        severity: 'critical',
        confidence: 'high',
        category: 'AWS'
      },
      {
        id: 'aws-secret-key',
        name: 'AWS Secret Access Key',
        description: 'AWS Secret Access Key detected',
        pattern: /aws_secret_access_key\s*=\s*['"]([A-Za-z0-9/+=]{40})['"]/gi,
        severity: 'critical',
        confidence: 'high',
        category: 'AWS'
      },

      // GitHub
      {
        id: 'github-token',
        name: 'GitHub Personal Access Token',
        description: 'GitHub token detected',
        pattern: /ghp_[A-Za-z0-9]{36}/g,
        severity: 'critical',
        confidence: 'high',
        category: 'GitHub'
      },
      {
        id: 'github-oauth',
        name: 'GitHub OAuth Token',
        description: 'GitHub OAuth token detected',
        pattern: /gho_[A-Za-z0-9]{36}/g,
        severity: 'critical',
        confidence: 'high',
        category: 'GitHub'
      },
      {
        id: 'github-app-token',
        name: 'GitHub App Token',
        description: 'GitHub App token detected',
        pattern: /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}/g,
        severity: 'critical',
        confidence: 'high',
        category: 'GitHub'
      },

      // Stripe
      {
        id: 'stripe-secret-key',
        name: 'Stripe Secret Key',
        description: 'Stripe secret key detected',
        pattern: /sk_live_[0-9a-zA-Z]{24,}/g,
        severity: 'critical',
        confidence: 'high',
        category: 'Stripe'
      },
      {
        id: 'stripe-restricted-key',
        name: 'Stripe Restricted Key',
        description: 'Stripe restricted key detected',
        pattern: /rk_live_[0-9a-zA-Z]{24,}/g,
        severity: 'high',
        confidence: 'high',
        category: 'Stripe'
      },

      // Google
      {
        id: 'google-api-key',
        name: 'Google API Key',
        description: 'Google API key detected',
        pattern: /AIza[0-9A-Za-z\\-_]{35}/g,
        severity: 'critical',
        confidence: 'high',
        category: 'Google'
      },
      {
        id: 'google-oauth',
        name: 'Google OAuth Token',
        description: 'Google OAuth token detected',
        pattern: /ya29\.[0-9A-Za-z\-_]+/g,
        severity: 'critical',
        confidence: 'medium',
        category: 'Google'
      },

      // Slack
      {
        id: 'slack-token',
        name: 'Slack Token',
        description: 'Slack token detected',
        pattern: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[A-Za-z0-9]{24,}/g,
        severity: 'critical',
        confidence: 'high',
        category: 'Slack'
      },
      {
        id: 'slack-webhook',
        name: 'Slack Webhook',
        description: 'Slack webhook URL detected',
        pattern: /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]{8,}\/B[A-Z0-9]{8,}\/[A-Za-z0-9]{24,}/g,
        severity: 'high',
        confidence: 'high',
        category: 'Slack'
      },

      // OpenAI
      {
        id: 'openai-api-key',
        name: 'OpenAI API Key',
        description: 'OpenAI API key detected',
        pattern: /sk-[A-Za-z0-9]{48}/g,
        severity: 'critical',
        confidence: 'medium',
        category: 'OpenAI'
      },

      // Anthropic
      {
        id: 'anthropic-api-key',
        name: 'Anthropic API Key',
        description: 'Anthropic API key detected',
        pattern: /sk-ant-[A-Za-z0-9\-]{95}/g,
        severity: 'critical',
        confidence: 'high',
        category: 'Anthropic'
      },

      // Generic Patterns
      {
        id: 'private-key',
        name: 'Private Key',
        description: 'Private key detected',
        pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g,
        severity: 'critical',
        confidence: 'high',
        category: 'Cryptographic'
      },
      {
        id: 'api-key-generic',
        name: 'Generic API Key',
        description: 'Generic API key pattern detected',
        pattern: /(?:api[_-]?key|apikey|access[_-]?key)\s*[:=]\s*['"]([A-Za-z0-9\-_]{20,})['"]/gi,
        severity: 'high',
        confidence: 'medium',
        category: 'Generic'
      },
      {
        id: 'password-in-code',
        name: 'Password in Code',
        description: 'Hardcoded password detected',
        pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"]([^'"]{8,})['"]/gi,
        severity: 'high',
        confidence: 'low',
        category: 'Password'
      },
      {
        id: 'database-url',
        name: 'Database Connection String',
        description: 'Database connection string with credentials',
        pattern: /(?:postgres|mysql|mongodb):\/\/[^:]+:[^@]+@[^\/]+/gi,
        severity: 'critical',
        confidence: 'high',
        category: 'Database'
      },
      {
        id: 'jwt-token',
        name: 'JWT Token',
        description: 'JWT token detected',
        pattern: /eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g,
        severity: 'medium',
        confidence: 'medium',
        category: 'Token'
      },

      // Cloud Providers
      {
        id: 'azure-storage-key',
        name: 'Azure Storage Account Key',
        description: 'Azure Storage Account key detected',
        pattern: /DefaultEndpointsProtocol=https;AccountName=[^;]+;AccountKey=([A-Za-z0-9+/=]{88})/gi,
        severity: 'critical',
        confidence: 'high',
        category: 'Azure'
      },
      {
        id: 'heroku-api-key',
        name: 'Heroku API Key',
        description: 'Heroku API key detected',
        pattern: /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g,
        severity: 'high',
        confidence: 'low',
        category: 'Heroku'
      },

      // Twilio
      {
        id: 'twilio-api-key',
        name: 'Twilio API Key',
        description: 'Twilio API key detected',
        pattern: /SK[a-z0-9]{32}/g,
        severity: 'high',
        confidence: 'medium',
        category: 'Twilio'
      },

      // SendGrid
      {
        id: 'sendgrid-api-key',
        name: 'SendGrid API Key',
        description: 'SendGrid API key detected',
        pattern: /SG\.[A-Za-z0-9\-_]{22}\.[A-Za-z0-9\-_]{43}/g,
        severity: 'high',
        confidence: 'high',
        category: 'SendGrid'
      },

      // MailChimp
      {
        id: 'mailchimp-api-key',
        name: 'MailChimp API Key',
        description: 'MailChimp API key detected',
        pattern: /[0-9a-f]{32}-us[0-9]{1,2}/g,
        severity: 'high',
        confidence: 'medium',
        category: 'MailChimp'
      }
    ];
  }

  /**
   * Scan a file for secrets
   */
  async scanFile(filePath: string): Promise<SecretMatch[]> {
    const matches: SecretMatch[] = [];

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      for (const pattern of this.patterns) {
        // Reset regex lastIndex
        pattern.pattern.lastIndex = 0;

        let match: RegExpExecArray | null;
        while ((match = pattern.pattern.exec(content)) !== null) {
          const matchIndex = match.index;
          const matchText = match[0];

          // Find line and column
          let currentIndex = 0;
          let lineNumber = 1;
          let columnNumber = 1;

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (currentIndex + line.length >= matchIndex) {
              lineNumber = i + 1;
              columnNumber = matchIndex - currentIndex + 1;
              break;
            }
            currentIndex += line.length + 1; // +1 for newline
          }

          // Get context (line containing the match)
          const contextLine = lines[lineNumber - 1] || '';

          // Check if this is a false positive
          if (this.isFalsePositive(matchText, contextLine, filePath)) {
            continue;
          }

          matches.push({
            patternId: pattern.id,
            patternName: pattern.name,
            file: filePath,
            line: lineNumber,
            column: columnNumber,
            match: this.maskSecret(matchText),
            context: contextLine.trim(),
            severity: pattern.severity,
            confidence: pattern.confidence,
            category: pattern.category
          });
        }
      }
    } catch (error) {
      console.error(`Error scanning file ${filePath}:`, error);
    }

    return matches;
  }

  /**
   * Scan directory recursively
   */
  async scanDirectory(
    directory: string,
    options: {
      exclude?: string[];
      include?: string[];
      maxFileSize?: number;
    } = {}
  ): Promise<ScanResult> {
    const startTime = Date.now();
    const {
      exclude = ['node_modules', '.git', 'dist', 'build', 'coverage'],
      include = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.json', '**/*.env*', '**/*.yaml', '**/*.yml'],
      maxFileSize = 1024 * 1024 // 1MB
    } = options;

    const allMatches: SecretMatch[] = [];
    let scannedFiles = 0;

    // Find files to scan
    const files = await glob(include, {
      cwd: directory,
      ignore: exclude,
      absolute: true
    });

    console.log(`🔍 Scanning ${files.length} files...`);

    for (const file of files) {
      try {
        const stats = await fs.stat(file);

        // Skip large files
        if (stats.size > maxFileSize) {
          continue;
        }

        const matches = await this.scanFile(file);
        allMatches.push(...matches);
        scannedFiles++;

        if (matches.length > 0) {
          console.log(`   ⚠️  Found ${matches.length} potential secret(s) in ${path.relative(directory, file)}`);
        }
      } catch (error) {
        console.error(`Error processing ${file}:`, error);
      }
    }

    const duration = Date.now() - startTime;

    // Count by severity
    const criticalIssues = allMatches.filter(m => m.severity === 'critical').length;
    const highIssues = allMatches.filter(m => m.severity === 'high').length;
    const mediumIssues = allMatches.filter(m => m.severity === 'medium').length;
    const lowIssues = allMatches.filter(m => m.severity === 'low').length;

    return {
      scannedFiles,
      matchesFound: allMatches.length,
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues,
      matches: allMatches,
      duration,
      timestamp: new Date()
    };
  }

  /**
   * Check if match is a false positive
   */
  private isFalsePositive(match: string, context: string, filePath: string): boolean {
    // Skip example values
    const examplePatterns = [
      /example/i,
      /test/i,
      /dummy/i,
      /placeholder/i,
      /xxx+/i,
      /123+/i,
      /sample/i,
      /demo/i,
      /fake/i
    ];

    for (const pattern of examplePatterns) {
      if (pattern.test(match) || pattern.test(context)) {
        return true;
      }
    }

    // Skip .env.example files
    if (filePath.includes('.env.example') || filePath.includes('.env.sample')) {
      return true;
    }

    // Skip comments in code
    if (context.trim().startsWith('//') || context.trim().startsWith('#') || context.trim().startsWith('*')) {
      return true;
    }

    return false;
  }

  /**
   * Mask secret for display
   */
  private maskSecret(secret: string): string {
    if (secret.length <= 8) {
      return '***';
    }

    const visibleChars = 4;
    const start = secret.substring(0, visibleChars);
    const end = secret.substring(secret.length - visibleChars);

    return `${start}${'*'.repeat(Math.max(0, secret.length - 8))}${end}`;
  }

  /**
   * Generate report
   */
  generateReport(result: ScanResult): string {
    const lines: string[] = [];

    lines.push('');
    lines.push('='.repeat(80));
    lines.push('🔍  SECRET SCANNING REPORT');
    lines.push('='.repeat(80));
    lines.push('');
    lines.push(`Scanned: ${result.scannedFiles} files`);
    lines.push(`Duration: ${result.duration}ms`);
    lines.push(`Timestamp: ${result.timestamp.toISOString()}`);
    lines.push('');
    lines.push('-'.repeat(80));
    lines.push('FINDINGS:');
    lines.push('-'.repeat(80));
    lines.push(`🔴 Critical: ${result.criticalIssues}`);
    lines.push(`🟠 High:     ${result.highIssues}`);
    lines.push(`🟡 Medium:   ${result.mediumIssues}`);
    lines.push(`⚪ Low:      ${result.lowIssues}`);
    lines.push(`📊 Total:    ${result.matchesFound}`);
    lines.push('');

    if (result.matches.length > 0) {
      lines.push('-'.repeat(80));
      lines.push('DETAILS:');
      lines.push('-'.repeat(80));

      // Group by file
      const byFile = new Map<string, SecretMatch[]>();
      for (const match of result.matches) {
        if (!byFile.has(match.file)) {
          byFile.set(match.file, []);
        }
        byFile.get(match.file)!.push(match);
      }

      for (const [file, matches] of byFile) {
        lines.push('');
        lines.push(`📄 ${file}`);

        for (const match of matches) {
          const severityIcon = match.severity === 'critical' ? '🔴' :
                              match.severity === 'high' ? '🟠' :
                              match.severity === 'medium' ? '🟡' : '⚪';

          lines.push(`   ${severityIcon} Line ${match.line}:${match.column} - ${match.patternName}`);
          lines.push(`      Match: ${match.match}`);
          lines.push(`      Category: ${match.category}`);
          lines.push(`      Confidence: ${match.confidence}`);
        }
      }
    }

    lines.push('');
    lines.push('='.repeat(80));

    if (result.criticalIssues > 0 || result.highIssues > 0) {
      lines.push('');
      lines.push('⚠️  CRITICAL/HIGH SEVERITY ISSUES FOUND!');
      lines.push('');
      lines.push('Immediate actions required:');
      lines.push('  1. Rotate all exposed credentials');
      lines.push('  2. Remove secrets from code');
      lines.push('  3. Use environment variables or secret management');
      lines.push('  4. Add files to .gitignore if needed');
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Get patterns by category
   */
  getPatternsByCategory(): Map<string, SecretPattern[]> {
    const byCategory = new Map<string, SecretPattern[]>();

    for (const pattern of this.patterns) {
      if (!byCategory.has(pattern.category)) {
        byCategory.set(pattern.category, []);
      }
      byCategory.get(pattern.category)!.push(pattern);
    }

    return byCategory;
  }

  /**
   * Get total pattern count
   */
  getPatternCount(): number {
    return this.patterns.length;
  }
}

// Singleton instance
let scannerInstance: SecretScanner | null = null;

/**
 * Get singleton instance of SecretScanner
 */
export function getSecretScanner(): SecretScanner {
  if (!scannerInstance) {
    scannerInstance = new SecretScanner();
  }
  return scannerInstance;
}
