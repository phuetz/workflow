#!/usr/bin/env tsx

/**
 * CI/CD Secret Scanner
 *
 * Scans entire codebase for exposed secrets in CI/CD pipeline
 * Generates JSON report and fails build if secrets found
 *
 * Usage: tsx scripts/ci-secret-scan.ts
 */

import { getSecretScanner } from '../src/security/SecretScanner';
import * as fs from 'fs';
import * as path from 'path';

const scanner = getSecretScanner();

interface ScanReport {
  timestamp: string;
  scannedFiles: number;
  matchesFound: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  matches: Array<{
    file: string;
    line: number;
    patternName: string;
    severity: string;
    confidence: string;
    category: string;
    match: string;
  }>;
  passed: boolean;
}

async function main() {
  try {
    console.log('\n🔍 CI/CD Secret Scanner - Full Codebase Scan\n');
    console.log('='.repeat(60));

    const startTime = Date.now();

    // Scan the entire codebase
    const result = await scanner.scanDirectory(process.cwd(), {
      include: ['**/*'],
      exclude: [
        'node_modules/**',
        '.git/**',
        'dist/**',
        'build/**',
        'coverage/**',
        '*.lock',
        'package-lock.json',
        '*.md',
        '*.log',
        '.env.example',
        '.env.template',
        '**/*.min.js',
        '**/*.bundle.js'
      ]
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n📊 Scan completed in ${duration}s`);
    console.log(`   Files scanned: ${result.scannedFiles}`);
    console.log(`   Secrets found: ${result.matchesFound}\n`);

    // Generate JSON report for GitHub Actions
    const report: ScanReport = {
      timestamp: new Date().toISOString(),
      scannedFiles: result.scannedFiles,
      matchesFound: result.matchesFound,
      criticalIssues: result.criticalIssues,
      highIssues: result.highIssues,
      mediumIssues: result.mediumIssues,
      lowIssues: result.lowIssues,
      matches: result.matches,
      passed: result.matchesFound === 0
    };

    // Write report to file
    fs.writeFileSync(
      'secret-scan-report.json',
      JSON.stringify(report, null, 2)
    );

    console.log('📄 Report saved to: secret-scan-report.json\n');

    if (result.matchesFound === 0) {
      console.log('✅ No secrets detected - scan passed!\n');
      process.exit(0);
    }

    // Secrets found - display detailed report
    console.log('='.repeat(60));
    console.log('🚨 SECRETS DETECTED - BUILD FAILED');
    console.log('='.repeat(60) + '\n');

    // Summary by severity
    if (result.criticalIssues > 0) {
      console.log(`🔴 CRITICAL: ${result.criticalIssues} issue(s)`);
    }
    if (result.highIssues > 0) {
      console.log(`🟠 HIGH:     ${result.highIssues} issue(s)`);
    }
    if (result.mediumIssues > 0) {
      console.log(`🟡 MEDIUM:   ${result.mediumIssues} issue(s)`);
    }
    if (result.lowIssues > 0) {
      console.log(`⚪ LOW:      ${result.lowIssues} issue(s)`);
    }

    console.log('\n📋 Detailed Findings:\n');

    // Group by file
    const byFile = new Map<string, typeof result.matches>();
    for (const match of result.matches) {
      if (!byFile.has(match.file)) {
        byFile.set(match.file, []);
      }
      byFile.get(match.file)!.push(match);
    }

    // Display grouped results
    for (const [file, matches] of byFile) {
      console.log(`📄 ${file}`);
      for (const match of matches) {
        const icon = match.severity === 'critical' ? '🔴' :
                    match.severity === 'high' ? '🟠' :
                    match.severity === 'medium' ? '🟡' : '⚪';
        console.log(`   ${icon} Line ${match.line}: ${match.patternName} [${match.confidence} confidence]`);
        console.log(`      Category: ${match.category}`);
        console.log(`      Match: ${match.match}`);
        console.log();
      }
    }

    console.log('='.repeat(60));
    console.log('🛑 BUILD BLOCKED - SECRETS MUST BE REMOVED');
    console.log('='.repeat(60) + '\n');

    console.log('⚠️  IMMEDIATE ACTIONS REQUIRED:\n');
    console.log('1. 🔥 ROTATE all exposed credentials immediately');
    console.log('2. ❌ Remove secrets from code');
    console.log('3. 📝 Use environment variables instead');
    console.log('4. 🔒 Add .env files to .gitignore');
    console.log('5. 📚 Review security best practices\n');

    console.log('📖 Security Resources:');
    console.log('   - How to rotate credentials: docs/security/credential-rotation.md');
    console.log('   - Using environment variables: docs/security/environment-variables.md');
    console.log('   - Secret management guide: docs/security/secrets-management.md\n');

    // Exit with failure
    process.exit(1);

  } catch (error) {
    console.error('❌ Error during secret scanning:', error);

    // Generate error report
    const errorReport: ScanReport = {
      timestamp: new Date().toISOString(),
      scannedFiles: 0,
      matchesFound: 0,
      criticalIssues: 0,
      highIssues: 0,
      mediumIssues: 0,
      lowIssues: 0,
      matches: [],
      passed: false
    };

    fs.writeFileSync(
      'secret-scan-report.json',
      JSON.stringify(errorReport, null, 2)
    );

    // Fail the build on scanner errors
    console.log('\n⚠️  Scanner error - failing build for safety\n');
    process.exit(1);
  }
}

main();
