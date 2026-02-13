/**
 * Zapier-style Formatters System
 * Provides text, number, date, and utility formatters for data transformation
 * Equivalent to Zapier's Formatter by Zapier app
 */

import { EventEmitter } from 'events';

// ===================== TYPES =====================

export interface FormatterResult<T = unknown> {
  success: boolean;
  value: T;
  originalValue: unknown;
  formatterType: string;
  operation: string;
  error?: string;
}

export interface TextFormatterOptions {
  text: string;
  find?: string;
  replace?: string;
  start?: number;
  end?: number;
  length?: number;
  separator?: string;
  padChar?: string;
  padLength?: number;
  segment?: number;
  chars?: string;
  trimWhitespace?: boolean;
  inputFormat?: string;
  outputFormat?: string;
}

export interface NumberFormatterOptions {
  value: number | string;
  decimalPlaces?: number;
  thousandsSeparator?: string;
  decimalSeparator?: string;
  currencySymbol?: string;
  currencyPosition?: 'before' | 'after';
  roundingMode?: 'round' | 'floor' | 'ceil';
  minValue?: number;
  maxValue?: number;
  format?: string;
}

export interface DateFormatterOptions {
  value: string | Date | number;
  inputFormat?: string;
  outputFormat?: string;
  timezone?: string;
  offset?: { value: number; unit: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years' };
  locale?: string;
}

export interface UtilityFormatterOptions {
  values?: unknown[];
  separator?: string;
  index?: number;
  pick?: string[];
  omit?: string[];
  template?: string;
  data?: Record<string, unknown>;
  randomLength?: number;
  randomType?: 'alphanumeric' | 'numeric' | 'alpha' | 'hex' | 'uuid';
  hashAlgorithm?: 'md5' | 'sha1' | 'sha256' | 'sha512';
  input?: string;
  expression?: string;
  context?: Record<string, unknown>;
}

// ===================== TEXT FORMATTER =====================

export class TextFormatter extends EventEmitter {

  /**
   * Capitalize first letter of text
   */
  capitalize(options: TextFormatterOptions): FormatterResult<string> {
    const { text } = options;
    try {
      const result = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
      return this.success(result, text, 'text', 'capitalize');
    } catch (error) {
      return this.error(text, 'text', 'capitalize', error);
    }
  }

  /**
   * Convert text to uppercase
   */
  uppercase(options: TextFormatterOptions): FormatterResult<string> {
    const { text } = options;
    try {
      return this.success(text.toUpperCase(), text, 'text', 'uppercase');
    } catch (error) {
      return this.error(text, 'text', 'uppercase', error);
    }
  }

  /**
   * Convert text to lowercase
   */
  lowercase(options: TextFormatterOptions): FormatterResult<string> {
    const { text } = options;
    try {
      return this.success(text.toLowerCase(), text, 'text', 'lowercase');
    } catch (error) {
      return this.error(text, 'text', 'lowercase', error);
    }
  }

  /**
   * Convert to Title Case
   */
  titleCase(options: TextFormatterOptions): FormatterResult<string> {
    const { text } = options;
    try {
      const result = text.replace(/\w\S*/g, (txt) =>
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      );
      return this.success(result, text, 'text', 'titleCase');
    } catch (error) {
      return this.error(text, 'text', 'titleCase', error);
    }
  }

  /**
   * Replace text occurrences
   */
  replace(options: TextFormatterOptions): FormatterResult<string> {
    const { text, find = '', replace: replaceWith = '' } = options;
    try {
      const result = text.split(find).join(replaceWith);
      return this.success(result, text, 'text', 'replace');
    } catch (error) {
      return this.error(text, 'text', 'replace', error);
    }
  }

  /**
   * Replace with regex
   */
  replaceRegex(options: TextFormatterOptions & { pattern: string; flags?: string }): FormatterResult<string> {
    const { text, pattern, flags = 'g', replace: replaceWith = '' } = options;
    try {
      const regex = new RegExp(pattern, flags);
      const result = text.replace(regex, replaceWith);
      return this.success(result, text, 'text', 'replaceRegex');
    } catch (error) {
      return this.error(text, 'text', 'replaceRegex', error);
    }
  }

  /**
   * Extract substring
   */
  substring(options: TextFormatterOptions): FormatterResult<string> {
    const { text, start = 0, end } = options;
    try {
      const result = end !== undefined ? text.substring(start, end) : text.substring(start);
      return this.success(result, text, 'text', 'substring');
    } catch (error) {
      return this.error(text, 'text', 'substring', error);
    }
  }

  /**
   * Truncate text to length
   */
  truncate(options: TextFormatterOptions & { suffix?: string }): FormatterResult<string> {
    const { text, length = 100, suffix = '...' } = options;
    try {
      if (text.length <= length) {
        return this.success(text, text, 'text', 'truncate');
      }
      const result = text.substring(0, length - suffix.length) + suffix;
      return this.success(result, text, 'text', 'truncate');
    } catch (error) {
      return this.error(text, 'text', 'truncate', error);
    }
  }

