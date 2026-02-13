/**
 * AWS Lambda Node Configuration
 * Serverless function execution
 */

import React, { useState } from 'react';

interface LambdaConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const LambdaConfig: React.FC<LambdaConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'invoke');
  const [invocationType, setInvocationType] = useState(config.invocationType as string || 'RequestResponse');
  const [functionName, setFunctionName] = useState(config.functionName as string || '');
  const [payload, setPayload] = useState(config.payload as string || '{}');
  const [qualifier, setQualifier] = useState(config.qualifier as string || '');

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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
        >
          <option value="invoke">Invoke Function</option>
          <option value="create">Create Function</option>
          <option value="update">Update Function Code</option>
          <option value="delete">Delete Function</option>
          <option value="list">List Functions</option>
          <option value="getConfiguration">Get Configuration</option>
          <option value="updateConfiguration">Update Configuration</option>
        </select>
      </div>

      {(operation === 'invoke' || operation === 'create' || operation === 'update' || operation === 'delete' || operation === 'getConfiguration' || operation === 'updateConfiguration') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Function Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={functionName}
            onChange={(e) => {
              setFunctionName(e.target.value);
              handleChange({ functionName: e.target.value });
            }}
            placeholder="my-function"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            The name of the Lambda function or ARN
          </p>
        </div>
      )}

      {operation === 'invoke' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invocation Type
            </label>
            <select
              value={invocationType}
              onChange={(e) => {
                setInvocationType(e.target.value);
                handleChange({ invocationType: e.target.value });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
            >
              <option value="RequestResponse">Request-Response (Synchronous)</option>
              <option value="Event">Event (Asynchronous)</option>
              <option value="DryRun">Dry Run (Validation)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Choose how to invoke the function
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payload (JSON)
            </label>
            <textarea
              value={payload}
              onChange={(e) => {
                setPayload(e.target.value);
                handleChange({ payload: e.target.value });
              }}
              placeholder='{"key": "value"}'
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              JSON payload to pass to the function. Can use expressions: {`{{ $json.data }}`}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Qualifier (Optional)
            </label>
            <input
              type="text"
              value={qualifier}
              onChange={(e) => {
                setQualifier(e.target.value);
                handleChange({ qualifier: e.target.value });
              }}
              placeholder="$LATEST, version number, or alias"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Specify version or alias to invoke (default: $LATEST)
            </p>
          </div>
        </>
      )}

      <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
        <p className="text-sm text-orange-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-orange-700">
          Requires AWS Access Key ID, Secret Access Key, and region. Configure in Credentials Manager.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm text-blue-900 font-medium mb-1">Features</p>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Synchronous and asynchronous invocation</li>
          <li>• Version and alias support</li>
          <li>• Function lifecycle management</li>
          <li>• Configuration updates</li>
          <li>• Error handling with retries</li>
        </ul>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600 space-y-1">
          <div><strong>Service:</strong> AWS Lambda</div>
          <div><strong>Region:</strong> Configured in credentials</div>
          <div><strong>Documentation:</strong> docs.aws.amazon.com/lambda</div>
        </p>
      </div>
    </div>
  );
};
