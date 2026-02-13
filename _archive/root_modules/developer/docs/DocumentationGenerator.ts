/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-require-imports */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as ts from 'typescript';
import * as marked from 'marked';
import * as highlight from 'highlight.js';
import * as jsdoc from 'jsdoc-api';
import * as typedoc from 'typedoc';
import * as swagger from 'swagger-jsdoc';
import * as madge from 'madge';

export interface DocumentationConfig {
  projectName: string;
  version: string;
  description?: string;
  sourceDir: string;
  outputDir: string;
  format: 'html' | 'markdown' | 'pdf' | 'docusaurus' | 'vuepress' | 'gitbook';
  theme?: string;
  includePrivate?: boolean;
  includeExamples?: boolean;
  includeTutorials?: boolean;
  includeChangelog?: boolean;
  includeContributing?: boolean;
  customPages?: CustomPage[];
  plugins?: string[];
}

export interface CustomPage {
  title: string;
  path: string;
  content?: string;
  order?: number;
}

export interface APIDocumentation {
  classes: ClassDoc[];
  interfaces: InterfaceDoc[];
  functions: FunctionDoc[];
  variables: VariableDoc[];
  enums: EnumDoc[];
  types: TypeAliasDoc[];
}

export interface ClassDoc {
  name: string;
  description?: string;
  extends?: string;
  implements?: string[];
  constructors: ConstructorDoc[];
  properties: PropertyDoc[];
  methods: MethodDoc[];
  examples?: string[];
  deprecated?: boolean;
  since?: string;
  tags?: Record<string, string>;
}

export interface InterfaceDoc {
  name: string;
  description?: string;
  extends?: string[];
  properties: PropertyDoc[];
  methods: MethodDoc[];
  examples?: string[];
}

export interface FunctionDoc {
  name: string;
  description?: string;
  parameters: ParameterDoc[];
  returns?: ReturnDoc;
  examples?: string[];
  deprecated?: boolean;
  async?: boolean;
  generator?: boolean;
}

export interface PropertyDoc {
  name: string;
  type: string;
  description?: string;
  optional?: boolean;
  readonly?: boolean;
  static?: boolean;
  default?: string;
}

export interface MethodDoc {
  name: string;
  description?: string;
  parameters: ParameterDoc[];
  returns?: ReturnDoc;
  examples?: string[];
  deprecated?: boolean;
  async?: boolean;
  static?: boolean;
  protected?: boolean;
  private?: boolean;
}

export interface ParameterDoc {
  name: string;
  type: string;
  description?: string;
  optional?: boolean;
  default?: string;
}

export interface ReturnDoc {
  type: string;
  description?: string;
}

export interface ConstructorDoc {
  parameters: ParameterDoc[];
  description?: string;
}

export interface VariableDoc {
  name: string;
  type: string;
  description?: string;
  const?: boolean;
  value?: string;
}

export interface EnumDoc {
  name: string;
  description?: string;
  members: EnumMemberDoc[];
}

export interface EnumMemberDoc {
  name: string;
  value: string | number;
  description?: string;
}

export interface TypeAliasDoc {
  name: string;
  type: string;
  description?: string;
  generics?: string[];
}

export interface WorkflowDocumentation {
  workflows: WorkflowDoc[];
  nodes: NodeDoc[];
  triggers: TriggerDoc[];
  actions: ActionDoc[];
  expressions: ExpressionDoc[];
}

export interface WorkflowDoc {
  id: string;
  name: string;
  description?: string;
  inputs?: ParameterDoc[];
  outputs?: ParameterDoc[];
  nodes: string[];
  edges: EdgeDoc[];
  examples?: string[];
  tags?: string[];
}

export interface NodeDoc {
  type: string;
  category: string;
  name: string;
  description?: string;
  inputs?: ParameterDoc[];
  outputs?: ParameterDoc[];
  config?: PropertyDoc[];
  examples?: string[];
  icon?: string;
}

export interface TriggerDoc {
  type: string;
  name: string;
  description?: string;
  config?: PropertyDoc[];
  outputs?: ParameterDoc[];
  examples?: string[];
}

export interface ActionDoc {
  type: string;
  name: string;
  description?: string;
  inputs?: ParameterDoc[];
  outputs?: ParameterDoc[];
  config?: PropertyDoc[];
  examples?: string[];
}

export interface ExpressionDoc {
  name: string;
  syntax: string;
  description?: string;
  parameters?: ParameterDoc[];
  returns?: ReturnDoc;
  examples?: string[];
  category?: string;
}

export interface EdgeDoc {
  id: string;
  source: string;
  target: string;
  condition?: string;
}

export class DocumentationGenerator extends EventEmitter {
  private config: DocumentationConfig;
  private apiDocs: APIDocumentation | null = null;
  private workflowDocs: WorkflowDocumentation | null = null;
  private dependencies: unknown = null;

  constructor(config: DocumentationConfig) {
    super();
    this.config = config;
    
    // Configure marked with syntax highlighting
    marked.setOptions({
      highlight: (code, lang) => {
        try {
          return highlight.highlight(code, { language: lang }).value;
        } catch {
          return code;
        }
      }
    });
  }

