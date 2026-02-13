/**
 * Discord Node Configuration
 * PROJET SAUVÉ - Phase 6: Top 20 Integrations
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface DiscordConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

type DiscordOperation =
  | 'sendMessage'
  | 'sendWebhook'
  | 'sendEmbed'
  | 'addReaction'
  | 'getServerInfo'
  | 'getChannels'
  | 'sendDM'
  | 'editMessage'
  | 'deleteMessage'
  | 'createChannel';

export const DiscordConfig: React.FC<DiscordConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<DiscordOperation>(
    (config.operation as DiscordOperation) || 'sendMessage'
  );
  const [channelId, setChannelId] = useState((config.channelId as string) || '');
  const [content, setContent] = useState((config.content as string) || '');
  const [useEmbed, setUseEmbed] = useState((config.useEmbed as boolean) || false);
  const [embedTitle, setEmbedTitle] = useState((config.embedTitle as string) || '');
  const [embedDescription, setEmbedDescription] = useState((config.embedDescription as string) || '');
  const [embedColor, setEmbedColor] = useState((config.embedColor as string) || '#5865F2');
  const [embedFields, setEmbedFields] = useState((config.embedFields as string) || '');
  const [messageId, setMessageId] = useState((config.messageId as string) || '');
  const [userId, setUserId] = useState((config.userId as string) || '');
  const [emoji, setEmoji] = useState((config.emoji as string) || '👍');

  const handleOperationChange = (newOperation: DiscordOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const operationDescriptions: Record<DiscordOperation, string> = {
    sendMessage: 'Send a message to a Discord channel',
    sendWebhook: 'Send a message via webhook (no bot required)',
    sendEmbed: 'Send a rich embed message',
    addReaction: 'Add an emoji reaction to a message',
    getServerInfo: 'Get information about a Discord server',
    getChannels: 'Get list of channels in a server',
    sendDM: 'Send a direct message to a user',
    editMessage: 'Edit an existing message',
    deleteMessage: 'Delete a message',
    createChannel: 'Create a new channel in a server',
  };

  const loadEmbedExample = () => {
    setUseEmbed(true);
    setEmbedTitle('🎉 Workflow Notification');
    setEmbedDescription('Your workflow has completed successfully!');
    setEmbedColor('#00FF00');
    setEmbedFields(JSON.stringify([
      { name: 'Status', value: 'Completed', inline: true },
      { name: 'Duration', value: '{{ $json.duration }}ms', inline: true },
      { name: 'Timestamp', value: '{{ $now() }}', inline: false },
    ], null, 2));
  };

  return (
    <div className="discord-config space-y-4">
      <div className="font-semibold text-lg mb-4">Discord Configuration</div>

      <div>
        <label className="block text-sm font-medium mb-2">Operation</label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as DiscordOperation)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="sendMessage">Send Message</option>
          <option value="sendWebhook">Send Webhook</option>
          <option value="sendEmbed">Send Embed</option>
          <option value="addReaction">Add Reaction</option>
          <option value="getServerInfo">Get Server Info</option>
          <option value="getChannels">Get Channels</option>
          <option value="sendDM">Send Direct Message</option>
          <option value="editMessage">Edit Message</option>
          <option value="deleteMessage">Delete Message</option>
          <option value="createChannel">Create Channel</option>
        </select>
        <p className="text-xs text-gray-600 mt-1">
          {operationDescriptions[operation]}
        </p>
      </div>

      {/* Send Message / Webhook / Embed Configuration */}
      {(operation === 'sendMessage' || operation === 'sendWebhook' || operation === 'sendEmbed') && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          {operation !== 'sendWebhook' && (
            <div>
              <label className="block text-sm font-medium mb-1">Channel ID</label>
              <input
                type="text"
                value={channelId}
                onChange={(e) => {
                  setChannelId(e.target.value);
                  onChange({ ...config, channelId: e.target.value });
                }}
                placeholder="1234567890123456789"
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
              />
            </div>
          )}

          <div className="flex items-center">
            <input
              type="checkbox"
              id="useEmbed"
              checked={useEmbed}
              onChange={(e) => {
                setUseEmbed(e.target.checked);
                onChange({ ...config, useEmbed: e.target.checked });
              }}
              className="mr-2"
            />
            <label htmlFor="useEmbed" className="text-sm">
              Use Rich Embed (formatted message)
            </label>
          </div>

          {!useEmbed ? (
            <div>
              <label className="block text-sm font-medium mb-1">Message Content</label>
              <textarea
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  onChange({ ...config, content: e.target.value });
                }}
                placeholder="Your message here... Use {{ expressions }}"
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Embed Title</label>
                <input
                  type="text"
                  value={embedTitle}
                  onChange={(e) => {
                    setEmbedTitle(e.target.value);
                    onChange({ ...config, embedTitle: e.target.value });
                  }}
                  placeholder="Embed Title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={embedDescription}
                  onChange={(e) => {
                    setEmbedDescription(e.target.value);
                    onChange({ ...config, embedDescription: e.target.value });
                  }}
                  placeholder="Embed description..."
                  className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Color (Hex)</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={embedColor}
                    onChange={(e) => {
                      setEmbedColor(e.target.value);
                      onChange({ ...config, embedColor: e.target.value });
                    }}
                    className="w-16 h-10 border border-gray-300 rounded"
                  />
                  <input
                    type="text"
                    value={embedColor}
                    onChange={(e) => {
                      setEmbedColor(e.target.value);
                      onChange({ ...config, embedColor: e.target.value });
                    }}
                    placeholder="#5865F2"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Fields (JSON Array)</label>
                <textarea
                  value={embedFields}
                  onChange={(e) => {
                    setEmbedFields(e.target.value);
                    onChange({ ...config, embedFields: e.target.value });
                  }}
                  placeholder='[{"name": "Field", "value": "Value", "inline": true}]'
                  className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md font-mono text-xs"
                />
              </div>

              <button
                onClick={loadEmbedExample}
                className="w-full px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
              >
                📝 Load Example Embed
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add Reaction Configuration */}
      {operation === 'addReaction' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium mb-1">Channel ID</label>
            <input
              type="text"
              value={channelId}
              onChange={(e) => {
                setChannelId(e.target.value);
                onChange({ ...config, channelId: e.target.value });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Message ID</label>
            <input
              type="text"
              value={messageId}
              onChange={(e) => {
                setMessageId(e.target.value);
                onChange({ ...config, messageId: e.target.value });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Emoji</label>
            <input
              type="text"
              value={emoji}
              onChange={(e) => {
                setEmoji(e.target.value);
                onChange({ ...config, emoji: e.target.value });
              }}
              placeholder="👍 or custom:emoji_id"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      )}

      {/* Send DM Configuration */}
      {operation === 'sendDM' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium mb-1">User ID</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
                onChange({ ...config, userId: e.target.value });
              }}
              placeholder="1234567890123456789"
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                onChange({ ...config, content: e.target.value });
              }}
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm space-y-2">
        <div><strong>💡 Discord Tips:</strong></div>
        <div>• Enable Developer Mode to copy IDs (User Settings → Advanced)</div>
        <div>• Webhook URLs: Create in channel settings → Integrations</div>
        <div>• Embeds: Use hex colors like <code className="bg-white px-1 rounded">#5865F2</code></div>
        <div>• Expressions: <code className="bg-white px-1 rounded">{'{{ $json.field }}'}</code></div>
      </div>

      <div className="mt-2 p-3 bg-yellow-50 rounded text-sm">
        <strong>🔐 Authentication:</strong> Bot Token required. Get it from Discord Developer Portal → Bot → Token.
      </div>
    </div>
  );
};

export default DiscordConfig;
