/**
 * Auto-Generated UI Component
 * Automatically generate internal tools/interfaces from workflows
 */

import { EventEmitter } from 'events';

// Types
export interface WorkflowNode {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

export interface WorkflowParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect' | 'file' | 'json' | 'textarea';
  label: string;
  description?: string;
  required?: boolean;
  default?: unknown;
  options?: Array<{ value: string; label: string }>;
  validation?: ParameterValidation;
  placeholder?: string;
  group?: string;
}

export interface ParameterValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
  custom?: (value: unknown) => string | null;
}

export interface GeneratedUI {
  id: string;
  workflowId: string;
  name: string;
  description?: string;
  parameters: WorkflowParameter[];
  layout: UILayout;
  theme?: UITheme;
  actions: UIAction[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UILayout {
  type: 'form' | 'wizard' | 'tabs' | 'accordion';
  columns?: number;
  sections: UISection[];
}

export interface UISection {
  id: string;
  title: string;
  description?: string;
  fields: string[]; // Parameter names
  collapsible?: boolean;
  collapsed?: boolean;
}

export interface UITheme {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: string;
  fontFamily: string;
}

export interface UIAction {
  id: string;
  label: string;
  type: 'submit' | 'cancel' | 'reset' | 'custom';
  style: 'primary' | 'secondary' | 'danger' | 'ghost';
  position: 'left' | 'right' | 'center';
  handler?: string;
}

export interface UIGenerationOptions {
  includeDefaults?: boolean;
  groupByNodeType?: boolean;
  generateValidation?: boolean;
  layoutType?: UILayout['type'];
  theme?: Partial<UITheme>;
}

// Node type to parameter type mapping
const NODE_TO_PARAM_TYPES: Record<string, WorkflowParameter['type']> = {
  email: 'string',
  url: 'string',
  text: 'textarea',
  number: 'number',
  boolean: 'boolean',
  date: 'date',
  file: 'file',
  json: 'json',
  select: 'select',
  multiselect: 'multiselect',
};

// Common field configurations
const COMMON_FIELDS: Record<string, Partial<WorkflowParameter>> = {
  email: {
    type: 'string',
    validation: {
      pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
      patternMessage: 'Invalid email address',
    },
    placeholder: 'user@example.com',
  },
  url: {
    type: 'string',
    validation: {
      pattern: '^https?:\\/\\/.+',
      patternMessage: 'Must be a valid URL',
    },
    placeholder: 'https://example.com',
  },
  phone: {
    type: 'string',
    validation: {
      pattern: '^\\+?[0-9\\s\\-()]+$',
      patternMessage: 'Invalid phone number',
    },
    placeholder: '+1 (555) 123-4567',
  },
};

/**
 * Auto UI Generator
 * Converts workflows to interactive forms/interfaces
 */
export class AutoUIGenerator extends EventEmitter {
  private generatedUIs: Map<string, GeneratedUI> = new Map();
  private defaultTheme: UITheme = {
    primaryColor: '#3b82f6',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    borderRadius: '8px',
    fontFamily: 'Inter, system-ui, sans-serif',
  };

  constructor() {
    super();
  }

  /**
   * Generate UI from workflow definition
   */
  generateFromWorkflow(
    workflowId: string,
    workflowName: string,
    nodes: WorkflowNode[],
    options?: UIGenerationOptions
  ): GeneratedUI {
    const parameters = this.extractParameters(nodes, options);
    const layout = this.generateLayout(parameters, options);
    const actions = this.generateActions();

    const ui: GeneratedUI = {
      id: this.generateId(),
      workflowId,
      name: `${workflowName} Form`,
      description: `Auto-generated form for ${workflowName}`,
      parameters,
      layout,
      theme: { ...this.defaultTheme, ...options?.theme },
      actions,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.generatedUIs.set(ui.id, ui);
    this.emit('ui:generated', ui);

    return ui;
  }

  /**
   * Extract parameters from workflow nodes
   */
  private extractParameters(nodes: WorkflowNode[], options?: UIGenerationOptions): WorkflowParameter[] {
    const parameters: WorkflowParameter[] = [];
    const seenNames = new Set<string>();

    for (const node of nodes) {
      // Skip non-input nodes
      if (!this.isInputNode(node)) continue;

      const nodeParams = this.extractNodeParameters(node);

      for (const param of nodeParams) {
        // Avoid duplicates
        if (seenNames.has(param.name)) {
          param.name = `${param.name}_${node.id}`;
        }
        seenNames.add(param.name);

        // Set group if grouping is enabled
        if (options?.groupByNodeType) {
          param.group = node.type;
        }

        // Generate validation if enabled
        if (options?.generateValidation) {
          this.addValidation(param);
        }

        parameters.push(param);
      }
    }

    return parameters;
  }

  /**
   * Check if node is an input node
   */
  private isInputNode(node: WorkflowNode): boolean {
    const inputNodeTypes = [
      'trigger', 'webhook', 'form_trigger', 'manual_trigger',
      'set', 'code', 'function', 'http_request',
    ];
    return inputNodeTypes.includes(node.type) ||
           node.data.requiresInput === true ||
           Object.keys(node.data).some(k => k.includes('input') || k.includes('param'));
  }

  /**
   * Extract parameters from a single node
   */
  private extractNodeParameters(node: WorkflowNode): WorkflowParameter[] {
    const params: WorkflowParameter[] = [];

    // Extract from node data/config
    for (const [key, value] of Object.entries(node.data)) {
      if (this.isConfigurableField(key, value)) {
        const param = this.createParameter(key, value, node);
        params.push(param);
      }
    }

    // Handle special node types
    switch (node.type) {
      case 'form_trigger':
        params.push(...this.extractFormTriggerParams(node));
        break;
      case 'http_request':
        params.push(...this.extractHttpRequestParams(node));
        break;
      case 'code':
        params.push(...this.extractCodeParams(node));
        break;
    }

    return params;
  }

  /**
   * Check if field is configurable
   */
  private isConfigurableField(key: string, value: unknown): boolean {
    // Skip internal fields
    const internalFields = ['id', 'label', 'type', 'position', 'selected', 'dragging'];
    if (internalFields.includes(key)) return false;

    // Skip complex objects (unless they're options)
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return false;
    }

    return true;
  }

  /**
   * Create a parameter from node data
   */
  private createParameter(key: string, value: unknown, node: WorkflowNode): WorkflowParameter {
    const label = this.formatLabel(key);
    const type = this.inferType(key, value);

    const param: WorkflowParameter = {
      name: key,
      type,
      label,
      description: `${label} for ${node.type}`,
      required: false,
      default: value,
    };

    // Apply common field configurations
    const commonConfig = COMMON_FIELDS[key.toLowerCase()];
    if (commonConfig) {
      Object.assign(param, commonConfig);
    }

    return param;
  }

  /**
   * Infer parameter type from key and value
   */
  private inferType(key: string, value: unknown): WorkflowParameter['type'] {
    // Check key patterns
    const keyLower = key.toLowerCase();
    if (keyLower.includes('email')) return 'string';
    if (keyLower.includes('url') || keyLower.includes('link')) return 'string';
    if (keyLower.includes('date') || keyLower.includes('time')) return 'date';
    if (keyLower.includes('description') || keyLower.includes('body') || keyLower.includes('content')) return 'textarea';
    if (keyLower.includes('json') || keyLower.includes('data')) return 'json';
    if (keyLower.includes('file') || keyLower.includes('attachment')) return 'file';

    // Check value type
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (Array.isArray(value)) return 'multiselect';

    return 'string';
  }

  /**
   * Format key to label
   */
  private formatLabel(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]/g, ' ')
      .replace(/^\w/, c => c.toUpperCase())
      .trim();
  }

