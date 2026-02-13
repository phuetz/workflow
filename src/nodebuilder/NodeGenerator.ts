/**
 * NodeGenerator
 * Generates TypeScript code for custom nodes
 */

import {
  NodeBuilderConfig,
  GeneratedFile,
  NodeGenerationResult,
  ParameterDefinition,
  OperationDefinition,
  FieldType,
  HttpMethod,
  AuthType,
} from '../types/nodebuilder';

export class NodeGenerator {
  private config: NodeBuilderConfig;

  constructor(config: NodeBuilderConfig) {
    this.config = config;
  }

  /**
   * Generate all files for the node
   */
  async generate(): Promise<NodeGenerationResult> {
    const files: GeneratedFile[] = [];
    const errors: any[] = [];
    const warnings: string[] = [];

    try {
      // Generate main config file
      files.push(this.generateConfigFile());

      // Generate executor file
      files.push(this.generateExecutorFile());

      // Generate TypeScript types
      if (this.config.generationSettings.typescript.generateInterfaces) {
        files.push(this.generateTypesFile());
      }

      // Generate tests if enabled
      if (this.config.generationSettings.includeTests) {
        files.push(this.generateTestFile());
      }

      // Generate documentation if enabled
      if (this.config.generationSettings.includeDocumentation) {
        files.push(this.generateDocumentationFile());
      }

      // Calculate metrics
      const linesOfCode = files.reduce(
        (sum, file) => sum + file.content.split('\n').length,
        0
      );

      return {
        success: true,
        nodeId: this.config.id,
        files,
        errors,
        warnings,
        metadata: {
          generatedAt: new Date(),
          nodeCount: 1,
          linesOfCode,
          estimatedComplexity: this.estimateComplexity(),
          qualityScore: this.calculateQualityScore(),
        },
      };
    } catch (error: any) {
      errors.push({
        type: 'generation',
        message: error.message,
        location: 'NodeGenerator',
      });

      return {
        success: false,
        nodeId: this.config.id,
        files,
        errors,
        warnings,
        metadata: {
          generatedAt: new Date(),
          nodeCount: 0,
          linesOfCode: 0,
          estimatedComplexity: 0,
          qualityScore: 0,
        },
      };
    }
  }

  /**
   * Generate the React config component
   */
  private generateConfigFile(): GeneratedFile {
    const imports = this.generateImports();
    const interfaceDefinitions = this.generateInterfaces();
    const component = this.generateConfigComponent();

    const content = `${imports}

${interfaceDefinitions}

${component}`;

    return {
      path: `src/workflow/nodes/config/${this.toPascalCase(this.config.name)}Config.tsx`,
      content,
      type: 'config',
    };
  }

  /**
   * Generate imports
   */
  private generateImports(): string {
    return `import React, { useState, useEffect } from 'react';
import { AlertCircle, Info } from 'lucide-react';`;
  }

  /**
   * Generate TypeScript interfaces
   */
  private generateInterfaces(): string {
    const interfaces: string[] = [];

    // Generate config interface
    interfaces.push(`interface ${this.toPascalCase(this.config.name)}ConfigProps {
  config: any;
  onChange: (config: any) => void;
}`);

    // Generate parameter interfaces
    if (this.config.parameters && this.config.parameters.length > 0) {
      const fields = this.config.parameters
        .map((p) => `  ${p.name}${p.required ? '' : '?'}: ${this.mapFieldTypeToTS(p.type)};`)
        .join('\n');

      interfaces.push(`interface ${this.toPascalCase(this.config.name)}Config {
${fields}
}`);
    }

    return interfaces.join('\n\n');
  }

