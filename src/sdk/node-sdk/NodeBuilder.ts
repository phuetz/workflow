/**
 * Node Builder
 * Builds custom workflow nodes from definitions
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  CustomNodeDefinition,
  NodeProperty,
  CredentialDefinition,
  NodeMethod,
  INodeType,
  IExecuteFunctions,
  INodeExecutionData,
  NodeCategory,
  NodeGeneratorConfig
} from './types';

/**
 * NodeBuilder creates INodeType instances from CustomNodeDefinition
 */
export class NodeBuilder {
  private definition: CustomNodeDefinition;
  private methods: Map<string, Function> = new Map();

  constructor(definition: CustomNodeDefinition) {
    this.definition = definition;
  }

  /**
   * Add a property to the node definition
   */
  addProperty(property: NodeProperty): void {
    this.definition.properties.push(property);
  }

  /**
   * Add a method to the node
   */
  addMethod(method: NodeMethod, implementation: Function): void {
    this.methods.set(method.name, implementation);
    this.definition.methods = this.definition.methods || [];
    this.definition.methods.push(method);
  }

  /**
   * Add a credential definition
   */
  addCredential(credential: CredentialDefinition): void {
    this.definition.credentials = this.definition.credentials || [];
    this.definition.credentials.push(credential);
  }

  /**
   * Build the INodeType from the definition
   */
  build(): INodeType {
    const node: INodeType = {
      description: this.definition,

      async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        // Default execute implementation
        const items = this.getInputData();
        return [items];
      }
    };

    // Add methods
    if (this.methods.size > 0) {
      node.methods = {
        loadOptions: {},
        credentialTest: {}
      };

      Array.from(this.methods.entries()).forEach(([name, impl]) => {
        if (name.startsWith('loadOptions.')) {
          node.methods!.loadOptions![name.substring(12)] = impl as any;
        } else if (name.startsWith('credentialTest.')) {
          node.methods!.credentialTest![name.substring(15)] = impl as any;
        }
      });
    }

    return node;
  }

  /**
   * Get the current definition
   */
  getDefinition(): CustomNodeDefinition {
    return this.definition;
  }
}

/**
 * NodeGenerator creates node definitions and scaffolds new nodes
 */
export class NodeGenerator {
  /**
   * Generate a CustomNodeDefinition from config
   */
  generate(config: NodeGeneratorConfig): CustomNodeDefinition {
    const definition: CustomNodeDefinition = {
      name: config.name,
      displayName: config.displayName || config.name,
      version: '1.0.0',
      description: config.description || '',
      category: config.category,
      properties: [],
      metadata: {
        author: config.author || 'Unknown'
      }
    };

    // Add default properties
    if (config.includeAuthentication) {
      definition.credentials = [{
        name: 'api',
        displayName: 'API Credentials',
        required: true,
        type: `${config.name}Api`
      }];
    }

    if (config.includeWebhook) {
      definition.webhooks = [{
        name: 'default',
        httpMethod: 'POST',
        responseMode: 'onReceived'
      }];
    }

    return definition;
  }

  /**
   * Scaffold a basic node definition
   */
  scaffold(name: string, category: NodeCategory): CustomNodeDefinition {
    return this.generate({
      name,
      category,
      includeAuthentication: true,
      includeWebhook: false
    });
  }

  /**
   * Generate all files for a node package
   */
  generateFiles(definition: CustomNodeDefinition): Record<string, string> {
    const files: Record<string, string> = {};

    // Generate main node file
    files[`src/${definition.name}.node.ts`] = this.generateNodeFile(definition);

    // Generate test file
    files[`test/${definition.name}.test.ts`] = this.generateTestFile(definition);

    // Generate package.json
    files['package.json'] = this.generatePackageJson(definition);

    // Generate README
    files['README.md'] = this.generateReadme(definition);

    return files;
  }

  /**
   * Generate the main node TypeScript file
   */
  private generateNodeFile(definition: CustomNodeDefinition): string {
    return `import { INodeType, INodeTypeDescription } from 'n8n-workflow';

export class ${definition.name} implements INodeType {
  description: INodeTypeDescription = ${JSON.stringify(definition, null, 2)};

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    return [items];
  }
}`;
  }

  /**
   * Generate the test file
   */
  private generateTestFile(definition: CustomNodeDefinition): string {
    return `import { ${definition.name} } from '../src/${definition.name}.node';

describe('${definition.name}', () => {
  it('should execute successfully', async () => {
    const node = new ${definition.name}();
    // Add tests here
  });
});`;
  }

  /**
   * Generate package.json
   */
  private generatePackageJson(definition: CustomNodeDefinition): string {
    const packageJson = {
      name: `n8n-nodes-${definition.name.toLowerCase()}`,
      version: definition.version,
      description: definition.description,
      main: 'dist/index.js',
      scripts: {
        build: 'tsc',
        test: 'jest'
      },
      n8n: {
        nodes: [`dist/${definition.name}.node.js`]
      },
      dependencies: {},
      devDependencies: {
        'typescript': '^5.0.0',
        'jest': '^29.0.0'
      }
    };

    return JSON.stringify(packageJson, null, 2);
  }

  /**
   * Generate README.md
   */
  private generateReadme(definition: CustomNodeDefinition): string {
    return `# ${definition.displayName}

${definition.description}

## Installation

\`\`\`bash
npm install n8n-nodes-${definition.name.toLowerCase()}
\`\`\`

## Usage

Add the node to your n8n workflow and configure the properties.

## License

MIT`;
  }

  /**
   * Write files to disk
   */
  writeFiles(outputDir: string, name: string, files: Record<string, string>): string {
    const nodeDir = path.join(outputDir, name);
    fs.mkdirSync(nodeDir, { recursive: true });
    fs.mkdirSync(path.join(nodeDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(nodeDir, 'test'), { recursive: true });

    for (const [filePath, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(nodeDir, filePath), content);
    }

    return nodeDir;
  }
}

export default NodeBuilder;
