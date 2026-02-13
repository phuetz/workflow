import { logger } from '../services/SimpleLogger';
// ARCHITECTURE FIX: Implement Strategy Pattern for execution logic
// This addresses the tight coupling in ExecutionEngine.ts

export interface ExecutionContext {
  nodeId: string;
  inputData: unknown;
  globalVariables: Record<string, unknown>;
  previousResults: Record<string, unknown>;
  executionMetadata: {
    startTime: number;
    timeout: number;
    maxRetries: number;
    currentAttempt: number;
  };
}

export interface ExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  duration: number;
  metadata: {
    nodeType: string;
    executedAt: string;
    retryCount: number;
    resourceUsage?: {
      memoryMB: number;
      cpuMs: number;
    };
  };
}

// ARCHITECTURE FIX: Abstract base class for all node executors
export abstract class NodeExecutor {
  protected abstract nodeType: string;

  abstract execute(config: unknown, context: ExecutionContext): Promise<ExecutionResult>;

  // ARCHITECTURE FIX: Template method pattern for common execution logic
  public async executeWithRetry(config: unknown, context: ExecutionContext): Promise<ExecutionResult> {
    let lastError: Error | undefined;
    const maxRetries = context.executionMetadata.maxRetries;
    const startTime = context.executionMetadata.startTime;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const attemptContext = {
          ...context,
          executionMetadata: {
            ...context.executionMetadata,
            currentAttempt: attempt
          }
        };

        const result = await this.execute(config, attemptContext);

        if (result.success) {
          return result;
        }

        // If not success but no error, treat as non-retryable
        if (!result.error) {
          return result;
        }

        lastError = new Error(result.error);

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          await this.delay(Math.pow(2, attempt - 1) * 1000);
        }
      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable
        if (!this.isRetryableError(error as Error) || attempt === maxRetries) {
          break;
        }

        // Wait before retry
        await this.delay(Math.pow(2, attempt - 1) * 1000);
      }
    }

    // Return failure result
    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      duration: Date.now() - startTime,
      metadata: {
        nodeType: this.nodeType,
        executedAt: new Date().toISOString(),
        retryCount: maxRetries
      }
    };
  }

  // ARCHITECTURE FIX: Centralized retry logic
  protected isRetryableError(error: Error): boolean {
    const retryableErrors = [
      'Network error',
      'Timeout',
      'Connection refused',
      'Service unavailable'
    ];

    return retryableErrors.some(retryable =>
      error.message.toLowerCase().includes(retryable.toLowerCase())
    );
  }

  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ARCHITECTURE FIX: Input validation template
  protected validateConfig(config: unknown, requiredFields: string[]): void {
    const configObj = config as Record<string, unknown>;
    for (const field of requiredFields) {
      if (!(field in configObj) || configObj[field] === undefined || configObj[field] === null) {
        throw new Error(`Missing required configuration field: ${field}`);
      }
    }
  }

  // ARCHITECTURE FIX: Resource monitoring
  protected async measureResourceUsage<T>(operation: () => Promise<T>): Promise<{
    result: T;
    resourceUsage: { memoryMB: number; cpuMs: number };
  }> {
    const startTime = Date.now();
    // TYPE FIX: performance.memory is non-standard (Chrome only)
    const performanceWithMemory = performance as Performance & { memory?: { usedJSHeapSize: number } };
    const startMemory = performanceWithMemory.memory ? performanceWithMemory.memory.usedJSHeapSize : 0;

    const result = await operation();

    const endTime = Date.now();
    const endMemory = performanceWithMemory.memory ? performanceWithMemory.memory.usedJSHeapSize : 0;

    return {
      result,
      resourceUsage: {
        memoryMB: Math.max(0, Math.round((endMemory - startMemory) / 1048576 * 1000) / 1000),
        cpuMs: endTime - startTime
      }
    };
  }
}

// ARCHITECTURE FIX: Factory pattern for node executor creation
export class NodeExecutorFactory {
  private static executors = new Map<string, () => NodeExecutor>();

  public static register(nodeType: string, creator: () => NodeExecutor): void {
    this.executors.set(nodeType, creator);
  }

  public static create(nodeType: string): NodeExecutor {
    const creator = this.executors.get(nodeType);
    if (!creator) {
      throw new Error(`No executor registered for node type: ${nodeType}`);
    }
    return creator();
  }

