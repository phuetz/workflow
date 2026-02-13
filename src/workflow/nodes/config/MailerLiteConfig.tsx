/**
 * MailerLite Node Configuration - Email marketing
 */

import React, { useState } from 'react';

interface MailerLiteConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const MailerLiteConfig: React.FC<MailerLiteConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'addSubscriber');
  return (
    <div className="space-y-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
        <select value={operation} onChange={(e) => { setOperation(e.target.value); onChange({ ...config, operation: e.target.value }); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500">
          <option value="addSubscriber">Add Subscriber</option>
          <option value="updateSubscriber">Update Subscriber</option>
          <option value="getCampaigns">Get Campaigns</option>
        </select>
      </div>
      <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3">
        <p className="text-sm text-emerald-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-emerald-700">Requires MailerLite API key.</p>
      </div>
    </div>
  );
};
