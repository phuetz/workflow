/**
 * Condition Node Configuration
 * Conditional branching based on rules
 * AGENT 9: Node Library Expansion - Phase 1
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface ConditionRule {
  field: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'greaterOrEqual' | 'lessOrEqual' | 'exists' | 'notExists';
  value: string;
  combineWith?: 'AND' | 'OR';
}

interface ConditionNodeConfig extends NodeConfig {
  rules?: ConditionRule[];
  mode?: 'rules' | 'expression';
  expression?: string;
}

interface ConditionConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const ConditionConfig: React.FC<ConditionConfigProps> = ({ config, onChange }) => {
  const typedConfig = config as ConditionNodeConfig;

  const [rules, setRules] = useState<ConditionRule[]>(
    typedConfig.rules || [{ field: '', operator: 'equals', value: '' }]
  );
  const [mode, setMode] = useState<'rules' | 'expression'>(typedConfig.mode || 'rules');
  const [expression, setExpression] = useState(typedConfig.expression || '');

  const addRule = () => {
    const newRules = [...rules, { field: '', operator: 'equals' as const, value: '', combineWith: 'AND' as const }];
    setRules(newRules);
    onChange({ ...config, rules: newRules });
  };

  const removeRule = (index: number) => {
    const newRules = rules.filter((_, i) => i !== index);
    setRules(newRules);
    onChange({ ...config, rules: newRules });
  };

  const updateRule = (index: number, field: keyof ConditionRule, value: string) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], [field]: value };
    setRules(newRules);
    onChange({ ...config, rules: newRules });
  };

  return (
    <div className="condition-config space-y-4">
      <div className="font-semibold text-lg mb-4">Conditional Branching</div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => {
            setMode('rules');
            onChange({ ...config, mode: 'rules' });
          }}
          className={`px-4 py-2 rounded ${mode === 'rules' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Rules
        </button>
        <button
          onClick={() => {
            setMode('expression');
            onChange({ ...config, mode: 'expression' });
          }}
          className={`px-4 py-2 rounded ${mode === 'expression' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Expression
        </button>
      </div>

      {mode === 'rules' ? (
        <>
          <div className="space-y-3">
            {rules.map((rule, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3">
                {index > 0 && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-gray-600">Combine with previous:</span>
                    <select
                      value={rule.combineWith || 'AND'}
                      onChange={(e) => updateRule(index, 'combineWith', e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="AND">AND</option>
                      <option value="OR">OR</option>
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-sm font-medium mb-1">Field</label>
                    <input
                      type="text"
                      value={rule.field}
                      onChange={(e) => updateRule(index, 'field', e.target.value)}
                      placeholder="field.name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Operator</label>
                    <select
                      value={rule.operator}
                      onChange={(e) => updateRule(index, 'operator', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="equals">Equals</option>
                      <option value="notEquals">Not Equals</option>
                      <option value="contains">Contains</option>
                      <option value="greaterThan">Greater Than</option>
                      <option value="lessThan">Less Than</option>
                      <option value="greaterOrEqual">Greater or Equal</option>
                      <option value="lessOrEqual">Less or Equal</option>
                      <option value="exists">Exists</option>
                      <option value="notExists">Not Exists</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">Value</label>
                      <input
                        type="text"
                        value={rule.value}
                        onChange={(e) => updateRule(index, 'value', e.target.value)}
                        placeholder="value"
                        disabled={rule.operator === 'exists' || rule.operator === 'notExists'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm disabled:bg-gray-100"
                      />
                    </div>
                    {rules.length > 1 && (
                      <button
                        onClick={() => removeRule(index)}
                        className="mt-6 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 self-start"
                        title="Remove rule"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addRule}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Add Rule
          </button>
        </>
      ) : (
        <div>
          <label className="block text-sm font-medium mb-2">Boolean Expression</label>
          <textarea
            value={expression}
            onChange={(e) => {
              setExpression(e.target.value);
              onChange({ ...config, expression: e.target.value });
            }}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
            placeholder="{{ $json.status === 'active' && $json.price > 100 }}"
          />
          <p className="text-xs text-gray-500 mt-1">
            Expression must return true or false. Use <code className="bg-gray-100 px-1 rounded">{'{{ }}'}</code> syntax.
          </p>
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
        <strong>📊 Outputs:</strong>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li><strong>Output 1 (true):</strong> Items that match the condition</li>
          <li><strong>Output 2 (false):</strong> Items that don't match</li>
        </ul>
      </div>

      <div className="mt-2 p-3 bg-yellow-50 rounded text-sm space-y-2">
        <div><strong>💡 Examples:</strong></div>
        <div className="space-y-1">
          <div><code className="bg-white px-2 py-1 rounded">status</code> equals <code className="bg-white px-2 py-1 rounded">active</code></div>
          <div><code className="bg-white px-2 py-1 rounded">price</code> greater than <code className="bg-white px-2 py-1 rounded">100</code></div>
          <div>Expression: <code className="bg-white px-2 py-1 rounded">{'{{ $json.total > 1000 && $json.verified }}'}</code></div>
        </div>
      </div>
    </div>
  );
};
