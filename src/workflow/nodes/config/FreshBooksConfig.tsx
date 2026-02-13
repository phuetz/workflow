import React, { useState, useCallback } from 'react';

interface FreshBooksConfigProps {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

interface FreshBooksLineItem {
  name: string;
  description: string;
  unitCost: number;
  quantity: number;
  taxName1?: string;
  taxAmount1?: number;
}

export const FreshBooksConfig: React.FC<FreshBooksConfigProps> = ({ config, onChange }) => {
  const [lineItems, setLineItems] = useState<FreshBooksLineItem[]>(
    config.lineItems || []
  );

  const handleChange = useCallback((updates: Record<string, any>) => {
    onChange({ ...config, ...updates });
  }, [config, onChange]);

  const addLineItem = useCallback(() => {
    const newLineItems = [
      ...lineItems,
      {
        name: '',
        description: '',
        unitCost: 0,
        quantity: 1,
        taxName1: '',
        taxAmount1: 0,
      },
    ];
    setLineItems(newLineItems);
    handleChange({ lineItems: newLineItems });
  }, [lineItems, handleChange]);

  const updateLineItem = useCallback((index: number, updates: Partial<FreshBooksLineItem>) => {
    const newLineItems = [...lineItems];
    newLineItems[index] = { ...newLineItems[index], ...updates };
    setLineItems(newLineItems);
    handleChange({ lineItems: newLineItems });
  }, [lineItems, handleChange]);

  const removeLineItem = useCallback((index: number) => {
    const newLineItems = lineItems.filter((_, i) => i !== index);
    setLineItems(newLineItems);
    handleChange({ lineItems: newLineItems });
  }, [lineItems, handleChange]);

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-gray-700 mb-2">
        FreshBooks Configuration
      </div>

      {/* Authentication */}
      <div className="space-y-3 p-4 bg-gray-50 rounded-md">
        <div className="text-sm font-medium text-gray-700">OAuth 2.0 Credentials</div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client ID
          </label>
          <input
            type="text"
            value={config.clientId || ''}
            onChange={(e) => handleChange({ clientId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Your FreshBooks Client ID"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client Secret
          </label>
          <input
            type="password"
            value={config.clientSecret || ''}
            onChange={(e) => handleChange({ clientSecret: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Your FreshBooks Client Secret"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Access Token
          </label>
          <input
            type="password"
            value={config.accessToken || ''}
            onChange={(e) => handleChange({ accessToken: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="OAuth Access Token"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Refresh Token
          </label>
          <input
            type="password"
            value={config.refreshToken || ''}
            onChange={(e) => handleChange({ refreshToken: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="OAuth Refresh Token"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account ID
          </label>
          <input
            type="text"
            value={config.accountId || ''}
            onChange={(e) => handleChange({ accountId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="FreshBooks Account ID"
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
            <option value="listInvoices">List Invoices</option>
            <option value="deleteInvoice">Delete Invoice</option>
          </optgroup>
          <optgroup label="Clients">
            <option value="createClient">Create Client</option>
            <option value="getClient">Get Client</option>
            <option value="updateClient">Update Client</option>
            <option value="listClients">List Clients</option>
          </optgroup>
          <optgroup label="Expenses">
            <option value="createExpense">Create Expense</option>
            <option value="getExpense">Get Expense</option>
            <option value="listExpenses">List Expenses</option>
          </optgroup>
          <optgroup label="Time Tracking">
            <option value="createTimeEntry">Create Time Entry</option>
            <option value="getTimeEntry">Get Time Entry</option>
            <option value="listTimeEntries">List Time Entries</option>
          </optgroup>
          <optgroup label="Payments">
            <option value="createPayment">Create Payment</option>
            <option value="getPayment">Get Payment</option>
            <option value="listPayments">List Payments</option>
          </optgroup>
        </select>
      </div>

      {/* Invoice Operations */}
      {(config.operation === 'createInvoice' || config.operation === 'updateInvoice') && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">Invoice Details</div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client ID
            </label>
            <input
              type="text"
              value={config.clientId || ''}
              onChange={(e) => handleChange({ clientId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Client ID"
            />
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
              placeholder="INV-001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Create Date
            </label>
            <input
              type="date"
              value={config.createDate || ''}
              onChange={(e) => handleChange({ createDate: e.target.value })}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Currency Code
            </label>
            <select
              value={config.currencyCode || 'USD'}
              onChange={(e) => handleChange({ currencyCode: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="USD">USD - US Dollar</option>
              <option value="CAD">CAD - Canadian Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="AUD">AUD - Australian Dollar</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={config.notes || ''}
              onChange={(e) => handleChange({ notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
              placeholder="Invoice notes..."
            />
          </div>

          {/* Line Items */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-gray-700">
                Line Items
              </label>
              <button
                onClick={addLineItem}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                + Add Item
              </button>
            </div>

            {lineItems.map((item, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-md space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Item {index + 1}</span>
                  <button
                    onClick={() => removeLineItem(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Name</label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateLineItem(index, { name: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      placeholder="Item name"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Description</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateLineItem(index, { description: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      placeholder="Description"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Unit Cost</label>
                    <input
                      type="number"
                      value={item.unitCost}
                      onChange={(e) => updateLineItem(index, { unitCost: parseFloat(e.target.value) })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, { quantity: parseInt(e.target.value) })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Tax Name</label>
                    <input
                      type="text"
                      value={item.taxName1 || ''}
                      onChange={(e) => updateLineItem(index, { taxName1: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      placeholder="e.g., GST"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Tax Amount</label>
                    <input
                      type="number"
                      value={item.taxAmount1 || 0}
                      onChange={(e) => updateLineItem(index, { taxAmount1: parseFloat(e.target.value) })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="text-xs text-gray-600">
                  Total: ${((item.unitCost * item.quantity) + (item.taxAmount1 || 0)).toFixed(2)}
                </div>
              </div>
            ))}

            {lineItems.length === 0 && (
              <div className="text-sm text-gray-500 text-center py-4">
                No line items added. Click "Add Item" to add invoice items.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Get/Update/Delete Invoice */}
      {(config.operation === 'getInvoice' ||
        config.operation === 'updateInvoice' ||
        config.operation === 'deleteInvoice') && (
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

      {/* Client Operations */}
      {(config.operation === 'createClient' || config.operation === 'updateClient') && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">Client Details</div>

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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization
            </label>
            <input
              type="text"
              value={config.organization || ''}
              onChange={(e) => handleChange({ organization: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

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
        </div>
      )}

      {/* Get/Update Client */}
      {(config.operation === 'getClient' || config.operation === 'updateClient') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client ID
          </label>
          <input
            type="text"
            value={config.clientIdParam || ''}
            onChange={(e) => handleChange({ clientIdParam: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Client ID"
          />
        </div>
      )}

      {/* Expense Operations */}
      {(config.operation === 'createExpense' || config.operation === 'getExpense') && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">Expense Details</div>

          {config.operation === 'createExpense' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={config.category || ''}
                  onChange={(e) => handleChange({ category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., Office Supplies"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  value={config.amount || ''}
                  onChange={(e) => handleChange({ amount: e.target.value })}
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
                  value={config.expenseDate || ''}
                  onChange={(e) => handleChange({ expenseDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor
                </label>
                <input
                  type="text"
                  value={config.vendor || ''}
                  onChange={(e) => handleChange({ vendor: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </>
          )}

          {config.operation === 'getExpense' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expense ID
              </label>
              <input
                type="text"
                value={config.expenseId || ''}
                onChange={(e) => handleChange({ expenseId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Expense ID"
              />
            </div>
          )}
        </div>
      )}

      {/* Time Entry Operations */}
      {config.operation === 'createTimeEntry' && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">Time Entry Details</div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project ID
            </label>
            <input
              type="text"
              value={config.projectId || ''}
              onChange={(e) => handleChange({ projectId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (hours)
            </label>
            <input
              type="number"
              value={config.duration || ''}
              onChange={(e) => handleChange({ duration: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              step="0.25"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note
            </label>
            <textarea
              value={config.note || ''}
              onChange={(e) => handleChange({ note: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
              placeholder="Description of work..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Started At
            </label>
            <input
              type="datetime-local"
              value={config.startedAt || ''}
              onChange={(e) => handleChange({ startedAt: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-4 p-3 bg-blue-50 rounded-md">
        <div className="text-sm text-blue-800">
          <strong>FreshBooks Integration</strong>
          <p className="mt-1 text-xs">
            FreshBooks is a cloud-based accounting software for invoicing, expense tracking, and time management.
            Requires OAuth 2.0 authentication.
          </p>
          <p className="mt-2 text-xs">
            <strong>Popular operations:</strong> Create invoices, track expenses, manage time entries, and handle client billing.
          </p>
        </div>
      </div>
    </div>
  );
};
