import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { EventEmitter } from 'events';

export interface ExtensionConfig {
  name: string;
  displayName: string;
  description: string;
  version: string;
  publisher: string;
  engines: {
    vscode: string;
  };
  categories: string[];
  activationEvents: string[];
  contributes: {
    commands?: Command[];
    languages?: Language[];
    grammars?: Grammar[];
    themes?: Theme[];
    snippets?: Snippet[];
    views?: ViewContainer[];
    menus?: Menu[];
    keybindings?: Keybinding[];
    configuration?: Configuration[];
    debuggers?: Debugger[];
    taskDefinitions?: TaskDefinition[];
  };
}

export interface Command {
  command: string;
  title: string;
  category?: string;
  icon?: string;
  enablement?: string;
}

export interface Language {
  id: string;
  aliases: string[];
  extensions: string[];
  configuration?: string;
  icon?: string;
}

export interface Grammar {
  language: string;
  scopeName: string;
  path: string;
  embeddedLanguages?: Record<string, string>;
  tokenTypes?: Record<string, string>;
}

export interface Theme {
  label: string;
  uiTheme: string;
  path: string;
}

export interface Snippet {
  language: string;
  path: string;
}

export interface ViewContainer {
  id: string;
  title: string;
  icon: string;
}

export interface Menu {
  [menuId: string]: MenuItem[];
}

export interface MenuItem {
  command: string;
  when?: string;
  group?: string;
  alt?: string;
}

export interface Keybinding {
  command: string;
  key: string;
  mac?: string;
  when?: string;
}

export interface Configuration {
  title: string;
  properties: Record<string, ConfigProperty>;
}

export interface ConfigProperty {
  type: string;
  default?: unknown;
  description?: string;
  enum?: unknown[];
  enumDescriptions?: string[];
  minimum?: number;
  maximum?: number;
  pattern?: string;
  items?: unknown;
}

export interface Debugger {
  type: string;
  label: string;
  program: string;
  runtime?: string;
  configurationAttributes?: unknown;
  initialConfigurations?: unknown[];
  configurationSnippets?: unknown[];
  variables?: Record<string, string>;
}

export interface TaskDefinition {
  type: string;
  required: string[];
  properties: Record<string, unknown>;
}

export class WorkflowVSCodeExtension extends EventEmitter {
  private context: vscode.ExtensionContext | null = null;
  private statusBar: vscode.StatusBarItem | null = null;
  private outputChannel: vscode.OutputChannel | null = null;
  private treeDataProvider: WorkflowTreeDataProvider | null = null;
  private decorationType: vscode.TextEditorDecorationType | null = null;
  private diagnosticCollection: vscode.DiagnosticCollection | null = null;
  private workflowPanel: vscode.WebviewPanel | null = null;

  constructor() {
    super();
  }

  public async activate(context: vscode.ExtensionContext): Promise<void> {
    this.context = context;
    
    // Create output channel
    this.outputChannel = vscode.window.createOutputChannel('Workflow Editor');
    
    // Create status bar item
    this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.statusBar.text = '$(circuit-board) Workflow';
    this.statusBar.tooltip = 'Workflow Editor is active';
    this.statusBar.show();
    
    // Create diagnostic collection
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('workflow');
    
    // Register commands
    this.registerCommands();
    
    // Register providers
    this.registerProviders();
    
    // Register language features
    this.registerLanguageFeatures();
    
    // Setup file watchers
    this.setupFileWatchers();
    
    // Initialize tree view
    this.initializeTreeView();
    
    // Setup decorations
    this.setupDecorations();
    
    this.outputChannel.appendLine('Workflow Editor extension activated');
    this.emit('extension:activated');
  }

