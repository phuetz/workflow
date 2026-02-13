/**
 * WhatsApp Business Node Configuration
 * Send WhatsApp messages via Business API
 * AGENT 9: Node Library Expansion - Auto-generated
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface WhatsAppConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const WhatsAppConfig: React.FC<WhatsAppConfigProps> = ({ config, onChange }) => {
  const [phoneNumberId, setPhoneNumberId] = useState((config.phoneNumberId as string) || '');
  const [accessToken, setAccessToken] = useState((config.accessToken as string) || '');
  const [to, setTo] = useState((config.to as string) || '');
  const [message, setMessage] = useState((config.message as string) || '');

  return (
    <div className="whatsapp-config space-y-4">
      <div className="font-semibold text-lg mb-4">WhatsApp Business</div>


      <div>
        <label className="block text-sm font-medium mb-2">Phone Number ID</label>
        <input
          type="text"
          value={phoneNumberId}
          onChange={(e) => {
            setPhoneNumberId(e.target.value);
            onChange({ ...config, phoneNumberId: e.target.value });
          }}
          placeholder="WhatsApp Business phone number ID"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Access Token</label>
        <input
          type="text"
          value={accessToken}
          onChange={(e) => {
            setAccessToken(e.target.value);
            onChange({ ...config, accessToken: e.target.value });
          }}
          placeholder="Meta/Facebook access token"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Recipient</label>
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
        <label className="block text-sm font-medium mb-2">Message</label>
        <textarea
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            onChange({ ...config, message: e.target.value });
          }}
          rows={3}
          placeholder="Message text..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
        <strong>📝 Note:</strong> Configure WhatsApp Business integration settings above.
      </div>
    </div>
  );
};
