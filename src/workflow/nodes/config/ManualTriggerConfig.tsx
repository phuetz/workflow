/**
 * Manual Trigger Node Configuration
 * Manual workflow execution trigger
 * AGENT 9: Node Library Expansion - Phase 1
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface InputField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  required: boolean;
  defaultValue?: string;
}

interface ManualTriggerConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const ManualTriggerConfig: React.FC<ManualTriggerConfigProps> = ({ config, onChange }) => {
  const [inputFields, setInputFields] = useState<InputField[]>(
    (config.inputFields as InputField[] | undefined) || []
  );
  const [description, setDescription] = useState((config.description as string | undefined) || '');

  const addInputField = () => {
    const newFields = [...inputFields, { name: '', type: 'string' as const, required: false }];
    setInputFields(newFields);
    onChange({ ...config, inputFields: newFields });
  };

  const removeInputField = (index: number) => {
    const newFields = inputFields.filter((_, i) => i !== index);
    setInputFields(newFields);
    onChange({ ...config, inputFields: newFields });
  };

  const updateInputField = (index: number, field: keyof InputField, value: string | boolean) => {
    const newFields = [...inputFields];
    newFields[index] = { ...newFields[index], [field]: value };
    setInputFields(newFields);
    onChange({ ...config, inputFields: newFields });
  };

  return (
    <div className="manual-trigger-config space-y-4">
      <div className="font-semibold text-lg mb-4">Manual Trigger</div>

      <div>
        <label className="block text-sm font-medium mb-2">Description</label>
        <textarea
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            onChange({ ...config, description: e.target.value });
          }}
          rows={3}
          placeholder="Describe when and why to run this workflow manually..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium">Input Fields</label>
          <button
            onClick={addInputField}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            + Add Field
          </button>
        </div>

        {inputFields.length === 0 ? (
          <div className="p-4 border border-dashed border-gray-300 rounded text-center text-sm text-gray-500">
            No input fields defined. Add fields if you need user input when triggering manually.
          </div>
        ) : (
          <div className="space-y-3">
            {inputFields.map((field, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">Field Name</label>
                    <input
                      type="text"
                      value={field.name}
                      onChange={(e) => updateInputField(index, 'name', e.target.value)}
                      placeholder="email, count, etc."
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Type</label>
                    <select
                      value={field.type}
                      onChange={(e) => updateInputField(index, 'type', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="string">String</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                      <option value="json">JSON</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">Default Value</label>
                    <input
                      type="text"
                      value={field.defaultValue || ''}
                      onChange={(e) => updateInputField(index, 'defaultValue', e.target.value)}
                      placeholder="Optional default"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => updateInputField(index, 'required', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-xs">Required</span>
                    </label>
                    <button
                      onClick={() => removeInputField(index)}
                      className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                      title="Remove field"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm space-y-2">
        <div><strong>▶️ How to Use:</strong></div>
        <ul className="list-disc list-inside space-y-1">
          <li>Click "Run Workflow" button in the UI</li>
          <li>Fill in any required input fields</li>
          <li>Workflow executes with provided input data</li>
        </ul>
      </div>

      <div className="mt-2 p-3 bg-green-50 rounded text-sm space-y-2">
        <div><strong>💡 Use Cases:</strong></div>
        <ul className="list-disc list-inside space-y-1">
          <li>One-time data migrations</li>
          <li>Admin operations</li>
          <li>Testing and debugging</li>
          <li>On-demand reports</li>
        </ul>
      </div>
    </div>
  );
};