  /**
   * Generate the main React component
   */
  private generateConfigComponent(): string {
    const componentName = `${this.toPascalCase(this.config.name)}Config`;
    const parameters = this.config.parameters || [];
    const operations = this.config.operations || [];

    const operationSelect = operations.length > 1 ? this.generateOperationSelect() : '';
    const parameterFields = this.generateParameterFields(parameters);

    return `export const ${componentName}: React.FC<${componentName}Props> = ({ config, onChange }) => {
  const [localConfig, setLocalConfig] = useState(config || {});

  useEffect(() => {
    setLocalConfig(config || {});
  }, [config]);

  const handleChange = (field: string, value: any) => {
    const updated = { ...localConfig, [field]: value };
    setLocalConfig(updated);
    onChange(updated);
  };

  return (
    <div className="space-y-4 p-4">
      <div className="border-b pb-2 mb-4">
        <h3 className="text-lg font-semibold">${this.config.displayName}</h3>
        <p className="text-sm text-gray-600">${this.config.description}</p>
      </div>

      ${operationSelect}

      ${parameterFields}

      <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-500 mt-0.5" />
        <div className="text-sm text-blue-700">
          <p className="font-medium">Configuration Help</p>
          <p className="text-xs mt-1">${this.config.description}</p>
        </div>
      </div>
    </div>
  );
};

export default ${componentName};`;
  }

  /**
   * Generate operation selection dropdown
   */
  private generateOperationSelect(): string {
    const operations = this.config.operations || [];
    const options = operations
      .map((op) => `            <option value="${op.name}">${op.displayName}</option>`)
      .join('\n');

    return `      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Operation
        </label>
        <select
          value={localConfig.operation || '${operations[0]?.name || ''}'}
          onChange={(e) => handleChange('operation', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
${options}
        </select>
      </div>
`;
  }

  /**
   * Generate parameter input fields
   */
  private generateParameterFields(parameters: ParameterDefinition[]): string {
    return parameters
      .map((param) => {
        switch (param.type) {
          case FieldType.STRING:
          case FieldType.URL:
          case FieldType.EMAIL:
            return this.generateTextInput(param);
          case FieldType.PASSWORD:
            return this.generatePasswordInput(param);
          case FieldType.NUMBER:
            return this.generateNumberInput(param);
          case FieldType.BOOLEAN:
            return this.generateCheckbox(param);
          case FieldType.SELECT:
            return this.generateSelect(param);
          case FieldType.TEXT_AREA:
            return this.generateTextArea(param);
          case FieldType.JSON:
            return this.generateJsonEditor(param);
          default:
            return this.generateTextInput(param);
        }
      })
      .join('\n\n');
  }

  /**
   * Generate text input field
   */
  private generateTextInput(param: ParameterDefinition): string {
    return `      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          ${param.displayName}${param.required ? ' *' : ''}
        </label>
        <input
          type="text"
          value={localConfig.${param.name} || ''}
          onChange={(e) => handleChange('${param.name}', e.target.value)}
          placeholder="${param.placeholder || ''}"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          ${param.required ? 'required' : ''}
        />
        ${param.description ? `<p className="text-xs text-gray-500">${param.description}</p>` : ''}
      </div>`;
  }

  /**
   * Generate password input field
   */
  private generatePasswordInput(param: ParameterDefinition): string {
    return `      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          ${param.displayName}${param.required ? ' *' : ''}
        </label>
        <input
          type="password"
          value={localConfig.${param.name} || ''}
          onChange={(e) => handleChange('${param.name}', e.target.value)}
          placeholder="${param.placeholder || ''}"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          ${param.required ? 'required' : ''}
        />
        ${param.description ? `<p className="text-xs text-gray-500">${param.description}</p>` : ''}
      </div>`;
  }

  /**
   * Generate number input field
   */
  private generateNumberInput(param: ParameterDefinition): string {
    return `      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          ${param.displayName}${param.required ? ' *' : ''}
        </label>
        <input
          type="number"
          value={localConfig.${param.name} || ''}
          onChange={(e) => handleChange('${param.name}', parseFloat(e.target.value))}
          placeholder="${param.placeholder || ''}"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          ${param.required ? 'required' : ''}
        />
        ${param.description ? `<p className="text-xs text-gray-500">${param.description}</p>` : ''}
      </div>`;
  }

  /**
   * Generate checkbox field
   */
  private generateCheckbox(param: ParameterDefinition): string {
    return `      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={localConfig.${param.name} || false}
          onChange={(e) => handleChange('${param.name}', e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label className="text-sm font-medium text-gray-700">
          ${param.displayName}
        </label>
        ${param.description ? `<p className="text-xs text-gray-500 ml-6">${param.description}</p>` : ''}
      </div>`;
  }