  /**
   * Add validation rules to parameter
   */
  private addValidation(param: WorkflowParameter): void {
    if (param.validation) return; // Already has validation

    switch (param.type) {
      case 'string':
        param.validation = {
          minLength: 1,
          maxLength: 1000,
        };
        break;
      case 'number':
        param.validation = {
          min: Number.MIN_SAFE_INTEGER,
          max: Number.MAX_SAFE_INTEGER,
        };
        break;
      case 'textarea':
        param.validation = {
          maxLength: 10000,
        };
        break;
    }
  }

  /**
   * Extract form trigger parameters
   */
  private extractFormTriggerParams(node: WorkflowNode): WorkflowParameter[] {
    const fields = node.data.fields as Array<{ name: string; type: string; label?: string; required?: boolean }> || [];

    return fields.map(field => ({
      name: field.name,
      type: NODE_TO_PARAM_TYPES[field.type] || 'string',
      label: field.label || this.formatLabel(field.name),
      required: field.required || false,
    }));
  }

  /**
   * Extract HTTP request parameters
   */
  private extractHttpRequestParams(node: WorkflowNode): WorkflowParameter[] {
    const params: WorkflowParameter[] = [];

    // URL parameter
    if (node.data.url && String(node.data.url).includes('{{')) {
      const urlParams = this.extractExpressionParams(String(node.data.url));
      params.push(...urlParams);
    }

    // Body parameters
    if (node.data.body && typeof node.data.body === 'string') {
      const bodyParams = this.extractExpressionParams(node.data.body);
      params.push(...bodyParams);
    }

    // Query parameters
    if (node.data.queryParams && typeof node.data.queryParams === 'object') {
      for (const [key, value] of Object.entries(node.data.queryParams as Record<string, unknown>)) {
        if (typeof value === 'string' && value.includes('{{')) {
          params.push(...this.extractExpressionParams(value, key));
        }
      }
    }

    return params;
  }

