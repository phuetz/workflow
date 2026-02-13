import React, { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { TestBuilderProps, TestCase } from './types';

export function TestBuilder({ darkMode, selectedTest, workflows, onClose, onSave }: TestBuilderProps) {
  const [formData, setFormData] = useState<Partial<TestCase>>({
    name: selectedTest?.name || '',
    description: selectedTest?.description || '',
    workflowId: selectedTest?.workflowId || '',
    type: selectedTest?.type || 'unit',
    enabled: selectedTest?.enabled ?? true,
    tags: selectedTest?.tags || [],
    steps: selectedTest?.steps || [],
    assertions: selectedTest?.assertions || [],
    timeout: selectedTest?.timeout || 30000,
    retryCount: selectedTest?.retryCount || 3,
    retryDelay: selectedTest?.retryDelay || 1000,
    environment: selectedTest?.environment || 'dev',
    variables: selectedTest?.variables || {},
    dependencies: selectedTest?.dependencies || [],
    setup: selectedTest?.setup || {
      mockData: {},
      fixtures: [],
      environment: {},
      prerequisites: []
    },
    cleanup: selectedTest?.cleanup || {
      actions: [],
      alwaysRun: true
    }
  });

  const handleSave = async () => {
    await onSave(formData);
  };

  const addStep = () => {
    const newStep = {
      id: `step_${Date.now()}`,
      name: 'New Step',
      type: 'action' as const,
      action: {
        type: 'trigger_workflow' as const,
        config: {},
        input: {}
      },
      continueOnFailure: false,
      timeout: 30000
    };

    setFormData(prev => ({
      ...prev,
      steps: [...(prev.steps || []), newStep]
    }));
  };

  const addAssertion = () => {
    const newAssertion = {
      id: `assert_${Date.now()}`,
      name: 'New Assertion',
      type: 'equals' as const,
      field: '',
      expected: ''
    };

    setFormData(prev => ({
      ...prev,
      assertions: [...(prev.assertions || []), newAssertion]
    }));
  };

  const updateStep = (index: number, updates: Partial<typeof formData.steps[0]>) => {
    const newSteps = [...(formData.steps || [])];
    newSteps[index] = { ...newSteps[index], ...updates };
    setFormData(prev => ({ ...prev, steps: newSteps }));
  };

  const removeStep = (index: number) => {
    const newSteps = [...(formData.steps || [])];
    newSteps.splice(index, 1);
    setFormData(prev => ({ ...prev, steps: newSteps }));
  };

  const updateAssertion = (index: number, updates: Partial<typeof formData.assertions[0]>) => {
    const newAssertions = [...(formData.assertions || [])];
    newAssertions[index] = { ...newAssertions[index], ...updates };
    setFormData(prev => ({ ...prev, assertions: newAssertions }));
  };

  const removeAssertion = (index: number) => {
    const newAssertions = [...(formData.assertions || [])];
    newAssertions.splice(index, 1);
    setFormData(prev => ({ ...prev, assertions: newAssertions }));
  };

  const inputClass = `w-full px-3 py-2 border rounded-lg ${
    darkMode
      ? 'bg-gray-800 border-gray-700 text-white'
      : 'bg-white border-gray-200 text-gray-900'
  }`;

  const smallInputClass = `px-2 py-1 border rounded text-sm ${
    darkMode
      ? 'bg-gray-600 border-gray-500 text-white'
      : 'bg-white border-gray-200 text-gray-900'
  }`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className={`w-full max-w-4xl max-h-[90vh] ${
          darkMode ? 'bg-gray-900' : 'bg-white'
        } rounded-xl shadow-2xl overflow-hidden`}
      >
        <div
          className={`px-6 py-4 border-b ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {selectedTest ? 'Edit Test Case' : 'Create New Test Case'}
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto" style={{ height: 'calc(90vh - 140px)' }}>
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={inputClass}
                  placeholder="e.g., User Registration Test"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      type: e.target.value as 'unit' | 'integration' | 'e2e' | 'performance' | 'load'
                    }))
                  }
                  className={inputClass}
                >
                  <option value="unit">Unit Test</option>
                  <option value="integration">Integration Test</option>
                  <option value="e2e">End-to-End Test</option>
                  <option value="performance">Performance Test</option>
                  <option value="load">Load Test</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Workflow</label>
              <select
                value={formData.workflowId}
                onChange={(e) => setFormData(prev => ({ ...prev, workflowId: e.target.value }))}
                className={inputClass}
              >
                <option value="">Select a workflow to test</option>
                {workflows.map((_, index) => (
                  <option key={index} value={`workflow-${index}`}>
                    Workflow {index + 1}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className={inputClass}
                rows={3}
                placeholder="Describe what this test validates..."
              />
            </div>

            {/* Test Steps */}
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Test Steps</h4>
                <button
                  onClick={addStep}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                >
                  Add Step
                </button>
              </div>
              <div className="space-y-3">
                {formData.steps?.map((step, index) => (
                  <div
                    key={step.id}
                    className={`p-3 rounded border ${
                      darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-1 text-center font-mono text-sm">{index + 1}</div>
                      <input
                        type="text"
                        placeholder="Step name"
                        value={step.name}
                        onChange={(e) => updateStep(index, { name: e.target.value })}
                        className={`col-span-4 ${smallInputClass}`}
                      />
                      <select
                        value={step.action.type}
                        onChange={(e) =>
                          updateStep(index, {
                            action: {
                              ...step.action,
                              type: e.target.value as
                                | 'trigger_workflow'
                                | 'send_request'
                                | 'validate_response'
                                | 'wait'
                                | 'set_variable'
                                | 'custom'
                            }
                          })
                        }
                        className={`col-span-3 ${smallInputClass}`}
                      >
                        <option value="trigger_workflow">Trigger Workflow</option>
                        <option value="send_request">Send Request</option>
                        <option value="validate_response">Validate Response</option>
                        <option value="wait">Wait</option>
                        <option value="set_variable">Set Variable</option>
                      </select>
                      <input
                        type="number"
                        placeholder="Timeout"
                        value={step.timeout / 1000}
                        onChange={(e) => updateStep(index, { timeout: parseInt(e.target.value) * 1000 })}
                        className={`col-span-2 ${smallInputClass}`}
                      />
                      <label className="col-span-1 flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={step.continueOnFailure}
                          onChange={(e) => updateStep(index, { continueOnFailure: e.target.checked })}
                          className="rounded"
                          title="Continue on failure"
                        />
                      </label>
                      <button
                        onClick={() => removeStep(index)}
                        className="col-span-1 text-red-500 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {(!formData.steps || formData.steps.length === 0) && (
                  <div className="text-center py-4 text-gray-500">
                    No steps defined. Click "Add Step" to create test steps.
                  </div>
                )}
              </div>
            </div>

            {/* Assertions */}
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Assertions</h4>
                <button
                  onClick={addAssertion}
                  className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                >
                  Add Assertion
                </button>
              </div>
              <div className="space-y-3">
                {formData.assertions?.map((assertion, index) => (
                  <div
                    key={assertion.id}
                    className={`p-3 rounded border ${
                      darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Assertion name"
                        value={assertion.name}
                        onChange={(e) => updateAssertion(index, { name: e.target.value })}
                        className={`col-span-3 ${smallInputClass}`}
                      />
                      <input
                        type="text"
                        placeholder="Field path"
                        value={assertion.field}
                        onChange={(e) => updateAssertion(index, { field: e.target.value })}
                        className={`col-span-3 ${smallInputClass}`}
                      />
                      <select
                        value={assertion.type}
                        onChange={(e) =>
                          updateAssertion(index, {
                            type: e.target.value as
                              | 'equals'
                              | 'not_equals'
                              | 'contains'
                              | 'not_contains'
                              | 'greater_than'
                              | 'less_than'
                              | 'exists'
                              | 'not_exists'
                              | 'matches_regex'
                              | 'custom'
                          })
                        }
                        className={`col-span-2 ${smallInputClass}`}
                      >
                        <option value="equals">Equals</option>
                        <option value="not_equals">Not Equals</option>
                        <option value="contains">Contains</option>
                        <option value="greater_than">Greater Than</option>
                        <option value="less_than">Less Than</option>
                        <option value="exists">Exists</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Expected value"
                        value={String(assertion.expected ?? '')}
                        onChange={(e) => updateAssertion(index, { expected: e.target.value })}
                        className={`col-span-3 ${smallInputClass}`}
                      />
                      <button
                        onClick={() => removeAssertion(index)}
                        className="col-span-1 text-red-500 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {(!formData.assertions || formData.assertions.length === 0) && (
                  <div className="text-center py-4 text-gray-500">
                    No assertions defined. Click "Add Assertion" to create test validations.
                  </div>
                )}
              </div>
            </div>

            {/* Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Timeout (seconds)</label>
                <input
                  type="number"
                  value={formData.timeout ? formData.timeout / 1000 : 30}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, timeout: parseInt(e.target.value) * 1000 }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Retry Count</label>
                <input
                  type="number"
                  value={formData.retryCount}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, retryCount: parseInt(e.target.value) }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Environment</label>
                <select
                  value={formData.environment}
                  onChange={(e) => setFormData(prev => ({ ...prev, environment: e.target.value }))}
                  className={inputClass}
                >
                  <option value="dev">Development</option>
                  <option value="staging">Staging</option>
                  <option value="production">Production</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div
          className={`px-6 py-4 border-t ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
          } flex justify-end space-x-3`}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            {selectedTest ? 'Update' : 'Create'} Test Case
          </button>
        </div>
      </div>
    </div>
  );
}
