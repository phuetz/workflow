/**
 * ETL Pipeline Node Configuration
 * Extract, Transform, Load data pipeline
 * AGENT 9: Node Library Expansion - Auto-generated
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface ETLConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const ETLConfig: React.FC<ETLConfigProps> = ({ config, onChange }) => {
  const [source, setSource] = useState((config.source as string) || 'database');
  const [transformations, setTransformations] = useState((config.transformations as string) || '');
  const [destination, setDestination] = useState((config.destination as string) || '');

  return (
    <div className="etl-config space-y-4">
      <div className="font-semibold text-lg mb-4">ETL Pipeline</div>


      <div>
        <label className="block text-sm font-medium mb-2">Data Source</label>
        <select
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
            onChange({ ...config, source: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="database">Database</option>
          <option value="api">API</option>
          <option value="file">File</option>
          <option value="custom">Custom</option>
        </select>
        
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Transformations</label>
        <textarea
          value={transformations}
          onChange={(e) => {
            setTransformations(e.target.value);
            onChange({ ...config, transformations: e.target.value });
          }}
          rows={6}
          placeholder="JSON transformation rules..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Destination</label>
        <input
          type="text"
          value={destination}
          onChange={(e) => {
            setDestination(e.target.value);
            onChange({ ...config, destination: e.target.value });
          }}
          placeholder="Output destination"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
        <strong>📝 Note:</strong> Configure ETL Pipeline integration settings above.
      </div>
    </div>
  );
};