  public async generate(): Promise<void> {
    this.emit('generation:start', this.config);

    try {
      // Create output directory
      await fs.mkdir(this.config.outputDir, { recursive: true });

      // Generate API documentation
      await this.generateAPIDocs();

      // Generate workflow documentation
      await this.generateWorkflowDocs();

      // Generate dependency graph
      await this.generateDependencyGraph();

      // Generate documentation based on format
      switch (this.config.format) {
        case 'html':
          await this.generateHTML();
          break;
        case 'markdown':
          await this.generateMarkdown();
          break;
        case 'pdf':
          await this.generatePDF();
          break;
        case 'docusaurus':
          await this.generateDocusaurus();
          break;
        case 'vuepress':
          await this.generateVuePress();
          break;
        case 'gitbook':
          await this.generateGitBook();
          break;
      }

      // Generate additional files
      if (this.config.includeExamples) {
        await this.generateExamples();
      }

      if (this.config.includeTutorials) {
        await this.generateTutorials();
      }

      if (this.config.includeChangelog) {
        await this.generateChangelog();
      }

      if (this.config.includeContributing) {
        await this.generateContributing();
      }

      // Copy custom pages
      if (this.config.customPages) {
        await this.copyCustomPages();
      }

      this.emit('generation:complete', {
        outputDir: this.config.outputDir,
        format: this.config.format
      });

    } catch (error) {
      this.emit('generation:error', error);
      throw error;
    }
  }

  private async generateAPIDocs(): Promise<void> {
    // Use TypeDoc for TypeScript projects
    const app = new typedoc.Application();

    app.options.addReader(new typedoc.TSConfigReader());
    app.options.addReader(new typedoc.TypeDocReader());

    app.bootstrap({
      entryPoints: [this.config.sourceDir],
      excludePrivate: !this.config.includePrivate,
      excludeProtected: !this.config.includePrivate,
      includeVersion: true,
      readme: path.join(this.config.sourceDir, 'README.md')
    });

    const project = app.convert();
    
    if (project) {
      this.apiDocs = this.parseTypeDocProject(project);
      
      // Generate TypeDoc JSON for further processing
      await app.generateJson(project, path.join(this.config.outputDir, 'api.json'));
    }
  }

  private parseTypeDocProject(project: unknown): APIDocumentation {
    const docs: APIDocumentation = {
      classes: [],
      interfaces: [],
      functions: [],
      variables: [],
      enums: [],
      types: []
    };

    // Parse TypeDoc reflection tree
    const parseReflection = (reflection: unknown) => {
      switch (reflection.kind) {
        case typedoc.ReflectionKind.Class:
          docs.classes.push(this.parseClass(reflection));
          break;
        case typedoc.ReflectionKind.Interface:
          docs.interfaces.push(this.parseInterface(reflection));
          break;
        case typedoc.ReflectionKind.Function:
          docs.functions.push(this.parseFunction(reflection));
          break;
        case typedoc.ReflectionKind.Variable:
          docs.variables.push(this.parseVariable(reflection));
          break;
        case typedoc.ReflectionKind.Enum:
          docs.enums.push(this.parseEnum(reflection));
          break;
        case typedoc.ReflectionKind.TypeAlias:
          docs.types.push(this.parseTypeAlias(reflection));
          break;
      }
    };

    project.traverse((child: unknown) => {
      parseReflection(child);
      return true;
    });

    return docs;
  }

  private parseClass(reflection: unknown): ClassDoc {
    return {
      name: reflection.name,
      description: reflection.comment?.shortText,
      extends: reflection.extendedTypes?.[0]?.name,
      implements: reflection.implementedTypes?.map((t: unknown) => t.name),
      constructors: this.parseConstructors(reflection),
      properties: this.parseProperties(reflection),
      methods: this.parseMethods(reflection),
      examples: this.parseExamples(reflection),
      deprecated: reflection.comment?.hasTag('deprecated'),
      since: reflection.comment?.getTag('since')?.text
    };
  }

  private parseInterface(reflection: unknown): InterfaceDoc {
    return {
      name: reflection.name,
      description: reflection.comment?.shortText,
      extends: reflection.extendedTypes?.map((t: unknown) => t.name),
      properties: this.parseProperties(reflection),
      methods: this.parseMethods(reflection),
      examples: this.parseExamples(reflection)
    };
  }

  private parseFunction(reflection: unknown): FunctionDoc {
    return {
      name: reflection.name,
      description: reflection.comment?.shortText,
      parameters: this.parseParameters(reflection),
      returns: this.parseReturn(reflection),
      examples: this.parseExamples(reflection),
      deprecated: reflection.comment?.hasTag('deprecated'),
      async: reflection.flags?.isAsync,
      generator: reflection.flags?.isGenerator
    };
  }

  private parseVariable(reflection: unknown): VariableDoc {
    return {
      name: reflection.name,
      type: reflection.type?.toString() || 'any',
      description: reflection.comment?.shortText,
      const: reflection.flags?.isConst,
      value: reflection.defaultValue
    };
  }

