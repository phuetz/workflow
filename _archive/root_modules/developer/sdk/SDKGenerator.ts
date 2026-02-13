import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import * as prettier from 'prettier';
// import * as ts from 'typescript'; // Currently unused
import { OpenAPIV3 } from 'openapi-types';
import * as yaml from 'js-yaml';
import { execSync } from 'child_process';

export interface SDKConfig {
  language: 'typescript' | 'javascript' | 'python' | 'java' | 'go' | 'csharp' | 'ruby' | 'php';
  outputPath: string;
  packageName: string;
  version: string;
  apiSpecPath?: string;
  apiBaseUrl?: string;
  authentication?: {
    type: 'apiKey' | 'oauth2' | 'bearer' | 'basic';
    parameterName?: string;
    location?: 'header' | 'query' | 'cookie';
  };
  features?: {
    includeTypes?: boolean;
    includeValidation?: boolean;
    includeRetry?: boolean;
    includeLogging?: boolean;
    includeTesting?: boolean;
    includeDocumentation?: boolean;
  };
  customTemplates?: string;
}

export interface SDKTemplate {
  name: string;
  path: string;
  output: string;
  condition?: (config: SDKConfig) => boolean;
}

export interface APIEndpoint {
  path: string;
  method: string;
  operationId: string;
  summary?: string;
  description?: string;
  parameters?: unknown[];
  requestBody?: unknown;
  responses?: unknown;
  security?: unknown[];
  tags?: string[];
}

export interface SDKModel {
  name: string;
  properties: Record<string, unknown>;
  required?: string[];
  description?: string;
}

export class SDKGenerator extends EventEmitter {
  private templates: Map<string, SDKTemplate[]> = new Map();
  private apiSpec: OpenAPIV3.Document | null = null;
  private handlebars: typeof Handlebars;

  constructor() {
    super();
    this.handlebars = Handlebars.create();
    this.registerHelpers();
    this.loadTemplates();
  }

