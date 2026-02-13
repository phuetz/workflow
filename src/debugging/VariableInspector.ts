/**
 * Variable Inspector
 * Inspects and manages variables during debugging sessions
 */

import type {
  VariableMetadata,
  VariableScope
} from '../types/debugging';

export class VariableInspector {
  /**
   * Inspect a variable and extract metadata
   */
  inspectVariable(
    name: string,
    value: unknown,
    path: string[] = []
  ): VariableMetadata {
    const type = this.getType(value);
    const size = this.getSize(value);
    const isExpandable = this.isExpandable(value);
    const isEditable = this.isEditable(value);

    return {
      name,
      value,
      type,
      size,
      isExpandable,
      isEditable,
      path: [...path, name]
    };
  }

  /**
   * Get all variables from scope
   */
  inspectScope(scope: VariableScope): VariableMetadata[] {
    const variables: VariableMetadata[] = [];

    // Node input
    Object.entries(scope.nodeInput).forEach(([key, value]) => {
      variables.push(this.inspectVariable(key, value, ['nodeInput']));
    });

    // Node output
    Object.entries(scope.nodeOutput).forEach(([key, value]) => {
      variables.push(this.inspectVariable(key, value, ['nodeOutput']));
    });

    // Workflow variables
    Object.entries(scope.workflowVariables).forEach(([key, value]) => {
      variables.push(this.inspectVariable(key, value, ['workflowVariables']));
    });

    // Environment variables
    Object.entries(scope.environmentVariables).forEach(([key, value]) => {
      variables.push(this.inspectVariable(key, value, ['environmentVariables']));
    });

    return variables;
  }

  /**
   * Expand a nested variable
   */
  expandVariable(metadata: VariableMetadata): VariableMetadata[] {
    if (!metadata.isExpandable) return [];

    const expanded: VariableMetadata[] = [];

    if (Array.isArray(metadata.value)) {
      // Expand array
      (metadata.value as unknown[]).forEach((item, index) => {
        expanded.push(
          this.inspectVariable(`[${index}]`, item, metadata.path)
        );
      });
    } else if (typeof metadata.value === 'object' && metadata.value !== null) {
      // Expand object
      Object.entries(metadata.value as Record<string, unknown>).forEach(([key, value]) => {
        expanded.push(
          this.inspectVariable(key, value, metadata.path)
        );
      });
    }

    return expanded;
  }

  /**
   * Get variable at path
   */
  getVariableAtPath(scope: VariableScope, path: string[]): unknown {
    let current: unknown = scope;

    for (const key of path) {
      if (current === null || current === undefined) return undefined;
      current = (current as Record<string, unknown>)[key];
    }

    return current;
  }

  /**
   * Set variable at path (for testing/debugging)
   */
  setVariableAtPath(scope: VariableScope, path: string[], value: unknown): boolean {
    if (path.length === 0) return false;

    let current: unknown = scope;

    // Navigate to parent
    for (let i = 0; i < path.length - 1; i++) {
      current = (current as Record<string, unknown>)[path[i]];
      if (current === null || current === undefined) return false;
    }

    // Set value
    try {
      (current as Record<string, unknown>)[path[path.length - 1]] = value;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Format value for display
   */
  formatValue(value: unknown, maxLength = 100): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';

    const type = typeof value;

    switch (type) {
      case 'string':
        return (value as string).length > maxLength
          ? `"${(value as string).substring(0, maxLength)}..."`
          : `"${value}"`;

      case 'number':
      case 'boolean':
        return String(value);

      case 'function':
        return '[Function]';

      case 'object':
        if (Array.isArray(value)) {
          return `Array(${value.length})`;
        }
        if (value instanceof Date) {
          return (value as Date).toISOString();
        }
        if (value instanceof RegExp) {
          return String(value);
        }
        if (value instanceof Error) {
          return `Error: ${(value as Error).message}`;
        }
        return `Object {${Object.keys(value as object).length} keys}`;

      default:
        return String(value);
    }
  }

  /**
   * Get detailed type
   */
  private getType(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';

    const type = typeof value;

    if (type === 'object') {
      if (Array.isArray(value)) return 'array';
      if (value instanceof Date) return 'date';
      if (value instanceof RegExp) return 'regexp';
      if (value instanceof Error) return 'error';
      if (value instanceof Map) return 'map';
      if (value instanceof Set) return 'set';
      return 'object';
    }

    return type;
  }

  /**
   * Get size (for arrays and objects)
   */
  private getSize(value: unknown): number | undefined {
    if (Array.isArray(value)) {
      return value.length;
    }
    if (typeof value === 'object' && value !== null) {
      return Object.keys(value as object).length;
    }
    if (typeof value === 'string') {
      return value.length;
    }
    return undefined;
  }

  /**
   * Check if value is expandable
   */
  private isExpandable(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value as object).length > 0;
    return false;
  }

  /**
   * Check if value is editable
   */
  private isEditable(value: unknown): boolean {
    const type = typeof value;
    return type === 'string' || type === 'number' || type === 'boolean';
  }