  /**
   * Trim whitespace
   */
  trim(options: TextFormatterOptions): FormatterResult<string> {
    const { text } = options;
    try {
      return this.success(text.trim(), text, 'text', 'trim');
    } catch (error) {
      return this.error(text, 'text', 'trim', error);
    }
  }

  /**
   * Split text into array
   */
  split(options: TextFormatterOptions): FormatterResult<string[]> {
    const { text, separator = ',' } = options;
    try {
      const result = text.split(separator).map(s => s.trim());
      return this.success(result, text, 'text', 'split');
    } catch (error) {
      return this.error(text, 'text', 'split', error);
    }
  }

  /**
   * Get specific segment after split
   */
  splitGetSegment(options: TextFormatterOptions): FormatterResult<string> {
    const { text, separator = ',', segment = 0 } = options;
    try {
      const parts = text.split(separator).map(s => s.trim());
      const result = parts[segment] || '';
      return this.success(result, text, 'text', 'splitGetSegment');
    } catch (error) {
      return this.error(text, 'text', 'splitGetSegment', error);
    }
  }

  /**
   * Get length of text
   */
  length(options: TextFormatterOptions): FormatterResult<number> {
    const { text } = options;
    try {
      return this.success(text.length, text, 'text', 'length');
    } catch (error) {
      return this.error(text, 'text', 'length', error);
    }
  }

  /**
   * Pad text on left
   */
  padLeft(options: TextFormatterOptions): FormatterResult<string> {
    const { text, padChar = ' ', padLength = 10 } = options;
    try {
      const result = text.padStart(padLength, padChar);
      return this.success(result, text, 'text', 'padLeft');
    } catch (error) {
      return this.error(text, 'text', 'padLeft', error);
    }
  }

  /**
   * Pad text on right
   */
  padRight(options: TextFormatterOptions): FormatterResult<string> {
    const { text, padChar = ' ', padLength = 10 } = options;
    try {
      const result = text.padEnd(padLength, padChar);
      return this.success(result, text, 'text', 'padRight');
    } catch (error) {
      return this.error(text, 'text', 'padRight', error);
    }
  }

  /**
   * Remove HTML tags
   */
  stripHtml(options: TextFormatterOptions): FormatterResult<string> {
    const { text } = options;
    try {
      const result = text.replace(/<[^>]*>/g, '');
      return this.success(result, text, 'text', 'stripHtml');
    } catch (error) {
      return this.error(text, 'text', 'stripHtml', error);
    }
  }

  /**
   * Encode URL
   */
  urlEncode(options: TextFormatterOptions): FormatterResult<string> {
    const { text } = options;
    try {
      const result = encodeURIComponent(text);
      return this.success(result, text, 'text', 'urlEncode');
    } catch (error) {
      return this.error(text, 'text', 'urlEncode', error);
    }
  }

  /**
   * Decode URL
   */
  urlDecode(options: TextFormatterOptions): FormatterResult<string> {
    const { text } = options;
    try {
      const result = decodeURIComponent(text);
      return this.success(result, text, 'text', 'urlDecode');
    } catch (error) {
      return this.error(text, 'text', 'urlDecode', error);
    }
  }

  /**
   * Base64 encode
   */
  base64Encode(options: TextFormatterOptions): FormatterResult<string> {
    const { text } = options;
    try {
      const result = Buffer.from(text).toString('base64');
      return this.success(result, text, 'text', 'base64Encode');
    } catch (error) {
      return this.error(text, 'text', 'base64Encode', error);
    }
  }

  /**
   * Base64 decode
   */
  base64Decode(options: TextFormatterOptions): FormatterResult<string> {
    const { text } = options;
    try {
      const result = Buffer.from(text, 'base64').toString('utf-8');
      return this.success(result, text, 'text', 'base64Decode');
    } catch (error) {
      return this.error(text, 'text', 'base64Decode', error);
    }
  }

  /**
   * Extract email from text
   */
  extractEmail(options: TextFormatterOptions): FormatterResult<string | null> {
    const { text } = options;
    try {
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
      const match = text.match(emailRegex);
      return this.success(match ? match[0] : null, text, 'text', 'extractEmail');
    } catch (error) {
      return this.error(text, 'text', 'extractEmail', error);
    }
  }

  /**
   * Extract phone number from text
   */
  extractPhone(options: TextFormatterOptions): FormatterResult<string | null> {
    const { text } = options;
    try {
      const phoneRegex = /[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,3}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}/;
      const match = text.match(phoneRegex);
      return this.success(match ? match[0] : null, text, 'text', 'extractPhone');
    } catch (error) {
      return this.error(text, 'text', 'extractPhone', error);
    }
  }

