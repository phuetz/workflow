/**
 * Google BigQuery Node Configuration
 * Data warehouse and analytics service
 */

import React, { useState } from 'react';

interface BigQueryConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const BigQueryConfig: React.FC<BigQueryConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'query');
  const [projectId, setProjectId] = useState(config.projectId as string || '');
  const [datasetId, setDatasetId] = useState(config.datasetId as string || '');
  const [tableId, setTableId] = useState(config.tableId as string || '');
  const [query, setQuery] = useState(config.query as string || '');
  const [useLegacySql, setUseLegacySql] = useState(config.useLegacySql as boolean || false);
  const [maxResults, setMaxResults] = useState(config.maxResults as number || 1000);

  const handleChange = (updates: Record<string, unknown>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => {
            setOperation(e.target.value);
            handleChange({ operation: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
        >
          <option value="query">Run Query</option>
          <option value="insert">Insert Rows</option>
          <option value="getRows">Get Rows</option>
          <option value="createTable">Create Table</option>
          <option value="deleteTable">Delete Table</option>
          <option value="createDataset">Create Dataset</option>
          <option value="deleteDataset">Delete Dataset</option>
          <option value="listDatasets">List Datasets</option>
          <option value="listTables">List Tables</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Project ID <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={projectId}
          onChange={(e) => {
            setProjectId(e.target.value);
            handleChange({ projectId: e.target.value });
          }}
          placeholder="my-gcp-project"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Google Cloud Project ID
        </p>
      </div>

      {(operation !== 'listDatasets' && operation !== 'createDataset') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dataset ID {(operation !== 'query') && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            value={datasetId}
            onChange={(e) => {
              setDatasetId(e.target.value);
              handleChange({ datasetId: e.target.value });
            }}
            placeholder="my_dataset"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {(operation === 'insert' || operation === 'getRows' || operation === 'createTable' || operation === 'deleteTable') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Table ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={tableId}
            onChange={(e) => {
              setTableId(e.target.value);
              handleChange({ tableId: e.target.value });
            }}
            placeholder="my_table"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {operation === 'query' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SQL Query <span className="text-red-500">*</span>
            </label>
            <textarea
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                handleChange({ query: e.target.value });
              }}
              placeholder="SELECT * FROM `project.dataset.table` WHERE date > '2024-01-01' LIMIT 100"
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Standard SQL query. Can use expressions: {`{{ $json.query }}`}
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="useLegacySql"
                checked={useLegacySql}
                onChange={(e) => {
                  setUseLegacySql(e.target.checked);
                  handleChange({ useLegacySql: e.target.checked });
                }}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="useLegacySql" className="ml-2 block text-sm text-gray-700">
                Use Legacy SQL
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Results
            </label>
            <input
              type="number"
              value={maxResults}
              onChange={(e) => {
                setMaxResults(parseInt(e.target.value) || 1000);
                handleChange({ maxResults: parseInt(e.target.value) || 1000 });
              }}
              min="1"
              max="100000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum number of rows to return (1-100,000)
            </p>
          </div>
        </>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm text-blue-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-blue-700">
          Requires Google Cloud Service Account JSON key with BigQuery permissions.
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-md p-3">
        <p className="text-sm text-green-900 font-medium mb-1">Features</p>
        <ul className="text-xs text-green-700 space-y-1">
          <li>• Serverless, fully managed analytics</li>
          <li>• Petabyte-scale queries in seconds</li>
          <li>• Real-time analytics and streaming inserts</li>
          <li>• Machine learning with BigQuery ML</li>
          <li>• Federated queries (Cloud Storage, Sheets, etc.)</li>
        </ul>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
        <p className="text-sm text-yellow-900 font-medium mb-1">Cost Note</p>
        <p className="text-xs text-yellow-700">
          BigQuery charges for data processed. Use LIMIT clauses and partitioned tables to control costs.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600 space-y-1">
          <div><strong>Service:</strong> Google BigQuery</div>
          <div><strong>Max Query Size:</strong> 256 MB</div>
          <div><strong>Documentation:</strong> cloud.google.com/bigquery/docs</div>
        </p>
      </div>
    </div>
  );
};
