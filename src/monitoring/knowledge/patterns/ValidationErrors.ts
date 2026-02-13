/**
 * Validation Error Patterns
 * Contains validation and data parsing error patterns
 */

import { ErrorCategory, ErrorSeverity } from '../../../utils/ErrorHandler';
import type { ErrorKnowledge } from '../types';

export const VALIDATION_ERRORS: ErrorKnowledge[] = [
  {
    id: 'val-001',
    code: 'VALIDATION_400',
    name: 'Invalid Input Data',
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.LOW,
    description: 'Request contains invalid or malformed data',
    symptoms: ['400 Bad Request response', 'Validation error messages', 'Field-specific error details'],
    rootCauses: ['Missing required fields', 'Invalid data format', 'Type mismatch', 'Constraint violation', 'Malformed JSON/XML'],
    solutions: [
      {
        id: 'sol-val-001-1',
        title: 'Implement Client-Side Validation',
        description: 'Validate data before sending to server',
        steps: ['Define validation schema (Yup, Zod, Joi)', 'Validate form inputs on change/blur', 'Show inline error messages', 'Prevent submission if validation fails', 'Match server-side validation rules'],
        estimatedTime: '30 minutes',
        difficulty: 'medium',
        successRate: 0.95,
        testable: true
      },
      {
        id: 'sol-val-001-2',
        title: 'Parse Server Validation Errors',
        description: 'Display server validation errors to user',
        steps: ['Parse validation error response', 'Map errors to form fields', 'Show field-specific error messages', 'Highlight invalid fields', 'Allow user to correct and resubmit'],
        estimatedTime: '20 minutes',
        difficulty: 'easy',
        successRate: 0.90,
        testable: true
      }
    ],
    prevention: [
      { title: 'Comprehensive Validation Schema', description: 'Define clear validation rules for all inputs', implementation: ['Document validation rules', 'Use schema validation libraries'], impact: 'high', effort: 'medium' },
      { title: 'Input Type Enforcement', description: 'Use appropriate input types and constraints', implementation: ['Use HTML5 input types (email, number, url)', 'Add min/max constraints'], impact: 'medium', effort: 'low' }
    ],
    relatedDocs: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/400'],
    tags: ['validation', 'input', 'form'],
    frequency: 0,
    resolutionRate: 0.92
  },
  {
    id: 'val-002',
    code: 'PARSE_JSON',
    name: 'JSON Parse Error',
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.MEDIUM,
    description: 'Failed to parse JSON data',
    symptoms: ['Unexpected token error', 'JSON parse exception', 'Malformed JSON message'],
    rootCauses: ['Invalid JSON syntax', 'Missing quotes or brackets', 'Trailing commas', 'Single quotes instead of double quotes', 'Control characters in string'],
    solutions: [
      {
        id: 'sol-val-002-1',
        title: 'Validate JSON Before Parsing',
        description: 'Check if string is valid JSON before parsing',
        steps: ['Try parsing in try-catch block', 'Provide meaningful error message', 'Log malformed JSON for debugging', 'Implement JSON schema validation', 'Sanitize input if needed'],
        estimatedTime: '15 minutes',
        difficulty: 'easy',
        successRate: 0.95,
        testable: true
      }
    ],
    prevention: [
      { title: 'Use JSON Schema Validation', description: 'Validate JSON structure before processing', implementation: ['Define JSON schemas for all APIs', 'Validate requests/responses'], impact: 'high', effort: 'medium' }
    ],
    relatedDocs: ['https://json-schema.org/'],
    tags: ['json', 'parse', 'validation'],
    frequency: 0,
    resolutionRate: 0.88
  }
];
