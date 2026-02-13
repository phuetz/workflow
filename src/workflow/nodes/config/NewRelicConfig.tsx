/**
 * New Relic Node Configuration
 * Application performance monitoring and observability
 */

import React, { useState } from 'react';

interface NewRelicConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const NewRelicConfig: React.FC<NewRelicConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'queryNRQL');
  const [apiKey, setApiKey] = useState(config.apiKey as string || '');
  const [accountId, setAccountId] = useState(config.accountId as string || '');
  const [nrqlQuery, setNrqlQuery] = useState(config.nrqlQuery as string || '');
  const [alertPolicyId, setAlertPolicyId] = useState(config.alertPolicyId as string || '');
  const [eventType, setEventType] = useState(config.eventType as string || '');
  const [eventData, setEventData] = useState(config.eventData as string || '');
  const [appId, setAppId] = useState(config.appId as string || '');
  const [timeRange, setTimeRange] = useState(config.timeRange as string || '3600');

  const handleOperationChange = (value: string) => {
    setOperation(value);
    onChange({ ...config, operation: value });
  };

  const handleNrqlQueryChange = (value: string) => {
    setNrqlQuery(value);
    onChange({ ...config, nrqlQuery: value });
  };

  const handleAccountIdChange = (value: string) => {
    setAccountId(value);
    onChange({ ...config, accountId: value });
  };

  const handleAlertPolicyIdChange = (value: string) => {
    setAlertPolicyId(value);
    onChange({ ...config, alertPolicyId: value });
  };

  const handleEventTypeChange = (value: string) => {
    setEventType(value);
    onChange({ ...config, eventType: value });
  };

  const handleEventDataChange = (value: string) => {
    setEventData(value);
    onChange({ ...config, eventData: value });
  };

  const handleAppIdChange = (value: string) => {
    setAppId(value);
    onChange({ ...config, appId: value });
  };

  const loadExample = () => {
    setOperation('queryNRQL');
    setNrqlQuery("SELECT average(duration) FROM Transaction WHERE appName = 'MyApp' SINCE 1 hour ago");
    setAccountId('1234567');
    onChange({
      ...config,
      operation: 'queryNRQL',
      nrqlQuery: "SELECT average(duration) FROM Transaction WHERE appName = 'MyApp' SINCE 1 hour ago",
      accountId: '1234567'
    });
  };

  return (
    <div className="space-y-4">
      <div className="font-semibold text-lg mb-4">New Relic Configuration</div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
        >
          <option value="queryNRQL">Query (NRQL)</option>
          <option value="getMetrics">Get Metrics</option>
          <option value="sendCustomEvent">Send Custom Event</option>
          <option value="listApplications">List Applications</option>
          <option value="getAlertPolicies">Get Alert Policies</option>
          <option value="getAlertConditions">Get Alert Conditions</option>
          <option value="acknowledgeIncident">Acknowledge Incident</option>
          <option value="getTransactionTrace">Get Transaction Trace</option>
          <option value="getErrorAnalytics">Get Error Analytics</option>
          <option value="getSLO">Get SLO Data</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Account ID
        </label>
        <input
          type="text"
          value={accountId}
          onChange={(e) => handleAccountIdChange(e.target.value)}
          placeholder="1234567"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
        />
        <p className="text-xs text-gray-500 mt-1">
          Your New Relic account ID
        </p>
      </div>

      {operation === 'queryNRQL' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              NRQL Query
            </label>
            <textarea
              value={nrqlQuery}
              onChange={(e) => handleNrqlQueryChange(e.target.value)}
              placeholder="SELECT average(duration) FROM Transaction WHERE appName = 'MyApp' SINCE 1 hour ago"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              New Relic Query Language (NRQL) query
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-2">
            <p className="text-xs text-blue-800">
              <strong>Example queries:</strong><br/>
              • SELECT count(*) FROM Transaction FACET name<br/>
              • SELECT average(duration) FROM PageView SINCE 24 hours ago<br/>
              • SELECT uniqueCount(session) FROM PageAction WHERE appName = 'MyApp'
            </p>
          </div>
        </div>
      )}

      {operation === 'sendCustomEvent' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Type
            </label>
            <input
              type="text"
              value={eventType}
              onChange={(e) => handleEventTypeChange(e.target.value)}
              placeholder="CustomTransaction"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
            />
            <p className="text-xs text-gray-500 mt-1">
              Name for your custom event type
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Data (JSON)
            </label>
            <textarea
              value={eventData}
              onChange={(e) => handleEventDataChange(e.target.value)}
              placeholder='{"userId": "123", "action": "purchase", "amount": 99.99}'
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Custom attributes for the event
            </p>
          </div>
        </div>
      )}

      {(operation === 'getAlertPolicies' || operation === 'getAlertConditions') && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          {operation === 'getAlertConditions' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alert Policy ID
              </label>
              <input
                type="text"
                value={alertPolicyId}
                onChange={(e) => handleAlertPolicyIdChange(e.target.value)}
                placeholder="123456"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
              />
              <p className="text-xs text-gray-500 mt-1">
                Policy ID to get conditions for
              </p>
            </div>
          )}
        </div>
      )}

      {(operation === 'getMetrics' || operation === 'getTransactionTrace') && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Application ID
            </label>
            <input
              type="text"
              value={appId}
              onChange={(e) => handleAppIdChange(e.target.value)}
              placeholder="123456789"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
            />
            <p className="text-xs text-gray-500 mt-1">
              New Relic application ID
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time Range (seconds)
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
            >
              <option value="1800">Last 30 minutes</option>
              <option value="3600">Last hour</option>
              <option value="21600">Last 6 hours</option>
              <option value="86400">Last 24 hours</option>
              <option value="604800">Last 7 days</option>
            </select>
          </div>
        </div>
      )}

      <button
        onClick={loadExample}
        className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
      >
        Load Example Query
      </button>

      <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
        <p className="text-sm text-orange-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-orange-700">
          Requires User API Key or REST API Key. Configure in Credentials Manager.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600 space-y-1">
          <div><strong>Features:</strong> APM, infrastructure monitoring, browser monitoring, synthetics</div>
          <div><strong>Query Language:</strong> NRQL (SQL-like syntax)</div>
          <div><strong>Data Types:</strong> Metrics, events, logs, traces</div>
          <div><strong>Documentation:</strong> docs.newrelic.com/docs/apis</div>
        </p>
      </div>

      <div className="mt-2 p-3 bg-blue-50 rounded text-sm space-y-2">
        <div><strong>💡 New Relic Tips:</strong></div>
        <div>• NRQL queries are SQL-like and very powerful</div>
        <div>• Use FACET for grouping, TIMESERIES for charts</div>
        <div>• Custom events enable application-specific analytics</div>
        <div>• Alert policies can be automated via API</div>
      </div>
    </div>
  );
};

export default NewRelicConfig;
