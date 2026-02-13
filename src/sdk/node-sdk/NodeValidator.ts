/**
 * Node Validator
 * Validates custom nodes and packages
 */

import * as fs from 'fs';
import * as path from 'path';
import { INodeType, NodePackage, ValidationResult } from './types';

/**
 * NodeValidator validates INodeType instances
 */
export class NodeValidator {
  /**
   * Validate a node definition
   */
  validate(node: INodeType): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!node.description.name) {
      errors.push('Node name is required');
    }

    if (!node.description.displayName) {
      errors.push('Node display name is required');
    }

    if (!node.description.version) {
      errors.push('Node version is required');
    }

    if (!node.description.category) {
      errors.push('Node category is required');
    }

    // Validate properties
    for (const property of node.description.properties) {
      if (!property.name) {
        errors.push('Property name is required');
      }

      if (!property.displayName) {
        errors.push(`Property ${property.name} display name is required`);
      }

      if (!property.type) {
        errors.push(`Property ${property.name} type is required`);
      }
    }

    // Validate methods
    if (node.description.methods) {
      for (const method of node.description.methods) {
        if (!method.name) {
          errors.push('Method name is required');
        }
      }
    }

    // Validate credentials
    if (node.description.credentials) {
      for (const credential of node.description.credentials) {
        if (!credential.name) {
          errors.push('Credential name is required');
        }
        if (!credential.type) {
          errors.push(`Credential ${credential.name} type is required`);
        }
      }
    }

    // Add warnings for best practices
    if (!node.description.description) {
      warnings.push('Node description is recommended');
    }

    if (!node.description.metadata?.author) {
      warnings.push('Node author is recommended');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

/**
 * PackageValidator validates NodePackage configurations
 */
export class PackageValidator {
  /**
   * Validate a package.json configuration
   */
  validate(packageJson: NodePackage): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!packageJson.name) {
      errors.push('Package name is required');
    }

    if (!packageJson.version) {
      errors.push('Package version is required');
    }

    if (!packageJson.main) {
      errors.push('Package main entry is required');
    }

    if (!packageJson.n8n?.nodes || packageJson.n8n.nodes.length === 0) {
      errors.push('Package must define n8n nodes');
    }

    // Warnings for best practices
    if (!packageJson.description) {
      warnings.push('Package description is recommended');
    }

    if (!packageJson.license) {
      warnings.push('Package license is recommended');
    }

    if (!packageJson.author) {
      warnings.push('Package author is recommended');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate a package directory
   */
  validatePackageDir(packagePath: string): ValidationResult {
    try {
      const packageJsonPath = path.join(packagePath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        return {
          valid: false,
          errors: ['package.json not found'],
          warnings: []
        };
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      return this.validate(packageJson);
    } catch (error) {
      return {
        valid: false,
        errors: [`Failed to read package.json: ${(error as Error).message}`],
        warnings: []
      };
    }
  }
}

export default NodeValidator;
