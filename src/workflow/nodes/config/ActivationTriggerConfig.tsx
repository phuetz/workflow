/**
 * Activation Trigger Node Configuration
 * Trigger when workflow or node is activated/deactivated
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface ActivationTriggerConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const ActivationTriggerConfig: React.FC<ActivationTriggerConfigProps> = ({ config, onChange }) => {
  const [mode, setMode] = useState((config.mode as string) || 'activation');
  const [scope, setScope] = useState((config.scope as string) || 'workflow');
  const [workflowId, setWorkflowId] = useState((config.workflowId as string) || '');
  const [nodeId, setNodeId] = useState((config.nodeId as string) || '');
  const [debounce, setDebounce] = useState((config.debounce as number) || 0);

  return (
    <div className="activation-trigger-config space-y-4">
      <div className="font-semibold text-lg mb-4">Activation Trigger</div>

      <div>
        <label className="block text-sm font-medium mb-2">Trigger Mode</label>
        <select
          value={mode}
          onChange={(e) => {
            setMode(e.target.value);
            onChange({ ...config, mode: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="activation">On Activation</option>
          <option value="deactivation">On Deactivation</option>
          <option value="both">On Both (Activation & Deactivation)</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          {mode === 'activation' && 'Triggers when the target is activated'}
          {mode === 'deactivation' && 'Triggers when the target is deactivated'}
          {mode === 'both' && 'Triggers on both activation and deactivation events'}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Scope</label>
        <select
          value={scope}
          onChange={(e) => {
            setScope(e.target.value);
            onChange({ ...config, scope: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="workflow">Workflow Activation</option>
          <option value="node">Specific Node Activation</option>
          <option value="any">Any Workflow/Node</option>
        </select>
      </div>

      {scope === 'workflow' && (
        <div>
          <label className="block text-sm font-medium mb-2">Target Workflow</label>
          <input
            type="text"
            value={workflowId}
            onChange={(e) => {
              setWorkflowId(e.target.value);
              onChange({ ...config, workflowId: e.target.value });
            }}
            placeholder="Leave empty to monitor current workflow"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Optional: Specify workflow ID to monitor. Leave empty for current workflow.
          </p>
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
          <p className="text-xs text-gray-500 mt-1">
            Specify the node ID to monitor for activation/deactivation
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-2">Debounce Delay (ms)</label>
        <input
          type="number"
          value={debounce}
          onChange={(e) => {
            const value = parseInt(e.target.value) || 0;
            setDebounce(value);
            onChange({ ...config, debounce: value });
          }}
          min={0}
          step={100}
          placeholder="0"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          Delay in milliseconds before triggering (prevents rapid re-triggering)
        </p>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm space-y-2">
        <div><strong>⚡ Trigger Output Data:</strong></div>
        <ul className="list-disc list-inside space-y-1">
          <li><code className="bg-white px-1 rounded">{'{{ $json.event }}'}</code> - "activation" or "deactivation"</li>
          <li><code className="bg-white px-1 rounded">{'{{ $json.scope }}'}</code> - "workflow" or "node"</li>
          <li><code className="bg-white px-1 rounded">{'{{ $json.targetId }}'}</code> - ID of activated/deactivated item</li>
          <li><code className="bg-white px-1 rounded">{'{{ $json.timestamp }}'}</code> - Event timestamp</li>
        </ul>
      </div>

      <div className="mt-2 p-3 bg-green-50 rounded text-sm space-y-2">
        <div><strong>💡 Use Cases:</strong></div>
        <ul className="list-disc list-inside space-y-1">
          <li>Send notification when workflow is enabled/disabled</li>
          <li>Log activation changes for audit purposes</li>
          <li>Trigger cleanup when workflow is deactivated</li>
          <li>Chain workflow activations together</li>
        </ul>
      </div>
    </div>
  );
};

export default ActivationTriggerConfig;