  public static getSupportedTypes(): string[] {
    return Array.from(this.executors.keys());
  }
}

// ARCHITECTURE FIX: Example concrete executor implementations
export class HttpRequestExecutor extends NodeExecutor {
  protected nodeType = 'httpRequest';

  async execute(config: unknown, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const configObj = config as Record<string, unknown>;

    // SECURITY FIX: Import security manager for URL validation
    const { securityManager } = await import('../security/SecurityManager');

    try {
      // ARCHITECTURE FIX: Proper validation
      this.validateConfig(config, ['url', 'method']);
      
      // SECURITY FIX: Validate URL before making request
      if (!configObj.url || typeof configObj.url !== 'string') {
        throw new Error('Invalid or missing URL');
      }
      
      if (!securityManager.validateUrl(configObj.url, 'http-request')) {
        securityManager.logSecurityEvent('BLOCKED_HTTP_REQUEST', {
          url: configObj.url,
          nodeId: context.nodeId,
          reason: 'URL validation failed'
        });
        throw new Error('URL blocked by security policy');
      }

      // ARCHITECTURE FIX: Resource monitoring with security checks
      const { result, resourceUsage } = await this.measureResourceUsage(async () => {
        // SECURITY FIX: Sanitize headers
        const sanitizedHeaders: { [key: string]: string } = {};
        if (configObj.headers && typeof configObj.headers === 'object') {
          for (const [key, value] of Object.entries(configObj.headers)) {
            if (typeof key === 'string' && typeof value === 'string') {
              // Block dangerous headers
              const lowerKey = key.toLowerCase();
              if (!['host', 'origin', 'referer', 'cookie', 'authorization'].includes(lowerKey)) {
                sanitizedHeaders[key] = value.substring(0, 500); // Limit header length
              }
            }
          }
        }

        // Add security headers
        Object.assign(sanitizedHeaders, {
          'User-Agent': 'WorkflowBuilder/1.0 (Security-Enhanced)',
          'Accept': 'application/json'
        });

        // TYPE FIX: Ensure method is a string
        const method = typeof configObj.method === 'string' ? configObj.method : 'GET';

        // SECURITY FIX: Validate and limit request body size
        let requestBody: string | undefined;
        if (method !== 'GET' && configObj.body) {
          const bodyString = typeof configObj.body === 'string' ? configObj.body : JSON.stringify(configObj.body);
          if (bodyString.length > 1024 * 1024) { // 1MB limit
            throw new Error('Request body too large');
          }
          requestBody = bodyString;
        }

        // TYPE FIX: Ensure URL is a string (already validated above)
        const url = configObj.url as string;

        // BROWSER COMPATIBILITY FIX: Check for fetch support and use fallback
        let response: Response;
        if (typeof fetch !== 'undefined') {
          // Use modern AbortSignal.timeout only if available
          const fetchOptions: RequestInit = {
            method: method,
            headers: sanitizedHeaders,
            body: requestBody,
            redirect: 'follow',
            referrerPolicy: 'no-referrer'
          };

          if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) {
            fetchOptions.signal = AbortSignal.timeout(context.executionMetadata.timeout);
          }

          response = await fetch(url, fetchOptions);
        } else {
          // Fallback for browsers without fetch support
          throw new Error('HTTP requests not supported in this browser environment');
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // SECURITY FIX: Validate response size
        const responseText = await response.text();
        if (responseText.length > 5 * 1024 * 1024) { // 5MB limit
          throw new Error('Response too large');
        }
        
        try {
          return JSON.parse(responseText);
        } catch (error) {
          // ERROR HANDLING FIX: Log JSON parsing failures for debugging
          logger.warn('Failed to parse JSON response, returning as text:', error instanceof Error ? error.message : 'Unknown error');
          // If not valid JSON, return as text
          return responseText;
        }
      });

      return {
        success: true,
        data: result,
        duration: Date.now() - startTime,
        metadata: {
          nodeType: this.nodeType,
          executedAt: new Date().toISOString(),
          retryCount: context.executionMetadata.currentAttempt - 1,
          resourceUsage
        }
      };
    } catch (error) {
      // SECURITY FIX: Log security-related errors
      securityManager.logSecurityEvent('HTTP_REQUEST_FAILED', {
        url: configObj.url,
        nodeId: context.nodeId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      });
      
      return {
        success: false,
        error: (error as Error).message,
        duration: Date.now() - startTime,
        metadata: {
          nodeType: this.nodeType,
          executedAt: new Date().toISOString(),
          retryCount: context.executionMetadata.currentAttempt - 1
        }
      };
    }
  }
}

