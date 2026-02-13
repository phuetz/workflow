import { logger } from '../services/LoggingService';
/**
 * API Contract Tester
 * Validates API responses against schemas and contracts
 */

export interface APIContract {
  name: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  requestSchema?: JSONSchema;
  responseSchema: JSONSchema;
  statusCode?: number;
  headers?: Record<string, string>;
  examples?: Array<{
    request?: any;
    response: any;
    statusCode?: number;
  }>;
}

export interface JSONSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  enum?: any[];
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  additionalProperties?: boolean | JSONSchema;
}

export interface ContractValidationResult {
  passed: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  contractName: string;
  timestamp: number;
}

export interface ValidationError {
  path: string;
  message: string;
  expected: any;
  actual: any;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  path: string;
  message: string;
}

export interface ContractTestReport {
  passed: boolean;
  totalContracts: number;
  passedContracts: number;
  failedContracts: number;
  results: ContractValidationResult[];
  timestamp: number;
}

export class ContractTester {
  private contracts: Map<string, APIContract> = new Map();

  /**
   * Register an API contract
   */
  registerContract(contract: APIContract): void {
    this.contracts.set(contract.name, contract);
    logger.debug(`[ContractTester] Registered contract: ${contract.name}`);
  }

  /**
   * Validate a response against a contract
   */
  validateResponse(
    contractName: string,
    response: any,
    statusCode?: number
  ): ContractValidationResult {
    const contract = this.contracts.get(contractName);

    if (!contract) {
      return {
        passed: false,
        errors: [
          {
            path: '',
            message: `Contract "${contractName}" not found`,
            expected: null,
            actual: null,
            severity: 'error',
          },
        ],
        warnings: [],
        contractName,
        timestamp: Date.now(),
      };
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate status code
    if (statusCode !== undefined && contract.statusCode !== undefined) {
      if (statusCode !== contract.statusCode) {
        errors.push({
          path: 'statusCode',
          message: 'Status code mismatch',
          expected: contract.statusCode,
          actual: statusCode,
          severity: 'error',
        });
      }
    }

    // Validate response schema
    const schemaErrors = this.validateSchema(response, contract.responseSchema, '');
    errors.push(...schemaErrors);

    return {
      passed: errors.filter((e) => e.severity === 'error').length === 0,
      errors,
      warnings,
      contractName,
      timestamp: Date.now(),
    };
  }

  /**
   * Test all registered contracts
   */
  async testAllContracts(
    executor: (contract: APIContract) => Promise<{ response: any; statusCode: number }>
  ): Promise<ContractTestReport> {
    const results: ContractValidationResult[] = [];

    for (const contract of this.contracts.values()) {
      try {
        const { response, statusCode } = await executor(contract);
        const result = this.validateResponse(contract.name, response, statusCode);
        results.push(result);
      } catch (error) {
        results.push({
          passed: false,
          errors: [
            {
              path: '',
              message: `Request failed: ${error instanceof Error ? error.message : String(error)}`,
              expected: null,
              actual: null,
              severity: 'error',
            },
          ],
          warnings: [],
          contractName: contract.name,
          timestamp: Date.now(),
        });
      }
    }

    const passedContracts = results.filter((r) => r.passed).length;

    return {
      passed: passedContracts === results.length,
      totalContracts: results.length,
      passedContracts,
      failedContracts: results.length - passedContracts,
      results,
      timestamp: Date.now(),
    };
  }

  /**
   * Validate data against JSON schema
   */
  private validateSchema(
    data: any,
    schema: JSONSchema,
    path: string
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Type validation
    const actualType = this.getType(data);
    if (actualType !== schema.type) {
      errors.push({
        path,
        message: `Type mismatch`,
        expected: schema.type,
        actual: actualType,
        severity: 'error',
      });
      return errors; // Stop further validation if type is wrong
    }

    // Object validation
    if (schema.type === 'object' && typeof data === 'object' && data !== null) {
      // Required properties
      if (schema.required) {
        schema.required.forEach((prop) => {
          if (!(prop in data)) {
            errors.push({
              path: `${path}.${prop}`,
              message: `Required property missing`,
              expected: 'property to exist',
              actual: 'undefined',
              severity: 'error',
            });
          }
        });
      }

      // Property validation
      if (schema.properties) {
        Object.keys(schema.properties).forEach((prop) => {
          if (prop in data) {
            const propErrors = this.validateSchema(
              data[prop],
              schema.properties![prop],
              `${path}.${prop}`
            );
            errors.push(...propErrors);
          }
        });
      }

      // Additional properties
      if (schema.additionalProperties === false) {
        const allowedProps = new Set(Object.keys(schema.properties || {}));
        Object.keys(data).forEach((prop) => {
          if (!allowedProps.has(prop)) {
            errors.push({
              path: `${path}.${prop}`,
              message: `Additional property not allowed`,
              expected: 'property to not exist',
              actual: 'exists',
              severity: 'warning',
            });
          }
        });
      }
    }

    // Array validation
    if (schema.type === 'array' && Array.isArray(data)) {
      if (schema.items) {
        data.forEach((item, index) => {
          const itemErrors = this.validateSchema(item, schema.items!, `${path}[${index}]`);
          errors.push(...itemErrors);
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
            message: `String does not match pattern`,
            expected: schema.pattern,
            actual: data,
            severity: 'error',
          });
        }
      }

      if (schema.minLength !== undefined && data.length < schema.minLength) {
        errors.push({
          path,
          message: `String too short`,
          expected: `minimum length ${schema.minLength}`,
          actual: `length ${data.length}`,
          severity: 'error',
        });
      }

      if (schema.maxLength !== undefined && data.length > schema.maxLength) {
        errors.push({
          path,
          message: `String too long`,
          expected: `maximum length ${schema.maxLength}`,
          actual: `length ${data.length}`,
          severity: 'error',
        });
      }

      if (schema.enum && !schema.enum.includes(data)) {
        errors.push({
          path,
          message: `Value not in enum`,
          expected: schema.enum,
          actual: data,
          severity: 'error',
        });
      }
    }

    // Number validation
    if (schema.type === 'number' && typeof data === 'number') {
      if (schema.minimum !== undefined && data < schema.minimum) {
        errors.push({
          path,
          message: `Number too small`,
          expected: `minimum ${schema.minimum}`,
          actual: data,
          severity: 'error',
        });
      }

      if (schema.maximum !== undefined && data > schema.maximum) {
        errors.push({
          path,
          message: `Number too large`,
          expected: `maximum ${schema.maximum}`,
          actual: data,
          severity: 'error',
        });
      }
    }

    return errors;
  }

