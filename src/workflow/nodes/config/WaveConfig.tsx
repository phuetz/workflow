import React, { useState, useCallback } from 'react';

interface WaveConfigProps {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

interface WaveProduct {
  name: string;
  description: string;
  unitPrice: number;
  isSold: boolean;
  isBought: boolean;
  incomeAccount?: string;
  expenseAccount?: string;
}

export const WaveConfig: React.FC<WaveConfigProps> = ({ config, onChange }) => {
  const [products, setProducts] = useState<WaveProduct[]>(
    config.products || []
  );

  const handleChange = useCallback((updates: Record<string, any>) => {
    onChange({ ...config, ...updates });
  }, [config, onChange]);

  const addProduct = useCallback(() => {
    const newProducts = [
      ...products,
      {
        name: '',
        description: '',
        unitPrice: 0,
        isSold: true,
        isBought: false,
        incomeAccount: '',
        expenseAccount: '',
      },
    ];
    setProducts(newProducts);
    handleChange({ products: newProducts });
  }, [products, handleChange]);

  const updateProduct = useCallback((index: number, updates: Partial<WaveProduct>) => {
    const newProducts = [...products];
    newProducts[index] = { ...newProducts[index], ...updates };
    setProducts(newProducts);
    handleChange({ products: newProducts });
  }, [products, handleChange]);

  const removeProduct = useCallback((index: number) => {
    const newProducts = products.filter((_, i) => i !== index);
    setProducts(newProducts);
    handleChange({ products: newProducts });
  }, [products, handleChange]);

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-gray-700 mb-2">
        Wave Configuration
      </div>

      {/* Authentication */}
      <div className="space-y-3 p-4 bg-gray-50 rounded-md">
        <div className="text-sm font-medium text-gray-700">API Authentication</div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Access Token
          </label>
          <input
            type="password"
            value={config.accessToken || ''}
            onChange={(e) => handleChange({ accessToken: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Your Wave Access Token"
          />
          <p className="mt-1 text-xs text-gray-500">
            Generate from Wave Apps & Integrations settings
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business ID
          </label>
          <input
            type="text"
            value={config.businessId || ''}
            onChange={(e) => handleChange({ businessId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Your Wave Business ID"
          />
        </div>
      </div>

      {/* Operation */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={config.operation || 'createInvoice'}
          onChange={(e) => handleChange({ operation: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <optgroup label="Invoices">
            <option value="createInvoice">Create Invoice</option>
            <option value="getInvoice">Get Invoice</option>
            <option value="updateInvoice">Update Invoice</option>
            <option value="sendInvoice">Send Invoice</option>
            <option value="listInvoices">List Invoices</option>
            <option value="deleteInvoice">Delete Invoice</option>
          </optgroup>
          <optgroup label="Customers">
            <option value="createCustomer">Create Customer</option>
            <option value="getCustomer">Get Customer</option>
            <option value="updateCustomer">Update Customer</option>
            <option value="listCustomers">List Customers</option>
          </optgroup>
          <optgroup label="Products">
            <option value="createProduct">Create Product</option>
            <option value="getProduct">Get Product</option>
            <option value="updateProduct">Update Product</option>
            <option value="listProducts">List Products</option>
            <option value="deleteProduct">Delete Product</option>
          </optgroup>
          <optgroup label="Payments">
            <option value="recordPayment">Record Payment</option>
            <option value="getPayment">Get Payment</option>
            <option value="listPayments">List Payments</option>
          </optgroup>
          <optgroup label="Accounts">
            <option value="getAccount">Get Account</option>
            <option value="listAccounts">List Accounts</option>
          </optgroup>
        </select>
      </div>

      {/* Invoice Operations */}
      {(config.operation === 'createInvoice' || config.operation === 'updateInvoice') && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">Invoice Details</div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer ID
            </label>
            <input
              type="text"
              value={config.customerId || ''}
              onChange={(e) => handleChange({ customerId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Customer ID"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Date
              </label>
              <input
                type="date"
                value={config.invoiceDate || ''}
                onChange={(e) => handleChange({ invoiceDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={config.dueDate || ''}
                onChange={(e) => handleChange({ dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invoice Number
            </label>
            <input
              type="text"
              value={config.invoiceNumber || ''}
              onChange={(e) => handleChange({ invoiceNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Auto-generated if empty"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PO Number
            </label>
            <input
              type="text"
              value={config.poNumber || ''}
              onChange={(e) => handleChange({ poNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Purchase Order Number (optional)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={config.title || ''}
              onChange={(e) => handleChange({ title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Invoice Title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sub Heading
            </label>
            <input
              type="text"
              value={config.subHeading || ''}
              onChange={(e) => handleChange({ subHeading: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Subheading (optional)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Footer
            </label>
            <textarea
              value={config.footer || ''}
              onChange={(e) => handleChange({ footer: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={2}
              placeholder="Thank you for your business!"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Memo
            </label>
            <textarea
              value={config.memo || ''}
              onChange={(e) => handleChange({ memo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={2}
              placeholder="Internal notes..."
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="disableCreditCardPayments"
              checked={config.disableCreditCardPayments || false}
              onChange={(e) => handleChange({ disableCreditCardPayments: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="disableCreditCardPayments" className="text-sm text-gray-700">
              Disable Credit Card Payments
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="disableBankPayments"
              checked={config.disableBankPayments || false}
              onChange={(e) => handleChange({ disableBankPayments: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="disableBankPayments" className="text-sm text-gray-700">
              Disable Bank Payments
            </label>
          </div>
        </div>
      )}

      {/* Get/Update/Delete/Send Invoice */}
      {(config.operation === 'getInvoice' ||
        config.operation === 'updateInvoice' ||
        config.operation === 'deleteInvoice' ||
        config.operation === 'sendInvoice') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Invoice ID
          </label>
          <input
            type="text"
            value={config.invoiceId || ''}
            onChange={(e) => handleChange({ invoiceId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Invoice ID"
          />
        </div>
      )}

      {/* Send Invoice */}
      {config.operation === 'sendInvoice' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Email
            </label>
            <input
              type="email"
              value={config.toEmail || ''}
              onChange={(e) => handleChange({ toEmail: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="customer@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <input
              type="text"
              value={config.subject || ''}
              onChange={(e) => handleChange({ subject: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Invoice from [Your Company]"
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
              placeholder="Email message to customer..."
            />
          </div>
        </div>
      )}

      {/* Customer Operations */}
      {(config.operation === 'createCustomer' || config.operation === 'updateCustomer') && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">Customer Details</div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={config.name || ''}
              onChange={(e) => handleChange({ name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Customer Name"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                value={config.firstName || ''}
                onChange={(e) => handleChange({ firstName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={config.lastName || ''}
                onChange={(e) => handleChange({ lastName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={config.email || ''}
              onChange={(e) => handleChange({ email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={config.phone || ''}
                onChange={(e) => handleChange({ phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mobile
              </label>
              <input
                type="tel"
                value={config.mobile || ''}
                onChange={(e) => handleChange({ mobile: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Website
            </label>
            <input
              type="url"
              value={config.website || ''}
              onChange={(e) => handleChange({ website: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="https://example.com"
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Address</div>

            <div>
              <input
                type="text"
                value={config.addressLine1 || ''}
                onChange={(e) => handleChange({ addressLine1: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Address Line 1"
              />
            </div>

            <div>
              <input
                type="text"
                value={config.addressLine2 || ''}
                onChange={(e) => handleChange({ addressLine2: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Address Line 2 (optional)"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={config.city || ''}
                onChange={(e) => handleChange({ city: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="City"
              />

              <input
                type="text"
                value={config.province || ''}
                onChange={(e) => handleChange({ province: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="State/Province"
              />

              <input
                type="text"
                value={config.postalCode || ''}
                onChange={(e) => handleChange({ postalCode: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Postal Code"
              />
            </div>

            <div>
              <select
                value={config.country || 'US'}
                onChange={(e) => handleChange({ country: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
                <option value="AU">Australia</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Get/Update Customer */}
      {(config.operation === 'getCustomer' || config.operation === 'updateCustomer') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer ID
          </label>
          <input
            type="text"
            value={config.customerIdParam || ''}
            onChange={(e) => handleChange({ customerIdParam: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Customer ID"
          />
        </div>
      )}

      {/* Product Operations */}
      {(config.operation === 'createProduct' || config.operation === 'updateProduct') && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">Product Details</div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Name
            </label>
            <input
              type="text"
              value={config.productName || ''}
              onChange={(e) => handleChange({ productName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Product or Service Name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={config.description || ''}
              onChange={(e) => handleChange({ description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit Price
            </label>
            <input
              type="number"
              value={config.unitPrice || ''}
              onChange={(e) => handleChange({ unitPrice: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              step="0.01"
            />
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isSold"
                checked={config.isSold !== false}
                onChange={(e) => handleChange({ isSold: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="isSold" className="text-sm text-gray-700">
                I sell this
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isBought"
                checked={config.isBought || false}
                onChange={(e) => handleChange({ isBought: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="isBought" className="text-sm text-gray-700">
                I buy this
              </label>
            </div>
          </div>

          {config.isSold !== false && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Income Account
              </label>
              <input
                type="text"
                value={config.incomeAccount || ''}
                onChange={(e) => handleChange({ incomeAccount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Sales account ID"
              />
            </div>
          )}

          {config.isBought && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expense Account
              </label>
              <input
                type="text"
                value={config.expenseAccount || ''}
                onChange={(e) => handleChange({ expenseAccount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Expense account ID"
              />
            </div>
          )}
        </div>
      )}

      {/* Get/Update/Delete Product */}
      {(config.operation === 'getProduct' ||
        config.operation === 'updateProduct' ||
        config.operation === 'deleteProduct') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Product ID
          </label>
          <input
            type="text"
            value={config.productId || ''}
            onChange={(e) => handleChange({ productId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Product ID"
          />
        </div>
      )}

      {/* Payment Operations */}
      {config.operation === 'recordPayment' && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">Payment Details</div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invoice ID
            </label>
            <input
              type="text"
              value={config.invoiceIdForPayment || ''}
              onChange={(e) => handleChange({ invoiceIdForPayment: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Invoice ID to apply payment to"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount
            </label>
            <input
              type="number"
              value={config.paymentAmount || ''}
              onChange={(e) => handleChange({ paymentAmount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={config.paymentDate || ''}
              onChange={(e) => handleChange({ paymentDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method
            </label>
            <select
              value={config.paymentMethod || 'cash'}
              onChange={(e) => handleChange({ paymentMethod: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="credit_card">Credit Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={config.paymentNotes || ''}
              onChange={(e) => handleChange({ paymentNotes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={2}
            />
          </div>
        </div>
      )}

      {/* Get Payment */}
      {config.operation === 'getPayment' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment ID
          </label>
          <input
            type="text"
            value={config.paymentId || ''}
            onChange={(e) => handleChange({ paymentId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Payment ID"
          />
        </div>
      )}

      {/* Get Account */}
      {config.operation === 'getAccount' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account ID
          </label>
          <input
            type="text"
            value={config.accountId || ''}
            onChange={(e) => handleChange({ accountId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Account ID"
          />
        </div>
      )}

      {/* Help Text */}
      <div className="mt-4 p-3 bg-blue-50 rounded-md">
        <div className="text-sm text-blue-800">
          <strong>Wave Integration</strong>
          <p className="mt-1 text-xs">
            Wave is free accounting software for small businesses. Includes invoicing, payments, and receipt scanning.
            Requires API access token from Wave Apps & Integrations.
          </p>
          <p className="mt-2 text-xs">
            <strong>Popular use cases:</strong> Create professional invoices, manage customers, track products/services, and record payments.
          </p>
        </div>
      </div>
    </div>
  );
};