  private parseEnum(reflection: unknown): EnumDoc {
    return {
      name: reflection.name,
      description: reflection.comment?.shortText,
      members: reflection.children?.map((child: unknown) => ({
        name: child.name,
        value: child.defaultValue,
        description: child.comment?.shortText
      })) || []
    };
  }

  private parseTypeAlias(reflection: unknown): TypeAliasDoc {
    return {
      name: reflection.name,
      type: reflection.type?.toString() || 'any',
      description: reflection.comment?.shortText,
      generics: reflection.typeParameters?.map((p: unknown) => p.name)
    };
  }

  private parseConstructors(reflection: unknown): ConstructorDoc[] {
    const constructors = reflection.children?.filter(
      (child: unknown) => child.kind === typedoc.ReflectionKind.Constructor
    ) || [];

    return constructors.map((ctor: unknown) => ({
      parameters: this.parseParameters(ctor),
      description: ctor.comment?.shortText
    }));
  }

  private parseProperties(reflection: unknown): PropertyDoc[] {
    const properties = reflection.children?.filter(
      (child: unknown) => child.kind === typedoc.ReflectionKind.Property
    ) || [];

    return properties.map((prop: unknown) => ({
      name: prop.name,
      type: prop.type?.toString() || 'any',
      description: prop.comment?.shortText,
      optional: prop.flags?.isOptional,
      readonly: prop.flags?.isReadonly,
      static: prop.flags?.isStatic,
      default: prop.defaultValue
    }));
  }

  private parseMethods(reflection: unknown): MethodDoc[] {
    const methods = reflection.children?.filter(
      (child: unknown) => child.kind === typedoc.ReflectionKind.Method
    ) || [];

    return methods.map((method: unknown) => ({
      name: method.name,
      description: method.comment?.shortText,
      parameters: this.parseParameters(method),
      returns: this.parseReturn(method),
      examples: this.parseExamples(method),
      deprecated: method.comment?.hasTag('deprecated'),
      async: method.flags?.isAsync,
      static: method.flags?.isStatic,
      protected: method.flags?.isProtected,
      private: method.flags?.isPrivate
    }));
  }

  private parseParameters(reflection: unknown): ParameterDoc[] {
    return reflection.signatures?.[0]?.parameters?.map((param: unknown) => ({
      name: param.name,
      type: param.type?.toString() || 'any',
      description: param.comment?.shortText,
      optional: param.flags?.isOptional,
      default: param.defaultValue
    })) || [];
  }

  private parseReturn(reflection: unknown): ReturnDoc | undefined {
    const returnType = reflection.signatures?.[0]?.type;
    const returnComment = reflection.signatures?.[0]?.comment?.returns;

    if (returnType) {
      return {
        type: returnType.toString(),
        description: returnComment
      };
    }

    return undefined;
  }

  private parseExamples(reflection: unknown): string[] {
    const exampleTags = reflection.comment?.tags?.filter(
      (tag: unknown) => tag.tagName === 'example'
    ) || [];

    return exampleTags.map((tag: unknown) => tag.text);
  }

  private async generateWorkflowDocs(): Promise<void> {
    this.workflowDocs = {
      workflows: await this.parseWorkflows(),
      nodes: await this.parseNodes(),
      triggers: await this.parseTriggers(),
      actions: await this.parseActions(),
      expressions: await this.parseExpressions()
    };
  }

  private async parseWorkflows(): Promise<WorkflowDoc[]> {
    const workflowsDir = path.join(this.config.sourceDir, 'workflows');
    const workflows: WorkflowDoc[] = [];

    try {
      const files = await fs.readdir(workflowsDir);
      
      for (const file of files) {
        if (file.endsWith('.workflow') || file.endsWith('.json')) {
          const content = await fs.readFile(path.join(workflowsDir, file), 'utf-8');
          const workflow = JSON.parse(content);
          
          workflows.push({
            id: workflow.id || path.basename(file, path.extname(file)),
            name: workflow.name,
            description: workflow.description,
            inputs: workflow.inputs,
            outputs: workflow.outputs,
            nodes: workflow.nodes?.map((n: unknown) => n.id) || [],
            edges: workflow.edges || [],
            examples: workflow.examples,
            tags: workflow.tags
          });
        }
      }
    } catch (error) {
      // No workflows directory
    }

    return workflows;
  }

  private async parseNodes(): Promise<NodeDoc[]> {
    // Parse node types from the codebase
    const nodesFile = path.join(this.config.sourceDir, 'data', 'nodeTypes.ts');
    
    try {
      const content = await fs.readFile(nodesFile, 'utf-8');
      // Parse TypeScript file to extract node definitions
      // This is a simplified version - in practice, use the TypeScript AST
      
      return []; // Placeholder
    } catch {
      return [];
    }
  }

  private async parseTriggers(): Promise<TriggerDoc[]> {
    // Parse trigger types
    return [];
  }

  private async parseActions(): Promise<ActionDoc[]> {
    // Parse action types
    return [];
  }