  /**
   * Get JavaScript type as JSON schema type
   */
  private getType(value: any): JSONSchema['type'] {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    return 'null';
  }

  /**
   * Generate contract from example response
   */
  generateContractFromExample(
    name: string,
    endpoint: string,
    method: APIContract['method'],
    exampleResponse: any
  ): APIContract {
    const schema = this.inferSchema(exampleResponse);

    return {
      name,
      endpoint,
      method,
      responseSchema: schema,
      statusCode: 200,
      examples: [{ response: exampleResponse }],
    };
  }

  /**
   * Infer JSON schema from example data
   */
  private inferSchema(data: any): JSONSchema {
    const type = this.getType(data);

    const schema: JSONSchema = { type };

    if (type === 'object' && data !== null) {
      schema.properties = {};
      schema.required = [];

      Object.keys(data).forEach((key) => {
        schema.properties![key] = this.inferSchema(data[key]);
        schema.required!.push(key);
      });
    }

    if (type === 'array' && data.length > 0) {
      schema.items = this.inferSchema(data[0]);
    }

    return schema;
  }

  /**
   * Export contracts for storage
   */
  exportContracts(): APIContract[] {
    return Array.from(this.contracts.values());
  }

  /**
   * Load contracts from storage
   */
  loadContracts(contracts: APIContract[]): void {
    contracts.forEach((contract) => {
      this.contracts.set(contract.name, contract);
    });
    logger.debug(`[ContractTester] Loaded ${contracts.length} contracts`);
  }

  /**
   * Get contract by name
   */
  getContract(name: string): APIContract | undefined {
    return this.contracts.get(name);
  }

  /**
   * Delete contract
   */
  deleteContract(name: string): boolean {
    return this.contracts.delete(name);
  }

  /**
   * Get all contract names
   */
  getContractNames(): string[] {
    return Array.from(this.contracts.keys());
  }
}

export default ContractTester;
