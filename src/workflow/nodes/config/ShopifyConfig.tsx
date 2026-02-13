/**
 * Shopify Node Configuration
 * E-commerce platform for products and orders
 */

import React, { useState } from 'react';
import type { ShopifyOperation } from '../../../integrations/shopify/shopify.types';

interface ShopifyConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const ShopifyConfig: React.FC<ShopifyConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<ShopifyOperation>(
    (config.operation as ShopifyOperation) || 'createProduct'
  );
  const [resource, setResource] = useState<'product' | 'order' | 'customer'>(
    (config.resource as 'product' | 'order' | 'customer') || 'product'
  );
  const [recordId, setRecordId] = useState(config.recordId as string || '');
  const [data, setData] = useState(config.data as Record<string, unknown> || {});
  const [dataInput, setDataInput] = useState('');

  const handleOperationChange = (newOperation: ShopifyOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleResourceChange = (newResource: 'product' | 'order' | 'customer') => {
    setResource(newResource);
    const opMap = {
      product: 'createProduct',
      order: 'createOrder',
      customer: 'getCustomer'
    };
    handleOperationChange(opMap[newResource] as ShopifyOperation);
  };

  const handleRecordIdChange = (value: string) => {
    setRecordId(value);
    onChange({ ...config, recordId: value });
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

  const loadExample = (example: 'product' | 'order') => {
    if (example === 'product') {
      handleResourceChange('product');
      handleOperationChange('createProduct');
      handleDataChange({
        title: 'Premium T-Shirt',
        body_html: '<strong>Comfortable cotton t-shirt</strong>',
        vendor: 'Acme Clothing',
        product_type: 'Apparel',
        status: 'active',
        tags: 'clothing, shirts, premium',
        variants: [
          { price: '29.99', sku: 'TSHIRT-001', inventory_quantity: 100 }
        ]
      });
    } else if (example === 'order') {
      handleResourceChange('order');
      handleOperationChange('createOrder');
      handleDataChange({
        email: 'customer@example.com',
        line_items: [
          { title: 'Premium T-Shirt', quantity: 2, price: '29.99' }
        ],
        financial_status: 'paid',
        shipping_address: {
          first_name: 'John',
          last_name: 'Doe',
          address1: '123 Main St',
          city: 'San Francisco',
          province: 'CA',
          country: 'United States',
          zip: '94102'
        }
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Resource Type
        </label>
        <select
          value={resource}
          onChange={(e) => handleResourceChange(e.target.value as 'product' | 'order' | 'customer')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600"
        >
          <option value="product">Product</option>
          <option value="order">Order</option>
          <option value="customer">Customer</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as ShopifyOperation)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600"
        >
          {resource === 'product' && (
            <>
              <option value="createProduct">Create Product</option>
              <option value="updateProduct">Update Product</option>
              <option value="getProduct">Get Product</option>
              <option value="listProducts">List Products</option>
              <option value="deleteProduct">Delete Product</option>
            </>
          )}
          {resource === 'order' && (
            <>
              <option value="createOrder">Create Order</option>
              <option value="getOrder">Get Order</option>
              <option value="listOrders">List Orders</option>
            </>
          )}
          {resource === 'customer' && (
            <>
              <option value="getCustomer">Get Customer</option>
            </>
          )}
        </select>
      </div>

      {(operation.includes('update') || operation.includes('get')) && !operation.includes('list') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Record ID
          </label>
          <input
            type="text"
            value={recordId}
            onChange={(e) => handleRecordIdChange(e.target.value)}
            placeholder="1234567890 or {{ $json.id }}"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600"
          />
          <p className="text-xs text-gray-500 mt-1">
            Shopify record ID (supports expressions)
          </p>
        </div>
      )}

      {(operation.includes('create') || operation.includes('update')) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data
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
                placeholder='{"title": "Product Name", "price": "29.99"}'
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 font-mono text-sm"
              />
              <button
                onClick={addData}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Add
              </button>
            </div>
            <p className="text-xs text-gray-500">
              {resource === 'product' && 'Common: title (required), body_html, vendor, product_type, variants, status'}
              {resource === 'order' && 'Common: email, line_items (required), financial_status, shipping_address'}
            </p>
          </div>
        </div>
      )}

      <div className="border-t pt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Quick Examples
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => loadExample('product')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Create Product
          </button>
          <button
            onClick={() => loadExample('order')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Create Order
          </button>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-md p-3">
        <p className="text-sm text-green-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-green-700">
          Requires Access Token or API Key + Password. Configure in Credentials Manager with shop name.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600 space-y-1">
          <div><strong>API Version:</strong> 2024-01</div>
          <div><strong>Rate Limits:</strong> 2 requests/second (adjustable by plan)</div>
          <div><strong>Documentation:</strong> shopify.dev/docs/api/admin-rest</div>
        </p>
      </div>
    </div>
  );
};
