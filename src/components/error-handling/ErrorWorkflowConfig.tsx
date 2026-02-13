/**
 * Error Workflow Configuration Component
 * Configure global error workflows and error handling behavior
 */

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  CheckCircle,
  Settings
} from 'lucide-react';
import {
  ErrorWorkflowConfig as IErrorWorkflowConfig,
  errorWorkflowService
} from '../../services/ErrorWorkflowService';

export const ErrorWorkflowConfig: React.FC<{
  workflowId?: string;
  onSave?: (config: IErrorWorkflowConfig) => void;
}> = ({ workflowId, onSave }) => {
  const [errorWorkflows, setErrorWorkflows] = useState<IErrorWorkflowConfig[]>([]);
  const [editingWorkflow, setEditingWorkflow] = useState<IErrorWorkflowConfig | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [templates, setTemplates] = useState(errorWorkflowService.getTemplates());

  useEffect(() => {
    loadErrorWorkflows();
  }, []);

  const loadErrorWorkflows = () => {
    const workflows = errorWorkflowService.getAllErrorWorkflows();
    setErrorWorkflows(workflows);
  };

  const handleCreateNew = () => {
    setEditingWorkflow({
      id: `error-workflow-${Date.now()}`,
      name: '',
      description: '',
      enabled: true,
      workflowId: workflowId || '',
      trigger: {
        type: 'all'
      },
      priority: 50,
      async: true
    });
    setShowForm(true);
  };

  const handleEdit = (workflow: IErrorWorkflowConfig) => {
    setEditingWorkflow({ ...workflow });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!editingWorkflow) return;

    errorWorkflowService.registerErrorWorkflow(editingWorkflow);
    loadErrorWorkflows();
    setShowForm(false);
    setEditingWorkflow(null);

    if (onSave) {
      onSave(editingWorkflow);
    }
  };

  const handleDelete = (workflowId: string) => {
    if (confirm('Are you sure you want to delete this error workflow?')) {
      errorWorkflowService.unregisterErrorWorkflow(workflowId);
      loadErrorWorkflows();
    }
  };

  const handleCreateFromTemplate = (templateId: string) => {
    const template = errorWorkflowService.getTemplate(templateId);
    if (!template) return;

    const workflow = errorWorkflowService.createFromTemplate(templateId, {
      workflowId: workflowId || ''
    });

    if (workflow) {
      setEditingWorkflow(workflow);
      setShowForm(true);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            Error Workflow Configuration
          </h2>
          <p className="text-gray-600 mt-1">
            Configure workflows to execute when errors occur
          </p>
        </div>

        <button
          onClick={handleCreateNew}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Error Workflow
        </button>
      </div>

      {/* Error Workflow List */}
      <div className="space-y-4 mb-6">
        {errorWorkflows.map(workflow => (
          <div
            key={workflow.id}
            className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-900">{workflow.name}</h3>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      workflow.enabled
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {workflow.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    Priority: {workflow.priority}
                  </span>
                </div>
                <p className="text-gray-600 mt-1">{workflow.description}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span>Trigger: {getTriggerLabel(workflow.trigger.type)}</span>
                  <span>Execution: {workflow.async ? 'Async' : 'Sync'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(workflow)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(workflow.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {errorWorkflows.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No error workflows configured</p>
            <p className="text-sm mt-1">Create one to handle errors automatically</p>
          </div>
        )}
      </div>

      {/* Templates Section */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Start Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(template => (
            <div
              key={template.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer transition-colors"
              onClick={() => handleCreateFromTemplate(template.id)}
            >
              <h4 className="font-semibold text-gray-900">{template.name}</h4>
              <p className="text-sm text-gray-600 mt-1">{template.description}</p>
              <div className="mt-2">
                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                  {template.category}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Form Modal */}
      {showForm && editingWorkflow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingWorkflow.id.startsWith('error-workflow-') && !errorWorkflows.find(w => w.id === editingWorkflow.id)
                  ? 'Create Error Workflow'
                  : 'Edit Error Workflow'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Workflow Name
                </label>
                <input
                  type="text"
                  value={editingWorkflow.name}
                  onChange={e =>
                    setEditingWorkflow({ ...editingWorkflow, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Slack Error Notification"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editingWorkflow.description}
                  onChange={e =>
                    setEditingWorkflow({ ...editingWorkflow, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Describe what this error workflow does"
                />
              </div>

              {/* Trigger Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trigger Type
                </label>
                <select
                  value={editingWorkflow.trigger.type}
                  onChange={e =>
                    setEditingWorkflow({
                      ...editingWorkflow,
                      trigger: { ...editingWorkflow.trigger, type: e.target.value as any }
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Errors</option>
                  <option value="specific_nodes">Specific Nodes</option>
                  <option value="error_codes">Specific Error Codes</option>
                  <option value="node_types">Specific Node Types</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority (1-100)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={editingWorkflow.priority}
                  onChange={e =>
                    setEditingWorkflow({
                      ...editingWorkflow,
                      priority: parseInt(e.target.value) || 50
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Higher priority workflows execute first
                </p>
              </div>

              {/* Options */}
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingWorkflow.enabled}
                    onChange={e =>
                      setEditingWorkflow({ ...editingWorkflow, enabled: e.target.checked })
                    }
                    className="rounded text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Enabled</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingWorkflow.async}
                    onChange={e =>
                      setEditingWorkflow({ ...editingWorkflow, async: e.target.checked })
                    }
                    className="rounded text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    Execute Asynchronously (don't block main workflow)
                  </span>
                </label>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function getTriggerLabel(type: string): string {
  switch (type) {
    case 'all':
      return 'All Errors';
    case 'specific_nodes':
      return 'Specific Nodes';
    case 'error_codes':
      return 'Specific Error Codes';
    case 'node_types':
      return 'Specific Node Types';
    default:
      return type;
  }
}
