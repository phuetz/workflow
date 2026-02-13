/**
 * AWS SNS Node Configuration
 * Simple Notification Service for pub/sub messaging
 */

import React, { useState } from 'react';

interface SNSConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const SNSConfig: React.FC<SNSConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'publish');
  const [topicArn, setTopicArn] = useState(config.topicArn as string || '');
  const [targetArn, setTargetArn] = useState(config.targetArn as string || '');
  const [phoneNumber, setPhoneNumber] = useState(config.phoneNumber as string || '');
  const [message, setMessage] = useState(config.message as string || '');
  const [subject, setSubject] = useState(config.subject as string || '');
  const [messageStructure, setMessageStructure] = useState(config.messageStructure as string || 'string');

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
          <option value="publish">Publish Message</option>
          <option value="createTopic">Create Topic</option>
          <option value="deleteTopic">Delete Topic</option>
          <option value="listTopics">List Topics</option>
          <option value="subscribe">Subscribe to Topic</option>
          <option value="unsubscribe">Unsubscribe</option>
          <option value="listSubscriptions">List Subscriptions</option>
          <option value="getTopicAttributes">Get Topic Attributes</option>
          <option value="setTopicAttributes">Set Topic Attributes</option>
        </select>
      </div>

      {(operation === 'publish' || operation === 'deleteTopic' || operation === 'subscribe' || operation === 'getTopicAttributes' || operation === 'setTopicAttributes') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Topic ARN {operation !== 'publish' && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            value={topicArn}
            onChange={(e) => {
              setTopicArn(e.target.value);
              handleChange({ topicArn: e.target.value });
            }}
            placeholder="arn:aws:sns:region:account-id:topic-name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Amazon Resource Name (ARN) of the topic. Can use expression: {`{{ $json.topicArn }}`}
          </p>
        </div>
      )}

      {operation === 'publish' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Type
            </label>
            <select
              value={topicArn ? 'topic' : phoneNumber ? 'sms' : targetArn ? 'target' : 'topic'}
              onChange={(e) => {
                const targetType = e.target.value;
                if (targetType === 'topic') {
                  setPhoneNumber('');
                  setTargetArn('');
                  handleChange({ phoneNumber: '', targetArn: '' });
                } else if (targetType === 'sms') {
                  setTopicArn('');
                  setTargetArn('');
                  handleChange({ topicArn: '', targetArn: '' });
                } else if (targetType === 'target') {
                  setTopicArn('');
                  setPhoneNumber('');
                  handleChange({ topicArn: '', phoneNumber: '' });
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
            >
              <option value="topic">Topic (Fan-out)</option>
              <option value="sms">SMS (Direct)</option>
              <option value="target">Mobile Push (Direct)</option>
            </select>
          </div>

          {phoneNumber !== undefined && topicArn === '' && targetArn === '' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  handleChange({ phoneNumber: e.target.value });
                }}
                placeholder="+1234567890"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                E.164 format phone number (e.g., +1234567890)
              </p>
            </div>
          )}

          {targetArn !== undefined && topicArn === '' && phoneNumber === '' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target ARN <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={targetArn}
                onChange={(e) => {
                  setTargetArn(e.target.value);
                  handleChange({ targetArn: e.target.value });
                }}
                placeholder="arn:aws:sns:region:account-id:endpoint/..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Mobile push notification endpoint ARN
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject (Email only)
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                handleChange({ subject: e.target.value });
              }}
              placeholder="Notification subject"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Subject line for email notifications (max 100 characters)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message Structure
            </label>
            <select
              value={messageStructure}
              onChange={(e) => {
                setMessageStructure(e.target.value);
                handleChange({ messageStructure: e.target.value });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
            >
              <option value="string">Simple String</option>
              <option value="json">JSON (Protocol-specific)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              JSON allows different messages per protocol (email, SMS, etc.)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                handleChange({ message: e.target.value });
              }}
              placeholder={messageStructure === 'json'
                ? '{"default": "fallback", "email": "HTML email", "sms": "SMS text"}'
                : 'Your notification message'
              }
              rows={messageStructure === 'json' ? 6 : 4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              {messageStructure === 'json'
                ? 'JSON with protocol-specific messages. "default" is required.'
                : 'Message content. Can use expressions: {{ $json.message }}'
              }
            </p>
          </div>
        </>
      )}

      {operation === 'subscribe' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Protocol
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
          >
            <option value="http">HTTP</option>
            <option value="https">HTTPS</option>
            <option value="email">Email</option>
            <option value="email-json">Email (JSON)</option>
            <option value="sms">SMS</option>
            <option value="sqs">SQS</option>
            <option value="lambda">Lambda</option>
            <option value="application">Mobile Push</option>
          </select>
        </div>
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
          <li>• Pub/Sub messaging with fan-out</li>
          <li>• Multiple protocols: HTTP, Email, SMS, SQS, Lambda</li>
          <li>• Message filtering and attributes</li>
          <li>• Mobile push notifications</li>
          <li>• Message encryption and delivery retry</li>
        </ul>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600 space-y-1">
          <div><strong>Service:</strong> Amazon SNS</div>
          <div><strong>Max Message Size:</strong> 256 KB</div>
          <div><strong>Documentation:</strong> docs.aws.amazon.com/sns</div>
        </p>
      </div>
    </div>
  );
};
