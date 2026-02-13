/**
 * CostSettings Component
 * Budget configuration and notification settings
 */

import React from 'react';
import { BarChart, Share2 } from 'lucide-react';
import type { CostSettingsProps, BudgetSettings } from './types';

const COST_CENTERS = ['Engineering', 'Marketing', 'Sales', 'Operations', 'IT'];

export function CostSettings({
  budgetSettings,
  darkMode,
  onUpdateSettings,
}: CostSettingsProps) {
  return (
    <div className="space-y-6">
      {/* Budget Settings */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Budget Settings</h3>
        <div
          className={`p-4 rounded-lg ${
            darkMode ? 'bg-gray-700' : 'bg-white'
          } shadow border space-y-4`}
        >
          <BudgetInput
            label="Monthly Budget ($)"
            value={budgetSettings.monthlyBudget}
            onChange={value => onUpdateSettings('monthlyBudget', value)}
            darkMode={darkMode}
          />

          <AlertThresholdSlider
            value={budgetSettings.alertThreshold}
            onChange={value => onUpdateSettings('alertThreshold', value)}
          />

          <OverdraftProtectionToggle
            checked={budgetSettings.overdraftProtection}
            onChange={value => onUpdateSettings('overdraftProtection', value)}
          />

          <CostCenterSelect
            value={budgetSettings.costCenter}
            onChange={value => onUpdateSettings('costCenter', value)}
            darkMode={darkMode}
          />

          <button
            className={`w-full py-2 rounded ${
              darkMode ? 'bg-green-700 hover:bg-green-600' : 'bg-green-500 hover:bg-green-600'
            } text-white transition-colors`}
          >
            Save Settings
          </button>
        </div>
      </div>

      {/* Notification Settings */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Cost Notifications</h3>
        <div
          className={`p-4 rounded-lg ${
            darkMode ? 'bg-gray-700' : 'bg-white'
          } shadow border`}
        >
          <div className="space-y-3">
            <NotificationToggle label="Email alerts" defaultChecked />
            <NotificationToggle label="In-app alerts" defaultChecked />
            <NotificationToggle label="Weekly reports" defaultChecked />
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="flex space-x-2 mt-4">
        <button className="flex-1 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center justify-center space-x-2">
          <BarChart size={16} />
          <span>Export CSV Report</span>
        </button>
        <button className="flex-1 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 flex items-center justify-center space-x-2">
          <Share2 size={16} />
          <span>Share with Team</span>
        </button>
      </div>
    </div>
  );
}

interface BudgetInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  darkMode: boolean;
}

function BudgetInput({ label, value, onChange, darkMode }: BudgetInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      <input
        type="number"
        min="0"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className={`w-full px-3 py-2 border rounded ${
          darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
        }`}
      />
    </div>
  );
}

interface AlertThresholdSliderProps {
  value: number;
  onChange: (value: number) => void;
}

function AlertThresholdSlider({ value, onChange }: AlertThresholdSliderProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">Alert Threshold (% of budget)</label>
      <input
        type="range"
        min="50"
        max="95"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full"
      />
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>50%</span>
        <span>{value}%</span>
        <span>95%</span>
      </div>
    </div>
  );
}

interface OverdraftProtectionToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
}

function OverdraftProtectionToggle({ checked, onChange }: OverdraftProtectionToggleProps) {
  return (
    <div className="flex items-center">
      <input
        type="checkbox"
        id="overdraftProtection"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="mr-2"
      />
      <label htmlFor="overdraftProtection" className="text-sm">
        Budget overdraft protection
      </label>
    </div>
  );
}

interface CostCenterSelectProps {
  value: string;
  onChange: (value: string) => void;
  darkMode: boolean;
}

function CostCenterSelect({ value, onChange, darkMode }: CostCenterSelectProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">Cost Center</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full px-3 py-2 border rounded ${
          darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
        }`}
      >
        {COST_CENTERS.map(center => (
          <option key={center} value={center}>
            {center}
          </option>
        ))}
      </select>
    </div>
  );
}

interface NotificationToggleProps {
  label: string;
  defaultChecked?: boolean;
}

function NotificationToggle({ label, defaultChecked = false }: NotificationToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm">{label}</div>
      <div className="relative inline-block w-10 mr-2 align-middle select-none">
        <input
          type="checkbox"
          id={label.replace(/\s+/g, '-')}
          defaultChecked={defaultChecked}
          className="sr-only"
        />
        <label
          htmlFor={label.replace(/\s+/g, '-')}
          className="block h-6 overflow-hidden bg-gray-300 rounded-full cursor-pointer"
        >
          <span
            className={`block h-6 w-6 rounded-full bg-green-500 transform transition-transform ${
              defaultChecked ? 'translate-x-full' : ''
            }`}
          />
        </label>
      </div>
    </div>
  );
}
