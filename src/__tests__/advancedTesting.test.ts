/**
 * Advanced Testing Framework Test Suite
 * Comprehensive tests for all testing components
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VisualTestRecorder } from '../testing/VisualTestRecorder';
import { TestPlayback } from '../testing/TestPlayback';
import { AITestGenerator } from '../testing/AITestGenerator';
import { TestScenarioAnalyzer } from '../testing/TestScenarioAnalyzer';
import { TestCoverageAnalyzer } from '../testing/TestCoverageAnalyzer';
import { MutationTester } from '../testing/MutationTester';
import { MutationOperators } from '../testing/MutationOperators';
import { PerformanceRegressionTester } from '../testing/PerformanceRegressionTester';
import { VisualRegressionTester } from '../testing/VisualRegressionTester';
import { ContractTester } from '../testing/ContractTester';

describe('Visual Test Recorder', () => {
  let recorder: VisualTestRecorder;

  beforeEach(() => {
    recorder = new VisualTestRecorder();
  });

  it('should start recording', () => {
    recorder.startRecording('Test 1', 'Description');
    expect(recorder.isCurrentlyRecording()).toBe(true);
  });

  it('should stop recording and return test', () => {
    recorder.startRecording('Test 1');
    const test = recorder.stopRecording();
    expect(test).toBeDefined();
    expect(test?.name).toBe('Test 1');
    expect(recorder.isCurrentlyRecording()).toBe(false);
  });

  it('should throw error if starting while already recording', () => {
    recorder.startRecording('Test 1');
    expect(() => recorder.startRecording('Test 2')).toThrow();
  });

  it('should add custom actions', () => {
    recorder.startRecording('Test 1');
    recorder.addCustomAction({
      type: 'assert',
      selector: '.button',
      description: 'Button should be visible',
    });
    const test = recorder.stopRecording();
    expect(test?.actions).toHaveLength(1);
    expect(test?.actions[0].type).toBe('assert');
  });

  it('should generate smart selectors for elements with data-testid', () => {
    const div = document.createElement('div');
    div.setAttribute('data-testid', 'my-component');
    document.body.appendChild(div);

    recorder.startRecording('Test 1');
    const selector = (recorder as any).generateSelector(div);
    expect(selector).toBe('[data-testid="my-component"]');

    document.body.removeChild(div);
  });

  it('should pause and resume recording', () => {
    recorder.startRecording('Test 1');
    recorder.pauseRecording();
    recorder.resumeRecording();
    expect(recorder.isCurrentlyRecording()).toBe(true);
  });

  it('should track action count', () => {
    recorder.startRecording('Test 1');
    recorder.addCustomAction({ type: 'click', selector: '.btn', description: 'Click' });
    expect(recorder.getActionCount()).toBe(1);
  });
});

describe('Test Playback', () => {
  let playback: TestPlayback;

  beforeEach(() => {
    playback = new TestPlayback();
  });

  it('should generate Playwright code from recorded test', () => {
    const test = {
      id: 'test1',
      name: 'Test Name',
      description: 'Test Description',
      actions: [
        {
          id: 'action1',
          type: 'click' as const,
          timestamp: Date.now(),
          selector: '.button',
        },
        {
          id: 'action2',
          type: 'input' as const,
          timestamp: Date.now(),
          selector: '#input',
          value: 'test value',
        },
      ],
      startTime: Date.now(),
      metadata: {
        url: 'http://localhost:3000',
        userAgent: 'test',
        viewport: { width: 1920, height: 1080 },
      },
    };

    const code = playback.generatePlaywrightCode(test);
    expect(code).toContain("import { test, expect } from '@playwright/test'");
    expect(code).toContain("test.describe('Test Name'");
    expect(code).toContain("await page.locator('.button').click()");
    expect(code).toContain("await page.locator('#input').fill('test value')");
  });

  it('should convert actions to Playwright syntax', () => {
    const action = {
      id: 'action1',
      type: 'click' as const,
      timestamp: Date.now(),
      selector: '.button',
    };

    const code = (playback as any).convertActionToPlaywright(action);
    expect(code).toBe("await page.locator('.button').click();");
  });
});

describe('AI Test Generator', () => {
  let generator: AITestGenerator;

  beforeEach(() => {
    generator = new AITestGenerator();
  });

  it('should generate test scenarios from description', async () => {
    const description = 'Create a workflow that sends an email when a form is submitted';
    const scenarios = await generator.generateFromDescription(description, {
      includeEdgeCases: true,
      includeErrorHandling: true,
    });

    expect(scenarios.length).toBeGreaterThan(0);
    expect(scenarios.some(s => s.category === 'happy-path')).toBe(true);
  });

  it('should generate test data for scenarios', () => {
    const scenario = {
      id: 'test1',
      name: 'Test',
      description: 'Test',
      priority: 'high' as const,
      category: 'happy-path' as const,
      steps: [
        { action: 'input', description: 'Enter {{email}}', value: '{{email}}' },
      ],
      expectedOutcome: 'Success',
    };

    const testData = generator.generateTestData(scenario);
    expect(testData.email).toBe('test@example.com');
  });

  it('should generate Playwright code from scenario', () => {
    const scenario = {
      id: 'test1',
      name: 'Login Test',
      description: 'User login flow',
      priority: 'critical' as const,
      category: 'happy-path' as const,
      steps: [
        { action: 'navigate', description: 'Go to login', value: '/login' },
        { action: 'input', description: 'Enter email', selector: '#email', value: 'test@example.com' },
        { action: 'click', description: 'Click submit', selector: '.submit-btn' },
      ],
      expectedOutcome: 'User is logged in',
    };

    const code = generator.generatePlaywrightCode(scenario);
    expect(code).toContain('Login Test');
    expect(code).toContain('/login');
    expect(code).toContain('#email');
  });

  it('should generate Vitest code from scenario', () => {
    const scenario = {
      id: 'test1',
      name: 'Unit Test',
      description: 'Test function',
      priority: 'high' as const,
      category: 'happy-path' as const,
      steps: [],
      expectedOutcome: 'Success',
    };

    const code = generator.generateVitestCode(scenario);
    expect(code).toContain("import { describe, it, expect");
    expect(code).toContain("describe('Unit Test'");
  });
});

describe('Test Scenario Analyzer', () => {
  let analyzer: TestScenarioAnalyzer;

  beforeEach(() => {
    analyzer = new TestScenarioAnalyzer();
  });

  it('should analyze workflow and identify scenarios', () => {
    const nodes = [
      { id: '1', type: 'trigger', data: { label: 'Start' }, position: { x: 0, y: 0 } },
      { id: '2', type: 'http', data: { label: 'API Call' }, position: { x: 0, y: 0 } },
      { id: '3', type: 'conditional', data: { label: 'Check' }, position: { x: 0, y: 0 } },
    ];

    const edges = [
      { id: 'e1', source: '1', target: '2', type: 'default' },
      { id: 'e2', source: '2', target: '3', type: 'default' },
    ];

    const tests = [
      {
        id: 'test1',
        name: 'Happy path',
        description: 'Test',
        priority: 'high' as const,
        category: 'happy-path' as const,
        steps: [],
        expectedOutcome: 'Success',
      },
    ];

    const analysis = analyzer.analyzeWorkflow(nodes, edges, tests);
    expect(analysis.totalScenarios).toBe(1);
    expect(analysis.coverage).toBeDefined();
    expect(analysis.complexity).toBeDefined();
  });

  it('should identify critical paths', () => {
    const nodes = [
      { id: '1', type: 'trigger', data: { label: 'Start' }, position: { x: 0, y: 0 } },
      { id: '2', type: 'http', data: { label: 'API' }, position: { x: 0, y: 0 } },
    ];

    const edges = [
      { id: 'e1', source: '1', target: '2', type: 'default' },
    ];

    const criticalPaths = analyzer.identifyCriticalPaths(nodes, edges);
    expect(Array.isArray(criticalPaths)).toBe(true);
  });

  it('should suggest test scenarios for gaps', () => {
    const nodes = [
      { id: '1', type: 'trigger', data: { label: 'Start' }, position: { x: 0, y: 0 } },
    ];

    const edges: any[] = [];
    const tests: any[] = [];

    const suggestions = analyzer.suggestTestScenarios(nodes, edges, tests);
    expect(Array.isArray(suggestions)).toBe(true);
  });
});

describe('Test Coverage Analyzer', () => {
  let analyzer: TestCoverageAnalyzer;

  beforeEach(() => {
    analyzer = new TestCoverageAnalyzer();
  });

  it('should analyze test coverage', () => {
    const tests = [
      {
        id: 'test1',
        name: 'Test 1',
        description: 'Test',
        priority: 'high' as const,
        category: 'happy-path' as const,
        steps: [],
        expectedOutcome: 'Success',
      },
      {
        id: 'test2',
        name: 'Test 2',
        description: 'Test',
        priority: 'medium' as const,
        category: 'edge-case' as const,
        steps: [],
        expectedOutcome: 'Success',
      },
    ];

    const report = analyzer.analyzeCoverage(tests);
    expect(report.overall).toBeGreaterThan(0);
    expect(report.byCategory).toBeDefined();
    expect(report.byPriority).toBeDefined();
  });

  it('should suggest tests to improve coverage', () => {
    const report = {
      overall: 50,
      byCategory: { 'happy-path': 30 },
      byPriority: { high: 20 },
      gaps: [
        {
          area: 'error-handling',
          currentCoverage: 0,
          targetCoverage: 80,
          missingTests: ['Test error cases'],
          priority: 'critical' as const,
        },
      ],
      recommendations: [],
      metrics: {
        totalTests: 5,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        codeCoverage: { lines: 0, functions: 0, branches: 0, statements: 0 },
        testDuration: 0,
        averageTestDuration: 0,
      },
    };

    const suggestions = analyzer.suggestTestsForCoverage(report, 80);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].priority).toBe('critical');
  });

  it('should calculate mutation score', () => {
    const score = analyzer.calculateMutationScore(100, 85);
    expect(score.score).toBe(85);
    expect(score.quality).toBe('excellent');
    expect(score.totalMutations).toBe(100);
    expect(score.killedMutations).toBe(85);
  });
});

describe('Mutation Operators', () => {
  it('should generate arithmetic mutations', () => {
    const code = 'const result = a + b;';
    const operators = MutationOperators.getArithmeticOperators();
    const mutations = operators[0].apply(code);

    expect(mutations.length).toBeGreaterThan(0);
    expect(mutations.some(m => m.type === 'arithmetic')).toBe(true);
  });

  it('should generate logical mutations', () => {
    const code = 'if (a && b) { }';
    const operators = MutationOperators.getLogicalOperators();
    const mutations = operators[0].apply(code);

    expect(mutations.length).toBeGreaterThan(0);
    expect(mutations.some(m => m.mutated === '||')).toBe(true);
  });

  it('should generate relational mutations', () => {
    const code = 'if (a < b) { }';
    const operators = MutationOperators.getRelationalOperators();
    const mutations = operators[0].apply(code);

    expect(mutations.length).toBeGreaterThan(0);
  });

  it('should generate conditional mutations', () => {
    const code = 'return true;';
    const operators = MutationOperators.getConditionalOperators();
    const mutations = operators[0].apply(code);

    expect(mutations.length).toBeGreaterThan(0);
    expect(mutations[0].mutated).toBe('false');
  });

  it('should get all operators', () => {
    const allOperators = MutationOperators.getAllOperators();
    expect(allOperators.length).toBeGreaterThan(5);
  });
});

describe('Mutation Tester', () => {
  let tester: MutationTester;

  beforeEach(() => {
    tester = new MutationTester({ maxMutations: 10 });
  });

  it('should generate mutations from code', () => {
    const code = `
      function add(a, b) {
        return a + b;
      }
    `;

    const mutations = tester.generateMutations(code);
    expect(mutations.length).toBeGreaterThan(0);
  });

  it('should get mutation score quality', () => {
    const excellent = MutationTester.getMutationScoreQuality(85);
    expect(excellent.rating).toBe('excellent');

    const good = MutationTester.getMutationScoreQuality(65);
    expect(good.rating).toBe('good');

    const poor = MutationTester.getMutationScoreQuality(30);
    expect(poor.rating).toBe('poor');
  });
});

describe('Performance Regression Tester', () => {
  let tester: PerformanceRegressionTester;

  beforeEach(() => {
    tester = new PerformanceRegressionTester({ iterations: 3 });
  });

  it('should set and get baseline', () => {
    const metrics = {
      executionTime: 100,
      memoryUsage: 1000000,
      timestamp: Date.now(),
    };

    tester.setBaseline('test1', metrics);
    const baseline = tester.getBaseline('test1');

    expect(baseline).toBeDefined();
    expect(baseline?.metrics.executionTime).toBe(100);
  });

  it('should export and load baselines', () => {
    const metrics = {
      executionTime: 100,
      memoryUsage: 1000000,
      timestamp: Date.now(),
    };

    tester.setBaseline('test1', metrics);
    const exported = tester.exportBaselines();

    const newTester = new PerformanceRegressionTester();
    newTester.loadBaselines(exported);

    expect(newTester.getBaseline('test1')).toBeDefined();
  });

  it('should run performance test', async () => {
    const testFn = async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    };

    const report = await tester.runPerformanceTest('test1', testFn);
    expect(report.passed).toBeDefined();
    expect(report.comparisons).toBeDefined();
  });
});

describe('Visual Regression Tester', () => {
  let tester: VisualRegressionTester;

  beforeEach(() => {
    tester = new VisualRegressionTester({ threshold: 95 });
  });

  it('should capture snapshot', async () => {
    const snapshot = await tester.captureSnapshot('test1');
    expect(snapshot.name).toBe('test1');
    expect(snapshot.screenshot).toBeDefined();
    expect(snapshot.dimensions).toBeDefined();
  });

  it('should set and get baseline', async () => {
    const snapshot = await tester.captureSnapshot('test1');
    tester.setBaseline('test1', snapshot);

    const baseline = tester.getBaseline('test1');
    expect(baseline).toBeDefined();
    expect(baseline?.name).toBe('test1');
  });

  it('should compare with baseline', async () => {
    const snapshot = await tester.captureSnapshot('test1');
    tester.setBaseline('test1', snapshot);

    const result = await tester.compareWithBaseline('test1');
    expect(result.passed).toBe(true);
    expect(result.similarity).toBe(100);
  });

  it('should export and load baselines', async () => {
    const snapshot = await tester.captureSnapshot('test1');
    tester.setBaseline('test1', snapshot);

    const exported = tester.exportBaselines();
    const newTester = new VisualRegressionTester();
    newTester.loadBaselines(exported);

    expect(newTester.getBaseline('test1')).toBeDefined();
  });

  it('should delete baseline', async () => {
    const snapshot = await tester.captureSnapshot('test1');
    tester.setBaseline('test1', snapshot);

    const deleted = tester.deleteBaseline('test1');
    expect(deleted).toBe(true);
    expect(tester.getBaseline('test1')).toBeUndefined();
  });
});

describe('Contract Tester', () => {
  let tester: ContractTester;

  beforeEach(() => {
    tester = new ContractTester();
  });

  it('should register contract', () => {
    const contract = {
      name: 'getUser',
      endpoint: '/api/users/:id',
      method: 'GET' as const,
      responseSchema: {
        type: 'object' as const,
        properties: {
          id: { type: 'number' as const },
          name: { type: 'string' as const },
        },
        required: ['id', 'name'],
      },
    };

    tester.registerContract(contract);
    expect(tester.getContract('getUser')).toBeDefined();
  });

  it('should validate response against contract', () => {
    const contract = {
      name: 'getUser',
      endpoint: '/api/users/:id',
      method: 'GET' as const,
      responseSchema: {
        type: 'object' as const,
        properties: {
          id: { type: 'number' as const },
          name: { type: 'string' as const },
        },
        required: ['id', 'name'],
      },
      statusCode: 200,
    };

    tester.registerContract(contract);

    const validResponse = { id: 1, name: 'John' };
    const result = tester.validateResponse('getUser', validResponse, 200);

    expect(result.passed).toBe(true);
    expect(result.errors.filter(e => e.severity === 'error')).toHaveLength(0);
  });

  it('should detect missing required properties', () => {
    const contract = {
      name: 'getUser',
      endpoint: '/api/users/:id',
      method: 'GET' as const,
      responseSchema: {
        type: 'object' as const,
        properties: {
          id: { type: 'number' as const },
          name: { type: 'string' as const },
        },
        required: ['id', 'name'],
      },
    };

    tester.registerContract(contract);

    const invalidResponse = { id: 1 }; // missing 'name'
    const result = tester.validateResponse('getUser', invalidResponse);

    expect(result.passed).toBe(false);
    expect(result.errors.some(e => e.message.includes('Required property missing'))).toBe(true);
  });

  it('should generate contract from example', () => {
    const example = {
      id: 1,
      name: 'John',
      email: 'john@example.com',
    };

    const contract = tester.generateContractFromExample(
      'getUser',
      '/api/users/:id',
      'GET',
      example
    );

    expect(contract.name).toBe('getUser');
    expect(contract.responseSchema.type).toBe('object');
    expect(contract.responseSchema.properties).toBeDefined();
  });

  it('should export and load contracts', () => {
    const contract = {
      name: 'getUser',
      endpoint: '/api/users/:id',
      method: 'GET' as const,
      responseSchema: {
        type: 'object' as const,
        properties: {
          id: { type: 'number' as const },
        },
      },
    };

    tester.registerContract(contract);
    const exported = tester.exportContracts();

    const newTester = new ContractTester();
    newTester.loadContracts(exported);

    expect(newTester.getContract('getUser')).toBeDefined();
  });
});
