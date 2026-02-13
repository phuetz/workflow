/**
 * Heap Node Configuration
 * Digital insights and product analytics
 */

import React, { useState } from 'react';

interface HeapConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const HeapConfig: React.FC<HeapConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'trackEvent');
  const [appId, setAppId] = useState(config.appId as string || '');
  const [apiKey, setApiKey] = useState(config.apiKey as string || '');
  const [eventName, setEventName] = useState(config.eventName as string || '');
  const [userId, setUserId] = useState(config.userId as string || '');
  const [identity, setIdentity] = useState(config.identity as string || '');
  const [properties, setProperties] = useState(config.properties as string || '');
  const [reportId, setReportId] = useState(config.reportId as string || '');
  const [startDate, setStartDate] = useState(config.startDate as string || '');
  const [endDate, setEndDate] = useState(config.endDate as string || '');

  const handleOperationChange = (value: string) => {
    setOperation(value);
    onChange({ ...config, operation: value });
  };

  const handleAppIdChange = (value: string) => {
    setAppId(value);
    onChange({ ...config, appId: value });
  };

  const handleEventNameChange = (value: string) => {
    setEventName(value);
    onChange({ ...config, eventName: value });
  };

  const handleUserIdChange = (value: string) => {
    setUserId(value);
    onChange({ ...config, userId: value });
  };

  const handleIdentityChange = (value: string) => {
    setIdentity(value);
    onChange({ ...config, identity: value });
  };

  const handlePropertiesChange = (value: string) => {
    setProperties(value);
    onChange({ ...config, properties: value });
  };

  const handleReportIdChange = (value: string) => {
    setReportId(value);
    onChange({ ...config, reportId: value });
  };

  const loadExample = () => {
    setOperation('trackEvent');
    setAppId('1234567890');
    setEventName('Button Clicked');
    setIdentity('{{ $json.userId }}');
    setProperties(JSON.stringify({
      button_text: 'Sign Up',
      page_url: '/landing',
      campaign: 'summer_2024'
    }, null, 2));
    onChange({
      ...config,
      operation: 'trackEvent',
      appId: '1234567890',
      eventName: 'Button Clicked',
      identity: '{{ $json.userId }}',
      properties: {
        button_text: 'Sign Up',
        page_url: '/landing'
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="font-semibold text-lg mb-4">Heap Configuration</div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
        >
          <option value="trackEvent">Track Event</option>
          <option value="addUserProperties">Add User Properties</option>
          <option value="identify">Identify User</option>
          <option value="getReport">Get Report</option>
          <option value="getAccounts">Get Accounts</option>
          <option value="getUsers">Get Users</option>
          <option value="getEventDefinitions">Get Event Definitions</option>
          <option value="getEventProperties">Get Event Properties</option>
          <option value="createSegment">Create Segment</option>
          <option value="getSegments">Get Segments</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          App ID
        </label>
        <input
          type="text"
          value={appId}
          onChange={(e) => handleAppIdChange(e.target.value)}
          placeholder="1234567890"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600 font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          Your Heap application ID (found in project settings)
        </p>
      </div>

      {operation === 'trackEvent' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Name
            </label>
            <input
              type="text"
              value={eventName}
              onChange={(e) => handleEventNameChange(e.target.value)}
              placeholder="Button Clicked"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
            />
            <p className="text-xs text-gray-500 mt-1">
              Name of the custom event to track
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Identity (User ID)
            </label>
            <input
              type="text"
              value={identity}
              onChange={(e) => handleIdentityChange(e.target.value)}
              placeholder="user_12345 or {{ $json.userId }}"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Unique identifier for the user
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Properties (JSON)
            </label>
            <textarea
              value={properties}
              onChange={(e) => handlePropertiesChange(e.target.value)}
              placeholder='{"button_text": "Sign Up", "page_url": "/landing"}'
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Custom properties for the event
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-2">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> Heap automatically captures all user interactions. Use track for custom business events like "Purchase Completed" or "Trial Started".
            </p>
          </div>
        </div>
      )}

      {(operation === 'addUserProperties' || operation === 'identify') && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Identity (User ID)
            </label>
            <input
              type="text"
              value={identity}
              onChange={(e) => handleIdentityChange(e.target.value)}
              placeholder="user_12345"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Unique identifier for the user
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              User Properties (JSON)
            </label>
            <textarea
              value={properties}
              onChange={(e) => handlePropertiesChange(e.target.value)}
              placeholder='{"email": "user@example.com", "plan": "premium", "signup_date": "2024-01-15"}'
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Properties to attach to the user profile
            </p>
          </div>
        </div>
      )}

      {operation === 'getReport' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Report ID
            </label>
            <input
              type="text"
              value={reportId}
              onChange={(e) => handleReportIdChange(e.target.value)}
              placeholder="12345"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
            />
            <p className="text-xs text-gray-500 mt-1">
              ID of the saved report to retrieve
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
              />
            </div>
          </div>
        </div>
      )}

      {operation === 'getUsers' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              User ID (Optional)
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => handleUserIdChange(e.target.value)}
              placeholder="Leave empty to get all users"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Retrieve specific user or all users
            </p>
          </div>
        </div>
      )}

      <button
        onClick={loadExample}
        className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
      >
        Load Example Event
      </button>

      <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
        <p className="text-sm text-orange-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-orange-700">
          Requires API Key. Configure in Credentials Manager.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600 space-y-1">
          <div><strong>Features:</strong> Automatic event capture, retroactive analytics, user journeys</div>
          <div><strong>Unique Capability:</strong> Captures all interactions without manual instrumentation</div>
          <div><strong>Analytics:</strong> Funnels, retention, paths, segmentation</div>
          <div><strong>Documentation:</strong> developers.heap.io/reference</div>
        </p>
      </div>

      <div className="mt-2 p-3 bg-blue-50 rounded text-sm space-y-2">
        <div><strong>💡 Heap Tips:</strong></div>
        <div>• Heap auto-captures all clicks, form submits, and pageviews</div>
        <div>• Use track() for custom business events not auto-captured</div>
        <div>• Identity connects anonymous sessions to known users</div>
        <div>• User properties enable powerful segmentation</div>
        <div>• Retroactive analytics: define events after data is collected</div>
      </div>

      <div className="mt-2 p-3 bg-purple-50 rounded text-sm">
        <p className="text-xs text-purple-900">
          <strong>Heap vs Traditional Analytics:</strong> Unlike other tools, Heap automatically captures everything. You can define custom events retroactively and analyze past data without prior setup.
        </p>
      </div>
    </div>
  );
};

export default HeapConfig;
