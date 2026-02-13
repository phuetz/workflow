/**
 * OneDrive Node Configuration
 * Microsoft cloud storage
 */

import React, { useState } from 'react';

interface OneDriveConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const OneDriveConfig: React.FC<OneDriveConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'uploadFile');

  const handleOperationChange = (value: string) => {
    setOperation(value);
    onChange({ ...config, operation: value });
  };

  const loadExample = () => {
    handleOperationChange('uploadFile');
    onChange({
      ...config,
      operation: 'uploadFile',
      path: '/documents/report.txt',
      content: 'File content here'
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
        >
          <option value="uploadFile">Upload File</option>
          <option value="downloadFile">Download File</option>
          <option value="createFolder">Create Folder</option>
          <option value="listFiles">List Files</option>
          <option value="shareFile">Share File</option>
          <option value="deleteFile">Delete File</option>
        </select>
      </div>

      <button
        onClick={loadExample}
        className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
      >
        Load Upload Example
      </button>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm text-blue-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-blue-700">
          Requires OAuth 2.0 access token with Files.ReadWrite scope. Paths must start with '/'.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600 space-y-1">
          <div><strong>API:</strong> Microsoft Graph API</div>
          <div><strong>Documentation:</strong> docs.microsoft.com/graph/api/resources/onedrive</div>
        </p>
      </div>
    </div>
  );
};
