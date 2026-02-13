/**
 * Tawk.to Node Configuration
 */

import React, { useState } from 'react';

interface TawkToConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const TawkTo: React.FC<TawkToConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'createTicket');
  return (
    <div className="space-y-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
        <select value={operation} onChange={(e) => { setOperation(e.target.value); onChange({ ...config, operation: e.target.value }); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500">
          <option value="createTicket">Create Ticket</option>
          <option value="updateTicket">Update Ticket</option>
          <option value="getTickets">Get Tickets</option>
        </select>
      </div>
      <div className="bg-green-50 border border-green-200 rounded-md p-3">
        <p className="text-sm text-green-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-green-700">Requires Tawk.to API credentials.</p>
      </div>
    </div>
  );
};
