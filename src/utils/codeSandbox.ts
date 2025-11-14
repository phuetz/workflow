/**
 * Code Sandbox
 * Secure JavaScript execution environment for Code nodes (n8n-like)
 */

export interface CodeExecutionContext {
  $json: any; // Current item data
  $input: any[]; // All input items
  $node: Record<string, any>; // Previous node outputs
  $workflow: {
    id: string;
    name: string;
    active: boolean;
  };
  $execution: {
    id: string;
    mode: 'manual' | 'trigger' | 'webhook';
    resumeUrl?: string;
  };
  $env: Record<string, string>; // Environment variables
  $items: any[]; // Alias for $input
  $itemIndex: number; // Current item index
  $runIndex: number; // Current run index
  $now: Date; // Current timestamp
  $today: Date; // Today at midnight
  $binary: Record<string, any>; // Binary data
}

export interface CodeExecutionOptions {
  mode: 'runOnceForAllItems' | 'runOnceForEachItem';
  timeout?: number; // Execution timeout in ms
  allowedGlobals?: string[]; // Additional globals to allow
  libraries?: Record<string, any>; // External libraries
}

export interface CodeExecutionResult {
  success: boolean;
  output: any[];
  error?: {
    message: string;
    stack?: string;
    line?: number;
    column?: number;
  };
  executionTime: number;
  consoleOutput: string[];
}

class CodeSandbox {
  private timeout: number = 5000; // 5 second default timeout

  /**
   * Execute JavaScript code in a sandboxed environment
   */
  async execute(
    code: string,
    context: CodeExecutionContext,
    options: CodeExecutionOptions = { mode: 'runOnceForAllItems' }
  ): Promise<CodeExecutionResult> {
    const startTime = Date.now();
    const consoleOutput: string[] = [];

    try {
      // Create sandbox context
      const sandboxContext = this.createSandboxContext(context, consoleOutput, options);

      // Validate code
      this.validateCode(code);

      // Execute based on mode
      let output: any[];

      if (options.mode === 'runOnceForAllItems') {
        output = await this.executeOnceForAll(code, sandboxContext, options);
      } else {
        output = await this.executeForEachItem(code, sandboxContext, options);
      }

      return {
        success: true,
        output: Array.isArray(output) ? output : [output],
        executionTime: Date.now() - startTime,
        consoleOutput
      };
    } catch (error) {
      return {
        success: false,
        output: [],
        error: this.formatError(error),
        executionTime: Date.now() - startTime,
        consoleOutput
      };
    }
  }

  /**
   * Execute code once for all items
   */
  private async executeOnceForAll(
    code: string,
    context: any,
    options: CodeExecutionOptions
  ): Promise<any[]> {
    const wrappedCode = this.wrapCode(code, 'all');
    const executor = this.createExecutor(wrappedCode, context, options);
    const result = await this.executeWithTimeout(executor, options.timeout);

    // Ensure result is array
    if (!Array.isArray(result)) {
      return [{ json: result }];
    }

    // Ensure items have json property
    return result.map(item =>
      typeof item === 'object' && item !== null && !('json' in item)
        ? { json: item }
        : item
    );
  }

  /**
   * Execute code once for each item
   */
  private async executeForEachItem(
    code: string,
    context: any,
    options: CodeExecutionOptions
  ): Promise<any[]> {
    const results: any[] = [];
    const items = context.$input || [];

    for (let i = 0; i < items.length; i++) {
      const itemContext = {
        ...context,
        $json: items[i]?.json || items[i],
        $itemIndex: i,
        $binary: items[i]?.binary || {}
      };

      const wrappedCode = this.wrapCode(code, 'item');
      const executor = this.createExecutor(wrappedCode, itemContext, options);
      const result = await this.executeWithTimeout(executor, options.timeout);

      // Handle different return types
      if (result === null || result === undefined) {
        continue; // Skip null/undefined items
      } else if (typeof result === 'object' && 'json' in result) {
        results.push(result);
      } else {
        results.push({ json: result });
      }
    }

    return results;
  }

  /**
   * Wrap user code with proper return handling
   */
  private wrapCode(code: string, mode: 'all' | 'item'): string {
    // Check if code has explicit return
    const hasReturn = /\breturn\b/.test(code);

    if (hasReturn) {
      return code;
    }

    // Auto-return last expression
    const lines = code.trim().split('\n');
    const lastLine = lines[lines.length - 1].trim();

    if (lastLine && !lastLine.startsWith('//') && !lastLine.endsWith(';')) {
      lines[lines.length - 1] = `return ${lastLine}`;
      return lines.join('\n');
    }

    return code;
  }

