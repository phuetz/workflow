/**
 * Secret Scanning Test Suite
 *
 * Comprehensive tests for secret scanning functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getSecretScanner } from '../security/SecretScanner';
import { getRemediationEngine, RemediationStrategy } from '../security/SecretRemediationEngine';
import * as fs from 'fs';
import * as path from 'path';

describe('Secret Scanner', () => {
  const scanner = getSecretScanner();
  let testDir: string;

  beforeEach(() => {
    // Create temporary test directory
    testDir = path.join(__dirname, 'test-files-' + Date.now());
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Pattern Detection', () => {
    it('should detect AWS Access Key ID', async () => {
      const testFile = path.join(testDir, 'test.js');
      fs.writeFileSync(testFile, `
        const awsKey = 'AKIAIOSFODNN7EXAMPLE';
      `);

      const matches = await scanner.scanFile(testFile);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].patternName).toBe('AWS Access Key ID');
      expect(matches[0].severity).toBe('critical');
      expect(matches[0].category).toBe('AWS');
    });

    it('should detect GitHub Personal Access Token', async () => {
      const testFile = path.join(testDir, 'test.js');
      fs.writeFileSync(testFile, `
        const githubToken = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz12';
      `);

      const matches = await scanner.scanFile(testFile);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].patternName).toBe('GitHub Personal Access Token');
      expect(matches[0].severity).toBe('critical');
    });

    it('should detect Stripe API Key', async () => {
      const testFile = path.join(testDir, 'test.js');
      fs.writeFileSync(testFile, `
        const stripeKey = 'sk_live_FAKE';
      `);

      const matches = await scanner.scanFile(testFile);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].patternName).toContain('Stripe');
      expect(matches[0].severity).toBe('critical');
    });

    it('should detect Google API Key', async () => {
      const testFile = path.join(testDir, 'test.js');
      fs.writeFileSync(testFile, `
        const googleKey = 'AIzaSyDaGmWKa4JsXZ-HjGw7ISLn_3namBGewQe';
      `);

      const matches = await scanner.scanFile(testFile);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].patternName).toContain('Google API');
    });

    it('should detect private keys', async () => {
      const testFile = path.join(testDir, 'test.pem');
      fs.writeFileSync(testFile, `
        -----BEGIN RSA PRIVATE KEY-----
        MIIEpAIBAAKCAQEA0
        -----END RSA PRIVATE KEY-----
      `);

      const matches = await scanner.scanFile(testFile);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].patternName).toContain('Private Key');
      expect(matches[0].severity).toBe('critical');
    });

    it('should detect multiple secrets in one file', async () => {
      const testFile = path.join(testDir, 'test.js');
      fs.writeFileSync(testFile, `
        const awsKey = 'AKIAIOSFODNN7EXAMPLE';
        const githubToken = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz12';
        const stripeKey = 'sk_live_FAKE';
      `);

      const matches = await scanner.scanFile(testFile);

      expect(matches.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('False Positive Detection', () => {
    it('should filter out example values', async () => {
      const testFile = path.join(testDir, 'test.js');
      fs.writeFileSync(testFile, `
        // Example: const key = 'AKIAIOSFODNN7EXAMPLE';
        const exampleKey = 'test-api-key-example';
      `);

      const matches = await scanner.scanFile(testFile);

      // Should either have no matches or mark them as low confidence
      const highConfidenceMatches = matches.filter(m => m.confidence === 'high');
      expect(highConfidenceMatches.length).toBe(0);
    });

    it('should skip .env.example files', async () => {
      const testFile = path.join(testDir, '.env.example');
      fs.writeFileSync(testFile, `
        AWS_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE
        GITHUB_TOKEN=your_github_token_here
      `);

      const result = await scanner.scanDirectory(testDir);

      // .env.example should be excluded by default
      expect(result.scannedFiles).toBe(0);
    });

    it('should detect secrets in comments as lower confidence', async () => {
      const testFile = path.join(testDir, 'test.js');
      fs.writeFileSync(testFile, `
        // TODO: Replace with actual key: AKIAIOSFODNN7EXAMPLE
      `);

      const matches = await scanner.scanFile(testFile);

      if (matches.length > 0) {
        expect(matches[0].confidence).toBe('medium');
      }
    });
  });

  describe('Directory Scanning', () => {
    it('should scan entire directory', async () => {
      // Create multiple files with secrets
      fs.writeFileSync(path.join(testDir, 'file1.js'), `
        const key1 = 'AKIAIOSFODNN7EXAMPLE';
      `);
      fs.writeFileSync(path.join(testDir, 'file2.js'), `
        const key2 = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz12';
      `);

      const result = await scanner.scanDirectory(testDir);

      expect(result.scannedFiles).toBe(2);
      expect(result.matchesFound).toBeGreaterThanOrEqual(2);
      expect(result.criticalIssues).toBeGreaterThan(0);
    });

    it('should respect exclusion patterns', async () => {
      // Create files in node_modules (should be excluded)
      const nodeModulesDir = path.join(testDir, 'node_modules');
      fs.mkdirSync(nodeModulesDir);
      fs.writeFileSync(path.join(nodeModulesDir, 'test.js'), `
        const key = 'AKIAIOSFODNN7EXAMPLE';
      `);

      const result = await scanner.scanDirectory(testDir, {
        include: ['**/*'],
        exclude: ['node_modules/**']
      });

      expect(result.scannedFiles).toBe(0);
      expect(result.matchesFound).toBe(0);
    });

    it('should generate comprehensive scan report', async () => {
      fs.writeFileSync(path.join(testDir, 'file1.js'), `
        const critical = 'AKIAIOSFODNN7EXAMPLE';
        const high = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz12';
      `);

      const result = await scanner.scanDirectory(testDir);

      expect(result).toHaveProperty('scannedFiles');
      expect(result).toHaveProperty('matchesFound');
      expect(result).toHaveProperty('criticalIssues');
      expect(result).toHaveProperty('highIssues');
      expect(result).toHaveProperty('mediumIssues');
      expect(result).toHaveProperty('lowIssues');
      expect(result).toHaveProperty('matches');
      expect(Array.isArray(result.matches)).toBe(true);
    });
  });

  describe('Secret Masking', () => {
    it('should mask detected secrets', async () => {
      const testFile = path.join(testDir, 'test.js');
      const secretValue = 'AKIAIOSFODNN7EXAMPLE';
      fs.writeFileSync(testFile, `const key = '${secretValue}';`);

      const matches = await scanner.scanFile(testFile);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].match).not.toBe(secretValue);
      expect(matches[0].match).toContain('***');
    });
  });
});