  private registerCommands(): void {
    if (!this.context) return;

    // New workflow command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('workflow.newWorkflow', async () => {
        await this.createNewWorkflow();
      })
    );

    // Open workflow command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('workflow.openWorkflow', async () => {
        await this.openWorkflow();
      })
    );

    // Run workflow command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('workflow.runWorkflow', async () => {
        await this.runWorkflow();
      })
    );

    // Debug workflow command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('workflow.debugWorkflow', async () => {
        await this.debugWorkflow();
      })
    );

    // Validate workflow command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('workflow.validateWorkflow', async () => {
        await this.validateWorkflow();
      })
    );

    // Export workflow command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('workflow.exportWorkflow', async () => {
        await this.exportWorkflow();
      })
    );

    // Show workflow panel command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('workflow.showPanel', async () => {
        await this.showWorkflowPanel();
      })
    );

    // Insert node command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('workflow.insertNode', async () => {
        await this.insertNode();
      })
    );

    // Format workflow command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('workflow.formatWorkflow', async () => {
        await this.formatWorkflow();
      })
    );

    // Generate code command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('workflow.generateCode', async () => {
        await this.generateCode();
      })
    );
  }

  private registerProviders(): void {
    if (!this.context) return;

    // Register completion provider
    this.context.subscriptions.push(
      vscode.languages.registerCompletionItemProvider(
        { scheme: 'file', language: 'workflow' },
        new WorkflowCompletionProvider(),
        '.',
        '$',
        '{'
      )
    );

    // Register hover provider
    this.context.subscriptions.push(
      vscode.languages.registerHoverProvider(
        { scheme: 'file', language: 'workflow' },
        new WorkflowHoverProvider()
      )
    );

    // Register definition provider
    this.context.subscriptions.push(
      vscode.languages.registerDefinitionProvider(
        { scheme: 'file', language: 'workflow' },
        new WorkflowDefinitionProvider()
      )
    );

    // Register reference provider
    this.context.subscriptions.push(
      vscode.languages.registerReferenceProvider(
        { scheme: 'file', language: 'workflow' },
        new WorkflowReferenceProvider()
      )
    );

    // Register rename provider
    this.context.subscriptions.push(
      vscode.languages.registerRenameProvider(
        { scheme: 'file', language: 'workflow' },
        new WorkflowRenameProvider()
      )
    );

    // Register code lens provider
    this.context.subscriptions.push(
      vscode.languages.registerCodeLensProvider(
        { scheme: 'file', language: 'workflow' },
        new WorkflowCodeLensProvider()
      )
    );

    // Register code action provider
    this.context.subscriptions.push(
      vscode.languages.registerCodeActionsProvider(
        { scheme: 'file', language: 'workflow' },
        new WorkflowCodeActionProvider(),
        {
          providedCodeActionKinds: [
            vscode.CodeActionKind.QuickFix,
            vscode.CodeActionKind.Refactor,
            vscode.CodeActionKind.RefactorExtract,
            vscode.CodeActionKind.RefactorInline
          ]
        }
      )
    );

    // Register document symbol provider
    this.context.subscriptions.push(
      vscode.languages.registerDocumentSymbolProvider(
        { scheme: 'file', language: 'workflow' },
        new WorkflowDocumentSymbolProvider()
      )
    );

    // Register folding range provider
    this.context.subscriptions.push(
      vscode.languages.registerFoldingRangeProvider(
        { scheme: 'file', language: 'workflow' },
        new WorkflowFoldingRangeProvider()
      )
    );
  }

  private registerLanguageFeatures(): void {
    if (!this.context) return;

    // Register document formatter
    this.context.subscriptions.push(
      vscode.languages.registerDocumentFormattingEditProvider(
        { scheme: 'file', language: 'workflow' },
        new WorkflowDocumentFormatter()
      )
    );

    // Register document range formatter
    this.context.subscriptions.push(
      vscode.languages.registerDocumentRangeFormattingEditProvider(
        { scheme: 'file', language: 'workflow' },
        new WorkflowDocumentRangeFormatter()
      )
    );

    // Register on type formatting
    this.context.subscriptions.push(
      vscode.languages.registerOnTypeFormattingEditProvider(
        { scheme: 'file', language: 'workflow' },
        new WorkflowOnTypeFormatter(),
        '}',
        ']',
        '\n'
      )
    );

    // Register signature help provider
    this.context.subscriptions.push(
      vscode.languages.registerSignatureHelpProvider(
        { scheme: 'file', language: 'workflow' },
        new WorkflowSignatureHelpProvider(),
        '(',
        ','
      )
    );
  }

  private setupFileWatchers(): void {
    if (!this.context) return;

    // Watch for workflow file changes
    const watcher = vscode.workspace.createFileSystemWatcher('**/*.workflow');
    
    watcher.onDidCreate((uri) => {
      this.outputChannel?.appendLine(`Workflow created: ${uri.fsPath}`);
      this.validateWorkflowFile(uri);
    });

    watcher.onDidChange((uri) => {
      this.outputChannel?.appendLine(`Workflow changed: ${uri.fsPath}`);
      this.validateWorkflowFile(uri);
    });

    watcher.onDidDelete((uri) => {
      this.outputChannel?.appendLine(`Workflow deleted: ${uri.fsPath}`);
      this.diagnosticCollection?.delete(uri);
    });

    this.context.subscriptions.push(watcher);
  }

  private initializeTreeView(): void {
    if (!this.context) return;

    this.treeDataProvider = new WorkflowTreeDataProvider(this.context);
    
    const treeView = vscode.window.createTreeView('workflowExplorer', {
      treeDataProvider: this.treeDataProvider,
      showCollapseAll: true,
      canSelectMany: true
    });

    this.context.subscriptions.push(treeView);
  }

  private setupDecorations(): void {
    this.decorationType = vscode.window.createTextEditorDecorationType({
      borderWidth: '1px',
      borderStyle: 'solid',
      overviewRulerColor: 'blue',
      overviewRulerLane: vscode.OverviewRulerLane.Right,
      light: {
        borderColor: 'darkblue'
      },
      dark: {
        borderColor: 'lightblue'
      }
    });
  }

  private async createNewWorkflow(): Promise<void> {
    const workflowName = await vscode.window.showInputBox({
      prompt: 'Enter workflow name',
      placeHolder: 'my-workflow',
      validateInput: (value) => {
        if (!value) return 'Workflow name is required';
        if (!/^[a-z0-9-]+$/.test(value)) return 'Use lowercase letters, numbers, and hyphens only';
        return null;
      }
    });

    if (!workflowName) return;

    const template = await vscode.window.showQuickPick([
      { label: 'Empty Workflow', value: 'empty' },
      { label: 'API Integration', value: 'api' },
      { label: 'Data Pipeline', value: 'data' },
      { label: 'Scheduled Task', value: 'scheduled' },
      { label: 'Event Handler', value: 'event' }
    ], {
      placeHolder: 'Select a template'
    });

    if (!template) return;

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    const workflowPath = path.join(workspaceFolder.uri.fsPath, 'workflows', `${workflowName}.workflow`);
    
    // Create workflow directory if it doesn't exist
    await fs.mkdir(path.dirname(workflowPath), { recursive: true });
    
    // Generate workflow content based on template
    const content = this.generateWorkflowTemplate(template.value);
    
    // Write workflow file
    await fs.writeFile(workflowPath, content);
    
    // Open the workflow
    const document = await vscode.workspace.openTextDocument(workflowPath);
    await vscode.window.showTextDocument(document);
    
    vscode.window.showInformationMessage(`Created workflow: ${workflowName}`);
  }

  private generateWorkflowTemplate(template: string): string {
    const templates: Record<string, string> = {
      empty: JSON.stringify({
        name: 'New Workflow',
        description: 'A new workflow',
        nodes: [
          {
            id: 'trigger',
            type: 'trigger',
            position: { x: 100, y: 100 },
            data: {
              triggerType: 'manual',
              name: 'Manual Trigger'
            }
          }
        ],
        edges: [],
        settings: {
          errorHandling: 'continue',
          timeout: 300,
          retries: 3
        }
      }, null, 2),
      
      api: JSON.stringify({
        name: 'API Integration',
        description: 'Workflow for API integration',
        nodes: [
          {
            id: 'trigger',
            type: 'trigger',
            position: { x: 100, y: 100 },
            data: {
              triggerType: 'webhook',
              name: 'Webhook Trigger',
              config: {
                method: 'POST',
                path: '/webhook'
              }
            }
          },
          {
            id: 'http1',
            type: 'http',
            position: { x: 300, y: 100 },
            data: {
              name: 'API Request',
              config: {
                method: 'GET',
                url: 'https://api.example.com/data',
                headers: {
                  'Content-Type': 'application/json'
                }
              }
            }
          },
          {
            id: 'transform1',
            type: 'transform',
            position: { x: 500, y: 100 },
            data: {
              name: 'Transform Response',
              config: {
                expression: '{{ $json.data }}'
              }
            }
          }
        ],
        edges: [
          { id: 'e1', source: 'trigger', target: 'http1' },
          { id: 'e2', source: 'http1', target: 'transform1' }
        ]
      }, null, 2),
      
      data: JSON.stringify({
        name: 'Data Pipeline',
        description: 'Data processing workflow',
        nodes: [
          {
            id: 'trigger',
            type: 'trigger',
            position: { x: 100, y: 100 },
            data: {
              triggerType: 'schedule',
              name: 'Scheduled Trigger',
              config: {
                cron: '0 0 * * *',
                timezone: 'UTC'
              }
            }
          },
          {
            id: 'database1',
            type: 'database',
            position: { x: 300, y: 100 },
            data: {
              name: 'Query Database',
              config: {
                operation: 'select',
                query: 'SELECT * FROM users WHERE created_at > :lastRun'
              }
            }
          },
          {
            id: 'aggregate1',
            type: 'aggregate',
            position: { x: 500, y: 100 },
            data: {
              name: 'Aggregate Data',
              config: {
                groupBy: 'category',
                operations: [
                  { field: 'amount', operation: 'sum', alias: 'total' },
                  { field: 'id', operation: 'count', alias: 'count' }
                ]
              }
            }
          },
          {
            id: 'export1',
            type: 'export',
            position: { x: 700, y: 100 },
            data: {
              name: 'Export Results',
              config: {
                format: 'csv',
                destination: 's3://bucket/reports/daily-summary.csv'
              }
            }
          }
        ],
        edges: [
          { id: 'e1', source: 'trigger', target: 'database1' },
          { id: 'e2', source: 'database1', target: 'aggregate1' },
          { id: 'e3', source: 'aggregate1', target: 'export1' }
        ]
      }, null, 2)
    };

    return templates[template] || templates.empty;
  }

  private async openWorkflow(): Promise<void> {
    const uri = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: {
        'Workflow Files': ['workflow', 'wflow', 'json']
      }
    });

    if (uri && uri[0]) {
      const document = await vscode.workspace.openTextDocument(uri[0]);
      await vscode.window.showTextDocument(document);
    }
  }

  private async runWorkflow(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !editor.document.fileName.endsWith('.workflow')) {
      vscode.window.showErrorMessage('No workflow file is open');
      return;
    }

    try {
      const workflowContent = editor.document.getText();
      const workflow = JSON.parse(workflowContent);
      
      // Show progress
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Running workflow: ${workflow.name}`,
        cancellable: true
      }, async (progress, token) => {
        // Simulate workflow execution
        for (let i = 0; i < workflow.nodes.length; i++) {
          if (token.isCancellationRequested) {
            break;
          }
          
          const node = workflow.nodes[i];
          progress.report({ 
            increment: (100 / workflow.nodes.length),
            message: `Executing ${node.data.name}...`
          });
          
          // Simulate node execution
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        if (!token.isCancellationRequested) {
          vscode.window.showInformationMessage('Workflow completed successfully');
        }
      });
    } catch (error: unknown) {
      vscode.window.showErrorMessage(`Failed to run workflow: ${error.message}`);
    }
  }

  private async debugWorkflow(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !editor.document.fileName.endsWith('.workflow')) {
      vscode.window.showErrorMessage('No workflow file is open');
      return;
    }

    // Launch debug session
    await vscode.debug.startDebugging(undefined, {
      type: 'workflow',
      request: 'launch',
      name: 'Debug Workflow',
      program: editor.document.fileName,
      stopOnEntry: true,
      trace: true
    });
  }

  private async validateWorkflow(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !editor.document.fileName.endsWith('.workflow')) {
      vscode.window.showErrorMessage('No workflow file is open');
      return;
    }

    await this.validateWorkflowFile(editor.document.uri);
    vscode.window.showInformationMessage('Workflow validation complete');
  }

  private async validateWorkflowFile(uri: vscode.Uri): Promise<void> {
    try {
      const content = await vscode.workspace.fs.readFile(uri);
      const workflow = JSON.parse(content.toString());
      
      const diagnostics: vscode.Diagnostic[] = [];
      
      // Validate workflow structure
      if (!workflow.name) {
        diagnostics.push(new vscode.Diagnostic(
          new vscode.Range(0, 0, 0, 1),
          'Workflow must have a name',
          vscode.DiagnosticSeverity.Error
        ));
      }
      
      if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
        diagnostics.push(new vscode.Diagnostic(
          new vscode.Range(0, 0, 0, 1),
          'Workflow must have nodes array',
          vscode.DiagnosticSeverity.Error
        ));
      }
      
      // Validate nodes
      workflow.nodes?.forEach((node: unknown, index: number) => {
        if (!node.id) {
          diagnostics.push(new vscode.Diagnostic(
            new vscode.Range(index + 1, 0, index + 1, 1),
            `Node at index ${index} must have an id`,
            vscode.DiagnosticSeverity.Error
          ));
        }
        
        if (!node.type) {
          diagnostics.push(new vscode.Diagnostic(
            new vscode.Range(index + 1, 0, index + 1, 1),
            `Node ${node.id || index} must have a type`,
            vscode.DiagnosticSeverity.Error
          ));
        }
      });
      
      // Validate edges
      workflow.edges?.forEach((edge: unknown, index: number) => {
        const sourceExists = workflow.nodes?.some((n: unknown) => n.id === edge.source);
        const targetExists = workflow.nodes?.some((n: unknown) => n.id === edge.target);
        
        if (!sourceExists) {
          diagnostics.push(new vscode.Diagnostic(
            new vscode.Range(index + 1, 0, index + 1, 1),
            `Edge source '${edge.source}' not found`,
            vscode.DiagnosticSeverity.Error
          ));
        }
        
        if (!targetExists) {
          diagnostics.push(new vscode.Diagnostic(
            new vscode.Range(index + 1, 0, index + 1, 1),
            `Edge target '${edge.target}' not found`,
            vscode.DiagnosticSeverity.Error
          ));
        }
      });
      
      this.diagnosticCollection?.set(uri, diagnostics);
    } catch (error: unknown) {
      const diagnostic = new vscode.Diagnostic(
        new vscode.Range(0, 0, 0, 1),
        `Invalid JSON: ${error.message}`,
        vscode.DiagnosticSeverity.Error
      );
      this.diagnosticCollection?.set(uri, [diagnostic]);
    }
  }

  private async exportWorkflow(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !editor.document.fileName.endsWith('.workflow')) {
      vscode.window.showErrorMessage('No workflow file is open');
      return;
    }

    const format = await vscode.window.showQuickPick([
      { label: 'JavaScript', value: 'js' },
      { label: 'TypeScript', value: 'ts' },
      { label: 'Python', value: 'py' },
      { label: 'Docker Compose', value: 'docker' },
      { label: 'Kubernetes', value: 'k8s' }
    ], {
      placeHolder: 'Select export format'
    });

    if (!format) return;

    try {
      const workflowContent = editor.document.getText();
      const workflow = JSON.parse(workflowContent);
      
      const exportedCode = this.generateExportCode(workflow, format.value);
      
      const newDocument = await vscode.workspace.openTextDocument({
        content: exportedCode,
        language: format.value === 'docker' ? 'dockerfile' : format.value === 'k8s' ? 'yaml' : format.value
      });
      
      await vscode.window.showTextDocument(newDocument);
      vscode.window.showInformationMessage(`Workflow exported as ${format.label}`);
    } catch (error: unknown) {
      vscode.window.showErrorMessage(`Failed to export workflow: ${error.message}`);
    }
  }

  private generateExportCode(workflow: unknown, format: string): string {
    switch (format) {
      case 'js':
        return this.generateJavaScriptCode(workflow);
      case 'ts':
        return this.generateTypeScriptCode(workflow);
      case 'py':
        return this.generatePythonCode(workflow);
      case 'docker':
        return this.generateDockerCompose(workflow);
      case 'k8s':
        return this.generateKubernetes(workflow);
      default:
        return '// Export not implemented';
    }
  }

  private generateJavaScriptCode(workflow: unknown): string {
    return `// Generated workflow: ${workflow.name}
const { WorkflowEngine } = require('@workflow/engine');

const workflow = ${JSON.stringify(workflow, null, 2)};

async function runWorkflow() {
  const engine = new WorkflowEngine();
  
  // Register nodes
  ${workflow.nodes.map((node: unknown) => `
  engine.registerNode('${node.id}', {
    type: '${node.type}',
    config: ${JSON.stringify(node.data.config || {}, null, 4)}
  });`).join('')}
  
  // Execute workflow
  const result = await engine.execute(workflow);
  console.log('Workflow result:', result);
}

runWorkflow().catch(console.error);
`;
  }

  private generateTypeScriptCode(workflow: unknown): string {
    return `// Generated workflow: ${workflow.name}
import { WorkflowEngine, WorkflowConfig } from '@workflow/engine';

const workflowConfig: WorkflowConfig = ${JSON.stringify(workflow, null, 2)};

async function runWorkflow(): Promise<void> {
  const engine = new WorkflowEngine();
  
  // Register nodes
  ${workflow.nodes.map((node: unknown) => `
  engine.registerNode('${node.id}', {
    type: '${node.type}',
    config: ${JSON.stringify(node.data.config || {}, null, 4)}
  });`).join('')}
  
  // Execute workflow
  const result = await engine.execute(workflowConfig);
  console.log('Workflow result:', result);
}

runWorkflow().catch(console.error);
`;
  }

  private generatePythonCode(workflow: unknown): string {
    return `# Generated workflow: ${workflow.name}
from workflow_engine import WorkflowEngine
import json

workflow = ${JSON.stringify(workflow, null, 2)}

def run_workflow():
    engine = WorkflowEngine()
    
    # Register nodes
    ${workflow.nodes.map((node: unknown) => `
    engine.register_node('${node.id}', {
        'type': '${node.type}',
        'config': ${JSON.stringify(node.data.config || {}, null, 8).replace(/"/g, "'")}
    })`).join('')}
    
    # Execute workflow
    result = engine.execute(workflow)
    print(f'Workflow result: {result}')

if __name__ == '__main__':
    run_workflow()
`;
  }

  private generateDockerCompose(workflow: unknown): string {
    return `# Generated Docker Compose for: ${workflow.name}
version: '3.8'

services:
  workflow-engine:
    image: workflow/engine:latest
    environment:
      - WORKFLOW_NAME=${workflow.name}
      - NODE_ENV=production
    volumes:
      - ./workflows:/app/workflows
    ports:
      - "8080:8080"
    
  ${workflow.nodes.filter((n: unknown) => n.type === 'database').map((node: unknown, i: number) => `
  database-${i}:
    image: postgres:14
    environment:
      - POSTGRES_DB=workflow
      - POSTGRES_USER=workflow
      - POSTGRES_PASSWORD=workflow
    volumes:
      - db-data-${i}:/var/lib/postgresql/data
  `).join('')}
  
  ${workflow.nodes.filter((n: unknown) => n.type === 'redis').map((node: unknown, i: number) => `
  redis-${i}:
    image: redis:7
    command: redis-server --appendonly yes
    volumes:
      - redis-data-${i}:/data
  `).join('')}

volumes:
  ${workflow.nodes.filter((n: unknown) => n.type === 'database').map((_: unknown, i: number) => `db-data-${i}:`).join('\n  ')}
  ${workflow.nodes.filter((n: unknown) => n.type === 'redis').map((_: unknown, i: number) => `redis-data-${i}:`).join('\n  ')}
`;
  }

  private generateKubernetes(workflow: unknown): string {
    return `# Generated Kubernetes manifests for: ${workflow.name}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${workflow.name}-deployment
  labels:
    app: ${workflow.name}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${workflow.name}
  template:
    metadata:
      labels:
        app: ${workflow.name}
    spec:
      containers:
      - name: workflow-engine
        image: workflow/engine:latest
        ports:
        - containerPort: 8080
        env:
        - name: WORKFLOW_NAME
          value: "${workflow.name}"
        volumeMounts:
        - name: workflow-config
          mountPath: /app/workflows
      volumes:
      - name: workflow-config
        configMap:
          name: ${workflow.name}-config

---
apiVersion: v1
kind: Service
metadata:
  name: ${workflow.name}-service
spec:
  selector:
    app: ${workflow.name}
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: ${workflow.name}-config
data:
  workflow.json: |
    ${JSON.stringify(workflow, null, 4).split('\n').map(line => '    ' + line).join('\n')}
`;
  }

  private async showWorkflowPanel(): Promise<void> {
    if (this.workflowPanel) {
      this.workflowPanel.reveal();
      return;
    }

    this.workflowPanel = vscode.window.createWebviewPanel(
      'workflowEditor',
      'Workflow Editor',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(this.context!.extensionPath, 'media'))
        ]
      }
    );

    this.workflowPanel.webview.html = this.getWebviewContent();

    this.workflowPanel.onDidDispose(() => {
      this.workflowPanel = null;
    });
  }

  private getWebviewContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Workflow Editor</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: var(--vscode-font-family);
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        #workflow-canvas {
            width: 100vw;
            height: 100vh;
            position: relative;
        }
        .toolbar {
            position: absolute;
            top: 10px;
            left: 10px;
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            padding: 10px;
            display: flex;
            gap: 10px;
        }
        button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 5px 10px;
            cursor: pointer;
        }
        button:hover {
            background: var(--vscode-button-hoverBackground);
        }
    </style>
</head>
<body>
    <div id="workflow-canvas">
        <div class="toolbar">
            <button onclick="addNode()">Add Node</button>
            <button onclick="deleteNode()">Delete Node</button>
            <button onclick="saveWorkflow()">Save</button>
            <button onclick="loadWorkflow()">Load</button>
        </div>
        <div id="canvas"></div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        function addNode() {
            vscode.postMessage({ command: 'addNode' });
        }
        
        function deleteNode() {
            vscode.postMessage({ command: 'deleteNode' });
        }
        
        function saveWorkflow() {
            vscode.postMessage({ command: 'save' });
        }
        
        function loadWorkflow() {
            vscode.postMessage({ command: 'load' });
        }
        
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'loadWorkflow':
                    // Load workflow data
                    console.log('Loading workflow:', message.workflow);
                    break;
            }
        });
    </script>
</body>
</html>`;
  }

  private async insertNode(): Promise<void> {
    const nodeType = await vscode.window.showQuickPick([
      { label: 'HTTP Request', value: 'http' },
      { label: 'Database Query', value: 'database' },
      { label: 'Transform', value: 'transform' },
      { label: 'Condition', value: 'condition' },
      { label: 'Loop', value: 'loop' },
      { label: 'Function', value: 'function' },
      { label: 'Wait', value: 'wait' },
      { label: 'Email', value: 'email' }
    ], {
      placeHolder: 'Select node type'
    });

    if (!nodeType) return;

    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const nodeTemplate = this.getNodeTemplate(nodeType.value);
    
    await editor.edit(editBuilder => {
      editBuilder.insert(editor.selection.active, nodeTemplate);
    });
  }

  private getNodeTemplate(nodeType: string): string {
    const templates: Record<string, string> = {
      http: `{
  "id": "http_${Date.now()}",
  "type": "http",
  "data": {
    "name": "HTTP Request",
    "config": {
      "method": "GET",
      "url": "https://api.example.com/data",
      "headers": {
        "Content-Type": "application/json"
      }
    }
  }
}`,
      database: `{
  "id": "db_${Date.now()}",
  "type": "database",
  "data": {
    "name": "Database Query",
    "config": {
      "operation": "select",
      "query": "SELECT * FROM table WHERE id = :id",
      "parameters": {
        "id": "{{ $json.id }}"
      }
    }
  }
}`,
      transform: `{
  "id": "transform_${Date.now()}",
  "type": "transform",
  "data": {
    "name": "Transform Data",
    "config": {
      "expression": "{{ $json }}"
    }
  }
}`
    };

    return templates[nodeType] || '{}';
  }

  private async formatWorkflow(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    try {
      const document = editor.document;
      const content = document.getText();
      const formatted = JSON.stringify(JSON.parse(content), null, 2);
      
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(content.length)
      );
      
      await editor.edit(editBuilder => {
        editBuilder.replace(fullRange, formatted);
      });
    } catch (error: unknown) {
      vscode.window.showErrorMessage(`Failed to format workflow: ${error.message}`);
    }
  }

  private async generateCode(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !editor.document.fileName.endsWith('.workflow')) {
      vscode.window.showErrorMessage('No workflow file is open');
      return;
    }

    const language = await vscode.window.showQuickPick([
      { label: 'JavaScript', value: 'javascript' },
      { label: 'TypeScript', value: 'typescript' },
      { label: 'Python', value: 'python' },
      { label: 'Go', value: 'go' }
    ], {
      placeHolder: 'Select target language'
    });

    if (!language) return;

    try {
      const workflowContent = editor.document.getText();
      const workflow = JSON.parse(workflowContent);
      
      const code = this.generateCodeForLanguage(workflow, language.value);
      
      const newDocument = await vscode.workspace.openTextDocument({
        content: code,
        language: language.value
      });
      
      await vscode.window.showTextDocument(newDocument);
    } catch (error: unknown) {
      vscode.window.showErrorMessage(`Failed to generate code: ${error.message}`);
    }
  }

  private generateCodeForLanguage(workflow: unknown, language: string): string {
    // Reuse the export code generators
    switch (language) {
      case 'javascript':
        return this.generateJavaScriptCode(workflow);
      case 'typescript':
        return this.generateTypeScriptCode(workflow);
      case 'python':
        return this.generatePythonCode(workflow);
      default:
        return '// Code generation not implemented for this language';
    }
  }

  public deactivate(): void {
    this.outputChannel?.appendLine('Workflow Editor extension deactivated');
    this.emit('extension:deactivated');
  }
}

