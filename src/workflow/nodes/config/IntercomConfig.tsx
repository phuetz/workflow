/**
 * Intercom Node Configuration
 * Customer messaging platform integration
 */

import React, { useState, useEffect } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface IntercomConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

type IntercomOperation =
  | 'sendMessage'
  | 'createContact'
  | 'updateContact'
  | 'findContact'
  | 'createConversation'
  | 'replyToConversation'
  | 'tagContact'
  | 'createNote'
  | 'listContacts'
  | 'getConversation';

export const IntercomConfig: React.FC<IntercomConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<IntercomOperation>(
    (config.operation as IntercomOperation) || 'sendMessage'
  );
  const [email, setEmail] = useState((config.email as string) || '');
  const [userId, setUserId] = useState((config.userId as string) || '');
  const [name, setName] = useState((config.name as string) || '');
  const [message, setMessage] = useState((config.message as string) || '');
  const [conversationId, setConversationId] = useState((config.conversationId as string) || '');
  const [tagName, setTagName] = useState((config.tagName as string) || '');
  const [noteBody, setNoteBody] = useState((config.noteBody as string) || '');
  const [customAttributes, setCustomAttributes] = useState(
    (config.customAttributes as string) || '{}'
  );

  useEffect(() => {
    onChange({
      ...config,
      operation,
      email,
      userId,
      name,
      message,
      conversationId,
      tagName,
      noteBody,
      customAttributes,
    });
  }, [operation, email, userId, name, message, conversationId, tagName, noteBody, customAttributes]);

  const handleOperationChange = (newOperation: IntercomOperation) => {
    setOperation(newOperation);
  };

  return (
    <div className="space-y-4">
      {/* Operation Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as IntercomOperation)}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="sendMessage">Send Message</option>
          <option value="createContact">Create Contact</option>
          <option value="updateContact">Update Contact</option>
          <option value="findContact">Find Contact</option>
          <option value="createConversation">Create Conversation</option>
          <option value="replyToConversation">Reply to Conversation</option>
          <option value="tagContact">Tag Contact</option>
          <option value="createNote">Create Note</option>
          <option value="listContacts">List Contacts</option>
          <option value="getConversation">Get Conversation</option>
        </select>
      </div>

      {/* Contact Fields */}
      {['sendMessage', 'createContact', 'updateContact', 'findContact', 'tagContact', 'createNote'].includes(operation) && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              User ID (optional)
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="External user ID"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </>
      )}

      {/* Name Field */}
      {['createContact', 'updateContact'].includes(operation) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contact name"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      )}

      {/* Message Field */}
      {['sendMessage', 'createConversation', 'replyToConversation'].includes(operation) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter your message..."
            rows={4}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      )}

      {/* Conversation ID */}
      {['replyToConversation', 'getConversation'].includes(operation) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Conversation ID
          </label>
          <input
            type="text"
            value={conversationId}
            onChange={(e) => setConversationId(e.target.value)}
            placeholder="Conversation ID"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      )}

      {/* Tag Name */}
      {operation === 'tagContact' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tag Name
          </label>
          <input
            type="text"
            value={tagName}
            onChange={(e) => setTagName(e.target.value)}
            placeholder="Tag name"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      )}

      {/* Note Body */}
      {operation === 'createNote' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Note
          </label>
          <textarea
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            placeholder="Note content..."
            rows={3}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      )}

      {/* Custom Attributes */}
      {['createContact', 'updateContact'].includes(operation) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Custom Attributes (JSON)
          </label>
          <textarea
            value={customAttributes}
            onChange={(e) => setCustomAttributes(e.target.value)}
            placeholder='{"key": "value"}'
            rows={3}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-sm"
          />
        </div>
      )}

      {/* Documentation Link */}
      <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
        <a
          href="https://developers.intercom.com/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Intercom API Documentation
        </a>
      </div>
    </div>
  );
};

export default IntercomConfig;
