/**
 * Salesforce Node Configuration
 * CRM integration with SOQL queries and object operations
 */

import React, { useState } from 'react';
import type { SalesforceOperation } from '../../../integrations/salesforce/salesforce.types';

interface SalesforceConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const SalesforceConfig: React.FC<SalesforceConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<SalesforceOperation>(
    (config.operation as SalesforceOperation) || 'query'
  );
  const [soql, setSoql] = useState(config.soql as string || '');
  const [sobject, setSobject] = useState(config.sobject as string || 'Account');
  const [recordId, setRecordId] = useState(config.recordId as string || '');
  const [fields, setFields] = useState(config.fields as Record<string, unknown> || {});
  const [fieldInput, setFieldInput] = useState('');

  const handleOperationChange = (newOperation: SalesforceOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleSoqlChange = (value: string) => {
    setSoql(value);
    onChange({ ...config, soql: value });
  };

  const handleSobjectChange = (value: string) => {
    setSobject(value);
    onChange({ ...config, sobject: value });
  };

  const handleRecordIdChange = (value: string) => {
    setRecordId(value);
    onChange({ ...config, recordId: value });
  };

  const handleFieldsChange = (newFields: Record<string, unknown>) => {
    setFields(newFields);
    onChange({ ...config, fields: newFields });
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

  const loadExample = (example: 'query' | 'create' | 'update') => {
    if (example === 'query') {
      handleSoqlChange('SELECT Id, Name, Email FROM Contact WHERE LastName = \'Smith\' LIMIT 10');
      handleOperationChange('query');
    } else if (example === 'create') {
      handleOperationChange('create');
      handleSobjectChange('Contact');
      handleFieldsChange({
        FirstName: 'John',
        LastName: 'Doe',
        Email: 'john.doe@example.com',
        Phone: '+1234567890'
      });
    } else if (example === 'update') {
      handleOperationChange('update');
      handleSobjectChange('Account');
      handleRecordIdChange('{{ $node["Previous"].json["id"] }}');
      handleFieldsChange({
        Name: 'Updated Account Name',
        Industry: 'Technology'
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
          onChange={(e) => handleOperationChange(e.target.value as SalesforceOperation)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
        >
          <option value="query">Query (SOQL)</option>
          <option value="create">Create Record</option>
          <option value="update">Update Record</option>
          <option value="get">Get Record</option>
          <option value="delete">Delete Record</option>
        </select>
      </div>

      {operation === 'query' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            SOQL Query
          </label>
          <textarea
            value={soql}
            onChange={(e) => handleSoqlChange(e.target.value)}
            placeholder="SELECT Id, Name FROM Account WHERE Industry = 'Technology' LIMIT 10"
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Use Salesforce Object Query Language (SOQL) to query records
          </p>
        </div>
      )}

      {(operation === 'create' || operation === 'update' || operation === 'get' || operation === 'delete') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Object Type (SObject)
          </label>
          <input
            type="text"
            value={sobject}
            onChange={(e) => handleSobjectChange(e.target.value)}
            placeholder="Account, Contact, Lead, Opportunity..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Common objects: Account, Contact, Lead, Opportunity, Case, Task
          </p>
        </div>
      )}

      {(operation === 'update' || operation === 'get' || operation === 'delete') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Record ID
          </label>
          <input
            type="text"
            value={recordId}
            onChange={(e) => handleRecordIdChange(e.target.value)}
            placeholder="0015g00000XXXXXX or {{ $json.id }}"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Salesforce 18-character record ID (supports expressions)
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
                placeholder='{"FirstName": "John", "LastName": "Doe"}'
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
              <button
                onClick={addField}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Enter fields as JSON object. Example: {`{"Name": "Acme Corp", "Industry": "Technology"}`}
            </p>
          </div>
        </div>
      )}

      <div className="border-t pt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Quick Examples
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => loadExample('query')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Query Contacts
          </button>
          <button
            onClick={() => loadExample('create')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Create Contact
          </button>
          <button
            onClick={() => loadExample('update')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Update Account
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm text-blue-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-blue-700">
          Requires OAuth 2.0 access token and instance URL. Configure in Credentials Manager.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600 space-y-1">
          <div><strong>API Version:</strong> v58.0</div>
          <div><strong>Rate Limits:</strong> Check Salesforce API limits for your org</div>
          <div><strong>Documentation:</strong> developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest</div>
        </p>
      </div>
    </div>
  );
};
