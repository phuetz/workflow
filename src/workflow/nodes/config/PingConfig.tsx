/**
 * Ping Identity Node Configuration
 * Enterprise identity security platform (PingOne, PingFederate, PingAccess)
 */

import React, { useState } from 'react';

interface PingConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

type PingOperation =
  | 'listUsers'
  | 'getUser'
  | 'createUser'
  | 'updateUser'
  | 'deleteUser'
  | 'enableUser'
  | 'disableUser'
  | 'listGroups'
  | 'getGroup'
  | 'createGroup'
  | 'updateGroup'
  | 'deleteGroup'
  | 'addUserToGroup'
  | 'removeUserFromGroup'
  | 'listPolicies'
  | 'getPolicy'
  | 'createPolicy'
  | 'updatePolicy'
  | 'deletePolicy'
  | 'listApplications'
  | 'getApplication'
  | 'assignApplication'
  | 'revokeApplication'
  | 'enrollMFA'
  | 'verifyMFA'
  | 'listEnvironments';

export const PingConfig: React.FC<PingConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<PingOperation>(
    (config.operation as PingOperation) || 'listUsers'
  );
  const [environmentId, setEnvironmentId] = useState((config.environmentId as string) || '');
  const [apiUrl, setApiUrl] = useState((config.apiUrl as string) || '');
  const [clientId, setClientId] = useState((config.clientId as string) || '');
  const [clientSecret, setClientSecret] = useState((config.clientSecret as string) || '');
  const [product, setProduct] = useState((config.product as string) || 'pingone');
  const [userId, setUserId] = useState((config.userId as string) || '');
  const [username, setUsername] = useState((config.username as string) || '');
  const [email, setEmail] = useState((config.email as string) || '');
  const [userData, setUserData] = useState((config.userData as string) || '');
  const [groupId, setGroupId] = useState((config.groupId as string) || '');
  const [groupName, setGroupName] = useState((config.groupName as string) || '');
  const [groupData, setGroupData] = useState((config.groupData as string) || '');
  const [policyId, setPolicyId] = useState((config.policyId as string) || '');
  const [policyName, setPolicyName] = useState((config.policyName as string) || '');
  const [policyData, setPolicyData] = useState((config.policyData as string) || '');
  const [applicationId, setApplicationId] = useState((config.applicationId as string) || '');

  const handleOperationChange = (newOperation: PingOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleEnvironmentIdChange = (value: string) => {
    setEnvironmentId(value);
    onChange({ ...config, environmentId: value });
  };

  const handleApiUrlChange = (value: string) => {
    setApiUrl(value);
    onChange({ ...config, apiUrl: value });
  };

  const handleClientIdChange = (value: string) => {
    setClientId(value);
    onChange({ ...config, clientId: value });
  };

  const handleClientSecretChange = (value: string) => {
    setClientSecret(value);
    onChange({ ...config, clientSecret: value });
  };

  const handleProductChange = (value: string) => {
    setProduct(value);
    onChange({ ...config, product: value });
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

  const handleGroupIdChange = (value: string) => {
    setGroupId(value);
    onChange({ ...config, groupId: value });
  };

  const handleGroupNameChange = (value: string) => {
    setGroupName(value);
    onChange({ ...config, groupName: value });
  };

  const handleGroupDataChange = (value: string) => {
    setGroupData(value);
    onChange({ ...config, groupData: value });
  };

  const handlePolicyIdChange = (value: string) => {
    setPolicyId(value);
    onChange({ ...config, policyId: value });
  };

  const handlePolicyNameChange = (value: string) => {
    setPolicyName(value);
    onChange({ ...config, policyName: value });
  };

  const handlePolicyDataChange = (value: string) => {
    setPolicyData(value);
    onChange({ ...config, policyData: value });
  };

  const handleApplicationIdChange = (value: string) => {
    setApplicationId(value);
    onChange({ ...config, applicationId: value });
  };

  const loadExample = (example: 'createUser' | 'createGroup' | 'createPolicy') => {
    if (example === 'createUser') {
      handleOperationChange('createUser');
      handleUsernameChange('john.doe');
      handleEmailChange('john.doe@example.com');
      handleUserDataChange(JSON.stringify({
        email: 'john.doe@example.com',
        username: 'john.doe',
        name: {
          given: 'John',
          family: 'Doe'
        },
        lifecycle: {
          status: 'ACCOUNT_OK'
        },
        mfaEnabled: true
      }, null, 2));
    } else if (example === 'createGroup') {
      handleOperationChange('createGroup');
      handleGroupNameChange('Engineering Team');
      handleGroupDataChange(JSON.stringify({
        name: 'Engineering Team',
        description: 'All engineering staff',
        userFilter: 'department eq "Engineering"'
      }, null, 2));
    } else if (example === 'createPolicy') {
      handleOperationChange('createPolicy');
      handlePolicyNameChange('MFA Required');
      handlePolicyDataChange(JSON.stringify({
        name: 'MFA Required',
        default: false,
        condition: {
          type: 'RISK',
          level: 'HIGH'
        },
        verify: {
          type: 'MFA_REQUIRED'
        }
      }, null, 2));
    }
  };

  return (
    <div className="space-y-4 bg-gray-900 text-gray-100 p-4 rounded-lg">
      <div className="font-semibold text-lg mb-4 text-white">Ping Identity Configuration</div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Product
        </label>
        <select
          value={product}
          onChange={(e) => handleProductChange(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
        >
          <option value="pingone">PingOne (Cloud)</option>
          <option value="pingfederate">PingFederate (On-Premise/Hybrid)</option>
          <option value="pingaccess">PingAccess (API Security)</option>
        </select>
        <p className="text-xs text-gray-400 mt-1">
          Select the Ping Identity product you're integrating with
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Environment ID
        </label>
        <input
          type="text"
          value={environmentId}
          onChange={(e) => handleEnvironmentIdChange(e.target.value)}
          placeholder="env-id or {{ $credentials.environmentId }}"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent font-mono text-sm"
        />
        <p className="text-xs text-gray-400 mt-1">
          PingOne environment ID (e.g., 12345678-1234-1234-1234-123456789abc)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          API URL
        </label>
        <input
          type="text"
          value={apiUrl}
          onChange={(e) => handleApiUrlChange(e.target.value)}
          placeholder="https://api.pingone.com/v1 or {{ $credentials.apiUrl }}"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent font-mono text-sm"
        />
        <p className="text-xs text-gray-400 mt-1">
          Base API URL (varies by region: US, EU, APAC, Canada)
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
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent font-mono text-sm"
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
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent font-mono text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as PingOperation)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
        >
          <optgroup label="Users">
            <option value="listUsers">List Users</option>
            <option value="getUser">Get User</option>
            <option value="createUser">Create User</option>
            <option value="updateUser">Update User</option>
            <option value="deleteUser">Delete User</option>
            <option value="enableUser">Enable User</option>
            <option value="disableUser">Disable User</option>
          </optgroup>
          <optgroup label="Groups">
            <option value="listGroups">List Groups</option>
            <option value="getGroup">Get Group</option>
            <option value="createGroup">Create Group</option>
            <option value="updateGroup">Update Group</option>
            <option value="deleteGroup">Delete Group</option>
            <option value="addUserToGroup">Add User to Group</option>
            <option value="removeUserFromGroup">Remove User from Group</option>
          </optgroup>
          <optgroup label="Policies">
            <option value="listPolicies">List Policies</option>
            <option value="getPolicy">Get Policy</option>
            <option value="createPolicy">Create Policy</option>
            <option value="updatePolicy">Update Policy</option>
            <option value="deletePolicy">Delete Policy</option>
          </optgroup>
          <optgroup label="Applications">
            <option value="listApplications">List Applications</option>
            <option value="getApplication">Get Application</option>
            <option value="assignApplication">Assign Application to User</option>
            <option value="revokeApplication">Revoke Application from User</option>
          </optgroup>
          <optgroup label="MFA">
            <option value="enrollMFA">Enroll MFA Device</option>
            <option value="verifyMFA">Verify MFA</option>
          </optgroup>
          <optgroup label="Environments">
            <option value="listEnvironments">List Environments</option>
          </optgroup>
        </select>
      </div>

      {(operation === 'getUser' || operation === 'updateUser' || operation === 'deleteUser' ||
        operation === 'enableUser' || operation === 'disableUser' ||
        operation === 'addUserToGroup' || operation === 'removeUserFromGroup' ||
        operation === 'assignApplication' || operation === 'revokeApplication' ||
        operation === 'enrollMFA' || operation === 'verifyMFA') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            User ID
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => handleUserIdChange(e.target.value)}
            placeholder="user-uuid or {{ $json.userId }}"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent font-mono text-sm"
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
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
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
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
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
              placeholder='{"email": "...", "username": "...", "name": {...}}'
              rows={10}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent font-mono text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              User attributes: email, username, name (given, family), lifecycle, mfaEnabled
            </p>
          </div>
        </>
      )}

      {(operation === 'getGroup' || operation === 'updateGroup' || operation === 'deleteGroup' ||
        operation === 'addUserToGroup' || operation === 'removeUserFromGroup') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Group ID
          </label>
          <input
            type="text"
            value={groupId}
            onChange={(e) => handleGroupIdChange(e.target.value)}
            placeholder="group-uuid or {{ $json.groupId }}"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent font-mono text-sm"
          />
        </div>
      )}

      {(operation === 'createGroup' || operation === 'updateGroup') && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Group Name
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => handleGroupNameChange(e.target.value)}
              placeholder="Engineering Team"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Group Data (JSON)
            </label>
            <textarea
              value={groupData}
              onChange={(e) => handleGroupDataChange(e.target.value)}
              placeholder='{"name": "...", "description": "...", "userFilter": "..."}'
              rows={6}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent font-mono text-sm"
            />
          </div>
        </>
      )}

      {(operation === 'getPolicy' || operation === 'updatePolicy' || operation === 'deletePolicy') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Policy ID
          </label>
          <input
            type="text"
            value={policyId}
            onChange={(e) => handlePolicyIdChange(e.target.value)}
            placeholder="policy-uuid or {{ $json.policyId }}"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent font-mono text-sm"
          />
        </div>
      )}

      {(operation === 'createPolicy' || operation === 'updatePolicy') && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Policy Name
            </label>
            <input
              type="text"
              value={policyName}
              onChange={(e) => handlePolicyNameChange(e.target.value)}
              placeholder="MFA Required"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Policy Data (JSON)
            </label>
            <textarea
              value={policyData}
              onChange={(e) => handlePolicyDataChange(e.target.value)}
              placeholder='{"name": "...", "default": false, "condition": {...}, "verify": {...}}'
              rows={8}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent font-mono text-sm"
            />
          </div>
        </>
      )}

      {(operation === 'getApplication' || operation === 'assignApplication' || operation === 'revokeApplication') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Application ID
          </label>
          <input
            type="text"
            value={applicationId}
            onChange={(e) => handleApplicationIdChange(e.target.value)}
            placeholder="app-uuid or {{ $json.applicationId }}"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent font-mono text-sm"
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
            onClick={() => loadExample('createGroup')}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
          >
            Create Group
          </button>
          <button
            onClick={() => loadExample('createPolicy')}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
          >
            Create Policy
          </button>
        </div>
      </div>

      <div className="bg-yellow-900 border border-yellow-700 rounded-md p-3">
        <p className="text-sm text-yellow-200 font-medium mb-1">Authentication</p>
        <p className="text-xs text-yellow-300">
          Requires OAuth 2.0 credentials (Client ID & Secret). Configure in Ping Identity Admin Console.
        </p>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-md p-3">
        <p className="text-xs text-gray-400 space-y-1">
          <div><strong className="text-gray-300">API Version:</strong> v1 (PingOne)</div>
          <div><strong className="text-gray-300">Rate Limits:</strong> Varies by license tier</div>
          <div><strong className="text-gray-300">Documentation:</strong> apidocs.pingidentity.com</div>
        </p>
      </div>
    </div>
  );
};

export default PingConfig;
