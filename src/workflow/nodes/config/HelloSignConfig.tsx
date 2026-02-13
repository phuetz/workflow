import React, { useState, useCallback } from 'react';
import { WorkflowNode } from '../../../types/workflow';

interface HelloSignConfigProps {
  node: WorkflowNode;
  onChange: (config: Record<string, unknown>) => void;
}

interface HelloSignSigner {
  email: string;
  name: string;
  order?: number;
}

interface HelloSignConfig {
  operation:
    | 'sendSignatureRequest'
    | 'sendWithTemplate'
    | 'getSignatureRequest'
    | 'cancelSignatureRequest'
    | 'downloadFiles'
    | 'listSignatureRequests';

  // Credentials
  apiKey: string;

  // Signature Request fields
  title?: string;
  subject?: string;
  message?: string;
  signers?: HelloSignSigner[];
  ccEmailAddresses?: string[];

  // Files
  fileUrls?: string[];
  fileData?: string; // Base64 or URL

  // Template fields
  templateId?: string;
  templateData?: Record<string, string>;

  // Request ID (for get/cancel/download)
  signatureRequestId?: string;

  // List options
  page?: number;
  pageSize?: number;

  // Options
  testMode?: boolean;
  useTextTags?: boolean;
  hideTextTags?: boolean;
  allowDecline?: boolean;
}

