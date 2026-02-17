import vm from 'node:vm';

export interface EvalContext {
  json?: Record<string, unknown>;
  node?: Record<string, unknown>;
  env?: Record<string, string | undefined>;
  vars?: Record<string, unknown>;
  items?: unknown[];
}

/** Built-in functions exposed inside {{ }} expressions */
const builtInFunctions: Record<string, Function> = {
  // String
  $toLowerCase: (s: unknown) => String(s ?? '').toLowerCase(),
  $toUpperCase: (s: unknown) => String(s ?? '').toUpperCase(),
  $trim: (s: unknown) => String(s ?? '').trim(),
  $replace: (s: unknown, search: string, replacement: string) => String(s ?? '').replace(search, replacement),
  $split: (s: unknown, sep: string) => String(s ?? '').split(sep),
  $includes: (s: unknown, sub: string) => String(s ?? '').includes(sub),
  $length: (s: unknown) => (Array.isArray(s) ? s.length : String(s ?? '').length),
  $startsWith: (s: unknown, sub: string) => String(s ?? '').startsWith(sub),
  $endsWith: (s: unknown, sub: string) => String(s ?? '').endsWith(sub),
  $substring: (s: unknown, start: number, end?: number) => String(s ?? '').substring(start, end),

  // Math
  $round: (n: unknown, d?: number) => {
    const num = Number(n);
    const decimals = d ?? 0;
    return Math.round(num * 10 ** decimals) / 10 ** decimals;
  },
  $floor: (n: unknown) => Math.floor(Number(n)),
  $ceil: (n: unknown) => Math.ceil(Number(n)),
  $abs: (n: unknown) => Math.abs(Number(n)),
  $min: (...args: unknown[]) => Math.min(...args.map(Number)),
  $max: (...args: unknown[]) => Math.max(...args.map(Number)),
  $sum: (arr: unknown[]) => (Array.isArray(arr) ? arr.reduce((a: number, b: unknown) => a + Number(b), 0) : 0),
  $average: (arr: unknown[]) => {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    return arr.reduce((a: number, b: unknown) => a + Number(b), 0) / arr.length;
  },

  // Date
  $now: () => new Date().toISOString(),
  $today: () => new Date().toISOString().slice(0, 10),
  $timestamp: () => Date.now(),

  // Type checks & conversions
  $isEmpty: (v: unknown) => v == null || v === '' || (Array.isArray(v) && v.length === 0) || (typeof v === 'object' && Object.keys(v as object).length === 0),
  $isNumber: (v: unknown) => typeof v === 'number' || (typeof v === 'string' && !isNaN(Number(v)) && v.trim() !== ''),
  $toNumber: (v: unknown) => Number(v),
  $toString: (v: unknown) => String(v ?? ''),
  $toBoolean: (v: unknown) => Boolean(v),
  $typeOf: (v: unknown) => typeof v,

  // Array
  $first: (arr: unknown[]) => (Array.isArray(arr) ? arr[0] : undefined),
  $last: (arr: unknown[]) => (Array.isArray(arr) ? arr[arr.length - 1] : undefined),
  $unique: (arr: unknown[]) => (Array.isArray(arr) ? [...new Set(arr)] : []),
  $flatten: (arr: unknown[]) => (Array.isArray(arr) ? arr.flat(Infinity) : []),
  $compact: (arr: unknown[]) => (Array.isArray(arr) ? arr.filter(Boolean) : []),
  $reverse: (arr: unknown[]) => (Array.isArray(arr) ? [...arr].reverse() : []),
  $sort: (arr: unknown[]) => (Array.isArray(arr) ? [...arr].sort() : []),
  $count: (arr: unknown[]) => (Array.isArray(arr) ? arr.length : 0),

  // Object
  $keys: (obj: unknown) => (obj && typeof obj === 'object' ? Object.keys(obj) : []),
  $values: (obj: unknown) => (obj && typeof obj === 'object' ? Object.values(obj) : []),
  $entries: (obj: unknown) => (obj && typeof obj === 'object' ? Object.entries(obj) : []),
  $merge: (...objs: unknown[]) => Object.assign({}, ...objs.filter(o => o && typeof o === 'object')),
  $pick: (obj: unknown, ...keys: string[]) => {
    if (!obj || typeof obj !== 'object') return {};
    const result: Record<string, unknown> = {};
    for (const k of keys) { if (k in (obj as Record<string, unknown>)) result[k] = (obj as Record<string, unknown>)[k]; }
    return result;
  },
  $omit: (obj: unknown, ...keys: string[]) => {
    if (!obj || typeof obj !== 'object') return {};
    const keySet = new Set(keys);
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) { if (!keySet.has(k)) result[k] = v; }
    return result;
  },
};

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
  const sandbox: Record<string, unknown> = {
    $json: ctx.json || {},
    $node: ctx.node || {},
    $env: ctx.env || process.env,
    $vars: ctx.vars || {},
    $items: ctx.items || [],
    // Safe built-ins
    JSON: { parse: JSON.parse, stringify: JSON.stringify },
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Date,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    // All built-in functions
    ...builtInFunctions,
  };
  const context = vm.createContext(sandbox, { codeGeneration: { strings: false, wasm: false } });
  const script = new vm.Script(`(function(){ return (${code}); })()`);
  // 50ms hard timeout
  return script.runInContext(context, { timeout: 50 });
}