  /**
   * Extract code parameters
   */
  private extractCodeParams(node: WorkflowNode): WorkflowParameter[] {
    const params: WorkflowParameter[] = [];
    const code = String(node.data.code || '');

    // Extract parameters from input references
    const inputMatches = code.matchAll(/\$input\.(\w+)/g);
    for (const match of inputMatches) {
      params.push({
        name: match[1],
        type: 'string',
        label: this.formatLabel(match[1]),
        description: `Input parameter from code node`,
      });
    }

    return params;
  }

  /**
   * Extract parameters from expression syntax
   */
  private extractExpressionParams(expression: string, prefix?: string): WorkflowParameter[] {
    const params: WorkflowParameter[] = [];
    const matches = expression.matchAll(/\{\{(\w+(?:\.\w+)*)\}\}/g);

    for (const match of matches) {
      const name = prefix ? `${prefix}_${match[1]}` : match[1];
      params.push({
        name,
        type: 'string',
        label: this.formatLabel(name),
        description: `Dynamic parameter from expression`,
      });
    }

    return params;
  }

  /**
   * Generate layout for parameters
   */
  private generateLayout(parameters: WorkflowParameter[], options?: UIGenerationOptions): UILayout {
    const layoutType = options?.layoutType || 'form';

    // Group parameters by group field
    const groups = new Map<string, WorkflowParameter[]>();
    for (const param of parameters) {
      const group = param.group || 'General';
      if (!groups.has(group)) {
        groups.set(group, []);
      }
      groups.get(group)!.push(param);
    }

    // Create sections
    const sections: UISection[] = [];
    for (const [groupName, groupParams] of groups) {
      sections.push({
        id: `section_${groupName.toLowerCase().replace(/\s+/g, '_')}`,
        title: groupName,
        fields: groupParams.map(p => p.name),
        collapsible: groups.size > 1,
        collapsed: false,
      });
    }

    return {
      type: layoutType,
      columns: parameters.length > 4 ? 2 : 1,
      sections,
    };
  }

  /**
   * Generate default actions
   */
  private generateActions(): UIAction[] {
    return [
      {
        id: 'submit',
        label: 'Execute Workflow',
        type: 'submit',
        style: 'primary',
        position: 'right',
      },
      {
        id: 'reset',
        label: 'Reset',
        type: 'reset',
        style: 'secondary',
        position: 'right',
      },
      {
        id: 'cancel',
        label: 'Cancel',
        type: 'cancel',
        style: 'ghost',
        position: 'left',
      },
    ];
  }

