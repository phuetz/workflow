/**
 * FormBuilder Component
 * Visual drag-and-drop form builder for creating forms
 */

import React, { useState, useCallback, useMemo } from 'react';
import type {
  FormTriggerConfig,
  FormPage,
  FormField,
  FormFieldType,
  FormFieldOption,
} from '@/types/forms';

interface FormBuilderProps {
  config: FormTriggerConfig;
  onChange: (config: FormTriggerConfig) => void;
}

const FIELD_TYPES: { type: FormFieldType; label: string; icon: string }[] = [
  { type: 'text', label: 'Text', icon: 'T' },
  { type: 'email', label: 'Email', icon: '@' },
  { type: 'number', label: 'Number', icon: '#' },
  { type: 'textarea', label: 'Long Text', icon: '¶' },
  { type: 'select', label: 'Dropdown', icon: '▼' },
  { type: 'multiselect', label: 'Multi Select', icon: '☑' },
  { type: 'checkbox', label: 'Checkbox', icon: '✓' },
  { type: 'radio', label: 'Radio', icon: '◉' },
  { type: 'date', label: 'Date', icon: '📅' },
  { type: 'datetime', label: 'Date & Time', icon: '🕐' },
  { type: 'time', label: 'Time', icon: '⏰' },
  { type: 'file', label: 'File Upload', icon: '📎' },
  { type: 'rating', label: 'Rating', icon: '⭐' },
  { type: 'slider', label: 'Slider', icon: '═' },
  { type: 'tel', label: 'Phone', icon: '📞' },
  { type: 'url', label: 'URL', icon: '🔗' },
  { type: 'password', label: 'Password', icon: '🔒' },
];

