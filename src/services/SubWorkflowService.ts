/**
 * Sub-workflow Service
 * Manages nested workflows, reusable components, and workflow composition
 */

import { BaseService } from './BaseService';
import { SecureExpressionEngineV2 } from '../expressions/SecureExpressionEngineV2';
import type {
  SubWorkflow,
  SubWorkflowExecution,
  SubWorkflowVersion,
  SubWorkflowTest,
  TestResult,
  SubWorkflowReference,
  SubWorkflowPerformance,
  SubWorkflowDebugSession,
  ExecutionContext,
  SubWorkflowFilters,
  LibraryFilters,
  DependencyCheck,
  ValidationResult,
  SubWorkflowService as ISubWorkflowService
} from '../types/subworkflows';
import type { WorkflowNode, WorkflowEdge } from '../types/workflow';
import { WorkflowExecutor } from '../components/ExecutionEngine';
import { VariablesService } from './VariablesService';
import { logger } from './SimpleLogger';

export class SubWorkflowService extends BaseService implements ISubWorkflowService {
  private static instance: SubWorkflowService;
  private subWorkflows: Map<string, SubWorkflow> = new Map();
  private versions: Map<string, SubWorkflowVersion[]> = new Map();
  private executions: Map<string, SubWorkflowExecution> = new Map();
  private tests: Map<string, SubWorkflowTest> = new Map();
  private references: Map<string, SubWorkflowReference[]> = new Map();
  private debugSessions: Map<string, SubWorkflowDebugSession> = new Map();
  private performanceCache: Map<string, SubWorkflowPerformance> = new Map();
  private variablesService: VariablesService;

  private constructor() {
    super('SubWorkflowService');
    this.variablesService = VariablesService.getInstance();
    this.initializeBuiltInSubWorkflows();
  }

  static getInstance(): SubWorkflowService {
    if (!SubWorkflowService.instance) {
      SubWorkflowService.instance = new SubWorkflowService();
    }
    return SubWorkflowService.instance;
  }

