import React from 'react';
import { useWorkflowStore } from '../../../store/workflowStore';
import { WorkflowNode } from '../../../types/workflow';

interface Props {
  node: WorkflowNode;
}

export default function ExecuteCommandConfig({ node }: Props) {
  const { updateNode, darkMode } = useWorkflowStore();
  const config = ((node.data?.config || (node as any).config) || {}) as Record<string, unknown>;

  const update = (field: string, value: unknown) => {
    updateNode(node.id, { config: { ...config, [field]: value } });
  };

  return (
    <div style={{ width: 320, padding: 16 }}>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Command</label>
        <textarea
          value={(config.command as string) || ''}
          onChange={(e) => update('command', e.target.value)}
          placeholder="ls -la"
          rows={3}
          className={`w-full px-3 py-2 border rounded font-mono text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
        />
        <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Shell command to execute
        </p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Working Directory</label>
        <input
          type="text"
          value={(config.workingDirectory as string) || ''}
          onChange={(e) => update('workingDirectory', e.target.value)}
          placeholder="/path/to/directory"
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
        />
        <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Directory to run the command in (optional)
        </p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Timeout (seconds)</label>
        <input
          type="number"
          value={(config.timeout as number) || 30}
          onChange={(e) => update('timeout', parseInt(e.target.value))}
          min={1}
          max={3600}
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
        />
        <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Maximum execution time (1-3600 seconds)
        </p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Environment Variables</label>
        <textarea
          value={(config.env as string) || ''}
          onChange={(e) => update('env', e.target.value)}
          placeholder="VAR1=value1&#10;VAR2=value2"
          rows={3}
          className={`w-full px-3 py-2 border rounded font-mono text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
        />
        <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          One per line: KEY=value
        </p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Shell</label>
        <select
          value={(config.shell as string) || '/bin/sh'}
          onChange={(e) => update('shell', e.target.value)}
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
        >
          <option value="/bin/sh">sh</option>
          <option value="/bin/bash">bash</option>
          <option value="/bin/zsh">zsh</option>
          <option value="/bin/fish">fish</option>
          <option value="powershell">PowerShell</option>
          <option value="cmd">CMD (Windows)</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={(config.captureStderr as boolean) !== false}
            onChange={(e) => update('captureStderr', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Capture STDERR</span>
        </label>
      </div>

      <div className="mb-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={(config.failOnError as boolean) !== false}
            onChange={(e) => update('failOnError', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Fail on non-zero exit code</span>
        </label>
      </div>

      <div className={`p-3 rounded ${darkMode ? 'bg-yellow-900/20 border border-yellow-700' : 'bg-yellow-50 border border-yellow-200'}`}>
        <p className={`text-xs ${darkMode ? 'text-yellow-400' : 'text-yellow-800'}`}>
          <strong>Security Warning:</strong> Only execute trusted commands. This node can run arbitrary shell commands with the permissions of the workflow process.
        </p>
      </div>
    </div>
  );
}
