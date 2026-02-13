/**
 * Schema Validator - Handles schema validation and data quality checks
 */

import { EventEmitter } from 'events';
import {
  SchemaDefinition,
  SchemaField,
  DataQualityConfig,
  IngestionRecord,
  QualityFlag,
} from './types';

export class SchemaValidator extends EventEmitter {
  private dedupeCache: Map<string, number> = new Map();
  private lookupTables: Map<string, Map<string, any>> = new Map();

  /**
   * Validate data against a schema
   */
  validateSchema(
    data: any,
    schema: SchemaDefinition
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (data[field] === undefined || data[field] === null) {
          errors.push(`Required field '${field}' is missing`);
        }
      }
    }

    // Validate field types
    for (const field of schema.fields) {
      const value = data[field.name];

      if (value === undefined || value === null) {
        if (!field.nullable) {
          errors.push(`Field '${field.name}' cannot be null`);
        }
        continue;
      }

      // Type validation
      if (!this.validateFieldType(value, field)) {
        errors.push(`Field '${field.name}' has invalid type. Expected ${field.type}`);
      }

      // Pattern validation
      if (field.pattern && typeof value === 'string') {
        const regex = new RegExp(field.pattern);
        if (!regex.test(value)) {
          errors.push(`Field '${field.name}' does not match pattern '${field.pattern}'`);
        }
      }

      // Enum validation
      if (field.enum && !field.enum.includes(value)) {
        errors.push(`Field '${field.name}' must be one of: ${field.enum.join(', ')}`);
      }
    }

    // Check for additional properties
    if (schema.additionalProperties === false) {
      const schemaFields = new Set(schema.fields.map((f) => f.name));
      for (const key of Object.keys(data)) {
        if (!schemaFields.has(key)) {
          errors.push(`Unexpected field '${key}'`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Run data quality checks on a record
   */
  async runQualityChecks(
    record: IngestionRecord,
    checks: DataQualityConfig[]
  ): Promise<{ passed: QualityFlag[]; failed: QualityFlag[] }> {
    const passed: QualityFlag[] = [];
    const failed: QualityFlag[] = [];

    for (const check of checks) {
      const result = await this.runQualityCheck(record, check);

      if (result.passed) {
        passed.push(result);
      } else {
        failed.push(result);
      }
    }

    return { passed, failed };
  }

  /**
   * Set a lookup table for referential checks
   */
  setLookupTable(tableId: string, data: Map<string, any>): void {
    this.lookupTables.set(tableId, data);
  }

  /**
   * Clear validation caches
   */
  clearCaches(): void {
    this.dedupeCache.clear();
    this.lookupTables.clear();
  }

  private validateFieldType(value: any, field: SchemaField): boolean {
    switch (field.type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      case 'date':
        return value instanceof Date || !isNaN(Date.parse(value));
      case 'binary':
        return typeof value === 'string' || Buffer.isBuffer(value);
      default:
        return true;
    }
  }

  private async runQualityCheck(
    record: IngestionRecord,
    check: DataQualityConfig
  ): Promise<QualityFlag> {
    const flag: QualityFlag = {
      checkId: check.id,
      passed: true,
      severity: check.severity,
    };

    try {
      switch (check.type) {
        case 'nullability':
          flag.passed = this.checkNullability(record.value, check.config);
          flag.message = flag.passed
            ? undefined
            : `Null check failed for fields: ${check.config.fields?.join(', ')}`;
          break;

        case 'uniqueness':
          flag.passed = await this.checkUniqueness(record, check.config);
          flag.message = flag.passed ? undefined : 'Duplicate record detected';
          break;

        case 'range':
          flag.passed = this.checkRange(record.value, check.config);
          flag.message = flag.passed
            ? undefined
            : `Value out of range for field: ${check.config.field}`;
          break;

        case 'pattern':
          flag.passed = this.checkPattern(record.value, check.config);
          flag.message = flag.passed
            ? undefined
            : `Pattern mismatch for field: ${check.config.field}`;
          break;

        case 'referential':
          flag.passed = await this.checkReferential(record.value, check.config);
          flag.message = flag.passed
            ? undefined
            : `Referential integrity violation for field: ${check.config.field}`;
          break;

        case 'custom':
          if (check.config.validator && typeof check.config.validator === 'function') {
            flag.passed = await check.config.validator(record.value);
            flag.message = flag.passed
              ? undefined
              : check.config.errorMessage || 'Custom validation failed';
          }
          break;
      }
    } catch (error: any) {
      flag.passed = false;
      flag.message = `Quality check error: ${error.message}`;
    }

    return flag;
  }

  private checkNullability(data: any, config: any): boolean {
    const fields = config.fields || [];
    for (const field of fields) {
      const value = this.getNestedValue(data, field);
      if (value === null || value === undefined) {
        return false;
      }
    }
    return true;
  }

  private async checkUniqueness(record: IngestionRecord, config: any): Promise<boolean> {
    const keyFields = config.keyFields || ['id'];
    const key = keyFields.map((f: string) => this.getNestedValue(record.value, f)).join('|');

    const cacheKey = `unique:${config.scope || 'global'}:${key}`;
    if (this.dedupeCache.has(cacheKey)) {
      return false;
    }
    this.dedupeCache.set(cacheKey, Date.now());
    return true;
  }

  private checkRange(data: any, config: any): boolean {
    const value = this.getNestedValue(data, config.field);
    if (typeof value !== 'number') return true;

    if (config.min !== undefined && value < config.min) return false;
    if (config.max !== undefined && value > config.max) return false;
    return true;
  }

  private checkPattern(data: any, config: any): boolean {
    const value = this.getNestedValue(data, config.field);
    if (typeof value !== 'string') return true;

    const regex = new RegExp(config.pattern);
    return regex.test(value);
  }

  private async checkReferential(data: any, config: any): Promise<boolean> {
    const value = this.getNestedValue(data, config.field);
    const lookupTable = this.lookupTables.get(config.referenceTable);

    if (!lookupTable) return true;
    return lookupTable.has(String(value));
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}
