import React from 'react';
import { useWorkflowStore } from '../../../store/workflowStore';
import { WorkflowNode } from '../../../types/workflow';

interface Props {
  node: WorkflowNode;
}

export default function FTPConfig({ node }: Props) {
  const { updateNode, darkMode } = useWorkflowStore();
  const config = ((node.data?.config || (node as any).config) || {}) as Record<string, unknown>;

  const update = (field: string, value: unknown) => {
    updateNode(node.id, { config: { ...config, [field]: value } });
  };

  return (
    <div style={{ width: 320, padding: 16 }}>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Protocol</label>
        <select
          value={(config.protocol as string) || 'ftp'}
          onChange={(e) => update('protocol', e.target.value)}
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
        >
          <option value="ftp">FTP</option>
          <option value="ftps">FTPS (FTP over SSL/TLS)</option>
          <option value="sftp">SFTP (SSH File Transfer)</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Operation</label>
        <select
          value={(config.operation as string) || 'list'}
          onChange={(e) => update('operation', e.target.value)}
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
        >
          <option value="list">List Files</option>
          <option value="download">Download File</option>
          <option value="upload">Upload File</option>
          <option value="delete">Delete File</option>
          <option value="rename">Rename File</option>
          <option value="mkdir">Create Directory</option>
          <option value="rmdir">Remove Directory</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Host</label>
        <input
          type="text"
          value={(config.host as string) || ''}
          onChange={(e) => update('host', e.target.value)}
          placeholder="ftp.example.com"
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Port</label>
        <input
          type="number"
          value={(config.port as number) || (config.protocol === 'sftp' ? 22 : 21)}
          onChange={(e) => update('port', parseInt(e.target.value))}
          min={1}
          max={65535}
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
        />
        <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Default: FTP(S) = 21, SFTP = 22
        </p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Username</label>
        <input
          type="text"
          value={(config.username as string) || ''}
          onChange={(e) => update('username', e.target.value)}
          placeholder="anonymous"
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          type="password"
          value={(config.password as string) || ''}
          onChange={(e) => update('password', e.target.value)}
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Remote Path</label>
        <input
          type="text"
          value={(config.remotePath as string) || '/'}
          onChange={(e) => update('remotePath', e.target.value)}
          placeholder="/path/to/directory"
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
        />
        <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Path on the FTP server
        </p>
      </div>

      {(config.operation === 'download' || config.operation === 'upload') && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Local Path</label>
          <input
            type="text"
            value={(config.localPath as string) || ''}
            onChange={(e) => update('localPath', e.target.value)}
            placeholder="/local/path/to/file"
            className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
          />
          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Path on the local filesystem
          </p>
        </div>
      )}

      {config.operation === 'rename' && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">New Name</label>
          <input
            type="text"
            value={(config.newName as string) || ''}
            onChange={(e) => update('newName', e.target.value)}
            placeholder="newfile.txt"
            className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
          />
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Timeout (seconds)</label>
        <input
          type="number"
          value={(config.timeout as number) || 30}
          onChange={(e) => update('timeout', parseInt(e.target.value))}
          min={5}
          max={300}
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
        />
      </div>

      {config.operation === 'upload' && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Transfer Mode</label>
          <select
            value={(config.transferMode as string) || 'binary'}
            onChange={(e) => update('transferMode', e.target.value)}
            className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
          >
            <option value="binary">Binary</option>
            <option value="ascii">ASCII</option>
          </select>
        </div>
      )}

      {config.protocol === 'ftps' && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">SSL/TLS Mode</label>
          <select
            value={(config.secureMode as string) || 'implicit'}
            onChange={(e) => update('secureMode', e.target.value)}
            className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
          >
            <option value="implicit">Implicit</option>
            <option value="explicit">Explicit</option>
          </select>
        </div>
      )}

      <div className="mb-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={(config.passive as boolean) !== false}
            onChange={(e) => update('passive', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Passive mode</span>
        </label>
        <p className={`text-xs mt-1 ml-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Recommended for connections behind firewalls
        </p>
      </div>

      {(config.protocol === 'ftps' || config.protocol === 'sftp') && (
        <div className="mb-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={(config.rejectUnauthorized as boolean) !== false}
              onChange={(e) => update('rejectUnauthorized', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Verify SSL certificate</span>
          </label>
        </div>
      )}

      {config.operation === 'list' && (
        <div className="mb-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={(config.recursive as boolean) || false}
              onChange={(e) => update('recursive', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">List recursively</span>
          </label>
        </div>
      )}
    </div>
  );
}
