/**
 * Visual Cron Editor
 * User-friendly interface for creating cron expressions
 */

import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Repeat } from 'lucide-react';

interface CronEditorProps {
  value?: string;
  onChange: (cronExpression: string) => void;
  showPreview?: boolean;
}

type FrequencyType = 'minute' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function CronEditor({ value, onChange, showPreview = true }: CronEditorProps) {
  const [frequency, setFrequency] = useState<FrequencyType>('daily');
  const [minute, setMinute] = useState<number>(0);
  const [hour, setHour] = useState<number>(9);
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [month, setMonth] = useState<number>(1);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  const [customCron, setCustomCron] = useState<string>('* * * * *');

  // Parse initial value
  useEffect(() => {
    if (value) {
      parseCommonCronPatterns(value);
    }
  }, [value]);

  // Generate cron expression
  useEffect(() => {
    const cron = generateCronExpression();
    onChange(cron);
  }, [frequency, minute, hour, dayOfMonth, month, daysOfWeek, customCron]);

  function parseCommonCronPatterns(cron: string) {
    const parts = cron.split(' ');
    if (parts.length !== 5) return;

    const [min, hr, dom, mon, dow] = parts;

    // Every minute
    if (cron === '* * * * *') {
      setFrequency('minute');
      return;
    }

    // Hourly
    if (hr === '*' && dom === '*' && mon === '*' && dow === '*') {
      setFrequency('hourly');
      setMinute(parseInt(min) || 0);
      return;
    }

    // Daily
    if (dom === '*' && mon === '*' && dow === '*') {
      setFrequency('daily');
      setMinute(parseInt(min) || 0);
      setHour(parseInt(hr) || 9);
      return;
    }

    // Weekly
    if (dom === '*' && mon === '*' && dow !== '*') {
      setFrequency('weekly');
      setMinute(parseInt(min) || 0);
      setHour(parseInt(hr) || 9);
      if (dow.includes(',')) {
        setDaysOfWeek(dow.split(',').map(d => parseInt(d)));
      }
      return;
    }

    // Monthly
    if (dom !== '*' && mon === '*' && dow === '*') {
      setFrequency('monthly');
      setMinute(parseInt(min) || 0);
      setHour(parseInt(hr) || 9);
      setDayOfMonth(parseInt(dom) || 1);
      return;
    }

    // Custom
    setFrequency('custom');
    setCustomCron(cron);
  }

  function generateCronExpression(): string {
    switch (frequency) {
      case 'minute':
        return '* * * * *';

      case 'hourly':
        return `${minute} * * * *`;

      case 'daily':
        return `${minute} ${hour} * * *`;

      case 'weekly':
        return `${minute} ${hour} * * ${daysOfWeek.sort().join(',')}`;

      case 'monthly':
        return `${minute} ${hour} ${dayOfMonth} * *`;

      case 'custom':
        return customCron;

      default:
        return '* * * * *';
    }
  }

  function getCronDescription(): string {
    const cron = generateCronExpression();
    const parts = cron.split(' ');

    if (cron === '* * * * *') {
      return 'Every minute';
    }

    switch (frequency) {
      case 'hourly':
        return `Every hour at minute ${minute}`;

      case 'daily':
        return `Every day at ${formatTime(hour, minute)}`;

      case 'weekly': {
        const days = daysOfWeek.map(d => WEEKDAYS[d]).join(', ');
        return `Every week on ${days} at ${formatTime(hour, minute)}`;
      }

      case 'monthly':
        return `Monthly on day ${dayOfMonth} at ${formatTime(hour, minute)}`;

      case 'custom':
        return describeCustomCron(customCron);

      default:
        return 'Invalid cron expression';
    }
  }

  function formatTime(h: number, m: number): string {
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    const minPad = m.toString().padStart(2, '0');
    return `${hour12}:${minPad} ${period}`;
  }

  function describeCustomCron(cron: string): string {
    // Simple description for custom cron
    const parts = cron.split(' ');
    if (parts.length !== 5) return 'Invalid format';

    const [min, hr, dom, mon, dow] = parts;
    const desc: string[] = [];

    if (min !== '*') desc.push(`minute ${min}`);
    if (hr !== '*') desc.push(`hour ${hr}`);
    if (dom !== '*') desc.push(`day ${dom}`);
    if (mon !== '*') desc.push(`month ${mon}`);
    if (dow !== '*') desc.push(`weekday ${dow}`);

    return desc.length > 0 ? desc.join(', ') : 'Every minute';
  }

  function getNextRuns(count: number = 3): Date[] {
    // Simplified - in production would use a cron parser library
    const now = new Date();
    const runs: Date[] = [];

    for (let i = 0; i < count; i++) {
      const next = new Date(now);
      next.setMinutes(now.getMinutes() + (i + 1) * 5); // Simplified
      runs.push(next);
    }

    return runs;
  }

  function toggleWeekday(day: number) {
    if (daysOfWeek.includes(day)) {
      setDaysOfWeek(daysOfWeek.filter(d => d !== day));
    } else {
      setDaysOfWeek([...daysOfWeek, day].sort());
    }
  }

  return (
    <div className="space-y-6">
      {/* Frequency Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Frequency
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['minute', 'hourly', 'daily', 'weekly', 'monthly', 'custom'] as FrequencyType[]).map((freq) => (
            <button
              key={freq}
              onClick={() => setFrequency(freq)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                frequency === freq
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {freq.charAt(0).toUpperCase() + freq.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Frequency-specific controls */}
      {frequency === 'hourly' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            At minute
          </label>
          <input
            type="number"
            min="0"
            max="59"
            value={minute}
            onChange={(e) => setMinute(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
      )}

      {(frequency === 'daily' || frequency === 'weekly' || frequency === 'monthly') && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Clock className="inline w-4 h-4 mr-1" />
              Hour (0-23)
            </label>
            <input
              type="number"
              min="0"
              max="23"
              value={hour}
              onChange={(e) => setHour(Math.min(23, Math.max(0, parseInt(e.target.value) || 0)))}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Minute (0-59)
            </label>
            <input
              type="number"
              min="0"
              max="59"
              value={minute}
              onChange={(e) => setMinute(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      )}

      {frequency === 'weekly' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Calendar className="inline w-4 h-4 mr-1" />
            Days of week
          </label>
          <div className="grid grid-cols-7 gap-2">
            {WEEKDAYS.map((day, index) => (
              <button
                key={day}
                onClick={() => toggleWeekday(index)}
                className={`px-2 py-2 rounded-lg border text-xs font-medium transition-colors ${
                  daysOfWeek.includes(index)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
      )}

      {frequency === 'monthly' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Day of month (1-31)
          </label>
          <input
            type="number"
            min="1"
            max="31"
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
      )}

      {frequency === 'custom' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Cron expression
          </label>
          <input
            type="text"
            value={customCron}
            onChange={(e) => setCustomCron(e.target.value)}
            placeholder="* * * * *"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono"
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Format: minute hour day month weekday
          </p>
        </div>
      )}

      {/* Preview */}
      {showPreview && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2 mb-3">
            <Repeat className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-gray-900 dark:text-white">Schedule Preview</h3>
          </div>

          <div className="space-y-2">
            <div className="text-sm">
              <span className="text-gray-600 dark:text-gray-400">Expression:</span>
              <code className="ml-2 px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded font-mono text-xs">
                {generateCronExpression()}
              </code>
            </div>

            <div className="text-sm">
              <span className="text-gray-600 dark:text-gray-400">Description:</span>
              <span className="ml-2 text-gray-900 dark:text-white">{getCronDescription()}</span>
            </div>

            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Next runs (approximate):</p>
              <ul className="space-y-1">
                {getNextRuns(3).map((date, i) => (
                  <li key={i} className="text-xs text-gray-900 dark:text-white">
                    {date.toLocaleString()}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Quick presets */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Quick presets
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setFrequency('daily');
              setHour(9);
              setMinute(0);
            }}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            Daily at 9 AM
          </button>
          <button
            onClick={() => {
              setFrequency('weekly');
              setDaysOfWeek([1, 2, 3, 4, 5]);
              setHour(9);
              setMinute(0);
            }}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            Weekdays at 9 AM
          </button>
          <button
            onClick={() => {
              setFrequency('hourly');
              setMinute(0);
            }}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            Every hour
          </button>
          <button
            onClick={() => {
              setFrequency('monthly');
              setDayOfMonth(1);
              setHour(0);
              setMinute(0);
            }}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            First of month
          </button>
        </div>
      </div>
    </div>
  );
}

export default CronEditor;