  private async parseExpressions(): Promise<ExpressionDoc[]> {
    // Parse expression functions
    return [
      {
        name: '$json',
        syntax: '$json',
        description: 'Access the current node input data',
        category: 'Data Access'
      },
      {
        name: '$node',
        syntax: '$node["nodeName"].json',
        description: 'Access data from another node',
        parameters: [{
          name: 'nodeName',
          type: 'string',
          description: 'The name of the node to access'
        }],
        category: 'Data Access'
      },
      {
        name: '$workflow',
        syntax: '$workflow.id',
        description: 'Access workflow metadata',
        category: 'Metadata'
      }
    ];
  }

  private async generateDependencyGraph(): Promise<void> {
    try {
      this.dependencies = await madge(this.config.sourceDir);
      const graph = this.dependencies.obj();
      
      // Generate dependency visualization
      await this.dependencies.image(path.join(this.config.outputDir, 'dependencies.svg'));
      
      // Save dependency data
      await fs.writeFile(
        path.join(this.config.outputDir, 'dependencies.json'),
        JSON.stringify(graph, null, 2)
      );
    } catch (error) {
      console.warn('Failed to generate dependency graph:', error);
    }
  }

  private async generateHTML(): Promise<void> {
    const template = await this.loadTemplate('html');
    
    const html = await this.renderTemplate(template, {
      config: this.config,
      api: this.apiDocs,
      workflows: this.workflowDocs,
      navigation: this.generateNavigation(),
      timestamp: new Date().toISOString()
    });

    await fs.writeFile(path.join(this.config.outputDir, 'index.html'), html);
    
    // Copy assets
    await this.copyAssets('html');
    
    // Generate individual pages
    await this.generateHTMLPages();
  }

  private async generateHTMLPages(): Promise<void> {
    // Generate class pages
    if (this.apiDocs?.classes) {
      for (const cls of this.apiDocs.classes) {
        const html = await this.renderClassPage(cls);
        await fs.writeFile(
          path.join(this.config.outputDir, 'classes', `${cls.name}.html`),
          html
        );
      }
    }

    // Generate interface pages
    if (this.apiDocs?.interfaces) {
      for (const iface of this.apiDocs.interfaces) {
        const html = await this.renderInterfacePage(iface);
        await fs.writeFile(
          path.join(this.config.outputDir, 'interfaces', `${iface.name}.html`),
          html
        );
      }
    }

    // Generate workflow pages
    if (this.workflowDocs?.workflows) {
      for (const workflow of this.workflowDocs.workflows) {
        const html = await this.renderWorkflowPage(workflow);
        await fs.writeFile(
          path.join(this.config.outputDir, 'workflows', `${workflow.id}.html`),
          html
        );
      }
    }
  }

  private async generateMarkdown(): Promise<void> {
    // Generate main README
    const readme = await this.generateReadme();
    await fs.writeFile(path.join(this.config.outputDir, 'README.md'), readme);

    // Generate API reference
    if (this.apiDocs) {
      const apiRef = await this.generateAPIReference();
      await fs.writeFile(path.join(this.config.outputDir, 'API.md'), apiRef);
    }

    // Generate workflow documentation
    if (this.workflowDocs) {
      const workflowRef = await this.generateWorkflowReference();
      await fs.writeFile(path.join(this.config.outputDir, 'WORKFLOWS.md'), workflowRef);
    }

    // Generate individual markdown files
    await this.generateMarkdownPages();
  }

  private async generateReadme(): Promise<string> {
    return `# ${this.config.projectName}

${this.config.description || ''}

## Version

${this.config.version}

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](./API.md)
- [Workflow Documentation](./WORKFLOWS.md)
${this.config.includeExamples ? '- [Examples](./examples/README.md)' : ''}
${this.config.includeTutorials ? '- [Tutorials](./tutorials/README.md)' : ''}
${this.config.includeChangelog ? '- [Changelog](./CHANGELOG.md)' : ''}
${this.config.includeContributing ? '- [Contributing](./CONTRIBUTING.md)' : ''}

## Installation

\`\`\`bash
npm install ${this.config.projectName.toLowerCase()}
\`\`\`

## Quick Start

\`\`\`typescript
import { WorkflowEngine } from '${this.config.projectName.toLowerCase()}';

const engine = new WorkflowEngine();
// ... your code here
\`\`\`

## License

See [LICENSE](./LICENSE) file for details.
`;
  }

