#!/usr/bin/env node

/**
 * create-workflow-node - CLI tool for scaffolding new workflow plugins
 * Usage: npx create-workflow-node <plugin-name>
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

interface PluginConfig {
  name: string;
  displayName: string;
  description: string;
  author: string;
  license: string;
  category: string;
  nodeType: 'action' | 'trigger' | 'transform';
  hasCredentials: boolean;
  credentialType?: string;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('\n🚀 Workflow Node Creator\n');
  console.log('Create a new custom workflow node plugin\n');

  // Get plugin name from args or prompt
  let pluginName = process.argv[2];

  if (!pluginName) {
    pluginName = await question('Plugin name (e.g., my-awesome-plugin): ');
  }

  if (!pluginName) {
    console.error('Error: Plugin name is required');
    process.exit(1);
  }

  // Collect plugin information
  const config: PluginConfig = {
    name: pluginName,
    displayName: await question(`Display name (${toTitleCase(pluginName)}): `) || toTitleCase(pluginName),
    description: await question('Description: ') || 'A custom workflow node',
    author: await question('Author: ') || 'Anonymous',
    license: await question('License (MIT): ') || 'MIT',
    category: await selectOption('Category', [
      'communication',
      'data',
      'productivity',
      'development',
      'marketing',
      'sales',
      'analytics',
      'ai',
      'utility',
      'custom',
    ]),
    nodeType: await selectOption('Node type', ['action', 'trigger', 'transform']) as any,
    hasCredentials: await confirm('Does this node require credentials?'),
  };

  if (config.hasCredentials) {
    config.credentialType = await question('Credential type name: ') || `${config.name}Api`;
  }

  console.log('\n📦 Creating plugin structure...\n');

  // Create plugin
  await createPlugin(config);

  console.log('\n✅ Plugin created successfully!\n');
  console.log(`📁 Location: ${path.join(process.cwd(), config.name)}\n`);
  console.log('Next steps:');
  console.log(`  1. cd ${config.name}`);
  console.log('  2. npm install');
  console.log('  3. npm run build');
  console.log('  4. npm run test\n');

  rl.close();
}

async function selectOption(prompt: string, options: string[]): Promise<string> {
  console.log(`\n${prompt}:`);
  options.forEach((opt, i) => console.log(`  ${i + 1}. ${opt}`));

  let selection: string;
  while (true) {
    selection = await question(`Select (1-${options.length}): `);
    const index = parseInt(selection) - 1;

    if (index >= 0 && index < options.length) {
      return options[index];
    }

    console.log('Invalid selection. Please try again.');
  }
}

async function confirm(prompt: string): Promise<boolean> {
  const answer = await question(`${prompt} (y/N): `);
  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
}

function toTitleCase(str: string): string {
  return str
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

async function createPlugin(config: PluginConfig): Promise<void> {
  const pluginDir = path.join(process.cwd(), config.name);

  // Create directory structure
  fs.mkdirSync(pluginDir, { recursive: true });
  fs.mkdirSync(path.join(pluginDir, 'src'), { recursive: true });
  fs.mkdirSync(path.join(pluginDir, 'src', 'nodes'), { recursive: true });

  if (config.hasCredentials) {
    fs.mkdirSync(path.join(pluginDir, 'src', 'credentials'), { recursive: true });
  }

  // Create files
  createPackageJson(pluginDir, config);
  createWorkflowJson(pluginDir, config);
  createTsConfig(pluginDir);
  createNodeFile(pluginDir, config);

  if (config.hasCredentials) {
    createCredentialFile(pluginDir, config);
  }

  createIndexFile(pluginDir, config);
  createReadme(pluginDir, config);
  createGitignore(pluginDir);
  createTestFile(pluginDir, config);
  createExampleWorkflow(pluginDir, config);
}

function createPackageJson(dir: string, config: PluginConfig): void {
  const packageJson = {
    name: `@workflow/${config.name}`,
    version: '1.0.0',
    description: config.description,
    main: 'dist/index.js',
    types: 'dist/index.d.ts',
    scripts: {
      build: 'tsc',
      'build:watch': 'tsc --watch',
      dev: 'tsc --watch',
      test: 'node test.js',
      prepublishOnly: 'npm run build',
    },
    keywords: [
      'workflow',
      'automation',
      'n8n',
      'node',
      config.category,
    ],
    author: config.author,
    license: config.license,
    dependencies: {},
    devDependencies: {
      '@workflow/sdk': '^1.0.0',
      typescript: '^5.0.0',
      '@types/node': '^20.0.0',
    },
    n8n: {
      nodes: [`dist/nodes/${toPascalCase(config.name)}.js`],
      credentials: config.hasCredentials
        ? [`dist/credentials/${toPascalCase(config.credentialType!)}.js`]
        : [],
    },
  };

  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
}

function createWorkflowJson(dir: string, config: PluginConfig): void {
  const workflowJson = {
    name: config.name,
    version: '1.0.0',
    description: config.description,
    author: config.author,
    license: config.license,
    main: 'dist/index.js',
    nodes: [toPascalCase(config.name)],
    credentials: config.hasCredentials ? [toPascalCase(config.credentialType!)] : [],
    permissions: {
      network: [{ host: '*', protocol: 'https' }],
    },
  };

  fs.writeFileSync(
    path.join(dir, 'workflow.json'),
    JSON.stringify(workflowJson, null, 2)
  );
}

function createTsConfig(dir: string): void {
  const tsConfig = {
    compilerOptions: {
      target: 'ES2020',
      module: 'commonjs',
      lib: ['ES2020'],
      outDir: './dist',
      rootDir: './src',
      declaration: true,
      declarationMap: true,
      sourceMap: true,
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true,
      moduleResolution: 'node',
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist', '**/*.test.ts'],
  };

  fs.writeFileSync(
    path.join(dir, 'tsconfig.json'),
    JSON.stringify(tsConfig, null, 2)
  );
}

