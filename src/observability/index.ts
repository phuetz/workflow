/**
 * Agent Observability Platform - Main Export
 *
 * Centralized export for all observability components
 */

// Core components
export { AgentTraceCollector } from './AgentTraceCollector';
export { ToolSpanTracker } from './ToolSpanTracker';
export { CostAttributionEngine } from './CostAttributionEngine';
export { AgentSLAMonitor } from './AgentSLAMonitor';
export { PolicyViolationTracker } from './PolicyViolationTracker';
export { AgentPerformanceProfiler } from './AgentPerformanceProfiler';
export { TraceVisualization } from './TraceVisualization';

// Types
export * from './types/observability';

// Platform wrapper
import { AgentTraceCollector } from './AgentTraceCollector';
import { ToolSpanTracker } from './ToolSpanTracker';
import { CostAttributionEngine } from './CostAttributionEngine';
import { AgentSLAMonitor } from './AgentSLAMonitor';
import { PolicyViolationTracker } from './PolicyViolationTracker';
import { AgentPerformanceProfiler } from './AgentPerformanceProfiler';
import type { TraceCollectorConfig } from './types/observability';

/**
 * Observability platform configuration
 */
export interface ObservabilityConfig {
  tracing?: Partial<TraceCollectorConfig>;
  costs?: {
    currency?: string;
    enableBudgetAlerts?: boolean;
  };
  sla?: {
    checkInterval?: number;
    alertLatency?: number;
    retentionDays?: number;
  };
  profiling?: {
    samplingInterval?: number;
  };
}

/**
 * Complete observability platform wrapper
 */
export class ObservabilityPlatform {
  public tracing: AgentTraceCollector;
  public tools: ToolSpanTracker;
  public costs: CostAttributionEngine;
  public sla: AgentSLAMonitor;
  public policies: PolicyViolationTracker;
  public profiler: AgentPerformanceProfiler;

  constructor(config: ObservabilityConfig = {}) {
    this.tracing = new AgentTraceCollector(config.tracing);
    this.tools = new ToolSpanTracker();
    this.costs = new CostAttributionEngine();
    this.sla = new AgentSLAMonitor(config.sla);
    this.policies = new PolicyViolationTracker();
    this.profiler = new AgentPerformanceProfiler();

    this.setupIntegrations();
  }

  /**
   * Set up integrations between components
   */
  private setupIntegrations(): void {
    // Link tool tracking to cost attribution
    this.tools.on('tool:completed', (span: any) => {
      if (span.cost.total > 0) {
        this.costs.recordCost(span.cost.total, 'llm', {
          agentId: span.metadata?.agentId,
          workflowId: span.metadata?.workflowId,
          userId: span.metadata?.userId,
        });
      }
    });

    // Link trace completion to SLA monitoring
    this.tracing.on('trace:completed', (trace: any) => {
      if (trace.duration) {
        // Record latency for all global SLAs
        const slas = this.sla.getAllSLAs().filter(s => s.metric === 'latency' && s.scope.global);
        for (const sla of slas) {
          this.sla.recordMetric(sla.id, trace.duration);
        }
      }
    });

    // Link SLA violations to policy tracker
    this.sla.on('violation:created', async (violation: any) => {
      await this.policies.recordViolation(
        'performance_degradation',
        violation.severity,
        violation.scope.agentId || 'global',
        `SLA violation: ${violation.slaName}`,
        { violation }
      );
    });
  }

  /**
   * Get platform health metrics
   */
  getHealth() {
    return {
      tracing: this.tracing.getMetrics(),
      tools: this.tools.getPerformanceStats(),
      timestamp: Date.now(),
    };
  }

  /**
   * Clear all data (use with caution!)
   */
  clear(): void {
    this.tracing.clear();
    this.tools.clear();
    this.costs.clear();
    this.sla.clear();
    this.policies.clear();
    this.profiler.clear();
  }
}

export default ObservabilityPlatform;
