# Advanced Testing Framework Guide

This guide covers the advanced testing capabilities implemented in the workflow automation platform.

## Table of Contents

1. [Visual Test Recorder](#visual-test-recorder)
2. [AI-Powered Test Generation](#ai-powered-test-generation)
3. [Mutation Testing](#mutation-testing)
4. [Performance Regression Testing](#performance-regression-testing)
5. [Visual Regression Testing](#visual-regression-testing)
6. [API Contract Testing](#api-contract-testing)
7. [Best Practices](#best-practices)

---

## Visual Test Recorder

The Visual Test Recorder captures user interactions and generates automated test code.

### Features

- **Record user interactions** (clicks, inputs, selects, navigation)
- **Smart selector generation** (data-testid, id, aria-label, text content)
- **Playback recorded tests** with visual highlighting
- **Generate Playwright test code** automatically
- **Screenshot capture** for visual documentation

### Usage

```typescript
import { VisualTestRecorder } from './testing/VisualTestRecorder';
import { TestPlayback } from './testing/TestPlayback';

// Initialize recorder
const recorder = new VisualTestRecorder({
  captureScreenshots: true,
  generateSmartSelectors: true,
  recordMouseMovements: false,
  recordScrolls: true,
});

// Start recording
recorder.startRecording('My Test', 'Test description');

// Perform user actions...
// (clicks, inputs, etc. are automatically recorded)

// Add custom assertions
recorder.addCustomAction({
  type: 'assert',
  selector: '.success-message',
  description: 'Success message should be visible',
});

// Stop recording
const recordedTest = recorder.stopRecording();

// Generate Playwright code
const playback = new TestPlayback();
const playwrightCode = playback.generatePlaywrightCode(recordedTest);
console.log(playwrightCode);

// Playback test
const result = await playback.playback(recordedTest, {
  speed: 1.0,
  highlightElements: true,
  pauseBetweenActions: 300,
});
```

### React Component

```tsx
import TestRecorder from './components/TestRecorder';

function App() {
  return (
    <TestRecorder
      onTestRecorded={(test) => {
        console.log('Test recorded:', test);
      }}
      onCodeGenerated={(code) => {
        console.log('Generated code:', code);
      }}
    />
  );
}
```

---

## AI-Powered Test Generation

Generate comprehensive test scenarios from workflow descriptions or definitions.

### Features

- **Generate from natural language** descriptions
- **Generate from workflow structure** (nodes and edges)
- **Automatic test data generation**
- **Edge case identification**
- **Error handling scenarios**
- **Performance test scenarios**
- **Security test scenarios**

### Usage

```typescript
import { AITestGenerator } from './testing/AITestGenerator';

const generator = new AITestGenerator();

// Generate from description
const description = `
  Create a workflow that:
  - Triggers when a form is submitted
  - Validates the email field
  - Sends a confirmation email
  - Updates the database
`;

const scenarios = await generator.generateFromDescription(description, {
  includeEdgeCases: true,
  includeErrorHandling: true,
  includePerformanceTests: true,
  includeSecurityTests: true,
});

// Generate from workflow
const nodes = [
  { id: '1', type: 'trigger', data: { label: 'Form Submit' } },
  { id: '2', type: 'validation', data: { label: 'Validate Email' } },
  { id: '3', type: 'email', data: { label: 'Send Email' } },
];

const edges = [
  { id: 'e1', source: '1', target: '2' },
  { id: 'e2', source: '2', target: '3' },
];

const workflowScenarios = await generator.generateFromWorkflow(nodes, edges, {
  includeEdgeCases: true,
});

// Generate test data
const testData = generator.generateTestData(scenarios[0]);

// Generate Playwright code
const playwrightCode = generator.generatePlaywrightCode(scenarios[0]);

// Generate Vitest code
const vitestCode = generator.generateVitestCode(scenarios[0]);
```

### Test Scenario Analysis

```typescript
import { TestScenarioAnalyzer } from './testing/TestScenarioAnalyzer';

const analyzer = new TestScenarioAnalyzer();

// Analyze workflow
const analysis = analyzer.analyzeWorkflow(nodes, edges, existingTests);

console.log('Total scenarios:', analysis.totalScenarios);
console.log('Coverage:', analysis.coverage);
console.log('Complexity:', analysis.complexity);
console.log('Gaps:', analysis.gaps);
console.log('Recommendations:', analysis.recommendations);

// Identify critical paths
const criticalPaths = analyzer.identifyCriticalPaths(nodes, edges);

// Suggest test scenarios
const suggestions = analyzer.suggestTestScenarios(nodes, edges, existingTests);
```

### Coverage Analysis

```typescript
import { TestCoverageAnalyzer } from './testing/TestCoverageAnalyzer';

const analyzer = new TestCoverageAnalyzer({
  targetCoverage: 80,
  criticalAreasRequired: ['authentication', 'authorization'],
  minTestsPerCategory: 3,
});

// Analyze coverage
const report = analyzer.analyzeCoverage(tests);

console.log('Overall coverage:', report.overall);
console.log('By category:', report.byCategory);
console.log('By priority:', report.byPriority);
console.log('Gaps:', report.gaps);
console.log('Recommendations:', report.recommendations);

// Suggest tests to improve coverage
const suggestions = analyzer.suggestTestsForCoverage(report, 85);
```

---

## Mutation Testing

Evaluate test suite quality by introducing code mutations and checking if tests catch them.

### Features

- **10+ mutation operators** (arithmetic, logical, relational, etc.)
- **Parallel mutation testing** for performance
- **Mutation score calculation**
- **Detailed mutation reports**
- **Recommendations for improvement**

### Mutation Operators

- **Arithmetic**: `+` ↔ `-`, `*` ↔ `/`, etc.
- **Logical**: `&&` ↔ `||`, add/remove `!`
- **Relational**: `<` ↔ `>`, `<=` ↔ `>=`, `==` ↔ `!=`
- **Conditional**: `true` ↔ `false`
- **Return values**: mutate return statements
- **Literals**: mutate numbers and strings
- **Array methods**: `push` ↔ `pop`, `filter` ↔ `map`
- **Assignment**: `+=` ↔ `-=`, `*=` ↔ `/=`
- **Unary**: `++` ↔ `--`

### Usage

```typescript
import { MutationTester } from './testing/MutationTester';

const tester = new MutationTester({
  timeout: 5000,
  parallel: true,
  maxMutations: 100,
  includeTypes: ['arithmetic', 'logical', 'relational'],
});

// Define test runner
const testRunner = async (mutatedCode: string) => {
  // Run your tests against the mutated code
  // Return { passed: boolean, failedTests?: string[] }
  return { passed: false, failedTests: ['test1'] };
};

// Run mutation tests
const report = await tester.runMutationTests(sourceCode, testRunner);

console.log('Mutation score:', report.mutationScore);
console.log('Killed:', report.killedMutations);
console.log('Survived:', report.survivedMutations);
console.log('Recommendations:', report.recommendations);
```

### React Component

```tsx
import MutationTestingReport from './components/MutationTestingReport';

function App() {
  return (
    <MutationTestingReport
      report={mutationReport}
      onRetestMutation={(mutationId) => {
        console.log('Retesting mutation:', mutationId);
      }}
    />
  );
}
```

### Interpreting Mutation Score

- **80-100%**: Excellent - comprehensive test suite
- **60-79%**: Good - solid testing with room for improvement
- **40-59%**: Fair - needs more comprehensive tests
- **0-39%**: Poor - critical gaps in test coverage

---

## Performance Regression Testing

Detect performance degradation by comparing metrics against baselines.

### Features

- **Execution time tracking**
- **Memory usage monitoring**
- **CPU usage tracking** (when available)
- **Network request counting**
- **Render time measurement**
- **Baseline management**
- **Threshold-based alerts**

### Usage

```typescript
import { PerformanceRegressionTester } from './testing/PerformanceRegressionTester';

const tester = new PerformanceRegressionTester({
  iterations: 10,
  warmupIterations: 3,
  collectMemory: true,
  collectNetwork: true,
  collectRender: true,
});

// Set baseline
const baselineMetrics = {
  executionTime: 100,
  memoryUsage: 5 * 1024 * 1024, // 5MB
  timestamp: Date.now(),
};

const thresholds = {
  executionTime: { warning: 10, error: 25 }, // % increase
  memoryUsage: { warning: 15, error: 30 },
};

tester.setBaseline('myTest', baselineMetrics, thresholds);

// Run performance test
const testFn = async () => {
  // Your code to test
  await performExpensiveOperation();
};

const report = await tester.runPerformanceTest('myTest', testFn);

console.log('Passed:', report.passed);
console.log('Comparisons:', report.comparisons);
console.log('Recommendations:', report.recommendations);

// Save baselines for CI/CD
const baselines = tester.exportBaselines();
localStorage.setItem('perfBaselines', JSON.stringify(baselines));
```

### Performance Comparison Status

- **Improved**: ≥5% faster than baseline
- **Stable**: Within threshold range
- **Degraded**: Exceeded warning threshold
- **Critical**: Exceeded error threshold

---

## Visual Regression Testing

Detect unintended visual changes by comparing screenshots.

### Features

- **Screenshot capture** of elements or full page
- **Pixel-by-pixel comparison**
- **Similarity scoring**
- **Difference highlighting**
- **Baseline management**
- **Ignore regions** for dynamic content

### Usage

```typescript
import { VisualRegressionTester } from './testing/VisualRegressionTester';

const tester = new VisualRegressionTester({
  threshold: 95, // 95% similarity required
  captureViewport: true,
  delay: 500, // wait before capture
  animations: true, // wait for animations
});

// Capture baseline
const snapshot = await tester.captureSnapshot('homepage');
tester.setBaseline('homepage', snapshot);

// Compare with baseline
const result = await tester.compareWithBaseline('homepage');

console.log('Passed:', result.passed);
console.log('Similarity:', result.similarity);
console.log('Pixels different:', result.pixelsDifferent);
console.log('Differences:', result.differences);

// Run multiple visual tests
const tests = [
  { name: 'header', selector: '.header' },
  { name: 'sidebar', selector: '.sidebar' },
  { name: 'content', selector: '.main-content' },
];

const report = await tester.runVisualTests(tests);
console.log('Total:', report.totalTests);
console.log('Passed:', report.passedTests);
console.log('Failed:', report.failedTests);
```

### Integration with Playwright

```typescript
import { test } from '@playwright/test';
import { VisualRegressionTester } from './testing/VisualRegressionTester';

test('visual regression test', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Custom visual regression logic
  const tester = new VisualRegressionTester();
  // ... use tester
});
```

---

## API Contract Testing

Validate API responses against schemas to ensure contract compliance.

### Features

- **JSON Schema validation**
- **Status code verification**
- **Header validation**
- **Contract registration and management**
- **Auto-generate schemas from examples**
- **Detailed error reporting**

### Usage

```typescript
import { ContractTester } from './testing/ContractTester';

const tester = new ContractTester();

// Register contract
const contract = {
  name: 'getUser',
  endpoint: '/api/users/:id',
  method: 'GET',
  responseSchema: {
    type: 'object',
    properties: {
      id: { type: 'number' },
      name: { type: 'string' },
      email: { type: 'string', pattern: '^[^@]+@[^@]+\\.[^@]+$' },
      age: { type: 'number', minimum: 0, maximum: 150 },
    },
    required: ['id', 'name', 'email'],
  },
  statusCode: 200,
};

tester.registerContract(contract);

// Validate response
const response = {
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
};

const result = tester.validateResponse('getUser', response, 200);

console.log('Passed:', result.passed);
console.log('Errors:', result.errors);

// Generate contract from example
const exampleResponse = {
  id: 1,
  name: 'John',
  posts: [
    { id: 1, title: 'Post 1' },
    { id: 2, title: 'Post 2' },
  ],
};

const generatedContract = tester.generateContractFromExample(
  'getUserWithPosts',
  '/api/users/:id/posts',
  'GET',
  exampleResponse
);

// Test all contracts
const testRunner = async (contract) => {
  const response = await fetch(contract.endpoint);
  const data = await response.json();
  return { response: data, statusCode: response.status };
};

const report = await tester.testAllContracts(testRunner);
console.log('Total contracts:', report.totalContracts);
console.log('Passed:', report.passedContracts);
console.log('Failed:', report.failedContracts);
```

### JSON Schema Types

Supported schema validations:
- **Type validation**: object, array, string, number, boolean, null
- **Required properties**
- **String patterns** (regex)
- **Number ranges** (minimum, maximum)
- **String length** (minLength, maxLength)
- **Enum values**
- **Additional properties** control

---

## Best Practices

### 1. Test Pyramid

Follow the test pyramid approach:
- **Unit tests** (70%): Fast, isolated tests
- **Integration tests** (20%): Component interaction tests
- **E2E tests** (10%): Full workflow tests

### 2. Visual Test Recording

**Do:**
- Use meaningful test names
- Add assertions for important states
- Test one user flow per recording
- Use data-testid attributes for stable selectors

**Don't:**
- Record tests longer than 2 minutes
- Include authentication setup in every test
- Record with dynamic data without mocking

### 3. AI Test Generation

**Do:**
- Provide clear, detailed descriptions
- Include edge cases in requirements
- Review generated tests before committing
- Customize test data for your domain

**Don't:**
- Trust AI-generated tests blindly
- Skip manual review of critical paths
- Generate tests for trivial functionality

### 4. Mutation Testing

**Do:**
- Run mutation tests in CI/CD
- Aim for 80%+ mutation score
- Focus on critical business logic
- Limit mutations for fast feedback

**Don't:**
- Run all mutations on every commit (too slow)
- Ignore survived mutations
- Skip mutation testing for core features

### 5. Performance Testing

**Do:**
- Set realistic baselines
- Test on production-like environments
- Use warmup iterations
- Monitor trends over time

**Don't:**
- Compare different environments
- Set overly strict thresholds
- Ignore environmental factors
- Test only happy paths

### 6. Visual Regression

**Do:**
- Update baselines deliberately
- Test on consistent screen sizes
- Wait for animations to complete
- Ignore dynamic content regions

**Don't:**
- Auto-update baselines on failures
- Test on different browsers simultaneously
- Include timestamps in screenshots
- Ignore small but intentional changes

### 7. Contract Testing

**Do:**
- Version your contracts
- Test both request and response schemas
- Include example data
- Document breaking changes

**Don't:**
- Skip backward compatibility
- Over-specify schemas
- Ignore optional fields
- Test implementation details

---

## Success Metrics

### Test Generation Accuracy
- **Target**: >85%
- **Measure**: Percentage of AI-generated tests that pass without modification

### Mutation Score
- **Target**: >80%
- **Measure**: Percentage of mutations killed by test suite

### Visual Regression Detection
- **Target**: >95%
- **Measure**: Percentage of visual changes detected

### Performance Regression Detection
- **Target**: 100%
- **Measure**: All performance degradations caught before production

---

## Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- advancedTesting.test.ts

# Run with coverage
npm run test:coverage

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run mutation tests (custom script)
npm run test:mutation
```

---

## Troubleshooting

### Visual Test Recorder Not Recording

1. Check that event listeners are attached
2. Verify element is not in ignored list
3. Check browser console for errors
4. Ensure recorder UI is not blocking interactions

### AI Test Generation Fails

1. Verify description is clear and detailed
2. Check workflow structure is valid
3. Ensure all node types are supported
4. Review AI model configuration

### Mutation Tests Timeout

1. Reduce number of mutations
2. Increase timeout setting
3. Run tests in parallel
4. Skip slow tests temporarily

### Performance Tests Flaky

1. Increase warmup iterations
2. Use more iterations for averaging
3. Check for background processes
4. Test on dedicated hardware

### Visual Tests Fail Inconsistently

1. Wait for animations and fonts to load
2. Use consistent viewport size
3. Disable animations during testing
4. Increase similarity threshold temporarily

---

## Advanced Configuration

### Custom Mutation Operators

```typescript
import { MutationOperators } from './testing/MutationOperators';

const customOperator = {
  name: 'CustomOperator',
  type: 'custom',
  description: 'Custom mutation logic',
  apply: (code: string) => {
    // Your mutation logic
    return [];
  },
};

// Add to existing operators
const allOperators = [
  ...MutationOperators.getAllOperators(),
  customOperator,
];
```

### Custom Test Scenarios

```typescript
const customScenario: TestScenario = {
  id: 'custom1',
  name: 'Custom Test',
  description: 'Custom test scenario',
  priority: 'high',
  category: 'custom',
  steps: [
    { action: 'custom', description: 'Custom action' },
  ],
  expectedOutcome: 'Custom outcome',
};
```

---

## Integration Examples

### CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Advanced Testing

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test

      - name: Run mutation tests
        run: npm run test:mutation

      - name: Performance regression tests
        run: npm run test:performance

      - name: Visual regression tests
        run: npm run test:visual

      - name: Contract tests
        run: npm run test:contract
```

### Pre-commit Hooks

```javascript
// .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run test -- --changed
npm run test:mutation -- --changed-only
```

---

## Support

For issues, questions, or contributions:
- GitHub Issues: [Report issues](https://github.com/your-repo/issues)
- Documentation: [Full docs](https://docs.your-platform.com)
- Community: [Discord server](https://discord.gg/your-server)

---

## License

This testing framework is part of the workflow automation platform and follows the same license.
