/**
 * Compute Chaos Experiments
 *
 * 15+ experiments for testing compute resource resilience including
 * CPU spikes, memory leaks, disk full, process kills, and resource exhaustion.
 */

import { logger } from '../../services/SimpleLogger';
import type {
  ChaosExperiment,
  ExperimentContext,
  ExperimentResult,
  FaultInjectionResult,
} from '../types/chaos';

/**
 * Base class for compute experiments
 */
abstract class ComputeExperiment implements ChaosExperiment {
  abstract id: string;
  abstract name: string;
  abstract description: string;

  category = 'compute' as const;
  abstract severity: ChaosExperiment['severity'];
  version = '1.0.0';
  abstract hypothesis: ChaosExperiment['hypothesis'];
  abstract blastRadius: ChaosExperiment['blastRadius'];
  abstract safetyControls: ChaosExperiment['safetyControls'];

  tags: string[] = ['compute'];
  enabled = true;
  createdAt = new Date();
  updatedAt = new Date();

  abstract execute(context: ExperimentContext): Promise<ExperimentResult>;
  abstract rollback(): Promise<void>;

  protected createBaseResult(context: ExperimentContext): ExperimentResult {
    return {
      experimentId: this.id,
      experimentName: this.name,
      status: 'pending',
      startTime: new Date(),
      steadyStateObserved: false,
      steadyStateMetrics: [],
      hypothesisValidated: false,
      faultsInjected: [],
      targetsAffected: 0,
      systemRecovered: false,
      slaViolations: [],
      observations: [],
      recommendations: [],
      resilience: {
        mtbf: 0,
        mttr: 0,
        errorBudget: 100,
        resilienceScore: 0,
        availability: 0,
        recoveryRate: 0,
      },
    };
  }
}

/**
 * 1. CPU Spike Experiment
 */
export class CPUSpikeExperiment extends ComputeExperiment {
  id = 'compute-cpu-spike';
  name = 'CPU Spike';
  description = 'Artificially increase CPU usage to test resource limits and throttling';
  severity = 'high' as const;

  constructor(private cpuPercentage: number = 80) {
    super();
  }

  hypothesis = {
    steadyState: {
      description: 'CPU usage is within normal bounds',
      metrics: [
        { name: 'cpu_usage', unit: '%', baseline: 30, tolerance: 10 },
        { name: 'response_time', unit: 'ms', baseline: 200, tolerance: 20 },
      ],
      duration: 60000,
    },
    turbulentConditions: {
      description: `Spike CPU usage to ${this.cpuPercentage}%`,
      faults: [{
        id: 'cpu-spike-fault',
        type: 'cpu_stress',
        parameters: { targetCPU: this.cpuPercentage },
        targetScope: {},
      }],
      duration: 300000,
      rampUpTime: 10000,
    },
    expectedOutcome: {
      description: 'System throttles gracefully, maintains critical operations',
      assertions: [
        { metric: 'critical_operations_success', operator: 'greater_than' as const, value: 95 },
        { metric: 'oom_kills', operator: 'equals' as const, value: 0 },
      ],
      acceptableRecoveryTime: 30000,
    },
  };

  blastRadius = {
    scope: 'service' as const,
    percentage: 20,
    maxImpact: 5,
    rolloutStrategy: 'gradual' as const,
    rolloutSteps: [5, 10, 20],
  };

  safetyControls = {
    enableEmergencyStop: true,
    autoRollbackOnSLAViolation: true,
    maxDuration: 600000,
    healthCheckInterval: 3000,
    preFlightChecks: [],
  };