  /**
   * Extract URL from text
   */
  extractUrl(options: TextFormatterOptions): FormatterResult<string | null> {
    const { text } = options;
    try {
      const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/;
      const match = text.match(urlRegex);
      return this.success(match ? match[0] : null, text, 'text', 'extractUrl');
    } catch (error) {
      return this.error(text, 'text', 'extractUrl', error);
    }
  }

  /**
   * Convert to slug
   */
  slugify(options: TextFormatterOptions): FormatterResult<string> {
    const { text } = options;
    try {
      const result = text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
      return this.success(result, text, 'text', 'slugify');
    } catch (error) {
      return this.error(text, 'text', 'slugify', error);
    }
  }

  /**
   * Count words
   */
  wordCount(options: TextFormatterOptions): FormatterResult<number> {
    const { text } = options;
    try {
      const words = text.trim().split(/\s+/).filter(w => w.length > 0);
      return this.success(words.length, text, 'text', 'wordCount');
    } catch (error) {
      return this.error(text, 'text', 'wordCount', error);
    }
  }

  /**
   * Reverse text
   */
  reverse(options: TextFormatterOptions): FormatterResult<string> {
    const { text } = options;
    try {
      const result = text.split('').reverse().join('');
      return this.success(result, text, 'text', 'reverse');
    } catch (error) {
      return this.error(text, 'text', 'reverse', error);
    }
  }

  private success<T>(value: T, original: unknown, type: string, op: string): FormatterResult<T> {
    this.emit('format', { type, operation: op, success: true, value });
    return { success: true, value, originalValue: original, formatterType: type, operation: op };
  }

  private error<T>(original: unknown, type: string, op: string, error: unknown): FormatterResult<T> {
    const message = error instanceof Error ? error.message : String(error);
    this.emit('error', { type, operation: op, error: message });
    return {
      success: false,
      value: undefined as unknown as T,
      originalValue: original,
      formatterType: type,
      operation: op,
      error: message
    };
  }
}

// ===================== NUMBER FORMATTER =====================

export class NumberFormatter extends EventEmitter {

  /**
   * Format number with decimals
   */
  formatDecimals(options: NumberFormatterOptions): FormatterResult<string> {
    const { value, decimalPlaces = 2 } = options;
    try {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      const result = num.toFixed(decimalPlaces);
      return this.success(result, value, 'number', 'formatDecimals');
    } catch (error) {
      return this.error(value, 'number', 'formatDecimals', error);
    }
  }

  /**
   * Format as currency
   */
  formatCurrency(options: NumberFormatterOptions): FormatterResult<string> {
    const {
      value,
      currencySymbol = '$',
      currencyPosition = 'before',
      decimalPlaces = 2,
      thousandsSeparator = ','
    } = options;
    try {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      const formatted = this.addThousandsSeparator(num.toFixed(decimalPlaces), thousandsSeparator);
      const result = currencyPosition === 'before'
        ? `${currencySymbol}${formatted}`
        : `${formatted}${currencySymbol}`;
      return this.success(result, value, 'number', 'formatCurrency');
    } catch (error) {
      return this.error(value, 'number', 'formatCurrency', error);
    }
  }

  /**
   * Format with thousands separator
   */
  formatThousands(options: NumberFormatterOptions): FormatterResult<string> {
    const { value, thousandsSeparator = ',', decimalSeparator = '.' } = options;
    try {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      const result = this.addThousandsSeparator(num.toString(), thousandsSeparator, decimalSeparator);
      return this.success(result, value, 'number', 'formatThousands');
    } catch (error) {
      return this.error(value, 'number', 'formatThousands', error);
    }
  }

  /**
   * Format as percentage
   */
  formatPercentage(options: NumberFormatterOptions): FormatterResult<string> {
    const { value, decimalPlaces = 0 } = options;
    try {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      const result = `${(num * 100).toFixed(decimalPlaces)}%`;
      return this.success(result, value, 'number', 'formatPercentage');
    } catch (error) {
      return this.error(value, 'number', 'formatPercentage', error);
    }
  }

  /**
   * Round number
   */
  round(options: NumberFormatterOptions): FormatterResult<number> {
    const { value, roundingMode = 'round', decimalPlaces = 0 } = options;
    try {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      const multiplier = Math.pow(10, decimalPlaces);
      let result: number;
      switch (roundingMode) {
        case 'floor':
          result = Math.floor(num * multiplier) / multiplier;
          break;
        case 'ceil':
          result = Math.ceil(num * multiplier) / multiplier;
          break;
        default:
          result = Math.round(num * multiplier) / multiplier;
      }
      return this.success(result, value, 'number', 'round');
    } catch (error) {
      return this.error(value, 'number', 'round', error);
    }
  }

  /**
   * Get absolute value
   */
  abs(options: NumberFormatterOptions): FormatterResult<number> {
    const { value } = options;
    try {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      return this.success(Math.abs(num), value, 'number', 'abs');
    } catch (error) {
      return this.error(value, 'number', 'abs', error);
    }
  }

