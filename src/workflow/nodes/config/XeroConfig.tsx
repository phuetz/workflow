import React, { useState, useCallback } from 'react';
import { WorkflowNode } from '../../../types/workflow';

interface XeroConfigProps {
  node: WorkflowNode;
  onChange: (config: Record<string, unknown>) => void;
}

interface XeroCredentials {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  accessToken?: string;
  refreshToken?: string;
}

interface XeroLineItem {
  description: string;
  quantity: number;
  unitAmount: number;
  accountCode?: string;
  taxType?: string;
}

interface XeroConfig {
  operation:
    | 'createInvoice'
    | 'getInvoices'
    | 'createContact'
    | 'getContacts'
    | 'createPayment'
    | 'getAccounts'
    | 'createBankTransaction';
  credentials: XeroCredentials;

  // Invoice fields
  invoiceType?: 'ACCREC' | 'ACCPAY'; // Accounts Receivable or Payable
  contactId?: string;
  contactName?: string;
  date?: string;
  dueDate?: string;
  reference?: string;
  lineItems?: XeroLineItem[];
  status?: 'DRAFT' | 'SUBMITTED' | 'AUTHORISED';

  // Contact fields
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };

  // Payment fields
  invoiceId?: string;
  amount?: number;
  accountId?: string;
  paymentDate?: string;

  // Filter options
  where?: string;
  orderBy?: string;
  page?: number;
}

