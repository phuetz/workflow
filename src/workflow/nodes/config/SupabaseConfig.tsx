import React, { useState } from 'react';
import { WorkflowNode } from '../../../types/workflow';

interface SupabaseConfigProps {
  node: WorkflowNode;
  onChange: (config: Record<string, unknown>) => void;
}

interface SupabaseConfig {
  operation: 'select' | 'insert' | 'update' | 'delete' | 'rpc' | 'storage_upload' | 'storage_download' | 'auth_signUp';
  table?: string;
  select?: string;
  filters?: Array<{
    column: string;
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'is' | 'in';
    value: string;
  }>;
  data?: Record<string, unknown>;
  bucket?: string;
  path?: string;
  functionName?: string;
  params?: Record<string, unknown>;
  credentials?: {
    url: string;
    anonKey: string;
    serviceRoleKey?: string;
  };
}

export const SupabaseConfig: React.FC<SupabaseConfigProps> = ({ node, onChange }) => {
  const [config, setConfig] = useState<SupabaseConfig>(
    (node.data.config as unknown as SupabaseConfig) || {
      operation: 'select',
      select: '*',
      filters: [],
      credentials: {
        url: '',
        anonKey: '',
      }
    }
  );

  const handleChange = (updates: Partial<SupabaseConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onChange(newConfig);
  };

  const handleCredentialChange = (field: keyof NonNullable<SupabaseConfig['credentials']>, value: string) => {
    const newCredentials = { ...config.credentials, [field]: value };
    handleChange({ credentials: newCredentials as SupabaseConfig['credentials'] });
  };

  const addFilter = () => {
    const newFilters = [
      ...(config.filters || []),
      { column: '', operator: 'eq' as const, value: '' }
    ];
    handleChange({ filters: newFilters });
  };

  const removeFilter = (index: number) => {
    const newFilters = config.filters?.filter((_, i) => i !== index) || [];
    handleChange({ filters: newFilters });
  };

  const updateFilter = (index: number, field: string, value: string) => {
    const newFilters = [...(config.filters || [])];
    newFilters[index] = { ...newFilters[index], [field]: value };
    handleChange({ filters: newFilters });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Supabase Configuration</h3>
        <p className="text-sm text-gray-600 mb-4">
          Connect to Supabase for database, storage, and authentication
        </p>
      </div>

      {/* Credentials */}
      <div className="border-b pb-4">
        <h4 className="text-sm font-medium mb-2">Project Credentials</h4>
        <div className="space-y-2">
          <div>
            <label className="block text-sm mb-1">Project URL</label>
            <input
              type="text"
              className="w-full p-2 border rounded font-mono text-sm"
              value={config.credentials?.url || ''}
              onChange={(e) => handleCredentialChange('url', e.target.value)}
              placeholder="https://xxxxx.supabase.co"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Anon/Public Key</label>
            <input
              type="password"
              className="w-full p-2 border rounded font-mono text-sm"
              value={config.credentials?.anonKey || ''}
              onChange={(e) => handleCredentialChange('anonKey', e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Service Role Key (optional, for admin operations)</label>
            <input
              type="password"
              className="w-full p-2 border rounded font-mono text-sm"
              value={config.credentials?.serviceRoleKey || ''}
              onChange={(e) => handleCredentialChange('serviceRoleKey', e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            />
            <p className="text-xs text-gray-500 mt-1">
              ⚠️ Use service role key only for server-side operations
            </p>
          </div>
        </div>
      </div>

      {/* Operation Selection */}
      <div>
        <label className="block text-sm font-medium mb-1">Operation</label>
        <select
          className="w-full p-2 border rounded"
          value={config.operation}
          onChange={(e) => handleChange({ operation: e.target.value as SupabaseConfig['operation'] })}
        >
          <optgroup label="Database">
            <option value="select">Select / Query</option>
            <option value="insert">Insert</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="rpc">Call Function (RPC)</option>
          </optgroup>
          <optgroup label="Storage">
            <option value="storage_upload">Upload File</option>
            <option value="storage_download">Download File</option>
          </optgroup>
          <optgroup label="Auth">
            <option value="auth_signUp">Sign Up User</option>
          </optgroup>
        </select>
      </div>

      {/* Database Operations */}
      {['select', 'insert', 'update', 'delete'].includes(config.operation) && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-2">Database Operation</h4>

          <div className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Table Name</label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={config.table || ''}
                onChange={(e) => handleChange({ table: e.target.value })}
                placeholder="users"
              />
            </div>

            {config.operation === 'select' && (
              <div>
                <label className="block text-sm mb-1">Select Columns</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded font-mono text-sm"
                  value={config.select || '*'}
                  onChange={(e) => handleChange({ select: e.target.value })}
                  placeholder="*, id, name, email"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Comma-separated column names, or * for all
                </p>
              </div>
            )}

            {/* Filters */}
            {['select', 'update', 'delete'].includes(config.operation) && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium">Filters</label>
                  <button
                    type="button"
                    onClick={addFilter}
                    className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    + Add Filter
                  </button>
                </div>

                {config.filters?.map((filter, index) => (
                  <div key={index} className="border p-3 rounded mb-2 bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium">Filter #{index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeFilter(index)}
                        className="text-red-500 text-sm hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        className="p-2 border rounded"
                        placeholder="Column"
                        value={filter.column}
                        onChange={(e) => updateFilter(index, 'column', e.target.value)}
                      />
                      <select
                        className="p-2 border rounded"
                        value={filter.operator}
                        onChange={(e) => updateFilter(index, 'operator', e.target.value)}
                      >
                        <option value="eq">=</option>
                        <option value="neq">!=</option>
                        <option value="gt">&gt;</option>
                        <option value="gte">&gt;=</option>
                        <option value="lt">&lt;</option>
                        <option value="lte">&lt;=</option>
                        <option value="like">LIKE</option>
                        <option value="ilike">ILIKE</option>
                        <option value="is">IS</option>
                        <option value="in">IN</option>
                      </select>
                      <input
                        type="text"
                        className="p-2 border rounded"
                        placeholder="Value"
                        value={filter.value}
                        onChange={(e) => updateFilter(index, 'value', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Data for insert/update */}
            {['insert', 'update'].includes(config.operation) && (
              <div>
                <label className="block text-sm mb-1">Data (JSON)</label>
                <textarea
                  className="w-full p-2 border rounded font-mono text-sm"
                  rows={4}
                  value={JSON.stringify(config.data || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      handleChange({ data: parsed });
                    } catch {
                      // Invalid JSON, ignore
                    }
                  }}
                  placeholder={'{\n  "name": "John",\n  "email": "john@example.com"\n}'}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* RPC Function Call */}
      {config.operation === 'rpc' && (
        <div className="border-t pt-4 space-y-3">
          <div>
            <label className="block text-sm mb-1">Function Name</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              value={config.functionName || ''}
              onChange={(e) => handleChange({ functionName: e.target.value })}
              placeholder="my_custom_function"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Parameters (JSON)</label>
            <textarea
              className="w-full p-2 border rounded font-mono text-sm"
              rows={4}
              value={JSON.stringify(config.params || {}, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  handleChange({ params: parsed });
                } catch {
                  // Invalid JSON
                }
              }}
              placeholder={'{\n  "param1": "value1"\n}'}
            />
          </div>
        </div>
      )}

      {/* Storage Operations */}
      {config.operation.startsWith('storage_') && (
        <div className="border-t pt-4 space-y-3">
          <div>
            <label className="block text-sm mb-1">Bucket Name</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              value={config.bucket || ''}
              onChange={(e) => handleChange({ bucket: e.target.value })}
              placeholder="avatars"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">File Path</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              value={config.path || ''}
              onChange={(e) => handleChange({ path: e.target.value })}
              placeholder="public/avatar.png"
            />
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 mt-4 p-3 bg-green-50 rounded">
        <strong>🚀 Supabase:</strong> Get your project credentials from the{' '}
        <a
          href="https://supabase.com/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Supabase Dashboard
        </a>{' '}
        → Settings → API
      </div>
    </div>
  );
};