function createNodeFile(dir: string, config: PluginConfig): void {
  const className = toPascalCase(config.name);

  let nodeTemplate = `import {
  INodeType,
  INodeTypeDescription,
  INodeExecutionData,
  IExecuteFunctions,
} from '@workflow/sdk';

export class ${className} implements INodeType {
  description: INodeTypeDescription = {
    displayName: '${config.displayName}',
    name: '${config.name}',
    group: ['${config.category}'],
    version: 1,
    description: '${config.description}',
    defaults: {
      name: '${config.displayName}',
    },
    inputs: ['main'],
    outputs: ['main'],
`;

  if (config.hasCredentials) {
    nodeTemplate += `    credentials: [
      {
        name: '${config.credentialType}',
        required: true,
      },
    ],
`;
  }

  nodeTemplate += `    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        options: [
          {
            name: 'Get',
            value: 'get',
            description: 'Get data',
          },
          {
            name: 'Create',
            value: 'create',
            description: 'Create new item',
          },
        ],
        default: 'get',
        description: 'The operation to perform',
      },
      {
        displayName: 'Resource ID',
        name: 'resourceId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            operation: ['get'],
          },
        },
        description: 'The ID of the resource to get',
      },
      {
        displayName: 'Name',
        name: 'name',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            operation: ['create'],
          },
        },
        description: 'The name of the item to create',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    const operation = this.getNodeParameter('operation', 0) as string;
`;

  if (config.hasCredentials) {
    nodeTemplate += `
    // Get credentials
    const credentials = await this.getCredentials('${config.credentialType}');
`;
  }

  nodeTemplate += `
    for (let i = 0; i < items.length; i++) {
      try {
        if (operation === 'get') {
          const resourceId = this.getNodeParameter('resourceId', i) as string;

          // TODO: Implement your GET logic here
          const result = {
            id: resourceId,
            data: 'Your data here',
          };

          returnData.push({
            json: result,
          });
        } else if (operation === 'create') {
          const name = this.getNodeParameter('name', i) as string;

          // TODO: Implement your CREATE logic here
          const result = {
            id: 'generated-id',
            name: name,
            created: new Date().toISOString(),
          };

          returnData.push({
            json: result,
          });
        }
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: error.message,
            },
            error: error,
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}
`;

  fs.writeFileSync(
    path.join(dir, 'src', 'nodes', `${className}.ts`),
    nodeTemplate
  );
}

function createCredentialFile(dir: string, config: PluginConfig): void {
  const className = toPascalCase(config.credentialType!);

  const credentialTemplate = `import {
  ICredentialType,
  INodeProperties,
} from '@workflow/sdk';

export class ${className} implements ICredentialType {
  name = '${config.credentialType}';
  displayName = '${config.displayName} API';
  documentationUrl = 'https://docs.example.com';

  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      required: true,
      description: 'The API key for authentication',
    },
    {
      displayName: 'API URL',
      name: 'apiUrl',
      type: 'string',
      default: 'https://api.example.com',
      description: 'The base URL for the API',
    },
  ];

  async test(this: ICredentialTestFunctions, credential: ICredentialDataDecryptedObject): Promise<INodeCredentialTestResult> {
    const credentials = credential;

    try {
      // TODO: Implement credential test
      // Make a simple API call to verify credentials

      return {
        status: 'OK',
        message: 'Connection successful',
      };
    } catch (error) {
      return {
        status: 'Error',
        message: error.message,
      };
    }
  }
}
`;

  fs.writeFileSync(
    path.join(dir, 'src', 'credentials', `${className}.ts`),
    credentialTemplate
  );
}

