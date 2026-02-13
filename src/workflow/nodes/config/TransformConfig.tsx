/**
 * Transform Node Configuration
 * Transform and manipulate data
 * AGENT 9: Node Library Expansion - Phase 1
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface TransformMapping {
  outputField: string;
  expression: string;
}

interface TransformNodeConfig extends NodeConfig {
  mappings?: TransformMapping[];
  mode?: 'mapping' | 'code';
  transformCode?: string;
}

interface TransformConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const TransformConfig: React.FC<TransformConfigProps> = ({ config, onChange }) => {
  const transformConfig = config as TransformNodeConfig;

  const [mappings, setMappings] = useState<TransformMapping[]>(
    transformConfig.mappings || [{ outputField: '', expression: '' }]
  );
  const [mode, setMode] = useState<'mapping' | 'code'>(transformConfig.mode || 'mapping');
  const [transformCode, setTransformCode] = useState(transformConfig.transformCode || '// Transform data\nreturn items.map(item => ({\n  ...item,\n  // your transformations\n}));');

  const addMapping = () => {
    const newMappings = [...mappings, { outputField: '', expression: '' }];
    setMappings(newMappings);
    onChange({ ...config, mappings: newMappings });
  };

  const removeMapping = (index: number) => {
    const newMappings = mappings.filter((_, i) => i !== index);
    setMappings(newMappings);
    onChange({ ...config, mappings: newMappings });
  };

  const updateMapping = (index: number, field: keyof TransformMapping, value: string) => {
    const newMappings = [...mappings];
    newMappings[index] = { ...newMappings[index], [field]: value };
    setMappings(newMappings);
    onChange({ ...config, mappings: newMappings });
  };

  return (
    <div className="transform-config space-y-4">
      <div className="font-semibold text-lg mb-4">Transform Data</div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => {
            setMode('mapping');
            onChange({ ...config, mode: 'mapping' });
          }}
          className={`px-4 py-2 rounded ${mode === 'mapping' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Field Mapping
        </button>
        <button
          onClick={() => {
            setMode('code');
            onChange({ ...config, mode: 'code' });
          }}
          className={`px-4 py-2 rounded ${mode === 'code' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Code Mode
        </button>
      </div>

      {mode === 'mapping' ? (
        <>
          <div className="space-y-3">
            {mappings.map((mapping, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Output Field</label>
                    <input
                      type="text"
                      value={mapping.outputField}
                      onChange={(e) => updateMapping(index, 'outputField', e.target.value)}
                      placeholder="newFieldName"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">Expression/Value</label>
                      <input
                        type="text"
                        value={mapping.expression}
                        onChange={(e) => updateMapping(index, 'expression', e.target.value)}
                        placeholder="{{ $json.field }} or 'static value'"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                      />
                    </div>
                    {mappings.length > 1 && (
                      <button
                        onClick={() => removeMapping(index)}
                        className="mt-6 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 self-start"
                        title="Remove mapping"
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
            onClick={addMapping}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Add Field Mapping
          </button>
        </>
      ) : (
        <div>
          <label className="block text-sm font-medium mb-2">JavaScript Transform Code</label>
          <textarea
            value={transformCode}
            onChange={(e) => {
              setTransformCode(e.target.value);
              onChange({ ...config, transformCode: e.target.value });
            }}
            rows={12}
            className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
            placeholder="return items.map(item => ({ ...item, transformed: true }));"
          />
          <p className="text-xs text-gray-500 mt-1">
            Access input data via <code className="bg-gray-100 px-1 rounded">items</code> array. Return transformed array.
          </p>
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm space-y-2">
        <div><strong>💡 Examples (Field Mapping):</strong></div>
        <div className="space-y-1">
          <div><code className="bg-white px-2 py-1 rounded">fullName</code> = <code className="bg-white px-2 py-1 rounded">{'{{ $json.firstName }} {{ $json.lastName }}'}</code></div>
          <div><code className="bg-white px-2 py-1 rounded">upperEmail</code> = <code className="bg-white px-2 py-1 rounded">{'{{ $json.email.toUpperCase() }}'}</code></div>
          <div><code className="bg-white px-2 py-1 rounded">timestamp</code> = <code className="bg-white px-2 py-1 rounded">{'{{ new Date().toISOString() }}'}</code></div>
        </div>
      </div>
    </div>
  );
};