// Completion Provider
class WorkflowCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    token: vscode.CancellationToken,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: vscode.CompletionContext
  ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
    const linePrefix = document.lineAt(position).text.substr(0, position.character);
    
    // Node type completions
    if (linePrefix.includes('"type":')) {
      return [
        new vscode.CompletionItem('trigger', vscode.CompletionItemKind.Value),
        new vscode.CompletionItem('http', vscode.CompletionItemKind.Value),
        new vscode.CompletionItem('database', vscode.CompletionItemKind.Value),
        new vscode.CompletionItem('transform', vscode.CompletionItemKind.Value),
        new vscode.CompletionItem('condition', vscode.CompletionItemKind.Value),
        new vscode.CompletionItem('loop', vscode.CompletionItemKind.Value),
        new vscode.CompletionItem('function', vscode.CompletionItemKind.Value),
        new vscode.CompletionItem('wait', vscode.CompletionItemKind.Value)
      ];
    }
    
    // Expression completions
    if (linePrefix.includes('{{')) {
      return [
        new vscode.CompletionItem('$json', vscode.CompletionItemKind.Variable),
        new vscode.CompletionItem('$node', vscode.CompletionItemKind.Variable),
        new vscode.CompletionItem('$workflow', vscode.CompletionItemKind.Variable),
        new vscode.CompletionItem('$env', vscode.CompletionItemKind.Variable),
        new vscode.CompletionItem('$now()', vscode.CompletionItemKind.Function),
        new vscode.CompletionItem('$random()', vscode.CompletionItemKind.Function)
      ];
    }
    
    return [];
  }
}

