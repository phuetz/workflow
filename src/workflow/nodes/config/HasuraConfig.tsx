import React from 'react';
import { useWorkflowStore } from '../../../store/workflowStore';

interface Props {
  node: {
    id: string;
    data: {
      config?: Record<string, unknown>;
    };
  };
}

export default function HasuraConfig({ node }: Props) {
  const { updateNode, darkMode } = useWorkflowStore();
  const config = (node.data.config || {}) as Record<string, string>;

  const update = (field: string, value: string) => {
    updateNode(node.id, { config: { ...config, [field]: value } });
  };

  return (
    <div style={{ width: 320, padding: 16 }}>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Operation</label>
        <select
          value={config.operation || 'query'}
          onChange={(e) => update('operation', e.target.value)}
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
        >
          <option value="query">Query</option>
          <option value="mutation">Mutation</option>
          <option value="subscription">Subscription</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Hasura Endpoint</label>
        <input
          type="text"
          value={config.endpoint || ''}
          onChange={(e) => update('endpoint', e.target.value)}
          placeholder="https://your-hasura.hasura.app/v1/graphql"
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Admin Secret</label>
        <input
          type="password"
          value={config.adminSecret || ''}
          onChange={(e) => update('adminSecret', e.target.value)}
          placeholder="Enter Hasura admin secret"
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">GraphQL Query/Mutation</label>
        <textarea
          value={config.graphqlQuery || ''}
          onChange={(e) => update('graphqlQuery', e.target.value)}
          placeholder={`query {
  users {
    id
    name
    email
  }
}`}
          rows={8}
          className={`w-full px-3 py-2 border rounded font-mono text-sm ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Variables (JSON)</label>
        <textarea
          value={config.variables || ''}
          onChange={(e) => update('variables', e.target.value)}
          placeholder='{"userId": "{{ $json.id }}"}'
          rows={3}
          className={`w-full px-3 py-2 border rounded font-mono text-sm ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Role (Optional)</label>
        <input
          type="text"
          value={config.role || ''}
          onChange={(e) => update('role', e.target.value)}
          placeholder="user, admin, etc."
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
        />
      </div>

      <div className="text-xs text-gray-500 mt-4">
        <p><strong>Tip:</strong> Use expressions like {'{{ $json.field }}'} for dynamic variables.</p>
      </div>
    </div>
  );
}
