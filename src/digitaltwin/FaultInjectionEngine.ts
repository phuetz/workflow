/**
 * Fault Injection Engine
 *
 * Injects faults into workflow simulations to test resilience,
 * error handling, and recovery mechanisms.
 */

import type {
  FaultScenario,
  FaultType,
  FaultTiming,
  FaultInjectionResult,
} from './types/digitaltwin';
import { v4 as uuidv4 } from 'uuid';

/**
 * Fault injection configuration
 */
export interface FaultInjectionConfig {
  enableChaos: boolean;
  chaosLevel: number; // 0-1
  recordImpact: boolean;
  autoRecover: boolean;
  maxConcurrentFaults: number;
}

/**
 * Fault template for quick scenario creation
 */
export interface FaultTemplate {
  name: string;
  description: string;
  faultType: FaultType;
  defaultProbability: number;
  defaultTiming: FaultTiming;
  parameters?: Record<string, any>;
}

/**
 * Fault Injection Engine class
 */
export class FaultInjectionEngine {
  private scenarios: Map<string, FaultScenario> = new Map();
  private results: Map<string, FaultInjectionResult[]> = new Map();
  private config: FaultInjectionConfig;
  private templates: Map<string, FaultTemplate> = new Map();

  constructor(config: Partial<FaultInjectionConfig> = {}) {
    this.config = {
      enableChaos: config.enableChaos ?? false,
      chaosLevel: config.chaosLevel ?? 0.3,
      recordImpact: config.recordImpact ?? true,
      autoRecover: config.autoRecover ?? true,
      maxConcurrentFaults: config.maxConcurrentFaults ?? 5,
    };

    this.initializeTemplates();
  }

  /**
   * Initialize fault templates
   */
  private initializeTemplates(): void {
    const templates: FaultTemplate[] = [
      {
        name: 'Network Timeout',
        description: 'Simulates network timeout after configurable delay',
        faultType: 'network_timeout',
        defaultProbability: 0.5,
        defaultTiming: 'during',
        parameters: { delay: 30000 }, // 30s
      },
      {
        name: 'Invalid JSON',
        description: 'Returns malformed JSON data',
        faultType: 'invalid_data',
        defaultProbability: 0.3,
        defaultTiming: 'during',
        parameters: { malformedType: 'json' },
      },
      {
        name: 'API 500 Error',
        description: 'API returns 500 Internal Server Error',
        faultType: 'api_failure',
        defaultProbability: 0.2,
        defaultTiming: 'during',
        parameters: { statusCode: 500 },
      },
      {
        name: 'Rate Limited',
        description: 'API returns 429 Too Many Requests',
        faultType: 'api_failure',
        defaultProbability: 0.4,
        defaultTiming: 'during',
        parameters: { statusCode: 429, retryAfter: 60 },
      },
      {
        name: 'Auth Expired',
        description: 'Authentication token has expired',
        faultType: 'auth_failure',
        defaultProbability: 0.1,
        defaultTiming: 'before',
        parameters: { reason: 'token_expired' },
      },
      {
        name: 'Invalid Credentials',
        description: 'Authentication credentials are invalid',
        faultType: 'auth_failure',
        defaultProbability: 0.15,
        defaultTiming: 'before',
        parameters: { reason: 'invalid_credentials' },
      },
      {
        name: 'Out of Memory',
        description: 'Process runs out of memory',
        faultType: 'resource_exhaustion',
        defaultProbability: 0.05,
        defaultTiming: 'during',
        parameters: { resource: 'memory', threshold: 0.95 },
      },
      {
        name: 'CPU Throttled',
        description: 'CPU usage exceeds limits',
        faultType: 'resource_exhaustion',
        defaultProbability: 0.1,
        defaultTiming: 'during',
        parameters: { resource: 'cpu', threshold: 0.90 },
      },
      {
        name: 'Data Corruption',
        description: 'Random bits flipped in data',
        faultType: 'data_corruption',
        defaultProbability: 0.01,
        defaultTiming: 'during',
        parameters: { corruptionRate: 0.001 },
      },
      {
        name: 'Cascading Failure',
        description: 'Failure propagates to dependent nodes',
        faultType: 'cascading_failure',
        defaultProbability: 0.2,
        defaultTiming: 'after',
        parameters: { propagationRate: 0.7 },
      },
      {
        name: 'Intermittent Failure',
        description: 'Random success/failure pattern',
        faultType: 'intermittent_failure',
        defaultProbability: 0.5,
        defaultTiming: 'during',
        parameters: { successRate: 0.6 },
      },
      {
        name: 'Slow Response',
        description: 'High latency response',
        faultType: 'slow_response',
        defaultProbability: 0.3,
        defaultTiming: 'during',
        parameters: { delay: 5000, jitter: 2000 }, // 5s ± 2s
      },
      {
        name: 'Partial Data',
        description: 'Some fields missing from response',
        faultType: 'partial_failure',
        defaultProbability: 0.25,
        defaultTiming: 'during',
        parameters: { missingFieldRate: 0.3 },
      },
    ];

    templates.forEach(template => {
      this.templates.set(template.name, template);
    });
  }