  private async generateAPIReference(): Promise<string> {
    if (!this.apiDocs) return '';

    let content = '# API Reference\n\n';

    // Classes
    if (this.apiDocs.classes.length > 0) {
      content += '## Classes\n\n';
      for (const cls of this.apiDocs.classes) {
        content += `### ${cls.name}\n\n`;
        if (cls.description) content += `${cls.description}\n\n`;
        
        // Constructor
        if (cls.constructors.length > 0) {
          content += '#### Constructor\n\n';
          for (const ctor of cls.constructors) {
            content += '```typescript\n';
            content += `new ${cls.name}(${this.formatParameters(ctor.parameters)})\n`;
            content += '```\n\n';
          }
        }
        
        // Properties
        if (cls.properties.length > 0) {
          content += '#### Properties\n\n';
          for (const prop of cls.properties) {
            content += `- **${prop.name}**: \`${prop.type}\``;
            if (prop.description) content += ` - ${prop.description}`;
            content += '\n';
          }
          content += '\n';
        }
        
        // Methods
        if (cls.methods.length > 0) {
          content += '#### Methods\n\n';
          for (const method of cls.methods) {
            content += `##### ${method.name}\n\n`;
            content += '```typescript\n';
            content += `${method.name}(${this.formatParameters(method.parameters)})`;
            if (method.returns) content += `: ${method.returns.type}`;
            content += '\n```\n\n';
            if (method.description) content += `${method.description}\n\n`;
          }
        }
      }
    }

    // Interfaces
    if (this.apiDocs.interfaces.length > 0) {
      content += '## Interfaces\n\n';
      for (const iface of this.apiDocs.interfaces) {
        content += `### ${iface.name}\n\n`;
        if (iface.description) content += `${iface.description}\n\n`;
        
        content += '```typescript\n';
        content += `interface ${iface.name} {\n`;
        for (const prop of iface.properties) {
          content += `  ${prop.name}${prop.optional ? '?' : ''}: ${prop.type};\n`;
        }
        content += '}\n```\n\n';
      }
    }

    // Functions
    if (this.apiDocs.functions.length > 0) {
      content += '## Functions\n\n';
      for (const func of this.apiDocs.functions) {
        content += `### ${func.name}\n\n`;
        content += '```typescript\n';
        content += `${func.async ? 'async ' : ''}function ${func.name}(${this.formatParameters(func.parameters)})`;
        if (func.returns) content += `: ${func.returns.type}`;
        content += '\n```\n\n';
        if (func.description) content += `${func.description}\n\n`;
      }
    }

    return content;
  }

  private formatParameters(parameters: ParameterDoc[]): string {
    return parameters.map(p => 
      `${p.name}${p.optional ? '?' : ''}: ${p.type}${p.default ? ` = ${p.default}` : ''}`
    ).join(', ');
  }

  private async generateWorkflowReference(): Promise<string> {
    if (!this.workflowDocs) return '';

    let content = '# Workflow Documentation\n\n';

    // Workflows
    if (this.workflowDocs.workflows.length > 0) {
      content += '## Workflows\n\n';
      for (const workflow of this.workflowDocs.workflows) {
        content += `### ${workflow.name}\n\n`;
        if (workflow.description) content += `${workflow.description}\n\n`;
        
        if (workflow.inputs && workflow.inputs.length > 0) {
          content += '#### Inputs\n\n';
          for (const input of workflow.inputs) {
            content += `- **${input.name}**: \`${input.type}\``;
            if (input.description) content += ` - ${input.description}`;
            content += '\n';
          }
          content += '\n';
        }
        
        if (workflow.outputs && workflow.outputs.length > 0) {
          content += '#### Outputs\n\n';
          for (const output of workflow.outputs) {
            content += `- **${output.name}**: \`${output.type}\``;
            if (output.description) content += ` - ${output.description}`;
            content += '\n';
          }
          content += '\n';
        }
      }
    }

    // Node Types
    if (this.workflowDocs.nodes.length > 0) {
      content += '## Node Types\n\n';
      for (const node of this.workflowDocs.nodes) {
        content += `### ${node.name}\n\n`;
        content += `**Category**: ${node.category}\n\n`;
        if (node.description) content += `${node.description}\n\n`;
      }
    }

    // Expressions
    if (this.workflowDocs.expressions.length > 0) {
      content += '## Expressions\n\n';
      for (const expr of this.workflowDocs.expressions) {
        content += `### ${expr.name}\n\n`;
        content += `**Syntax**: \`${expr.syntax}\`\n\n`;
        if (expr.description) content += `${expr.description}\n\n`;
      }
    }

    return content;
  }

  private async generateMarkdownPages(): Promise<void> {
    // Create directories
    await fs.mkdir(path.join(this.config.outputDir, 'classes'), { recursive: true });
    await fs.mkdir(path.join(this.config.outputDir, 'interfaces'), { recursive: true });

    // Generate individual class documentation
    if (this.apiDocs?.classes) {
      for (const cls of this.apiDocs.classes) {
        const content = this.generateClassMarkdown(cls);
        await fs.writeFile(
          path.join(this.config.outputDir, 'classes', `${cls.name}.md`),
          content
        );
      }
    }
  }

  private generateClassMarkdown(cls: ClassDoc): string {
    let content = `# Class: ${cls.name}\n\n`;
    
    if (cls.description) {
      content += `${cls.description}\n\n`;
    }
    
    if (cls.extends) {
      content += `**Extends**: ${cls.extends}\n\n`;
    }
    
    if (cls.implements && cls.implements.length > 0) {
      content += `**Implements**: ${cls.implements.join(', ')}\n\n`;
    }
    
    return content;
  }

  private async generatePDF(): Promise<void> {
    // Use puppeteer to generate PDF from HTML
    const puppeteer = require('puppeteer');
    
    // First generate HTML
    await this.generateHTML();
    
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    await page.goto(`file://${path.join(this.config.outputDir, 'index.html')}`, {
      waitUntil: 'networkidle2'
    });
    
    await page.pdf({
      path: path.join(this.config.outputDir, `${this.config.projectName}.pdf`),
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });
    
    await browser.close();
  }

