/**
 * Google Sheets Node Configuration
 * Read and write Google Sheets data
 * AGENT 9: Node Library Expansion
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface GoogleSheetsConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

interface GoogleSheetsNodeConfig {
  serviceAccountJson?: string;
  operation?: string;
  spreadsheetId?: string;
  range?: string;
}

export const GoogleSheetsConfig: React.FC<GoogleSheetsConfigProps> = ({ config, onChange }) => {
  const typedConfig = config as GoogleSheetsNodeConfig;

  const [serviceAccountJson, setServiceAccountJson] = useState(typedConfig.serviceAccountJson || '');
  const [operation, setOperation] = useState(typedConfig.operation || 'append');
  const [spreadsheetId, setSpreadsheetId] = useState(typedConfig.spreadsheetId || '');
  const [range, setRange] = useState(typedConfig.range || 'Sheet1!A1:Z');

  return (
    <div className="googlesheets-config space-y-4">
      <div className="font-semibold text-lg mb-4">Google Sheets</div>

      <div className="p-3 bg-blue-50 rounded text-sm mb-4">
        <strong>🔐 Authentication</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Service Account JSON</label>
        <textarea
          value={serviceAccountJson}
          onChange={(e) => {
            setServiceAccountJson(e.target.value);
            onChange({ ...config, serviceAccountJson: e.target.value });
          }}
          placeholder='{ "type": "service_account", ... }'
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          rows={4}
        />

      </div>


      <div className="p-3 bg-green-50 rounded text-sm mb-4 mt-6">
        <strong>⚙️ Configuration</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Operation</label>
        <select
          value={operation}
          onChange={(e) => {
            setOperation(e.target.value);
            onChange({ ...config, operation: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="append">Append Rows</option>
          <option value="read">Read Rows</option>
          <option value="update">Update Rows</option>
          <option value="clear">Clear Rows</option>
        </select>
        
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Spreadsheet ID</label>
        <input
          type="text"
          value={spreadsheetId}
          onChange={(e) => {
            setSpreadsheetId(e.target.value);
            onChange({ ...config, spreadsheetId: e.target.value });
          }}
          placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Range</label>
        <input
          type="text"
          value={range}
          onChange={(e) => {
            setRange(e.target.value);
            onChange({ ...config, range: e.target.value });
          }}
          placeholder="Sheet1!A1:Z"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        
      </div>

      <div className="mt-4 p-3 bg-yellow-50 rounded text-sm">
        <strong>📝 Note:</strong> Read and write Google Sheets data. Configure your credentials above.
      </div>
    </div>
  );
};
