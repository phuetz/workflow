/**
 * Custom Test Assertions
 * Reusable assertion helpers for tests
 */

import { expect } from 'vitest';
import { Workflow, User, WorkflowExecution } from '@prisma/client';

export class TestAssertions {
  /**
   * Assert that a workflow has required fields
   */
  static assertValidWorkflow(workflow: Workflow): void {
    expect(workflow).toBeDefined();
    expect(workflow.id).toBeDefined();
    expect(workflow.name).toBeTruthy();
    expect(workflow.userId).toBeDefined();
    expect(workflow.nodes).toBeInstanceOf(Array);
    expect(workflow.edges).toBeInstanceOf(Array);
    expect(workflow.status).toBeDefined();
    expect(workflow.createdAt).toBeInstanceOf(Date);
    expect(workflow.updatedAt).toBeInstanceOf(Date);
  }

  /**
   * Assert that a user has required fields
   */
  static assertValidUser(user: User): void {
    expect(user).toBeDefined();
    expect(user.id).toBeDefined();
    expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(user.firstName).toBeTruthy();
    expect(user.lastName).toBeTruthy();
    expect(user.role).toBeDefined();
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  }

  /**
   * Assert that an execution has required fields
   */
  static assertValidExecution(execution: WorkflowExecution): void {
    expect(execution).toBeDefined();
    expect(execution.id).toBeDefined();
    expect(execution.workflowId).toBeDefined();
    expect(execution.userId).toBeDefined();
    expect(execution.status).toBeDefined();
    expect(execution.startedAt).toBeInstanceOf(Date);
    expect(execution.trigger).toBeDefined();
  }

  /**
   * Assert that a response is successful
   */
  static assertSuccessResponse(response: { status: number; data?: unknown; error?: unknown }): void {
    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(300);
    expect(response.error).toBeUndefined();
    expect(response.data).toBeDefined();
  }

  /**
   * Assert that a response is an error
   */
  static assertErrorResponse(response: { status: number; data?: unknown; error?: unknown }, expectedStatus?: number): void {
    expect(response.status).toBeGreaterThanOrEqual(400);
    if (expectedStatus) {
      expect(response.status).toBe(expectedStatus);
    }
    expect(response.error).toBeDefined();
  }

  /**
   * Assert that an array contains items matching a condition
   */
  static assertArrayContains<T>(array: T[], condition: (item: T) => boolean, message?: string): void {
    const found = array.some(condition);
    expect(found).toBe(true);
    if (!found && message) {
      throw new Error(message);
    }
  }

  /**
   * Assert that an object matches a partial structure
   */
  static assertObjectMatches<T extends Record<string, unknown>>(obj: T, partial: Partial<T>): void {
    Object.entries(partial).forEach(([key, value]) => {
      expect(obj[key]).toEqual(value);
    });
  }

  /**
   * Assert that execution completed successfully
   */
  static assertExecutionSuccess(execution: WorkflowExecution): void {
    expect(execution.status).toBe('SUCCESS');
    expect(execution.finishedAt).toBeInstanceOf(Date);
    expect(execution.error).toBeNull();
    expect(execution.duration).toBeGreaterThan(0);
  }

  /**
   * Assert that execution failed
   */
  static assertExecutionFailed(execution: WorkflowExecution): void {
    expect(execution.status).toBe('FAILED');
    expect(execution.finishedAt).toBeInstanceOf(Date);
    expect(execution.error).toBeDefined();
  }

  /**
   * Assert that a date is within a range
   */
  static assertDateInRange(date: Date, start: Date, end: Date): void {
    expect(date.getTime()).toBeGreaterThanOrEqual(start.getTime());
    expect(date.getTime()).toBeLessThanOrEqual(end.getTime());
  }

  /**
   * Assert that two dates are close (within tolerance)
   */
  static assertDatesClose(date1: Date, date2: Date, toleranceMs: number = 1000): void {
    const diff = Math.abs(date1.getTime() - date2.getTime());
    expect(diff).toBeLessThanOrEqual(toleranceMs);
  }

  /**
   * Assert that an operation took less than specified time
   */
  static async assertPerformance<T>(
    operation: () => Promise<T>,
    maxDurationMs: number,
    message?: string
  ): Promise<T> {
    const start = Date.now();
    const result = await operation();
    const duration = Date.now() - start;

    expect(duration).toBeLessThanOrEqual(maxDurationMs);
    if (duration > maxDurationMs && message) {
      throw new Error(`${message} (took ${duration}ms, expected <${maxDurationMs}ms)`);
    }

    return result;
  }
}