  /**
   * Create fault scenario from template
   */
  createFromTemplate(
    templateName: string,
    nodeId: string,
    overrides: Partial<FaultScenario> = {}
  ): FaultScenario {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Fault template "${templateName}" not found`);
    }

    const scenario: FaultScenario = {
      id: uuidv4(),
      name: overrides.name || `${template.name} - ${nodeId}`,
      description: overrides.description || template.description,
      nodeId,
      faultType: template.faultType,
      probability: overrides.probability ?? template.defaultProbability,
      timing: overrides.timing || template.defaultTiming,
      duration: overrides.duration,
      parameters: { ...template.parameters, ...overrides.parameters },
      enabled: overrides.enabled ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.scenarios.set(scenario.id, scenario);
    return scenario;
  }

  /**
   * Create custom fault scenario
   */
  createScenario(scenario: Omit<FaultScenario, 'id' | 'createdAt' | 'updatedAt'>): FaultScenario {
    const faultScenario: FaultScenario = {
      ...scenario,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.scenarios.set(faultScenario.id, faultScenario);
    return faultScenario;
  }

  /**
   * Get fault scenario by ID
   */
  getScenario(scenarioId: string): FaultScenario | undefined {
    return this.scenarios.get(scenarioId);
  }

  /**
   * Update fault scenario
   */
  updateScenario(scenarioId: string, updates: Partial<FaultScenario>): FaultScenario {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      throw new Error(`Fault scenario ${scenarioId} not found`);
    }

    const updated = {
      ...scenario,
      ...updates,
      id: scenario.id,
      createdAt: scenario.createdAt,
      updatedAt: new Date(),
    };

    this.scenarios.set(scenarioId, updated);
    return updated;
  }

  /**
   * Delete fault scenario
   */
  deleteScenario(scenarioId: string): boolean {
    this.results.delete(scenarioId);
    return this.scenarios.delete(scenarioId);
  }

  /**
   * List all fault scenarios
   */
  listScenarios(filters?: { nodeId?: string; faultType?: FaultType; enabled?: boolean }): FaultScenario[] {
    let scenarios = Array.from(this.scenarios.values());

    if (filters) {
      if (filters.nodeId) {
        scenarios = scenarios.filter(s => s.nodeId === filters.nodeId);
      }
      if (filters.faultType) {
        scenarios = scenarios.filter(s => s.faultType === filters.faultType);
      }
      if (filters.enabled !== undefined) {
        scenarios = scenarios.filter(s => s.enabled === filters.enabled);
      }
    }

    return scenarios;
  }

  /**
   * Inject fault based on scenario
   */
  async injectFault(
    scenario: FaultScenario,
    context: { nodeId: string; timing: FaultTiming; deterministic?: boolean }
  ): Promise<FaultInjectionResult> {
    // Check if fault should be injected
    const shouldInject = this.shouldInjectFault(scenario, context);

    const result: FaultInjectionResult = {
      faultId: scenario.id,
      nodeId: scenario.nodeId,
      faultType: scenario.faultType,
      injected: shouldInject,
      timing: context.timing,
      impact: 'none',
      recovered: false,
    };

    if (!shouldInject) {
      return result;
    }

    // Inject the fault
    try {
      const error = await this.executeFault(scenario);
      result.error = error;
      result.impact = this.assessImpact(scenario, error);

      // Attempt recovery if enabled
      if (this.config.autoRecover) {
        const recovered = await this.attemptRecovery(scenario, error);
        result.recovered = recovered.success;
        result.recoveryTime = recovered.recoveryTime;
      }
    } catch (error) {
      result.error = error as Error;
      result.impact = 'critical';
    }

    // Record result
    if (this.config.recordImpact) {
      this.recordResult(scenario.id, result);
    }

    return result;
  }

  /**
   * Determine if fault should be injected
   */
  private shouldInjectFault(
    scenario: FaultScenario,
    context: { timing: FaultTiming; deterministic?: boolean }
  ): boolean {
    if (!scenario.enabled) return false;
    if (scenario.timing !== context.timing) return false;

    // In deterministic mode, only inject if probability is 1.0
    if (context.deterministic) {
      return scenario.probability >= 1.0;
    }

    // In chaos mode, increase probability
    let probability = scenario.probability;
    if (this.config.enableChaos) {
      probability = Math.min(1.0, probability * (1 + this.config.chaosLevel));
    }

    return Math.random() < probability;
  }

  /**
   * Execute the fault injection
   */
  private async executeFault(scenario: FaultScenario): Promise<Error> {
    switch (scenario.faultType) {
      case 'network_timeout':
        return this.injectNetworkTimeout(scenario);
      case 'invalid_data':
        return this.injectInvalidData(scenario);
      case 'api_failure':
        return this.injectApiFailure(scenario);
      case 'auth_failure':
        return this.injectAuthFailure(scenario);
      case 'resource_exhaustion':
        return this.injectResourceExhaustion(scenario);
      case 'data_corruption':
        return this.injectDataCorruption(scenario);
      case 'cascading_failure':
        return this.injectCascadingFailure(scenario);
      case 'intermittent_failure':
        return this.injectIntermittentFailure(scenario);
      case 'slow_response':
        return this.injectSlowResponse(scenario);
      case 'partial_failure':
        return this.injectPartialFailure(scenario);
      default:
        return new Error(`Unknown fault type: ${scenario.faultType}`);
    }
  }

  /**
   * Inject network timeout fault
   */
  private async injectNetworkTimeout(scenario: FaultScenario): Promise<Error> {
    const delay = scenario.parameters?.delay || 30000;
    await new Promise(resolve => setTimeout(resolve, Math.min(delay, 1000))); // Limit actual delay
    return new Error(`Network timeout after ${delay}ms`);
  }

  /**
   * Inject invalid data fault
   */
  private injectInvalidData(scenario: FaultScenario): Error {
    const malformedType = scenario.parameters?.malformedType || 'json';
    return new Error(`Invalid ${malformedType} data received`);
  }

  /**
   * Inject API failure fault
   */
  private injectApiFailure(scenario: FaultScenario): Error {
    const statusCode = scenario.parameters?.statusCode || 500;
    const message = statusCode === 429
      ? 'Rate limit exceeded'
      : `API request failed with status ${statusCode}`;
    return new Error(message);
  }

  /**
   * Inject authentication failure fault
   */
  private injectAuthFailure(scenario: FaultScenario): Error {
    const reason = scenario.parameters?.reason || 'invalid_credentials';
    const messages: Record<string, string> = {
      token_expired: 'Authentication token has expired',
      invalid_credentials: 'Invalid credentials provided',
      insufficient_permissions: 'Insufficient permissions',
    };
    return new Error(messages[reason] || 'Authentication failed');
  }

  /**
   * Inject resource exhaustion fault
   */
  private injectResourceExhaustion(scenario: FaultScenario): Error {
    const resource = scenario.parameters?.resource || 'memory';
    const threshold = scenario.parameters?.threshold || 0.95;
    return new Error(`${resource} exhausted (${(threshold * 100).toFixed(0)}% used)`);
  }

  /**
   * Inject data corruption fault
   */
  private injectDataCorruption(scenario: FaultScenario): Error {
    const corruptionRate = scenario.parameters?.corruptionRate || 0.001;
    return new Error(`Data corruption detected (${(corruptionRate * 100).toFixed(3)}% corrupted)`);
  }

  /**
   * Inject cascading failure fault
   */
  private injectCascadingFailure(scenario: FaultScenario): Error {
    const propagationRate = scenario.parameters?.propagationRate || 0.7;
    return new Error(`Cascading failure (${(propagationRate * 100).toFixed(0)}% propagation)`);
  }

  /**
   * Inject intermittent failure fault
   */
  private injectIntermittentFailure(scenario: FaultScenario): Error {
    const successRate = scenario.parameters?.successRate || 0.6;
    const failed = Math.random() > successRate;
    if (failed) {
      return new Error('Intermittent failure occurred');
    }
    return new Error('Success (no fault injected)');
  }

  /**
   * Inject slow response fault
   */
  private async injectSlowResponse(scenario: FaultScenario): Promise<Error> {
    const delay = scenario.parameters?.delay || 5000;
    const jitter = scenario.parameters?.jitter || 0;
    const actualDelay = delay + (Math.random() * jitter * 2 - jitter);
    await new Promise(resolve => setTimeout(resolve, Math.min(actualDelay, 1000))); // Limit actual delay
    return new Error(`Slow response (${actualDelay.toFixed(0)}ms delay)`);
  }

  /**
   * Inject partial failure fault
   */
  private injectPartialFailure(scenario: FaultScenario): Error {
    const missingFieldRate = scenario.parameters?.missingFieldRate || 0.3;
    return new Error(`Partial data received (${(missingFieldRate * 100).toFixed(0)}% fields missing)`);
  }

  /**
   * Assess impact of injected fault
   */
  private assessImpact(scenario: FaultScenario, error: Error): 'none' | 'minor' | 'major' | 'critical' {
    const criticalFaults: FaultType[] = ['cascading_failure', 'resource_exhaustion', 'data_corruption'];
    const majorFaults: FaultType[] = ['api_failure', 'auth_failure', 'network_timeout'];
    const minorFaults: FaultType[] = ['slow_response', 'partial_failure', 'intermittent_failure'];

    if (criticalFaults.includes(scenario.faultType)) return 'critical';
    if (majorFaults.includes(scenario.faultType)) return 'major';
    if (minorFaults.includes(scenario.faultType)) return 'minor';
    return 'none';
  }

  /**
   * Attempt automatic recovery from fault
   */
  private async attemptRecovery(
    scenario: FaultScenario,
    error: Error
  ): Promise<{ success: boolean; recoveryTime?: number }> {
    const startTime = Date.now();

    // Simulate recovery based on fault type
    const recoveryStrategies: Record<FaultType, number> = {
      network_timeout: 0.8, // 80% recovery rate
      invalid_data: 0.6,
      api_failure: 0.7,
      auth_failure: 0.5,
      resource_exhaustion: 0.3,
      data_corruption: 0.2,
      cascading_failure: 0.4,
      intermittent_failure: 0.9,
      slow_response: 1.0, // Always recovers
      partial_failure: 0.7,
    };

    const recoveryRate = recoveryStrategies[scenario.faultType] || 0.5;
    const success = Math.random() < recoveryRate;

    return {
      success,
      recoveryTime: success ? Date.now() - startTime : undefined,
    };
  }

  /**
   * Record fault injection result
   */
  private recordResult(scenarioId: string, result: FaultInjectionResult): void {
    const results = this.results.get(scenarioId) || [];
    results.push(result);
    this.results.set(scenarioId, results);
  }

  /**
   * Get fault injection results
   */
  getResults(scenarioId: string): FaultInjectionResult[] {
    return this.results.get(scenarioId) || [];
  }

  /**
   * Get fault injection statistics
   */
  getStatistics(scenarioId: string): {
    totalInjections: number;
    successfulInjections: number;
    failedInjections: number;
    recoveryRate: number;
    avgRecoveryTime: number;
    impactDistribution: Record<string, number>;
  } {
    const results = this.results.get(scenarioId) || [];
    const injected = results.filter(r => r.injected);
    const recovered = injected.filter(r => r.recovered);

    const recoveryTimes = recovered
      .map(r => r.recoveryTime)
      .filter((t): t is number => t !== undefined);

    const impactDistribution = {
      none: results.filter(r => r.impact === 'none').length,
      minor: results.filter(r => r.impact === 'minor').length,
      major: results.filter(r => r.impact === 'major').length,
      critical: results.filter(r => r.impact === 'critical').length,
    };

    return {
      totalInjections: results.length,
      successfulInjections: injected.length,
      failedInjections: results.length - injected.length,
      recoveryRate: injected.length > 0 ? recovered.length / injected.length : 0,
      avgRecoveryTime: recoveryTimes.length > 0
        ? recoveryTimes.reduce((sum, t) => sum + t, 0) / recoveryTimes.length
        : 0,
      impactDistribution,
    };
  }

  /**
   * List available templates
   */
  listTemplates(): FaultTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Enable chaos mode
   */
  enableChaos(level: number = 0.3): void {
    this.config.enableChaos = true;
    this.config.chaosLevel = Math.max(0, Math.min(1, level));
  }

  /**
   * Disable chaos mode
   */
  disableChaos(): void {
    this.config.enableChaos = false;
  }

  /**
   * Clear all results
   */
  clearResults(): void {
    this.results.clear();
  }
}

// Singleton instance
let instance: FaultInjectionEngine | null = null;

export function getFaultInjectionEngine(config?: Partial<FaultInjectionConfig>): FaultInjectionEngine {
  if (!instance) {
    instance = new FaultInjectionEngine(config);
  }
  return instance;
}
