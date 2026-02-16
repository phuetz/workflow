/**
 * Utility node executors: DateTime, Crypto, HTML, Markdown, Compression, Command
 */

import type { WorkflowNode, NodeConfig } from '../types';
import { parseExpression, getMilliseconds, interpolateString } from '../ExpressionEvaluator';

/**
 * Execute DateTime node
 */
export async function executeDateTime(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const operation = config.operation as string || 'now';
  const inputField = config.inputField as string;

  let date: Date;

  if (operation === 'now') {
    date = new Date();
  } else if (inputField) {
    const inputValue = parseExpression(inputField, inputData);
    date = new Date(inputValue as unknown as string | number);
  } else {
    date = new Date();
  }

  switch (operation) {
    case 'format':
    case 'now': {
      const outputFormat = config.outputFormat as string || 'ISO';
      let formatted: string;
      switch (outputFormat) {
        case 'ISO':
          formatted = date.toISOString();
          break;
        case 'Unix':
          formatted = String(Math.floor(date.getTime() / 1000));
          break;
        case 'UnixMs':
          formatted = String(date.getTime());
          break;
        default:
          formatted = date.toISOString();
      }
      return { result: formatted, timestamp: date.getTime() };
    }

    case 'add':
    case 'subtract': {
      const amount = config.amount as number || 1;
      const unit = config.unit as string || 'days';
      const multiplier = operation === 'subtract' ? -1 : 1;
      const ms = getMilliseconds(amount * multiplier, unit);
      const newDate = new Date(date.getTime() + ms);
      return { result: newDate.toISOString(), timestamp: newDate.getTime() };
    }

    case 'extract': {
      const extractPart = config.extractPart as string || 'year';
      let value: number;
      switch (extractPart) {
        case 'year': value = date.getFullYear(); break;
        case 'month': value = date.getMonth() + 1; break;
        case 'day': value = date.getDate(); break;
        case 'hour': value = date.getHours(); break;
        case 'minute': value = date.getMinutes(); break;
        case 'second': value = date.getSeconds(); break;
        case 'weekday': value = date.getDay(); break;
        default: value = date.getTime();
      }
      return { result: value, [extractPart]: value };
    }

    default:
      return { result: date.toISOString() };
  }
}

/**
 * Execute Crypto node
 */
export async function executeCrypto(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const operation = config.operation as string || 'hash';

  if (operation === 'uuid') {
    return { result: crypto.randomUUID() };
  }

  if (operation === 'generateKey') {
    const keyLength = config.encryptAlgorithm === 'aes-128-cbc' ? 16 :
                     config.encryptAlgorithm === 'aes-192-cbc' ? 24 : 32;
    const array = new Uint8Array(keyLength);
    crypto.getRandomValues(array);
    return { result: Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('') };
  }

  const inputField = config.inputField as string;
  const data = inputField ? String(parseExpression(inputField, inputData)) : JSON.stringify(inputData);

  if (operation === 'hash') {
    const algorithm = config.hashAlgorithm as string || 'sha256';
    const encoding = config.encoding as string || 'hex';

    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest(algorithm.toUpperCase().replace('-', ''), dataBuffer);

    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const result = encoding === 'hex'
      ? hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      : btoa(String.fromCharCode(...hashArray));

    return { result, algorithm, encoding };
  }

  return { result: data, operation: 'unsupported' };
}

/**
 * Execute Command node
 */
export async function executeCommand(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const command = interpolateString(String(config.command || 'echo "Hello"'), inputData);

  return {
    command,
    stdout: `[Mock] Command executed: ${command}`,
    stderr: '',
    exitCode: 0,
    executed: true,
    note: 'Shell execution requires backend server'
  };
}

/**
 * Execute HTML node
 */
export async function executeHtml(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const operation = config.operation as string || 'extractText';
  const sourceField = config.sourceField as string;
  const html = sourceField ? String(parseExpression(sourceField, inputData)) : '';

  if (operation === 'extractText') {
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return { result: text };
  }

  if (operation === 'extractLinks') {
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
    const links: Array<{ url: string; text: string }> = [];
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      links.push({ url: match[1], text: match[2] });
    }
    return { links };
  }

  return { result: html };
}

/**
 * Execute Markdown node
 */
export async function executeMarkdown(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const operation = config.operation as string || 'toHtml';
  const sourceField = config.sourceField as string;
  const markdown = sourceField ? String(parseExpression(sourceField, inputData)) : '';

  if (operation === 'toText') {
    const text = markdown
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/`([^`]+)`/g, '$1');
    return { result: text };
  }

  if (operation === 'toHtml') {
    const html = markdown
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
    return { result: html };
  }

  return { result: markdown };
}

/**
 * Execute Compression node
 */
export async function executeCompression(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const operation = config.operation as string || 'compress';
  const sourceField = config.sourceField as string;
  const data = sourceField ? String(parseExpression(sourceField, inputData)) : JSON.stringify(inputData);

  if (operation === 'compress') {
    const compressed = btoa(data);
    return {
      result: compressed,
      originalSize: data.length,
      compressedSize: compressed.length,
      format: config.format || 'base64'
    };
  }

  if (operation === 'decompress') {
    try {
      const decompressed = atob(data);
      return { result: decompressed };
    } catch {
      return { error: 'Failed to decompress data', result: data };
    }
  }

  return { result: data };
}

/**
 * Execute ETL node
 */
export async function executeETL(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const data = Array.isArray(inputData?.data) ? inputData.data : [];
  let transformed = data as Array<Record<string, unknown>>;

  if (config.filterField) {
    transformed = transformed.filter((item: Record<string, unknown>) =>
      item && item[config.filterField as string] === config.filterValue
    );
  }

  if (Array.isArray(config.selectFields) && (config.selectFields as string[]).length > 0) {
    transformed = transformed.map((item: Record<string, unknown>) => {
      const out: Record<string, unknown> = {};
      for (const field of config.selectFields as string[]) {
        out[field] = item[field];
      }
      return out;
    });
  }

  return {
    extracted: data.length,
    loaded: transformed.length,
    filtered: !!config.filterField,
    sample: transformed.slice(0, 3),
    data: transformed
  };
}

/**
 * Execute Loop node
 */
export async function executeLoop(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const items = Array.isArray(inputData?.items) ? inputData.items : [];
  const max = parseInt(String(config.maxIterations)) || items.length;
  const delay = parseInt(String(config.delayMs)) || 0;

  const results: Array<Record<string, unknown>> = [];
  for (let i = 0; i < items.length && i < max; i++) {
    results.push({ index: i, item: items[i] });
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return { iterations: results.length, results };
}

/**
 * Execute ForEach node
 */
export async function executeForEach(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const items = Array.isArray(inputData?.items) ? inputData.items : [];
  const results: Array<Record<string, unknown>> = [];

  for (let i = 0; i < items.length; i++) {
    results.push({ index: i, item: items[i] });
  }

  return { count: results.length, results };
}

/**
 * Execute generic node
 */
export async function executeGeneric(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  return {
    nodeType: node.data.type,
    executed: true,
    config,
    inputData,
    timestamp: new Date().toISOString()
  };
}
