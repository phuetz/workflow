import React from 'react';
import { FieldConfig } from '../../types/nodeConfig';
import ExpressionEditor from '../expression/ExpressionEditor';
import { Info } from 'lucide-react';

interface BaseConfigFieldProps {
  config: FieldConfig;
  value: unknown;
  onChange: (field: string, value: unknown) => void;
  error?: string;
  darkMode: boolean;
  nodeId: string;
}

export const BaseConfigField: React.FC<BaseConfigFieldProps> = ({
  config,
  value,
  onChange,
  error,
  darkMode,
  nodeId
}) => {
  const bgClass = darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300';
  const fieldClass = `border rounded px-3 py-2 ${bgClass} ${error ? 'border-red-500' : ''} transition-colors`;
  const errorClass = `text-sm ${error ? 'text-red-600' : ''}`;
  const inputClasses = `w-full ${fieldClass}`;
  const labelClasses = `block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`;

  const renderField = () => {
    switch (config.type) {
      case 'select':
        const selectValue = (value || config.defaultValue || '') as string;
        const options = typeof config.options === 'function' ? config.options() : config.options;
        return (
          <select
            value={selectValue}
            onChange={(e) => onChange(config.field, e.target.value)}
            className={inputClasses}
            aria-invalid={!!error}
            aria-describedby={error ? `${config.field}-error` : undefined}
          >
            <option value="">Select...</option>
            {options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        const checkboxValue = typeof value === 'boolean' ? value : Boolean(value);
        return (
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={checkboxValue}
              onChange={(e) => onChange(config.field, e.target.checked)}
              className="rounded"
              aria-invalid={!!error}
            />
            <span className="text-sm">{config.label}</span>
          </label>
        );

      case 'expression':
      case 'json':
        const expressionValue = String(value || config.defaultValue || '');
        return (
          <ExpressionEditor
            value={expressionValue}
            onChange={(val) => onChange(config.field, val)}
            nodeId={nodeId}
            height={config.type === 'json' ? '120px' : '60px'}
          />
        );

      case 'password':
        const passwordValue = String(value || config.defaultValue || '');
        return (
          <input
            type="password"
            value={passwordValue}
            onChange={(e) => onChange(config.field, e.target.value)}
            placeholder={config.placeholder}
            className={inputClasses}
            aria-invalid={!!error}
            aria-describedby={error ? `${config.field}-error` : undefined}
          />
        );

      case 'number':
        const numberValue = String(value || config.defaultValue || '');
        return (
          <input
            type="number"
            value={numberValue}
            onChange={(e) => onChange(config.field, e.target.value)}
            placeholder={config.placeholder}
            className={inputClasses}
            aria-invalid={!!error}
            aria-describedby={error ? `${config.field}-error` : undefined}
          />
        );

      case 'email':
        const emailValue = String(value || config.defaultValue || '');
        return (
          <input
            type="email"
            value={emailValue}
            onChange={(e) => onChange(config.field, e.target.value)}
            placeholder={config.placeholder}
            className={inputClasses}
            aria-invalid={!!error}
            aria-describedby={error ? `${config.field}-error` : undefined}
          />
        );

      default: // text
        const textValue = String(value || config.defaultValue || '');
        return (
          <input
            type="text"
            value={textValue}
            onChange={(e) => onChange(config.field, e.target.value)}
            placeholder={config.placeholder}
            className={inputClasses}
            aria-invalid={!!error}
            aria-describedby={error ? `${config.field}-error` : undefined}
          />
        );
    }
  };

  if (config.type === 'checkbox') {
    return (
      <div className="mb-4">
        {renderField()}
        {error && (
          <p id={`${config.field}-error`} className="text-xs text-red-600 mt-1">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mb-4">
      <label className={labelClasses}>
        {config.label}
        {config.required && <span className="text-red-500 ml-1">*</span>}
        {config.description && (
          <span className="ml-2 inline-block" title={config.description}>
            <Info size={14} className="text-gray-400 hover:text-gray-600 cursor-help" />
          </span>
        )}
      </label>
      {renderField()}
      {error && (
        <p id={`${config.field}-error`} className="text-xs text-red-600 mt-1">
          {error}
        </p>
      )}
    </div>
  );
};