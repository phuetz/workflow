/**
 * Klaviyo Node Configuration
 * Email and SMS marketing
 */

import React, { useState } from 'react';

interface KlaviyoConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const KlaviyoConfig: React.FC<KlaviyoConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'addProfile');
  const [email, setEmail] = useState(config.email as string || '');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
        <select value={operation} onChange={(e) => { setOperation(e.target.value); onChange({ ...config, operation: e.target.value }); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500">
          <option value="addProfile">Add Profile</option>
          <option value="updateProfile">Update Profile</option>
          <option value="trackEvent">Track Event</option>
          <option value="addToList">Add to List</option>
        </select>
      </div>
      {(operation === 'addProfile' || operation === 'updateProfile') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); onChange({ ...config, email: e.target.value }); }}
            placeholder="user@example.com" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500" />
        </div>
      )}
      <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
        <p className="text-sm text-purple-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-purple-700">Requires Klaviyo Private API key.</p>
      </div>
    </div>
  );
};
