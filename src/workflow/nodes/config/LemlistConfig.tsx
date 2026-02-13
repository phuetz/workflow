/**
 * Lemlist Node Configuration
 * Email outreach and campaign management
 */

import React, { useState } from 'react';

interface LemlistConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

type LemlistOperation =
  | 'addLead'
  | 'updateLead'
  | 'deleteLead'
  | 'unsubscribeLead'
  | 'getCampaigns'
  | 'getCampaign'
  | 'getLeads'
  | 'createCampaign'
  | 'getEmailStats';

export const LemlistConfig: React.FC<LemlistConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<LemlistOperation>(
    (config.operation as LemlistOperation) || 'addLead'
  );
  const [apiKey, setApiKey] = useState((config.apiKey as string) || '');
  const [campaignId, setCampaignId] = useState((config.campaignId as string) || '');
  const [email, setEmail] = useState((config.email as string) || '');
  const [leadData, setLeadData] = useState((config.leadData as string) || '');
  const [variables, setVariables] = useState((config.variables as string) || '');
  const [deduplicate, setDeduplicate] = useState<boolean>((config.deduplicate as boolean) ?? true);

  const handleOperationChange = (newOperation: LemlistOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    onChange({ ...config, apiKey: value });
  };

  const handleCampaignIdChange = (value: string) => {
    setCampaignId(value);
    onChange({ ...config, campaignId: value });
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    onChange({ ...config, email: value });
  };

  const handleLeadDataChange = (value: string) => {
    setLeadData(value);
    onChange({ ...config, leadData: value });
  };

  const handleVariablesChange = (value: string) => {
    setVariables(value);
    onChange({ ...config, variables: value });
  };

  const handleDeduplicateChange = (checked: boolean) => {
    setDeduplicate(checked);
    onChange({ ...config, deduplicate: checked });
  };

  const loadExample = (example: 'addLead' | 'addLeadWithVars' | 'updateLead') => {
    if (example === 'addLead') {
      handleOperationChange('addLead');
      handleEmailChange('john.doe@example.com');
      handleLeadDataChange(JSON.stringify({
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        companyName: 'Acme Corp'
      }, null, 2));
    } else if (example === 'addLeadWithVars') {
      handleOperationChange('addLead');
      handleEmailChange('{{ $json.email }}');
      handleLeadDataChange(JSON.stringify({
        email: '{{ $json.email }}',
        firstName: '{{ $json.firstName }}',
        lastName: '{{ $json.lastName }}',
        companyName: '{{ $json.company }}'
      }, null, 2));
      handleVariablesChange(JSON.stringify({
        customVar1: '{{ $json.industry }}',
        customVar2: '{{ $json.jobTitle }}',
        meetingLink: 'https://cal.com/yourname'
      }, null, 2));
    } else if (example === 'updateLead') {
      handleOperationChange('updateLead');
      handleEmailChange('{{ $json.email }}');
      handleLeadDataChange(JSON.stringify({
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+1234567890'
      }, null, 2));
    }
  };

  return (
    <div className="space-y-4 bg-gray-900 text-gray-100 p-4 rounded-lg">
      <div className="font-semibold text-lg mb-4 text-white">Lemlist Configuration</div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          API Key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => handleApiKeyChange(e.target.value)}
          placeholder="API Key or {{ $credentials.apiKey }}"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
        />
        <p className="text-xs text-gray-400 mt-1">
          Lemlist API key from Settings → Integrations → API
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as LemlistOperation)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          <option value="addLead">Add Lead to Campaign</option>
          <option value="updateLead">Update Lead</option>
          <option value="deleteLead">Delete Lead</option>
          <option value="unsubscribeLead">Unsubscribe Lead</option>
          <option value="getCampaigns">Get All Campaigns</option>
          <option value="getCampaign">Get Campaign Details</option>
          <option value="getLeads">Get Campaign Leads</option>
          <option value="createCampaign">Create Campaign</option>
          <option value="getEmailStats">Get Email Statistics</option>
        </select>
      </div>

      {(operation === 'addLead' || operation === 'updateLead' || operation === 'deleteLead' ||
        operation === 'unsubscribeLead' || operation === 'getCampaign' || operation === 'getLeads' ||
        operation === 'getEmailStats') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Campaign ID
          </label>
          <input
            type="text"
            value={campaignId}
            onChange={(e) => handleCampaignIdChange(e.target.value)}
            placeholder="cam_xxxxxxxxxxxxx or {{ $json.campaignId }}"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            Lemlist campaign ID (get from "Get All Campaigns" operation)
          </p>
        </div>
      )}

      {(operation === 'addLead' || operation === 'updateLead' || operation === 'deleteLead' ||
        operation === 'unsubscribeLead') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Lead Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            placeholder="lead@example.com or {{ $json.email }}"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            Email address of the lead
          </p>
        </div>
      )}

      {(operation === 'addLead' || operation === 'updateLead') && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Lead Data (JSON)
            </label>
            <textarea
              value={leadData}
              onChange={(e) => handleLeadDataChange(e.target.value)}
              placeholder='{"email": "lead@example.com", "firstName": "John", "lastName": "Doe"}'
              rows={8}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              {operation === 'addLead'
                ? 'Required: email. Optional: firstName, lastName, companyName, phone, linkedinUrl, icebreaker'
                : 'Fields to update: firstName, lastName, companyName, phone, etc.'
              }
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Custom Variables (JSON - Optional)
            </label>
            <textarea
              value={variables}
              onChange={(e) => handleVariablesChange(e.target.value)}
              placeholder='{"customVar1": "value1", "customVar2": "value2"}'
              rows={4}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              Custom variables for email personalization (use in email templates)
            </p>
          </div>
        </>
      )}

      {operation === 'addLead' && (
        <div className="flex items-center">
          <input
            type="checkbox"
            id="deduplicate"
            checked={deduplicate}
            onChange={(e) => handleDeduplicateChange(e.target.checked)}
            className="mr-2 bg-gray-800 border-gray-700"
          />
          <label htmlFor="deduplicate" className="text-sm text-gray-300">
            Deduplicate lead (skip if already in campaign)
          </label>
        </div>
      )}

      <div className="border-t border-gray-700 pt-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Quick Examples
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => loadExample('addLead')}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
          >
            Add Lead
          </button>
          <button
            onClick={() => loadExample('addLeadWithVars')}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
          >
            Add with Variables
          </button>
          <button
            onClick={() => loadExample('updateLead')}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
          >
            Update Lead
          </button>
        </div>
      </div>

      <div className="bg-orange-900 border border-orange-700 rounded-md p-3">
        <p className="text-sm text-orange-200 font-medium mb-1">Authentication</p>
        <p className="text-xs text-orange-300">
          Requires API key from Lemlist Settings. Use basic auth with API key as username.
        </p>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-md p-3">
        <p className="text-xs text-gray-400 space-y-1">
          <div><strong className="text-gray-300">API Version:</strong> v1</div>
          <div><strong className="text-gray-300">Rate Limits:</strong> 120 requests per minute</div>
          <div><strong className="text-gray-300">Documentation:</strong> developer.lemlist.com</div>
        </p>
      </div>
    </div>
  );
};

export default LemlistConfig;
