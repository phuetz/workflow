/**
 * Google Cloud Pub/Sub Node Configuration
 * Messaging and event streaming service
 */

import React, { useState } from 'react';

interface PubSubConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const PubSubConfig: React.FC<PubSubConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'publish');
  const [topicName, setTopicName] = useState(config.topicName as string || '');
  const [subscriptionName, setSubscriptionName] = useState(config.subscriptionName as string || '');
  const [message, setMessage] = useState(config.message as string || '');
  const [attributes, setAttributes] = useState(config.attributes as string || '{}');
  const [orderingKey, setOrderingKey] = useState(config.orderingKey as string || '');

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
          <option value="publish">Publish Message</option>
          <option value="pull">Pull Messages</option>
          <option value="createTopic">Create Topic</option>
          <option value="deleteTopic">Delete Topic</option>
          <option value="createSubscription">Create Subscription</option>
          <option value="deleteSubscription">Delete Subscription</option>
          <option value="listTopics">List Topics</option>
          <option value="listSubscriptions">List Subscriptions</option>
        </select>
      </div>

      {(operation === 'publish' || operation === 'deleteTopic' || operation === 'createSubscription') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Topic Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={topicName}
            onChange={(e) => {
              setTopicName(e.target.value);
              handleChange({ topicName: e.target.value });
            }}
            placeholder="projects/my-project/topics/my-topic"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Full topic path: projects/PROJECT_ID/topics/TOPIC_ID
          </p>
        </div>
      )}

      {(operation === 'pull' || operation === 'deleteSubscription' || operation === 'createSubscription') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subscription Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={subscriptionName}
            onChange={(e) => {
              setSubscriptionName(e.target.value);
              handleChange({ subscriptionName: e.target.value });
            }}
            placeholder="projects/my-project/subscriptions/my-sub"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Full subscription path: projects/PROJECT_ID/subscriptions/SUB_ID
          </p>
        </div>
      )}

      {operation === 'publish' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message Data <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                handleChange({ message: e.target.value });
              }}
              placeholder='{"event": "user.created", "userId": "123"}'
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Message payload (will be base64 encoded). Can use expression: {`{{ $json.data }}`}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Attributes (JSON)
            </label>
            <textarea
              value={attributes}
              onChange={(e) => {
                setAttributes(e.target.value);
                handleChange({ attributes: e.target.value });
              }}
              placeholder='{"source": "api", "version": "1.0"}'
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Message attributes for filtering and routing
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ordering Key (Optional)
            </label>
            <input
              type="text"
              value={orderingKey}
              onChange={(e) => {
                setOrderingKey(e.target.value);
                handleChange({ orderingKey: e.target.value });
              }}
              placeholder="user-123"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Messages with same key are delivered in order (requires ordered delivery)
            </p>
          </div>
        </>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm text-blue-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-blue-700">
          Requires Google Cloud Service Account JSON key with Pub/Sub permissions.
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-md p-3">
        <p className="text-sm text-green-900 font-medium mb-1">Features</p>
        <ul className="text-xs text-green-700 space-y-1">
          <li>• At-least-once delivery guarantee</li>
          <li>• Message ordering and deduplication</li>
          <li>• Push and pull subscriptions</li>
          <li>• Message filtering and dead letter topics</li>
          <li>• Global message routing</li>
        </ul>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600 space-y-1">
          <div><strong>Service:</strong> Google Cloud Pub/Sub</div>
          <div><strong>Max Message Size:</strong> 10 MB</div>
          <div><strong>Documentation:</strong> cloud.google.com/pubsub/docs</div>
        </p>
      </div>
    </div>
  );
};
