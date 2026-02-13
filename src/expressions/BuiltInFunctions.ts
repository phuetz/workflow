/**
 * BuiltInFunctions - n8n-compatible built-in functions for expressions
 *
 * Categories:
 * - String manipulation
 * - Date/Time utilities
 * - Array operations
 * - Object operations
 * - Math utilities
 * - Type conversions
 * - Data validation
 */

/**
 * Generic value type for expression evaluation
 */
export type ExpressionValue = string | number | boolean | null | undefined | Date | Record<string, unknown> | Array<unknown>;

/**
 * Generic object type for expression objects
 */
export type ExpressionObject = Record<string, ExpressionValue>;

/**
 * Array element type
 */
export type ArrayElement = string | number | boolean | null | Record<string, unknown>;

/**
 * String Functions
 */
export const stringFunctions = {
  // Convert to lowercase
  toLowerCase: (str: string): string => String(str).toLowerCase(),

  // Convert to uppercase
  toUpperCase: (str: string): string => String(str).toUpperCase(),

  // Capitalize first letter
  capitalize: (str: string): string => {
    const s = String(str);
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  },

  // Trim whitespace
  trim: (str: string): string => String(str).trim(),

  // Trim start
  trimStart: (str: string): string => String(str).trimStart(),

  // Trim end
  trimEnd: (str: string): string => String(str).trimEnd(),

  // Replace text
  replace: (str: string, search: string | RegExp, replacement: string): string =>
    String(str).replace(search, replacement),

  // Replace all occurrences
  replaceAll: (str: string, search: string, replacement: string): string =>
    String(str).split(search).join(replacement),

  // Split string
  split: (str: string, separator: string | RegExp, limit?: number): string[] =>
    String(str).split(separator, limit),

  // Join array
  join: (arr: ArrayElement[], separator: string = ','): string => arr.join(separator),

  // Substring
  substring: (str: string, start: number, end?: number): string => String(str).substring(start, end),

  // Slice
  slice: (str: string, start: number, end?: number): string => String(str).slice(start, end),

  // Includes
  includes: (str: string, search: string): boolean => String(str).includes(search),

  // Starts with
  startsWith: (str: string, search: string): boolean => String(str).startsWith(search),

  // Ends with
  endsWith: (str: string, search: string): boolean => String(str).endsWith(search),

  // Pad start
  padStart: (str: string, length: number, pad: string = ' '): string =>
    String(str).padStart(length, pad),

  // Pad end
  padEnd: (str: string, length: number, pad: string = ' '): string =>
    String(str).padEnd(length, pad),

  // Repeat
  repeat: (str: string, count: number): string => String(str).repeat(count),

  // Index of
  indexOf: (str: string, search: string, start?: number): number =>
    String(str).indexOf(search, start),

  // Last index of
  lastIndexOf: (str: string, search: string, start?: number): number =>
    String(str).lastIndexOf(search, start),

  // Match regex
  match: (str: string, regex: RegExp): RegExpMatchArray | null => String(str).match(regex),

  // Extract domain from email
  extractDomain: (email: string): string => {
    const match = String(email).match(/@(.+)$/);
    return match ? match[1] : '';
  },

  // Extract email username
  extractEmailUser: (email: string): string => {
    const match = String(email).match(/^([^@]+)@/);
    return match ? match[1] : '';
  },

  // URL encode
  urlEncode: (str: string): string => encodeURIComponent(str),

  // URL decode
  urlDecode: (str: string): string => decodeURIComponent(str),

  // Base64 encode
  base64Encode: (str: string): string => {
    if (typeof btoa !== 'undefined') {
      return btoa(str);
    }
    return Buffer.from(str).toString('base64');
  },

  // Base64 decode
  base64Decode: (str: string): string => {
    if (typeof atob !== 'undefined') {
      return atob(str);
    }
    return Buffer.from(str, 'base64').toString();
  },

  // Hash code (simple hash for strings)
  hashCode: (str: string): number => {
    let hash = 0;
    const s = String(str);
    for (let i = 0; i < s.length; i++) {
      const char = s.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  },
};

/**
 * Date/Time Functions
 */
export const dateFunctions = {
  // Format date to ISO string
  toISOString: (date: Date | string | number): string => new Date(date).toISOString(),

  // Get timestamp
  getTime: (date: Date | string | number): number => new Date(date).getTime(),

  // Format date
  formatDate: (date: Date | string | number, locale: string = 'en-US'): string =>
    new Date(date).toLocaleDateString(locale),

  // Format time
  formatTime: (date: Date | string | number, locale: string = 'en-US'): string =>
    new Date(date).toLocaleTimeString(locale),

  // Format date time
  formatDateTime: (date: Date | string | number, locale: string = 'en-US'): string =>
    new Date(date).toLocaleString(locale),

  // Add days
  addDays: (date: Date | string | number, days: number): Date => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  },

  // Add hours
  addHours: (date: Date | string | number, hours: number): Date => {
    const d = new Date(date);
    d.setHours(d.getHours() + hours);
    return d;
  },

  // Add minutes
  addMinutes: (date: Date | string | number, minutes: number): Date => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() + minutes);
    return d;
  },

  // Difference in days
  diffDays: (date1: Date | string | number, date2: Date | string | number): number => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diff = d2.getTime() - d1.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  },

  // Difference in hours
  diffHours: (date1: Date | string | number, date2: Date | string | number): number => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diff = d2.getTime() - d1.getTime();
    return Math.floor(diff / (1000 * 60 * 60));
  },

  // Is valid date
  isValidDate: (date: ExpressionValue): boolean => {
    const d = new Date(date as string | number | Date);
    return !isNaN(d.getTime());
  },

  // Get year
  getYear: (date: Date | string | number): number => new Date(date).getFullYear(),

  // Get month (1-12)
  getMonth: (date: Date | string | number): number => new Date(date).getMonth() + 1,

  // Get day of month
  getDay: (date: Date | string | number): number => new Date(date).getDate(),

  // Get hours
  getHours: (date: Date | string | number): number => new Date(date).getHours(),

  // Get minutes
  getMinutes: (date: Date | string | number): number => new Date(date).getMinutes(),

  // Get seconds
  getSeconds: (date: Date | string | number): number => new Date(date).getSeconds(),

  // Get day of week (0-6)
  getDayOfWeek: (date: Date | string | number): number => new Date(date).getDay(),
};

