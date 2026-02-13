/**
 * AWS SQS Node Configuration
 * Simple Queue Service for message queuing
 */

import React, { useState } from 'react';

interface SQSConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const SQSConfig: React.FC<SQSConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'sendMessage');
  const [queueUrl, setQueueUrl] = useState(config.queueUrl as string || '');
  const [messageBody, setMessageBody] = useState(config.messageBody as string || '');
  const [delaySeconds, setDelaySeconds] = useState(config.delaySeconds as number || 0);
  const [messageGroupId, setMessageGroupId] = useState(config.messageGroupId as string || '');
  const [maxMessages, setMaxMessages] = useState(config.maxMessages as number || 1);
  const [visibilityTimeout, setVisibilityTimeout] = useState(config.visibilityTimeout as number || 30);
  const [waitTimeSeconds, setWaitTimeSeconds] = useState(config.waitTimeSeconds as number || 0);

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
          <option value="sendMessage">Send Message</option>
          <option value="sendMessageBatch">Send Message Batch</option>
          <option value="receiveMessage">Receive Message</option>
          <option value="deleteMessage">Delete Message</option>
          <option value="deleteMessageBatch">Delete Message Batch</option>
          <option value="changeMessageVisibility">Change Message Visibility</option>
          <option value="purgeQueue">Purge Queue</option>
          <option value="getQueueAttributes">Get Queue Attributes</option>
          <option value="createQueue">Create Queue</option>
          <option value="deleteQueue">Delete Queue</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Queue URL <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={queueUrl}
          onChange={(e) => {
            setQueueUrl(e.target.value);
            handleChange({ queueUrl: e.target.value });
          }}
          placeholder="https://sqs.region.amazonaws.com/account-id/queue-name"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          The URL of the Amazon SQS queue. Can use expression: {`{{ $json.queueUrl }}`}
        </p>
      </div>

      {(operation === 'sendMessage' || operation === 'sendMessageBatch') && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message Body <span className="text-red-500">*</span>
            </label>
            <textarea
              value={messageBody}
              onChange={(e) => {
                setMessageBody(e.target.value);
                handleChange({ messageBody: e.target.value });
              }}
              placeholder='Message content or JSON: {"data": "value"}'
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Message content (max 256 KB). Can use expressions: {`{{ $json.message }}`}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Delay Seconds
            </label>
            <input
              type="number"
              value={delaySeconds}
              onChange={(e) => {
                setDelaySeconds(parseInt(e.target.value) || 0);
                handleChange({ delaySeconds: parseInt(e.target.value) || 0 });
              }}
              min="0"
              max="900"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Delay delivery (0-900 seconds)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message Group ID (FIFO only)
            </label>
            <input
              type="text"
              value={messageGroupId}
              onChange={(e) => {
                setMessageGroupId(e.target.value);
                handleChange({ messageGroupId: e.target.value });
              }}
              placeholder="group-1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Required for FIFO queues. Messages with same group ID are processed in order.
            </p>
          </div>
        </>
      )}

      {operation === 'receiveMessage' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Number of Messages
            </label>
            <input
              type="number"
              value={maxMessages}
              onChange={(e) => {
                setMaxMessages(parseInt(e.target.value) || 1);
                handleChange({ maxMessages: parseInt(e.target.value) || 1 });
              }}
              min="1"
              max="10"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum number of messages to receive (1-10)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Visibility Timeout (seconds)
            </label>
            <input
              type="number"
              value={visibilityTimeout}
              onChange={(e) => {
                setVisibilityTimeout(parseInt(e.target.value) || 30);
                handleChange({ visibilityTimeout: parseInt(e.target.value) || 30 });
              }}
              min="0"
              max="43200"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Duration message is hidden from other consumers (0-43200 seconds)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Wait Time Seconds (Long Polling)
            </label>
            <input
              type="number"
              value={waitTimeSeconds}
              onChange={(e) => {
                setWaitTimeSeconds(parseInt(e.target.value) || 0);
                handleChange({ waitTimeSeconds: parseInt(e.target.value) || 0 });
              }}
              min="0"
              max="20"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enable long polling (0-20 seconds). Recommended: 20 for efficiency
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
          <li>• Standard and FIFO queue support</li>
          <li>• Long polling for cost efficiency</li>
          <li>• Batch operations for high throughput</li>
          <li>• Message delay and visibility timeout</li>
          <li>• Dead letter queue support</li>
        </ul>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600 space-y-1">
          <div><strong>Service:</strong> Amazon SQS</div>
          <div><strong>Max Message Size:</strong> 256 KB</div>
          <div><strong>Documentation:</strong> docs.aws.amazon.com/sqs</div>
        </p>
      </div>
    </div>
  );
};
