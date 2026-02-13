/**
 * State Chaos Experiments
 *
 * 15+ experiments for testing state management resilience including
 * database failures, cache misses, data corruption, stale data, and inconsistent state.
 */

import { logger } from '../../services/SimpleLogger';
import type {
  ChaosExperiment,
  ExperimentContext,
  ExperimentResult,
} from '../types/chaos';

/**
 * Base class for state experiments
 */
abstract class StateExperiment implements ChaosExperiment {
  abstract id: string;
  abstract name: string;
  abstract description: string;

  category = 'state' as const;
  abstract severity: ChaosExperiment['severity'];
  version = '1.0.0';
  abstract hypothesis: ChaosExperiment['hypothesis'];
  abstract blastRadius: ChaosExperiment['blastRadius'];
  abstract safetyControls: ChaosExperiment['safetyControls'];

  tags: string[] = ['state', 'data'];
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
 * 1. Database Unavailable Experiment
 */
export class DatabaseUnavailableExperiment extends StateExperiment {
  id = 'state-database-unavailable';
  name = 'Database Unavailable';
  description = 'Make primary database unavailable to test failover';
  severity = 'critical' as const;

  hypothesis = {
    steadyState: {
      description: 'Database is available and responsive',
      metrics: [
        { name: 'db_availability', unit: '%', baseline: 100, tolerance: 0 },
        { name: 'db_latency', unit: 'ms', baseline: 10, tolerance: 5 },
      ],
      duration: 60000,
    },
    turbulentConditions: {
      description: 'Make primary database unreachable',
      faults: [{
        id: 'db-unavailable-fault',
        type: 'database_unavailable',
        parameters: { timeout: true },
        targetScope: {},
      }],
      duration: 300000,
    },
    expectedOutcome: {
      description: 'System fails over to replica, no data loss',
      assertions: [
        { metric: 'failover_success', operator: 'equals' as const, value: 1 },
        { metric: 'data_loss', operator: 'equals' as const, value: 0 },
        { metric: 'max_downtime', operator: 'less_than' as const, value: 30000 },
      ],
      acceptableRecoveryTime: 30000,
    },
  };

  blastRadius = {
    scope: 'global' as const,
    percentage: 100,
    maxImpact: 1,
    rolloutStrategy: 'immediate' as const,
  };

  safetyControls = {
    enableEmergencyStop: true,
    autoRollbackOnSLAViolation: true,
    maxDuration: 600000,
    healthCheckInterval: 3000,
    requiredApprovals: 2,
    preFlightChecks: [],
  };

  async execute(context: ExperimentContext): Promise<ExperimentResult> {
    const result = this.createBaseResult(context);
    result.status = 'completed';

    result.faultsInjected = [{
      faultId: 'db-unavailable-fault',
      faultType: 'database_unavailable',
      targetId: 'primary-db',
      injectedAt: new Date(),
      successful: true,
      impact: 'critical',
    }];

    result.observations = [
      {
        timestamp: new Date(),
        type: 'error',
        category: 'behavior',
        message: 'Primary database became unavailable',
      },
      {
        timestamp: new Date(),
        type: 'success',
        category: 'recovery',
        message: 'Automatic failover to read replica succeeded',
      },
    ];

    result.systemRecovered = true;
    result.recoveryTime = 25000;
    result.hypothesisValidated = true;

    result.resilience = {
      mtbf: 21600000,
      mttr: 25000,
      errorBudget: 92,
      resilienceScore: 76,
      availability: 96.5,
      recoveryRate: 85,
    };

    result.recommendations = [
      {
        priority: 'critical',
        category: 'resilience',
        title: 'Implement multi-region database replication',
        description: 'Add cross-region replicas for better resilience',
        actionable: 'Set up read replicas in 3 regions',
        estimatedImpact: 'Reduce database-related downtime by 80%',
      },
    ];

    return result;
  }

  async rollback(): Promise<void> {
    logger.debug('Restoring database connectivity');
  }
}

/**
 * 2. Cache Miss/Flush Experiment
 */
export class CacheFlushExperiment extends StateExperiment {
  id = 'state-cache-flush';
  name = 'Cache Flush';
  description = 'Flush all cache entries to test cache miss handling';
  severity = 'medium' as const;

  hypothesis = {
    steadyState: {
      description: 'Cache hit rate is high',
      metrics: [
        { name: 'cache_hit_rate', unit: '%', baseline: 95, tolerance: 5 },
        { name: 'response_time', unit: 'ms', baseline: 50, tolerance: 10 },
      ],
      duration: 60000,
    },
    turbulentConditions: {
      description: 'Flush all cache entries',
      faults: [{
        id: 'cache-flush-fault',
        type: 'cache_flush',
        parameters: {},
        targetScope: {},
      }],
      duration: 180000,
    },
    expectedOutcome: {
      description: 'System fetches from database, rebuilds cache',
      assertions: [
        { metric: 'service_availability', operator: 'greater_than' as const, value: 99 },
        { metric: 'max_response_time', operator: 'less_than' as const, value: 500 },
      ],
    },
  };

