/**
 * Array Built-in Functions
 * PROJET SAUVÉ - Phase 5.1: Variables & Expressions System
 */

import type { BuiltInFunction } from '../../types/expressions';

export function getArrayFunctions(): BuiltInFunction[] {
  return [
    {
      name: '$first',
      description: 'Get first element',
      category: 'array',
      parameters: [
        { name: 'array', type: 'array', description: 'Array', required: true }
      ],
      returnType: 'any',
      examples: ['$first([1, 2, 3])'],
      execute: (array: any[]) => array[0]
    },
    {
      name: '$last',
      description: 'Get last element',
      category: 'array',
      parameters: [
        { name: 'array', type: 'array', description: 'Array', required: true }
      ],
      returnType: 'any',
      examples: ['$last([1, 2, 3])'],
      execute: (array: any[]) => array[array.length - 1]
    },
    {
      name: '$size',
      description: 'Get array length',
      category: 'array',
      parameters: [
        { name: 'array', type: 'array', description: 'Array', required: true }
      ],
      returnType: 'number',
      examples: ['$size([1, 2, 3])'],
      execute: (array: any[]) => array.length
    },
    {
      name: '$concat',
      description: 'Concatenate arrays',
      category: 'array',
      parameters: [
        { name: 'arrays', type: 'array', description: 'Arrays to concatenate', required: true }
      ],
      returnType: 'array',
      examples: ['$concat([[1, 2], [3, 4]])'],
      execute: (...arrays: any[][]) => [].concat(...arrays)
    },
    {
      name: '$unique',
      description: 'Get unique values',
      category: 'array',
      parameters: [
        { name: 'array', type: 'array', description: 'Array', required: true }
      ],
      returnType: 'array',
      examples: ['$unique([1, 2, 2, 3])'],
      execute: (array: any[]) => [...new Set(array)]
    },
    {
      name: '$flatten',
      description: 'Flatten nested arrays',
      category: 'array',
      parameters: [
        { name: 'array', type: 'array', description: 'Array', required: true },
        { name: 'depth', type: 'number', description: 'Depth', required: false, defaultValue: 1 }
      ],
      returnType: 'array',
      examples: ['$flatten([[1, 2], [3, 4]])'],
      execute: (array: any[], depth: number = 1) => array.flat(depth)
    },
    {
      name: '$sum',
      description: 'Sum array of numbers',
      category: 'array',
      parameters: [
        { name: 'array', type: 'array', description: 'Array of numbers', required: true }
      ],
      returnType: 'number',
      examples: ['$sum([1, 2, 3, 4])'],
      execute: (array: number[]) => array.reduce((a, b) => a + b, 0)
    },
    {
      name: '$average',
      description: 'Calculate average',
      category: 'array',
      parameters: [
        { name: 'array', type: 'array', description: 'Array of numbers', required: true }
      ],
      returnType: 'number',
      examples: ['$average([1, 2, 3, 4])'],
      execute: (array: number[]) => array.reduce((a, b) => a + b, 0) / array.length
    },
    {
      name: '$min',
      description: 'Get minimum value',
      category: 'array',
      parameters: [
        { name: 'array', type: 'array', description: 'Array of numbers', required: true }
      ],
      returnType: 'number',
      examples: ['$min([3, 1, 4, 2])'],
      execute: (array: number[]) => Math.min(...array)
    },
    {
      name: '$max',
      description: 'Get maximum value',
      category: 'array',
      parameters: [
        { name: 'array', type: 'array', description: 'Array of numbers', required: true }
      ],
      returnType: 'number',
      examples: ['$max([3, 1, 4, 2])'],
      execute: (array: number[]) => Math.max(...array)
    },
    {
      name: '$sort',
      description: 'Sort array',
      category: 'array',
      parameters: [
        { name: 'array', type: 'array', description: 'Array', required: true },
        { name: 'order', type: 'string', description: 'asc or desc', required: false, defaultValue: 'asc' }
      ],
      returnType: 'array',
      examples: ['$sort([3, 1, 4, 2])'],
      execute: (array: any[], order: string = 'asc') => {
        const sorted = [...array].sort((a, b) => {
          if (typeof a === 'string') return a.localeCompare(b);
          return a - b;
        });
        return order === 'desc' ? sorted.reverse() : sorted;
      }
    },
    {
      name: '$reverse',
      description: 'Reverse array',
      category: 'array',
      parameters: [
        { name: 'array', type: 'array', description: 'Array', required: true }
      ],
      returnType: 'array',
      examples: ['$reverse([1, 2, 3])'],
      execute: (array: any[]) => [...array].reverse()
    },
    {
      name: '$slice',
      description: 'Extract portion of array',
      category: 'array',
      parameters: [
        { name: 'array', type: 'array', description: 'Array', required: true },
        { name: 'start', type: 'number', description: 'Start index', required: true },
        { name: 'end', type: 'number', description: 'End index', required: false }
      ],
      returnType: 'array',
      examples: ['$slice([1, 2, 3, 4], 1, 3)'],
      execute: (array: any[], start: number, end?: number) => array.slice(start, end)
    },
    {
      name: '$chunk',
      description: 'Split array into chunks',
      category: 'array',
      parameters: [
        { name: 'array', type: 'array', description: 'Array', required: true },
        { name: 'size', type: 'number', description: 'Chunk size', required: true }
      ],
      returnType: 'array',
      examples: ['$chunk([1, 2, 3, 4, 5], 2)'],
      execute: (array: any[], size: number) => {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
          chunks.push(array.slice(i, i + size));
        }
        return chunks;
      }
    },
    {
      name: '$compact',
      description: 'Remove falsy values',
      category: 'array',
      parameters: [
        { name: 'array', type: 'array', description: 'Array', required: true }
      ],
      returnType: 'array',
      examples: ['$compact([0, 1, false, 2, "", 3])'],
      execute: (array: any[]) => array.filter(Boolean)
    },
    {
      name: '$difference',
      description: 'Get difference between arrays',
      category: 'array',
      parameters: [
        { name: 'array1', type: 'array', description: 'First array', required: true },
        { name: 'array2', type: 'array', description: 'Second array', required: true }
      ],
      returnType: 'array',
      examples: ['$difference([1, 2, 3], [2, 3, 4])'],
      execute: (array1: any[], array2: any[]) => {
        const set = new Set(array2);
        return array1.filter(x => !set.has(x));
      }
    },
    {
      name: '$intersection',
      description: 'Get intersection of arrays',
      category: 'array',
      parameters: [
        { name: 'array1', type: 'array', description: 'First array', required: true },
        { name: 'array2', type: 'array', description: 'Second array', required: true }
      ],
      returnType: 'array',
      examples: ['$intersection([1, 2, 3], [2, 3, 4])'],
      execute: (array1: any[], array2: any[]) => {
        const set = new Set(array2);
        return array1.filter(x => set.has(x));
      }
    },
    {
      name: '$union',
      description: 'Get union of arrays (unique values)',
      category: 'array',
      parameters: [
        { name: 'array1', type: 'array', description: 'First array', required: true },
        { name: 'array2', type: 'array', description: 'Second array', required: true }
      ],
      returnType: 'array',
      examples: ['$union([1, 2], [2, 3])'],
      execute: (array1: any[], array2: any[]) => [...new Set([...array1, ...array2])]
    }
  ];
}
