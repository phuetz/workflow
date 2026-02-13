/**
 * Google Cloud Storage Node Configuration
 * Object storage service for Google Cloud Platform
 */

import React, { useState } from 'react';

interface CloudStorageConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const CloudStorageConfig: React.FC<CloudStorageConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'upload');
  const [bucketName, setBucketName] = useState(config.bucketName as string || '');
  const [objectName, setObjectName] = useState(config.objectName as string || '');
  const [fileData, setFileData] = useState(config.fileData as string || '');
  const [contentType, setContentType] = useState(config.contentType as string || '');
  const [makePublic, setMakePublic] = useState(config.makePublic as boolean || false);

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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
        >
          <option value="upload">Upload Object</option>
          <option value="download">Download Object</option>
          <option value="delete">Delete Object</option>
          <option value="list">List Objects</option>
          <option value="getMetadata">Get Metadata</option>
          <option value="copy">Copy Object</option>
          <option value="move">Move Object</option>
          <option value="createBucket">Create Bucket</option>
          <option value="deleteBucket">Delete Bucket</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Bucket Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={bucketName}
          onChange={(e) => {
            setBucketName(e.target.value);
            handleChange({ bucketName: e.target.value });
          }}
          placeholder="my-bucket"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          GCS bucket name. Can use expression: {`{{ $json.bucket }}`}
        </p>
      </div>

      {(operation === 'upload' || operation === 'download' || operation === 'delete' || operation === 'getMetadata' || operation === 'copy' || operation === 'move') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Object Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={objectName}
            onChange={(e) => {
              setObjectName(e.target.value);
              handleChange({ objectName: e.target.value });
            }}
            placeholder="path/to/file.txt"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Object path in bucket. Supports folders with / separator
          </p>
        </div>
      )}

      {operation === 'upload' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              File Data <span className="text-red-500">*</span>
            </label>
            <textarea
              value={fileData}
              onChange={(e) => {
                setFileData(e.target.value);
                handleChange({ fileData: e.target.value });
              }}
              placeholder="File content or expression: {{ $binary.data }}"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              File content, base64 data, or binary expression
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              MIME type (auto-detected if not specified)
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="makePublic"
              checked={makePublic}
              onChange={(e) => {
                setMakePublic(e.target.checked);
                handleChange({ makePublic: e.target.checked });
              }}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="makePublic" className="ml-2 block text-sm text-gray-700">
              Make object publicly accessible
            </label>
          </div>
        </>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm text-blue-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-blue-700">
          Requires Google Cloud Service Account JSON key. Configure in Credentials Manager.
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-md p-3">
        <p className="text-sm text-green-900 font-medium mb-1">Features</p>
        <ul className="text-xs text-green-700 space-y-1">
          <li>• 11 nines durability (99.999999999%)</li>
          <li>• Multi-region and dual-region storage</li>
          <li>• Lifecycle management for cost optimization</li>
          <li>• Versioning and retention policies</li>
          <li>• Signed URLs for temporary access</li>
        </ul>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600 space-y-1">
          <div><strong>Service:</strong> Google Cloud Storage</div>
          <div><strong>Max Object Size:</strong> 5 TB</div>
          <div><strong>Documentation:</strong> cloud.google.com/storage/docs</div>
        </p>
      </div>
    </div>
  );
};
