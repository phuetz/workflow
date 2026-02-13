# Alert Manager Integration Guide

## Step-by-Step Integration with Existing Systems

### Phase 1: Setup (15 minutes)

#### Step 1.1: Install Dependencies
All dependencies already in package.json:
```bash
npm install nodemailer  # Already installed
npm install axios       # For HTTP requests
```

#### Step 1.2: Import Alert Manager
```typescript
import { alertManager, AlertManager } from './monitoring/AlertManager';
// or for setup:
import { setupAlertManager } from './monitoring/alertManagerConfig.example';

// One-time setup
await setupAlertManager();
```

#### Step 1.3: Configure Environment
```bash
# Copy to .env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
TEAMS_WEBHOOK_URL=https://outlook.webhook.office.com/...
PAGERDUTY_API_KEY=u+...
PAGERDUTY_ROUTING_KEY=R...
```

---

## Phase 2: Integration Points

### Integration 1: Security Monitor

**File**: `src/backend/monitoring/SecurityMonitor.ts` or `src/backend/security/SecurityManager.ts`

```typescript
import { alertManager } from '../monitoring/AlertManager';

// In SecurityMonitor or SecurityManager
class SecurityMonitor {
  private alertManager = AlertManager.getInstance();

  // Integrate threat detection
  detectThreat(threatType: string, details: any): void {
    const severity = this.calculateThreatSeverity(threatType);

    // Create alert immediately
    this.alertManager.createAlert({
      title: `Security Threat Detected: ${threatType}`,
      severity,
      source: 'security-monitor',
      category: 'security',
      description: details.description,
      metrics: {
        threat_type: threatType,
        source_ip: details.sourceIp,
        timestamp: new Date().toISOString(),
        indicators: details.indicators
      },
      context: {
        affected_users: details.affectedUsers,
        affected_systems: details.affectedSystems
      },
      recommended_actions: this.suggestActions(threatType)
    }).catch(error => {
      console.error('Failed to create alert:', error);
    });
  }

  // Common threat scenarios
  private suggestActions(threatType: string): string[] {
    const actions: Record<string, string[]> = {
      'brute_force': [
        'Block source IP immediately',
        'Review login logs',
        'Reset affected passwords',
        'Enable MFA'
      ],
      'unauthorized_access': [
        'Revoke access tokens',
        'Review audit logs',
        'Force password reset',
        'Enable MFA'
      ],
      'data_exfiltration': [
        'Isolate affected systems',
        'Begin data breach response',
        'Notify affected parties',
        'Preserve evidence'
      ],
      'privilege_escalation': [
        'Review sudo logs',
        'Reset administrative accounts',
        'Audit role assignments',
        'Review recent changes'
      ]
    };

    return actions[threatType] || ['Investigate immediately'];
  }
}
```

### Integration 2: Execution Engine

**File**: `src/components/ExecutionEngine.ts`

