# Developer Experience Module

This module provides comprehensive developer tools and utilities for building, testing, documenting, and maintaining workflow applications.

## Components

### 1. CLI Tool (`cli/WorkflowCLI.ts`)
Command-line interface for workflow development with features:
- Project initialization with templates
- Interactive workflow creation
- Development server with hot reload
- Build and deployment commands
- Component scaffolding
- Configuration management

```bash
# Initialize new project
workflow init --template microservices

# Create new workflow
workflow create --interactive

# Start development server
workflow dev --port 3000

# Build for production
workflow build --optimize

# Deploy to cloud
workflow deploy --environment production
```

### 2. SDK Generator (`sdk/SDKGenerator.ts`)
Generates client SDKs for multiple programming languages:
- **Supported Languages**: TypeScript, JavaScript, Python, Java, Go, C#, Ruby, PHP
- **Features**:
  - Type-safe API clients
  - Authentication handling
  - Retry logic and error handling
  - Request/response interceptors
  - OpenAPI/Swagger support

```typescript
const generator = new SDKGenerator({
  language: 'typescript',
  packageName: 'workflow-sdk',
  version: '1.0.0',
  apiSpecPath: './openapi.yaml',
  outputPath: './dist/sdk'
});

await generator.generateSDK(config);
```

### 3. API Client Generator (`clients/APIClientGenerator.ts`)
Creates API clients for various protocols:
- **Protocols**: REST, GraphQL, gRPC, WebSocket, MQTT
- **Features**:
  - Multi-protocol support
  - Authentication methods
  - Rate limiting
  - Circuit breaker pattern
  - Request queuing

```typescript
const generator = new APIClientGenerator();

// Create REST client
const restClient = generator.createRESTClient({
  type: 'rest',
  name: 'api-client',
  baseUrl: 'https://api.example.com',
  authentication: {
    type: 'jwt',
    credentials: { token: 'xxx' }
  }
});

// Generate client library
const library = await generator.generateClientLibrary(
  'api-client',
  'typescript',
  methods
);
```

### 4. VS Code Extension (`vscode/WorkflowVSCodeExtension.ts`)
Full-featured VS Code extension for workflow development:
- **Features**:
  - Syntax highlighting and IntelliSense
  - Workflow visualization
  - Interactive debugging
  - Code snippets and templates
  - Integrated testing
  - Git integration
  - Live collaboration

```typescript
const extension = new WorkflowVSCodeExtension();

// Extension provides:
// - Language server protocol support
// - Custom views and panels
// - Debugging adapter
// - Task providers
// - Code actions and quick fixes
```

### 5. Testing Utilities (`testing/TestingUtilities.ts`)
Comprehensive testing framework:
- **Test Types**: Unit, Integration, E2E, Performance, Security
- **Features**:
  - Mock generation
  - Snapshot testing
  - Visual regression testing
  - Load testing with k6
  - Coverage reporting
  - Test data generation

```typescript
const testing = new TestingUtilities();

// Create test suite
testing.createTestSuite({
  id: 'workflow-tests',
  name: 'Workflow Test Suite',
  tests: [
    {
      id: 'test-1',
      name: 'Test workflow execution',
      type: 'integration',
      workflow: testWorkflow,
      expectedOutputs: [{ success: true }]
    }
  ]
});

// Run tests
const results = await testing.runTestSuite('workflow-tests');

// Generate report
await testing.generateReport(results, 'html');
```

### 6. Documentation Generator (`docs/DocumentationGenerator.ts`)
Automated documentation generation:
- **Output Formats**: HTML, Markdown, PDF, Docusaurus, VuePress, GitBook
- **Features**:
  - API reference generation
  - Workflow documentation
  - Interactive examples
  - Dependency graphs
  - Change logs
  - Multi-language support

```typescript
const generator = new DocumentationGenerator({
  projectName: 'Workflow Platform',
  version: '1.0.0',
  sourceDir: './src',
  outputDir: './docs',
  format: 'docusaurus',
  includeExamples: true,
  includeTutorials: true
});

await generator.generate();
```