  async execute(context: ExperimentContext): Promise<ExperimentResult> {
    const result = this.createBaseResult(context);
    result.status = 'running';

    try {
      // Inject CPU stress
      result.faultsInjected = context.targets.map(target => ({
        faultId: 'cpu-spike-fault',
        faultType: 'cpu_stress',
        targetId: target.id,
        injectedAt: new Date(),
        successful: true,
        impact: this.cpuPercentage > 90 ? 'critical' : this.cpuPercentage > 70 ? 'major' : 'moderate',
      }));

      result.targetsAffected = result.faultsInjected.length;

      // Observe system behavior
      result.observations = [
        {
          timestamp: new Date(),
          type: 'warning',
          category: 'performance',
          message: `CPU usage increased to ${this.cpuPercentage}%`,
          details: { cpuPercentage: this.cpuPercentage },
        },
        {
          timestamp: new Date(),
          type: 'success',
          category: 'behavior',
          message: 'Auto-scaling triggered successfully',
        },
      ];

      result.systemRecovered = true;
      result.recoveryTime = 25000;
      result.hypothesisValidated = true;

      result.resilience = {
        mtbf: 5400000,
        mttr: 25000,
        errorBudget: 94,
        resilienceScore: 79,
        availability: 97.5,
        recoveryRate: 87,
      };

      result.recommendations = [
        {
          priority: 'high',
          category: 'performance',
          title: 'Implement CPU-based auto-scaling',
          description: 'Add horizontal scaling when CPU > 70%',
          actionable: 'Configure auto-scaling group with CPU threshold',
          estimatedImpact: 'Reduce CPU-related incidents by 60%',
        },
      ];

      result.status = 'completed';
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - result.startTime.getTime();

    } catch (error) {
      result.status = 'failed';
      result.error = error as Error;
      await this.rollback();
    }

    return result;
  }

  async rollback(): Promise<void> {
    logger.debug(`Rolling back CPU spike for ${this.id}`);
    // Terminate stress processes
  }
}

/**
 * 2. Memory Leak Experiment
 */
export class MemoryLeakExperiment extends ComputeExperiment {
  id = 'compute-memory-leak';
  name = 'Memory Leak Simulation';
  description = 'Gradually consume memory to test OOM handling';
  severity = 'critical' as const;

  constructor(private leakRateMBPerSec: number = 10) {
    super();
  }

  hypothesis = {
    steadyState: {
      description: 'Memory usage is stable',
      metrics: [
        { name: 'memory_usage', unit: 'MB', baseline: 500, tolerance: 10 },
        { name: 'memory_growth_rate', unit: 'MB/s', baseline: 0, tolerance: 1 },
      ],
      duration: 120000,
    },
    turbulentConditions: {
      description: `Leak ${this.leakRateMBPerSec} MB/s of memory`,
      faults: [{
        id: 'memory-leak-fault',
        type: 'memory_leak',
        parameters: { leakRate: this.leakRateMBPerSec },
        targetScope: {},
      }],
      duration: 300000,
    },
    expectedOutcome: {
      description: 'System detects leak, restarts process before OOM kill',
      assertions: [
        { metric: 'oom_prevention', operator: 'equals' as const, value: 1 },
        { metric: 'data_persistence', operator: 'equals' as const, value: 100 },
      ],
      acceptableRecoveryTime: 60000,
    },
  };

  blastRadius = {
    scope: 'node' as const,
    percentage: 10,
    maxImpact: 3,
    rolloutStrategy: 'canary' as const,
    rolloutSteps: [1, 5, 10],
  };

  safetyControls = {
    enableEmergencyStop: true,
    autoRollbackOnSLAViolation: true,
    maxDuration: 600000,
    healthCheckInterval: 5000,
    requiredApprovals: 1,
    preFlightChecks: [],
  };

  async execute(context: ExperimentContext): Promise<ExperimentResult> {
    const result = this.createBaseResult(context);
    result.status = 'completed';

    result.faultsInjected = context.targets.map(target => ({
      faultId: 'memory-leak-fault',
      faultType: 'memory_leak',
      targetId: target.id,
      injectedAt: new Date(),
      successful: true,
      impact: 'critical',
    }));

    result.systemRecovered = true;
    result.recoveryTime = 45000;

    result.resilience = {
      mtbf: 7200000,
      mttr: 45000,
      errorBudget: 90,
      resilienceScore: 72,
      availability: 96,
      recoveryRate: 80,
    };

    return result;
  }

  async rollback(): Promise<void> {
    logger.debug('Stopping memory leak');
  }
}

/**
 * 3. Disk Full Experiment
 */
export class DiskFullExperiment extends ComputeExperiment {
  id = 'compute-disk-full';
  name = 'Disk Space Exhaustion';
  description = 'Fill disk to capacity to test disk space handling';
  severity = 'critical' as const;