  /**
   * Clamp number between min and max
   */
  clamp(options: NumberFormatterOptions): FormatterResult<number> {
    const { value, minValue = 0, maxValue = 100 } = options;
    try {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      const result = Math.max(minValue, Math.min(maxValue, num));
      return this.success(result, value, 'number', 'clamp');
    } catch (error) {
      return this.error(value, 'number', 'clamp', error);
    }
  }

  /**
   * Convert to integer
   */
  toInteger(options: NumberFormatterOptions): FormatterResult<number> {
    const { value } = options;
    try {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      return this.success(Math.trunc(num), value, 'number', 'toInteger');
    } catch (error) {
      return this.error(value, 'number', 'toInteger', error);
    }
  }

  /**
   * Perform math operation
   */
  mathOperation(options: NumberFormatterOptions & {
    operator: '+' | '-' | '*' | '/' | '%' | '^';
    operand: number
  }): FormatterResult<number> {
    const { value, operator, operand } = options;
    try {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      let result: number;
      switch (operator) {
        case '+': result = num + operand; break;
        case '-': result = num - operand; break;
        case '*': result = num * operand; break;
        case '/': result = num / operand; break;
        case '%': result = num % operand; break;
        case '^': result = Math.pow(num, operand); break;
        default: result = num;
      }
      return this.success(result, value, 'number', 'mathOperation');
    } catch (error) {
      return this.error(value, 'number', 'mathOperation', error);
    }
  }

  /**
   * Parse number from string
   */
  parse(options: NumberFormatterOptions): FormatterResult<number> {
    const { value } = options;
    try {
      const cleaned = String(value).replace(/[^0-9.-]/g, '');
      const result = parseFloat(cleaned);
      if (isNaN(result)) {
        throw new Error('Invalid number');
      }
      return this.success(result, value, 'number', 'parse');
    } catch (error) {
      return this.error(value, 'number', 'parse', error);
    }
  }

  /**
   * Random number between min and max
   */
  random(options: NumberFormatterOptions): FormatterResult<number> {
    const { minValue = 0, maxValue = 100 } = options;
    try {
      const result = Math.random() * (maxValue - minValue) + minValue;
      return this.success(result, null, 'number', 'random');
    } catch (error) {
      return this.error(null, 'number', 'random', error);
    }
  }

  /**
   * Convert to ordinal (1st, 2nd, 3rd, etc.)
   */
  toOrdinal(options: NumberFormatterOptions): FormatterResult<string> {
    const { value } = options;
    try {
      const num = typeof value === 'string' ? parseInt(value, 10) : Math.floor(value);
      const suffixes = ['th', 'st', 'nd', 'rd'];
      const v = num % 100;
      const suffix = suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
      return this.success(`${num}${suffix}`, value, 'number', 'toOrdinal');
    } catch (error) {
      return this.error(value, 'number', 'toOrdinal', error);
    }
  }

  /**
   * Convert to words
   */
  toWords(options: NumberFormatterOptions): FormatterResult<string> {
    const { value } = options;
    try {
      const num = typeof value === 'string' ? parseInt(value, 10) : Math.floor(value);
      const result = this.numberToWords(num);
      return this.success(result, value, 'number', 'toWords');
    } catch (error) {
      return this.error(value, 'number', 'toWords', error);
    }
  }

  private addThousandsSeparator(numStr: string, separator: string, decSeparator: string = '.'): string {
    const parts = numStr.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    return parts.join(decSeparator);
  }

  private numberToWords(num: number): string {
    if (num === 0) return 'zero';
    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
      'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? '-' + ones[num % 10] : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' hundred' + (num % 100 ? ' ' + this.numberToWords(num % 100) : '');
    if (num < 1000000) return this.numberToWords(Math.floor(num / 1000)) + ' thousand' + (num % 1000 ? ' ' + this.numberToWords(num % 1000) : '');
    return 'large number';
  }

  private success<T>(value: T, original: unknown, type: string, op: string): FormatterResult<T> {
    this.emit('format', { type, operation: op, success: true, value });
    return { success: true, value, originalValue: original, formatterType: type, operation: op };
  }

  private error<T>(original: unknown, type: string, op: string, error: unknown): FormatterResult<T> {
    const message = error instanceof Error ? error.message : String(error);
    this.emit('error', { type, operation: op, error: message });
    return {
      success: false,
      value: undefined as unknown as T,
      originalValue: original,
      formatterType: type,
      operation: op,
      error: message
    };
  }
}

// ===================== DATE FORMATTER =====================

export class DateFormatter extends EventEmitter {

