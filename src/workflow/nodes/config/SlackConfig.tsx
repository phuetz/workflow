/**
 * Slack Node Configuration
 * Enhanced complete implementation
 * PROJET SAUVÉ - Phase 6: Top 20 Integrations
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface SlackConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

type SlackOperation =
  | 'sendMessage'
  | 'sendDirectMessage'
  | 'uploadFile'
  | 'getChannels'
  | 'getUserInfo'
  | 'createChannel'
  | 'archiveChannel'
  | 'addReaction'
  | 'updateMessage'
  | 'deleteMessage'
  | 'getConversationHistory'
  | 'inviteToChannel'
  | 'webhook';

export const SlackConfig: React.FC<SlackConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<SlackOperation>(
    (config.operation as SlackOperation) || 'sendMessage'
  );
  const [channel, setChannel] = useState((config.channel as string) || '');
  const [message, setMessage] = useState((config.message as string) || '');
  const [userId, setUserId] = useState((config.userId as string) || '');
  const [useBlocks, setUseBlocks] = useState((config.useBlocks as boolean) || false);
  const [blocks, setBlocks] = useState((config.blocks as string) || '');
  const [threadTs, setThreadTs] = useState((config.threadTs as string) || '');
  const [username, setUsername] = useState((config.username as string) || '');
  const [iconEmoji, setIconEmoji] = useState((config.iconEmoji as string) || ':robot_face:');
  const [timestamp, setTimestamp] = useState((config.timestamp as string) || '');
  const [reaction, setReaction] = useState((config.reaction as string) || '');
  const [channelName, setChannelName] = useState((config.channelName as string) || '');
  const [isPrivate, setIsPrivate] = useState((config.isPrivate as boolean) || false);
  const [filename, setFilename] = useState((config.filename as string) || '');
  const [fileContent, setFileContent] = useState((config.fileContent as string) || '');

  const handleOperationChange = (newOperation: SlackOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleChannelChange = (value: string) => {
    setChannel(value);
    onChange({ ...config, channel: value });
  };

  const handleMessageChange = (value: string) => {
    setMessage(value);
    onChange({ ...config, message: value });
  };

  const handleUserIdChange = (value: string) => {
    setUserId(value);
    onChange({ ...config, userId: value });
  };

  const handleUseBlocksChange = (checked: boolean) => {
    setUseBlocks(checked);
    onChange({ ...config, useBlocks: checked });
  };

  const handleBlocksChange = (value: string) => {
    setBlocks(value);
    onChange({ ...config, blocks: value });
  };

  const operationDescriptions: Record<SlackOperation, string> = {
    sendMessage: 'Send a message to a channel',
    sendDirectMessage: 'Send a direct message to a user',
    uploadFile: 'Upload a file to a channel',
    getChannels: 'Get list of channels',
    getUserInfo: 'Get information about a user',
    createChannel: 'Create a new channel',
    archiveChannel: 'Archive a channel',
    addReaction: 'Add an emoji reaction to a message',
    updateMessage: 'Update an existing message',
    deleteMessage: 'Delete a message',
    getConversationHistory: 'Get message history from a channel',
    inviteToChannel: 'Invite a user to a channel',
    webhook: 'Send message via incoming webhook',
  };

  const loadExample = (example: 'simple' | 'blocks' | 'thread') => {
    switch (example) {
      case 'simple':
        setMessage('Hello from workflow automation! 👋');
        setChannel('#general');
        setUseBlocks(false);
        break;
      case 'blocks':
        setUseBlocks(true);
        setBlocks(JSON.stringify([
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Workflow Notification* :bell:',
            },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: '*Status:*\nCompleted' },
              { type: 'mrkdwn', text: '*Time:*\n{{ $now() }}' },
            ],
          },
          {
            type: 'divider',
          },
        ], null, 2));
        break;
      case 'thread':
        setMessage('This is a reply in a thread');
        setThreadTs('{{ $json.parentMessageTs }}');
        break;
    }
  };

  return (
    <div className="slack-config space-y-4">
      <div className="font-semibold text-lg mb-4">Slack Configuration</div>

      <div>
        <label className="block text-sm font-medium mb-2">Operation</label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as SlackOperation)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="sendMessage">Send Message</option>
          <option value="sendDirectMessage">Send Direct Message</option>
          <option value="uploadFile">Upload File</option>
          <option value="getChannels">Get Channels</option>
          <option value="getUserInfo">Get User Info</option>
          <option value="createChannel">Create Channel</option>
          <option value="archiveChannel">Archive Channel</option>
          <option value="addReaction">Add Reaction</option>
          <option value="updateMessage">Update Message</option>
          <option value="deleteMessage">Delete Message</option>
          <option value="getConversationHistory">Get History</option>
          <option value="inviteToChannel">Invite to Channel</option>
          <option value="webhook">Webhook (Incoming)</option>
        </select>
        <p className="text-xs text-gray-600 mt-1">
          {operationDescriptions[operation]}
        </p>
      </div>

      {/* Send Message Configuration */}
      {(operation === 'sendMessage' || operation === 'webhook') && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium mb-1">Channel</label>
            <input
              type="text"
              value={channel as string}
              onChange={(e) => handleChannelChange(e.target.value)}
              placeholder="#general or C1234567890"
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
            />
            <p className="text-xs text-gray-600 mt-1">
              Channel name (e.g., #general) or ID
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="useBlocks"
              checked={useBlocks as boolean}
              onChange={(e) => handleUseBlocksChange(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="useBlocks" className="text-sm">
              Use Block Kit (rich formatting)
            </label>
          </div>

          {!useBlocks ? (
            <div>
              <label className="block text-sm font-medium mb-1">Message Text</label>
              <textarea
                value={message as string}
                onChange={(e) => handleMessageChange(e.target.value)}
                placeholder="Your message here... Use {{ expressions }}"
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1">Block Kit JSON</label>
              <textarea
                value={blocks as string}
                onChange={(e) => handleBlocksChange(e.target.value)}
                placeholder='[{"type": "section", "text": {"type": "mrkdwn", "text": "..."}}]'
                className="w-full h-48 px-3 py-2 border border-gray-300 rounded-md font-mono text-xs"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium mb-1">Thread TS (Optional)</label>
              <input
                type="text"
                value={threadTs as string}
                onChange={(e) => setThreadTs(e.target.value)}
                placeholder="1234567890.123456"
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Username (Optional)</label>
              <input
                type="text"
                value={username as string}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Bot Name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Icon Emoji (Optional)</label>
            <input
              type="text"
              value={iconEmoji as string}
              onChange={(e) => setIconEmoji(e.target.value)}
              placeholder=":robot_face:"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => loadExample('simple')}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
            >
              💬 Simple
            </button>
            <button
              onClick={() => loadExample('blocks')}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
            >
              🎨 Blocks
            </button>
            <button
              onClick={() => loadExample('thread')}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
            >
              🧵 Thread
            </button>
          </div>
        </div>
      )}

      {/* Send Direct Message Configuration */}
      {operation === 'sendDirectMessage' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium mb-1">User ID</label>
            <input
              type="text"
              value={userId as string}
              onChange={(e) => handleUserIdChange(e.target.value)}
              placeholder="U1234567890"
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <textarea
              value={message as string}
              onChange={(e) => handleMessageChange(e.target.value)}
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      )}

      {/* Upload File Configuration */}
      {operation === 'uploadFile' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium mb-1">Filename</label>
            <input
              type="text"
              value={filename as string}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="document.pdf"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">File Content (Expression)</label>
            <textarea
              value={fileContent as string}
              onChange={(e) => setFileContent(e.target.value)}
              placeholder="{{ $json.fileData }}"
              className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Channels</label>
            <input
              type="text"
              value={channel as string}
              onChange={(e) => handleChannelChange(e.target.value)}
              placeholder="#general,#uploads"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      )}

      {/* Create Channel Configuration */}
      {operation === 'createChannel' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium mb-1">Channel Name</label>
            <input
              type="text"
              value={channelName as string}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="my-new-channel"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPrivate"
              checked={isPrivate as boolean}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="isPrivate" className="text-sm">
              Create as private channel
            </label>
          </div>
        </div>
      )}

      {/* Add Reaction Configuration */}
      {operation === 'addReaction' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium mb-1">Channel ID</label>
            <input
              type="text"
              value={channel as string}
              onChange={(e) => handleChannelChange(e.target.value)}
              placeholder="C1234567890"
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Message Timestamp</label>
            <input
              type="text"
              value={timestamp as string}
              onChange={(e) => setTimestamp(e.target.value)}
              placeholder="1234567890.123456"
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Reaction (Emoji)</label>
            <input
              type="text"
              value={reaction as string}
              onChange={(e) => setReaction(e.target.value)}
              placeholder="thumbsup or :thumbsup:"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      )}

      {/* Simple Input Operations */}
      {(operation === 'archiveChannel' || operation === 'getUserInfo') && (
        <div className="p-3 bg-gray-50 rounded">
          <label className="block text-sm font-medium mb-1">
            {operation === 'archiveChannel' ? 'Channel ID' : 'User ID'}
          </label>
          <input
            type="text"
            value={(operation === 'archiveChannel' ? channel : userId) as string}
            onChange={(e) =>
              operation === 'archiveChannel'
                ? handleChannelChange(e.target.value)
                : handleUserIdChange(e.target.value)
            }
            placeholder={operation === 'archiveChannel' ? 'C1234567890' : 'U1234567890'}
            className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
          />
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm space-y-2">
        <div><strong>💡 Slack Tips:</strong></div>
        <div>• Use <code className="bg-white px-1 rounded">#channel-name</code> or channel ID</div>
        <div>• Block Kit builder: <a href="https://app.slack.com/block-kit-builder" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">app.slack.com/block-kit-builder</a></div>
        <div>• Expressions: <code className="bg-white px-1 rounded">{'{{ $json.field }}'}</code></div>
        <div>• Thread replies: Use <code className="bg-white px-1 rounded">thread_ts</code> from parent message</div>
      </div>

      <div className="mt-2 p-3 bg-yellow-50 rounded text-sm">
        <strong>🔐 Authentication:</strong> Bot Token (xoxb-*) required in credentials. Get it from Slack App OAuth page.
      </div>
    </div>
  );
};

export default SlackConfig;