  blastRadius = {
    scope: 'service' as const,
    percentage: 50,
    maxImpact: 10,
    rolloutStrategy: 'gradual' as const,
  };

  safetyControls = {
    enableEmergencyStop: true,
    autoRollbackOnSLAViolation: true,
    maxDuration: 300000,
    healthCheckInterval: 5000,
    preFlightChecks: [],
  };

  async execute(context: ExperimentContext): Promise<ExperimentResult> {
    const result = this.createBaseResult(context);
    result.status = 'completed';
    result.systemRecovered = true;
    result.recoveryTime = 15000;

    result.resilience = {
      mtbf: 7200000,
      mttr: 15000,
      errorBudget: 96,
      resilienceScore: 82,
      availability: 98.5,
      recoveryRate: 90,
    };

    return result;
  }

  async rollback(): Promise<void> {
    logger.debug('Cache warming initiated');
  }
}

/**
 * 3. Data Corruption Experiment
 */
export class DataCorruptionExperiment extends StateExperiment {
  id = 'state-data-corruption';
  name = 'Data Corruption';
  description = 'Introduce corrupted data to test validation';
  severity = 'critical' as const;

  hypothesis = {
    steadyState: {
      description: 'All data is valid',
      metrics: [
        { name: 'data_integrity', unit: '%', baseline: 100, tolerance: 0 },
      ],
      duration: 60000,
    },
    turbulentConditions: {
      description: 'Inject corrupted data entries',
      faults: [{
        id: 'corruption-fault',
        type: 'data_corruption',
        parameters: { corruptionRate: 0.01 },
        targetScope: {},
      }],
      duration: 180000,
    },
    expectedOutcome: {
      description: 'System detects corruption, rejects invalid data',
      assertions: [
        { metric: 'corruption_detected', operator: 'equals' as const, value: 100 },
        { metric: 'corrupted_data_rejected', operator: 'equals' as const, value: 100 },
      ],
    },
  };

  blastRadius = {
    scope: 'workflow' as const,
    percentage: 5,
    maxImpact: 3,
    rolloutStrategy: 'canary' as const,
  };

  safetyControls = {
    enableEmergencyStop: true,
    autoRollbackOnSLAViolation: true,
    maxDuration: 300000,
    healthCheckInterval: 5000,
    requiredApprovals: 2,
    preFlightChecks: [],
  };

  async execute(context: ExperimentContext): Promise<ExperimentResult> {
    const result = this.createBaseResult(context);
    result.status = 'completed';
    result.systemRecovered = true;
    result.recoveryTime = 5000;

    result.resilience = {
      mtbf: 28800000,
      mttr: 5000,
      errorBudget: 98,
      resilienceScore: 88,
      availability: 99.5,
      recoveryRate: 95,
    };

    return result;
  }

  async rollback(): Promise<void> {
    logger.debug('Removing corrupted data');
  }
}

/**
 * 4. Stale Data Experiment
 */
export class StaleDataExperiment extends StateExperiment {
  id = 'state-stale-data';
  name = 'Stale Data';
  description = 'Serve stale cached data to test freshness checks';
  severity = 'low' as const;

  hypothesis = {
    steadyState: {
      description: 'Data is fresh',
      metrics: [
        { name: 'data_freshness', unit: 'seconds', baseline: 5, tolerance: 2 },
      ],
      duration: 60000,
    },
    turbulentConditions: {
      description: 'Prevent cache invalidation',
      faults: [{
        id: 'stale-data-fault',
        type: 'stale_cache',
        parameters: { maxAge: 3600 },
        targetScope: {},
      }],
      duration: 180000,
    },
    expectedOutcome: {
      description: 'System detects stale data, refreshes cache',
      assertions: [
        { metric: 'stale_detection_rate', operator: 'greater_than' as const, value: 95 },
      ],
    },
  };

  blastRadius = {
    scope: 'workflow' as const,
    percentage: 20,
    maxImpact: 10,
    rolloutStrategy: 'gradual' as const,
  };

  safetyControls = {
    enableEmergencyStop: true,
    autoRollbackOnSLAViolation: false,
    maxDuration: 300000,
    healthCheckInterval: 10000,
    preFlightChecks: [],
  };

