/**
 * Greenhouse Node Configuration
 */

import React, { useState } from 'react';

interface GreenhouseConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const Greenhouse: React.FC<GreenhouseConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'getEmployees');
  return (
    <div className="space-y-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
        <select value={operation} onChange={(e) => { setOperation(e.target.value); onChange({ ...config, operation: e.target.value }); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500">
          <option value="getEmployees">Get Employees</option>
          <option value="createEmployee">Create Employee</option>
          <option value="updateEmployee">Update Employee</option>
        </select>
      </div>
      <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3">
        <p className="text-sm text-emerald-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-emerald-700">Requires Greenhouse API credentials.</p>
      </div>
    </div>
  );
};
