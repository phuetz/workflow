/**
 * Automatic Code Generator & Pattern Builder
 * Advanced system for generating code patterns, components, and automated refactoring
 */

import * as fs from 'fs';
import * as path from 'path';
import * as prettier from 'prettier';

// Types for code generation
interface GeneratorOptions {
  name: string;
  type: PatternType;
  path: string;
  config?: Record<string, any>;
  template?: string;
  features?: string[];
  dependencies?: string[];
}

type PatternType = 
  | 'component'
  | 'service'
  | 'hook'
  | 'store'
  | 'api'
  | 'test'
  | 'module'
  | 'facade'
  | 'factory'
  | 'singleton'
  | 'strategy'
  | 'observer'
  | 'decorator'
  | 'adapter'
  | 'repository'
  | 'controller'
  | 'middleware'
  | 'migration';

interface CodeTemplate {
  name: string;
  type: PatternType;
  description: string;
  template: string;
  variables: TemplateVariable[];
  dependencies?: string[];
  imports?: string[];
  exports?: string[];
}

interface TemplateVariable {
  name: string;
  type: 'string' | 'boolean' | 'array' | 'object';
  default?: any;
  required?: boolean;
  description?: string;
}

interface GeneratedFile {
  path: string;
  content: string;
  type: string;
  created: boolean;
  error?: string;
}

interface RefactoringRule {
  name: string;
  description: string;
  pattern: RegExp | string;
  replacement: string | ((match: string, ...args: any[]) => string);
  filePattern?: RegExp;
  conditions?: RefactoringCondition[];
}

interface RefactoringCondition {
  type: 'contains' | 'not-contains' | 'file-exists' | 'import-exists';
  value: string;
}

interface MigrationPlan {
  name: string;
  description: string;
  steps: MigrationStep[];
  rollback?: RollbackStep[];
  validation?: ValidationStep[];
}

interface MigrationStep {
  type: 'transform' | 'create' | 'delete' | 'move' | 'update';
  target: string;
  action: (file: string) => string | void;
  description: string;
}

interface RollbackStep {
  type: 'restore' | 'delete' | 'move';
  target: string;
  backup?: string;
}

interface ValidationStep {
  type: 'test' | 'lint' | 'build' | 'custom';
  command?: string;
  validator?: () => boolean;
  description: string;
}

// Template Library
class TemplateLibrary {
  private templates: Map<string, CodeTemplate> = new Map();
  
  constructor() {
    this.registerDefaultTemplates();
  }
  