  private registerHelpers(): void {
    // Language-specific type mapping
    this.handlebars.registerHelper('mapType', (type: string, language: string) => {
      const typeMap: Record<string, Record<string, string>> = {
        typescript: {
          string: 'string',
          number: 'number',
          integer: 'number',
          boolean: 'boolean',
          array: 'Array',
          object: 'Record<string, any>',
          null: 'null',
          any: 'any'
        },
        python: {
          string: 'str',
          number: 'float',
          integer: 'int',
          boolean: 'bool',
          array: 'List',
          object: 'Dict[str, Any]',
          null: 'None',
          any: 'Any'
        },
        java: {
          string: 'String',
          number: 'Double',
          integer: 'Integer',
          boolean: 'Boolean',
          array: 'List',
          object: 'Map<String, Object>',
          null: 'null',
          any: 'Object'
        },
        go: {
          string: 'string',
          number: 'float64',
          integer: 'int64',
          boolean: 'bool',
          array: '[]',
          object: 'map[string]interface{}',
          null: 'nil',
          any: 'interface{}'
        },
        csharp: {
          string: 'string',
          number: 'double',
          integer: 'int',
          boolean: 'bool',
          array: 'List',
          object: 'Dictionary<string, object>',
          null: 'null',
          any: 'object'
        }
      };

      return typeMap[language]?.[type] || type;
    });

    // Case conversion helpers
    this.handlebars.registerHelper('camelCase', (str: string) => {
      return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    });

    this.handlebars.registerHelper('pascalCase', (str: string) => {
      const camel = str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      return camel.charAt(0).toUpperCase() + camel.slice(1);
    });

    this.handlebars.registerHelper('snakeCase', (str: string) => {
      return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
    });

    this.handlebars.registerHelper('kebabCase', (str: string) => {
      return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
    });

    // Language-specific helpers
    this.handlebars.registerHelper('indent', (text: string, spaces: number) => {
      const indent = ' '.repeat(spaces);
      return text.split('\n').map(line => line ? indent + line : line).join('\n');
    });

    this.handlebars.registerHelper('join', (array: unknown[], separator: string) => {
      return array.join(separator);
    });

    this.handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);
    this.handlebars.registerHelper('ne', (a: unknown, b: unknown) => a !== b);
    this.handlebars.registerHelper('gt', (a: unknown, b: unknown) => a > b);
    this.handlebars.registerHelper('lt', (a: unknown, b: unknown) => a < b);
    this.handlebars.registerHelper('and', (a: unknown, b: unknown) => a && b);
    this.handlebars.registerHelper('or', (a: unknown, b: unknown) => a || b);
  }

  private loadTemplates(): void {
    // TypeScript templates
    this.templates.set('typescript', [
      {
        name: 'client',
        path: 'typescript/client.hbs',
        output: 'src/client.ts'
      },
      {
        name: 'types',
        path: 'typescript/types.hbs',
        output: 'src/types.ts',
        condition: (config) => config.features?.includeTypes !== false
      },
      {
        name: 'api',
        path: 'typescript/api.hbs',
        output: 'src/api.ts'
      },
      {
        name: 'utils',
        path: 'typescript/utils.hbs',
        output: 'src/utils.ts'
      },
      {
        name: 'package',
        path: 'typescript/package.json.hbs',
        output: 'package.json'
      },
      {
        name: 'tsconfig',
        path: 'typescript/tsconfig.json.hbs',
        output: 'tsconfig.json'
      },
      {
        name: 'readme',
        path: 'typescript/README.md.hbs',
        output: 'README.md'
      },
      {
        name: 'tests',
        path: 'typescript/tests.hbs',
        output: 'tests/client.test.ts',
        condition: (config) => config.features?.includeTesting === true
      }
    ]);

    // Python templates
    this.templates.set('python', [
      {
        name: 'client',
        path: 'python/client.hbs',
        output: 'src/__init__.py'
      },
      {
        name: 'api',
        path: 'python/api.hbs',
        output: 'src/api.py'
      },
      {
        name: 'models',
        path: 'python/models.hbs',
        output: 'src/models.py'
      },
      {
        name: 'utils',
        path: 'python/utils.hbs',
        output: 'src/utils.py'
      },
      {
        name: 'setup',
        path: 'python/setup.py.hbs',
        output: 'setup.py'
      },
      {
        name: 'requirements',
        path: 'python/requirements.txt.hbs',
        output: 'requirements.txt'
      },
      {
        name: 'readme',
        path: 'python/README.md.hbs',
        output: 'README.md'
      },
      {
        name: 'tests',
        path: 'python/tests.hbs',
        output: 'tests/test_client.py',
        condition: (config) => config.features?.includeTesting === true
      }
    ]);

    // Java templates
    this.templates.set('java', [
      {
        name: 'client',
        path: 'java/Client.hbs',
        output: 'src/main/java/{{packagePath}}/Client.java'
      },
      {
        name: 'api',
        path: 'java/Api.hbs',
        output: 'src/main/java/{{packagePath}}/api/{{className}}Api.java'
      },
      {
        name: 'models',
        path: 'java/Model.hbs',
        output: 'src/main/java/{{packagePath}}/models/{{className}}.java'
      },
      {
        name: 'utils',
        path: 'java/Utils.hbs',
        output: 'src/main/java/{{packagePath}}/utils/Utils.java'
      },
      {
        name: 'pom',
        path: 'java/pom.xml.hbs',
        output: 'pom.xml'
      },
      {
        name: 'readme',
        path: 'java/README.md.hbs',
        output: 'README.md'
      },
      {
        name: 'tests',
        path: 'java/Tests.hbs',
        output: 'src/test/java/{{packagePath}}/ClientTest.java',
        condition: (config) => config.features?.includeTesting === true
      }
    ]);

    // Go templates
    this.templates.set('go', [
      {
        name: 'client',
        path: 'go/client.hbs',
        output: 'client.go'
      },
      {
        name: 'api',
        path: 'go/api.hbs',
        output: 'api.go'
      },
      {
        name: 'models',
        path: 'go/models.hbs',
        output: 'models.go'
      },
      {
        name: 'utils',
        path: 'go/utils.hbs',
        output: 'utils.go'
      },
      {
        name: 'gomod',
        path: 'go/go.mod.hbs',
        output: 'go.mod'
      },
      {
        name: 'readme',
        path: 'go/README.md.hbs',
        output: 'README.md'
      },
      {
        name: 'tests',
        path: 'go/tests.hbs',
        output: 'client_test.go',
        condition: (config) => config.features?.includeTesting === true
      }
    ]);

    // C# templates
    this.templates.set('csharp', [
      {
        name: 'client',
        path: 'csharp/Client.hbs',
        output: 'src/Client.cs'
      },
      {
        name: 'api',
        path: 'csharp/Api.hbs',
        output: 'src/Api/{{className}}Api.cs'
      },
      {
        name: 'models',
        path: 'csharp/Model.hbs',
        output: 'src/Models/{{className}}.cs'
      },
      {
        name: 'utils',
        path: 'csharp/Utils.hbs',
        output: 'src/Utils/Utils.cs'
      },
      {
        name: 'csproj',
        path: 'csharp/project.csproj.hbs',
        output: '{{packageName}}.csproj'
      },
      {
        name: 'readme',
        path: 'csharp/README.md.hbs',
        output: 'README.md'
      },
      {
        name: 'tests',
        path: 'csharp/Tests.hbs',
        output: 'tests/ClientTests.cs',
        condition: (config) => config.features?.includeTesting === true
      }
    ]);
  }

  public async generateSDK(config: SDKConfig): Promise<void> {
    this.emit('generation:start', config);

    try {
      // Load API specification if provided
      if (config.apiSpecPath) {
        await this.loadAPISpec(config.apiSpecPath);
      }

      // Create output directory
      await fs.mkdir(config.outputPath, { recursive: true });

      // Get templates for the selected language
      const templates = this.templates.get(config.language);
      if (!templates) {
        throw new Error(`Unsupported language: ${config.language}`);
      }

      // Parse API specification
      const endpoints = this.parseEndpoints();
      const models = this.parseModels();

      // Generate context for templates
      const context = {
        packageName: config.packageName,
        version: config.version,
        apiBaseUrl: config.apiBaseUrl || 'https://api.example.com',
        authentication: config.authentication,
        features: config.features || {},
        endpoints,
        models,
        language: config.language,
        packagePath: config.packageName.replace(/\./g, '/'),
        timestamp: new Date().toISOString()
      };

      // Generate files from templates
      for (const template of templates) {
        if (template.condition && !template.condition(config)) {
          continue;
        }

        const templateContent = await this.loadTemplate(template.path);
        const rendered = this.handlebars.compile(templateContent)(context);
        
        // Process output path
        const outputPath = this.handlebars.compile(template.output)(context);
        const fullPath = path.join(config.outputPath, outputPath);
        
        // Create directory if needed
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        
        // Format code based on language
        const formatted = await this.formatCode(rendered, config.language, path.extname(fullPath));
        
        // Write file
        await fs.writeFile(fullPath, formatted);
        
        this.emit('file:generated', { template: template.name, path: fullPath });
      }

      // Generate additional files based on API spec
      if (this.apiSpec) {
        await this.generateAPISpecificFiles(config, context);
      }

      // Generate documentation if enabled
      if (config.features?.includeDocumentation) {
        await this.generateDocumentation(config, context);
      }

      this.emit('generation:complete', { 
        language: config.language, 
        outputPath: config.outputPath,
        filesGenerated: templates.length 
      });

    } catch (error) {
      this.emit('generation:error', error);
      throw error;
    }
  }

  private async loadAPISpec(specPath: string): Promise<void> {
    const content = await fs.readFile(specPath, 'utf-8');
    const ext = path.extname(specPath).toLowerCase();

    if (ext === '.json') {
      this.apiSpec = JSON.parse(content);
    } else if (ext === '.yaml' || ext === '.yml') {
      this.apiSpec = yaml.load(content) as OpenAPIV3.Document;
    } else {
      throw new Error('Unsupported API specification format. Use JSON or YAML.');
    }
  }

  private parseEndpoints(): APIEndpoint[] {
    if (!this.apiSpec) return [];

    const endpoints: APIEndpoint[] = [];
    const paths = this.apiSpec.paths || {};

    for (const [pathStr, pathItem] of Object.entries(paths)) {
      if (!pathItem) continue;

      const methods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];
      
      for (const method of methods) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const operation = (pathItem as any)[method]; // Dynamic property access
        if (!operation) continue;

        endpoints.push({
          path: pathStr,
          method: method.toUpperCase(),
          operationId: operation.operationId || `${method}${pathStr.replace(/[^a-zA-Z0-9]/g, '')}`,
          summary: operation.summary,
          description: operation.description,
          parameters: operation.parameters || [],
          requestBody: operation.requestBody,
          responses: operation.responses || {},
          security: operation.security || [],
          tags: operation.tags || []
        });
      }
    }

    return endpoints;
  }

  private parseModels(): SDKModel[] {
    if (!this.apiSpec) return [];

    const models: SDKModel[] = [];
    const schemas = this.apiSpec.components?.schemas || {};

    for (const [name, schema] of Object.entries(schemas)) {
      if (typeof schema === 'object' && 'properties' in schema) {
        models.push({
          name,
          properties: schema.properties || {},
          required: schema.required,
          description: schema.description
        });
      }
    }

    return models;
  }

  private async loadTemplate(templatePath: string): Promise<string> {
    // In a real implementation, load from file system or embedded resources
    // For now, return a basic template structure
    const templateMap: Record<string, string> = {
      'typescript/client.hbs': `
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { {{#each models}}{{name}}{{#unless @last}}, {{/unless}}{{/each}} } from './types';
import * as api from './api';

export interface ClientConfig {
  baseURL?: string;
  {{#if authentication}}
  {{#eq authentication.type 'apiKey'}}apiKey?: string;{{/eq}}
  {{#eq authentication.type 'bearer'}}accessToken?: string;{{/eq}}
  {{#eq authentication.type 'basic'}}username?: string;
  password?: string;{{/eq}}
  {{/if}}
  timeout?: number;
  headers?: Record<string, string>;
}

export class {{pascalCase packageName}}Client {
  private client: AxiosInstance;
  {{#each endpoints}}
  {{#if (eq @index 0)}}{{else}}
  {{/if}}{{/each}}

  constructor(config: ClientConfig = {}) {
    this.client = axios.create({
      baseURL: config.baseURL || '{{apiBaseUrl}}',
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      }
    });

    {{#if authentication}}
    // Setup authentication
    {{#eq authentication.type 'apiKey'}}
    if (config.apiKey) {
      this.client.defaults.headers.common['{{authentication.parameterName}}'] = config.apiKey;
    }
    {{/eq}}
    {{#eq authentication.type 'bearer'}}
    if (config.accessToken) {
      this.client.defaults.headers.common['Authorization'] = \`Bearer \${config.accessToken}\`;
    }
    {{/eq}}
    {{/if}}

    // Initialize API modules
    this.initializeAPIs();
  }

  private initializeAPIs(): void {
    // API initialization logic
  }

  {{#each endpoints}}
  public async {{camelCase operationId}}({{#if parameters}}params: unknown, {{/if}}{{#if requestBody}}data: unknown, {{/if}}config?: AxiosRequestConfig): Promise<any> {
    const response = await this.client.{{toLowerCase method}}('{{path}}'{{#if requestBody}}, data{{/if}}, config);
    return response.data;
  }

  {{/each}}
}

export default {{pascalCase packageName}}Client;
`,
      'python/client.hbs': `
import requests
from typing import Dict, Any, Optional
from .models import *
from .api import *
from .utils import *

class {{pascalCase packageName}}Client:
    """{{packageName}} API Client"""
    
    def __init__(
        self,
        base_url: str = "{{apiBaseUrl}}",
        {{#if authentication}}
        {{#eq authentication.type 'apiKey'}}api_key: Optional[str] = None,{{/eq}}
        {{#eq authentication.type 'bearer'}}access_token: Optional[str] = None,{{/eq}}
        {{#eq authentication.type 'basic'}}username: Optional[str] = None,
        password: Optional[str] = None,{{/eq}}
        {{/if}}
        timeout: int = 30,
        headers: Optional[Dict[str, str]] = None
    ):
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.headers = headers or {}
        self.headers['Content-Type'] = 'application/json'
        
        {{#if authentication}}
        # Setup authentication
        {{#eq authentication.type 'apiKey'}}
        if api_key:
            self.headers['{{authentication.parameterName}}'] = api_key
        {{/eq}}
        {{#eq authentication.type 'bearer'}}
        if access_token:
            self.headers['Authorization'] = f'Bearer {access_token}'
        {{/eq}}
        {{#eq authentication.type 'basic'}}
        if username and password:
            import base64
            credentials = base64.b64encode(f'{username}:{password}'.encode()).decode()
            self.headers['Authorization'] = f'Basic {credentials}'
        {{/eq}}
        {{/if}}
        
        self.session = requests.Session()
        self.session.headers.update(self.headers)

    {{#each endpoints}}
    def {{snakeCase operationId}}(self{{#if parameters}}, params: Dict[str, Any]{{/if}}{{#if requestBody}}, data: Any{{/if}}) -> Any:
        """{{summary}}"""
        response = self.session.{{toLowerCase method}}(
            f"{self.base_url}{{path}}",
            {{#if requestBody}}json=data,{{/if}}
            {{#if parameters}}params=params,{{/if}}
            timeout=self.timeout
        )
        response.raise_for_status()
        return response.json()

    {{/each}}
`
    };

    return templateMap[templatePath] || '// Template not found';
  }

  private async formatCode(code: string, language: string, extension: string): Promise<string> {
    try {
      switch (language) {
        case 'typescript':
        case 'javascript':
          return prettier.format(code, {
            parser: extension === '.ts' ? 'typescript' : 'babel',
            semi: true,
            singleQuote: true,
            trailingComma: 'es5',
            tabWidth: 2
          });

        case 'python':
          // In a real implementation, use black or autopep8
          return code;

        case 'java':
          // In a real implementation, use google-java-format
          return code;

        case 'go':
          // In a real implementation, use gofmt
          return code;

        case 'csharp':
          // In a real implementation, use dotnet format
          return code;

        default:
          return code;
      }
    } catch (error) {
      console.warn('Code formatting failed:', error);
      return code;
    }
  }

  private async generateAPISpecificFiles(config: SDKConfig, context: unknown): Promise<void> {
    // Generate endpoint-specific files
    for (const endpoint of context.endpoints) {
      if (config.language === 'typescript' || config.language === 'javascript') {
        const endpointFile = `
export interface ${endpoint.operationId}Params {
  ${endpoint.parameters?.map((p: unknown) => `${p.name}${p.required ? '' : '?'}: ${this.getTypeScriptType(p.schema)};`).join('\n  ')}
}

export interface ${endpoint.operationId}Response {
  // Define response type based on API spec
}
`;
        const fileName = `${endpoint.operationId}.ts`;
        await fs.writeFile(
          path.join(config.outputPath, 'src', 'endpoints', fileName),
          await this.formatCode(endpointFile, 'typescript', '.ts')
        );
      }
    }
  }

  private getTypeScriptType(schema: unknown): string {
    if (!schema) return 'any';
    
    switch (schema.type) {
      case 'string': return 'string';
      case 'number': return 'number';
      case 'integer': return 'number';
      case 'boolean': return 'boolean';
      case 'array': return `${this.getTypeScriptType(schema.items)}[]`;
      case 'object': return 'Record<string, any>';
      default: return 'any';
    }
  }

  private async generateDocumentation(config: SDKConfig, context: unknown): Promise<void> {
    const docContent = `
# ${config.packageName} SDK Documentation

## Installation

### ${config.language}

${this.getInstallInstructions(config)}

## Usage

${this.getUsageExamples(config, context)}

## API Reference

${context.endpoints.map((endpoint: APIEndpoint) => `
### ${endpoint.operationId}

${endpoint.description || endpoint.summary || 'No description available'}

- **Method**: ${endpoint.method}
- **Path**: ${endpoint.path}
${endpoint.parameters?.length ? `- **Parameters**: ${endpoint.parameters.map((p: unknown) => p.name).join(', ')}` : ''}

`).join('')}

## Models

${context.models.map((model: SDKModel) => `
### ${model.name}

${model.description || 'No description available'}

Properties:
${Object.entries(model.properties).map(([key, value]: [string, unknown]) => `- **${key}**: ${value.type || 'unknown'}`).join('\n')}

`).join('')}
`;

    await fs.writeFile(
      path.join(config.outputPath, 'DOCUMENTATION.md'),
      docContent
    );
  }

  private getInstallInstructions(config: SDKConfig): string {
    const instructions: Record<string, string> = {
      typescript: `npm install ${config.packageName}`,
      javascript: `npm install ${config.packageName}`,
      python: `pip install ${config.packageName}`,
      java: `<dependency>
  <groupId>${config.packageName.split('.').slice(0, -1).join('.')}</groupId>
  <artifactId>${config.packageName.split('.').pop()}</artifactId>
  <version>${config.version}</version>
</dependency>`,
      go: `go get github.com/your-org/${config.packageName}`,
      csharp: `dotnet add package ${config.packageName}`,
      ruby: `gem install ${config.packageName}`,
      php: `composer require your-vendor/${config.packageName}`
    };

    return instructions[config.language] || 'Installation instructions not available';
  }

  private getUsageExamples(config: SDKConfig, context: unknown): string {
    const examples: Record<string, string> = {
      typescript: `
\`\`\`typescript
import { ${context.packageName}Client } from '${config.packageName}';

const client = new ${context.packageName}Client({
  ${config.authentication?.type === 'apiKey' ? `apiKey: 'your-api-key'` : ''}
  ${config.authentication?.type === 'bearer' ? `accessToken: 'your-token'` : ''}
});

// Example API call
const result = await client.${context.endpoints[0]?.operationId || 'getData'}();
console.log(result);
\`\`\`
`,
      python: `
\`\`\`python
from ${config.packageName} import Client

client = Client(
    ${config.authentication?.type === 'apiKey' ? `api_key='your-api-key'` : ''}
    ${config.authentication?.type === 'bearer' ? `access_token='your-token'` : ''}
)

# Example API call
result = client.${this.handlebars.helpers.snakeCase(context.endpoints[0]?.operationId || 'get_data')}()
print(result)
\`\`\`
`
    };

    return examples[config.language] || 'Usage examples not available';
  }

  public async validateSDK(outputPath: string, language: string): Promise<boolean> {
    try {
      switch (language) {
        case 'typescript': {
          // Run TypeScript compiler
          const tsConfig = path.join(outputPath, 'tsconfig.json');
          execSync(`npx tsc --project ${tsConfig} --noEmit`, { cwd: outputPath });
          break;
        }

        case 'python':
          // Run Python linter
          execSync(`python -m py_compile ${outputPath}/src/*.py`, { cwd: outputPath });
          break;

        case 'java':
          // Run Java compiler
          execSync(`javac -d ${outputPath}/build ${outputPath}/src/**/*.java`, { cwd: outputPath });
          break;

        // Add other language validations
      }

      this.emit('validation:success', { language, outputPath });
      return true;
    } catch (error) {
      this.emit('validation:error', { language, outputPath, error });
      return false;
    }
  }

  public async packageSDK(outputPath: string, language: string): Promise<string> {
    const packagePath = path.join(outputPath, 'dist');
    await fs.mkdir(packagePath, { recursive: true });

    try {
      switch (language) {
        case 'typescript':
        case 'javascript': {
          // Build npm package
          execSync('npm pack', { cwd: outputPath });
          break;
        }

        case 'python':
          // Build Python wheel
          execSync('python setup.py sdist bdist_wheel', { cwd: outputPath });
          break;

        case 'java':
          // Build JAR
          execSync('mvn package', { cwd: outputPath });
          break;

        case 'go':
          // Build Go module
          execSync('go build ./...', { cwd: outputPath });
          break;

        case 'csharp':
          // Build NuGet package
          execSync('dotnet pack', { cwd: outputPath });
          break;
      }

      this.emit('packaging:success', { language, outputPath: packagePath });
      return packagePath;
    } catch (error) {
      this.emit('packaging:error', { language, outputPath, error });
      throw error;
    }
  }
}

export default SDKGenerator;