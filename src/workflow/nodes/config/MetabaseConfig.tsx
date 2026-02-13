/**
 * Metabase Node Configuration
 * Business intelligence and analytics platform
 */

import React, { useState } from 'react';

interface MetabaseConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const MetabaseConfig: React.FC<MetabaseConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'executeQuery');
  const [url, setUrl] = useState(config.url as string || '');
  const [token, setToken] = useState(config.token as string || '');
  const [questionId, setQuestionId] = useState(config.questionId as string || '');
  const [dashboardId, setDashboardId] = useState(config.dashboardId as string || '');
  const [parameters, setParameters] = useState(config.parameters as string || '');
  const [format, setFormat] = useState(config.format as string || 'json');

  const handleOperationChange = (value: string) => {
    setOperation(value);
    onChange({ ...config, operation: value });
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    onChange({ ...config, url: value });
  };

  const handleTokenChange = (value: string) => {
    setToken(value);
    onChange({ ...config, token: value });
  };

  const handleQuestionIdChange = (value: string) => {
    setQuestionId(value);
    onChange({ ...config, questionId: value });
  };

  const handleDashboardIdChange = (value: string) => {
    setDashboardId(value);
    onChange({ ...config, dashboardId: value });
  };

  const handleParametersChange = (value: string) => {
    setParameters(value);
    onChange({ ...config, parameters: value });
  };

  const handleFormatChange = (value: string) => {
    setFormat(value);
    onChange({ ...config, format: value });
  };

  const loadExample = () => {
    setOperation('executeQuery');
    setUrl('https://metabase.company.com');
    setQuestionId('123');
    setParameters(JSON.stringify({
      date_range: 'last-30-days',
      user_segment: 'active'
    }, null, 2));
    onChange({
      ...config,
      operation: 'executeQuery',
      url: 'https://metabase.company.com',
      questionId: '123',
      parameters: {
        date_range: 'last-30-days',
        user_segment: 'active'
      },
      format: 'json'
    });
  };

  return (
    <div className="space-y-4">
      <div className="font-semibold text-lg mb-4">Metabase Configuration</div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
        >
          <option value="executeQuery">Execute Question</option>
          <option value="getDashboard">Get Dashboard</option>
          <option value="listQuestions">List Questions</option>
          <option value="listDashboards">List Dashboards</option>
          <option value="createCard">Create Card</option>
          <option value="exportData">Export Data</option>
          <option value="getCollections">Get Collections</option>
          <option value="runNativeQuery">Run Native Query</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Metabase URL
        </label>
        <input
          type="text"
          value={url}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder="https://metabase.company.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600 font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          Your Metabase instance URL
        </p>
      </div>

      {(operation === 'executeQuery' || operation === 'exportData') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Question ID
          </label>
          <input
            type="text"
            value={questionId}
            onChange={(e) => handleQuestionIdChange(e.target.value)}
            placeholder="123"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
          />
          <p className="text-xs text-gray-500 mt-1">
            The ID of the saved question to execute
          </p>
        </div>
      )}

      {operation === 'getDashboard' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dashboard ID
          </label>
          <input
            type="text"
            value={dashboardId}
            onChange={(e) => handleDashboardIdChange(e.target.value)}
            placeholder="456"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
          />
          <p className="text-xs text-gray-500 mt-1">
            The ID of the dashboard to retrieve
          </p>
        </div>
      )}

      {(operation === 'executeQuery' || operation === 'getDashboard' || operation === 'runNativeQuery') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Parameters (JSON)
          </label>
          <textarea
            value={parameters}
            onChange={(e) => handleParametersChange(e.target.value)}
            placeholder='{"date_range": "last-30-days", "user_id": 123}'
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600 font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Optional parameters to pass to the query
          </p>
        </div>
      )}

      {operation === 'exportData' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Export Format
          </label>
          <select
            value={format}
            onChange={(e) => handleFormatChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
          >
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
            <option value="xlsx">Excel (XLSX)</option>
          </select>
        </div>
      )}

      <button
        onClick={loadExample}
        className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
      >
        Load Example Configuration
      </button>

      <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
        <p className="text-sm text-orange-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-orange-700">
          Requires API token or session token. Configure in Credentials Manager.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600 space-y-1">
          <div><strong>Features:</strong> Business intelligence, data visualization, SQL queries</div>
          <div><strong>Question Types:</strong> Native queries, GUI queries, saved questions</div>
          <div><strong>Export Formats:</strong> JSON, CSV, Excel</div>
          <div><strong>Documentation:</strong> metabase.com/docs/latest/api-documentation</div>
        </p>
      </div>

      <div className="mt-2 p-3 bg-blue-50 rounded text-sm space-y-2">
        <div><strong>💡 Metabase Tips:</strong></div>
        <div>• Find Question ID in the URL: /question/[ID]</div>
        <div>• Use parameters for dynamic filtering</div>
        <div>• Native queries support SQL with parameters</div>
        <div>• Collections organize questions and dashboards</div>
      </div>
    </div>
  );
};

export default MetabaseConfig;
