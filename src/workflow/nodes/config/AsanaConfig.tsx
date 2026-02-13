/**
 * Asana Node Configuration
 */

import React, { useState } from 'react';
import type { AsanaOperation } from '../../../integrations/asana/asana.types';
import type { NodeConfig } from '../../../types/workflow';

interface AsanaConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const AsanaConfig: React.FC<AsanaConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<AsanaOperation>(
    (config.operation as AsanaOperation) || 'createTask'
  );
  const [taskName, setTaskName] = useState((config.taskName as string) || '');
  const [notes, setNotes] = useState((config.notes as string) || '');
  const [assigneeGid, setAssigneeGid] = useState((config.assigneeGid as string) || '');
  const [dueDate, setDueDate] = useState((config.dueDate as string) || '');
  const [taskGid, setTaskGid] = useState((config.taskGid as string) || '');

  const handleOperationChange = (newOperation: AsanaOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleTaskNameChange = (value: string) => {
    setTaskName(value);
    onChange({ ...config, taskName: value });
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
    onChange({ ...config, notes: value });
  };

  const handleAssigneeGidChange = (value: string) => {
    setAssigneeGid(value);
    onChange({ ...config, assigneeGid: value });
  };

  const handleDueDateChange = (value: string) => {
    setDueDate(value);
    onChange({ ...config, dueDate: value });
  };

  const handleTaskGidChange = (value: string) => {
    setTaskGid(value);
    onChange({ ...config, taskGid: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as AsanaOperation)}
          className="w-full border border-gray-300 rounded-md px-3 py-2"
        >
          <optgroup label="Tasks">
            <option value="createTask">Create Task</option>
            <option value="updateTask">Update Task</option>
            <option value="getTask">Get Task</option>
            <option value="deleteTask">Delete Task</option>
            <option value="searchTasks">Search Tasks</option>
          </optgroup>
          <optgroup label="Projects">
            <option value="createProject">Create Project</option>
            <option value="getProject">Get Project</option>
            <option value="updateProject">Update Project</option>
          </optgroup>
          <optgroup label="Other">
            <option value="addComment">Add Comment</option>
            <option value="getTags">Get Tags</option>
            <option value="getUsers">Get Users</option>
            <option value="getTeams">Get Teams</option>
          </optgroup>
        </select>
      </div>

      {operation === 'createTask' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Task Name</label>
            <input
              type="text"
              value={taskName}
              onChange={(e) => handleTaskNameChange(e.target.value)}
              placeholder="Task name"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Task description"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assignee GID</label>
            <input
              type="text"
              value={assigneeGid}
              onChange={(e) => handleAssigneeGidChange(e.target.value)}
              placeholder="User GID"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => handleDueDateChange(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </>
      )}

      {(['updateTask', 'getTask', 'deleteTask'] as AsanaOperation[]).includes(operation) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Task GID</label>
          <input
            type="text"
            value={taskGid}
            onChange={(e) => handleTaskGidChange(e.target.value)}
            placeholder="e.g., 1234567890123456"
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm font-medium text-blue-900">💡 Tip:</p>
        <p className="text-xs text-blue-800 mt-1">
          Get your access token from{' '}
          <a
            href="https://app.asana.com/0/my-apps"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Asana Developer Console
          </a>
        </p>
      </div>

      <div className="text-xs text-gray-500">
        📚{' '}
        <a
          href="https://developers.asana.com/reference/rest-api-reference"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          API Documentation
        </a>
      </div>
    </div>
  );
};

export default AsanaConfig;