  private registerDefaultTemplates(): void {
    // React Component Template
    this.templates.set('react-component', {
      name: 'React Component',
      type: 'component',
      description: 'Modern React functional component with TypeScript',
      template: `import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { {{imports}} } from '{{importSource}}';
{{#if hasStyles}}
import styles from './{{name}}.module.css';
{{/if}}

{{#if hasTypes}}
interface {{name}}Props {
  {{#each props}}
  {{this.name}}{{#if this.optional}}?{{/if}}: {{this.type}};
  {{/each}}
}
{{/if}}

/**
 * {{description}}
 */
export const {{name}}: React.FC<{{name}}Props> = ({
  {{#each props}}
  {{this.name}},
  {{/each}}
}) => {
  {{#if hasState}}
  // State
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  {{/if}}
  
  {{#if hasEffects}}
  // Effects
  useEffect(() => {
    // Component mount logic
    {{#if hasAsync}}
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch data logic
        const response = await fetch('/api/data');
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    {{/if}}
    
    return () => {
      // Cleanup logic
    };
  }, []);
  {{/if}}
  
  {{#if hasMemo}}
  // Memoized values
  const memoizedValue = useMemo(() => {
    // Expensive computation
    return data?.process();
  }, [data]);
  {{/if}}
  
  {{#if hasCallbacks}}
  // Callbacks
  const handleClick = useCallback((event: React.MouseEvent) => {
    // Handle click logic
  }, []);
  {{/if}}
  
  {{#if hasConditionalRender}}
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  if (error) {
    return <div className="error">Error: {error}</div>;
  }
  {{/if}}
  
  return (
    <div className="{{kebabCase name}}"{{#if hasStyles}} className={styles.container}{{/if}}>
      {{#if hasHeader}}
      <header className="{{kebabCase name}}__header">
        <h1>{{name}}</h1>
      </header>
      {{/if}}
      
      <main className="{{kebabCase name}}__content">
        {/* Component content */}
        {{#each children}}
        <{{this.component}} {{#each this.props}}{{this.name}}={{this.value}}{{/each}} />
        {{/each}}
      </main>
      
      {{#if hasFooter}}
      <footer className="{{kebabCase name}}__footer">
        {/* Footer content */}
      </footer>
      {{/if}}
    </div>
  );
};

{{name}}.displayName = '{{name}}';

{{#if hasDefaultProps}}
{{name}}.defaultProps = {
  {{#each defaultProps}}
  {{this.name}}: {{this.value}},
  {{/each}}
};
{{/if}}`,
      variables: [
        { name: 'name', type: 'string', required: true },
        { name: 'description', type: 'string', default: 'Component description' },
        { name: 'props', type: 'array', default: [] },
        { name: 'hasState', type: 'boolean', default: true },
        { name: 'hasEffects', type: 'boolean', default: true },
        { name: 'hasMemo', type: 'boolean', default: false },
        { name: 'hasCallbacks', type: 'boolean', default: false },
        { name: 'hasStyles', type: 'boolean', default: true },
        { name: 'hasTypes', type: 'boolean', default: true },
      ],
      dependencies: ['react', 'react-dom'],
      imports: ['React', 'useState', 'useEffect'],
    });
    
    // Service Template
    this.templates.set('service-class', {
      name: 'Service Class',
      type: 'service',
      description: 'Singleton service class with dependency injection',
      template: `import { EventEmitter } from 'events';
{{#each imports}}
import { {{this.name}} } from '{{this.source}}';
{{/each}}

/**
 * {{description}}
 */
export class {{name}}Service extends EventEmitter {
  private static instance: {{name}}Service;
  {{#each properties}}
  private {{this.name}}: {{this.type}}{{#if this.default}} = {{this.default}}{{/if}};
  {{/each}}
  
  private constructor({{#each dependencies}}{{this.name}}: {{this.type}}{{#unless @last}}, {{/unless}}{{/each}}) {
    super();
    {{#each dependencies}}
    this.{{this.name}} = {{this.name}};
    {{/each}}
    this.initialize();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance({{#each dependencies}}{{this.name}}?: {{this.type}}{{#unless @last}}, {{/unless}}{{/each}}): {{name}}Service {
    if (!{{name}}Service.instance) {
      {{name}}Service.instance = new {{name}}Service({{#each dependencies}}{{this.name}}{{#unless @last}}, {{/unless}}{{/each}});
    }
    return {{name}}Service.instance;
  }
  
  /**
   * Initialize service
   */
  private initialize(): void {
    // Initialization logic
    this.emit('initialized');
  }
  
  {{#each methods}}
  /**
   * {{this.description}}
   */
  {{this.access}} {{#if this.async}}async {{/if}}{{this.name}}({{#each this.params}}{{this.name}}: {{this.type}}{{#unless @last}}, {{/unless}}{{/each}}): {{#if this.async}}Promise<{{this.returnType}}>{{else}}{{this.returnType}}{{/if}} {
    {{#if this.validation}}
    // Validate input
    if (!{{this.validation}}) {
      throw new Error('Invalid input');
    }
    {{/if}}
    
    {{#if this.async}}
    try {
      // Async logic
      const result = await this.performOperation();
      this.emit('{{this.name}}:success', result);
      return result;
    } catch (error) {
      this.emit('{{this.name}}:error', error);
      throw error;
    }
    {{else}}
    // Sync logic
    const result = this.performOperation();
    this.emit('{{this.name}}:complete', result);
    return result;
    {{/if}}
  }
  {{/each}}
  
  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.removeAllListeners();
    {{#each properties}}
    {{#if this.cleanup}}
    this.{{this.name}}?.cleanup();
    {{/if}}
    {{/each}}
  }
}

// Export singleton instance
export const {{camelCase name}}Service = {{name}}Service.getInstance();`,
      variables: [
        { name: 'name', type: 'string', required: true },
        { name: 'description', type: 'string', default: 'Service description' },
        { name: 'properties', type: 'array', default: [] },
        { name: 'methods', type: 'array', default: [] },
        { name: 'dependencies', type: 'array', default: [] },
      ],
    });
    
    // Store Slice Template (Zustand)
    this.templates.set('zustand-store', {
      name: 'Zustand Store Slice',
      type: 'store',
      description: 'Zustand store slice with TypeScript',
      template: `import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Types
interface {{name}}State {
  {{#each state}}
  {{this.name}}: {{this.type}};
  {{/each}}
}

interface {{name}}Actions {
  {{#each actions}}
  {{this.name}}: ({{#each this.params}}{{this.name}}: {{this.type}}{{#unless @last}}, {{/unless}}{{/each}}) => {{this.returnType}};
  {{/each}}
  reset: () => void;
}

type {{name}}Store = {{name}}State & {{name}}Actions;

// Initial state
const initial{{name}}State: {{name}}State = {
  {{#each state}}
  {{this.name}}: {{this.initial}},
  {{/each}}
};

// Store implementation
export const use{{name}}Store = create<{{name}}Store>()(
  devtools(
    persist(
      immer((set, get) => ({
        // State
        ...initial{{name}}State,
        
        // Actions
        {{#each actions}}
        {{this.name}}: ({{#each this.params}}{{this.name}}{{#unless @last}}, {{/unless}}{{/each}}) => {
          {{#if this.async}}
          return new Promise(async (resolve, reject) => {
            try {
              // Async logic
              const result = await performAsyncOperation();
              set((state) => {
                // Update state
                {{#each this.updates}}
                state.{{this.field}} = {{this.value}};
                {{/each}}
              });
              resolve(result);
            } catch (error) {
              reject(error);
            }
          });
          {{else}}
          set((state) => {
            // Update state logic
            {{#each this.updates}}
            state.{{this.field}} = {{this.value}};
            {{/each}}
          });
          {{#if this.returnType}}
          return {{this.returnValue}};
          {{/if}}
          {{/if}}
        },
        {{/each}}
        
        // Reset action
        reset: () => set(initial{{name}}State),
      })),
      {
        name: '{{kebabCase name}}-storage',
        {{#if persistConfig}}
        partialize: (state) => ({
          {{#each persistFields}}
          {{this}}: state.{{this}},
          {{/each}}
        }),
        {{/if}}
      }
    ),
    {
      name: '{{name}}Store',
    }
  )
);

// Selectors
{{#each selectors}}
export const select{{this.name}} = (state: {{name}}Store) => {{this.selector}};
{{/each}}

// Hooks
{{#each hooks}}
export const use{{this.name}} = () => {
  const {{this.values}} = use{{name}}Store((state) => ({
    {{#each this.selections}}
    {{this}}: state.{{this}},
    {{/each}}
  }));
  
  return {{this.values}};
};
{{/each}}`,
      variables: [
        { name: 'name', type: 'string', required: true },
        { name: 'state', type: 'array', default: [] },
        { name: 'actions', type: 'array', default: [] },
        { name: 'selectors', type: 'array', default: [] },
        { name: 'hooks', type: 'array', default: [] },
        { name: 'persistConfig', type: 'object', default: null },
      ],
      dependencies: ['zustand'],
    });
    
    // API Client Template
    this.templates.set('api-client', {
      name: 'API Client',
      type: 'api',
      description: 'TypeScript API client with interceptors and error handling',
      template: `import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// Types
{{#each types}}
export interface {{this.name}} {
  {{#each this.fields}}
  {{this.name}}{{#if this.optional}}?{{/if}}: {{this.type}};
  {{/each}}
}
{{/each}}

interface ApiConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  withCredentials?: boolean;
}

interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

/**
 * {{description}}
 */
export class {{name}}ApiClient {
  private client: AxiosInstance;
  private static instance: {{name}}ApiClient;
  
  private constructor(config: ApiConfig) {
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      withCredentials: config.withCredentials || false,
    });
    
    this.setupInterceptors();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(config?: ApiConfig): {{name}}ApiClient {
    if (!{{name}}ApiClient.instance && config) {
      {{name}}ApiClient.instance = new {{name}}ApiClient(config);
    }
    return {{name}}ApiClient.instance;
  }
  
  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = \`Bearer \${token}\`;
        }
        
        // Log request in development
        if (process.env.NODE_ENV === 'development') {
          logger.debug('API Request:', config);
        }
        
        return config;
      },
      (error) => {
        return Promise.reject(this.handleError(error));
      }
    );
    
    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        // Log response in development
        if (process.env.NODE_ENV === 'development') {
          logger.debug('API Response:', response);
        }
        
        return response;
      },
      (error) => {
        return Promise.reject(this.handleError(error));
      }
    );
  }
  
  /**
   * Get auth token from storage
   */
  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }
  
  /**
   * Handle API errors
   */
  private handleError(error: AxiosError): ApiError {
    const apiError: ApiError = {
      message: 'An unexpected error occurred',
      status: error.response?.status,
    };
    
    if (error.response) {
      // Server responded with error
      apiError.message = error.response.data?.message || error.message;
      apiError.code = error.response.data?.code;
      apiError.details = error.response.data?.details;
      
      // Handle specific status codes
      switch (error.response.status) {
        case 401:
          // Unauthorized - redirect to login
          this.handleUnauthorized();
          break;
        case 403:
          apiError.message = 'You do not have permission to perform this action';
          break;
        case 404:
          apiError.message = 'The requested resource was not found';
          break;
        case 429:
          apiError.message = 'Too many requests. Please try again later';
          break;
        case 500:
          apiError.message = 'Internal server error. Please try again later';
          break;
      }
    } else if (error.request) {
      // Request was made but no response
      apiError.message = 'No response from server. Please check your connection';
    } else {
      // Error in request configuration
      apiError.message = error.message;
    }
    
    return apiError;
  }
  
  /**
   * Handle unauthorized responses
   */
  private handleUnauthorized(): void {
    // Clear auth token
    localStorage.removeItem('auth_token');
    // Redirect to login
    window.location.href = '/login';
  }
  
  {{#each endpoints}}
  /**
   * {{this.description}}
   */
  public async {{this.name}}({{#each this.params}}{{this.name}}: {{this.type}}{{#unless @last}}, {{/unless}}{{/each}}): Promise<{{this.returnType}}> {
    {{#if this.validation}}
    // Validate input
    if (!{{this.validation}}) {
      throw new Error('Invalid input parameters');
    }
    {{/if}}
    
    try {
      const response = await this.client.{{this.method}}<{{this.returnType}}>(
        \`{{this.path}}\`,
        {{#if this.hasBody}}data,{{/if}}
        {{#if this.hasConfig}}config{{/if}}
      );
      
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }
  {{/each}}
  
  /**
   * Generic request method
   */
  public async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.client.request<T>(config);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }
}

// Export singleton instance
export const {{camelCase name}}Api = {{name}}ApiClient.getInstance({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
});`,
      variables: [
        { name: 'name', type: 'string', required: true },
        { name: 'description', type: 'string', default: 'API Client' },
        { name: 'endpoints', type: 'array', default: [] },
        { name: 'types', type: 'array', default: [] },
      ],
      dependencies: ['axios'],
    });
    
    // Test Template
    this.templates.set('test-suite', {
      name: 'Test Suite',
      type: 'test',
      description: 'Comprehensive test suite with Vitest',
      template: `import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
{{#each imports}}
import { {{this.name}} } from '{{this.source}}';
{{/each}}

describe('{{name}}', () => {
  {{#if hasSetup}}
  let {{#each setupVariables}}{{this.name}}: {{this.type}}{{#unless @last}}, {{/unless}}{{/each}};
  
  beforeEach(() => {
    // Setup before each test
    {{#each setupSteps}}
    {{this}};
    {{/each}}
  });
  
  afterEach(() => {
    // Cleanup after each test
    {{#each cleanupSteps}}
    {{this}};
    {{/each}}
    vi.clearAllMocks();
  });
  {{/if}}
  
  {{#each testSuites}}
  describe('{{this.name}}', () => {
    {{#each this.tests}}
    it('{{this.description}}', {{#if this.async}}async {{/if}}() => {
      // Arrange
      {{#each this.arrange}}
      {{this}};
      {{/each}}
      
      // Act
      {{#each this.act}}
      {{#if this.async}}await {{/if}}{{this}};
      {{/each}}
      
      // Assert
      {{#each this.assertions}}
      {{this}};
      {{/each}}
    });
    {{/each}}
  });
  {{/each}}
  
  {{#if hasIntegrationTests}}
  describe('Integration Tests', () => {
    it('should work end-to-end', async () => {
      // Complex integration test
      const user = userEvent.setup();
      
      // Render component
      const { container } = render(<App />);
      
      // Simulate user interactions
      await user.click(screen.getByRole('button', { name: /submit/i }));
      
      // Wait for async operations
      await waitFor(() => {
        expect(screen.getByText(/success/i)).toBeInTheDocument();
      });
      
      // Verify final state
      expect(container).toMatchSnapshot();
    });
  });
  {{/if}}
  
  {{#if hasPerformanceTests}}
  describe('Performance Tests', () => {
    it('should render quickly', () => {
      const startTime = performance.now();
      
      render(<{{componentName}} />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(100); // Should render in less than 100ms
    });
    
    it('should handle large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        value: \`Item \${i}\`,
      }));
      
      const { container } = render(<{{componentName}} data={largeDataset} />);
      
      // Should use virtualization
      const renderedItems = container.querySelectorAll('[data-testid="list-item"]');
      expect(renderedItems.length).toBeLessThan(100); // Only visible items rendered
    });
  });
  {{/if}}
});`,
      variables: [
        { name: 'name', type: 'string', required: true },
        { name: 'testSuites', type: 'array', default: [] },
        { name: 'hasSetup', type: 'boolean', default: true },
        { name: 'hasIntegrationTests', type: 'boolean', default: false },
        { name: 'hasPerformanceTests', type: 'boolean', default: false },
      ],
      dependencies: ['vitest', '@testing-library/react', '@testing-library/user-event'],
    });
  }
  
