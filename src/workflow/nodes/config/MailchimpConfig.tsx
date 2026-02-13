/**
 * Mailchimp Node Configuration
 * Email marketing for lists and campaigns
 */

import React, { useState } from 'react';
import type { MailchimpOperation } from '../../../integrations/mailchimp/mailchimp.types';

interface MailchimpConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const MailchimpConfig: React.FC<MailchimpConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<MailchimpOperation>(
    (config.operation as MailchimpOperation) || 'addSubscriber'
  );
  const [listId, setListId] = useState((config.listId as string) || '');
  const [email, setEmail] = useState((config.email as string) || '');
  const [status, setStatus] = useState((config.status as string) || 'subscribed');
  const [data, setData] = useState((config.data as Record<string, unknown>) || {});
  const [dataInput, setDataInput] = useState('');

  const handleOperationChange = (newOperation: MailchimpOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleListIdChange = (value: string) => {
    setListId(value);
    onChange({ ...config, listId: value });
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    onChange({ ...config, email: value });
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    onChange({ ...config, status: value });
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

  const loadExample = (example: 'subscriber' | 'campaign' | 'list') => {
    if (example === 'subscriber') {
      handleOperationChange('addSubscriber');
      handleListIdChange('abc123');
      handleEmailChange('subscriber@example.com');
      handleStatusChange('subscribed');
      handleDataChange({
        merge_fields: {
          FNAME: 'John',
          LNAME: 'Doe'
        },
        tags: ['customer', 'premium']
      });
    } else if (example === 'campaign') {
      handleOperationChange('createCampaign');
      handleListIdChange('abc123');
      handleDataChange({
        type: 'regular',
        settings: {
          subject_line: 'Monthly Newsletter - January 2024',
          title: 'January Newsletter',
          from_name: 'Your Company',
          reply_to: 'hello@example.com'
        }
      });
    } else if (example === 'list') {
      handleOperationChange('createList');
      handleDataChange({
        name: 'Newsletter Subscribers',
        contact: {
          company: 'Your Company',
          address1: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          zip: '94102',
          country: 'US'
        },
        permission_reminder: 'You subscribed to our newsletter',
        campaign_defaults: {
          from_name: 'Your Company',
          from_email: 'hello@example.com',
          subject: 'Newsletter',
          language: 'en'
        },
        email_type_option: true
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
          onChange={(e) => handleOperationChange(e.target.value as MailchimpOperation)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-600"
        >
          <option value="addSubscriber">Add Subscriber</option>
          <option value="updateSubscriber">Update Subscriber</option>
          <option value="getSubscriber">Get Subscriber</option>
          <option value="createCampaign">Create Campaign</option>
          <option value="sendCampaign">Send Campaign</option>
          <option value="getCampaign">Get Campaign</option>
          <option value="getCampaignStats">Get Campaign Stats</option>
          <option value="createList">Create List</option>
          <option value="getList">Get List</option>
        </select>
      </div>

      {!operation.includes('List') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            List ID
          </label>
          <input
            type="text"
            value={listId}
            onChange={(e) => handleListIdChange(e.target.value)}
            placeholder="abc123def456 or {{ $json.list_id }}"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-600"
          />
          <p className="text-xs text-gray-500 mt-1">
            Mailchimp list ID (found in audience settings)
          </p>
        </div>
      )}

      {operation.includes('Subscriber') && !operation.startsWith('get') && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="subscriber@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-600"
            >
              <option value="subscribed">Subscribed</option>
              <option value="unsubscribed">Unsubscribed</option>
              <option value="pending">Pending (double opt-in)</option>
              <option value="cleaned">Cleaned</option>
            </select>
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Additional Data
        </label>
        <div className="space-y-2">
          {Object.keys(data).length > 0 && (
            <div className="bg-gray-50 p-3 rounded border border-gray-200 max-h-64 overflow-y-auto">
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
              placeholder='{"merge_fields": {"FNAME": "John", "LNAME": "Doe"}}'
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-600 font-mono text-sm"
            />
            <button
              onClick={addData}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              Add
            </button>
          </div>
          <p className="text-xs text-gray-500">
            {operation.includes('Subscriber') && 'Common: merge_fields (FNAME, LNAME), tags, interests'}
            {operation.includes('Campaign') && 'Common: type, settings (subject_line, from_name, reply_to)'}
            {operation.includes('List') && 'Common: contact, campaign_defaults, permission_reminder'}
          </p>
        </div>
      </div>

      <div className="border-t pt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Quick Examples
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => loadExample('subscriber')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Add Subscriber
          </button>
          <button
            onClick={() => loadExample('campaign')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Create Campaign
          </button>
          <button
            onClick={() => loadExample('list')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Create List
          </button>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
        <p className="text-sm text-yellow-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-yellow-700">
          Requires API Key. Configure in Credentials Manager. The server prefix (us1, us2, etc.) is automatically extracted.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600 space-y-1">
          <div><strong>API Version:</strong> 3.0</div>
          <div><strong>Rate Limits:</strong> 10 requests per second</div>
          <div><strong>Documentation:</strong> mailchimp.com/developer/marketing/api</div>
        </p>
      </div>
    </div>
  );
};
