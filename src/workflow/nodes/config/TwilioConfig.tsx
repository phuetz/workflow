/**
 * Twilio Node Configuration
 * PROJET SAUVÉ - Phase 6: Communication
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface TwilioConfigType extends NodeConfig {
  operation?: string;
  to?: string;
  body?: string;
}

export const TwilioConfig: React.FC<{ config: NodeConfig; onChange: (config: NodeConfig) => void }> = ({ config, onChange }) => {
  const twilioConfig = config as TwilioConfigType;
  const [operation, setOperation] = useState(twilioConfig.operation || 'sendSMS');
  const [to, setTo] = useState(twilioConfig.to || '');
  const [body, setBody] = useState(twilioConfig.body || '');

  return (
    <div className="twilio-config space-y-4">
      <div className="font-semibold text-lg">Twilio Configuration</div>

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
          <option value="sendSMS">Send SMS</option>
          <option value="makeCall">Make Voice Call</option>
          <option value="sendWhatsApp">Send WhatsApp</option>
        </select>
      </div>

      <div className="space-y-3 p-3 bg-gray-50 rounded">
        <div>
          <label className="block text-sm font-medium mb-1">To Number</label>
          <input
            type="text"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              onChange({ ...config, to: e.target.value });
            }}
            placeholder="+1234567890"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Message</label>
          <textarea
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              onChange({ ...config, body: e.target.value });
            }}
            className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      <div className="p-3 bg-blue-50 rounded text-sm">
        <strong>💡 Twilio:</strong> Requires Account SID, Auth Token, and configured from number.
      </div>
    </div>
  );
};

export default TwilioConfig;
