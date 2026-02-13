/**
 * Data Transformers Library
 * Built-in transformers for common data transformation tasks
 * AGENT 2 - DATA TRANSFORMATION & EXPRESSION ENGINE
 */

import { logger } from '../services/SimpleLogger';

/**
 * CSV to JSON Transformer
 */
export class CSVTransformer {
  /**
   * Parse CSV string to JSON array
   */
  static parse(csvString: string, options: {
    delimiter?: string;
    hasHeaders?: boolean;
    skipEmptyLines?: boolean;
  } = {}): Record<string, any>[] {
    const {
      delimiter = ',',
      hasHeaders = true,
      skipEmptyLines = true
    } = options;

    try {
      const lines = csvString
        .split('\n')
        .map(line => line.trim())
        .filter(line => !skipEmptyLines || line.length > 0);

      if (lines.length === 0) {
        return [];
      }

      // Parse CSV line with proper handling of quoted values
      const parseLine = (line: string): string[] => {
        const values: string[] = [];
        let currentValue = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];

          if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
              // Escaped quote
              currentValue += '"';
              i++;
            } else {
              // Toggle quotes
              inQuotes = !inQuotes;
            }
          } else if (char === delimiter && !inQuotes) {
            // End of value
            values.push(currentValue.trim());
            currentValue = '';
          } else {
            currentValue += char;
          }
        }

        // Add last value
        values.push(currentValue.trim());
        return values;
      };

      const headers = hasHeaders
        ? parseLine(lines[0])
        : lines[0].split(delimiter).map((_, i) => `column_${i + 1}`);

      const dataLines = hasHeaders ? lines.slice(1) : lines;

      return dataLines.map(line => {
        const values = parseLine(line);
        const obj: Record<string, any> = {};

        headers.forEach((header, index) => {
          const value = values[index] || '';
          // Try to parse numbers
          const numValue = Number(value);
          obj[header] = !isNaN(numValue) && value !== '' ? numValue : value;
        });

        return obj;
      });
    } catch (error) {
      logger.error('CSV parsing failed', { error });
      throw new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert JSON array to CSV string
   */
  static stringify(data: Record<string, any>[], options: {
    delimiter?: string;
    includeHeaders?: boolean;
    columns?: string[];
  } = {}): string {
    const {
      delimiter = ',',
      includeHeaders = true,
      columns
    } = options;

    try {
      if (data.length === 0) {
        return '';
      }

      // Get columns
      const cols = columns || Object.keys(data[0]);

      // Escape value for CSV
      const escapeValue = (value: any): string => {
        if (value === null || value === undefined) {
          return '';
        }

        const str = String(value);

        // Need quotes if contains delimiter, quotes, or newlines
        if (str.includes(delimiter) || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }

        return str;
      };

      const lines: string[] = [];

      // Add headers
      if (includeHeaders) {
        lines.push(cols.map(col => escapeValue(col)).join(delimiter));
      }

      // Add data
      for (const row of data) {
        const values = cols.map(col => escapeValue(row[col]));
        lines.push(values.join(delimiter));
      }

      return lines.join('\n');
    } catch (error) {
      logger.error('CSV stringification failed', { error });
      throw new Error(`Failed to create CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * XML to JSON Transformer
 * Note: Full XML support requires the 'xml2js' package
 * For production use, install: npm install xml2js
 */
export class XMLTransformer {
  /**
   * Parse XML string to JSON object
   * Basic implementation without xml2js
   */
  static async parse(xmlString: string, options: {
    explicitArray?: boolean;
    mergeAttrs?: boolean;
  } = {}): Promise<any> {
    try {
      // Basic XML to JSON conversion
      // For full XML support, install xml2js package
      logger.warn('XMLTransformer: Using basic parser. Install xml2js for full support.');

      // Simple tag extraction (not production-ready)
      const result: any = {};
      const tagRegex = /<(\w+)>([^<]*)<\/\1>/g;
      let match;

      while ((match = tagRegex.exec(xmlString)) !== null) {
        result[match[1]] = match[2];
      }

      return result;
    } catch (error) {
      logger.error('XML parsing failed', { error });
      throw new Error(`Failed to parse XML: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert JSON object to XML string
   * Basic implementation without xml2js
   */
  static stringify(data: any, options: {
    rootName?: string;
    headless?: boolean;
  } = {}): string {
    const {
      rootName = 'root',
      headless = false
    } = options;

    try {
      logger.warn('XMLTransformer: Using basic builder. Install xml2js for full support.');

      const buildXML = (obj: any, indent: number = 0): string => {
        const spaces = ' '.repeat(indent * 2);
        let xml = '';

        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'object' && !Array.isArray(value)) {
            xml += `${spaces}<${key}>\n${buildXML(value, indent + 1)}${spaces}</${key}>\n`;
          } else {
            xml += `${spaces}<${key}>${value}</${key}>\n`;
          }
        }

        return xml;
      };

      const content = buildXML(data, 1);
      return headless ? content : `<?xml version="1.0" encoding="UTF-8"?>\n<${rootName}>\n${content}</${rootName}>`;
    } catch (error) {
      logger.error('XML stringification failed', { error });
      throw new Error(`Failed to create XML: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Date Formatters
 */
export class DateFormatter {
  /**
   * Format date to string
   */
  static format(date: Date | string | number, format: string = 'yyyy-MM-dd HH:mm:ss'): string {
    const d = new Date(date);

    if (isNaN(d.getTime())) {
      throw new Error('Invalid date');
    }

    const tokens: Record<string, string> = {
      yyyy: d.getFullYear().toString(),
      yy: d.getFullYear().toString().slice(-2),
      MM: String(d.getMonth() + 1).padStart(2, '0'),
      M: String(d.getMonth() + 1),
      dd: String(d.getDate()).padStart(2, '0'),
      d: String(d.getDate()),
      HH: String(d.getHours()).padStart(2, '0'),
      H: String(d.getHours()),
      mm: String(d.getMinutes()).padStart(2, '0'),
      m: String(d.getMinutes()),
      ss: String(d.getSeconds()).padStart(2, '0'),
      s: String(d.getSeconds()),
      SSS: String(d.getMilliseconds()).padStart(3, '0')
    };

    let result = format;
    for (const [token, value] of Object.entries(tokens)) {
      result = result.replace(new RegExp(token, 'g'), value);
    }

    return result;
  }

  /**
   * Parse date string
   */
  static parse(dateString: string, format?: string): Date {
    if (format) {
      // Custom format parsing (simplified)
      // In production, use a library like date-fns
      return new Date(dateString);
    }

    return new Date(dateString);
  }

  /**
   * Convert to ISO string
   */
  static toISO(date: Date | string | number): string {
    return new Date(date).toISOString();
  }

  /**
   * Convert to Unix timestamp
   */
  static toUnix(date: Date | string | number): number {
    return Math.floor(new Date(date).getTime() / 1000);
  }

  /**
   * Add duration to date
   */
  static add(date: Date | string | number, amount: number, unit: 'seconds' | 'minutes' | 'hours' | 'days' | 'months' | 'years'): Date {
    const d = new Date(date);

    switch (unit) {
      case 'seconds':
        d.setSeconds(d.getSeconds() + amount);
        break;
      case 'minutes':
        d.setMinutes(d.getMinutes() + amount);
        break;
      case 'hours':
        d.setHours(d.getHours() + amount);
        break;
      case 'days':
        d.setDate(d.getDate() + amount);
        break;
      case 'months':
        d.setMonth(d.getMonth() + amount);
        break;
      case 'years':
        d.setFullYear(d.getFullYear() + amount);
        break;
    }

    return d;
  }

  /**
   * Get difference between dates
   */
  static diff(date1: Date | string | number, date2: Date | string | number, unit: 'seconds' | 'minutes' | 'hours' | 'days' = 'days'): number {
    const d1 = new Date(date1).getTime();
    const d2 = new Date(date2).getTime();
    const diffMs = d2 - d1;

    switch (unit) {
      case 'seconds':
        return Math.floor(diffMs / 1000);
      case 'minutes':
        return Math.floor(diffMs / (1000 * 60));
      case 'hours':
        return Math.floor(diffMs / (1000 * 60 * 60));
      case 'days':
        return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }
  }
}

/**
 * String Manipulators
 */
export class StringManipulator {
  /**
   * Slugify string (URL-friendly)
   */
  static slugify(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^\w\s-]/g, '') // Remove special chars
      .replace(/[\s_-]+/g, '-') // Replace spaces/underscores with dash
      .replace(/^-+|-+$/g, ''); // Trim dashes
  }

  /**
   * Camel case
   */
  static camelCase(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
  }

  /**
   * Snake case
   */
  static snakeCase(str: string): string {
    return str
      .replace(/\W+/g, ' ')
      .split(/ |\B(?=[A-Z])/)
      .map(word => word.toLowerCase())
      .join('_');
  }

  /**
   * Kebab case
   */
  static kebabCase(str: string): string {
    return str
      .replace(/\W+/g, ' ')
      .split(/ |\B(?=[A-Z])/)
      .map(word => word.toLowerCase())
      .join('-');
  }

  /**
   * Title case
   */
  static titleCase(str: string): string {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Truncate string
   */
  static truncate(str: string, length: number, suffix: string = '...'): string {
    if (str.length <= length) {
      return str;
    }

    return str.slice(0, length - suffix.length) + suffix;
  }

  /**
   * Escape HTML
   */
  static escapeHTML(str: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };

    return str.replace(/[&<>"']/g, char => map[char]);
  }

  /**
   * Unescape HTML
   */
  static unescapeHTML(str: string): string {
    const map: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'"
    };

    return str.replace(/&(amp|lt|gt|quot|#39);/g, entity => map[entity]);
  }

  /**
   * Extract numbers from string
   */
  static extractNumbers(str: string): number[] {
    const matches = str.match(/-?\d+\.?\d*/g);
    return matches ? matches.map(Number) : [];
  }

  /**
   * Remove duplicate words
   */
  static removeDuplicates(str: string): string {
    const words = str.split(' ');
    const unique = [...new Set(words)];
    return unique.join(' ');
  }

  /**
   * Reverse string
   */
  static reverse(str: string): string {
    return str.split('').reverse().join('');
  }
}

/**
 * Number Formatters
 */
export class NumberFormatter {
  /**
   * Format number with thousands separator
   */
  static format(num: number, decimals: number = 0, thousandsSep: string = ',', decimalSep: string = '.'): string {
    const fixed = num.toFixed(decimals);
    const [integer, decimal] = fixed.split('.');

    // Add thousands separator
    const withSeparator = integer.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSep);

    return decimal ? `${withSeparator}${decimalSep}${decimal}` : withSeparator;
  }

  /**
   * Format as currency
   */
  static currency(num: number, symbol: string = '$', decimals: number = 2): string {
    const formatted = this.format(num, decimals);
    return `${symbol}${formatted}`;
  }

  /**
   * Format as percentage
   */
  static percentage(num: number, decimals: number = 2): string {
    return `${(num * 100).toFixed(decimals)}%`;
  }

  /**
   * Format file size
   */
  static fileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Clamp number between min and max
   */
  static clamp(num: number, min: number, max: number): number {
    return Math.min(Math.max(num, min), max);
  }

  /**
   * Map number from one range to another
   */
  static map(num: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
    return (num - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
  }
}

/**
 * Object Transformers
 */
export class ObjectTransformer {
  /**
   * Flatten nested object
   */
  static flatten(obj: Record<string, any>, prefix: string = ''): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(result, this.flatten(value, newKey));
      } else {
        result[newKey] = value;
      }
    }

    return result;
  }

  /**
   * Unflatten flat object to nested
   */
  static unflatten(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const keys = key.split('.');
      let current = result;

      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!(k in current)) {
          current[k] = {};
        }
        current = current[k];
      }

      current[keys[keys.length - 1]] = value;
    }

    return result;
  }

  /**
   * Deep clone object
   */
  static clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Deep merge objects
   */
  static merge(...objects: Record<string, any>[]): Record<string, any> {
    const result: Record<string, any> = {};

    for (const obj of objects) {
      for (const [key, value] of Object.entries(obj)) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          result[key] = this.merge(result[key] || {}, value);
        } else {
          result[key] = value;
        }
      }
    }

    return result;
  }

  /**
   * Remove null/undefined values
   */
  static compact(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && value !== undefined) {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Rename keys
   */
  static renameKeys(obj: Record<string, any>, keyMap: Record<string, string>): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const newKey = keyMap[key] || key;
      result[newKey] = value;
    }

    return result;
  }
}

/**
 * All-in-one transformer utility
 */
export const DataTransformers = {
  csv: CSVTransformer,
  xml: XMLTransformer,
  date: DateFormatter,
  string: StringManipulator,
  number: NumberFormatter,
  object: ObjectTransformer
};

export default DataTransformers;
