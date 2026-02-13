/**
 * XML Parser Node Configuration
 * Parse and generate XML documents
 * AGENT 9: Node Library Expansion - Auto-generated
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface XMLParserConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const XMLParserConfig: React.FC<XMLParserConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState((config.operation as string) || 'parse');
  const [rootElement, setRootElement] = useState((config.rootElement as string) || 'root');
  const [preserveAttributes, setPreserveAttributes] = useState((config.preserveAttributes as string) || 'true');

  return (
    <div className="xmlparser-config space-y-4">
      <div className="font-semibold text-lg mb-4">XML Parser</div>


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
          <option value="parse">Parse XML to JSON</option>
          <option value="generate">Generate XML from JSON</option>
        </select>
        
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Root Element</label>
        <input
          type="text"
          value={rootElement}
          onChange={(e) => {
            setRootElement(e.target.value);
            onChange({ ...config, rootElement: e.target.value });
          }}
          placeholder="root"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Preserve Attributes</label>
        <select
          value={preserveAttributes}
          onChange={(e) => {
            setPreserveAttributes(e.target.value);
            onChange({ ...config, preserveAttributes: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
        
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
        <strong>📝 Note:</strong> Configure XML Parser integration settings above.
      </div>
    </div>
  );
};