export class TransformExecutor extends NodeExecutor {
  protected nodeType = 'transform';

  async execute(config: unknown, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const configObj = config as Record<string, unknown>;

    try {
      this.validateConfig(config, ['code']);

      // SECURITY FIX: Sanitize code execution (would use a proper sandbox in production)
      const sanitizedCode = this.sanitizeCode(configObj.code as string);

      const { result, resourceUsage } = await this.measureResourceUsage(async () => {
        // SECURITY WARNING: This is simplified for demo - use proper sandboxing in production
        return this.executeUserCode(sanitizedCode, context.inputData, context.globalVariables);
      });

      return {
        success: true,
        data: result,
        duration: Date.now() - startTime,
        metadata: {
          nodeType: this.nodeType,
          executedAt: new Date().toISOString(),
          retryCount: context.executionMetadata.currentAttempt - 1,
          resourceUsage
        }
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        duration: Date.now() - startTime,
        metadata: {
          nodeType: this.nodeType,
          executedAt: new Date().toISOString(),
          retryCount: context.executionMetadata.currentAttempt - 1
        }
      };
    }
  }

  private sanitizeCode(code: string): string {
    // SECURITY FIX: Basic code sanitization (use proper sandbox in production)
    const dangerousPatterns = [
      /eval\s*\(/g,
      /Function\s*\(/g,
      /setTimeout\s*\(/g,
      /setInterval\s*\(/g,
      /require\s*\(/g,
      /import\s+/g,
      /process\./g,
      /global\./g,
      /window\./g,
      /document\./g
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        throw new Error('Code contains potentially dangerous patterns');
      }
    }

    return code;
  }

  private async executeUserCode(code: string, inputData: unknown, globalVars: unknown): Promise<unknown> {
    // SECURITY FIX: Use secure sandbox instead of dangerous new Function()
    const { securityManager } = await import('../security/SecurityManager');

    try {
      // TYPE FIX: Use executeCode (not executeCodeInSandbox) from SecurityManager
      const executionResult = await securityManager.executeCode(
        code,
        inputData,
        { vars: globalVars },
        `transform-${Date.now()}`
      );

      if (!executionResult.success) {
        throw new Error(
          `Code execution failed: ${executionResult.error}. ` +
          `Security violations: ${executionResult.securityViolations.join(', ')}`
        );
      }

      // Log security violations if any
      if (executionResult.securityViolations.length > 0) {
        securityManager.logSecurityEvent('CODE_EXECUTION_VIOLATIONS', {
          violations: executionResult.securityViolations,
          executionTime: executionResult.executionTime
        });
      }

      return executionResult.result;
    } catch (error) {
      // Log security event for failed code execution
      securityManager.logSecurityEvent('CODE_EXECUTION_FAILED', {
        error: error instanceof Error ? error.message : 'Unknown error',
        codeLength: code.length
      });

      throw new Error(`Secure code execution failed: ${(error as Error).message}`);
    }
  }
}

// ARCHITECTURE FIX: Register built-in executors
NodeExecutorFactory.register('httpRequest', () => new HttpRequestExecutor());
NodeExecutorFactory.register('transform', () => new TransformExecutor());

// ARCHITECTURE FIX: Execution engine using strategy pattern
export class StrategyBasedExecutionEngine {
  private executors = new Map<string, NodeExecutor>();

  constructor() {
    // Initialize with registered executors
    for (const nodeType of NodeExecutorFactory.getSupportedTypes()) {
      this.executors.set(nodeType, NodeExecutorFactory.create(nodeType));
    }
  }

  async executeNode(
    nodeType: string,
    config: unknown,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const executor = this.executors.get(nodeType);

    if (!executor) {
      return {
        success: false,
        error: `Unsupported node type: ${nodeType}`,
        duration: 0,
        metadata: {
          nodeType,
          executedAt: new Date().toISOString(),
          retryCount: 0
        }
      };
    }

    return executor.executeWithRetry(config, context);
  }

  // ARCHITECTURE FIX: Dynamic executor registration
  registerExecutor(nodeType: string, executor: NodeExecutor): void {
    this.executors.set(nodeType, executor);
  }

  getSupportedNodeTypes(): string[] {
    return Array.from(this.executors.keys());
  }
}