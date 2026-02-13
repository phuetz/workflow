/**
 * DateTime Built-in Functions
 * PROJET SAUVÉ - Phase 5.1: Variables & Expressions System
 */

import type { BuiltInFunction } from '../../types/expressions';

export function getDateTimeFunctions(): BuiltInFunction[] {
  return [
    {
      name: '$now',
      description: 'Get current timestamp',
      category: 'datetime',
      parameters: [],
      returnType: 'Date',
      examples: ['$now()'],
      execute: () => new Date()
    },
    {
      name: '$timestamp',
      description: 'Get current Unix timestamp in milliseconds',
      category: 'datetime',
      parameters: [],
      returnType: 'number',
      examples: ['$timestamp()'],
      execute: () => Date.now()
    },
    {
      name: '$dateFormat',
      description: 'Format date to string',
      category: 'datetime',
      parameters: [
        { name: 'date', type: 'Date|string|number', description: 'Date to format', required: true },
        { name: 'format', type: 'string', description: 'Format string (ISO, locale, or custom)', required: false, defaultValue: 'ISO' }
      ],
      returnType: 'string',
      examples: ['$dateFormat($now(), "ISO")', '$dateFormat($now(), "en-US")'],
      execute: (date: Date | string | number, format: string = 'ISO') => {
        const d = new Date(date);
        if (format === 'ISO') return d.toISOString();
        if (format.includes('-')) return d.toLocaleDateString(format);
        return d.toString();
      }
    },
    {
      name: '$addDays',
      description: 'Add days to a date',
      category: 'datetime',
      parameters: [
        { name: 'date', type: 'Date|string|number', description: 'Base date', required: true },
        { name: 'days', type: 'number', description: 'Number of days to add', required: true }
      ],
      returnType: 'Date',
      examples: ['$addDays($now(), 7)', '$addDays("2024-01-01", -30)'],
      execute: (date: Date | string | number, days: number) => {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        return d;
      }
    },
    {
      name: '$addHours',
      description: 'Add hours to a date',
      category: 'datetime',
      parameters: [
        { name: 'date', type: 'Date|string|number', description: 'Base date', required: true },
        { name: 'hours', type: 'number', description: 'Number of hours to add', required: true }
      ],
      returnType: 'Date',
      examples: ['$addHours($now(), 2)'],
      execute: (date: Date | string | number, hours: number) => {
        const d = new Date(date);
        d.setHours(d.getHours() + hours);
        return d;
      }
    },
    {
      name: '$addMinutes',
      description: 'Add minutes to a date',
      category: 'datetime',
      parameters: [
        { name: 'date', type: 'Date|string|number', description: 'Base date', required: true },
        { name: 'minutes', type: 'number', description: 'Number of minutes to add', required: true }
      ],
      returnType: 'Date',
      examples: ['$addMinutes($now(), 30)'],
      execute: (date: Date | string | number, minutes: number) => {
        const d = new Date(date);
        d.setMinutes(d.getMinutes() + minutes);
        return d;
      }
    },
    {
      name: '$diffDays',
      description: 'Calculate difference in days between two dates',
      category: 'datetime',
      parameters: [
        { name: 'date1', type: 'Date|string|number', description: 'First date', required: true },
        { name: 'date2', type: 'Date|string|number', description: 'Second date', required: true }
      ],
      returnType: 'number',
      examples: ['$diffDays($now(), "2024-12-31")'],
      execute: (date1: Date | string | number, date2: Date | string | number) => {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const diffTime = Math.abs(d2.getTime() - d1.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
    },
    {
      name: '$diffHours',
      description: 'Calculate difference in hours between two dates',
      category: 'datetime',
      parameters: [
        { name: 'date1', type: 'Date|string|number', description: 'First date', required: true },
        { name: 'date2', type: 'Date|string|number', description: 'Second date', required: true }
      ],
      returnType: 'number',
      examples: ['$diffHours($now(), "2024-12-31T23:59:59")'],
      execute: (date1: Date | string | number, date2: Date | string | number) => {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const diffTime = Math.abs(d2.getTime() - d1.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60));
      }
    },
    {
      name: '$year',
      description: 'Get year from date',
      category: 'datetime',
      parameters: [
        { name: 'date', type: 'Date|string|number', description: 'Date', required: true }
      ],
      returnType: 'number',
      examples: ['$year($now())'],
      execute: (date: Date | string | number) => new Date(date).getFullYear()
    },
    {
      name: '$month',
      description: 'Get month from date (1-12)',
      category: 'datetime',
      parameters: [
        { name: 'date', type: 'Date|string|number', description: 'Date', required: true }
      ],
      returnType: 'number',
      examples: ['$month($now())'],
      execute: (date: Date | string | number) => new Date(date).getMonth() + 1
    },
    {
      name: '$day',
      description: 'Get day from date (1-31)',
      category: 'datetime',
      parameters: [
        { name: 'date', type: 'Date|string|number', description: 'Date', required: true }
      ],
      returnType: 'number',
      examples: ['$day($now())'],
      execute: (date: Date | string | number) => new Date(date).getDate()
    },
    {
      name: '$hour',
      description: 'Get hour from date (0-23)',
      category: 'datetime',
      parameters: [
        { name: 'date', type: 'Date|string|number', description: 'Date', required: true }
      ],
      returnType: 'number',
      examples: ['$hour($now())'],
      execute: (date: Date | string | number) => new Date(date).getHours()
    },
    {
      name: '$minute',
      description: 'Get minute from date (0-59)',
      category: 'datetime',
      parameters: [
        { name: 'date', type: 'Date|string|number', description: 'Date', required: true }
      ],
      returnType: 'number',
      examples: ['$minute($now())'],
      execute: (date: Date | string | number) => new Date(date).getMinutes()
    },
    {
      name: '$second',
      description: 'Get second from date (0-59)',
      category: 'datetime',
      parameters: [
        { name: 'date', type: 'Date|string|number', description: 'Date', required: true }
      ],
      returnType: 'number',
      examples: ['$second($now())'],
      execute: (date: Date | string | number) => new Date(date).getSeconds()
    },
    {
      name: '$dayOfWeek',
      description: 'Get day of week (0=Sunday, 6=Saturday)',
      category: 'datetime',
      parameters: [
        { name: 'date', type: 'Date|string|number', description: 'Date', required: true }
      ],
      returnType: 'number',
      examples: ['$dayOfWeek($now())'],
      execute: (date: Date | string | number) => new Date(date).getDay()
    },
    {
      name: '$isWeekend',
      description: 'Check if date is weekend (Saturday or Sunday)',
      category: 'datetime',
      parameters: [
        { name: 'date', type: 'Date|string|number', description: 'Date', required: true }
      ],
      returnType: 'boolean',
      examples: ['$isWeekend($now())'],
      execute: (date: Date | string | number) => {
        const day = new Date(date).getDay();
        return day === 0 || day === 6;
      }
    },
    {
      name: '$startOfDay',
      description: 'Get start of day (00:00:00)',
      category: 'datetime',
      parameters: [
        { name: 'date', type: 'Date|string|number', description: 'Date', required: true }
      ],
      returnType: 'Date',
      examples: ['$startOfDay($now())'],
      execute: (date: Date | string | number) => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
      }
    },
    {
      name: '$endOfDay',
      description: 'Get end of day (23:59:59)',
      category: 'datetime',
      parameters: [
        { name: 'date', type: 'Date|string|number', description: 'Date', required: true }
      ],
      returnType: 'Date',
      examples: ['$endOfDay($now())'],
      execute: (date: Date | string | number) => {
        const d = new Date(date);
        d.setHours(23, 59, 59, 999);
        return d;
      }
    }
  ];
}
