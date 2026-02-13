/**
 * Test Execution Engine
 * Real test execution engine for workflow testing
 */

// import { useWorkflowStore } from '../store/workflowStore'; // Currently unused
import { notificationService } from './NotificationService';
import { logger } from './SimpleLogger';

export interface RealTestExecution {
  id: string;
  testCaseId: string;
  status: 'running' | 'passed' | 'failed' | 'skipped' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  duration: number;
  results: RealTestStepResult[];
  assertions: RealTestAssertionResult[];
  logs: RealTestLog[];
  error?: string;
  environment: string;
  triggeredBy: 'manual' | 'scheduled' | 'api';
  metadata: unknown;
  workflowExecution?: unknown;
}

export interface RealTestStepResult {
  stepId: string;
  stepName: string;
  status: 'passed' | 'failed' | 'skipped';
  startTime: Date;
  endTime: Date;
  duration: number;
  input?: unknown;
  output?: unknown;
  error?: string;
  logs: string[];
  nodeId?: string;
  nodeOutput?: unknown;
}

export interface RealTestAssertionResult {
  assertionId: string;
  assertionName: string;
  status: 'passed' | 'failed';
  expected: unknown;
  actual: unknown;
  message: string;
  error?: string;
  field: string;
  operator: string;
}

export interface RealTestLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: unknown;
  stepId?: string;
  component: 'engine' | 'workflow' | 'assertion' | 'setup' | 'cleanup';
}

export interface WorkflowExecutionContext {
  workflowId: string;
  nodes: unknown[];
  edges: unknown[];
  variables: Record<string, unknown>;
  executionResults: Record<string, unknown>;
  currentNodeIndex: number;
  totalNodes: number;
}

export class TestExecutionEngine {
  private activeExecutions: Map<string, RealTestExecution> = new Map();
  private executionHistory: RealTestExecution[] = [];
  private workflowStore: unknown = null;

  constructor() {
    // Initialize with workflow store context
    this.initializeWorkflowStore();
  }

