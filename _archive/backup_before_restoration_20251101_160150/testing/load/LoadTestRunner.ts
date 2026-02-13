/**
 * Load Test Runner
 * Multi-stage load testing with spike, stress, and soak testing
 */

import type { K6Test, K6Results, LoadProfile, PerformanceScenario } from '../types/testing';
import { K6Integration } from './K6Integration';
import { logger } from '../../services/LoggingService';

export type LoadTestType = 'spike' | 'stress' | 'soak' | 'ramp-up' | 'constant';

export interface LoadTestConfig {
  name: string;
  type: LoadTestType;
  baseUrl: string;
  scenarios: PerformanceScenario[];
  targetUsers?: number;
  duration?: number; // minutes
  spikeMultiplier?: number; // for spike tests
}

export class LoadTestRunner {
  private k6: K6Integration;
  private tests: Map<string, { config: LoadTestConfig; test: K6Test; results?: K6Results }> = new Map();

  constructor() {
    this.k6 = new K6Integration();
  }

  /**
   * Create and configure a load test
   */
  createLoadTest(config: LoadTestConfig): string {
    logger.debug(`[LoadTestRunner] Creating ${config.type} test: ${config.name}`);

    const load = this.generateLoadProfile(config);
    const script = this.k6.generateScript(config.scenarios, load, config.baseUrl);
    const test = this.k6.createTest(config.name, script, load.stages ? { stages: load.stages.map(s => ({ duration: `${s.duration}s`, target: s.target })) } : { vus: load.users, duration: `${load.duration}s` });

    const testId = this.generateId();
    this.tests.set(testId, { config, test });

    logger.debug(`[LoadTestRunner] Created test ${testId}`);
    return testId;
  }

  /**
   * Generate load profile based on test type
   */
  private generateLoadProfile(config: LoadTestConfig): LoadProfile {
    const targetUsers = config.targetUsers || 100;
    const duration = (config.duration || 10) * 60; // Convert minutes to seconds

    switch (config.type) {
      case 'spike':
        return this.generateSpikeProfile(targetUsers, duration, config.spikeMultiplier || 3);

      case 'stress':
        return this.generateStressProfile(targetUsers, duration);

      case 'soak':
        return this.generateSoakProfile(targetUsers, config.duration || 60);

      case 'ramp-up':
        return this.generateRampUpProfile(targetUsers, duration);

      case 'constant':
      default:
        return this.generateConstantProfile(targetUsers, duration);
    }
  }

  /**
   * Spike test: sudden surge of traffic
   */
  private generateSpikeProfile(baseUsers: number, duration: number, multiplier: number): LoadProfile {
    const spikeUsers = baseUsers * multiplier;
    return {
      users: spikeUsers,
      rampUp: 30,
      duration: duration,
      thinkTime: 1000,
      stages: [
        { duration: 30, target: baseUsers, description: 'Ramp up to base load' },
        { duration: 60, target: baseUsers, description: 'Stay at base load' },
        { duration: 10, target: spikeUsers, description: 'Spike!' },
        { duration: 120, target: spikeUsers, description: 'Hold spike' },
        { duration: 30, target: baseUsers, description: 'Return to base' },
        { duration: 60, target: baseUsers, description: 'Stay at base' },
        { duration: 30, target: 0, description: 'Ramp down' },
      ],
    };
  }

  /**
   * Stress test: gradually increase load beyond capacity
   */
  private generateStressProfile(targetUsers: number, duration: number): LoadProfile {
    const stages: any[] = [];
    const stageCount = 10;
    const stageDuration = duration / (stageCount + 2);

    // Gradual ramp up
    for (let i = 1; i <= stageCount; i++) {
      stages.push({
        duration: stageDuration,
        target: Math.floor((targetUsers * i) / stageCount),
        description: `Ramp up to ${Math.floor((i / stageCount) * 100)}%`,
      });
    }

    // Hold at peak
    stages.push({
      duration: stageDuration,
      target: targetUsers,
      description: 'Hold at peak load',
    });

    // Ramp down
    stages.push({
      duration: stageDuration,
      target: 0,
      description: 'Ramp down',
    });

    return {
      users: targetUsers,
      rampUp: stageDuration,
      duration: duration,
      thinkTime: 1000,
      stages,
    };
  }

  /**
   * Soak test: sustained load over extended period
   */
  private generateSoakProfile(users: number, durationMinutes: number): LoadProfile {
    const duration = durationMinutes * 60;
    return {
      users,
      rampUp: 300, // 5 minutes ramp up
      duration: duration,
      thinkTime: 1000,
      stages: [
        { duration: 300, target: users, description: 'Ramp up' },
        { duration: duration - 600, target: users, description: 'Sustained load' },
        { duration: 300, target: 0, description: 'Ramp down' },
      ],
    };
  }