export const XeroConfig: React.FC<XeroConfigProps> = ({ node, onChange }) => {
  const [config, setConfig] = useState<XeroConfig>(
    (node.data.config as unknown as XeroConfig) || {
      operation: 'getInvoices',
      credentials: {
        clientId: '',
        clientSecret: '',
        tenantId: '',
      },
      invoiceType: 'ACCREC',
      status: 'DRAFT',
      lineItems: [],
    }
  );

  const handleChange = useCallback((updates: Partial<XeroConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onChange(newConfig);
  }, [config, onChange]);

  const addLineItem = useCallback(() => {
    const newLineItems = [
      ...(config.lineItems || []),
      {
        description: '',
        quantity: 1,
        unitAmount: 0,
        accountCode: '',
        taxType: 'NONE',
      },
    ];
    handleChange({ lineItems: newLineItems });
  }, [config.lineItems, handleChange]);

  const removeLineItem = useCallback((index: number) => {
    const newLineItems = config.lineItems?.filter((_, i) => i !== index) || [];
    handleChange({ lineItems: newLineItems });
  }, [config.lineItems, handleChange]);

  const updateLineItem = useCallback((index: number, field: keyof XeroLineItem, value: string | number) => {
    const newLineItems = [...(config.lineItems || [])];
    newLineItems[index] = { ...newLineItems[index], [field]: value };
    handleChange({ lineItems: newLineItems });
  }, [config.lineItems, handleChange]);

  return (
    <div className="space-y-4 max-h-[600px] overflow-y-auto">
      <div>
        <h3 className="text-lg font-semibold mb-2">Xero Integration</h3>
        <p className="text-sm text-gray-600 mb-4">
          Connect to Xero accounting platform for invoicing and financial operations
        </p>
      </div>

      {/* Operation Selection */}
      <div>
        <label className="block text-sm font-medium mb-1">Operation</label>
        <select
          className="w-full p-2 border rounded"
          value={config.operation}
          onChange={(e) => handleChange({ operation: e.target.value as XeroConfig['operation'] })}
        >
          <optgroup label="Invoices">
            <option value="createInvoice">Create Invoice</option>
            <option value="getInvoices">Get Invoices</option>
          </optgroup>
          <optgroup label="Contacts">
            <option value="createContact">Create Contact</option>
            <option value="getContacts">Get Contacts</option>
          </optgroup>
          <optgroup label="Payments">
            <option value="createPayment">Create Payment</option>
          </optgroup>
          <optgroup label="Other">
            <option value="getAccounts">Get Accounts</option>
            <option value="createBankTransaction">Create Bank Transaction</option>
          </optgroup>
        </select>
      </div>

      {/* Credentials */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium mb-2">OAuth 2.0 Credentials</h4>
        <div className="space-y-2">
          <div>
            <label className="block text-xs mb-1">Client ID</label>
            <input
              type="text"
              className="w-full p-2 border rounded text-sm"
              value={config.credentials.clientId}
              onChange={(e) => handleChange({
                credentials: { ...config.credentials, clientId: e.target.value }
              })}
              placeholder="Your Xero OAuth Client ID"
            />
          </div>

          <div>
            <label className="block text-xs mb-1">Client Secret</label>
            <input
              type="password"
              className="w-full p-2 border rounded text-sm"
              value={config.credentials.clientSecret}
              onChange={(e) => handleChange({
                credentials: { ...config.credentials, clientSecret: e.target.value }
              })}
              placeholder="Your Xero OAuth Client Secret"
            />
          </div>

          <div>
            <label className="block text-xs mb-1">Tenant ID (Organisation)</label>
            <input
              type="text"
              className="w-full p-2 border rounded text-sm"
              value={config.credentials.tenantId}
              onChange={(e) => handleChange({
                credentials: { ...config.credentials, tenantId: e.target.value }
              })}
              placeholder="Xero Tenant/Organisation ID"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Get credentials from <a href="https://developer.xero.com/app/manage" target="_blank" rel="noopener noreferrer" className="text-blue-500">Xero Developer Portal</a>
        </p>
      </div>

      {/* Create Invoice Fields */}
      {config.operation === 'createInvoice' && (
        <div className="border-t pt-4 space-y-3">
          <h4 className="text-sm font-medium">Invoice Details</h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1">Invoice Type</label>
              <select
                className="w-full p-2 border rounded text-sm"
                value={config.invoiceType || 'ACCREC'}
                onChange={(e) => handleChange({ invoiceType: e.target.value as 'ACCREC' | 'ACCPAY' })}
              >
                <option value="ACCREC">Accounts Receivable (Sales)</option>
                <option value="ACCPAY">Accounts Payable (Purchase)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs mb-1">Status</label>
              <select
                className="w-full p-2 border rounded text-sm"
                value={config.status || 'DRAFT'}
                onChange={(e) => handleChange({ status: e.target.value as XeroConfig['status'] })}
              >
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="AUTHORISED">Authorised</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1">Contact Name</label>
            <input
              type="text"
              className="w-full p-2 border rounded text-sm"
              value={config.contactName || ''}
              onChange={(e) => handleChange({ contactName: e.target.value })}
              placeholder="Customer/Supplier name"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1">Invoice Date</label>
              <input
                type="date"
                className="w-full p-2 border rounded text-sm"
                value={config.date || ''}
                onChange={(e) => handleChange({ date: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs mb-1">Due Date</label>
              <input
                type="date"
                className="w-full p-2 border rounded text-sm"
                value={config.dueDate || ''}
                onChange={(e) => handleChange({ dueDate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1">Reference (Optional)</label>
            <input
              type="text"
              className="w-full p-2 border rounded text-sm"
              value={config.reference || ''}
              onChange={(e) => handleChange({ reference: e.target.value })}
              placeholder="PO Number, Invoice Reference, etc."
            />
          </div>

          {/* Line Items */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-medium">Line Items</label>
              <button
                type="button"
                onClick={addLineItem}
                className="text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                + Add Line Item
              </button>
            </div>

            {config.lineItems && config.lineItems.length > 0 ? (
              <div className="space-y-2">
                {config.lineItems.map((item, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs font-medium">Item {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>

                    <input
                      type="text"
                      className="w-full p-2 border rounded text-sm"
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      placeholder="Description"
                    />

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs mb-1">Quantity</label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full p-2 border rounded text-sm"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs mb-1">Unit Amount</label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full p-2 border rounded text-sm"
                          value={item.unitAmount}
                          onChange={(e) => updateLineItem(index, 'unitAmount', parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs mb-1">Total</label>
                        <input
                          type="text"
                          className="w-full p-2 border rounded text-sm bg-gray-100"
                          value={(item.quantity * item.unitAmount).toFixed(2)}
                          readOnly
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs mb-1">Account Code</label>
                        <input
                          type="text"
                          className="w-full p-2 border rounded text-sm"
                          value={item.accountCode || ''}
                          onChange={(e) => updateLineItem(index, 'accountCode', e.target.value)}
                          placeholder="200 (Sales)"
                        />
                      </div>

                      <div>
                        <label className="block text-xs mb-1">Tax Type</label>
                        <select
                          className="w-full p-2 border rounded text-sm"
                          value={item.taxType || 'NONE'}
                          onChange={(e) => updateLineItem(index, 'taxType', e.target.value)}
                        >
                          <option value="NONE">No Tax</option>
                          <option value="OUTPUT2">GST on Income (15%)</option>
                          <option value="INPUT2">GST on Expenses (15%)</option>
                          <option value="EXEMPTOUTPUT">Exempt</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="bg-blue-50 p-2 rounded text-sm">
                  <strong>Invoice Total: </strong>
                  ${(config.lineItems.reduce((sum, item) => sum + (item.quantity * item.unitAmount), 0)).toFixed(2)}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No line items. Click "Add Line Item" to add products/services.</p>
            )}
          </div>
        </div>
      )}

      {/* Get Invoices Fields */}
      {config.operation === 'getInvoices' && (
        <div className="border-t pt-4 space-y-3">
          <h4 className="text-sm font-medium">Filter Options</h4>

          <div>
            <label className="block text-xs mb-1">Where Clause (Optional)</label>
            <input
              type="text"
              className="w-full p-2 border rounded text-sm"
              value={config.where || ''}
              onChange={(e) => handleChange({ where: e.target.value })}
              placeholder='Status=="AUTHORISED" AND Type=="ACCREC"'
            />
            <p className="text-xs text-gray-500 mt-1">
              Example: Status=="AUTHORISED", DueDate&gt;DateTime(2023,01,01)
            </p>
          </div>

          <div>
            <label className="block text-xs mb-1">Order By (Optional)</label>
            <input
              type="text"
              className="w-full p-2 border rounded text-sm"
              value={config.orderBy || ''}
              onChange={(e) => handleChange({ orderBy: e.target.value })}
              placeholder="DueDate DESC"
            />
          </div>

          <div>
            <label className="block text-xs mb-1">Page Number</label>
            <input
              type="number"
              min="1"
              className="w-full p-2 border rounded text-sm"
              value={config.page || 1}
              onChange={(e) => handleChange({ page: parseInt(e.target.value) || 1 })}
            />
            <p className="text-xs text-gray-500 mt-1">Xero returns 100 invoices per page</p>
          </div>
        </div>
      )}

      {/* Create Contact Fields */}
      {config.operation === 'createContact' && (
        <div className="border-t pt-4 space-y-3">
          <h4 className="text-sm font-medium">Contact Details</h4>

          <div>
            <label className="block text-xs mb-1">Contact Name *</label>
            <input
              type="text"
              className="w-full p-2 border rounded text-sm"
              value={config.contact?.name || ''}
              onChange={(e) => handleChange({
                contact: { ...config.contact, name: e.target.value }
              })}
              placeholder="Company or Person name"
            />
          </div>

          <div>
            <label className="block text-xs mb-1">Email</label>
            <input
              type="email"
              className="w-full p-2 border rounded text-sm"
              value={config.contact?.email || ''}
              onChange={(e) => handleChange({
                contact: { ...config.contact, email: e.target.value }
              })}
              placeholder="contact@example.com"
            />
          </div>

          <div>
            <label className="block text-xs mb-1">Phone</label>
            <input
              type="tel"
              className="w-full p-2 border rounded text-sm"
              value={config.contact?.phone || ''}
              onChange={(e) => handleChange({
                contact: { ...config.contact, phone: e.target.value }
              })}
              placeholder="+64 21 123 4567"
            />
          </div>

          <div>
            <label className="block text-xs mb-1">Address</label>
            <textarea
              className="w-full p-2 border rounded text-sm"
              rows={3}
              value={config.contact?.address || ''}
              onChange={(e) => handleChange({
                contact: { ...config.contact, address: e.target.value }
              })}
              placeholder="Street Address, City, Postal Code, Country"
            />
          </div>
        </div>
      )}

      {/* API Documentation */}
      <div className="text-xs text-gray-500 mt-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
        <strong>📚 Xero API:</strong> This integration uses the Xero Accounting API.
        Ensure your OAuth app has the required scopes: accounting.transactions, accounting.contacts
      </div>
    </div>
  );
};