export const HelloSignConfig: React.FC<HelloSignConfigProps> = ({ node, onChange }) => {
  const [config, setConfig] = useState<HelloSignConfig>(
    (node.data.config as unknown as HelloSignConfig) || {
      operation: 'sendSignatureRequest',
      apiKey: '',
      signers: [],
      ccEmailAddresses: [],
      fileUrls: [],
      testMode: false,
      useTextTags: false,
      allowDecline: true,
    }
  );

  const handleChange = useCallback((updates: Partial<HelloSignConfig>) => {
    setConfig(prev => {
      const newConfig = { ...prev, ...updates };
      onChange(newConfig);
      return newConfig;
    });
  }, [onChange]);

  const addSigner = useCallback(() => {
    const newSigners = [
      ...(config.signers || []),
      { email: '', name: '', order: (config.signers?.length || 0) + 1 },
    ];
    handleChange({ signers: newSigners });
  }, [config.signers, handleChange]);

  const removeSigner = useCallback((index: number) => {
    const newSigners = config.signers?.filter((_, i) => i !== index) || [];
    handleChange({ signers: newSigners });
  }, [config.signers, handleChange]);

  const updateSigner = useCallback((index: number, field: keyof HelloSignSigner, value: string | number) => {
    const newSigners = [...(config.signers || [])];
    newSigners[index] = { ...newSigners[index], [field]: value };
    handleChange({ signers: newSigners });
  }, [config.signers, handleChange]);

  const addFileUrl = useCallback(() => {
    const url = prompt('Enter document URL:');
    if (url) {
      const newFileUrls = [...(config.fileUrls || []), url];
      handleChange({ fileUrls: newFileUrls });
    }
  }, [config.fileUrls, handleChange]);

  const removeFileUrl = useCallback((index: number) => {
    const newFileUrls = config.fileUrls?.filter((_, i) => i !== index) || [];
    handleChange({ fileUrls: newFileUrls });
  }, [config.fileUrls, handleChange]);

  return (
    <div className="space-y-4 max-h-[600px] overflow-y-auto">
      <div>
        <h3 className="text-lg font-semibold mb-2">HelloSign (Dropbox Sign)</h3>
        <p className="text-sm text-gray-600 mb-4">
          Send, track, and manage electronic signatures
        </p>
      </div>

      {/* Operation Selection */}
      <div>
        <label className="block text-sm font-medium mb-1">Operation</label>
        <select
          className="w-full p-2 border rounded"
          value={config.operation}
          onChange={(e) => handleChange({ operation: e.target.value as HelloSignConfig['operation'] })}
        >
          <optgroup label="Signature Requests">
            <option value="sendSignatureRequest">Send Signature Request</option>
            <option value="sendWithTemplate">Send with Template</option>
            <option value="getSignatureRequest">Get Signature Request</option>
            <option value="cancelSignatureRequest">Cancel Signature Request</option>
            <option value="downloadFiles">Download Signed Files</option>
            <option value="listSignatureRequests">List Signature Requests</option>
          </optgroup>
        </select>
      </div>

      {/* API Key */}
      <div>
        <label className="block text-sm font-medium mb-1">API Key *</label>
        <input
          type="password"
          className="w-full p-2 border rounded text-sm"
          value={config.apiKey}
          onChange={(e) => handleChange({ apiKey: e.target.value })}
          placeholder="Your HelloSign API Key"
        />
        <p className="text-xs text-gray-500 mt-1">
          Get your API key from <a href="https://app.hellosign.com/home/myAccount#api" target="_blank" rel="noopener noreferrer" className="text-blue-500">HelloSign Settings</a>
        </p>
      </div>

      {/* Send Signature Request Fields */}
      {config.operation === 'sendSignatureRequest' && (
        <div className="border-t pt-4 space-y-3">
          <h4 className="text-sm font-medium">Signature Request Details</h4>

          <div>
            <label className="block text-xs mb-1">Title *</label>
            <input
              type="text"
              className="w-full p-2 border rounded text-sm"
              value={config.title || ''}
              onChange={(e) => handleChange({ title: e.target.value })}
              placeholder="NDA Agreement"
            />
          </div>

          <div>
            <label className="block text-xs mb-1">Subject</label>
            <input
              type="text"
              className="w-full p-2 border rounded text-sm"
              value={config.subject || ''}
              onChange={(e) => handleChange({ subject: e.target.value })}
              placeholder="Please sign this document"
            />
          </div>

          <div>
            <label className="block text-xs mb-1">Message</label>
            <textarea
              className="w-full p-2 border rounded text-sm"
              rows={3}
              value={config.message || ''}
              onChange={(e) => handleChange({ message: e.target.value })}
              placeholder="Hi, please review and sign this document..."
            />
          </div>

          {/* Signers */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-medium">Signers *</label>
              <button
                type="button"
                onClick={addSigner}
                className="text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                + Add Signer
              </button>
            </div>

            {config.signers && config.signers.length > 0 ? (
              <div className="space-y-2">
                {config.signers.map((signer, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs font-medium">Signer {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeSigner(index)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs mb-1">Name *</label>
                        <input
                          type="text"
                          className="w-full p-2 border rounded text-sm"
                          value={signer.name}
                          onChange={(e) => updateSigner(index, 'name', e.target.value)}
                          placeholder="John Doe"
                        />
                      </div>

                      <div>
                        <label className="block text-xs mb-1">Email *</label>
                        <input
                          type="email"
                          className="w-full p-2 border rounded text-sm"
                          value={signer.email}
                          onChange={(e) => updateSigner(index, 'email', e.target.value)}
                          placeholder="john@example.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs mb-1">Signing Order</label>
                      <input
                        type="number"
                        min="1"
                        className="w-full p-2 border rounded text-sm"
                        value={signer.order || ''}
                        onChange={(e) => updateSigner(index, 'order', parseInt(e.target.value) || 0)}
                        placeholder="Order (optional)"
                      />
                      <p className="text-xs text-gray-500 mt-1">Leave empty for parallel signing</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No signers. Add at least one signer.</p>
            )}
          </div>

          {/* CC Email Addresses */}
          <div>
            <label className="block text-xs mb-1">CC Email Addresses (Optional)</label>
            <input
              type="text"
              className="w-full p-2 border rounded text-sm"
              value={(config.ccEmailAddresses || []).join(', ')}
              onChange={(e) => handleChange({
                ccEmailAddresses: e.target.value.split(',').map(email => email.trim()).filter(Boolean)
              })}
              placeholder="email1@example.com, email2@example.com"
            />
            <p className="text-xs text-gray-500 mt-1">Comma-separated list of emails to CC</p>
          </div>

          {/* File URLs */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-medium">Documents *</label>
              <button
                type="button"
                onClick={addFileUrl}
                className="text-xs px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
              >
                + Add Document URL
              </button>
            </div>

            {config.fileUrls && config.fileUrls.length > 0 ? (
              <div className="space-y-1">
                {config.fileUrls.map((url, index) => (
                  <div key={index} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                    <span className="flex-1 text-sm font-mono truncate">{url}</span>
                    <button
                      type="button"
                      onClick={() => removeFileUrl(index)}
                      className="text-red-500 text-sm hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No documents. Add at least one document.</p>
            )}

            <div className="mt-2">
              <label className="block text-xs mb-1">Or Upload File (Base64)</label>
              <textarea
                className="w-full p-2 border rounded text-sm font-mono"
                rows={3}
                value={config.fileData || ''}
                onChange={(e) => handleChange({ fileData: e.target.value })}
                placeholder="data:application/pdf;base64,JVBERi0xLjQK..."
              />
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="test-mode"
                checked={config.testMode || false}
                onChange={(e) => handleChange({ testMode: e.target.checked })}
              />
              <label htmlFor="test-mode" className="text-sm">Test Mode (won't send real emails)</label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="use-text-tags"
                checked={config.useTextTags || false}
                onChange={(e) => handleChange({ useTextTags: e.target.checked })}
              />
              <label htmlFor="use-text-tags" className="text-sm">Use Text Tags for field placement</label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allow-decline"
                checked={config.allowDecline !== false}
                onChange={(e) => handleChange({ allowDecline: e.target.checked })}
              />
              <label htmlFor="allow-decline" className="text-sm">Allow signers to decline</label>
            </div>
          </div>
        </div>
      )}

      {/* Send with Template */}
      {config.operation === 'sendWithTemplate' && (
        <div className="border-t pt-4 space-y-3">
          <h4 className="text-sm font-medium">Template Signature Request</h4>

          <div>
            <label className="block text-xs mb-1">Template ID *</label>
            <input
              type="text"
              className="w-full p-2 border rounded text-sm"
              value={config.templateId || ''}
              onChange={(e) => handleChange({ templateId: e.target.value })}
              placeholder="template_xxxxxxxxxxxxxxxxx"
            />
          </div>

          <div>
            <label className="block text-xs mb-1">Template Data (JSON)</label>
            <textarea
              className="w-full p-2 border rounded text-sm font-mono"
              rows={6}
              value={JSON.stringify(config.templateData || {}, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  handleChange({ templateData: parsed });
                } catch {
                  // Invalid JSON
                }
              }}
              placeholder={'{\n  "company_name": "Acme Inc",\n  "contract_date": "2025-10-05"\n}'}
            />
            <p className="text-xs text-gray-500 mt-1">Custom fields defined in your template</p>
          </div>

          {/* Signers (required even for templates) */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-medium">Signers *</label>
              <button
                type="button"
                onClick={addSigner}
                className="text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                + Add Signer
              </button>
            </div>

            {config.signers && config.signers.length > 0 ? (
              <div className="space-y-2">
                {config.signers.map((signer, index) => (
                  <div key={index} className="bg-gray-50 p-2 rounded grid grid-cols-12 gap-2">
                    <input
                      type="text"
                      className="col-span-5 p-2 border rounded text-sm"
                      value={signer.name}
                      onChange={(e) => updateSigner(index, 'name', e.target.value)}
                      placeholder="Name"
                    />
                    <input
                      type="email"
                      className="col-span-6 p-2 border rounded text-sm"
                      value={signer.email}
                      onChange={(e) => updateSigner(index, 'email', e.target.value)}
                      placeholder="Email"
                    />
                    <button
                      type="button"
                      onClick={() => removeSigner(index)}
                      className="col-span-1 text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No signers</p>
            )}
          </div>
        </div>
      )}

      {/* Get/Cancel/Download Signature Request */}
      {['getSignatureRequest', 'cancelSignatureRequest', 'downloadFiles'].includes(config.operation) && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-2">Signature Request ID</h4>

          <div>
            <label className="block text-xs mb-1">Signature Request ID *</label>
            <input
              type="text"
              className="w-full p-2 border rounded text-sm"
              value={config.signatureRequestId || ''}
              onChange={(e) => handleChange({ signatureRequestId: e.target.value })}
              placeholder="signature_request_xxxxxxxxxxxxxxxxx"
            />
            <p className="text-xs text-gray-500 mt-1">
              {config.operation === 'downloadFiles' && 'Downloads all signed documents as a ZIP file'}
            </p>
          </div>
        </div>
      )}

      {/* List Signature Requests */}
      {config.operation === 'listSignatureRequests' && (
        <div className="border-t pt-4 space-y-3">
          <h4 className="text-sm font-medium">List Options</h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1">Page Number</label>
              <input
                type="number"
                min="1"
                className="w-full p-2 border rounded text-sm"
                value={config.page || 1}
                onChange={(e) => handleChange({ page: parseInt(e.target.value) || 1 })}
              />
            </div>

            <div>
              <label className="block text-xs mb-1">Page Size</label>
              <input
                type="number"
                min="1"
                max="100"
                className="w-full p-2 border rounded text-sm"
                value={config.pageSize || 20}
                onChange={(e) => handleChange({ pageSize: parseInt(e.target.value) || 20 })}
              />
            </div>
          </div>
        </div>
      )}

      {/* Documentation */}
      <div className="text-xs text-gray-500 mt-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
        <strong>📚 HelloSign API:</strong> Dropbox Sign (formerly HelloSign) provides legally binding e-signatures.
        Test mode allows development without sending real signature requests.
      </div>
    </div>
  );
};

export default HelloSignConfig;