```typescript
import { alertManager } from '../monitoring/AlertManager';

class WorkflowExecutor {
  private alertManager = AlertManager.getInstance();

  async executeWorkflow(workflow: Workflow): Promise<ExecutionResult> {
    try {
      // Execute workflow...
      const result = await this.runNodes(workflow);

      if (result.hasErrors) {
        await this.alertManager.createAlert({
          title: `Workflow Execution Failed: ${workflow.name}`,
          severity: result.critical ? 'critical' : 'high',
          source: 'execution-engine',
          category: 'system',
          description: result.error?.message || 'Unknown error',
          metrics: {
            workflow_id: workflow.id,
            execution_time: result.executionTime,
            failed_node: result.failedNodeId,
            error_count: result.errors.length
          },
          context: {
            workflow_name: workflow.name,
            nodes_executed: result.nodesExecuted,
            last_successful_node: result.lastSuccessfulNode,
            error_details: result.errors
          },
          recommended_actions: [
            'Review workflow logs',
            'Check node configuration',
            'Verify external service availability',
            'Test with sample data'
          ]
        });
      }

      return result;
    } catch (error) {
      // Critical error
      await this.alertManager.createAlert({
        title: 'Workflow Executor Error',
        severity: 'critical',
        source: 'execution-engine',
        category: 'system',
        description: (error as Error).message,
        metrics: {
          workflow_id: workflow.id,
          error_type: (error as Error).constructor.name
        },
        context: {
          stack_trace: (error as Error).stack
        },
        recommended_actions: [
          'Check executor logs',
          'Verify system resources',
          'Restart executor service'
        ]
      });

      throw error;
    }
  }

  // Monitor error patterns
  private async monitorErrorPatterns(executionId: string, errors: WorkflowError[]): Promise<void> {
    const errorRate = errors.length / this.totalSteps;

    if (errorRate > 0.5) {
      await this.alertManager.createAlert({
        title: 'High Error Rate in Workflow Execution',
        severity: 'high',
        source: 'execution-engine',
        category: 'system',
        description: `Error rate: ${(errorRate * 100).toFixed(2)}%`,
        metrics: {
          error_rate: errorRate,
          total_steps: this.totalSteps,
          errors: errors.length
        },
        recommended_actions: [
          'Review failed nodes',
          'Check node configurations',
          'Test external connections'
        ]
      });
    }
  }
}
```

### Integration 3: Health Check System

**File**: `src/backend/monitoring/HealthCheckSystem.ts`

```typescript
import { alertManager } from '../monitoring/AlertManager';

class HealthCheckSystem {
  private alertManager = AlertManager.getInstance();

  async runHealthChecks(): Promise<HealthStatus> {
    const checks = await Promise.all([
      this.checkDatabase(),
      this.checkCache(),
      this.checkFileSystem(),
      this.checkExternalServices(),
      this.checkResourceUsage()
    ]);

    const failures = checks.filter(c => !c.healthy);

    if (failures.length > 0) {
      await this.createHealthAlert(failures);
    }

    return {
      healthy: failures.length === 0,
      checks,
      timestamp: new Date()
    };
  }

  private async createHealthAlert(failures: HealthCheck[]): Promise<void> {
    const failureList = failures.map(f => `${f.service}: ${f.error}`).join('\n');

    await this.alertManager.createAlert({
      title: 'Health Check Failed',
      severity: failures.some(f => f.critical) ? 'critical' : 'high',
      source: 'health-check-system',
      category: 'system',
      description: `${failures.length} health checks failed:\n${failureList}`,
      metrics: {
        total_failures: failures.length,
        critical_failures: failures.filter(f => f.critical).length,
        timestamp: new Date().toISOString()
      },
      context: {
        failed_services: failures.map(f => f.service),
        error_details: failures.map(f => ({ service: f.service, error: f.error }))
      },
      recommended_actions: [
        'Check service logs',
        'Verify service availability',
        'Check network connectivity',
        'Restart services if needed'
      ]
    });
  }
}
```

### Integration 4: Database Layer

**File**: `src/backend/database/index.ts` or Prisma middleware

```typescript
import { alertManager } from '../monitoring/AlertManager';

// Monitor database errors
class DatabaseMonitor {
  private alertManager = AlertManager.getInstance();
  private errorCounts = new Map<string, number>();
  private lastAlertTime = new Map<string, Date>();

  async captureError(error: any, context: any): Promise<void> {
    const errorType = error.code || error.message;
    const count = (this.errorCounts.get(errorType) || 0) + 1;
    this.errorCounts.set(errorType, count);

    // Alert only if threshold exceeded
    const lastAlert = this.lastAlertTime.get(errorType);
    if (!lastAlert || Date.now() - lastAlert.getTime() > 300000) {
      // 5 minute cooldown
      const severity = count > 10 ? 'critical' : count > 5 ? 'high' : 'medium';

      await this.alertManager.createAlert({
        title: `Database Error: ${errorType}`,
        severity,
        source: 'database',
        category: 'system',
        description: error.message,
        metrics: {
          error_type: errorType,
          occurrence_count: count,
          last_count_reset: Date.now()
        },
        context: {
          query: context.query?.substring(0, 200),
          table: context.table,
          operation: context.operation
        },
        recommended_actions: [
          'Check database status',
          'Review query performance',
          'Check connection pool',
          'Review database logs'
        ]
      });

      this.lastAlertTime.set(errorType, new Date());
    }
  }
}
```

