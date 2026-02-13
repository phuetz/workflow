import React from 'react';
import { useWorkflowStore } from '../../../store/workflowStore';
import { WorkflowNode } from '../../../types/workflow';

interface Props {
  node: WorkflowNode;
}

export default function GitConfig({ node }: Props) {
  const { updateNode, darkMode } = useWorkflowStore();
  const config = ((node.data?.config || (node as any).config) || {}) as Record<string, unknown>;

  const update = (field: string, value: unknown) => {
    updateNode(node.id, { config: { ...config, [field]: value } });
  };

  return (
    <div style={{ width: 320, padding: 16 }}>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Operation</label>
        <select
          value={(config.operation as string) || 'clone'}
          onChange={(e) => update('operation', e.target.value)}
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
        >
          <option value="clone">Clone</option>
          <option value="pull">Pull</option>
          <option value="push">Push</option>
          <option value="commit">Commit</option>
          <option value="status">Status</option>
          <option value="diff">Diff</option>
          <option value="log">Log</option>
          <option value="checkout">Checkout</option>
          <option value="branch">Branch</option>
          <option value="merge">Merge</option>
          <option value="tag">Tag</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Repository URL</label>
        <input
          type="text"
          value={(config.repositoryUrl as string) || ''}
          onChange={(e) => update('repositoryUrl', e.target.value)}
          placeholder="https://github.com/user/repo.git"
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Branch</label>
        <input
          type="text"
          value={(config.branch as string) || 'main'}
          onChange={(e) => update('branch', e.target.value)}
          placeholder="main"
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Local Path</label>
        <input
          type="text"
          value={(config.localPath as string) || ''}
          onChange={(e) => update('localPath', e.target.value)}
          placeholder="/path/to/local/repo"
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
        />
        <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Local repository path
        </p>
      </div>

      {(config.operation === 'commit') && (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Commit Message</label>
            <textarea
              value={(config.commitMessage as string) || ''}
              onChange={(e) => update('commitMessage', e.target.value)}
              placeholder="Update files"
              rows={3}
              className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Author Name</label>
            <input
              type="text"
              value={(config.authorName as string) || ''}
              onChange={(e) => update('authorName', e.target.value)}
              placeholder="John Doe"
              className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Author Email</label>
            <input
              type="email"
              value={(config.authorEmail as string) || ''}
              onChange={(e) => update('authorEmail', e.target.value)}
              placeholder="john@example.com"
              className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
            />
          </div>
        </>
      )}

      {(config.operation === 'tag') && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Tag Name</label>
          <input
            type="text"
            value={(config.tagName as string) || ''}
            onChange={(e) => update('tagName', e.target.value)}
            placeholder="v1.0.0"
            className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
          />
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Authentication</label>
        <select
          value={(config.authType as string) || 'none'}
          onChange={(e) => update('authType', e.target.value)}
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
        >
          <option value="none">None (Public)</option>
          <option value="https">HTTPS (Username/Password)</option>
          <option value="token">Personal Access Token</option>
          <option value="ssh">SSH Key</option>
        </select>
      </div>

      {config.authType === 'https' && (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Username</label>
            <input
              type="text"
              value={(config.username as string) || ''}
              onChange={(e) => update('username', e.target.value)}
              className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
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
        </>
      )}

      {config.authType === 'token' && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Access Token</label>
          <input
            type="password"
            value={(config.token as string) || ''}
            onChange={(e) => update('token', e.target.value)}
            placeholder="ghp_xxxxxxxxxxxx"
            className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
          />
        </div>
      )}

      {config.authType === 'ssh' && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">SSH Key Path</label>
          <input
            type="text"
            value={(config.sshKeyPath as string) || ''}
            onChange={(e) => update('sshKeyPath', e.target.value)}
            placeholder="~/.ssh/id_rsa"
            className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
          />
        </div>
      )}

      <div className="mb-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={(config.shallow as boolean) || false}
            onChange={(e) => update('shallow', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Shallow clone (--depth 1)</span>
        </label>
      </div>

      {(config.operation === 'commit') && (
        <div className="mb-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={(config.addAll as boolean) || false}
              onChange={(e) => update('addAll', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Add all changes (git add -A)</span>
          </label>
        </div>
      )}
    </div>
  );
}