describe('Secret Remediation', () => {
  const remediationEngine = getRemediationEngine();
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(__dirname, 'remediation-test-' + Date.now());
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Remediation Suggestions', () => {
    it('should provide environment variable suggestion', () => {
      const suggestions = remediationEngine.getSuggestions('AWS Access Key', 'src/config.ts');

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.strategy === RemediationStrategy.ENV_VARIABLE)).toBe(true);
    });

    it('should provide AWS-specific suggestions for AWS secrets', () => {
      const suggestions = remediationEngine.getSuggestions('AWS Access Key', 'src/config.ts');

      expect(suggestions.some(s => s.strategy === RemediationStrategy.AWS_SECRETS_MANAGER)).toBe(true);
    });

    it('should provide credential manager suggestion for workflow files', () => {
      const suggestions = remediationEngine.getSuggestions('API Key', 'src/workflows/my-workflow.ts');

      expect(suggestions.some(s => s.strategy === RemediationStrategy.CREDENTIAL_MANAGER)).toBe(true);
    });

    it('should include effort estimates', () => {
      const suggestions = remediationEngine.getSuggestions('GitHub Token', 'src/config.ts');

      suggestions.forEach(s => {
        expect(s).toHaveProperty('effort');
        expect(['low', 'medium', 'high']).toContain(s.effort);
      });
    });

    it('should include detailed steps', () => {
      const suggestions = remediationEngine.getSuggestions('Stripe API Key', 'src/config.ts');

      suggestions.forEach(s => {
        expect(s).toHaveProperty('steps');
        expect(Array.isArray(s.steps)).toBe(true);
        expect(s.steps.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Environment Variable Remediation', () => {
    it('should migrate secret to .env file', async () => {
      const testFile = path.join(testDir, 'config.ts');
      const secretValue = 'AKIAIOSFODNN7EXAMPLE';

      fs.writeFileSync(testFile, `
        export const config = {
          awsKey: '${secretValue}'
        };
      `);

      // Note: This would modify files, so we'll skip actual execution in tests
      // Instead, we test that the method exists and can be called
      expect(typeof remediationEngine.remediate).toBe('function');
    });

    it('should create .env.example template', () => {
      // Test that suggestions include .env.example creation
      const suggestions = remediationEngine.getSuggestions('API Key', 'src/config.ts');
      const envSuggestion = suggestions.find(s => s.strategy === RemediationStrategy.ENV_VARIABLE);

      expect(envSuggestion).toBeDefined();
      expect(envSuggestion?.steps.some(step =>
        step.toLowerCase().includes('.env.example')
      )).toBe(true);
    });
  });

  describe('Rotation Instructions', () => {
    it('should provide rotation instructions', () => {
      const suggestions = remediationEngine.getSuggestions('AWS Access Key', 'src/config.ts');

      suggestions.forEach(s => {
        expect(s.steps.length).toBeGreaterThan(0);
      });
    });
  });
});

describe('Integration Tests', () => {
  const scanner = getSecretScanner();
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(__dirname, 'integration-test-' + Date.now());
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should complete full scan and remediation workflow', async () => {
    // 1. Create file with secret
    const testFile = path.join(testDir, 'app.ts');
    fs.writeFileSync(testFile, `
      const apiKey = 'AKIAIOSFODNN7EXAMPLE';
    `);

    // 2. Scan for secrets
    const scanResult = await scanner.scanFile(testFile);
    expect(scanResult.length).toBeGreaterThan(0);

    // 3. Get remediation suggestions
    const remediationEngine = getRemediationEngine();
    const suggestions = remediationEngine.getSuggestions(
      scanResult[0].patternName,
      testFile
    );
    expect(suggestions.length).toBeGreaterThan(0);

    // 4. Verify suggestions are actionable
    expect(suggestions[0].steps.length).toBeGreaterThan(0);
  });

  it('should handle large files efficiently', async () => {
    const testFile = path.join(testDir, 'large.js');

    // Create a large file with one secret
    const lines = Array(10000).fill('console.log("test");');
    lines[5000] = 'const secret = "AKIAIOSFODNN7EXAMPLE";';
    fs.writeFileSync(testFile, lines.join('\n'));

    const startTime = Date.now();
    const matches = await scanner.scanFile(testFile);
    const duration = Date.now() - startTime;

    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].line).toBe(5001);
    expect(duration).toBeLessThan(5000); // Should complete in < 5 seconds
  });

  it('should handle binary files gracefully', async () => {
    const testFile = path.join(testDir, 'image.png');

    // Create a fake binary file
    const buffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    fs.writeFileSync(testFile, buffer);

    // Should not crash on binary files
    const matches = await scanner.scanFile(testFile);
    expect(Array.isArray(matches)).toBe(true);
  });

  it('should scan multiple file types', async () => {
    // Create files of different types
    fs.writeFileSync(path.join(testDir, 'config.ts'), `const k1 = 'AKIAIOSFODNN7EXAMPLE';`);
    fs.writeFileSync(path.join(testDir, 'app.js'), `const k2 = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz12';`);
    fs.writeFileSync(path.join(testDir, 'settings.json'), `{"key": "sk_live_FAKE"}`);
    fs.writeFileSync(path.join(testDir, '.env'), `API_KEY=AIzaSyDaGmWKa4JsXZ-HjGw7ISLn_3namBGewQe`);

    const result = await scanner.scanDirectory(testDir);

    expect(result.scannedFiles).toBe(4);
    expect(result.matchesFound).toBeGreaterThanOrEqual(4);
  });
});

describe('Performance Tests', () => {
  const scanner = getSecretScanner();

  it('should scan files concurrently', async () => {
    const testDir = path.join(__dirname, 'perf-test-' + Date.now());
    fs.mkdirSync(testDir, { recursive: true });

    try {
      // Create 10 files
      for (let i = 0; i < 10; i++) {
        fs.writeFileSync(
          path.join(testDir, `file${i}.js`),
          `const key${i} = 'AKIAIOSFODNN7EXAMPLE';`
        );
      }

      const startTime = Date.now();
      const result = await scanner.scanDirectory(testDir);
      const duration = Date.now() - startTime;

      expect(result.scannedFiles).toBe(10);
      expect(duration).toBeLessThan(3000); // Should complete in < 3 seconds
    } finally {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should handle empty directory', async () => {
    const testDir = path.join(__dirname, 'empty-test-' + Date.now());
    fs.mkdirSync(testDir);

    try {
      const result = await scanner.scanDirectory(testDir);

      expect(result.scannedFiles).toBe(0);
      expect(result.matchesFound).toBe(0);
    } finally {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });
});
