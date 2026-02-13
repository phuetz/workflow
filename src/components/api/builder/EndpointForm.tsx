import React from 'react';
import { X } from 'lucide-react';
import { APIEndpoint } from './types';
import { AuthConfigSection } from './AuthConfigSection';
import { RateLimitSection } from './RateLimitSection';
import { QueryParamsEditor } from './QueryParamsEditor';

interface EndpointFormProps {
  darkMode: boolean;
  formData: Partial<APIEndpoint>;
  isEditing: boolean;
  onFormChange: (data: Partial<APIEndpoint>) => void;
  onSave: () => void;
  onCancel: () => void;
  onAddParameter: (type: 'headers' | 'queryParams') => void;
}

export function EndpointForm({
  darkMode,
  formData,
  isEditing,
  onFormChange,
  onSave,
  onCancel,
  onAddParameter
}: EndpointFormProps) {
  const validateName = (value: string) => {
    return value.length <= 100 && /^[a-zA-Z0-9\s\-_()]*$/.test(value);
  };

  const validatePath = (value: string) => {
    return value.length <= 500 && /^[a-zA-Z0-9/_\-{}:]*$/.test(value) && !value.includes('..');
  };

  const validateDescription = (value: string) => {
    return value.length <= 1000;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`w-full max-w-4xl max-h-[90vh] ${
        darkMode ? 'bg-gray-900' : 'bg-white'
      } rounded-xl shadow-2xl overflow-hidden`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {isEditing ? 'Edit Endpoint' : 'Create New Endpoint'}
            </h3>
            <button
              onClick={onCancel}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6 overflow-y-auto" style={{ height: 'calc(90vh - 140px)' }}>
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => {
                    if (validateName(e.target.value)) {
                      onFormChange({ ...formData, name: e.target.value });
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    darkMode
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-200 text-gray-900'
                  }`}
                  placeholder="e.g., Get User Profile"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Method</label>
                <select
                  value={formData.method || 'GET'}
                  onChange={(e) => onFormChange({
                    ...formData,
                    method: e.target.value as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
                  })}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    darkMode
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-200 text-gray-900'
                  }`}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Path</label>
              <input
                type="text"
                value={formData.path || ''}
                onChange={(e) => {
                  if (validatePath(e.target.value)) {
                    onFormChange({ ...formData, path: e.target.value });
                  }
                }}
                className={`w-full px-3 py-2 border rounded-lg ${
                  darkMode
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-white border-gray-200 text-gray-900'
                }`}
                placeholder="/api/users/{id}"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => {
                  if (validateDescription(e.target.value)) {
                    onFormChange({ ...formData, description: e.target.value });
                  }
                }}
                className={`w-full px-3 py-2 border rounded-lg ${
                  darkMode
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-white border-gray-200 text-gray-900'
                }`}
                rows={3}
                placeholder="Describe what this endpoint does..."
              />
            </div>

            {/* Authentication */}
            <AuthConfigSection
              darkMode={darkMode}
              authentication={formData.authentication || { required: false, type: 'none', config: {} }}
              onChange={(auth) => onFormChange({ ...formData, authentication: auth })}
            />

            {/* Rate Limiting */}
            <RateLimitSection
              darkMode={darkMode}
              rateLimit={formData.rateLimit || { enabled: false, requests: 100, window: 60 }}
              onChange={(rateLimit) => onFormChange({ ...formData, rateLimit })}
            />

            {/* Query Parameters */}
            <QueryParamsEditor
              darkMode={darkMode}
              params={formData.request?.queryParams || []}
              onChange={(params) => onFormChange({
                ...formData,
                request: { ...formData.request!, queryParams: params }
              })}
              onAdd={() => onAddParameter('queryParams')}
            />
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
        } flex justify-end space-x-3`}>
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            {isEditing ? 'Update' : 'Create'} Endpoint
          </button>
        </div>
      </div>
    </div>
  );
}
