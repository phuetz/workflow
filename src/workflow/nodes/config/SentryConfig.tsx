/**
 * Sentry Node Configuration
 * Error tracking and application monitoring
 */

import React, { useState } from 'react';

interface SentryConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const SentryConfig: React.FC<SentryConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'getIssues');
  const [dsn, setDsn] = useState(config.dsn as string || '');
  const [authToken, setAuthToken] = useState(config.authToken as string || '');
  const [organization, setOrganization] = useState(config.organization as string || '');
  const [project, setProject] = useState(config.project as string || '');
  const [issueId, setIssueId] = useState(config.issueId as string || '');
  const [eventId, setEventId] = useState(config.eventId as string || '');
  const [eventData, setEventData] = useState(config.eventData as string || '');
  const [status, setStatus] = useState(config.status as string || 'resolved');
  const [query, setQuery] = useState(config.query as string || 'is:unresolved');

  const handleOperationChange = (value: string) => {
    setOperation(value);
    onChange({ ...config, operation: value });
  };

  const handleDsnChange = (value: string) => {
    setDsn(value);
    onChange({ ...config, dsn: value });
  };

  const handleOrganizationChange = (value: string) => {
    setOrganization(value);
    onChange({ ...config, organization: value });
  };

  const handleProjectChange = (value: string) => {
    setProject(value);
    onChange({ ...config, project: value });
  };

  const handleIssueIdChange = (value: string) => {
    setIssueId(value);
    onChange({ ...config, issueId: value });
  };

  const handleEventIdChange = (value: string) => {
    setEventId(value);
    onChange({ ...config, eventId: value });
  };

  const handleEventDataChange = (value: string) => {
    setEventData(value);
    onChange({ ...config, eventData: value });
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    onChange({ ...config, status: value });
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    onChange({ ...config, query: value });
  };

  const loadExample = () => {
    setOperation('captureError');
    setDsn('https://abc123@o123456.ingest.sentry.io/7890123');
    setEventData(JSON.stringify({
      message: 'Payment processing failed',
      level: 'error',
      tags: {
        environment: 'production',
        service: 'payment-api'
      },
      user: {
        id: '{{ $json.userId }}',
        email: '{{ $json.userEmail }}'
      },
      extra: {
        orderId: '{{ $json.orderId }}',
        amount: '{{ $json.amount }}'
      }
    }, null, 2));
    onChange({
      ...config,
      operation: 'captureError',
      dsn: 'https://abc123@o123456.ingest.sentry.io/7890123',
      eventData: {
        message: 'Payment processing failed',
        level: 'error'
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="font-semibold text-lg mb-4">Sentry Configuration</div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
        >
          <option value="getIssues">Get Issues</option>
          <option value="getIssue">Get Single Issue</option>
          <option value="updateIssue">Update Issue</option>
          <option value="deleteIssue">Delete Issue</option>
          <option value="captureError">Capture Error</option>
          <option value="captureMessage">Capture Message</option>
          <option value="getEvents">Get Events</option>
          <option value="getEvent">Get Single Event</option>
          <option value="getProjects">Get Projects</option>
          <option value="getOrganizations">Get Organizations</option>
          <option value="getReleases">Get Releases</option>
          <option value="createRelease">Create Release</option>
        </select>
      </div>

      {(operation === 'captureError' || operation === 'captureMessage') && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              DSN (Data Source Name)
            </label>
            <input
              type="text"
              value={dsn}
              onChange={(e) => handleDsnChange(e.target.value)}
              placeholder="https://abc123@o123456.ingest.sentry.io/7890123"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Found in Sentry project settings
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Data (JSON)
            </label>
            <textarea
              value={eventData}
              onChange={(e) => handleEventDataChange(e.target.value)}
              placeholder={'{\n  "message": "Error message",\n  "level": "error",\n  "tags": {...},\n  "user": {...}\n}'}
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Error/message data with tags, user info, and context
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-2">
            <p className="text-xs text-blue-800">
              <strong>Event structure:</strong><br/>
              • message: Error message<br/>
              • level: error, warning, info, debug<br/>
              • tags: Key-value metadata<br/>
              • user: User context (id, email, username)<br/>
              • extra: Additional context data
            </p>
          </div>
        </div>
      )}

      {(operation === 'getIssues' || operation === 'getEvents') && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization Slug
            </label>
            <input
              type="text"
              value={organization}
              onChange={(e) => handleOrganizationChange(e.target.value)}
              placeholder="my-org"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project Slug
            </label>
            <input
              type="text"
              value={project}
              onChange={(e) => handleProjectChange(e.target.value)}
              placeholder="my-project"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Query
            </label>
            <input
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="is:unresolved level:error"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Sentry search syntax (e.g., is:unresolved, level:error)
            </p>
          </div>
        </div>
      )}

      {(operation === 'getIssue' || operation === 'updateIssue' || operation === 'deleteIssue') && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Issue ID
            </label>
            <input
              type="text"
              value={issueId}
              onChange={(e) => handleIssueIdChange(e.target.value)}
              placeholder="1234567890"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
            />
          </div>

          {operation === 'updateIssue' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
              >
                <option value="resolved">Resolved</option>
                <option value="unresolved">Unresolved</option>
                <option value="ignored">Ignored</option>
                <option value="resolvedInNextRelease">Resolved in Next Release</option>
              </select>
            </div>
          )}
        </div>
      )}

      {operation === 'getEvent' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization Slug
            </label>
            <input
              type="text"
              value={organization}
              onChange={(e) => handleOrganizationChange(e.target.value)}
              placeholder="my-org"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event ID
            </label>
            <input
              type="text"
              value={eventId}
              onChange={(e) => handleEventIdChange(e.target.value)}
              placeholder="abc123def456"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600 font-mono text-sm"
            />
          </div>
        </div>
      )}

      <button
        onClick={loadExample}
        className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
      >
        Load Example Error
      </button>

      <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
        <p className="text-sm text-orange-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-orange-700">
          API operations require Auth Token. Error capture uses DSN. Configure in Credentials Manager.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600 space-y-1">
          <div><strong>Features:</strong> Error tracking, release tracking, performance monitoring</div>
          <div><strong>Issue States:</strong> Unresolved, resolved, ignored, resolved in next release</div>
          <div><strong>Search:</strong> is:unresolved, level:error, user.email:x@y.com</div>
          <div><strong>Documentation:</strong> docs.sentry.io/api</div>
        </p>
      </div>

      <div className="mt-2 p-3 bg-blue-50 rounded text-sm space-y-2">
        <div><strong>💡 Sentry Tips:</strong></div>
        <div>• DSN is for capturing errors, Auth Token for API operations</div>
        <div>• Use tags for filtering and grouping errors</div>
        <div>• Set user context for better error attribution</div>
        <div>• Releases enable tracking which version had the error</div>
      </div>
    </div>
  );
};

export default SentryConfig;
