/**
 * ValidationUtils - Validation utilities for custom nodes
 */

import { INodeProperties, IDataObject } from './NodeInterface';

export class ValidationUtils {
  /**
   * Validate string parameter
   */
  static validateString(
    value: any,
    options?: {
      minLength?: number;
      maxLength?: number;
      pattern?: RegExp;
      required?: boolean;
    }
  ): { valid: boolean; error?: string } {
    if (options?.required && (!value || value === '')) {
      return { valid: false, error: 'This field is required' };
    }

    if (!value) {
      return { valid: true };
    }

    if (typeof value !== 'string') {
      return { valid: false, error: 'Value must be a string' };
    }

    if (options?.minLength && value.length < options.minLength) {
      return {
        valid: false,
        error: `Minimum length is ${options.minLength} characters`,
      };
    }

    if (options?.maxLength && value.length > options.maxLength) {
      return {
        valid: false,
        error: `Maximum length is ${options.maxLength} characters`,
      };
    }

    if (options?.pattern && !options.pattern.test(value)) {
      return {
        valid: false,
        error: 'Value does not match required pattern',
      };
    }

    return { valid: true };
  }

  /**
   * Validate number parameter
   */
  static validateNumber(
    value: any,
    options?: {
      min?: number;
      max?: number;
      integer?: boolean;
      required?: boolean;
    }
  ): { valid: boolean; error?: string } {
    if (options?.required && (value === undefined || value === null || value === '')) {
      return { valid: false, error: 'This field is required' };
    }

    if (value === undefined || value === null || value === '') {
      return { valid: true };
    }

    const num = Number(value);

    if (isNaN(num)) {
      return { valid: false, error: 'Value must be a number' };
    }

    if (options?.integer && !Number.isInteger(num)) {
      return { valid: false, error: 'Value must be an integer' };
    }

    if (options?.min !== undefined && num < options.min) {
      return { valid: false, error: `Minimum value is ${options.min}` };
    }

    if (options?.max !== undefined && num > options.max) {
      return { valid: false, error: `Maximum value is ${options.max}` };
    }

    return { valid: true };
  }

  /**
   * Validate boolean parameter
   */
  static validateBoolean(value: any, required = false): { valid: boolean; error?: string } {
    if (required && value === undefined) {
      return { valid: false, error: 'This field is required' };
    }

    if (value === undefined) {
      return { valid: true };
    }

    if (typeof value !== 'boolean') {
      return { valid: false, error: 'Value must be a boolean' };
    }

    return { valid: true };
  }

  /**
   * Validate JSON parameter
   */
  static validateJSON(
    value: any,
    required = false
  ): { valid: boolean; error?: string; parsed?: any } {
    if (required && (!value || value === '')) {
      return { valid: false, error: 'This field is required' };
    }

    if (!value) {
      return { valid: true };
    }

    if (typeof value === 'object') {
      return { valid: true, parsed: value };
    }

    try {
      const parsed = JSON.parse(value);
      return { valid: true, parsed };
    } catch (error) {
      return { valid: false, error: 'Invalid JSON format' };
    }
  }

  /**
   * Validate email
   */
  static validateEmail(email: string, required = false): { valid: boolean; error?: string } {
    if (required && (!email || email === '')) {
      return { valid: false, error: 'Email is required' };
    }

    if (!email) {
      return { valid: true };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Invalid email format' };
    }

    return { valid: true };
  }

  /**
   * Validate URL
   */
  static validateURL(
    url: string,
    options?: {
      required?: boolean;
      protocols?: string[];
    }
  ): { valid: boolean; error?: string } {
    if (options?.required && (!url || url === '')) {
      return { valid: false, error: 'URL is required' };
    }

    if (!url) {
      return { valid: true };
    }

    try {
      const parsed = new URL(url);

      if (options?.protocols && !options.protocols.includes(parsed.protocol.replace(':', ''))) {
        return {
          valid: false,
          error: `Protocol must be one of: ${options.protocols.join(', ')}`,
        };
      }

      return { valid: true };
    } catch {
      return { valid: false, error: 'Invalid URL format' };
    }
  }

  /**
   * Validate date/time
   */
  static validateDateTime(
    value: any,
    options?: {
      required?: boolean;
      min?: Date;
      max?: Date;
    }
  ): { valid: boolean; error?: string; date?: Date } {
    if (options?.required && (!value || value === '')) {
      return { valid: false, error: 'Date/time is required' };
    }

    if (!value) {
      return { valid: true };
    }

    const date = new Date(value);

    if (isNaN(date.getTime())) {
      return { valid: false, error: 'Invalid date/time format' };
    }

    if (options?.min && date < options.min) {
      return {
        valid: false,
        error: `Date must be after ${options.min.toISOString()}`,
      };
    }

    if (options?.max && date > options.max) {
      return {
        valid: false,
        error: `Date must be before ${options.max.toISOString()}`,
      };
    }

    return { valid: true, date };
  }