function createIndexFile(dir: string, config: PluginConfig): void {
  const className = toPascalCase(config.name);
  let indexContent = `export * from './nodes/${className}';\n`;

  if (config.hasCredentials) {
    const credClassName = toPascalCase(config.credentialType!);
    indexContent += `export * from './credentials/${credClassName}';\n`;
  }

  fs.writeFileSync(path.join(dir, 'src', 'index.ts'), indexContent);
}

function createReadme(dir: string, config: PluginConfig): void {
  const readme = `# ${config.displayName}

${config.description}

## Installation

\`\`\`bash
npm install @workflow/${config.name}
\`\`\`

Or install directly from the workflow platform:

\`\`\`bash
npx workflow-cli plugin install ${config.name}
\`\`\`

## Usage

This plugin provides a ${config.nodeType} node for ${config.displayName}.

### Node: ${config.displayName}

**Operations:**
- Get: Retrieve data
- Create: Create new items

### Configuration

${config.hasCredentials ? `**Credentials Required:** ${config.credentialType}\n\nYou'll need to configure your API credentials before using this node.` : 'No credentials required.'}

### Example

\`\`\`json
{
  "operation": "get",
  "resourceId": "123"
}
\`\`\`

## Development

\`\`\`bash
# Install dependencies
npm install

# Build the plugin
npm run build

# Watch for changes
npm run dev

# Run tests
npm run test
\`\`\`

## License

${config.license}

## Author

${config.author}
`;

  fs.writeFileSync(path.join(dir, 'README.md'), readme);
}

function createGitignore(dir: string): void {
  const gitignore = `node_modules/
dist/
*.log
.DS_Store
.env
.vscode/
*.tgz
`;

  fs.writeFileSync(path.join(dir, '.gitignore'), gitignore);
}

function createTestFile(dir: string, config: PluginConfig): void {
  const className = toPascalCase(config.name);

  const testContent = `const { ${className} } = require('./dist/nodes/${className}');
const { TestingUtils } = require('@workflow/sdk');

async function runTests() {
  console.log(\`Running tests for \${className}...\\n\`);

  const node = new ${className}();

  // Test 1: Get operation
  const test1 = await TestingUtils.executeNode(node, {
    description: 'Should get data by ID',
    input: {
      main: [[{ json: {} }]],
    },
    output: {
      main: [[{ json: { id: '123', data: 'Your data here' } }]],
    },
    parameters: {
      operation: 'get',
      resourceId: '123',
    },
  });

  console.log('Test 1:', test1.success ? '✓' : '✗', test1.description);
  if (!test1.success) {
    console.error('Error:', test1.error);
  }

  // Test 2: Create operation
  const test2 = await TestingUtils.executeNode(node, {
    description: 'Should create new item',
    input: {
      main: [[{ json: {} }]],
    },
    output: {
      main: [[{ json: { name: 'Test Item' } }]],
    },
    parameters: {
      operation: 'create',
      name: 'Test Item',
    },
  });

  console.log('Test 2:', test2.success ? '✓' : '✗', test2.description);
  if (!test2.success) {
    console.error('Error:', test2.error);
  }

  // Summary
  const results = [test1, test2];
  const passed = results.filter(r => r.success).length;
  const total = results.length;

  console.log(\`\\n\${passed}/\${total} tests passed\`);
  process.exit(passed === total ? 0 : 1);
}

runTests().catch(console.error);
`;

  fs.writeFileSync(path.join(dir, 'test.js'), testContent);
}

function createExampleWorkflow(dir: string, config: PluginConfig): void {
  const workflow = {
    name: `Example: ${config.displayName}`,
    nodes: [
      {
        parameters: {},
        name: 'Manual Trigger',
        type: 'manualTrigger',
        position: [250, 300],
      },
      {
        parameters: {
          operation: 'get',
          resourceId: '123',
        },
        name: config.displayName,
        type: config.name,
        position: [450, 300],
      },
    ],
    connections: {
      'Manual Trigger': {
        main: [[{ node: config.displayName, type: 'main', index: 0 }]],
      },
    },
  };

  fs.writeFileSync(
    path.join(dir, 'example-workflow.json'),
    JSON.stringify(workflow, null, 2)
  );
}

// Run CLI
main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