/**
 * Array Functions
 */
export const arrayFunctions = {
  // Get length
  length: (arr: ArrayElement[]): number => (Array.isArray(arr) ? arr.length : 0),

  // First element
  first: (arr: ArrayElement[]): ArrayElement | undefined => (Array.isArray(arr) ? arr[0] : undefined),

  // Last element
  last: (arr: ArrayElement[]): ArrayElement | undefined => (Array.isArray(arr) ? arr[arr.length - 1] : undefined),

  // Chunk array
  chunk: (arr: ArrayElement[], size: number): ArrayElement[][] => {
    if (!Array.isArray(arr)) return [];
    const result: ArrayElement[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  },

  // Flatten array
  flatten: (arr: ArrayElement[], depth: number = 1): ArrayElement[] => {
    if (!Array.isArray(arr)) return [];
    return arr.flat(depth) as ArrayElement[];
  },

  // Unique values
  unique: (arr: ArrayElement[]): ArrayElement[] => {
    if (!Array.isArray(arr)) return [];
    return Array.from(new Set(arr));
  },

  // Compact (remove falsy values)
  compact: (arr: ArrayElement[]): ArrayElement[] => {
    if (!Array.isArray(arr)) return [];
    return arr.filter(Boolean) as ArrayElement[];
  },

  // Pluck property from objects
  pluck: (arr: ExpressionObject[], key: string): ArrayElement[] => {
    if (!Array.isArray(arr)) return [];
    return arr.map(item => (item && typeof item === 'object' ? item[key] as ArrayElement : undefined)).filter(Boolean) as ArrayElement[];
  },

  // Sum array
  sum: (arr: number[]): number => {
    if (!Array.isArray(arr)) return 0;
    return arr.reduce((acc, val) => acc + Number(val || 0), 0);
  },

  // Average
  average: (arr: number[]): number => {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    return arrayFunctions.sum(arr) / arr.length;
  },

  // Min value
  min: (arr: number[]): number => {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    return Math.min(...arr.map(Number));
  },

  // Max value
  max: (arr: number[]): number => {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    return Math.max(...arr.map(Number));
  },

  // Sort ascending
  sortAsc: (arr: ArrayElement[]): ArrayElement[] => {
    if (!Array.isArray(arr)) return [];
    return [...arr].sort((a, b) => {
      if (a == null && b == null) return 0;
      if (a == null) return -1;
      if (b == null) return 1;
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    });
  },

  // Sort descending
  sortDesc: (arr: ArrayElement[]): ArrayElement[] => {
    if (!Array.isArray(arr)) return [];
    return [...arr].sort((a, b) => {
      if (a == null && b == null) return 0;
      if (a == null) return 1;
      if (b == null) return -1;
      if (a > b) return -1;
      if (a < b) return 1;
      return 0;
    });
  },

  // Reverse array
  reverse: (arr: ArrayElement[]): ArrayElement[] => {
    if (!Array.isArray(arr)) return [];
    return [...arr].reverse();
  },

  // Intersection
  intersection: (arr1: ArrayElement[], arr2: ArrayElement[]): ArrayElement[] => {
    if (!Array.isArray(arr1) || !Array.isArray(arr2)) return [];
    return arr1.filter(value => arr2.includes(value));
  },

  // Difference
  difference: (arr1: ArrayElement[], arr2: ArrayElement[]): ArrayElement[] => {
    if (!Array.isArray(arr1) || !Array.isArray(arr2)) return arr1 || [];
    return arr1.filter(value => !arr2.includes(value));
  },

  // Union
  union: (arr1: ArrayElement[], arr2: ArrayElement[]): ArrayElement[] => {
    if (!Array.isArray(arr1)) arr1 = [];
    if (!Array.isArray(arr2)) arr2 = [];
    return Array.from(new Set([...arr1, ...arr2]));
  },
};

/**
 * Object Functions
 */
export const objectFunctions = {
  // Get keys
  keys: (obj: ExpressionObject): string[] => {
    if (typeof obj !== 'object' || obj === null) return [];
    return Object.keys(obj);
  },

  // Get values
  values: (obj: ExpressionObject): ExpressionValue[] => {
    if (typeof obj !== 'object' || obj === null) return [];
    return Object.values(obj);
  },

  // Get entries
  entries: (obj: ExpressionObject): [string, ExpressionValue][] => {
    if (typeof obj !== 'object' || obj === null) return [];
    return Object.entries(obj);
  },

  // Has key
  hasKey: (obj: ExpressionObject, key: string): boolean => {
    if (typeof obj !== 'object' || obj === null) return false;
    return Object.prototype.hasOwnProperty.call(obj, key);
  },

  // Get nested value
  get: (obj: ExpressionObject, path: string, defaultValue?: ExpressionValue): ExpressionValue => {
    if (typeof obj !== 'object' || obj === null) return defaultValue;
    const keys = path.split('.');
    let result: ExpressionValue = obj;
    for (const key of keys) {
      if (result === null || result === undefined) return defaultValue;
      if (typeof result === 'object' && result !== null && !Array.isArray(result)) {
        result = (result as Record<string, unknown>)[key] as ExpressionValue;
      } else {
        return defaultValue;
      }
    }
    return result !== undefined ? result : defaultValue;
  },

  // Omit keys
  omit: (obj: ExpressionObject, keys: string[]): ExpressionObject => {
    if (typeof obj !== 'object' || obj === null) return {};
    const result: ExpressionObject = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key) && !keys.includes(key)) {
        result[key] = obj[key];
      }
    }
    return result;
  },

  // Pick keys
  pick: (obj: ExpressionObject, keys: string[]): ExpressionObject => {
    if (typeof obj !== 'object' || obj === null) return {};
    const result: ExpressionObject = {};
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = obj[key];
      }
    }
    return result;
  },

  // Merge objects
  merge: (...objects: ExpressionObject[]): ExpressionObject => {
    return Object.assign({}, ...objects);
  },

  // Deep clone
  clone: (obj: ExpressionValue): ExpressionValue => {
    if (obj === null || typeof obj !== 'object') return obj;
    try {
      return JSON.parse(JSON.stringify(obj)) as ExpressionValue;
    } catch {
      return obj;
    }
  },

  // Is empty
  isEmpty: (obj: ExpressionValue): boolean => {
    if (obj === null || obj === undefined) return true;
    if (typeof obj === 'string' || Array.isArray(obj)) return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    return false;
  },
};

