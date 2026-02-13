/**
 * HubSpot Node Configuration
 * CRM integration for contacts, deals, and companies
 */

import React, { useState } from 'react';
import type { HubSpotOperation } from '../../../integrations/hubspot/hubspot.types';

interface HubSpotConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const HubSpotConfig: React.FC<HubSpotConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<HubSpotOperation>(
    (config.operation as HubSpotOperation | undefined) || 'createContact'
  );
  const [resource, setResource] = useState<'contact' | 'deal' | 'company'>(
    (config.resource as 'contact' | 'deal' | 'company' | undefined) || 'contact'
  );
  const [recordId, setRecordId] = useState((config.recordId as string | undefined) || '');
  const [properties, setProperties] = useState((config.properties as Record<string, unknown> | undefined) || {});
  const [propertyInput, setPropertyInput] = useState('');

  const handleOperationChange = (newOperation: HubSpotOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleResourceChange = (newResource: 'contact' | 'deal' | 'company') => {
    setResource(newResource);
    const opMap = {
      contact: 'createContact',
      deal: 'createDeal',
      company: 'createCompany'
    };
    handleOperationChange(opMap[newResource] as HubSpotOperation);
  };

  const handleRecordIdChange = (value: string) => {
    setRecordId(value);
    onChange({ ...config, recordId: value });
  };

  const handlePropertiesChange = (newProperties: Record<string, unknown>) => {
    setProperties(newProperties);
    onChange({ ...config, properties: newProperties });
  };

  const addProperty = () => {
    try {
      const parsed = JSON.parse(propertyInput);
      handlePropertiesChange({ ...properties, ...parsed });
      setPropertyInput('');
    } catch {
      // Invalid JSON, ignore
    }
  };

  const loadExample = (example: 'contact' | 'deal' | 'company') => {
    if (example === 'contact') {
      handleResourceChange('contact');
      handleOperationChange('createContact');
      handlePropertiesChange({
        email: 'john.doe@example.com',
        firstname: 'John',
        lastname: 'Doe',
        phone: '+1234567890',
        company: 'Acme Corp',
        lifecyclestage: 'lead'
      });
    } else if (example === 'deal') {
      handleResourceChange('deal');
      handleOperationChange('createDeal');
      handlePropertiesChange({
        dealname: 'New Business Opportunity',
        amount: '50000',
        dealstage: 'qualifiedtobuy',
        pipeline: 'default',
        closedate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    } else if (example === 'company') {
      handleResourceChange('company');
      handleOperationChange('createCompany');
      handlePropertiesChange({
        name: 'Acme Corporation',
        domain: 'acme.com',
        city: 'San Francisco',
        industry: 'COMPUTER_SOFTWARE',
        phone: '+14155551234'
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
          onChange={(e) => handleResourceChange(e.target.value as 'contact' | 'deal' | 'company')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
        >
          <option value="contact">Contact</option>
          <option value="deal">Deal</option>
          <option value="company">Company</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as HubSpotOperation)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
        >
          {resource === 'contact' && (
            <>
              <option value="createContact">Create Contact</option>
              <option value="updateContact">Update Contact</option>
              <option value="getContact">Get Contact</option>
              <option value="searchContacts">Search Contacts</option>
            </>
          )}
          {resource === 'deal' && (
            <>
              <option value="createDeal">Create Deal</option>
              <option value="updateDeal">Update Deal</option>
              <option value="getDeal">Get Deal</option>
            </>
          )}
          {resource === 'company' && (
            <>
              <option value="createCompany">Create Company</option>
              <option value="updateCompany">Update Company</option>
              <option value="getCompany">Get Company</option>
            </>
          )}
        </select>
      </div>

      {(operation.includes('update') || operation.includes('get')) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Record ID
          </label>
          <input
            type="text"
            value={recordId}
            onChange={(e) => handleRecordIdChange(e.target.value)}
            placeholder="12345678 or {{ $json.id }}"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            HubSpot record ID (supports expressions)
          </p>
        </div>
      )}

      {(operation.includes('create') || operation.includes('update')) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Properties
          </label>
          <div className="space-y-2">
            {Object.keys(properties).length > 0 && (
              <div className="bg-gray-50 p-3 rounded border border-gray-200">
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(properties, null, 2)}
                </pre>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={propertyInput}
                onChange={(e) => setPropertyInput(e.target.value)}
                placeholder='{"email": "user@example.com", "firstname": "John"}'
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 font-mono text-sm"
              />
              <button
                onClick={addProperty}
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
              >
                Add
              </button>
            </div>
            <p className="text-xs text-gray-500">
              {resource === 'contact' && 'Common: email, firstname, lastname, phone, company, lifecyclestage'}
              {resource === 'deal' && 'Common: dealname, amount, dealstage, pipeline, closedate'}
              {resource === 'company' && 'Common: name, domain, city, industry, phone'}
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
            onClick={() => loadExample('contact')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Create Contact
          </button>
          <button
            onClick={() => loadExample('deal')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Create Deal
          </button>
          <button
            onClick={() => loadExample('company')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Create Company
          </button>
        </div>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
        <p className="text-sm text-orange-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-orange-700">
          Requires API Key or OAuth 2.0 access token. Configure in Credentials Manager.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600 space-y-1">
          <div><strong>API Version:</strong> v3</div>
          <div><strong>Rate Limits:</strong> 100 requests per 10 seconds (API key), higher for OAuth</div>
          <div><strong>Documentation:</strong> developers.hubspot.com/docs/api/overview</div>
        </p>
      </div>
    </div>
  );
};
