/**
 * PostHog Node Configuration
 * Product analytics and feature flags platform
 */

import React, { useState } from 'react';

interface PosthogConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const PosthogConfig: React.FC<PosthogConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'trackEvent');
  const [apiKey, setApiKey] = useState(config.apiKey as string || '');
  const [projectId, setProjectId] = useState(config.projectId as string || '');
  const [eventName, setEventName] = useState(config.eventName as string || '');
  const [distinctId, setDistinctId] = useState(config.distinctId as string || '');
  const [properties, setProperties] = useState(config.properties as string || '');
  const [flagKey, setFlagKey] = useState(config.flagKey as string || '');
  const [insightId, setInsightId] = useState(config.insightId as string || '');

  const handleOperationChange = (value: string) => {
    setOperation(value);
    onChange({ ...config, operation: value });
  };

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    onChange({ ...config, apiKey: value });
  };

  const handleProjectIdChange = (value: string) => {
    setProjectId(value);
    onChange({ ...config, projectId: value });
  };

  const handleEventNameChange = (value: string) => {
    setEventName(value);
    onChange({ ...config, eventName: value });
  };

  const handleDistinctIdChange = (value: string) => {
    setDistinctId(value);
    onChange({ ...config, distinctId: value });
  };

  const handlePropertiesChange = (value: string) => {
    setProperties(value);
    onChange({ ...config, properties: value });
  };

  const handleFlagKeyChange = (value: string) => {
    setFlagKey(value);
    onChange({ ...config, flagKey: value });
  };

  const handleInsightIdChange = (value: string) => {
    setInsightId(value);
    onChange({ ...config, insightId: value });
  };

  const loadExample = () => {
    setOperation('trackEvent');
    setEventName('button_clicked');
    setDistinctId('{{ $json.userId }}');
    setProperties(JSON.stringify({
      button_name: 'signup_cta',
      page: 'homepage',
      timestamp: '{{ $now }}'
    }, null, 2));
    onChange({
      ...config,
      operation: 'trackEvent',
      eventName: 'button_clicked',
      distinctId: '{{ $json.userId }}',
      properties: {
        button_name: 'signup_cta',
        page: 'homepage',
        timestamp: '{{ $now }}'
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="font-semibold text-lg mb-4">PostHog Configuration</div>

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
          <option value="identifyUser">Identify User</option>
          <option value="createAlias">Create Alias</option>
          <option value="getFeatureFlag">Get Feature Flag</option>
          <option value="getInsight">Get Insight</option>
          <option value="listEvents">List Events</option>
          <option value="listPersons">List Persons</option>
          <option value="deletePerson">Delete Person (GDPR)</option>
          <option value="createCohort">Create Cohort</option>
          <option value="trackPageview">Track Pageview</option>
        </select>
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
              placeholder="button_clicked"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
            />
            <p className="text-xs text-gray-500 mt-1">
              Name of the event to track
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Distinct ID (User ID)
            </label>
            <input
              type="text"
              value={distinctId}
              onChange={(e) => handleDistinctIdChange(e.target.value)}
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
              placeholder='{"button_name": "signup", "page": "homepage"}'
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Custom properties for the event
            </p>
          </div>
        </div>
      )}

      {operation === 'identifyUser' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Distinct ID (User ID)
            </label>
            <input
              type="text"
              value={distinctId}
              onChange={(e) => handleDistinctIdChange(e.target.value)}
              placeholder="user_12345"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600 font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              User Properties (JSON)
            </label>
            <textarea
              value={properties}
              onChange={(e) => handlePropertiesChange(e.target.value)}
              placeholder='{"email": "user@example.com", "plan": "pro"}'
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              User attributes to set
            </p>
          </div>
        </div>
      )}

      {operation === 'getFeatureFlag' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Flag Key
            </label>
            <input
              type="text"
              value={flagKey}
              onChange={(e) => handleFlagKeyChange(e.target.value)}
              placeholder="new-feature-enabled"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Distinct ID (User ID)
            </label>
            <input
              type="text"
              value={distinctId}
              onChange={(e) => handleDistinctIdChange(e.target.value)}
              placeholder="user_12345"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600 font-mono text-sm"
            />
          </div>
        </div>
      )}

      {operation === 'getInsight' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Insight ID
            </label>
            <input
              type="text"
              value={insightId}
              onChange={(e) => handleInsightIdChange(e.target.value)}
              placeholder="12345"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
            />
            <p className="text-xs text-gray-500 mt-1">
              The ID of the insight/dashboard to retrieve
            </p>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Project ID
        </label>
        <input
          type="text"
          value={projectId}
          onChange={(e) => handleProjectIdChange(e.target.value)}
          placeholder="12345"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
        />
        <p className="text-xs text-gray-500 mt-1">
          PostHog project ID (optional, uses default if not specified)
        </p>
      </div>

      <button
        onClick={loadExample}
        className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
      >
        Load Example Event
      </button>

      <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
        <p className="text-sm text-orange-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-orange-700">
          Requires API key (Personal API Key or Project API Key). Configure in Credentials Manager.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600 space-y-1">
          <div><strong>Features:</strong> Event tracking, user identification, feature flags, insights</div>
          <div><strong>Analytics:</strong> Funnels, retention, paths, trends, cohorts</div>
          <div><strong>Privacy:</strong> GDPR-compliant user deletion</div>
          <div><strong>Documentation:</strong> posthog.com/docs/api</div>
        </p>
      </div>

      <div className="mt-2 p-3 bg-blue-50 rounded text-sm space-y-2">
        <div><strong>💡 PostHog Tips:</strong></div>
        <div>• Use distinct_id consistently for user tracking</div>
        <div>• Feature flags enable A/B testing and gradual rollouts</div>
        <div>• Set user properties with identifyUser for segmentation</div>
        <div>• Track pageviews automatically or manually</div>
      </div>
    </div>
  );
};

export default PosthogConfig;