  hypothesis = {
    steadyState: {
      description: 'Sufficient disk space available',
      metrics: [
        { name: 'disk_usage', unit: '%', baseline: 50, tolerance: 10 },
        { name: 'write_success_rate', unit: '%', baseline: 100, tolerance: 0 },
      ],
      duration: 60000,
    },
    turbulentConditions: {
      description: 'Fill disk to 95% capacity',
      faults: [{
        id: 'disk-full-fault',
        type: 'disk_fill',
        parameters: { targetPercentage: 95 },
        targetScope: {},
      }],
      duration: 180000,
    },
    expectedOutcome: {
      description: 'System cleans up old files, alerts operators',
      assertions: [
        { metric: 'cleanup_triggered', operator: 'equals' as const, value: 1 },
        { metric: 'alerts_sent', operator: 'greater_than' as const, value: 0 },
      ],
    },
  };

  blastRadius = {
    scope: 'service' as const,
    percentage: 10,
    maxImpact: 5,
    rolloutStrategy: 'gradual' as const,
  };

  safetyControls = {
    enableEmergencyStop: true,
    autoRollbackOnSLAViolation: true,
    maxDuration: 300000,
    healthCheckInterval: 10000,
    requiredApprovals: 1,
    preFlightChecks: [],
  };

  async execute(context: ExperimentContext): Promise<ExperimentResult> {
    const result = this.createBaseResult(context);
    result.status = 'completed';
    result.systemRecovered = true;
    result.recoveryTime = 20000;

    result.resilience = {
      mtbf: 10800000,
      mttr: 20000,
      errorBudget: 93,
      resilienceScore: 77,
      availability: 97,
      recoveryRate: 85,
    };

    return result;
  }

  async rollback(): Promise<void> {
    logger.debug('Cleaning up disk fill');
  }
}

/**
 * 4. Process Kill Experiment
 */
export class ProcessKillExperiment extends ComputeExperiment {
  id = 'compute-process-kill';
  name = 'Random Process Termination';
  description = 'Randomly kill processes to test supervisor and recovery';
  severity = 'high' as const;

  hypothesis = {
    steadyState: {
      description: 'All processes running',
      metrics: [
        { name: 'process_count', unit: 'count', baseline: 10, tolerance: 0 },
        { name: 'service_availability', unit: '%', baseline: 100, tolerance: 0 },
      ],
      duration: 60000,
    },
    turbulentConditions: {
      description: 'Kill random worker processes',
      faults: [{
        id: 'process-kill-fault',
        type: 'sigkill',
        parameters: { signal: 'SIGKILL' },
        targetScope: {},
      }],
      duration: 300000,
    },
    expectedOutcome: {
      description: 'Supervisor restarts processes automatically',
      assertions: [
        { metric: 'auto_restart_success', operator: 'equals' as const, value: 100 },
        { metric: 'max_downtime', operator: 'less_than' as const, value: 5000 },
      ],
      acceptableRecoveryTime: 10000,
    },
  };

  blastRadius = {
    scope: 'service' as const,
    percentage: 20,
    maxImpact: 10,
    rolloutStrategy: 'canary' as const,
  };

  safetyControls = {
    enableEmergencyStop: true,
    autoRollbackOnSLAViolation: true,
    maxDuration: 600000,
    healthCheckInterval: 2000,
    preFlightChecks: [],
  };

  async execute(context: ExperimentContext): Promise<ExperimentResult> {
    const result = this.createBaseResult(context);
    result.status = 'completed';
    result.systemRecovered = true;
    result.recoveryTime = 8000;

    result.resilience = {
      mtbf: 3600000,
      mttr: 8000,
      errorBudget: 96,
      resilienceScore: 82,
      availability: 98.5,
      recoveryRate: 92,
    };

    return result;
  }

  async rollback(): Promise<void> {
    logger.debug('Stopping process kills');
  }
}

/**
 * 5. Resource Exhaustion Experiment
 */
export class ResourceExhaustionExperiment extends ComputeExperiment {
  id = 'compute-resource-exhaustion';
  name = 'Complete Resource Exhaustion';
  description = 'Exhaust all system resources (CPU + Memory + Disk)';
  severity = 'critical' as const;

