/**
 * Error Trigger Node Configuration
 * Trigger when errors occur in workflows or specific nodes
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface ErrorTriggerConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const ErrorTriggerConfig: React.FC<ErrorTriggerConfigProps> = ({ config, onChange }) => {
  const [scope, setScope] = useState((config.scope as string) || 'workflow');
  const [workflowId, setWorkflowId] = useState((config.workflowId as string) || '');
  const [nodeId, setNodeId] = useState((config.nodeId as string) || '');
  const [errorTypes, setErrorTypes] = useState<string[]>(
    (config.errorTypes as string[]) || ['all']
  );
  const [minSeverity, setMinSeverity] = useState((config.minSeverity as string) || 'error');
  const [includeStackTrace, setIncludeStackTrace] = useState(
    (config.includeStackTrace as boolean) ?? true
  );

  const handleErrorTypeToggle = (errorType: string) => {
    let newTypes: string[];
    if (errorTypes.includes('all')) {
      newTypes = errorType === 'all' ? ['all'] : [errorType];
    } else if (errorType === 'all') {
      newTypes = ['all'];
    } else {
      const filtered = errorTypes.filter((t) => t !== 'all');
      if (filtered.includes(errorType)) {
        newTypes = filtered.filter((t) => t !== errorType);
        if (newTypes.length === 0) newTypes = ['all'];
      } else {
        newTypes = [...filtered, errorType];
      }
    }
    setErrorTypes(newTypes);
    onChange({ ...config, errorTypes: newTypes });
  };

  return (
    <div className="error-trigger-config space-y-4">
      <div className="font-semibold text-lg mb-4">Error Trigger</div>

      <div>
        <label className="block text-sm font-medium mb-2">Error Scope</label>
        <select
          value={scope}
          onChange={(e) => {
            setScope(e.target.value);
            onChange({ ...config, scope: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="workflow">Specific Workflow</option>
          <option value="node">Specific Node</option>
          <option value="any">Any Workflow/Node</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Choose what scope of errors to monitor
        </p>
      </div>

      {scope === 'workflow' && (
        <div>
          <label className="block text-sm font-medium mb-2">Target Workflow ID</label>
          <input
            type="text"
            value={workflowId}
            onChange={(e) => {
              setWorkflowId(e.target.value);
              onChange({ ...config, workflowId: e.target.value });
            }}
            placeholder="workflow_abc123 (leave empty for current)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
          />
        </div>
      )}

      {scope === 'node' && (
        <div>
          <label className="block text-sm font-medium mb-2">Target Node ID</label>
          <input
            type="text"
            value={nodeId}
            onChange={(e) => {
              setNodeId(e.target.value);
              onChange({ ...config, nodeId: e.target.value });
            }}
            placeholder="node_abc123"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-2">Error Types to Monitor</label>
        <div className="space-y-2">
          {[
            { value: 'all', label: 'All Error Types' },
            { value: 'execution', label: 'Execution Errors' },
            { value: 'validation', label: 'Validation Errors' },
            { value: 'timeout', label: 'Timeout Errors' },
            { value: 'network', label: 'Network Errors' },
            { value: 'auth', label: 'Authentication Errors' },
            { value: 'ratelimit', label: 'Rate Limit Errors' },
          ].map(({ value, label }) => (
            <label key={value} className="flex items-center">
              <input
                type="checkbox"
                checked={errorTypes.includes(value)}
                onChange={() => handleErrorTypeToggle(value)}
                className="mr-2"
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Minimum Severity</label>
        <select
          value={minSeverity}
          onChange={(e) => {
            setMinSeverity(e.target.value);
            onChange({ ...config, minSeverity: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="warning">Warning & Above</option>
          <option value="error">Error & Above</option>
          <option value="critical">Critical Only</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Only trigger for errors at or above this severity level
        </p>
      </div>

      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={includeStackTrace}
            onChange={(e) => {
              setIncludeStackTrace(e.target.checked);
              onChange({ ...config, includeStackTrace: e.target.checked });
            }}
            className="mr-2"
          />
          <span className="text-sm font-medium">Include Stack Trace</span>
        </label>
        <p className="text-xs text-gray-500 ml-6 mt-1">
          Include full stack trace in error output (useful for debugging)
        </p>
      </div>

      <div className="mt-4 p-3 bg-red-50 rounded text-sm space-y-2">
        <div><strong>🚨 Error Output Data:</strong></div>
        <ul className="list-disc list-inside space-y-1">
          <li><code className="bg-white px-1 rounded">{'{{ $json.errorType }}'}</code> - Type of error</li>
          <li><code className="bg-white px-1 rounded">{'{{ $json.message }}'}</code> - Error message</li>
          <li><code className="bg-white px-1 rounded">{'{{ $json.severity }}'}</code> - Error severity level</li>
          <li><code className="bg-white px-1 rounded">{'{{ $json.workflowId }}'}</code> - Source workflow ID</li>
          <li><code className="bg-white px-1 rounded">{'{{ $json.nodeId }}'}</code> - Source node ID (if applicable)</li>
          <li><code className="bg-white px-1 rounded">{'{{ $json.stackTrace }}'}</code> - Full stack trace (if enabled)</li>
          <li><code className="bg-white px-1 rounded">{'{{ $json.timestamp }}'}</code> - Error timestamp</li>
        </ul>
      </div>

      <div className="mt-2 p-3 bg-yellow-50 rounded text-sm space-y-2">
        <div><strong>💡 Use Cases:</strong></div>
        <ul className="list-disc list-inside space-y-1">
          <li>Send alerts to Slack/email when critical errors occur</li>
          <li>Log errors to external monitoring services (Datadog, Sentry)</li>
          <li>Automatic retry or fallback workflows</li>
          <li>Create support tickets for production errors</li>
          <li>Trigger incident response workflows</li>
        </ul>
      </div>

      <div className="mt-2 p-3 bg-blue-50 rounded text-sm">
        <div><strong>⚠️ Note:</strong> This trigger executes asynchronously and does not affect the original workflow execution.</div>
      </div>
    </div>
  );
};

export default ErrorTriggerConfig;