### Integration 5: Webhook System

**File**: `src/backend/api/routes/webhooks.ts`

```typescript
import { alertManager } from '../../../monitoring/AlertManager';

// Monitor webhook delivery
class WebhookManager {
  private alertManager = AlertManager.getInstance();

  async executeWebhook(webhook: Webhook, payload: any): Promise<void> {
    try {
      const response = await this.sendWebhook(webhook, payload);

      if (!response.success) {
        // Track failed deliveries
        this.failureCount[webhook.id] = (this.failureCount[webhook.id] || 0) + 1;

        if (this.failureCount[webhook.id] > 5) {
          await this.alertManager.createAlert({
            title: `Webhook Delivery Failing: ${webhook.name}`,
            severity: 'high',
            source: 'webhook-system',
            category: 'integration',
            description: `Webhook has failed ${this.failureCount[webhook.id]} consecutive times`,
            metrics: {
              webhook_id: webhook.id,
              failure_count: this.failureCount[webhook.id],
              last_error: response.error,
              endpoint: webhook.url
            },
            context: {
              webhook_name: webhook.name,
              event_type: webhook.eventType,
              created_at: webhook.createdAt
            },
            recommended_actions: [
              'Verify webhook URL is accessible',
              'Check webhook configuration',
              'Review webhook logs',
              'Test webhook with curl'
            ]
          });
        }
      } else {
        // Reset counter on success
        this.failureCount[webhook.id] = 0;
      }
    } catch (error) {
      await this.alertManager.createAlert({
        title: `Webhook Execution Error: ${webhook.name}`,
        severity: 'high',
        source: 'webhook-system',
        category: 'integration',
        description: (error as Error).message,
        context: {
          webhook_id: webhook.id,
          webhook_url: webhook.url
        },
        recommended_actions: [
          'Check webhook endpoint',
          'Verify network connectivity',
          'Review webhook logs'
        ]
      });
    }
  }
}
```

### Integration 6: Rate Limiting

**File**: `src/backend/security/RateLimitService.ts`

```typescript
import { alertManager } from '../../../monitoring/AlertManager';

class RateLimitService {
  private alertManager = AlertManager.getInstance();
  private breachAlerted = new Set<string>();

  async checkRateLimit(userId: string, limit: number): Promise<boolean> {
    const count = await this.getRequestCount(userId);

    if (count > limit) {
      const key = `${userId}:${limit}`;

      // Alert only once per 5 minutes
      if (!this.breachAlerted.has(key)) {
        await this.alertManager.createAlert({
          title: 'Rate Limit Exceeded',
          severity: 'medium',
          source: 'rate-limiter',
          category: 'security',
          description: `User has exceeded rate limit of ${limit} requests`,
          metrics: {
            user_id: userId,
            limit,
            actual_count: count,
            percentage: Math.round((count / limit) * 100)
          },
          context: {
            timestamp: new Date().toISOString()
          },
          recommended_actions: [
            'Monitor user activity',
            'Consider blocking user if malicious',
            'Review request patterns'
          ]
        });

        this.breachAlerted.add(key);
        setTimeout(() => this.breachAlerted.delete(key), 300000);
      }

      return false;
    }

    return true;
  }
}
```

### Integration 7: Queue System

**File**: `src/backend/queue/QueueManager.ts`

