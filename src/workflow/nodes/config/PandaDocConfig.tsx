import React, { useState, useCallback } from 'react';

interface PandaDocConfigProps {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

interface PandaDocRecipient {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  signingOrder?: number;
}

export const PandaDocConfig: React.FC<PandaDocConfigProps> = ({ config, onChange }) => {
  const [recipients, setRecipients] = useState<PandaDocRecipient[]>(
    config.recipients || []
  );

  const handleChange = useCallback((updates: Record<string, any>) => {
    onChange({ ...config, ...updates });
  }, [config, onChange]);

  const addRecipient = useCallback(() => {
    const newRecipients = [
      ...recipients,
      {
        email: '',
        firstName: '',
        lastName: '',
        role: 'signer',
        signingOrder: recipients.length + 1,
      },
    ];
    setRecipients(newRecipients);
    handleChange({ recipients: newRecipients });
  }, [recipients, handleChange]);

  const updateRecipient = useCallback((index: number, updates: Partial<PandaDocRecipient>) => {
    const newRecipients = [...recipients];
    newRecipients[index] = { ...newRecipients[index], ...updates };
    setRecipients(newRecipients);
    handleChange({ recipients: newRecipients });
  }, [recipients, handleChange]);

  const removeRecipient = useCallback((index: number) => {
    const newRecipients = recipients.filter((_, i) => i !== index);
    setRecipients(newRecipients);
    handleChange({ recipients: newRecipients });
  }, [recipients, handleChange]);

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-gray-700 mb-2">
        PandaDoc Configuration
      </div>

      {/* Authentication */}
      <div className="space-y-3 p-4 bg-gray-50 rounded-md">
        <div className="text-sm font-medium text-gray-700">API Authentication</div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            API Key
          </label>
          <input
            type="password"
            value={config.apiKey || ''}
            onChange={(e) => handleChange({ apiKey: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Your PandaDoc API Key"
          />
          <p className="mt-1 text-xs text-gray-500">
            Get from PandaDoc Settings → Integrations → API
          </p>
        </div>
      </div>

      {/* Operation */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={config.operation || 'createFromTemplate'}
          onChange={(e) => handleChange({ operation: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <optgroup label="Documents">
            <option value="createFromTemplate">Create from Template</option>
            <option value="createFromPDF">Create from PDF</option>
            <option value="getDocument">Get Document</option>
            <option value="listDocuments">List Documents</option>
            <option value="sendDocument">Send Document</option>
            <option value="downloadDocument">Download Document</option>
            <option value="deleteDocument">Delete Document</option>
          </optgroup>
          <optgroup label="Templates">
            <option value="listTemplates">List Templates</option>
            <option value="getTemplate">Get Template</option>
          </optgroup>
          <optgroup label="Status">
            <option value="getDocumentStatus">Get Document Status</option>
            <option value="getDocumentDetails">Get Document Details</option>
          </optgroup>
        </select>
      </div>

      {/* Create from Template */}
      {config.operation === 'createFromTemplate' && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">Create Document from Template</div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template ID
            </label>
            <input
              type="text"
              value={config.templateId || ''}
              onChange={(e) => handleChange({ templateId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Template UUID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Name
            </label>
            <input
              type="text"
              value={config.documentName || ''}
              onChange={(e) => handleChange({ documentName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="My Document"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Folder UUID (optional)
            </label>
            <input
              type="text"
              value={config.folderUuid || ''}
              onChange={(e) => handleChange({ folderUuid: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Folder UUID"
            />
          </div>

          {/* Recipients */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-gray-700">
                Recipients
              </label>
              <button
                onClick={addRecipient}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                + Add Recipient
              </button>
            </div>

            {recipients.map((recipient, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-md space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Recipient {index + 1}</span>
                  <button
                    onClick={() => removeRecipient(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">First Name</label>
                    <input
                      type="text"
                      value={recipient.firstName}
                      onChange={(e) => updateRecipient(index, { firstName: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={recipient.lastName}
                      onChange={(e) => updateRecipient(index, { lastName: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Email</label>
                    <input
                      type="email"
                      value={recipient.email}
                      onChange={(e) => updateRecipient(index, { email: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Role</label>
                    <select
                      value={recipient.role}
                      onChange={(e) => updateRecipient(index, { role: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    >
                      <option value="signer">Signer</option>
                      <option value="approver">Approver</option>
                      <option value="cc">CC</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Signing Order</label>
                    <input
                      type="number"
                      value={recipient.signingOrder || index + 1}
                      onChange={(e) => updateRecipient(index, { signingOrder: parseInt(e.target.value) })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      min="1"
                    />
                  </div>
                </div>
              </div>
            ))}

            {recipients.length === 0 && (
              <div className="text-sm text-gray-500 text-center py-4">
                No recipients added. Click "Add Recipient" to add document recipients.
              </div>
            )}
          </div>

          {/* Tokens (variables) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Tokens (JSON)
            </label>
            <textarea
              value={config.tokens || ''}
              onChange={(e) => handleChange({ tokens: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
              rows={6}
              placeholder={'{\n  "customerName": "John Doe",\n  "amount": "1000.00",\n  "date": "2025-01-01"\n}'}
            />
            <p className="mt-1 text-xs text-gray-500">
              JSON object with template variable values
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="sendImmediately"
              checked={config.sendImmediately || false}
              onChange={(e) => handleChange({ sendImmediately: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="sendImmediately" className="text-sm text-gray-700">
              Send document immediately after creation
            </label>
          </div>
        </div>
      )}

      {/* Create from PDF */}
      {config.operation === 'createFromPDF' && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">Create Document from PDF</div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Name
            </label>
            <input
              type="text"
              value={config.documentName || ''}
              onChange={(e) => handleChange({ documentName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="My Document"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PDF URL
            </label>
            <input
              type="url"
              value={config.pdfUrl || ''}
              onChange={(e) => handleChange({ pdfUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="https://example.com/document.pdf"
            />
            <p className="mt-1 text-xs text-gray-500">
              Public URL to PDF file (or use base64 in request body)
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="parseFields"
              checked={config.parseFields !== false}
              onChange={(e) => handleChange({ parseFields: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="parseFields" className="text-sm text-gray-700">
              Parse form fields from PDF
            </label>
          </div>
        </div>
      )}

      {/* Get/Download/Delete Document */}
      {(config.operation === 'getDocument' ||
        config.operation === 'downloadDocument' ||
        config.operation === 'deleteDocument' ||
        config.operation === 'sendDocument' ||
        config.operation === 'getDocumentStatus' ||
        config.operation === 'getDocumentDetails') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Document ID
          </label>
          <input
            type="text"
            value={config.documentId || ''}
            onChange={(e) => handleChange({ documentId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Document UUID"
          />
        </div>
      )}

      {/* Send Document */}
      {config.operation === 'sendDocument' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <input
              type="text"
              value={config.subject || ''}
              onChange={(e) => handleChange({ subject: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Please sign this document"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              value={config.message || ''}
              onChange={(e) => handleChange({ message: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={4}
              placeholder="Email message to recipients..."
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="silent"
              checked={config.silent || false}
              onChange={(e) => handleChange({ silent: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="silent" className="text-sm text-gray-700">
              Silent mode (no email notification)
            </label>
          </div>
        </div>
      )}

      {/* Download Document */}
      {config.operation === 'downloadDocument' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Download Format
          </label>
          <select
            value={config.downloadFormat || 'pdf'}
            onChange={(e) => handleChange({ downloadFormat: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="pdf">PDF</option>
            <option value="original">Original</option>
          </select>
        </div>
      )}

      {/* Get Template */}
      {config.operation === 'getTemplate' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Template ID
          </label>
          <input
            type="text"
            value={config.templateId || ''}
            onChange={(e) => handleChange({ templateId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Template UUID"
          />
        </div>
      )}

      {/* List Documents */}
      {config.operation === 'listDocuments' && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">List Options</div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status Filter
              </label>
              <select
                value={config.statusFilter || 'all'}
                onChange={(e) => handleChange({ statusFilter: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="viewed">Viewed</option>
                <option value="waiting_approval">Waiting Approval</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="waiting_pay">Waiting Payment</option>
                <option value="paid">Paid</option>
                <option value="completed">Completed</option>
                <option value="voided">Voided</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Count
              </label>
              <input
                type="number"
                value={config.count || 100}
                onChange={(e) => handleChange({ count: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="1"
                max="100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Page
            </label>
            <input
              type="number"
              value={config.page || 1}
              onChange={(e) => handleChange({ page: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Order By
            </label>
            <select
              value={config.orderBy || 'date_created'}
              onChange={(e) => handleChange({ orderBy: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="date_created">Date Created</option>
              <option value="date_modified">Date Modified</option>
              <option value="name">Name</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort Direction
            </label>
            <select
              value={config.sortDirection || 'desc'}
              onChange={(e) => handleChange({ sortDirection: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
      )}

      {/* List Templates */}
      {config.operation === 'listTemplates' && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">List Options</div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Count
              </label>
              <input
                type="number"
                value={config.count || 100}
                onChange={(e) => handleChange({ count: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="1"
                max="100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Page
              </label>
              <input
                type="number"
                value={config.page || 1}
                onChange={(e) => handleChange({ page: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="1"
              />
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-4 p-3 bg-blue-50 rounded-md">
        <div className="text-sm text-blue-800">
          <strong>PandaDoc Integration</strong>
          <p className="mt-1 text-xs">
            PandaDoc is a document workflow automation platform for creating, sending, and tracking documents, proposals, quotes, and contracts.
            Requires API key from PandaDoc Settings.
          </p>
          <p className="mt-2 text-xs">
            <strong>Popular workflows:</strong> Create contracts from templates, send for e-signature, track document status, and automate approvals.
          </p>
        </div>
      </div>
    </div>
  );
};
