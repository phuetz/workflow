/** Linear Config */
import React, { useState } from 'react';
import type { LinearOperation } from '../../../integrations/linear/linear.types';

export function LinearConfig() {
  const [op, setOp] = useState<LinearOperation>('createIssue');
  return (
    <div className="space-y-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
        <select value={op} onChange={(e) => setOp(e.target.value as LinearOperation)} className="w-full border border-gray-300 rounded-md px-3 py-2">
          <option value="createIssue">Create Issue</option>
          <option value="updateIssue">Update Issue</option>
          <option value="getIssue">Get Issue</option>
          <option value="searchIssues">Search Issues</option>
          <option value="createProject">Create Project</option>
          <option value="addComment">Add Comment</option>
        </select>
      </div>
      {op === 'createIssue' && (<><div><input type="text" placeholder="Issue title" className="w-full border border-gray-300 rounded-md px-3 py-2" /></div><div><textarea rows={3} placeholder="Description" className="w-full border border-gray-300 rounded-md px-3 py-2" /></div></>)}
      <div className="bg-blue-50 p-3 rounded text-xs"><a href="https://linear.app/settings/api" target="_blank" rel="noopener noreferrer" className="text-blue-600">Get API Key</a> | <a href="https://developers.linear.app" target="_blank" className="text-blue-600">Docs</a></div>
    </div>
  );
}