  /**
   * Validate options (enum)
   */
  static validateOptions(
    value: any,
    allowedOptions: Array<string | number>,
    required = false
  ): { valid: boolean; error?: string } {
    if (required && (value === undefined || value === null || value === '')) {
      return { valid: false, error: 'This field is required' };
    }

    if (value === undefined || value === null || value === '') {
      return { valid: true };
    }

    if (!allowedOptions.includes(value)) {
      return {
        valid: false,
        error: `Value must be one of: ${allowedOptions.join(', ')}`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate multi-options (array of enums)
   */
  static validateMultiOptions(
    values: any,
    allowedOptions: Array<string | number>,
    options?: {
      required?: boolean;
      minItems?: number;
      maxItems?: number;
    }
  ): { valid: boolean; error?: string } {
    if (options?.required && (!values || values.length === 0)) {
      return { valid: false, error: 'At least one option must be selected' };
    }

    if (!values || values.length === 0) {
      return { valid: true };
    }

    if (!Array.isArray(values)) {
      return { valid: false, error: 'Value must be an array' };
    }

    if (options?.minItems && values.length < options.minItems) {
      return {
        valid: false,
        error: `At least ${options.minItems} options must be selected`,
      };
    }

    if (options?.maxItems && values.length > options.maxItems) {
      return {
        valid: false,
        error: `At most ${options.maxItems} options can be selected`,
      };
    }

    for (const value of values) {
      if (!allowedOptions.includes(value)) {
        return {
          valid: false,
          error: `Invalid option: ${value}. Must be one of: ${allowedOptions.join(', ')}`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Validate all node parameters
   */
  static validateNodeParameters(
    parameters: Record<string, any>,
    properties: INodeProperties[]
  ): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    for (const property of properties) {
      const value = parameters[property.name];
      let result: { valid: boolean; error?: string } = { valid: true };

      switch (property.type) {
        case 'string':
          result = this.validateString(value, {
            required: property.required,
            minLength: property.typeOptions?.minValue,
            maxLength: property.typeOptions?.maxValue,
          });
          break;

        case 'number':
          result = this.validateNumber(value, {
            required: property.required,
            min: property.typeOptions?.minValue,
            max: property.typeOptions?.maxValue,
          });
          break;

        case 'boolean':
          result = this.validateBoolean(value, property.required);
          break;

        case 'json':
          result = this.validateJSON(value, property.required);
          break;

        case 'options':
          if (property.options) {
            result = this.validateOptions(
              value,
              property.options.map(o => o.value as string | number),
              property.required
            );
          }
          break;

        case 'multiOptions':
          if (property.options) {
            result = this.validateMultiOptions(
              value,
              property.options.map(o => o.value as string | number),
              {
                required: property.required,
              }
            );
          }
          break;
      }

      if (!result.valid && result.error) {
        errors[property.name] = result.error;
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Validate input data structure
   */
  static validateInputData(
    data: any,
    schema?: {
      required?: string[];
      properties?: Record<string, { type: string; required?: boolean }>;
    }
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
      errors.push('Input data must be an object');
      return { valid: false, errors };
    }

    if (schema?.required) {
      for (const field of schema.required) {
        if (!(field in data)) {
          errors.push(`Required field "${field}" is missing`);
        }
      }
    }

    if (schema?.properties) {
      for (const [field, fieldSchema] of Object.entries(schema.properties)) {
        if (fieldSchema.required && !(field in data)) {
          errors.push(`Required field "${field}" is missing`);
          continue;
        }

        if (field in data) {
          const value = data[field];
          const expectedType = fieldSchema.type;

          let actualType: string = typeof value;
          if (Array.isArray(value)) actualType = 'array';
          if (value === null) actualType = 'null';

          if (actualType !== expectedType && expectedType !== 'any') {
            errors.push(`Field "${field}" must be of type ${expectedType}, got ${actualType}`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitize string input
   */
  static sanitizeString(value: string, options?: { maxLength?: number; allowHtml?: boolean }): string {
    if (!value) return '';

    let sanitized = value.trim();

    if (!options?.allowHtml) {
      // Remove HTML tags
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }

    if (options?.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }

    return sanitized;
  }

  /**
   * Validate and sanitize object
   */
  static sanitizeObject(obj: IDataObject, allowedKeys?: string[]): IDataObject {
    const sanitized: IDataObject = {};

    for (const [key, value] of Object.entries(obj)) {
      if (allowedKeys && !allowedKeys.includes(key)) {
        continue;
      }

      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeObject(value as IDataObject, allowedKeys);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
