import React, { useState } from 'react';
import { WorkflowNode } from '../../../types/workflow';

interface QuickBooksConfigProps {
  node: WorkflowNode;
  onChange: (config: Record<string, unknown>) => void;
}

interface QuickBooksConfig {
  operation: 'createInvoice' | 'createCustomer' | 'createPayment' | 'getInvoice' | 'listCustomers' | 'createBill';
  companyId?: string;
  customerId?: string;
  invoiceData?: {
    lineItems?: Array<{
      description: string;
      amount: number;
      quantity: number;
    }>;
    dueDate?: string;
    terms?: string;
  };
  customerData?: {
    displayName: string;
    email?: string;
    phone?: string;
    billAddr?: {
      line1?: string;
      city?: string;
      country?: string;
      postalCode?: string;
    };
  };
  paymentData?: {
    totalAmount?: number;
    customerRef?: string;
    paymentMethod?: string;
  };
  credentials?: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    realmId: string;
  };
}

export const QuickBooksConfig: React.FC<QuickBooksConfigProps> = ({ node, onChange }) => {
  const [config, setConfig] = useState<QuickBooksConfig>(
    (node.data.config as unknown as QuickBooksConfig) || {
      operation: 'listCustomers',
      credentials: {
        clientId: '',
        clientSecret: '',
        refreshToken: '',
        realmId: ''
      }
    }
  );

  const handleChange = (updates: Partial<QuickBooksConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onChange(newConfig);
  };

  const handleCredentialChange = (field: keyof NonNullable<QuickBooksConfig['credentials']>, value: string) => {
    const newCredentials = { ...config.credentials, [field]: value };
    handleChange({ credentials: newCredentials as QuickBooksConfig['credentials'] });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">QuickBooks Online Configuration</h3>
        <p className="text-sm text-gray-600 mb-4">
          Integrate with QuickBooks Online for accounting and invoicing
        </p>
      </div>

      {/* Operation Selection */}
      <div>
        <label className="block text-sm font-medium mb-1">Operation</label>
        <select
          className="w-full p-2 border rounded"
          value={config.operation}
          onChange={(e) => handleChange({ operation: e.target.value as QuickBooksConfig['operation'] })}
        >
          <option value="listCustomers">List Customers</option>
          <option value="createCustomer">Create Customer</option>
          <option value="getInvoice">Get Invoice</option>
          <option value="createInvoice">Create Invoice</option>
          <option value="createPayment">Create Payment</option>
          <option value="createBill">Create Bill</option>
        </select>
      </div>

      {/* Credentials */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium mb-2">API Credentials</h4>

        <div className="space-y-2">
          <div>
            <label className="block text-sm mb-1">Client ID</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              value={config.credentials?.clientId || ''}
              onChange={(e) => handleCredentialChange('clientId', e.target.value)}
              placeholder="Your QuickBooks Client ID"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Client Secret</label>
            <input
              type="password"
              className="w-full p-2 border rounded"
              value={config.credentials?.clientSecret || ''}
              onChange={(e) => handleCredentialChange('clientSecret', e.target.value)}
              placeholder="Your QuickBooks Client Secret"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Refresh Token</label>
            <input
              type="password"
              className="w-full p-2 border rounded"
              value={config.credentials?.refreshToken || ''}
              onChange={(e) => handleCredentialChange('refreshToken', e.target.value)}
              placeholder="OAuth Refresh Token"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Realm ID (Company ID)</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              value={config.credentials?.realmId || ''}
              onChange={(e) => handleCredentialChange('realmId', e.target.value)}
              placeholder="Your Company Realm ID"
            />
          </div>
        </div>
      </div>

      {/* Operation-specific fields */}
      {config.operation === 'createCustomer' && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-2">Customer Information</h4>
          <div className="space-y-2">
            <div>
              <label className="block text-sm mb-1">Display Name</label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                placeholder="Customer Display Name"
                value={config.customerData?.displayName || ''}
                onChange={(e) => handleChange({
                  customerData: { ...config.customerData, displayName: e.target.value }
                })}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input
                type="email"
                className="w-full p-2 border rounded"
                placeholder="customer@example.com"
                value={config.customerData?.email || ''}
                onChange={(e) => handleChange({
                  customerData: { ...config.customerData, email: e.target.value }
                })}
              />
            </div>
          </div>
        </div>
      )}

      {config.operation === 'createInvoice' && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-2">Invoice Information</h4>
          <div className="space-y-2">
            <div>
              <label className="block text-sm mb-1">Customer ID</label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                placeholder="Customer Reference ID"
                value={config.customerId || ''}
                onChange={(e) => handleChange({ customerId: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Due Date</label>
              <input
                type="date"
                className="w-full p-2 border rounded"
                value={config.invoiceData?.dueDate || ''}
                onChange={(e) => handleChange({
                  invoiceData: { ...config.invoiceData, dueDate: e.target.value }
                })}
              />
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 mt-4 p-3 bg-blue-50 rounded">
        <strong>Note:</strong> You need to set up OAuth 2.0 authentication with QuickBooks Online.
        Get your credentials from the <a
          href="https://developer.intuit.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Intuit Developer Portal
        </a>.
      </div>
    </div>
  );
};
