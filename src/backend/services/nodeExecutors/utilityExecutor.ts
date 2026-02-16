/**
 * Utility Backend Executors
 * Handles: dateTime, crypto, html, markdown, compression, etl, loop, forEach,
 * noOperation, stopAndError, respondToWebhook, errorGenerator
 */

import { NodeExecutor, NodeExecutionContext, NodeExecutionResult } from './types';
import * as cryptoNode from 'crypto';

function ok(data: any): NodeExecutionResult {
  return { success: true, data, timestamp: new Date().toISOString() };
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key: string) => {
    if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function getMs(amount: number, unit: string): number {
  switch (unit) {
    case 'milliseconds': return amount;
    case 'seconds': return amount * 1000;
    case 'minutes': return amount * 60_000;
    case 'hours': return amount * 3_600_000;
    case 'days': return amount * 86_400_000;
    default: return amount;
  }
}

// --- DateTime ---
export const dateTimeExecutor: NodeExecutor = {
  async execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
    const config = ctx.config || {};
    const operation = (config.operation || 'now') as string;
    const inputObj = typeof ctx.input === 'object' && ctx.input !== null ? ctx.input : {};

    let date: Date;
    if (config.inputField) {
      const v = getNestedValue(inputObj as Record<string, unknown>, config.inputField as string);
      date = new Date(v as string | number);
    } else {
      date = new Date();
    }

    switch (operation) {
      case 'now':
      case 'format': {
        const fmt = (config.outputFormat || 'ISO') as string;
        let formatted: string;
        if (fmt === 'Unix') formatted = String(Math.floor(date.getTime() / 1000));
        else if (fmt === 'UnixMs') formatted = String(date.getTime());
        else formatted = date.toISOString();
        return ok({ result: formatted, timestamp: date.getTime() });
      }
      case 'add':
      case 'subtract': {
        const amount = (config.amount || 1) as number;
        const unit = (config.unit || 'days') as string;
        const mult = operation === 'subtract' ? -1 : 1;
        const nd = new Date(date.getTime() + getMs(amount * mult, unit));
        return ok({ result: nd.toISOString(), timestamp: nd.getTime() });
      }
      case 'extract': {
        const part = (config.extractPart || 'year') as string;
        let value: number;
        switch (part) {
          case 'year': value = date.getFullYear(); break;
          case 'month': value = date.getMonth() + 1; break;
          case 'day': value = date.getDate(); break;
          case 'hour': value = date.getHours(); break;
          case 'minute': value = date.getMinutes(); break;
          case 'second': value = date.getSeconds(); break;
          case 'weekday': value = date.getDay(); break;
          default: value = date.getTime();
        }
        return ok({ result: value, [part]: value });
      }
      default:
        return ok({ result: date.toISOString() });
    }
  },
};

// --- Crypto ---
export const cryptoExecutor: NodeExecutor = {
  async execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
    const config = ctx.config || {};
    const operation = (config.operation || 'hash') as string;

    if (operation === 'uuid') {
      return ok({ result: cryptoNode.randomUUID() });
    }

    if (operation === 'generateKey') {
      const len = config.keyLength ? Number(config.keyLength) : 32;
      return ok({ result: cryptoNode.randomBytes(len).toString('hex') });
    }

    if (operation === 'hash') {
      const algorithm = (config.hashAlgorithm || 'sha256') as string;
      const encoding = (config.encoding || 'hex') as string;
      const inputObj = typeof ctx.input === 'object' && ctx.input !== null ? ctx.input : {};
      const data = config.inputField
        ? String(getNestedValue(inputObj as Record<string, unknown>, config.inputField as string))
        : JSON.stringify(inputObj);
      const hash = cryptoNode.createHash(algorithm).update(data).digest(encoding as any);
      return ok({ result: hash, algorithm, encoding });
    }

    if (operation === 'hmac') {
      const algorithm = (config.hashAlgorithm || 'sha256') as string;
      const secret = (config.secret || ctx.credentials?.secret || '') as string;
      const inputObj = typeof ctx.input === 'object' && ctx.input !== null ? ctx.input : {};
      const data = config.inputField
        ? String(getNestedValue(inputObj as Record<string, unknown>, config.inputField as string))
        : JSON.stringify(inputObj);
      const hmac = cryptoNode.createHmac(algorithm, secret).update(data).digest('hex');
      return ok({ result: hmac, algorithm });
    }

    return ok({ result: null, operation: 'unsupported' });
  },
};

// --- HTML ---
export const htmlExecutor: NodeExecutor = {
  async execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
    const config = ctx.config || {};
    const operation = (config.operation || 'extractText') as string;
    const inputObj = typeof ctx.input === 'object' && ctx.input !== null ? ctx.input : {};
    const html = config.sourceField
      ? String(getNestedValue(inputObj as Record<string, unknown>, config.sourceField as string) || '')
      : '';

    if (operation === 'extractText') {
      const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      return ok({ result: text });
    }

    if (operation === 'extractLinks') {
      const re = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
      const links: Array<{ url: string; text: string }> = [];
      let m;
      while ((m = re.exec(html)) !== null) links.push({ url: m[1], text: m[2] });
      return ok({ links });
    }

    return ok({ result: html });
  },
};

