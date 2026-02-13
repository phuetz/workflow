/**
 * Mailgun Node Configuration
 * Email service for developers
 */

import React, { useState } from 'react';

interface MailgunConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const MailgunConfig: React.FC<MailgunConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'sendEmail');
  const [from, setFrom] = useState(config.from as string || '');
  const [to, setTo] = useState(config.to as string || '');
  const [subject, setSubject] = useState(config.subject as string || '');
  const [text, setText] = useState(config.text as string || '');
  const [html, setHtml] = useState(config.html as string || '');
  const [cc, setCc] = useState(config.cc as string || '');
  const [bcc, setBcc] = useState(config.bcc as string || '');

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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500"
        >
          <option value="sendEmail">Send Email</option>
          <option value="getEvents">Get Events</option>
          <option value="validateEmail">Validate Email</option>
          <option value="createMailingList">Create Mailing List</option>
          <option value="addToMailingList">Add to Mailing List</option>
        </select>
      </div>

      {operation === 'sendEmail' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                handleChange({ from: e.target.value });
              }}
              placeholder="sender@yourdomain.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Sender email (must be from verified domain)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                handleChange({ to: e.target.value });
              }}
              placeholder="recipient@example.com or multiple separated by comma"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Recipient email(s). Use comma for multiple. Can use expression: {`{{ $json.email }}`}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CC (Optional)
            </label>
            <input
              type="text"
              value={cc}
              onChange={(e) => {
                setCc(e.target.value);
                handleChange({ cc: e.target.value });
              }}
              placeholder="cc@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              BCC (Optional)
            </label>
            <input
              type="text"
              value={bcc}
              onChange={(e) => {
                setBcc(e.target.value);
                handleChange({ bcc: e.target.value });
              }}
              placeholder="bcc@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                handleChange({ subject: e.target.value });
              }}
              placeholder="Email subject"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Text Body
            </label>
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                handleChange({ text: e.target.value });
              }}
              placeholder="Plain text email content"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Plain text version (recommended for compatibility)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              HTML Body
            </label>
            <textarea
              value={html}
              onChange={(e) => {
                setHtml(e.target.value);
                handleChange({ html: e.target.value });
              }}
              placeholder="<html><body><h1>Hello!</h1><p>HTML email content</p></body></html>"
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              HTML version (for rich formatting)
            </p>
          </div>
        </>
      )}

      <div className="bg-red-50 border border-red-200 rounded-md p-3">
        <p className="text-sm text-red-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-red-700">
          Requires Mailgun API key and domain. Configure in Credentials Manager.
        </p>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
        <p className="text-sm text-orange-900 font-medium mb-1">Features</p>
        <ul className="text-xs text-orange-700 space-y-1">
          <li>• Reliable email delivery with 99.99% uptime</li>
          <li>• Email validation and verification</li>
          <li>• Detailed analytics and tracking</li>
          <li>• Webhooks for events (opens, clicks, bounces)</li>
          <li>• Template support with variables</li>
        </ul>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm text-blue-900 font-medium mb-1">Best Practices</p>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Always provide both text and HTML versions</li>
          <li>• Use verified domain for better deliverability</li>
          <li>• Monitor bounce and complaint rates</li>
          <li>• Implement proper unsubscribe handling</li>
        </ul>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600 space-y-1">
          <div><strong>Service:</strong> Mailgun</div>
          <div><strong>Free Tier:</strong> 5,000 emails/month</div>
          <div><strong>Documentation:</strong> documentation.mailgun.com</div>
        </p>
      </div>
    </div>
  );
};
