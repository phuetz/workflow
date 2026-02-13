/**
 * Contract Testing Framework
 * Consumer-driven contract testing with Pact-style implementation
 */

import { logger } from '../../services/SimpleLogger';
import type {
  ContractTest,
  ProviderContract,
  ConsumerContract,
  ContractVerificationResult,
  EndpointVerificationResult,
  ValidationError,
  ValidationWarning,
  BreakingChange,
  JSONSchema,
  ContractEndpoint,
  ContractExpectation,
} from '../types/testing';

export class ContractTesting {
  private contracts: Map<string, ContractTest> = new Map();
  private verificationHistory: Map<string, ContractVerificationResult[]> = new Map();

  /**
   * Create a new contract test
   */
  createContract(
    provider: ProviderContract,
    consumer: ConsumerContract
  ): ContractTest {
    const contract: ContractTest = {
      id: this.generateId(),
      name: `${consumer.name} -> ${provider.name}`,
      description: `Contract between ${consumer.name} and ${provider.name}`,
      provider,
      consumer,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.contracts.set(contract.id, contract);
    logger.debug(`[ContractTesting] Created contract: ${contract.name}`);

    return contract;
  }

  /**
   * Verify a contract by executing all expectations against the provider
   */
  async verify(
    contractId: string,
    executor: (endpoint: string, method: string, request?: any) => Promise<{ response: any; statusCode: number }>
  ): Promise<ContractVerificationResult> {
    const contract = this.contracts.get(contractId);
    if (!contract) {
      throw new Error(`Contract ${contractId} not found`);
    }

    contract.status = 'running';
    const startTime = Date.now();
    const results: EndpointVerificationResult[] = [];
    const breakingChanges: BreakingChange[] = [];

    // Verify each consumer expectation
    for (const expectation of contract.consumer.expectations) {
      const stepStartTime = Date.now();

      try {
        // Find the corresponding provider endpoint
        const providerEndpoint = contract.provider.endpoints.find(
          (ep) => ep.path === expectation.endpoint && ep.method === expectation.method
        );

        if (!providerEndpoint) {
          results.push({
            endpoint: expectation.endpoint,
            method: expectation.method,
            passed: false,
            errors: [
              {
                path: 'endpoint',
                message: 'Endpoint not found in provider contract',
                expected: `${expectation.method} ${expectation.endpoint}`,
                actual: 'not found',
                severity: 'critical',
              },
            ],
            warnings: [],
            duration: Date.now() - stepStartTime,
          });

          breakingChanges.push({
            type: 'removed_endpoint',
            endpoint: expectation.endpoint,
            path: expectation.endpoint,
            oldValue: `${expectation.method} ${expectation.endpoint}`,
            newValue: null,
            severity: 'breaking',
            message: `Endpoint ${expectation.method} ${expectation.endpoint} was removed`,
          });

          continue;
        }

        // Execute the request
        const { response, statusCode } = await executor(
          expectation.endpoint,
          expectation.method,
          expectation.request
        );

        // Verify the response
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        // Check status code
        if (statusCode !== expectation.expectedStatusCode) {
          errors.push({
            path: 'statusCode',
            message: 'Status code mismatch',
            expected: expectation.expectedStatusCode,
            actual: statusCode,
            severity: 'error',
          });

          breakingChanges.push({
            type: 'changed_status_code',
            endpoint: expectation.endpoint,
            path: 'statusCode',
            oldValue: expectation.expectedStatusCode,
            newValue: statusCode,
            severity: 'breaking',
            message: `Status code changed from ${expectation.expectedStatusCode} to ${statusCode}`,
          });
        }

        // Validate response against schema
        const schemaErrors = this.validateSchema(
          response,
          providerEndpoint.responseSchema,
          'response',
          providerEndpoint.responseSchema
        );
        errors.push(...schemaErrors.errors);
        warnings.push(...schemaErrors.warnings);

        // Check for breaking changes in schema
        breakingChanges.push(...schemaErrors.breakingChanges);

        results.push({
          endpoint: expectation.endpoint,
          method: expectation.method,
          passed: errors.filter((e) => e.severity === 'error' || e.severity === 'critical').length === 0,
          errors,
          warnings,
          duration: Date.now() - stepStartTime,
        });
      } catch (error) {
        results.push({
          endpoint: expectation.endpoint,
          method: expectation.method,
          passed: false,
          errors: [
            {
              path: 'execution',
              message: error instanceof Error ? error.message : String(error),
              expected: 'successful execution',
              actual: 'error',
              severity: 'critical',
            },
          ],
          warnings: [],
          duration: Date.now() - stepStartTime,
        });
      }
    }

    const passed = results.every((r) => r.passed);
    const duration = Date.now() - startTime;

    const verificationResult: ContractVerificationResult = {
      passed,
      contractId,
      timestamp: Date.now(),
      duration,
      results,
      summary: {
        total: results.length,
        passed: results.filter((r) => r.passed).length,
        failed: results.filter((r) => !r.passed).length,
        skipped: 0,
      },
      breakingChanges: breakingChanges.filter((bc) => bc.severity === 'breaking'),
    };

    // Update contract status
    contract.status = passed ? 'passed' : 'failed';
    contract.updatedAt = Date.now();

    // Store verification history
    const history = this.verificationHistory.get(contractId) || [];
    history.push(verificationResult);
    this.verificationHistory.set(contractId, history);

    logger.debug(`[ContractTesting] Verification ${passed ? 'passed' : 'failed'}: ${contract.name}`);
    logger.debug(`  - Total: ${verificationResult.summary.total}`);
    logger.debug(`  - Passed: ${verificationResult.summary.passed}`);
    logger.debug(`  - Failed: ${verificationResult.summary.failed}`);
    logger.debug(`  - Breaking changes: ${verificationResult.breakingChanges.length}`);

    return verificationResult;
  }

  /**
   * Validate data against JSON schema
   */
  private validateSchema(
    data: any,
    schema: JSONSchema,
    path: string,
    originalSchema?: JSONSchema
  ): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
    breakingChanges: BreakingChange[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const breakingChanges: BreakingChange[] = [];

    // Type validation
    const actualType = this.getType(data);
    if (actualType !== schema.type && schema.type !== 'integer' || (schema.type === 'integer' && actualType !== 'number')) {
      errors.push({
        path,
        message: 'Type mismatch',
        expected: schema.type,
        actual: actualType,
        severity: 'error',
      });

      breakingChanges.push({
        type: 'changed_field_type',
        path,
        oldValue: schema.type,
        newValue: actualType,
        severity: 'breaking',
        message: `Field type changed from ${schema.type} to ${actualType}`,
      });

      return { errors, warnings, breakingChanges };
    }

    // Object validation
    if (schema.type === 'object' && typeof data === 'object' && data !== null) {
      // Required properties
      if (schema.required) {
        schema.required.forEach((prop) => {
          if (!(prop in data)) {
            errors.push({
              path: `${path}.${prop}`,
              message: 'Required property missing',
              expected: 'property to exist',
              actual: 'undefined',
              severity: 'error',
            });

            breakingChanges.push({
              type: 'removed_required_field',
              path: `${path}.${prop}`,
              oldValue: 'required',
              newValue: 'missing',
              severity: 'breaking',
              message: `Required field ${path}.${prop} is missing`,
            });
          }
        });
      }

      // Property validation
      if (schema.properties) {
        Object.keys(schema.properties).forEach((prop) => {
          if (prop in data) {
            const result = this.validateSchema(
              data[prop],
              schema.properties![prop],
              `${path}.${prop}`,
              originalSchema
            );
            errors.push(...result.errors);
            warnings.push(...result.warnings);
            breakingChanges.push(...result.breakingChanges);
          }
        });
      }

      // Additional properties
      if (schema.additionalProperties === false) {
        const allowedProps = new Set(Object.keys(schema.properties || {}));
        Object.keys(data).forEach((prop) => {
          if (!allowedProps.has(prop)) {
            warnings.push({
              path: `${path}.${prop}`,
              message: 'Additional property not allowed',
              expected: 'property to not exist',
              actual: 'exists',
            });
          }
        });
      }
    }

    // Array validation
    if (schema.type === 'array' && Array.isArray(data)) {
      if (schema.minItems !== undefined && data.length < schema.minItems) {
        errors.push({
          path,
          message: 'Array too short',
          expected: `minimum ${schema.minItems} items`,
          actual: `${data.length} items`,
          severity: 'error',
        });
      }

      if (schema.maxItems !== undefined && data.length > schema.maxItems) {
        errors.push({
          path,
          message: 'Array too long',
          expected: `maximum ${schema.maxItems} items`,
          actual: `${data.length} items`,
          severity: 'error',
        });
      }

      if (schema.items) {
        data.forEach((item, index) => {
          const result = this.validateSchema(item, schema.items!, `${path}[${index}]`, originalSchema);
          errors.push(...result.errors);
          warnings.push(...result.warnings);
          breakingChanges.push(...result.breakingChanges);
        });
      }
    }

    // String validation
    if (schema.type === 'string' && typeof data === 'string') {
      if (schema.pattern) {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(data)) {
          errors.push({
            path,
            message: 'String does not match pattern',
            expected: schema.pattern,
            actual: data,
            severity: 'error',
          });
        }
      }

      if (schema.minLength !== undefined && data.length < schema.minLength) {
        errors.push({
          path,
          message: 'String too short',
          expected: `minimum length ${schema.minLength}`,
          actual: `length ${data.length}`,
          severity: 'error',
        });
      }

      if (schema.maxLength !== undefined && data.length > schema.maxLength) {
        errors.push({
          path,
          message: 'String too long',
          expected: `maximum length ${schema.maxLength}`,
          actual: `length ${data.length}`,
          severity: 'error',
        });
      }

      if (schema.enum && !schema.enum.includes(data)) {
        errors.push({
          path,
          message: 'Value not in enum',
          expected: schema.enum,
          actual: data,
          severity: 'error',
        });
      }
    }

    // Number validation
    if ((schema.type === 'number' || schema.type === 'integer') && typeof data === 'number') {
      if (schema.type === 'integer' && !Number.isInteger(data)) {
        errors.push({
          path,
          message: 'Not an integer',
          expected: 'integer',
          actual: data,
          severity: 'error',
        });
      }

      if (schema.minimum !== undefined && data < schema.minimum) {
        errors.push({
          path,
          message: 'Number too small',
          expected: `minimum ${schema.minimum}`,
          actual: data,
          severity: 'error',
        });
      }

      if (schema.maximum !== undefined && data > schema.maximum) {
        errors.push({
          path,
          message: 'Number too large',
          expected: `maximum ${schema.maximum}`,
          actual: data,
          severity: 'error',
        });
      }
    }

    return { errors, warnings, breakingChanges };
  }

