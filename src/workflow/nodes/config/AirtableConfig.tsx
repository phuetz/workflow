/**
 * Airtable Node Configuration
 * Flexible database with spreadsheet interface
 */

import React, { useState } from 'react';
import type { AirtableOperation } from '../../../integrations/airtable/airtable.types';

interface AirtableConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const AirtableConfig: React.FC<AirtableConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<AirtableOperation>(
    (config.operation as AirtableOperation) || 'create'
  );
  const [tableName, setTableName] = useState(config.tableName as string || '');
  const [recordId, setRecordId] = useState(config.recordId as string || '');
  const [fields, setFields] = useState(config.fields as Record<string, unknown> || {});
  const [fieldInput, setFieldInput] = useState('');
  const [filterFormula, setFilterFormula] = useState(config.filterFormula as string || '');

  const handleOperationChange = (newOperation: AirtableOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleTableNameChange = (value: string) => {
    setTableName(value);
    onChange({ ...config, tableName: value });
  };

  const handleRecordIdChange = (value: string) => {
    setRecordId(value);
    onChange({ ...config, recordId: value });
  };

  const handleFieldsChange = (newFields: Record<string, unknown>) => {
    setFields(newFields);
    onChange({ ...config, fields: newFields });
  };

  const handleFilterFormulaChange = (value: string) => {
    setFilterFormula(value);
    onChange({ ...config, filterFormula: value });
  };

  const addField = () => {
    try {
      const parsed = JSON.parse(fieldInput);
      handleFieldsChange({ ...fields, ...parsed });
      setFieldInput('');
    } catch {
      // Invalid JSON, ignore
    }
  };

  const loadExample = (example: 'create' | 'list' | 'update') => {
    if (example === 'create') {
      handleOperationChange('create');
      handleTableNameChange('Contacts');
      handleFieldsChange({
        Name: 'John Doe',
        Email: 'john.doe@example.com',
        Phone: '+1234567890',
        Status: 'Active',
        Tags: ['Customer', 'Premium']
      });
    } else if (example === 'list') {
      handleOperationChange('list');
      handleTableNameChange('Tasks');
      handleFilterFormulaChange('AND({Status} = "In Progress", {Priority} = "High")');
    } else if (example === 'update') {
      handleOperationChange('update');
      handleTableNameChange('Projects');
      handleRecordIdChange('{{ $json.id }}');
      handleFieldsChange({
        Status: 'Completed',
        'Completion Date': new Date().toISOString().split('T')[0]
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as AirtableOperation)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500"
        >
          <option value="create">Create Record</option>
          <option value="update">Update Record</option>
          <option value="get">Get Record</option>
          <option value="list">List Records</option>
          <option value="delete">Delete Record</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Table Name
        </label>
        <input
          type="text"
          value={tableName}
          onChange={(e) => handleTableNameChange(e.target.value)}
          placeholder="Contacts, Tasks, Projects..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Exact name of the table in your Airtable base
        </p>
      </div>

      {(operation === 'update' || operation === 'get' || operation === 'delete') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Record ID
          </label>
          <input
            type="text"
            value={recordId}
            onChange={(e) => handleRecordIdChange(e.target.value)}
            placeholder="recXXXXXXXXXXXXXX or {{ $json.id }}"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Airtable record ID (starts with 'rec', supports expressions)
          </p>
        </div>
      )}

      {(operation === 'create' || operation === 'update') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fields
          </label>
          <div className="space-y-2">
            {Object.keys(fields).length > 0 && (
              <div className="bg-gray-50 p-3 rounded border border-gray-200">
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(fields, null, 2)}
                </pre>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={fieldInput}
                onChange={(e) => setFieldInput(e.target.value)}
                placeholder='{"Name": "John Doe", "Email": "john@example.com"}'
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 font-mono text-sm"
              />
              <button
                onClick={addField}
                className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                Add
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Field names must match exactly with your Airtable base. Arrays: ["tag1", "tag2"]
            </p>
          </div>
        </div>
      )}

      {operation === 'list' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filter Formula (Optional)
          </label>
          <textarea
            value={filterFormula}
            onChange={(e) => handleFilterFormulaChange(e.target.value)}
            placeholder='AND({Status} = "Active", {Priority} = "High")'
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Airtable formula syntax. Examples: {`{Status} = "Active"`}, {`OR({Tag} = "A", {Tag} = "B")`}
          </p>
        </div>
      )}

      <div className="border-t pt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Quick Examples
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => loadExample('create')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Create Contact
          </button>
          <button
            onClick={() => loadExample('list')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            List Tasks
          </button>
          <button
            onClick={() => loadExample('update')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Update Project
          </button>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
        <p className="text-sm text-yellow-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-yellow-700">
          Requires API Key or Personal Access Token + Base ID. Configure in Credentials Manager.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600 space-y-1">
          <div><strong>API Version:</strong> v0</div>
          <div><strong>Base ID:</strong> Found in API documentation or URL (appXXXXXXXXXXXXXX)</div>
          <div><strong>Rate Limits:</strong> 5 requests per second per base</div>
          <div><strong>Documentation:</strong> airtable.com/developers/web/api/introduction</div>
        </p>
      </div>
    </div>
  );
};