  /**
   * Parse date from string
   */
  parse(options: DateFormatterOptions): FormatterResult<Date> {
    const { value } = options;
    try {
      let date: Date;
      if (value instanceof Date) {
        date = value;
      } else if (typeof value === 'number') {
        date = new Date(value);
      } else {
        date = new Date(value);
      }
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }
      return this.success(date, value, 'date', 'parse');
    } catch (error) {
      return this.error(value, 'date', 'parse', error);
    }
  }

  /**
   * Format date to string
   */
  format(options: DateFormatterOptions): FormatterResult<string> {
    const { value, outputFormat = 'YYYY-MM-DD' } = options;
    try {
      const date = this.toDate(value);
      const result = this.formatDate(date, outputFormat);
      return this.success(result, value, 'date', 'format');
    } catch (error) {
      return this.error(value, 'date', 'format', error);
    }
  }

  /**
   * Add time to date
   */
  add(options: DateFormatterOptions): FormatterResult<Date> {
    const { value, offset } = options;
    if (!offset) {
      return this.error(value, 'date', 'add', new Error('Offset is required'));
    }
    try {
      const date = this.toDate(value);
      const result = this.addOffset(date, offset.value, offset.unit);
      return this.success(result, value, 'date', 'add');
    } catch (error) {
      return this.error(value, 'date', 'add', error);
    }
  }

  /**
   * Subtract time from date
   */
  subtract(options: DateFormatterOptions): FormatterResult<Date> {
    const { value, offset } = options;
    if (!offset) {
      return this.error(value, 'date', 'subtract', new Error('Offset is required'));
    }
    try {
      const date = this.toDate(value);
      const result = this.addOffset(date, -offset.value, offset.unit);
      return this.success(result, value, 'date', 'subtract');
    } catch (error) {
      return this.error(value, 'date', 'subtract', error);
    }
  }

  /**
   * Get difference between dates
   */
  diff(options: DateFormatterOptions & {
    compareDate: string | Date | number;
    unit?: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';
  }): FormatterResult<number> {
    const { value, compareDate, unit = 'days' } = options;
    try {
      const date1 = this.toDate(value);
      const date2 = this.toDate(compareDate);
      const diffMs = date2.getTime() - date1.getTime();

      let result: number;
      switch (unit) {
        case 'seconds': result = diffMs / 1000; break;
        case 'minutes': result = diffMs / (1000 * 60); break;
        case 'hours': result = diffMs / (1000 * 60 * 60); break;
        case 'days': result = diffMs / (1000 * 60 * 60 * 24); break;
        case 'weeks': result = diffMs / (1000 * 60 * 60 * 24 * 7); break;
        case 'months': result = diffMs / (1000 * 60 * 60 * 24 * 30); break;
        case 'years': result = diffMs / (1000 * 60 * 60 * 24 * 365); break;
        default: result = diffMs;
      }
      return this.success(Math.floor(result), value, 'date', 'diff');
    } catch (error) {
      return this.error(value, 'date', 'diff', error);
    }
  }

  /**
   * Get start of period
   */
  startOf(options: DateFormatterOptions & {
    period: 'day' | 'week' | 'month' | 'year';
  }): FormatterResult<Date> {
    const { value, period } = options;
    try {
      const date = this.toDate(value);
      const result = new Date(date);

      switch (period) {
        case 'day':
          result.setHours(0, 0, 0, 0);
          break;
        case 'week':
          const day = result.getDay();
          result.setDate(result.getDate() - day);
          result.setHours(0, 0, 0, 0);
          break;
        case 'month':
          result.setDate(1);
          result.setHours(0, 0, 0, 0);
          break;
        case 'year':
          result.setMonth(0, 1);
          result.setHours(0, 0, 0, 0);
          break;
      }
      return this.success(result, value, 'date', 'startOf');
    } catch (error) {
      return this.error(value, 'date', 'startOf', error);
    }
  }

  /**
   * Get end of period
   */
  endOf(options: DateFormatterOptions & {
    period: 'day' | 'week' | 'month' | 'year';
  }): FormatterResult<Date> {
    const { value, period } = options;
    try {
      const date = this.toDate(value);
      const result = new Date(date);

      switch (period) {
        case 'day':
          result.setHours(23, 59, 59, 999);
          break;
        case 'week':
          const day = result.getDay();
          result.setDate(result.getDate() + (6 - day));
          result.setHours(23, 59, 59, 999);
          break;
        case 'month':
          result.setMonth(result.getMonth() + 1, 0);
          result.setHours(23, 59, 59, 999);
          break;
        case 'year':
          result.setMonth(11, 31);
          result.setHours(23, 59, 59, 999);
          break;
      }
      return this.success(result, value, 'date', 'endOf');
    } catch (error) {
      return this.error(value, 'date', 'endOf', error);
    }
  }

  /**
   * Get relative time string
   */
  relative(options: DateFormatterOptions): FormatterResult<string> {
    const { value } = options;
    try {
      const date = this.toDate(value);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.abs(diffMs / 1000);
      const past = diffMs > 0;

      let result: string;
      if (diffSecs < 60) {
        result = past ? 'just now' : 'in a moment';
      } else if (diffSecs < 3600) {
        const mins = Math.floor(diffSecs / 60);
        result = past ? `${mins} minute${mins > 1 ? 's' : ''} ago` : `in ${mins} minute${mins > 1 ? 's' : ''}`;
      } else if (diffSecs < 86400) {
        const hours = Math.floor(diffSecs / 3600);
        result = past ? `${hours} hour${hours > 1 ? 's' : ''} ago` : `in ${hours} hour${hours > 1 ? 's' : ''}`;
      } else if (diffSecs < 604800) {
        const days = Math.floor(diffSecs / 86400);
        result = past ? `${days} day${days > 1 ? 's' : ''} ago` : `in ${days} day${days > 1 ? 's' : ''}`;
      } else if (diffSecs < 2592000) {
        const weeks = Math.floor(diffSecs / 604800);
        result = past ? `${weeks} week${weeks > 1 ? 's' : ''} ago` : `in ${weeks} week${weeks > 1 ? 's' : ''}`;
      } else if (diffSecs < 31536000) {
        const months = Math.floor(diffSecs / 2592000);
        result = past ? `${months} month${months > 1 ? 's' : ''} ago` : `in ${months} month${months > 1 ? 's' : ''}`;
      } else {
        const years = Math.floor(diffSecs / 31536000);
        result = past ? `${years} year${years > 1 ? 's' : ''} ago` : `in ${years} year${years > 1 ? 's' : ''}`;
      }
      return this.success(result, value, 'date', 'relative');
    } catch (error) {
      return this.error(value, 'date', 'relative', error);
    }
  }

  /**
   * Convert to ISO string
   */
  toISO(options: DateFormatterOptions): FormatterResult<string> {
    const { value } = options;
    try {
      const date = this.toDate(value);
      return this.success(date.toISOString(), value, 'date', 'toISO');
    } catch (error) {
      return this.error(value, 'date', 'toISO', error);
    }
  }

  /**
   * Convert to Unix timestamp
   */
  toUnix(options: DateFormatterOptions): FormatterResult<number> {
    const { value } = options;
    try {
      const date = this.toDate(value);
      return this.success(Math.floor(date.getTime() / 1000), value, 'date', 'toUnix');
    } catch (error) {
      return this.error(value, 'date', 'toUnix', error);
    }
  }

  /**
   * Get now
   */
  now(): FormatterResult<Date> {
    return this.success(new Date(), null, 'date', 'now');
  }

  /**
   * Check if date is valid
   */
  isValid(options: DateFormatterOptions): FormatterResult<boolean> {
    const { value } = options;
    try {
      const date = this.toDate(value);
      return this.success(!isNaN(date.getTime()), value, 'date', 'isValid');
    } catch {
      return this.success(false, value, 'date', 'isValid');
    }
  }

  /**
   * Get day of week
   */
  dayOfWeek(options: DateFormatterOptions): FormatterResult<string> {
    const { value } = options;
    try {
      const date = this.toDate(value);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return this.success(days[date.getDay()], value, 'date', 'dayOfWeek');
    } catch (error) {
      return this.error(value, 'date', 'dayOfWeek', error);
    }
  }

  private toDate(value: string | Date | number): Date {
    if (value instanceof Date) return value;
    if (typeof value === 'number') return new Date(value);
    return new Date(value);
  }

  private addOffset(date: Date, value: number, unit: string): Date {
    const result = new Date(date);
    switch (unit) {
      case 'seconds': result.setSeconds(result.getSeconds() + value); break;
      case 'minutes': result.setMinutes(result.getMinutes() + value); break;
      case 'hours': result.setHours(result.getHours() + value); break;
      case 'days': result.setDate(result.getDate() + value); break;
      case 'weeks': result.setDate(result.getDate() + (value * 7)); break;
      case 'months': result.setMonth(result.getMonth() + value); break;
      case 'years': result.setFullYear(result.getFullYear() + value); break;
    }
    return result;
  }

  private formatDate(date: Date, format: string): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const replacements: Record<string, string> = {
      'YYYY': date.getFullYear().toString(),
      'YY': date.getFullYear().toString().slice(-2),
      'MM': pad(date.getMonth() + 1),
      'M': (date.getMonth() + 1).toString(),
      'DD': pad(date.getDate()),
      'D': date.getDate().toString(),
      'HH': pad(date.getHours()),
      'H': date.getHours().toString(),
      'hh': pad(date.getHours() % 12 || 12),
      'h': (date.getHours() % 12 || 12).toString(),
      'mm': pad(date.getMinutes()),
      'm': date.getMinutes().toString(),
      'ss': pad(date.getSeconds()),
      's': date.getSeconds().toString(),
      'A': date.getHours() >= 12 ? 'PM' : 'AM',
      'a': date.getHours() >= 12 ? 'pm' : 'am',
    };

    let result = format;
    for (const [key, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(key, 'g'), value);
    }
    return result;
  }

  private success<T>(value: T, original: unknown, type: string, op: string): FormatterResult<T> {
    this.emit('format', { type, operation: op, success: true, value });
    return { success: true, value, originalValue: original, formatterType: type, operation: op };
  }

  private error<T>(original: unknown, type: string, op: string, error: unknown): FormatterResult<T> {
    const message = error instanceof Error ? error.message : String(error);
    this.emit('error', { type, operation: op, error: message });
    return {
      success: false,
      value: undefined as unknown as T,
      originalValue: original,
      formatterType: type,
      operation: op,
      error: message
    };
  }
}

