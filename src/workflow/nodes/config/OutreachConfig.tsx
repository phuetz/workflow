/**
 * Outreach Node Configuration
 * Sales engagement and automation platform
 */

import React, { useState } from 'react';

interface OutreachConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

type OutreachOperation =
  | 'createProspect'
  | 'updateProspect'
  | 'getProspect'
  | 'searchProspects'
  | 'addToSequence'
  | 'removeFromSequence'
  | 'getSequences'
  | 'createTask'
  | 'updateTask'
  | 'getActivities';

export const OutreachConfig: React.FC<OutreachConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<OutreachOperation>(
    (config.operation as OutreachOperation) || 'createProspect'
  );
  const [accessToken, setAccessToken] = useState((config.accessToken as string) || '');
  const [prospectId, setProspectId] = useState((config.prospectId as string) || '');
  const [sequenceId, setSequenceId] = useState((config.sequenceId as string) || '');
  const [prospectData, setProspectData] = useState((config.prospectData as string) || '');
  const [taskData, setTaskData] = useState((config.taskData as string) || '');
  const [searchFilter, setSearchFilter] = useState((config.searchFilter as string) || '');
  const [mailingStepId, setMailingStepId] = useState((config.mailingStepId as string) || '');

  const handleOperationChange = (newOperation: OutreachOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleAccessTokenChange = (value: string) => {
    setAccessToken(value);
    onChange({ ...config, accessToken: value });
  };

  const handleProspectIdChange = (value: string) => {
    setProspectId(value);
    onChange({ ...config, prospectId: value });
  };

  const handleSequenceIdChange = (value: string) => {
    setSequenceId(value);
    onChange({ ...config, sequenceId: value });
  };

  const handleProspectDataChange = (value: string) => {
    setProspectData(value);
    onChange({ ...config, prospectData: value });
  };

  const handleTaskDataChange = (value: string) => {
    setTaskData(value);
    onChange({ ...config, taskData: value });
  };

  const handleSearchFilterChange = (value: string) => {
    setSearchFilter(value);
    onChange({ ...config, searchFilter: value });
  };

  const loadExample = (example: 'createProspect' | 'addToSequence' | 'createTask') => {
    if (example === 'createProspect') {
      handleOperationChange('createProspect');
      handleProspectDataChange(JSON.stringify({
        data: {
          type: 'prospect',
          attributes: {
            email: 'john.doe@example.com',
            firstName: 'John',
            lastName: 'Doe',
            title: 'VP of Engineering',
            company: 'Acme Corp',
            linkedInUrl: 'https://linkedin.com/in/johndoe',
            phoneNumbers: [
              { type: 'work', value: '+1234567890' }
            ],
            tags: ['qualified', 'enterprise']
          }
        }
      }, null, 2));
    } else if (example === 'addToSequence') {
      handleOperationChange('addToSequence');
      handleProspectIdChange('{{ $json.prospectId }}');
      handleSequenceIdChange('123');
      setMailingStepId('456');
    } else if (example === 'createTask') {
      handleOperationChange('createTask');
      handleTaskDataChange(JSON.stringify({
        data: {
          type: 'task',
          attributes: {
            action: 'Call prospect to discuss demo',
            dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            taskType: 'call',
            note: 'Follow up on inbound request'
          },
          relationships: {
            prospect: {
              data: {
                type: 'prospect',
                id: '{{ $json.prospectId }}'
              }
            }
          }
        }
      }, null, 2));
    }
  };

  return (
    <div className="space-y-4 bg-gray-900 text-gray-100 p-4 rounded-lg">
      <div className="font-semibold text-lg mb-4 text-white">Outreach Configuration</div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Access Token
        </label>
        <input
          type="password"
          value={accessToken}
          onChange={(e) => handleAccessTokenChange(e.target.value)}
          placeholder="OAuth2 Access Token or {{ $credentials.accessToken }}"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
        />
        <p className="text-xs text-gray-400 mt-1">
          OAuth 2.0 access token from Outreach
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as OutreachOperation)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="createProspect">Create Prospect</option>
          <option value="updateProspect">Update Prospect</option>
          <option value="getProspect">Get Prospect</option>
          <option value="searchProspects">Search Prospects</option>
          <option value="addToSequence">Add to Sequence</option>
          <option value="removeFromSequence">Remove from Sequence</option>
          <option value="getSequences">Get Sequences</option>
          <option value="createTask">Create Task</option>
          <option value="updateTask">Update Task</option>
          <option value="getActivities">Get Activities</option>
        </select>
      </div>

      {(operation === 'getProspect' || operation === 'updateProspect') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Prospect ID
          </label>
          <input
            type="text"
            value={prospectId}
            onChange={(e) => handleProspectIdChange(e.target.value)}
            placeholder="123 or {{ $json.prospectId }}"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            Outreach prospect ID (numeric)
          </p>
        </div>
      )}

      {(operation === 'createProspect' || operation === 'updateProspect') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Prospect Data (JSON:API Format)
          </label>
          <textarea
            value={prospectData}
            onChange={(e) => handleProspectDataChange(e.target.value)}
            placeholder='{"data": {"type": "prospect", "attributes": {...}}}'
            rows={12}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            {operation === 'createProspect'
              ? 'Required attributes: email, firstName, lastName. Optional: title, company, phoneNumbers, tags'
              : 'Attributes to update: firstName, lastName, title, company, etc.'
            }
          </p>
        </div>
      )}

      {operation === 'searchProspects' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Search Filter
          </label>
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => handleSearchFilterChange(e.target.value)}
            placeholder='email:"user@example.com" OR tags:"qualified"'
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            Filter query using Outreach search syntax
          </p>
        </div>
      )}

      {(operation === 'addToSequence' || operation === 'removeFromSequence') && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Prospect ID
            </label>
            <input
              type="text"
              value={prospectId}
              onChange={(e) => handleProspectIdChange(e.target.value)}
              placeholder="123 or {{ $json.prospectId }}"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Sequence ID
            </label>
            <input
              type="text"
              value={sequenceId}
              onChange={(e) => handleSequenceIdChange(e.target.value)}
              placeholder="456 or {{ $json.sequenceId }}"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              Outreach sequence ID (get from "Get Sequences" operation)
            </p>
          </div>
          {operation === 'addToSequence' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Mailing Step ID (Optional)
              </label>
              <input
                type="text"
                value={mailingStepId}
                onChange={(e) => setMailingStepId(e.target.value)}
                placeholder="789"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">
                Start at specific step (leave empty to start from beginning)
              </p>
            </div>
          )}
        </>
      )}

      {(operation === 'createTask' || operation === 'updateTask') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Task Data (JSON:API Format)
          </label>
          <textarea
            value={taskData}
            onChange={(e) => handleTaskDataChange(e.target.value)}
            placeholder='{"data": {"type": "task", "attributes": {...}, "relationships": {...}}}'
            rows={12}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            Required: action, dueAt, taskType. Task types: call, email, message, in_person, meeting
          </p>
        </div>
      )}

      <div className="border-t border-gray-700 pt-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Quick Examples
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => loadExample('createProspect')}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
          >
            Create Prospect
          </button>
          <button
            onClick={() => loadExample('addToSequence')}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
          >
            Add to Sequence
          </button>
          <button
            onClick={() => loadExample('createTask')}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
          >
            Create Task
          </button>
        </div>
      </div>

      <div className="bg-blue-900 border border-blue-700 rounded-md p-3">
        <p className="text-sm text-blue-200 font-medium mb-1">Authentication</p>
        <p className="text-xs text-blue-300">
          Requires OAuth 2.0. Create app in Outreach Platform Settings → Developers.
        </p>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-md p-3">
        <p className="text-xs text-gray-400 space-y-1">
          <div><strong className="text-gray-300">API Version:</strong> v2 (JSON:API)</div>
          <div><strong className="text-gray-300">Rate Limits:</strong> 10,000 requests per hour</div>
          <div><strong className="text-gray-300">Documentation:</strong> api.outreach.io/api/v2/docs</div>
        </p>
      </div>
    </div>
  );
};

export default OutreachConfig;
