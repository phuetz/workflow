import React, { useState, useEffect } from 'react';
import { Variable as VariableIcon, Lock, Globe, Folder, User, Users, Plus, Edit2, Trash2, Copy, Download, Upload, Search, Shield, History, Settings, X } from 'lucide-react';
import { VariablesService } from '../../services/VariablesService';
import type {
  WorkflowVariable,
  Environment,
  VariableType,
  VariableScope,
  VariableGroup,
  Secret,
  VariableHistory as VarHistory,
  VariableExport
} from '../../types/variables';
import { format } from 'date-fns';
import { logger } from '../../services/SimpleLogger';
import { useToast } from '../ui/Toast';

// Mock authService until proper import is added
const authService = {
  getCurrentUser: () => 'current-user'
};

const variablesService = VariablesService.getInstance();

interface VariablesManagerProps {
  workflowId?: string;
  onVariableSelect?: (variable: WorkflowVariable) => void;
}

export const VariablesManager: React.FC<VariablesManagerProps> = ({
  workflowId,
  onVariableSelect: _onVariableSelect // eslint-disable-line @typescript-eslint/no-unused-vars
}) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'variables' | 'environments' | 'secrets' | 'groups'>('variables');
  const [variables, setVariables] = useState<WorkflowVariable[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [_secrets, _setSecrets] = useState<Secret[]>([]); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [_groups, _setGroups] = useState<VariableGroup[]>([]); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [selectedVariable, setSelectedVariable] = useState<WorkflowVariable | null>(null);
  const [selectedEnvironment, setSelectedEnvironment] = useState<Environment | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [_showEditModal, setShowEditModal] = useState(false); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [createType, setCreateType] = useState<'variable' | 'environment' | 'secret' | 'group'>('variable');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterScope, setFilterScope] = useState<VariableScope | 'all'>('all');
  const [filterType, setFilterType] = useState<VariableType | 'all'>('all');
  const [showHistory, setShowHistory] = useState(false);
  const [variableHistory, setVariableHistory] = useState<VarHistory[]>([]);
  const [_expandedGroups, _setExpandedGroups] = useState<Set<string>>(new Set()); // eslint-disable-line @typescript-eslint/no-unused-vars

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    value: '',
    type: 'string' as VariableType,
    scope: 'global' as VariableScope,
    description: '',
    encrypted: false,
    required: false
  });

  const [envFormData, setEnvFormData] = useState({
    name: '',
    description: '',
    isDefault: false,
    parentEnvironment: ''
  });

  const loadData = async () => {
    const [vars, envs] = await Promise.all([
      variablesService.listVariables({ includeSecrets: true }),
      variablesService.listEnvironments()
    ]);
    
    setVariables(vars);
    setEnvironments(envs);
    
    // Set default environment
    const defaultEnv = envs.find(env => env.isDefault);
    if (defaultEnv) {
      setSelectedEnvironment(defaultEnv);
    }
  };

  const loadVariableHistory = async (variableId: string) => {
    const history = await variablesService.getVariableHistory(variableId);
    setVariableHistory(history);
    setShowHistory(true);
  };

  useEffect(() => {
    loadData();
  }, [workflowId]);

  const handleCreateVariable = async () => {
    try {
      await variablesService.createVariable({
        ...formData,
        createdBy: authService.getCurrentUser() || 'anonymous',
      });
      
      setShowCreateModal(false);
      setFormData({
        name: '',
        value: '',
        type: 'string',
        scope: 'global',
        description: '',
        encrypted: false,
        required: false
      });
      
      loadData();
    } catch (error) {
      logger.error('Failed to create variable:', error);
    }
  };

  const handleUpdateVariable = async () => {
    if (!selectedVariable) return;
    
    try {
      await variablesService.updateVariable(selectedVariable.id, {
        ...formData,
        createdBy: authService.getCurrentUser()
      });
      
      setShowEditModal(false);
      loadData();
    } catch (error) {
      logger.error('Failed to update variable:', error);
    }
  };

  const handleDeleteVariable = async (variable: any) => {
    if (!confirm(`Delete variable "${variable.name}"?`)) return;
    
    try {
      await variablesService.deleteVariable(variable.id);
      loadData();
    } catch (error) {
      logger.error('Failed to delete variable:', error);
      toast.error(error instanceof Error ? error.message : 'Delete failed');
    }
  };

  const handleCreateEnvironment = async () => {
    try {
      await variablesService.createEnvironment({
        ...envFormData,
        variables: [],
        active: true,
        createdBy: authService.getCurrentUser()
      });
      
      setShowCreateModal(false);
      setEnvFormData({
        name: '',
        description: '',
        isDefault: false,
        parentEnvironment: ''
      });
      
      loadData();
    } catch (error) {
      logger.error('Failed to create environment:', error);
    }
  };

  const handleExport = () => {
    const data = {
      environments: environments,
      variables: variables,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `variables-${selectedEnvironment?.name || 'all'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (text: string) => {
    try {
      const data: VariableExport = JSON.parse(text);
      await variablesService.importVariables(data, selectedEnvironment?.id);
      loadData();
    } catch (error) {
      logger.error('Failed to import variables:', error);
    }
  };

  const copyToClipboard = (value: string) => {
    navigator.clipboard.writeText(value);
  };

  const getScopeIcon = (scope: string) => {
    switch (scope) {
      case 'global': return <Globe className="w-4 h-4" />;
      case 'workflow': return <Folder className="w-4 h-4" />;
      case 'environment': return <Settings className="w-4 h-4" />;
      case 'user': return <User className="w-4 h-4" />;
      case 'team': return <Users className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'string': return 'text-blue-600';
      case 'number': return 'text-green-600';
      case 'boolean': return 'text-purple-600';
      case 'json': return 'text-orange-600';
      case 'secret': return 'text-red-600';
      case 'file': return 'text-gray-600';
      case 'date': return 'text-indigo-600';
    }
  };

  const filterVariables = (v: WorkflowVariable) => {
    if (searchTerm && !v.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !v.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (filterScope !== 'all' && v.scope !== filterScope) {
      return false;
    }
    if (filterType !== 'all' && v.type !== filterType) {
      return false;
    }
    return true;
  };

  const filteredVariables = variables.filter(filterVariables);

  const renderVariablesTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search variables..."
              className="pl-10 pr-4 py-2 border rounded-lg w-64"
            />
          </div>
          
          <select
            value={filterScope}
            onChange={(e) => setFilterScope(e.target.value as VariableScope | 'all')}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="all">All Scopes</option>
            <option value="global">Global</option>
            <option value="workflow">Workflow</option>
            <option value="environment">Environment</option>
            <option value="user">User</option>
            <option value="team">Team</option>
          </select>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as VariableType | 'all')}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="all">All Types</option>
            <option value="string">String</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
            <option value="json">JSON</option>
            <option value="secret">Secret</option>
            <option value="file">File</option>
            <option value="date">Date</option>
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <label className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            Import
            <input
              type="file"
              accept=".json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const text = event.target?.result as string;
                    if (text) {
                      handleImport(text);
                    }
                  };
                  reader.readAsText(file);
                }
              }}
              className="hidden"
            />
          </label>
          <button
            onClick={() => {
              setCreateType('variable');
              setShowCreateModal(true);
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Variable
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Value</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Type</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Scope</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Description</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredVariables.map((variable, index) => (
              <tr key={variable.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {variable.encrypted && <Lock className="w-4 h-4 text-gray-400" />}
                    <span className="font-mono text-sm">{variable.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {variable.type === 'secret' || variable.encrypted ? (
                      <span className="text-gray-400">••••••••</span>
                    ) : (
                      <span className="text-sm truncate max-w-xs" title={String(variable.value)}>
                        {String(variable.value)}
                      </span>
                    )}
                    <button
                      onClick={() => copyToClipboard(`{{${variable.name}}}`)}
                      className="p-1 hover:bg-gray-200 rounded"
                      title="Copy variable reference"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-sm ${getTypeColor(variable.type)}`}>
                    {variable.type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {getScopeIcon(variable.scope)}
                    <span className="text-sm">{variable.scope}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-600">{variable.description}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => loadVariableHistory(variable.id)}
                      className="p-1 hover:bg-gray-200 rounded"
                      title="View history"
                    >
                      <History className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedVariable(variable);
                        setFormData({
                          name: variable.name,
                          value: String(variable.value),
                          type: variable.type,
                          scope: variable.scope,
                          description: variable.description || '',
                          encrypted: variable.encrypted || false,
                          required: variable.required || false
                        });
                        setShowEditModal(true);
                      }}
                      className="p-1 hover:bg-gray-200 rounded"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteVariable(variable)}
                      className="p-1 hover:bg-gray-200 rounded text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderEnvironmentsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Environments</h3>
        <button
          onClick={() => {
            setCreateType('environment');
            setShowCreateModal(true);
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Environment
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {environments.map(env => (
          <div
            key={env.id}
            className={`border rounded-lg p-4 cursor-pointer transition-all ${
              selectedEnvironment?.id === env.id
                ? 'border-blue-500 bg-blue-50'
                : 'hover:border-gray-300'
            }`}
            onClick={() => setSelectedEnvironment(env)}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">{env.name}</h4>
              {env.isDefault && (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                  Default
                </span>
              )}
            </div>
            {env.description && (
              <p className="text-sm text-gray-600 mb-2">{env.description}</p>
            )}
            <div className="text-sm text-gray-500">
              {env.variables.length} variable overrides
            </div>
            {env.parentEnvironment && (
              <div className="text-sm text-gray-500 mt-1">
                Inherits from: {environments.find(e => e.id === env.parentEnvironment)?.name}
              </div>
            )}
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!env.isDefault) {
                    variablesService.setDefaultEnvironment(env.id);
                    loadData();
                  }
                }}
                disabled={env.isDefault}
                className="text-sm text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline"
              >
                Set as default
              </button>
              {!env.isDefault && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete environment "${env.name}"?`)) {
                      variablesService.deleteEnvironment(env.id);
                      loadData();
                    }
                  }}
                  className="text-sm text-red-600 hover:underline"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedEnvironment && (
        <div className="mt-6 border-t pt-6">
          <h4 className="font-medium mb-4">
            Environment Variables: {selectedEnvironment.name}
          </h4>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              Configure environment-specific variable overrides here.
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const renderSecretsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Secrets Management</h3>
        <button
          onClick={() => {
            setCreateType('secret');
            setShowCreateModal(true);
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Secret
        </button>
      </div>

      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center gap-4 mb-4">
          <Shield className="w-8 h-8 text-gray-400" />
          <div>
            <h4 className="font-medium">External Secrets Integration</h4>
            <p className="text-sm text-gray-600">
              Connect to AWS Secrets Manager, Azure Key Vault, or HashiCorp Vault
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <button className="p-4 border rounded-lg hover:bg-gray-50 text-left">
            <div className="font-medium">AWS Secrets Manager</div>
            <div className="text-sm text-gray-600">Store and rotate secrets securely</div>
          </button>
          <button className="p-4 border rounded-lg hover:bg-gray-50 text-left">
            <div className="font-medium">Azure Key Vault</div>
            <div className="text-sm text-gray-600">Manage keys and secrets in Azure</div>
          </button>
          <button className="p-4 border rounded-lg hover:bg-gray-50 text-left">
            <div className="font-medium">HashiCorp Vault</div>
            <div className="text-sm text-gray-600">Enterprise secret management</div>
          </button>
          <button className="p-4 border rounded-lg hover:bg-gray-50 text-left">
            <div className="font-medium">Google Secret Manager</div>
            <div className="text-sm text-gray-600">GCP secret storage solution</div>
          </button>
        </div>
      </div>
    </div>
  );

  const renderGroupsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Variable Groups</h3>
        <button
          onClick={() => {
            setCreateType('group');
            setShowCreateModal(true);
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Group
        </button>
      </div>

      <div className="bg-white border rounded-lg">
        <div className="p-6 text-center text-gray-500">
          <Folder className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No variable groups created yet</p>
          <p className="text-sm mt-2">
            Group related variables together for easier management
          </p>
        </div>
      </div>
    </div>
  );

  const renderCreateModal = () => {
    if (!showCreateModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-semibold mb-4">
            Create New {createType.charAt(0).toUpperCase() + createType.slice(1)}
          </h3>

          {createType === 'variable' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="VARIABLE_NAME"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Value</label>
                <input
                  type={formData.type === 'number' ? 'number' : 'text'}
                  value={formData.value}
                  onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as VariableType }))}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                    <option value="json">JSON</option>
                    <option value="secret">Secret</option>
                    <option value="date">Date</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Scope</label>
                  <select
                    value={formData.scope}
                    onChange={(e) => setFormData(prev => ({ ...prev, scope: e.target.value as VariableScope }))}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="global">Global</option>
                    <option value="workflow">Workflow</option>
                    <option value="environment">Environment</option>
                    <option value="user">User</option>
                    <option value="team">Team</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.encrypted}
                    onChange={(e) => setFormData(prev => ({ ...prev, encrypted: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm">Encrypt this variable</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.required}
                    onChange={(e) => setFormData(prev => ({ ...prev, required: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm">Required variable</span>
                </label>
              </div>
            </div>
          )}

          {createType === 'environment' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={envFormData.name}
                  onChange={(e) => setEnvFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Production"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={envFormData.description}
                  onChange={(e) => setEnvFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Parent Environment</label>
                <select
                  value={envFormData.parentEnvironment}
                  onChange={(e) => setEnvFormData(prev => ({ ...prev, parentEnvironment: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">None</option>
                  {environments.map(env => (
                    <option key={env.id} value={env.id}>{env.name}</option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={envFormData.isDefault}
                  onChange={(e) => setEnvFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Set as default environment</span>
              </label>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={createType === 'variable' ? handleCreateVariable : handleCreateEnvironment}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Create
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderHistoryModal = () => {
    if (!showHistory) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Variable History</h3>
            <button
              onClick={() => setShowHistory(false)}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="space-y-3">
              {variableHistory.map(entry => (
                <div key={entry.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">
                      {format(entry.changedAt, 'PPpp')}
                    </span>
                    <span className="text-sm text-gray-600">
                      by {entry.changedBy}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-gray-700">Previous Value</div>
                      <div className="mt-1 p-2 bg-gray-50 rounded font-mono text-sm">
                        {entry.previousValue !== null ? String(entry.previousValue) : 'null'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700">New Value</div>
                      <div className="mt-1 p-2 bg-green-50 rounded font-mono text-sm">
                        {String(entry.newValue)}
                      </div>
                    </div>
                  </div>
                  {entry.reason && (
                    <div className="mt-2 text-sm text-gray-600">
                      Reason: {entry.reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Variables & Environment</h2>
          <p className="text-gray-600">Manage workflow variables, environments, and secrets</p>
        </div>

        <div className="mb-6">
          <div className="flex gap-2 bg-white p-2 rounded-lg shadow-sm">
            {(['variables', 'environments', 'secrets', 'groups'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded ${
                  activeTab === tab 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab === 'variables' && <VariableIcon className="w-4 h-4 inline mr-2" />}
                {tab === 'environments' && <Globe className="w-4 h-4 inline mr-2" />}
                {tab === 'secrets' && <Lock className="w-4 h-4 inline mr-2" />}
                {tab === 'groups' && <Folder className="w-4 h-4 inline mr-2" />}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          {activeTab === 'variables' && renderVariablesTab()}
          {activeTab === 'environments' && renderEnvironmentsTab()}
          {activeTab === 'secrets' && renderSecretsTab()}
          {activeTab === 'groups' && renderGroupsTab()}
        </div>
      </div>

      {renderCreateModal()}
      {renderHistoryModal()}
    </div>
  );
};