/**
 * Code/Function Backend Executors
 * Executes user JavaScript code server-side with sandboxed context.
 * Handles: code, function, functionItem
 */

import { NodeExecutor, NodeExecutionContext, NodeExecutionResult } from './types';
import * as vm from 'node:vm';
import { logger } from '../../../services/SimpleLogger';

function ok(data: any): NodeExecutionResult {
  return { success: true, data, timestamp: new Date().toISOString() };
}

/**
 * Execute JavaScript code in a sandboxed VM context.
 * Uses Node.js vm module for isolation (not full sandbox, but prevents accidental globals).
 */
function runInSandbox(
  code: string,
  contextVars: Record<string, unknown>,
  timeoutMs: number = 10000
): { result: unknown; logs: Array<{ type: string; message: string }> } {
  const logs: Array<{ type: string; message: string }> = [];

  const sandbox: Record<string, unknown> = {
    ...contextVars,
    console: {
      log: (...args: unknown[]) => logs.push({ type: 'log', message: args.map(String).join(' ') }),
      warn: (...args: unknown[]) => logs.push({ type: 'warn', message: args.map(String).join(' ') }),
      error: (...args: unknown[]) => logs.push({ type: 'error', message: args.map(String).join(' ') }),
      info: (...args: unknown[]) => logs.push({ type: 'info', message: args.map(String).join(' ') }),
    },
    JSON,
    Math,
    Date,
    Array,
    Object,
    String: globalThis.String,
    Number: globalThis.Number,
    Boolean: globalThis.Boolean,
    RegExp,
    Map,
    Set,
    Promise,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    encodeURIComponent,
    decodeURIComponent,
    encodeURI,
    decodeURI,
    Buffer,
    setTimeout: undefined, // Block async operations in sandbox
    setInterval: undefined,
    fetch: undefined,
    require: undefined,
    process: undefined,
    __dirname: undefined,
    __filename: undefined,
  };

  const ctx = vm.createContext(sandbox);
  const wrappedCode = code.includes('return')
    ? `(function() { ${code} })()`
    : `(function() { return (${code}); })()`;

  const script = new vm.Script(wrappedCode);
  const result = script.runInContext(ctx, { timeout: timeoutMs });

  return { result, logs };
}

export const codeExecutor: NodeExecutor = {
  async execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
    const config = ctx.config || {};
    const code = (config.code || config.jsCode || 'return { success: true };') as string;
    const language = (config.language || 'javascript') as string;
    const mode = (config.mode || 'runOnceForAllItems') as string;

    if (language === 'python') {
      // Python execution requires a Python runtime
      return ok({
        executed: false,
        language: 'python',
        note: 'Python execution requires backend Python runtime',
        code: code.substring(0, 200),
      });
    }

    if (language !== 'javascript' && language !== 'js') {
      throw new Error(`Unsupported language: ${language}`);
    }

    const inputData = ctx.input || {};
    const $items = Array.isArray(inputData) ? inputData : [{ json: inputData }];
    const $json = (inputData as any).json || inputData;

    const contextVars = {
      $input: {
        all: () => $items,
        first: () => $items[0],
        last: () => $items[$items.length - 1],
        item: inputData,
      },
      $items,
      $json,
      $now: new Date(),
      $today: new Date().toISOString().split('T')[0],
      $env: ctx.env || {},
      $nodeId: ctx.nodeId,
      $executionId: ctx.executionId,
    };

    try {
      if (mode === 'runOnceForEachItem') {
        const results: Array<Record<string, unknown>> = [];
        for (let i = 0; i < $items.length; i++) {
          const itemCtx = {
            ...contextVars,
            $json: ($items[i] as any).json || $items[i],
            $input: {
              all: () => $items,
              first: () => $items[0],
              last: () => $items[$items.length - 1],
              item: $items[i],
            },
            $index: i,
          };
          const { result, logs } = runInSandbox(code, itemCtx);
          results.push({ json: result as Record<string, unknown>, index: i });
        }
        return ok({ executed: true, language, mode, result: results });
      }

      const { result, logs } = runInSandbox(code, contextVars);
      return {
        success: true,
        data: { executed: true, language, mode, result },
        logs: logs.map(l => `[${l.type}] ${l.message}`),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.warn('Code execution failed', { nodeId: ctx.nodeId, error: msg });
      throw new Error(`Code execution failed: ${msg}`);
    }
  },
};

export const functionExecutor: NodeExecutor = {
  async execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
    const code = (ctx.config.code || ctx.config.functionCode || 'return $json;') as string;
    const inputData = ctx.input || {};
    const $items = Array.isArray(inputData) ? inputData : [{ json: inputData }];
    const $json = (inputData as any).json || inputData;

    const contextVars = {
      $json,
      $items,
      $now: new Date(),
      $today: new Date().toISOString().split('T')[0],
      $node: { name: ctx.nodeId },
      $input: {
        all: () => $items,
        first: () => $items[0],
        last: () => $items[$items.length - 1],
      },
      $env: ctx.env || {},
    };

    try {
      const { result } = runInSandbox(code, contextVars);
      return ok({
        executed: true,
        type: 'function',
        result: result !== undefined ? result : $json,
        itemCount: Array.isArray(result) ? result.length : 1,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Function execution failed: ${msg}`);
    }
  },
};

export const functionItemExecutor: NodeExecutor = {
  async execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
    const code = (ctx.config.code || ctx.config.functionCode || 'return $json;') as string;
    const inputData = ctx.input || {};
    const items = Array.isArray(inputData) ? inputData : [inputData];
    const results: Array<Record<string, unknown>> = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i] as Record<string, unknown>;
      const $json = (item.json as Record<string, unknown>) || item;

      const contextVars = {
        $json,
        $item: item,
        $now: new Date(),
        $index: i,
        $env: ctx.env || {},
      };

      try {
        const { result } = runInSandbox(code, contextVars);
        results.push({ json: result !== undefined ? result : $json, index: i });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`FunctionItem execution failed at index ${i}: ${msg}`);
      }
    }

    return ok({ executed: true, type: 'functionItem', items: results, itemCount: results.length });
  },
};
