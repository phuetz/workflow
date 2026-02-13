import React from 'react';
import { useWorkflowStore } from '../../../store/workflowStore';
import { WorkflowNode } from '../../../types/workflow';

interface Props {
  node: WorkflowNode;
}

export default function LDAPConfig({ node }: Props) {
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
          value={(config.operation as string) || 'search'}
          onChange={(e) => update('operation', e.target.value)}
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
        >
          <option value="search">Search</option>
          <option value="add">Add Entry</option>
          <option value="modify">Modify Entry</option>
          <option value="delete">Delete Entry</option>
          <option value="bind">Bind (Authenticate)</option>
          <option value="compare">Compare</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Server URL</label>
        <input
          type="text"
          value={(config.serverUrl as string) || ''}
          onChange={(e) => update('serverUrl', e.target.value)}
          placeholder="ldap://ldap.example.com:389"
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
        />
        <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Use ldaps:// for SSL/TLS
        </p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Bind DN</label>
        <input
          type="text"
          value={(config.bindDn as string) || ''}
          onChange={(e) => update('bindDn', e.target.value)}
          placeholder="cn=admin,dc=example,dc=com"
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
        />
        <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Distinguished Name for authentication
        </p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Bind Password</label>
        <input
          type="password"
          value={(config.bindPassword as string) || ''}
          onChange={(e) => update('bindPassword', e.target.value)}
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
        />
      </div>

      {(config.operation === 'search' || config.operation === 'add' || config.operation === 'modify' || config.operation === 'delete') && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Base DN</label>
          <input
            type="text"
            value={(config.baseDn as string) || ''}
            onChange={(e) => update('baseDn', e.target.value)}
            placeholder="dc=example,dc=com"
            className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
          />
          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Base DN for the operation
          </p>
        </div>
      )}

      {config.operation === 'search' && (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Search Filter</label>
            <input
              type="text"
              value={(config.filter as string) || ''}
              onChange={(e) => update('filter', e.target.value)}
              placeholder="(objectClass=person)"
              className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
            />
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              LDAP filter expression
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Attributes</label>
            <input
              type="text"
              value={(config.attributes as string) || ''}
              onChange={(e) => update('attributes', e.target.value)}
              placeholder="cn, mail, telephoneNumber"
              className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
            />
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Comma-separated list (leave empty for all)
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Scope</label>
            <select
              value={(config.scope as string) || 'sub'}
              onChange={(e) => update('scope', e.target.value)}
              className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
            >
              <option value="base">Base (entry only)</option>
              <option value="one">One Level</option>
              <option value="sub">Subtree</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Size Limit</label>
            <input
              type="number"
              value={(config.sizeLimit as number) || 100}
              onChange={(e) => update('sizeLimit', parseInt(e.target.value))}
              min={1}
              max={10000}
              className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
            />
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Maximum number of results
            </p>
          </div>
        </>
      )}

      {(config.operation === 'add' || config.operation === 'modify') && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Entry Data (JSON)</label>
          <textarea
            value={(config.entryData as string) || ''}
            onChange={(e) => update('entryData', e.target.value)}
            placeholder='{"cn": "John Doe", "mail": "john@example.com"}'
            rows={4}
            className={`w-full px-3 py-2 border rounded font-mono text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
          />
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Timeout (ms)</label>
        <input
          type="number"
          value={(config.timeout as number) || 5000}
          onChange={(e) => update('timeout', parseInt(e.target.value))}
          min={1000}
          max={60000}
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
        />
      </div>

      <div className="mb-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={(config.tls as boolean) || false}
            onChange={(e) => update('tls', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Enable TLS/SSL</span>
        </label>
      </div>

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
    </div>
  );
}
