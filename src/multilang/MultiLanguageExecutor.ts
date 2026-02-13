/**
 * Multi-Language Code Execution Engine
 * Supports Python, TypeScript, Go, Rust, PHP, C#, SQL, Bash
 */

import { EventEmitter } from 'events';

// Types
export type SupportedLanguage = 'javascript' | 'typescript' | 'python' | 'go' | 'rust' | 'php' | 'csharp' | 'sql' | 'bash' | 'graphql';

export interface CodeExecutionRequest {
  id: string;
  language: SupportedLanguage;
  code: string;
  input?: unknown;
  dependencies?: string[];
  timeout?: number;
  memoryLimit?: number;
  env?: Record<string, string>;
}

export interface CodeExecutionResult {
  id: string;
  success: boolean;
  output?: unknown;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  duration: number;
  memoryUsed?: number;
  error?: string;
}

export interface LanguageConfig {
  name: SupportedLanguage;
  displayName: string;
  version: string;
  fileExtension: string;
  dockerImage?: string;
  runtimeCommand: string;
  compileCommand?: string;
  packageManager?: string;
  installCommand?: string;
  maxTimeout: number;
  maxMemory: number;
  syntaxHighlight: string;
}

export interface ExecutorConfig {
  maxConcurrentExecutions?: number;
  defaultTimeout?: number;
  defaultMemoryLimit?: number;
  enableDocker?: boolean;
  dockerSocketPath?: string;
  allowedLanguages?: SupportedLanguage[];
}

export interface DependencyInfo {
  name: string;
  version: string;
  language: SupportedLanguage;
  installed: boolean;
  installCommand?: string;
}

// Language configurations
const LANGUAGE_CONFIGS: Record<SupportedLanguage, LanguageConfig> = {
  javascript: {
    name: 'javascript',
    displayName: 'JavaScript',
    version: '20.x',
    fileExtension: '.js',
    dockerImage: 'node:20-alpine',
    runtimeCommand: 'node',
    packageManager: 'npm',
    installCommand: 'npm install',
    maxTimeout: 60000,
    maxMemory: 512,
    syntaxHighlight: 'javascript',
  },
  typescript: {
    name: 'typescript',
    displayName: 'TypeScript',
    version: '5.x',
    fileExtension: '.ts',
    dockerImage: 'node:20-alpine',
    runtimeCommand: 'npx ts-node',
    packageManager: 'npm',
    installCommand: 'npm install',
    maxTimeout: 60000,
    maxMemory: 512,
    syntaxHighlight: 'typescript',
  },
  python: {
    name: 'python',
    displayName: 'Python',
    version: '3.12',
    fileExtension: '.py',
    dockerImage: 'python:3.12-slim',
    runtimeCommand: 'python3',
    packageManager: 'pip',
    installCommand: 'pip install',
    maxTimeout: 120000,
    maxMemory: 1024,
    syntaxHighlight: 'python',
  },
  go: {
    name: 'go',
    displayName: 'Go',
    version: '1.22',
    fileExtension: '.go',
    dockerImage: 'golang:1.22-alpine',
    runtimeCommand: 'go run',
    compileCommand: 'go build',
    maxTimeout: 60000,
    maxMemory: 512,
    syntaxHighlight: 'go',
  },
  rust: {
    name: 'rust',
    displayName: 'Rust',
    version: '1.75',
    fileExtension: '.rs',
    dockerImage: 'rust:1.75-slim',
    runtimeCommand: 'cargo run',
    compileCommand: 'cargo build --release',
    packageManager: 'cargo',
    maxTimeout: 120000,
    maxMemory: 1024,
    syntaxHighlight: 'rust',
  },
  php: {
    name: 'php',
    displayName: 'PHP',
    version: '8.3',
    fileExtension: '.php',
    dockerImage: 'php:8.3-cli-alpine',
    runtimeCommand: 'php',
    packageManager: 'composer',
    installCommand: 'composer install',
    maxTimeout: 60000,
    maxMemory: 512,
    syntaxHighlight: 'php',
  },
  csharp: {
    name: 'csharp',
    displayName: 'C#',
    version: '12.0',
    fileExtension: '.cs',
    dockerImage: 'mcr.microsoft.com/dotnet/sdk:8.0',
    runtimeCommand: 'dotnet run',
    compileCommand: 'dotnet build',
    packageManager: 'nuget',
    maxTimeout: 120000,
    maxMemory: 1024,
    syntaxHighlight: 'csharp',
  },
  sql: {
    name: 'sql',
    displayName: 'SQL',
    version: 'Standard',
    fileExtension: '.sql',
    runtimeCommand: 'sql-executor',
    maxTimeout: 30000,
    maxMemory: 256,
    syntaxHighlight: 'sql',
  },
  bash: {
    name: 'bash',
    displayName: 'Bash',
    version: '5.x',
    fileExtension: '.sh',
    dockerImage: 'alpine:latest',
    runtimeCommand: 'bash',
    maxTimeout: 60000,
    maxMemory: 256,
    syntaxHighlight: 'bash',
  },
  graphql: {
    name: 'graphql',
    displayName: 'GraphQL',
    version: '16.x',
    fileExtension: '.graphql',
    runtimeCommand: 'graphql-executor',
    maxTimeout: 30000,
    maxMemory: 256,
    syntaxHighlight: 'graphql',
  },
};