  /**
   * Get JavaScript type as JSON schema type
   */
  private getType(value: any): JSONSchema['type'] {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
    if (typeof value === 'boolean') return 'boolean';
    return 'null';
  }

  /**
   * Compare two contracts to detect breaking changes
   */
  detectBreakingChanges(
    oldProvider: ProviderContract,
    newProvider: ProviderContract
  ): BreakingChange[] {
    const breakingChanges: BreakingChange[] = [];

    // Check for removed endpoints
    oldProvider.endpoints.forEach((oldEndpoint) => {
      const newEndpoint = newProvider.endpoints.find(
        (ep) => ep.path === oldEndpoint.path && ep.method === oldEndpoint.method
      );

      if (!newEndpoint) {
        breakingChanges.push({
          type: 'removed_endpoint',
          endpoint: oldEndpoint.path,
          path: oldEndpoint.path,
          oldValue: `${oldEndpoint.method} ${oldEndpoint.path}`,
          newValue: null,
          severity: 'breaking',
          message: `Endpoint ${oldEndpoint.method} ${oldEndpoint.path} was removed`,
        });
        return;
      }

      // Check for status code changes
      if (oldEndpoint.statusCode !== newEndpoint.statusCode) {
        breakingChanges.push({
          type: 'changed_status_code',
          endpoint: oldEndpoint.path,
          path: 'statusCode',
          oldValue: oldEndpoint.statusCode,
          newValue: newEndpoint.statusCode,
          severity: 'breaking',
          message: `Status code changed from ${oldEndpoint.statusCode} to ${newEndpoint.statusCode}`,
        });
      }

      // Check for response schema changes
      const schemaChanges = this.compareSchemas(
        oldEndpoint.responseSchema,
        newEndpoint.responseSchema,
        'response'
      );
      breakingChanges.push(...schemaChanges);
    });

    return breakingChanges;
  }

