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

const STRAPI_RESOURCES = [
  'entries',
  'content-types',
  'users',
  'media',
  'roles',
  'permissions',
  'webhooks',
  'api-tokens',
];

const STRAPI_OPERATIONS = [
  { value: 'findMany', label: 'Find Many' },
  { value: 'findOne', label: 'Find One' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'count', label: 'Count' },
];

export default function StrapiConfig({ node }: Props) {
  const { updateNode, darkMode } = useWorkflowStore();
  const config = (node.data.config || {}) as Record<string, string | number | boolean>;

  const update = (field: string, value: string | number | boolean) => {
    updateNode(node.id, { config: { ...config, [field]: value } });
  };

  const inputClass = `w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`;
  const labelClass = 'block text-sm font-medium mb-1';

  return (
    <div style={{ width: 360, padding: 16 }}>
      <h3 className="text-lg font-semibold mb-4">Strapi Configuration</h3>

      {/* API URL */}
      <div className="mb-4">
        <label className={labelClass}>Strapi API URL</label>
        <input
          type="text"
          value={(config.apiUrl as string) || ''}
          onChange={(e) => update('apiUrl', e.target.value)}
          placeholder="https://your-strapi.com/api"
          className={inputClass}
        />
        <p className="text-xs text-gray-500 mt-1">Base URL of your Strapi API</p>
      </div>

      {/* API Token */}
      <div className="mb-4">
        <label className={labelClass}>API Token</label>
        <input
          type="password"
          value={(config.apiToken as string) || ''}
          onChange={(e) => update('apiToken', e.target.value)}
          placeholder="Your Strapi API token"
          className={inputClass}
        />
        <p className="text-xs text-gray-500 mt-1">Full Access or custom API token from Strapi</p>
      </div>

      {/* Resource Type */}
      <div className="mb-4">
        <label className={labelClass}>Resource</label>
        <select
          value={(config.resource as string) || 'entries'}
          onChange={(e) => update('resource', e.target.value)}
          className={inputClass}
        >
          {STRAPI_RESOURCES.map((resource) => (
            <option key={resource} value={resource}>
              {resource.charAt(0).toUpperCase() + resource.slice(1).replace(/-/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Content Type (for entries) */}
      {(config.resource === 'entries' || !config.resource) && (
        <div className="mb-4">
          <label className={labelClass}>Content Type</label>
          <input
            type="text"
            value={(config.contentType as string) || ''}
            onChange={(e) => update('contentType', e.target.value)}
            placeholder="e.g., articles, products, users"
            className={inputClass}
          />
          <p className="text-xs text-gray-500 mt-1">Plural API ID of the content type</p>
        </div>
      )}

      {/* Operation */}
      <div className="mb-4">
        <label className={labelClass}>Operation</label>
        <select
          value={(config.operation as string) || 'findMany'}
          onChange={(e) => update('operation', e.target.value)}
          className={inputClass}
        >
          {STRAPI_OPERATIONS.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>
      </div>

      {/* Entry ID (for findOne, update, delete) */}
      {['findOne', 'update', 'delete'].includes(config.operation as string) && (
        <div className="mb-4">
          <label className={labelClass}>Entry ID</label>
          <input
            type="text"
            value={(config.entryId as string) || ''}
            onChange={(e) => update('entryId', e.target.value)}
            placeholder="Entry ID or expression"
            className={inputClass}
          />
          <p className="text-xs text-gray-500 mt-1">Use {'{{ $json.id }}'} to reference data from previous nodes</p>
        </div>
      )}

      {/* Filters (for findMany) */}
      {(config.operation === 'findMany' || !config.operation) && (
        <>
          <div className="mb-4">
            <label className={labelClass}>Filters (JSON)</label>
            <textarea
              value={(config.filters as string) || ''}
              onChange={(e) => update('filters', e.target.value)}
              placeholder='{"status": {"$eq": "published"}}'
              rows={3}
              className={inputClass}
            />
            <p className="text-xs text-gray-500 mt-1">Strapi filter syntax in JSON format</p>
          </div>

          <div className="mb-4">
            <label className={labelClass}>Sort</label>
            <input
              type="text"
              value={(config.sort as string) || ''}
              onChange={(e) => update('sort', e.target.value)}
              placeholder="createdAt:desc"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelClass}>Page</label>
              <input
                type="number"
                value={(config.page as number) || 1}
                onChange={(e) => update('page', parseInt(e.target.value) || 1)}
                min={1}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Page Size</label>
              <input
                type="number"
                value={(config.pageSize as number) || 25}
                onChange={(e) => update('pageSize', parseInt(e.target.value) || 25)}
                min={1}
                max={100}
                className={inputClass}
              />
            </div>
          </div>
        </>
      )}

      {/* Data (for create, update) */}
      {['create', 'update'].includes(config.operation as string) && (
        <div className="mb-4">
          <label className={labelClass}>Data (JSON)</label>
          <textarea
            value={(config.data as string) || ''}
            onChange={(e) => update('data', e.target.value)}
            placeholder='{"title": "New Article", "content": "..."}'
            rows={5}
            className={inputClass}
          />
          <p className="text-xs text-gray-500 mt-1">Data to create or update. Use expressions like {'{{ $json.fieldName }}'}</p>
        </div>
      )}

      {/* Populate relations */}
      <div className="mb-4">
        <label className={labelClass}>Populate Relations</label>
        <input
          type="text"
          value={(config.populate as string) || ''}
          onChange={(e) => update('populate', e.target.value)}
          placeholder="*,author,categories.parent"
          className={inputClass}
        />
        <p className="text-xs text-gray-500 mt-1">Use * for all, or comma-separated relation names</p>
      </div>

      {/* Fields selection */}
      <div className="mb-4">
        <label className={labelClass}>Fields</label>
        <input
          type="text"
          value={(config.fields as string) || ''}
          onChange={(e) => update('fields', e.target.value)}
          placeholder="title,content,publishedAt"
          className={inputClass}
        />
        <p className="text-xs text-gray-500 mt-1">Leave empty for all fields</p>
      </div>

      {/* Include Draft */}
      <div className="mb-4 flex items-center">
        <input
          type="checkbox"
          id="includeDraft"
          checked={(config.includeDraft as boolean) || false}
          onChange={(e) => update('includeDraft', e.target.checked)}
          className="mr-2"
        />
        <label htmlFor="includeDraft" className="text-sm">Include draft entries</label>
      </div>
    </div>
  );
}
