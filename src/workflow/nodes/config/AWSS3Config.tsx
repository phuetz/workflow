/**
 * AWS S3 Node Configuration
 * Object storage service
 */

import React, { useState } from 'react';

interface AWSS3ConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const AWSS3Config: React.FC<AWSS3ConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'uploadObject');

  const handleOperationChange = (value: string) => {
    setOperation(value);
    onChange({ ...config, operation: value });
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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
        >
          <option value="uploadObject">Upload Object</option>
          <option value="downloadObject">Download Object</option>
          <option value="listObjects">List Objects</option>
          <option value="deleteObject">Delete Object</option>
          <option value="createBucket">Create Bucket</option>
        </select>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
        <p className="text-sm text-orange-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-orange-700">
          Requires AWS Access Key ID, Secret Access Key, and region. Configure in Credentials Manager.
        </p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
        <p className="text-sm text-yellow-900 font-medium mb-1">Note</p>
        <p className="text-xs text-yellow-700">
          Full S3 implementation requires AWS SDK. This is a framework implementation.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600 space-y-1">
          <div><strong>Service:</strong> Amazon S3</div>
          <div><strong>Documentation:</strong> docs.aws.amazon.com/s3</div>
        </p>
      </div>
    </div>
  );
};
