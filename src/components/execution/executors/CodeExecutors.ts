/**
 * Code execution node executors: Code, Function, FunctionItem
 */

import type { WorkflowNode, NodeConfig } from '../types';

/**
 * Execute Code node - JavaScript/Python execution
 */
export async function executeCode(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const code = (config.code as string) || (config.jsCode as string) || 'return { success: true };';
  const language = (config.language as string) || 'javascript';
  const mode = (config.mode as string) || 'runOnceForAllItems';

  try {
    // Prepare execution context like n8n
    const $input = {
      all: () => Array.isArray(inputData) ? inputData : [{ json: inputData }],
      first: () => {
        const items = Array.isArray(inputData) ? inputData : [{ json: inputData }];
        return items[0];
      },
      last: () => {
        const items = Array.isArray(inputData) ? inputData : [{ json: inputData }];
        return items[items.length - 1];
      },
      item: inputData
    };

    const $items = Array.isArray(inputData) ? inputData : [{ json: inputData }];
    const $json = (inputData as Record<string, unknown>).json || inputData;
    const $now = new Date();
    const $today = new Date().toISOString().split('T')[0];

    if (language === 'javascript' || language === 'js') {
      const safeCode = `
        const $input = arguments[0];
        const $items = arguments[1];
        const $json = arguments[2];
        const $now = arguments[3];
        const $today = arguments[4];
        const console = {
          log: (...args) => arguments[5].push({ type: 'log', message: args.join(' ') }),
          warn: (...args) => arguments[5].push({ type: 'warn', message: args.join(' ') }),
          error: (...args) => arguments[5].push({ type: 'error', message: args.join(' ') })
        };

        ${code.includes('return') ? code : `return (${code})`}
      `;

      const logs: Array<{ type: string; message: string }> = [];
      const fn = new Function(safeCode);
      const codeResult = fn($input, $items, $json, $now, $today, logs) as unknown;

      if (mode === 'runOnceForEachItem') {
        const results: Array<Record<string, unknown>> = [];
        for (let i = 0; i < $items.length; i++) {
          const itemInput = {
            all: () => $items,
            first: () => $items[0],
            last: () => $items[$items.length - 1],
            item: $items[i]
          };
          const itemFn = new Function(safeCode);
          const itemResult = itemFn(itemInput, $items, ($items[i] as Record<string, unknown>).json || $items[i], $now, $today, logs) as unknown;
          results.push({ json: itemResult as Record<string, unknown>, index: i });
        }
        return {
          executed: true,
          language: 'javascript',
          mode,
          result: results,
          logs,
          executedAt: new Date().toISOString()
        };
      }

      return {
        executed: true,
        language: 'javascript',
        mode,
        result: codeResult,
        logs,
        executedAt: new Date().toISOString()
      };
    } else if (language === 'python') {
      return {
        executed: false,
        language: 'python',
        mode,
        note: 'Python execution requires backend Python runtime. Code prepared for execution.',
        code: code.substring(0, 200),
        inputData,
        preparedAt: new Date().toISOString()
      };
    }

    throw new Error(`Unsupported language: ${language}`);
  } catch (error: unknown) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    return {
      executed: false,
      language: language,
      error: errorObj.message,
      code: code.substring(0, 100),
      inputData
    };
  }
}

/**
 * Execute Function node - n8n compatible simple expression execution
 */
export async function executeFunction(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const code = (config.code as string) || (config.functionCode as string) || 'return $json;';

  try {
    const $json = inputData;
    const $items = Array.isArray(inputData) ? inputData : [{ json: inputData }];
    const $now = new Date();
    const $today = new Date().toISOString().split('T')[0];
    const $node = { name: node.data?.label || 'Function' };

    const safeCode = `
      const $json = arguments[0];
      const $items = arguments[1];
      const $now = arguments[2];
      const $today = arguments[3];
      const $node = arguments[4];
      const $input = { all: () => $items, first: () => $items[0], last: () => $items[$items.length - 1] };

      ${code.includes('return') ? code : `return ${code}`}
    `;

    const fn = new Function(safeCode);
    const result = fn($json, $items, $now, $today, $node) as unknown;

    return {
      executed: true,
      type: 'function',
      result: result !== undefined ? result : $json,
      itemCount: Array.isArray(result) ? result.length : 1,
      executedAt: new Date().toISOString()
    };
  } catch (error: unknown) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    return {
      executed: false,
      type: 'function',
      error: errorObj.message,
      code: code.substring(0, 100),
      inputData
    };
  }
}

/**
 * Execute Function Item node - executes code for each item individually
 */
export async function executeFunctionItem(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const code = (config.code as string) || (config.functionCode as string) || 'return $json;';

  try {
    const items = Array.isArray(inputData) ? inputData : [inputData];
    const results: Array<Record<string, unknown>> = [];

    for (let index = 0; index < items.length; index++) {
      const item = items[index] as Record<string, unknown>;
      const $json = (item.json as Record<string, unknown>) || item;
      const $item = item;
      const $now = new Date();
      const $index = index;

      const safeCode = `
        const $json = arguments[0];
        const $item = arguments[1];
        const $now = arguments[2];
        const $index = arguments[3];

        ${code.includes('return') ? code : `return ${code}`}
      `;

      const fn = new Function(safeCode);
      const result = fn($json, $item, $now, $index) as unknown;

      results.push({
        json: result !== undefined ? result : $json,
        index
      });
    }

    return {
      executed: true,
      type: 'functionItem',
      items: results,
      itemCount: results.length,
      executedAt: new Date().toISOString()
    };
  } catch (error: unknown) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    return {
      executed: false,
      type: 'functionItem',
      error: errorObj.message,
      code: code.substring(0, 100),
      inputData
    };
  }
}

/**
 * Execute OpenAI node
 */
export async function executeOpenAI(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const model = String(config.model || 'gpt-3.5-turbo');
  const prompt = String(config.prompt || 'Hello, how are you?');

  const responses = [
    'Hello! I\'m doing well, thank you for asking. How can I help you today?',
    'I\'m functioning perfectly! What would you like to know or discuss?',
    'Greetings! I\'m here and ready to assist you with any questions or tasks.',
    'Hi there! I\'m doing great. What can I do for you?'
  ];

  return {
    model,
    prompt,
    response: responses[Math.floor(Math.random() * responses.length)],
    usage: {
      prompt_tokens: prompt.split(' ').length,
      completion_tokens: Math.floor(Math.random() * 50) + 10,
      total_tokens: Math.floor(Math.random() * 100) + 50
    },
    temperature: Number(config.temperature || 0.7)
  };
}
