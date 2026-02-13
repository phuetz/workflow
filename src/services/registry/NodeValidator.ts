/**
 * Node Validator
 * Handles validation of integration nodes
 */

import type { IntegrationNode, ValidationResult } from './types';

/**
 * Validates an integration node configuration
 */
export function validateNode(node: IntegrationNode): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!node.id) errors.push('Node ID is required');
  if (!node.displayName) errors.push('Display name is required');
  if (!node.category) errors.push('Category is required');
  if (!node.executor?.execute) errors.push('Executor function is required');

  // Validate inputs/outputs
  if (!node.inputs || node.inputs.length === 0) {
    warnings.push('Node has no inputs defined');
  }
  if (!node.outputs || node.outputs.length === 0) {
    warnings.push('Node has no outputs defined');
  }

  // Validate properties
  node.properties?.forEach((prop, index) => {
    if (!prop.name) errors.push(`Property ${index} missing name`);
    if (!prop.displayName) errors.push(`Property ${index} missing display name`);
    if (!prop.type) errors.push(`Property ${index} missing type`);
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * NodeValidator class for stateful validation scenarios
 */
export class NodeValidator {
  /**
   * Validate a single node
   */
  validate(node: IntegrationNode): ValidationResult {
    return validateNode(node);
  }

  /**
   * Validate multiple nodes
   */
  validateAll(nodes: IntegrationNode[]): Map<string, ValidationResult> {
    const results = new Map<string, ValidationResult>();
    for (const node of nodes) {
      results.set(node.id, validateNode(node));
    }
    return results;
  }

  /**
   * Check if a node is valid (convenience method)
   */
  isValid(node: IntegrationNode): boolean {
    return validateNode(node).valid;
  }
}