  /**
   * Generate select dropdown
   */
  private generateSelect(param: ParameterDefinition): string {
    const options = (param.options || [])
      .map((opt) => `            <option value="${opt.value}">${opt.label}</option>`)
      .join('\n');

    return `      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          ${param.displayName}${param.required ? ' *' : ''}
        </label>
        <select
          value={localConfig.${param.name} || ''}
          onChange={(e) => handleChange('${param.name}', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          ${param.required ? 'required' : ''}
        >
          <option value="">Select...</option>
${options}
        </select>
        ${param.description ? `<p className="text-xs text-gray-500">${param.description}</p>` : ''}
      </div>`;
  }

  /**
   * Generate textarea field
   */
  private generateTextArea(param: ParameterDefinition): string {
    return `      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          ${param.displayName}${param.required ? ' *' : ''}
        </label>
        <textarea
          value={localConfig.${param.name} || ''}
          onChange={(e) => handleChange('${param.name}', e.target.value)}
          placeholder="${param.placeholder || ''}"
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          ${param.required ? 'required' : ''}
        />
        ${param.description ? `<p className="text-xs text-gray-500">${param.description}</p>` : ''}
      </div>`;
  }

  /**
   * Generate JSON editor field
   */
  private generateJsonEditor(param: ParameterDefinition): string {
    return `      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          ${param.displayName}${param.required ? ' *' : ''}
        </label>
        <textarea
          value={localConfig.${param.name} ? JSON.stringify(localConfig.${param.name}, null, 2) : ''}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              handleChange('${param.name}', parsed);
            } catch (err) {
              // Invalid JSON, keep as string
              handleChange('${param.name}', e.target.value);
            }
          }}
          placeholder="${param.placeholder || '{}'}"
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          ${param.required ? 'required' : ''}
        />
        ${param.description ? `<p className="text-xs text-gray-500">${param.description}</p>` : ''}
      </div>`;
  }

  /**
   * Generate executor file for backend execution
   */
  private generateExecutorFile(): GeneratedFile {
    const content = `/**
 * ${this.config.displayName} Executor
 * Auto-generated node executor
 */

${this.generateExecutorClass()}
`;

    return {
      path: `src/execution/executors/${this.toPascalCase(this.config.name)}Executor.ts`,
      content,
      type: 'executor',
    };
  }

  /**
   * Generate executor class
   */
  private generateExecutorClass(): string {
    const operations = this.config.operations || [];
    const authSetup = this.generateAuthSetup();
    const executeMethods = operations.map((op) => this.generateExecuteMethod(op)).join('\n\n');

    return `export class ${this.toPascalCase(this.config.name)}Executor {
  private baseUrl: string;
  private auth: any;

  constructor(credentials: any) {
${authSetup}
  }

${executeMethods}

  private async makeRequest(
    method: string,
    endpoint: string,
    data?: any,
    additionalHeaders?: Record<string, string>
  ): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...additionalHeaders,
    };

    ${this.generateAuthHeaders()}

    try {
      const response = await fetch(\`\${this.baseUrl}\${endpoint}\`, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        throw new Error(\`HTTP error! status: \${response.status}\`);
      }

      const result = await response.json();
      return result;
    } catch (error: any) {
      throw new Error(\`${this.config.displayName} request failed: \${error.message}\`);
    }
  }
}`;
  }

  /**
   * Generate authentication setup
   */
  private generateAuthSetup(): string {
    if (!this.config.authentication) {
      return '    this.baseUrl = credentials.baseUrl || \'\';';
    }

    const lines: string[] = ['    this.baseUrl = credentials.baseUrl || \'\';'];

    switch (this.config.authentication.type) {
      case AuthType.API_KEY:
        lines.push('    this.auth = { apiKey: credentials.apiKey };');
        break;
      case AuthType.BEARER_TOKEN:
        lines.push('    this.auth = { token: credentials.token };');
        break;
      case AuthType.OAUTH2:
        lines.push('    this.auth = { accessToken: credentials.accessToken };');
        break;
      case AuthType.BASIC_AUTH:
        lines.push('    this.auth = { username: credentials.username, password: credentials.password };');
        break;
    }

    return lines.join('\n');
  }

