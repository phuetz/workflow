import React from 'react';
import { Trash2 } from 'lucide-react';
import { APIParameter } from './types';

interface QueryParamsEditorProps {
  darkMode: boolean;
  params: APIParameter[];
  onChange: (params: APIParameter[]) => void;
  onAdd: () => void;
}

export function QueryParamsEditor({ darkMode, params, onChange, onAdd }: QueryParamsEditorProps) {
  const updateParam = (index: number, field: keyof APIParameter, value: string | boolean) => {
    const newParams = [...params];
    newParams[index] = { ...newParams[index], [field]: value };
    onChange(newParams);
  };

  const removeParam = (index: number) => {
    const filteredParams = params.filter((_, i) => i !== index);
    onChange(filteredParams);
  };

  const validateName = (value: string) => {
    return value.length <= 50 && /^[a-zA-Z0-9_]*$/.test(value);
  };

  const validateDescription = (value: string) => {
    return value.length <= 200;
  };

  return (
    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium">Query Parameters</h4>
        <button
          onClick={onAdd}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
        >
          Add Parameter
        </button>
      </div>
      <div className="space-y-2">
        {params.map((param, index) => (
          <div key={index} className="grid grid-cols-12 gap-2 items-center">
            <input
              type="text"
              placeholder="Name"
              value={param.name}
              onChange={(e) => {
                if (validateName(e.target.value)) {
                  updateParam(index, 'name', e.target.value);
                }
              }}
              className={`col-span-3 px-2 py-1 border rounded text-sm ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-200 text-gray-900'
              }`}
            />
            <select
              value={param.type}
              onChange={(e) => updateParam(index, 'type', e.target.value)}
              className={`col-span-2 px-2 py-1 border rounded text-sm ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-200 text-gray-900'
              }`}
            >
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
            </select>
            <input
              type="text"
              placeholder="Description"
              value={param.description}
              onChange={(e) => {
                if (validateDescription(e.target.value)) {
                  updateParam(index, 'description', e.target.value);
                }
              }}
              className={`col-span-5 px-2 py-1 border rounded text-sm ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-200 text-gray-900'
              }`}
            />
            <label className="col-span-1 flex items-center justify-center">
              <input
                type="checkbox"
                checked={param.required}
                onChange={(e) => updateParam(index, 'required', e.target.checked)}
                className="rounded"
                title="Required"
              />
            </label>
            <button
              onClick={() => removeParam(index)}
              className="col-span-1 text-red-500 hover:text-red-600"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
