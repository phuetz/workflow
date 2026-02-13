/**
 * OneLogin Node Configuration
 * Cloud-based identity and access management
 */

import React, { useState } from 'react';

interface OneloginConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

type OneloginOperation =
  | 'listUsers'
  | 'getUser'
  | 'createUser'
  | 'updateUser'
  | 'deleteUser'
  | 'activateUser'
  | 'lockUser'
  | 'unlockUser'
  | 'listRoles'
  | 'getRole'
  | 'createRole'
  | 'deleteRole'
  | 'assignRoles'
  | 'removeRoles'
  | 'listApps'
  | 'getApp'
  | 'listUserApps'
  | 'assignApp'
  | 'removeApp'
  | 'generateSAMLAssertion'
  | 'verifyFactor'
  | 'listGroups'
  | 'createGroup'
  | 'deleteGroup';

export const OneloginConfig: React.FC<OneloginConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<OneloginOperation>(
    (config.operation as OneloginOperation) || 'listUsers'
  );
  const [subdomain, setSubdomain] = useState((config.subdomain as string) || '');
  const [clientId, setClientId] = useState((config.clientId as string) || '');
  const [clientSecret, setClientSecret] = useState((config.clientSecret as string) || '');
  const [region, setRegion] = useState((config.region as string) || 'us');
  const [userId, setUserId] = useState((config.userId as string) || '');
  const [username, setUsername] = useState((config.username as string) || '');
  const [email, setEmail] = useState((config.email as string) || '');
  const [userData, setUserData] = useState((config.userData as string) || '');
  const [roleId, setRoleId] = useState((config.roleId as string) || '');
  const [roleName, setRoleName] = useState((config.roleName as string) || '');
  const [appId, setAppId] = useState((config.appId as string) || '');
  const [groupId, setGroupId] = useState((config.groupId as string) || '');
  const [groupName, setGroupName] = useState((config.groupName as string) || '');
  const [samlAppId, setSamlAppId] = useState((config.samlAppId as string) || '');

  const handleOperationChange = (newOperation: OneloginOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleSubdomainChange = (value: string) => {
    setSubdomain(value);
    onChange({ ...config, subdomain: value });
  };

  const handleClientIdChange = (value: string) => {
    setClientId(value);
    onChange({ ...config, clientId: value });
  };

  const handleClientSecretChange = (value: string) => {
    setClientSecret(value);
    onChange({ ...config, clientSecret: value });
  };

  const handleRegionChange = (value: string) => {
    setRegion(value);
    onChange({ ...config, region: value });
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

  const handleRoleIdChange = (value: string) => {
    setRoleId(value);
    onChange({ ...config, roleId: value });
  };

  const handleRoleNameChange = (value: string) => {
    setRoleName(value);
    onChange({ ...config, roleName: value });
  };

  const handleAppIdChange = (value: string) => {
    setAppId(value);
    onChange({ ...config, appId: value });
  };

  const handleGroupIdChange = (value: string) => {
    setGroupId(value);
    onChange({ ...config, groupId: value });
  };

  const handleGroupNameChange = (value: string) => {
    setGroupName(value);
    onChange({ ...config, groupName: value });
  };

  const handleSamlAppIdChange = (value: string) => {
    setSamlAppId(value);
    onChange({ ...config, samlAppId: value });
  };

  const loadExample = (example: 'createUser' | 'assignRoles' | 'assignApp') => {
    if (example === 'createUser') {
      handleOperationChange('createUser');
      handleUsernameChange('john.doe');
      handleEmailChange('john.doe@example.com');
      handleUserDataChange(JSON.stringify({
        firstname: 'John',
        lastname: 'Doe',
        email: 'john.doe@example.com',
        username: 'john.doe',
        password: 'SecurePassword123!',
        phone: '+1234567890',
        company: 'Acme Corp',
        department: 'Engineering',
        title: 'Software Engineer'
      }, null, 2));
    } else if (example === 'assignRoles') {
      handleOperationChange('assignRoles');
      handleUserIdChange('{{ $json.userId }}');
      handleRoleIdChange('123456');
    } else if (example === 'assignApp') {
      handleOperationChange('assignApp');
      handleUserIdChange('{{ $json.userId }}');
      handleAppIdChange('789012');
    }
  };

  return (
    <div className="space-y-4 bg-gray-900 text-gray-100 p-4 rounded-lg">
      <div className="font-semibold text-lg mb-4 text-white">OneLogin Configuration</div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Subdomain
          </label>
          <input
            type="text"
            value={subdomain}
            onChange={(e) => handleSubdomainChange(e.target.value)}
            placeholder="company or {{ $credentials.subdomain }}"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            Your OneLogin subdomain (e.g., company.onelogin.com)
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Region
          </label>
          <select
            value={region}
            onChange={(e) => handleRegionChange(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="us">US (api.us.onelogin.com)</option>
            <option value="eu">EU (api.eu.onelogin.com)</option>
          </select>
        </div>
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
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
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
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as OneloginOperation)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          <optgroup label="Users">
            <option value="listUsers">List Users</option>
            <option value="getUser">Get User</option>
            <option value="createUser">Create User</option>
            <option value="updateUser">Update User</option>
            <option value="deleteUser">Delete User</option>
            <option value="activateUser">Activate User</option>
            <option value="lockUser">Lock User</option>
            <option value="unlockUser">Unlock User</option>
          </optgroup>
          <optgroup label="Roles">
            <option value="listRoles">List Roles</option>
            <option value="getRole">Get Role</option>
            <option value="createRole">Create Role</option>
            <option value="deleteRole">Delete Role</option>
            <option value="assignRoles">Assign Roles to User</option>
            <option value="removeRoles">Remove Roles from User</option>
          </optgroup>
          <optgroup label="Applications">
            <option value="listApps">List Apps</option>
            <option value="getApp">Get App</option>
            <option value="listUserApps">List User Apps</option>
            <option value="assignApp">Assign App to User</option>
            <option value="removeApp">Remove App from User</option>
          </optgroup>
          <optgroup label="Groups">
            <option value="listGroups">List Groups</option>
            <option value="createGroup">Create Group</option>
            <option value="deleteGroup">Delete Group</option>
          </optgroup>
          <optgroup label="SAML">
            <option value="generateSAMLAssertion">Generate SAML Assertion</option>
            <option value="verifyFactor">Verify MFA Factor</option>
          </optgroup>
        </select>
      </div>

      {(operation === 'getUser' || operation === 'updateUser' || operation === 'deleteUser' ||
        operation === 'activateUser' || operation === 'lockUser' || operation === 'unlockUser' ||
        operation === 'assignRoles' || operation === 'removeRoles' ||
        operation === 'listUserApps' || operation === 'assignApp' || operation === 'removeApp') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            User ID
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => handleUserIdChange(e.target.value)}
            placeholder="12345678 or {{ $json.userId }}"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
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
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
              placeholder='{"firstname": "John", "lastname": "Doe", "email": "..."}'
              rows={10}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              User fields: firstname, lastname, email, username, password, phone, company, department, title
            </p>
          </div>
        </>
      )}

      {(operation === 'getRole' || operation === 'deleteRole' ||
        operation === 'assignRoles' || operation === 'removeRoles') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Role ID
          </label>
          <input
            type="text"
            value={roleId}
            onChange={(e) => handleRoleIdChange(e.target.value)}
            placeholder="123456 or {{ $json.roleId }}"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
          />
        </div>
      )}

      {operation === 'createRole' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Role Name
          </label>
          <input
            type="text"
            value={roleName}
            onChange={(e) => handleRoleNameChange(e.target.value)}
            placeholder="Administrator"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      )}

      {(operation === 'getApp' || operation === 'assignApp' || operation === 'removeApp') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            App ID
          </label>
          <input
            type="text"
            value={appId}
            onChange={(e) => handleAppIdChange(e.target.value)}
            placeholder="789012 or {{ $json.appId }}"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
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
            placeholder="Engineering Team"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      )}

      {operation === 'generateSAMLAssertion' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            SAML App ID
          </label>
          <input
            type="text"
            value={samlAppId}
            onChange={(e) => handleSamlAppIdChange(e.target.value)}
            placeholder="app-id"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
          />
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
            onClick={() => loadExample('assignRoles')}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
          >
            Assign Roles
          </button>
          <button
            onClick={() => loadExample('assignApp')}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
          >
            Assign App
          </button>
        </div>
      </div>

      <div className="bg-green-900 border border-green-700 rounded-md p-3">
        <p className="text-sm text-green-200 font-medium mb-1">Authentication</p>
        <p className="text-xs text-green-300">
          Requires API credentials (Client ID & Secret). Generate from Developers → API Credentials.
        </p>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-md p-3">
        <p className="text-xs text-gray-400 space-y-1">
          <div><strong className="text-gray-300">API Version:</strong> v2</div>
          <div><strong className="text-gray-300">Rate Limits:</strong> 5000 requests per hour</div>
          <div><strong className="text-gray-300">Documentation:</strong> developers.onelogin.com/api-docs</div>
        </p>
      </div>
    </div>
  );
};

export default OneloginConfig;