  /**
   * Generate authentication headers
   */
  private generateAuthHeaders(): string {
    if (!this.config.authentication) {
      return '';
    }

    switch (this.config.authentication.type) {
      case AuthType.API_KEY:
        const apiKeyField = this.config.authentication.fields[0];
        const headerName = apiKeyField.headerName || 'X-API-Key';
        return `    headers['${headerName}'] = this.auth.apiKey;`;

      case AuthType.BEARER_TOKEN:
        return `    headers['Authorization'] = \`Bearer \${this.auth.token}\`;`;

      case AuthType.OAUTH2:
        return `    headers['Authorization'] = \`Bearer \${this.auth.accessToken}\`;`;

      case AuthType.BASIC_AUTH:
        return `    const basicAuth = btoa(\`\${this.auth.username}:\${this.auth.password}\`);
    headers['Authorization'] = \`Basic \${basicAuth}\`;`;

      default:
        return '';
    }
  }

  /**
   * Generate execute method for an operation
   */
  private generateExecuteMethod(operation: OperationDefinition): string {
    const methodName = this.toCamelCase(operation.name);
    const params = operation.parameters
      .map((p) => `${p.name}${p.required ? '' : '?'}: ${this.mapFieldTypeToTS(p.type)}`)
      .join(', ');

    const endpoint = operation.httpConfig.endpoint;
    const method = operation.httpConfig.method;

    return `  async ${methodName}(${params}): Promise<any> {
    const data = {
      ${operation.parameters.map((p) => p.name).join(',\n      ')}
    };

    return this.makeRequest(
      '${method}',
      '${endpoint}',
      ${method === HttpMethod.GET ? 'undefined' : 'data'}
    );
  }`;
  }

  /**
   * Generate TypeScript types file
   */
  private generateTypesFile(): GeneratedFile {
    const content = `/**
 * ${this.config.displayName} Types
 * Auto-generated TypeScript types
 */

${this.generateTypeDefinitions()}
`;

    return {
      path: `src/types/${this.toCamelCase(this.config.name)}.ts`,
      content,
      type: 'types',
    };
  }

  /**
   * Generate type definitions
   */
  private generateTypeDefinitions(): string {
    const types: string[] = [];

    // Generate config type
    if (this.config.parameters && this.config.parameters.length > 0) {
      const fields = this.config.parameters
        .map((p) => `  ${p.name}${p.required ? '' : '?'}: ${this.mapFieldTypeToTS(p.type)};`)
        .join('\n');

      types.push(`export interface ${this.toPascalCase(this.config.name)}Config {
${fields}
}`);
    }

    // Generate response types for each operation
    this.config.operations?.forEach((op) => {
      types.push(`export interface ${this.toPascalCase(op.name)}Response {
  // TODO: Define response structure based on API
  data: any;
}`);
    });

    return types.join('\n\n');
  }

  /**
   * Generate test file
   */
  private generateTestFile(): GeneratedFile {
    const content = `/**
 * ${this.config.displayName} Tests
 * Auto-generated test suite
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ${this.toPascalCase(this.config.name)}Executor } from '../execution/executors/${this.toPascalCase(this.config.name)}Executor';

describe('${this.config.displayName}', () => {
  let executor: ${this.toPascalCase(this.config.name)}Executor;

  beforeEach(() => {
    executor = new ${this.toPascalCase(this.config.name)}Executor({
      baseUrl: 'https://api.example.com',
      ${this.generateTestCredentials()}
    });
  });

${this.generateTestCases()}
});
`;

    return {
      path: `src/__tests__/${this.toCamelCase(this.config.name)}.test.ts`,
      content,
      type: 'test',
    };
  }

  /**
   * Generate test credentials
   */
  private generateTestCredentials(): string {
    if (!this.config.authentication) {
      return '';
    }

    switch (this.config.authentication.type) {
      case AuthType.API_KEY:
        return 'apiKey: \'test-api-key\'';
      case AuthType.BEARER_TOKEN:
        return 'token: \'test-token\'';
      case AuthType.OAUTH2:
        return 'accessToken: \'test-access-token\'';
      case AuthType.BASIC_AUTH:
        return 'username: \'test\', password: \'test\'';
      default:
        return '';
    }
  }

