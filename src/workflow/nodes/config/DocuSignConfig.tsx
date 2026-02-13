import React, { useState, useCallback } from 'react';
import { WorkflowNode } from '../../../types/workflow';

interface DocuSignConfigProps {
  node: WorkflowNode;
  onChange: (config: Record<string, unknown>) => void;
}

interface DocuSignConfig {
  operation: 'sendEnvelope' | 'getEnvelope' | 'listEnvelopes' | 'createTemplate' | 'downloadDocument';
  accountId?: string;
  envelopeData?: {
    emailSubject?: string;
    emailBody?: string;
    status?: 'sent' | 'created' | 'draft';
    recipients?: Array<{
      email: string;
      name: string;
      recipientId: string;
      routingOrder: number;
    }>;
    documents?: Array<{
      documentId: string;
      name: string;
      fileExtension: string;
      documentBase64?: string;
    }>;
  };
  templateId?: string;
  envelopeId?: string;
  credentials?: {
    integrationKey: string;
    secretKey: string;
    userId: string;
    accountId: string;
    basePath?: string;
  };
}

export const DocuSignConfig: React.FC<DocuSignConfigProps> = ({ node, onChange }) => {
  const [config, setConfig] = useState<DocuSignConfig>(
    (node.data.config as unknown as DocuSignConfig) || {
      operation: 'sendEnvelope',
      credentials: {
        integrationKey: '',
        secretKey: '',
        userId: '',
        accountId: '',
        basePath: 'https://demo.docusign.net/restapi'
      },
      envelopeData: {
        status: 'sent',
        recipients: [],
        documents: []
      }
    }
  );

  const handleChange = useCallback((updates: Partial<DocuSignConfig>) => {
    setConfig(prev => {
      const newConfig = { ...prev, ...updates };
      onChange(newConfig);
      return newConfig;
    });
  }, [onChange]);

  const handleCredentialChange = (field: keyof NonNullable<DocuSignConfig['credentials']>, value: string) => {
    const newCredentials = { ...config.credentials, [field]: value };
    handleChange({ credentials: newCredentials as DocuSignConfig['credentials'] });
  };

  const addRecipient = () => {
    const newRecipients = [
      ...(config.envelopeData?.recipients || []),
      {
        email: '',
        name: '',
        recipientId: `${Date.now()}`,
        routingOrder: (config.envelopeData?.recipients?.length || 0) + 1
      }
    ];
    handleChange({
      envelopeData: { ...config.envelopeData, recipients: newRecipients }
    });
  };

  const removeRecipient = (index: number) => {
    const newRecipients = config.envelopeData?.recipients?.filter((_, i) => i !== index) || [];
    handleChange({
      envelopeData: { ...config.envelopeData, recipients: newRecipients }
    });
  };

  const updateRecipient = (index: number, field: string, value: string) => {
    const newRecipients = [...(config.envelopeData?.recipients || [])];
    newRecipients[index] = { ...newRecipients[index], [field]: value };
    handleChange({
      envelopeData: { ...config.envelopeData, recipients: newRecipients }
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">DocuSign Configuration</h3>
        <p className="text-sm text-gray-600 mb-4">
          Send, manage, and track electronic signatures
        </p>
      </div>

      {/* Operation Selection */}
      <div>
        <label className="block text-sm font-medium mb-1">Operation</label>
        <select
          className="w-full p-2 border rounded"
          value={config.operation}
          onChange={(e) => handleChange({ operation: e.target.value as DocuSignConfig['operation'] })}
        >
          <option value="sendEnvelope">Send Envelope</option>
          <option value="getEnvelope">Get Envelope Status</option>
          <option value="listEnvelopes">List Envelopes</option>
          <option value="createTemplate">Create Template</option>
          <option value="downloadDocument">Download Document</option>
        </select>
      </div>

      {/* Credentials */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium mb-2">API Credentials</h4>

        <div className="space-y-2">
          <div>
            <label className="block text-sm mb-1">Integration Key</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              value={config.credentials?.integrationKey || ''}
              onChange={(e) => handleCredentialChange('integrationKey', e.target.value)}
              placeholder="Your DocuSign Integration Key"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Secret Key</label>
            <input
              type="password"
              className="w-full p-2 border rounded"
              value={config.credentials?.secretKey || ''}
              onChange={(e) => handleCredentialChange('secretKey', e.target.value)}
              placeholder="Your Secret Key"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">User ID (GUID)</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              value={config.credentials?.userId || ''}
              onChange={(e) => handleCredentialChange('userId', e.target.value)}
              placeholder="User GUID from DocuSign"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Account ID</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              value={config.credentials?.accountId || ''}
              onChange={(e) => handleCredentialChange('accountId', e.target.value)}
              placeholder="Your Account ID"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Base Path (Environment)</label>
            <select
              className="w-full p-2 border rounded"
              value={config.credentials?.basePath || ''}
              onChange={(e) => handleCredentialChange('basePath', e.target.value)}
            >
              <option value="https://demo.docusign.net/restapi">Demo/Sandbox</option>
              <option value="https://www.docusign.net/restapi">Production</option>
            </select>
          </div>
        </div>
      </div>

      {/* Send Envelope Configuration */}
      {config.operation === 'sendEnvelope' && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-2">Envelope Details</h4>

          <div className="space-y-2 mb-4">
            <div>
              <label className="block text-sm mb-1">Email Subject</label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                placeholder="Please sign this document"
                value={config.envelopeData?.emailSubject || ''}
                onChange={(e) => handleChange({
                  envelopeData: { ...config.envelopeData, emailSubject: e.target.value }
                })}
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Email Body</label>
              <textarea
                className="w-full p-2 border rounded"
                rows={3}
                placeholder="Please review and sign the attached document"
                value={config.envelopeData?.emailBody || ''}
                onChange={(e) => handleChange({
                  envelopeData: { ...config.envelopeData, emailBody: e.target.value }
                })}
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Status</label>
              <select
                className="w-full p-2 border rounded"
                value={config.envelopeData?.status || 'sent'}
                onChange={(e) => handleChange({
                  envelopeData: { ...config.envelopeData, status: e.target.value as 'sent' | 'created' | 'draft' }
                })}
              >
                <option value="draft">Draft (save for later)</option>
                <option value="created">Created (ready to send)</option>
                <option value="sent">Sent (send immediately)</option>
              </select>
            </div>
          </div>

          {/* Recipients */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium">Recipients</label>
              <button
                type="button"
                onClick={addRecipient}
                className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                + Add Recipient
              </button>
            </div>

            {config.envelopeData?.recipients?.map((recipient, index) => (
              <div key={recipient.recipientId} className="border p-3 rounded mb-2 bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium">Recipient #{index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeRecipient(index)}
                    className="text-red-500 text-sm hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    className="w-full p-2 border rounded"
                    placeholder="Name"
                    value={recipient.name}
                    onChange={(e) => updateRecipient(index, 'name', e.target.value)}
                  />
                  <input
                    type="email"
                    className="w-full p-2 border rounded"
                    placeholder="Email"
                    value={recipient.email}
                    onChange={(e) => updateRecipient(index, 'email', e.target.value)}
                  />
                  <input
                    type="number"
                    className="w-full p-2 border rounded"
                    placeholder="Routing Order"
                    value={recipient.routingOrder}
                    onChange={(e) => updateRecipient(index, 'routingOrder', e.target.value)}
                  />
                </div>
              </div>
            ))}

            {(!config.envelopeData?.recipients || config.envelopeData.recipients.length === 0) && (
              <p className="text-sm text-gray-500 italic">No recipients added yet</p>
            )}
          </div>
        </div>
      )}

      {config.operation === 'getEnvelope' && (
        <div className="border-t pt-4">
          <label className="block text-sm font-medium mb-1">Envelope ID</label>
          <input
            type="text"
            className="w-full p-2 border rounded"
            placeholder="Enter Envelope ID"
            value={config.envelopeId || ''}
            onChange={(e) => handleChange({ envelopeId: e.target.value })}
          />
        </div>
      )}

      <div className="text-xs text-gray-500 mt-4 p-3 bg-blue-50 rounded">
        <strong>Setup:</strong> Create an integration in the <a
          href="https://admindemo.docusign.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          DocuSign Admin
        </a> and obtain your Integration Key and Secret.
      </div>
    </div>
  );
};

export default DocuSignConfig;
