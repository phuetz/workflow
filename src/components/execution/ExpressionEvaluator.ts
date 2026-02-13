/**
 * Expression evaluation utilities for the workflow execution engine.
 * Handles variable interpolation, path resolution, and safe expression evaluation.
 */

/**
 * Interpolates variables in a string using {{ }} syntax.
 * @param str - The string containing expressions to interpolate
 * @param data - The data context to resolve variables from
 * @returns The interpolated string
 */
export function interpolateString(str: string | unknown, data: Record<string, unknown>): string {
  const stringValue = String(str);
  return stringValue.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const trimmedPath = path.trim();
    const value = getValueByPath(data, trimmedPath);
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Gets a nested value from an object using dot notation path.
 * Supports $json prefix removal for n8n compatibility.
 * @param obj - The object to get the value from
 * @param path - The dot-notation path to the value
 * @returns The value at the path or undefined
 */
export function getValueByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.replace(/\$json\.?/, '').split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Gets a nested value from an object with array indexing support.
 * Handles paths like "items[0].value" or "data.users[2].name".
 * @param obj - The object to get the value from
 * @param path - The path with optional array indexing
 * @returns The value at the path or undefined
 */
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  if (!path) return obj;
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    // Handle array indexing like "items[0]"
    const match = part.match(/^(\w+)\[(\d+)\]$/);
    if (match) {
      current = (current as Record<string, unknown>)[match[1]];
      if (Array.isArray(current)) {
        current = current[parseInt(match[2], 10)];
      }
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }
  return current;
}

/**
 * Sets a nested value in an object using dot notation path.
 * Creates intermediate objects as needed.
 * @param obj - The object to set the value in
 * @param path - The dot-notation path
 * @param value - The value to set
 */
export function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
}

/**
 * Deletes a nested value from an object using dot notation path.
 * @param obj - The object to delete the value from
 * @param path - The dot-notation path
 */
export function deleteNestedValue(obj: Record<string, unknown>, path: string): void {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current)) return;
    current = current[key] as Record<string, unknown>;
  }

  delete current[keys[keys.length - 1]];
}

/**
 * Resolves an expression value from a string.
 * Supports {{ $json.field }} syntax for data extraction.
 * @param value - The value to resolve (may be an expression string)
 * @param context - The data context for resolution
 * @returns The resolved value
 */
export function resolveExpressionValue(value: unknown, context: Record<string, unknown>): unknown {
  if (typeof value !== 'string') return value;

  // Check if it's an expression like {{ $json.field }}
  const expressionMatch = value.match(/^\{\{\s*(.+?)\s*\}\}$/);
  if (expressionMatch) {
    const expr = expressionMatch[1];
    // Simple expression resolution
    if (expr.startsWith('$json.')) {
      return getNestedValue(context, expr.replace('$json.', ''));
    }
    if (expr === '$json') {
      return context;
    }
  }

  return value;
}

/**
 * Parses and evaluates a simple expression against data.
 * Used for condition evaluation.
 * @param expression - The expression to evaluate
 * @param data - The data context
 * @returns Boolean result of the expression
 */
export function parseExpression(expression: string, data: Record<string, unknown>): boolean {
  if (!expression) return true;
  try {
    const func = new Function('$json', `return ${expression}`);
    return Boolean(func(data));
  } catch (e) {
    console.error('Expression evaluation failed:', expression, e);
    return false;
  }
}

/**
 * Converts a time amount and unit to milliseconds.
 * @param amount - The numeric amount
 * @param unit - The time unit (seconds, minutes, hours, days, weeks, months, years)
 * @returns The time in milliseconds
 */
export function getMilliseconds(amount: number, unit: string): number {
  const units: Record<string, number> = {
    seconds: 1000,
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
    weeks: 7 * 24 * 60 * 60 * 1000,
    months: 30 * 24 * 60 * 60 * 1000,
    years: 365 * 24 * 60 * 60 * 1000
  };
  return amount * (units[unit] || units.days);
}

/**
 * Aggregates values based on the specified operation.
 * @param items - The items to aggregate
 * @param aggregation - The aggregation operation
 * @param field - Optional field to extract values from
 * @returns The aggregated result
 */
export function aggregate(items: unknown[], aggregation: string, field?: string): number {
  if (aggregation === 'count') return items.length;

  const values = items.map(item => {
    const val = field ? getNestedValue(item as Record<string, unknown>, field) : item;
    return typeof val === 'number' ? val : parseFloat(String(val)) || 0;
  });

  switch (aggregation) {
    case 'sum': return values.reduce((a, b) => a + b, 0);
    case 'avg': return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    case 'min': return Math.min(...values);
    case 'max': return Math.max(...values);
    default: return values.length;
  }
}
