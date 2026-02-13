/**
 * Variables Panel Component
 * UI for managing workflow variables
 * PROJET SAUVÉ - Phase 5.1: Variables & Expressions System
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getVariableManager, VariableManager } from '../../variables/VariableManager';
import type { Variable, VariableScope, VariableType } from '../../types/variables';
import { useToast } from '../ui/use-toast';

export const VariablesPanel: React.FC = () => {
  const [variables, setVariables] = useState<Variable[]>([]);
  const [filteredVariables, setFilteredVariables] = useState<Variable[]>([]);
  const [selectedScope, setSelectedScope] = useState<VariableScope | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVariable, setEditingVariable] = useState<Variable | null>(null);
  const [newVariable, setNewVariable] = useState({
    name: '',
    value: '',
    type: 'string' as VariableType,
    scope: 'global' as VariableScope,
    description: '',
    tags: [] as string[]
  });

  const { toast } = useToast();
  const variableManager: VariableManager = getVariableManager();

  /**
   * Load variables
   */
  const loadVariables = useCallback(async () => {
    const vars = await variableManager.listVariables();
    setVariables(vars);
    filterVariables(vars, selectedScope, searchQuery);
  }, [variableManager, selectedScope, searchQuery]);

  /**
   * Filter variables
   */
  const filterVariables = useCallback((
    vars: Variable[],
    scope: VariableScope | 'all',
    search: string
  ) => {
    let filtered = vars;

    if (scope !== 'all') {
      filtered = filtered.filter(v => v.scope === scope);
    }

    if (search) {
      const query = search.toLowerCase();
      filtered = filtered.filter(v =>
        v.name.toLowerCase().includes(query) ||
        v.description?.toLowerCase().includes(query)
      );
    }

    setFilteredVariables(filtered);
  }, []);

  /**
   * Handle scope change
   */
  const handleScopeChange = useCallback((scope: VariableScope | 'all') => {
    setSelectedScope(scope);
    filterVariables(variables, scope, searchQuery);
  }, [variables, searchQuery, filterVariables]);

  /**
   * Handle search
   */
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    filterVariables(variables, selectedScope, query);
  }, [variables, selectedScope, filterVariables]);

  /**
   * Handle create variable
   */
  const handleCreate = useCallback(async () => {
    try {
      let parsedValue: any = newVariable.value;

      // Parse value based on type
      if (newVariable.type === 'number') {
        parsedValue = Number(newVariable.value);
      } else if (newVariable.type === 'boolean') {
        parsedValue = newVariable.value.toLowerCase() === 'true';
      } else if (newVariable.type === 'array' || newVariable.type === 'object') {
        parsedValue = JSON.parse(newVariable.value);
      }

      await variableManager.createVariable({
        ...newVariable,
        value: parsedValue
      });

      // Reset form
      setNewVariable({
        name: '',
        value: '',
        type: 'string',
        scope: 'global',
        description: '',
        tags: []
      });
      setShowAddModal(false);

      // Reload variables
      await loadVariables();

      toast({
        title: 'Variable added',
        description: 'New variable has been added',
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: 'Failed to create variable',
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive'
      });
    }
  }, [newVariable, variableManager, loadVariables, toast]);

  /**
   * Handle update variable
   */
  const handleUpdate = useCallback(async (variable: Variable) => {
    try {
      await variableManager.updateVariable(variable.id, variable);
      setEditingVariable(null);
      await loadVariables();

      toast({
        title: 'Variable updated',
        description: 'Variable has been updated successfully',
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: 'Failed to update variable',
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive'
      });
    }
  }, [variableManager, loadVariables, toast]);

  /**
   * Handle delete variable
   */
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this variable?')) return;

    try {
      await variableManager.deleteVariable(id);
      await loadVariables();

      toast({
        title: 'Variable deleted',
        description: 'Variable has been removed',
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: 'Failed to delete variable',
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive'
      });
    }
  }, [variableManager, loadVariables, toast]);

  /**
   * Load variables on mount
   */
  useEffect(() => {
    loadVariables();
  }, [loadVariables]);

  /**
   * Format value for display
   */
  const formatValue = (value: any, type: VariableType): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (type === 'object' || type === 'array') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  return (
    <div className="variables-panel p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Variables</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + Add Variable
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        {/* Scope filter */}
        <select
          value={selectedScope}
          onChange={(e) => handleScopeChange(e.target.value as VariableScope | 'all')}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="all">All Scopes</option>
          <option value="global">Global</option>
          <option value="workflow">Workflow</option>
          <option value="execution">Execution</option>
        </select>

        {/* Search */}
        <input
          type="text"
          placeholder="Search variables..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      {/* Variables List */}
      <div className="space-y-2">
        {filteredVariables.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No variables found. Create one to get started.
          </div>
        ) : (
          filteredVariables.map((variable) => (
            <div
              key={variable.id}
              className="border border-gray-200 rounded-md p-4 hover:border-gray-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono font-semibold text-lg">{variable.name}</span>
                    <span className="px-2 py-1 bg-gray-100 text-xs rounded">{variable.scope}</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {variable.type}
                    </span>
                  </div>

                  {variable.description && (
                    <p className="text-sm text-gray-600 mb-2">{variable.description}</p>
                  )}

                  {editingVariable?.id === variable.id ? (
                    <textarea
                      value={formatValue(editingVariable.value, editingVariable.type)}
                      onChange={(e) => setEditingVariable({
                        ...editingVariable,
                        value: e.target.value
                      })}
                      className="w-full px-2 py-1 border border-gray-300 rounded font-mono text-sm"
                      rows={3}
                    />
                  ) : (
                    <pre className="text-sm bg-gray-50 px-2 py-1 rounded font-mono overflow-x-auto">
                      {formatValue(variable.value, variable.type)}
                    </pre>
                  )}

                  {variable.tags && variable.tags.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {variable.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="text-xs text-gray-500 mt-2">
                    Created: {new Date(variable.createdAt).toLocaleString()}
                    {variable.updatedAt && variable.updatedAt !== variable.createdAt && (
                      <> • Updated: {new Date(variable.updatedAt).toLocaleString()}</>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  {editingVariable?.id === variable.id ? (
                    <>
                      <button
                        onClick={() => handleUpdate(editingVariable)}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingVariable(null)}
                        className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setEditingVariable(variable)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(variable.id)}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Variable Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New Variable</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={newVariable.name}
                  onChange={(e) => setNewVariable({ ...newVariable, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="variableName"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={newVariable.type}
                  onChange={(e) => setNewVariable({ ...newVariable, type: e.target.value as VariableType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                  <option value="object">Object</option>
                  <option value="array">Array</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Scope</label>
                <select
                  value={newVariable.scope}
                  onChange={(e) => setNewVariable({ ...newVariable, scope: e.target.value as VariableScope })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="global">Global</option>
                  <option value="workflow">Workflow</option>
                  <option value="execution">Execution</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Value</label>
                <textarea
                  value={newVariable.value}
                  onChange={(e) => setNewVariable({ ...newVariable, value: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
                  rows={3}
                  placeholder={newVariable.type === 'object' ? '{"key": "value"}' : newVariable.type === 'array' ? '[1, 2, 3]' : 'value'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={newVariable.description}
                  onChange={(e) => setNewVariable({ ...newVariable, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Variable description"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleCreate}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
