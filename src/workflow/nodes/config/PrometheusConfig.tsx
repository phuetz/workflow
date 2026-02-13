/**
 * Prometheus Node Configuration
 * Monitoring and alerting toolkit
 */

import React, { useState } from 'react';

interface PrometheusConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const PrometheusConfig: React.FC<PrometheusConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'query');
  const [query, setQuery] = useState(config.query as string || '');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
        <select value={operation} onChange={(e) => { setOperation(e.target.value); onChange({ ...config, operation: e.target.value }); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500">
          <option value="query">Query Metrics</option>
          <option value="queryRange">Query Range</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">PromQL Query</label>
        <textarea value={query} onChange={(e) => { setQuery(e.target.value); onChange({ ...config, query: e.target.value }); }}
          placeholder="rate(http_requests_total[5m])" rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 font-mono text-sm" />
      </div>
      <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
        <p className="text-sm text-orange-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-orange-700">Requires Prometheus server URL.</p>
      </div>
    </div>
  );
};
