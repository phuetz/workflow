/**
 * Keycloak Node Configuration
 * Open Source Identity and Access Management
 */

import React, { useState } from 'react';

interface KeycloakConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

type KeycloakOperation =
  | 'listRealms'
  | 'getRealm'
  | 'createRealm'
  | 'updateRealm'
  | 'deleteRealm'
  | 'listUsers'
  | 'getUser'
  | 'createUser'
  | 'updateUser'
  | 'deleteUser'
  | 'resetPassword'
  | 'listUserRoles'
  | 'assignRoles'
  | 'removeRoles'
  | 'listGroups'
  | 'createGroup'
  | 'deleteGroup'
  | 'listClients'
  | 'getClient'
  | 'createClient'
  | 'deleteClient'
  | 'listRoles'
  | 'createRole'
  | 'deleteRole';

export const KeycloakConfig: React.FC<KeycloakConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<KeycloakOperation>(
    (config.operation as KeycloakOperation) || 'listUsers'
  );
  const [serverUrl, setServerUrl] = useState((config.serverUrl as string) || '');
  const [realm, setRealm] = useState((config.realm as string) || 'master');
  const [adminUsername, setAdminUsername] = useState((config.adminUsername as string) || '');
  const [adminPassword, setAdminPassword] = useState((config.adminPassword as string) || '');
  const [userId, setUserId] = useState((config.userId as string) || '');
  const [username, setUsername] = useState((config.username as string) || '');
  const [email, setEmail] = useState((config.email as string) || '');
  const [userData, setUserData] = useState((config.userData as string) || '');
  const [password, setPassword] = useState((config.password as string) || '');
  const [groupId, setGroupId] = useState((config.groupId as string) || '');
  const [groupName, setGroupName] = useState((config.groupName as string) || '');
  const [clientId, setClientId] = useState((config.clientId as string) || '');
  const [clientConfig, setClientConfig] = useState((config.clientConfig as string) || '');
  const [roleName, setRoleName] = useState((config.roleName as string) || '');
  const [roleConfig, setRoleConfig] = useState((config.roleConfig as string) || '');

  const handleOperationChange = (newOperation: KeycloakOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleServerUrlChange = (value: string) => {
    setServerUrl(value);
    onChange({ ...config, serverUrl: value });
  };

  const handleRealmChange = (value: string) => {
    setRealm(value);
    onChange({ ...config, realm: value });
  };

  const handleAdminUsernameChange = (value: string) => {
    setAdminUsername(value);
    onChange({ ...config, adminUsername: value });
  };

  const handleAdminPasswordChange = (value: string) => {
    setAdminPassword(value);
    onChange({ ...config, adminPassword: value });
  };

  const handleUserIdChange = (value: string) => {
    setUserId(value);
    onChange({ ...config, userId: value });
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    onChange({ ...config, username: value });
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    onChange({ ...config, email: value });
  };

  const handleUserDataChange = (value: string) => {
    setUserData(value);
    onChange({ ...config, userData: value });
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    onChange({ ...config, password: value });
  };

  const handleGroupIdChange = (value: string) => {
    setGroupId(value);
    onChange({ ...config, groupId: value });
  };

  const handleGroupNameChange = (value: string) => {
    setGroupName(value);
    onChange({ ...config, groupName: value });
  };

  const handleClientIdChange = (value: string) => {
    setClientId(value);
    onChange({ ...config, clientId: value });
  };

  const handleClientConfigChange = (value: string) => {
    setClientConfig(value);
    onChange({ ...config, clientConfig: value });
  };

  const handleRoleNameChange = (value: string) => {
    setRoleName(value);
    onChange({ ...config, roleName: value });
  };

  const handleRoleConfigChange = (value: string) => {
    setRoleConfig(value);
    onChange({ ...config, roleConfig: value });
  };

  const loadExample = (example: 'createUser' | 'createClient' | 'createRole') => {
    if (example === 'createUser') {
      handleOperationChange('createUser');
      handleUsernameChange('john.doe');
      handleEmailChange('john.doe@example.com');
      handleUserDataChange(JSON.stringify({
        enabled: true,
        emailVerified: false,
        firstName: 'John',
        lastName: 'Doe',
        attributes: {
          department: ['Engineering']
        }
      }, null, 2));
    } else if (example === 'createClient') {
      handleOperationChange('createClient');
      handleClientIdChange('my-app');
      handleClientConfigChange(JSON.stringify({
        clientId: 'my-app',
        enabled: true,
        publicClient: false,
        protocol: 'openid-connect',
        redirectUris: ['https://myapp.com/*'],
        webOrigins: ['https://myapp.com']
      }, null, 2));
    } else if (example === 'createRole') {
      handleOperationChange('createRole');
      handleRoleNameChange('admin');
      handleRoleConfigChange(JSON.stringify({
        name: 'admin',
        description: 'Administrator role',
        composite: false
      }, null, 2));
    }
  };

  return (
    <div className="space-y-4 bg-gray-900 text-gray-100 p-4 rounded-lg">
      <div className="font-semibold text-lg mb-4 text-white">Keycloak Configuration</div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Server URL
        </label>
        <input
          type="text"
          value={serverUrl}
          onChange={(e) => handleServerUrlChange(e.target.value)}
          placeholder="https://keycloak.example.com or {{ $credentials.serverUrl }}"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono text-sm"
        />
        <p className="text-xs text-gray-400 mt-1">
          Base URL of your Keycloak server (e.g., https://keycloak.example.com)
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Realm
          </label>
          <input
            type="text"
            value={realm}
            onChange={(e) => handleRealmChange(e.target.value)}
            placeholder="master"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Admin Username
          </label>
          <input
            type="text"
            value={adminUsername}
            onChange={(e) => handleAdminUsernameChange(e.target.value)}
            placeholder="admin or {{ $credentials.username }}"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono text-sm"
          />
        </div>
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Admin Password
          </label>
          <input
            type="password"
            value={adminPassword}
            onChange={(e) => handleAdminPasswordChange(e.target.value)}
            placeholder="Password or {{ $credentials.password }}"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as KeycloakOperation)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
        >
          <optgroup label="Realms">
            <option value="listRealms">List Realms</option>
            <option value="getRealm">Get Realm</option>
            <option value="createRealm">Create Realm</option>
            <option value="updateRealm">Update Realm</option>
            <option value="deleteRealm">Delete Realm</option>
          </optgroup>
          <optgroup label="Users">
            <option value="listUsers">List Users</option>
            <option value="getUser">Get User</option>
            <option value="createUser">Create User</option>
            <option value="updateUser">Update User</option>
            <option value="deleteUser">Delete User</option>
            <option value="resetPassword">Reset Password</option>
          </optgroup>
          <optgroup label="Roles">
            <option value="listUserRoles">List User Roles</option>
            <option value="assignRoles">Assign Roles</option>
            <option value="removeRoles">Remove Roles</option>
            <option value="listRoles">List Roles</option>
            <option value="createRole">Create Role</option>
            <option value="deleteRole">Delete Role</option>
          </optgroup>
          <optgroup label="Groups">
            <option value="listGroups">List Groups</option>
            <option value="createGroup">Create Group</option>
            <option value="deleteGroup">Delete Group</option>
          </optgroup>
          <optgroup label="Clients">
            <option value="listClients">List Clients</option>
            <option value="getClient">Get Client</option>
            <option value="createClient">Create Client</option>
            <option value="deleteClient">Delete Client</option>
          </optgroup>
        </select>
      </div>

      {(operation === 'getUser' || operation === 'updateUser' || operation === 'deleteUser' ||
        operation === 'resetPassword' || operation === 'listUserRoles' ||
        operation === 'assignRoles' || operation === 'removeRoles') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            User ID
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => handleUserIdChange(e.target.value)}
            placeholder="user-uuid or {{ $json.userId }}"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono text-sm"
          />
        </div>
      )}

      {(operation === 'createUser' || operation === 'updateUser') && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="john.doe"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="john.doe@example.com"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              User Data (JSON)
            </label>
            <textarea
              value={userData}
              onChange={(e) => handleUserDataChange(e.target.value)}
              placeholder='{"enabled": true, "firstName": "John", "lastName": "Doe"}'
              rows={8}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              User attributes: enabled, emailVerified, firstName, lastName, attributes
            </p>
          </div>
        </>
      )}

      {operation === 'resetPassword' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            New Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            placeholder="new-password"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
      )}

      {(operation === 'createGroup' || operation === 'deleteGroup') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Group Name
          </label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => handleGroupNameChange(e.target.value)}
            placeholder="administrators"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
      )}

      {(operation === 'createClient' || operation === 'getClient' || operation === 'deleteClient') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Client ID
          </label>
          <input
            type="text"
            value={clientId}
            onChange={(e) => handleClientIdChange(e.target.value)}
            placeholder="my-app"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
      )}

      {operation === 'createClient' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Client Configuration (JSON)
          </label>
          <textarea
            value={clientConfig}
            onChange={(e) => handleClientConfigChange(e.target.value)}
            placeholder={JSON.stringify({
              clientId: 'my-app',
              enabled: true,
              publicClient: false,
              protocol: 'openid-connect'
            }, null, 2)}
            rows={8}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono text-sm"
          />
        </div>
      )}

      {(operation === 'createRole' || operation === 'deleteRole') && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Role Name
            </label>
            <input
              type="text"
              value={roleName}
              onChange={(e) => handleRoleNameChange(e.target.value)}
              placeholder="admin"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          {operation === 'createRole' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Role Configuration (JSON)
              </label>
              <textarea
                value={roleConfig}
                onChange={(e) => handleRoleConfigChange(e.target.value)}
                placeholder={JSON.stringify({
                  name: 'admin',
                  description: 'Administrator role'
                }, null, 2)}
                rows={4}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono text-sm"
              />
            </div>
          )}
        </>
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
            onClick={() => loadExample('createClient')}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
          >
            Create Client
          </button>
          <button
            onClick={() => loadExample('createRole')}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
          >
            Create Role
          </button>
        </div>
      </div>

      <div className="bg-red-900 border border-red-700 rounded-md p-3">
        <p className="text-sm text-red-200 font-medium mb-1">Authentication</p>
        <p className="text-xs text-red-300">
          Requires Keycloak admin credentials. Uses Admin REST API with bearer token authentication.
        </p>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-md p-3">
        <p className="text-xs text-gray-400 space-y-1">
          <div><strong className="text-gray-300">API Version:</strong> Admin REST API</div>
          <div><strong className="text-gray-300">Default Port:</strong> 8080 (HTTP), 8443 (HTTPS)</div>
          <div><strong className="text-gray-300">Documentation:</strong> keycloak.org/docs-api</div>
        </p>
      </div>
    </div>
  );
};

export default KeycloakConfig;
