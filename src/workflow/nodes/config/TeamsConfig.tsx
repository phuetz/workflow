/**
 * Microsoft Teams Node Configuration
 * PROJET SAUVÉ - Phase 6: Communication
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

export const TeamsConfig: React.FC<{ config: NodeConfig; onChange: (config: NodeConfig) => void }> = ({ config, onChange }) => {
  const [operation, setOperation] = useState((config.operation as string) || 'sendMessage');
  const [teamId, setTeamId] = useState((config.teamId as string) || '');
  const [channelId, setChannelId] = useState((config.channelId as string) || '');
  const [message, setMessage] = useState((config.message as string) || '');

  return (
    <div className="teams-config space-y-4">
      <div className="font-semibold text-lg">Teams Configuration</div>

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
          <option value="sendMessage">Send Message</option>
          <option value="createChannel">Create Channel</option>
          <option value="getTeamMembers">Get Team Members</option>
          <option value="sendAdaptiveCard">Send Adaptive Card</option>
        </select>
      </div>

      {(operation === 'sendMessage' || operation === 'sendAdaptiveCard') && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium mb-1">Team ID</label>
            <input
              type="text"
              value={teamId}
              onChange={(e) => {
                setTeamId(e.target.value);
                onChange({ ...config, teamId: e.target.value });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
            />
          </div>
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
            <label className="block text-sm font-medium mb-1">Message</label>
            <textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                onChange({ ...config, message: e.target.value });
              }}
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      )}

      <div className="p-3 bg-blue-50 rounded text-sm">
        <strong>💡 Teams Tips:</strong> Requires Microsoft Graph API OAuth 2.0 token with Team.ReadWrite.All permissions.
      </div>
    </div>
  );
};

export default TeamsConfig;
