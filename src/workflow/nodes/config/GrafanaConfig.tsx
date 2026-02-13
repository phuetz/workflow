/**
 * Grafana Node Configuration
 * Monitoring and observability platform
 */

import React, { useState } from 'react';

interface GrafanaConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const GrafanaConfig: React.FC<GrafanaConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'getDashboard');
  const [url, setUrl] = useState(config.url as string || '');
  const [apiToken, setApiToken] = useState(config.apiToken as string || '');
  const [dashboardUid, setDashboardUid] = useState(config.dashboardUid as string || '');
  const [query, setQuery] = useState(config.query as string || '');
  const [datasource, setDatasource] = useState(config.datasource as string || 'Prometheus');
  const [alertId, setAlertId] = useState(config.alertId as string || '');
  const [folderId, setFolderId] = useState(config.folderId as string || '');
  const [panelId, setPanelId] = useState(config.panelId as string || '');
  const [timeRange, setTimeRange] = useState(config.timeRange as string || 'now-1h');

  const handleOperationChange = (value: string) => {
    setOperation(value);
    onChange({ ...config, operation: value });
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    onChange({ ...config, url: value });
  };

  const handleDashboardUidChange = (value: string) => {
    setDashboardUid(value);
    onChange({ ...config, dashboardUid: value });
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    onChange({ ...config, query: value });
  };

  const handleDatasourceChange = (value: string) => {
    setDatasource(value);
    onChange({ ...config, datasource: value });
  };

  const handleAlertIdChange = (value: string) => {
    setAlertId(value);
    onChange({ ...config, alertId: value });
  };

  const loadExample = () => {
    setOperation('queryData');
    setUrl('https://grafana.company.com');
    setDatasource('Prometheus');
    setQuery('rate(http_requests_total[5m])');
    setTimeRange('now-1h');
    onChange({
      ...config,
      operation: 'queryData',
      url: 'https://grafana.company.com',
      datasource: 'Prometheus',
      query: 'rate(http_requests_total[5m])',
      timeRange: 'now-1h'
    });
  };

  return (
    <div className="space-y-4">
      <div className="font-semibold text-lg mb-4">Grafana Configuration</div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
        >
          <option value="getDashboard">Get Dashboard</option>
          <option value="listDashboards">List Dashboards</option>
          <option value="createDashboard">Create Dashboard</option>
          <option value="queryData">Query Data Source</option>
          <option value="getAlerts">Get Alerts</option>
          <option value="pauseAlert">Pause Alert</option>
          <option value="createAnnotation">Create Annotation</option>
          <option value="getOrganizations">Get Organizations</option>
          <option value="getDataSources">Get Data Sources</option>
          <option value="createFolder">Create Folder</option>
          <option value="renderPanel">Render Panel Image</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Grafana URL
        </label>
        <input
          type="text"
          value={url}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder="https://grafana.company.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600 font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          Your Grafana instance URL
        </p>
      </div>

      {(operation === 'getDashboard' || operation === 'renderPanel') && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dashboard UID
            </label>
            <input
              type="text"
              value={dashboardUid}
              onChange={(e) => handleDashboardUidChange(e.target.value)}
              placeholder="abc123def"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Unique identifier for the dashboard
            </p>
          </div>

          {operation === 'renderPanel' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Panel ID
              </label>
              <input
                type="text"
                value={panelId}
                onChange={(e) => setPanelId(e.target.value)}
                placeholder="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
              />
              <p className="text-xs text-gray-500 mt-1">
                ID of the panel to render as image
              </p>
            </div>
          )}
        </div>
      )}

      {operation === 'queryData' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Source
            </label>
            <select
              value={datasource}
              onChange={(e) => handleDatasourceChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
            >
              <option value="Prometheus">Prometheus</option>
              <option value="Loki">Loki</option>
              <option value="Elasticsearch">Elasticsearch</option>
              <option value="InfluxDB">InfluxDB</option>
              <option value="MySQL">MySQL</option>
              <option value="PostgreSQL">PostgreSQL</option>
              <option value="Graphite">Graphite</option>
              <option value="CloudWatch">CloudWatch</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Query
            </label>
            <textarea
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="rate(http_requests_total[5m])"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Query in the data source's native query language
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time Range
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
            >
              <option value="now-5m">Last 5 minutes</option>
              <option value="now-15m">Last 15 minutes</option>
              <option value="now-1h">Last hour</option>
              <option value="now-6h">Last 6 hours</option>
              <option value="now-24h">Last 24 hours</option>
              <option value="now-7d">Last 7 days</option>
              <option value="now-30d">Last 30 days</option>
            </select>
          </div>
        </div>
      )}

      {(operation === 'getAlerts' || operation === 'pauseAlert') && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          {operation === 'pauseAlert' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alert ID
              </label>
              <input
                type="text"
                value={alertId}
                onChange={(e) => handleAlertIdChange(e.target.value)}
                placeholder="123"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
              />
            </div>
          )}
        </div>
      )}

      {operation === 'createFolder' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Folder Title
            </label>
            <input
              type="text"
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              placeholder="Production Dashboards"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
            />
          </div>
        </div>
      )}

      <button
        onClick={loadExample}
        className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
      >
        Load Example Query
      </button>

      <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
        <p className="text-sm text-orange-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-orange-700">
          Requires API Token or Service Account Token. Configure in Credentials Manager.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600 space-y-1">
          <div><strong>Features:</strong> Dashboards, alerting, data visualization, annotations</div>
          <div><strong>Data Sources:</strong> Prometheus, Loki, InfluxDB, Elasticsearch, CloudWatch</div>
          <div><strong>Rendering:</strong> Export panels as PNG images</div>
          <div><strong>Documentation:</strong> grafana.com/docs/grafana/latest/http_api</div>
        </p>
      </div>

      <div className="mt-2 p-3 bg-blue-50 rounded text-sm space-y-2">
        <div><strong>💡 Grafana Tips:</strong></div>
        <div>• Dashboard UID is in the URL: /d/[UID]/dashboard-name</div>
        <div>• Query syntax depends on data source (PromQL, LogQL, SQL)</div>
        <div>• Use annotations to mark deployments and events</div>
        <div>• Render panel API generates PNG images for reports</div>
      </div>
    </div>
  );
};

export default GrafanaConfig;