  /**
   * Create executor function
   */
  private createExecutor(
    code: string,
    context: any,
    options: CodeExecutionOptions
  ): () => Promise<any> {
    // Create allowed globals
    const allowedGlobals = [
      'Object', 'Array', 'String', 'Number', 'Boolean', 'Date', 'Math',
      'JSON', 'Promise', 'Map', 'Set', 'RegExp', 'Error',
      ...(options.allowedGlobals || [])
    ];

    // Create safe console
    const safeConsole = {
      log: (...args: any[]) => context.__console.push(['log', ...args]),
      error: (...args: any[]) => context.__console.push(['error', ...args]),
      warn: (...args: any[]) => context.__console.push(['warn', ...args]),
      info: (...args: any[]) => context.__console.push(['info', ...args])
    };

    // Create function with restricted scope
    const func = new Function(
      ...Object.keys(context).filter(k => k !== '__console'),
      'console',
      ...Object.keys(options.libraries || {}),
      `"use strict";\n${code}`
    );

    return async () => {
      return func(
        ...Object.values(context).filter((_, i) => Object.keys(context)[i] !== '__console'),
        safeConsole,
        ...Object.values(options.libraries || {})
      );
    };
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout(
    executor: () => Promise<any>,
    timeout?: number
  ): Promise<any> {
    const timeoutMs = timeout || this.timeout;

    return Promise.race([
      executor(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Code execution timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  /**
   * Create sandbox context
   */
  private createSandboxContext(
    context: CodeExecutionContext,
    consoleOutput: string[],
    options: CodeExecutionOptions
  ): any {
    return {
      $json: context.$json,
      $input: context.$input,
      $items: context.$items || context.$input,
      $node: context.$node,
      $workflow: context.$workflow,
      $execution: context.$execution,
      $env: context.$env,
      $itemIndex: context.$itemIndex,
      $runIndex: context.$runIndex,
      $now: context.$now,
      $today: context.$today,
      $binary: context.$binary,
      __console: consoleOutput,

      // Utility functions
      $getWorkflowStaticData: (type: 'global' | 'node') => {
        return {}; // Placeholder for static data
      },

      $evaluateExpression: (expression: string, itemIndex?: number) => {
        // Evaluate expression (basic implementation)
        try {
          return eval(expression);
        } catch {
          return null;
        }
      }
    };
  }

  /**
   * Validate code for security
   */
  private validateCode(code: string): void {
    // Check for dangerous patterns
    const dangerousPatterns = [
      /\beval\s*\(/,
      /\bFunction\s*\(/,
      /\bprocess\b/,
      /\brequire\s*\(/,
      /\bimport\s+/,
      /\b__dirname\b/,
      /\b__filename\b/,
      /\bglobal\b/,
      /\bwindow\b/,
      /\bdocument\b/,
      /\blocalStorage\b/,
      /\bsessionStorage\b/,
      /\bfetch\s*\(/,
      /\bXMLHttpRequest\b/
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        throw new Error(
          `Security violation: Code contains disallowed pattern: ${pattern.source}`
        );
      }
    }

    // Check code length
    if (code.length > 100000) {
      throw new Error('Code is too long (max 100KB)');
    }
  }

  /**
   * Format error with details
   */
  private formatError(error: any): CodeExecutionResult['error'] {
    if (error instanceof Error) {
      // Try to extract line/column from stack
      const stackMatch = error.stack?.match(/:(\d+):(\d+)/);

      return {
        message: error.message,
        stack: error.stack,
        line: stackMatch ? parseInt(stackMatch[1]) : undefined,
        column: stackMatch ? parseInt(stackMatch[2]) : undefined
      };
    }

    return {
      message: String(error)
    };
  }

  /**
   * Get available libraries
   */
  getAvailableLibraries(): string[] {
    return [
      'luxon', // Date/time manipulation
      'lodash', // Utility functions
      'axios', // HTTP client (sandboxed)
      'crypto-js', // Cryptography
      'moment', // Date manipulation (legacy)
      'validator', // String validation
      'uuid', // UUID generation
      'cheerio', // HTML parsing
      'xml2js', // XML parsing
      'csv-parse' // CSV parsing
    ];
  }
}

// Singleton instance
export const codeSandbox = new CodeSandbox();

/**
 * Code Node Type Definition
 */
export const CodeNodeType = {
  type: 'code',
  category: 'Core',
  label: 'Code',
  icon: '{ }',
  color: '#ff6b6b',
  description: 'Run custom JavaScript code',

  inputs: [
    { name: 'input', type: 'any', required: false }
  ],

  outputs: [
    { name: 'output', type: 'any' }
  ],

  settings: [
    {
      key: 'mode',
      label: 'Mode',
      type: 'select',
      default: 'runOnceForAllItems',
      options: [
        {
          label: 'Run Once for All Items',
          value: 'runOnceForAllItems',
          description: 'Process all items together in one execution'
        },
        {
          label: 'Run Once for Each Item',
          value: 'runOnceForEachItem',
          description: 'Process each item separately'
        }
      ]
    },
    {
      key: 'code',
      label: 'JavaScript Code',
      type: 'code',
      language: 'javascript',
      default: '// Access input data with $input\n// Access current item with $json\n\nreturn $input.map(item => ({\n  json: {\n    ...item.json,\n    processed: true\n  }\n}));',
      validation: (value: string) => {
        if (!value || value.trim().length === 0) {
          return 'Code cannot be empty';
        }
        return true;
      }
    },
    {
      key: 'timeout',
      label: 'Timeout (ms)',
      type: 'number',
      default: 5000,
      validation: (value: number) => value > 0 && value <= 30000
    }
  ],

  execute: async (config: any, inputs: any) => {
    const context: CodeExecutionContext = {
      $json: inputs.input?.[0]?.json || {},
      $input: inputs.input || [],
      $items: inputs.input || [],
      $node: {},
      $workflow: {
        id: config.workflowId || 'unknown',
        name: config.workflowName || 'Unknown Workflow',
        active: true
      },
      $execution: {
        id: config.executionId || 'unknown',
        mode: 'manual'
      },
      $env: {},
      $itemIndex: 0,
      $runIndex: 0,
      $now: new Date(),
      $today: new Date(new Date().setHours(0, 0, 0, 0)),
      $binary: inputs.input?.[0]?.binary || {}
    };

    const result = await codeSandbox.execute(config.code, context, {
      mode: config.mode || 'runOnceForAllItems',
      timeout: config.timeout
    });

    if (!result.success) {
      throw new Error(result.error?.message || 'Code execution failed');
    }

    return result.output;
  }
};

/**
 * Code templates
 */
export const CodeTemplates = {
  basic: {
    name: 'Basic Processing',
    code: `// Process all input items
return $input.map(item => ({
  json: {
    ...item.json,
    processedAt: new Date().toISOString()
  }
}));`
  },

  filter: {
    name: 'Filter Items',
    code: `// Filter items based on condition
return $input.filter(item =>
  item.json.status === 'active'
);`
  },

  transform: {
    name: 'Transform Data',
    code: `// Transform data structure
return $input.map(item => ({
  json: {
    id: item.json.id,
    fullName: \`\${item.json.firstName} \${item.json.lastName}\`,
    email: item.json.email.toLowerCase()
  }
}));`
  },

  aggregate: {
    name: 'Aggregate Data',
    code: `// Aggregate all items
const total = $input.reduce((sum, item) =>
  sum + (item.json.amount || 0), 0
);

return [{
  json: {
    total,
    count: $input.length,
    average: total / $input.length
  }
}];`
  },

  api: {
    name: 'API Response Processing',
    code: `// Process API response
const response = $json;

return [{
  json: {
    data: response.data,
    timestamp: new Date().toISOString(),
    source: 'api'
  }
}];`
  },

  conditional: {
    name: 'Conditional Logic',
    code: `// Conditional processing
return $input.map(item => {
  let status;

  if (item.json.score > 80) {
    status = 'excellent';
  } else if (item.json.score > 60) {
    status = 'good';
  } else {
    status = 'needs improvement';
  }

  return {
    json: {
      ...item.json,
      status,
      grade: status
    }
  };
});`
  },

  async: {
    name: 'Async Operations',
    code: `// Async processing with Promise
const processItem = async (item) => {
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 100));

  return {
    json: {
      ...item.json,
      processed: true,
      timestamp: Date.now()
    }
  };
};

const results = await Promise.all(
  $input.map(item => processItem(item))
);

return results;`
  },

  error: {
    name: 'Error Handling',
    code: `// Error handling
return $input.map(item => {
  try {
    // Process item
    const result = item.json.value * 2;

    return {
      json: {
        ...item.json,
        result,
        success: true
      }
    };
  } catch (error) {
    return {
      json: {
        ...item.json,
        error: error.message,
        success: false
      }
    };
  }
});`
  }
};
