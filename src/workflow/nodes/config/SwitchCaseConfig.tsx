/**
 * Switch/Case Configuration Component
 * AGENT 4 - Advanced Workflow Features
 * Implements switch/case logic for multi-branch conditional routing
 */

import React, { useState } from 'react';
import { WorkflowNode } from '../../../types/workflow';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

interface CaseCondition {
  id: string;
  label: string;
  condition: string;
  matchType: 'exact' | 'regex' | 'expression' | 'range';
  value?: string;
  min?: number;
  max?: number;
}

interface SwitchCaseConfigProps {
  node: WorkflowNode;
  onUpdate: (config: Record<string, unknown>) => void;
}

export const SwitchCaseConfig: React.FC<SwitchCaseConfigProps> = ({ node, onUpdate }) => {
  const config = node.data.config || {};

  const [inputExpression, setInputExpression] = useState<string>(
    (config.inputExpression as string) || '{{input.value}}'
  );
  const [cases, setCases] = useState<CaseCondition[]>(
    (config.cases as CaseCondition[]) || [
      { id: '1', label: 'Case 1', condition: 'value1', matchType: 'exact' },
      { id: '2', label: 'Case 2', condition: 'value2', matchType: 'exact' }
    ]
  );
  const [defaultCase, setDefaultCase] = useState<boolean>(
    (config.defaultCase as boolean) ?? true
  );
  const [dataType, setDataType] = useState<string>(
    (config.dataType as string) || 'string'
  );

  const handleUpdate = (updates: Record<string, unknown>) => {
    const newConfig = { ...config, ...updates };
    onUpdate(newConfig);
  };

  const addCase = () => {
    const newCase: CaseCondition = {
      id: `case-${Date.now()}`,
      label: `Case ${cases.length + 1}`,
      condition: '',
      matchType: 'exact'
    };
    const newCases = [...cases, newCase];
    setCases(newCases);
    handleUpdate({ cases: newCases });
  };

  const removeCase = (id: string) => {
    const newCases = cases.filter(c => c.id !== id);
    setCases(newCases);
    handleUpdate({ cases: newCases });
  };

  const updateCase = (id: string, updates: Partial<CaseCondition>) => {
    const newCases = cases.map(c => c.id === id ? { ...c, ...updates } : c);
    setCases(newCases);
    handleUpdate({ cases: newCases });
  };

  const moveCase = (id: string, direction: 'up' | 'down') => {
    const index = cases.findIndex(c => c.id === id);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= cases.length) return;

    const newCases = [...cases];
    [newCases[index], newCases[newIndex]] = [newCases[newIndex], newCases[index]];
    setCases(newCases);
    handleUpdate({ cases: newCases });
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <label className="block text-sm font-medium mb-1">
          Input Expression
        </label>
        <input
          type="text"
          value={inputExpression}
          onChange={(e) => {
            setInputExpression(e.target.value);
            handleUpdate({ inputExpression: e.target.value });
          }}
          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="{{input.value}} or {{$node.field}}"
        />
        <p className="text-xs text-gray-500 mt-1">
          Expression to evaluate and match against cases
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Data Type
        </label>
        <select
          value={dataType}
          onChange={(e) => {
            setDataType(e.target.value);
            handleUpdate({ dataType: e.target.value });
          }}
          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="string">String</option>
          <option value="number">Number</option>
          <option value="boolean">Boolean</option>
          <option value="object">Object/JSON</option>
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">Cases</label>
          <button
            onClick={addCase}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            <Plus size={14} />
            Add Case
          </button>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {cases.map((caseItem, index) => (
            <div key={caseItem.id} className="p-3 border rounded bg-gray-50">
              <div className="flex items-start justify-between mb-2">
                <input
                  type="text"
                  value={caseItem.label}
                  onChange={(e) => updateCase(caseItem.id, { label: e.target.value })}
                  className="flex-1 px-2 py-1 text-sm font-medium border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Case label"
                />
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={() => moveCase(caseItem.id, 'up')}
                    disabled={index === 0}
                    className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    onClick={() => moveCase(caseItem.id, 'down')}
                    disabled={index === cases.length - 1}
                    className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                  >
                    <ChevronDown size={16} />
                  </button>
                  <button
                    onClick={() => removeCase(caseItem.id)}
                    className="p-1 text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-2">
                <select
                  value={caseItem.matchType}
                  onChange={(e) => updateCase(caseItem.id, { matchType: e.target.value as CaseCondition['matchType'] })}
                  className="px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="exact">Exact Match</option>
                  <option value="regex">Regex Match</option>
                  <option value="expression">Expression</option>
                  <option value="range">Range (numbers)</option>
                </select>
              </div>

              {caseItem.matchType === 'range' ? (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={caseItem.min || ''}
                    onChange={(e) => updateCase(caseItem.id, { min: parseFloat(e.target.value) })}
                    placeholder="Min"
                    className="px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    value={caseItem.max || ''}
                    onChange={(e) => updateCase(caseItem.id, { max: parseFloat(e.target.value) })}
                    placeholder="Max"
                    className="px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  value={caseItem.condition}
                  onChange={(e) => updateCase(caseItem.id, { condition: e.target.value })}
                  placeholder={
                    caseItem.matchType === 'exact' ? 'Value to match' :
                    caseItem.matchType === 'regex' ? 'Regex pattern' :
                    'Boolean expression'
                  }
                  className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              )}

              <p className="text-xs text-gray-500 mt-1">
                Output: <code className="bg-gray-200 px-1 rounded">case{index}</code>
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={defaultCase}
            onChange={(e) => {
              setDefaultCase(e.target.checked);
              handleUpdate({ defaultCase: e.target.checked });
            }}
            className="rounded text-blue-500 focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm font-medium">Include Default Case</span>
        </label>
        <p className="text-xs text-gray-500 ml-6">
          Add a default output for when no cases match (recommended)
        </p>
      </div>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Output Handles</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          {cases.map((c, i) => (
            <li key={c.id}>
              <code className="bg-blue-100 px-1 rounded">case{i}</code> - {c.label}
            </li>
          ))}
          {defaultCase && (
            <li>
              <code className="bg-blue-100 px-1 rounded">default</code> - Default case (no match)
            </li>
          )}
        </ul>
      </div>

      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
        <h4 className="text-sm font-medium text-yellow-900 mb-2">Match Examples</h4>
        <ul className="text-xs text-yellow-800 space-y-1 font-mono">
          <li><strong>Exact:</strong> "active", 123, true</li>
          <li><strong>Regex:</strong> ^user_\d+$, [A-Z]{'{'}3{'}'}</li>
          <li><strong>Expression:</strong> {'{{input.status}} === "active"'}</li>
          <li><strong>Range:</strong> min: 0, max: 100</li>
        </ul>
      </div>
    </div>
  );
};
