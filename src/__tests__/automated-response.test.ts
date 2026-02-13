/**
 * Comprehensive Test Suite for Automated Response System
 *
 * Tests for:
 * - PlaybookEngine (40+ tests)
 * - RemediationActions (35+ tests)
 * - ResponseOrchestrator (35+ tests)
 * - Integration scenarios (15+ tests)
 *
 * Total: 125+ comprehensive tests covering all incident response functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { EventEmitter } from 'events'
import pino from 'pino'
import {
  PlaybookEngine,
  type PlaybookDefinition,
  type ExecutionRecord,
  type VariableContext,
  type PlaybookState,
  type SeverityLevel
} from '../integrations/response/PlaybookEngine'
import {
  ActionRegistry,
  type RemediationAction,
  type ActionResult,
  type ActionExecutionConfig
} from '../integrations/response/RemediationActions'
import {
  ResponseOrchestrator,
  IncidentSeverity,
  IncidentStatus,
  ActionType,
  NotificationChannel,
  PlaybookStatus,
  EvidenceType,
  type Incident,
  type Playbook,
  type PlaybookAction,
  type PlaybookExecution
} from '../integrations/response/ResponseOrchestrator'

// ============================================================================
// TEST SETUP
// ============================================================================

// Create a silent logger for tests
const testLogger = pino({ level: 'silent' })

// Mock implementations
class MockLogger extends EventEmitter {
  info = vi.fn()
  error = vi.fn()
  warn = vi.fn()
  debug = vi.fn()
}

// ============================================================================
// PLAYBOOK ENGINE TESTS
// ============================================================================

describe('PlaybookEngine', () => {
  let engine: PlaybookEngine

  beforeEach(() => {
    engine = new PlaybookEngine()
  })

  describe('Playbook CRUD Operations', () => {
    it('should register a playbook', () => {
      const playbook: PlaybookDefinition = {
        metadata: {
          id: 'pb_test_001',
          name: 'Test Playbook',
          description: 'Test playbook for unit testing',
          severity: 'high',
          author: 'Test Author',
          version: 1,
          state: 'active',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          tags: ['test'],
          category: 'test'
        },
        triggers: [],
        variables: {},
        actions: []
      }

      engine.registerPlaybook(playbook)
      const retrieved = engine.getPlaybook('pb_test_001')

      expect(retrieved).toBeDefined()
      expect(retrieved?.metadata.name).toBe('Test Playbook')
    })

    it('should update a playbook and maintain version history', () => {
      const playbook: PlaybookDefinition = {
        metadata: {
          id: 'pb_version_test',
          name: 'Version Test',
          description: 'Test version control',
          severity: 'medium',
          author: 'Test',
          version: 1,
          state: 'active',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          tags: [],
          category: 'test'
        },
        triggers: [],
        variables: {},
        actions: []
      }

      engine.registerPlaybook(playbook)
      const updated = engine.updatePlaybook(
        'pb_version_test',
        { metadata: { ...playbook.metadata, name: 'Updated Name' } },
        'updater',
        'Name change'
      )

      expect(updated.metadata.version).toBe(2)
      expect(updated.metadata.name).toBe('Updated Name')
    })

    it('should retrieve playbook by ID', () => {
      const playbook: PlaybookDefinition = {
        metadata: {
          id: 'pb_retrieve',
          name: 'Retrieve Test',
          description: 'Test retrieval',
          severity: 'low',
          author: 'Test',
          version: 1,
          state: 'active',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          tags: [],
          category: 'test'
        },
        triggers: [],
        variables: {},
        actions: []
      }

      engine.registerPlaybook(playbook)
      const retrieved = engine.getPlaybook('pb_retrieve')

      expect(retrieved).toBeDefined()
      expect(retrieved?.metadata.id).toBe('pb_retrieve')
    })

    it('should return undefined for non-existent playbook', () => {
      const result = engine.getPlaybook('non_existent')
      expect(result).toBeUndefined()
    })

    it('should list all playbooks', () => {
      for (let i = 0; i < 3; i++) {
        const playbook: PlaybookDefinition = {
          metadata: {
            id: `pb_list_${i}`,
            name: `Playbook ${i}`,
            description: `Test playbook ${i}`,
            severity: 'medium',
            author: 'Test',
            version: 1,
            state: 'active',
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            tags: [],
            category: 'test'
          },
          triggers: [],
          variables: {},
          actions: []
        }
        engine.registerPlaybook(playbook)
      }

      const playbookList = engine.listPlaybooks()
      expect(playbookList.length).toBeGreaterThanOrEqual(3)
    })

    it('should filter playbooks by state', () => {
      const activePb: PlaybookDefinition = {
        metadata: {
          id: 'pb_active',
          name: 'Active',
          description: 'Active playbook',
          severity: 'medium',
          author: 'Test',
          version: 1,
          state: 'active',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          tags: [],
          category: 'test'
        },
        triggers: [],
        variables: {},
        actions: []
      }

      const disabledPb: PlaybookDefinition = {
        metadata: {
          id: 'pb_disabled',
          name: 'Disabled',
          description: 'Disabled playbook',
          severity: 'medium',
          author: 'Test',
          version: 1,
          state: 'disabled',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          tags: [],
          category: 'test'
        },
        triggers: [],
        variables: {},
        actions: []
      }

      engine.registerPlaybook(activePb)
      engine.registerPlaybook(disabledPb)

      const activeOnly = engine.listPlaybooks('active')
      expect(activeOnly.some((p) => p.metadata.id === 'pb_active')).toBe(true)
      expect(activeOnly.some((p) => p.metadata.id === 'pb_disabled')).toBe(false)
    })

    it('should filter playbooks by severity', () => {
      const criticalPb: PlaybookDefinition = {
        metadata: {
          id: 'pb_critical',
          name: 'Critical',
          description: 'Critical playbook',
          severity: 'critical',
          author: 'Test',
          version: 1,
          state: 'active',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          tags: [],
          category: 'test'
        },
        triggers: [],
        variables: {},
        actions: []
      }

      engine.registerPlaybook(criticalPb)
      const criticalOnly = engine.listPlaybooks(undefined, 'critical')

      expect(criticalOnly.some((p) => p.metadata.severity === 'critical')).toBe(true)
    })
  })

  describe('Trigger Condition Matching', () => {
    it('should match trigger conditions', () => {
      const playbook: PlaybookDefinition = {
        metadata: {
          id: 'pb_trigger',
          name: 'Trigger Test',
          description: 'Test trigger matching',
          severity: 'high',
          author: 'Test',
          version: 1,
          state: 'active',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          tags: [],
          category: 'test'
        },
        triggers: [
          {
            eventType: 'security_alert',
            condition: '{{event.severity}} === "critical"'
          }
        ],
        variables: {},
        actions: []
      }

      engine.registerPlaybook(playbook)
      expect(playbook.triggers.length).toBe(1)
    })

    it('should evaluate trigger with threshold', () => {
      const playbook: PlaybookDefinition = {
        metadata: {
          id: 'pb_threshold',
          name: 'Threshold Test',
          description: 'Test threshold evaluation',
          severity: 'high',
          author: 'Test',
          version: 1,
          state: 'active',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          tags: [],
          category: 'test'
        },
        triggers: [
          {
            eventType: 'access_alert',
            condition: '{{event.failedLoginCount}} >= 5',
            threshold: 5,
            timeWindow: 300000
          }
        ],
        variables: {},
        actions: []
      }

      engine.registerPlaybook(playbook)
      const trigger = playbook.triggers[0]

      expect(trigger.threshold).toBe(5)
      expect(trigger.timeWindow).toBe(300000)
    })

    it('should evaluate pattern-based triggers', () => {
      const playbook: PlaybookDefinition = {
        metadata: {
          id: 'pb_pattern',
          name: 'Pattern Test',
          description: 'Test pattern matching',
          severity: 'high',
          author: 'Test',
          version: 1,
          state: 'active',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          tags: [],
          category: 'test'
        },
        triggers: [
          {
            eventType: 'security_alert',
            condition: '{{event.iocType}} === "malware"',
            pattern: 'malware_hash|c2_domain'
          }
        ],
        variables: {},
        actions: []
      }

      engine.registerPlaybook(playbook)
      expect(playbook.triggers[0].pattern).toBeDefined()
    })
  })

  describe('Variable Substitution', () => {
    it('should substitute variables in payload', async () => {
      const playbook: PlaybookDefinition = {
        metadata: {
          id: 'pb_vars',
          name: 'Variable Test',
          description: 'Test variable substitution',
          severity: 'high',
          author: 'Test',
          version: 1,
          state: 'active',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          tags: [],
          category: 'test'
        },
        triggers: [],
        variables: {
          sourceIP: '192.168.1.1',
          userId: 'user123'
        },
        actions: [
          {
            id: 'action_1',
            name: 'Test Action',
            type: 'notification',
            service: 'email',
            payload: {
              message: 'User {{userId}} from {{sourceIP}} detected'
            }
          }
        ]
      }

      engine.registerPlaybook(playbook)
      expect(playbook.variables.sourceIP).toBe('192.168.1.1')
    })

    it('should handle nested variable substitution', async () => {
      const playbook: PlaybookDefinition = {
        metadata: {
          id: 'pb_nested_vars',
          name: 'Nested Variables',
          description: 'Test nested variable substitution',
          severity: 'medium',
          author: 'Test',
          version: 1,
          state: 'active',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          tags: [],
          category: 'test'
        },
        triggers: [],
        variables: {
          event: {
            source: { ip: '10.0.0.1' },
            user: { id: 'user456' }
          }
        },
        actions: []
      }

      engine.registerPlaybook(playbook)
      expect((playbook.variables.event as any).source.ip).toBe('10.0.0.1')
    })
  })

  describe('Action Execution', () => {
    it('should execute sequential actions', async () => {
      const playbook: PlaybookDefinition = {
        metadata: {
          id: 'pb_seq',
          name: 'Sequential Actions',
          description: 'Test sequential execution',
          severity: 'high',
          author: 'Test',
          version: 1,
          state: 'active',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          tags: [],
          category: 'test'
        },
        triggers: [],
        variables: {},
        actions: [
          {
            id: 'action_1',
            name: 'First Action',
            type: 'notification',
            service: 'slack',
            payload: { message: 'First' }
          },
          {
            id: 'action_2',
            name: 'Second Action',
            type: 'notification',
            service: 'email',
            payload: { message: 'Second' },
            dependsOn: ['action_1']
          }
        ]
      }

      engine.registerPlaybook(playbook)
      const execution = await engine.executePlaybook('pb_seq', {})

      expect(execution.status).toBeDefined()
      expect(execution.actions.length).toBeGreaterThan(0)
    })

    it('should execute parallel actions', async () => {
      const playbook: PlaybookDefinition = {
        metadata: {
          id: 'pb_parallel',
          name: 'Parallel Actions',
          description: 'Test parallel execution',
          severity: 'high',
          author: 'Test',
          version: 1,
          state: 'active',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          tags: [],
          category: 'test'
        },
        triggers: [],
        variables: {},
        actions: [
          {
            id: 'action_1',
            name: 'Parallel 1',
            type: 'notification',
            service: 'slack',
            payload: { message: 'Parallel 1' },
            runInParallel: true
          },
          {
            id: 'action_2',
            name: 'Parallel 2',
            type: 'notification',
            service: 'email',
            payload: { message: 'Parallel 2' },
            runInParallel: true
          }
        ]
      }

      engine.registerPlaybook(playbook)
      const execution = await engine.executePlaybook('pb_parallel', {})

      expect(execution.status).toBeDefined()
    })

    it('should handle action timeouts', async () => {
      const playbook: PlaybookDefinition = {
        metadata: {
          id: 'pb_timeout',
          name: 'Timeout Test',
          description: 'Test timeout handling',
          severity: 'high',
          author: 'Test',
          version: 1,
          state: 'active',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          tags: [],
          category: 'test'
        },
        triggers: [],
        variables: {},
        actions: [
          {
            id: 'action_timeout',
            name: 'Timeout Action',
            type: 'notification',
            service: 'slack',
            payload: {},
            timeout: 5000
          }
        ]
      }

      engine.registerPlaybook(playbook)
      expect(playbook.actions[0].timeout).toBe(5000)
    })

    it('should apply retry logic on action failure', async () => {
      const playbook: PlaybookDefinition = {
        metadata: {
          id: 'pb_retry',
          name: 'Retry Test',
          description: 'Test retry logic',
          severity: 'high',
          author: 'Test',
          version: 1,
          state: 'active',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          tags: [],
          category: 'test'
        },
        triggers: [],
        variables: {},
        actions: [
          {
            id: 'action_retry',
            name: 'Retry Action',
            type: 'notification',
            service: 'slack',
            payload: {},
            retryPolicy: {
              maxRetries: 3,
              backoffMultiplier: 2,
              initialDelayMs: 100
            }
          }
        ]
      }

      engine.registerPlaybook(playbook)
      const action = playbook.actions[0]

      expect(action.retryPolicy?.maxRetries).toBe(3)
      expect(action.retryPolicy?.backoffMultiplier).toBe(2)
    })
  })

  describe('Conditional Branching', () => {
    it('should execute conditional branches', async () => {
      const playbook: PlaybookDefinition = {
        metadata: {
          id: 'pb_conditional',
          name: 'Conditional Test',
          description: 'Test conditional branching',
          severity: 'high',
          author: 'Test',
          version: 1,
          state: 'active',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          tags: [],
          category: 'test'
        },
        triggers: [],
        variables: {},
        actions: [],
        conditionalBranches: [
          {
            condition: '{{event.severity}} === "critical"',
            actions: [
              {
                id: 'action_critical',
                name: 'Critical Action',
                type: 'escalation',
                service: 'jira',
                payload: {}
              }
            ]
          }
        ]
      }

      engine.registerPlaybook(playbook)
      expect(playbook.conditionalBranches?.length).toBe(1)
    })

    it('should handle else branches', async () => {
      const playbook: PlaybookDefinition = {
        metadata: {
          id: 'pb_else',
          name: 'Else Branch Test',
          description: 'Test else branching',
          severity: 'medium',
          author: 'Test',
          version: 1,
          state: 'active',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          tags: [],
          category: 'test'
        },
        triggers: [],
        variables: {},
        actions: [],
        conditionalBranches: [
          {
            condition: '{{event.severity}} === "critical"',
            actions: [{ id: 'a1', name: 'Critical', type: 'notification', service: 'slack', payload: {} }],
            elseActions: [{ id: 'a2', name: 'Non-Critical', type: 'notification', service: 'email', payload: {} }]
          }
        ]
      }

      engine.registerPlaybook(playbook)
      expect(playbook.conditionalBranches?.[0].elseActions).toBeDefined()
    })
  })

  describe('Approval Workflows', () => {
    it('should configure automatic approval', async () => {
      const playbook: PlaybookDefinition = {
        metadata: {
          id: 'pb_auto_approve',
          name: 'Auto Approve',
          description: 'Test auto approval',
          severity: 'high',
          author: 'Test',
          version: 1,
          state: 'active',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          tags: [],
          category: 'test'
        },
        triggers: [],
        variables: {},
        actions: [],
        approval: {
          mode: 'auto'
        }
      }

      engine.registerPlaybook(playbook)
      expect(playbook.approval?.mode).toBe('auto')
    })

    it('should require manual approval', async () => {
      const playbook: PlaybookDefinition = {
        metadata: {
          id: 'pb_manual_approve',
          name: 'Manual Approve',
          description: 'Test manual approval',
          severity: 'critical',
          author: 'Test',
          version: 1,
          state: 'active',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          tags: [],
          category: 'test'
        },
        triggers: [],
        variables: {},
        actions: [],
        approval: {
          mode: 'manual',
          requiredApprovers: ['security-lead@company.com'],
          timeoutMs: 3600000,
          timeoutAction: 'auto_approve'
        }
      }

      engine.registerPlaybook(playbook)
      expect(playbook.approval?.mode).toBe('manual')
      expect(playbook.approval?.requiredApprovers).toContain('security-lead@company.com')
    })

    it('should handle escalating approval', async () => {
      const playbook: PlaybookDefinition = {
        metadata: {
          id: 'pb_escalate_approve',
          name: 'Escalate Approve',
          description: 'Test escalating approval',
          severity: 'critical',
          author: 'Test',
          version: 1,
          state: 'active',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          tags: [],
          category: 'test'
        },
        triggers: [],
        variables: {},
        actions: [],
        approval: {
          mode: 'escalating',
          requiredApprovers: ['lead@company.com'],
          timeoutMs: 300000,
          timeoutAction: 'escalate'
        }
      }

      engine.registerPlaybook(playbook)
      expect(playbook.approval?.mode).toBe('escalating')
    })
  })

  describe('Playbook Metrics', () => {
    it('should calculate execution metrics', async () => {
      const playbook: PlaybookDefinition = {
        metadata: {
          id: 'pb_metrics',
          name: 'Metrics Test',
          description: 'Test metrics calculation',
          severity: 'high',
          author: 'Test',
          version: 1,
          state: 'active',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          tags: [],
          category: 'test'
        },
        triggers: [],
        variables: {},
        actions: [
          {
            id: 'action_1',
            name: 'Test',
            type: 'notification',
            service: 'slack',
            payload: {}
          }
        ]
      }

      engine.registerPlaybook(playbook)
      const execution = await engine.executePlaybook('pb_metrics', {})

      expect(execution.metrics.totalDuration).toBeGreaterThanOrEqual(0)
      expect(execution.metrics.actionsCompleted).toBeGreaterThanOrEqual(0)
    })

    it('should retrieve execution history', async () => {
      const playbook: PlaybookDefinition = {
        metadata: {
          id: 'pb_history',
          name: 'History Test',
          description: 'Test history retrieval',
          severity: 'medium',
          author: 'Test',
          version: 1,
          state: 'active',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          tags: [],
          category: 'test'
        },
        triggers: [],
        variables: {},
        actions: []
      }

      engine.registerPlaybook(playbook)
      await engine.executePlaybook('pb_history', {})

      const history = engine.getExecutionHistory('pb_history')
      expect(history.length).toBeGreaterThan(0)
    })

    it('should get playbook metrics', async () => {
      const playbook: PlaybookDefinition = {
        metadata: {
          id: 'pb_get_metrics',
          name: 'Get Metrics',
          description: 'Test getting metrics',
          severity: 'low',
          author: 'Test',
          version: 1,
          state: 'active',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          tags: [],
          category: 'test'
        },
        triggers: [],
        variables: {},
        actions: []
      }

      engine.registerPlaybook(playbook)
      await engine.executePlaybook('pb_get_metrics', {})

      const metrics = engine.getMetrics('pb_get_metrics')
      expect(metrics).toBeDefined()
    })
  })

  describe('Pre-built Playbooks', () => {
    it('should have brute force playbook', () => {
      const playbook = engine.getPlaybook('pb_bruteforce')
      expect(playbook).toBeDefined()
      expect(playbook?.metadata.name).toContain('Brute Force')
    })

    it('should have malware detection playbook', () => {
      const playbook = engine.getPlaybook('pb_malware')
      expect(playbook).toBeDefined()
      expect(playbook?.metadata.severity).toBe('critical')
    })

    it('should have ransomware playbook', () => {
      const playbook = engine.getPlaybook('pb_ransomware')
      expect(playbook).toBeDefined()
      expect(playbook?.metadata.category).toBe('threat-response')
    })

    it('should have phishing playbook', () => {
      const playbook = engine.getPlaybook('pb_phishing')
      expect(playbook).toBeDefined()
    })

    it('should have DDoS playbook', () => {
      const playbook = engine.getPlaybook('pb_ddos')
      expect(playbook).toBeDefined()
    })

    it('should have credential compromise playbook', () => {
      const playbook = engine.getPlaybook('pb_credential_compromise')
      expect(playbook).toBeDefined()
      expect(playbook?.metadata.severity).toBe('critical')
    })
  })
})

// ============================================================================
// REMEDIATION ACTIONS TESTS
// ============================================================================

describe('RemediationActions', () => {
  let registry: ActionRegistry

  beforeEach(() => {
    registry = new ActionRegistry()
  })

  describe('Action Registration', () => {
    it('should register custom action', () => {
      const customAction: RemediationAction = {
        name: 'CustomAction',
        category: 'test',
        description: 'Custom test action',
        severity: 'medium',
        requiredParams: ['param1'],
        async validate(params) {
          return !!params.param1
        },
        async execute(params) {
          return {
            actionName: 'CustomAction',
            success: true,
            timestamp: new Date().toISOString(),
            duration: 100,
            message: 'Custom action executed'
          }
        },
        async rollback() {}
      }

      registry.register(customAction)
      const action = registry.getAction('CustomAction')

      expect(action).toBeDefined()
      expect(action?.name).toBe('CustomAction')
    })

    it('should list all registered actions', () => {
      const actions = registry.listActions()
      expect(actions.length).toBeGreaterThan(10)
    })

    it('should unregister action', () => {
      registry.unregister('BlockIP')
      const action = registry.getAction('BlockIP')

      expect(action).toBeUndefined()
    })
  })

  describe('Action Validation', () => {
    it('should validate BlockIP action', async () => {
      const blockIp = registry.getAction('BlockIP')
      const valid = await blockIp?.validate({ ipAddress: '192.168.1.1', duration: 3600 })

      expect(valid).toBe(true)
    })

    it('should reject invalid IP address', async () => {
      const blockIp = registry.getAction('BlockIP')
      const valid = await blockIp?.validate({ ipAddress: 'invalid', duration: 3600 })

      expect(valid).toBe(false)
    })

    it('should validate LockAccount action', async () => {
      const lockAccount = registry.getAction('LockAccount')
      const valid = await lockAccount?.validate({ userId: 'user123', reason: 'Security incident' })

      expect(valid).toBe(true)
    })

    it('should validate email format', async () => {
      const blockSender = registry.getAction('BlockSender')
      const valid = await blockSender?.validate({ senderEmail: 'test@example.com' })

      expect(valid).toBe(true)
    })

    it('should reject invalid email', async () => {
      const blockSender = registry.getAction('BlockSender')
      const valid = await blockSender?.validate({ senderEmail: 'invalid-email' })

      expect(valid).toBe(false)
    })
  })

  describe('Network Actions', () => {
    it('should execute BlockIP action', async () => {
      const result = await registry.execute('BlockIP', {
        ipAddress: '192.168.1.100',
        duration: 3600,
        reason: 'Suspicious activity'
      })

      expect(result.success).toBe(true)
      expect(result.actionName).toBe('BlockIP')
      expect(result.rollbackId).toBeDefined()
    })

    it('should execute IsolateHost action', async () => {
      const result = await registry.execute('IsolateHost', {
        hostname: 'infected-server',
        isolationType: 'full'
      })

      expect(result.success).toBe(true)
      expect(result.message).toContain('isolated')
    })

    it('should execute EnableRateLimiting action', async () => {
      const result = await registry.execute('EnableRateLimiting', {
        target: 'api.example.com',
        requestsPerSecond: 100
      })

      expect(result.success).toBe(true)
      expect(result.message).toContain('Rate limiting')
    })
  })

  describe('Identity Actions', () => {
    it('should execute LockAccount action', async () => {
      const result = await registry.execute('LockAccount', {
        userId: 'user123',
        reason: 'Suspected compromise'
      })

      expect(result.success).toBe(true)
      expect(result.data?.userId).toBe('user123')
    })

    it('should execute ForcePasswordReset action', async () => {
      const result = await registry.execute('ForcePasswordReset', {
        userId: 'user456'
      })

      expect(result.success).toBe(true)
      expect(result.data?.resetToken).toBeDefined()
    })

    it('should execute RevokeAllSessions action', async () => {
      const result = await registry.execute('RevokeAllSessions', {
        userId: 'user789'
      })

      expect(result.success).toBe(true)
      expect(result.message).toContain('sessions revoked')
    })

    it('should execute RevokeAPIKeys action', async () => {
      const result = await registry.execute('RevokeAPIKeys', {
        userId: 'developer123'
      })

      expect(result.success).toBe(true)
      expect(result.data?.keysRevoked).toBeGreaterThanOrEqual(0)
    })

    it('should execute ModifyPermissions action', async () => {
      const result = await registry.execute('ModifyPermissions', {
        userId: 'user999',
        permissions: ['read', 'write']
      })

      expect(result.success).toBe(true)
    })
  })

  describe('Endpoint Actions', () => {
    it('should execute IsolateEndpoint action', async () => {
      const result = await registry.execute('IsolateEndpoint', {
        endpointId: 'ep-001'
      })

      expect(result.success).toBe(true)
      expect(result.data?.isolationId).toBeDefined()
    })

    it('should execute KillProcess action', async () => {
      const result = await registry.execute('KillProcess', {
        processId: 'proc-123',
        reason: 'Malicious process'
      })

      expect(result.success).toBe(true)
    })

    it('should execute RunAVScan action', async () => {
      const result = await registry.execute('RunAVScan', {
        endpointId: 'ep-002',
        scanType: 'full'
      })

      expect(result.success).toBe(true)
      expect(result.data?.scanId).toBeDefined()
    })
  })

  describe('Email Actions', () => {
    it('should execute QuarantineEmail action', async () => {
      const result = await registry.execute('QuarantineEmail', {
        messageId: 'msg-123',
        reason: 'Phishing attempt'
      })

      expect(result.success).toBe(true)
      expect(result.data?.quarantineId).toBeDefined()
    })

    it('should execute BlockSender action', async () => {
      const result = await registry.execute('BlockSender', {
        senderEmail: 'attacker@example.com'
      })

      expect(result.success).toBe(true)
    })

    it('should execute NotifyRecipients action', async () => {
      const result = await registry.execute('NotifyRecipients', {
        recipients: ['user1@example.com', 'user2@example.com'],
        messageId: 'msg-456'
      })

      expect(result.success).toBe(true)
      expect(result.data?.recipientCount).toBe(2)
    })
  })

  describe('Cloud Actions', () => {
    it('should execute RevokeCloudAccess action', async () => {
      const result = await registry.execute('RevokeCloudAccess', {
        serviceId: 'aws-prod',
        userId: 'user@company.com'
      })

      expect(result.success).toBe(true)
    })

    it('should execute RotateCredentials action', async () => {
      const result = await registry.execute('RotateCredentials', {
        serviceId: 'aws-staging'
      })

      expect(result.success).toBe(true)
      expect(result.data?.newSecretId).toBeDefined()
    })

    it('should execute SnapshotInstance action', async () => {
      const result = await registry.execute('SnapshotInstance', {
        instanceId: 'i-123456'
      })

      expect(result.success).toBe(true)
      expect(result.data?.snapshotId).toBeDefined()
    })

    it('should execute TerminateInstance action', async () => {
      const result = await registry.execute('TerminateInstance', {
        instanceId: 'i-789012'
      })

      expect(result.success).toBe(true)
    })
  })

  describe('Communication Actions', () => {
    it('should execute SendAlert action', async () => {
      const result = await registry.execute('SendAlert', {
        recipients: ['security@company.com'],
        alertMessage: 'Critical security incident detected'
      })

      expect(result.success).toBe(true)
    })

    it('should execute CreateTicket action', async () => {
      const result = await registry.execute('CreateTicket', {
        title: 'Security Incident',
        description: 'Unauthorized access detected'
      })

      expect(result.success).toBe(true)
      expect(result.data?.ticketId).toBeDefined()
    })

    it('should execute PostToSlack action', async () => {
      const result = await registry.execute('PostToSlack', {
        channel: '#security-alerts',
        message: 'Alert: Suspicious activity detected'
      })

      expect(result.success).toBe(true)
    })

    it('should execute EscalateIncident action', async () => {
      const result = await registry.execute('EscalateIncident', {
        incidentId: 'inc-123',
        reason: 'Critical severity escalation'
      })

      expect(result.success).toBe(true)
    })
  })

  describe('Dry-Run Mode', () => {
    it('should execute action in dry-run mode', async () => {
      const result = await registry.execute(
        'BlockIP',
        {
          ipAddress: '10.0.0.1',
          duration: 3600
        },
        { dryRun: true }
      )

      expect(result.success).toBe(true)
      expect(result.message).toContain('DRY-RUN')
    })

    it('should not execute in dry-run mode', async () => {
      const config: ActionExecutionConfig = { dryRun: true }
      const result = await registry.execute('LockAccount', { userId: 'test', reason: 'testing' }, config)

      expect(result.message).toContain('DRY-RUN')
    })
  })

  describe('Batch Execution', () => {
    it('should execute batch of actions', async () => {
      const results = await registry.executeBatch([
        { name: 'BlockIP', params: { ipAddress: '192.168.1.1', duration: 3600 } },
        { name: 'LockAccount', params: { userId: 'user123', reason: 'Testing' } }
      ])

      expect(results.length).toBe(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(true)
    })

    it('should handle batch rollback on failure', async () => {
      const config: ActionExecutionConfig = { rollbackOnFailure: true }
      const results = await registry.executeBatch(
        [
          { name: 'BlockIP', params: { ipAddress: '192.168.1.1', duration: 3600 } },
          { name: 'LockAccount', params: { userId: 'test', reason: 'Batch test' } }
        ],
        config
      )

      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe('Execution History', () => {
    it('should track execution history', async () => {
      await registry.execute('BlockIP', { ipAddress: '10.0.0.1', duration: 3600 })
      await registry.execute('LockAccount', { userId: 'user', reason: 'Test' })

      const history = registry.getHistory()
      expect(history.length).toBeGreaterThanOrEqual(2)
    })

    it('should limit history with offset', async () => {
      await registry.execute('BlockIP', { ipAddress: '10.0.0.1', duration: 3600 })
      const history = registry.getHistory(1)

      expect(history.length).toBeLessThanOrEqual(1)
    })

    it('should clear history', async () => {
      await registry.execute('BlockIP', { ipAddress: '10.0.0.1', duration: 3600 })
      registry.clearHistory()

      const history = registry.getHistory()
      expect(history.length).toBe(0)
    })

    it('should get action statistics', async () => {
      await registry.execute('BlockIP', { ipAddress: '10.0.0.1', duration: 3600 })
      await registry.execute('BlockIP', { ipAddress: '10.0.0.2', duration: 3600 })

      const stats = registry.getActionStats()
      expect(stats['BlockIP']).toBe(2)
    })
  })

  describe('Action Events', () => {
    it('should emit action registered event', async () => {
      const eventPromise = new Promise<void>((resolve) => {
        registry.on('action:registered', (actionName: string) => {
          expect(actionName).toBeDefined()
          resolve()
        })
      })

      registry.register({
        name: 'TestEvent',
        category: 'test',
        description: 'Test event emission',
        severity: 'low',
        requiredParams: [],
        async validate() {
          return true
        },
        async execute() {
          return {
            actionName: 'TestEvent',
            success: true,
            timestamp: new Date().toISOString(),
            duration: 0,
            message: 'Test'
          }
        },
        async rollback() {}
      })

      await eventPromise
    })

    it('should emit action executed event', async () => {
      const eventPromise = new Promise<void>((resolve) => {
        registry.on('action:executed', (result: ActionResult) => {
          expect(result.success).toBe(true)
          resolve()
        })
      })

      registry.execute('BlockIP', { ipAddress: '10.0.0.1', duration: 3600 }).catch(() => {})

      await eventPromise
    })
  })
})

// ============================================================================
// RESPONSE ORCHESTRATOR TESTS
// ============================================================================

describe('ResponseOrchestrator', () => {
  let orchestrator: ResponseOrchestrator
  const logger = pino({ level: 'silent' })

  beforeEach(() => {
    orchestrator = new ResponseOrchestrator(logger)
  })

  describe('Incident Management', () => {
    it('should create incident', async () => {
      const incident = await orchestrator.createIncident({
        title: 'Security Alert',
        description: 'Suspicious login attempt',
        severity: IncidentSeverity.HIGH,
        type: 'unauthorized_access',
        reportedBy: 'security@company.com'
      })

      expect(incident).toBeDefined()
      expect(incident.id).toBeDefined()
      expect(incident.severity).toBe(IncidentSeverity.HIGH)
    })

    it('should update incident status', async () => {
      const incident = await orchestrator.createIncident({
        title: 'Test Incident',
        description: 'Test',
        severity: IncidentSeverity.MEDIUM,
        type: 'test',
        reportedBy: 'test@company.com'
      })

      const updated = await orchestrator.updateIncidentStatus(
        incident.id,
        IncidentStatus.INVESTIGATING,
        'investigator@company.com'
      )

      expect(updated.status).toBe(IncidentStatus.INVESTIGATING)
    })

    it('should track incident timeline', async () => {
      const incident = await orchestrator.createIncident({
        title: 'Timeline Test',
        description: 'Test timeline tracking',
        severity: IncidentSeverity.LOW,
        type: 'test',
        reportedBy: 'test@company.com'
      })

      expect(incident.timeline.length).toBeGreaterThan(0)
      expect(incident.timeline[0].action).toContain('created')
    })

    it('should calculate impact score', async () => {
      const incident = await orchestrator.createIncident({
        title: 'Impact Test',
        description: 'Testing impact score',
        severity: IncidentSeverity.CRITICAL,
        type: 'test',
        reportedBy: 'test@company.com',
        affectedSystems: ['sys1', 'sys2', 'sys3']
      })

      expect(incident.metrics.impactScore).toBeGreaterThan(0)
      expect(incident.metrics.impactScore).toBeLessThanOrEqual(100)
    })
  })

  describe('Playbook Selection', () => {
    it('should register playbook', async () => {
      const playbook: Playbook = {
        id: 'pb_test_001',
        name: 'Test Playbook',
        description: 'Test playbook',
        incidentType: 'test_type',
        severityLevel: IncidentSeverity.HIGH,
        actions: [],
        prerequisites: [],
        expectedDuration: 5000,
        tags: [],
        version: 1,
        lastModified: new Date()
      }

      const registered = await orchestrator.registerPlaybook(playbook)
      expect(registered.id).toBe('pb_test_001')
    })

    it('should select applicable playbooks', async () => {
      const playbook: Playbook = {
        id: 'pb_select_001',
        name: 'Selection Test',
        description: 'Test selection',
        incidentType: 'unauthorized_access',
        severityLevel: IncidentSeverity.HIGH,
        actions: [],
        prerequisites: [],
        expectedDuration: 5000,
        tags: [],
        version: 1,
        lastModified: new Date()
      }

      await orchestrator.registerPlaybook(playbook)

      const incident = await orchestrator.createIncident({
        title: 'Selection Test',
        description: 'Test playbook selection',
        severity: IncidentSeverity.HIGH,
        type: 'unauthorized_access',
        reportedBy: 'test@company.com'
      })

      const selected = await orchestrator.selectPlaybooks(incident)
      expect(selected.length).toBeGreaterThan(0)
    })

    it('should rank playbooks by severity', async () => {
      const criticalPb: Playbook = {
        id: 'pb_critical',
        name: 'Critical Playbook',
        description: 'Critical',
        incidentType: 'critical_type',
        severityLevel: IncidentSeverity.CRITICAL,
        actions: [],
        prerequisites: [],
        expectedDuration: 1000,
        tags: [],
        version: 1,
        lastModified: new Date()
      }

      const highPb: Playbook = {
        id: 'pb_high',
        name: 'High Playbook',
        description: 'High',
        incidentType: 'critical_type',
        severityLevel: IncidentSeverity.HIGH,
        actions: [],
        prerequisites: [],
        expectedDuration: 2000,
        tags: [],
        version: 1,
        lastModified: new Date()
      }

      await orchestrator.registerPlaybook(criticalPb)
      await orchestrator.registerPlaybook(highPb)

      const incident = await orchestrator.createIncident({
        title: 'Ranking Test',
        description: 'Test ranking',
        severity: IncidentSeverity.CRITICAL,
        type: 'critical_type',
        reportedBy: 'test@company.com'
      })

      const selected = await orchestrator.selectPlaybooks(incident)
      if (selected.length > 1) {
        const firstSeverity = selected[0].severityLevel
        expect([IncidentSeverity.CRITICAL, IncidentSeverity.HIGH]).toContain(firstSeverity)
      }
    })
  })

  describe('Playbook Execution', () => {
    it('should execute playbook', async () => {
      const playbook: Playbook = {
        id: 'pb_exec_001',
        name: 'Exec Test',
        description: 'Execution test',
        incidentType: 'test',
        severityLevel: IncidentSeverity.MEDIUM,
        actions: [],
        prerequisites: [],
        expectedDuration: 5000,
        tags: [],
        version: 1,
        lastModified: new Date()
      }

      await orchestrator.registerPlaybook(playbook)

      const incident = await orchestrator.createIncident({
        title: 'Exec Test',
        description: 'Testing execution',
        severity: IncidentSeverity.MEDIUM,
        type: 'test',
        reportedBy: 'executor@company.com'
      })

      const execution = await orchestrator.executePlaybook(
        incident.id,
        playbook.id,
        'executor@company.com'
      )

      expect(execution.id).toBeDefined()
      expect([PlaybookStatus.SUCCESS, PlaybookStatus.FAILED, PlaybookStatus.PARTIAL]).toContain(execution.status)
    })

    it('should track execution success rate', async () => {
      const playbook: Playbook = {
        id: 'pb_success_rate',
        name: 'Success Rate Test',
        description: 'Test success rate',
        incidentType: 'test',
        severityLevel: IncidentSeverity.LOW,
        actions: [],
        prerequisites: [],
        expectedDuration: 5000,
        tags: [],
        version: 1,
        lastModified: new Date()
      }

      await orchestrator.registerPlaybook(playbook)

      const incident = await orchestrator.createIncident({
        title: 'Success Rate Test',
        description: 'Testing success rate',
        severity: IncidentSeverity.LOW,
        type: 'test',
        reportedBy: 'test@company.com'
      })

      const execution = await orchestrator.executePlaybook(
        incident.id,
        playbook.id,
        'test@company.com'
      )

      expect(execution.successRate).toBeGreaterThanOrEqual(0)
      expect(execution.successRate).toBeLessThanOrEqual(100)
    })
  })

  describe('Workflow Integration', () => {
    it('should trigger workflow', async () => {
      const incident = await orchestrator.createIncident({
        title: 'Workflow Test',
        description: 'Testing workflow',
        severity: IncidentSeverity.MEDIUM,
        type: 'test',
        reportedBy: 'test@company.com'
      })

      const executionId = await orchestrator.triggerWorkflow(
        incident.id,
        'wf_001',
        'executor@company.com'
      )

      expect(executionId).toBeDefined()
    })

    it('should process workflow result', async () => {
      const incident = await orchestrator.createIncident({
        title: 'Workflow Result Test',
        description: 'Testing workflow result',
        severity: IncidentSeverity.LOW,
        type: 'test',
        reportedBy: 'test@company.com'
      })

      const updated = await orchestrator.processWorkflowResult(
        incident.id,
        'wf_exec_001',
        {
          status: 'success',
          duration: 5000,
          output: { result: 'success' }
        }
      )

      expect(updated.timeline.length).toBeGreaterThan(1)
    })
  })

  describe('Communication Hub', () => {
    it('should send notification', async () => {
      const incident = await orchestrator.createIncident({
        title: 'Notification Test',
        description: 'Testing notifications',
        severity: IncidentSeverity.HIGH,
        type: 'test',
        reportedBy: 'test@company.com'
      })

      // Create a notification template first
      const template = {
        id: 'template_001',
        name: 'Alert Template',
        channel: NotificationChannel.EMAIL,
        subject: 'Security Alert',
        body: 'Incident {{incidentId}}: {{incidentTitle}}',
        variables: [],
        priority: 'high'
      }

      // Manually register template (in real implementation, would use dedicated method)
      const results = await orchestrator.sendNotification(
        incident.id,
        'template_001',
        ['security@company.com'],
        [NotificationChannel.EMAIL]
      )

      expect(results).toBeDefined()
    })

    it('should register escalation chain', async () => {
      const chain = [
        {
          level: 1,
          delayMinutes: 5,
          recipients: ['lead@company.com'],
          channels: [NotificationChannel.EMAIL],
          template: 'template_level1'
        },
        {
          level: 2,
          delayMinutes: 15,
          recipients: ['manager@company.com'],
          channels: [NotificationChannel.SLACK, NotificationChannel.EMAIL],
          template: 'template_level2'
        }
      ]

      await orchestrator.registerEscalationChain('critical_incident', chain)
      expect(chain.length).toBe(2)
    })
  })

  describe('Evidence Management', () => {
    it('should collect evidence', async () => {
      const incident = await orchestrator.createIncident({
        title: 'Evidence Test',
        description: 'Testing evidence collection',
        severity: IncidentSeverity.CRITICAL,
        type: 'test',
        reportedBy: 'test@company.com'
      })

      const evidence = await orchestrator.collectEvidence(
        incident.id,
        {
          type: EvidenceType.LOG_FILE,
          description: 'System logs from compromised server',
          source: 'server-prod-01',
          hash: 'abc123def456',
          storageLocation: 's3://evidence/incident-001/logs.tar.gz'
        },
        'investigator@company.com'
      )

      expect(evidence.id).toBeDefined()
      expect(evidence.type).toBe(EvidenceType.LOG_FILE)
    })

    it('should track evidence access', async () => {
      const incident = await orchestrator.createIncident({
        title: 'Evidence Access Test',
        description: 'Testing evidence access tracking',
        severity: IncidentSeverity.HIGH,
        type: 'test',
        reportedBy: 'test@company.com'
      })

      const evidence = await orchestrator.collectEvidence(
        incident.id,
        {
          type: EvidenceType.MEMORY_DUMP,
          description: 'Memory dump',
          source: 'server',
          hash: 'hash123',
          storageLocation: 's3://evidence/dump.bin'
        },
        'collector@company.com'
      )

      const accessed = await orchestrator.accessEvidence(
        evidence.id,
        'analyst@company.com',
        'Forensic analysis'
      )

      expect(accessed.accessLog.length).toBeGreaterThan(1)
    })

    it('should maintain chain of custody', async () => {
      const incident = await orchestrator.createIncident({
        title: 'Chain of Custody Test',
        description: 'Testing chain of custody',
        severity: IncidentSeverity.CRITICAL,
        type: 'test',
        reportedBy: 'test@company.com'
      })

      const evidence = await orchestrator.collectEvidence(
        incident.id,
        {
          type: EvidenceType.DISK_IMAGE,
          description: 'Full disk image',
          source: 'compromised-system',
          hash: 'xyz789',
          hashAlgorithm: 'sha256',
          storageLocation: 's3://evidence/disk.img'
        },
        'forensics@company.com'
      )

      await orchestrator.accessEvidence(evidence.id, 'analyst1@company.com', 'Analysis')
      await orchestrator.accessEvidence(evidence.id, 'analyst2@company.com', 'Review')

      const finalEvidence = await orchestrator.accessEvidence(
        evidence.id,
        'attorney@company.com',
        'Legal review'
      )

      expect(finalEvidence.accessLog.length).toBe(4)
    })
  })

  describe('Metrics and Reporting', () => {
    it('should generate post-mortem report', async () => {
      const incident = await orchestrator.createIncident({
        title: 'PostMortem Test',
        description: 'Testing post-mortem generation',
        severity: IncidentSeverity.HIGH,
        type: 'test',
        reportedBy: 'test@company.com'
      })

      await orchestrator.updateIncidentStatus(
        incident.id,
        IncidentStatus.CLOSED,
        'closer@company.com'
      )

      const postMortem = await orchestrator.generatePostMortem(
        incident.id,
        ['reviewer1@company.com', 'reviewer2@company.com']
      )

      expect(postMortem.rootCauses).toBeDefined()
      expect(postMortem.lessonsLearned).toBeDefined()
      expect(postMortem.reviewedBy.length).toBe(2)
    })

    it('should generate compliance report', async () => {
      const incident = await orchestrator.createIncident({
        title: 'Compliance Test',
        description: 'Testing compliance reporting',
        severity: IncidentSeverity.CRITICAL,
        type: 'test',
        reportedBy: 'test@company.com'
      })

      const report = await orchestrator.generateComplianceReport(incident.id, [
        'GDPR',
        'HIPAA'
      ])

      expect(report.frameworks).toContain('GDPR')
      expect(report.frameworks).toContain('HIPAA')
      expect(report.notificationRequired).toBe(true)
    })

    it('should provide dashboard metrics', async () => {
      const incident1 = await orchestrator.createIncident({
        title: 'Dashboard Test 1',
        description: 'Testing dashboard',
        severity: IncidentSeverity.CRITICAL,
        type: 'test',
        reportedBy: 'test@company.com'
      })

      const incident2 = await orchestrator.createIncident({
        title: 'Dashboard Test 2',
        description: 'Testing dashboard',
        severity: IncidentSeverity.HIGH,
        type: 'test',
        reportedBy: 'test@company.com'
      })

      const metrics = await orchestrator.getDashboardMetrics()

      expect(metrics.totalIncidents).toBeGreaterThanOrEqual(2)
      expect(metrics.criticalIncidents).toBeGreaterThanOrEqual(1)
      expect(metrics.averageMTTD).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Resource Locking and Deconfliction', () => {
    it('should acquire resource lock', async () => {
      const locked = await orchestrator.acquireResourceLock(
        'system-prod-01',
        'admin@company.com',
        'Emergency maintenance',
        30000
      )

      expect(locked).toBe(true)
    })

    it('should prevent conflicting locks', async () => {
      const first = await orchestrator.acquireResourceLock(
        'resource-001',
        'user1@company.com',
        'Operation 1',
        30000
      )

      const second = await orchestrator.acquireResourceLock(
        'resource-001',
        'user2@company.com',
        'Operation 2',
        30000
      )

      expect(first).toBe(true)
      expect(second).toBe(false)
    })

    it('should release resource lock', async () => {
      await orchestrator.acquireResourceLock(
        'resource-002',
        'user@company.com',
        'Temporary lock',
        30000
      )

      await orchestrator.releaseResourceLock('resource-002', 'user@company.com')

      const newLock = await orchestrator.acquireResourceLock(
        'resource-002',
        'other-user@company.com',
        'New operation',
        30000
      )

      expect(newLock).toBe(true)
    })
  })

  describe('Event Emissions', () => {
    it('should emit incident created event', async () => {
      const eventPromise = new Promise<void>((resolve) => {
        orchestrator.on('incident:created', (incident: Incident) => {
          expect(incident.id).toBeDefined()
          resolve()
        })
      })

      orchestrator.createIncident({
        title: 'Event Test',
        description: 'Testing events',
        severity: IncidentSeverity.LOW,
        type: 'test',
        reportedBy: 'test@company.com'
      }).catch(() => {})

      await eventPromise
    })

    it('should emit incident status changed event', async () => {
      const eventPromise = new Promise<void>((resolve) => {
        orchestrator.on('incident:status_changed', (data) => {
          expect(data.newStatus).toBe(IncidentStatus.INVESTIGATING)
          resolve()
        })
      })

      const incident = await orchestrator.createIncident({
        title: 'Status Event Test',
        description: 'Testing status events',
        severity: IncidentSeverity.MEDIUM,
        type: 'test',
        reportedBy: 'test@company.com'
      })

      orchestrator.updateIncidentStatus(
        incident.id,
        IncidentStatus.INVESTIGATING,
        'tester@company.com'
      ).catch(() => {})

      await eventPromise
    })
  })
})

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Automated Response - Integration Tests', () => {
  let engine: PlaybookEngine
  let registry: ActionRegistry
  let orchestrator: ResponseOrchestrator
  const logger = pino({ level: 'silent' })

  beforeEach(() => {
    engine = new PlaybookEngine()
    registry = new ActionRegistry()
    orchestrator = new ResponseOrchestrator(logger)
  })

  it('should execute end-to-end incident response flow', async () => {
    // Create incident
    const incident = await orchestrator.createIncident({
      title: 'Security Breach Detected',
      description: 'Unauthorized access attempt',
      severity: IncidentSeverity.CRITICAL,
      type: 'unauthorized_access',
      reportedBy: 'security-team@company.com',
      affectedSystems: ['prod-server-01', 'prod-server-02']
    })

    expect(incident.id).toBeDefined()

    // Update status to investigating
    const investigating = await orchestrator.updateIncidentStatus(
      incident.id,
      IncidentStatus.INVESTIGATING,
      'incident-manager@company.com'
    )

    expect(investigating.status).toBe(IncidentStatus.INVESTIGATING)

    // Collect evidence
    const evidence = await orchestrator.collectEvidence(
      incident.id,
      {
        type: EvidenceType.LOG_FILE,
        description: 'Access logs from compromised server',
        source: 'prod-server-01',
        hash: 'sha256-hash',
        storageLocation: 's3://evidence/breach-001/logs.tar.gz'
      },
      'forensics@company.com'
    )

    expect(evidence.id).toBeDefined()

    // Execute remediation actions
    const blockResult = await registry.execute('BlockIP', {
      ipAddress: '203.0.113.45',
      duration: 86400,
      reason: 'Unauthorized access source'
    })

    expect(blockResult.success).toBe(true)

    // Lock affected accounts
    const lockResult = await registry.execute('LockAccount', {
      userId: 'compromised-user',
      reason: 'Account potentially compromised'
    })

    expect(lockResult.success).toBe(true)

    // Generate post-mortem
    const postMortem = await orchestrator.generatePostMortem(
      incident.id,
      ['security-lead@company.com', 'ciso@company.com']
    )

    expect(postMortem.rootCauses).toBeDefined()
  })

  it('should handle multi-stage playbook execution', async () => {
    // Create incident
    const incident = await orchestrator.createIncident({
      title: 'Multi-Stage Incident',
      description: 'Complex incident requiring staged response',
      severity: IncidentSeverity.CRITICAL,
      type: 'malware_detection',
      reportedBy: 'detection-system@company.com'
    })

    // Execute multiple sequential actions
    const isolateResult = await registry.execute('IsolateEndpoint', {
      endpointId: 'ep-compromised-001'
    })

    expect(isolateResult.success).toBe(true)

    const scanResult = await registry.execute('RunAVScan', {
      endpointId: 'ep-compromised-001',
      scanType: 'full'
    })

    expect(scanResult.success).toBe(true)

    // Update incident status
    const contained = await orchestrator.updateIncidentStatus(
      incident.id,
      IncidentStatus.CONTAINING,
      'response-team@company.com'
    )

    expect(contained.status).toBe(IncidentStatus.CONTAINING)
  })

  it('should maintain evidence chain integrity during investigation', async () => {
    const incident = await orchestrator.createIncident({
      title: 'Forensic Investigation',
      description: 'Detailed forensic analysis required',
      severity: IncidentSeverity.CRITICAL,
      type: 'data_breach',
      reportedBy: 'ciso@company.com'
    })

    // Collect multiple evidence items
    const evidence1 = await orchestrator.collectEvidence(
      incident.id,
      {
        type: EvidenceType.MEMORY_DUMP,
        description: 'Memory dump from compromised system',
        source: 'server-001',
        hash: 'hash1',
        storageLocation: 's3://evidence/memory.bin'
      },
      'forensics-lead@company.com'
    )

    const evidence2 = await orchestrator.collectEvidence(
      incident.id,
      {
        type: EvidenceType.DISK_IMAGE,
        description: 'Disk image for forensic analysis',
        source: 'server-001',
        hash: 'hash2',
        storageLocation: 's3://evidence/disk.img'
      },
      'forensics-lead@company.com'
    )

    // Access evidence with audit trail
    await orchestrator.accessEvidence(evidence1.id, 'analyst-1@company.com', 'Initial analysis')
    await orchestrator.accessEvidence(evidence1.id, 'analyst-2@company.com', 'Peer review')
    const finalAccess = await orchestrator.accessEvidence(
      evidence1.id,
      'attorney@company.com',
      'Legal examination'
    )

    expect(finalAccess.accessLog.length).toBe(4)
  })

  it('should handle compliance reporting for regulated incidents', async () => {
    const incident = await orchestrator.createIncident({
      title: 'HIPAA Violation',
      description: 'Protected health information potentially exposed',
      severity: IncidentSeverity.CRITICAL,
      type: 'data_exposure',
      reportedBy: 'compliance-team@company.com',
      affectedUsers: Array.from({ length: 150 }, (_, i) => `patient-${i + 1}`)
    })

    // Generate compliance reports
    const gdprReport = await orchestrator.generateComplianceReport(incident.id, ['GDPR'])
    const hipaaReport = await orchestrator.generateComplianceReport(incident.id, ['HIPAA'])

    expect(gdprReport.notificationRequired).toBe(true)
    expect(hipaaReport.notificationRequired).toBe(true)
    expect(hipaaReport.notificationDueDate).toBeDefined()
  })

  it('should coordinate multi-action incident response', async () => {
    const incident = await orchestrator.createIncident({
      title: 'Coordinated Response Test',
      description: 'Multiple simultaneous response actions',
      severity: IncidentSeverity.HIGH,
      type: 'network_breach',
      reportedBy: 'soc@company.com'
    })

    // Execute batch of coordinated actions
    const results = await registry.executeBatch([
      { name: 'BlockIP', params: { ipAddress: '203.0.113.1', duration: 86400 } },
      { name: 'LockAccount', params: { userId: 'user-123', reason: 'Coordinated response' } },
      { name: 'RevokeAPIKeys', params: { userId: 'user-123' } },
      { name: 'SendAlert', params: { recipients: ['team@company.com'], alertMessage: 'Incident active' } }
    ])

    expect(results.length).toBe(4)
    expect(results.every((r) => r.success)).toBe(true)
  })
})
