/**
 * Clerk Node Configuration
 * Modern authentication and user management
 */

import React, { useState } from 'react';

interface ClerkConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

type ClerkOperation =
  | 'getUser'
  | 'createUser'
  | 'updateUser'
  | 'deleteUser'
  | 'listUsers'
  | 'banUser'
  | 'unbanUser'
  | 'getSessions'
  | 'revokeSession'
  | 'createInvitation'
  | 'verifyToken'
  | 'updateMetadata';

export const ClerkConfig: React.FC<ClerkConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<ClerkOperation>(
    (config.operation as ClerkOperation) || 'getUser'
  );
  const [apiKey, setApiKey] = useState((config.apiKey as string) || '');
  const [userId, setUserId] = useState((config.userId as string) || '');
  const [sessionId, setSessionId] = useState((config.sessionId as string) || '');
  const [emailAddress, setEmailAddress] = useState((config.emailAddress as string) || '');
  const [phoneNumber, setPhoneNumber] = useState((config.phoneNumber as string) || '');
  const [userData, setUserData] = useState((config.userData as string) || '');
  const [publicMetadata, setPublicMetadata] = useState((config.publicMetadata as string) || '');
  const [privateMetadata, setPrivateMetadata] = useState((config.privateMetadata as string) || '');
  const [limit, setLimit] = useState((config.limit as number) || 10);

  const handleOperationChange = (newOperation: ClerkOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    onChange({ ...config, apiKey: value });
  };

  const handleUserIdChange = (value: string) => {
    setUserId(value);
    onChange({ ...config, userId: value });
  };

  const handleSessionIdChange = (value: string) => {
    setSessionId(value);
    onChange({ ...config, sessionId: value });
  };

  const handleEmailAddressChange = (value: string) => {
    setEmailAddress(value);
    onChange({ ...config, emailAddress: value });
  };

  const handleUserDataChange = (value: string) => {
    setUserData(value);
    onChange({ ...config, userData: value });
  };

  const handlePublicMetadataChange = (value: string) => {
    setPublicMetadata(value);
    onChange({ ...config, publicMetadata: value });
  };

  const handlePrivateMetadataChange = (value: string) => {
    setPrivateMetadata(value);
    onChange({ ...config, privateMetadata: value });
  };

  const loadExample = (example: 'createUser' | 'updateMetadata' | 'createInvitation') => {
    if (example === 'createUser') {
      handleOperationChange('createUser');
      handleUserDataChange(JSON.stringify({
        email_address: ['user@example.com'],
        phone_number: ['+15555551234'],
        first_name: 'John',
        last_name: 'Doe',
        password: 'SecurePassword123!',
        skip_password_checks: false,
        skip_password_requirement: false
      }, null, 2));
    } else if (example === 'updateMetadata') {
      handleOperationChange('updateMetadata');
      handleUserIdChange('{{ $json.userId }}');
      handlePublicMetadataChange(JSON.stringify({
        role: 'premium',
        subscription: 'pro'
      }, null, 2));
      handlePrivateMetadataChange(JSON.stringify({
        internal_id: '12345',
        support_tier: 'priority'
      }, null, 2));
    } else if (example === 'createInvitation') {
      handleOperationChange('createInvitation');
      handleEmailAddressChange('newuser@example.com');
      handlePublicMetadataChange(JSON.stringify({
        invited_by: 'admin',
        team: 'engineering'
      }, null, 2));
    }
  };

  return (
    <div className="space-y-4 bg-gray-900 text-gray-100 p-4 rounded-lg">
      <div className="font-semibold text-lg mb-4 text-white">Clerk Configuration</div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          API Key (Secret Key)
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => handleApiKeyChange(e.target.value)}
          placeholder="sk_test_... or {{ $credentials.apiKey }}"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
        />
        <p className="text-xs text-gray-400 mt-1">
          Secret key from Clerk Dashboard → API Keys
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as ClerkOperation)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="getUser">Get User</option>
          <option value="createUser">Create User</option>
          <option value="updateUser">Update User</option>
          <option value="deleteUser">Delete User</option>
          <option value="listUsers">List Users</option>
          <option value="banUser">Ban User</option>
          <option value="unbanUser">Unban User</option>
          <option value="getSessions">Get User Sessions</option>
          <option value="revokeSession">Revoke Session</option>
          <option value="createInvitation">Create Invitation</option>
          <option value="verifyToken">Verify Token</option>
          <option value="updateMetadata">Update Metadata</option>
        </select>
      </div>

      {(operation === 'getUser' || operation === 'updateUser' || operation === 'deleteUser' ||
        operation === 'banUser' || operation === 'unbanUser' || operation === 'getSessions' ||
        operation === 'updateMetadata') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            User ID
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => handleUserIdChange(e.target.value)}
            placeholder="user_... or {{ $json.userId }}"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            Clerk user ID (supports expressions)
          </p>
        </div>
      )}

      {operation === 'revokeSession' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Session ID
          </label>
          <input
            type="text"
            value={sessionId}
            onChange={(e) => handleSessionIdChange(e.target.value)}
            placeholder="sess_... or {{ $json.sessionId }}"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            Clerk session ID to revoke
          </p>
        </div>
      )}

      {(operation === 'createUser' || operation === 'updateUser') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            User Data (JSON)
          </label>
          <textarea
            value={userData}
            onChange={(e) => handleUserDataChange(e.target.value)}
            placeholder='{"email_address": ["user@example.com"], "first_name": "...", "last_name": "..."}'
            rows={8}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            {operation === 'createUser'
              ? 'Required: email_address or phone_number. Optional: first_name, last_name, password'
              : 'Fields to update: first_name, last_name, username, etc.'}
          </p>
        </div>
      )}

      {(operation === 'updateMetadata' || operation === 'createUser') && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Public Metadata (JSON)
            </label>
            <textarea
              value={publicMetadata}
              onChange={(e) => handlePublicMetadataChange(e.target.value)}
              placeholder='{"role": "admin", "plan": "premium"}'
              rows={4}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              Accessible by frontend (max 8KB)
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Private Metadata (JSON)
            </label>
            <textarea
              value={privateMetadata}
              onChange={(e) => handlePrivateMetadataChange(e.target.value)}
              placeholder='{"internal_id": "12345", "stripe_customer_id": "..."}'
              rows={4}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              Backend only, not accessible by frontend (max 8KB)
            </p>
          </div>
        </div>
      )}

      {operation === 'createInvitation' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Email Address
          </label>
          <input
            type="email"
            value={emailAddress}
            onChange={(e) => handleEmailAddressChange(e.target.value)}
            placeholder="invitee@example.com"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1">
            Email address to send invitation to
          </p>
        </div>
      )}

      {operation === 'listUsers' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Limit
          </label>
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            min={1}
            max={500}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1">
            Number of users to return (1-500)
          </p>
        </div>
      )}

      <div className="border-t border-gray-700 pt-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Quick Examples
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => loadExample('createUser')}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
          >
            Create User
          </button>
          <button
            onClick={() => loadExample('updateMetadata')}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
          >
            Update Metadata
          </button>
          <button
            onClick={() => loadExample('createInvitation')}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
          >
            Create Invitation
          </button>
        </div>
      </div>

      <div className="bg-purple-900 border border-purple-700 rounded-md p-3">
        <p className="text-sm text-purple-200 font-medium mb-1">Authentication</p>
        <p className="text-xs text-purple-300">
          Requires Secret Key from Clerk Dashboard. Use test keys for development.
        </p>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-md p-3">
        <p className="text-xs text-gray-400 space-y-1">
          <div><strong className="text-gray-300">API Version:</strong> v1</div>
          <div><strong className="text-gray-300">Rate Limits:</strong> 100 requests per 10 seconds</div>
          <div><strong className="text-gray-300">Documentation:</strong> clerk.com/docs/reference/backend-api</div>
        </p>
      </div>
    </div>
  );
};

export default ClerkConfig;
