/**
 * DateTime Node Configuration
 * Parse, format, and manipulate dates
 */

import React from 'react';
import { useWorkflowStore } from '../../../store/workflowStore';
import { WorkflowNode } from '../../../types/workflow';

interface DateTimeConfig {
  operation?: 'format' | 'parse' | 'add' | 'subtract' | 'diff' | 'now' | 'extract';
  inputField?: string;
  inputFormat?: string;
  outputFormat?: string;
  timezone?: string;
  // Add/Subtract options
  amount?: number;
  unit?: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';
  // Diff options
  compareToField?: string;
  diffUnit?: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';
  // Extract options
  extractPart?: 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second' | 'weekday' | 'weekNumber' | 'quarter';
}

interface Props {
  node: WorkflowNode;
}

export const DateTimeConfig: React.FC<Props> = ({ node }) => {
  const { updateNode, darkMode } = useWorkflowStore();
  const config = ((node.data?.config || {}) as Record<string, unknown>) as DateTimeConfig;

  const updateConfig = (updates: Partial<DateTimeConfig>) => {
    updateNode(node.id, {
      data: {
        ...node.data,
        config: { ...config, ...updates }
      }
    });
  };

  const timezones = [
    'UTC',
    'America/New_York',
    'America/Los_Angeles',
    'America/Chicago',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Singapore',
    'Australia/Sydney',
  ];

  const dateFormats = [
    { value: 'ISO', label: 'ISO 8601 (2024-01-15T12:30:00Z)' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2024-01-15)' },
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (15/01/2024)' },
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (01/15/2024)' },
    { value: 'DD-MM-YYYY HH:mm', label: 'DD-MM-YYYY HH:mm (15-01-2024 12:30)' },
    { value: 'Unix', label: 'Unix Timestamp (1705320600)' },
    { value: 'UnixMs', label: 'Unix Milliseconds (1705320600000)' },
    { value: 'custom', label: 'Custom Format...' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={config.operation || 'format'}
          onChange={(e) => updateConfig({ operation: e.target.value as DateTimeConfig['operation'] })}
          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
        >
          <option value="now">Get Current Date/Time</option>
          <option value="format">Format Date</option>
          <option value="parse">Parse Date String</option>
          <option value="add">Add to Date</option>
          <option value="subtract">Subtract from Date</option>
          <option value="diff">Calculate Difference</option>
          <option value="extract">Extract Part</option>
        </select>
      </div>

      {config.operation !== 'now' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Input Field
          </label>
          <input
            type="text"
            value={config.inputField || ''}
            onChange={(e) => updateConfig({ inputField: e.target.value })}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            placeholder="{{ $json.dateField }}"
          />
        </div>
      )}

      {(config.operation === 'format' || config.operation === 'now') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Output Format
          </label>
          <select
            value={config.outputFormat || 'ISO'}
            onChange={(e) => updateConfig({ outputFormat: e.target.value })}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
          >
            {dateFormats.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          {config.outputFormat === 'custom' && (
            <input
              type="text"
              value={config.outputFormat || ''}
              onChange={(e) => updateConfig({ outputFormat: e.target.value })}
              className={`w-full mt-2 px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
              placeholder="YYYY-MM-DD HH:mm:ss"
            />
          )}
        </div>
      )}

      {config.operation === 'parse' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Input Format
          </label>
          <select
            value={config.inputFormat || 'ISO'}
            onChange={(e) => updateConfig({ inputFormat: e.target.value })}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
          >
            {dateFormats.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
      )}

      {(config.operation === 'add' || config.operation === 'subtract') && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount
            </label>
            <input
              type="number"
              value={config.amount || 1}
              onChange={(e) => updateConfig({ amount: parseInt(e.target.value, 10) })}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
              min={1}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit
            </label>
            <select
              value={config.unit || 'days'}
              onChange={(e) => updateConfig({ unit: e.target.value as DateTimeConfig['unit'] })}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            >
              <option value="seconds">Seconds</option>
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
              <option value="years">Years</option>
            </select>
          </div>
        </div>
      )}

      {config.operation === 'diff' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Compare To
            </label>
            <input
              type="text"
              value={config.compareToField || ''}
              onChange={(e) => updateConfig({ compareToField: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
              placeholder="{{ $json.endDate }}"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Return Difference In
            </label>
            <select
              value={config.diffUnit || 'days'}
              onChange={(e) => updateConfig({ diffUnit: e.target.value as DateTimeConfig['diffUnit'] })}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            >
              <option value="seconds">Seconds</option>
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
              <option value="years">Years</option>
            </select>
          </div>
        </>
      )}

      {config.operation === 'extract' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Extract
          </label>
          <select
            value={config.extractPart || 'year'}
            onChange={(e) => updateConfig({ extractPart: e.target.value as DateTimeConfig['extractPart'] })}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
          >
            <option value="year">Year</option>
            <option value="month">Month</option>
            <option value="day">Day</option>
            <option value="hour">Hour</option>
            <option value="minute">Minute</option>
            <option value="second">Second</option>
            <option value="weekday">Weekday</option>
            <option value="weekNumber">Week Number</option>
            <option value="quarter">Quarter</option>
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Timezone
        </label>
        <select
          value={config.timezone || 'UTC'}
          onChange={(e) => updateConfig({ timezone: e.target.value })}
          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
        >
          {timezones.map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default DateTimeConfig as React.FC<Props>;