  private async generateDocusaurus(): Promise<void> {
    // Generate Docusaurus configuration
    const config = {
      title: this.config.projectName,
      tagline: this.config.description,
      url: 'https://your-site.com',
      baseUrl: '/',
      favicon: 'img/favicon.ico',
      organizationName: 'your-org',
      projectName: this.config.projectName,
      themeConfig: {
        navbar: {
          title: this.config.projectName,
          items: [
            {
              to: 'docs/',
              activeBasePath: 'docs',
              label: 'Docs',
              position: 'left'
            },
            {
              to: 'api/',
              label: 'API',
              position: 'left'
            }
          ]
        }
      },
      presets: [
        [
          '@docusaurus/preset-classic',
          {
            docs: {
              sidebarPath: './sidebars.js'
            },
            theme: {
              customCss: './src/css/custom.css'
            }
          }
        ]
      ]
    };

    await fs.writeFile(
      path.join(this.config.outputDir, 'docusaurus.config.js'),
      `module.exports = ${JSON.stringify(config, null, 2)};`
    );

    // Generate sidebar
    const sidebar = {
      docs: [
        {
          type: 'category',
          label: 'Getting Started',
          items: ['introduction', 'installation', 'quick-start']
        },
        {
          type: 'category',
          label: 'API Reference',
          items: this.apiDocs?.classes.map(c => `api/${c.name}`) || []
        }
      ]
    };

    await fs.writeFile(
      path.join(this.config.outputDir, 'sidebars.js'),
      `module.exports = ${JSON.stringify(sidebar, null, 2)};`
    );

    // Generate documentation pages
    await fs.mkdir(path.join(this.config.outputDir, 'docs'), { recursive: true });
    await this.generateMarkdown(); // Reuse markdown generation
  }

  private async generateVuePress(): Promise<void> {
    // Generate VuePress configuration
    const config = {
      title: this.config.projectName,
      description: this.config.description,
      themeConfig: {
        nav: [
          { text: 'Home', link: '/' },
          { text: 'Guide', link: '/guide/' },
          { text: 'API', link: '/api/' }
        ],
        sidebar: {
          '/guide/': [
            '',
            'getting-started',
            'installation'
          ],
          '/api/': this.generateVuePressAPISidebar()
        }
      }
    };

    await fs.mkdir(path.join(this.config.outputDir, '.vuepress'), { recursive: true });
    await fs.writeFile(
      path.join(this.config.outputDir, '.vuepress', 'config.js'),
      `module.exports = ${JSON.stringify(config, null, 2)};`
    );

    // Generate documentation pages
    await this.generateMarkdown();
  }

  private generateVuePressAPISidebar(): unknown[] {
    const sidebar: unknown[] = [];

    if (this.apiDocs?.classes.length) {
      sidebar.push({
        title: 'Classes',
        children: this.apiDocs.classes.map(c => `/api/classes/${c.name}`)
      });
    }

    if (this.apiDocs?.interfaces.length) {
      sidebar.push({
        title: 'Interfaces',
        children: this.apiDocs.interfaces.map(i => `/api/interfaces/${i.name}`)
      });
    }

    return sidebar;
  }

  private async generateGitBook(): Promise<void> {
    // Generate GitBook configuration
    const config = {
      title: this.config.projectName,
      description: this.config.description,
      author: 'Your Name',
      language: 'en',
      plugins: ['search', 'highlight', 'sharing'],
      pluginsConfig: {
        search: {
          maxIndexSize: 1000000
        }
      }
    };

    await fs.writeFile(
      path.join(this.config.outputDir, 'book.json'),
      JSON.stringify(config, null, 2)
    );

    // Generate SUMMARY.md
    const summary = this.generateGitBookSummary();
    await fs.writeFile(
      path.join(this.config.outputDir, 'SUMMARY.md'),
      summary
    );

    // Generate documentation pages
    await this.generateMarkdown();
  }

  private generateGitBookSummary(): string {
    let summary = `# Summary

* [Introduction](README.md)
* [Installation](installation.md)
* [Getting Started](getting-started.md)

## API Reference

`;

    if (this.apiDocs?.classes.length) {
      summary += '* [Classes](api/classes/README.md)\n';
      for (const cls of this.apiDocs.classes) {
        summary += `  * [${cls.name}](api/classes/${cls.name}.md)\n`;
      }
    }

    if (this.apiDocs?.interfaces.length) {
      summary += '* [Interfaces](api/interfaces/README.md)\n';
      for (const iface of this.apiDocs.interfaces) {
        summary += `  * [${iface.name}](api/interfaces/${iface.name}.md)\n`;
      }
    }

    return summary;
  }

  private async generateExamples(): Promise<void> {
    const examplesDir = path.join(this.config.outputDir, 'examples');
    await fs.mkdir(examplesDir, { recursive: true });

    // Generate example files
    const examples = [
      {
        name: 'basic-workflow',
        title: 'Basic Workflow Example',
        content: this.generateBasicExample()
      },
      {
        name: 'api-integration',
        title: 'API Integration Example',
        content: this.generateAPIExample()
      },
      {
        name: 'data-processing',
        title: 'Data Processing Example',
        content: this.generateDataExample()
      }
    ];

    for (const example of examples) {
      await fs.writeFile(
        path.join(examplesDir, `${example.name}.md`),
        example.content
      );
    }

    // Generate examples index
    const index = `# Examples

${examples.map(e => `- [${e.title}](./${e.name}.md)`).join('\n')}
`;

    await fs.writeFile(path.join(examplesDir, 'README.md'), index);
  }

