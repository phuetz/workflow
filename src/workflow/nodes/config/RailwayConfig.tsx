/**
 * Railway Node Configuration
 * Platform-as-a-Service deployment and infrastructure management
 */

import React, { useState } from 'react';

interface RailwayConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

type RailwayOperation =
  | 'listProjects'
  | 'createProject'
  | 'getProject'
  | 'deleteProject'
  | 'listServices'
  | 'createService'
  | 'getService'
  | 'updateService'
  | 'deleteService'
  | 'deployService'
  | 'listDeployments'
  | 'getDeployment'
  | 'getLogs'
  | 'listEnvironments'
  | 'createEnvironment'
  | 'listVariables'
  | 'setVariable'
  | 'deleteVariable';

export const RailwayConfig: React.FC<RailwayConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<RailwayOperation>(
    (config.operation as RailwayOperation) || 'listProjects'
  );
  const [apiToken, setApiToken] = useState((config.apiToken as string) || '');
  const [projectId, setProjectId] = useState((config.projectId as string) || '');
  const [serviceId, setServiceId] = useState((config.serviceId as string) || '');
  const [deploymentId, setDeploymentId] = useState((config.deploymentId as string) || '');
  const [environmentId, setEnvironmentId] = useState((config.environmentId as string) || '');
  const [projectName, setProjectName] = useState((config.projectName as string) || '');
  const [serviceName, setServiceName] = useState((config.serviceName as string) || '');
  const [serviceConfig, setServiceConfig] = useState((config.serviceConfig as string) || '');
  const [variableName, setVariableName] = useState((config.variableName as string) || '');
  const [variableValue, setVariableValue] = useState((config.variableValue as string) || '');
  const [logLines, setLogLines] = useState((config.logLines as number) || 100);

  const handleOperationChange = (newOperation: RailwayOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleApiTokenChange = (value: string) => {
    setApiToken(value);
    onChange({ ...config, apiToken: value });
  };

  const handleProjectIdChange = (value: string) => {
    setProjectId(value);
    onChange({ ...config, projectId: value });
  };

  const handleServiceIdChange = (value: string) => {
    setServiceId(value);
    onChange({ ...config, serviceId: value });
  };

  const handleDeploymentIdChange = (value: string) => {
    setDeploymentId(value);
    onChange({ ...config, deploymentId: value });
  };

  const handleEnvironmentIdChange = (value: string) => {
    setEnvironmentId(value);
    onChange({ ...config, environmentId: value });
  };

  const handleProjectNameChange = (value: string) => {
    setProjectName(value);
    onChange({ ...config, projectName: value });
  };

  const handleServiceNameChange = (value: string) => {
    setServiceName(value);
    onChange({ ...config, serviceName: value });
  };

  const handleServiceConfigChange = (value: string) => {
    setServiceConfig(value);
    onChange({ ...config, serviceConfig: value });
  };

  const handleVariableNameChange = (value: string) => {
    setVariableName(value);
    onChange({ ...config, variableName: value });
  };

  const handleVariableValueChange = (value: string) => {
    setVariableValue(value);
    onChange({ ...config, variableValue: value });
  };

  const handleLogLinesChange = (value: number) => {
    setLogLines(value);
    onChange({ ...config, logLines: value });
  };

  const loadExample = (example: 'createProject' | 'deployService' | 'setVariable') => {
    if (example === 'createProject') {
      handleOperationChange('createProject');
      handleProjectNameChange('my-awesome-app');
    } else if (example === 'deployService') {
      handleOperationChange('deployService');
      handleProjectIdChange('{{ $json.projectId }}');
      handleServiceIdChange('{{ $json.serviceId }}');
    } else if (example === 'setVariable') {
      handleOperationChange('setVariable');
      handleProjectIdChange('{{ $json.projectId }}');
      handleEnvironmentIdChange('{{ $json.environmentId }}');
      handleVariableNameChange('DATABASE_URL');
      handleVariableValueChange('postgresql://...');
    }
  };

  return (
    <div className="space-y-4 bg-gray-900 text-gray-100 p-4 rounded-lg">
      <div className="font-semibold text-lg mb-4 text-white">Railway Configuration</div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          API Token
        </label>
        <input
          type="password"
          value={apiToken}
          onChange={(e) => handleApiTokenChange(e.target.value)}
          placeholder="API Token or {{ $credentials.apiToken }}"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
        />
        <p className="text-xs text-gray-400 mt-1">
          Generate from Railway dashboard: Settings → Tokens
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as RailwayOperation)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <optgroup label="Projects">
            <option value="listProjects">List Projects</option>
            <option value="createProject">Create Project</option>
            <option value="getProject">Get Project</option>
            <option value="deleteProject">Delete Project</option>
          </optgroup>
          <optgroup label="Services">
            <option value="listServices">List Services</option>
            <option value="createService">Create Service</option>
            <option value="getService">Get Service</option>
            <option value="updateService">Update Service</option>
            <option value="deleteService">Delete Service</option>
            <option value="deployService">Deploy Service</option>
          </optgroup>
          <optgroup label="Deployments">
            <option value="listDeployments">List Deployments</option>
            <option value="getDeployment">Get Deployment</option>
            <option value="getLogs">Get Logs</option>
          </optgroup>
          <optgroup label="Environments">
            <option value="listEnvironments">List Environments</option>
            <option value="createEnvironment">Create Environment</option>
          </optgroup>
          <optgroup label="Variables">
            <option value="listVariables">List Variables</option>
            <option value="setVariable">Set Variable</option>
            <option value="deleteVariable">Delete Variable</option>
          </optgroup>
        </select>
      </div>

      {operation === 'createProject' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Project Name
          </label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => handleProjectNameChange(e.target.value)}
            placeholder="my-awesome-app"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      )}

      {(operation === 'getProject' || operation === 'deleteProject' ||
        operation === 'listServices' || operation === 'createService' ||
        operation === 'listDeployments' || operation === 'listEnvironments' ||
        operation === 'createEnvironment' || operation === 'listVariables') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Project ID
          </label>
          <input
            type="text"
            value={projectId}
            onChange={(e) => handleProjectIdChange(e.target.value)}
            placeholder="project_abc123 or {{ $json.projectId }}"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
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
              placeholder="web-service"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                source: {
                  repo: 'owner/repo',
                  branch: 'main'
                },
                builder: 'NIXPACKS',
                rootDirectory: '/'
              }, null, 2)}
              rows={8}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
            />
          </div>
        </>
      )}

      {(operation === 'getService' || operation === 'updateService' ||
        operation === 'deleteService' || operation === 'deployService') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Service ID
          </label>
          <input
            type="text"
            value={serviceId}
            onChange={(e) => handleServiceIdChange(e.target.value)}
            placeholder="service_xyz789 or {{ $json.serviceId }}"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
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
            placeholder="deployment_def456 or {{ $json.deploymentId }}"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
          />
        </div>
      )}

      {(operation === 'createEnvironment' || operation === 'listVariables' ||
        operation === 'setVariable' || operation === 'deleteVariable') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Environment ID
          </label>
          <input
            type="text"
            value={environmentId}
            onChange={(e) => handleEnvironmentIdChange(e.target.value)}
            placeholder="env_production or {{ $json.environmentId }}"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            Common environments: production, staging, development
          </p>
        </div>
      )}

      {(operation === 'setVariable' || operation === 'deleteVariable') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Variable Name
          </label>
          <input
            type="text"
            value={variableName}
            onChange={(e) => handleVariableNameChange(e.target.value)}
            placeholder="DATABASE_URL"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
          />
        </div>
      )}

      {operation === 'setVariable' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Variable Value
          </label>
          <input
            type="text"
            value={variableValue}
            onChange={(e) => handleVariableValueChange(e.target.value)}
            placeholder="postgresql://..."
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
          />
        </div>
      )}

      {operation === 'getLogs' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Number of Log Lines
          </label>
          <input
            type="number"
            value={logLines}
            onChange={(e) => handleLogLinesChange(parseInt(e.target.value, 10))}
            min={1}
            max={1000}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1">
            Number of log lines to retrieve (1-1000)
          </p>
        </div>
      )}

      <div className="border-t border-gray-700 pt-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Quick Examples
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => loadExample('createProject')}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
          >
            Create Project
          </button>
          <button
            onClick={() => loadExample('deployService')}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
          >
            Deploy Service
          </button>
          <button
            onClick={() => loadExample('setVariable')}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
          >
            Set Environment Variable
          </button>
        </div>
      </div>

      <div className="bg-purple-900 border border-purple-700 rounded-md p-3">
        <p className="text-sm text-purple-200 font-medium mb-1">Authentication</p>
        <p className="text-xs text-purple-300">
          Requires Railway API token with appropriate permissions. Generate from Settings → Tokens.
        </p>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-md p-3">
        <p className="text-xs text-gray-400 space-y-1">
          <div><strong className="text-gray-300">API Version:</strong> GraphQL API</div>
          <div><strong className="text-gray-300">Rate Limits:</strong> 100 requests per minute</div>
          <div><strong className="text-gray-300">Documentation:</strong> docs.railway.app/reference/public-api</div>
        </p>
      </div>
    </div>
  );
};

export default RailwayConfig;
