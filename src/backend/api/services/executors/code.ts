import vm from 'node:vm';

export interface CodeConfig {
  language?: 'js';
  code: string;
  timeoutMs?: number;
}

export async function executeCodeNode(
  cfg: CodeConfig,
  context: Record<string, unknown>,
  opts?: { onLog?: (args: any[]) => void }
): Promise<unknown> {
  if ((cfg.language && cfg.language !== 'js')) throw new Error('Only JavaScript code is supported');
  const onLog = opts?.onLog;
  const sandbox = {
    $input: context.input,
    $results: context.results,
    $env: process.env,
    // expose a minimal set of safe helpers if needed
    JSON,
    Math,
    Date,
    console: {
      log: (...args: any[]) => { try { onLog?.(args); } catch {} },
      info: (...args: any[]) => { try { onLog?.(args); } catch {} },
      warn: (...args: any[]) => { try { onLog?.(args); } catch {} },
      error: (...args: any[]) => { try { onLog?.(args); } catch {} },
    },
  };
  const vmContext = vm.createContext(sandbox, { codeGeneration: { strings: true, wasm: false } });
  const script = new vm.Script(`(async () => { ${cfg.code}\n})()`);
  const timeout = cfg.timeoutMs ?? 100;
  // run
  const result = await script.runInContext(vmContext, { timeout });
  return result;
}