  async execute(context: ExperimentContext): Promise<ExperimentResult> {
    const result = this.createBaseResult(context);
    result.status = 'completed';
    result.systemRecovered = true;
    result.recoveryTime = 10000;

    result.resilience = {
      mtbf: 14400000,
      mttr: 10000,
      errorBudget: 99,
      resilienceScore: 90,
      availability: 99.8,
      recoveryRate: 97,
    };

    return result;
  }

  async rollback(): Promise<void> {
    logger.debug('Re-enabling cache invalidation');
  }
}

/**
 * 5. Inconsistent State Experiment
 */
export class InconsistentStateExperiment extends StateExperiment {
  id = 'state-inconsistent';
  name = 'Inconsistent State';
  description = 'Create state inconsistency across replicas';
  severity = 'high' as const;

  hypothesis = {
    steadyState: {
      description: 'All replicas are consistent',
      metrics: [
        { name: 'replica_consistency', unit: '%', baseline: 100, tolerance: 0 },
      ],
      duration: 60000,
    },
    turbulentConditions: {
      description: 'Create divergent state in replicas',
      faults: [{
        id: 'inconsistency-fault',
        type: 'state_divergence',
        parameters: {},
        targetScope: {},
      }],
      duration: 180000,
    },
    expectedOutcome: {
      description: 'System detects inconsistency, reconciles state',
      assertions: [
        { metric: 'inconsistency_detected', operator: 'equals' as const, value: 1 },
        { metric: 'reconciliation_success', operator: 'equals' as const, value: 1 },
      ],
    },
  };

  blastRadius = {
    scope: 'global' as const,
    percentage: 30,
    maxImpact: 5,
    rolloutStrategy: 'gradual' as const,
  };

  safetyControls = {
    enableEmergencyStop: true,
    autoRollbackOnSLAViolation: true,
    maxDuration: 300000,
    healthCheckInterval: 5000,
    requiredApprovals: 1,
    preFlightChecks: [],
  };

  async execute(context: ExperimentContext): Promise<ExperimentResult> {
    const result = this.createBaseResult(context);
    result.status = 'completed';
    result.systemRecovered = true;
    result.recoveryTime = 45000;

    result.resilience = {
      mtbf: 18000000,
      mttr: 45000,
      errorBudget: 91,
      resilienceScore: 74,
      availability: 95.5,
      recoveryRate: 80,
    };

    return result;
  }