  public getTemplate(name: string): CodeTemplate | undefined {
    return this.templates.get(name);
  }
  
  public getAllTemplates(): CodeTemplate[] {
    return Array.from(this.templates.values());
  }
}

// Code Generator Engine
export class AutomaticCodeGenerator {
  private static instance: AutomaticCodeGenerator;
  private templateLibrary: TemplateLibrary;
  private generatedFiles: GeneratedFile[] = [];
  
  private constructor() {
    this.templateLibrary = new TemplateLibrary();
  }
  
  public static getInstance(): AutomaticCodeGenerator {
    if (!AutomaticCodeGenerator.instance) {
      AutomaticCodeGenerator.instance = new AutomaticCodeGenerator();
    }
    return AutomaticCodeGenerator.instance;
  }
  
  /**
   * Generate code from template
   */
  public async generateFromTemplate(options: GeneratorOptions): Promise<GeneratedFile[]> {
    const template = this.templateLibrary.getTemplate(options.template || options.type);
    
    if (!template) {
      throw new Error(`Template not found: ${options.template || options.type}`);
    }
    
    const files: GeneratedFile[] = [];
    
    // Generate main file
    const mainFile = await this.generateFile(
      template.template,
      options,
      template.variables
    );
    files.push(mainFile);
    
    // Generate additional files (tests, styles, etc.)
    if (options.features?.includes('test')) {
      const testFile = await this.generateTestFile(options);
      files.push(testFile);
    }
    
    if (options.features?.includes('styles')) {
      const styleFile = await this.generateStyleFile(options);
      files.push(styleFile);
    }
    
    if (options.features?.includes('storybook')) {
      const storyFile = await this.generateStoryFile(options);
      files.push(storyFile);
    }
    
    this.generatedFiles.push(...files);
    return files;
  }
  