  /**
   * Generate test cases
   */
  private generateTestCases(): string {
    const operations = this.config.operations || [];
    return operations
      .map((op) => {
        const methodName = this.toCamelCase(op.name);
        return `  it('should ${op.description.toLowerCase()}', async () => {
    // TODO: Implement test
    expect(executor).toBeDefined();
  });`;
      })
      .join('\n\n');
  }

  /**
   * Generate documentation file
   */
  private generateDocumentationFile(): GeneratedFile {
    const content = `# ${this.config.displayName}

${this.config.description}

## Configuration

${this.generateConfigDocumentation()}

## Operations

${this.generateOperationsDocumentation()}

## Examples

${this.generateExamplesDocumentation()}

---

*Auto-generated documentation*
`;

    return {
      path: `docs/nodes/${this.toCamelCase(this.config.name)}.md`,
      content,
      type: 'docs',
    };
  }

  /**
   * Generate configuration documentation
   */
  private generateConfigDocumentation(): string {
    const params = this.config.parameters || [];
    if (params.length === 0) {
      return 'No configuration parameters required.';
    }

    const table = params
      .map(
        (p) =>
          `| ${p.displayName} | \`${p.name}\` | ${this.mapFieldTypeToTS(p.type)} | ${p.required ? 'Yes' : 'No'} | ${p.description} |`
      )
      .join('\n');

    return `| Parameter | Field | Type | Required | Description |
|-----------|-------|------|----------|-------------|
${table}`;
  }

  /**
   * Generate operations documentation
   */
  private generateOperationsDocumentation(): string {
    const operations = this.config.operations || [];
    return operations
      .map(
        (op) => `### ${op.displayName}

${op.description}

**HTTP Method:** \`${op.httpConfig.method}\`
**Endpoint:** \`${op.httpConfig.endpoint}\`
`
      )
      .join('\n\n');
  }

  /**
   * Generate examples documentation
   */
  private generateExamplesDocumentation(): string {
    if (!this.config.examples || this.config.examples.length === 0) {
      return 'No examples available.';
    }

    return this.config.examples
      .map(
        (ex) => `### ${ex.name}

${ex.description}

**Input:**
\`\`\`json
${JSON.stringify(ex.input, null, 2)}
\`\`\`

**Output:**
\`\`\`json
${JSON.stringify(ex.expectedOutput, null, 2)}
\`\`\`
`
      )
      .join('\n\n');
  }

  /**
   * Helper: Convert string to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .replace(/[-_](.)/g, (_, char) => char.toUpperCase())
      .replace(/^(.)/, (char) => char.toUpperCase())
      .replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * Helper: Convert string to camelCase
   */
  private toCamelCase(str: string): string {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  /**
   * Helper: Map FieldType to TypeScript type
   */
  private mapFieldTypeToTS(fieldType: FieldType): string {
    switch (fieldType) {
      case FieldType.STRING:
      case FieldType.PASSWORD:
      case FieldType.TEXT_AREA:
      case FieldType.URL:
      case FieldType.EMAIL:
      case FieldType.SELECT:
        return 'string';
      case FieldType.NUMBER:
        return 'number';
      case FieldType.BOOLEAN:
        return 'boolean';
      case FieldType.JSON:
        return 'any';
      case FieldType.MULTI_SELECT:
        return 'string[]';
      case FieldType.EXPRESSION:
        return 'string';
      default:
        return 'any';
    }
  }

  /**
   * Estimate complexity of generated code
   */
  private estimateComplexity(): number {
    let score = 0;
    score += (this.config.operations?.length || 0) * 10;
    score += (this.config.parameters?.length || 0) * 5;
    score += this.config.authentication ? 15 : 0;
    return Math.min(score, 100);
  }

  /**
   * Calculate quality score
   */
  private calculateQualityScore(): number {
    let score = 100;

    // Deduct for missing documentation
    if (!this.config.description) score -= 10;
    if (!this.config.examples || this.config.examples.length === 0) score -= 10;

    // Deduct for missing parameters descriptions
    const missingDescriptions = (this.config.parameters || []).filter(
      (p) => !p.description
    ).length;
    score -= missingDescriptions * 2;

    return Math.max(score, 0);
  }
}
