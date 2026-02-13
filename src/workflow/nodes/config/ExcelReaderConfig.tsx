/**
 * Excel Reader Node Configuration
 */

import React, { useState } from 'react';

interface ExcelReaderConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const ExcelReader: React.FC<ExcelReaderConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'process');
  return (
    <div className="space-y-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
        <select value={operation} onChange={(e) => { setOperation(e.target.value); onChange({ ...config, operation: e.target.value }); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500">
          <option value="process">Process</option>
          <option value="convert">Convert</option>
          <option value="generate">Generate</option>
        </select>
      </div>
      <div className="bg-green-50 border border-green-200 rounded-md p-3">
        <p className="text-sm text-green-900 font-medium mb-1">Configuration</p>
        <p className="text-xs text-green-700">Excel Reader utility for data processing.</p>
      </div>
    </div>
  );
};
