/**
 * FormField Component
 * Renders individual form fields based on type
 */

import React, { useState, useRef } from 'react';
import type { FormField as FormFieldType, FormFieldOption } from '../../types/forms';

interface FormFieldProps {
  field: FormFieldType;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  disabled?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({
  field,
  value,
  onChange,
  error,
  disabled = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const baseInputClass = `
    w-full px-4 py-3 rounded-lg border transition-all duration-200
    ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}
    ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
    focus:outline-none focus:ring-2 focus:ring-opacity-50
  `;

  const labelClass = `
    block text-sm font-medium mb-2
    ${error ? 'text-red-600' : 'text-gray-700'}
  `;

  const renderField = () => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'password':
      case 'tel':
      case 'url':
        return (
          <input
            type={field.type}
            id={field.id}
            name={field.name}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            className={baseInputClass}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            minLength={field.validation?.minLength}
            maxLength={field.validation?.maxLength}
            pattern={field.validation?.pattern}
            required={field.validation?.required}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            id={field.id}
            name={field.name}
            value={(value as number) ?? ''}
            onChange={(e) => onChange(e.target.valueAsNumber || '')}
            placeholder={field.placeholder}
            disabled={disabled}
            className={baseInputClass}
            min={field.validation?.min}
            max={field.validation?.max}
            step={field.step || 1}
            required={field.validation?.required}
          />
        );

      case 'textarea':
        return (
          <textarea
            id={field.id}
            name={field.name}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            className={`${baseInputClass} min-h-[120px] resize-y`}
            minLength={field.validation?.minLength}
            maxLength={field.validation?.maxLength}
            required={field.validation?.required}
          />
        );

      case 'select':
        return (
          <select
            id={field.id}
            name={field.name}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={baseInputClass}
            required={field.validation?.required}
          >
            <option value="">{field.placeholder || 'Select an option...'}</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <label
                key={option.value}
                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all
                  ${(value as string[])?.includes(option.value)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                  ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <input
                  type="checkbox"
                  checked={(value as string[])?.includes(option.value) || false}
                  onChange={(e) => {
                    const currentValues = (value as string[]) || [];
                    if (e.target.checked) {
                      onChange([...currentValues, option.value]);
                    } else {
                      onChange(currentValues.filter((v) => v !== option.value));
                    }
                  }}
                  disabled={disabled || option.disabled}
                  className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-3 text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              id={field.id}
              name={field.name}
              checked={(value as boolean) || false}
              onChange={(e) => onChange(e.target.checked)}
              disabled={disabled}
              className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="ml-3 text-gray-700">{field.label}</span>
          </label>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <label
                key={option.value}
                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all
                  ${value === option.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                  ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <input
                  type="radio"
                  name={field.name}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => onChange(e.target.value)}
                  disabled={disabled || option.disabled}
                  className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-3 text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            id={field.id}
            name={field.name}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={baseInputClass}
            required={field.validation?.required}
          />
        );

      case 'datetime':
        return (
          <input
            type="datetime-local"
            id={field.id}
            name={field.name}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={baseInputClass}
            required={field.validation?.required}
          />
        );

      case 'time':
        return (
          <input
            type="time"
            id={field.id}
            name={field.name}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={baseInputClass}
            required={field.validation?.required}
          />
        );

      case 'file':
        return (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              id={field.id}
              name={field.name}
              onChange={(e) => {
                const files = e.target.files;
                if (files) {
                  onChange(field.multiple ? Array.from(files) : files[0]);
                }
              }}
              disabled={disabled}
              accept={field.acceptedFileTypes?.join(',')}
              multiple={field.multiple}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className={`${baseInputClass} text-left flex items-center justify-between`}
            >
              <span className="text-gray-500">
                {value
                  ? field.multiple
                    ? `${(value as File[]).length} file(s) selected`
                    : (value as File).name
                  : field.placeholder || 'Choose file...'}
              </span>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </button>
            {field.helpText && (
              <p className="mt-1 text-xs text-gray-500">
                {field.helpText}
                {field.maxFileSize && ` (Max: ${field.maxFileSize}MB)`}
              </p>
            )}
          </div>
        );

      case 'rating':
        const maxRating = field.validation?.max || 5;
        return (
          <div className="flex gap-2">
            {Array.from({ length: maxRating }, (_, i) => i + 1).map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => onChange(rating)}
                disabled={disabled}
                className={`w-10 h-10 rounded-full transition-all ${
                  (value as number) >= rating
                    ? 'bg-yellow-400 text-white'
                    : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                }`}
              >
                <svg className="w-6 h-6 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
            ))}
          </div>
        );

      case 'slider':
        const min = field.validation?.min || 0;
        const max = field.validation?.max || 100;
        const step = field.step || 1;
        return (
          <div className="space-y-2">
            <input
              type="range"
              id={field.id}
              name={field.name}
              value={(value as number) ?? min}
              onChange={(e) => onChange(Number(e.target.value))}
              disabled={disabled}
              min={min}
              max={max}
              step={step}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>{min}</span>
              <span className="font-medium text-blue-600">{String(value ?? min)}</span>
              <span>{max}</span>
            </div>
          </div>
        );

      case 'hidden':
        return (
          <input
            type="hidden"
            id={field.id}
            name={field.name}
            value={(value as string) || (field.defaultValue as string) || ''}
          />
        );

      default:
        return <div className="text-red-500">Unknown field type: {field.type}</div>;
    }
  };

  // Don't render label for checkbox (it's inline) and hidden fields
  if (field.type === 'hidden') {
    return renderField();
  }

  const widthClass = {
    full: 'w-full',
    half: 'w-full md:w-1/2',
    third: 'w-full md:w-1/3',
  }[field.width || 'full'];

  return (
    <div className={`${widthClass} ${field.type === 'checkbox' ? '' : 'mb-4'}`}>
      {field.type !== 'checkbox' && (
        <label htmlFor={field.id} className={labelClass}>
          {field.label}
          {field.validation?.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {renderField()}

      {field.helpText && field.type !== 'file' && (
        <p className="mt-1 text-sm text-gray-500">{field.helpText}</p>
      )}

      {error && (
        <p className="mt-1 text-sm text-red-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};