  /**
   * Generate a single file
   */
  private async generateFile(
    template: string,
    options: GeneratorOptions,
    variables: TemplateVariable[]
  ): Promise<GeneratedFile> {
    try {
      // Process template with Handlebars-like syntax
      let content = template;
      
      // Replace variables
      for (const variable of variables) {
        const value = options.config?.[variable.name] || variable.default;
        const regex = new RegExp(`{{\\s*${variable.name}\\s*}}`, 'g');
        content = content.replace(regex, value);
      }
      
      // Process conditionals
      content = this.processConditionals(content, options.config || {});
      
      // Process loops
      content = this.processLoops(content, options.config || {});
      
      // Format with Prettier
      content = await this.formatCode(content, options.type);
      
      // Determine file path
      const filePath = this.generateFilePath(options);
      
      // Write file
      await this.writeFile(filePath, content);
      
      return {
        path: filePath,
        content,
        type: options.type,
        created: true,
      };
    } catch (error) {
      return {
        path: '',
        content: '',
        type: options.type,
        created: false,
        error: error.message,
      };
    }
  }
  
  /**
   * Generate test file
   */
  private async generateTestFile(options: GeneratorOptions): Promise<GeneratedFile> {
    const testTemplate = `import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ${options.name} } from './${options.name}';

describe('${options.name}', () => {
  it('should render', () => {
    render(<${options.name} />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});`;

    const content = await this.formatCode(testTemplate, 'test');
    const filePath = path.join(
      path.dirname(this.generateFilePath(options)),
      `${options.name}.test.tsx`
    );
    
    await this.writeFile(filePath, content);
    
    return {
      path: filePath,
      content,
      type: 'test',
      created: true,
    };
  }
  