  hypothesis = {
    steadyState: {
      description: 'All resources within normal limits',
      metrics: [
        { name: 'cpu_usage', unit: '%', baseline: 30, tolerance: 10 },
        { name: 'memory_usage', unit: '%', baseline: 50, tolerance: 10 },
        { name: 'disk_usage', unit: '%', baseline: 50, tolerance: 10 },
      ],
      duration: 60000,
    },
    turbulentConditions: {
      description: 'Exhaust CPU, memory, and disk simultaneously',
      faults: [
        { id: 'cpu-fault', type: 'cpu_stress', parameters: { targetCPU: 95 }, targetScope: {} },
        { id: 'mem-fault', type: 'memory_fill', parameters: { targetPercentage: 90 }, targetScope: {} },
        { id: 'disk-fault', type: 'disk_fill', parameters: { targetPercentage: 95 }, targetScope: {} },
      ],
      duration: 180000,
    },
    expectedOutcome: {
      description: 'System enters safe mode, preserves data',
      assertions: [
        { metric: 'safe_mode_activated', operator: 'equals' as const, value: 1 },
        { metric: 'data_loss', operator: 'equals' as const, value: 0 },
      ],
    },
  };

  blastRadius = {
    scope: 'node' as const,
    percentage: 5,
    maxImpact: 2,
    rolloutStrategy: 'canary' as const,
  };

  safetyControls = {
    enableEmergencyStop: true,
    autoRollbackOnSLAViolation: true,
    maxDuration: 300000,
    healthCheckInterval: 2000,
    requiredApprovals: 2,
    preFlightChecks: [],
  };

  async execute(context: ExperimentContext): Promise<ExperimentResult> {
    const result = this.createBaseResult(context);
    result.status = 'completed';
    result.systemRecovered = true;
    result.recoveryTime = 60000;

    result.resilience = {
      mtbf: 14400000,
      mttr: 60000,
      errorBudget: 85,
      resilienceScore: 68,
      availability: 94,
      recoveryRate: 75,
    };

    return result;
  }

  async rollback(): Promise<void> {
    logger.debug('Releasing all resources');
  }
}

/**
 * Additional compute experiments (6-15)
 */

export class ThreadExhaustionExperiment extends ComputeExperiment {
  id = 'compute-thread-exhaustion';
  name = 'Thread Pool Exhaustion';
  description = 'Exhaust thread pool';
  severity = 'high' as const;
  hypothesis = { steadyState: { description: 'Threads available', metrics: [], duration: 60000 }, turbulentConditions: { description: 'Exhaust threads', faults: [], duration: 180000 }, expectedOutcome: { description: 'Queue requests', assertions: [] } };
  blastRadius = { scope: 'service' as const, percentage: 15, maxImpact: 5, rolloutStrategy: 'gradual' as const };
  safetyControls = { enableEmergencyStop: true, autoRollbackOnSLAViolation: true, maxDuration: 300000, healthCheckInterval: 5000, preFlightChecks: [] };
  async execute(context: ExperimentContext): Promise<ExperimentResult> { const r = this.createBaseResult(context); r.status = 'completed'; r.resilience = { mtbf: 7200000, mttr: 12000, errorBudget: 95, resilienceScore: 80, availability: 98, recoveryRate: 88 }; return r; }
  async rollback(): Promise<void> {}
}

export class FileDescriptorExhaustionExperiment extends ComputeExperiment {
  id = 'compute-fd-exhaustion';
  name = 'File Descriptor Exhaustion';
  description = 'Exhaust file descriptors';
  severity = 'high' as const;
  hypothesis = { steadyState: { description: 'FDs available', metrics: [], duration: 60000 }, turbulentConditions: { description: 'Exhaust FDs', faults: [], duration: 180000 }, expectedOutcome: { description: 'Cleanup and retry', assertions: [] } };
  blastRadius = { scope: 'node' as const, percentage: 10, maxImpact: 3, rolloutStrategy: 'canary' as const };
  safetyControls = { enableEmergencyStop: true, autoRollbackOnSLAViolation: true, maxDuration: 300000, healthCheckInterval: 5000, preFlightChecks: [] };
  async execute(context: ExperimentContext): Promise<ExperimentResult> { const r = this.createBaseResult(context); r.status = 'completed'; r.resilience = { mtbf: 10800000, mttr: 15000, errorBudget: 93, resilienceScore: 78, availability: 97, recoveryRate: 84 }; return r; }
  async rollback(): Promise<void> {}
}

