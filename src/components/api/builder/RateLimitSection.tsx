import React from 'react';
import { APIEndpoint } from './types';

interface RateLimitSectionProps {
  darkMode: boolean;
  rateLimit: APIEndpoint['rateLimit'];
  onChange: (rateLimit: APIEndpoint['rateLimit']) => void;
}

export function RateLimitSection({ darkMode, rateLimit, onChange }: RateLimitSectionProps) {
  const handleRequestsChange = (value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 0 && num <= 10000) {
      onChange({ ...rateLimit, requests: num });
    }
  };

  const handleWindowChange = (value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 1 && num <= 86400) {
      onChange({ ...rateLimit, window: num });
    }
  };

  return (
    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
      <h4 className="font-medium mb-3">Rate Limiting</h4>
      <div className="space-y-3">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={rateLimit.enabled}
            onChange={(e) => onChange({ ...rateLimit, enabled: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm">Enable Rate Limiting</span>
        </label>

        {rateLimit.enabled && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Requests</label>
              <input
                type="number"
                value={rateLimit.requests}
                onChange={(e) => handleRequestsChange(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg ${
                  darkMode
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-white border-gray-200 text-gray-900'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Window (seconds)</label>
              <input
                type="number"
                value={rateLimit.window}
                onChange={(e) => handleWindowChange(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg ${
                  darkMode
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-white border-gray-200 text-gray-900'
                }`}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
