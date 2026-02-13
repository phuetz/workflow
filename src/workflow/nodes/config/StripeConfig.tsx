/**
 * Stripe Node Configuration
 * Payment processing for charges, customers, and subscriptions
 */

import React, { useState } from 'react';
import type { StripeOperation } from '../../../integrations/stripe/stripe.types';

interface StripeConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const StripeConfig: React.FC<StripeConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<StripeOperation>(
    (config.operation as StripeOperation) || 'createPaymentIntent'
  );
  const [amount, setAmount] = useState((config.amount as string) || '');
  const [currency, setCurrency] = useState((config.currency as string) || 'usd');
  const [customerId, setCustomerId] = useState((config.customerId as string) || '');
  const [data, setData] = useState((config.data as Record<string, unknown>) || {});
  const [dataInput, setDataInput] = useState('');

  const handleOperationChange = (newOperation: StripeOperation) => {
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

  const handleCustomerIdChange = (value: string) => {
    setCustomerId(value);
    onChange({ ...config, customerId: value });
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

  const loadExample = (example: 'payment' | 'customer' | 'subscription') => {
    if (example === 'payment') {
      handleOperationChange('createPaymentIntent');
      handleAmountChange('5000');
      handleCurrencyChange('usd');
      handleDataChange({
        description: 'Premium subscription payment',
        receipt_email: 'customer@example.com',
        metadata: { order_id: '12345' }
      });
    } else if (example === 'customer') {
      handleOperationChange('createCustomer');
      handleDataChange({
        email: 'customer@example.com',
        name: 'John Doe',
        phone: '+1234567890',
        description: 'Premium customer'
      });
    } else if (example === 'subscription') {
      handleOperationChange('createSubscription');
      handleCustomerIdChange('cus_XXXXXXXXXX');
      handleDataChange({
        items: [{ price: 'price_XXXXXXXXXX', quantity: 1 }],
        trial_period_days: 14
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
          onChange={(e) => handleOperationChange(e.target.value as StripeOperation)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-600"
        >
          <option value="createPaymentIntent">Create Payment Intent</option>
          <option value="confirmPaymentIntent">Confirm Payment Intent</option>
          <option value="createCharge">Create Charge</option>
          <option value="createCustomer">Create Customer</option>
          <option value="getCustomer">Get Customer</option>
          <option value="createSubscription">Create Subscription</option>
          <option value="cancelSubscription">Cancel Subscription</option>
          <option value="createRefund">Create Refund</option>
          <option value="getBalance">Get Balance</option>
        </select>
      </div>

      {(operation === 'createPaymentIntent' || operation === 'createCharge') && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount (in cents)
            </label>
            <input
              type="text"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="5000 = $50.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-600"
            />
            <p className="text-xs text-gray-500 mt-1">
              Amount in smallest currency unit (e.g., cents for USD)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-600"
            >
              <option value="usd">USD - US Dollar</option>
              <option value="eur">EUR - Euro</option>
              <option value="gbp">GBP - British Pound</option>
              <option value="cad">CAD - Canadian Dollar</option>
              <option value="aud">AUD - Australian Dollar</option>
              <option value="jpy">JPY - Japanese Yen</option>
            </select>
          </div>
        </>
      )}

      {(operation === 'createSubscription' || operation === 'getCustomer') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer ID
          </label>
          <input
            type="text"
            value={customerId}
            onChange={(e) => handleCustomerIdChange(e.target.value)}
            placeholder="cus_XXXXXXXXXX or {{ $json.customer_id }}"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-600"
          />
          <p className="text-xs text-gray-500 mt-1">
            Stripe customer ID (supports expressions)
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Additional Data (Optional)
        </label>
        <div className="space-y-2">
          {Object.keys(data).length > 0 && (
            <div className="bg-gray-50 p-3 rounded border border-gray-200 max-h-48 overflow-y-auto">
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
              placeholder='{"description": "Order #12345", "metadata": {"order_id": "12345"}}'
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-600 font-mono text-sm"
            />
            <button
              onClick={addData}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Add
            </button>
          </div>
          <p className="text-xs text-gray-500">
            {(operation === 'createPaymentIntent' || operation === 'confirmPaymentIntent') && 'Common: description, receipt_email, metadata, customer'}
            {(operation === 'createCustomer' || operation === 'getCustomer') && 'Common: email, name, phone, description, metadata'}
            {(operation === 'createSubscription' || operation === 'cancelSubscription') && 'Common: items, trial_period_days, metadata'}
          </p>
        </div>
      </div>

      <div className="border-t pt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Quick Examples
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => loadExample('payment')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Payment Intent
          </button>
          <button
            onClick={() => loadExample('customer')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Create Customer
          </button>
          <button
            onClick={() => loadExample('subscription')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Subscription
          </button>
        </div>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
        <p className="text-sm text-purple-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-purple-700">
          Requires Secret Key. Configure in Credentials Manager. Never expose your secret key in client-side code.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600 space-y-1">
          <div><strong>API Version:</strong> Latest (auto-versioned)</div>
          <div><strong>Rate Limits:</strong> 100 read requests/second, 100 write requests/second</div>
          <div><strong>Documentation:</strong> stripe.com/docs/api</div>
        </p>
      </div>
    </div>
  );
};