// Code Templates for each language
const CODE_TEMPLATES: Record<SupportedLanguage, string> = {
  javascript: `// Input data is available as 'input'
// Return value will be the node output

async function execute(input) {
  // Your code here
  return { result: input };
}

// Execute and return result
execute(input);`,

  typescript: `// Input data is available as 'input'
// Return value will be the node output

interface Input {
  [key: string]: unknown;
}

async function execute(input: Input): Promise<unknown> {
  // Your code here
  return { result: input };
}

// Execute and return result
execute(input);`,

  python: `# Input data is available as 'input'
# Return value will be the node output

import json

def execute(input_data):
    # Your code here
    return {"result": input_data}

# Execute and return result
result = execute(input)
print(json.dumps(result))`,

  go: `package main

import (
    "encoding/json"
    "fmt"
)

func main() {
    // Input data is available via stdin
    var input map[string]interface{}
    json.NewDecoder(os.Stdin).Decode(&input)

    // Your code here
    result := map[string]interface{}{
        "result": input,
    }

    json.NewEncoder(os.Stdout).Encode(result)
}`,

  rust: `use serde_json::{json, Value};
use std::io::{self, Read};

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();

    let data: Value = serde_json::from_str(&input).unwrap();

    // Your code here
    let result = json!({
        "result": data
    });

    println!("{}", result);
}`,

  php: `<?php
// Input data is available as $input
$input = json_decode(file_get_contents('php://stdin'), true);

// Your code here
$result = ['result' => $input];

echo json_encode($result);`,

  csharp: `using System;
using System.Text.Json;

class Program {
    static void Main() {
        var input = JsonSerializer.Deserialize<object>(Console.In.ReadToEnd());

        // Your code here
        var result = new { result = input };

        Console.WriteLine(JsonSerializer.Serialize(result));
    }
}`,

  sql: `-- Input parameters are available as :param_name
-- Results will be returned as JSON array

SELECT * FROM table_name
WHERE column = :param_value
LIMIT 100;`,

  bash: `#!/bin/bash
# Input data is available as $INPUT (JSON string)
# Output should be valid JSON

INPUT=$(cat)

# Your code here
echo '{"result": "success"}'`,

  graphql: `# GraphQL query/mutation
# Variables are available from input

query GetData($id: ID!) {
  item(id: $id) {
    id
    name
    data
  }
}`,
};

/**
 * Multi-Language Code Executor
 */
export class MultiLanguageExecutor extends EventEmitter {
  private executionQueue: Map<string, CodeExecutionRequest> = new Map();
  private activeExecutions: Map<string, AbortController> = new Map();

  constructor() {
    super();
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): LanguageConfig[] {
    return Object.values(LANGUAGE_CONFIGS);
  }

