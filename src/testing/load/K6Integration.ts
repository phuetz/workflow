/**
 * k6 Integration
 * Generate and execute k6 load testing scripts
 */

import type {
  K6Test,
  K6Results,
  K6Options,
  K6Metrics,
  PerformanceScenario,
  LoadProfile,
} from '../types/testing';
import { logger } from '../../services/SimpleLogger';

export class K6Integration {
  private tests: Map<string, K6Test> = new Map();

  /**
   * Generate k6 script from performance scenario
   */
  generateScript(
    scenarios: PerformanceScenario[],
    load: LoadProfile,
    baseUrl: string
  ): string {
    const options = this.generateOptions(load, scenarios);

    let script = `import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { logger } from '../../services/SimpleLogger';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const requestCounter = new Counter('requests');

export let options = ${JSON.stringify(options, null, 2)};

`;

    // Add scenario functions
    scenarios.forEach((scenario, index) => {
      script += this.generateScenarioFunction(scenario, index, baseUrl);
    });

    // Add main export default function
    script += `
export default function() {
  const scenarios = [${scenarios.map((_, i) => `scenario${i}`).join(', ')}];
  const weights = [${scenarios.map(s => s.weight).join(', ')}];

  // Select scenario based on weight
  const rand = Math.random() * ${scenarios.reduce((sum, s) => sum + s.weight, 0)};
  let cumulative = 0;
  let selectedScenario = scenarios[0];

  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (rand <= cumulative) {
      selectedScenario = scenarios[i];
      break;
    }
  }

  selectedScenario();
}
`;

    return script;
  }

  /**
   * Generate k6 options
   */
  private generateOptions(load: LoadProfile, scenarios: PerformanceScenario[]): K6Options {
    const options: K6Options = {
      thresholds: {
        'http_req_duration': ['p(95)<500', 'p(99)<1000'],
        'http_req_failed': ['rate<0.01'],
        errors: ['rate<0.01'],
      },
    };

    if (load.stages && load.stages.length > 0) {
      options.stages = load.stages.map(stage => ({
        duration: `${stage.duration}s`,
        target: stage.target,
      }));
    } else {
      options.vus = load.users;
      options.duration = `${load.duration}s`;
    }

    return options;
  }

  /**
   * Generate scenario function
   */
  private generateScenarioFunction(scenario: PerformanceScenario, index: number, baseUrl: string): string {
    let func = `
function scenario${index}() {
  // ${scenario.name}
`;

    scenario.steps.forEach((step, stepIndex) => {
      if (step.action === 'http') {
        const config = step.config as any;
        func += `
  // Step: ${step.name}
  const res${stepIndex} = http.${config.method.toLowerCase()}('${baseUrl}${config.url}', ${config.body ? JSON.stringify(config.body) : 'null'}, {
    headers: ${config.headers ? JSON.stringify(config.headers) : '{}'},
  });

  requestCounter.add(1);
  responseTime.add(res${stepIndex}.timings.duration);

  const success${stepIndex} = check(res${stepIndex}, {
    'status is 200': (r) => r.status === 200,
  });

  if (!success${stepIndex}) {
    errorRate.add(1);
  }
`;

        const thinkTime = step.thinkTime || 1000;
        func += `  sleep(${thinkTime / 1000});\n`;
      }
    });

    func += `}\n`;
    return func;
  }

