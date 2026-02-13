#!/usr/bin/env tsx

/**
 * Pre-Commit Secret Scanner
 *
 * Scans staged files for exposed secrets before commit
 * Blocks commit if secrets are found
 *
 * Usage: Automatically run by Husky pre-commit hook
 */

import { execSync } from 'child_process';
import { getSecretScanner } from '../src/security/SecretScanner';
import * as fs from 'fs';
import * as path from 'path';

const scanner = getSecretScanner();

async function main() {
  try {
    console.log('\n🔍 Scanning staged files for secrets...\n');

    // Get staged files
    const stagedFiles = execSync('git diff --cached --name-only --diff-filter=ACM', {
      encoding: 'utf-8'
    })
      .trim()
      .split('\n')
      .filter(file => file.length > 0);

    if (stagedFiles.length === 0) {
      console.log('✅ No files to scan\n');
      process.exit(0);
    }

    console.log(`   Scanning ${stagedFiles.length} staged file(s)...\n`);

    // Scan each staged file
    const allMatches = [];
    let scannedCount = 0;

    for (const file of stagedFiles) {
      // Skip if file doesn't exist (deleted files)
      if (!fs.existsSync(file)) {
        continue;
      }

      // Skip binary files and large files
      const stats = fs.statSync(file);
      if (stats.size > 1024 * 1024) {
        continue;
      }

      try {
        const matches = await scanner.scanFile(path.resolve(file));
        if (matches.length > 0) {
          allMatches.push(...matches);
          console.log(`   ⚠️  ${matches.length} potential secret(s) in ${file}`);
        }
        scannedCount++;
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }

    if (allMatches.length === 0) {
      console.log(`\n✅ No secrets detected in ${scannedCount} file(s)\n`);
      process.exit(0);
    }

    // Secrets found - display and block commit
    console.log('\n' + '='.repeat(60));
    console.log('🚨 SECRETS DETECTED - COMMIT BLOCKED');
    console.log('='.repeat(60) + '\n');

    // Group by severity
    const critical = allMatches.filter(m => m.severity === 'critical');
    const high = allMatches.filter(m => m.severity === 'high');
    const medium = allMatches.filter(m => m.severity === 'medium');
    const low = allMatches.filter(m => m.severity === 'low');

    if (critical.length > 0) {
      console.log(`🔴 CRITICAL: ${critical.length} issue(s)`);
    }
    if (high.length > 0) {
      console.log(`🟠 HIGH:     ${high.length} issue(s)`);
    }
    if (medium.length > 0) {
      console.log(`🟡 MEDIUM:   ${medium.length} issue(s)`);
    }
    if (low.length > 0) {
      console.log(`⚪ LOW:      ${low.length} issue(s)`);
    }

    console.log('\nDetails:\n');

    // Group by file
    const byFile = new Map();
    for (const match of allMatches) {
      if (!byFile.has(match.file)) {
        byFile.set(match.file, []);
      }
      byFile.get(match.file).push(match);
    }

    for (const [file, matches] of byFile) {
      console.log(`📄 ${file}`);
      for (const match of matches) {
        const icon = match.severity === 'critical' ? '🔴' :
                    match.severity === 'high' ? '🟠' :
                    match.severity === 'medium' ? '🟡' : '⚪';
        console.log(`   ${icon} Line ${match.line}: ${match.patternName}`);
        console.log(`      ${match.match}`);
      }
      console.log('');
    }

    console.log('='.repeat(60));
    console.log('\n⚠️  COMMIT REJECTED - SECRETS MUST BE REMOVED\n');
    console.log('To fix:');
    console.log('  1. Remove secrets from the code');
    console.log('  2. Use environment variables (.env files)');
    console.log('  3. Never commit .env files (add to .gitignore)');
    console.log('  4. Rotate any exposed credentials\n');
    console.log('To bypass (NOT RECOMMENDED):');
    console.log('  git commit --no-verify\n');

    process.exit(1);
  } catch (error) {
    console.error('❌ Error during secret scanning:', error);
    // Don't block commit on scanner errors
    console.log('\n⚠️  Scanner error - commit allowed but please review manually\n');
    process.exit(0);
  }
}

main();