/**
 * Math Functions
 */
export const mathFunctions = {
  // Absolute value
  abs: (num: number): number => Math.abs(num),

  // Round
  round: (num: number, decimals: number = 0): number => {
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
  },

  // Floor
  floor: (num: number): number => Math.floor(num),

  // Ceil
  ceil: (num: number): number => Math.ceil(num),

  // Min
  min: (...nums: number[]): number => Math.min(...nums),

  // Max
  max: (...nums: number[]): number => Math.max(...nums),

  // Random
  random: (min: number = 0, max: number = 1): number => Math.random() * (max - min) + min,

  // Random integer
  randomInt: (min: number, max: number): number =>
    Math.floor(Math.random() * (max - min + 1)) + min,

  // Power
  pow: (base: number, exponent: number): number => Math.pow(base, exponent),

  // Square root
  sqrt: (num: number): number => Math.sqrt(num),

  // Clamp value
  clamp: (num: number, min: number, max: number): number => Math.min(Math.max(num, min), max),

  // Percentage
  percentage: (value: number, total: number): number => (value / total) * 100,
};

/**
 * Type Conversion Functions
 */
export const conversionFunctions = {
  // To string
  toString: (value: ExpressionValue): string => String(value),

  // To number
  toNumber: (value: ExpressionValue): number => Number(value),

  // To integer
  toInt: (value: ExpressionValue): number => parseInt(String(value), 10),

  // To float
  toFloat: (value: ExpressionValue): number => parseFloat(String(value)),

  // To boolean
  toBoolean: (value: ExpressionValue): boolean => Boolean(value),

  // To array
  toArray: (value: ExpressionValue): Array<unknown> => (Array.isArray(value) ? value : [value]),

  // Parse JSON
  parseJson: (str: string): ExpressionValue => {
    try {
      return JSON.parse(str) as ExpressionValue;
    } catch {
      return null;
    }
  },

  // Stringify JSON
  toJson: (value: ExpressionValue, pretty: boolean = false): string => {
    try {
      return JSON.stringify(value, null, pretty ? 2 : 0);
    } catch {
      return '';
    }
  },
};