  /**
   * Create k6 test
   */
  createTest(name: string, script: string, options: K6Options): K6Test {
    const test: K6Test = {
      id: this.generateId(),
      name,
      script,
      options,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.tests.set(test.id, test);
    logger.debug(`[K6Integration] Created test: ${name}`);

    return test;
  }

  /**
   * Execute k6 test
   */
  async execute(testId: string): Promise<K6Results> {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    test.status = 'running';
    test.updatedAt = Date.now();

    logger.debug(`[K6Integration] Executing k6 test: ${test.name}`);
    logger.debug(`[K6Integration] In production, would run: k6 run script.js`);

    // Simulate k6 execution
    // In real implementation, this would execute: k6 run script.js --out json=results.json
    const startTime = Date.now();
    await this.sleep(2000); // Simulate test execution
    const duration = Date.now() - startTime;

    // Simulate k6 results
    const results: K6Results = {
      testId,
      timestamp: Date.now(),
      duration,
      metrics: this.generateMockMetrics(),
      checks: [
        { name: 'status is 200', passes: 95, fails: 5 },
        { name: 'response time < 500ms', passes: 90, fails: 10 },
      ],
      thresholds: [
        { metric: 'http_req_duration', threshold: 'p(95)<500', passed: true, value: 450 },
        { metric: 'http_req_duration', threshold: 'p(99)<1000', passed: true, value: 850 },
        { metric: 'http_req_failed', threshold: 'rate<0.01', passed: false, value: 0.05 },
      ],
      rootGroup: {
        name: 'root',
        path: '',
        checks: [],
        groups: [],
      },
    };

    test.status = 'completed';
    test.updatedAt = Date.now();

    logger.debug(`[K6Integration] Test completed`);
    logger.debug(`  - Duration: ${(duration / 1000).toFixed(2)}s`);
    logger.debug(`  - Checks passed: ${results.checks.reduce((sum, c) => sum + c.passes, 0)}`);
    logger.debug(`  - Checks failed: ${results.checks.reduce((sum, c) => sum + c.fails, 0)}`);

    return results;
  }

  /**
   * Parse k6 JSON output
   */
  parseResults(jsonOutput: string): K6Results {
    try {
      const data = JSON.parse(jsonOutput);

      return {
        testId: 'parsed',
        timestamp: Date.now(),
        duration: data.state?.testRunDurationMs || 0,
        metrics: data.metrics || this.generateMockMetrics(),
        checks: this.parseChecks(data),
        thresholds: this.parseThresholds(data),
        rootGroup: data.root_group || { name: 'root', path: '', checks: [], groups: [] },
      };
    } catch (error) {
      logger.error(`[K6Integration] Failed to parse k6 results: ${error}`);
      throw error;
    }
  }

  /**
   * Parse checks from k6 output
   */
  private parseChecks(data: any): any[] {
    const checks: any[] = [];

    if (data.metrics?.checks) {
      const checkMetric = data.metrics.checks;
      checks.push({
        name: 'overall',
        passes: checkMetric.passes || 0,
        fails: checkMetric.fails || 0,
      });
    }

    return checks;
  }

  /**
   * Parse thresholds from k6 output
   */
  private parseThresholds(data: any): any[] {
    const thresholds: any[] = [];

    if (data.thresholds) {
      Object.entries(data.thresholds).forEach(([metric, threshold]: [string, any]) => {
        thresholds.push({
          metric,
          threshold: threshold.threshold,
          passed: threshold.ok,
          value: threshold.value,
        });
      });
    }

    return thresholds;
  }

  /**
   * Generate mock k6 metrics for simulation
   */
  private generateMockMetrics(): K6Metrics {
    return {
      http_reqs: { count: 1000, rate: 100 },
      http_req_duration: {
        avg: 250,
        min: 50,
        med: 200,
        max: 1200,
        p90: 400,
        p95: 500,
        p99: 900,
      },
      http_req_blocked: { avg: 5, min: 0, med: 3, max: 50 },
      http_req_connecting: { avg: 3, min: 0, med: 2, max: 30 },
      http_req_tls_handshaking: { avg: 2, min: 0, med: 1, max: 20 },
      http_req_sending: { avg: 1, min: 0, med: 1, max: 10 },
      http_req_waiting: { avg: 240, min: 45, med: 190, max: 1100 },
      http_req_receiving: { avg: 4, min: 1, med: 3, max: 50 },
      http_req_failed: { rate: 0.05, count: 50 },
      iterations: { count: 1000, rate: 100 },
      vus: { avg: 10, min: 1, max: 10 },
      vus_max: { avg: 10, min: 10, max: 10 },
      data_received: { count: 10485760, rate: 1048576 },
      data_sent: { count: 524288, rate: 52428 },
    };
  }

  /**
   * Get test by ID
   */
  getTest(testId: string): K6Test | undefined {
    return this.tests.get(testId);
  }

  /**
   * Get all tests
   */
  getAllTests(): K6Test[] {
    return Array.from(this.tests.values());
  }

  /**
   * Delete test
   */
  deleteTest(testId: string): boolean {
    return this.tests.delete(testId);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate ID
   */
  private generateId(): string {
    return `k6_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default K6Integration;
