/**
 * FullStory Node Configuration
 * Digital experience analytics and session replay
 */

import React, { useState } from 'react';

interface FullstoryConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const FullstoryConfig: React.FC<FullstoryConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'getSession');
  const [orgId, setOrgId] = useState(config.orgId as string || '');
  const [apiKey, setApiKey] = useState(config.apiKey as string || '');
  const [sessionId, setSessionId] = useState(config.sessionId as string || '');
  const [userId, setUserId] = useState(config.userId as string || '');
  const [eventName, setEventName] = useState(config.eventName as string || '');
  const [eventProperties, setEventProperties] = useState(config.eventProperties as string || '');
  const [searchQuery, setSearchQuery] = useState(config.searchQuery as string || '');
  const [segmentId, setSegmentId] = useState(config.segmentId as string || '');

  const handleOperationChange = (value: string) => {
    setOperation(value);
    onChange({ ...config, operation: value });
  };

  const handleOrgIdChange = (value: string) => {
    setOrgId(value);
    onChange({ ...config, orgId: value });
  };

  const handleSessionIdChange = (value: string) => {
    setSessionId(value);
    onChange({ ...config, sessionId: value });
  };

  const handleUserIdChange = (value: string) => {
    setUserId(value);
    onChange({ ...config, userId: value });
  };

  const handleEventNameChange = (value: string) => {
    setEventName(value);
    onChange({ ...config, eventName: value });
  };

  const handleEventPropertiesChange = (value: string) => {
    setEventProperties(value);
    onChange({ ...config, eventProperties: value });
  };

  const handleSearchQueryChange = (value: string) => {
    setSearchQuery(value);
    onChange({ ...config, searchQuery: value });
  };

  const handleSegmentIdChange = (value: string) => {
    setSegmentId(value);
    onChange({ ...config, segmentId: value });
  };

  const loadExample = () => {
    setOperation('trackEvent');
    setOrgId('12ABC');
    setEventName('purchase_completed');
    setEventProperties(JSON.stringify({
      product_id: '{{ $json.productId }}',
      price: '{{ $json.price }}',
      currency: 'USD',
      quantity: 1
    }, null, 2));
    onChange({
      ...config,
      operation: 'trackEvent',
      orgId: '12ABC',
      eventName: 'purchase_completed',
      eventProperties: {
        product_id: '{{ $json.productId }}',
        price: '{{ $json.price }}'
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="font-semibold text-lg mb-4">FullStory Configuration</div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
        >
          <option value="getSession">Get Session</option>
          <option value="searchSessions">Search Sessions</option>
          <option value="getSessionUrl">Get Session URL</option>
          <option value="trackEvent">Track Custom Event</option>
          <option value="identifyUser">Identify User</option>
          <option value="getUserData">Get User Data</option>
          <option value="getSegments">Get Segments</option>
          <option value="exportData">Export Data</option>
          <option value="getFunnels">Get Funnels</option>
          <option value="getMetrics">Get Metrics</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Organization ID
        </label>
        <input
          type="text"
          value={orgId}
          onChange={(e) => handleOrgIdChange(e.target.value)}
          placeholder="12ABC"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600 font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          Your FullStory organization ID (found in settings)
        </p>
      </div>

      {(operation === 'getSession' || operation === 'getSessionUrl') && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Session ID
            </label>
            <input
              type="text"
              value={sessionId}
              onChange={(e) => handleSessionIdChange(e.target.value)}
              placeholder="123456789:abcdef123"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              FullStory session ID (format: timestamp:hash)
            </p>
          </div>
        </div>
      )}

      {operation === 'searchSessions' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Query
            </label>
            <textarea
              value={searchQuery}
              onChange={(e) => handleSearchQueryChange(e.target.value)}
              placeholder='userId:"user@example.com" AND pageUrl contains "/checkout"'
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              FullStory search syntax
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-2">
            <p className="text-xs text-blue-800">
              <strong>Search examples:</strong><br/>
              • userId:"user@example.com"<br/>
              • pageUrl contains "/checkout"<br/>
              • clicked selector ".buy-button"<br/>
              • frustration:true AND visited url "/cart"
            </p>
          </div>
        </div>
      )}

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
              placeholder="purchase_completed"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
            />
            <p className="text-xs text-gray-500 mt-1">
              Name for your custom event
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Properties (JSON)
            </label>
            <textarea
              value={eventProperties}
              onChange={(e) => handleEventPropertiesChange(e.target.value)}
              placeholder='{"product_id": "123", "price": 99.99, "currency": "USD"}'
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Custom properties for the event
            </p>
          </div>
        </div>
      )}

      {(operation === 'identifyUser' || operation === 'getUserData') && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              User ID
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => handleUserIdChange(e.target.value)}
              placeholder="user_12345 or {{ $json.userId }}"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Unique identifier for the user
            </p>
          </div>

          {operation === 'identifyUser' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User Properties (JSON)
              </label>
              <textarea
                value={eventProperties}
                onChange={(e) => handleEventPropertiesChange(e.target.value)}
                placeholder='{"displayName": "John Doe", "email": "john@example.com", "plan": "premium"}'
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                User attributes (displayName, email, custom properties)
              </p>
            </div>
          )}
        </div>
      )}

      {operation === 'getSegments' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div className="bg-blue-50 border border-blue-200 rounded p-2">
            <p className="text-xs text-blue-800">
              Retrieves all user segments configured in FullStory. Segments are groups of users based on behavior, properties, or actions.
            </p>
          </div>
        </div>
      )}

      {operation === 'exportData' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Segment ID (Optional)
            </label>
            <input
              type="text"
              value={segmentId}
              onChange={(e) => handleSegmentIdChange(e.target.value)}
              placeholder="segment_abc123"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
            />
            <p className="text-xs text-gray-500 mt-1">
              Export data for a specific segment
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
          <div><strong>Features:</strong> Session replay, heatmaps, funnels, user analytics</div>
          <div><strong>Unique Features:</strong> Retroactive event tracking, frustration detection</div>
          <div><strong>Search:</strong> Powerful query language for finding sessions</div>
          <div><strong>Documentation:</strong> developer.fullstory.com/api</div>
        </p>
      </div>

      <div className="mt-2 p-3 bg-blue-50 rounded text-sm space-y-2">
        <div><strong>💡 FullStory Tips:</strong></div>
        <div>• Session URLs link directly to replay for sharing</div>
        <div>• Use identify to link sessions to users</div>
        <div>• Custom events enable tracking business-specific actions</div>
        <div>• Segments group users by behavior patterns</div>
        <div>• Frustration signals: rage clicks, error clicks, dead clicks</div>
      </div>
    </div>
  );
};

export default FullstoryConfig;
