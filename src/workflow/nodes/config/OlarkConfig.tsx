/**
 * Olark Node Configuration
 */

import React, { useState } from 'react';

interface OlarkConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const Olark: React.FC<OlarkConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'createTicket');
  return (
    <div className="space-y-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
        <select value={operation} onChange={(e) => { setOperation(e.target.value); onChange({ ...config, operation: e.target.value }); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500">
          <option value="createTicket">Create Ticket</option>
          <option value="updateTicket">Update Ticket</option>
          <option value="getTickets">Get Tickets</option>
        </select>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
        <p className="text-sm text-amber-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-amber-700">Requires Olark API credentials.</p>
      </div>
    </div>
  );
};
