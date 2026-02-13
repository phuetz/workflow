/**
 * Google Tag Manager Node Configuration
 * Tag management system
 */

import React, { useState } from 'react';

interface GoogleTagManagerConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const GoogleTagManagerConfig: React.FC<GoogleTagManagerConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'createTag');
  const [containerId, setContainerId] = useState(config.containerId as string || '');
  const [tagName, setTagName] = useState(config.tagName as string || '');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
        <select value={operation} onChange={(e) => { setOperation(e.target.value); onChange({ ...config, operation: e.target.value }); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500">
          <option value="createTag">Create Tag</option>
          <option value="updateTag">Update Tag</option>
          <option value="listTags">List Tags</option>
          <option value="publishContainer">Publish Container</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Container ID</label>
        <input type="text" value={containerId} onChange={(e) => { setContainerId(e.target.value); onChange({ ...config, containerId: e.target.value }); }}
          placeholder="GTM-XXXXXXX" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500" />
      </div>
      {(operation === 'createTag' || operation === 'updateTag') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tag Name</label>
          <input type="text" value={tagName} onChange={(e) => { setTagName(e.target.value); onChange({ ...config, tagName: e.target.value }); }}
            placeholder="My Tag" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500" />
        </div>
      )}
      <div className="bg-green-50 border border-green-200 rounded-md p-3">
        <p className="text-sm text-green-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-green-700">Requires Google OAuth 2.0 authorization.</p>
      </div>
    </div>
  );
};
