/**
 * Math Built-in Functions
 * PROJET SAUVÉ - Phase 5.1: Variables & Expressions System
 */

import type { BuiltInFunction } from '../../types/expressions';

export function getMathFunctions(): BuiltInFunction[] {
  return [
    {
      name: '$abs',
      description: 'Absolute value',
      category: 'math',
      parameters: [
        { name: 'num', type: 'number', description: 'Number', required: true }
      ],
      returnType: 'number',
      examples: ['$abs(-5)'],
      execute: (num: number) => Math.abs(num)
    },
    {
      name: '$ceil',
      description: 'Round up',
      category: 'math',
      parameters: [
        { name: 'num', type: 'number', description: 'Number', required: true }
      ],
      returnType: 'number',
      examples: ['$ceil(4.2)'],
      execute: (num: number) => Math.ceil(num)
    },
    {
      name: '$floor',
      description: 'Round down',
      category: 'math',
      parameters: [
        { name: 'num', type: 'number', description: 'Number', required: true }
      ],
      returnType: 'number',
      examples: ['$floor(4.8)'],
      execute: (num: number) => Math.floor(num)
    },
    {
      name: '$round',
      description: 'Round to nearest integer or decimal places',
      category: 'math',
      parameters: [
        { name: 'num', type: 'number', description: 'Number', required: true },
        { name: 'decimals', type: 'number', description: 'Decimal places', required: false, defaultValue: 0 }
      ],
      returnType: 'number',
      examples: ['$round(4.567, 2)'],
      execute: (num: number, decimals: number = 0) => {
        const factor = Math.pow(10, decimals);
        return Math.round(num * factor) / factor;
      }
    },
    {
      name: '$sqrt',
      description: 'Square root',
      category: 'math',
      parameters: [
        { name: 'num', type: 'number', description: 'Number', required: true }
      ],
      returnType: 'number',
      examples: ['$sqrt(16)'],
      execute: (num: number) => Math.sqrt(num)
    },
    {
      name: '$pow',
      description: 'Power',
      category: 'math',
      parameters: [
        { name: 'base', type: 'number', description: 'Base', required: true },
        { name: 'exponent', type: 'number', description: 'Exponent', required: true }
      ],
      returnType: 'number',
      examples: ['$pow(2, 3)'],
      execute: (base: number, exponent: number) => Math.pow(base, exponent)
    },
    {
      name: '$random',
      description: 'Random number between min and max',
      category: 'math',
      parameters: [
        { name: 'min', type: 'number', description: 'Minimum', required: false, defaultValue: 0 },
        { name: 'max', type: 'number', description: 'Maximum', required: false, defaultValue: 1 }
      ],
      returnType: 'number',
      examples: ['$random()', '$random(1, 100)'],
      execute: (min: number = 0, max: number = 1) => {
        return Math.random() * (max - min) + min;
      }
    },
    {
      name: '$randomInt',
      description: 'Random integer between min and max (inclusive)',
      category: 'math',
      parameters: [
        { name: 'min', type: 'number', description: 'Minimum', required: true },
        { name: 'max', type: 'number', description: 'Maximum', required: true }
      ],
      returnType: 'number',
      examples: ['$randomInt(1, 10)'],
      execute: (min: number, max: number) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
      }
    },
    {
      name: '$sign',
      description: 'Sign of number (-1, 0, 1)',
      category: 'math',
      parameters: [
        { name: 'num', type: 'number', description: 'Number', required: true }
      ],
      returnType: 'number',
      examples: ['$sign(-5)', '$sign(0)', '$sign(5)'],
      execute: (num: number) => Math.sign(num)
    },
    {
      name: '$clamp',
      description: 'Clamp number between min and max',
      category: 'math',
      parameters: [
        { name: 'num', type: 'number', description: 'Number', required: true },
        { name: 'min', type: 'number', description: 'Minimum', required: true },
        { name: 'max', type: 'number', description: 'Maximum', required: true }
      ],
      returnType: 'number',
      examples: ['$clamp(15, 0, 10)'],
      execute: (num: number, min: number, max: number) => Math.max(min, Math.min(max, num))
    },
    {
      name: '$sin',
      description: 'Sine',
      category: 'math',
      parameters: [
        { name: 'num', type: 'number', description: 'Angle in radians', required: true }
      ],
      returnType: 'number',
      examples: ['$sin(Math.PI / 2)'],
      execute: (num: number) => Math.sin(num)
    },
    {
      name: '$cos',
      description: 'Cosine',
      category: 'math',
      parameters: [
        { name: 'num', type: 'number', description: 'Angle in radians', required: true }
      ],
      returnType: 'number',
      examples: ['$cos(0)'],
      execute: (num: number) => Math.cos(num)
    },
    {
      name: '$tan',
      description: 'Tangent',
      category: 'math',
      parameters: [
        { name: 'num', type: 'number', description: 'Angle in radians', required: true }
      ],
      returnType: 'number',
      examples: ['$tan(Math.PI / 4)'],
      execute: (num: number) => Math.tan(num)
    },
    {
      name: '$log',
      description: 'Natural logarithm',
      category: 'math',
      parameters: [
        { name: 'num', type: 'number', description: 'Number', required: true }
      ],
      returnType: 'number',
      examples: ['$log(Math.E)'],
      execute: (num: number) => Math.log(num)
    },
    {
      name: '$log10',
      description: 'Base-10 logarithm',
      category: 'math',
      parameters: [
        { name: 'num', type: 'number', description: 'Number', required: true }
      ],
      returnType: 'number',
      examples: ['$log10(100)'],
      execute: (num: number) => Math.log10(num)
    },
    {
      name: '$exp',
      description: 'Exponential (e^x)',
      category: 'math',
      parameters: [
        { name: 'num', type: 'number', description: 'Exponent', required: true }
      ],
      returnType: 'number',
      examples: ['$exp(1)'],
      execute: (num: number) => Math.exp(num)
    },
    {
      name: '$percentage',
      description: 'Calculate percentage',
      category: 'math',
      parameters: [
        { name: 'value', type: 'number', description: 'Value', required: true },
        { name: 'total', type: 'number', description: 'Total', required: true }
      ],
      returnType: 'number',
      examples: ['$percentage(25, 100)'],
      execute: (value: number, total: number) => (value / total) * 100
    },
    {
      name: '$percentageOf',
      description: 'Calculate what percentage represents of total',
      category: 'math',
      parameters: [
        { name: 'percentage', type: 'number', description: 'Percentage', required: true },
        { name: 'total', type: 'number', description: 'Total', required: true }
      ],
      returnType: 'number',
      examples: ['$percentageOf(10, 200)'],
      execute: (percentage: number, total: number) => (percentage / 100) * total
    }
  ];
}
