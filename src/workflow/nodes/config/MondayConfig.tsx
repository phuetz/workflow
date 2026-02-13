/** Monday.com Config */
import React from 'react';

export function MondayConfig(): React.ReactElement {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Operation</label>
        <select className="w-full border rounded px-3 py-2">
          <option value="createItem">Create Item</option>
          <option value="updateItem">Update Item</option>
          <option value="getItem">Get Item</option>
          <option value="deleteItem">Delete Item</option>
          <option value="createBoard">Create Board</option>
          <option value="getBoard">Get Board</option>
          <option value="createUpdate">Create Update (Comment)</option>
          <option value="getUpdates">Get Updates</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Board ID</label>
        <input
          type="text"
          placeholder="1234567890"
          className="w-full border rounded px-3 py-2"
        />
        <p className="text-xs text-gray-500 mt-1">
          Board ID (required for most operations)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Item Name</label>
        <input
          type="text"
          placeholder="New task"
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Column Values (JSON)</label>
        <textarea
          placeholder='{"status": "Working on it", "date": "2024-01-15"}'
          className="w-full border rounded px-3 py-2 font-mono text-sm"
          rows={4}
        />
        <p className="text-xs text-gray-500 mt-1">
          Column values as JSON object. Keys are column IDs or titles.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Group ID (Optional)</label>
        <input
          type="text"
          placeholder="topics"
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded p-3">
        <p className="text-sm font-medium mb-1">Quick Examples:</p>
        <div className="text-xs space-y-1">
          <p><strong>Create Item:</strong> board_id + item_name + column_values</p>
          <p><strong>Update Item:</strong> item_id + board_id + column_values</p>
          <p><strong>Get Item:</strong> item_id</p>
          <p><strong>Create Board:</strong> board_name + board_kind (public/private)</p>
        </div>
      </div>

      <div className="text-xs text-gray-600">
        <a
          href="https://developer.monday.com/api-reference/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Monday.com API Documentation
        </a>
        {' • '}
        <a
          href="https://developer.monday.com/api-reference/docs/column-types"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Column Types Reference
        </a>
      </div>
    </div>
  );
}
