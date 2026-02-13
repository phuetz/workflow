/**
 * Error Workflow Node Configuration
 * Execute a separate workflow when errors occur
 * AGENT 9: Node Library Expansion - Phase 1
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface ErrorWorkflowConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const ErrorWorkflowConfig: React.FC<ErrorWorkflowConfigProps> = ({ config, onChange }) => {
  const [errorWorkflowId, setErrorWorkflowId] = useState((config.errorWorkflowId as string) || '');
  const [passThroughError, setPassThroughError] = useState((config.passThroughError as boolean) !== false);
  const [includeOriginalData, setIncludeOriginalData] = useState((config.includeOriginalData as boolean) !== false);
  const [errorTypes, setErrorTypes] = useState((config.errorTypes as string) || 'all');

  return (
    <div className="error-workflow-config space-y-4">
      <div className="font-semibold text-lg mb-4">Error Workflow Configuration</div>

      <div>
        <label className="block text-sm font-medium mb-2">Error Workflow ID</label>
        <input
          type="text"
          value={errorWorkflowId}
          onChange={(e) => {
            setErrorWorkflowId(e.target.value);
            onChange({ ...config, errorWorkflowId: e.target.value });
          }}
          placeholder="workflow-id-to-execute-on-error"
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">ID of workflow to execute when errors occur</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Error Types to Handle</label>
        <select
          value={errorTypes}
          onChange={(e) => {
            setErrorTypes(e.target.value);
            onChange({ ...config, errorTypes: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="all">All Errors</option>
          <option value="execution">Execution Errors Only</option>
          <option value="validation">Validation Errors Only</option>
          <option value="timeout">Timeout Errors Only</option>
          <option value="network">Network Errors Only</option>
        </select>
      </div>

      <div className="flex items-center mb-2">
        <input
          type="checkbox"
          id="passThroughError"
          checked={passThroughError}
          onChange={(e) => {
            setPassThroughError(e.target.checked);
            onChange({ ...config, passThroughError: e.target.checked });
          }}
          className="mr-2"
        />
        <label htmlFor="passThroughError" className="text-sm">
          Re-throw error after error workflow completes
        </label>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="includeOriginalData"
          checked={includeOriginalData}
          onChange={(e) => {
            setIncludeOriginalData(e.target.checked);
            onChange({ ...config, includeOriginalData: e.target.checked });
          }}
          className="mr-2"
        />
        <label htmlFor="includeOriginalData" className="text-sm">
          Include original input data in error workflow
        </label>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm space-y-2">
        <div><strong>📦 Error Workflow Input:</strong></div>
        <div className="bg-white p-2 rounded font-mono text-xs">
          <pre>{`{
  "error": {
    "message": "Error message",
    "type": "ExecutionError",
    "stack": "...",
    "node": "node-id"
  },
  "originalData": { ... },
  "timestamp": "2024-01-01T00:00:00Z"
}`}</pre>
        </div>
      </div>

      <div className="mt-2 p-3 bg-yellow-50 rounded text-sm space-y-2">
        <div><strong>💡 Use Cases:</strong></div>
        <ul className="list-disc list-inside space-y-1">
          <li>Send error notifications (email, Slack)</li>
          <li>Log errors to external systems</li>
          <li>Trigger recovery workflows</li>
          <li>Create support tickets automatically</li>
          <li>Roll back database transactions</li>
        </ul>
      </div>

      <div className="mt-2 p-3 bg-red-50 rounded text-sm">
        <strong>⚠️ Note:</strong> Make sure the error workflow exists and is active. Circular error workflows will be prevented.
      </div>
    </div>
  );
};
