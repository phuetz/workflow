/**
 * Data Flow Validator - Schema and Type Validation
 * Validates data transformations and schema compliance
 */

import { WorkflowNode } from '../types/workflow';
import { DataValidation, Severity } from '../types/simulation';
import { logger } from '../services/SimpleLogger';

export interface Schema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null' | 'any';
  properties?: Record<string, Schema>;
  items?: Schema;
  required?: string[];
  nullable?: boolean;
  enum?: unknown[];
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
}

export interface ValidationRule {
  field: string;
  type: string;
  required: boolean;
  validation?: (value: unknown) => boolean;
  message?: string;
}

/**
 * Data flow validator for simulation
 */
export class DataFlowValidator {
  private nodeSchemas: Map<string, Schema> = new Map();

  constructor() {
    this.initializeNodeSchemas();
  }

  /**
   * Initialize expected schemas for different node types
   */
  private initializeNodeSchemas(): void {
    // HTTP Request output schema
    this.nodeSchemas.set('httpRequest', {
      type: 'object',
      required: ['statusCode', 'body'],
      properties: {
        statusCode: { type: 'number' },
        body: { type: 'any' },
        headers: { type: 'object' },
      },
    });

    // Email output schema
    this.nodeSchemas.set('email', {
      type: 'object',
      required: ['messageId', 'sent'],
      properties: {
        messageId: { type: 'string' },
        sent: { type: 'boolean' },
        timestamp: { type: 'string' },
      },
    });

    // Slack output schema
    this.nodeSchemas.set('slack', {
      type: 'object',
      required: ['ok', 'ts'],
      properties: {
        ok: { type: 'boolean' },
        ts: { type: 'string' },
        channel: { type: 'string' },
      },
    });

    // Database query output schema
    this.nodeSchemas.set('mysql', {
      type: 'object',
      required: ['rows'],
      properties: {
        rows: { type: 'array' },
        rowCount: { type: 'number' },
        fields: { type: 'array' },
      },
    });

    this.nodeSchemas.set('postgres', {
      type: 'object',
      required: ['rows'],
      properties: {
        rows: { type: 'array' },
        rowCount: { type: 'number' },
        command: { type: 'string' },
      },
    });

    this.nodeSchemas.set('mongodb', {
      type: 'object',
      required: ['documents'],
      properties: {
        documents: { type: 'array' },
        count: { type: 'number' },
      },
    });

    // Transform node output
    this.nodeSchemas.set('transform', {
      type: 'any', // Flexible output
    });

    // Filter node output
    this.nodeSchemas.set('filter', {
      type: 'array',
    });

    // Aggregate node output
    this.nodeSchemas.set('aggregate', {
      type: 'object',
      properties: {
        count: { type: 'number' },
        sum: { type: 'number', nullable: true },
        average: { type: 'number', nullable: true },
        min: { type: 'number', nullable: true },
        max: { type: 'number', nullable: true },
      },
    });

    // LLM output schema
    this.nodeSchemas.set('openai', {
      type: 'object',
      required: ['choices'],
      properties: {
        choices: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              message: { type: 'object' },
              text: { type: 'string' },
            },
          },
        },
        usage: { type: 'object' },
      },
    });

    this.nodeSchemas.set('anthropic', {
      type: 'object',
      required: ['content'],
      properties: {
        content: { type: 'string' },
        stop_reason: { type: 'string' },
        usage: { type: 'object' },
      },
    });
  }

  /**
   * Validate node data against schema
   */
  async validateNodeData(
    node: WorkflowNode,
    inputData: unknown,
    outputData: unknown
  ): Promise<DataValidation> {
    const errors: Array<{ field: string; message: string; severity: Severity }> = [];
    const warnings: Array<{ field: string; message: string }> = [];

    // Validate input data requirements
    const inputValidation = this.validateInputData(node, inputData);
    errors.push(...inputValidation.errors);
    warnings.push(...inputValidation.warnings);

    // Validate output data schema
    const outputValidation = this.validateOutputData(node, outputData);
    errors.push(...outputValidation.errors);
    warnings.push(...outputValidation.warnings);

    // Validate data types
    const typeValidation = this.validateDataTypes(node, outputData);
    errors.push(...typeValidation.errors);
    warnings.push(...typeValidation.warnings);

    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings,
      schema: this.nodeSchemas.get(node.type) as unknown as Record<string, unknown>,
    };
  }

  /**
   * Validate input data requirements
   */
  private validateInputData(
    node: WorkflowNode,
    inputData: unknown
  ): {
    errors: Array<{ field: string; message: string; severity: Severity }>;
    warnings: Array<{ field: string; message: string }>;
  } {
    const errors: Array<{ field: string; message: string; severity: Severity }> = [];
    const warnings: Array<{ field: string; message: string }> = [];

    // Get required input fields for node type
    const requiredFields = this.getRequiredInputFields(node.type);

    if (requiredFields.length > 0 && !inputData) {
      errors.push({
        field: 'input',
        message: `Node requires input data but none provided`,
        severity: 'error',
      });
      return { errors, warnings };
    }

    // Validate each required field
    requiredFields.forEach(rule => {
      const value = this.getFieldValue(inputData, rule.field);

      if (rule.required && (value === undefined || value === null)) {
        errors.push({
          field: rule.field,
          message: rule.message || `Required field '${rule.field}' is missing`,
          severity: 'error',
        });
      } else if (value !== undefined && value !== null) {
        // Type validation
        const typeValid = this.validateFieldType(value, rule.type);
        if (!typeValid) {
          errors.push({
            field: rule.field,
            message: `Field '${rule.field}' should be of type ${rule.type}`,
            severity: 'warning',
          });
        }

        // Custom validation
        if (rule.validation && !rule.validation(value)) {
          errors.push({
            field: rule.field,
            message: rule.message || `Field '${rule.field}' failed custom validation`,
            severity: 'warning',
          });
        }
      }
    });

    return { errors, warnings };
  }

  /**
   * Get required input fields for node type
   */
  private getRequiredInputFields(nodeType: string): ValidationRule[] {
    const rules: Record<string, ValidationRule[]> = {
      httpRequest: [
        { field: 'url', type: 'string', required: true },
        { field: 'method', type: 'string', required: false },
      ],
      email: [
        { field: 'to', type: 'string', required: true },
        { field: 'subject', type: 'string', required: true },
        { field: 'body', type: 'string', required: true },
      ],
      slack: [
        { field: 'channel', type: 'string', required: true },
        { field: 'message', type: 'string', required: true },
      ],
      transform: [{ field: 'data', type: 'any', required: true }],
      filter: [
        { field: 'data', type: 'array', required: true },
        { field: 'condition', type: 'string', required: false },
      ],
      aggregate: [{ field: 'data', type: 'array', required: true }],
    };

    return rules[nodeType] || [];
  }

  /**
   * Validate output data against schema
   */
  private validateOutputData(
    node: WorkflowNode,
    outputData: unknown
  ): {
    errors: Array<{ field: string; message: string; severity: Severity }>;
    warnings: Array<{ field: string; message: string }>;
  } {
    const errors: Array<{ field: string; message: string; severity: Severity }> = [];
    const warnings: Array<{ field: string; message: string }> = [];

    const schema = this.nodeSchemas.get(node.type);
    if (!schema) {
      // No schema defined, skip validation
      return { errors, warnings };
    }

    const validation = this.validateAgainstSchema(outputData, schema, 'output');
    errors.push(...validation.errors);
    warnings.push(...validation.warnings);

    return { errors, warnings };
  }

  /**
   * Validate data against schema
   */
  private validateAgainstSchema(
    data: unknown,
    schema: Schema,
    path: string = ''
  ): {
    errors: Array<{ field: string; message: string; severity: Severity }>;
    warnings: Array<{ field: string; message: string }>;
  } {
    const errors: Array<{ field: string; message: string; severity: Severity }> = [];
    const warnings: Array<{ field: string; message: string }> = [];

    // Null check
    if (data === null || data === undefined) {
      if (schema.nullable) {
        return { errors, warnings };
      }
      errors.push({
        field: path,
        message: `Value is null/undefined but schema doesn't allow null`,
        severity: 'error',
      });
      return { errors, warnings };
    }

    // Type validation
    const actualType = this.getDataType(data);
    if (schema.type !== 'any' && actualType !== schema.type) {
      errors.push({
        field: path,
        message: `Expected type '${schema.type}' but got '${actualType}'`,
        severity: 'warning',
      });
      return { errors, warnings }; // Don't validate further if type mismatch
    }

    // Object validation
    if (schema.type === 'object' && typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;

      // Check required properties
      schema.required?.forEach(requiredProp => {
        if (!(requiredProp in obj)) {
          errors.push({
            field: `${path}.${requiredProp}`,
            message: `Required property '${requiredProp}' is missing`,
            severity: 'error',
          });
        }
      });

      // Validate properties
      if (schema.properties) {
        Object.entries(schema.properties).forEach(([propName, propSchema]) => {
          if (propName in obj) {
            const propValidation = this.validateAgainstSchema(
              obj[propName],
              propSchema,
              path ? `${path}.${propName}` : propName
            );
            errors.push(...propValidation.errors);
            warnings.push(...propValidation.warnings);
          }
        });
      }
    }

    // Array validation
    if (schema.type === 'array' && Array.isArray(data)) {
      if (schema.items) {
        data.forEach((item, index) => {
          const itemValidation = this.validateAgainstSchema(
            item,
            schema.items!,
            `${path}[${index}]`
          );
          errors.push(...itemValidation.errors);
          warnings.push(...itemValidation.warnings);
        });
      }
    }

    // String validation
    if (schema.type === 'string' && typeof data === 'string') {
      if (schema.pattern && !new RegExp(schema.pattern).test(data)) {
        warnings.push({
          field: path,
          message: `String doesn't match pattern: ${schema.pattern}`,
        });
      }
      if (schema.minLength && data.length < schema.minLength) {
        warnings.push({
          field: path,
          message: `String length ${data.length} is less than minimum ${schema.minLength}`,
        });
      }
      if (schema.maxLength && data.length > schema.maxLength) {
        warnings.push({
          field: path,
          message: `String length ${data.length} exceeds maximum ${schema.maxLength}`,
        });
      }
      if (schema.enum && !schema.enum.includes(data)) {
        errors.push({
          field: path,
          message: `Value '${data}' is not in allowed enum values`,
          severity: 'error',
        });
      }
    }

    // Number validation
    if (schema.type === 'number' && typeof data === 'number') {
      if (schema.minimum !== undefined && data < schema.minimum) {
        warnings.push({
          field: path,
          message: `Number ${data} is less than minimum ${schema.minimum}`,
        });
      }
      if (schema.maximum !== undefined && data > schema.maximum) {
        warnings.push({
          field: path,
          message: `Number ${data} exceeds maximum ${schema.maximum}`,
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate data types
   */
  private validateDataTypes(
    node: WorkflowNode,
    outputData: unknown
  ): {
    errors: Array<{ field: string; message: string; severity: Severity }>;
    warnings: Array<{ field: string; message: string }>;
  } {
    const errors: Array<{ field: string; message: string; severity: Severity }> = [];
    const warnings: Array<{ field: string; message: string }> = [];

    // Type-specific validation
    if (node.type === 'filter' && !Array.isArray(outputData)) {
      errors.push({
        field: 'output',
        message: 'Filter node should output an array',
        severity: 'warning',
      });
    }

    if (node.type === 'aggregate' && typeof outputData !== 'object') {
      errors.push({
        field: 'output',
        message: 'Aggregate node should output an object',
        severity: 'warning',
      });
    }

    return { errors, warnings };
  }

  /**
   * Get field value from data object
   */
  private getFieldValue(data: unknown, field: string): unknown {
    if (!data || typeof data !== 'object') {
      return undefined;
    }

    const parts = field.split('.');
    let current: any = data;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Validate field type
   */
  private validateFieldType(value: unknown, expectedType: string): boolean {
    const actualType = this.getDataType(value);
    return actualType === expectedType || expectedType === 'any';
  }

  /**
   * Get data type
   */
  private getDataType(value: unknown): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  /**
   * Validate data transformation
   */
  async validateTransformation(
    sourceNode: WorkflowNode,
    targetNode: WorkflowNode,
    data: unknown
  ): Promise<{
    compatible: boolean;
    issues: string[];
    suggestions: string[];
  }> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Get expected output schema of source
    const sourceSchema = this.nodeSchemas.get(sourceNode.type);

    // Get expected input requirements of target
    const targetRequirements = this.getRequiredInputFields(targetNode.type);

    // Check compatibility
    if (sourceSchema && targetRequirements.length > 0) {
      targetRequirements.forEach(req => {
        if (req.required) {
          // Check if source output can provide this field
          const canProvide = this.canSchemaProvideField(sourceSchema, req.field);
          if (!canProvide) {
            issues.push(
              `Source node may not provide required field '${req.field}' for target node`
            );
            suggestions.push(`Add a transform node to map data fields`);
          }
        }
      });
    }

    // Type compatibility check
    if (targetNode.type === 'filter' || targetNode.type === 'aggregate') {
      if (sourceSchema?.type !== 'array') {
        issues.push(`${targetNode.type} expects array input but may not receive one`);
        suggestions.push(
          `Ensure source node outputs an array or add a transform to convert data`
        );
      }
    }

    return {
      compatible: issues.length === 0,
      issues,
      suggestions,
    };
  }

  /**
   * Check if schema can provide a field
   */
  private canSchemaProvideField(schema: Schema, field: string): boolean {
    if (schema.type === 'any') return true;
    if (schema.type !== 'object') return false;

    const parts = field.split('.');
    let currentSchema = schema;

    for (const part of parts) {
      if (!currentSchema.properties || !(part in currentSchema.properties)) {
        return false;
      }
      currentSchema = currentSchema.properties[part];
    }

    return true;
  }

  /**
   * Infer schema from sample data
   */
  inferSchema(data: unknown): Schema {
    const type = this.getDataType(data);

    const schema: Schema = { type: type as any };

    if (type === 'object' && data !== null) {
      schema.properties = {};
      const obj = data as Record<string, unknown>;
      Object.entries(obj).forEach(([key, value]) => {
        schema.properties![key] = this.inferSchema(value);
      });
    }

    if (type === 'array' && Array.isArray(data) && data.length > 0) {
      schema.items = this.inferSchema(data[0]);
    }

    return schema;
  }

  /**
   * Suggest data mapping
   */
  suggestMapping(
    sourceData: unknown,
    targetRequirements: ValidationRule[]
  ): Record<string, string> {
    const mapping: Record<string, string> = {};
    const sourceSchema = this.inferSchema(sourceData);

    targetRequirements.forEach(req => {
      // Simple field name matching
      if (sourceSchema.properties && req.field in sourceSchema.properties) {
        mapping[req.field] = req.field;
      } else {
        // Try to find similar field names
        const similarField = this.findSimilarField(
          req.field,
          Object.keys(sourceSchema.properties || {})
        );
        if (similarField) {
          mapping[req.field] = similarField;
        }
      }
    });

    return mapping;
  }

  /**
   * Find similar field name
   */
  private findSimilarField(target: string, availableFields: string[]): string | null {
    const targetLower = target.toLowerCase();

    // Exact match (case-insensitive)
    const exact = availableFields.find(f => f.toLowerCase() === targetLower);
    if (exact) return exact;

    // Partial match
    const partial = availableFields.find(f =>
      f.toLowerCase().includes(targetLower) || targetLower.includes(f.toLowerCase())
    );
    if (partial) return partial;

    return null;
  }

  /**
   * Register custom schema for node type
   */
  registerSchema(nodeType: string, schema: Schema): void {
    this.nodeSchemas.set(nodeType, schema);
  }

  /**
   * Get schema for node type
   */
  getSchema(nodeType: string): Schema | undefined {
    return this.nodeSchemas.get(nodeType);
  }

  /**
   * Validate entire data flow path
   */
  async validateDataFlowPath(
    nodes: WorkflowNode[],
    edges: Array<{ source: string; target: string }>
  ): Promise<{
    valid: boolean;
    pathIssues: Array<{
      from: string;
      to: string;
      issues: string[];
    }>;
  }> {
    const pathIssues: Array<{ from: string; to: string; issues: string[] }> = [];

    for (const edge of edges) {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);

      if (!sourceNode || !targetNode) continue;

      const validation = await this.validateTransformation(sourceNode, targetNode, {});
      if (!validation.compatible) {
        pathIssues.push({
          from: sourceNode.data.label,
          to: targetNode.data.label,
          issues: validation.issues,
        });
      }
    }

    return {
      valid: pathIssues.length === 0,
      pathIssues,
    };
  }
}
