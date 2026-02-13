/**
 * Koyeb Node Configuration
 * Serverless platform for deploying apps globally
 */

import React, { useState } from 'react';

interface KoyebConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

type KoyebOperation =
  | 'listApps'
  | 'createApp'
  | 'getApp'
  | 'updateApp'
  | 'deleteApp'
  | 'listServices'
  | 'createService'
  | 'getService'
  | 'updateService'
  | 'deleteService'
  | 'listDeployments'
  | 'getDeployment'
  | 'redeployService'
  | 'listDomains'
  | 'createDomain'
  | 'deleteDomain'
  | 'listSecrets'
  | 'createSecret'
  | 'deleteSecret';

export const KoyebConfig: React.FC<KoyebConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<KoyebOperation>(
    (config.operation as KoyebOperation) || 'listApps'
  );
  const [apiToken, setApiToken] = useState((config.apiToken as string) || '');
  const [appId, setAppId] = useState((config.appId as string) || '');
  const [appName, setAppName] = useState((config.appName as string) || '');
  const [serviceId, setServiceId] = useState((config.serviceId as string) || '');
  const [serviceName, setServiceName] = useState((config.serviceName as string) || '');
  const [serviceConfig, setServiceConfig] = useState((config.serviceConfig as string) || '');
  const [deploymentId, setDeploymentId] = useState((config.deploymentId as string) || '');
  const [domainName, setDomainName] = useState((config.domainName as string) || '');
  const [secretName, setSecretName] = useState((config.secretName as string) || '');
  const [secretValue, setSecretValue] = useState((config.secretValue as string) || '');
  const [region, setRegion] = useState((config.region as string) || 'fra');

  const handleOperationChange = (newOperation: KoyebOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleApiTokenChange = (value: string) => {
    setApiToken(value);
    onChange({ ...config, apiToken: value });
  };

  const handleAppIdChange = (value: string) => {
    setAppId(value);
    onChange({ ...config, appId: value });
  };

  const handleAppNameChange = (value: string) => {
    setAppName(value);
    onChange({ ...config, appName: value });
  };

  const handleServiceIdChange = (value: string) => {
    setServiceId(value);
    onChange({ ...config, serviceId: value });
  };

  const handleServiceNameChange = (value: string) => {
    setServiceName(value);
    onChange({ ...config, serviceName: value });
  };

  const handleServiceConfigChange = (value: string) => {
    setServiceConfig(value);
    onChange({ ...config, serviceConfig: value });
  };

  const handleDeploymentIdChange = (value: string) => {
    setDeploymentId(value);
    onChange({ ...config, deploymentId: value });
  };

  const handleDomainNameChange = (value: string) => {
    setDomainName(value);
    onChange({ ...config, domainName: value });
  };

  const handleSecretNameChange = (value: string) => {
    setSecretName(value);
    onChange({ ...config, secretName: value });
  };

  const handleSecretValueChange = (value: string) => {
    setSecretValue(value);
    onChange({ ...config, secretValue: value });
  };

  const handleRegionChange = (value: string) => {
    setRegion(value);
    onChange({ ...config, region: value });
  };

  const loadExample = (example: 'createApp' | 'createService' | 'createDomain') => {
    if (example === 'createApp') {
      handleOperationChange('createApp');
      handleAppNameChange('my-web-app');
    } else if (example === 'createService') {
      handleOperationChange('createService');
      handleAppIdChange('{{ $json.appId }}');
      handleServiceNameChange('web');
      handleServiceConfigChange(JSON.stringify({
        type: 'WEB',
        ports: [{ port: 8000, protocol: 'http' }],
        env: [
          { key: 'NODE_ENV', value: 'production' }
        ],
        regions: ['fra'],
        instance_types: ['nano']
      }, null, 2));
    } else if (example === 'createDomain') {
      handleOperationChange('createDomain');
      handleAppIdChange('{{ $json.appId }}');
      handleDomainNameChange('myapp.example.com');
    }
  };

  return (
    <div className="space-y-4 bg-gray-900 text-gray-100 p-4 rounded-lg">
      <div className="font-semibold text-lg mb-4 text-white">Koyeb Configuration</div>

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
          Generate from Koyeb dashboard: Account → API
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as KoyebOperation)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <optgroup label="Apps">
            <option value="listApps">List Apps</option>
            <option value="createApp">Create App</option>
            <option value="getApp">Get App</option>
            <option value="updateApp">Update App</option>
            <option value="deleteApp">Delete App</option>
          </optgroup>
          <optgroup label="Services">
            <option value="listServices">List Services</option>
            <option value="createService">Create Service</option>
            <option value="getService">Get Service</option>
            <option value="updateService">Update Service</option>
            <option value="deleteService">Delete Service</option>
            <option value="redeployService">Redeploy Service</option>
          </optgroup>
          <optgroup label="Deployments">
            <option value="listDeployments">List Deployments</option>
            <option value="getDeployment">Get Deployment</option>
          </optgroup>
          <optgroup label="Domains">
            <option value="listDomains">List Domains</option>
            <option value="createDomain">Create Domain</option>
            <option value="deleteDomain">Delete Domain</option>
          </optgroup>
          <optgroup label="Secrets">
            <option value="listSecrets">List Secrets</option>
            <option value="createSecret">Create Secret</option>
            <option value="deleteSecret">Delete Secret</option>
          </optgroup>
        </select>
      </div>

      {operation === 'createApp' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            App Name
          </label>
          <input
            type="text"
            value={appName}
            onChange={(e) => handleAppNameChange(e.target.value)}
            placeholder="my-web-app"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1">
            App name (lowercase, alphanumeric, and hyphens only)
          </p>
        </div>
      )}

      {(operation === 'getApp' || operation === 'updateApp' || operation === 'deleteApp' ||
        operation === 'listServices' || operation === 'createService' ||
        operation === 'listDomains' || operation === 'createDomain') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            App ID
          </label>
          <input
            type="text"
            value={appId}
            onChange={(e) => handleAppIdChange(e.target.value)}
            placeholder="app-id or {{ $json.appId }}"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
        </div>
      )}

      {(operation === 'createService' || operation === 'updateService') && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Service Name
            </label>
            <input
              type="text"
              value={serviceName}
              onChange={(e) => handleServiceNameChange(e.target.value)}
              placeholder="web"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Service Configuration (JSON)
            </label>
            <textarea
              value={serviceConfig}
              onChange={(e) => handleServiceConfigChange(e.target.value)}
              placeholder={JSON.stringify({
                type: 'WEB',
                ports: [{ port: 8000, protocol: 'http' }],
                env: [{ key: 'NODE_ENV', value: 'production' }],
                regions: ['fra'],
                instance_types: ['nano']
              }, null, 2)}
              rows={10}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              Service definition with type, ports, env vars, regions, and instance types
            </p>
          </div>
        </>
      )}

      {(operation === 'getService' || operation === 'updateService' ||
        operation === 'deleteService' || operation === 'redeployService' ||
        operation === 'listDeployments') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Service ID
          </label>
          <input
            type="text"
            value={serviceId}
            onChange={(e) => handleServiceIdChange(e.target.value)}
            placeholder="service-id or {{ $json.serviceId }}"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
        </div>
      )}

      {operation === 'getDeployment' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Deployment ID
          </label>
          <input
            type="text"
            value={deploymentId}
            onChange={(e) => handleDeploymentIdChange(e.target.value)}
            placeholder="deployment-id or {{ $json.deploymentId }}"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
        </div>
      )}

      {(operation === 'createDomain' || operation === 'deleteDomain') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Domain Name
          </label>
          <input
            type="text"
            value={domainName}
            onChange={(e) => handleDomainNameChange(e.target.value)}
            placeholder="myapp.example.com"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

      {(operation === 'createSecret' || operation === 'deleteSecret') && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Secret Name
            </label>
            <input
              type="text"
              value={secretName}
              onChange={(e) => handleSecretNameChange(e.target.value)}
              placeholder="DATABASE_PASSWORD"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
          </div>
          {operation === 'createSecret' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Secret Value
              </label>
              <input
                type="password"
                value={secretValue}
                onChange={(e) => handleSecretValueChange(e.target.value)}
                placeholder="secret-value"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
            </div>
          )}
        </>
      )}

      {(operation === 'createService' || operation === 'updateService') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Region
          </label>
          <select
            value={region}
            onChange={(e) => handleRegionChange(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="fra">Frankfurt (fra)</option>
            <option value="was">Washington DC (was)</option>
            <option value="sin">Singapore (sin)</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">
            Region for deploying the service
          </p>
        </div>
      )}

      <div className="border-t border-gray-700 pt-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Quick Examples
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => loadExample('createApp')}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
          >
            Create App
          </button>
          <button
            onClick={() => loadExample('createService')}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
          >
            Create Service
          </button>
          <button
            onClick={() => loadExample('createDomain')}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
          >
            Add Custom Domain
          </button>
        </div>
      </div>

      <div className="bg-blue-900 border border-blue-700 rounded-md p-3">
        <p className="text-sm text-blue-200 font-medium mb-1">Authentication</p>
        <p className="text-xs text-blue-300">
          Requires Koyeb API token. Generate from Account → API in the Koyeb dashboard.
        </p>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-md p-3">
        <p className="text-xs text-gray-400 space-y-1">
          <div><strong className="text-gray-300">API Version:</strong> v1</div>
          <div><strong className="text-gray-300">Rate Limits:</strong> 100 requests per minute</div>
          <div><strong className="text-gray-300">Documentation:</strong> koyeb.com/docs/api</div>
        </p>
      </div>
    </div>
  );
};

export default KoyebConfig;
