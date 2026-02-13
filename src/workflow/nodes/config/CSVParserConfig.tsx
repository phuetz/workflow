/**
 * CSV Parser Node Configuration
 * Parse and generate CSV files
 * AGENT 9: Node Library Expansion - Auto-generated
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface CSVParserConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const CSVParserConfig: React.FC<CSVParserConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState((config.operation as string) || 'parse');
  const [delimiter, setDelimiter] = useState((config.delimiter as string) || ',');
  const [hasHeaders, setHasHeaders] = useState((config.hasHeaders as string) || 'true');
  const [encoding, setEncoding] = useState((config.encoding as string) || 'utf-8');

  return (
    <div className="csvparser-config space-y-4">
      <div className="font-semibold text-lg mb-4">CSV Parser</div>


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
          <option value="parse">Parse CSV to JSON</option>
          <option value="generate">Generate CSV from JSON</option>
        </select>
        
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Delimiter</label>
        <input
          type="text"
          value={delimiter}
          onChange={(e) => {
            setDelimiter(e.target.value);
            onChange({ ...config, delimiter: e.target.value });
          }}
          placeholder=","
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        <p className="text-xs text-gray-500 mt-1">Character to separate fields</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Has Headers</label>
        <select
          value={hasHeaders}
          onChange={(e) => {
            setHasHeaders(e.target.value);
            onChange({ ...config, hasHeaders: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
        
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Encoding</label>
        <input
          type="text"
          value={encoding}
          onChange={(e) => {
            setEncoding(e.target.value);
            onChange({ ...config, encoding: e.target.value });
          }}
          placeholder="utf-8"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
        <strong>📝 Note:</strong> Configure CSV Parser integration settings above.
      </div>
    </div>
  );
};
