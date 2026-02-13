/**
 * Set Node Configuration
 * Allows setting/modifying data properties
 * PROJET SAUVÉ - Phase 5.5: Data Processing Nodes
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface SetConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const SetConfig: React.FC<SetConfigProps> = ({ config, onChange }) => {
  const [fields, setFields] = useState<Array<{ key: string; value: string; type: string }>>(
    (config.fields as Array<{ key: string; value: string; type: string }>) || [{ key: '', value: '', type: 'string' }]
  );
  const [keepOnlySet, setKeepOnlySet] = useState((config.keepOnlySet as boolean) || false);

  const addField = () => {
    const newFields = [...fields, { key: '', value: '', type: 'string' }];
    setFields(newFields);
    onChange({ ...config, fields: newFields });
  };

  const removeField = (index: number) => {
    const newFields = fields.filter((_, i) => i !== index);
    setFields(newFields);
    onChange({ ...config, fields: newFields });
  };

  const updateField = (index: number, field: string, value: string) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], [field]: value };
    setFields(newFields);
    onChange({ ...config, fields: newFields });
  };

  return (
    <div className="set-config space-y-4">
      <div className="font-semibold text-lg mb-4">Set Values</div>

      <div className="space-y-2">
        {fields.map((field, index) => (
          <div key={index} className="flex gap-2 items-start p-3 border border-gray-200 rounded">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Property Name</label>
              <input
                type="text"
                value={field.key}
                onChange={(e) => updateField(index, 'key', e.target.value)}
                placeholder="propertyName"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Value (Expression)</label>
              <input
                type="text"
                value={field.value}
                onChange={(e) => updateField(index, 'value', e.target.value)}
                placeholder="{{ $json.field }}"
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
              />
            </div>

            <div className="w-32">
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={field.type}
                onChange={(e) => updateField(index, 'type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="expression">Expression</option>
              </select>
            </div>

            <button
              onClick={() => removeField(index)}
              className="mt-7 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addField}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        + Add Field
      </button>

      <div className="flex items-center mt-4">
        <input
          type="checkbox"
          id="keepOnlySet"
          checked={keepOnlySet}
          onChange={(e) => {
            setKeepOnlySet(e.target.checked);
            onChange({ ...config, keepOnlySet: e.target.checked });
          }}
          className="mr-2"
        />
        <label htmlFor="keepOnlySet" className="text-sm">
          Keep only set fields (remove other properties)
        </label>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
        <strong>💡 Tip:</strong> Use expressions like <code className="bg-white px-1 rounded">{'{{ $json.field }}'}</code> to reference input data.
        Use functions like <code className="bg-white px-1 rounded">{'{{ $now() }}'}</code> or <code className="bg-white px-1 rounded">{'{{ $dateFormat($now(), "YYYY-MM-DD") }}'}</code>.
      </div>
    </div>
  );
};
