import React, { useState } from 'react';
import { WorkflowNode } from '../../../types/workflow';

interface TypeformConfigProps {
  node: WorkflowNode;
  onChange: (config: Record<string, unknown>) => void;
}

interface TypeformConfig {
  operation: 'getResponses' | 'createForm' | 'getForm' | 'listForms' | 'deleteResponse';
  formId?: string;
  workspaceId?: string;
  since?: string;
  until?: string;
  pageSize?: number;
  completed?: boolean;
  credentials?: {
    personalAccessToken: string;
  };
}

export const TypeformConfig: React.FC<TypeformConfigProps> = ({ node, onChange }) => {
  const [config, setConfig] = useState<TypeformConfig>(
    (node.data.config as unknown as TypeformConfig) || {
      operation: 'getResponses',
      pageSize: 25,
      completed: true,
      credentials: {
        personalAccessToken: ''
      }
    }
  );

  const handleChange = (updates: Partial<TypeformConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onChange(newConfig);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Typeform Configuration</h3>
        <p className="text-sm text-gray-600 mb-4">
          Connect to Typeform to retrieve form responses and manage forms
        </p>
      </div>

      {/* Credentials */}
      <div>
        <label className="block text-sm font-medium mb-1">Personal Access Token</label>
        <input
          type="password"
          className="w-full p-2 border rounded font-mono text-sm"
          value={config.credentials?.personalAccessToken || ''}
          onChange={(e) => handleChange({
            credentials: { personalAccessToken: e.target.value }
          })}
          placeholder="tfp_xxxxxxxxxxxxx"
        />
        <p className="text-xs text-gray-500 mt-1">
          Get your token from <a
            href="https://admin.typeform.com/account#/section/tokens"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Typeform Settings
          </a>
        </p>
      </div>

      {/* Operation Selection */}
      <div>
        <label className="block text-sm font-medium mb-1">Operation</label>
        <select
          className="w-full p-2 border rounded"
          value={config.operation}
          onChange={(e) => handleChange({ operation: e.target.value as TypeformConfig['operation'] })}
        >
          <option value="getResponses">Get Form Responses</option>
          <option value="listForms">List All Forms</option>
          <option value="getForm">Get Form Details</option>
          <option value="createForm">Create New Form</option>
          <option value="deleteResponse">Delete Response</option>
        </select>
      </div>

      {/* Form ID (for most operations) */}
      {['getResponses', 'getForm', 'deleteResponse'].includes(config.operation) && (
        <div>
          <label className="block text-sm font-medium mb-1">Form ID</label>
          <input
            type="text"
            className="w-full p-2 border rounded font-mono text-sm"
            value={config.formId || ''}
            onChange={(e) => handleChange({ formId: e.target.value })}
            placeholder="FormID"
          />
          <p className="text-xs text-gray-500 mt-1">
            The unique identifier for your Typeform
          </p>
        </div>
      )}

      {/* Get Responses Options */}
      {config.operation === 'getResponses' && (
        <>
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-2">Filter Options</h4>

            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Since (datetime)</label>
                <input
                  type="datetime-local"
                  className="w-full p-2 border rounded"
                  value={config.since || ''}
                  onChange={(e) => handleChange({ since: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Only get responses submitted after this date/time
                </p>
              </div>

              <div>
                <label className="block text-sm mb-1">Until (datetime)</label>
                <input
                  type="datetime-local"
                  className="w-full p-2 border rounded"
                  value={config.until || ''}
                  onChange={(e) => handleChange({ until: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Only get responses submitted before this date/time
                </p>
              </div>

              <div>
                <label className="block text-sm mb-1">Page Size</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  className="w-full p-2 border rounded"
                  value={config.pageSize || 25}
                  onChange={(e) => handleChange({ pageSize: parseInt(e.target.value) })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Number of responses to retrieve (1-1000)
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="completed"
                  className="mr-2"
                  checked={config.completed}
                  onChange={(e) => handleChange({ completed: e.target.checked })}
                />
                <label htmlFor="completed" className="text-sm">
                  Only completed responses
                </label>
              </div>
            </div>
          </div>
        </>
      )}

      {/* List Forms Options */}
      {config.operation === 'listForms' && (
        <div className="border-t pt-4">
          <div>
            <label className="block text-sm font-medium mb-1">Workspace ID (optional)</label>
            <input
              type="text"
              className="w-full p-2 border rounded font-mono text-sm"
              value={config.workspaceId || ''}
              onChange={(e) => handleChange({ workspaceId: e.target.value })}
              placeholder="Leave empty to list all forms"
            />
            <p className="text-xs text-gray-500 mt-1">
              Filter forms by workspace
            </p>
          </div>

          <div className="mt-3">
            <label className="block text-sm mb-1">Page Size</label>
            <input
              type="number"
              min="1"
              max="200"
              className="w-full p-2 border rounded"
              value={config.pageSize || 25}
              onChange={(e) => handleChange({ pageSize: parseInt(e.target.value) })}
            />
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 mt-4 p-3 bg-blue-50 rounded">
        <strong>API Limits:</strong> Typeform API has rate limits based on your plan.
        Free accounts: 100 requests/min. Pro+: Higher limits.
      </div>
    </div>
  );
};