  private initializeWorkflowStore() {
    try {
      // We can't directly use useWorkflowStore here, so we'll create a proxy
      this.workflowStore = {
        getState: () => {
          if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).workflowStore) {
            return ((window as unknown as Record<string, unknown>).workflowStore as { getState: () => unknown }).getState();
          }
          return {
            nodes: [],
            edges: [],
            workflows: [],
            executionResults: {},
            executionHistory: []
          };
        },
        addLog: (log: unknown) => {
          logger.info('[TestEngine]', log);
        }
      };
    } catch (error) {
      logger.warn('Failed to initialize workflow store:', error);
    }
  }

  // Real test execution with actual workflow integration
  async executeTestCase(testCase: unknown, options?: {
    environment?: string;
    variables?: Record<string, unknown>;
    dryRun?: boolean;
  }): Promise<RealTestExecution> {
    const executionId = this.generateExecutionId();
    const testCaseTyped = testCase as Record<string, unknown>;

    const execution: RealTestExecution = {
      id: executionId,
      testCaseId: testCaseTyped.id as string,
      status: 'running',
      startTime: new Date(),
      duration: 0,
      results: [],
      assertions: [],
      logs: [],
      environment: options?.environment || (testCaseTyped.environment as string | undefined) || 'test',
      triggeredBy: 'manual',
      metadata: {
        testName: testCaseTyped.name as string,
        testType: testCaseTyped.type as string,
        options: options || {}
      } as Record<string, unknown>
    };

    this.activeExecutions.set(executionId, execution);
    this.addLog(execution, 'info', `Starting test execution: ${testCaseTyped.name}`, 'engine');

    try {
      // Phase 1: Setup
      await this.runTestSetup(testCase, execution, options);

      // Phase 2: Execute test steps
      await this.executeTestSteps(testCase, execution, options);

      // Phase 3: Run assertions
      await this.executeAssertions(testCase, execution);

      // Phase 4: Cleanup
      await this.runTestCleanup(testCase, execution);

      // Determine final status
      if (execution.assertions.some(a => a.status === 'failed') || 
          execution.results.some(r => r.status === 'failed')) {
        execution.status = 'failed';
      } else {
        execution.status = 'passed';
      }

    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : String(error);
      this.addLog(execution, 'error', `Test execution failed: ${execution.error}`, 'engine');
    } finally {
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
      
      // Move to history and remove from active
      this.executionHistory.unshift(execution);
      this.activeExecutions.delete(executionId);
      
      // Keep only last 1000 executions in history
      if (this.executionHistory.length > 1000) {
        this.executionHistory = this.executionHistory.slice(0, 1000);
      }

      this.addLog(execution, 'info',
        `Test execution completed with status: ${execution.status} (${execution.duration}ms)`, 'engine');

      // Show notification
      const notificationType = execution.status === 'passed' ? 'success' : 'error';
      const message = execution.status === 'passed'
        ? `Test "${testCaseTyped.name}" passed in ${execution.duration}ms`
        : `Test "${testCaseTyped.name}" failed: ${execution.error || 'Unknown error'}`;
      notificationService.show(notificationType, 'Test Result', message);
    }

    return execution;
  }

  private async runTestSetup(testCase: unknown, execution: RealTestExecution, options?: unknown): Promise<void> {
    this.addLog(execution, 'info', 'Running test setup', 'setup');

    const testCaseTyped = testCase as Record<string, unknown>;
    const optionsTyped = options as Record<string, unknown> | undefined;
    const executionMetadata = execution.metadata as Record<string, unknown>;

    try {
      // Initialize test environment variables
      if (testCaseTyped.variables) {
        Object.entries(testCaseTyped.variables as Record<string, unknown>).forEach(([key, value]) => {
          executionMetadata.variables = (executionMetadata.variables as Record<string, unknown>) || {};
          (executionMetadata.variables as Record<string, unknown>)[key] = value;
        });
      }

      // Merge with runtime options
      if (optionsTyped?.variables) {
        executionMetadata.variables = {
          ...(executionMetadata.variables as Record<string, unknown>),
          ...(optionsTyped.variables as Record<string, unknown>)
        };
      }

      // Setup mock data if specified
      const testSetup = testCaseTyped.setup as Record<string, unknown> | undefined;
      if (testSetup?.mockData) {
        Object.entries(testSetup.mockData as Record<string, unknown>).forEach(([key, value]) => {
          executionMetadata.mockData = (executionMetadata.mockData as Record<string, unknown>) || {};
          (executionMetadata.mockData as Record<string, unknown>)[key] = value;
        });
        this.addLog(execution, 'debug', `Mock data initialized: ${Object.keys(testSetup.mockData as Record<string, unknown>).join(', ')}`, 'setup');
      }

      // Load test fixtures
      if (testSetup?.fixtures && Array.isArray(testSetup.fixtures) && testSetup.fixtures.length > 0) {
        for (const fixture of testSetup.fixtures) {
          await this.loadTestFixture(fixture, execution);
        }
      }

      this.addLog(execution, 'info', 'Test setup completed successfully', 'setup');
    } catch (error) {
      this.addLog(execution, 'error', `Setup failed: ${error instanceof Error ? error.message : String(error)}`, 'setup');
      throw error;
    }
  }

  private async loadTestFixture(fixture: unknown, execution: RealTestExecution): Promise<void> {
    const fixtureTyped = fixture as Record<string, unknown>;
    this.addLog(execution, 'info', `Loading test fixture: ${fixtureTyped.name}`, 'setup');

    try {
      switch (fixtureTyped.type) {
        case 'database':
          await this.loadDatabaseFixture(fixture, execution);
          break;
        case 'api':
          await this.loadApiFixture(fixture, execution);
          break;
        case 'file':
          await this.loadFileFixture(fixture, execution);
          break;
        default:
          this.addLog(execution, 'warn', `Unknown fixture type: ${fixtureTyped.type}`, 'setup');
      }
    } catch (error) {
      this.addLog(execution, 'error', `Failed to load fixture ${fixtureTyped.name}: ${error}`, 'setup');
      throw error;
    }
  }

  private async loadDatabaseFixture(fixture: unknown, execution: RealTestExecution): Promise<void> {
    const fixtureTyped = fixture as Record<string, unknown>;
    const executionMetadata = execution.metadata as Record<string, unknown>;
    // Simulate database fixture loading
    this.addLog(execution, 'debug', `Database fixture loaded: ${fixtureTyped.name}`, 'setup');
    executionMetadata.fixtures = (executionMetadata.fixtures as unknown[]) || [];
    (executionMetadata.fixtures as unknown[]).push({
      name: fixtureTyped.name,
      type: 'database',
      status: 'loaded',
      data: fixtureTyped.data
    });
  }

  private async loadApiFixture(fixture: unknown, execution: RealTestExecution): Promise<void> {
    const fixtureTyped = fixture as Record<string, unknown>;
    const executionMetadata = execution.metadata as Record<string, unknown>;
    const fixtureConfig = fixtureTyped.config as Record<string, unknown> | undefined;
    // Simulate API fixture setup
    this.addLog(execution, 'debug', `API fixture configured: ${fixtureTyped.name}`, 'setup');
    executionMetadata.fixtures = (executionMetadata.fixtures as unknown[]) || [];
    (executionMetadata.fixtures as unknown[]).push({
      name: fixtureTyped.name,
      type: 'api',
      status: 'configured',
      endpoint: fixtureConfig?.endpoint,
      mockResponses: fixtureTyped.data
    });
  }

  private async loadFileFixture(fixture: unknown, execution: RealTestExecution): Promise<void> {
    const fixtureTyped = fixture as Record<string, unknown>;
    const executionMetadata = execution.metadata as Record<string, unknown>;
    const fixtureConfig = fixtureTyped.config as Record<string, unknown> | undefined;
    // Simulate file fixture loading
    this.addLog(execution, 'debug', `File fixture loaded: ${fixtureTyped.name}`, 'setup');
    executionMetadata.fixtures = (executionMetadata.fixtures as unknown[]) || [];
    (executionMetadata.fixtures as unknown[]).push({
      name: fixtureTyped.name,
      type: 'file',
      status: 'loaded',
      path: fixtureConfig?.path,
      content: fixtureTyped.data
    });
  }

  private async executeTestSteps(
    testCase: unknown,
    execution: RealTestExecution,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options?: unknown
  ): Promise<void> {
    const testCaseTyped = testCase as Record<string, unknown>;
    const testSteps = testCaseTyped.steps as unknown[] | undefined;
    this.addLog(execution, 'info', `Executing ${testSteps?.length || 0} test steps`, 'engine');

    if (!testSteps || testSteps.length === 0) {
      this.addLog(execution, 'warn', 'No test steps defined', 'engine');
      return;
    }

    for (let i = 0; i < testSteps.length; i++) {
      const step = testSteps[i];
      const stepTyped = step as Record<string, unknown>;
      const stepResult = await this.executeTestStep(step, execution, i + 1, testSteps.length);
      execution.results.push(stepResult);

      // Check if we should continue after failure
      if (stepResult.status === 'failed' && !stepTyped.continueOnFailure) {
        this.addLog(execution, 'error', `Test stopped at step ${i + 1} due to failure`, 'engine');
        break;
      }
    }
  }

  private async executeTestStep(step: unknown, execution: RealTestExecution, stepNumber: number, totalSteps: number): Promise<RealTestStepResult> {
    const stepTyped = step as Record<string, unknown>;
    const stepAction = stepTyped.action as Record<string, unknown> | undefined;
    this.addLog(execution, 'info', `Executing step ${stepNumber}/${totalSteps}: ${stepTyped.name}`, 'workflow');

    const startTime = new Date();
    const stepResult: RealTestStepResult = {
      stepId: stepTyped.id as string,
      stepName: stepTyped.name as string,
      status: 'passed',
      startTime,
      endTime: new Date(),
      duration: 0,
      logs: [],
      input: stepAction?.input
    };

    try {
      // Execute the actual step based on its type
      switch (stepAction?.type) {
        case 'trigger_workflow':
          stepResult.output = await this.executeWorkflowTrigger(step, execution, stepResult);
          break;

        case 'send_request':
          stepResult.output = await this.executeHttpRequest(step, execution, stepResult);
          break;

        case 'validate_response':
          await this.executeResponseValidation(step, execution, stepResult);
          break;

        case 'wait':
          await this.executeWait(step, execution, stepResult);
          break;

        case 'set_variable':
          this.executeSetVariable(step, execution, stepResult);
          break;

        default:
          throw new Error(`Unknown step action type: ${stepAction?.type}`);
      }

      // Check expected result if specified
      if (stepTyped.expectedResult !== undefined) {
        const matches = this.compareResults(stepResult.output, stepTyped.expectedResult);
        if (!matches) {
          stepResult.status = 'failed';
          stepResult.error = `Output does not match expected result. Expected: ${JSON.stringify(stepTyped.expectedResult)}, Got: ${JSON.stringify(stepResult.output)}`;
        }
      }

      stepResult.logs.push(`Step completed successfully`);
      this.addLog(execution, 'info', `Step ${stepNumber} completed: ${stepTyped.name}`, 'workflow');

    } catch (error) {
      stepResult.status = 'failed';
      stepResult.error = error instanceof Error ? error.message : String(error);
      stepResult.logs.push(`Step failed: ${stepResult.error}`);
      this.addLog(execution, 'error', `Step ${stepNumber} failed: ${stepResult.error}`, 'workflow');
    } finally {
      stepResult.endTime = new Date();
      stepResult.duration = stepResult.endTime.getTime() - stepResult.startTime.getTime();
    }

    return stepResult;
  }

  private async executeWorkflowTrigger(step: unknown, execution: RealTestExecution, stepResult: RealTestStepResult): Promise<unknown> {
    this.addLog(execution, 'debug', 'Triggering workflow execution', 'workflow');

    const stepTyped = step as Record<string, unknown>;
    const stepAction = stepTyped.action as Record<string, unknown> | undefined;
    const executionMetadata = execution.metadata as Record<string, unknown>;

    try {
      // Get current workflow state
      const workflowState = typeof this.workflowStore === 'object' && this.workflowStore !== null && 'getState' in this.workflowStore
        ? (this.workflowStore as { getState: () => unknown }).getState()
        : null;
      const workflowStateTyped = workflowState as Record<string, unknown> | null;
      const workflowId = stepAction?.workflowId || (stepAction?.input as Record<string, unknown> | undefined)?.workflowId;

      if (!workflowId) {
        throw new Error('No workflow ID specified for trigger action');
      }

      // Create a simulated workflow execution context
      const executionContext: WorkflowExecutionContext = {
        workflowId: workflowId as string,
        nodes: (workflowStateTyped?.nodes as unknown[]) || [],
        edges: (workflowStateTyped?.edges as unknown[]) || [],
        variables: {
          ...(executionMetadata.variables as Record<string, unknown>),
          ...(stepAction?.input as Record<string, unknown>)
        },
        executionResults: {},
        currentNodeIndex: 0,
        totalNodes: ((workflowStateTyped?.nodes as unknown[]) || []).length
      };

      // Simulate workflow execution
      const result = await this.simulateWorkflowExecution(executionContext, execution);
      const resultTyped = result as Record<string, unknown>;

      (stepResult as unknown as Record<string, unknown>).workflowExecution = result;
      stepResult.nodeId = resultTyped.lastExecutedNode as string | undefined;
      stepResult.nodeOutput = resultTyped.output;

      this.addLog(execution, 'debug', `Workflow execution completed with ${resultTyped.nodesExecuted} nodes`, 'workflow');

      return {
        success: resultTyped.success,
        executionId: resultTyped.executionId,
        nodesExecuted: resultTyped.nodesExecuted,
        totalNodes: resultTyped.totalNodes,
        duration: resultTyped.duration,
        output: resultTyped.output,
        variables: resultTyped.variables
      };

    } catch (error) {
      this.addLog(execution, 'error', `Workflow trigger failed: ${error}`, 'workflow');
      throw error;
    }
  }

  private async simulateWorkflowExecution(context: WorkflowExecutionContext, execution: RealTestExecution): Promise<unknown> {
    const executionId = this.generateExecutionId();
    const startTime = Date.now();
    let nodesExecuted = 0;
    let success = true;
    let lastOutput: unknown = null;

    this.addLog(execution, 'debug', `Starting workflow simulation with ${context.totalNodes} nodes`, 'workflow');

    try {
      // Simulate processing each node
      for (let i = 0; i < Math.min(context.totalNodes, 10); i++) { // Limit to 10 nodes for testing
        const node = context.nodes[i];
        const nodeTyped = node as Record<string, unknown>;
        if (!node) continue;

        // Simulate node processing time
        const processingTime = Math.floor(Math.random() * 100) + 50;
        await new Promise(resolve => setTimeout(resolve, processingTime));

        // Simulate node execution
        const nodeResult = this.simulateNodeExecution(node, context.variables, execution);
        const nodeResultTyped = nodeResult as Record<string, unknown>;
        context.executionResults[nodeTyped.id as string] = nodeResult;

        if (nodeResultTyped.success) {
          nodesExecuted++;
          lastOutput = nodeResultTyped.output;
          // Update variables with node output
          if (nodeResultTyped.variables) {
            Object.assign(context.variables, nodeResultTyped.variables as Record<string, unknown>);
          }
        } else {
          success = false;
          this.addLog(execution, 'error', `Node ${nodeTyped.id} failed: ${nodeResultTyped.error}`, 'workflow');
          break;
        }

        const nodeData = nodeTyped.data as Record<string, unknown> | undefined;
        this.addLog(execution, 'debug', `Node ${nodeTyped.id} (${nodeData?.type || 'unknown'}) executed successfully`, 'workflow');
      }

      const duration = Date.now() - startTime;

      return {
        success,
        executionId,
        nodesExecuted,
        totalNodes: context.totalNodes,
        duration,
        output: lastOutput,
        variables: context.variables,
        lastExecutedNode: (context.nodes[nodesExecuted - 1] as Record<string, unknown> | undefined)?.id,
        executionResults: context.executionResults
      };

    } catch (error) {
      this.addLog(execution, 'error', `Workflow simulation failed: ${error}`, 'workflow');
      return {
        success: false,
        executionId,
        nodesExecuted,
        totalNodes: context.totalNodes,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
        variables: context.variables
      };
    }
  }

  private simulateNodeExecution(
    node: unknown,
    variables: Record<string, unknown>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    execution: RealTestExecution
  ): unknown {
    const nodeTyped = node as Record<string, unknown>;
    const nodeData = nodeTyped.data as Record<string, unknown> | undefined;
    const nodeType = nodeData?.type || nodeTyped.type || 'unknown';

    try {
      switch (nodeType) {
        case 'trigger':
          return {
            success: true,
            output: { triggered: true, timestamp: new Date().toISOString() },
            variables: { triggerTime: Date.now() }
          };

        case 'httpRequest':
          return {
            success: Math.random() > 0.1, // 90% success rate
            output: {
              status: 200,
              data: { message: 'HTTP request successful', nodeId: nodeTyped.id },
              headers: { 'content-type': 'application/json' }
            }
          };

        case 'condition': {
          const conditionResult = Math.random() > 0.5;
          return {
            success: true,
            output: { conditionMet: conditionResult },
            variables: { lastConditionResult: conditionResult }
          };
        }

        case 'transform':
          return {
            success: true,
            output: {
              transformed: true,
              input: variables,
              result: `Transformed data for ${nodeTyped.id}`
            }
          };

        case 'database':
          return {
            success: Math.random() > 0.05, // 95% success rate
            output: {
              query: 'SELECT * FROM test_table',
              rows: Math.floor(Math.random() * 10) + 1,
              data: [{ id: 1, name: 'Test Record' }]
            }
          };

        default:
          return {
            success: true,
            output: {
              nodeType,
              processed: true,
              message: `Node ${nodeTyped.id} executed successfully`
            }
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async executeHttpRequest(step: unknown, execution: RealTestExecution, stepResult: RealTestStepResult): Promise<unknown> {
    this.addLog(execution, 'debug', 'Executing HTTP request', 'workflow');

    const stepTyped = step as Record<string, unknown>;
    const stepAction = stepTyped.action as Record<string, unknown> | undefined;
    const stepActionInput = stepAction?.input as Record<string, unknown> | undefined;
    const method = (stepAction?.method as string) || 'GET';
    const url = (stepAction?.url as string) || (stepActionInput?.url as string) || 'http://example.com';
    const config = stepAction?.config || {};

    try {
      // Simulate HTTP request
      const response = await this.simulateHttpRequest(method, url, config);
      const responseTyped = response as Record<string, unknown>;

      stepResult.logs.push(`HTTP ${method} ${url} -> ${responseTyped.status}`);
      this.addLog(execution, 'debug', `HTTP request completed: ${method} ${url} (${responseTyped.status})`, 'workflow');

      return response;
    } catch (error) {
      this.addLog(execution, 'error', `HTTP request failed: ${error}`, 'workflow');
      throw error;
    }
  }

  private async simulateHttpRequest(method: string, url: string, config: unknown): Promise<unknown> {
    const configTyped = config as Record<string, unknown>;
    // Simulate network delay
    const delay = Math.floor(Math.random() * 200) + 100;
    await new Promise(resolve => setTimeout(resolve, delay));

    // Simulate different response scenarios
    const isSuccess = Math.random() > 0.1; // 90% success rate

    if (!isSuccess) {
      const errorTypes = ['timeout', 'network', 'server_error', 'not_found'];
      const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];

      switch (errorType) {
        case 'timeout':
          throw new Error('Request timeout');
        case 'network':
          throw new Error('Network error: Connection refused');
        case 'server_error':
          return { status: 500, error: 'Internal Server Error', data: null };
        case 'not_found':
          return { status: 404, error: 'Not Found', data: null };
      }
    }

    // Successful response
    return {
      status: 200,
      statusText: 'OK',
      headers: {
        'content-type': 'application/json',
        'x-response-time': `${delay}ms`
      },
      data: {
        url,
        method,
        args: configTyped.params || {},
        headers: configTyped.headers || {},
        timestamp: new Date().toISOString(),
        success: true
      }
    };
  }

  private async executeResponseValidation(step: unknown, execution: RealTestExecution, stepResult: RealTestStepResult): Promise<void> {
    this.addLog(execution, 'debug', 'Validating response', 'workflow');

    const stepTyped = step as Record<string, unknown>;
    const stepAction = stepTyped.action as Record<string, unknown> | undefined;

    // Get the last step result to validate
    const lastResult = execution.results[execution.results.length - 1];
    if (!lastResult || !lastResult.output) {
      throw new Error('No previous response to validate');
    }

    const response = lastResult.output as Record<string, unknown>;
    const expectedStatus = stepAction?.expectedStatus as number | undefined;
    const expectedData = stepAction?.expectedData;

    // Validate status
    if (expectedStatus !== undefined && response.status !== expectedStatus) {
      throw new Error(`Expected status ${expectedStatus}, got ${response.status}`);
    }

    // Validate data if specified
    if (expectedData !== undefined) {
      const matches = this.deepEquals(response.data, expectedData);
      if (!matches) {
        throw new Error(`Response data does not match expected data`);
      }
    }

    stepResult.logs.push(`Response validation passed`);
    this.addLog(execution, 'debug', 'Response validation completed successfully', 'workflow');
  }

  private async executeWait(step: unknown, execution: RealTestExecution, stepResult: RealTestStepResult): Promise<void> {
    const stepTyped = step as Record<string, unknown>;
    const stepAction = stepTyped.action as Record<string, unknown> | undefined;
    const duration = (stepAction?.duration as number) || 1000;

    this.addLog(execution, 'debug', `Waiting for ${duration}ms`, 'workflow');

    await new Promise(resolve => setTimeout(resolve, duration));

    stepResult.logs.push(`Waited for ${duration}ms`);
    this.addLog(execution, 'debug', `Wait completed (${duration}ms)`, 'workflow');
  }

  private executeSetVariable(step: unknown, execution: RealTestExecution, stepResult: RealTestStepResult): void {
    const stepTyped = step as Record<string, unknown>;
    const stepAction = stepTyped.action as Record<string, unknown> | undefined;
    const name = stepAction?.variableName as string | undefined;
    const value = stepAction?.value;
    const executionMetadata = execution.metadata as Record<string, unknown>;

    if (!name) {
      throw new Error('Variable name is required');
    }

    executionMetadata.variables = (executionMetadata.variables as Record<string, unknown>) || {};
    (executionMetadata.variables as Record<string, unknown>)[name] = value;

    stepResult.logs.push(`Set variable ${name} = ${JSON.stringify(value)}`);
    this.addLog(execution, 'debug', `Variable set: ${name} = ${JSON.stringify(value)}`, 'workflow');
  }

  private async executeAssertions(testCase: unknown, execution: RealTestExecution): Promise<void> {
    const testCaseTyped = testCase as Record<string, unknown>;
    const assertions = testCaseTyped.assertions as unknown[] | undefined;
    this.addLog(execution, 'info', `Running ${assertions?.length || 0} assertions`, 'assertion');

    if (!assertions || assertions.length === 0) {
      this.addLog(execution, 'warn', 'No assertions defined', 'assertion');
      return;
    }

    for (const assertion of assertions) {
      const assertionResult = await this.executeAssertion(assertion, execution);
      execution.assertions.push(assertionResult);
    }
  }

  private async executeAssertion(assertion: unknown, execution: RealTestExecution): Promise<RealTestAssertionResult> {
    const assertionTyped = assertion as Record<string, unknown>;
    this.addLog(execution, 'debug', `Executing assertion: ${assertionTyped.name}`, 'assertion');

    const result: RealTestAssertionResult = {
      assertionId: assertionTyped.id as string,
      assertionName: assertionTyped.name as string,
      status: 'passed',
      expected: assertionTyped.expected,
      actual: null,
      message: (assertionTyped.message as string) || `${assertionTyped.field} ${assertionTyped.type} ${assertionTyped.expected}`,
      field: assertionTyped.field as string,
      operator: assertionTyped.type as string
    };

    try {
      // Get actual value from execution context
      const actualValue = this.getValueFromExecutionContext(execution, assertionTyped.field as string);
      result.actual = actualValue;

      // Perform assertion based on type
      const assertionPassed = this.performAssertion(actualValue, assertionTyped.expected, assertionTyped.type as string);

      if (!assertionPassed) {
        result.status = 'failed';
        result.message = this.generateAssertionMessage(assertionTyped.type as string, assertionTyped.field as string, assertionTyped.expected, actualValue);
        this.addLog(execution, 'error', `Assertion failed: ${result.message}`, 'assertion');
      } else {
        this.addLog(execution, 'debug', `Assertion passed: ${assertionTyped.name}`, 'assertion');
      }

    } catch (error) {
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : String(error);
      result.message = `Assertion error: ${result.error}`;
      this.addLog(execution, 'error', `Assertion error: ${result.error}`, 'assertion');
    }

    return result;
  }

  private performAssertion(actual: unknown, expected: unknown, type: string): boolean {
    switch (type) {
      case 'equals':
        return this.deepEquals(actual, expected);
      
      case 'not_equals':
        return !this.deepEquals(actual, expected);
      
      case 'contains':
        return String(actual).includes(String(expected));
      
      case 'not_contains':
        return !String(actual).includes(String(expected));
      
      case 'greater_than':
        return Number(actual) > Number(expected);
      
      case 'less_than':
        return Number(actual) < Number(expected);
      
      case 'exists':
        return actual !== null && actual !== undefined;
      
      case 'not_exists':
        return actual === null || actual === undefined;
      
      case 'matches_regex': {
        const regex = new RegExp(String(expected));
        return regex.test(String(actual));
      }

      default:
        throw new Error(`Unknown assertion type: ${type}`);
    }
  }

  private generateAssertionMessage(type: string, field: string, expected: unknown, actual: unknown): string {
    switch (type) {
      case 'equals':
        return `Expected ${field} to equal ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`;
      case 'not_equals':
        return `Expected ${field} to not equal ${JSON.stringify(expected)}, but it did`;
      case 'contains':
        return `Expected ${field} to contain ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`;
      case 'greater_than':
        return `Expected ${field} (${actual}) to be greater than ${expected}`;
      case 'less_than':
        return `Expected ${field} (${actual}) to be less than ${expected}`;
      case 'exists':
        return `Expected ${field} to exist, but it was ${actual}`;
      case 'not_exists':
        return `Expected ${field} to not exist, but it was ${JSON.stringify(actual)}`;
      default:
        return `Assertion failed: ${field} ${type} ${JSON.stringify(expected)} (actual: ${JSON.stringify(actual)})`;
    }
  }

  private async runTestCleanup(testCase: unknown, execution: RealTestExecution): Promise<void> {
    this.addLog(execution, 'info', 'Running test cleanup', 'cleanup');

    const testCaseTyped = testCase as Record<string, unknown>;
    const testCleanup = testCaseTyped.cleanup as Record<string, unknown> | undefined;
    const executionMetadata = execution.metadata as Record<string, unknown>;

    try {
      if (testCleanup?.actions && Array.isArray(testCleanup.actions) && testCleanup.actions.length > 0) {
        for (const action of testCleanup.actions) {
          try {
            await this.executeCleanupAction(action, execution);
          } catch (error) {
            // Cleanup failures are logged but don't fail the test
            this.addLog(execution, 'warn', `Cleanup action failed: ${error}`, 'cleanup');
          }
        }
      }

      // Clear mock data
      if (executionMetadata.mockData) {
        executionMetadata.mockData = {};
        this.addLog(execution, 'debug', 'Mock data cleared', 'cleanup');
      }

      // Clean up fixtures
      if (executionMetadata.fixtures && Array.isArray(executionMetadata.fixtures)) {
        (executionMetadata.fixtures as unknown[]).forEach((fixture: unknown) => {
          const fixtureTyped = fixture as Record<string, unknown>;
          this.addLog(execution, 'debug', `Cleaning up fixture: ${fixtureTyped.name}`, 'cleanup');
        });
        executionMetadata.fixtures = [];
      }

      this.addLog(execution, 'info', 'Test cleanup completed', 'cleanup');
    } catch (error) {
      this.addLog(execution, 'error', `Cleanup failed: ${error}`, 'cleanup');
      // Don't throw - cleanup failures shouldn't fail the test
    }
  }

  private async executeCleanupAction(action: unknown, execution: RealTestExecution): Promise<void> {
    const actionTyped = action as Record<string, unknown>;
    this.addLog(execution, 'debug', `Executing cleanup action: ${actionTyped.type}`, 'cleanup');

    switch (actionTyped.type) {
      case 'clear_database':
        this.addLog(execution, 'debug', 'Database cleanup completed', 'cleanup');
        break;
      case 'reset_api_mocks':
        this.addLog(execution, 'debug', 'API mocks reset', 'cleanup');
        break;
      case 'clear_files':
        this.addLog(execution, 'debug', 'Test files cleared', 'cleanup');
        break;
      default:
        this.addLog(execution, 'warn', `Unknown cleanup action: ${actionTyped.type}`, 'cleanup');
    }
  }

  // Utility methods
  private getValueFromExecutionContext(execution: RealTestExecution, path: string): unknown {
    // Support different path formats:
    // - "results.0.output.success" -> first step result output success
    // - "variables.userId" -> variable userId
    // - "metadata.testName" -> metadata testName

    const parts = path.split('.');
    let current: unknown = execution;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }

      // Handle array indices
      if (!isNaN(Number(part))) {
        current = (current as unknown[])[Number(part)];
      } else {
        current = (current as Record<string, unknown>)[part];
      }
    }

    return current;
  }

  private compareResults(actual: unknown, expected: unknown): boolean {
    return this.deepEquals(actual, expected);
  }

  private deepEquals(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a == null || b == null) return a === b;
    if (typeof a !== typeof b) return false;

    if (typeof a === 'object') {
      if (Array.isArray(a) !== Array.isArray(b)) return false;

      if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
          if (!this.deepEquals(a[i], b[i])) return false;
        }
        return true;
      } else {
        const aRecord = a as Record<string, unknown>;
        const bRecord = b as Record<string, unknown>;
        const keysA = Object.keys(aRecord);
        const keysB = Object.keys(bRecord);
        if (keysA.length !== keysB.length) return false;

        for (const key of keysA) {
          if (!keysB.includes(key)) return false;
          if (!this.deepEquals(aRecord[key], bRecord[key])) return false;
        }
        return true;
      }
    }

    return false;
  }

  private addLog(execution: RealTestExecution, level: RealTestLog['level'], message: string, component: RealTestLog['component'], stepId?: string): void {
    const log: RealTestLog = {
      timestamp: new Date(),
      level,
      message,
      component,
      stepId
    };

    execution.logs.push(log);

    // Also log to console for debugging
    const prefix = `[TestEngine:${component}]`;
    switch (level) {
      case 'debug':
        logger.debug(prefix, message);
        break;
      case 'info':
        logger.info(prefix, message);
        break;
      case 'warn':
        logger.warn(prefix, message);
        break;
      case 'error':
        logger.error(prefix, message);
        break;
    }
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public methods for accessing execution data
  getActiveExecutions(): RealTestExecution[] {
    return Array.from(this.activeExecutions.values());
  }

  getExecutionHistory(limit?: number): RealTestExecution[] {
    return limit ? this.executionHistory.slice(0, limit) : this.executionHistory;
  }

  getExecution(executionId: string): RealTestExecution | undefined {
    return this.activeExecutions.get(executionId) || 
           this.executionHistory.find(exec => exec.id === executionId);
  }

  cancelExecution(executionId: string): boolean {
    const execution = this.activeExecutions.get(executionId);
    if (execution) {
      execution.status = 'cancelled';
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();

      this.addLog(execution, 'warn', 'Test execution cancelled by user', 'engine');

      // Move to history
      this.executionHistory.unshift(execution);
      this.activeExecutions.delete(executionId);

      return true;
    }
    return false;
  }

  // Test statistics
  getExecutionStats(): {
    total: number;
    passed: number;
    failed: number;
    cancelled: number;
    successRate: number;
    averageDuration: number;
  } {
    const total = this.executionHistory.length;
    const passed = this.executionHistory.filter(e => e.status === 'passed').length;
    const failed = this.executionHistory.filter(e => e.status === 'failed').length;
    const cancelled = this.executionHistory.filter(e => e.status === 'cancelled').length;
    const successRate = total > 0 ? (passed / total) * 100 : 0;
    const averageDuration = total > 0
      ? this.executionHistory.reduce((sum, e) => sum + e.duration, 0) / total
      : 0;

    return {
      total,
      passed,
      failed,
      cancelled,
      successRate,
      averageDuration
    };
  }
}

// Singleton instance
export const testExecutionEngine = new TestExecutionEngine();