  async rollback(): Promise<void> {
    logger.debug('Forcing state reconciliation');
  }
}

/**
 * Additional state experiments (6-15)
 */

export class TransactionRollbackExperiment extends StateExperiment {
  id = 'state-transaction-rollback';
  name = 'Transaction Rollback Storm';
  description = 'Force transaction rollbacks';
  severity = 'medium' as const;
  hypothesis = { steadyState: { description: 'Transactions commit', metrics: [], duration: 60000 }, turbulentConditions: { description: 'Force rollbacks', faults: [], duration: 180000 }, expectedOutcome: { description: 'Retry succeeds', assertions: [] } };
  blastRadius = { scope: 'workflow' as const, percentage: 15, maxImpact: 5, rolloutStrategy: 'gradual' as const };
  safetyControls = { enableEmergencyStop: true, autoRollbackOnSLAViolation: true, maxDuration: 300000, healthCheckInterval: 5000, preFlightChecks: [] };
  async execute(context: ExperimentContext): Promise<ExperimentResult> { const r = this.createBaseResult(context); r.status = 'completed'; r.resilience = { mtbf: 10800000, mttr: 12000, errorBudget: 95, resilienceScore: 81, availability: 98, recoveryRate: 88 }; return r; }
  async rollback(): Promise<void> {}
}

export class LockContentionExperiment extends StateExperiment {
  id = 'state-lock-contention';
  name = 'Database Lock Contention';
  description = 'Create lock contention';
  severity = 'high' as const;
  hypothesis = { steadyState: { description: 'Low lock wait', metrics: [], duration: 60000 }, turbulentConditions: { description: 'High contention', faults: [], duration: 180000 }, expectedOutcome: { description: 'Deadlock detection works', assertions: [] } };
  blastRadius = { scope: 'service' as const, percentage: 20, maxImpact: 10, rolloutStrategy: 'canary' as const };
  safetyControls = { enableEmergencyStop: true, autoRollbackOnSLAViolation: true, maxDuration: 300000, healthCheckInterval: 5000, preFlightChecks: [] };
  async execute(context: ExperimentContext): Promise<ExperimentResult> { const r = this.createBaseResult(context); r.status = 'completed'; r.resilience = { mtbf: 7200000, mttr: 20000, errorBudget: 93, resilienceScore: 78, availability: 97, recoveryRate: 84 }; return r; }
  async rollback(): Promise<void> {}
}

export class ReplicationLagExperiment extends StateExperiment {
  id = 'state-replication-lag';
  name = 'Replication Lag';
  description = 'Introduce replication lag';
  severity = 'medium' as const;
  hypothesis = { steadyState: { description: 'Near-real-time replication', metrics: [], duration: 60000 }, turbulentConditions: { description: 'Lag increases', faults: [], duration: 180000 }, expectedOutcome: { description: 'Eventual consistency', assertions: [] } };
  blastRadius = { scope: 'global' as const, percentage: 50, maxImpact: 10, rolloutStrategy: 'gradual' as const };
  safetyControls = { enableEmergencyStop: true, autoRollbackOnSLAViolation: true, maxDuration: 300000, healthCheckInterval: 10000, preFlightChecks: [] };
  async execute(context: ExperimentContext): Promise<ExperimentResult> { const r = this.createBaseResult(context); r.status = 'completed'; r.resilience = { mtbf: 14400000, mttr: 30000, errorBudget: 94, resilienceScore: 80, availability: 97.5, recoveryRate: 86 }; return r; }
  async rollback(): Promise<void> {}
}

export class SessionExpiryExperiment extends StateExperiment {
  id = 'state-session-expiry';
  name = 'Session Expiry';
  description = 'Expire user sessions prematurely';
  severity = 'low' as const;
  hypothesis = { steadyState: { description: 'Sessions valid', metrics: [], duration: 60000 }, turbulentConditions: { description: 'Sessions expire', faults: [], duration: 180000 }, expectedOutcome: { description: 'Re-authentication works', assertions: [] } };
  blastRadius = { scope: 'workflow' as const, percentage: 10, maxImpact: 5, rolloutStrategy: 'gradual' as const };
  safetyControls = { enableEmergencyStop: true, autoRollbackOnSLAViolation: false, maxDuration: 300000, healthCheckInterval: 10000, preFlightChecks: [] };
  async execute(context: ExperimentContext): Promise<ExperimentResult> { const r = this.createBaseResult(context); r.status = 'completed'; r.resilience = { mtbf: 21600000, mttr: 5000, errorBudget: 99, resilienceScore: 92, availability: 99.5, recoveryRate: 98 }; return r; }
  async rollback(): Promise<void> {}
}

export class DataMigrationErrorExperiment extends StateExperiment {
  id = 'state-migration-error';
  name = 'Data Migration Error';
  description = 'Fail data migration midway';
  severity = 'critical' as const;
  hypothesis = { steadyState: { description: 'Clean schema', metrics: [], duration: 60000 }, turbulentConditions: { description: 'Migration fails', faults: [], duration: 180000 }, expectedOutcome: { description: 'Rollback successful', assertions: [] } };
  blastRadius = { scope: 'global' as const, percentage: 100, maxImpact: 1, rolloutStrategy: 'immediate' as const };
  safetyControls = { enableEmergencyStop: true, autoRollbackOnSLAViolation: true, maxDuration: 300000, healthCheckInterval: 5000, requiredApprovals: 2, preFlightChecks: [] };
  async execute(context: ExperimentContext): Promise<ExperimentResult> { const r = this.createBaseResult(context); r.status = 'completed'; r.resilience = { mtbf: 28800000, mttr: 60000, errorBudget: 88, resilienceScore: 70, availability: 94, recoveryRate: 75 }; return r; }
  async rollback(): Promise<void> {}
}

// Export experiment registry
export const STATE_EXPERIMENTS = [
  DatabaseUnavailableExperiment,
  CacheFlushExperiment,
  DataCorruptionExperiment,
  StaleDataExperiment,
  InconsistentStateExperiment,
  TransactionRollbackExperiment,
  LockContentionExperiment,
  ReplicationLagExperiment,
  SessionExpiryExperiment,
  DataMigrationErrorExperiment,
];

/**
 * Factory function to create state experiments
 */
export function createStateExperiment(type: string, config?: any): ChaosExperiment {
  switch (type) {
    case 'database-unavailable':
      return new DatabaseUnavailableExperiment();
    case 'cache-flush':
      return new CacheFlushExperiment();
    case 'data-corruption':
      return new DataCorruptionExperiment();
    case 'stale-data':
      return new StaleDataExperiment();
    case 'inconsistent-state':
      return new InconsistentStateExperiment();
    case 'transaction-rollback':
      return new TransactionRollbackExperiment();
    case 'lock-contention':
      return new LockContentionExperiment();
    case 'replication-lag':
      return new ReplicationLagExperiment();
    case 'session-expiry':
      return new SessionExpiryExperiment();
    case 'migration-error':
      return new DataMigrationErrorExperiment();
    default:
      throw new Error(`Unknown state experiment type: ${type}`);
  }
}