  private initializeBuiltInSubWorkflows() {
    // Create built-in sub-workflows
    const builtInSubWorkflows: Array<Omit<SubWorkflow, 'id' | 'createdAt' | 'updatedAt'>> = [
      {
        name: 'Error Handler',
        description: 'Standard error handling sub-workflow',
        version: '1.0.0',
        nodes: [],
        edges: [],
        inputs: [
          {
            name: 'error',
            type: 'object',
            required: true,
            description: 'Error object to handle'
          },
          {
            name: 'context',
            type: 'object',
            required: false,
            description: 'Execution context'
          }
        ],
        outputs: [
          {
            name: 'handled',
            type: 'boolean',
            description: 'Whether error was handled',
            mapping: { sourceNode: 'output', sourceField: 'handled' }
          }
        ],
        errorHandling: {
          strategy: 'fallback',
          fallbackOutput: { handled: false },
          notifyOnError: true,
          continueOnError: false
        },
        settings: {
          timeout: 30000,
          isolationLevel: 'isolated'
        },
        metadata: {
          tags: ['error-handling', 'utility'],
          category: 'System',
          icon: 'alert-triangle'
        },
        isPublished: true,
        isTemplate: true,
        createdBy: 'system'
      },
      {
        name: 'Data Validator',
        description: 'Validates data against schema',
        version: '1.0.0',
        nodes: [],
        edges: [],
        inputs: [
          {
            name: 'data',
            type: 'any',
            required: true,
            description: 'Data to validate'
          },
          {
            name: 'schema',
            type: 'object',
            required: true,
            description: 'Validation schema'
          }
        ],
        outputs: [
          {
            name: 'isValid',
            type: 'boolean',
            description: 'Validation result',
            mapping: { sourceNode: 'validator', sourceField: 'isValid' }
          },
          {
            name: 'errors',
            type: 'array',
            description: 'Validation errors',
            mapping: { sourceNode: 'validator', sourceField: 'errors' }
          }
        ],
        errorHandling: {
          strategy: 'fail',
          notifyOnError: false,
          continueOnError: false
        },
        settings: {
          timeout: 5000,
          isolationLevel: 'shared'
        },
        metadata: {
          tags: ['validation', 'data-processing'],
          category: 'Data',
          icon: 'check-circle'
        },
        isPublished: true,
        isTemplate: true,
        createdBy: 'system'
      },
      {
        name: 'Retry Handler',
        description: 'Retries failed operations with exponential backoff',
        version: '1.0.0',
        nodes: [],
        edges: [],
        inputs: [
          {
            name: 'operation',
            type: 'object',
            required: true,
            description: 'Operation to retry'
          },
          {
            name: 'maxAttempts',
            type: 'number',
            required: false,
            defaultValue: 3,
            description: 'Maximum retry attempts'
          }
        ],
        outputs: [
          {
            name: 'result',
            type: 'any',
            description: 'Operation result',
            mapping: { sourceNode: 'retry', sourceField: 'result' }
          },
          {
            name: 'attempts',
            type: 'number',
            description: 'Number of attempts made',
            mapping: { sourceNode: 'retry', sourceField: 'attempts' }
          }
        ],
        errorHandling: {
          strategy: 'retry',
          retryPolicy: {
            maxAttempts: 3,
            delay: 1000,
            backoffMultiplier: 2,
            maxDelay: 30000
          },
          notifyOnError: false,
          continueOnError: false
        },
        settings: {
          timeout: 300000,
          isolationLevel: 'isolated'
        },
        metadata: {
          tags: ['retry', 'error-handling', 'resilience'],
          category: 'System',
          icon: 'refresh-cw'
        },
        isPublished: true,
        isTemplate: true,
        createdBy: 'system'
      },
      {
        name: 'Batch Processor',
        description: 'Processes data in batches',
        version: '1.0.0',
        nodes: [],
        edges: [],
        inputs: [
          {
            name: 'items',
            type: 'array',
            required: true,
            description: 'Items to process'
          },
          {
            name: 'batchSize',
            type: 'number',
            required: false,
            defaultValue: 10,
            description: 'Size of each batch'
          },
          {
            name: 'processor',
            type: 'object',
            required: true,
            description: 'Processing logic'
          }
        ],
        outputs: [
          {
            name: 'results',
            type: 'array',
            description: 'Processed results',
            mapping: { sourceNode: 'batcher', sourceField: 'results' }
          },
          {
            name: 'stats',
            type: 'object',
            description: 'Processing statistics',
            mapping: { sourceNode: 'batcher', sourceField: 'stats' }
          }
        ],
        errorHandling: {
          strategy: 'ignore',
          notifyOnError: true,
          continueOnError: true
        },
        settings: {
          timeout: 600000,
          concurrency: 5,
          isolationLevel: 'isolated'
        },
        metadata: {
          tags: ['batch', 'performance', 'data-processing'],
          category: 'Data',
          icon: 'layers'
        },
        isPublished: true,
        isTemplate: true,
        createdBy: 'system'
      }
    ];

    // Create built-in sub-workflows
    builtInSubWorkflows.forEach(data => {
      const subWorkflow: SubWorkflow = {
        ...data,
        id: this.generateId(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.subWorkflows.set(subWorkflow.id, subWorkflow);
    });
  }

  async createSubWorkflow(
    data: Omit<SubWorkflow, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<SubWorkflow> {
    logger.info('Creating sub-workflow', { name: data.name });

    // Validate sub-workflow
    const validation = await this.validateSubWorkflow({
      ...data,
      id: '',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    if (!validation.isValid) {
      throw new Error(`Invalid sub-workflow: ${validation.errors[0]?.message}`);
    }

    const subWorkflow: SubWorkflow = {
      ...data,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.subWorkflows.set(subWorkflow.id, subWorkflow);
    
    // Create initial version
    await this.createVersion(subWorkflow.id, 'Initial version');

    return subWorkflow;
  }

  async updateSubWorkflow(id: string, updates: Partial<SubWorkflow>): Promise<void> {
    const subWorkflow = this.subWorkflows.get(id);
    if (!subWorkflow) {
      throw new Error(`Sub-workflow ${id} not found`);
    }

    const updated: SubWorkflow = {
      ...subWorkflow,
      ...updates,
      id: subWorkflow.id,
      createdAt: subWorkflow.createdAt,
      updatedAt: new Date()
    };

    // Validate if structure changed
    if (updates.nodes || updates.edges || updates.inputs || updates.outputs) {
      const validation = await this.validateSubWorkflow(updated);
      if (!validation.isValid) {
        throw new Error(`Invalid sub-workflow update: ${validation.errors[0]?.message}`);
      }
    }

    this.subWorkflows.set(id, updated);
    
    // Update references if needed
    if (updates.inputs || updates.outputs) {
      await this.updateReferences(id, updated.version);
    }
  }

  async deleteSubWorkflow(id: string): Promise<void> {
    const subWorkflow = this.subWorkflows.get(id);
    if (!subWorkflow) {
      throw new Error(`Sub-workflow ${id} not found`);
    }

    // Check for references
    const references = this.references.get(id) || [];
    if (references.length > 0) {
      throw new Error(`Cannot delete sub-workflow. It is used in ${references.length} workflows.`);
    }

    this.subWorkflows.delete(id);
    this.versions.delete(id);
    this.performanceCache.delete(id);
  }

  async getSubWorkflow(id: string, version?: string): Promise<SubWorkflow | null> {
    const subWorkflow = this.subWorkflows.get(id);
    if (!subWorkflow) return null;

    if (version && version !== subWorkflow.version) {
      // Get specific version
      const versions = this.versions.get(id) || [];
      const versionData = versions.find(v => v.version === version);
      if (versionData) {
        return {
          ...subWorkflow,
          version: versionData.version,
          nodes: versionData.nodes,
          edges: versionData.edges,
          inputs: versionData.inputs,
          outputs: versionData.outputs
        };
      }
    }

    return subWorkflow;
  }

  async listSubWorkflows(filters?: SubWorkflowFilters): Promise<SubWorkflow[]> {
    let subWorkflows = Array.from(this.subWorkflows.values());

    if (filters) {
      if (filters.search) {
        const search = filters.search.toLowerCase();
        subWorkflows = subWorkflows.filter(sw =>
          sw.name.toLowerCase().includes(search) ||
          sw.description?.toLowerCase().includes(search)
        );
      }
      if (filters.category) {
        subWorkflows = subWorkflows.filter(sw => sw.metadata.category === filters.category);
      }
      if (filters.tags?.length) {
        subWorkflows = subWorkflows.filter(sw =>
          filters.tags!.some(tag => sw.metadata.tags.includes(tag))
        );
      }
      if (filters.isPublished !== undefined) {
        subWorkflows = subWorkflows.filter(sw => sw.isPublished === filters.isPublished);
      }
      if (filters.isTemplate !== undefined) {
        subWorkflows = subWorkflows.filter(sw => sw.isTemplate === filters.isTemplate);
      }
      if (filters.createdBy) {
        subWorkflows = subWorkflows.filter(sw => sw.createdBy === filters.createdBy);
      }
      if (filters.parentWorkflowId) {
        subWorkflows = subWorkflows.filter(sw => sw.parentWorkflowId === filters.parentWorkflowId);
      }
    }

    return subWorkflows;
  }

  async executeSubWorkflow(
    id: string,
    inputs: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<SubWorkflowExecution> {
    logger.info('Executing sub-workflow', { id, inputs });

    const subWorkflow = this.subWorkflows.get(id);
    if (!subWorkflow) {
      throw new Error(`Sub-workflow ${id} not found`);
    }

    // Validate inputs
    const validation = await this.validateInputs(id, inputs);
    if (!validation.isValid) {
      throw new Error(`Invalid inputs: ${validation.errors[0]?.message}`);
    }

    const execution: SubWorkflowExecution = {
      id: this.generateId(),
      parentExecutionId: context.parentExecutionId || '',
      subWorkflowId: id,
      subWorkflowVersion: subWorkflow.version,
      nodeId: '',
      status: 'pending',
      inputs,
      startTime: new Date(),
      logs: []
    };

    this.executions.set(execution.id, execution);

    // Execute async
    this.performExecution(execution, subWorkflow, context);

    return execution;
  }

  private async performExecution(
    execution: SubWorkflowExecution,
    subWorkflow: SubWorkflow,
    context: ExecutionContext
  ) {
    try {
      execution.status = 'running';
      execution.logs.push({
        timestamp: new Date(),
        level: 'info',
        message: 'Sub-workflow execution started'
      });

      // Prepare workflow for execution
      const workflow = {
        id: subWorkflow.id,
        name: subWorkflow.name,
        nodes: this.prepareNodes(subWorkflow, execution.inputs),
        edges: subWorkflow.edges
      };

      // Execute with timeout
      const timeoutMs = subWorkflow.settings.timeout || 30000;
      const workflowExecutor = new WorkflowExecutor(workflow.nodes, workflow.edges);
      const executionPromise = workflowExecutor.execute();

      await Promise.race([
        executionPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Execution timeout')), timeoutMs)
        )
      ]);

      // Extract outputs
      const outputs: Record<string, unknown> = {};
      for (const output of subWorkflow.outputs) {
        const node = workflow.nodes.find(n => n.id === output.mapping.sourceNode);
        if (node?.data?.config?.[output.mapping.sourceField]) {
          outputs[output.name] = node.data.config[output.mapping.sourceField];
        }
      }

      execution.outputs = outputs;
      execution.status = 'success';
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
      
      execution.logs.push({
        timestamp: new Date(),
        level: 'info',
        message: 'Sub-workflow execution completed successfully'
      });

      // Update performance metrics
      this.updatePerformanceMetrics(subWorkflow.id, execution);

    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
      
      execution.logs.push({
        timestamp: new Date(),
        level: 'error',
        message: `Execution failed: ${execution.error}`
      });

      // Handle error based on strategy
      await this.handleExecutionError(execution, subWorkflow, error);
    }
  }

  private prepareNodes(
    subWorkflow: SubWorkflow,
    inputs: Record<string, unknown>
  ): WorkflowNode[] {
    // Create input node
    const inputNode: WorkflowNode = {
      id: 'input',
      type: 'input',
      position: { x: 0, y: 0 },
      data: {
        id: 'input',
        type: 'input',
        label: 'Inputs',
        position: { x: 0, y: 0 },
        icon: 'input',
        color: '#000',
        inputs: 0,
        outputs: 1,
        config: inputs
      }
    };

    // Clone existing nodes and inject variables
    const nodes = [inputNode, ...subWorkflow.nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        config: {
          ...node.data.config,
          // Inject input references
          ...this.resolveInputReferences(node.data.config || {}, inputs)
        }
      }
    }))];

    return nodes;
  }

  private resolveInputReferences(
    nodeConfig: Record<string, unknown>,
    inputs: Record<string, unknown>
  ): Record<string, unknown> {
    const resolved: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(nodeConfig)) {
      if (typeof value === 'string' && value.startsWith('{{inputs.')) {
        const inputKey = value.replace('{{inputs.', '').replace('}}', '');
        resolved[key] = inputs[inputKey] || value;
      }
    }

    return resolved;
  }

  private async handleExecutionError(
    execution: SubWorkflowExecution,
    subWorkflow: SubWorkflow,
    error: unknown
  ) {
    const errorHandling = subWorkflow.errorHandling;

    switch (errorHandling.strategy) {
      case 'retry':
        if (errorHandling.retryPolicy) {
          // Implement retry logic
          logger.info('Retrying sub-workflow execution', {
            executionId: execution.id,
            attempt: 1
          });
        }
        break;

      case 'fallback':
        if (errorHandling.fallbackOutput) {
          execution.outputs = errorHandling.fallbackOutput as Record<string, unknown>;
          execution.status = 'success';
          execution.logs.push({
            timestamp: new Date(),
            level: 'warn',
            message: 'Using fallback output due to error'
          });
        }
        break;
        
      case 'ignore':
        execution.status = 'success';
        execution.outputs = {};
        break;
        
      case 'fail':
      default:
        // Already marked as failed
        break;
    }

    if (errorHandling.notifyOnError) {
      // Send notification
      logger.error('Sub-workflow execution failed', {
        executionId: execution.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async getExecution(executionId: string): Promise<SubWorkflowExecution | null> {
    return this.executions.get(executionId) || null;
  }

  async cancelExecution(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    if (execution.status === 'running') {
      execution.status = 'cancelled';
      execution.endTime = new Date();
      execution.logs.push({
        timestamp: new Date(),
        level: 'warn',
        message: 'Execution cancelled by user'
      });
    }
  }

  async createVersion(subWorkflowId: string, changelog: string): Promise<SubWorkflowVersion> {
    const subWorkflow = this.subWorkflows.get(subWorkflowId);
    if (!subWorkflow) {
      throw new Error(`Sub-workflow ${subWorkflowId} not found`);
    }

    const versions = this.versions.get(subWorkflowId) || [];
    const newVersionNumber = this.incrementVersion(subWorkflow.version);

    const version: SubWorkflowVersion = {
      id: this.generateId(),
      subWorkflowId,
      version: newVersionNumber,
      changelog,
      nodes: [...subWorkflow.nodes],
      edges: [...subWorkflow.edges],
      inputs: [...subWorkflow.inputs],
      outputs: [...subWorkflow.outputs],
      isStable: true,
      isDeprecated: false,
      createdAt: new Date(),
      createdBy: subWorkflow.createdBy
    };

    versions.push(version);
    this.versions.set(subWorkflowId, versions);

    // Update sub-workflow version
    subWorkflow.version = newVersionNumber;

    return version;
  }

  async listVersions(subWorkflowId: string): Promise<SubWorkflowVersion[]> {
    return this.versions.get(subWorkflowId) || [];
  }

  async promoteVersion(subWorkflowId: string, version: string): Promise<void> {
    const subWorkflow = this.subWorkflows.get(subWorkflowId);
    if (!subWorkflow) {
      throw new Error(`Sub-workflow ${subWorkflowId} not found`);
    }

    const versions = this.versions.get(subWorkflowId) || [];
    const versionData = versions.find(v => v.version === version);
    if (!versionData) {
      throw new Error(`Version ${version} not found`);
    }

    // Update sub-workflow with version data
    subWorkflow.version = versionData.version;
    subWorkflow.nodes = versionData.nodes;
    subWorkflow.edges = versionData.edges;
    subWorkflow.inputs = versionData.inputs;
    subWorkflow.outputs = versionData.outputs;
    subWorkflow.updatedAt = new Date();

    // Mark as stable
    versionData.isStable = true;
  }

  async createTest(test: Omit<SubWorkflowTest, 'id'>): Promise<SubWorkflowTest> {
    const newTest: SubWorkflowTest = {
      ...test,
      id: this.generateId()
    };

    this.tests.set(newTest.id, newTest);
    return newTest;
  }

  async runTest(testId: string): Promise<TestResult> {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    logger.info('Running sub-workflow test', { testId, name: test.name });

    const result: TestResult = {
      testId,
      runId: this.generateId(),
      status: 'passed',
      duration: 0,
      results: []
    };

    const startTime = Date.now();
    for (const testCase of test.testCases) {
      if (testCase.skipCondition) {
        // Evaluate skip condition
        const skip = await this.evaluateCondition(testCase.skipCondition);
        if (skip) {
          result.results.push({
            caseId: testCase.id,
            status: 'skipped',
            duration: 0
          });
          continue;
        }
      }

      const caseStartTime = Date.now();
      try {
        // Execute sub-workflow with test inputs
        const execution = await this.executeSubWorkflow(
          test.subWorkflowId,
          testCase.inputs,
          {
            variables: [],
            environment: 'test',
            user: 'test',
            timeout: testCase.timeout
          }
        );

        // Wait for completion
        await this.waitForExecution(execution.id);

        const finalExecution = this.executions.get(execution.id);

        if (finalExecution?.status === 'success') {
          // Compare outputs
          const outputsMatch = this.compareOutputs(
            finalExecution.outputs || {},
            testCase.expectedOutputs
          );
          
          result.results.push({
            caseId: testCase.id,
            status: outputsMatch ? 'passed' : 'failed',
            actualOutputs: finalExecution.outputs,
            error: outputsMatch ? undefined : 'Output mismatch',
            duration: Date.now() - caseStartTime
          });
          
          if (!outputsMatch) {
            result.status = 'failed';
          }
        } else {
          result.results.push({
            caseId: testCase.id,
            status: 'failed',
            error: finalExecution?.error || 'Execution failed',
            duration: Date.now() - caseStartTime
          });
          result.status = 'failed';
        }
      } catch (error) {
        result.results.push({
          caseId: testCase.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Test execution failed',
          duration: Date.now() - caseStartTime
        });
        result.status = 'failed';
      }
    }

    result.duration = Date.now() - startTime;

    // Calculate coverage
    const subWorkflow = this.subWorkflows.get(test.subWorkflowId);
    if (subWorkflow) {
      result.coverage = {
        nodes: this.calculateNodeCoverage(subWorkflow, result),
        edges: this.calculateEdgeCoverage(subWorkflow, result),
        branches: this.calculateBranchCoverage(subWorkflow, result)
      };
    }

    // Store result
    test.lastRun = new Date();
    test.lastResult = result;

    return result;
  }

  async getTestResults(testId: string): Promise<TestResult[]> {
    const test = this.tests.get(testId);
    if (!test || !test.lastResult) {
      return [];
    }
    return [test.lastResult];
  }

  async publishToLibrary(subWorkflowId: string, libraryId: string): Promise<void> {
    const subWorkflow = this.subWorkflows.get(subWorkflowId);
    if (!subWorkflow) {
      throw new Error(`Sub-workflow ${subWorkflowId} not found`);
    }

    subWorkflow.isPublished = true;
    // In real implementation, would publish to library service
    logger.info('Published sub-workflow to library', { subWorkflowId, libraryId });
  }

  async searchLibrary(query: string, filters?: LibraryFilters): Promise<SubWorkflow[]> {
    let results = Array.from(this.subWorkflows.values()).filter(sw => {
      const matchesQuery = !query ||
        sw.name.toLowerCase().includes(query.toLowerCase()) ||
        sw.description?.toLowerCase().includes(query.toLowerCase());
      const isPublished = sw.isPublished === true;
      return matchesQuery && isPublished;
    });

    if (filters) {
      if (filters.category) {
        results = results.filter(sw => sw.metadata.category === filters.category);
      }
      if (filters.tags?.length) {
        results = results.filter(sw =>
          filters.tags!.some(tag => sw.metadata.tags.includes(tag))
        );
      }
    }

    return results;
  }

  async importFromLibrary(subWorkflowId: string): Promise<SubWorkflow> {
    const original = this.subWorkflows.get(subWorkflowId);
    if (!original) {
      throw new Error(`Sub-workflow ${subWorkflowId} not found in library`);
    }

    // Create a copy
    const imported = await this.createSubWorkflow({
      ...original,
      name: `${original.name} (Copy)`,
      isPublished: false,
      parentWorkflowId: undefined,
      createdBy: 'system'
    });

    return imported;
  }

  async findReferences(subWorkflowId: string): Promise<SubWorkflowReference[]> {
    return this.references.get(subWorkflowId) || [];
  }

  async updateReferences(subWorkflowId: string, version: string): Promise<void> {
    const references = this.references.get(subWorkflowId) || [];
    for (const reference of references) {
      reference.version = version;
      reference.lastSync = new Date();
      reference.syncStatus = 'synced';
      
      // Update all workflows using this sub-workflow
      // await this.updateDependentWorkflows(subWorkflowId);
    }
  }

  async checkDependencies(subWorkflowId: string): Promise<DependencyCheck> {
    const subWorkflow = this.subWorkflows.get(subWorkflowId);
    if (!subWorkflow) {
      throw new Error(`Sub-workflow ${subWorkflowId} not found`);
    }

    const check: DependencyCheck = {
      isValid: true,
      missingDependencies: [],
      circularDependencies: [],
      deprecatedDependencies: []
    };

    // Check dependencies
    if (subWorkflow.metadata.dependencies) {
      for (const depId of subWorkflow.metadata.dependencies) {
        const dep = this.subWorkflows.get(depId);
        if (!dep) {
          check.missingDependencies.push(depId);
          check.isValid = false;
        }
      }
    }

    // Check for circular dependencies
    const path: string[] = [];
    const visited = new Set<string>();
    const checkCircular = (id: string): boolean => {
      if (path.includes(id)) {
        check.circularDependencies.push([...path, id]);
        return true;
      }
      
      if (visited.has(id)) return false;
      
      visited.add(id);
      path.push(id);

      const sw = this.subWorkflows.get(id);
      if (sw?.metadata.dependencies) {
        for (const depId of sw.metadata.dependencies) {
          if (checkCircular(depId)) {
            check.isValid = false;
          }
        }
      }

      path.pop();
      return false;
    };

    checkCircular(subWorkflowId);

    return check;
  }

  async getPerformanceMetrics(subWorkflowId: string): Promise<SubWorkflowPerformance> {
    // Check cache
    const cached = this.performanceCache.get(subWorkflowId);
    if (cached) {
      return cached;
    }

    // Calculate metrics from executions
    const allExecutions = Array.from(this.executions.values())
      .filter(e => e.subWorkflowId === subWorkflowId && e.status !== 'pending');

    if (allExecutions.length === 0) {
      return {
        subWorkflowId,
        metrics: {
          avgExecutionTime: 0,
          p95ExecutionTime: 0,
          p99ExecutionTime: 0,
          successRate: 0,
          errorRate: 0,
          throughput: 0
        },
        bottlenecks: [],
        recommendations: []
      };
    }

    // Calculate metrics
    const executionTimes = allExecutions
      .filter(e => e.duration)
      .map(e => e.duration!)
      .sort((a, b) => a - b);

    const successCount = allExecutions.filter(e => e.status === 'success').length;
    const errorCount = allExecutions.filter(e => e.status === 'failed').length;

    const performance: SubWorkflowPerformance = {
      subWorkflowId,
      metrics: {
        avgExecutionTime: executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length,
        p95ExecutionTime: executionTimes[Math.floor(executionTimes.length * 0.95)] || 0,
        p99ExecutionTime: executionTimes[Math.floor(executionTimes.length * 0.99)] || 0,
        successRate: (successCount / allExecutions.length) * 100,
        errorRate: (errorCount / allExecutions.length) * 100,
        throughput: allExecutions.length / (Date.now() - allExecutions[0].startTime.getTime()) * 60000
      },
      bottlenecks: [],
      recommendations: []
    };

    // Generate recommendations
    if (performance.metrics.errorRate > 10) {
      performance.recommendations.push('High error rate detected. Review error handling and input validation.');
    }
    if (performance.metrics.avgExecutionTime > 30000) {
      performance.recommendations.push('Long execution times. Consider optimizing workflow logic or breaking into smaller sub-workflows.');
    }
    if (performance.metrics.successRate < 90) {
      performance.recommendations.push('Low success rate. Review failure patterns and add retry logic.');
    }

    // Cache for 5 minutes
    this.performanceCache.set(subWorkflowId, performance);
    setTimeout(() => this.performanceCache.delete(subWorkflowId), 300000);

    return performance;
  }

  async startDebugSession(executionId: string): Promise<SubWorkflowDebugSession> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    const session: SubWorkflowDebugSession = {
      id: this.generateId(),
      subWorkflowId: execution.subWorkflowId,
      executionId,
      breakpoints: new Set(),
      variables: execution.inputs,
      callStack: [],
      stepMode: 'none'
    };

    this.debugSessions.set(session.id, session);
    return session;
  }

  async stepDebugger(
    sessionId: string,
    action: 'over' | 'into' | 'out' | 'continue'
  ): Promise<void> {
    const session = this.debugSessions.get(sessionId);
    if (!session) {
      throw new Error(`Debug session ${sessionId} not found`);
    }

    session.stepMode = action === 'continue' ? 'none' : action;
    // In real implementation, would control execution flow
  }

  async validateSubWorkflow(subWorkflow: SubWorkflow): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Validate basic structure
    if (!subWorkflow.name) {
      result.errors.push({
        type: 'missing_field',
        message: 'Sub-workflow name is required'
      });
      result.isValid = false;
    }

    if (!subWorkflow.inputs || subWorkflow.inputs.length === 0) {
      result.warnings.push({
        type: 'no_inputs',
        message: 'Sub-workflow has no inputs defined',
        suggestion: 'Add input parameters to make the sub-workflow reusable'
      });
    }

    if (!subWorkflow.outputs || subWorkflow.outputs.length === 0) {
      result.warnings.push({
        type: 'no_outputs',
        message: 'Sub-workflow has no outputs defined',
        suggestion: 'Add output mappings to return results'
      });
    }

    // Validate nodes and edges
    if (!subWorkflow.nodes || subWorkflow.nodes.length === 0) {
      result.errors.push({
        type: 'no_nodes',
        message: 'Sub-workflow must have at least one node'
      });
      result.isValid = false;
    }

    // Check output mappings
    for (const output of subWorkflow.outputs) {
      const nodeExists = subWorkflow.nodes.some(n => n.id === output.mapping.sourceNode);
      if (!nodeExists) {
        result.errors.push({
          type: 'invalid_mapping',
          message: `Output "${output.name}" maps to non-existent node "${output.mapping.sourceNode}"`,
          field: output.name
        });
        result.isValid = false;
      }
    }

    // Check for unreachable nodes
    const reachable = this.findReachableNodes(subWorkflow.nodes, subWorkflow.edges);
    const unreachableNodes = subWorkflow.nodes.filter(n => !reachable.has(n.id));
    if (unreachableNodes.length > 0) {
      result.warnings.push({
        type: 'unreachable_nodes',
        message: `${unreachableNodes.length} nodes are not connected to the workflow`,
        suggestion: 'Connect all nodes or remove unused ones'
      });
    }

    return result;
  }

  async validateInputs(
    subWorkflowId: string,
    inputs: Record<string, unknown>
  ): Promise<ValidationResult> {
    const subWorkflow = this.subWorkflows.get(subWorkflowId);
    if (!subWorkflow) {
      return {
        isValid: false,
        errors: [{ type: 'not_found', message: 'Sub-workflow not found' }],
        warnings: []
      };
    }

    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check required inputs
    for (const input of subWorkflow.inputs) {
      if (input.required && !(input.name in inputs)) {
        result.errors.push({
          type: 'missing_input',
          message: `Required input "${input.name}" is missing`,
          field: input.name
        });
        result.isValid = false;
      }

      // Validate type
      if (input.name in inputs) {
        const value = inputs[input.name];
        if (!this.validateType(value, input.type)) {
          result.errors.push({
            type: 'type_mismatch',
            message: `Input "${input.name}" expects type "${input.type}" but got "${typeof value}"`,
            field: input.name
          });
          result.isValid = false;
        }

        // Custom validation
        if (input.validation && !this.validateInput(value, input.validation)) {
          result.errors.push({
            type: 'validation_failed',
            message: input.validation.errorMessage || `Input "${input.name}" validation failed`,
            field: input.name
          });
          result.isValid = false;
        }
      }
    }

    // Check for unknown inputs
    const knownInputs = new Set(subWorkflow.inputs.map(i => i.name));
    for (const inputName of Object.keys(inputs)) {
      if (!knownInputs.has(inputName)) {
        result.warnings.push({
          type: 'unknown_input',
          message: `Unknown input "${inputName}" will be ignored`
        });
      }
    }

    return result;
  }

  // Private helper methods
  private incrementVersion(version: string): string {
    const parts = version.split('.').map(Number);
    const patch = (parts[2] || 0) + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }

  private async waitForExecution(executionId: string, timeout = 60000): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const execution = this.executions.get(executionId);
      if (!execution || execution.status === 'pending' || execution.status === 'running') {
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        return;
      }
    }
    
    throw new Error('Execution timeout');
  }

  private compareOutputs(actual: Record<string, unknown>, expected: Record<string, unknown>): boolean {
    // Deep comparison
    return JSON.stringify(actual) === JSON.stringify(expected);
  }

  private async evaluateCondition(condition: string): Promise<boolean> {
    // SECURITY FIX: Use SecureExpressionEngineV2 instead of new Function()
    try {
      const result = SecureExpressionEngineV2.evaluateExpression(
        condition,
        { Math, Array, Object, String, Number, Boolean },
        { timeout: 1000 }
      );
      return result.success ? Boolean(result.value) : false;
    } catch {
      return false;
    }
  }

  private calculateNodeCoverage(subWorkflow: SubWorkflow, result: TestResult): number {
    // Placeholder calculation
    return Math.round((result.results.filter(r => r.status === 'passed').length / subWorkflow.nodes.length) * 100);
  }

  private calculateEdgeCoverage(subWorkflow: SubWorkflow, result: TestResult): number {
    // Placeholder calculation
    return Math.round((result.results.filter(r => r.status === 'passed').length / Math.max(subWorkflow.edges.length, 1)) * 100);
  }

  private calculateBranchCoverage(subWorkflow: SubWorkflow, result: TestResult): number {
    // Placeholder calculation
    return Math.round((result.results.filter(r => r.status === 'passed').length / Math.max(subWorkflow.nodes.length, 1)) * 100);
  }

  private findReachableNodes(nodes: WorkflowNode[], edges: WorkflowEdge[]): Set<string> {
    const reachable = new Set<string>();
    const adjacency = new Map<string, string[]>();

    // Build adjacency list
    for (const edge of edges) {
      if (!adjacency.has(edge.source)) {
        adjacency.set(edge.source, []);
      }
      adjacency.get(edge.source)!.push(edge.target);
    }

    // Find input nodes (nodes with no incoming edges)
    const incomingEdges = new Set(edges.map(e => e.target));
    const startNodes = nodes.filter(n => !incomingEdges.has(n.id));

    // DFS from start nodes
    const visit = (nodeId: string) => {
      if (reachable.has(nodeId)) return;
      reachable.add(nodeId);

      const neighbors = adjacency.get(nodeId) || [];
      for (const neighbor of neighbors) {
        visit(neighbor);
      }
    };
    
    for (const node of startNodes) {
      visit(node.id);
    }
    
    return reachable;
  }

  private validateType(value: unknown, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'date':
        return value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)));
      case 'binary':
        return value instanceof ArrayBuffer || value instanceof Uint8Array;
      case 'any':
        return true;
      default:
        return false;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private validateInput(_value: unknown, _validation: unknown): boolean {
    // Implement validation logic
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private updatePerformanceMetrics(subWorkflowId: string, _execution: SubWorkflowExecution) {
    // Update performance cache
    this.performanceCache.delete(subWorkflowId);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}