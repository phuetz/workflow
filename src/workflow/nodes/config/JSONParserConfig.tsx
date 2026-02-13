/**
 * JSON Parser Node Configuration
 * Parse and manipulate JSON data
 * AGENT 9: Node Library Expansion - Auto-generated
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface JSONParserConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const JSONParserConfig: React.FC<JSONParserConfigProps> = ({ config, onChange }) => {
  const [inputPath, setInputPath] = useState((config.inputPath as string) || '$');
  const [operation, setOperation] = useState((config.operation as string) || 'parse');
  const [outputFormat, setOutputFormat] = useState((config.outputFormat as string) || 'object');

  return (
    <div className="jsonparser-config space-y-4">
      <div className="font-semibold text-lg mb-4">JSON Parser</div>


      <div>
        <label className="block text-sm font-medium mb-2">Input JSON Path</label>
        <input
          type="text"
          value={inputPath}
          onChange={(e) => {
            setInputPath(e.target.value);
            onChange({ ...config, inputPath: e.target.value });
          }}
          placeholder="$.data.items"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        
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
          <option value="parse">Parse JSON String</option>
          <option value="stringify">Stringify to JSON</option>
          <option value="extract">Extract Fields</option>
          <option value="transform">Transform</option>
        </select>
        
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Output Format</label>
        <select
          value={outputFormat}
          onChange={(e) => {
            setOutputFormat(e.target.value);
            onChange({ ...config, outputFormat: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="object">JavaScript Object</option>
          <option value="string">JSON String</option>
          <option value="array">Array</option>
        </select>
        
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
        <strong>📝 Note:</strong> Configure JSON Parser integration settings above.
      </div>
    </div>
  );
};
