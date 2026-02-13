import React from 'react';
import { WorkflowNode } from '../../../types/workflow';

interface SSHConfigProps {
  node: WorkflowNode;
  onChange: (updates: Partial<WorkflowNode>) => void;
}

export const SSHConfig: React.FC<SSHConfigProps> = ({ node, onChange }) => {
  const config = (node.data?.config || {}) as Record<string, string | number | boolean>;

  const updateConfig = (key: string, value: string | number | boolean) => {
    onChange({
      data: {
        ...node.data,
        config: { ...config, [key]: value }
      }
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Host
        </label>
        <input
          type="text"
          value={String(config.host || '')}
          onChange={(e) => updateConfig('host', e.target.value)}
          placeholder="server.example.com"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Port
          </label>
          <input
            type="number"
            value={Number(config.port) || 22}
            onChange={(e) => updateConfig('port', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Username
          </label>
          <input
            type="text"
            value={String(config.username || '')}
            onChange={(e) => updateConfig('username', e.target.value)}
            placeholder="root"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Authentication Method
        </label>
        <select
          value={String(config.authMethod || 'password')}
          onChange={(e) => updateConfig('authMethod', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="password">Password</option>
          <option value="privateKey">Private Key</option>
          <option value="agent">SSH Agent</option>
        </select>
      </div>

      {config.authMethod === 'password' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Password
          </label>
          <input
            type="password"
            value={String(config.password || '')}
            onChange={(e) => updateConfig('password', e.target.value)}
            placeholder="••••••••"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <p className="text-xs text-gray-500 mt-1">Use credentials for production</p>
        </div>
      )}

      {config.authMethod === 'privateKey' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Private Key
            </label>
            <textarea
              value={String(config.privateKey || '')}
              onChange={(e) => updateConfig('privateKey', e.target.value)}
              placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Passphrase (Optional)
            </label>
            <input
              type="password"
              value={String(config.passphrase || '')}
              onChange={(e) => updateConfig('passphrase', e.target.value)}
              placeholder="Key passphrase"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Operation
        </label>
        <select
          value={String(config.operation || 'execute')}
          onChange={(e) => updateConfig('operation', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="execute">Execute Command</option>
          <option value="upload">Upload File (SFTP)</option>
          <option value="download">Download File (SFTP)</option>
          <option value="listDir">List Directory</option>
        </select>
      </div>

      {config.operation === 'execute' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Command
          </label>
          <textarea
            value={String(config.command || '')}
            onChange={(e) => updateConfig('command', e.target.value)}
            placeholder="ls -la /var/log"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
          />
          <p className="text-xs text-gray-500 mt-1">Use expressions like {'{{ $json.path }}'}</p>
        </div>
      )}

      {(config.operation === 'upload' || config.operation === 'download') && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Local Path
            </label>
            <input
              type="text"
              value={String(config.localPath || '')}
              onChange={(e) => updateConfig('localPath', e.target.value)}
              placeholder="/local/path/file.txt"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Remote Path
            </label>
            <input
              type="text"
              value={String(config.remotePath || '')}
              onChange={(e) => updateConfig('remotePath', e.target.value)}
              placeholder="/remote/path/file.txt"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </>
      )}

      {config.operation === 'listDir' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Directory Path
          </label>
          <input
            type="text"
            value={String(config.directoryPath || '')}
            onChange={(e) => updateConfig('directoryPath', e.target.value)}
            placeholder="/home/user"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Timeout (seconds)
        </label>
        <input
          type="number"
          value={Number(config.timeout) || 30}
          onChange={(e) => updateConfig('timeout', parseInt(e.target.value))}
          min={5}
          max={300}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="keepAlive"
          checked={Boolean(config.keepAlive)}
          onChange={(e) => updateConfig('keepAlive', e.target.checked)}
          className="h-4 w-4 text-blue-600 rounded"
        />
        <label htmlFor="keepAlive" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
          Keep connection alive between executions
        </label>
      </div>
    </div>
  );
};

export default SSHConfig;
