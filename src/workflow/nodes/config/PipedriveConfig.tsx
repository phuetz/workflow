/**
 * Pipedrive Node Configuration
 * Sales CRM for deals, persons, and organizations
 */

import React, { useState } from 'react';
import type { PipedriveOperation } from '../../../integrations/pipedrive/pipedrive.types';

interface PipedriveConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const PipedriveConfig: React.FC<PipedriveConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<PipedriveOperation>(
    (config.operation as PipedriveOperation) || 'createDeal'
  );
  const [resource, setResource] = useState<'deal' | 'person' | 'organization'>(
    (config.resource as 'deal' | 'person' | 'organization') || 'deal'
  );
  const [recordId, setRecordId] = useState(config.recordId as string || '');
  const [data, setData] = useState(config.data as Record<string, unknown> || {});
  const [dataInput, setDataInput] = useState('');

  const handleOperationChange = (newOperation: PipedriveOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleResourceChange = (newResource: 'deal' | 'person' | 'organization') => {
    setResource(newResource);
    const opMap = {
      deal: 'createDeal',
      person: 'createPerson',
      organization: 'createOrganization'
    };
    handleOperationChange(opMap[newResource] as PipedriveOperation);
  };

  const handleRecordIdChange = (value: string) => {
    setRecordId(value);
    onChange({ ...config, recordId: value });
  };

  const handleDataChange = (newData: Record<string, unknown>) => {
    setData(newData);
    onChange({ ...config, data: newData });
  };

  const addData = () => {
    try {
      const parsed = JSON.parse(dataInput);
      handleDataChange({ ...data, ...parsed });
      setDataInput('');
    } catch {
      // Invalid JSON, ignore
    }
  };

  const loadExample = (example: 'deal' | 'person' | 'organization') => {
    if (example === 'deal') {
      handleResourceChange('deal');
      handleOperationChange('createDeal');
      handleDataChange({
        title: 'New Sales Opportunity',
        value: 5000,
        currency: 'USD',
        status: 'open',
        person_id: 123,
        expected_close_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    } else if (example === 'person') {
      handleResourceChange('person');
      handleOperationChange('createPerson');
      handleDataChange({
        name: 'John Doe',
        email: [{ value: 'john.doe@example.com', primary: true }],
        phone: [{ value: '+1234567890', primary: true }],
        visible_to: '3'
      });
    } else if (example === 'organization') {
      handleResourceChange('organization');
      handleOperationChange('createOrganization');
      handleDataChange({
        name: 'Acme Corporation',
        address: '123 Main St, San Francisco, CA',
        visible_to: '3'
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Resource Type
        </label>
        <select
          value={resource}
          onChange={(e) => handleResourceChange(e.target.value as 'deal' | 'person' | 'organization')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
        >
          <option value="deal">Deal</option>
          <option value="person">Person</option>
          <option value="organization">Organization</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as PipedriveOperation)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
        >
          {resource === 'deal' && (
            <>
              <option value="createDeal">Create Deal</option>
              <option value="updateDeal">Update Deal</option>
              <option value="getDeal">Get Deal</option>
              <option value="listDeals">List Deals</option>
            </>
          )}
          {resource === 'person' && (
            <>
              <option value="createPerson">Create Person</option>
              <option value="updatePerson">Update Person</option>
              <option value="getPerson">Get Person</option>
              <option value="listPersons">List Persons</option>
            </>
          )}
          {resource === 'organization' && (
            <>
              <option value="createOrganization">Create Organization</option>
              <option value="updateOrganization">Update Organization</option>
            </>
          )}
        </select>
      </div>

      {(operation.includes('update') || operation.includes('get')) && !operation.includes('list') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Record ID
          </label>
          <input
            type="text"
            value={recordId}
            onChange={(e) => handleRecordIdChange(e.target.value)}
            placeholder="123 or {{ $json.id }}"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Pipedrive record ID (supports expressions)
          </p>
        </div>
      )}

      {(operation.includes('create') || operation.includes('update')) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data
          </label>
          <div className="space-y-2">
            {Object.keys(data).length > 0 && (
              <div className="bg-gray-50 p-3 rounded border border-gray-200">
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={dataInput}
                onChange={(e) => setDataInput(e.target.value)}
                placeholder='{"title": "New Deal", "value": 5000}'
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 font-mono text-sm"
              />
              <button
                onClick={addData}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Add
              </button>
            </div>
            <p className="text-xs text-gray-500">
              {resource === 'deal' && 'Common: title (required), value, currency, status, stage_id, person_id'}
              {resource === 'person' && 'Common: name (required), email, phone, org_id, visible_to'}
              {resource === 'organization' && 'Common: name (required), address, owner_id, visible_to'}
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
            onClick={() => loadExample('deal')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Create Deal
          </button>
          <button
            onClick={() => loadExample('person')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Create Person
          </button>
          <button
            onClick={() => loadExample('organization')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Create Org
          </button>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-md p-3">
        <p className="text-sm text-green-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-green-700">
          Requires API Token. Configure in Credentials Manager with your company domain.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600 space-y-1">
          <div><strong>API Version:</strong> v1</div>
          <div><strong>Rate Limits:</strong> 10,000 requests per day (adjustable by plan)</div>
          <div><strong>Documentation:</strong> developers.pipedrive.com/docs/api/v1</div>
        </p>
      </div>
    </div>
  );
};
