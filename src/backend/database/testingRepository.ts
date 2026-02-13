/**
 * Testing Repository
 * Database operations for test case and execution management
 */

import { TestCase, TestSuite, TestExecution, TestEnvironment } from '../../services/TestingService';
import { logger } from '../../services/SimpleLogger';

export interface TestCaseQuery {
  workflowId?: string;
  type?: string;
  enabled?: boolean;
  tags?: string[];
  environment?: string;
  createdBy?: string;
  limit?: number;
  offset?: number;
}

export interface TestExecutionQuery {
  testCaseId?: string;
  suiteId?: string;
  status?: string;
  environment?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export class TestingRepository {
  private db: any; // Database connection

  constructor(dbConnection: any) {
    this.db = dbConnection;
  }

  // Test Cases
  async createTestCase(testCase: Omit<TestCase, 'id' | 'createdAt' | 'updatedAt'>): Promise<TestCase> {
    const id = 'test_' + Math.random().toString(36).substring(2, 15);
    const now = new Date();

    const fullTestCase: TestCase = {
      ...testCase,
      id,
      createdAt: now,
      updatedAt: now
    };

    try {
      const query = `
        INSERT INTO test_cases (
          id, name, description, workflow_id, type, enabled, tags,
          setup, steps, assertions, cleanup, timeout, retry_count,
          retry_delay, schedule, environment, variables, dependencies,
          created_at, updated_at, created_by
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `;

      await this.db.execute(query, [
        fullTestCase.id,
        fullTestCase.name,
        fullTestCase.description,
        fullTestCase.workflowId,
        fullTestCase.type,
        fullTestCase.enabled,
        JSON.stringify(fullTestCase.tags),
        JSON.stringify(fullTestCase.setup),
        JSON.stringify(fullTestCase.steps),
        JSON.stringify(fullTestCase.assertions),
        JSON.stringify(fullTestCase.cleanup),
        fullTestCase.timeout,
        fullTestCase.retryCount,
        fullTestCase.retryDelay,
        JSON.stringify(fullTestCase.schedule),
        fullTestCase.environment,
        JSON.stringify(fullTestCase.variables),
        JSON.stringify(fullTestCase.dependencies),
        fullTestCase.createdAt,
        fullTestCase.updatedAt,
        fullTestCase.createdBy
      ]);

      return fullTestCase;
    } catch (error) {
      logger.error('Error creating test case:', error);
      throw new Error(`Failed to create test case: ${error}`);
    }
  }

  async updateTestCase(id: string, updates: Partial<TestCase>): Promise<TestCase> {
    const existingTestCase = await this.getTestCaseById(id);

    if (!existingTestCase) {
      throw new Error(`Test case with id ${id} not found`);
    }

    const updatedTestCase: TestCase = {
      ...existingTestCase,
      ...updates,
      updatedAt: new Date()
    };

    try {
      const query = `
        UPDATE test_cases
        SET name = ?, description = ?, workflow_id = ?, type = ?, enabled = ?,
            tags = ?, setup = ?, steps = ?, assertions = ?, cleanup = ?,
            timeout = ?, retry_count = ?, retry_delay = ?, schedule = ?,
            environment = ?, variables = ?, dependencies = ?, updated_at = ?
        WHERE id = ?
      `;

      await this.db.execute(query, [
        updatedTestCase.name,
        updatedTestCase.description,
        updatedTestCase.workflowId,
        updatedTestCase.type,
        updatedTestCase.enabled,
        JSON.stringify(updatedTestCase.tags),
        JSON.stringify(updatedTestCase.setup),
        JSON.stringify(updatedTestCase.steps),
        JSON.stringify(updatedTestCase.assertions),
        JSON.stringify(updatedTestCase.cleanup),
        updatedTestCase.timeout,
        updatedTestCase.retryCount,
        updatedTestCase.retryDelay,
        JSON.stringify(updatedTestCase.schedule),
        updatedTestCase.environment,
        JSON.stringify(updatedTestCase.variables),
        JSON.stringify(updatedTestCase.dependencies),
        updatedTestCase.updatedAt,
        id
      ]);

      return updatedTestCase;
    } catch (error) {
      logger.error('Error updating test case:', error);
      throw new Error(`Failed to update test case: ${error}`);
    }
  }

  async getTestCaseById(id: string): Promise<TestCase | null> {
    try {
      const result = await this.db.query('SELECT * FROM test_cases WHERE id = ?', [id]);

      if (result.length === 0) {
        return null;
      }

      return this.mapRowToTestCase(result[0]);
    } catch (error) {
      logger.error('Error fetching test case:', error);
      throw new Error(`Failed to fetch test case: ${error}`);
    }
  }

  async getTestCases(query: TestCaseQuery = {}): Promise<TestCase[]> {
    try {
      let sql = 'SELECT * FROM test_cases WHERE 1=1';
      const params: any[] = [];

      if (query.workflowId) {
        sql += ` AND workflow_id = ?`;
        params.push(query.workflowId);
      }

      if (query.type) {
        sql += ` AND type = ?`;
        params.push(query.type);
      }

      if (query.enabled !== undefined) {
        sql += ` AND enabled = ?`;
        params.push(query.enabled);
      }

      if (query.environment) {
        sql += ` AND environment = ?`;
        params.push(query.environment);
      }

      if (query.createdBy) {
        sql += ` AND created_by = ?`;
        params.push(query.createdBy);
      }

      if (query.tags && query.tags.length > 0) {
        const tagConditions = query.tags.map(() => 'tags LIKE ?').join(' OR ');
        sql += ` AND (${tagConditions})`;
        query.tags.forEach(tag => params.push(`%"${tag}"%`));
      }

      sql += ` ORDER BY created_at DESC`;

      if (query.limit) {
        sql += ` LIMIT ?`;
        params.push(query.limit);
      }

      if (query.offset) {
        sql += ` OFFSET ?`;
        params.push(query.offset);
      }

      const result = await this.db.query(sql, params);
      return result.map((row: any) => this.mapRowToTestCase(row));
    } catch (error) {
      logger.error('Error fetching test cases:', error);
      throw new Error(`Failed to fetch test cases: ${error}`);
    }
  }

  async deleteTestCase(id: string): Promise<boolean> {
    try {
      const result = await this.db.execute('DELETE FROM test_cases WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error deleting test case:', error);
      throw new Error(`Failed to delete test case: ${error}`);
    }
  }

  // Test Suites
  async createTestSuite(testSuite: Omit<TestSuite, 'id' | 'createdAt' | 'updatedAt'>): Promise<TestSuite> {
    const id = 'suite_' + Math.random().toString(36).substring(2, 15);
    const now = new Date();

    const fullTestSuite: TestSuite = {
      ...testSuite,
      id,
      createdAt: now,
      updatedAt: now
    };

    try {
      const query = `
        INSERT INTO test_suites (
          id, name, description, test_case_ids, tags, environment,
          parallel_execution, continue_on_failure, setup, cleanup,
          schedule, created_at, updated_at, created_by, max_parallel
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await this.db.execute(query, [
        fullTestSuite.id,
        fullTestSuite.name,
        fullTestSuite.description,
        JSON.stringify(fullTestSuite.testCases),
        JSON.stringify(fullTestSuite.tags),
        fullTestSuite.environment,
        fullTestSuite.parallel,
        fullTestSuite.continueOnFailure,
        JSON.stringify(fullTestSuite.setup),
        JSON.stringify(fullTestSuite.cleanup),
        JSON.stringify(fullTestSuite.schedule),
        fullTestSuite.createdAt,
        fullTestSuite.updatedAt,
        fullTestSuite.createdBy,
        fullTestSuite.maxParallel
      ]);

      return fullTestSuite;
    } catch (error) {
      logger.error('Error creating test suite:', error);
      throw new Error(`Failed to create test suite: ${error}`);
    }
  }

  async getTestSuites(): Promise<TestSuite[]> {
    try {
      const result = await this.db.query('SELECT * FROM test_suites ORDER BY created_at DESC');
      return result.map((row: any) => this.mapRowToTestSuite(row));
    } catch (error) {
      logger.error('Error fetching test suites:', error);
      throw new Error(`Failed to fetch test suites: ${error}`);
    }
  }

  // Test Executions
  async createTestExecution(execution: Omit<TestExecution, 'id' | 'startTime'>): Promise<TestExecution> {
    const id = 'exec_' + Math.random().toString(36).substring(2, 15);

    const fullExecution: TestExecution = {
      ...execution,
      id,
      startTime: new Date()
    };

    try {
      const query = `
        INSERT INTO test_executions (
          id, test_case_id, suite_id, status, environment, result,
          logs, assertions, error, start_time, end_time, duration, triggered_by, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await this.db.execute(query, [
        fullExecution.id,
        fullExecution.testCaseId,
        fullExecution.testSuiteId || null,
        fullExecution.status,
        fullExecution.environment,
        JSON.stringify(fullExecution.results),
        JSON.stringify(fullExecution.logs),
        JSON.stringify(fullExecution.assertions),
        fullExecution.error || null,
        fullExecution.startTime,
        fullExecution.endTime || null,
        fullExecution.duration || null,
        fullExecution.triggeredBy,
        JSON.stringify(fullExecution.metadata || {})
      ]);

      return fullExecution;
    } catch (error) {
      logger.error('Error creating test execution:', error);
      throw new Error(`Failed to create test execution: ${error}`);
    }
  }

  async updateTestExecution(id: string, updates: Partial<TestExecution>): Promise<TestExecution> {
    try {
      const existingExecution = await this.getTestExecutionById(id);

      if (!existingExecution) {
        throw new Error(`Test execution with id ${id} not found`);
      }

      const updatedExecution: TestExecution = {
        ...existingExecution,
        ...updates
      };

      const query = `
        UPDATE test_executions
        SET status = ?, result = ?, logs = ?, assertions = ?, error = ?,
            end_time = ?, duration = ?, metadata = ?
        WHERE id = ?
      `;

      await this.db.execute(query, [
        updatedExecution.status,
        JSON.stringify(updatedExecution.results),
        JSON.stringify(updatedExecution.logs),
        JSON.stringify(updatedExecution.assertions),
        updatedExecution.error || null,
        updatedExecution.endTime || null,
        updatedExecution.duration || null,
        JSON.stringify(updatedExecution.metadata || {}),
        id
      ]);

      return updatedExecution;
    } catch (error) {
      logger.error('Error updating test execution:', error);
      throw new Error(`Failed to update test execution: ${error}`);
    }
  }

  async getTestExecutionById(id: string): Promise<TestExecution | null> {
    try {
      const result = await this.db.query('SELECT * FROM test_executions WHERE id = ?', [id]);

      if (result.length === 0) {
        return null;
      }

      return this.mapRowToTestExecution(result[0]);
    } catch (error) {
      logger.error('Error fetching test execution:', error);
      throw new Error(`Failed to fetch test execution: ${error}`);
    }
  }

  async getTestExecutions(query: TestExecutionQuery = {}): Promise<TestExecution[]> {
    try {
      let sql = 'SELECT * FROM test_executions WHERE 1=1';
      const params: any[] = [];

      if (query.testCaseId) {
        sql += ` AND test_case_id = ?`;
        params.push(query.testCaseId);
      }

      if (query.suiteId) {
        sql += ` AND suite_id = ?`;
        params.push(query.suiteId);
      }

      if (query.status) {
        sql += ` AND status = ?`;
        params.push(query.status);
      }

      if (query.environment) {
        sql += ` AND environment = ?`;
        params.push(query.environment);
      }

      if (query.dateFrom) {
        sql += ` AND start_time >= ?`;
        params.push(query.dateFrom);
      }

      if (query.dateTo) {
        sql += ` AND start_time <= ?`;
        params.push(query.dateTo);
      }

      sql += ` ORDER BY start_time DESC`;

      if (query.limit) {
        sql += ` LIMIT ?`;
        params.push(query.limit);
      }

      if (query.offset) {
        sql += ` OFFSET ?`;
        params.push(query.offset);
      }

      const result = await this.db.query(sql, params);
      return result.map((row: any) => this.mapRowToTestExecution(row));
    } catch (error) {
      logger.error('Error fetching test executions:', error);
      throw new Error(`Failed to fetch test executions: ${error}`);
    }
  }

  // Test Environments
  async createTestEnvironment(environment: TestEnvironment): Promise<TestEnvironment> {
    try {
      const query = `
        INSERT INTO test_environments (
          id, name, description, type, config, isolation, cleanup, active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await this.db.execute(query, [
        environment.id,
        environment.name,
        environment.description,
        environment.type,
        JSON.stringify(environment.config),
        environment.isolation,
        environment.cleanup,
        environment.active
      ]);

      return environment;
    } catch (error) {
      logger.error('Error creating test environment:', error);
      throw new Error(`Failed to create test environment: ${error}`);
    }
  }

  async getTestEnvironments(): Promise<TestEnvironment[]> {
    try {
      const result = await this.db.query('SELECT * FROM test_environments ORDER BY created_at DESC');
      return result.map((row: any) => this.mapRowToTestEnvironment(row));
    } catch (error) {
      logger.error('Error fetching test environments:', error);
      throw new Error(`Failed to fetch test environments: ${error}`);
    }
  }

  // Helper methods for mapping database rows to objects
  private mapRowToTestCase(row: any): TestCase {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      workflowId: row.workflow_id,
      type: row.type,
      enabled: Boolean(row.enabled),
      tags: JSON.parse(row.tags || '[]'),
      setup: JSON.parse(row.setup || '{}'),
      steps: JSON.parse(row.steps || '[]'),
      assertions: JSON.parse(row.assertions || '[]'),
      cleanup: JSON.parse(row.cleanup || '{}'),
      timeout: row.timeout,
      retryCount: row.retry_count,
      retryDelay: row.retry_delay,
      schedule: JSON.parse(row.schedule || 'null'),
      environment: row.environment,
      variables: JSON.parse(row.variables || '{}'),
      dependencies: JSON.parse(row.dependencies || '[]'),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      createdBy: row.created_by
    };
  }

  private mapRowToTestSuite(row: any): TestSuite {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      testCases: JSON.parse(row.test_case_ids || '[]'),
      tags: JSON.parse(row.tags || '[]'),
      environment: row.environment,
      parallel: Boolean(row.parallel_execution),
      maxParallel: row.max_parallel || 3,
      continueOnFailure: Boolean(row.continue_on_failure),
      setup: JSON.parse(row.setup || '{}'),
      cleanup: JSON.parse(row.cleanup || '{}'),
      schedule: JSON.parse(row.schedule || 'null'),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      createdBy: row.created_by
    };
  }

  private mapRowToTestExecution(row: any): TestExecution {
    return {
      id: row.id,
      testCaseId: row.test_case_id,
      testSuiteId: row.suite_id,
      status: row.status,
      environment: row.environment,
      results: JSON.parse(row.result || '[]'),
      assertions: JSON.parse(row.assertions || '[]'),
      logs: JSON.parse(row.logs || '[]'),
      error: row.error,
      startTime: new Date(row.start_time),
      endTime: row.end_time ? new Date(row.end_time) : undefined,
      duration: row.duration,
      triggeredBy: row.triggered_by,
      metadata: JSON.parse(row.metadata || '{}')
    };
  }

  private mapRowToTestEnvironment(row: any): TestEnvironment {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      config: JSON.parse(row.config || '{}'),
      isolation: Boolean(row.isolation),
      cleanup: Boolean(row.cleanup),
      active: Boolean(row.active)
    };
  }

  // Database schema initialization
  async initializeSchema(): Promise<void> {
    const schemas = [
      `
        CREATE TABLE IF NOT EXISTS test_cases (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          workflow_id VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL,
          enabled BOOLEAN DEFAULT true,
          tags JSON,
          setup JSON,
          steps JSON,
          assertions JSON,
          cleanup JSON,
          timeout INTEGER DEFAULT 30000,
          retry_count INTEGER DEFAULT 0,
          retry_delay INTEGER DEFAULT 1000,
          schedule JSON,
          environment VARCHAR(100) NOT NULL,
          variables JSON,
          dependencies JSON,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by VARCHAR(255) NOT NULL,
          INDEX idx_workflow_id (workflow_id),
          INDEX idx_type (type),
          INDEX idx_environment (environment),
          INDEX idx_enabled (enabled)
        )
      `,
      `
        CREATE TABLE IF NOT EXISTS test_suites (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          test_case_ids JSON,
          tags JSON,
          environment VARCHAR(100) NOT NULL,
          parallel_execution BOOLEAN DEFAULT false,
          max_parallel INTEGER DEFAULT 3,
          continue_on_failure BOOLEAN DEFAULT false,
          setup JSON,
          cleanup JSON,
          schedule JSON,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by VARCHAR(255) NOT NULL,
          INDEX idx_environment (environment)
        )
      `,
      `
        CREATE TABLE IF NOT EXISTS test_executions (
          id VARCHAR(255) PRIMARY KEY,
          test_case_id VARCHAR(255),
          suite_id VARCHAR(255),
          status VARCHAR(50) NOT NULL,
          environment VARCHAR(100) NOT NULL,
          result JSON,
          logs JSON,
          assertions JSON,
          error TEXT,
          start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          end_time TIMESTAMP,
          duration INTEGER,
          triggered_by VARCHAR(255) NOT NULL,
          metadata JSON,
          INDEX idx_test_case_id (test_case_id),
          INDEX idx_suite_id (suite_id),
          INDEX idx_status (status),
          INDEX idx_environment (environment),
          INDEX idx_start_time (start_time),
          FOREIGN KEY (test_case_id) REFERENCES test_cases(id) ON DELETE CASCADE,
          FOREIGN KEY (suite_id) REFERENCES test_suites(id) ON DELETE CASCADE
        )
      `,
      `
        CREATE TABLE IF NOT EXISTS test_environments (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          description TEXT,
          type VARCHAR(50) NOT NULL,
          config JSON,
          isolation BOOLEAN DEFAULT true,
          cleanup BOOLEAN DEFAULT true,
          active BOOLEAN DEFAULT true,
          INDEX idx_name (name),
          INDEX idx_type (type)
        )
      `
    ];

    try {
      for (const schema of schemas) {
        await this.db.execute(schema);
      }
      logger.info('Testing database schema initialized successfully');
    } catch (error) {
      logger.error('Error initializing testing database schema:', error);
      throw new Error(`Failed to initialize database schema: ${error}`);
    }
  }
}
