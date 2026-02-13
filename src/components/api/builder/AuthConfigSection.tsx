import React from 'react';
import { APIEndpoint } from './types';

interface AuthConfigSectionProps {
  darkMode: boolean;
  authentication: APIEndpoint['authentication'];
  onChange: (auth: APIEndpoint['authentication']) => void;
}

export function AuthConfigSection({ darkMode, authentication, onChange }: AuthConfigSectionProps) {
  return (
    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
      <h4 className="font-medium mb-3">Authentication</h4>
      <div className="space-y-3">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={authentication.required}
            onChange={(e) => onChange({
              ...authentication,
              required: e.target.checked
            })}
            className="rounded"
          />
          <span className="text-sm">Require Authentication</span>
        </label>

        {authentication.required && (
          <div>
            <label className="block text-sm font-medium mb-2">Auth Type</label>
            <select
              value={authentication.type}
              onChange={(e) => onChange({
                ...authentication,
                type: e.target.value as 'api_key' | 'bearer' | 'basic' | 'oauth2' | 'none'
              })}
              className={`w-full px-3 py-2 border rounded-lg ${
                darkMode
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-200 text-gray-900'
              }`}
            >
              <option value="api_key">API Key</option>
              <option value="bearer">Bearer Token</option>
              <option value="basic">Basic Auth</option>
              <option value="oauth2">OAuth 2.0</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