### 7. Migration Tools (`migration/MigrationTools.ts`)
Version migration and upgrade utilities:
- **Features**:
  - Automated version migrations
  - Breaking change detection
  - Backup and rollback
  - Dry run mode
  - Migration validation
  - Custom migration creation

```typescript
const migrator = new MigrationTools();

// Run migrations
const result = await migrator.runMigrations({
  sourceVersion: '1.0.0',
  targetVersion: '2.0.0',
  sourceDir: './project',
  autoBackup: true,
  dryRun: false
});

// Generate migration report
const report = await migrator.generateMigrationReport(config);
```

## Installation

```bash
npm install @workflow/developer-tools
```

## Quick Start

### CLI Usage
```bash
# Install globally
npm install -g @workflow/cli

# Create new project
workflow init my-project
cd my-project

# Start development
workflow dev
```

### SDK Generation
```typescript
import { SDKGenerator } from '@workflow/developer-tools';

const generator = new SDKGenerator({
  language: 'python',
  packageName: 'workflow_sdk',
  version: '1.0.0',
  apiSpecPath: './api.yaml'
});

await generator.generateSDK();
```

### Testing
```typescript
import { TestingUtilities } from '@workflow/developer-tools';

const testing = new TestingUtilities();

// Create mock
const mockAPI = testing.createMock({
  type: 'api',
  target: 'GET /api/data',
  responses: [{
    matcher: () => true,
    response: { data: 'test' }
  }]
});

// Run tests
const results = await testing.runTestSuite('my-tests');
```

## Configuration

### CLI Configuration (`.workflowrc.json`)
```json
{
  "defaultTemplate": "microservices",
  "devServer": {
    "port": 3000,
    "host": "localhost",
    "https": false
  },
  "build": {
    "outputDir": "dist",
    "minify": true,
    "sourceMaps": true
  }
}
```

### VS Code Settings
```json
{
  "workflow.enableAutoComplete": true,
  "workflow.validateOnSave": true,
  "workflow.formatOnSave": true,
  "workflow.theme": "dark"
}
```

## Advanced Features

### Custom Templates
Create custom project templates:
```typescript
workflow.registerTemplate({
  name: 'my-template',
  description: 'Custom template',
  path: './templates/my-template',
  variables: {
    projectName: '{{name}}',
    author: '{{author}}'
  }
});
```

### Plugin Development
Extend functionality with plugins:
```typescript
export class MyPlugin {
  name = 'my-plugin';
  
  async onInit(context: PluginContext) {
    // Plugin initialization
  }
  
  async onBuild(config: BuildConfig) {
    // Modify build process
  }
}
```

### Custom Generators
Add custom code generators:
```typescript
generator.registerTemplate('custom', {
  name: 'custom-client',
  path: 'templates/custom.hbs',
  output: 'src/custom-client.ts'
});
```

## Best Practices

1. **Use TypeScript**: Take advantage of type safety and IntelliSense
2. **Write Tests**: Aim for >80% code coverage
3. **Document APIs**: Use JSDoc comments for automatic documentation
4. **Version Control**: Follow semantic versioning
5. **CI/CD Integration**: Automate testing and deployment
6. **Code Reviews**: Use PR templates and automated checks
7. **Performance Monitoring**: Track metrics in production

## Troubleshooting

### Common Issues

1. **CLI not found**
   ```bash
   npm install -g @workflow/cli
   ```

2. **VS Code extension not loading**
   - Check VS Code version compatibility
   - Reload window: `Cmd/Ctrl + Shift + P` → "Reload Window"

3. **Test failures**
   - Clear test cache: `workflow test --clear-cache`
   - Check mock configurations

4. **Documentation build errors**
   - Verify source file paths
   - Check for syntax errors in code comments

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development setup and guidelines.

## License

MIT License - see [LICENSE](../LICENSE) for details.