/**
 * Object Built-in Functions
 * PROJET SAUVÉ - Phase 5.1: Variables & Expressions System
 */

import type { BuiltInFunction } from '../../types/expressions';

export function getObjectFunctions(): BuiltInFunction[] {
  return [
    {
      name: '$keys',
      description: 'Get object keys',
      category: 'object',
      parameters: [
        { name: 'obj', type: 'object', description: 'Object', required: true }
      ],
      returnType: 'array',
      examples: ['$keys({a: 1, b: 2})'],
      execute: (obj: Record<string, any>) => Object.keys(obj)
    },
    {
      name: '$values',
      description: 'Get object values',
      category: 'object',
      parameters: [
        { name: 'obj', type: 'object', description: 'Object', required: true }
      ],
      returnType: 'array',
      examples: ['$values({a: 1, b: 2})'],
      execute: (obj: Record<string, any>) => Object.values(obj)
    },
    {
      name: '$entries',
      description: 'Get object entries as [key, value] pairs',
      category: 'object',
      parameters: [
        { name: 'obj', type: 'object', description: 'Object', required: true }
      ],
      returnType: 'array',
      examples: ['$entries({a: 1, b: 2})'],
      execute: (obj: Record<string, any>) => Object.entries(obj)
    },
    {
      name: '$merge',
      description: 'Merge objects',
      category: 'object',
      parameters: [
        { name: 'objects', type: 'array', description: 'Objects to merge', required: true }
      ],
      returnType: 'object',
      examples: ['$merge([{a: 1}, {b: 2}])'],
      execute: (...objects: Record<string, any>[]) => Object.assign({}, ...objects)
    },
    {
      name: '$pick',
      description: 'Pick specified keys from object',
      category: 'object',
      parameters: [
        { name: 'obj', type: 'object', description: 'Object', required: true },
        { name: 'keys', type: 'array', description: 'Keys to pick', required: true }
      ],
      returnType: 'object',
      examples: ['$pick({a: 1, b: 2, c: 3}, ["a", "c"])'],
      execute: (obj: Record<string, any>, keys: string[]) => {
        const result: Record<string, any> = {};
        for (const key of keys) {
          if (key in obj) result[key] = obj[key];
        }
        return result;
      }
    },
    {
      name: '$omit',
      description: 'Omit specified keys from object',
      category: 'object',
      parameters: [
        { name: 'obj', type: 'object', description: 'Object', required: true },
        { name: 'keys', type: 'array', description: 'Keys to omit', required: true }
      ],
      returnType: 'object',
      examples: ['$omit({a: 1, b: 2, c: 3}, ["b"])'],
      execute: (obj: Record<string, any>, keys: string[]) => {
        const result = { ...obj };
        for (const key of keys) {
          delete result[key];
        }
        return result;
      }
    },
    {
      name: '$has',
      description: 'Check if object has key',
      category: 'object',
      parameters: [
        { name: 'obj', type: 'object', description: 'Object', required: true },
        { name: 'key', type: 'string', description: 'Key', required: true }
      ],
      returnType: 'boolean',
      examples: ['$has({a: 1}, "a")'],
      execute: (obj: Record<string, any>, key: string) => key in obj
    },
    {
      name: '$get',
      description: 'Get value by path (supports dot notation)',
      category: 'object',
      parameters: [
        { name: 'obj', type: 'object', description: 'Object', required: true },
        { name: 'path', type: 'string', description: 'Path (e.g., "a.b.c")', required: true },
        { name: 'defaultValue', type: 'any', description: 'Default value', required: false }
      ],
      returnType: 'any',
      examples: ['$get({a: {b: {c: 1}}}, "a.b.c")'],
      execute: (obj: Record<string, any>, path: string, defaultValue?: any) => {
        const keys = path.split('.');
        let result = obj;
        for (const key of keys) {
          if (result && typeof result === 'object' && key in result) {
            result = result[key];
          } else {
            return defaultValue;
          }
        }
        return result;
      }
    },
    {
      name: '$set',
      description: 'Set value by path (creates nested objects)',
      category: 'object',
      parameters: [
        { name: 'obj', type: 'object', description: 'Object', required: true },
        { name: 'path', type: 'string', description: 'Path (e.g., "a.b.c")', required: true },
        { name: 'value', type: 'any', description: 'Value to set', required: true }
      ],
      returnType: 'object',
      examples: ['$set({}, "a.b.c", 1)'],
      execute: (obj: Record<string, any>, path: string, value: any) => {
        const result = { ...obj };
        const keys = path.split('.');
        let current = result;

        for (let i = 0; i < keys.length - 1; i++) {
          const key = keys[i];
          if (!(key in current) || typeof current[key] !== 'object') {
            current[key] = {};
          }
          current = current[key];
        }

        current[keys[keys.length - 1]] = value;
        return result;
      }
    },
    {
      name: '$fromEntries',
      description: 'Create object from entries',
      category: 'object',
      parameters: [
        { name: 'entries', type: 'array', description: 'Array of [key, value] pairs', required: true }
      ],
      returnType: 'object',
      examples: ['$fromEntries([["a", 1], ["b", 2]])'],
      execute: (entries: [string, any][]) => Object.fromEntries(entries)
    },
    {
      name: '$mapValues',
      description: 'Map over object values',
      category: 'object',
      parameters: [
        { name: 'obj', type: 'object', description: 'Object', required: true },
        { name: 'fn', type: 'function', description: 'Transform function', required: true }
      ],
      returnType: 'object',
      examples: ['$mapValues({a: 1, b: 2}, v => v * 2)'],
      execute: (obj: Record<string, any>, fn: (value: any) => any) => {
        const result: Record<string, any> = {};
        for (const [key, value] of Object.entries(obj)) {
          result[key] = fn(value);
        }
        return result;
      }
    },
    {
      name: '$deepMerge',
      description: 'Deep merge objects',
      category: 'object',
      parameters: [
        { name: 'target', type: 'object', description: 'Target object', required: true },
        { name: 'source', type: 'object', description: 'Source object', required: true }
      ],
      returnType: 'object',
      examples: ['$deepMerge({a: {b: 1}}, {a: {c: 2}})'],
      execute: (target: Record<string, any>, source: Record<string, any>) => {
        const result = { ...target };
        for (const key in source) {
          if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            result[key] = result[key] && typeof result[key] === 'object'
              ? { ...result[key], ...source[key] }
              : { ...source[key] };
          } else {
            result[key] = source[key];
          }
        }
        return result;
      }
    }
  ];
}