  /**
   * Copy value to clipboard format
   */
  copyToClipboard(value: unknown): string {
    if (value === null || value === undefined) {
      return String(value);
    }

    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    }

    return String(value);
  }

  /**
   * Search variables
   */
  searchVariables(
    variables: VariableMetadata[],
    searchText: string,
    caseSensitive = false
  ): VariableMetadata[] {
    const search = caseSensitive ? searchText : searchText.toLowerCase();

    return variables.filter(variable => {
      const name = caseSensitive ? variable.name : variable.name.toLowerCase();
      const value = caseSensitive
        ? this.formatValue(variable.value)
        : this.formatValue(variable.value).toLowerCase();

      return name.includes(search) || value.includes(search);
    });
  }

  /**
   * Get variable tree (nested structure)
   */
  getVariableTree(scope: VariableScope): VariableTreeNode[] {
    const tree: VariableTreeNode[] = [];

    // Node Input
    tree.push({
      name: 'Node Input',
      value: scope.nodeInput,
      type: 'object',
      expanded: false,
      children: Object.entries(scope.nodeInput).map(([key, value]) =>
        this.createTreeNode(key, value, ['nodeInput'])
      )
    });

    // Node Output
    tree.push({
      name: 'Node Output',
      value: scope.nodeOutput,
      type: 'object',
      expanded: false,
      children: Object.entries(scope.nodeOutput).map(([key, value]) =>
        this.createTreeNode(key, value, ['nodeOutput'])
      )
    });

    // Workflow Variables
    tree.push({
      name: 'Workflow Variables',
      value: scope.workflowVariables,
      type: 'object',
      expanded: false,
      children: Object.entries(scope.workflowVariables).map(([key, value]) =>
        this.createTreeNode(key, value, ['workflowVariables'])
      )
    });

    // Environment Variables
    tree.push({
      name: 'Environment Variables',
      value: scope.environmentVariables,
      type: 'object',
      expanded: false,
      children: Object.entries(scope.environmentVariables).map(([key, value]) =>
        this.createTreeNode(key, value, ['environmentVariables'])
      )
    });

    return tree;
  }

  /**
   * Create tree node
   */
  private createTreeNode(
    name: string,
    value: unknown,
    path: string[]
  ): VariableTreeNode {
    const type = this.getType(value);
    const children: VariableTreeNode[] = [];

    if (this.isExpandable(value)) {
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          children.push(this.createTreeNode(`[${index}]`, item, [...path, name]));
        });
      } else if (typeof value === 'object' && value !== null) {
        Object.entries(value as Record<string, unknown>).forEach(([key, val]) => {
          children.push(this.createTreeNode(key, val, [...path, name]));
        });
      }
    }

    return {
      name,
      value,
      type,
      expanded: false,
      children,
      path: [...path, name]
    };
  }

  /**
   * Compare two variable scopes (for diff view)
   */
  compareScopes(
    before: VariableScope,
    after: VariableScope
  ): VariableDiff[] {
    const diffs: VariableDiff[] = [];

    // Compare node inputs
    this.compareMaps(
      before.nodeInput as Record<string, unknown>,
      after.nodeInput as Record<string, unknown>,
      ['nodeInput'],
      diffs
    );

    // Compare node outputs
    this.compareMaps(
      before.nodeOutput as Record<string, unknown>,
      after.nodeOutput as Record<string, unknown>,
      ['nodeOutput'],
      diffs
    );

    // Compare workflow variables
    this.compareMaps(
      before.workflowVariables as Record<string, unknown>,
      after.workflowVariables as Record<string, unknown>,
      ['workflowVariables'],
      diffs
    );

    return diffs;
  }

  /**
   * Compare two objects
   */
  private compareMaps(
    before: Record<string, unknown>,
    after: Record<string, unknown>,
    path: string[],
    diffs: VariableDiff[]
  ): void {
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    allKeys.forEach(key => {
      const beforeValue = before[key];
      const afterValue = after[key];

      if (!(key in before)) {
        // Added
        diffs.push({
          type: 'added',
          path: [...path, key],
          value: afterValue
        });
      } else if (!(key in after)) {
        // Removed
        diffs.push({
          type: 'removed',
          path: [...path, key],
          value: beforeValue
        });
      } else if (beforeValue !== afterValue) {
        // Changed
        diffs.push({
          type: 'changed',
          path: [...path, key],
          oldValue: beforeValue,
          newValue: afterValue
        });
      }
    });
  }
}

interface VariableTreeNode {
  name: string;
  value: unknown;
  type: string;
  expanded: boolean;
  children: VariableTreeNode[];
  path?: string[];
}

interface VariableDiff {
  type: 'added' | 'removed' | 'changed';
  path: string[];
  value?: unknown;
  oldValue?: unknown;
  newValue?: unknown;
}

// Singleton instance
export const variableInspector = new VariableInspector();

export default VariableInspector;
