/**
 * Auth0 Node Configuration
 * Identity and authentication management
 */

import React, { useState } from 'react';

interface Auth0ConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

type Auth0Operation =
  | 'getUser'
  | 'createUser'
  | 'updateUser'
  | 'deleteUser'
  | 'searchUsers'
  | 'getUserRoles'
  | 'assignRoles'
  | 'removeRoles'
  | 'getConnections'
  | 'blockUser'
  | 'unblockUser';

export const Auth0Config: React.FC<Auth0ConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<Auth0Operation>(
    (config.operation as Auth0Operation) || 'getUser'
  );
  const [domain, setDomain] = useState((config.domain as string) || '');
  const [clientId, setClientId] = useState((config.clientId as string) || '');
  const [clientSecret, setClientSecret] = useState((config.clientSecret as string) || '');
  const [userId, setUserId] = useState((config.userId as string) || '');
  const [email, setEmail] = useState((config.email as string) || '');
  const [connection, setConnection] = useState((config.connection as string) || 'Username-Password-Authentication');
  const [userData, setUserData] = useState((config.userData as string) || '');
  const [roleIds, setRoleIds] = useState((config.roleIds as string) || '');
  const [searchQuery, setSearchQuery] = useState((config.searchQuery as string) || '');

  const handleOperationChange = (newOperation: Auth0Operation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleDomainChange = (value: string) => {
    setDomain(value);
    onChange({ ...config, domain: value });
  };

  const handleClientIdChange = (value: string) => {
    setClientId(value);
    onChange({ ...config, clientId: value });
  };

  const handleClientSecretChange = (value: string) => {
    setClientSecret(value);
    onChange({ ...config, clientSecret: value });
  };

  const handleUserIdChange = (value: string) => {
    setUserId(value);
    onChange({ ...config, userId: value });
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    onChange({ ...config, email: value });
  };

  const handleConnectionChange = (value: string) => {
    setConnection(value);
    onChange({ ...config, connection: value });
  };

  const handleUserDataChange = (value: string) => {
    setUserData(value);
    onChange({ ...config, userData: value });
  };

  const handleRoleIdsChange = (value: string) => {
    setRoleIds(value);
    onChange({ ...config, roleIds: value });
  };

  const handleSearchQueryChange = (value: string) => {
    setSearchQuery(value);
    onChange({ ...config, searchQuery: value });
  };

  const loadExample = (example: 'createUser' | 'updateUser' | 'assignRoles') => {
    if (example === 'createUser') {
      handleOperationChange('createUser');
      handleEmailChange('newuser@example.com');
      handleUserDataChange(JSON.stringify({
        email: 'newuser@example.com',
        password: 'SecurePassword123!',
        email_verified: false,
        name: 'New User',
        nickname: 'newuser',
        user_metadata: {
          hobby: 'surfing'
        },
        app_metadata: {
          plan: 'premium'
        }
      }, null, 2));
    } else if (example === 'updateUser') {
      handleOperationChange('updateUser');
      handleUserIdChange('{{ $json.user_id }}');
      handleUserDataChange(JSON.stringify({
        name: 'Updated Name',
        user_metadata: {
          preferences: {
            theme: 'dark'
          }
        }
      }, null, 2));
    } else if (example === 'assignRoles') {
      handleOperationChange('assignRoles');
      handleUserIdChange('{{ $json.user_id }}');
      handleRoleIdsChange('["rol_123abc", "rol_456def"]');
    }
  };

  return (
    <div className="space-y-4 bg-gray-900 text-gray-100 p-4 rounded-lg">
      <div className="font-semibold text-lg mb-4 text-white">Auth0 Configuration</div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Domain
        </label>
        <input
          type="text"
          value={domain}
          onChange={(e) => handleDomainChange(e.target.value)}
          placeholder="your-tenant.auth0.com or {{ $credentials.domain }}"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
        />
        <p className="text-xs text-gray-400 mt-1">
          Your Auth0 domain (without https://)
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Client ID
          </label>
          <input
            type="text"
            value={clientId}
            onChange={(e) => handleClientIdChange(e.target.value)}
            placeholder="Client ID or {{ $credentials.clientId }}"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Client Secret
          </label>
          <input
            type="password"
            value={clientSecret}
            onChange={(e) => handleClientSecretChange(e.target.value)}
            placeholder="Client Secret or {{ $credentials.secret }}"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as Auth0Operation)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="getUser">Get User</option>
          <option value="createUser">Create User</option>
          <option value="updateUser">Update User</option>
          <option value="deleteUser">Delete User</option>
          <option value="searchUsers">Search Users</option>
          <option value="getUserRoles">Get User Roles</option>
          <option value="assignRoles">Assign Roles</option>
          <option value="removeRoles">Remove Roles</option>
          <option value="getConnections">Get Connections</option>
          <option value="blockUser">Block User</option>
          <option value="unblockUser">Unblock User</option>
        </select>
      </div>

      {(operation === 'getUser' || operation === 'updateUser' || operation === 'deleteUser' ||
        operation === 'getUserRoles' || operation === 'assignRoles' || operation === 'removeRoles' ||
        operation === 'blockUser' || operation === 'unblockUser') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            User ID
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => handleUserIdChange(e.target.value)}
            placeholder="auth0|123456789 or {{ $json.user_id }}"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            Auth0 user ID (supports expressions)
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
            placeholder='{"email": "user@example.com", "password": "...", "name": "..."}'
            rows={8}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            {operation === 'createUser'
              ? 'Required: email, password, connection. Optional: name, nickname, user_metadata, app_metadata'
              : 'Fields to update: name, user_metadata, app_metadata, etc.'}
          </p>
        </div>
      )}

      {operation === 'createUser' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Connection
          </label>
          <input
            type="text"
            value={connection}
            onChange={(e) => handleConnectionChange(e.target.value)}
            placeholder="Username-Password-Authentication"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1">
            Connection name (e.g., Username-Password-Authentication, google-oauth2)
          </p>
        </div>
      )}

      {(operation === 'assignRoles' || operation === 'removeRoles') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Role IDs (JSON Array)
          </label>
          <input
            type="text"
            value={roleIds}
            onChange={(e) => handleRoleIdsChange(e.target.value)}
            placeholder='["rol_123abc", "rol_456def"]'
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            Array of role IDs to assign or remove
          </p>
        </div>
      )}

      {operation === 'searchUsers' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Search Query
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchQueryChange(e.target.value)}
            placeholder='email:"user@example.com" OR name:"John Doe"'
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            Lucene query syntax (e.g., email:"*@example.com")
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
            onClick={() => loadExample('updateUser')}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
          >
            Update User
          </button>
          <button
            onClick={() => loadExample('assignRoles')}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
          >
            Assign Roles
          </button>
        </div>
      </div>

      <div className="bg-blue-900 border border-blue-700 rounded-md p-3">
        <p className="text-sm text-blue-200 font-medium mb-1">Authentication</p>
        <p className="text-xs text-blue-300">
          Requires Management API credentials (Client ID & Secret) with appropriate scopes.
        </p>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-md p-3">
        <p className="text-xs text-gray-400 space-y-1">
          <div><strong className="text-gray-300">API Version:</strong> v2</div>
          <div><strong className="text-gray-300">Rate Limits:</strong> Varies by endpoint and tenant type</div>
          <div><strong className="text-gray-300">Documentation:</strong> auth0.com/docs/api/management/v2</div>
        </p>
      </div>
    </div>
  );
};

export default Auth0Config;
