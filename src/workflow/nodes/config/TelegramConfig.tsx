/**
 * Telegram Bot Node Configuration
 * Send messages via Telegram bot
 * AGENT 9: Node Library Expansion - Auto-generated
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface TelegramConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const TelegramConfig: React.FC<TelegramConfigProps> = ({ config, onChange }) => {
  const [botToken, setBotToken] = useState((config.botToken as string) || '');
  const [chatId, setChatId] = useState((config.chatId as string) || '');
  const [message, setMessage] = useState((config.message as string) || '');
  const [parseMode, setParseMode] = useState((config.parseMode as string) || 'Markdown');

  return (
    <div className="telegram-config space-y-4">
      <div className="font-semibold text-lg mb-4">Telegram Bot</div>


      <div>
        <label className="block text-sm font-medium mb-2">Bot Token</label>
        <input
          type="text"
          value={botToken}
          onChange={(e) => {
            setBotToken(e.target.value);
            onChange({ ...config, botToken: e.target.value });
          }}
          placeholder="Your Telegram bot token"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        <p className="text-xs text-gray-500 mt-1">Get from @BotFather</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Chat ID</label>
        <input
          type="text"
          value={chatId}
          onChange={(e) => {
            setChatId(e.target.value);
            onChange({ ...config, chatId: e.target.value });
          }}
          placeholder="Chat or channel ID"
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
          rows={4}
          placeholder="Message to send..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Parse Mode</label>
        <select
          value={parseMode}
          onChange={(e) => {
            setParseMode(e.target.value);
            onChange({ ...config, parseMode: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="Markdown">Markdown</option>
          <option value="HTML">HTML</option>
          <option value="none">Plain Text</option>
        </select>
        
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
        <strong>📝 Note:</strong> Configure Telegram Bot integration settings above.
      </div>
    </div>
  );
};