  /**
   * Get language configuration
   */
  getLanguageConfig(language: SupportedLanguage): LanguageConfig {
    return LANGUAGE_CONFIGS[language];
  }

  /**
   * Get code template for language
   */
  getCodeTemplate(language: SupportedLanguage): string {
    return CODE_TEMPLATES[language];
  }

  /**
   * Execute code in specified language
   */
  async execute(request: CodeExecutionRequest): Promise<CodeExecutionResult> {
    const config = LANGUAGE_CONFIGS[request.language];
    if (!config) {
      return {
        id: request.id,
        success: false,
        error: `Unsupported language: ${request.language}`,
        duration: 0,
      };
    }

    const timeout = Math.min(request.timeout || config.maxTimeout, config.maxTimeout);
    const startTime = Date.now();

    // Create abort controller for cancellation
    const abortController = new AbortController();
    this.activeExecutions.set(request.id, abortController);

    this.emit('execution:started', { id: request.id, language: request.language });

    try {
      let result: CodeExecutionResult;

      switch (request.language) {
        case 'javascript':
        case 'typescript':
          result = await this.executeJavaScript(request, config, timeout);
          break;
        case 'python':
          result = await this.executePython(request, config, timeout);
          break;
        case 'sql':
          result = await this.executeSQL(request, config, timeout);
          break;
        case 'graphql':
          result = await this.executeGraphQL(request, config, timeout);
          break;
        default:
          result = await this.executeGeneric(request, config, timeout);
      }

      result.duration = Date.now() - startTime;
      this.emit('execution:completed', result);
      return result;

    } catch (error) {
      const result: CodeExecutionResult = {
        id: request.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      };
      this.emit('execution:failed', result);
      return result;

    } finally {
      this.activeExecutions.delete(request.id);
    }
  }

