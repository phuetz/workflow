/**
 * String Built-in Functions
 * PROJET SAUVÉ - Phase 5.1: Variables & Expressions System
 */

import type { BuiltInFunction } from '../../types/expressions';

export function getStringFunctions(): BuiltInFunction[] {
  return [
    {
      name: '$upper',
      description: 'Convert string to uppercase',
      category: 'string',
      parameters: [
        { name: 'str', type: 'string', description: 'String to convert', required: true }
      ],
      returnType: 'string',
      examples: ['$upper("hello")'],
      execute: (str: string) => String(str).toUpperCase()
    },
    {
      name: '$lower',
      description: 'Convert string to lowercase',
      category: 'string',
      parameters: [
        { name: 'str', type: 'string', description: 'String to convert', required: true }
      ],
      returnType: 'string',
      examples: ['$lower("HELLO")'],
      execute: (str: string) => String(str).toLowerCase()
    },
    {
      name: '$trim',
      description: 'Remove whitespace from both ends',
      category: 'string',
      parameters: [
        { name: 'str', type: 'string', description: 'String to trim', required: true }
      ],
      returnType: 'string',
      examples: ['$trim("  hello  ")'],
      execute: (str: string) => String(str).trim()
    },
    {
      name: '$substring',
      description: 'Extract substring',
      category: 'string',
      parameters: [
        { name: 'str', type: 'string', description: 'String', required: true },
        { name: 'start', type: 'number', description: 'Start index', required: true },
        { name: 'length', type: 'number', description: 'Length', required: false }
      ],
      returnType: 'string',
      examples: ['$substring("hello", 1, 3)'],
      execute: (str: string, start: number, length?: number) => {
        return length !== undefined
          ? String(str).substring(start, start + length)
          : String(str).substring(start);
      }
    },
    {
      name: '$replace',
      description: 'Replace all occurrences',
      category: 'string',
      parameters: [
        { name: 'str', type: 'string', description: 'String', required: true },
        { name: 'search', type: 'string', description: 'String to find', required: true },
        { name: 'replace', type: 'string', description: 'Replacement', required: true }
      ],
      returnType: 'string',
      examples: ['$replace("hello world", "world", "universe")'],
      execute: (str: string, search: string, replace: string) => {
        return String(str).split(search).join(replace);
      }
    },
    {
      name: '$split',
      description: 'Split string into array',
      category: 'string',
      parameters: [
        { name: 'str', type: 'string', description: 'String', required: true },
        { name: 'separator', type: 'string', description: 'Separator', required: true }
      ],
      returnType: 'array',
      examples: ['$split("a,b,c", ",")'],
      execute: (str: string, separator: string) => String(str).split(separator)
    },
    {
      name: '$join',
      description: 'Join array into string',
      category: 'string',
      parameters: [
        { name: 'array', type: 'array', description: 'Array to join', required: true },
        { name: 'separator', type: 'string', description: 'Separator', required: false, defaultValue: ',' }
      ],
      returnType: 'string',
      examples: ['$join(["a", "b", "c"], "-")'],
      execute: (array: any[], separator: string = ',') => array.join(separator)
    },
    {
      name: '$length',
      description: 'Get string length',
      category: 'string',
      parameters: [
        { name: 'str', type: 'string', description: 'String', required: true }
      ],
      returnType: 'number',
      examples: ['$length("hello")'],
      execute: (str: string) => String(str).length
    },
    {
      name: '$startsWith',
      description: 'Check if string starts with prefix',
      category: 'string',
      parameters: [
        { name: 'str', type: 'string', description: 'String', required: true },
        { name: 'prefix', type: 'string', description: 'Prefix', required: true }
      ],
      returnType: 'boolean',
      examples: ['$startsWith("hello", "he")'],
      execute: (str: string, prefix: string) => String(str).startsWith(prefix)
    },
    {
      name: '$endsWith',
      description: 'Check if string ends with suffix',
      category: 'string',
      parameters: [
        { name: 'str', type: 'string', description: 'String', required: true },
        { name: 'suffix', type: 'string', description: 'Suffix', required: true }
      ],
      returnType: 'boolean',
      examples: ['$endsWith("hello", "lo")'],
      execute: (str: string, suffix: string) => String(str).endsWith(suffix)
    },
    {
      name: '$contains',
      description: 'Check if string contains substring',
      category: 'string',
      parameters: [
        { name: 'str', type: 'string', description: 'String', required: true },
        { name: 'substring', type: 'string', description: 'Substring', required: true }
      ],
      returnType: 'boolean',
      examples: ['$contains("hello world", "world")'],
      execute: (str: string, substring: string) => String(str).includes(substring)
    },
    {
      name: '$indexOf',
      description: 'Find index of substring',
      category: 'string',
      parameters: [
        { name: 'str', type: 'string', description: 'String', required: true },
        { name: 'substring', type: 'string', description: 'Substring to find', required: true }
      ],
      returnType: 'number',
      examples: ['$indexOf("hello", "l")'],
      execute: (str: string, substring: string) => String(str).indexOf(substring)
    },
    {
      name: '$repeat',
      description: 'Repeat string n times',
      category: 'string',
      parameters: [
        { name: 'str', type: 'string', description: 'String', required: true },
        { name: 'count', type: 'number', description: 'Repeat count', required: true }
      ],
      returnType: 'string',
      examples: ['$repeat("ab", 3)'],
      execute: (str: string, count: number) => String(str).repeat(count)
    },
    {
      name: '$padStart',
      description: 'Pad string at start',
      category: 'string',
      parameters: [
        { name: 'str', type: 'string', description: 'String', required: true },
        { name: 'length', type: 'number', description: 'Target length', required: true },
        { name: 'fill', type: 'string', description: 'Fill string', required: false, defaultValue: ' ' }
      ],
      returnType: 'string',
      examples: ['$padStart("5", 3, "0")'],
      execute: (str: string, length: number, fill: string = ' ') => String(str).padStart(length, fill)
    },
    {
      name: '$padEnd',
      description: 'Pad string at end',
      category: 'string',
      parameters: [
        { name: 'str', type: 'string', description: 'String', required: true },
        { name: 'length', type: 'number', description: 'Target length', required: true },
        { name: 'fill', type: 'string', description: 'Fill string', required: false, defaultValue: ' ' }
      ],
      returnType: 'string',
      examples: ['$padEnd("5", 3, "0")'],
      execute: (str: string, length: number, fill: string = ' ') => String(str).padEnd(length, fill)
    },
    {
      name: '$capitalize',
      description: 'Capitalize first letter',
      category: 'string',
      parameters: [
        { name: 'str', type: 'string', description: 'String', required: true }
      ],
      returnType: 'string',
      examples: ['$capitalize("hello")'],
      execute: (str: string) => {
        const s = String(str);
        return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
      }
    },
    {
      name: '$camelCase',
      description: 'Convert to camelCase',
      category: 'string',
      parameters: [
        { name: 'str', type: 'string', description: 'String', required: true }
      ],
      returnType: 'string',
      examples: ['$camelCase("hello world")'],
      execute: (str: string) => {
        return String(str)
          .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
          .replace(/^[A-Z]/, (chr) => chr.toLowerCase());
      }
    },
    {
      name: '$snakeCase',
      description: 'Convert to snake_case',
      category: 'string',
      parameters: [
        { name: 'str', type: 'string', description: 'String', required: true }
      ],
      returnType: 'string',
      examples: ['$snakeCase("helloWorld")'],
      execute: (str: string) => {
        return String(str)
          .replace(/([A-Z])/g, '_$1')
          .replace(/[^a-zA-Z0-9]+/g, '_')
          .toLowerCase()
          .replace(/^_/, '');
      }
    },
    {
      name: '$kebabCase',
      description: 'Convert to kebab-case',
      category: 'string',
      parameters: [
        { name: 'str', type: 'string', description: 'String', required: true }
      ],
      returnType: 'string',
      examples: ['$kebabCase("helloWorld")'],
      execute: (str: string) => {
        return String(str)
          .replace(/([A-Z])/g, '-$1')
          .replace(/[^a-zA-Z0-9]+/g, '-')
          .toLowerCase()
          .replace(/^-/, '');
      }
    },
    {
      name: '$slugify',
      description: 'Create URL-friendly slug',
      category: 'string',
      parameters: [
        { name: 'str', type: 'string', description: 'String', required: true }
      ],
      returnType: 'string',
      examples: ['$slugify("Hello World!")'],
      execute: (str: string) => {
        return String(str)
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '');
      }
    },
    {
      name: '$reverse',
      description: 'Reverse string',
      category: 'string',
      parameters: [
        { name: 'str', type: 'string', description: 'String', required: true }
      ],
      returnType: 'string',
      examples: ['$reverse("hello")'],
      execute: (str: string) => String(str).split('').reverse().join('')
    }
  ];
}