```typescript
import { alertManager } from '../../../monitoring/AlertManager';

class QueueManager {
  private alertManager = AlertManager.getInstance();

  async monitorQueue(): Promise<void> {
    setInterval(async () => {
      const queueStats = await this.getQueueStats();

      // Check for stuck jobs
      if (queueStats.stuckJobs > 0) {
        await this.alertManager.createAlert({
          title: 'Stuck Jobs in Queue',
          severity: 'high',
          source: 'queue-manager',
          category: 'system',
          description: `${queueStats.stuckJobs} jobs have been stuck for more than 1 hour`,
          metrics: {
            stuck_jobs: queueStats.stuckJobs,
            queue_size: queueStats.totalJobs,
            oldest_stuck_job_age: queueStats.oldestStuckJobAge,
            failed_jobs: queueStats.failedJobs
          },
          recommended_actions: [
            'Check worker logs',
            'Restart workers if needed',
            'Review job configuration',
            'Investigate stuck jobs'
          ]
        });
      }

      // Check for high failure rate
      if (queueStats.failureRate > 0.1) {
        // > 10% failure rate
        await this.alertManager.createAlert({
          title: 'High Queue Job Failure Rate',
          severity: 'high',
          source: 'queue-manager',
          category: 'system',
          description: `Job failure rate is ${(queueStats.failureRate * 100).toFixed(2)}%`,
          metrics: {
            failure_rate: queueStats.failureRate,
            failed_jobs: queueStats.failedJobs,
            total_jobs: queueStats.totalJobs
          },
          recommended_actions: [
            'Review failed job logs',
            'Check external service dependencies',
            'Verify job configuration'
          ]
        });
      }
    }, 60000); // Check every minute
  }
}
```

### Integration 8: API Errors

**File**: `src/backend/api/middleware/errorHandler.ts`

```typescript
import { alertManager } from '../../../monitoring/AlertManager';

// Global error handler
export async function globalErrorHandler(error: any, req: any, res: any, next: any) {
  const errorId = generateErrorId();
  const statusCode = error.statusCode || 500;

  // Log error
  console.error(`[${errorId}] ${error.message}`);

  // Alert on critical errors
  if (statusCode >= 500) {
    await alertManager.createAlert({
      title: `API Error: ${error.statusCode} ${error.statusText}`,
      severity: statusCode === 503 ? 'critical' : 'high',
      source: 'api-gateway',
      category: 'system',
      description: error.message,
      metrics: {
        error_id: errorId,
        status_code: statusCode,
        endpoint: req.path,
        method: req.method
      },
      context: {
        user_id: req.user?.id,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      },
      recommended_actions: [
        'Check service logs',
        'Verify external dependencies',
        'Check system resources'
      ]
    });
  }

  // Send response
  res.status(statusCode).json({
    error: error.message,
    errorId
  });
}
```

---

## Phase 3: Advanced Integrations

### Custom Escalation for Critical Systems

```typescript
// Add policy for critical workflows
alertManager.addEscalationPolicy({
  id: 'critical-workflow-escalation',
  name: 'Critical Workflow Escalation',
  enabled: true,
  rules: [
    {
      level: 0,
      delay: 0,
      channels: ['email', 'slack'],
      recipients: ['workflow-team@company.com'],
      condition: (alert) => alert.source === 'execution-engine'
    },
    {
      level: 1,
      delay: 10,
      channels: ['pagerduty'],
      recipients: ['engineering-lead@company.com'],
      condition: (alert) =>
        alert.source === 'execution-engine' &&
        alert.severity === 'critical'
    }
  ]
});
```

### Custom Routing by Source

```typescript
// Route by specific sources
alertManager.addRoutingRule({
  id: 'database-errors-to-dba',
  name: 'Database errors to DBA team',
  priority: 100,
  condition: (alert) => alert.source === 'database',
  channels: ['email', 'slack'],
  recipients: ['dba-team@company.com']
});

alertManager.addRoutingRule({
  id: 'webhook-errors-to-integration-team',
  name: 'Webhook errors to integration team',
  priority: 90,
  condition: (alert) => alert.source === 'webhook-system',
  channels: ['email', 'slack'],
  recipients: ['integration-team@company.com']
});
```

