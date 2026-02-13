/**
 * PayPal Node Configuration
 * Payment processing and invoicing
 */

import React, { useState } from 'react';
import type { PayPalOperation } from '../../../integrations/paypal/paypal.types';

interface PayPalConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const PayPalConfig: React.FC<PayPalConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<PayPalOperation>(
    (config.operation as PayPalOperation) || 'createOrder'
  );
  const [amount, setAmount] = useState(config.amount as string || '');
  const [currency, setCurrency] = useState(config.currency as string || 'USD');
  const [data, setData] = useState(config.data as Record<string, unknown> || {});
  const [dataInput, setDataInput] = useState('');

  const handleOperationChange = (newOperation: PayPalOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
    onChange({ ...config, amount: value });
  };

  const handleCurrencyChange = (value: string) => {
    setCurrency(value);
    onChange({ ...config, currency: value });
  };

  const handleDataChange = (newData: Record<string, unknown>) => {
    setData(newData);
    onChange({ ...config, data: newData });
  };

  const addData = () => {
    try {
      const parsed = JSON.parse(dataInput);
      handleDataChange({ ...data, ...parsed });
      setDataInput('');
    } catch {
      // Invalid JSON, ignore
    }
  };

  const loadExample = (example: 'order' | 'payment' | 'invoice') => {
    if (example === 'order') {
      handleOperationChange('createOrder');
      handleAmountChange('100.00');
      handleCurrencyChange('USD');
      handleDataChange({
        intent: 'CAPTURE',
        description: 'Premium subscription payment'
      });
    } else if (example === 'payment') {
      handleOperationChange('createPayment');
      handleAmountChange('50.00');
      handleCurrencyChange('USD');
      handleDataChange({
        intent: 'sale',
        description: 'Product purchase',
        redirect_urls: {
          return_url: 'https://example.com/success',
          cancel_url: 'https://example.com/cancel'
        }
      });
    } else if (example === 'invoice') {
      handleOperationChange('createInvoice');
      handleDataChange({
        detail: {
          invoice_number: 'INV-2024-001',
          currency_code: 'USD',
          note: 'Thank you for your business'
        },
        primary_recipients: [{
          billing_info: {
            email_address: 'customer@example.com',
            name: { given_name: 'John', surname: 'Doe' }
          }
        }],
        items: [{
          name: 'Consulting Services',
          quantity: '1',
          unit_amount: { currency_code: 'USD', value: '500.00' }
        }]
      });
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
          onChange={(e) => handleOperationChange(e.target.value as PayPalOperation)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-700"
        >
          <option value="createOrder">Create Order (v2)</option>
          <option value="captureOrder">Capture Order</option>
          <option value="createPayment">Create Payment (v1)</option>
          <option value="executePayment">Execute Payment</option>
          <option value="getPayment">Get Payment</option>
          <option value="createInvoice">Create Invoice</option>
          <option value="sendInvoice">Send Invoice</option>
          <option value="getInvoice">Get Invoice</option>
        </select>
      </div>

      {(operation === 'createOrder' || operation === 'createPayment') && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount
            </label>
            <input
              type="text"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="100.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-700"
            />
            <p className="text-xs text-gray-500 mt-1">
              Amount in decimal format (e.g., 100.00 for $100)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-700"
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="CAD">CAD - Canadian Dollar</option>
              <option value="AUD">AUD - Australian Dollar</option>
              <option value="JPY">JPY - Japanese Yen</option>
            </select>
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Additional Data
        </label>
        <div className="space-y-2">
          {Object.keys(data).length > 0 && (
            <div className="bg-gray-50 p-3 rounded border border-gray-200 max-h-64 overflow-y-auto">
              <pre className="text-xs overflow-x-auto">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={dataInput}
              onChange={(e) => setDataInput(e.target.value)}
              placeholder='{"description": "Product purchase", "intent": "CAPTURE"}'
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-700 font-mono text-sm"
            />
            <button
              onClick={addData}
              className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800"
            >
              Add
            </button>
          </div>
          <p className="text-xs text-gray-500">
            {operation.includes('Order') && 'Common: intent ("CAPTURE" or "AUTHORIZE"), description'}
            {operation.includes('Payment') && 'Common: intent, description, redirect_urls'}
            {operation.includes('Invoice') && 'Common: detail, primary_recipients, items'}
          </p>
        </div>
      </div>

      <div className="border-t pt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Quick Examples
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => loadExample('order')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Create Order
          </button>
          <button
            onClick={() => loadExample('payment')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Create Payment
          </button>
          <button
            onClick={() => loadExample('invoice')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Create Invoice
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm text-blue-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-blue-700">
          Requires Client ID and Client Secret. Configure in Credentials Manager. Choose sandbox mode for testing.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600 space-y-1">
          <div><strong>API Versions:</strong> v1 (Payments), v2 (Orders, Invoices)</div>
          <div><strong>Sandbox:</strong> Use sandbox credentials for testing</div>
          <div><strong>Documentation:</strong> developer.paypal.com/docs/api</div>
        </p>
      </div>
    </div>
  );
};