const generateId = () => `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const FormBuilder: React.FC<FormBuilderProps> = ({ config, onChange }) => {
  const [selectedPage, setSelectedPage] = useState(0);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [draggedFieldType, setDraggedFieldType] = useState<FormFieldType | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const currentPage = config.pages[selectedPage];

  // Add a new page
  const addPage = useCallback(() => {
    const newPage: FormPage = {
      id: `page_${Date.now()}`,
      title: `Page ${config.pages.length + 1}`,
      fields: [],
    };
    onChange({
      ...config,
      pages: [...config.pages, newPage],
    });
    setSelectedPage(config.pages.length);
  }, [config, onChange]);

  // Remove a page
  const removePage = useCallback((pageIndex: number) => {
    if (config.pages.length <= 1) return;
    const newPages = config.pages.filter((_, i) => i !== pageIndex);
    onChange({ ...config, pages: newPages });
    if (selectedPage >= newPages.length) {
      setSelectedPage(newPages.length - 1);
    }
  }, [config, selectedPage, onChange]);

  // Update page
  const updatePage = useCallback((pageIndex: number, updates: Partial<FormPage>) => {
    const newPages = [...config.pages];
    newPages[pageIndex] = { ...newPages[pageIndex], ...updates };
    onChange({ ...config, pages: newPages });
  }, [config, onChange]);

  // Add a new field
  const addField = useCallback((type: FormFieldType, pageIndex?: number) => {
    const targetPage = pageIndex ?? selectedPage;
    const newField: FormField = {
      id: generateId(),
      type,
      name: `${type}_${Date.now()}`,
      label: FIELD_TYPES.find(f => f.type === type)?.label || type,
      validation: {},
    };

    // Set defaults based on type
    if (type === 'select' || type === 'multiselect' || type === 'radio') {
      newField.options = [
        { label: 'Option 1', value: 'option1' },
        { label: 'Option 2', value: 'option2' },
      ];
    }
    if (type === 'rating') {
      newField.validation = { max: 5 };
    }
    if (type === 'slider') {
      newField.validation = { min: 0, max: 100 };
      newField.step = 1;
    }

    const newPages = [...config.pages];
    newPages[targetPage] = {
      ...newPages[targetPage],
      fields: [...newPages[targetPage].fields, newField],
    };
    onChange({ ...config, pages: newPages });
    setSelectedField(newField.id);
  }, [config, selectedPage, onChange]);

  // Remove a field
  const removeField = useCallback((fieldId: string) => {
    const newPages = config.pages.map((page) => ({
      ...page,
      fields: page.fields.filter((f) => f.id !== fieldId),
    }));
    onChange({ ...config, pages: newPages });
    if (selectedField === fieldId) {
      setSelectedField(null);
    }
  }, [config, selectedField, onChange]);

  // Update a field
  const updateField = useCallback((fieldId: string, updates: Partial<FormField>) => {
    const newPages = config.pages.map((page) => ({
      ...page,
      fields: page.fields.map((f) =>
        f.id === fieldId ? { ...f, ...updates } : f
      ),
    }));
    onChange({ ...config, pages: newPages });
  }, [config, onChange]);

  // Move field up/down
  const moveField = useCallback((fieldId: string, direction: 'up' | 'down') => {
    const pageIndex = config.pages.findIndex((p) =>
      p.fields.some((f) => f.id === fieldId)
    );
    if (pageIndex === -1) return;

    const page = config.pages[pageIndex];
    const fieldIndex = page.fields.findIndex((f) => f.id === fieldId);
    const newIndex = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1;

    if (newIndex < 0 || newIndex >= page.fields.length) return;

    const newFields = [...page.fields];
    [newFields[fieldIndex], newFields[newIndex]] = [newFields[newIndex], newFields[fieldIndex]];

    const newPages = [...config.pages];
    newPages[pageIndex] = { ...page, fields: newFields };
    onChange({ ...config, pages: newPages });
  }, [config, onChange]);

  // Duplicate a field
  const duplicateField = useCallback((fieldId: string) => {
    const pageIndex = config.pages.findIndex((p) =>
      p.fields.some((f) => f.id === fieldId)
    );
    if (pageIndex === -1) return;

    const page = config.pages[pageIndex];
    const field = page.fields.find((f) => f.id === fieldId);
    if (!field) return;

    const newField: FormField = {
      ...field,
      id: generateId(),
      name: `${field.name}_copy`,
      label: `${field.label} (Copy)`,
    };

    const fieldIndex = page.fields.findIndex((f) => f.id === fieldId);
    const newFields = [...page.fields];
    newFields.splice(fieldIndex + 1, 0, newField);

    const newPages = [...config.pages];
    newPages[pageIndex] = { ...page, fields: newFields };
    onChange({ ...config, pages: newPages });
    setSelectedField(newField.id);
  }, [config, onChange]);

  // Get selected field data
  const selectedFieldData = useMemo(() => {
    if (!selectedField) return null;
    for (const page of config.pages) {
      const field = page.fields.find((f) => f.id === selectedField);
      if (field) return field;
    }
    return null;
  }, [config.pages, selectedField]);

  // Handle drag start
  const handleDragStart = (type: FormFieldType) => {
    setDraggedFieldType(type);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedFieldType(null);
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedFieldType) {
      addField(draggedFieldType);
      setDraggedFieldType(null);
    }
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="form-builder flex h-full bg-gray-50">
      {/* Left Panel - Field Types */}
      <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
        <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Field Types</h3>
        <div className="grid grid-cols-2 gap-2">
          {FIELD_TYPES.map(({ type, label, icon }) => (
            <button
              key={type}
              draggable
              onDragStart={() => handleDragStart(type)}
              onDragEnd={handleDragEnd}
              onClick={() => addField(type)}
              className="p-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg text-center transition-colors cursor-grab active:cursor-grabbing"
            >
              <span className="text-2xl block mb-1">{icon}</span>
              <span className="text-xs text-gray-600">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Center Panel - Form Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Page Tabs */}
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2 overflow-x-auto">
          {config.pages.map((page, index) => (
            <button
              key={page.id}
              onClick={() => setSelectedPage(index)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                selectedPage === index
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {page.title || `Page ${index + 1}`}
              {config.pages.length > 1 && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    removePage(index);
                  }}
                  className="ml-2 hover:text-red-300"
                >
                  ×
                </span>
              )}
            </button>
          ))}
          <button
            onClick={addPage}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
          >
            + Add Page
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showPreview
                ? 'bg-purple-500 text-white'
                : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
            }`}
          >
            {showPreview ? 'Edit Mode' : 'Preview'}
          </button>
        </div>

        {/* Canvas Area */}
        <div
          className="flex-1 p-8 overflow-y-auto"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <div className="max-w-2xl mx-auto">
            {/* Page Header Edit */}
            <div className="mb-6">
              <input
                type="text"
                value={currentPage?.title || ''}
                onChange={(e) => updatePage(selectedPage, { title: e.target.value })}
                placeholder="Page Title"
                className="text-2xl font-bold w-full bg-transparent border-b-2 border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none pb-1"
              />
              <input
                type="text"
                value={currentPage?.description || ''}
                onChange={(e) => updatePage(selectedPage, { description: e.target.value })}
                placeholder="Page description (optional)"
                className="text-gray-600 w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none mt-2"
              />
            </div>

            {/* Fields */}
            {currentPage?.fields.length === 0 ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                <p className="text-gray-500 mb-2">Drag and drop fields here</p>
                <p className="text-gray-400 text-sm">or click on a field type to add it</p>
              </div>
            ) : (
              <div className="space-y-4">
                {currentPage?.fields.map((field, index) => (
                  <div
                    key={field.id}
                    onClick={() => setSelectedField(field.id)}
                    className={`p-4 bg-white border-2 rounded-lg cursor-pointer transition-all ${
                      selectedField === field.id
                        ? 'border-blue-500 shadow-lg'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                          {field.validation?.required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </label>
                        <div className="text-xs text-gray-400 mb-2">
                          {field.type} • {field.name}
                        </div>
                        {/* Field Preview */}
                        <div className="opacity-50 pointer-events-none">
                          {field.type === 'text' || field.type === 'email' || field.type === 'tel' || field.type === 'url' ? (
                            <input type="text" placeholder={field.placeholder} className="w-full px-3 py-2 border border-gray-300 rounded" />
                          ) : field.type === 'textarea' ? (
                            <textarea placeholder={field.placeholder} className="w-full px-3 py-2 border border-gray-300 rounded h-20" />
                          ) : field.type === 'select' ? (
                            <select className="w-full px-3 py-2 border border-gray-300 rounded">
                              <option>{field.placeholder || 'Select...'}</option>
                            </select>
                          ) : field.type === 'checkbox' ? (
                            <label className="flex items-center"><input type="checkbox" className="mr-2" />{field.label}</label>
                          ) : field.type === 'rating' ? (
                            <div className="flex gap-1">{[1,2,3,4,5].map(i => <span key={i}>⭐</span>)}</div>
                          ) : (
                            <div className="text-gray-400">[{field.type} field]</div>
                          )}
                        </div>
                      </div>
                      {/* Field Actions */}
                      <div className="flex items-center gap-1 ml-4">
                        <button
                          onClick={(e) => { e.stopPropagation(); moveField(field.id, 'up'); }}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); moveField(field.id, 'down'); }}
                          disabled={index === currentPage.fields.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          title="Move down"
                        >
                          ↓
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); duplicateField(field.id); }}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Duplicate"
                        >
                          ⧉
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeField(field.id); }}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Delete"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Field Properties */}
      <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
        {selectedFieldData ? (
          <FieldProperties
            field={selectedFieldData}
            onChange={(updates) => updateField(selectedFieldData.id, updates)}
          />
        ) : (
          <div className="text-center text-gray-500 mt-8">
            <p>Select a field to edit its properties</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Field Properties Panel
interface FieldPropertiesProps {
  field: FormField;
  onChange: (updates: Partial<FormField>) => void;
}

const FieldProperties: React.FC<FieldPropertiesProps> = ({ field, onChange }) => {
  const [optionsText, setOptionsText] = useState(
    field.options?.map((o) => `${o.label}|${o.value}`).join('\n') || ''
  );

  const handleOptionsChange = (text: string) => {
    setOptionsText(text);
    const options: FormFieldOption[] = text
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => {
        const [label, value] = line.split('|');
        return { label: label?.trim() || '', value: value?.trim() || label?.trim() || '' };
      });
    onChange({ options });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Field Properties</h3>

      {/* Basic Properties */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
          <input
            type="text"
            value={field.label}
            onChange={(e) => onChange({ label: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Field Name</label>
          <input
            type="text"
            value={field.name}
            onChange={(e) => onChange({ name: e.target.value.replace(/[^a-zA-Z0-9_]/g, '_') })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">Used in workflow as $json.{field.name}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Placeholder</label>
          <input
            type="text"
            value={field.placeholder || ''}
            onChange={(e) => onChange({ placeholder: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Help Text</label>
          <input
            type="text"
            value={field.helpText || ''}
            onChange={(e) => onChange({ helpText: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Width</label>
          <select
            value={field.width || 'full'}
            onChange={(e) => onChange({ width: e.target.value as 'full' | 'half' | 'third' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="full">Full Width</option>
            <option value="half">Half Width</option>
            <option value="third">Third Width</option>
          </select>
        </div>
      </div>

      {/* Options (for select, multiselect, radio) */}
      {(field.type === 'select' || field.type === 'multiselect' || field.type === 'radio') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Options</label>
          <textarea
            value={optionsText}
            onChange={(e) => handleOptionsChange(e.target.value)}
            placeholder="Label|value&#10;Label 2|value2"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono text-sm h-32"
          />
          <p className="mt-1 text-xs text-gray-500">One per line: Label|value</p>
        </div>
      )}

      {/* Validation */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-700">Validation</h4>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={field.validation?.required || false}
            onChange={(e) => onChange({ validation: { ...field.validation, required: e.target.checked } })}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700">Required</span>
        </label>

        {(field.type === 'text' || field.type === 'textarea' || field.type === 'password') && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Min Length</label>
                <input
                  type="number"
                  value={field.validation?.minLength || ''}
                  onChange={(e) => onChange({ validation: { ...field.validation, minLength: Number(e.target.value) || undefined } })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max Length</label>
                <input
                  type="number"
                  value={field.validation?.maxLength || ''}
                  onChange={(e) => onChange({ validation: { ...field.validation, maxLength: Number(e.target.value) || undefined } })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          </>
        )}

        {(field.type === 'number' || field.type === 'slider' || field.type === 'rating') && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Min Value</label>
              <input
                type="number"
                value={field.validation?.min ?? ''}
                onChange={(e) => onChange({ validation: { ...field.validation, min: Number(e.target.value) } })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Max Value</label>
              <input
                type="number"
                value={field.validation?.max ?? ''}
                onChange={(e) => onChange({ validation: { ...field.validation, max: Number(e.target.value) } })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>
        )}

        {field.type === 'file' && (
          <>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Max File Size (MB)</label>
              <input
                type="number"
                value={field.maxFileSize || ''}
                onChange={(e) => onChange({ maxFileSize: Number(e.target.value) || undefined })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Accepted Types</label>
              <input
                type="text"
                value={field.acceptedFileTypes?.join(', ') || ''}
                onChange={(e) => onChange({ acceptedFileTypes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                placeholder=".pdf, .doc, image/*"
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={field.multiple || false}
                onChange={(e) => onChange({ multiple: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Allow multiple files</span>
            </label>
          </>
        )}
      </div>
    </div>
  );
};

export default FormBuilder;
