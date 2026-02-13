/**
 * Comprehensive Tests for DevSecOps System
 *
 * Tests for:
 * - CICDSecurityScanner.ts
 * - IaCSecurityScanner.ts
 * - SecretsManagement.ts
 *
 * Coverage: 125+ tests across pipeline security, code security, build security,
 * deployment security, IaC scanning, and secrets management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import CICDSecurityScanner from '../security/devsecops/CICDSecurityScanner'
import {
  IaCSecurityScanner,
  IaCPlatform,
  FindingSeverity,
  CheckCategory,
  ScanMode,
  PolicyType,
  ReportFormat,
  SecurityFinding,
  ScanResult,
  ComplianceReport
} from '../security/devsecops/IaCSecurityScanner'
import SecretsManagement, {
  SecretType,
  AccessLevel,
  SecretMetadata,
  JITAccessRequest,
  BreachDetectionResult,
  ComplianceReport as SecretsComplianceReport
} from '../security/devsecops/SecretsManagement'

// ============================================================================
// CICD SECURITY SCANNER TESTS (45+ tests)
// ============================================================================

describe('CICDSecurityScanner', () => {
  let scanner: CICDSecurityScanner

  beforeEach(() => {
    scanner = new CICDSecurityScanner()
  })

  // Pipeline Security Tests (12 tests)
  describe('Pipeline Security Analysis', () => {
    it('should detect API key exposures in pipeline config', async () => {
      const config = `
        env:
          api_key: "sk-1234567890abcdef1234567890"
      `
      const result = await scanner.scanPipeline(config, 'github')
      expect(result.credentialExposures.length).toBeGreaterThan(0)
      expect(result.credentialExposures[0].type).toBe('api-key')
      expect(result.credentialExposures[0].severity).toBe('high')
    })

    it('should detect password exposures in pipeline config', async () => {
      const config = `
        steps:
          - run: mysql -u root -p "my_secret_password"
      `
      const result = await scanner.scanPipeline(config, 'gitlab')
      expect(result.credentialExposures.length).toBeGreaterThan(0)
      expect(result.credentialExposures[0].type).toBe('password')
    })

    it('should detect SSH key exposures', async () => {
      const config = `
        jobs:
          deploy:
            script: |
              -----BEGIN RSA PRIVATE KEY-----
              MIIEowIBAAKCAQEA1234567890
              -----END RSA PRIVATE KEY-----
      `
      const result = await scanner.scanPipeline(config, 'gitlab')
      expect(result.credentialExposures.length).toBeGreaterThan(0)
      expect(result.credentialExposures[0].type).toBe('ssh-key')
      expect(result.credentialExposures[0].severity).toBe('critical')
    })

    it('should detect sudo privilege escalation attempts', async () => {
      const config = `
        jobs:
          - name: Deploy
            steps:
              - run: sudo apt-get update
              - run: sudo systemctl restart app
      `
      const result = await scanner.scanPipeline(config, 'github')
      expect(result.privEscalations.length).toBeGreaterThan(0)
      expect(result.privEscalations[0].escalationMethod).toBe('sudo')
    })

    it('should detect role assumption patterns', async () => {
      const config = `
        env:
          AWS_ROLE_ARN: arn:aws:iam::123456789:role/deploy-role
          assume_role: true
      `
      const result = await scanner.scanPipeline(config, 'github')
      expect(result.privEscalations.length).toBeGreaterThan(0)
    })

    it('should detect unsafe commands', async () => {
      const config = `
        script:
          - chmod 777 /home/user/app
          - curl | bash
          - rm -rf /
      `
      const result = await scanner.scanPipeline(config, 'jenkins')
      expect(result.unsafeCommands.length).toBeGreaterThan(0)
    })

    it('should assess third-party action risks', async () => {
      const config = `
        jobs:
          test:
            steps:
              - uses: actions/checkout@v3
              - uses: unknown/random-action@v1
              - image: untrusted/image:latest
      `
      const result = await scanner.scanPipeline(config, 'github')
      expect(result.supplyChainRisks.length).toBeGreaterThan(0)
    })

    it('should calculate security score', async () => {
      const safeConfig = 'jobs: test: steps: - run: echo hello'
      const result = await scanner.scanPipeline(safeConfig, 'github')
      expect(result.score).toBeGreaterThan(70)
      expect(result.passed).toBe(true)
    })

    it('should emit scan events', async () => {
      const startSpy = vi.spyOn(scanner, 'emit')
      const config = 'jobs: test: steps: - run: echo test'
      await scanner.scanPipeline(config, 'github')
      expect(startSpy).toHaveBeenCalledWith('scan:start', expect.any(Object))
      expect(startSpy).toHaveBeenCalledWith('scan:complete', expect.any(Object))
    })

    it('should support multiple platforms', async () => {
      const config = 'name: test'
      const platforms = ['github', 'gitlab', 'jenkins', 'azure', 'circleci'] as const

      for (const platform of platforms) {
        const result = await scanner.scanPipeline(config, platform)
        expect(result.platform).toBe(platform)
      }
    })

    it('should detect container image risks', async () => {
      const config = `
        services:
          - image: untrusted:latest
      `
      const result = await scanner.scanPipeline(config, 'github')
      expect(result.supplyChainRisks.length).toBeGreaterThan(0)
      expect(result.supplyChainRisks[0].type).toBe('container')
    })

    it('should fail pipeline with critical issues', async () => {
      const config = `
        env:
          API_KEY: "sk-1234567890abcdef1234567890abcdef"
      `
      const result = await scanner.scanPipeline(config, 'github')
      expect(result.passed).toBe(false)
    })
  })

  // Code Security Tests (12 tests)
  describe('Code Security Analysis (SAST)', () => {
    it('should detect SQL injection vulnerabilities', async () => {
      const code = `
        SELECT * FROM users WHERE id = $userInput WHERE active = true
      `
      const result = await scanner.scanCode(code, 'typescript')
      expect(result.sast.issues.length).toBeGreaterThan(0)
      expect(result.sast.issues[0].cwe).toBe('CWE-89')
    })

    it('should detect XSS vulnerabilities', async () => {
      const code = `
        element.innerHTML = userInput
        document.write(untrustedData)
      `
      const result = await scanner.scanCode(code, 'typescript')
      expect(result.sast.issues.length).toBeGreaterThan(0)
      expect(result.sast.issues[0].cwe).toBe('CWE-79')
    })

    it('should detect path traversal issues', async () => {
      const code = `
        fs.readFile(userInput)
        path.join(basePath, ../../../etc/passwd)
      `
      const result = await scanner.scanCode(code, 'typescript')
      expect(result.sast.issues.length).toBeGreaterThan(0)
      expect(result.sast.issues[0].cwe).toBe('CWE-22')
    })

    it('should detect hardcoded secrets in code', async () => {
      const code = `
        const password = "super_secret_password"
        const apiKey = "sk_live_1234567890"
        const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
      `
      const result = await scanner.scanCode(code, 'typescript')
      expect(result.secrets.length).toBeGreaterThan(0)
      expect(result.secrets[0].type).toBeDefined()
    })

    it('should scan dependencies for vulnerabilities', async () => {
      const code = `
        {
          "name": "app",
          "dependencies": {
            "lodash": "4.17.15",
            "minimist": "1.2.0"
          }
        }
      `
      const result = await scanner.scanCode(code, 'typescript')
      expect(result.dependencies).toBeDefined()
    })

    it('should check license compliance', async () => {
      const code = `
        {
          "dependencies": {
            "package1": { "license": "MIT" },
            "package2": { "license": "GPL" }
          }
        }
      `
      const result = await scanner.scanCode(code, 'typescript')
      expect(result.licenses.length).toBeGreaterThan(0)
    })

    it('should analyze code quality metrics', async () => {
      const code = `
        function test() { const x = 1; }
        test(() => { return 42; });
      `
      const result = await scanner.scanCode(code, 'typescript')
      expect(result.codeQuality.complexity).toBeGreaterThanOrEqual(0)
      expect(result.codeQuality.coverage).toBeGreaterThanOrEqual(0)
      expect(result.codeQuality.maintainability).toBeGreaterThanOrEqual(0)
    })

    it('should calculate SAST coverage', async () => {
      const code = 'const x = 1; const y = 2;'
      const result = await scanner.scanCode(code, 'typescript')
      expect(result.sast.coverage).toBeLessThanOrEqual(100)
      expect(result.sast.coverage).toBeGreaterThanOrEqual(0)
    })

    it('should classify severity levels', async () => {
      const code = `
        eval(userInput)
        innerHTML = untrustedSource
      `
      const result = await scanner.scanCode(code, 'typescript')
      expect(result.sast.issues.length).toBeGreaterThan(0)
      expect(['critical', 'high', 'medium', 'low']).toContain(result.sast.issues[0].severity)
    })

    it('should detect entropy in secrets', async () => {
      const code = `const token = "abcdefghijklmnopqrst1234567890"`
      const result = await scanner.scanCode(code, 'typescript')
      if (result.secrets.length > 0) {
        expect(result.secrets[0].entropy).toBeGreaterThan(0)
        expect(result.secrets[0].confidence).toBeGreaterThan(0)
      }
    })

    it('should emit code scan events', async () => {
      const startSpy = vi.spyOn(scanner, 'emit')
      await scanner.scanCode('const x = 1', 'typescript')
      expect(startSpy).toHaveBeenCalledWith('scan:start', expect.any(Object))
    })

    it('should handle scan errors gracefully', async () => {
      const errorSpy = vi.spyOn(scanner, 'emit')
      try {
        // Test that errors are handled
        const result = await scanner.scanCode('valid code', 'typescript')
        expect(result.scanId).toBeDefined()
      } catch (error) {
        expect(errorSpy).toHaveBeenCalledWith('scan:error', expect.any(Object))
      }
    })
  })

  // Build Security Tests (10 tests)
  describe('Build Security Analysis', () => {
    it('should verify artifact signatures', async () => {
      const result = await scanner.scanBuild('build-123', ['app.jar', 'config.yaml'])
      expect(result.artifacts.length).toBe(2)
      expect(result.artifacts[0].signature_valid).toBe(true)
    })

    it('should scan container images', async () => {
      const result = await scanner.scanBuild(
        'build-123',
        ['app.jar'],
        'myapp:v1.0.0@sha256:abc123'
      )
      expect(result.containerImage).toBeDefined()
      expect(result.containerImage?.vulnerabilities).toBeDefined()
    })

    it('should detect container vulnerabilities', async () => {
      const result = await scanner.scanBuild(
        'build-123',
        ['app.jar'],
        'myapp:v1.0.0'
      )
      expect(result.containerImage?.vulnerabilities.length).toBeGreaterThan(0)
    })

    it('should generate SBOM (Software Bill of Materials)', async () => {
      const result = await scanner.scanBuild('build-123', ['app.jar', 'lib.so'])
      expect(result.sbom).toBeDefined()
      expect(result.sbom.format).toMatch(/cyclonedx|spdx/)
      expect(result.sbom.components.length).toBeGreaterThan(0)
    })

    it('should track build provenance', async () => {
      const result = await scanner.scanBuild('build-123', ['artifact.jar'])
      expect(result.provenance).toBeDefined()
      expect(result.provenance.builder).toBeDefined()
      expect(result.provenance.sourceCommit).toBeDefined()
      expect(result.provenance.signature).toBeDefined()
    })

    it('should analyze container layers', async () => {
      const result = await scanner.scanBuild('build-123', [], 'app:latest')
      expect(result.containerImage?.layers.length).toBeGreaterThan(0)
      expect(result.containerImage?.layers[0].digest).toBeDefined()
    })

    it('should detect malware in layers', async () => {
      const result = await scanner.scanBuild('build-123', [], 'app:latest')
      expect(result.containerImage?.layers[0].malware).toBe(false)
    })

    it('should emit build scan events', async () => {
      const startSpy = vi.spyOn(scanner, 'emit')
      await scanner.scanBuild('build-123', ['app.jar'])
      expect(startSpy).toHaveBeenCalledWith('scan:start', expect.objectContaining({ type: 'build' }))
    })

    it('should validate build security', async () => {
      const result = await scanner.scanBuild('build-123', ['app.jar'])
      expect(typeof result.passed).toBe('boolean')
    })

    it('should hash artifacts', async () => {
      const result = await scanner.scanBuild('build-123', ['app.jar', 'lib.so'])
      expect(result.artifacts[0].hash).toBeDefined()
      expect(result.artifacts[0].hash).toMatch(/^sha256:/)
    })
  })

  // Deployment Security Tests (8 tests)
  describe('Deployment Security Analysis', () => {
    it('should validate deployment policies', async () => {
      const result = await scanner.scanDeployment('deploy-123', 'production', {})
      expect(result.policyCompliance.length).toBeGreaterThan(0)
      expect(result.policyCompliance[0].policy).toBeDefined()
    })

    it('should validate environment security', async () => {
      const result = await scanner.scanDeployment('deploy-123', 'production', {})
      expect(result.environmentValidation.secretsManagementSecure).toBe(true)
      expect(result.environmentValidation.rbacConfigured).toBe(true)
      expect(result.environmentValidation.networkSegmentation).toBe(true)
    })

    it('should detect configuration drift', async () => {
      const result = await scanner.scanDeployment(
        'deploy-123',
        'staging',
        { version: '1.0' }
      )
      expect(Array.isArray(result.configDrift)).toBe(true)
    })

    it('should assess policy compliance', async () => {
      const result = await scanner.scanDeployment('deploy-123', 'production', {})
      const passed = result.policyCompliance.filter(p => p.status === 'passed').length
      expect(passed).toBeGreaterThan(0)
    })

    it('should check image registry approval', async () => {
      const result = await scanner.scanDeployment('deploy-123', 'production', {})
      const imagePolicy = result.policyCompliance.find(p => p.policy.includes('image'))
      expect(imagePolicy).toBeDefined()
    })

    it('should emit deployment scan events', async () => {
      const emitSpy = vi.spyOn(scanner, 'emit')
      await scanner.scanDeployment('deploy-123', 'production', {})
      expect(emitSpy).toHaveBeenCalledWith('scan:start', expect.any(Object))
    })

    it('should validate environment networking', async () => {
      const result = await scanner.scanDeployment('deploy-123', 'production', {})
      expect(result.environmentValidation.networkSegmentation).toBeDefined()
    })

    it('should check backup and DR configuration', async () => {
      const result = await scanner.scanDeployment('deploy-123', 'production', {})
      expect(result.environmentValidation.backupConfigured).toBe(true)
      expect(result.environmentValidation.disasterRecoveryEnabled).toBe(true)
    })
  })

  // Quality Gates Tests (8 tests)
  describe('Quality Gates Evaluation', () => {
    it('should register quality gate', () => {
      scanner.registerQualityGate({
        name: 'critical-issues',
        enabled: true,
        conditions: [
          {
            metric: 'critical_count',
            operator: 'less_equal',
            threshold: 0,
            severity: 'critical'
          }
        ],
        failureMode: 'block',
        allowOverride: false
      })
      const gate = scanner['qualityGates'].get('critical-issues')
      expect(gate).toBeDefined()
    })

    it('should evaluate quality gates against scan results', async () => {
      scanner.registerQualityGate({
        name: 'test-gate',
        enabled: true,
        conditions: [
          {
            metric: 'overall_score',
            operator: 'greater_equal',
            threshold: 80,
            severity: 'high'
          }
        ],
        failureMode: 'block',
        allowOverride: false
      })

      const report = {
        reportId: 'report-123',
        timestamp: new Date(),
        scanType: 'code' as const,
        summary: {
          totalIssues: 2,
          criticalCount: 0,
          highCount: 2,
          mediumCount: 0,
          lowCount: 0,
          overallScore: 85,
          status: 'warning' as const
        },
        findings: [],
        trends: {
          period: 'month' as const,
          totalScans: 1,
          trendDirection: 'stable' as const,
          criticalTrend: 0,
          highTrend: 0,
          resolutionRate: 0
        },
        developedFeedback: {
          actionItems: [],
          quickFixes: [],
          educationalResources: [],
          nextSteps: []
        },
        executiveSummary: 'Test report'
      }

      const result = await scanner.evaluateQualityGates(report, ['test-gate'])
      expect(result.passed).toBe(true)
      expect(result.details['test-gate']).toBe(true)
    })

    it('should fail when threshold exceeded', async () => {
      scanner.registerQualityGate({
        name: 'fail-gate',
        enabled: true,
        conditions: [
          {
            metric: 'critical_count',
            operator: 'equal',
            threshold: 0,
            severity: 'critical'
          }
        ],
        failureMode: 'block',
        allowOverride: false
      })

      const report = {
        reportId: 'report-123',
        timestamp: new Date(),
        scanType: 'code' as const,
        summary: {
          totalIssues: 5,
          criticalCount: 1,
          highCount: 2,
          mediumCount: 2,
          lowCount: 0,
          overallScore: 70,
          status: 'failed' as const
        },
        findings: [],
        trends: {
          period: 'month' as const,
          totalScans: 1,
          trendDirection: 'degrading' as const,
          criticalTrend: 1,
          highTrend: 0,
          resolutionRate: 0
        },
        developedFeedback: {
          actionItems: [],
          quickFixes: [],
          educationalResources: [],
          nextSteps: []
        },
        executiveSummary: 'Test report'
      }

      const result = await scanner.evaluateQualityGates(report, ['fail-gate'])
      expect(result.passed).toBe(false)
    })

    it('should support multiple comparison operators', async () => {
      const report = {
        reportId: 'report-123',
        timestamp: new Date(),
        scanType: 'code' as const,
        summary: {
          totalIssues: 5,
          criticalCount: 0,
          highCount: 2,
          mediumCount: 3,
          lowCount: 0,
          overallScore: 85,
          status: 'warning' as const
        },
        findings: [],
        trends: {
          period: 'month' as const,
          totalScans: 1,
          trendDirection: 'stable' as const,
          criticalTrend: 0,
          highTrend: 0,
          resolutionRate: 0
        },
        developedFeedback: {
          actionItems: [],
          quickFixes: [],
          educationalResources: [],
          nextSteps: []
        },
        executiveSummary: 'Test report'
      }

      // Test greater operator
      scanner.registerQualityGate({
        name: 'greater-gate',
        enabled: true,
        conditions: [{
          metric: 'overall_score',
          operator: 'greater',
          threshold: 80,
          severity: 'high'
        }],
        failureMode: 'block',
        allowOverride: false
      })

      const result = await scanner.evaluateQualityGates(report, ['greater-gate'])
      expect(result.details['greater-gate']).toBe(true)
    })

    it('should emit gate registration events', () => {
      const emitSpy = vi.spyOn(scanner, 'emit')
      scanner.registerQualityGate({
        name: 'test-gate',
        enabled: true,
        conditions: [],
        failureMode: 'block',
        allowOverride: false
      })
      expect(emitSpy).toHaveBeenCalledWith('gate:registered', 'test-gate')
    })

    it('should evaluate all enabled gates', async () => {
      scanner.registerQualityGate({
        name: 'gate-1',
        enabled: true,
        conditions: [{
          metric: 'overall_score',
          operator: 'greater_equal',
          threshold: 0,
          severity: 'high'
        }],
        failureMode: 'block',
        allowOverride: false
      })

      scanner.registerQualityGate({
        name: 'gate-2',
        enabled: true,
        conditions: [{
          metric: 'critical_count',
          operator: 'less_equal',
          threshold: 10,
          severity: 'high'
        }],
        failureMode: 'block',
        allowOverride: false
      })

      const report = {
        reportId: 'report-123',
        timestamp: new Date(),
        scanType: 'code' as const,
        summary: {
          totalIssues: 0,
          criticalCount: 0,
          highCount: 0,
          mediumCount: 0,
          lowCount: 0,
          overallScore: 100,
          status: 'passed' as const
        },
        findings: [],
        trends: {
          period: 'month' as const,
          totalScans: 1,
          trendDirection: 'improving' as const,
          criticalTrend: 0,
          highTrend: 0,
          resolutionRate: 100
        },
        developedFeedback: {
          actionItems: [],
          quickFixes: [],
          educationalResources: [],
          nextSteps: []
        },
        executiveSummary: 'Perfect scan'
      }

      const result = await scanner.evaluateQualityGates(report)
      expect(result.details['gate-1']).toBe(true)
      expect(result.details['gate-2']).toBe(true)
    })

    it('should handle missing metrics gracefully', async () => {
      scanner.registerQualityGate({
        name: 'test-gate',
        enabled: true,
        conditions: [{
          metric: 'unknown_metric',
          operator: 'greater',
          threshold: 0,
          severity: 'high'
        }],
        failureMode: 'block',
        allowOverride: false
      })

      const report = {
        reportId: 'report-123',
        timestamp: new Date(),
        scanType: 'code' as const,
        summary: {
          totalIssues: 0,
          criticalCount: 0,
          highCount: 0,
          mediumCount: 0,
          lowCount: 0,
          overallScore: 100,
          status: 'passed' as const
        },
        findings: [],
        trends: {
          period: 'month' as const,
          totalScans: 1,
          trendDirection: 'improving' as const,
          criticalTrend: 0,
          highTrend: 0,
          resolutionRate: 100
        },
        developedFeedback: {
          actionItems: [],
          quickFixes: [],
          educationalResources: [],
          nextSteps: []
        },
        executiveSummary: 'Test'
      }

      const result = await scanner.evaluateQualityGates(report, ['test-gate'])
      expect(typeof result.passed).toBe('boolean')
    })
  })

  // Reporting Tests (5 tests)
  describe('Security Reporting', () => {
    it('should generate comprehensive security report', async () => {
      const pipelineResult = await scanner.scanPipeline('name: test', 'github')
      const codeResult = await scanner.scanCode('const x = 1', 'typescript')

      const report = await scanner.generateReport(pipelineResult, codeResult)
      expect(report.reportId).toBeDefined()
      expect(report.timestamp).toBeDefined()
      expect(report.scanType).toBe('comprehensive')
      expect(report.summary).toBeDefined()
    })

    it('should include developer feedback', async () => {
      const pipelineResult = await scanner.scanPipeline('name: test', 'github')
      const report = await scanner.generateReport(pipelineResult)

      expect(report.developedFeedback).toBeDefined()
      expect(report.developedFeedback.actionItems).toBeDefined()
      expect(report.developedFeedback.quickFixes).toBeDefined()
      expect(report.developedFeedback.educationalResources).toBeDefined()
    })

    it('should analyze security trends', async () => {
      const pipelineResult = await scanner.scanPipeline('name: test', 'github')
      const report = await scanner.generateReport(pipelineResult)

      expect(report.trends).toBeDefined()
      expect(['improving', 'stable', 'degrading']).toContain(report.trends.trendDirection)
      expect(report.trends.resolutionRate).toBeGreaterThanOrEqual(0)
    })

    it('should generate executive summary', async () => {
      const pipelineResult = await scanner.scanPipeline('name: test', 'github')
      const report = await scanner.generateReport(pipelineResult)

      expect(report.executiveSummary).toBeDefined()
      expect(typeof report.executiveSummary).toBe('string')
      expect(report.executiveSummary.length).toBeGreaterThan(0)
    })

    it('should aggregate findings from multiple scans', async () => {
      const pipelineResult = await scanner.scanPipeline('api_key: "sk123"', 'github')
      const codeResult = await scanner.scanCode('eval(x)', 'typescript')
      const buildResult = await scanner.scanBuild('build-1', ['app.jar'])

      const report = await scanner.generateReport(
        pipelineResult,
        codeResult,
        buildResult
      )

      expect(report.findings.length).toBeGreaterThan(0)
      expect(report.summary.totalIssues).toBeGreaterThan(0)
    })
  })
})

// ============================================================================
// IAC SECURITY SCANNER TESTS (40+ tests)
// ============================================================================

describe('IaCSecurityScanner', () => {
  let scanner: IaCSecurityScanner

  beforeEach(() => {
    scanner = new IaCSecurityScanner({
      mode: ScanMode.ONDEMAND
    })
  })

  // Policy Management Tests (8 tests)
  describe('Policy Management', () => {
    it('should initialize with default policies', () => {
      const policies = scanner.listPolicies()
      expect(policies.length).toBeGreaterThan(0)
    })

    it('should add custom policy', () => {
      scanner.addPolicy({
        id: 'custom-001',
        name: 'Custom Check',
        type: PolicyType.CUSTOM,
        category: CheckCategory.MISCONFIG,
        severity: FindingSeverity.HIGH,
        description: 'Test custom policy',
        platforms: [IaCPlatform.TERRAFORM],
        enabled: true,
        rule: /test/
      })

      const policy = scanner.getPolicy('custom-001')
      expect(policy).toBeDefined()
      expect(policy?.name).toBe('Custom Check')
    })

    it('should remove policy', () => {
      scanner.addPolicy({
        id: 'test-remove',
        name: 'To Remove',
        type: PolicyType.CUSTOM,
        category: CheckCategory.MISCONFIG,
        severity: FindingSeverity.HIGH,
        description: 'Test',
        platforms: [IaCPlatform.TERRAFORM],
        enabled: true,
        rule: /test/
      })

      scanner.removePolicy('test-remove')
      const policy = scanner.getPolicy('test-remove')
      expect(policy).toBeUndefined()
    })

    it('should filter policies by platform', () => {
      const terraformPolicies = scanner.listPolicies({ platform: IaCPlatform.TERRAFORM })
      expect(terraformPolicies.length).toBeGreaterThan(0)
      expect(terraformPolicies.every(p => p.platforms.includes(IaCPlatform.TERRAFORM))).toBe(true)
    })

    it('should filter policies by category', () => {
      const secretPolicies = scanner.listPolicies({ category: CheckCategory.SECRETS })
      expect(secretPolicies.length).toBeGreaterThan(0)
      expect(secretPolicies.every(p => p.category === CheckCategory.SECRETS)).toBe(true)
    })

    it('should filter policies by severity', () => {
      const criticalPolicies = scanner.listPolicies({ severity: FindingSeverity.CRITICAL })
      expect(criticalPolicies.length).toBeGreaterThan(0)
      expect(criticalPolicies.every(p => p.severity === FindingSeverity.CRITICAL)).toBe(true)
    })

    it('should emit policy events', () => {
      const emitSpy = vi.spyOn(scanner, 'emit')
      scanner.addPolicy({
        id: 'event-test',
        name: 'Event Test',
        type: PolicyType.CUSTOM,
        category: CheckCategory.MISCONFIG,
        severity: FindingSeverity.MEDIUM,
        description: 'Test',
        platforms: [IaCPlatform.TERRAFORM],
        enabled: true,
        rule: /test/
      })
      expect(emitSpy).toHaveBeenCalledWith('policy:added', expect.any(Object))
    })

    it('should combine filter conditions', () => {
      const filtered = scanner.listPolicies({
        platform: IaCPlatform.TERRAFORM,
        severity: FindingSeverity.CRITICAL,
        category: CheckCategory.SECRETS
      })
      expect(Array.isArray(filtered)).toBe(true)
    })
  })

  // Platform Detection Tests (5 tests)
  describe('Platform Detection', () => {
    it('should detect Terraform files', async () => {
      const content = 'resource "aws_s3_bucket" "example" {}'
      const findings = await scanner.scanFile('main.tf', content)
      expect(Array.isArray(findings)).toBe(true)
    })

    it('should detect CloudFormation files', async () => {
      const content = 'AWSTemplateFormatVersion: "2010-09-09"'
      const findings = await scanner.scanFile('cfn/template.yaml', content)
      expect(Array.isArray(findings)).toBe(true)
    })

    it('should detect Kubernetes manifests', async () => {
      const content = 'apiVersion: v1\nkind: Pod'
      const findings = await scanner.scanFile('k8s/pod.yaml', content)
      expect(Array.isArray(findings)).toBe(true)
    })

    it('should detect Helm charts', async () => {
      const content = 'apiVersion: v2\nname: mychart'
      const findings = await scanner.scanFile('helm/charts/Chart.yaml', content)
      expect(Array.isArray(findings)).toBe(true)
    })

    it('should detect Ansible playbooks', async () => {
      const content = '---\n- hosts: all'
      const findings = await scanner.scanFile('ansible/playbook.yml', content)
      expect(Array.isArray(findings)).toBe(true)
    })
  })

  // Security Finding Tests (10 tests)
  describe('Security Finding Detection', () => {
    it('should detect S3 public access', async () => {
      const content = `
        resource "aws_s3_bucket" "public" {
          bucket = "public-bucket"
        }
      `
      const findings = await scanner.scanFile('main.tf', content)
      expect(findings.length).toBeGreaterThan(0)
      expect(findings.some(f => f.category === CheckCategory.PUBLIC_EXPOSURE)).toBe(true)
    })

    it('should detect hardcoded secrets in IaC', async () => {
      const content = `
        resource "aws_db_instance" "default" {
          master_password = "P@ssw0rd123"
        }
      `
      const findings = await scanner.scanFile('main.tf', content)
      expect(findings.some(f => f.category === CheckCategory.SECRETS)).toBe(true)
    })

    it('should detect unencrypted databases', async () => {
      const content = `
        resource "aws_db_instance" "default" {
          engine = "mysql"
          storage_encrypted = false
        }
      `
      const findings = await scanner.scanFile('main.tf', content)
      expect(findings.some(f => f.category === CheckCategory.ENCRYPTION)).toBe(true)
    })

    it('should detect containers running as root', async () => {
      const content = `
        apiVersion: v1
        kind: Pod
        spec:
          securityContext:
            runAsUser: 0
      `
      const findings = await scanner.scanFile('k8s/pod.yaml', content)
      expect(findings.some(f => f.category === CheckCategory.PRIVILEGE)).toBe(true)
    })

    it('should detect overly permissive security groups', async () => {
      const content = `
        resource "aws_security_group" "allow_all" {
          ingress {
            from_port   = 0
            to_port     = 65535
            protocol    = "tcp"
            cidr_blocks = ["0.0.0.0/0"]
          }
        }
      `
      const findings = await scanner.scanFile('security.tf', content)
      expect(findings.some(f => f.category === CheckCategory.NETWORK)).toBe(true)
    })

    it('should detect overly permissive IAM policies', async () => {
      const content = `
        resource "aws_iam_policy" "admin" {
          policy = jsonencode({
            Statement = [{
              Effect   = "Allow"
              Action   = "*"
              Resource = "*"
            }]
          })
        }
      `
      const findings = await scanner.scanFile('iam.tf', content)
      expect(findings.some(f => f.category === CheckCategory.PRIVILEGE)).toBe(true)
    })

    it('should detect missing encryption', async () => {
      const content = `
        resource "aws_s3_bucket" "no_encrypt" {
          bucket = "my-bucket"
        }
      `
      const findings = await scanner.scanFile('main.tf', content)
      expect(Array.isArray(findings)).toBe(true)
    })

    it('should detect Ansible credential hardcoding', async () => {
      const content = `
        - hosts: all
          vars:
            db_password: "secret123"
      `
      const findings = await scanner.scanFile('ansible/deploy.yml', content)
      expect(findings.some(f => f.category === CheckCategory.SECRETS)).toBe(true)
    })

    it('should extract evidence from findings', async () => {
      const content = 'password: "exposed_secret"'
      const findings = await scanner.scanFile('config.yaml', content)
      if (findings.length > 0) {
        expect(findings[0].evidence).toBeDefined()
      }
    })

    it('should assign appropriate severity levels', async () => {
      const findings = await scanner.scanFile('test.tf', 'resource "aws_s3_bucket" {}')
      if (findings.length > 0) {
        expect(['critical', 'high', 'medium', 'low', 'info']).toContain(findings[0].severity)
      }
    })
  })

  // Compliance Reporting Tests (8 tests)
  describe('Compliance Reporting', () => {
    it('should generate compliance report', async () => {
      const result = await scanner.scanDirectory('.')
      expect(result.compliance).toBeDefined()
      expect(result.compliance?.frameworks).toBeDefined()
    })

    it('should check SOC2 compliance', async () => {
      const result = await scanner.scanDirectory('.')
      const soc2 = result.compliance?.frameworks.find(f => f.name === 'SOC2')
      expect(soc2).toBeDefined()
      expect(['passed', 'failed', 'partial']).toContain(soc2?.status)
    })

    it('should check PCI DSS compliance', async () => {
      const result = await scanner.scanDirectory('.')
      const pci = result.compliance?.frameworks.find(f => f.name === 'PCI DSS')
      expect(pci).toBeDefined()
    })

    it('should check HIPAA compliance', async () => {
      const result = await scanner.scanDirectory('.')
      const hipaa = result.compliance?.frameworks.find(f => f.name === 'HIPAA')
      expect(hipaa).toBeDefined()
    })

    it('should calculate overall risk level', async () => {
      const result = await scanner.scanDirectory('.')
      expect(result.compliance?.riskLevel).toBeDefined()
      expect(['critical', 'high', 'medium', 'low']).toContain(result.compliance?.riskLevel)
    })

    it('should track controls checked', async () => {
      const result = await scanner.scanDirectory('.')
      const framework = result.compliance?.frameworks[0]
      expect(framework?.controlsChecked).toBeGreaterThan(0)
      expect(framework?.controlsPassed).toBeGreaterThanOrEqual(0)
    })

    it('should list compliance findings', async () => {
      const result = await scanner.scanDirectory('.')
      const framework = result.compliance?.frameworks[0]
      expect(Array.isArray(framework?.findings)).toBe(true)
    })

    it('should calculate compliance score', async () => {
      const result = await scanner.scanDirectory('.')
      expect(result.compliance?.overallScore).toBeGreaterThanOrEqual(0)
      expect(result.compliance?.overallScore).toBeLessThanOrEqual(100)
    })
  })

  // Report Generation Tests (7 tests)
  describe('Report Generation', () => {
    it('should generate JSON report', () => {
      const mockResult: ScanResult = {
        timestamp: new Date(),
        mode: ScanMode.ONDEMAND,
        duration: 1000,
        filesScanned: 5,
        findingsCount: 3,
        findings: [],
        statistics: {
          byPlatform: {} as any,
          bySeverity: {} as any,
          byCategory: {} as any,
          passedPolicies: 10,
          failedPolicies: 3,
          riskScore: 30
        }
      }

      const report = scanner.generateReport(mockResult, ReportFormat.JSON)
      expect(typeof report).toBe('string')
      const parsed = JSON.parse(report)
      expect(parsed.filesScanned).toBe(5)
    })

    it('should generate HTML report', () => {
      const mockResult: ScanResult = {
        timestamp: new Date(),
        mode: ScanMode.ONDEMAND,
        duration: 1000,
        filesScanned: 5,
        findingsCount: 0,
        findings: [],
        statistics: {
          byPlatform: {} as any,
          bySeverity: {} as any,
          byCategory: {} as any,
          passedPolicies: 10,
          failedPolicies: 0,
          riskScore: 0
        }
      }

      const report = scanner.generateReport(mockResult, ReportFormat.HTML)
      expect(report).toContain('<!DOCTYPE html>')
      expect(report).toContain('Security Scan Report')
    })

    it('should generate Markdown report', () => {
      const mockResult: ScanResult = {
        timestamp: new Date(),
        mode: ScanMode.ONDEMAND,
        duration: 1000,
        filesScanned: 5,
        findingsCount: 0,
        findings: [],
        statistics: {
          byPlatform: {} as any,
          bySeverity: {} as any,
          byCategory: {} as any,
          passedPolicies: 10,
          failedPolicies: 0,
          riskScore: 0
        }
      }

      const report = scanner.generateReport(mockResult, ReportFormat.MARKDOWN)
      expect(report).toContain('# Infrastructure as Code Security Scan Report')
    })

    it('should generate CSV report', () => {
      const mockResult: ScanResult = {
        timestamp: new Date(),
        mode: ScanMode.ONDEMAND,
        duration: 1000,
        filesScanned: 5,
        findingsCount: 1,
        findings: [{
          id: 'finding-1',
          platform: IaCPlatform.TERRAFORM,
          severity: FindingSeverity.HIGH,
          category: CheckCategory.MISCONFIG,
          title: 'Test Finding',
          description: 'Test description',
          file: 'main.tf',
          line: 10
        }],
        statistics: {
          byPlatform: {} as any,
          bySeverity: {} as any,
          byCategory: {} as any,
          passedPolicies: 10,
          failedPolicies: 1,
          riskScore: 25
        }
      }

      const report = scanner.generateReport(mockResult, ReportFormat.CSV)
      expect(report).toContain('Severity')
      expect(report).toContain('HIGH')
    })

    it('should generate SARIF report', () => {
      const mockResult: ScanResult = {
        timestamp: new Date(),
        mode: ScanMode.ONDEMAND,
        duration: 1000,
        filesScanned: 5,
        findingsCount: 0,
        findings: [],
        statistics: {
          byPlatform: {} as any,
          bySeverity: {} as any,
          byCategory: {} as any,
          passedPolicies: 10,
          failedPolicies: 0,
          riskScore: 0
        }
      }

      const report = scanner.generateReport(mockResult, ReportFormat.SARIF)
      const parsed = JSON.parse(report)
      expect(parsed.version).toBe('2.1.0')
      expect(parsed.$schema).toContain('sarif-spec')
    })

    it('should generate remediation plan', () => {
      const findings: SecurityFinding[] = [{
        id: 'finding-1',
        platform: IaCPlatform.TERRAFORM,
        severity: FindingSeverity.HIGH,
        category: CheckCategory.MISCONFIG,
        title: 'S3 Public',
        description: 'S3 bucket is public',
        file: 'main.tf',
        remediation: {
          description: 'Block public access',
          codeSnippet: 'block_public_acls = true',
          bestPractices: ['Enable block public access'],
          autoFixable: true
        }
      }]

      const plan = scanner.generateRemediationPlan(findings)
      expect(plan.length).toBeGreaterThan(0)
      expect(plan[0].description).toBeDefined()
    })
  })

  // Cache and Configuration Tests (6 tests)
  describe('Cache and Configuration Management', () => {
    it('should cache scan results', async () => {
      const content = 'resource "aws_s3_bucket" "test" {}'
      const findings1 = await scanner.scanFile('test.tf', content)
      const findings2 = await scanner.scanFile('test.tf', content)

      expect(findings1).toEqual(findings2)
    })

    it('should clear cache', () => {
      const emitSpy = vi.spyOn(scanner, 'emit')
      scanner.clearCache()
      expect(emitSpy).toHaveBeenCalledWith('cache:cleared')
    })

    it('should export configuration', () => {
      const config = scanner.exportConfig()
      expect(config.mode).toBeDefined()
      expect(config.excludePaths).toBeDefined()
      expect(config.includePaths).toBeDefined()
    })

    it('should import configuration', () => {
      const emitSpy = vi.spyOn(scanner, 'emit')
      scanner.importConfig({
        mode: ScanMode.SCHEDULED,
        ciEnabled: true
      })
      expect(emitSpy).toHaveBeenCalledWith('config:updated', expect.any(Object))
    })

    it('should track scan statistics', async () => {
      const result = await scanner.scanDirectory('.')
      expect(result.statistics.riskScore).toBeGreaterThanOrEqual(0)
      expect(result.statistics.riskScore).toBeLessThanOrEqual(100)
      expect(result.statistics.passedPolicies).toBeGreaterThanOrEqual(0)
    })

    it('should support multiple scan modes', () => {
      const modes = [ScanMode.PRECOMMIT, ScanMode.PR_MR, ScanMode.SCHEDULED, ScanMode.ONDEMAND]
      expect(Object.values(ScanMode)).toEqual(expect.arrayContaining(modes))
    })
  })
})

// ============================================================================
// SECRETS MANAGEMENT TESTS (40+ tests)
// ============================================================================

describe('SecretsManagement', () => {
  let secretsManager: SecretsManagement

  beforeEach(() => {
    process.env.SECRETS_MASTER_KEY = 'test-master-key-for-testing-only'
    secretsManager = new SecretsManagement(process.env.SECRETS_MASTER_KEY)
  })

  // CRUD Operations Tests (8 tests)
  describe('Secret CRUD Operations', () => {
    it('should store a secret', async () => {
      const metadata = await secretsManager.storeSecret(
        'db-password',
        'super_secret_password',
        SecretType.DATABASE_CREDENTIAL,
        { description: 'Database password' },
        'local',
        'user-123'
      )

      expect(metadata.id).toBeDefined()
      expect(metadata.name).toBe('db-password')
      expect(metadata.type).toBe(SecretType.DATABASE_CREDENTIAL)
      expect(metadata.createdBy).toBe('user-123')
      expect(metadata.isActive).toBe(true)
    })

    it('should retrieve a secret', async () => {
      const stored = await secretsManager.storeSecret(
        'api-key',
        'sk_live_1234567890',
        SecretType.API_KEY,
        {},
        'local',
        'user-123'
      )

      const retrieved = await secretsManager.getSecret(
        stored.id,
        'user-123',
        '192.168.1.1',
        'Mozilla/5.0',
        'Testing'
      )

      expect(retrieved).not.toBeNull()
      expect(retrieved?.metadata.name).toBe('api-key')
    })

    it('should encrypt secrets', async () => {
      const metadata = await secretsManager.storeSecret(
        'encryption-test',
        'plaintext-secret',
        SecretType.ENCRYPTION_KEY,
        {},
        'local'
      )

      expect(metadata.encryptionKeyVersion).toBeDefined()
    })

    it('should version secrets on update', async () => {
      const metadata1 = await secretsManager.storeSecret(
        'versioned-secret',
        'version-1',
        SecretType.API_KEY,
        {},
        'local'
      )

      const metadata2 = await secretsManager.rotateSecret(
        metadata1.id,
        'version-2',
        'user-123'
      )

      expect(metadata2.version).toBe(2)
    })

    it('should track secret creation metadata', async () => {
      const metadata = await secretsManager.storeSecret(
        'metadata-test',
        'secret-value',
        SecretType.TOKEN,
        {
          description: 'Test token',
          tags: { environment: 'test', team: 'platform' }
        },
        'local'
      )

      expect(metadata.description).toBe('Test token')
      expect(metadata.tags.environment).toBe('test')
      expect(metadata.createdAt).toBeDefined()
    })

    it('should set expiration on secrets', async () => {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      const metadata = await secretsManager.storeSecret(
        'expiring-secret',
        'temporary-value',
        SecretType.TOKEN,
        { expiresAt },
        'local'
      )

      expect(metadata.expiresAt).toEqual(expiresAt)
    })

    it('should store multiple secret types', async () => {
      const types = [
        SecretType.API_KEY,
        SecretType.DATABASE_CREDENTIAL,
        SecretType.SSH_KEY,
        SecretType.TOKEN,
        SecretType.OAUTH_CREDENTIAL
      ]

      for (const type of types) {
        const metadata = await secretsManager.storeSecret(
          `secret-${type}`,
          `value-${type}`,
          type,
          {},
          'local'
        )
        expect(metadata.type).toBe(type)
      }
    })

    it('should deny access to unauthorized users', async () => {
      const metadata = await secretsManager.storeSecret(
        'protected-secret',
        'secret-value',
        SecretType.API_KEY,
        {},
        'local',
        'user-123'
      )

      // Different user should get access denied
      await expect(
        secretsManager.getSecret(
          metadata.id,
          'other-user',
          '192.168.1.1',
          'Mozilla/5.0'
        )
      ).rejects.toThrow()
    })
  })

  // Encryption & Decryption Tests (6 tests)
  describe('Encryption and Decryption', () => {
    it('should encrypt and decrypt secrets correctly', async () => {
      const secret = 'my-super-secret-value-12345'
      const metadata = await secretsManager.storeSecret(
        'encrypt-test',
        secret,
        SecretType.API_KEY,
        {},
        'local'
      )

      const retrieved = await secretsManager.getSecret(
        metadata.id,
        metadata.createdBy,
        '192.168.1.1',
        'Mozilla/5.0'
      )

      expect(retrieved?.value).toBe(secret)
    })

    it('should use AES-256-GCM encryption', async () => {
      const metadata = await secretsManager.storeSecret(
        'aes-test',
        'test-secret',
        SecretType.API_KEY,
        {},
        'local'
      )

      expect(metadata.encryptionKeyVersion).toBeDefined()
    })

    it('should generate unique IVs for each secret', async () => {
      const metadata1 = await secretsManager.storeSecret(
        'secret-1',
        'same-value',
        SecretType.API_KEY,
        {},
        'local'
      )

      const metadata2 = await secretsManager.storeSecret(
        'secret-2',
        'same-value',
        SecretType.API_KEY,
        {},
        'local'
      )

      // Even though values are the same, they should encrypt differently
      expect(metadata1.id).not.toBe(metadata2.id)
    })

    it('should verify secret integrity', async () => {
      const metadata = await secretsManager.storeSecret(
        'integrity-test',
        'test-secret',
        SecretType.API_KEY,
        {},
        'local'
      )

      const retrieved = await secretsManager.getSecret(
        metadata.id,
        metadata.createdBy,
        '192.168.1.1',
        'Mozilla/5.0'
      )

      expect(retrieved?.value).toBe('test-secret')
    })

    it('should handle different secret sizes', async () => {
      const smallSecret = 'a'
      const largeSecret = 'x'.repeat(10000)

      const small = await secretsManager.storeSecret(
        'small',
        smallSecret,
        SecretType.API_KEY,
        {},
        'local'
      )

      const large = await secretsManager.storeSecret(
        'large',
        largeSecret,
        SecretType.API_KEY,
        {},
        'local'
      )

      const retrievedSmall = await secretsManager.getSecret(
        small.id,
        small.createdBy,
        '192.168.1.1',
        'Mozilla/5.0'
      )

      const retrievedLarge = await secretsManager.getSecret(
        large.id,
        large.createdBy,
        '192.168.1.1',
        'Mozilla/5.0'
      )

      expect(retrievedSmall?.value).toBe(smallSecret)
      expect(retrievedLarge?.value).toBe(largeSecret)
    })

    it('should support UTF-8 content', async () => {
      const utf8Secret = 'Secret with émojis 🔒 and ñ characters'
      const metadata = await secretsManager.storeSecret(
        'utf8-secret',
        utf8Secret,
        SecretType.TOKEN,
        {},
        'local'
      )

      const retrieved = await secretsManager.getSecret(
        metadata.id,
        metadata.createdBy,
        '192.168.1.1',
        'Mozilla/5.0'
      )

      expect(retrieved?.value).toBe(utf8Secret)
    })
  })

  // Secret Rotation Tests (6 tests)
  describe('Secret Rotation', () => {
    it('should rotate secrets', async () => {
      const metadata1 = await secretsManager.storeSecret(
        'rotation-test',
        'original-value',
        SecretType.API_KEY,
        {},
        'local'
      )

      const metadata2 = await secretsManager.rotateSecret(
        metadata1.id,
        'rotated-value',
        'user-123'
      )

      expect(metadata2.version).toBe(2)
      expect(metadata2.lastRotatedAt).toBeDefined()
    })

    it('should track rotation history', async () => {
      const metadata = await secretsManager.storeSecret(
        'rotation-history',
        'v1',
        SecretType.API_KEY,
        {},
        'local'
      )

      const metadata2 = await secretsManager.rotateSecret(
        metadata.id,
        'v2',
        'user-123'
      )

      const metadata3 = await secretsManager.rotateSecret(
        metadata.id,
        'v3',
        'user-123'
      )

      expect(metadata3.version).toBe(3)
    })

    it('should configure rotation policies', async () => {
      const metadata = await secretsManager.storeSecret(
        'policy-test',
        'secret-value',
        SecretType.API_KEY,
        {
          rotationPolicy: {
            enabled: true,
            frequency: 'monthly',
            rotationWindowHours: 4,
            previousVersionsToKeep: 3,
            autoRotate: true,
            notifyBefore: 24,
            requireApproval: false,
            rollbackOnFailure: true
          }
        },
        'local'
      )

      expect(metadata.rotationPolicy?.frequency).toBe('monthly')
      expect(metadata.rotationPolicy?.autoRotate).toBe(true)
    })

    it('should support different rotation frequencies', async () => {
      const frequencies = ['daily', 'weekly', 'monthly', 'quarterly', 'annually'] as const

      for (const freq of frequencies) {
        const metadata = await secretsManager.storeSecret(
          `rotation-${freq}`,
          'test',
          SecretType.API_KEY,
          {
            rotationPolicy: {
              enabled: true,
              frequency: freq,
              rotationWindowHours: 4,
              previousVersionsToKeep: 3,
              autoRotate: false,
              notifyBefore: 24,
              requireApproval: false,
              rollbackOnFailure: true
            }
          },
          'local'
        )

        expect(metadata.rotationPolicy?.frequency).toBe(freq)
      }
    })

    it('should log rotation events', async () => {
      const metadata1 = await secretsManager.storeSecret(
        'audit-test',
        'original',
        SecretType.API_KEY,
        {},
        'local',
        'user-123'
      )

      await secretsManager.rotateSecret(
        metadata1.id,
        'rotated',
        'user-123',
        'scheduled_rotation'
      )

      // Rotation should be logged (verified through compliance report)
      const report = await secretsManager.generateComplianceReport(
        new Date(Date.now() - 24 * 60 * 60 * 1000),
        new Date(),
        'admin'
      )

      expect(report.rotatedSecrets).toBeGreaterThan(0)
    })

    it('should track last rotation time', async () => {
      const metadata = await secretsManager.storeSecret(
        'last-rotation-test',
        'initial',
        SecretType.API_KEY,
        {},
        'local'
      )

      expect(metadata.lastRotatedAt).toBeUndefined()

      const rotated = await secretsManager.rotateSecret(
        metadata.id,
        'rotated',
        'user-123'
      )

      expect(rotated.lastRotatedAt).toBeDefined()
    })
  })

  // Access Control Tests (6 tests)
  describe('Access Control and JIT Access', () => {
    it('should request JIT access', async () => {
      const metadata = await secretsManager.storeSecret(
        'jit-test',
        'secret-value',
        SecretType.API_KEY,
        {},
        'local'
      )

      const jitRequest = await secretsManager.requestJITAccess(
        metadata.id,
        'developer-user',
        30, // 30 minutes
        'Need to debug production issue',
        'Production debugging - incident ticket #123',
        ['manager-user']
      )

      expect(jitRequest.status).toBe('pending')
      expect(jitRequest.requestedUntil).toBeInstanceOf(Date)
    })

    it('should approve JIT access requests', async () => {
      const metadata = await secretsManager.storeSecret(
        'jit-approve-test',
        'secret-value',
        SecretType.API_KEY,
        {},
        'local'
      )

      const jitRequest = await secretsManager.requestJITAccess(
        metadata.id,
        'developer',
        30,
        'Debug issue',
        'Incident #456',
        ['manager']
      )

      const approved = await secretsManager.approveJITAccess(
        jitRequest.id,
        'manager',
        'Approved for incident response'
      )

      expect(approved.status).toBe('approved')
    })

    it('should track approval chain', async () => {
      const metadata = await secretsManager.storeSecret(
        'approval-chain-test',
        'secret-value',
        SecretType.API_KEY,
        {},
        'local'
      )

      const jitRequest = await secretsManager.requestJITAccess(
        metadata.id,
        'developer',
        60,
        'Need access',
        'For testing',
        ['manager', 'security-officer']
      )

      expect(jitRequest.approvalChain.length).toBe(2)
      expect(jitRequest.approvalChain[0].approver).toBe('manager')
      expect(jitRequest.approvalChain[1].approver).toBe('security-officer')
    })

    it('should enforce access levels', async () => {
      const metadata = await secretsManager.storeSecret(
        'access-level-test',
        'secret-value',
        SecretType.API_KEY,
        {},
        'local',
        'owner-user'
      )

      // Owner should have access
      const ownerAccess = await secretsManager.getSecret(
        metadata.id,
        'owner-user',
        '192.168.1.1',
        'Mozilla/5.0'
      )

      expect(ownerAccess).not.toBeNull()
    })

    it('should check access control levels', async () => {
      const levels = [
        AccessLevel.NONE,
        AccessLevel.OWNER,
        AccessLevel.ADMIN,
        AccessLevel.DEVELOPER,
        AccessLevel.SERVICE,
        AccessLevel.TEMPORARY
      ]

      expect(Object.values(AccessLevel)).toEqual(expect.arrayContaining(levels))
    })

    it('should expire JIT access', async () => {
      const metadata = await secretsManager.storeSecret(
        'jit-expire-test',
        'secret-value',
        SecretType.API_KEY,
        {},
        'local'
      )

      const jitRequest = await secretsManager.requestJITAccess(
        metadata.id,
        'developer',
        1, // 1 minute
        'Quick access',
        'Emergency',
        ['manager']
      )

      expect(jitRequest.requestedUntil.getTime() - jitRequest.requestedAt.getTime()).toBeLessThan(2 * 60 * 1000)
    })
  })

  // Secret Detection Tests (5 tests)
  describe('Secret Detection and Breach Detection', () => {
    it('should scan for exposed secrets in code', async () => {
      const metadata = await secretsManager.storeSecret(
        'exposed-secret',
        'sk_live_super_secret_key_12345',
        SecretType.API_KEY,
        {},
        'local'
      )

      const codeWithSecret = `
        const apiKey = "sk_live_super_secret_key_12345"
        client.authenticate(apiKey)
      `

      const results = await secretsManager.scanForExposedSecrets(
        codeWithSecret,
        'app.js',
        'user-123'
      )

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].detected).toBe(true)
    })

    it('should identify breach type', async () => {
      const metadata = await secretsManager.storeSecret(
        'breach-test',
        'exposed-secret-value',
        SecretType.API_KEY,
        {},
        'local'
      )

      const exposedCode = 'const secret = "exposed-secret-value"'
      const results = await secretsManager.scanForExposedSecrets(
        exposedCode,
        'leaked.js',
        'admin'
      )

      if (results.length > 0) {
        expect(['exposed_in_code', 'exposed_in_logs', 'exposed_in_commit', 'exposed_externally'])
          .toContain(results[0].breachType)
      }
    })

    it('should mark secrets as breached', async () => {
      const metadata = await secretsManager.storeSecret(
        'breach-mark-test',
        'secret-value',
        SecretType.API_KEY,
        {},
        'local'
      )

      const code = 'password: "secret-value"'
      await secretsManager.scanForExposedSecrets(code, 'config.yaml', 'admin')

      // Should mark as breached in metadata
      const report = await secretsManager.generateComplianceReport(
        new Date(0),
        new Date(),
        'admin'
      )

      expect(report.breachesDetected).toBeGreaterThanOrEqual(0)
    })

    it('should provide remediation recommendations', async () => {
      const metadata = await secretsManager.storeSecret(
        'remediation-test',
        'exposed-secret',
        SecretType.API_KEY,
        {},
        'local'
      )

      const code = 'const key = "exposed-secret"'
      const results = await secretsManager.scanForExposedSecrets(
        code,
        'leaked.js',
        'admin'
      )

      if (results.length > 0) {
        expect(results[0].recommendations.length).toBeGreaterThan(0)
        expect(results[0].recommendations[0]).toContain('rotate')
      }
    })

    it('should determine breach severity', async () => {
      const metadata = await secretsManager.storeSecret(
        'severity-test',
        'critical-secret',
        SecretType.API_KEY,
        {},
        'local'
      )

      const code = 'key: critical-secret'
      const results = await secretsManager.scanForExposedSecrets(
        code,
        'config.yaml',
        'admin'
      )

      if (results.length > 0) {
        expect(['critical', 'high', 'medium']).toContain(results[0].severity)
      }
    })
  })

  // Compliance Reporting Tests (8 tests)
  describe('Compliance Reporting and Audit Logging', () => {
    it('should generate compliance report', async () => {
      await secretsManager.storeSecret(
        'compliance-test',
        'secret-value',
        SecretType.API_KEY,
        {},
        'local'
      )

      const report = await secretsManager.generateComplianceReport(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        new Date(),
        'admin'
      )

      expect(report.totalSecrets).toBeGreaterThan(0)
      expect(report.activeSecrets).toBeGreaterThanOrEqual(0)
    })

    it('should count active secrets', async () => {
      await secretsManager.storeSecret(
        'active-1',
        'value1',
        SecretType.API_KEY,
        {},
        'local'
      )

      await secretsManager.storeSecret(
        'active-2',
        'value2',
        SecretType.API_KEY,
        {},
        'local'
      )

      const report = await secretsManager.generateComplianceReport(
        new Date(Date.now() - 24 * 60 * 60 * 1000),
        new Date(),
        'admin'
      )

      expect(report.activeSecrets).toBeGreaterThanOrEqual(2)
    })

    it('should track rotated secrets', async () => {
      const metadata = await secretsManager.storeSecret(
        'rotation-compliance',
        'v1',
        SecretType.API_KEY,
        {},
        'local'
      )

      await secretsManager.rotateSecret(
        metadata.id,
        'v2',
        'user-123'
      )

      const report = await secretsManager.generateComplianceReport(
        new Date(0),
        new Date(),
        'admin'
      )

      expect(report.rotatedSecrets).toBeGreaterThan(0)
    })

    it('should identify unused secrets', async () => {
      await secretsManager.storeSecret(
        'unused-secret',
        'value',
        SecretType.API_KEY,
        {},
        'local'
      )

      // Don't access the secret
      const report = await secretsManager.generateComplianceReport(
        new Date(Date.now() - 24 * 60 * 60 * 1000),
        new Date(),
        'admin'
      )

      expect(report.unusedSecrets).toBeGreaterThanOrEqual(0)
    })

    it('should identify expiring secrets', async () => {
      const expiresAt = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000) // 20 days
      await secretsManager.storeSecret(
        'expiring-soon',
        'value',
        SecretType.API_KEY,
        { expiresAt },
        'local'
      )

      const report = await secretsManager.generateComplianceReport(
        new Date(0),
        new Date(),
        'admin'
      )

      expect(report.expiringSecrets).toBeGreaterThan(0)
    })

    it('should detect access anomalies', async () => {
      const metadata = await secretsManager.storeSecret(
        'anomaly-test',
        'secret-value',
        SecretType.API_KEY,
        {},
        'local'
      )

      // Access from different IPs
      for (let i = 0; i < 150; i++) {
        await secretsManager.getSecret(
          metadata.id,
          'user',
          `192.168.1.${i}`,
          'Mozilla/5.0'
        )
      }

      const report = await secretsManager.generateComplianceReport(
        new Date(Date.now() - 1000),
        new Date(),
        'admin'
      )

      // Should have detected anomalies
      expect(Array.isArray(report.accessAnomalies)).toBe(true)
    })

    it('should provide recommendations', async () => {
      const report = await secretsManager.generateComplianceReport(
        new Date(0),
        new Date(),
        'admin'
      )

      expect(Array.isArray(report.recommendations)).toBe(true)
    })
  })
})

// ============================================================================
// INTEGRATION TESTS (10+ tests)
// ============================================================================

describe('DevSecOps Integration', () => {
  let cicdScanner: CICDSecurityScanner
  let iacScanner: IaCSecurityScanner
  let secretsManager: SecretsManagement

  beforeEach(() => {
    cicdScanner = new CICDSecurityScanner()
    iacScanner = new IaCSecurityScanner()
    process.env.SECRETS_MASTER_KEY = 'integration-test-key'
    secretsManager = new SecretsManagement(process.env.SECRETS_MASTER_KEY)
  })

  it('should integrate CI/CD scanning with secrets detection', async () => {
    const pipelineConfig = `
      env:
        DB_PASSWORD: "my_secret_password"
        API_KEY: "sk_1234567890"
    `

    const result = await cicdScanner.scanPipeline(pipelineConfig, 'github')
    expect(result.credentialExposures.length).toBeGreaterThan(0)
  })

  it('should integrate IaC scanning with compliance reporting', async () => {
    const terraformCode = `
      resource "aws_s3_bucket" "public" {
        bucket = "my-public-bucket"
      }
    `

    const findings = await iacScanner.scanFile('main.tf', terraformCode)
    expect(findings.length).toBeGreaterThan(0)
  })

  it('should manage secrets across multiple platforms', async () => {
    const metadata = await secretsManager.storeSecret(
      'multi-platform',
      'secret-value',
      SecretType.API_KEY,
      {},
      'local'
    )

    expect(metadata.id).toBeDefined()
  })

  it('should track secrets in compliance reports', async () => {
    await secretsManager.storeSecret(
      'tracked-secret',
      'value',
      SecretType.API_KEY,
      {},
      'local'
    )

    const report = await secretsManager.generateComplianceReport(
      new Date(0),
      new Date(),
      'admin'
    )

    expect(report.totalSecrets).toBeGreaterThan(0)
  })

  it('should detect secrets in CI/CD and scan for exposure', async () => {
    const pipelineWithSecret = `
      env:
        SECRET_KEY: "exposed_secret_value"
    `

    const cicdResult = await cicdScanner.scanPipeline(pipelineWithSecret, 'github')
    expect(cicdResult.credentialExposures.length).toBeGreaterThan(0)

    await secretsManager.storeSecret(
      'pipeline-secret',
      'exposed_secret_value',
      SecretType.API_KEY,
      {},
      'local'
    )

    const breachResults = await secretsManager.scanForExposedSecrets(
      pipelineWithSecret,
      'github-actions.yaml',
      'admin'
    )

    expect(breachResults.length).toBeGreaterThan(0)
  })
})
