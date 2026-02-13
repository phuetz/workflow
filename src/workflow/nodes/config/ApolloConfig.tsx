/**
 * Apollo.io Node Configuration
 * Sales intelligence and engagement platform
 */

import React, { useState } from 'react';

interface ApolloConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

type ApolloOperation =
  | 'searchPeople'
  | 'searchOrganizations'
  | 'enrichPerson'
  | 'enrichOrganization'
  | 'createContact'
  | 'updateContact'
  | 'addToSequence'
  | 'createTask'
  | 'getEmailStatus';

export const ApolloConfig: React.FC<ApolloConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<ApolloOperation>(
    (config.operation as ApolloOperation) || 'searchPeople'
  );
  const [apiKey, setApiKey] = useState((config.apiKey as string) || '');
  const [searchQuery, setSearchQuery] = useState((config.searchQuery as string) || '');
  const [personEmail, setPersonEmail] = useState((config.personEmail as string) || '');
  const [organizationDomain, setOrganizationDomain] = useState((config.organizationDomain as string) || '');
  const [contactData, setContactData] = useState((config.contactData as string) || '');
  const [sequenceId, setSequenceId] = useState((config.sequenceId as string) || '');
  const [contactId, setContactId] = useState((config.contactId as string) || '');
  const [filters, setFilters] = useState((config.filters as string) || '');
  const [limit, setLimit] = useState((config.limit as number) || 10);

  const handleOperationChange = (newOperation: ApolloOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    onChange({ ...config, apiKey: value });
  };

  const handleSearchQueryChange = (value: string) => {
    setSearchQuery(value);
    onChange({ ...config, searchQuery: value });
  };

  const handlePersonEmailChange = (value: string) => {
    setPersonEmail(value);
    onChange({ ...config, personEmail: value });
  };

  const handleOrganizationDomainChange = (value: string) => {
    setOrganizationDomain(value);
    onChange({ ...config, organizationDomain: value });
  };

  const handleContactDataChange = (value: string) => {
    setContactData(value);
    onChange({ ...config, contactData: value });
  };

  const handleFiltersChange = (value: string) => {
    setFilters(value);
    onChange({ ...config, filters: value });
  };

  const loadExample = (example: 'searchPeople' | 'enrichPerson' | 'addToSequence') => {
    if (example === 'searchPeople') {
      handleOperationChange('searchPeople');
      handleFiltersChange(JSON.stringify({
        person_titles: ['CEO', 'CTO', 'Founder'],
        organization_num_employees_ranges: ['11-50', '51-200'],
        person_locations: ['San Francisco Bay Area'],
        organization_industry_tag_ids: ['5567cd4773696439b10b0000']
      }, null, 2));
      setLimit(25);
    } else if (example === 'enrichPerson') {
      handleOperationChange('enrichPerson');
      handlePersonEmailChange('{{ $json.email }}');
    } else if (example === 'addToSequence') {
      handleOperationChange('addToSequence');
      setContactId('{{ $json.contactId }}');
      setSequenceId('5f9a8b7c6d5e4f3a2b1c0d9e');
    }
  };

  return (
    <div className="space-y-4 bg-gray-900 text-gray-100 p-4 rounded-lg">
      <div className="font-semibold text-lg mb-4 text-white">Apollo.io Configuration</div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          API Key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => handleApiKeyChange(e.target.value)}
          placeholder="API Key or {{ $credentials.apiKey }}"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
        />
        <p className="text-xs text-gray-400 mt-1">
          Apollo.io API key from Settings → Integrations → API
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as ApolloOperation)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="searchPeople">Search People</option>
          <option value="searchOrganizations">Search Organizations</option>
          <option value="enrichPerson">Enrich Person</option>
          <option value="enrichOrganization">Enrich Organization</option>
          <option value="createContact">Create Contact</option>
          <option value="updateContact">Update Contact</option>
          <option value="addToSequence">Add to Sequence</option>
          <option value="createTask">Create Task</option>
          <option value="getEmailStatus">Get Email Status</option>
        </select>
      </div>

      {(operation === 'searchPeople' || operation === 'searchOrganizations') && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Search Filters (JSON)
            </label>
            <textarea
              value={filters}
              onChange={(e) => handleFiltersChange(e.target.value)}
              placeholder={operation === 'searchPeople'
                ? '{"person_titles": ["CEO"], "organization_num_employees_ranges": ["11-50"]}'
                : '{"organization_num_employees_ranges": ["51-200"], "industry_tag_ids": ["..."]}'
              }
              rows={8}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              {operation === 'searchPeople'
                ? 'Filters: person_titles, person_locations, organization_num_employees_ranges, etc.'
                : 'Filters: organization_num_employees_ranges, industry_tag_ids, organization_locations, etc.'
              }
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Limit
            </label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              min={1}
              max={100}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">
              Number of results to return (1-100)
            </p>
          </div>
        </>
      )}

      {operation === 'enrichPerson' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Person Email
          </label>
          <input
            type="email"
            value={personEmail}
            onChange={(e) => handlePersonEmailChange(e.target.value)}
            placeholder="john.doe@example.com or {{ $json.email }}"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            Email address to enrich with additional data
          </p>
        </div>
      )}

      {operation === 'enrichOrganization' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Organization Domain
          </label>
          <input
            type="text"
            value={organizationDomain}
            onChange={(e) => handleOrganizationDomainChange(e.target.value)}
            placeholder="example.com or {{ $json.domain }}"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            Company domain to enrich with firmographic data
          </p>
        </div>
      )}

      {(operation === 'createContact' || operation === 'updateContact') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Contact Data (JSON)
          </label>
          <textarea
            value={contactData}
            onChange={(e) => handleContactDataChange(e.target.value)}
            placeholder='{"first_name": "John", "last_name": "Doe", "email": "john@example.com", "title": "CEO"}'
            rows={8}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            {operation === 'createContact'
              ? 'Required: first_name, last_name, email. Optional: title, organization_name, phone, etc.'
              : 'Fields to update: first_name, last_name, title, etc.'
            }
          </p>
        </div>
      )}

      {operation === 'updateContact' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Contact ID
          </label>
          <input
            type="text"
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
            placeholder="5f9a8b7c6d5e4f3a2b1c0d9e or {{ $json.contactId }}"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
          />
        </div>
      )}

      {operation === 'addToSequence' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Contact ID
            </label>
            <input
              type="text"
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              placeholder="5f9a8b7c6d5e4f3a2b1c0d9e or {{ $json.contactId }}"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Sequence ID
            </label>
            <input
              type="text"
              value={sequenceId}
              onChange={(e) => setSequenceId(e.target.value)}
              placeholder="5f9a8b7c6d5e4f3a2b1c0d9e or {{ $json.sequenceId }}"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              Apollo sequence ID to add contact to
            </p>
          </div>
        </>
      )}

      <div className="border-t border-gray-700 pt-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Quick Examples
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => loadExample('searchPeople')}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
          >
            Search People
          </button>
          <button
            onClick={() => loadExample('enrichPerson')}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
          >
            Enrich Person
          </button>
          <button
            onClick={() => loadExample('addToSequence')}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
          >
            Add to Sequence
          </button>
        </div>
      </div>

      <div className="bg-purple-900 border border-purple-700 rounded-md p-3">
        <p className="text-sm text-purple-200 font-medium mb-1">Authentication</p>
        <p className="text-xs text-purple-300">
          Requires API key from Apollo.io dashboard. Rate limits apply based on plan.
        </p>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-md p-3">
        <p className="text-xs text-gray-400 space-y-1">
          <div><strong className="text-gray-300">API Version:</strong> v1</div>
          <div><strong className="text-gray-300">Rate Limits:</strong> Varies by plan (200-10,000 credits/month)</div>
          <div><strong className="text-gray-300">Documentation:</strong> apolloio.github.io/apollo-api-docs</div>
        </p>
      </div>
    </div>
  );
};

export default ApolloConfig;