  private generateBasicExample(): string {
    return `# Basic Workflow Example

This example shows how to create a simple workflow.

\`\`\`typescript
import { WorkflowEngine } from '${this.config.projectName.toLowerCase()}';

const engine = new WorkflowEngine();

const workflow = {
  name: 'Hello World',
  nodes: [
    {
      id: 'start',
      type: 'trigger',
      data: {
        triggerType: 'manual'
      }
    },
    {
      id: 'hello',
      type: 'function',
      data: {
        code: 'return { message: "Hello, World!" };'
      }
    }
  ],
  edges: [
    {
      id: 'e1',
      source: 'start',
      target: 'hello'
    }
  ]
};

const result = await engine.execute(workflow);
console.log(result);
\`\`\`
`;
  }

  private generateAPIExample(): string {
    return `# API Integration Example

This example demonstrates how to integrate with external APIs.

\`\`\`typescript
const workflow = {
  name: 'API Integration',
  nodes: [
    {
      id: 'trigger',
      type: 'webhook',
      data: {
        path: '/webhook',
        method: 'POST'
      }
    },
    {
      id: 'fetch-data',
      type: 'http',
      data: {
        method: 'GET',
        url: 'https://api.example.com/users/{{ $json.userId }}',
        headers: {
          'Authorization': 'Bearer {{ $env.API_TOKEN }}'
        }
      }
    },
    {
      id: 'transform',
      type: 'transform',
      data: {
        expression: '{{ { user: $json, timestamp: $now() } }}'
      }
    }
  ],
  edges: [
    { source: 'trigger', target: 'fetch-data' },
    { source: 'fetch-data', target: 'transform' }
  ]
};
\`\`\`
`;
  }

  private generateDataExample(): string {
    return `# Data Processing Example

This example shows how to process data with workflows.

\`\`\`typescript
const workflow = {
  name: 'Data Processing',
  nodes: [
    {
      id: 'schedule',
      type: 'schedule',
      data: {
        cron: '0 0 * * *',
        timezone: 'UTC'
      }
    },
    {
      id: 'query',
      type: 'database',
      data: {
        operation: 'select',
        query: 'SELECT * FROM orders WHERE created_at > :yesterday',
        parameters: {
          yesterday: '{{ $now(-1, "day") }}'
        }
      }
    },
    {
      id: 'aggregate',
      type: 'aggregate',
      data: {
        groupBy: 'category',
        operations: [
          { field: 'amount', operation: 'sum', alias: 'total' }
        ]
      }
    },
    {
      id: 'export',
      type: 'csv',
      data: {
        filename: 'daily-report-{{ $now("YYYY-MM-DD") }}.csv'
      }
    }
  ],
  edges: [
    { source: 'schedule', target: 'query' },
    { source: 'query', target: 'aggregate' },
    { source: 'aggregate', target: 'export' }
  ]
};
\`\`\`
`;
  }

  private async generateTutorials(): Promise<void> {
    const tutorialsDir = path.join(this.config.outputDir, 'tutorials');
    await fs.mkdir(tutorialsDir, { recursive: true });

    const tutorials = [
      {
        name: '01-getting-started',
        title: 'Getting Started',
        content: this.generateGettingStartedTutorial()
      },
      {
        name: '02-building-first-workflow',
        title: 'Building Your First Workflow',
        content: this.generateFirstWorkflowTutorial()
      },
      {
        name: '03-advanced-features',
        title: 'Advanced Features',
        content: this.generateAdvancedTutorial()
      }
    ];

    for (const tutorial of tutorials) {
      await fs.writeFile(
        path.join(tutorialsDir, `${tutorial.name}.md`),
        tutorial.content
      );
    }
  }

  private generateGettingStartedTutorial(): string {
    return `# Getting Started Tutorial

Welcome to the ${this.config.projectName} tutorial series!

## Prerequisites

- Node.js 14 or higher
- Basic JavaScript/TypeScript knowledge

## Installation

\`\`\`bash
npm install ${this.config.projectName.toLowerCase()}
\`\`\`

## Your First Workflow

Let's create a simple workflow...
`;
  }

  private generateFirstWorkflowTutorial(): string {
    return `# Building Your First Workflow

In this tutorial, we'll build a complete workflow from scratch.

## Step 1: Create the Workflow

...
`;
  }

  private generateAdvancedTutorial(): string {
    return `# Advanced Features

This tutorial covers advanced features and best practices.

## Error Handling

...

## Performance Optimization

...
`;
  }

  private async generateChangelog(): Promise<void> {
    const changelog = `# Changelog

All notable changes to this project will be documented in this file.

## [${this.config.version}] - ${new Date().toISOString().split('T')[0]}

### Added
- Initial release
- Core workflow engine
- Node system
- Expression evaluation

### Changed
- N/A

### Fixed
- N/A

### Security
- N/A
`;

    await fs.writeFile(
      path.join(this.config.outputDir, 'CHANGELOG.md'),
      changelog
    );
  }