  /**
   * Compare two schemas to detect breaking changes
   */
  private compareSchemas(
    oldSchema: JSONSchema,
    newSchema: JSONSchema,
    path: string
  ): BreakingChange[] {
    const breakingChanges: BreakingChange[] = [];

    // Type change is breaking
    if (oldSchema.type !== newSchema.type) {
      breakingChanges.push({
        type: 'changed_field_type',
        path,
        oldValue: oldSchema.type,
        newValue: newSchema.type,
        severity: 'breaking',
        message: `Field type changed from ${oldSchema.type} to ${newSchema.type}`,
      });
      return breakingChanges;
    }

    // Check for removed required fields (breaking)
    if (oldSchema.required && newSchema.required) {
      oldSchema.required.forEach((field) => {
        if (!newSchema.required!.includes(field)) {
          breakingChanges.push({
            type: 'removed_required_field',
            path: `${path}.${field}`,
            oldValue: 'required',
            newValue: 'optional',
            severity: 'non-breaking',
            message: `Field ${path}.${field} is no longer required`,
          });
        }
      });

      // Check for new required fields (breaking for consumers)
      newSchema.required.forEach((field) => {
        if (!oldSchema.required!.includes(field)) {
          breakingChanges.push({
            type: 'removed_required_field',
            path: `${path}.${field}`,
            oldValue: 'optional',
            newValue: 'required',
            severity: 'breaking',
            message: `Field ${path}.${field} is now required`,
          });
        }
      });
    }

    // Check for removed properties (breaking)
    if (oldSchema.properties && newSchema.properties) {
      Object.keys(oldSchema.properties).forEach((prop) => {
        if (!newSchema.properties![prop]) {
          breakingChanges.push({
            type: 'removed_required_field',
            path: `${path}.${prop}`,
            oldValue: oldSchema.properties![prop],
            newValue: null,
            severity: 'breaking',
            message: `Property ${path}.${prop} was removed`,
          });
        } else {
          // Recursively check nested schemas
          const nestedChanges = this.compareSchemas(
            oldSchema.properties[prop],
            newSchema.properties[prop],
            `${path}.${prop}`
          );
          breakingChanges.push(...nestedChanges);
        }
      });
    }

    return breakingChanges;
  }