// ===================== UTILITY FORMATTER =====================

export class UtilityFormatter extends EventEmitter {
  private crypto = require('crypto');

  /**
   * Generate UUID
   */
  uuid(): FormatterResult<string> {
    try {
      const uuid = this.crypto.randomUUID();
      return this.success(uuid, null, 'utility', 'uuid');
    } catch (error) {
      return this.error(null, 'utility', 'uuid', error);
    }
  }

  /**
   * Generate random string
   */
  randomString(options: UtilityFormatterOptions): FormatterResult<string> {
    const { randomLength = 16, randomType = 'alphanumeric' } = options;
    try {
      let chars: string;
      switch (randomType) {
        case 'numeric': chars = '0123456789'; break;
        case 'alpha': chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'; break;
        case 'hex': chars = '0123456789abcdef'; break;
        case 'uuid': return this.uuid();
        default: chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      }

      let result = '';
      for (let i = 0; i < randomLength; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return this.success(result, null, 'utility', 'randomString');
    } catch (error) {
      return this.error(null, 'utility', 'randomString', error);
    }
  }

  /**
   * Hash string
   */
  hash(options: UtilityFormatterOptions): FormatterResult<string> {
    const { input = '', hashAlgorithm = 'sha256' } = options;
    try {
      const hash = this.crypto.createHash(hashAlgorithm).update(input).digest('hex');
      return this.success(hash, input, 'utility', 'hash');
    } catch (error) {
      return this.error(input, 'utility', 'hash', error);
    }
  }

  /**
   * Pick fields from object
   */
  pick(options: UtilityFormatterOptions & { data: Record<string, unknown> }): FormatterResult<Record<string, unknown>> {
    const { data, pick: fields = [] } = options;
    try {
      const result: Record<string, unknown> = {};
      for (const field of fields) {
        if (field in data) {
          result[field] = data[field];
        }
      }
      return this.success(result, data, 'utility', 'pick');
    } catch (error) {
      return this.error(data, 'utility', 'pick', error);
    }
  }

  /**
   * Omit fields from object
   */
  omit(options: UtilityFormatterOptions & { data: Record<string, unknown> }): FormatterResult<Record<string, unknown>> {
    const { data, omit: fields = [] } = options;
    try {
      const result = { ...data };
      for (const field of fields) {
        delete result[field];
      }
      return this.success(result, data, 'utility', 'omit');
    } catch (error) {
      return this.error(data, 'utility', 'omit', error);
    }
  }

  /**
   * Join array to string
   */
  join(options: UtilityFormatterOptions): FormatterResult<string> {
    const { values = [], separator = ', ' } = options;
    try {
      const result = values.map(v => String(v)).join(separator);
      return this.success(result, values, 'utility', 'join');
    } catch (error) {
      return this.error(values, 'utility', 'join', error);
    }
  }

  /**
   * Get item at index
   */
  getAtIndex(options: UtilityFormatterOptions): FormatterResult<unknown> {
    const { values = [], index = 0 } = options;
    try {
      const result = values[index];
      return this.success(result, values, 'utility', 'getAtIndex');
    } catch (error) {
      return this.error(values, 'utility', 'getAtIndex', error);
    }
  }

  /**
   * Get first item
   */
  first(options: UtilityFormatterOptions): FormatterResult<unknown> {
    const { values = [] } = options;
    return this.success(values[0], values, 'utility', 'first');
  }

  /**
   * Get last item
   */
  last(options: UtilityFormatterOptions): FormatterResult<unknown> {
    const { values = [] } = options;
    return this.success(values[values.length - 1], values, 'utility', 'last');
  }

  /**
   * Check if empty
   */
  isEmpty(options: UtilityFormatterOptions & { data: unknown }): FormatterResult<boolean> {
    const { data } = options;
    try {
      let isEmpty = false;
      if (data === null || data === undefined) {
        isEmpty = true;
      } else if (typeof data === 'string') {
        isEmpty = data.trim().length === 0;
      } else if (Array.isArray(data)) {
        isEmpty = data.length === 0;
      } else if (typeof data === 'object') {
        isEmpty = Object.keys(data as object).length === 0;
      }
      return this.success(isEmpty, data, 'utility', 'isEmpty');
    } catch (error) {
      return this.error(data, 'utility', 'isEmpty', error);
    }
  }

  /**
   * Coalesce - return first non-null value
   */
  coalesce(options: UtilityFormatterOptions): FormatterResult<unknown> {
    const { values = [] } = options;
    try {
      const result = values.find(v => v !== null && v !== undefined);
      return this.success(result, values, 'utility', 'coalesce');
    } catch (error) {
      return this.error(values, 'utility', 'coalesce', error);
    }
  }

  /**
   * Default value if empty
   */
  defaultValue(options: UtilityFormatterOptions & {
    data: unknown;
    defaultVal: unknown
  }): FormatterResult<unknown> {
    const { data, defaultVal } = options;
    try {
      if (data === null || data === undefined || data === '') {
        return this.success(defaultVal, data, 'utility', 'defaultValue');
      }
      return this.success(data, data, 'utility', 'defaultValue');
    } catch (error) {
      return this.error(data, 'utility', 'defaultValue', error);
    }
  }

  /**
   * Render template string
   */
  template(options: UtilityFormatterOptions): FormatterResult<string> {
    const { template = '', data = {} } = options;
    try {
      let result = template;
      for (const [key, value] of Object.entries(data)) {
        result = result.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), String(value));
      }
      return this.success(result, template, 'utility', 'template');
    } catch (error) {
      return this.error(template, 'utility', 'template', error);
    }
  }

  /**
   * Convert to JSON string
   */
  toJson(options: UtilityFormatterOptions & { data: unknown }): FormatterResult<string> {
    const { data } = options;
    try {
      const result = JSON.stringify(data, null, 2);
      return this.success(result, data, 'utility', 'toJson');
    } catch (error) {
      return this.error(data, 'utility', 'toJson', error);
    }
  }

  /**
   * Parse JSON string
   */
  parseJson(options: UtilityFormatterOptions & { input: string }): FormatterResult<unknown> {
    const { input } = options;
    try {
      const result = JSON.parse(input);
      return this.success(result, input, 'utility', 'parseJson');
    } catch (error) {
      return this.error(input, 'utility', 'parseJson', error);
    }
  }

  /**
   * Type conversion
   */
  convertType(options: UtilityFormatterOptions & {
    data: unknown;
    targetType: 'string' | 'number' | 'boolean' | 'array'
  }): FormatterResult<unknown> {
    const { data, targetType } = options;
    try {
      let result: unknown;
      switch (targetType) {
        case 'string':
          result = String(data);
          break;
        case 'number':
          result = Number(data);
          break;
        case 'boolean':
          result = Boolean(data);
          break;
        case 'array':
          result = Array.isArray(data) ? data : [data];
          break;
        default:
          result = data;
      }
      return this.success(result, data, 'utility', 'convertType');
    } catch (error) {
      return this.error(data, 'utility', 'convertType', error);
    }
  }

  private success<T>(value: T, original: unknown, type: string, op: string): FormatterResult<T> {
    this.emit('format', { type, operation: op, success: true, value });
    return { success: true, value, originalValue: original, formatterType: type, operation: op };
  }

  private error<T>(original: unknown, type: string, op: string, error: unknown): FormatterResult<T> {
    const message = error instanceof Error ? error.message : String(error);
    this.emit('error', { type, operation: op, error: message });
    return {
      success: false,
      value: undefined as unknown as T,
      originalValue: original,
      formatterType: type,
      operation: op,
      error: message
    };
  }
}

