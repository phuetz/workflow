/**
 * WooCommerce Node Configuration
 * WordPress e-commerce for products and orders
 */

import React, { useState } from 'react';
import type { WooCommerceOperation } from '../../../integrations/woocommerce/woocommerce.types';

interface WooCommerceConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const WooCommerceConfig: React.FC<WooCommerceConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<WooCommerceOperation>(
    (config.operation as WooCommerceOperation) || 'createProduct'
  );
  const [resource, setResource] = useState<'product' | 'order'>(
    (config.resource as 'product' | 'order') || 'product'
  );
  const [recordId, setRecordId] = useState(config.recordId as string || '');
  const [data, setData] = useState(config.data as Record<string, unknown> || {});
  const [dataInput, setDataInput] = useState('');

  const handleOperationChange = (newOperation: WooCommerceOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleResourceChange = (newResource: 'product' | 'order') => {
    setResource(newResource);
    const opMap = {
      product: 'createProduct',
      order: 'getOrder'
    };
    handleOperationChange(opMap[newResource] as WooCommerceOperation);
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
        name: 'Premium WordPress Theme',
        type: 'simple',
        regular_price: '49.99',
        description: 'Professional WordPress theme with modern design',
        short_description: 'Modern WordPress theme',
        sku: 'WP-THEME-001',
        stock_quantity: 100,
        manage_stock: true,
        status: 'publish'
      });
    } else if (example === 'order') {
      handleResourceChange('order');
      handleOperationChange('updateOrder');
      handleRecordIdChange('{{ $json.id }}');
      handleDataChange({
        status: 'processing'
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
          onChange={(e) => handleResourceChange(e.target.value as 'product' | 'order')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-700"
        >
          <option value="product">Product</option>
          <option value="order">Order</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as WooCommerceOperation)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-700"
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
              <option value="getOrder">Get Order</option>
              <option value="listOrders">List Orders</option>
              <option value="updateOrder">Update Order Status</option>
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
            placeholder="123 or {{ $json.id }}"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-700"
          />
          <p className="text-xs text-gray-500 mt-1">
            WooCommerce record ID (supports expressions)
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
                placeholder='{"name": "Product Name", "regular_price": "29.99"}'
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-700 font-mono text-sm"
              />
              <button
                onClick={addData}
                className="px-4 py-2 bg-purple-700 text-white rounded hover:bg-purple-800"
              >
                Add
              </button>
            </div>
            <p className="text-xs text-gray-500">
              {resource === 'product' && 'Common: name (required), type, regular_price, description, sku, stock_quantity, status'}
              {resource === 'order' && 'Common: status ("processing", "completed", "cancelled", etc.)'}
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
            Update Order Status
          </button>
        </div>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
        <p className="text-sm text-purple-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-purple-700">
          Requires Consumer Key and Consumer Secret. Configure in Credentials Manager with your WooCommerce store URL.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600 space-y-1">
          <div><strong>API Version:</strong> v3</div>
          <div><strong>Setup:</strong> Enable REST API in WooCommerce settings</div>
          <div><strong>URL Format:</strong> https://yourstore.com (no trailing slash)</div>
          <div><strong>Documentation:</strong> woocommerce.github.io/woocommerce-rest-api-docs</div>
        </p>
      </div>
    </div>
  );
};
