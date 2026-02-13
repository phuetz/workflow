/**
 * Azure Blob Storage Node Configuration
 * Object storage service for Microsoft Azure
 */

import React, { useState } from 'react';

interface BlobStorageConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const BlobStorageConfig: React.FC<BlobStorageConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'upload');
  const [containerName, setContainerName] = useState(config.containerName as string || '');
  const [blobName, setBlobName] = useState(config.blobName as string || '');
  const [blobContent, setBlobContent] = useState(config.blobContent as string || '');
  const [blobType, setBlobType] = useState(config.blobType as string || 'BlockBlob');
  const [contentType, setContentType] = useState(config.contentType as string || '');

  const handleChange = (updates: Record<string, unknown>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => {
            setOperation(e.target.value);
            handleChange({ operation: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600"
        >
          <option value="upload">Upload Blob</option>
          <option value="download">Download Blob</option>
          <option value="delete">Delete Blob</option>
          <option value="list">List Blobs</option>
          <option value="getProperties">Get Properties</option>
          <option value="copy">Copy Blob</option>
          <option value="createContainer">Create Container</option>
          <option value="deleteContainer">Delete Container</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Container Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={containerName}
          onChange={(e) => {
            setContainerName(e.target.value);
            handleChange({ containerName: e.target.value });
          }}
          placeholder="my-container"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600"
        />
        <p className="text-xs text-gray-500 mt-1">
          Azure Blob container name (lowercase, 3-63 characters)
        </p>
      </div>

      {(operation === 'upload' || operation === 'download' || operation === 'delete' || operation === 'getProperties' || operation === 'copy') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Blob Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={blobName}
            onChange={(e) => {
              setBlobName(e.target.value);
              handleChange({ blobName: e.target.value });
            }}
            placeholder="path/to/file.txt"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600"
          />
          <p className="text-xs text-gray-500 mt-1">
            Blob path (supports virtual directories with /)
          </p>
        </div>
      )}

      {operation === 'upload' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Blob Type
            </label>
            <select
              value={blobType}
              onChange={(e) => {
                setBlobType(e.target.value);
                handleChange({ blobType: e.target.value });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600"
            >
              <option value="BlockBlob">Block Blob (General purpose)</option>
              <option value="AppendBlob">Append Blob (Logs, streaming)</option>
              <option value="PageBlob">Page Blob (VHD disks)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Block Blob for most use cases, Page Blob for VMs
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Blob Content <span className="text-red-500">*</span>
            </label>
            <textarea
              value={blobContent}
              onChange={(e) => {
                setBlobContent(e.target.value);
                handleChange({ blobContent: e.target.value });
              }}
              placeholder="File content or expression: {{ $binary.data }}"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Content to upload (text, base64, or binary expression)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content Type
            </label>
            <input
              type="text"
              value={contentType}
              onChange={(e) => {
                setContentType(e.target.value);
                handleChange({ contentType: e.target.value });
              }}
              placeholder="application/json, image/png, text/plain"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600"
            />
            <p className="text-xs text-gray-500 mt-1">
              MIME type (auto-detected from extension if not specified)
            </p>
          </div>
        </>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm text-blue-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-blue-700">
          Requires Azure Storage Account connection string or SAS token. Configure in Credentials Manager.
        </p>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
        <p className="text-sm text-purple-900 font-medium mb-1">Features</p>
        <ul className="text-xs text-purple-700 space-y-1">
          <li>• Block, Append, and Page blob types</li>
          <li>• Hot, Cool, and Archive storage tiers</li>
          <li>• Lifecycle management for cost optimization</li>
          <li>• Versioning and soft delete</li>
          <li>• CDN integration for global distribution</li>
        </ul>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600 space-y-1">
          <div><strong>Service:</strong> Azure Blob Storage</div>
          <div><strong>Max Block Blob Size:</strong> 190.7 TB</div>
          <div><strong>Documentation:</strong> docs.microsoft.com/azure/storage/blobs</div>
        </p>
      </div>
    </div>
  );
};
