/** ClickUp Config */
import React from 'react';

export function ClickUpConfig(): React.ReactElement {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Operation</label>
        <select className="w-full border rounded px-3 py-2">
          <option value="createTask">Create Task</option>
          <option value="updateTask">Update Task</option>
          <option value="getTask">Get Task</option>
          <option value="deleteTask">Delete Task</option>
          <option value="getTasks">Get Tasks (List)</option>
          <option value="createList">Create List</option>
          <option value="getList">Get List</option>
          <option value="createFolder">Create Folder</option>
          <option value="getFolder">Get Folder</option>
          <option value="createComment">Create Comment</option>
          <option value="getSpaces">Get Spaces</option>
          <option value="createSpace">Create Space</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">List ID</label>
        <input
          type="text"
          placeholder="123456789"
          className="w-full border rounded px-3 py-2"
        />
        <p className="text-xs text-gray-500 mt-1">
          Required for task operations. Find it in the ClickUp URL.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Task Name</label>
        <input
          type="text"
          placeholder="Complete project documentation"
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          placeholder="Task description with details..."
          className="w-full border rounded px-3 py-2"
          rows={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Status</label>
        <input
          type="text"
          placeholder="in progress"
          className="w-full border rounded px-3 py-2"
        />
        <p className="text-xs text-gray-500 mt-1">
          Status name (case-insensitive). Examples: to do, in progress, complete
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Priority</label>
        <select className="w-full border rounded px-3 py-2">
          <option value="">None</option>
          <option value="1">Urgent (1)</option>
          <option value="2">High (2)</option>
          <option value="3">Normal (3)</option>
          <option value="4">Low (4)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Assignees (User IDs)</label>
        <input
          type="text"
          placeholder="123456,789012"
          className="w-full border rounded px-3 py-2"
        />
        <p className="text-xs text-gray-500 mt-1">
          Comma-separated user IDs
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Tags</label>
        <input
          type="text"
          placeholder="bug,urgent,frontend"
          className="w-full border rounded px-3 py-2"
        />
        <p className="text-xs text-gray-500 mt-1">
          Comma-separated tag names
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded p-3">
        <p className="text-sm font-medium mb-1">Quick Tips:</p>
        <div className="text-xs space-y-1">
          <p><strong>Create Task:</strong> list_id + name required</p>
          <p><strong>Priorities:</strong> 1=Urgent, 2=High, 3=Normal, 4=Low</p>
          <p><strong>Due Date:</strong> Unix timestamp in milliseconds</p>
          <p><strong>Team ID:</strong> Can be set in credentials for getSpaces</p>
        </div>
      </div>

      <div className="text-xs text-gray-600">
        <a
          href="https://clickup.com/api"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          ClickUp API Documentation
        </a>
        {' • '}
        <a
          href="https://clickup.com/api/developer-portal/authentication"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Authentication Guide
        </a>
      </div>
    </div>
  );
}