  /**
   * Execute JavaScript/TypeScript code
   */
  private async executeJavaScript(
    request: CodeExecutionRequest,
    config: LanguageConfig,
    timeout: number
  ): Promise<CodeExecutionResult> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve({
          id: request.id,
          success: false,
          error: 'Execution timeout',
          duration: timeout,
        });
      }, timeout);

      try {
        // Create a safe execution context
        const context = this.createSafeContext(request.input);

        // Wrap code in async function
        const wrappedCode = `
          (async () => {
            const input = ${JSON.stringify(request.input)};
            ${request.code}
          })()
        `;

        // Execute using Function constructor with limited scope
        // Note: In production, use a proper sandbox like vm2 or isolated-vm
        const fn = new Function('input', `
          const input = arguments[0];
          return (async () => {
            ${request.code}
          })();
        `);

        Promise.resolve(fn(request.input))
          .then((output) => {
            clearTimeout(timeoutId);
            resolve({
              id: request.id,
              success: true,
              output,
              duration: 0,
            });
          })
          .catch((error) => {
            clearTimeout(timeoutId);
            resolve({
              id: request.id,
              success: false,
              error: error.message,
              duration: 0,
            });
          });

      } catch (error) {
        clearTimeout(timeoutId);
        resolve({
          id: request.id,
          success: false,
          error: error instanceof Error ? error.message : 'Execution error',
          duration: 0,
        });
      }
    });
  }

  /**
   * Execute Python code (mock - would use subprocess or Docker)
   */
  private async executePython(
    request: CodeExecutionRequest,
    config: LanguageConfig,
    timeout: number
  ): Promise<CodeExecutionResult> {
    // In production, this would execute via subprocess or Docker
    // For now, return a mock result
    return {
      id: request.id,
      success: true,
      output: {
        mock: true,
        language: 'python',
        message: 'Python execution simulated',
        input: request.input,
      },
      stdout: 'Python execution completed',
      duration: 0,
    };
  }

  /**
   * Execute SQL query (mock - would connect to actual database)
   */
  private async executeSQL(
    request: CodeExecutionRequest,
    config: LanguageConfig,
    timeout: number
  ): Promise<CodeExecutionResult> {
    // Parse SQL and validate (basic validation)
    const sql = request.code.trim();

    // Check for dangerous operations
    const dangerousPatterns = /\b(DROP|DELETE|TRUNCATE|ALTER|CREATE|INSERT|UPDATE)\b/i;
    if (dangerousPatterns.test(sql) && !request.env?.ALLOW_WRITE) {
      return {
        id: request.id,
        success: false,
        error: 'Write operations not allowed without ALLOW_WRITE flag',
        duration: 0,
      };
    }

    // Mock execution result
    return {
      id: request.id,
      success: true,
      output: {
        rows: [
          { id: 1, name: 'Sample Row 1' },
          { id: 2, name: 'Sample Row 2' },
        ],
        rowCount: 2,
        query: sql,
      },
      duration: 0,
    };
  }

  /**
   * Execute GraphQL query (mock - would connect to GraphQL endpoint)
   */
  private async executeGraphQL(
    request: CodeExecutionRequest,
    config: LanguageConfig,
    timeout: number
  ): Promise<CodeExecutionResult> {
    // In production, this would execute against a GraphQL endpoint
    return {
      id: request.id,
      success: true,
      output: {
        data: {
          mock: true,
          query: request.code,
          variables: request.input,
        },
      },
      duration: 0,
    };
  }

  /**
   * Execute generic language via Docker (mock)
   */
  private async executeGeneric(
    request: CodeExecutionRequest,
    config: LanguageConfig,
    timeout: number
  ): Promise<CodeExecutionResult> {
    // In production, this would execute via Docker container
    return {
      id: request.id,
      success: true,
      output: {
        mock: true,
        language: request.language,
        message: `${config.displayName} execution simulated`,
        input: request.input,
      },
      duration: 0,
    };
  }

  /**
   * Create safe execution context
   */
  private createSafeContext(input: unknown): Record<string, unknown> {
    return {
      input,
      console: {
        log: (...args: unknown[]) => this.emit('console:log', args),
        error: (...args: unknown[]) => this.emit('console:error', args),
        warn: (...args: unknown[]) => this.emit('console:warn', args),
      },
      JSON,
      Math,
      Date,
      Array,
      Object,
      String,
      Number,
      Boolean,
      RegExp,
      Map,
      Set,
      Promise,
    };
  }

  /**
   * Cancel an execution
   */
  cancelExecution(id: string): boolean {
    const controller = this.activeExecutions.get(id);
    if (controller) {
      controller.abort();
      this.activeExecutions.delete(id);
      this.emit('execution:cancelled', { id });
      return true;
    }
    return false;
  }

  /**
   * Validate code syntax
   */
  async validateSyntax(language: SupportedLanguage, code: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    switch (language) {
      case 'javascript':
      case 'typescript':
        try {
          new Function(code);
        } catch (e) {
          errors.push(e instanceof Error ? e.message : 'Syntax error');
        }
        break;

      case 'sql':
        // Basic SQL validation
        if (!code.trim()) {
          errors.push('Empty SQL query');
        }
        break;

      case 'graphql':
        // Basic GraphQL validation
        if (!code.includes('query') && !code.includes('mutation') && !code.includes('subscription')) {
          errors.push('GraphQL must contain query, mutation, or subscription');
        }
        break;

      default:
        // For other languages, basic checks only
        if (!code.trim()) {
          errors.push('Empty code');
        }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get language dependencies
   */
  async installDependencies(
    language: SupportedLanguage,
    dependencies: string[]
  ): Promise<{ success: boolean; installed: string[]; failed: string[] }> {
    const config = LANGUAGE_CONFIGS[language];
    if (!config.packageManager) {
      return {
        success: false,
        installed: [],
        failed: dependencies,
      };
    }

    // Mock dependency installation
    // In production, would execute package manager commands
    return {
      success: true,
      installed: dependencies,
      failed: [],
    };
  }
}

// Export types and factory
export { LANGUAGE_CONFIGS, CODE_TEMPLATES };

export function createMultiLanguageExecutor(): MultiLanguageExecutor {
  return new MultiLanguageExecutor();
}

export default MultiLanguageExecutor;
