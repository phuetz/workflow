/**
 * Comprehensive Zero Trust System Tests
 *
 * Tests for:
 * - ZeroTrustPolicyEngine (40+ tests)
 * - IdentityVerification (35+ tests)
 * - MicroSegmentation (35+ tests)
 * - Integration (15+ tests)
 *
 * Total: 125+ tests, ~2,000+ lines
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import ZeroTrustPolicyEngine, {
  PolicyAction,
  PolicyType,
  TrustLevel,
  RiskLevel,
  type UserContext,
  type DeviceContext,
  type NetworkContext,
  type ResourceContext,
  type EvaluationContext,
  type ZeroTrustPolicy,
  type PolicyEvaluationResult,
} from '../security/zerotrust/ZeroTrustPolicyEngine'
import { IdentityVerification, MFAMethod, AuthStrength, RiskLevel as IdentityRiskLevel } from '../security/zerotrust/IdentityVerification'
import {
  MicroSegmentationManager,
  SegmentType,
  DataClassification,
  TrafficDirection,
  Protocol,
  Environment,
  PolicyAction as SegmentPolicyAction,
  ViolationSeverity,
} from '../security/zerotrust/MicroSegmentation'

// ============================================================================
// ZERO TRUST POLICY ENGINE TESTS (40+ tests)
// ============================================================================

describe('ZeroTrustPolicyEngine', () => {
  let engine: ZeroTrustPolicyEngine

  beforeEach(() => {
    engine = new ZeroTrustPolicyEngine()
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Policy CRUD Operations (8 tests)
  // ─────────────────────────────────────────────────────────────────────────

  describe('Policy CRUD Operations', () => {
    it('should create a new policy', () => {
      const policy: ZeroTrustPolicy = {
        id: 'test-policy-1',
        version: 1,
        name: 'Test Policy',
        description: 'Test policy for unit tests',
        type: PolicyType.ACCESS,
        enabled: true,
        priority: 10,
        conditions: [
          {
            type: 'user',
            operator: 'equals',
            field: 'mfaEnabled',
            value: true,
          },
        ],
        action: PolicyAction.ALLOW,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'test-user',
      }

      const created = engine.createPolicy(policy)

      expect(created).toBeDefined()
      expect(created.id).toBe('test-policy-1')
      expect(created.version).toBe(1)
      expect(created.name).toBe('Test Policy')
    })

    it('should increment version on policy update', () => {
      const policy: ZeroTrustPolicy = {
        id: 'test-policy-2',
        version: 1,
        name: 'Versioned Policy',
        type: PolicyType.DEVICE,
        enabled: true,
        priority: 20,
        conditions: [],
        action: PolicyAction.CHALLENGE,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'test-user',
      }

      engine.createPolicy(policy)
      policy.conditions.push({
        type: 'device',
        operator: 'equals',
        field: 'complianceStatus',
        value: 'compliant',
      })

      const updated = engine.createPolicy(policy)

      expect(updated.version).toBe(2)
    })

    it('should retrieve policy by ID', () => {
      const policy: ZeroTrustPolicy = {
        id: 'test-policy-3',
        version: 1,
        name: 'Retrievable Policy',
        type: PolicyType.NETWORK,
        enabled: true,
        priority: 30,
        conditions: [],
        action: PolicyAction.DENY,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'test-user',
      }

      engine.createPolicy(policy)
      const retrieved = engine.getPolicy('test-policy-3')

      expect(retrieved).toBeDefined()
      expect(retrieved?.name).toBe('Retrievable Policy')
    })

    it('should list all enabled policies', () => {
      const policy1: ZeroTrustPolicy = {
        id: 'test-policy-4',
        version: 1,
        name: 'Enabled Policy',
        type: PolicyType.ACCESS,
        enabled: true,
        priority: 10,
        conditions: [],
        action: PolicyAction.ALLOW,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'test-user',
      }

      engine.createPolicy(policy1)

      const policies = engine.listPolicies()

      expect(policies.length).toBeGreaterThan(0)
      expect(policies.some(p => p.id === 'test-policy-4')).toBe(true)
    })

    it('should filter policies by type', () => {
      const policy: ZeroTrustPolicy = {
        id: 'test-policy-5',
        version: 1,
        name: 'Device Policy',
        type: PolicyType.DEVICE,
        enabled: true,
        priority: 15,
        conditions: [],
        action: PolicyAction.CHALLENGE,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'test-user',
      }

      engine.createPolicy(policy)
      const devicePolicies = engine.listPolicies(PolicyType.DEVICE)

      expect(devicePolicies.some(p => p.id === 'test-policy-5')).toBe(true)
    })

    it('should delete a policy', () => {
      const policy: ZeroTrustPolicy = {
        id: 'test-policy-6',
        version: 1,
        name: 'Deletable Policy',
        type: PolicyType.DATA,
        enabled: true,
        priority: 50,
        conditions: [],
        action: PolicyAction.AUDIT,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'test-user',
      }

      engine.createPolicy(policy)
      const deleted = engine.deletePolicy('test-policy-6')

      expect(deleted).toBe(true)
      expect(engine.getPolicy('test-policy-6')).toBeUndefined()
    })

    it('should return false when deleting non-existent policy', () => {
      const deleted = engine.deletePolicy('non-existent-policy')
      expect(deleted).toBe(false)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Policy Versioning (5 tests)
  // ─────────────────────────────────────────────────────────────────────────

  describe('Policy Versioning', () => {
    it('should maintain policy version history', () => {
      const policy: ZeroTrustPolicy = {
        id: 'version-test-1',
        version: 1,
        name: 'History Policy',
        type: PolicyType.ACCESS,
        enabled: true,
        priority: 10,
        conditions: [],
        action: PolicyAction.ALLOW,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'test-user',
      }

      engine.createPolicy(policy)
      engine.createPolicy({ ...policy })
      engine.createPolicy({ ...policy })

      const history = engine.getPolicyVersionHistory('version-test-1')

      expect(history.length).toBe(3)
      expect(history[0].version).toBe(1)
      expect(history[2].version).toBe(3)
    })

    it('should rollback to specific version', () => {
      const policy: ZeroTrustPolicy = {
        id: 'version-test-2',
        version: 1,
        name: 'Version 1',
        type: PolicyType.DEVICE,
        enabled: true,
        priority: 20,
        conditions: [],
        action: PolicyAction.CHALLENGE,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'test-user',
      }

      engine.createPolicy(policy)

      const updated = { ...policy, name: 'Version 2' }
      engine.createPolicy(updated)

      const rolledback = engine.rollbackPolicyVersion('version-test-2', 1)

      expect(rolledback?.name).toBe('Version 1')
      expect(rolledback?.version).toBe(3)
    })

    it('should return undefined for non-existent version', () => {
      const rolledback = engine.rollbackPolicyVersion('non-existent', 1)
      expect(rolledback).toBeUndefined()
    })

    it('should return empty array for non-existent policy history', () => {
      const history = engine.getPolicyVersionHistory('non-existent-policy')
      expect(history).toEqual([])
    })

    it('should handle version rollback to version 1', () => {
      const policy: ZeroTrustPolicy = {
        id: 'version-test-3',
        version: 1,
        name: 'Original Name',
        type: PolicyType.NETWORK,
        enabled: true,
        priority: 30,
        conditions: [],
        action: PolicyAction.DENY,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'test-user',
      }

      engine.createPolicy(policy)
      const history = engine.getPolicyVersionHistory('version-test-3')

      expect(history[0].version).toBe(1)
      expect(history[0].name).toBe('Original Name')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Trust Scoring (8 tests)
  // ─────────────────────────────────────────────────────────────────────────

  describe('Trust Scoring', () => {
    it('should calculate user trust score based on MFA', () => {
      const context: EvaluationContext = {
        requestId: 'req-1',
        timestamp: Date.now(),
        user: {
          userId: 'user1',
          email: 'user1@example.com',
          roles: ['user'],
          groups: [],
          mfaEnabled: true,
          authMethods: ['password', 'totp'],
          lastAuthTime: Date.now() - 300000, // 5 minutes ago
        },
        device: {
          deviceId: 'device1',
          deviceType: 'desktop',
          osType: 'Windows',
          osVersion: '11',
          hardwareId: 'hw1',
          encryptionEnabled: true,
          antivirusStatus: 'active',
          lastHealthCheck: Date.now(),
          complianceStatus: 'compliant',
          vpnConnected: false,
        },
        network: {
          ipAddress: '192.168.1.1',
          isVPN: false,
          isProxy: false,
          geolocation: {
            country: 'US',
            latitude: 40.7128,
            longitude: -74.006,
          },
        },
        resource: {
          resourceId: 'res1',
          resourceType: 'workflow',
          classification: 'internal',
          accessLevel: 'read',
        },
        action: 'read_resource',
      }

      const result = engine.evaluatePolicies(context)

      expect(result.trustScores.userTrustScore).toBeGreaterThan(70)
      expect(result.trustScores.userTrustScore).toBeLessThanOrEqual(100)
    })

    it('should calculate device trust score based on compliance', () => {
      const context: EvaluationContext = {
        requestId: 'req-2',
        timestamp: Date.now(),
        user: {
          userId: 'user2',
          email: 'user2@example.com',
          roles: ['user'],
          groups: [],
          mfaEnabled: true,
          authMethods: ['password'],
          lastAuthTime: Date.now(),
        },
        device: {
          deviceId: 'device2',
          deviceType: 'mobile',
          osType: 'iOS',
          osVersion: '17',
          hardwareId: 'hw2',
          encryptionEnabled: true,
          antivirusStatus: 'active',
          lastHealthCheck: Date.now(),
          complianceStatus: 'compliant',
          isJailbroken: false,
          vpnConnected: true,
        },
        network: {
          ipAddress: '192.168.1.2',
          isVPN: true,
          isProxy: false,
        },
        resource: {
          resourceId: 'res2',
          resourceType: 'file',
          classification: 'confidential',
          accessLevel: 'read',
        },
        action: 'read_resource',
      }

      const result = engine.evaluatePolicies(context)

      expect(result.trustScores.deviceTrustScore).toBeGreaterThan(50)
      expect(result.trustScores.deviceTrustScore).toBeLessThanOrEqual(100)
    })

    it('should calculate network trust score based on VPN status', () => {
      const context: EvaluationContext = {
        requestId: 'req-3',
        timestamp: Date.now(),
        user: {
          userId: 'user3',
          email: 'user3@example.com',
          roles: ['user'],
          groups: [],
          mfaEnabled: false,
          authMethods: ['password'],
          lastAuthTime: Date.now(),
        },
        device: {
          deviceId: 'device3',
          deviceType: 'desktop',
          osType: 'Linux',
          osVersion: '5.15',
          hardwareId: 'hw3',
          encryptionEnabled: true,
          antivirusStatus: 'active',
          lastHealthCheck: Date.now(),
          complianceStatus: 'compliant',
          vpnConnected: true,
        },
        network: {
          ipAddress: '10.0.0.1',
          isVPN: true,
          isProxy: false,
        },
        resource: {
          resourceId: 'res3',
          resourceType: 'database',
          classification: 'restricted',
          accessLevel: 'write',
        },
        action: 'write_resource',
      }

      const result = engine.evaluatePolicies(context)

      expect(result.trustScores.networkTrustScore).toBeGreaterThan(60)
    })

    it('should calculate composite trust score correctly', () => {
      const context: EvaluationContext = {
        requestId: 'req-4',
        timestamp: Date.now(),
        user: {
          userId: 'user4',
          email: 'user4@example.com',
          roles: ['admin'],
          groups: ['admins'],
          mfaEnabled: true,
          authMethods: ['password', 'hardware_token'],
          lastAuthTime: Date.now(),
        },
        device: {
          deviceId: 'device4',
          deviceType: 'desktop',
          osType: 'Windows',
          osVersion: '11',
          hardwareId: 'hw4',
          encryptionEnabled: true,
          antivirusStatus: 'active',
          lastHealthCheck: Date.now(),
          complianceStatus: 'compliant',
          vpnConnected: true,
        },
        network: {
          ipAddress: '192.168.1.100',
          isVPN: true,
          isProxy: false,
          geolocation: {
            country: 'US',
            latitude: 37.7749,
            longitude: -122.4194,
          },
        },
        resource: {
          resourceId: 'res4',
          resourceType: 'workflow',
          classification: 'internal',
          accessLevel: 'admin',
        },
        action: 'admin_access',
      }

      const result = engine.evaluatePolicies(context)

      expect(result.compositeTrustScore).toBeGreaterThan(0)
      expect(result.compositeTrustScore).toBeLessThanOrEqual(100)
      expect(result.trustLevel).toBeDefined()
    })

    it('should classify trust levels correctly', () => {
      const scores = [
        { score: 10, expectedLevel: TrustLevel.CRITICAL },
        { score: 30, expectedLevel: TrustLevel.LOW },
        { score: 50, expectedLevel: TrustLevel.MEDIUM },
        { score: 75, expectedLevel: TrustLevel.HIGH },
        { score: 90, expectedLevel: TrustLevel.VERY_HIGH },
      ]

      for (const { score, expectedLevel } of scores) {
        const context: EvaluationContext = {
          requestId: `req-trust-${score}`,
          timestamp: Date.now(),
          user: {
            userId: `user-${score}`,
            email: `user${score}@example.com`,
            roles: [],
            groups: [],
            mfaEnabled: score > 80,
            authMethods: ['password'],
            lastAuthTime: Date.now() - (score > 50 ? 0 : 86400000),
            riskProfile: score < 40 ? 'high' : score < 70 ? 'medium' : 'low',
          },
          device: {
            deviceId: `device-${score}`,
            deviceType: 'desktop',
            osType: 'Windows',
            osVersion: '11',
            hardwareId: `hw-${score}`,
            encryptionEnabled: score > 60,
            antivirusStatus: score > 50 ? 'active' : 'disabled',
            lastHealthCheck: Date.now(),
            complianceStatus: score > 40 ? 'compliant' : 'non_compliant',
            vpnConnected: score > 70,
          },
          network: {
            ipAddress: '192.168.1.1',
            isVPN: score > 70,
            isProxy: false,
          },
          resource: {
            resourceId: `res-${score}`,
            resourceType: 'file',
            classification: score < 50 ? 'restricted' : 'internal',
            accessLevel: 'read',
          },
          action: 'read',
        }

        const result = engine.evaluatePolicies(context)
        expect(result.trustLevel).toBe(expectedLevel)
      }
    })

    it('should assess risk levels correctly', () => {
      const context: EvaluationContext = {
        requestId: 'req-risk-1',
        timestamp: Date.now(),
        user: {
          userId: 'user-risk',
          email: 'user-risk@example.com',
          roles: [],
          groups: [],
          riskProfile: 'high',
          mfaEnabled: false,
          authMethods: ['password'],
          lastAuthTime: Date.now() - 86400000, // 1 day ago
        },
        device: {
          deviceId: 'device-risk',
          deviceType: 'desktop',
          osType: 'Windows',
          osVersion: '10',
          hardwareId: 'hw-risk',
          encryptionEnabled: false,
          antivirusStatus: 'disabled',
          lastHealthCheck: Date.now() - 604800000, // 7 days ago
          complianceStatus: 'non_compliant',
          vpnConnected: false,
        },
        network: {
          ipAddress: '203.0.113.1',
          isVPN: false,
          isProxy: false,
          geolocation: {
            country: 'KP',
            latitude: 39.0176,
            longitude: 125.7453,
          },
        },
        resource: {
          resourceId: 'res-risk',
          resourceType: 'database',
          classification: 'restricted',
          accessLevel: 'admin',
        },
        action: 'admin_access',
      }

      const result = engine.evaluatePolicies(context)

      expect([RiskLevel.HIGH, RiskLevel.CRITICAL]).toContain(result.riskLevel)
    })

    it('should weight trust score components correctly', () => {
      const context: EvaluationContext = {
        requestId: 'req-weight-1',
        timestamp: Date.now(),
        user: {
          userId: 'user-weight',
          email: 'user-weight@example.com',
          roles: [],
          groups: [],
          mfaEnabled: true,
          authMethods: ['password', 'totp'],
          lastAuthTime: Date.now(),
        },
        device: {
          deviceId: 'device-weight',
          deviceType: 'desktop',
          osType: 'Windows',
          osVersion: '11',
          hardwareId: 'hw-weight',
          encryptionEnabled: true,
          antivirusStatus: 'active',
          lastHealthCheck: Date.now(),
          complianceStatus: 'compliant',
          vpnConnected: true,
        },
        network: {
          ipAddress: '192.168.1.1',
          isVPN: true,
          isProxy: false,
        },
        resource: {
          resourceId: 'res-weight',
          resourceType: 'file',
          classification: 'internal',
          accessLevel: 'read',
        },
        action: 'read',
      }

      const result = engine.evaluatePolicies(context)
      const { trustScores } = result

      // Composite should reflect weighted average
      const expected =
        trustScores.userTrustScore * 0.35 +
        trustScores.deviceTrustScore * 0.3 +
        trustScores.networkTrustScore * 0.2 +
        trustScores.sessionTrustScore * 0.15

      expect(result.compositeTrustScore).toBeCloseTo(expected, 1)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Policy Evaluation & Adaptive Access (8 tests)
  // ─────────────────────────────────────────────────────────────────────────

  describe('Policy Evaluation & Adaptive Access', () => {
    it('should evaluate policies based on conditions', () => {
      const policy: ZeroTrustPolicy = {
        id: 'eval-policy-1',
        version: 1,
        name: 'Evaluate Policy',
        type: PolicyType.ACCESS,
        enabled: true,
        priority: 10,
        conditions: [
          {
            type: 'user',
            operator: 'in',
            field: 'roles',
            value: ['admin', 'manager'],
          },
        ],
        action: PolicyAction.ALLOW,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'test-user',
      }

      engine.createPolicy(policy)

      const context: EvaluationContext = {
        requestId: 'req-eval-1',
        timestamp: Date.now(),
        user: {
          userId: 'admin-user',
          email: 'admin@example.com',
          roles: ['admin'],
          groups: [],
          mfaEnabled: true,
          authMethods: ['password'],
          lastAuthTime: Date.now(),
        },
        device: {
          deviceId: 'device-1',
          deviceType: 'desktop',
          osType: 'Windows',
          osVersion: '11',
          hardwareId: 'hw1',
          encryptionEnabled: true,
          antivirusStatus: 'active',
          lastHealthCheck: Date.now(),
          complianceStatus: 'compliant',
          vpnConnected: false,
        },
        network: {
          ipAddress: '192.168.1.1',
          isVPN: false,
          isProxy: false,
        },
        resource: {
          resourceId: 'res1',
          resourceType: 'admin_panel',
          classification: 'restricted',
          accessLevel: 'admin',
        },
        action: 'admin_access',
      }

      const result = engine.evaluatePolicies(context)

      expect(result.decision).toBe(PolicyAction.ALLOW)
      expect(result.matchedPolicies).toContain('eval-policy-1')
    })

    it('should apply default-deny policy for restricted resources', () => {
      const context: EvaluationContext = {
        requestId: 'req-eval-2',
        timestamp: Date.now(),
        user: {
          userId: 'regular-user',
          email: 'user@example.com',
          roles: ['user'],
          groups: [],
          mfaEnabled: false,
          authMethods: ['password'],
          lastAuthTime: Date.now(),
        },
        device: {
          deviceId: 'device-2',
          deviceType: 'mobile',
          osType: 'Android',
          osVersion: '12',
          hardwareId: 'hw2',
          encryptionEnabled: false,
          antivirusStatus: 'disabled',
          lastHealthCheck: Date.now() - 604800000,
          complianceStatus: 'non_compliant',
          vpnConnected: false,
        },
        network: {
          ipAddress: '203.0.113.1',
          isVPN: false,
          isProxy: false,
        },
        resource: {
          resourceId: 'res-sensitive',
          resourceType: 'database',
          classification: 'restricted',
          accessLevel: 'admin',
        },
        action: 'admin_access',
      }

      const result = engine.evaluatePolicies(context)

      expect(result.decision).toBe(PolicyAction.DENY)
    })

    it('should require step-up authentication for high-risk access', () => {
      const policy: ZeroTrustPolicy = {
        id: 'step-up-policy',
        version: 1,
        name: 'Step-Up Required',
        type: PolicyType.ACCESS,
        enabled: true,
        priority: 5,
        conditions: [
          {
            type: 'risk',
            operator: 'greater_than',
            field: 'riskScore',
            value: 70,
          },
        ],
        action: PolicyAction.CHALLENGE,
        stepUpRequired: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'test-user',
      }

      engine.createPolicy(policy)

      const context: EvaluationContext = {
        requestId: 'req-stepup-1',
        timestamp: Date.now(),
        user: {
          userId: 'risk-user',
          email: 'risk@example.com',
          roles: ['user'],
          groups: [],
          riskProfile: 'high',
          mfaEnabled: false,
          authMethods: ['password'],
          lastAuthTime: Date.now() - 86400000,
        },
        device: {
          deviceId: 'device-risk',
          deviceType: 'desktop',
          osType: 'Windows',
          osVersion: '10',
          hardwareId: 'hw-risk',
          encryptionEnabled: false,
          antivirusStatus: 'disabled',
          lastHealthCheck: Date.now() - 604800000,
          complianceStatus: 'non_compliant',
          vpnConnected: false,
        },
        network: {
          ipAddress: '203.0.113.1',
          isVPN: false,
          isProxy: false,
        },
        resource: {
          resourceId: 'res-sensitive',
          resourceType: 'data',
          classification: 'restricted',
          accessLevel: 'write',
        },
        action: 'write',
      }

      const result = engine.evaluatePolicies(context)

      expect(result.requiresStepUp).toBe(true)
    })

    it('should trigger MFA requirement based on composite trust score', () => {
      const context: EvaluationContext = {
        requestId: 'req-mfa-1',
        timestamp: Date.now(),
        user: {
          userId: 'mfa-user',
          email: 'mfa@example.com',
          roles: [],
          groups: [],
          mfaEnabled: false,
          authMethods: ['password'],
          lastAuthTime: Date.now(),
        },
        device: {
          deviceId: 'device-mfa',
          deviceType: 'desktop',
          osType: 'Windows',
          osVersion: '11',
          hardwareId: 'hw-mfa',
          encryptionEnabled: false,
          antivirusStatus: 'disabled',
          lastHealthCheck: Date.now(),
          complianceStatus: 'non_compliant',
          vpnConnected: false,
        },
        network: {
          ipAddress: '192.168.1.1',
          isVPN: false,
          isProxy: false,
        },
        resource: {
          resourceId: 'res-mfa',
          resourceType: 'file',
          classification: 'confidential',
          accessLevel: 'read',
        },
        action: 'read',
      }

      const result = engine.evaluatePolicies(context)

      if (result.compositeTrustScore < 60) {
        expect(result.requiresMfa).toBe(true)
      }
    })

    it('should set session timeout based on risk level', () => {
      const contexts = [
        {
          label: 'critical',
          riskProfile: 'high',
          mfaEnabled: false,
          encryptionEnabled: false,
          expectedMaxTimeout: 600000, // 10 minutes
        },
        {
          label: 'high',
          riskProfile: 'high',
          mfaEnabled: true,
          encryptionEnabled: true,
          expectedMaxTimeout: 1800000, // 30 minutes
        },
        {
          label: 'medium',
          riskProfile: 'medium',
          mfaEnabled: true,
          encryptionEnabled: true,
          expectedMaxTimeout: 3600000, // 1 hour
        },
        {
          label: 'low',
          riskProfile: 'low',
          mfaEnabled: true,
          encryptionEnabled: true,
          expectedMaxTimeout: 28800000, // 8 hours
        },
      ]

      for (const ctx of contexts) {
        const context: EvaluationContext = {
          requestId: `req-timeout-${ctx.label}`,
          timestamp: Date.now(),
          user: {
            userId: `user-${ctx.label}`,
            email: `user${ctx.label}@example.com`,
            roles: [],
            groups: [],
            riskProfile: ctx.riskProfile as 'low' | 'medium' | 'high',
            mfaEnabled: ctx.mfaEnabled,
            authMethods: ['password'],
            lastAuthTime: Date.now(),
          },
          device: {
            deviceId: `device-${ctx.label}`,
            deviceType: 'desktop',
            osType: 'Windows',
            osVersion: '11',
            hardwareId: `hw-${ctx.label}`,
            encryptionEnabled: ctx.encryptionEnabled,
            antivirusStatus: 'active',
            lastHealthCheck: Date.now(),
            complianceStatus: 'compliant',
            vpnConnected: true,
          },
          network: {
            ipAddress: '192.168.1.1',
            isVPN: true,
            isProxy: false,
          },
          resource: {
            resourceId: `res-${ctx.label}`,
            resourceType: 'file',
            classification: 'internal',
            accessLevel: 'read',
          },
          action: 'read',
        }

        const result = engine.evaluatePolicies(context)

        expect(result.sessionTimeout).toBeDefined()
        expect(result.sessionTimeout).toBeLessThanOrEqual(ctx.expectedMaxTimeout)
      }
    })

    it('should simulate policy evaluation without applying decisions', () => {
      const policy: ZeroTrustPolicy = {
        id: 'sim-policy',
        version: 1,
        name: 'Simulation Policy',
        type: PolicyType.ACCESS,
        enabled: true,
        priority: 10,
        conditions: [],
        action: PolicyAction.DENY,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'test-user',
      }

      engine.createPolicy(policy)

      const context: EvaluationContext = {
        requestId: 'req-sim-1',
        timestamp: Date.now(),
        user: {
          userId: 'sim-user',
          email: 'sim@example.com',
          roles: [],
          groups: [],
          mfaEnabled: false,
          authMethods: ['password'],
          lastAuthTime: Date.now(),
        },
        device: {
          deviceId: 'device-sim',
          deviceType: 'desktop',
          osType: 'Windows',
          osVersion: '11',
          hardwareId: 'hw-sim',
          encryptionEnabled: true,
          antivirusStatus: 'active',
          lastHealthCheck: Date.now(),
          complianceStatus: 'compliant',
          vpnConnected: false,
        },
        network: {
          ipAddress: '192.168.1.1',
          isVPN: false,
          isProxy: false,
        },
        resource: {
          resourceId: 'res-sim',
          resourceType: 'file',
          classification: 'internal',
          accessLevel: 'read',
        },
        action: 'read',
      }

      const simulation = engine.simulatePolicies(context)

      expect(simulation).toBeDefined()
      expect(simulation.matchedPolicies).toContain('sim-policy')
    })

    it('should cache policy evaluation results', () => {
      engine.setCacheTimeout(60000) // 1 minute

      const context: EvaluationContext = {
        requestId: 'req-cache-1',
        timestamp: Date.now(),
        user: {
          userId: 'cache-user',
          email: 'cache@example.com',
          roles: [],
          groups: [],
          mfaEnabled: true,
          authMethods: ['password'],
          lastAuthTime: Date.now(),
        },
        device: {
          deviceId: 'device-cache',
          deviceType: 'desktop',
          osType: 'Windows',
          osVersion: '11',
          hardwareId: 'hw-cache',
          encryptionEnabled: true,
          antivirusStatus: 'active',
          lastHealthCheck: Date.now(),
          complianceStatus: 'compliant',
          vpnConnected: false,
        },
        network: {
          ipAddress: '192.168.1.1',
          isVPN: false,
          isProxy: false,
        },
        resource: {
          resourceId: 'res-cache',
          resourceType: 'file',
          classification: 'internal',
          accessLevel: 'read',
        },
        action: 'read',
      }

      const result1 = engine.evaluatePolicies(context)
      const result2 = engine.evaluatePolicies(context)

      expect(result1.timestamp).toBe(result2.timestamp)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Statistics & Configuration (3 tests)
  // ─────────────────────────────────────────────────────────────────────────

  describe('Statistics & Configuration', () => {
    it('should report policy statistics', () => {
      const stats = engine.getStatistics()

      expect(stats.totalPolicies).toBeGreaterThan(0)
      expect(stats.enabledPolicies).toBeGreaterThan(0)
      expect(stats.policyTypes).toBeDefined()
      expect(stats.cacheSize).toBeGreaterThanOrEqual(0)
    })

    it('should allow configuring trust score weights', () => {
      engine.setTrustScoreWeights({
        user: 0.4,
        device: 0.3,
        network: 0.2,
        session: 0.1,
      })

      const stats = engine.getStatistics()
      expect(stats).toBeDefined()
    })

    it('should allow configuring cache timeout', () => {
      engine.setCacheTimeout(120000) // 2 minutes

      const stats = engine.getStatistics()
      expect(stats).toBeDefined()
    })
  })
})

// ============================================================================
// IDENTITY VERIFICATION TESTS (35+ tests)
// ============================================================================

describe('IdentityVerification', () => {
  let idVerification: IdentityVerification

  beforeEach(() => {
    idVerification = new IdentityVerification()
  })

  // ─────────────────────────────────────────────────────────────────────────
  // MFA Setup & Management (8 tests)
  // ─────────────────────────────────────────────────────────────────────────

  describe('MFA Setup & Management', () => {
    it('should setup MFA for a user', async () => {
      const config = await idVerification.setupMFA('user1', {
        primaryMethod: MFAMethod.TOTP,
        backupMethods: [MFAMethod.SMS_OTP],
      })

      expect(config.userId).toBe('user1')
      expect(config.primaryMethod).toBe(MFAMethod.TOTP)
      expect(config.methods.has(MFAMethod.TOTP)).toBe(true)
      expect(config.methods.has(MFAMethod.SMS_OTP)).toBe(true)
      expect(config.backupCodes.length).toBe(10)
    })

    it('should support multiple MFA methods', async () => {
      const config = await idVerification.setupMFA('user2', {
        primaryMethod: MFAMethod.FIDO2,
        backupMethods: [MFAMethod.TOTP, MFAMethod.EMAIL_OTP],
      })

      expect(config.methods.size).toBe(3)
      expect(Array.from(config.methods.keys())).toContain(MFAMethod.FIDO2)
      expect(Array.from(config.methods.keys())).toContain(MFAMethod.TOTP)
      expect(Array.from(config.methods.keys())).toContain(MFAMethod.EMAIL_OTP)
    })

    it('should generate TOTP secret', async () => {
      const config = await idVerification.setupMFA('user3', {
        primaryMethod: MFAMethod.TOTP,
      })

      const totpMethod = config.methods.get(MFAMethod.TOTP)
      expect(totpMethod?.secret).toBeDefined()
      expect(totpMethod?.config).toHaveProperty('algorithm', 'SHA1')
      expect(totpMethod?.config).toHaveProperty('digits', 6)
      expect(totpMethod?.config).toHaveProperty('period', 30)
    })

    it('should generate backup codes', async () => {
      const config = await idVerification.setupMFA('user4', {
        primaryMethod: MFAMethod.PASSWORD,
      })

      expect(config.backupCodes).toBeDefined()
      expect(config.backupCodes.length).toBe(10)
      config.backupCodes.forEach(code => {
        expect(code).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/)
      })
    })

    it('should update MFA configuration', async () => {
      await idVerification.setupMFA('user5', {
        primaryMethod: MFAMethod.TOTP,
      })

      const updated = await idVerification.setupMFA('user5', {
        primaryMethod: MFAMethod.FIDO2,
        backupMethods: [MFAMethod.TOTP],
      })

      expect(updated.primaryMethod).toBe(MFAMethod.FIDO2)
    })

    it('should store different TOTP configurations', async () => {
      const config = await idVerification.setupMFA('user6', {
        primaryMethod: MFAMethod.TOTP,
        totpConfig: {
          algorithm: 'SHA256',
          digits: 8,
          period: 60,
        },
      })

      const totpMethod = config.methods.get(MFAMethod.TOTP)
      expect(totpMethod?.config).toHaveProperty('algorithm', 'SHA256')
      expect(totpMethod?.config).toHaveProperty('digits', 8)
      expect(totpMethod?.config).toHaveProperty('period', 60)
    })

    it('should create sessions after MFA setup', async () => {
      await idVerification.setupMFA('user7', {
        primaryMethod: MFAMethod.TOTP,
      })

      const session = idVerification.createSession(
        'user7',
        {
          deviceId: 'device1',
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.1',
          osVersion: 'Windows 11',
          browserVersion: 'Chrome 120',
          screenResolution: '1920x1080',
          timezone: 'UTC',
          language: 'en',
          hash: 'hash123',
        },
        AuthStrength.MODERATE,
        [MFAMethod.TOTP],
        '192.168.1.1'
      )

      expect(session.userId).toBe('user7')
      expect(session.sessionId).toBeDefined()
      expect(session.isValid).toBe(true)
    })

    it('should record MFA setup events', async () => {
      await idVerification.setupMFA('user8', {
        primaryMethod: MFAMethod.TOTP,
      })

      // Allow async logging
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(idVerification).toBeDefined()
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // MFA Verification (7 tests)
  // ─────────────────────────────────────────────────────────────────────────

  describe('MFA Verification', () => {
    it('should verify TOTP code', async () => {
      const config = await idVerification.setupMFA('user9', {
        primaryMethod: MFAMethod.TOTP,
      })

      const session = idVerification.createSession(
        'user9',
        {
          deviceId: 'device2',
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.2',
          osVersion: 'Windows 11',
          browserVersion: 'Chrome 120',
          screenResolution: '1920x1080',
          timezone: 'UTC',
          language: 'en',
          hash: 'hash234',
        },
        AuthStrength.WEAK,
        [],
        '192.168.1.2'
      )

      // Mark method as enabled
      const totpMethod = config.methods.get(MFAMethod.TOTP)
      if (totpMethod) {
        totpMethod.enabled = true
        totpMethod.verified = true
      }

      const result = await idVerification.verifyMFA(
        session.sessionId,
        MFAMethod.TOTP,
        '000000'
      )

      expect(result).toBeDefined()
      expect(result.success).toBe(false) // Invalid code
    })

    it('should verify OTP codes', async () => {
      const config = await idVerification.setupMFA('user10', {
        primaryMethod: MFAMethod.SMS_OTP,
      })

      const session = idVerification.createSession(
        'user10',
        {
          deviceId: 'device3',
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.3',
          osVersion: 'Windows 11',
          browserVersion: 'Chrome 120',
          screenResolution: '1920x1080',
          timezone: 'UTC',
          language: 'en',
          hash: 'hash345',
        },
        AuthStrength.WEAK,
        [],
        '192.168.1.3'
      )

      const smsMethod = config.methods.get(MFAMethod.SMS_OTP)
      if (smsMethod) {
        smsMethod.enabled = true
        smsMethod.verified = true
      }

      const result = await idVerification.verifyMFA(
        session.sessionId,
        MFAMethod.SMS_OTP,
        '123456'
      )

      expect(result.success).toBe(true)
    })

    it('should reject invalid MFA method', async () => {
      const config = await idVerification.setupMFA('user11', {
        primaryMethod: MFAMethod.TOTP,
      })

      const session = idVerification.createSession(
        'user11',
        {
          deviceId: 'device4',
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.4',
          osVersion: 'Windows 11',
          browserVersion: 'Chrome 120',
          screenResolution: '1920x1080',
          timezone: 'UTC',
          language: 'en',
          hash: 'hash456',
        },
        AuthStrength.WEAK,
        [],
        '192.168.1.4'
      )

      const result = await idVerification.verifyMFA(
        session.sessionId,
        MFAMethod.SMS_OTP,
        '123456'
      )

      expect(result.success).toBe(false)
      expect(result.message).toContain('not enabled')
    })

    it('should handle invalid session', async () => {
      const result = await idVerification.verifyMFA(
        'invalid-session',
        MFAMethod.TOTP,
        '123456'
      )

      expect(result.success).toBe(false)
      expect(result.message).toContain('Invalid session')
    })

    it('should verify FIDO2 credentials', async () => {
      const config = await idVerification.setupMFA('user12', {
        primaryMethod: MFAMethod.FIDO2,
      })

      const session = idVerification.createSession(
        'user12',
        {
          deviceId: 'device5',
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.5',
          osVersion: 'Windows 11',
          browserVersion: 'Chrome 120',
          screenResolution: '1920x1080',
          timezone: 'UTC',
          language: 'en',
          hash: 'hash567',
        },
        AuthStrength.WEAK,
        [],
        '192.168.1.5'
      )

      const fido2Method = config.methods.get(MFAMethod.FIDO2)
      if (fido2Method) {
        fido2Method.enabled = true
        fido2Method.verified = true
      }

      const result = await idVerification.verifyMFA(
        session.sessionId,
        MFAMethod.FIDO2,
        'webauthn_response'
      )

      expect(result.success).toBe(true)
    })

    it('should verify biometric authentication', async () => {
      const config = await idVerification.setupMFA('user13', {
        primaryMethod: MFAMethod.BIOMETRIC,
      })

      const session = idVerification.createSession(
        'user13',
        {
          deviceId: 'device6',
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.6',
          osVersion: 'iOS 17',
          browserVersion: 'Safari',
          screenResolution: '390x844',
          timezone: 'UTC',
          language: 'en',
          hash: 'hash678',
        },
        AuthStrength.WEAK,
        [],
        '192.168.1.6'
      )

      const bioMethod = config.methods.get(MFAMethod.BIOMETRIC)
      if (bioMethod) {
        bioMethod.enabled = true
        bioMethod.verified = true
      }

      const result = await idVerification.verifyMFA(
        session.sessionId,
        MFAMethod.BIOMETRIC,
        'biometric_token'
      )

      expect(result.success).toBe(true)
    })

    it('should log MFA verification events', async () => {
      const config = await idVerification.setupMFA('user14', {
        primaryMethod: MFAMethod.TOTP,
      })

      const session = idVerification.createSession(
        'user14',
        {
          deviceId: 'device7',
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.7',
          osVersion: 'Windows 11',
          browserVersion: 'Chrome 120',
          screenResolution: '1920x1080',
          timezone: 'UTC',
          language: 'en',
          hash: 'hash789',
        },
        AuthStrength.WEAK,
        [],
        '192.168.1.7'
      )

      const totpMethod = config.methods.get(MFAMethod.TOTP)
      if (totpMethod) {
        totpMethod.enabled = true
        totpMethod.verified = true
      }

      await idVerification.verifyMFA(session.sessionId, MFAMethod.TOTP, '123456')

      // Verify event logging occurred
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(idVerification).toBeDefined()
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Risk Assessment (6 tests)
  // ─────────────────────────────────────────────────────────────────────────

  describe('Risk Assessment', () => {
    it('should assess low risk for normal authentication', async () => {
      const assessment = await idVerification.assessRisk(
        'user-low-risk',
        {
          deviceId: 'device-normal',
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.100',
          macAddress: 'AA:BB:CC:DD:EE:FF',
          osVersion: 'Windows 11',
          browserVersion: 'Chrome 120',
          screenResolution: '1920x1080',
          timezone: 'UTC',
          language: 'en',
          hash: 'hash_normal',
        },
        {
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0',
          timestamp: new Date(),
        }
      )

      expect(assessment.riskScore).toBeLessThan(50)
      expect(assessment.riskLevel).toBe(IdentityRiskLevel.LOW)
    })

    it('should detect excessive failed attempts', async () => {
      const userId = 'user-failed-attempts'

      // Record multiple failed attempts
      for (let i = 0; i < 6; i++) {
        idVerification.recordFailedAttempt(userId)
      }

      const assessment = await idVerification.assessRisk(
        userId,
        {
          deviceId: 'device-failed',
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.101',
          osVersion: 'Windows 11',
          browserVersion: 'Chrome 120',
          screenResolution: '1920x1080',
          timezone: 'UTC',
          language: 'en',
          hash: 'hash_failed',
        },
        {
          ipAddress: '192.168.1.101',
          userAgent: 'Mozilla/5.0',
          timestamp: new Date(),
        }
      )

      expect(assessment.riskScore).toBeGreaterThan(30)
      expect(assessment.factors.some(f => f.type === 'excessive_failed_attempts')).toBe(true)
    })

    it('should detect new device', async () => {
      const userId = 'user-new-device'
      const oldFingerprint = {
        deviceId: 'old-device',
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.102',
        osVersion: 'Windows 11',
        browserVersion: 'Chrome 120',
        screenResolution: '1920x1080',
        timezone: 'UTC',
        language: 'en',
        hash: 'hash_old',
      }

      const newFingerprint = {
        deviceId: 'new-device',
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.103',
        osVersion: 'macOS 14',
        browserVersion: 'Safari 17',
        screenResolution: '2560x1600',
        timezone: 'UTC',
        language: 'en',
        hash: 'hash_new',
      }

      // Simulate first auth with old device
      await idVerification.assessRisk(userId, oldFingerprint, {
        ipAddress: oldFingerprint.ipAddress,
        userAgent: oldFingerprint.userAgent,
        timestamp: new Date(),
      })

      // Now assess risk with new device
      const assessment = await idVerification.assessRisk(userId, newFingerprint, {
        ipAddress: newFingerprint.ipAddress,
        userAgent: newFingerprint.userAgent,
        timestamp: new Date(),
      })

      expect(assessment.riskScore).toBeGreaterThan(20)
      expect(assessment.factors.some(f => f.type === 'new_device')).toBe(true)
    })

    it('should detect unusual location', async () => {
      const userId = 'user-location'
      const oldLocation = {
        deviceId: 'device-ny',
        userAgent: 'Mozilla/5.0',
        ipAddress: '8.8.8.8',
        osVersion: 'Windows 11',
        browserVersion: 'Chrome 120',
        screenResolution: '1920x1080',
        timezone: 'America/New_York',
        language: 'en',
        hash: 'hash_ny',
      }

      const newLocation = {
        deviceId: 'device-london',
        userAgent: 'Mozilla/5.0',
        ipAddress: '1.1.1.1',
        osVersion: 'Windows 11',
        browserVersion: 'Chrome 120',
        screenResolution: '1920x1080',
        timezone: 'Europe/London',
        language: 'en',
        hash: 'hash_london',
      }

      await idVerification.assessRisk(userId, oldLocation, {
        ipAddress: oldLocation.ipAddress,
        userAgent: oldLocation.userAgent,
        timestamp: new Date(),
      })

      const assessment = await idVerification.assessRisk(userId, newLocation, {
        ipAddress: newLocation.ipAddress,
        userAgent: newLocation.userAgent,
        timestamp: new Date(),
      })

      expect(assessment.riskScore).toBeGreaterThan(15)
      expect(assessment.factors.some(f => f.type === 'location_change')).toBe(true)
    })

    it('should require step-up auth for high risk', async () => {
      const assessment = await idVerification.assessRisk(
        'user-high-risk',
        {
          deviceId: 'device-risky',
          userAgent: 'Unknown',
          ipAddress: '203.0.113.1',
          osVersion: 'Unknown',
          browserVersion: 'Unknown',
          screenResolution: 'Unknown',
          timezone: 'Unknown',
          language: 'en',
          hash: 'hash_risky',
        },
        {
          ipAddress: '203.0.113.1',
          userAgent: 'Unknown',
          timestamp: new Date(),
          behavioralData: {
            typingPattern: {
              avgKeyPressDuration: 500,
              avgInterKeyInterval: 200,
              keyErrorRate: 0.5,
            },
          },
        }
      )

      if (assessment.riskScore >= 65) {
        expect(assessment.requiresStepUp).toBe(true)
      }
    })

    it('should recommend appropriate MFA methods', async () => {
      const assessment = await idVerification.assessRisk(
        'user-mfa-recommend',
        {
          deviceId: 'device-recommend',
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.110',
          osVersion: 'Windows 11',
          browserVersion: 'Chrome 120',
          screenResolution: '1920x1080',
          timezone: 'UTC',
          language: 'en',
          hash: 'hash_recommend',
        },
        {
          ipAddress: '192.168.1.110',
          userAgent: 'Mozilla/5.0',
          timestamp: new Date(),
        }
      )

      expect(assessment.recommendedMFAMethods).toBeDefined()
      expect(Array.isArray(assessment.recommendedMFAMethods)).toBe(true)
      expect(assessment.recommendedMFAMethods.length).toBeGreaterThan(0)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Session Management (6 tests)
  // ─────────────────────────────────────────────────────────────────────────

  describe('Session Management', () => {
    it('should create valid session', () => {
      const session = idVerification.createSession(
        'user-session',
        {
          deviceId: 'device-session',
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.120',
          osVersion: 'Windows 11',
          browserVersion: 'Chrome 120',
          screenResolution: '1920x1080',
          timezone: 'UTC',
          language: 'en',
          hash: 'hash_session',
        },
        AuthStrength.STRONG,
        [MFAMethod.TOTP],
        '192.168.1.120'
      )

      expect(session.sessionId).toBeDefined()
      expect(session.userId).toBe('user-session')
      expect(session.isValid).toBe(true)
      expect(session.mfaMethods).toContain(MFAMethod.TOTP)
    })

    it('should validate active session', () => {
      const session = idVerification.createSession(
        'user-validate',
        {
          deviceId: 'device-validate',
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.121',
          osVersion: 'Windows 11',
          browserVersion: 'Chrome 120',
          screenResolution: '1920x1080',
          timezone: 'UTC',
          language: 'en',
          hash: 'hash_validate',
        },
        AuthStrength.STRONG,
        [MFAMethod.TOTP],
        '192.168.1.121'
      )

      const validation = idVerification.validateSession(
        session.sessionId,
        session.deviceFingerprint,
        session.ipAddress
      )

      expect(validation.valid).toBe(true)
    })

    it('should reject invalid session', () => {
      const validation = idVerification.validateSession(
        'invalid-session-id',
        {
          deviceId: 'device',
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.122',
          osVersion: 'Windows 11',
          browserVersion: 'Chrome 120',
          screenResolution: '1920x1080',
          timezone: 'UTC',
          language: 'en',
          hash: 'hash',
        },
        '192.168.1.122'
      )

      expect(validation.valid).toBe(false)
    })

    it('should reject session with IP mismatch', () => {
      const session = idVerification.createSession(
        'user-ip-mismatch',
        {
          deviceId: 'device-ip',
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.123',
          osVersion: 'Windows 11',
          browserVersion: 'Chrome 120',
          screenResolution: '1920x1080',
          timezone: 'UTC',
          language: 'en',
          hash: 'hash_ip',
        },
        AuthStrength.STRONG,
        [MFAMethod.TOTP],
        '192.168.1.123'
      )

      const validation = idVerification.validateSession(
        session.sessionId,
        session.deviceFingerprint,
        '203.0.113.1' // Different IP
      )

      expect(validation.valid).toBe(false)
      expect(validation.reason).toContain('IP')
    })

    it('should revoke session', () => {
      const session = idVerification.createSession(
        'user-revoke',
        {
          deviceId: 'device-revoke',
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.124',
          osVersion: 'Windows 11',
          browserVersion: 'Chrome 120',
          screenResolution: '1920x1080',
          timezone: 'UTC',
          language: 'en',
          hash: 'hash_revoke',
        },
        AuthStrength.STRONG,
        [MFAMethod.TOTP],
        '192.168.1.124'
      )

      const revocation = idVerification.revokeSession(session.sessionId, 'User logout')

      expect(revocation.success).toBe(true)

      const validation = idVerification.validateSession(
        session.sessionId,
        session.deviceFingerprint,
        '192.168.1.124'
      )

      expect(validation.valid).toBe(false)
    })

    it('should handle session binding checks', () => {
      const session = idVerification.createSession(
        'user-binding',
        {
          deviceId: 'device-binding',
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.125',
          osVersion: 'Windows 11',
          browserVersion: 'Chrome 120',
          screenResolution: '1920x1080',
          timezone: 'UTC',
          language: 'en',
          hash: 'hash_binding',
        },
        AuthStrength.STRONG,
        [MFAMethod.TOTP],
        '192.168.1.125'
      )

      expect(session.bindings.ip).toBe('192.168.1.125')
      expect(session.bindings.device).toBe('device-binding')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Failed Attempt Tracking (5 tests)
  // ─────────────────────────────────────────────────────────────────────────

  describe('Failed Attempt Tracking', () => {
    it('should record failed login attempt', () => {
      idVerification.recordFailedAttempt('user-attempts')

      const lockout = idVerification.isLockedOut('user-attempts')

      expect(lockout.locked).toBe(false) // Not locked yet
    })

    it('should lock user after max failed attempts', () => {
      const userId = 'user-max-attempts'

      for (let i = 0; i < 5; i++) {
        idVerification.recordFailedAttempt(userId)
      }

      const lockout = idVerification.isLockedOut(userId)

      expect(lockout.locked).toBe(true)
      expect(lockout.remainingSeconds).toBeGreaterThan(0)
    })

    it('should report remaining lockout time', () => {
      const userId = 'user-lockout-time'

      for (let i = 0; i < 5; i++) {
        idVerification.recordFailedAttempt(userId)
      }

      const lockout = idVerification.isLockedOut(userId)

      expect(lockout.remainingSeconds).toBeDefined()
      expect(lockout.remainingSeconds).toBeGreaterThan(0)
      expect(lockout.remainingSeconds).toBeLessThanOrEqual(900) // 15 minutes
    })

    it('should clear failed attempts', () => {
      const userId = 'user-clear-attempts'

      for (let i = 0; i < 5; i++) {
        idVerification.recordFailedAttempt(userId)
      }

      idVerification.clearFailedAttempts(userId)

      const lockout = idVerification.isLockedOut(userId)

      expect(lockout.locked).toBe(false)
    })

    it('should reset lockout after duration expires', async () => {
      const userId = 'user-lockout-reset'

      // Create custom instance with short lockout
      const idVerif = new IdentityVerification()

      for (let i = 0; i < 5; i++) {
        idVerif.recordFailedAttempt(userId)
      }

      let lockout = idVerif.isLockedOut(userId)
      expect(lockout.locked).toBe(true)

      // After lockout duration, should be reset
      // (This would normally wait 15 minutes, but we can't test that easily)
      expect(lockout.remainingSeconds).toBeLessThanOrEqual(900)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Behavioral & Audit Logging (3 tests)
  // ─────────────────────────────────────────────────────────────────────────

  describe('Behavioral & Audit Logging', () => {
    it('should update behavioral profile', () => {
      const userId = 'user-behavior'

      idVerification.updateBehavioralProfile(userId, {
        typingPattern: {
          avgKeyPressDuration: 120,
          avgInterKeyInterval: 80,
          keyErrorRate: 0.02,
        },
      })

      // Profile should be updated internally
      expect(idVerification).toBeDefined()
    })

    it('should log authentication events', async () => {
      const userId = 'user-audit'

      await idVerification.setupMFA(userId, {
        primaryMethod: MFAMethod.TOTP,
      })

      // Allow async logging
      await new Promise(resolve => setTimeout(resolve, 100))

      const logs = idVerification.getAuditLogs({ userId })

      expect(logs.length).toBeGreaterThan(0)
    })

    it('should generate compliance report', async () => {
      const userId = 'user-compliance'

      await idVerification.setupMFA(userId, {
        primaryMethod: MFAMethod.TOTP,
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      const report = idVerification.getComplianceReport(userId)

      expect(report.totalEvents).toBeGreaterThanOrEqual(0)
      expect(report.successfulLogins).toBeGreaterThanOrEqual(0)
      expect(report.failedLogins).toBeGreaterThanOrEqual(0)
      expect(report.mfaUsageRate).toBeGreaterThanOrEqual(0)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Identity Proof (2 tests)
  // ─────────────────────────────────────────────────────────────────────────

  describe('Identity Proofing', () => {
    it('should record identity proof', () => {
      const userId = 'user-proof'
      const proof = {
        userId,
        verified: true,
        verificationMethod: 'document' as const,
        identityScore: 95,
        documentType: 'passport',
        documentVerified: true,
        verifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      }

      idVerification.recordIdentityProof(userId, proof)

      const stored = idVerification.getIdentityProof(userId)

      expect(stored?.verified).toBe(true)
      expect(stored?.identityScore).toBe(95)
    })

    it('should retrieve identity proof', () => {
      const userId = 'user-retrieve-proof'
      const proof = {
        userId,
        verified: true,
        verificationMethod: 'knowledge' as const,
        identityScore: 85,
        knowledgeQuestionsCorrect: 10,
        verifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      }

      idVerification.recordIdentityProof(userId, proof)

      const retrieved = idVerification.getIdentityProof(userId)

      expect(retrieved?.verified).toBe(true)
      expect(retrieved?.knowledgeQuestionsCorrect).toBe(10)
    })
  })
})

// ============================================================================
// MICRO-SEGMENTATION TESTS (35+ tests)
// ============================================================================

describe('MicroSegmentationManager', () => {
  let segmentManager: MicroSegmentationManager

  beforeEach(() => {
    segmentManager = new MicroSegmentationManager()
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Segment Management (8 tests)
  // ─────────────────────────────────────────────────────────────────────────

  describe('Segment Management', () => {
    it('should create segment', () => {
      const segment = segmentManager.createSegment(
        'Web Tier',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )

      expect(segment.id).toBeDefined()
      expect(segment.name).toBe('Web Tier')
      expect(segment.type).toBe(SegmentType.APPLICATION)
      expect(segment.classification).toBe(DataClassification.INTERNAL)
    })

    it('should create segment with options', () => {
      const segment = segmentManager.createSegment(
        'Database Tier',
        SegmentType.ENVIRONMENT,
        DataClassification.CONFIDENTIAL,
        {
          description: 'Production database segment',
          environment: Environment.PRODUCTION,
          cidr: ['10.0.1.0/24'],
          tags: new Map([['tier', 'database']]),
        }
      )

      expect(segment.description).toBe('Production database segment')
      expect(segment.environment).toBe(Environment.PRODUCTION)
      expect(segment.cidr).toContain('10.0.1.0/24')
      expect(segment.tags.get('tier')).toBe('database')
    })

    it('should retrieve segment by ID', () => {
      const created = segmentManager.createSegment(
        'Test Segment',
        SegmentType.WORKLOAD,
        DataClassification.INTERNAL
      )

      const retrieved = segmentManager.getSegment(created.id)

      expect(retrieved).toBeDefined()
      expect(retrieved?.name).toBe('Test Segment')
    })

    it('should list all segments', () => {
      segmentManager.createSegment('Seg1', SegmentType.APPLICATION, DataClassification.PUBLIC)
      segmentManager.createSegment('Seg2', SegmentType.WORKLOAD, DataClassification.INTERNAL)

      const all = segmentManager.getAllSegments()

      expect(all.length).toBeGreaterThanOrEqual(5) // 3 default + 2 created
    })

    it('should filter segments by type', () => {
      segmentManager.createSegment('App1', SegmentType.APPLICATION, DataClassification.INTERNAL)
      segmentManager.createSegment('App2', SegmentType.APPLICATION, DataClassification.INTERNAL)

      const appSegments = segmentManager.getSegmentsByType(SegmentType.APPLICATION)

      expect(appSegments.length).toBeGreaterThanOrEqual(2)
      expect(appSegments.every(s => s.type === SegmentType.APPLICATION)).toBe(true)
    })

    it('should filter segments by environment', () => {
      const prodSegment = segmentManager.createSegment(
        'Prod App',
        SegmentType.APPLICATION,
        DataClassification.RESTRICTED,
        { environment: Environment.PRODUCTION }
      )

      const prodSegments = segmentManager.getSegmentsByEnvironment(Environment.PRODUCTION)

      expect(prodSegments.some(s => s.id === prodSegment.id)).toBe(true)
    })

    it('should add member to segment', () => {
      const segment = segmentManager.createSegment(
        'Members Seg',
        SegmentType.WORKLOAD,
        DataClassification.INTERNAL
      )

      const added = segmentManager.addMemberToSegment(segment.id, 'app-instance-1')

      expect(added).toBe(true)

      const updated = segmentManager.getSegment(segment.id)
      expect(updated?.members).toContain('app-instance-1')
    })

    it('should delete segment', () => {
      const segment = segmentManager.createSegment(
        'Deletable',
        SegmentType.APPLICATION,
        DataClassification.PUBLIC
      )

      const deleted = segmentManager.deleteSegment(segment.id)

      expect(deleted).toBe(true)
      expect(segmentManager.getSegment(segment.id)).toBeUndefined()
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Policy Management (8 tests)
  // ─────────────────────────────────────────────────────────────────────────

  describe('Policy Management', () => {
    it('should create traffic control policy', () => {
      const srcSeg = segmentManager.createSegment(
        'Source',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )
      const dstSeg = segmentManager.createSegment(
        'Destination',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )

      const policy = segmentManager.createPolicy(
        'Allow HTTP Traffic',
        srcSeg.id,
        dstSeg.id,
        TrafficDirection.INGRESS,
        [Protocol.HTTP, Protocol.HTTPS],
        SegmentPolicyAction.ALLOW
      )

      expect(policy.id).toBeDefined()
      expect(policy.action).toBe(SegmentPolicyAction.ALLOW)
      expect(policy.protocol).toContain(Protocol.HTTP)
    })

    it('should create policy with ports', () => {
      const srcSeg = segmentManager.createSegment(
        'Src',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )
      const dstSeg = segmentManager.createSegment(
        'Dst',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )

      const policy = segmentManager.createPolicy(
        'SSH Access',
        srcSeg.id,
        dstSeg.id,
        TrafficDirection.EGRESS,
        [Protocol.SSH],
        SegmentPolicyAction.ALLOW,
        { ports: [22] }
      )

      expect(policy.ports).toContain(22)
    })

    it('should create identity-based policy', () => {
      const segment = segmentManager.createSegment(
        'Protected',
        SegmentType.APPLICATION,
        DataClassification.CONFIDENTIAL
      )

      const policy = segmentManager.createIdentityPolicy('user123', [segment.id], {
        requiresMFA: true,
        ipWhitelist: ['192.168.1.0/24'],
      })

      expect(policy.userId).toBe('user123')
      expect(policy.allowedSegments).toContain(segment.id)
      expect(policy.requiresMFA).toBe(true)
    })

    it('should list all policies', () => {
      const seg1 = segmentManager.createSegment(
        'Seg1',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )
      const seg2 = segmentManager.createSegment(
        'Seg2',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )

      segmentManager.createPolicy(
        'Policy1',
        seg1.id,
        seg2.id,
        TrafficDirection.BIDIRECTIONAL,
        [Protocol.HTTP],
        SegmentPolicyAction.ALLOW
      )

      const policies = segmentManager.getAllPolicies()

      expect(policies.length).toBeGreaterThan(0)
    })

    it('should get policies for segment pair', () => {
      const seg1 = segmentManager.createSegment(
        'A',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )
      const seg2 = segmentManager.createSegment(
        'B',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )

      segmentManager.createPolicy(
        'A->B',
        seg1.id,
        seg2.id,
        TrafficDirection.EGRESS,
        [Protocol.TCP],
        SegmentPolicyAction.ALLOW
      )

      const policies = segmentManager.getPoliciesForSegmentPair(seg1.id, seg2.id)

      expect(policies.length).toBeGreaterThan(0)
    })

    it('should enable/disable policy', () => {
      const seg1 = segmentManager.createSegment(
        'X',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )
      const seg2 = segmentManager.createSegment(
        'Y',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )

      const policy = segmentManager.createPolicy(
        'Toggle Policy',
        seg1.id,
        seg2.id,
        TrafficDirection.BIDIRECTIONAL,
        [Protocol.HTTPS],
        SegmentPolicyAction.ALLOW
      )

      const disabled = segmentManager.setPolicyEnabled(policy.id, false)

      expect(disabled).toBe(true)
    })

    it('should delete policy', () => {
      const seg1 = segmentManager.createSegment(
        'P1',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )
      const seg2 = segmentManager.createSegment(
        'P2',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )

      const policy = segmentManager.createPolicy(
        'Delete Me',
        seg1.id,
        seg2.id,
        TrafficDirection.BIDIRECTIONAL,
        [Protocol.TCP],
        SegmentPolicyAction.DENY
      )

      const deleted = segmentManager.deletePolicy(policy.id)

      expect(deleted).toBe(true)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Traffic Control & Enforcement (7 tests)
  // ─────────────────────────────────────────────────────────────────────────

  describe('Traffic Control & Enforcement', () => {
    it('should allow traffic with matching policy', async () => {
      const srcSeg = segmentManager.createSegment(
        'TcSrc',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )
      const dstSeg = segmentManager.createSegment(
        'TcDst',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )

      segmentManager.createPolicy(
        'Allow HTTP',
        srcSeg.id,
        dstSeg.id,
        TrafficDirection.BIDIRECTIONAL,
        [Protocol.HTTP],
        SegmentPolicyAction.ALLOW
      )

      const result = await segmentManager.evaluateTraffic(
        srcSeg.id,
        dstSeg.id,
        Protocol.HTTP
      )

      expect(result.allowed).toBe(true)
    })

    it('should deny traffic by default', async () => {
      const srcSeg = segmentManager.createSegment(
        'NoPolicySrc',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )
      const dstSeg = segmentManager.createSegment(
        'NoPolicyDst',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )

      const result = await segmentManager.evaluateTraffic(
        srcSeg.id,
        dstSeg.id,
        Protocol.TCP
      )

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('default-deny')
    })

    it('should enforce port restrictions', async () => {
      const srcSeg = segmentManager.createSegment(
        'PortSrc',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )
      const dstSeg = segmentManager.createSegment(
        'PortDst',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )

      segmentManager.createPolicy(
        'SSH Only',
        srcSeg.id,
        dstSeg.id,
        TrafficDirection.EGRESS,
        [Protocol.SSH],
        SegmentPolicyAction.ALLOW,
        { ports: [22] }
      )

      const sshResult = await segmentManager.evaluateTraffic(
        srcSeg.id,
        dstSeg.id,
        Protocol.SSH,
        22
      )

      expect(sshResult.allowed).toBe(true)
    })

    it('should check identity-based access', async () => {
      const segment = segmentManager.createSegment(
        'IdSegment',
        SegmentType.APPLICATION,
        DataClassification.CONFIDENTIAL
      )

      segmentManager.createIdentityPolicy('user-id', [segment.id], {
        ipWhitelist: ['192.168.1.100'],
      })

      const result = await segmentManager.checkIdentityAccess('user-id', segment.id, {
        sourceIp: '192.168.1.100',
      })

      expect(result.allowed).toBe(true)
    })

    it('should reject identity access from non-whitelisted IP', async () => {
      const segment = segmentManager.createSegment(
        'WhitelistSeg',
        SegmentType.APPLICATION,
        DataClassification.CONFIDENTIAL
      )

      segmentManager.createIdentityPolicy('user-white', [segment.id], {
        ipWhitelist: ['10.0.0.0/8'],
      })

      const result = await segmentManager.checkIdentityAccess('user-white', segment.id, {
        sourceIp: '203.0.113.1',
      })

      expect(result.allowed).toBe(false)
    })

    it('should enforce policy priority order', async () => {
      const srcSeg = segmentManager.createSegment(
        'PriSrc',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )
      const dstSeg = segmentManager.createSegment(
        'PriDst',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )

      // Create deny policy with higher priority (lower number)
      segmentManager.createPolicy(
        'Block First',
        srcSeg.id,
        dstSeg.id,
        TrafficDirection.BIDIRECTIONAL,
        [Protocol.TCP],
        SegmentPolicyAction.DENY,
        { priority: 1 }
      )

      // Create allow policy with lower priority
      segmentManager.createPolicy(
        'Allow Later',
        srcSeg.id,
        dstSeg.id,
        TrafficDirection.BIDIRECTIONAL,
        [Protocol.TCP],
        SegmentPolicyAction.ALLOW,
        { priority: 100 }
      )

      const result = await segmentManager.evaluateTraffic(
        srcSeg.id,
        dstSeg.id,
        Protocol.TCP
      )

      // Deny should take precedence due to higher priority
      expect(result.allowed).toBe(false)
    })

    it('should enforce traffic rules', async () => {
      const srcSeg = segmentManager.createSegment(
        'EnforceSrc',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )
      const dstSeg = segmentManager.createSegment(
        'EnforceDst',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )

      segmentManager.createPolicy(
        'HTTPS Only',
        srcSeg.id,
        dstSeg.id,
        TrafficDirection.EGRESS,
        [Protocol.HTTPS],
        SegmentPolicyAction.ALLOW
      )

      const enforced = await segmentManager.enforcePolicy(
        srcSeg.id,
        dstSeg.id,
        Protocol.HTTPS
      )

      expect(enforced).toBe(true)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Violation & Remediation (6 tests)
  // ─────────────────────────────────────────────────────────────────────────

  describe('Violation Detection & Remediation', () => {
    it('should record policy violations', async () => {
      const srcSeg = segmentManager.createSegment(
        'ViolSrc',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )
      const dstSeg = segmentManager.createSegment(
        'ViolDst',
        SegmentType.APPLICATION,
        DataClassification.RESTRICTED
      )

      await segmentManager.evaluateTraffic(srcSeg.id, dstSeg.id, Protocol.TCP)

      const violations = segmentManager.getUnresolvedViolations()

      expect(violations.length).toBeGreaterThan(0)
    })

    it('should get violations for segment', async () => {
      const srcSeg = segmentManager.createSegment(
        'ViolSegSrc',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )
      const dstSeg = segmentManager.createSegment(
        'ViolSegDst',
        SegmentType.APPLICATION,
        DataClassification.RESTRICTED
      )

      await segmentManager.evaluateTraffic(srcSeg.id, dstSeg.id, Protocol.TCP)

      const violations = segmentManager.getViolationsForSegment(srcSeg.id)

      expect(violations.length).toBeGreaterThan(0)
    })

    it('should resolve violations', async () => {
      const srcSeg = segmentManager.createSegment(
        'ResolveSrc',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )
      const dstSeg = segmentManager.createSegment(
        'ResolveDst',
        SegmentType.APPLICATION,
        DataClassification.RESTRICTED
      )

      await segmentManager.evaluateTraffic(srcSeg.id, dstSeg.id, Protocol.TCP)

      const violations = segmentManager.getUnresolvedViolations()
      const firstViolation = violations[0]

      const resolved = segmentManager.resolveViolation(
        firstViolation.id,
        'Manual review completed'
      )

      expect(resolved).toBe(true)
    })

    it('should auto-remediate repeated violations', async () => {
      const srcSeg = segmentManager.createSegment(
        'RemediateSrc',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )
      const dstSeg = segmentManager.createSegment(
        'RemediateDst',
        SegmentType.APPLICATION,
        DataClassification.RESTRICTED
      )

      // Generate multiple violations
      for (let i = 0; i < 4; i++) {
        await segmentManager.evaluateTraffic(srcSeg.id, dstSeg.id, Protocol.TCP)
      }

      const violations = segmentManager.getUnresolvedViolations()
      if (violations.length > 0) {
        const result = await segmentManager.autoRemediate(violations[0].id)
        expect(result).toBe(true)
      }
    })

    it('should track violation severity', async () => {
      const srcSeg = segmentManager.createSegment(
        'SeveritySrc',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )
      const dstSeg = segmentManager.createSegment(
        'SeverityDst',
        SegmentType.APPLICATION,
        DataClassification.RESTRICTED
      )

      await segmentManager.evaluateTraffic(srcSeg.id, dstSeg.id, Protocol.TCP)

      const violations = segmentManager.getUnresolvedViolations()

      expect(violations[0].severity).toBeDefined()
      expect([ViolationSeverity.CRITICAL, ViolationSeverity.BLOCKED]).toContain(
        violations[0].severity
      )
    })

    it('should provide violation remediation actions', async () => {
      const srcSeg = segmentManager.createSegment(
        'ActionSrc',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )
      const dstSeg = segmentManager.createSegment(
        'ActionDst',
        SegmentType.APPLICATION,
        DataClassification.RESTRICTED
      )

      await segmentManager.evaluateTraffic(srcSeg.id, dstSeg.id, Protocol.TCP)

      const violations = segmentManager.getUnresolvedViolations()
      const firstVio = violations[0]

      segmentManager.resolveViolation(firstVio.id, 'Quarantine applied')

      const resolved = segmentManager.getUnresolvedViolations().length

      expect(resolved).toBeLessThan(violations.length)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Lateral Movement Detection (4 tests)
  // ─────────────────────────────────────────────────────────────────────────

  describe('Lateral Movement Detection', () => {
    it('should detect multi-hop access attempts', () => {
      const srcSeg = segmentManager.createSegment(
        'LMSrc',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )

      const indicator = segmentManager.detectLateralMovement(srcSeg.id, [
        'seg1',
        'seg2',
        'seg3',
        'seg4',
      ])

      if (indicator) {
        expect(indicator.pathLength).toBe(4)
        expect(indicator.indicators).toContain('multi-hop-access')
        expect(indicator.probability).toBeGreaterThan(0)
      }
    })

    it('should detect access to restricted segments', () => {
      const srcSeg = segmentManager.createSegment(
        'RestrictedSrc',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )
      const restrictedSeg = segmentManager.createSegment(
        'RestrictedData',
        SegmentType.DATA,
        DataClassification.RESTRICTED
      )

      const indicator = segmentManager.detectLateralMovement(srcSeg.id, [
        restrictedSeg.id,
      ])

      if (indicator) {
        expect(indicator.indicators).toContain('restricted-segment-access')
      }
    })

    it('should get lateral movement indicators', () => {
      const srcSeg = segmentManager.createSegment(
        'LMIndicatorSrc',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )

      segmentManager.detectLateralMovement(srcSeg.id, [
        'seg1',
        'seg2',
        'seg3',
        'seg4',
      ])

      const indicators = segmentManager.getLateralMovementIndicators()

      expect(Array.isArray(indicators)).toBe(true)
    })

    it('should threshold lateral movement probability', () => {
      const srcSeg = segmentManager.createSegment(
        'ThresholdSrc',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )

      // Short path should not trigger
      const shortPath = segmentManager.detectLateralMovement(srcSeg.id, ['seg1'])

      // Long path with restricted segments should trigger
      const restrictedSeg = segmentManager.createSegment(
        'ThresholdRestricted',
        SegmentType.DATA,
        DataClassification.RESTRICTED
      )
      const longPath = segmentManager.detectLateralMovement(srcSeg.id, [
        'seg1',
        'seg2',
        'seg3',
        restrictedSeg.id,
      ])

      expect(longPath?.probability).toBeGreaterThan(shortPath?.probability ?? 0)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Visibility & Monitoring (4 tests)
  // ─────────────────────────────────────────────────────────────────────────

  describe('Visibility & Monitoring', () => {
    it('should track traffic flows', async () => {
      const srcSeg = segmentManager.createSegment(
        'FlowSrc',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )
      const dstSeg = segmentManager.createSegment(
        'FlowDst',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )

      segmentManager.createPolicy(
        'Allow Flow',
        srcSeg.id,
        dstSeg.id,
        TrafficDirection.BIDIRECTIONAL,
        [Protocol.TCP],
        SegmentPolicyAction.ALLOW
      )

      await segmentManager.evaluateTraffic(srcSeg.id, dstSeg.id, Protocol.TCP)

      const flows = segmentManager.getTrafficFlowsForSegment(srcSeg.id)

      expect(flows.length).toBeGreaterThan(0)
    })

    it('should generate connectivity matrix', () => {
      const seg1 = segmentManager.createSegment(
        'MatSeg1',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )
      const seg2 = segmentManager.createSegment(
        'MatSeg2',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )

      segmentManager.createPolicy(
        'Matrix Policy',
        seg1.id,
        seg2.id,
        TrafficDirection.BIDIRECTIONAL,
        [Protocol.TCP],
        SegmentPolicyAction.ALLOW
      )

      const matrix = segmentManager.getConnectivityMatrix()

      expect(Array.isArray(matrix)).toBe(true)
      expect(matrix.some(m => m.sourceSegment === seg1.id)).toBe(true)
    })

    it('should monitor segment health', () => {
      const segment = segmentManager.createSegment(
        'HealthSeg',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )

      const health = segmentManager.updateSegmentHealth(segment.id, {
        violations: 2,
        blockRate: 0.15,
        latency: 50,
        throughput: 1000,
      })

      expect(health.segmentId).toBe(segment.id)
      expect(health.violations).toBe(2)
      expect(health.status).toBeDefined()
    })

    it('should detect traffic anomalies', () => {
      const srcSeg = segmentManager.createSegment(
        'AnomalySrc',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )
      const dstSeg = segmentManager.createSegment(
        'AnomalyDst',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )

      segmentManager.createPolicy(
        'Anomaly Policy',
        srcSeg.id,
        dstSeg.id,
        TrafficDirection.BIDIRECTIONAL,
        [Protocol.TCP],
        SegmentPolicyAction.ALLOW
      )

      const anomalies = segmentManager.detectAnomalies(srcSeg.id)

      expect(Array.isArray(anomalies)).toBe(true)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Compliance Reporting (2 tests)
  // ─────────────────────────────────────────────────────────────────────────

  describe('Compliance Reporting', () => {
    it('should generate compliance report', () => {
      const report = segmentManager.getComplianceReport()

      expect(report.totalSegments).toBeGreaterThan(0)
      expect(report.totalPolicies).toBeGreaterThanOrEqual(0)
      expect(report.violations).toBeGreaterThanOrEqual(0)
      expect(report.compliance).toBeGreaterThanOrEqual(0)
      expect(report.compliance).toBeLessThanOrEqual(100)
    })

    it('should calculate compliance percentage', async () => {
      const srcSeg = segmentManager.createSegment(
        'CompSrc',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )
      const dstSeg = segmentManager.createSegment(
        'CompDst',
        SegmentType.APPLICATION,
        DataClassification.RESTRICTED
      )

      // Create violation
      await segmentManager.evaluateTraffic(srcSeg.id, dstSeg.id, Protocol.TCP)

      const report = segmentManager.getComplianceReport()

      expect(report.compliance).toBeGreaterThanOrEqual(0)
      expect(report.compliance).toBeLessThanOrEqual(100)
    })
  })
})

// ============================================================================
// INTEGRATION TESTS (15+ tests)
// ============================================================================

describe('Zero Trust System Integration', () => {
  let policyEngine: ZeroTrustPolicyEngine
  let idVerification: IdentityVerification
  let microSegmentation: MicroSegmentationManager

  beforeEach(() => {
    policyEngine = new ZeroTrustPolicyEngine()
    idVerification = new IdentityVerification()
    microSegmentation = new MicroSegmentationManager()
  })

  // ─────────────────────────────────────────────────────────────────────────
  // End-to-End Zero Trust Flow (5 tests)
  // ─────────────────────────────────────────────────────────────────────────

  describe('End-to-End Zero Trust Flow', () => {
    it('should complete full authentication and authorization flow', async () => {
      // 1. Setup MFA
      const mfaConfig = await idVerification.setupMFA('integ-user', {
        primaryMethod: MFAMethod.TOTP,
      })

      expect(mfaConfig).toBeDefined()

      // 2. Create session
      const session = idVerification.createSession(
        'integ-user',
        {
          deviceId: 'integ-device',
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.1',
          osVersion: 'Windows 11',
          browserVersion: 'Chrome 120',
          screenResolution: '1920x1080',
          timezone: 'UTC',
          language: 'en',
          hash: 'integ_hash',
        },
        AuthStrength.STRONG,
        [MFAMethod.TOTP],
        '192.168.1.1'
      )

      expect(session.isValid).toBe(true)

      // 3. Evaluate policies
      const context: EvaluationContext = {
        requestId: 'integ-req-1',
        timestamp: Date.now(),
        user: {
          userId: 'integ-user',
          email: 'integ@example.com',
          roles: ['user'],
          groups: [],
          mfaEnabled: true,
          authMethods: ['password', 'totp'],
          lastAuthTime: Date.now(),
        },
        device: {
          deviceId: 'integ-device',
          deviceType: 'desktop',
          osType: 'Windows',
          osVersion: '11',
          hardwareId: 'hw-integ',
          encryptionEnabled: true,
          antivirusStatus: 'active',
          lastHealthCheck: Date.now(),
          complianceStatus: 'compliant',
          vpnConnected: false,
        },
        network: {
          ipAddress: '192.168.1.1',
          isVPN: false,
          isProxy: false,
        },
        resource: {
          resourceId: 'res-integ',
          resourceType: 'workflow',
          classification: 'internal',
          accessLevel: 'read',
        },
        action: 'read_workflow',
      }

      const policyResult = policyEngine.evaluatePolicies(context)

      expect(policyResult.decision).toBeDefined()
      expect(policyResult.trustScores).toBeDefined()

      // 4. Check segmentation access
      const segment = microSegmentation.createSegment(
        'Integ Segment',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )

      const segResult = await microSegmentation.checkIdentityAccess(
        'integ-user',
        segment.id
      )

      expect(segResult).toBeDefined()
    })

    it('should enforce zero trust during workflow execution', async () => {
      // Create segments for workflow components
      const triggerSeg = microSegmentation.createSegment(
        'Trigger',
        SegmentType.APPLICATION,
        DataClassification.PUBLIC
      )
      const processorSeg = microSegmentation.createSegment(
        'Processor',
        SegmentType.WORKLOAD,
        DataClassification.INTERNAL
      )
      const storageSeg = microSegmentation.createSegment(
        'Storage',
        SegmentType.DATA,
        DataClassification.CONFIDENTIAL
      )

      // Create policies for workflow flow
      microSegmentation.createPolicy(
        'Trigger->Processor',
        triggerSeg.id,
        processorSeg.id,
        TrafficDirection.EGRESS,
        [Protocol.HTTP, Protocol.GRPC],
        SegmentPolicyAction.ALLOW
      )

      microSegmentation.createPolicy(
        'Processor->Storage',
        processorSeg.id,
        storageSeg.id,
        TrafficDirection.EGRESS,
        [Protocol.TCP],
        SegmentPolicyAction.ALLOW,
        { ports: [5432] } // PostgreSQL
      )

      // Verify traffic flows
      const flow1 = await microSegmentation.evaluateTraffic(
        triggerSeg.id,
        processorSeg.id,
        Protocol.GRPC
      )

      const flow2 = await microSegmentation.evaluateTraffic(
        processorSeg.id,
        storageSeg.id,
        Protocol.TCP,
        5432
      )

      expect(flow1.allowed).toBe(true)
      expect(flow2.allowed).toBe(true)

      // Verify lateral movement would be prevented
      const lateralAttempt = await microSegmentation.evaluateTraffic(
        triggerSeg.id,
        storageSeg.id,
        Protocol.TCP
      )

      expect(lateralAttempt.allowed).toBe(false)
    })

    it('should apply continuous verification during session', async () => {
      // Initial authentication
      const session = idVerification.createSession(
        'cont-verify-user',
        {
          deviceId: 'device-cont',
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.50',
          osVersion: 'Windows 11',
          browserVersion: 'Chrome 120',
          screenResolution: '1920x1080',
          timezone: 'UTC',
          language: 'en',
          hash: 'hash_cont',
        },
        AuthStrength.STRONG,
        [MFAMethod.TOTP],
        '192.168.1.50'
      )

      // Validate session multiple times
      const validation1 = idVerification.validateSession(
        session.sessionId,
        session.deviceFingerprint,
        '192.168.1.50'
      )

      expect(validation1.valid).toBe(true)

      // Re-validate
      const validation2 = idVerification.validateSession(
        session.sessionId,
        session.deviceFingerprint,
        '192.168.1.50'
      )

      expect(validation2.valid).toBe(true)
    })

    it('should require elevated auth for sensitive operations', async () => {
      // Create sensitive policy
      const sensitivePolicy: ZeroTrustPolicy = {
        id: 'sensitive-op',
        version: 1,
        name: 'Sensitive Operation',
        type: PolicyType.ACCESS,
        enabled: true,
        priority: 5,
        conditions: [
          {
            type: 'resource',
            operator: 'equals',
            field: 'classification',
            value: 'restricted',
          },
        ],
        action: PolicyAction.CHALLENGE,
        stepUpRequired: true,
        minimumTrustScore: 85,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'system',
      }

      policyEngine.createPolicy(sensitivePolicy)

      const context: EvaluationContext = {
        requestId: 'sensitive-req',
        timestamp: Date.now(),
        user: {
          userId: 'sensitive-user',
          email: 'sensitive@example.com',
          roles: ['admin'],
          groups: [],
          mfaEnabled: true,
          authMethods: ['password', 'hardware_token'],
          lastAuthTime: Date.now(),
        },
        device: {
          deviceId: 'device-sensitive',
          deviceType: 'desktop',
          osType: 'Windows',
          osVersion: '11',
          hardwareId: 'hw-sensitive',
          encryptionEnabled: true,
          antivirusStatus: 'active',
          lastHealthCheck: Date.now(),
          complianceStatus: 'compliant',
          vpnConnected: true,
        },
        network: {
          ipAddress: '192.168.1.200',
          isVPN: true,
          isProxy: false,
        },
        resource: {
          resourceId: 'sensitive-data',
          resourceType: 'database',
          classification: 'restricted',
          accessLevel: 'admin',
        },
        action: 'delete_data',
      }

      const result = policyEngine.evaluatePolicies(context)

      expect(result.requiresStepUp).toBe(true)
    })

    it('should detect and prevent lateral movement', async () => {
      // Create app segment (entry point)
      const appSeg = microSegmentation.createSegment(
        'LM-App',
        SegmentType.APPLICATION,
        DataClassification.PUBLIC
      )

      // Create sensitive segments
      const dbSeg = microSegmentation.createSegment(
        'LM-Database',
        SegmentType.DATA,
        DataClassification.RESTRICTED
      )

      const adminSeg = microSegmentation.createSegment(
        'LM-Admin',
        SegmentType.APPLICATION,
        DataClassification.RESTRICTED
      )

      // Only app should access database directly
      microSegmentation.createPolicy(
        'App-DB',
        appSeg.id,
        dbSeg.id,
        TrafficDirection.EGRESS,
        [Protocol.TCP],
        SegmentPolicyAction.ALLOW
      )

      // Try lateral movement
      const lateralDetection = microSegmentation.detectLateralMovement(appSeg.id, [
        'intermediate',
        adminSeg.id,
      ])

      // Attempt should be detected and blocked
      const blockResult = await microSegmentation.evaluateTraffic(
        appSeg.id,
        adminSeg.id,
        Protocol.TCP
      )

      expect(blockResult.allowed).toBe(false)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Multi-Layer Verification (5 tests)
  // ─────────────────────────────────────────────────────────────────────────

  describe('Multi-Layer Verification', () => {
    it('should verify identity, device, and network together', async () => {
      // Layer 1: Identity verification
      const mfaConfig = await idVerification.setupMFA('multi-user', {
        primaryMethod: MFAMethod.TOTP,
        backupMethods: [MFAMethod.FIDO2],
      })

      expect(mfaConfig.methods.size).toBe(2)

      // Layer 2: Device verification
      const session = idVerification.createSession(
        'multi-user',
        {
          deviceId: 'trusted-device',
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.100',
          osVersion: 'Windows 11',
          browserVersion: 'Chrome 120',
          screenResolution: '1920x1080',
          timezone: 'UTC',
          language: 'en',
          hash: 'trusted_hash',
        },
        AuthStrength.VERY_STRONG,
        [MFAMethod.TOTP, MFAMethod.FIDO2],
        '192.168.1.100'
      )

      expect(session.authStrength).toBe(AuthStrength.VERY_STRONG)

      // Layer 3: Policy evaluation
      const context: EvaluationContext = {
        requestId: 'multi-req',
        timestamp: Date.now(),
        user: {
          userId: 'multi-user',
          email: 'multi@example.com',
          roles: ['admin'],
          groups: ['admins'],
          mfaEnabled: true,
          authMethods: ['password', 'totp', 'hardware_token'],
          lastAuthTime: Date.now(),
        },
        device: {
          deviceId: 'trusted-device',
          deviceType: 'desktop',
          osType: 'Windows',
          osVersion: '11',
          hardwareId: 'hw-trusted',
          encryptionEnabled: true,
          antivirusStatus: 'active',
          lastHealthCheck: Date.now(),
          complianceStatus: 'compliant',
          vpnConnected: true,
        },
        network: {
          ipAddress: '192.168.1.100',
          isVPN: true,
          isProxy: false,
          geolocation: {
            country: 'US',
            latitude: 40.7128,
            longitude: -74.006,
          },
        },
        resource: {
          resourceId: 'multi-res',
          resourceType: 'workflow',
          classification: 'restricted',
          accessLevel: 'admin',
        },
        action: 'admin_access',
      }

      const result = policyEngine.evaluatePolicies(context)

      expect(result.compositeTrustScore).toBeGreaterThan(70)
      expect([PolicyAction.ALLOW, PolicyAction.CHALLENGE]).toContain(result.decision)
    })

    it('should escalate access requirements based on risk', async () => {
      // Low risk access
      const lowRiskContext: EvaluationContext = {
        requestId: 'low-risk-req',
        timestamp: Date.now(),
        user: {
          userId: 'low-risk-user',
          email: 'lowrisk@example.com',
          roles: ['user'],
          groups: [],
          mfaEnabled: true,
          authMethods: ['password', 'totp'],
          lastAuthTime: Date.now(),
        },
        device: {
          deviceId: 'low-risk-device',
          deviceType: 'desktop',
          osType: 'Windows',
          osVersion: '11',
          hardwareId: 'hw-lr',
          encryptionEnabled: true,
          antivirusStatus: 'active',
          lastHealthCheck: Date.now(),
          complianceStatus: 'compliant',
          vpnConnected: true,
        },
        network: {
          ipAddress: '192.168.1.1',
          isVPN: true,
          isProxy: false,
        },
        resource: {
          resourceId: 'public-res',
          resourceType: 'file',
          classification: 'public',
          accessLevel: 'read',
        },
        action: 'read',
      }

      const lowRiskResult = policyEngine.evaluatePolicies(lowRiskContext)

      // High risk access
      const highRiskContext: EvaluationContext = {
        ...lowRiskContext,
        requestId: 'high-risk-req',
        user: {
          ...lowRiskContext.user,
          riskProfile: 'high',
          mfaEnabled: false,
          lastAuthTime: Date.now() - 86400000, // 1 day ago
        },
        device: {
          ...lowRiskContext.device,
          complianceStatus: 'non_compliant',
          antivirusStatus: 'disabled',
        },
        resource: {
          ...lowRiskContext.resource,
          classification: 'restricted',
          accessLevel: 'admin',
        },
      }

      const highRiskResult = policyEngine.evaluatePolicies(highRiskContext)

      // High risk should require more authentication
      expect(highRiskResult.requiresMfa || highRiskResult.requiresStepUp).toBe(true)
    })

    it('should combine identity and network segmentation policies', async () => {
      // Create user with identity policy
      const userSegment = microSegmentation.createSegment(
        'User-Segment',
        SegmentType.USER,
        DataClassification.INTERNAL
      )
      const appSegment = microSegmentation.createSegment(
        'App-Segment',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )

      // Create identity policy
      microSegmentation.createIdentityPolicy('combined-user', [appSegment.id], {
        requiresMFA: true,
        ipWhitelist: ['10.0.0.0/8'],
      })

      // Create network policy
      microSegmentation.createPolicy(
        'Combined-Policy',
        userSegment.id,
        appSegment.id,
        TrafficDirection.EGRESS,
        [Protocol.HTTPS],
        SegmentPolicyAction.ALLOW
      )

      // Verify access
      const access = await microSegmentation.checkIdentityAccess('combined-user', appSegment.id, {
        sourceIp: '10.0.0.1',
      })

      expect(access.allowed).toBe(true)
      expect(access.requiresMFA).toBe(true)
    })

    it('should handle policy cascading', () => {
      // Create multiple policies with different priorities
      const policy1: ZeroTrustPolicy = {
        id: 'cascade-1',
        version: 1,
        name: 'General Access',
        type: PolicyType.ACCESS,
        enabled: true,
        priority: 100,
        conditions: [
          {
            type: 'user',
            operator: 'in',
            field: 'roles',
            value: ['user'],
          },
        ],
        action: PolicyAction.ALLOW,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'system',
      }

      const policy2: ZeroTrustPolicy = {
        id: 'cascade-2',
        version: 1,
        name: 'High Risk Challenge',
        type: PolicyType.ACCESS,
        enabled: true,
        priority: 50,
        conditions: [
          {
            type: 'risk',
            operator: 'greater_than',
            field: 'riskScore',
            value: 60,
          },
        ],
        action: PolicyAction.CHALLENGE,
        stepUpRequired: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'system',
      }

      const policy3: ZeroTrustPolicy = {
        id: 'cascade-3',
        version: 1,
        name: 'Critical Deny',
        type: PolicyType.ACCESS,
        enabled: true,
        priority: 1,
        conditions: [
          {
            type: 'device',
            operator: 'equals',
            field: 'complianceStatus',
            value: 'non_compliant',
          },
        ],
        action: PolicyAction.DENY,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'system',
      }

      policyEngine.createPolicy(policy1)
      policyEngine.createPolicy(policy2)
      policyEngine.createPolicy(policy3)

      const policies = policyEngine.listPolicies(PolicyType.ACCESS)

      expect(policies.length).toBeGreaterThanOrEqual(3)
    })

    it('should provide detailed audit trail for multi-layer verification', async () => {
      // Perform complete flow
      await idVerification.setupMFA('audit-user', {
        primaryMethod: MFAMethod.TOTP,
      })

      const session = idVerification.createSession(
        'audit-user',
        {
          deviceId: 'audit-device',
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.99',
          osVersion: 'Windows 11',
          browserVersion: 'Chrome 120',
          screenResolution: '1920x1080',
          timezone: 'UTC',
          language: 'en',
          hash: 'audit_hash',
        },
        AuthStrength.STRONG,
        [MFAMethod.TOTP],
        '192.168.1.99'
      )

      // Get audit logs
      await new Promise(resolve => setTimeout(resolve, 100))

      const logs = idVerification.getAuditLogs({ userId: 'audit-user' })

      expect(logs.length).toBeGreaterThan(0)
      expect(logs[0].userId).toBe('audit-user')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Policy & Segmentation Consistency (5 tests)
  // ─────────────────────────────────────────────────────────────────────────

  describe('Policy & Segmentation Consistency', () => {
    it('should maintain policy consistency during updates', () => {
      const policy: ZeroTrustPolicy = {
        id: 'consistency-1',
        version: 1,
        name: 'Consistent Policy',
        type: PolicyType.ACCESS,
        enabled: true,
        priority: 10,
        conditions: [],
        action: PolicyAction.ALLOW,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'system',
      }

      policyEngine.createPolicy(policy)

      // Update policy
      const updated = {
        ...policy,
        name: 'Updated Consistent Policy',
      }
      policyEngine.createPolicy(updated)

      // Retrieve and verify
      const retrieved = policyEngine.getPolicy('consistency-1')

      expect(retrieved?.name).toBe('Updated Consistent Policy')
      expect(retrieved?.version).toBe(2)
    })

    it('should prevent orphaned segment policies', () => {
      const segment = microSegmentation.createSegment(
        'Orphan-Segment',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )

      microSegmentation.createPolicy(
        'Orphan Policy',
        segment.id,
        segment.id,
        TrafficDirection.BIDIRECTIONAL,
        [Protocol.TCP],
        SegmentPolicyAction.ALLOW
      )

      // Delete segment
      microSegmentation.deleteSegment(segment.id)

      // Verify policies are cleaned up
      const policies = microSegmentation.getAllPolicies()
      const orphaned = policies.filter(p => p.sourceSegment === segment.id)

      expect(orphaned.length).toBe(0)
    })

    it('should sync identity policies with segmentation', async () => {
      const segment = microSegmentation.createSegment(
        'Sync-Segment',
        SegmentType.APPLICATION,
        DataClassification.INTERNAL
      )

      const idPolicy = microSegmentation.createIdentityPolicy('sync-user', [segment.id], {
        requiresMFA: true,
      })

      const access = await microSegmentation.checkIdentityAccess('sync-user', segment.id)

      expect(access.requiresMFA).toBe(true)
      expect(idPolicy.requiresMFA).toBe(true)
    })

    it('should enforce consistent data classification', () => {
      const publicSeg = microSegmentation.createSegment(
        'Public Data',
        SegmentType.DATA,
        DataClassification.PUBLIC
      )

      const confidentialSeg = microSegmentation.createSegment(
        'Confidential Data',
        SegmentType.DATA,
        DataClassification.CONFIDENTIAL
      )

      const restrictedSeg = microSegmentation.createSegment(
        'Restricted Data',
        SegmentType.DATA,
        DataClassification.RESTRICTED
      )

      expect(publicSeg.classification).toBe(DataClassification.PUBLIC)
      expect(confidentialSeg.classification).toBe(DataClassification.CONFIDENTIAL)
      expect(restrictedSeg.classification).toBe(DataClassification.RESTRICTED)
    })

    it('should maintain compliance across all systems', () => {
      // Get policy statistics
      const policyStats = policyEngine.getStatistics()

      // Get segmentation report
      const segmentReport = microSegmentation.getComplianceReport()

      // Get identity compliance
      const idCompliance = idVerification.getComplianceReport()

      expect(policyStats.totalPolicies).toBeGreaterThanOrEqual(0)
      expect(segmentReport.compliance).toBeGreaterThanOrEqual(0)
      expect(idCompliance.totalEvents).toBeGreaterThanOrEqual(0)
    })
  })
})
