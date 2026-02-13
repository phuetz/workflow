/**
 * Image Processing Node Configuration
 */

import React, { useState } from 'react';

interface ImageProcessingConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const ImageProcessing: React.FC<ImageProcessingConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'process');
  return (
    <div className="space-y-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
        <select value={operation} onChange={(e) => { setOperation(e.target.value); onChange({ ...config, operation: e.target.value }); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500">
          <option value="process">Process</option>
          <option value="convert">Convert</option>
          <option value="generate">Generate</option>
        </select>
      </div>
      <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
        <p className="text-sm text-purple-900 font-medium mb-1">Configuration</p>
        <p className="text-xs text-purple-700">Image Processing utility for data processing.</p>
      </div>
    </div>
  );
};