// ===================== UNIFIED FORMATTER =====================

export class ZapierFormatters extends EventEmitter {
  public text: TextFormatter;
  public number: NumberFormatter;
  public date: DateFormatter;
  public utility: UtilityFormatter;

  constructor() {
    super();
    this.text = new TextFormatter();
    this.number = new NumberFormatter();
    this.date = new DateFormatter();
    this.utility = new UtilityFormatter();

    // Forward events
    [this.text, this.number, this.date, this.utility].forEach(formatter => {
      formatter.on('format', (data) => this.emit('format', data));
      formatter.on('error', (data) => this.emit('error', data));
    });
  }

  /**
   * Execute a formatter action
   */
  async execute(
    formatterType: 'text' | 'number' | 'date' | 'utility',
    operation: string,
    options: Record<string, unknown>
  ): Promise<FormatterResult<unknown>> {
    const formatter = this[formatterType] as Record<string, (...args: unknown[]) => FormatterResult<unknown>>;
    if (!formatter || typeof formatter[operation] !== 'function') {
      return {
        success: false,
        value: undefined,
        originalValue: options,
        formatterType,
        operation,
        error: `Unknown operation: ${formatterType}.${operation}`
      };
    }

    return formatter[operation](options);
  }
}

// Export singleton
export const formatters = new ZapierFormatters();

// Export factory function
export function createFormatters(): ZapierFormatters {
  return new ZapierFormatters();
}
