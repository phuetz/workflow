import vm from 'node:vm';

export interface EvalContext {
  json?: Record<string, unknown>;
  node?: Record<string, unknown>;
  env?: Record<string, string | undefined>;
  vars?: Record<string, unknown>;
}

// Very small, defensive evaluator. Supports:
// - direct tokens like $json.path.to.value
// - JS expressions inside {{ ... }} with limited scope
export function evaluateExpression(expr: string, ctx: EvalContext): unknown {
  const trimmed = String(expr ?? '').trim();
  if (trimmed.startsWith('{{') && trimmed.endsWith('}}')) {
    const code = trimmed.slice(2, -2);
    return evalInSandbox(code, ctx);
  }
  // token form: $json.foo.bar
  if (trimmed.startsWith('$json')) return getPath(ctx.json, trimmed.replace(/^\$json\.?/, ''));
  if (trimmed.startsWith('$node')) return getPath(ctx.node, trimmed.replace(/^\$node\.?/, ''));
  if (trimmed.startsWith('$env')) return getPath(ctx.env, trimmed.replace(/^\$env\.?/, ''));
  if (trimmed.startsWith('$vars')) return getPath(ctx.vars, trimmed.replace(/^\$vars\.?/, ''));
  return trimmed;
}

function getPath(obj: any, path: string): unknown {
  if (!path) return obj;
  return path.split('.').reduce((acc, part) => (acc && typeof acc === 'object' ? (acc as any)[part] : undefined), obj);
}

function evalInSandbox(code: string, ctx: EvalContext): unknown {
  const sandbox = {
    $json: ctx.json || {},
    $node: ctx.node || {},
    $env: ctx.env || process.env,
    $vars: ctx.vars || {},
    // No access to require/process apart from whitelisted process.env via $env
  };
  const context = vm.createContext(sandbox, { codeGeneration: { strings: false, wasm: false } });
  const script = new vm.Script(`(function(){ return (${code}); })()`);
  // 50ms hard timeout
  return script.runInContext(context, { timeout: 50 });
}

