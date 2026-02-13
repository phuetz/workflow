/**
 * SendGrid Node Configuration
 * Email delivery and marketing
 */

import React, { useState } from 'react';
import type { SendGridOperation } from '../../../integrations/sendgrid/sendgrid.types';

interface SendGridConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const SendGridConfig: React.FC<SendGridConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<SendGridOperation>(
    (config.operation as SendGridOperation) || 'sendEmail'
  );
  const [to, setTo] = useState((config.to as string) || '');
  const [from, setFrom] = useState((config.from as string) || '');
  const [subject, setSubject] = useState((config.subject as string) || '');
  const [content, setContent] = useState((config.content as string) || '');
  const [templateId, setTemplateId] = useState((config.templateId as string) || '');

  const handleOperationChange = (newOperation: SendGridOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleToChange = (value: string) => {
    setTo(value);
    onChange({ ...config, to: value });
  };

  const handleFromChange = (value: string) => {
    setFrom(value);
    onChange({ ...config, from: value });
  };

  const handleSubjectChange = (value: string) => {
    setSubject(value);
    onChange({ ...config, subject: value });
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    onChange({ ...config, content: value });
  };

  const handleTemplateIdChange = (value: string) => {
    setTemplateId(value);
    onChange({ ...config, templateId: value });
  };

  const loadExample = (example: 'email' | 'template') => {
    if (example === 'email') {
      handleOperationChange('sendEmail');
      handleToChange('recipient@example.com');
      handleFromChange('noreply@yourcompany.com');
      handleSubjectChange('Welcome to Our Service!');
      handleContentChange('<h1>Welcome!</h1><p>Thank you for signing up.</p>');
    } else if (example === 'template') {
      handleOperationChange('sendTemplate');
      handleToChange('customer@example.com');
      handleFromChange('noreply@yourcompany.com');
      handleTemplateIdChange('d-xxxxxxxxxxxxxxxxxxxxx');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as SendGridOperation)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600"
        >
          <option value="sendEmail">Send Email</option>
          <option value="sendTemplate">Send Template Email</option>
          <option value="addContact">Add Contact</option>
          <option value="updateContact">Update Contact</option>
          <option value="createList">Create List</option>
          <option value="addContactToList">Add Contact to List</option>
        </select>
      </div>

      {(operation === 'sendEmail' || operation === 'sendTemplate') && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To
            </label>
            <input
              type="email"
              value={to}
              onChange={(e) => handleToChange(e.target.value)}
              placeholder="recipient@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From
            </label>
            <input
              type="email"
              value={from}
              onChange={(e) => handleFromChange(e.target.value)}
              placeholder="noreply@yourcompany.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600"
            />
            <p className="text-xs text-gray-500 mt-1">
              Must be a verified sender in SendGrid
            </p>
          </div>

          {operation === 'sendEmail' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  placeholder="Your email subject"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content (HTML or Text)
                </label>
                <textarea
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="<h1>Hello!</h1><p>Your message here...</p>"
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 font-mono text-sm"
                />
              </div>
            </>
          )}

          {operation === 'sendTemplate' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template ID
              </label>
              <input
                type="text"
                value={templateId}
                onChange={(e) => handleTemplateIdChange(e.target.value)}
                placeholder="d-xxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600"
              />
              <p className="text-xs text-gray-500 mt-1">
                Dynamic template ID from SendGrid
              </p>
            </div>
          )}
        </>
      )}

      <div className="border-t pt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Quick Examples
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => loadExample('email')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Send Email
          </button>
          <button
            onClick={() => loadExample('template')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Send Template
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm text-blue-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-blue-700">
          Requires API Key with appropriate permissions. The sender email must be verified in SendGrid.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <div className="text-xs text-gray-600 space-y-1">
          <div><strong>API Version:</strong> v3</div>
          <div><strong>Rate Limits:</strong> Varies by plan</div>
          <div><strong>Documentation:</strong> sendgrid.com/docs/api-reference</div>
        </div>
      </div>
    </div>
  );
};
