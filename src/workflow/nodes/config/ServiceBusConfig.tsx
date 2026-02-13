/**
 * Azure Service Bus Node Configuration
 * Enterprise messaging service
 */

import React, { useState } from 'react';

interface ServiceBusConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const ServiceBusConfig: React.FC<ServiceBusConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'sendMessage');
  const [entityType, setEntityType] = useState(config.entityType as string || 'queue');
  const [entityName, setEntityName] = useState(config.entityName as string || '');
  const [message, setMessage] = useState(config.message as string || '');
  const [sessionId, setSessionId] = useState(config.sessionId as string || '');
  const [timeToLive, setTimeToLive] = useState(config.timeToLive as number || 0);

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
          <option value="sendMessage">Send Message</option>
          <option value="receiveMessage">Receive Message</option>
          <option value="peekMessage">Peek Message</option>
          <option value="createQueue">Create Queue</option>
          <option value="deleteQueue">Delete Queue</option>
          <option value="createTopic">Create Topic</option>
          <option value="deleteTopic">Delete Topic</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Entity Type
        </label>
        <select
          value={entityType}
          onChange={(e) => {
            setEntityType(e.target.value);
            handleChange({ entityType: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600"
        >
          <option value="queue">Queue (Point-to-point)</option>
          <option value="topic">Topic (Pub/Sub)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {entityType === 'queue' ? 'Queue Name' : 'Topic Name'} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={entityName}
          onChange={(e) => {
            setEntityName(e.target.value);
            handleChange({ entityName: e.target.value });
          }}
          placeholder={entityType === 'queue' ? 'my-queue' : 'my-topic'}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600"
        />
      </div>

      {operation === 'sendMessage' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message Body <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                handleChange({ message: e.target.value });
              }}
              placeholder='{"event": "order.created", "orderId": "12345"}'
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Message content. Can use expression: {`{{ $json.message }}`}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Session ID (Optional)
            </label>
            <input
              type="text"
              value={sessionId}
              onChange={(e) => {
                setSessionId(e.target.value);
                handleChange({ sessionId: e.target.value });
              }}
              placeholder="session-123"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600"
            />
            <p className="text-xs text-gray-500 mt-1">
              For session-aware queues/topics (guaranteed ordering)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time to Live (seconds)
            </label>
            <input
              type="number"
              value={timeToLive}
              onChange={(e) => {
                setTimeToLive(parseInt(e.target.value) || 0);
                handleChange({ timeToLive: parseInt(e.target.value) || 0 });
              }}
              min="0"
              placeholder="0 = unlimited"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600"
            />
            <p className="text-xs text-gray-500 mt-1">
              Message expiration time (0 = use queue default)
            </p>
          </div>
        </>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm text-blue-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-blue-700">
          Requires Azure Service Bus connection string or Shared Access Signature.
        </p>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
        <p className="text-sm text-purple-900 font-medium mb-1">Features</p>
        <ul className="text-xs text-purple-700 space-y-1">
          <li>• Queues and Topics (pub/sub)</li>
          <li>• Sessions for ordered message processing</li>
          <li>• Dead letter queues</li>
          <li>• Duplicate detection</li>
          <li>• Transactions and batching</li>
        </ul>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600 space-y-1">
          <div><strong>Service:</strong> Azure Service Bus</div>
          <div><strong>Max Message Size:</strong> 1 MB (Standard), 100 MB (Premium)</div>
          <div><strong>Documentation:</strong> docs.microsoft.com/azure/service-bus-messaging</div>
        </p>
      </div>
    </div>
  );
};
