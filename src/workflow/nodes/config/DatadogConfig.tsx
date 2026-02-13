/**
 * Datadog Node Configuration
 * Monitoring, logging, and security platform
 */

import React, { useState } from 'react';

interface DatadogConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const DatadogConfig: React.FC<DatadogConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'sendMetric');
  const [apiKey, setApiKey] = useState(config.apiKey as string || '');
  const [appKey, setAppKey] = useState(config.appKey as string || '');
  const [metricName, setMetricName] = useState(config.metricName as string || '');
  const [metricValue, setMetricValue] = useState(config.metricValue as string || '');
  const [metricType, setMetricType] = useState(config.metricType as string || 'gauge');
  const [tags, setTags] = useState(config.tags as string || '');
  const [query, setQuery] = useState(config.query as string || '');
  const [logMessage, setLogMessage] = useState(config.logMessage as string || '');
  const [logLevel, setLogLevel] = useState(config.logLevel as string || 'info');
  const [monitorId, setMonitorId] = useState(config.monitorId as string || '');
  const [eventTitle, setEventTitle] = useState(config.eventTitle as string || '');
  const [eventText, setEventText] = useState(config.eventText as string || '');

  const handleOperationChange = (value: string) => {
    setOperation(value);
    onChange({ ...config, operation: value });
  };

  const handleMetricNameChange = (value: string) => {
    setMetricName(value);
    onChange({ ...config, metricName: value });
  };

  const handleMetricValueChange = (value: string) => {
    setMetricValue(value);
    onChange({ ...config, metricValue: value });
  };

  const handleMetricTypeChange = (value: string) => {
    setMetricType(value);
    onChange({ ...config, metricType: value });
  };

  const handleTagsChange = (value: string) => {
    setTags(value);
    onChange({ ...config, tags: value });
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    onChange({ ...config, query: value });
  };

  const handleLogMessageChange = (value: string) => {
    setLogMessage(value);
    onChange({ ...config, logMessage: value });
  };

  const handleLogLevelChange = (value: string) => {
    setLogLevel(value);
    onChange({ ...config, logLevel: value });
  };

  const handleMonitorIdChange = (value: string) => {
    setMonitorId(value);
    onChange({ ...config, monitorId: value });
  };

  const handleEventTitleChange = (value: string) => {
    setEventTitle(value);
    onChange({ ...config, eventTitle: value });
  };

  const handleEventTextChange = (value: string) => {
    setEventText(value);
    onChange({ ...config, eventText: value });
  };

  const loadExample = () => {
    setOperation('sendMetric');
    setMetricName('workflow.execution.duration');
    setMetricValue('{{ $json.duration }}');
    setMetricType('gauge');
    setTags('env:production,workflow:{{ $workflow.name }}');
    onChange({
      ...config,
      operation: 'sendMetric',
      metricName: 'workflow.execution.duration',
      metricValue: '{{ $json.duration }}',
      metricType: 'gauge',
      tags: 'env:production,workflow:{{ $workflow.name }}'
    });
  };

  return (
    <div className="space-y-4">
      <div className="font-semibold text-lg mb-4">Datadog Configuration</div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
        >
          <option value="sendMetric">Send Metric</option>
          <option value="queryMetrics">Query Metrics</option>
          <option value="sendLog">Send Log</option>
          <option value="queryLogs">Query Logs</option>
          <option value="sendEvent">Send Event</option>
          <option value="getEvents">Get Events</option>
          <option value="createMonitor">Create Monitor</option>
          <option value="getMonitors">Get Monitors</option>
          <option value="muteMonitor">Mute Monitor</option>
          <option value="getDowntimes">Get Downtimes</option>
          <option value="createDowntime">Create Downtime</option>
          <option value="sendTrace">Send Trace</option>
        </select>
      </div>

      {operation === 'sendMetric' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Metric Name
            </label>
            <input
              type="text"
              value={metricName}
              onChange={(e) => handleMetricNameChange(e.target.value)}
              placeholder="workflow.execution.duration"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Metric name using dot notation (e.g., app.requests.count)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Metric Value
            </label>
            <input
              type="text"
              value={metricValue}
              onChange={(e) => handleMetricValueChange(e.target.value)}
              placeholder="123 or {{ $json.value }}"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Numeric value or expression
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Metric Type
            </label>
            <select
              value={metricType}
              onChange={(e) => handleMetricTypeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
            >
              <option value="gauge">Gauge (snapshot value)</option>
              <option value="count">Count (events in interval)</option>
              <option value="rate">Rate (per second)</option>
              <option value="histogram">Histogram (distribution)</option>
              <option value="distribution">Distribution (global percentiles)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => handleTagsChange(e.target.value)}
              placeholder="env:production,service:api,version:1.2.3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Tags for filtering and grouping (key:value format)
            </p>
          </div>
        </div>
      )}

      {(operation === 'queryMetrics' || operation === 'queryLogs') && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Query
            </label>
            <textarea
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder={operation === 'queryMetrics'
                ? 'avg:system.cpu.user{*} by {host}'
                : 'service:api status:error'
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              {operation === 'queryMetrics'
                ? 'Datadog metric query syntax'
                : 'Datadog log search syntax'
              }
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-2">
            <p className="text-xs text-blue-800">
              {operation === 'queryMetrics' ? (
                <>
                  <strong>Metric query examples:</strong><br/>
                  • avg:system.cpu.user{'{*}'} by {'{host}'}<br/>
                  • sum:requests.count{'{env:prod}'}.rollup(sum, 60)<br/>
                  • max:database.query.time{'{service:api}'}
                </>
              ) : (
                <>
                  <strong>Log query examples:</strong><br/>
                  • service:api status:error<br/>
                  • @http.status_code:&gt;=400<br/>
                  • host:web-* @duration:&gt;1000
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {operation === 'sendLog' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Log Message
            </label>
            <textarea
              value={logMessage}
              onChange={(e) => handleLogMessageChange(e.target.value)}
              placeholder="Workflow execution completed successfully"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Log Level
            </label>
            <select
              value={logLevel}
              onChange={(e) => handleLogLevelChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
            >
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warn">Warn</option>
              <option value="error">Error</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => handleTagsChange(e.target.value)}
              placeholder="env:production,service:workflow,user:{{ $json.userId }}"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600 font-mono text-sm"
            />
          </div>
        </div>
      )}

      {operation === 'sendEvent' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Title
            </label>
            <input
              type="text"
              value={eventTitle}
              onChange={(e) => handleEventTitleChange(e.target.value)}
              placeholder="Deployment completed"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Text
            </label>
            <textarea
              value={eventText}
              onChange={(e) => handleEventTextChange(e.target.value)}
              placeholder="Version 1.2.3 deployed to production"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => handleTagsChange(e.target.value)}
              placeholder="env:production,version:1.2.3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600 font-mono text-sm"
            />
          </div>
        </div>
      )}

      {(operation === 'muteMonitor' || operation === 'getMonitors') && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          {operation === 'muteMonitor' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monitor ID
              </label>
              <input
                type="text"
                value={monitorId}
                onChange={(e) => handleMonitorIdChange(e.target.value)}
                placeholder="123456"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
              />
            </div>
          )}
        </div>
      )}

      <button
        onClick={loadExample}
        className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
      >
        Load Example Metric
      </button>

      <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
        <p className="text-sm text-orange-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-orange-700">
          Requires API Key and Application Key. Configure in Credentials Manager.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600 space-y-1">
          <div><strong>Features:</strong> Metrics, logs, traces, events, monitors, downtimes</div>
          <div><strong>Metric Types:</strong> Gauge, count, rate, histogram, distribution</div>
          <div><strong>Integrations:</strong> 600+ integrations available</div>
          <div><strong>Documentation:</strong> docs.datadoghq.com/api</div>
        </p>
      </div>

      <div className="mt-2 p-3 bg-blue-50 rounded text-sm space-y-2">
        <div><strong>💡 Datadog Tips:</strong></div>
        <div>• Use tags consistently for filtering and grouping</div>
        <div>• Gauge for values that can go up/down, count for events</div>
        <div>• Events appear in event stream and dashboards</div>
        <div>• Monitors trigger alerts based on metric thresholds</div>
      </div>
    </div>
  );
};

export default DatadogConfig;