// --- Markdown ---
export const markdownExecutor: NodeExecutor = {
  async execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
    const config = ctx.config || {};
    const operation = (config.operation || 'toHtml') as string;
    const inputObj = typeof ctx.input === 'object' && ctx.input !== null ? ctx.input : {};
    const md = config.sourceField
      ? String(getNestedValue(inputObj as Record<string, unknown>, config.sourceField as string) || '')
      : '';

    if (operation === 'toText') {
      const text = md
        .replace(/#{1,6}\s/g, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/`([^`]+)`/g, '$1');
      return ok({ result: text });
    }

    if (operation === 'toHtml') {
      const html = md
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
        .replace(/`([^`]+)`/g, '<code>$1</code>');
      return ok({ result: html });
    }

    return ok({ result: md });
  },
};

// --- Compression ---
export const compressionExecutor: NodeExecutor = {
  async execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
    const config = ctx.config || {};
    const operation = (config.operation || 'compress') as string;
    const inputObj = typeof ctx.input === 'object' && ctx.input !== null ? ctx.input : {};
    const data = config.sourceField
      ? String(getNestedValue(inputObj as Record<string, unknown>, config.sourceField as string) || '')
      : JSON.stringify(inputObj);

    if (operation === 'compress') {
      const buf = Buffer.from(data, 'utf8');
      const compressed = buf.toString('base64');
      return ok({ result: compressed, originalSize: buf.length, compressedSize: compressed.length });
    }

    if (operation === 'decompress') {
      try {
        const decompressed = Buffer.from(data, 'base64').toString('utf8');
        return ok({ result: decompressed });
      } catch {
        return ok({ error: 'Failed to decompress', result: data });
      }
    }

    return ok({ result: data });
  },
};

// --- ETL ---
export const etlExecutor: NodeExecutor = {
  async execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
    const config = ctx.config || {};
    const inputObj = typeof ctx.input === 'object' && ctx.input !== null ? ctx.input : {};
    const data = Array.isArray((inputObj as any).data) ? (inputObj as any).data : [];
    let transformed = data as Array<Record<string, unknown>>;

    if (config.filterField) {
      transformed = transformed.filter(item => item[config.filterField as string] === config.filterValue);
    }

    if (Array.isArray(config.selectFields) && (config.selectFields as string[]).length > 0) {
      transformed = transformed.map(item => {
        const out: Record<string, unknown> = {};
        for (const f of config.selectFields as string[]) out[f] = item[f];
        return out;
      });
    }

    return ok({ extracted: data.length, loaded: transformed.length, data: transformed });
  },
};

// --- Loop ---
export const loopExecutor: NodeExecutor = {
  async execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
    const inputObj = typeof ctx.input === 'object' && ctx.input !== null ? ctx.input : {};
    const items = Array.isArray((inputObj as any).items) ? (inputObj as any).items : [];
    const max = parseInt(String(ctx.config.maxIterations)) || items.length;
    const delayMs = parseInt(String(ctx.config.delayMs)) || 0;
    const results: Array<Record<string, unknown>> = [];

    for (let i = 0; i < items.length && i < max; i++) {
      results.push({ index: i, item: items[i] });
      if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
    }

    return ok({ iterations: results.length, results });
  },
};

// --- ForEach ---
export const forEachExecutor: NodeExecutor = {
  async execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
    const inputObj = typeof ctx.input === 'object' && ctx.input !== null ? ctx.input : {};
    const items = Array.isArray((inputObj as any).items) ? (inputObj as any).items : [];
    const results = items.map((item: unknown, i: number) => ({ index: i, item }));
    return ok({ count: results.length, results });
  },
};

// --- NoOperation (passthrough) ---
export const noOperationExecutor: NodeExecutor = {
  async execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
    return ok(typeof ctx.input === 'object' && ctx.input !== null ? ctx.input : {});
  },
};

// --- StopAndError ---
export const stopAndErrorExecutor: NodeExecutor = {
  async execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
    const message = (ctx.config.errorMessage || ctx.config.message || 'Workflow stopped') as string;
    throw new Error(message);
  },
};

// --- RespondToWebhook ---
export const respondToWebhookExecutor: NodeExecutor = {
  async execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
    const config = ctx.config || {};
    return ok({
      response: {
        status: (config.statusCode || 200) as number,
        headers: config.headers || {},
        body: config.responseBody || ctx.input || { success: true },
      },
    });
  },
};

// --- ErrorGenerator (for testing) ---
export const errorGeneratorExecutor: NodeExecutor = {
  async execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
    const message = (ctx.config.errorMessage || 'Generated test error') as string;
    throw new Error(message);
  },
};