  /**
   * Generate style file
   */
  private async generateStyleFile(options: GeneratorOptions): Promise<GeneratedFile> {
    const styleTemplate = `.${this.kebabCase(options.name)} {
  display: flex;
  flex-direction: column;
  padding: 1rem;

  &__header {
    margin-bottom: 1rem;
  }

  &__content {
    flex: 1;
  }

  &__footer {
    margin-top: 1rem;
  }
}`;

    const filePath = path.join(
      path.dirname(this.generateFilePath(options)),
      `${options.name}.module.css`
    );
    
    await this.writeFile(filePath, styleTemplate);
    
    return {
      path: filePath,
      content: styleTemplate,
      type: 'styles',
      created: true,
    };
  }
  
  /**
   * Generate Storybook story file
   */
  private async generateStoryFile(options: GeneratorOptions): Promise<GeneratedFile> {
    const storyTemplate = `import type { Meta, StoryObj } from '@storybook/react';
import { ${options.name} } from './${options.name}';

const meta: Meta<typeof ${options.name}> = {
  title: 'Components/${options.name}',
  component: ${options.name},
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const WithProps: Story = {
  args: {
    // Add props here
  },
};`;

    const content = await this.formatCode(storyTemplate, 'story');
    const filePath = path.join(
      path.dirname(this.generateFilePath(options)),
      `${options.name}.stories.tsx`
    );
    
    await this.writeFile(filePath, content);
    
    return {
      path: filePath,
      content,
      type: 'story',
      created: true,
    };
  }
  
