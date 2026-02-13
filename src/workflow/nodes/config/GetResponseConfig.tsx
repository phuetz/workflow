/**
 * GetResponse Node Configuration - Email marketing
 */

import React, { useState } from 'react';

interface GetResponseConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const GetResponseConfig: React.FC<GetResponseConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'addContact');
  return (
    <div className="space-y-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
        <select value={operation} onChange={(e) => { setOperation(e.target.value); onChange({ ...config, operation: e.target.value }); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600">
          <option value="addContact">Add Contact</option>
          <option value="updateContact">Update Contact</option>
          <option value="getContacts">Get Contacts</option>
        </select>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm text-blue-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-blue-700">Requires GetResponse API key.</p>
      </div>
    </div>
  );
};