  /**
   * Ramp-up test: gradual increase
   */
  private generateRampUpProfile(targetUsers: number, duration: number): LoadProfile {
    return {
      users: targetUsers,
      rampUp: duration * 0.3, // 30% of duration for ramp up
      duration: duration,
      thinkTime: 1000,
      stages: [
        { duration: duration * 0.3, target: targetUsers, description: 'Ramp up' },
        { duration: duration * 0.5, target: targetUsers, description: 'Steady state' },
        { duration: duration * 0.2, target: 0, description: 'Ramp down' },
      ],
    };
  }

  /**
   * Constant load test
   */
  private generateConstantProfile(users: number, duration: number): LoadProfile {
    return {
      users,
      rampUp: 60,
      duration,
      thinkTime: 1000,
      stages: [
        { duration: 60, target: users, description: 'Ramp up' },
        { duration: duration - 120, target: users, description: 'Constant load' },
        { duration: 60, target: 0, description: 'Ramp down' },
      ],
    };
  }

  /**
   * Run load test
   */
  async run(testId: string): Promise<K6Results> {
    const testData = this.tests.get(testId);
    if (!testData) {
      throw new Error(`Test ${testId} not found`);
    }

    logger.debug(`[LoadTestRunner] Running ${testData.config.type} test: ${testData.config.name}`);

    const results = await this.k6.execute(testData.test.id);
    testData.results = results;

    logger.debug(`[LoadTestRunner] Test completed`);
    this.analyzeResults(testData.config, results);

    return results;
  }

  /**
   * Analyze load test results
   */
  private analyzeResults(config: LoadTestConfig, results: K6Results): void {
    logger.debug(`[LoadTestRunner] Analysis for ${config.type} test:`);

    // Check if all thresholds passed
    const passedThresholds = results.thresholds.filter(t => t.passed).length;
    const totalThresholds = results.thresholds.length;

    logger.debug(`  - Thresholds: ${passedThresholds}/${totalThresholds} passed`);

    // Analyze based on test type
    switch (config.type) {
      case 'spike':
        this.analyzeSpikeTest(results);
        break;
      case 'stress':
        this.analyzeStressTest(results);
        break;
      case 'soak':
        this.analyzeSoakTest(results);
        break;
      default:
        this.analyzeStandardTest(results);
    }
  }

  /**
   * Analyze spike test results
   */
  private analyzeSpikeTest(results: K6Results): void {
    logger.debug(`  - Spike test analysis:`);
    logger.debug(`    • System recovered from spike: ${results.metrics.http_req_failed.rate! < 0.1 ? 'YES' : 'NO'}`);
    logger.debug(`    • Response time during spike: ${results.metrics.http_req_duration.max}ms`);
  }

  /**
   * Analyze stress test results
   */
  private analyzeStressTest(results: K6Results): void {
    logger.debug(`  - Stress test analysis:`);
    logger.debug(`    • Breaking point: ~${Math.floor(results.metrics.vus_max?.value || 0)} users`);
    logger.debug(`    • Max response time: ${results.metrics.http_req_duration.max}ms`);
    logger.debug(`    • System degradation: ${results.metrics.http_req_failed.rate! > 0.1 ? 'OBSERVED' : 'MINIMAL'}`);
  }

  /**
   * Analyze soak test results
   */
  private analyzeSoakTest(results: K6Results): void {
    logger.debug(`  - Soak test analysis:`);
    logger.debug(`    • Memory leaks detected: ${results.metrics.http_req_duration.p99! > results.metrics.http_req_duration.p95! * 2 ? 'POSSIBLE' : 'NO'}`);
    logger.debug(`    • Performance degradation over time: ${results.metrics.http_req_duration.p99! > results.metrics.http_req_duration.avg! * 3 ? 'YES' : 'NO'}`);
    logger.debug(`    • Average response time stability: ${results.metrics.http_req_duration.avg}ms`);
  }

  /**
   * Analyze standard test results
   */
  private analyzeStandardTest(results: K6Results): void {
    logger.debug(`  - Standard analysis:`);
    logger.debug(`    • Average response time: ${results.metrics.http_req_duration.avg}ms`);
    logger.debug(`    • P95 response time: ${results.metrics.http_req_duration.p95}ms`);
    logger.debug(`    • Error rate: ${(results.metrics.http_req_failed.rate! * 100).toFixed(2)}%`);
    logger.debug(`    • Throughput: ${results.metrics.http_reqs.rate} req/s`);
  }

  /**
   * Get test configuration
   */
  getTest(testId: string): { config: LoadTestConfig; test: K6Test; results?: K6Results } | undefined {
    return this.tests.get(testId);
  }

  /**
   * Get all tests
   */
  getAllTests(): Map<string, { config: LoadTestConfig; test: K6Test; results?: K6Results }> {
    return this.tests;
  }

  /**
   * Delete test
   */
  deleteTest(testId: string): boolean {
    const testData = this.tests.get(testId);
    if (testData) {
      this.k6.deleteTest(testData.test.id);
    }
    return this.tests.delete(testId);
  }

  /**
   * Generate ID
   */
  private generateId(): string {
    return `load_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default LoadTestRunner;