  /**
   * Process conditional statements in template
   */
  private processConditionals(template: string, config: Record<string, any>): string {
    const conditionalRegex = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g;
    
    return template.replace(conditionalRegex, (match, condition, content) => {
      if (config[condition]) {
        return content;
      }
      return '';
    });
  }
  
  /**
   * Process loops in template
   */
  private processLoops(template: string, config: Record<string, any>): string {
    const loopRegex = /{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g;
    
    return template.replace(loopRegex, (match, arrayName, content) => {
      const array = config[arrayName];
      if (!Array.isArray(array)) return '';
      
      return array.map((item, index) => {
        let processedContent = content;
        
        // Replace item properties
        if (typeof item === 'object') {
          Object.keys(item).forEach(key => {
            const regex = new RegExp(`{{this\\.${key}}}`, 'g');
            processedContent = processedContent.replace(regex, item[key]);
          });
        } else {
          processedContent = processedContent.replace(/{{this}}/g, item);
        }
        
        // Replace index
        processedContent = processedContent.replace(/{{@index}}/g, index.toString());
        
        // Replace last
        processedContent = processedContent.replace(/{{@last}}/g, (index === array.length - 1).toString());
        
        return processedContent;
      }).join('');
    });
  }
  
  /**
   * Format code with Prettier
   */
  private async formatCode(code: string, type: string): Promise<string> {
    try {
      const parser = type.includes('test') || type.includes('component') ? 'typescript' : 'typescript';

      return prettier.format(code, {
        parser,
        semi: true,
        singleQuote: true,
        tabWidth: 2,
        trailingComma: 'es5',
        printWidth: 100,
      });
    } catch (error) {
      console.warn('Failed to format code:', error);
      return code;
    }
  }
  
  /**
   * Generate file path based on options
   */
  private generateFilePath(options: GeneratorOptions): string {
    const basePath = options.path || 'src';
    const typeFolder = this.getTypeFolderName(options.type);
    const fileName = `${options.name}.${this.getFileExtension(options.type)}`;

    return path.join(basePath, typeFolder, fileName);
  }
  
  /**
   * Get folder name for type
   */
  private getTypeFolderName(type: PatternType): string {
    const folderMap: Record<PatternType, string> = {
      component: 'components',
      service: 'services',
      hook: 'hooks',
      store: 'store',
      api: 'api',
      test: '__tests__',
      module: 'modules',
      facade: 'facades',
      factory: 'factories',
      singleton: 'services',
      strategy: 'strategies',
      observer: 'observers',
      decorator: 'decorators',
      adapter: 'adapters',
      repository: 'repositories',
      controller: 'controllers',
      middleware: 'middleware',
      migration: 'migrations',
    };
    
    return folderMap[type] || 'src';
  }
  
  /**
   * Get file extension for type
   */
  private getFileExtension(type: PatternType): string {
    const extensionMap: Record<PatternType, string> = {
      component: 'tsx',
      service: 'ts',
      hook: 'ts',
      store: 'ts',
      api: 'ts',
      test: 'test.ts',
      module: 'ts',
      facade: 'ts',
      factory: 'ts',
      singleton: 'ts',
      strategy: 'ts',
      observer: 'ts',
      decorator: 'ts',
      adapter: 'ts',
      repository: 'ts',
      controller: 'ts',
      middleware: 'ts',
      migration: 'ts',
    };
    
    return extensionMap[type] || 'ts';
  }
  
  /**
   * Write file to disk
   */
  private async writeFile(filePath: string, content: string): Promise<void> {
    const dir = path.dirname(filePath);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write file
    fs.writeFileSync(filePath, content, 'utf-8');
  }
  
  /**
   * Convert to kebab case
   */
  private kebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }
  
  /**
   * Convert to camel case
   */
  private camelCase(str: string): string {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
      })
      .replace(/\s+/g, '');
  }
  
  /**
   * Get all generated files
   */
  public getGeneratedFiles(): GeneratedFile[] {
    return this.generatedFiles;
  }
  
  /**
   * Clear generated files history
   */
  public clearHistory(): void {
    this.generatedFiles = [];
  }
}

// Export singleton instance
export const codeGenerator = AutomaticCodeGenerator.getInstance();