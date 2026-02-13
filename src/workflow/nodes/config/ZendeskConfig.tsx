/**
 * Zendesk Node Configuration
 * Customer service platform integration
 */

import React, { useState, useEffect } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface ZendeskConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

type ZendeskOperation =
  | 'createTicket'
  | 'updateTicket'
  | 'getTicket'
  | 'deleteTicket'
  | 'listTickets'
  | 'addComment'
  | 'createUser'
  | 'updateUser'
  | 'getUser'
  | 'searchTickets';

type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
type TicketStatus = 'new' | 'open' | 'pending' | 'hold' | 'solved' | 'closed';
type TicketType = 'problem' | 'incident' | 'question' | 'task';

export const ZendeskConfig: React.FC<ZendeskConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<ZendeskOperation>(
    (config.operation as ZendeskOperation) || 'createTicket'
  );
  const [ticketId, setTicketId] = useState((config.ticketId as string) || '');
  const [subject, setSubject] = useState((config.subject as string) || '');
  const [description, setDescription] = useState((config.description as string) || '');
  const [priority, setPriority] = useState<TicketPriority>(
    (config.priority as TicketPriority) || 'normal'
  );
  const [status, setStatus] = useState<TicketStatus>(
    (config.status as TicketStatus) || 'new'
  );
  const [ticketType, setTicketType] = useState<TicketType>(
    (config.ticketType as TicketType) || 'question'
  );
  const [requesterId, setRequesterId] = useState((config.requesterId as string) || '');
  const [assigneeId, setAssigneeId] = useState((config.assigneeId as string) || '');
  const [tags, setTags] = useState((config.tags as string) || '');
  const [comment, setComment] = useState((config.comment as string) || '');
  const [isPublic, setIsPublic] = useState((config.isPublic as boolean) !== false);
  const [userName, setUserName] = useState((config.userName as string) || '');
  const [userEmail, setUserEmail] = useState((config.userEmail as string) || '');
  const [searchQuery, setSearchQuery] = useState((config.searchQuery as string) || '');

  useEffect(() => {
    onChange({
      ...config,
      operation,
      ticketId,
      subject,
      description,
      priority,
      status,
      ticketType,
      requesterId,
      assigneeId,
      tags,
      comment,
      isPublic,
      userName,
      userEmail,
      searchQuery,
    });
  }, [
    config,
    onChange,
    operation,
    ticketId,
    subject,
    description,
    priority,
    status,
    ticketType,
    requesterId,
    assigneeId,
    tags,
    comment,
    isPublic,
    userName,
    userEmail,
    searchQuery,
  ]);

  const handleOperationChange = (newOperation: ZendeskOperation) => {
    setOperation(newOperation);
  };

  return (
    <div className="space-y-4">
      {/* Operation Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as ZendeskOperation)}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="createTicket">Create Ticket</option>
          <option value="updateTicket">Update Ticket</option>
          <option value="getTicket">Get Ticket</option>
          <option value="deleteTicket">Delete Ticket</option>
          <option value="listTickets">List Tickets</option>
          <option value="addComment">Add Comment</option>
          <option value="createUser">Create User</option>
          <option value="updateUser">Update User</option>
          <option value="getUser">Get User</option>
          <option value="searchTickets">Search Tickets</option>
        </select>
      </div>

      {/* Ticket ID */}
      {['updateTicket', 'getTicket', 'deleteTicket', 'addComment'].includes(operation) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Ticket ID
          </label>
          <input
            type="text"
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value)}
            placeholder="12345"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      )}

      {/* Subject */}
      {['createTicket', 'updateTicket'].includes(operation) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ticket subject"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      )}

      {/* Description */}
      {['createTicket', 'updateTicket'].includes(operation) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ticket description..."
            rows={4}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      )}

      {/* Priority */}
      {['createTicket', 'updateTicket'].includes(operation) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Priority
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TicketPriority)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      )}

      {/* Status */}
      {operation === 'updateTicket' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TicketStatus)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="new">New</option>
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="hold">On Hold</option>
            <option value="solved">Solved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      )}

      {/* Ticket Type */}
      {['createTicket', 'updateTicket'].includes(operation) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Type
          </label>
          <select
            value={ticketType}
            onChange={(e) => setTicketType(e.target.value as TicketType)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="question">Question</option>
            <option value="incident">Incident</option>
            <option value="problem">Problem</option>
            <option value="task">Task</option>
          </select>
        </div>
      )}

      {/* Requester and Assignee */}
      {['createTicket', 'updateTicket'].includes(operation) && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Requester ID
            </label>
            <input
              type="text"
              value={requesterId}
              onChange={(e) => setRequesterId(e.target.value)}
              placeholder="User ID or email"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Assignee ID (optional)
            </label>
            <input
              type="text"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              placeholder="Agent ID"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </>
      )}

      {/* Tags */}
      {['createTicket', 'updateTicket'].includes(operation) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="urgent, billing, support"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      )}

      {/* Comment */}
      {operation === 'addComment' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Comment
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Your comment..."
              rows={4}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 mr-2"
            />
            <label htmlFor="isPublic" className="text-sm text-gray-700 dark:text-gray-300">
              Public comment (visible to requester)
            </label>
          </div>
        </>
      )}

      {/* User Fields */}
      {['createUser', 'updateUser', 'getUser'].includes(operation) && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              User Name
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="John Doe"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              User Email
            </label>
            <input
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </>
      )}

      {/* Search Query */}
      {operation === 'searchTickets' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Search Query
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="status:open priority:urgent"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Use Zendesk search syntax
          </p>
        </div>
      )}

      {/* Documentation Link */}
      <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
        <a
          href="https://developer.zendesk.com/api-reference"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Zendesk API Documentation
        </a>
      </div>
    </div>
  );
};

export default ZendeskConfig;
