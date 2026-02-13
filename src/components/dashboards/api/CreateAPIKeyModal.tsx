/**
 * Create API Key Modal Component
 * Modal for creating new API keys with permissions
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import type {
  CreateAPIKeyOptions,
  Environment,
  APIScope,
  APIPermission,
  APIResource,
  APIAction
} from './types';

interface CreateAPIKeyModalProps {
  darkMode: boolean;
  onClose: () => void;
  onCreate: (options: CreateAPIKeyOptions) => void;
}

const AVAILABLE_SCOPES: APIScope[] = [
  'workflow:read', 'workflow:write', 'workflow:execute', 'workflow:delete',
  'execution:read', 'execution:write',
  'node:read', 'node:write',
  'credential:read', 'credential:write',
  'variable:read', 'variable:write',
  'schedule:read', 'schedule:write',
  'webhook:read', 'webhook:write',
  'analytics:read',
  'sharing:read', 'sharing:write'
];

export function CreateAPIKeyModal({
  darkMode,
  onClose,
  onCreate
}: CreateAPIKeyModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [environment, setEnvironment] = useState<Environment>('development');
  const [scopes, setScopes] = useState<APIScope[]>(['workflow:read']);
  const [expiresIn] = useState<number | undefined>();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const permissions: APIPermission[] = scopes.map(scope => {
      const [resource, action] = scope.split(':') as [APIResource, APIAction];
      return {
        resource,
        actions: [action]
      };
    });

    onCreate({
      name,
      description: description || undefined,
      environment,
      permissions,
      scopes,
      expiresIn
    });
  };

  const toggleScope = (scope: APIScope, checked: boolean) => {
    if (checked) {
      setScopes(prev => [...prev, scope]);
    } else {
      setScopes(prev => prev.filter(s => s !== scope));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg w-full max-w-2xl`}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2
              className={`text-xl font-semibold ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}
            >
              Create API Key
            </h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg ${
                darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              } transition-colors`}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name and Environment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="My API Key"
                className={`w-full px-3 py-2 rounded-lg border ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
            </div>
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                Environment
              </label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as Environment)}
                className={`w-full px-3 py-2 rounded-lg border ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              >
                <option value="development">Development</option>
                <option value="staging">Staging</option>
                <option value="production">Production</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will this API key be used for?"
              rows={3}
              className={`w-full px-3 py-2 rounded-lg border resize-none ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
          </div>

          {/* Permissions */}
          <div>
            <label
              className={`block text-sm font-medium mb-3 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Permissions
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {AVAILABLE_SCOPES.map(scope => (
                <label key={scope} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={scopes.includes(scope)}
                    onChange={(e) => toggleScope(scope, e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span
                    className={`text-sm ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    {scope}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                darkMode
                  ? 'text-gray-300 hover:bg-gray-700'
                  : 'text-gray-700 hover:bg-gray-100'
              } transition-colors`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name || scopes.length === 0}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                name && scopes.length > 0
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Create API Key
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