/**
 * Validation Functions
 */
export const validationFunctions = {
  // Is string
  isString: (value: ExpressionValue): boolean => typeof value === 'string',

  // Is number
  isNumber: (value: ExpressionValue): boolean => typeof value === 'number' && !isNaN(value),

  // Is boolean
  isBoolean: (value: ExpressionValue): boolean => typeof value === 'boolean',

  // Is array
  isArray: (value: ExpressionValue): boolean => Array.isArray(value),

  // Is object
  isObject: (value: ExpressionValue): boolean => typeof value === 'object' && value !== null && !Array.isArray(value),

  // Is null
  isNull: (value: ExpressionValue): boolean => value === null,

  // Is undefined
  isUndefined: (value: ExpressionValue): boolean => value === undefined,

  // Is empty
  isEmpty: (value: ExpressionValue): boolean => objectFunctions.isEmpty(value),

  // Is email
  isEmail: (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(String(value));
  },

  // Is URL
  isUrl: (value: string): boolean => {
    try {
      new URL(String(value));
      return true;
    } catch {
      return false;
    }
  },
};

/**
 * Combined built-in functions object
 */
export const builtInFunctions = {
  ...stringFunctions,
  ...dateFunctions,
  ...arrayFunctions,
  ...objectFunctions,
  ...mathFunctions,
  ...conversionFunctions,
  ...validationFunctions,
};

export default builtInFunctions;