  private async generateContributing(): Promise<void> {
    const contributing = `# Contributing to ${this.config.projectName}

Thank you for your interest in contributing!

## Getting Started

1. Fork the repository
2. Clone your fork
3. Create a new branch
4. Make your changes
5. Submit a pull request

## Development Setup

\`\`\`bash
git clone https://github.com/your-username/${this.config.projectName.toLowerCase()}.git
cd ${this.config.projectName.toLowerCase()}
npm install
npm run dev
\`\`\`

## Code Style

We use ESLint and Prettier for code formatting.

## Testing

All contributions must include appropriate tests.

\`\`\`bash
npm test
\`\`\`

## Pull Request Process

1. Update documentation
2. Add tests
3. Ensure all tests pass
4. Update CHANGELOG.md
`;

    await fs.writeFile(
      path.join(this.config.outputDir, 'CONTRIBUTING.md'),
      contributing
    );
  }

  private async copyCustomPages(): Promise<void> {
    if (!this.config.customPages) return;

    for (const page of this.config.customPages) {
      if (page.content) {
        await fs.writeFile(
          path.join(this.config.outputDir, page.path),
          page.content
        );
      }
    }
  }

  private async loadTemplate(format: string): Promise<string> {
    // In a real implementation, load from template files
    return this.getDefaultHTMLTemplate();
  }

  private getDefaultHTMLTemplate(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{config.projectName}} Documentation</title>
    <link rel="stylesheet" href="assets/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
</head>
<body>
    <nav class="sidebar">
        {{{navigation}}}
    </nav>
    
    <main class="content">
        <h1>{{config.projectName}}</h1>
        <p>{{config.description}}</p>
        
        <section id="api">
            <h2>API Reference</h2>
            {{#each api.classes}}
            <div class="class">
                <h3>{{name}}</h3>
                <p>{{description}}</p>
            </div>
            {{/each}}
        </section>
        
        <section id="workflows">
            <h2>Workflows</h2>
            {{#each workflows.workflows}}
            <div class="workflow">
                <h3>{{name}}</h3>
                <p>{{description}}</p>
            </div>
            {{/each}}
        </section>
    </main>
    
    <footer>
        <p>Generated on {{timestamp}}</p>
    </footer>
    
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <script>hljs.highlightAll();</script>
</body>
</html>`;
  }

  private async renderTemplate(template: string, data: unknown): Promise<string> {
    // Use Handlebars to render template
    const handlebars = require('handlebars');
    const compiled = handlebars.compile(template);
    return compiled(data);
  }

  private generateNavigation(): string {
    let nav = '<ul class="nav">';
    
    nav += '<li><a href="index.html">Home</a></li>';
    
    if (this.apiDocs) {
      nav += '<li>API Reference<ul>';
      if (this.apiDocs.classes.length > 0) {
        nav += '<li>Classes<ul>';
        for (const cls of this.apiDocs.classes) {
          nav += `<li><a href="classes/${cls.name}.html">${cls.name}</a></li>`;
        }
        nav += '</ul></li>';
      }
      nav += '</ul></li>';
    }
    
    if (this.workflowDocs) {
      nav += '<li>Workflows<ul>';
      for (const workflow of this.workflowDocs.workflows) {
        nav += `<li><a href="workflows/${workflow.id}.html">${workflow.name}</a></li>`;
      }
      nav += '</ul></li>';
    }
    
    nav += '</ul>';
    return nav;
  }

  private async renderClassPage(cls: ClassDoc): Promise<string> {
    const template = await this.loadTemplate('html-class');
    return this.renderTemplate(template, { class: cls });
  }

  private async renderInterfacePage(iface: InterfaceDoc): Promise<string> {
    const template = await this.loadTemplate('html-interface');
    return this.renderTemplate(template, { interface: iface });
  }

  private async renderWorkflowPage(workflow: WorkflowDoc): Promise<string> {
    const template = await this.loadTemplate('html-workflow');
    return this.renderTemplate(template, { workflow });
  }

  private async copyAssets(format: string): Promise<void> {
    const assetsDir = path.join(this.config.outputDir, 'assets');
    await fs.mkdir(assetsDir, { recursive: true });

    // Create basic CSS
    const css = `
body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    margin: 0;
    padding: 0;
    display: flex;
}

.sidebar {
    width: 250px;
    background: #f5f5f5;
    padding: 20px;
    height: 100vh;
    overflow-y: auto;
}

.content {
    flex: 1;
    padding: 20px;
    max-width: 900px;
    margin: 0 auto;
}

.nav ul {
    list-style: none;
    padding-left: 20px;
}

.nav > ul {
    padding-left: 0;
}

pre {
    background: #f4f4f4;
    padding: 15px;
    border-radius: 5px;
    overflow-x: auto;
}

code {
    background: #f4f4f4;
    padding: 2px 5px;
    border-radius: 3px;
}
`;

    await fs.writeFile(path.join(assetsDir, 'style.css'), css);
  }
}

export default DocumentationGenerator;