  /**
   * Generate React component code
   */
  generateReactComponent(ui: GeneratedUI): string {
    const component = `
import React, { useState } from 'react';

interface ${this.toPascalCase(ui.name)}Props {
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel?: () => void;
}

export const ${this.toPascalCase(ui.name)}: React.FC<${this.toPascalCase(ui.name)}Props> = ({
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState<Record<string, unknown>>({
${ui.parameters.map(p => `    ${p.name}: ${JSON.stringify(p.default ?? '')},`).join('\n')}
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (name: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
${ui.parameters.filter(p => p.required).map(p => `
    if (!formData.${p.name}) {
      newErrors.${p.name} = '${p.label} is required';
    }`).join('')}
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold">${ui.name}</h2>
      ${ui.description ? `<p className="text-gray-600">${ui.description}</p>` : ''}

      <div className="grid grid-cols-${ui.layout.columns || 1} gap-4">
${ui.parameters.map(p => this.generateFieldJSX(p)).join('\n')}
      </div>

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
        <div className="space-x-2">
          <button
            type="reset"
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Reset
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Execute Workflow
          </button>
        </div>
      </div>
    </form>
  );
};

export default ${this.toPascalCase(ui.name)};
`;

    return component.trim();
  }

  /**
   * Generate JSX for a field
   */
  private generateFieldJSX(param: WorkflowParameter): string {
    const errorDisplay = `{errors.${param.name} && <span className="text-red-500 text-sm">{errors.${param.name}}</span>}`;

    switch (param.type) {
      case 'textarea':
        return `
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">${param.label}${param.required ? ' *' : ''}</label>
          <textarea
            value={formData.${param.name} as string}
            onChange={(e) => handleChange('${param.name}', e.target.value)}
            placeholder="${param.placeholder || ''}"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows={4}
          />
          ${errorDisplay}
        </div>`;

      case 'boolean':
        return `
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.${param.name} as boolean}
            onChange={(e) => handleChange('${param.name}', e.target.checked)}
            className="h-4 w-4 text-blue-500"
          />
          <label className="text-sm font-medium text-gray-700">${param.label}</label>
        </div>`;

      case 'number':
        return `
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">${param.label}${param.required ? ' *' : ''}</label>
          <input
            type="number"
            value={formData.${param.name} as number}
            onChange={(e) => handleChange('${param.name}', parseFloat(e.target.value))}
            placeholder="${param.placeholder || ''}"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          ${errorDisplay}
        </div>`;

      case 'select':
        return `
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">${param.label}${param.required ? ' *' : ''}</label>
          <select
            value={formData.${param.name} as string}
            onChange={(e) => handleChange('${param.name}', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Select...</option>
            ${(param.options || []).map(o => `<option value="${o.value}">${o.label}</option>`).join('\n            ')}
          </select>
          ${errorDisplay}
        </div>`;

      case 'date':
        return `
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">${param.label}${param.required ? ' *' : ''}</label>
          <input
            type="datetime-local"
            value={formData.${param.name} as string}
            onChange={(e) => handleChange('${param.name}', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          ${errorDisplay}
        </div>`;

      default:
        return `
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">${param.label}${param.required ? ' *' : ''}</label>
          <input
            type="text"
            value={formData.${param.name} as string}
            onChange={(e) => handleChange('${param.name}', e.target.value)}
            placeholder="${param.placeholder || ''}"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          ${errorDisplay}
        </div>`;
    }
  }

  /**
   * Convert string to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `ui_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get generated UI by ID
   */
  getUI(id: string): GeneratedUI | undefined {
    return this.generatedUIs.get(id);
  }

  /**
   * List all generated UIs
   */
  listUIs(): GeneratedUI[] {
    return Array.from(this.generatedUIs.values());
  }

  /**
   * Delete generated UI
   */
  deleteUI(id: string): boolean {
    const deleted = this.generatedUIs.delete(id);
    if (deleted) {
      this.emit('ui:deleted', id);
    }
    return deleted;
  }

  /**
   * Update UI configuration
   */
  updateUI(id: string, updates: Partial<GeneratedUI>): GeneratedUI | null {
    const ui = this.generatedUIs.get(id);
    if (!ui) return null;

    const updated = {
      ...ui,
      ...updates,
      updatedAt: new Date(),
    };

    this.generatedUIs.set(id, updated);
    this.emit('ui:updated', updated);

    return updated;
  }
}

// Export factory function
export function createAutoUIGenerator(): AutoUIGenerator {
  return new AutoUIGenerator();
}

export default AutoUIGenerator;