### Event-Driven Alerting

```typescript
// Listen to specific events
alertManager.on('alert:created', async (alert) => {
  // Log to external system
  await externalLogging.log(alert);

  // Create incident if critical
  if (alert.severity === 'critical') {
    await incidentManagement.createIncident({
      title: alert.title,
      description: alert.description,
      severity: 'critical',
      source: alert.source
    });
  }
});

alertManager.on('alert:escalated', async ({ alert, level }) => {
  // Notify escalation manager
  await notificationService.notifyEscalation(alert, level);
});
```

---

## Phase 4: Monitoring & Optimization

### Monitor Alert System Health

```typescript
async function monitorAlertSystemHealth(): Promise<void> {
  setInterval(() => {
    // Get system metrics
    const stats = alertManager.getAlertStats({
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: new Date()
    });

    const channelStats = alertManager.getChannelStats();

    // Log to metrics system
    metrics.record({
      'alerts.total': stats.totalAlerts,
      'alerts.open': stats.byStatus.open,
      'alerts.acknowledged_rate': stats.acknowledgedRate,
      'alerts.resolved_rate': stats.resolvedRate,
      'alerts.mttr_minutes': stats.avgTimeToResolve / 1000 / 60
    });

    // Monitor channel health
    for (const channel of channelStats) {
      if (channel.successRate < 95) {
        console.warn(`Channel ${channel.name} success rate: ${channel.successRate.toFixed(2)}%`);
      }
    }
  }, 300000); // Every 5 minutes
}
```

### Performance Optimization

```typescript
// Archive old alerts periodically
async function archiveOldAlerts(): Promise<void> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const oldAlerts = alertManager.getAllAlerts({
    endDate: thirtyDaysAgo,
    status: ['resolved']
  });

  // Archive to database
  await db.alertArchive.createMany(oldAlerts);

  console.log(`Archived ${oldAlerts.length} resolved alerts`);
}

// Run weekly
schedule.scheduleJob('0 2 * * 0', archiveOldAlerts);
```

---

## Testing Integration

```typescript
// Integration test
describe('AlertManager Integration', () => {
  it('should alert on execution engine error', async () => {
    const executionError = new Error('Node execution failed');
    const executor = new WorkflowExecutor();

    executor.on('error', async (error) => {
      await alertManager.createAlert({
        title: 'Execution Error',
        severity: 'high',
        source: 'test',
        category: 'system',
        description: error.message,
        recommended_actions: []
      });
    });

    // Trigger error
    await expect(executor.execute(failingWorkflow)).rejects.toThrow();

    // Verify alert created
    const alerts = alertManager.getAllAlerts({
      source: 'test'
    });

    expect(alerts.length).toBeGreaterThan(0);
  });
});
```

---

## Summary of Integrations

| System | Integration Point | Trigger | Severity |
|--------|-------------------|---------|----------|
| SecurityMonitor | Threat detection | New threat | Critical |
| ExecutionEngine | Workflow error | Execution fails | High |
| HealthCheck | Service down | Health check fails | Critical |
| Database | Query error | DB error | Medium/High |
| Webhooks | Delivery fail | Failed delivery | High |
| RateLimiter | Limit exceeded | Rate exceeded | Medium |
| Queue | Job stuck | Job timeout | High |
| API | Server error | HTTP 5xx | High/Critical |

---

## Next Steps

1. **Setup** - Configure environment variables
2. **Test** - Run integration tests
3. **Deploy** - Deploy with monitoring enabled
4. **Monitor** - Watch alert statistics
5. **Optimize** - Fine-tune escalation policies
6. **Extend** - Add additional integrations as needed

See `ALERT_MANAGER_QUICKSTART.md` for quick reference and `WEEK8_PHASE2_ALERT_MANAGER.md` for full documentation.