// Hover Provider
class WorkflowHoverProvider implements vscode.HoverProvider {
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    const range = document.getWordRangeAtPosition(position);
    const word = document.getText(range);
    
    const hovers: Record<string, string> = {
      'trigger': 'A trigger node starts the workflow execution',
      'http': 'Makes HTTP requests to external APIs',
      'database': 'Executes database queries',
      'transform': 'Transforms data using expressions',
      '$json': 'Current node input data',
      '$node': 'Access data from other nodes',
      '$workflow': 'Workflow metadata and variables',
      '$env': 'Environment variables'
    };
    
    const hoverText = hovers[word];
    if (hoverText) {
      return new vscode.Hover(new vscode.MarkdownString(hoverText));
    }
    
    return null;
  }
}

// Other provider implementations...
class WorkflowDefinitionProvider implements vscode.DefinitionProvider {
  provideDefinition(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    document: vscode.TextDocument,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    position: vscode.Position,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Definition | vscode.LocationLink[]> {
    // Implementation for go-to-definition
    return null;
  }
}

class WorkflowReferenceProvider implements vscode.ReferenceProvider {
  provideReferences(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    document: vscode.TextDocument,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    position: vscode.Position,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: vscode.ReferenceContext,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Location[]> {
    // Implementation for find-all-references
    return [];
  }
}

class WorkflowRenameProvider implements vscode.RenameProvider {
  provideRenameEdits(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    document: vscode.TextDocument,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    position: vscode.Position,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    newName: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.WorkspaceEdit> {
    // Implementation for rename refactoring
    return null;
  }
}

class WorkflowCodeLensProvider implements vscode.CodeLensProvider {
  provideCodeLenses(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    document: vscode.TextDocument,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    // Implementation for code lens
    return [];
  }
}

class WorkflowCodeActionProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    document: vscode.TextDocument,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    range: vscode.Range | vscode.Selection,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: vscode.CodeActionContext,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    token: vscode.CancellationToken
  ): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
    // Implementation for code actions
    return [];
  }
}

class WorkflowDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  provideDocumentSymbols(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    document: vscode.TextDocument,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.SymbolInformation[] | vscode.DocumentSymbol[]> {
    // Implementation for document symbols
    return [];
  }
}

class WorkflowFoldingRangeProvider implements vscode.FoldingRangeProvider {
  provideFoldingRanges(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    document: vscode.TextDocument,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: vscode.FoldingContext,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.FoldingRange[]> {
    // Implementation for folding ranges
    return [];
  }
}

class WorkflowDocumentFormatter implements vscode.DocumentFormattingEditProvider {
  provideDocumentFormattingEdits(
    document: vscode.TextDocument,
    options: vscode.FormattingOptions,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.TextEdit[]> {
    try {
      const content = document.getText();
      const formatted = JSON.stringify(JSON.parse(content), null, options.tabSize);
      
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(content.length)
      );
      
      return [vscode.TextEdit.replace(fullRange, formatted)];
    } catch {
      return [];
    }
  }
}

class WorkflowDocumentRangeFormatter implements vscode.DocumentRangeFormattingEditProvider {
  provideDocumentRangeFormattingEdits(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    document: vscode.TextDocument,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    range: vscode.Range,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options: vscode.FormattingOptions,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.TextEdit[]> {
    // Implementation for range formatting
    return [];
  }
}

class WorkflowOnTypeFormatter implements vscode.OnTypeFormattingEditProvider {
  provideOnTypeFormattingEdits(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    document: vscode.TextDocument,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    position: vscode.Position,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ch: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options: vscode.FormattingOptions,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.TextEdit[]> {
    // Implementation for on-type formatting
    return [];
  }
}

class WorkflowSignatureHelpProvider implements vscode.SignatureHelpProvider {
  provideSignatureHelp(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    document: vscode.TextDocument,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    position: vscode.Position,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    token: vscode.CancellationToken,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: vscode.SignatureHelpContext
  ): vscode.ProviderResult<vscode.SignatureHelp> {
    // Implementation for signature help
    return null;
  }
}

// Tree Data Provider
class WorkflowTreeDataProvider implements vscode.TreeDataProvider<WorkflowTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<WorkflowTreeItem | undefined | null | void> = new vscode.EventEmitter<WorkflowTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<WorkflowTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor(private context: vscode.ExtensionContext) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: WorkflowTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: WorkflowTreeItem): Thenable<WorkflowTreeItem[]> {
    if (!element) {
      // Return root elements
      return Promise.resolve([
        new WorkflowTreeItem('Workflows', vscode.TreeItemCollapsibleState.Expanded),
        new WorkflowTreeItem('Templates', vscode.TreeItemCollapsibleState.Collapsed),
        new WorkflowTreeItem('Recent', vscode.TreeItemCollapsibleState.Collapsed)
      ]);
    }
    
    return Promise.resolve([]);
  }
}

class WorkflowTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command
  ) {
    super(label, collapsibleState);
  }
}

export default WorkflowVSCodeExtension;