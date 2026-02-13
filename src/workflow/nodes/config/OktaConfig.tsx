/**
 * Okta Node Configuration
 * Identity and access management platform
 */

import React, { useState } from 'react';

interface OktaConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

type OktaOperation =
  | 'getUser'
  | 'createUser'
  | 'updateUser'
  | 'deactivateUser'
  | 'activateUser'
  | 'deleteUser'
  | 'listUsers'
  | 'getGroups'
  | 'addUserToGroup'
  | 'removeUserFromGroup'
  | 'resetPassword'
  | 'expirePassword';

export const OktaConfig: React.FC<OktaConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<OktaOperation>(
    (config.operation as OktaOperation) || 'getUser'
  );
  const [orgUrl, setOrgUrl] = useState((config.orgUrl as string) || '');
  const [apiToken, setApiToken] = useState((config.apiToken as string) || '');
  const [userId, setUserId] = useState((config.userId as string) || '');
  const [email, setEmail] = useState((config.email as string) || '');
  const [groupId, setGroupId] = useState((config.groupId as string) || '');
  const [userData, setUserData] = useState((config.userData as string) || '');
  const [searchFilter, setSearchFilter] = useState((config.searchFilter as string) || '');
  const [sendEmail, setSendEmail] = useState((config.sendEmail as boolean) || false);

  const handleOperationChange = (newOperation: OktaOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleOrgUrlChange = (value: string) => {
    setOrgUrl(value);
    onChange({ ...config, orgUrl: value });
  };

  const handleApiTokenChange = (value: string) => {
    setApiToken(value);
    onChange({ ...config, apiToken: value });
  };

  const handleUserIdChange = (value: string) => {
    setUserId(value);
    onChange({ ...config, userId: value });
  };

  const handleUserDataChange = (value: string) => {
    setUserData(value);
    onChange({ ...config, userData: value });
  };

  const handleGroupIdChange = (value: string) => {
    setGroupId(value);
    onChange({ ...config, groupId: value });
  };

  const handleSearchFilterChange = (value: string) => {
    setSearchFilter(value);
    onChange({ ...config, searchFilter: value });
  };

  const handleSendEmailChange = (checked: boolean) => {
    setSendEmail(checked);
    onChange({ ...config, sendEmail: checked });
  };

  const loadExample = (example: 'createUser' | 'updateUser' | 'addToGroup') => {
    if (example === 'createUser') {
      handleOperationChange('createUser');
      handleUserDataChange(JSON.stringify({
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          login: 'john.doe@example.com',
          mobilePhone: '+1-555-415-1337'
        },
        credentials: {
          password: {
            value: 'SecurePassword123!'
          }
        }
      }, null, 2));
    } else if (example === 'updateUser') {
      handleOperationChange('updateUser');
      handleUserIdChange('{{ $json.id }}');
      handleUserDataChange(JSON.stringify({
        profile: {
          firstName: 'Jane',
          lastName: 'Doe',
          department: 'Engineering'
        }
      }, null, 2));
    } else if (example === 'addToGroup') {
      handleOperationChange('addUserToGroup');
      handleUserIdChange('{{ $json.userId }}');
      handleGroupIdChange('00g123456789abcdef');
    }
  };

  return (
    <div className="space-y-4 bg-gray-900 text-gray-100 p-4 rounded-lg">
      <div className="font-semibold text-lg mb-4 text-white">Okta Configuration</div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Organization URL
        </label>
        <input
          type="text"
          value={orgUrl}
          onChange={(e) => handleOrgUrlChange(e.target.value)}
          placeholder="https://your-domain.okta.com or {{ $credentials.orgUrl }}"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
        />
        <p className="text-xs text-gray-400 mt-1">
          Your Okta organization URL (e.g., https://dev-123456.okta.com)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          API Token
        </label>
        <input
          type="password"
          value={apiToken}
          onChange={(e) => handleApiTokenChange(e.target.value)}
          placeholder="API Token or {{ $credentials.apiToken }}"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
        />
        <p className="text-xs text-gray-400 mt-1">
          Okta API token from Security → API → Tokens
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as OktaOperation)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="getUser">Get User</option>
          <option value="createUser">Create User</option>
          <option value="updateUser">Update User</option>
          <option value="deactivateUser">Deactivate User</option>
          <option value="activateUser">Activate User</option>
          <option value="deleteUser">Delete User</option>
          <option value="listUsers">List Users</option>
          <option value="getGroups">Get Groups</option>
          <option value="addUserToGroup">Add User to Group</option>
          <option value="removeUserFromGroup">Remove User from Group</option>
          <option value="resetPassword">Reset Password</option>
          <option value="expirePassword">Expire Password</option>
        </select>
      </div>

      {(operation === 'getUser' || operation === 'updateUser' || operation === 'deactivateUser' ||
        operation === 'activateUser' || operation === 'deleteUser' || operation === 'addUserToGroup' ||
        operation === 'removeUserFromGroup' || operation === 'resetPassword' || operation === 'expirePassword') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            User ID or Email
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => handleUserIdChange(e.target.value)}
            placeholder="00u123456789abcdef or user@example.com or {{ $json.id }}"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            Okta user ID or email address (supports expressions)
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
            placeholder='{"profile": {"firstName": "...", "lastName": "...", "email": "..."}}'
            rows={10}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            {operation === 'createUser'
              ? 'Required profile fields: firstName, lastName, email, login'
              : 'Fields to update in the user profile'}
          </p>
        </div>
      )}

      {(operation === 'addUserToGroup' || operation === 'removeUserFromGroup') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Group ID
          </label>
          <input
            type="text"
            value={groupId}
            onChange={(e) => handleGroupIdChange(e.target.value)}
            placeholder="00g123456789abcdef or {{ $json.groupId }}"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            Okta group ID (supports expressions)
          </p>
        </div>
      )}

      {operation === 'listUsers' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Search Filter (Optional)
          </label>
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => handleSearchFilterChange(e.target.value)}
            placeholder='status eq "ACTIVE" or profile.email eq "user@example.com"'
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            SCIM filter expression (optional)
          </p>
        </div>
      )}

      {(operation === 'createUser' || operation === 'resetPassword') && (
        <div className="flex items-center">
          <input
            type="checkbox"
            id="sendEmail"
            checked={sendEmail}
            onChange={(e) => handleSendEmailChange(e.target.checked)}
            className="mr-2 bg-gray-800 border-gray-700"
          />
          <label htmlFor="sendEmail" className="text-sm text-gray-300">
            {operation === 'createUser' ? 'Send activation email' : 'Send password reset email'}
          </label>
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
            onClick={() => loadExample('addToGroup')}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
          >
            Add to Group
          </button>
        </div>
      </div>

      <div className="bg-blue-900 border border-blue-700 rounded-md p-3">
        <p className="text-sm text-blue-200 font-medium mb-1">Authentication</p>
        <p className="text-xs text-blue-300">
          Requires API token with appropriate scopes. Create token in Security → API → Tokens.
        </p>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-md p-3">
        <p className="text-xs text-gray-400 space-y-1">
          <div><strong className="text-gray-300">API Version:</strong> v1</div>
          <div><strong className="text-gray-300">Rate Limits:</strong> Varies by org type (600-10,000 req/min)</div>
          <div><strong className="text-gray-300">Documentation:</strong> developer.okta.com/docs/reference</div>
        </p>
      </div>
    </div>
  );
};

export default OktaConfig;