  /**
   * Get contract by ID
   */
  getContract(contractId: string): ContractTest | undefined {
    return this.contracts.get(contractId);
  }

  /**
   * Get all contracts
   */
  getAllContracts(): ContractTest[] {
    return Array.from(this.contracts.values());
  }

  /**
   * Get verification history for a contract
   */
  getVerificationHistory(contractId: string): ContractVerificationResult[] {
    return this.verificationHistory.get(contractId) || [];
  }

  /**
   * Delete a contract
   */
  deleteContract(contractId: string): boolean {
    this.verificationHistory.delete(contractId);
    return this.contracts.delete(contractId);
  }

  /**
   * Get contract coverage statistics
   */
  getContractCoverage(): {
    totalEndpoints: number;
    coveredEndpoints: number;
    coverage: number;
  } {
    let totalEndpoints = 0;
    const coveredEndpoints = new Set<string>();

    this.contracts.forEach((contract) => {
      totalEndpoints += contract.provider.endpoints.length;
      contract.consumer.expectations.forEach((exp) => {
        coveredEndpoints.add(`${exp.method}:${exp.endpoint}`);
      });
    });

    return {
      totalEndpoints,
      coveredEndpoints: coveredEndpoints.size,
      coverage: totalEndpoints > 0 ? (coveredEndpoints.size / totalEndpoints) * 100 : 0,
    };
  }

  /**
   * Generate ID
   */
  private generateId(): string {
    return `contract_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default ContractTesting;
