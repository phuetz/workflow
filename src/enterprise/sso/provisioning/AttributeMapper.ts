/**
 * Attribute Mapper
 * Handles attribute mapping from SCIM/HR systems to local user format
 */

import { logger } from '../../../services/SimpleLogger';
import {
  SCIMUser,
  LocalUser,
  AttributeMapping,
  DEFAULT_ATTRIBUTE_MAPPINGS,
} from './types';

export class AttributeMapper {
  private attributeMappings: AttributeMapping[];

  constructor(mappings?: AttributeMapping[]) {
    this.attributeMappings = mappings || DEFAULT_ATTRIBUTE_MAPPINGS;
  }

  /**
   * Update attribute mappings
   */
  updateMappings(mappings: AttributeMapping[]): void {
    this.attributeMappings = mappings;
  }

  /**
   * Get current mappings
   */
  getMappings(): AttributeMapping[] {
    return [...this.attributeMappings];
  }

  /**
   * Map attributes from SCIM to local user format
   */
  mapAttributes(scimUser: SCIMUser): Partial<LocalUser> {
    const result: Partial<LocalUser> = {};

    for (const mapping of this.attributeMappings) {
      try {
        const value = this.getNestedValue(scimUser, mapping.source);

        if (value !== undefined && value !== null) {
          const transformedValue = mapping.transform ? mapping.transform(value) : value;
          this.setNestedValue(result, mapping.target, transformedValue);
        } else if (mapping.required && mapping.defaultValue !== undefined) {
          this.setNestedValue(result, mapping.target, mapping.defaultValue);
        } else if (mapping.required) {
          logger.warn('Required attribute missing', {
            source: mapping.source,
            target: mapping.target,
            userName: scimUser.userName
          });
        }
      } catch (error) {
        logger.error('Attribute mapping error', {
          source: mapping.source,
          target: mapping.target,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return result;
  }

  /**
   * Get nested value from object using dot notation
   */
  getNestedValue(obj: any, path: string): any {
    const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }

    return current;
  }

  /**
   * Set nested value in object using dot notation
   */
  setNestedValue(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * Detect conflicts between existing and new data
   */
  detectConflicts(existing: LocalUser, updates: Partial<LocalUser>): string[] {
    const conflicts: string[] = [];
    const fieldsToCheck = ['email', 'firstName', 'lastName', 'department', 'title'];

    for (const field of fieldsToCheck) {
      const existingValue = (existing as any)[field];
      const updateValue = (updates as any)[field];

      if (updateValue !== undefined && existingValue !== undefined &&
          existingValue !== updateValue && existingValue !== '') {
        conflicts.push(field);
      }
    }

    return conflicts;
  }
}