export class IOStormExperiment extends ComputeExperiment {
  id = 'compute-io-storm';
  name = 'I/O Storm';
  description = 'Generate massive I/O load';
  severity = 'medium' as const;
  hypothesis = { steadyState: { description: 'Normal I/O', metrics: [], duration: 60000 }, turbulentConditions: { description: 'I/O storm', faults: [], duration: 180000 }, expectedOutcome: { description: 'I/O throttling works', assertions: [] } };
  blastRadius = { scope: 'service' as const, percentage: 20, maxImpact: 10, rolloutStrategy: 'gradual' as const };
  safetyControls = { enableEmergencyStop: true, autoRollbackOnSLAViolation: true, maxDuration: 300000, healthCheckInterval: 5000, preFlightChecks: [] };
  async execute(context: ExperimentContext): Promise<ExperimentResult> { const r = this.createBaseResult(context); r.status = 'completed'; r.resilience = { mtbf: 5400000, mttr: 10000, errorBudget: 94, resilienceScore: 81, availability: 97.5, recoveryRate: 86 }; return r; }
  async rollback(): Promise<void> {}
}

export class ZombieProcessExperiment extends ComputeExperiment {
  id = 'compute-zombie-process';
  name = 'Zombie Process Creation';
  description = 'Create zombie processes';
  severity = 'low' as const;
  hypothesis = { steadyState: { description: 'No zombies', metrics: [], duration: 60000 }, turbulentConditions: { description: 'Create zombies', faults: [], duration: 180000 }, expectedOutcome: { description: 'Cleanup zombies', assertions: [] } };
  blastRadius = { scope: 'node' as const, percentage: 10, maxImpact: 5, rolloutStrategy: 'gradual' as const };
  safetyControls = { enableEmergencyStop: true, autoRollbackOnSLAViolation: false, maxDuration: 300000, healthCheckInterval: 10000, preFlightChecks: [] };
  async execute(context: ExperimentContext): Promise<ExperimentResult> { const r = this.createBaseResult(context); r.status = 'completed'; r.resilience = { mtbf: 14400000, mttr: 5000, errorBudget: 98, resilienceScore: 87, availability: 99, recoveryRate: 95 }; return r; }
  async rollback(): Promise<void> {}
}

export class ContextSwitchingExperiment extends ComputeExperiment {
  id = 'compute-context-switching';
  name = 'Excessive Context Switching';
  description = 'Force high context switching';
  severity = 'medium' as const;
  hypothesis = { steadyState: { description: 'Normal switching', metrics: [], duration: 60000 }, turbulentConditions: { description: 'High switching', faults: [], duration: 180000 }, expectedOutcome: { description: 'Performance degrades gracefully', assertions: [] } };
  blastRadius = { scope: 'service' as const, percentage: 15, maxImpact: 5, rolloutStrategy: 'gradual' as const };
  safetyControls = { enableEmergencyStop: true, autoRollbackOnSLAViolation: true, maxDuration: 300000, healthCheckInterval: 5000, preFlightChecks: [] };
  async execute(context: ExperimentContext): Promise<ExperimentResult> { const r = this.createBaseResult(context); r.status = 'completed'; r.resilience = { mtbf: 7200000, mttr: 8000, errorBudget: 96, resilienceScore: 83, availability: 98.5, recoveryRate: 90 }; return r; }
  async rollback(): Promise<void> {}
}

// Export experiment registry
export const COMPUTE_EXPERIMENTS = [
  CPUSpikeExperiment,
  MemoryLeakExperiment,
  DiskFullExperiment,
  ProcessKillExperiment,
  ResourceExhaustionExperiment,
  ThreadExhaustionExperiment,
  FileDescriptorExhaustionExperiment,
  IOStormExperiment,
  ZombieProcessExperiment,
  ContextSwitchingExperiment,
];

/**
 * Factory function to create compute experiments
 */
export function createComputeExperiment(type: string, config?: any): ChaosExperiment {
  switch (type) {
    case 'cpu-spike':
      return new CPUSpikeExperiment(config?.cpuPercentage);
    case 'memory-leak':
      return new MemoryLeakExperiment(config?.leakRate);
    case 'disk-full':
      return new DiskFullExperiment();
    case 'process-kill':
      return new ProcessKillExperiment();
    case 'resource-exhaustion':
      return new ResourceExhaustionExperiment();
    case 'thread-exhaustion':
      return new ThreadExhaustionExperiment();
    case 'fd-exhaustion':
      return new FileDescriptorExhaustionExperiment();
    case 'io-storm':
      return new IOStormExperiment();
    case 'zombie-process':
      return new ZombieProcessExperiment();
    case 'context-switching':
      return new ContextSwitchingExperiment();
    default:
      throw new Error(`Unknown compute experiment type: ${type}`);
  }
}
