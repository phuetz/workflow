/** Jira Config */
import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface JiraConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

type JiraOperation =
  | 'createIssue'
  | 'updateIssue'
  | 'getIssue'
  | 'deleteIssue'
  | 'searchIssues'
  | 'addComment'
  | 'getComments'
  | 'transitionIssue'
  | 'getTransitions'
  | 'assignIssue'
  | 'getProjects';

export const JiraConfig: React.FC<JiraConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<JiraOperation>(
    (config.operation as JiraOperation) || 'createIssue'
  );
  const [projectKey, setProjectKey] = useState((config.projectKey as string) || '');
  const [issueType, setIssueType] = useState((config.issueType as string) || 'Task');
  const [summary, setSummary] = useState((config.summary as string) || '');
  const [description, setDescription] = useState((config.description as string) || '');
  const [priority, setPriority] = useState((config.priority as string) || '');
  const [jqlQuery, setJqlQuery] = useState((config.jqlQuery as string) || '');
  const [assigneeAccountId, setAssigneeAccountId] = useState((config.assigneeAccountId as string) || '');

  const handleOperationChange = (newOperation: JiraOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleProjectKeyChange = (value: string) => {
    setProjectKey(value);
    onChange({ ...config, projectKey: value });
  };

  const handleIssueTypeChange = (value: string) => {
    setIssueType(value);
    onChange({ ...config, issueType: value });
  };

  const handleSummaryChange = (value: string) => {
    setSummary(value);
    onChange({ ...config, summary: value });
  };

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    onChange({ ...config, description: value });
  };

  const handlePriorityChange = (value: string) => {
    setPriority(value);
    onChange({ ...config, priority: value });
  };

  const handleJqlQueryChange = (value: string) => {
    setJqlQuery(value);
    onChange({ ...config, jqlQuery: value });
  };

  const handleAssigneeAccountIdChange = (value: string) => {
    setAssigneeAccountId(value);
    onChange({ ...config, assigneeAccountId: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Operation</label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as JiraOperation)}
          className="w-full border rounded px-3 py-2"
        >
          <option value="createIssue">Create Issue</option>
          <option value="updateIssue">Update Issue</option>
          <option value="getIssue">Get Issue</option>
          <option value="deleteIssue">Delete Issue</option>
          <option value="searchIssues">Search Issues (JQL)</option>
          <option value="addComment">Add Comment</option>
          <option value="getComments">Get Comments</option>
          <option value="transitionIssue">Transition Issue (Change Status)</option>
          <option value="getTransitions">Get Available Transitions</option>
          <option value="assignIssue">Assign Issue</option>
          <option value="getProjects">Get Projects</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Project Key</label>
        <input
          type="text"
          value={projectKey}
          onChange={(e) => handleProjectKeyChange(e.target.value)}
          placeholder="PROJ"
          className="w-full border rounded px-3 py-2"
        />
        <p className="text-xs text-gray-500 mt-1">
          Project key (e.g., PROJ, DEV, TEAM)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Issue Type</label>
        <select
          value={issueType}
          onChange={(e) => handleIssueTypeChange(e.target.value)}
          className="w-full border rounded px-3 py-2"
        >
          <option value="Task">Task</option>
          <option value="Bug">Bug</option>
          <option value="Story">Story</option>
          <option value="Epic">Epic</option>
          <option value="Subtask">Subtask</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Summary</label>
        <input
          type="text"
          value={summary}
          onChange={(e) => handleSummaryChange(e.target.value)}
          placeholder="Issue title"
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          placeholder="Issue description..."
          className="w-full border rounded px-3 py-2"
          rows={3}
        />
        <p className="text-xs text-gray-500 mt-1">
          Plain text or Atlassian Document Format (ADF) JSON
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Priority</label>
        <select
          value={priority}
          onChange={(e) => handlePriorityChange(e.target.value)}
          className="w-full border rounded px-3 py-2"
        >
          <option value="">Default</option>
          <option value="Highest">Highest</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
          <option value="Lowest">Lowest</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">JQL Query (for search)</label>
        <input
          type="text"
          value={jqlQuery}
          onChange={(e) => handleJqlQueryChange(e.target.value)}
          placeholder='project = PROJ AND status = "In Progress"'
          className="w-full border rounded px-3 py-2 font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          Jira Query Language for searching issues
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Assignee Account ID</label>
        <input
          type="text"
          value={assigneeAccountId}
          onChange={(e) => handleAssigneeAccountIdChange(e.target.value)}
          placeholder="5b10a2844c20165700ede21g"
          className="w-full border rounded px-3 py-2"
        />
        <p className="text-xs text-gray-500 mt-1">
          User account ID (not username or email)
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded p-3">
        <p className="text-sm font-medium mb-1">Quick Examples:</p>
        <div className="text-xs space-y-1">
          <p><strong>Create Issue:</strong> project + issuetype + summary required</p>
          <p><strong>JQL Search:</strong> <code>project = DEV ORDER BY created DESC</code></p>
          <p><strong>Transition:</strong> Get transitions first, then use transition ID</p>
          <p><strong>Comment:</strong> Plain text or ADF format supported</p>
        </div>
      </div>

      <div className="text-xs text-gray-600">
        <a
          href="https://developer.atlassian.com/cloud/jira/platform/rest/v3/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Jira Cloud REST API v3
        </a>
        {' • '}
        <a
          href="https://developer.atlassian.com/cloud/jira/platform/jql/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          JQL Reference
        </a>
        {' • '}
        <a
          href="https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          API Tokens
        </a>
      </div>
    </div>
  );
};

export default JiraConfig;
