/**
 * Visual Data Mapper Component
 * Drag & drop field mapping with transformation preview
 * AGENT 2 - DATA TRANSFORMATION & EXPRESSION ENGINE
 */

import React, { useState, useCallback } from 'react';
import { evaluateExpression, ExpressionContext } from '../../utils/ExpressionEvaluator';
import { logger } from '../../services/SimpleLogger';

// Stub implementations for @dnd-kit/core (install package for full drag-drop support)
interface DragEndEvent {
  active: { id: string; data: { current?: any } };
  over: { id: string; data: { current?: any } } | null;
}

const DndContext = ({ children, onDragEnd }: any) => <>{children}</>;
const useDraggable = (config: any) => ({
  attributes: {},
  listeners: {},
  setNodeRef: () => {},
  isDragging: false,
});
const useDroppable = (config: any) => ({
  setNodeRef: () => {},
  isOver: false,
});

export interface FieldMapping {
  id: string;
  sourceField: string;
  targetField: string;
  transformation?: string;
  type?: 'direct' | 'expression' | 'function';
}

export interface DataMapperProps {
  sourceData: Record<string, any>;
  targetSchema?: Record<string, string>; // field name -> type
  initialMappings?: FieldMapping[];
  onMappingChange?: (mappings: FieldMapping[]) => void;
  onPreview?: (transformedData: Record<string, any>) => void;
}

/**
 * Draggable source field
 */
function SourceField({ field, value }: { field: string; value: any }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `source-${field}`,
    data: { field, value, type: typeof value }
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`p-2 mb-2 bg-blue-50 border border-blue-200 rounded cursor-move hover:bg-blue-100 transition-colors ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="font-medium text-sm text-blue-900">{field}</div>
          <div className="text-xs text-blue-600 mt-1 truncate">
            {typeof value === 'object' ? JSON.stringify(value).slice(0, 50) : String(value).slice(0, 50)}
          </div>
        </div>
        <div className="text-xs px-2 py-1 bg-blue-200 rounded ml-2">
          {Array.isArray(value) ? 'array' : typeof value}
        </div>
      </div>
    </div>
  );
}

/**
 * Droppable target field
 */
function TargetField({
  field,
  type,
  mapping,
  onRemoveMapping,
  onEditTransformation
}: {
  field: string;
  type: string;
  mapping?: FieldMapping;
  onRemoveMapping?: () => void;
  onEditTransformation?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `target-${field}`,
    data: { field, type }
  });

  return (
    <div
      ref={setNodeRef}
      className={`p-2 mb-2 border-2 border-dashed rounded min-h-[60px] transition-colors ${
        isOver
          ? 'border-green-400 bg-green-50'
          : mapping
          ? 'border-green-300 bg-green-50'
          : 'border-gray-300 bg-gray-50'
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="font-medium text-sm text-gray-900">{field}</div>
          <div className="text-xs text-gray-500 mt-1">{type}</div>
        </div>
      </div>

      {mapping && (
        <div className="mt-2 p-2 bg-white rounded border border-green-200">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-medium text-green-700">
              From: {mapping.sourceField}
            </div>
            <button
              onClick={onRemoveMapping}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Remove
            </button>
          </div>

          {mapping.transformation && (
            <div className="mt-1">
              <div className="text-xs text-gray-600 mb-1">Transformation:</div>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded block">
                {mapping.transformation}
              </code>
              <button
                onClick={onEditTransformation}
                className="text-xs text-blue-600 hover:text-blue-800 mt-1"
              >
                Edit
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Transformation editor modal
 */
function TransformationEditor({
  mapping,
  sourceValue,
  onSave,
  onClose
}: {
  mapping: FieldMapping;
  sourceValue: any;
  onSave: (transformation: string) => void;
  onClose: () => void;
}) {
  const [transformation, setTransformation] = useState(mapping.transformation || '');
  const [preview, setPreview] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const updatePreview = useCallback((expr: string) => {
    try {
      if (!expr) {
        setPreview(sourceValue);
        setError('');
        return;
      }

      const context: ExpressionContext = {
        $json: { [mapping.sourceField]: sourceValue },
        $item: { json: { [mapping.sourceField]: sourceValue }, index: 0 }
      };

      const result = evaluateExpression(expr, context);
      setPreview(result);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluation error');
      setPreview(null);
    }
  }, [mapping.sourceField, sourceValue]);

  React.useEffect(() => {
    updatePreview(transformation);
  }, [transformation, updatePreview]);

  const examples = [
    { label: 'Uppercase', value: `string.upper($json.${mapping.sourceField})` },
    { label: 'Lowercase', value: `string.lower($json.${mapping.sourceField})` },
    { label: 'Trim', value: `string.trim($json.${mapping.sourceField})` },
    { label: 'To Number', value: `number.toNumber($json.${mapping.sourceField})` },
    { label: 'Format Date', value: `date.format($json.${mapping.sourceField}, "yyyy-MM-dd")` },
    { label: 'Array Length', value: `array.length($json.${mapping.sourceField})` },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            Transform: {mapping.sourceField} → {mapping.targetField}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Transformation Expression</label>
          <textarea
            value={transformation}
            onChange={(e) => setTransformation(e.target.value)}
            className="w-full h-24 px-3 py-2 border border-gray-300 rounded font-mono text-sm"
            placeholder="e.g., string.upper($json.fieldName)"
          />
        </div>

        <div className="mb-4">
          <div className="text-sm font-medium mb-2">Quick Examples:</div>
          <div className="grid grid-cols-2 gap-2">
            {examples.map((ex) => (
              <button
                key={ex.label}
                onClick={() => setTransformation(ex.value)}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded text-left"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <div className="text-sm font-medium mb-2">Preview:</div>
          <div className="p-3 bg-gray-50 rounded border border-gray-200">
            {error ? (
              <div className="text-red-600 text-sm">{error}</div>
            ) : (
              <div className="text-sm">
                <div className="mb-2">
                  <span className="font-medium">Input:</span>
                  <code className="ml-2 text-xs bg-white px-2 py-1 rounded">
                    {JSON.stringify(sourceValue)}
                  </code>
                </div>
                <div>
                  <span className="font-medium">Output:</span>
                  <code className="ml-2 text-xs bg-white px-2 py-1 rounded">
                    {JSON.stringify(preview)}
                  </code>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mb-4 p-3 bg-blue-50 rounded text-sm">
          <div className="font-medium mb-2">Available Functions:</div>
          <div className="space-y-1 text-xs">
            <div><code>string.*</code> - upper, lower, trim, substring, split, etc.</div>
            <div><code>date.*</code> - format, addDays, addHours, timestamp, etc.</div>
            <div><code>array.*</code> - map, filter, length, sum, average, etc.</div>
            <div><code>number.*</code> - format, round, abs, random, etc.</div>
            <div><code>object.*</code> - keys, values, get, merge, pick, etc.</div>
            <div><code>Math.*</code> - All JavaScript Math functions</div>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(transformation)}
            disabled={!!error}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Main DataMapper component
 */
export function DataMapper({
  sourceData,
  targetSchema = {},
  initialMappings = [],
  onMappingChange,
  onPreview
}: DataMapperProps) {
  const [mappings, setMappings] = useState<FieldMapping[]>(initialMappings);
  const [editingMapping, setEditingMapping] = useState<FieldMapping | null>(null);
  const [showArrayOperations, setShowArrayOperations] = useState(false);

  // Get source fields from data
  const sourceFields = Object.entries(sourceData).map(([field, value]) => ({
    field,
    value,
    type: Array.isArray(value) ? 'array' : typeof value
  }));

  // Get target fields from schema or create from source
  const targetFields = Object.keys(targetSchema).length > 0
    ? Object.entries(targetSchema)
    : Object.keys(sourceData).map(field => [field, 'any']);

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const sourceField = active.data.current?.field;
    const targetField = over.data.current?.field;

    if (!sourceField || !targetField) return;

    // Check if mapping already exists
    const existingIndex = mappings.findIndex(m => m.targetField === targetField);

    const newMapping: FieldMapping = {
      id: `${sourceField}-${targetField}-${Date.now()}`,
      sourceField,
      targetField,
      type: 'direct'
    };

    if (existingIndex >= 0) {
      // Replace existing mapping
      const newMappings = [...mappings];
      newMappings[existingIndex] = newMapping;
      setMappings(newMappings);
      onMappingChange?.(newMappings);
    } else {
      // Add new mapping
      const newMappings = [...mappings, newMapping];
      setMappings(newMappings);
      onMappingChange?.(newMappings);
    }

    // Generate preview
    generatePreview([...mappings, newMapping]);
  }, [mappings, onMappingChange]);

  // Remove mapping
  const handleRemoveMapping = useCallback((targetField: string) => {
    const newMappings = mappings.filter(m => m.targetField !== targetField);
    setMappings(newMappings);
    onMappingChange?.(newMappings);
    generatePreview(newMappings);
  }, [mappings, onMappingChange]);

  // Save transformation
  const handleSaveTransformation = useCallback((mappingId: string, transformation: string) => {
    const newMappings = mappings.map(m =>
      m.id === mappingId ? { ...m, transformation, type: 'expression' as const } : m
    );
    setMappings(newMappings);
    onMappingChange?.(newMappings);
    setEditingMapping(null);
    generatePreview(newMappings);
  }, [mappings, onMappingChange]);

  // Generate preview
  const generatePreview = useCallback((currentMappings: FieldMapping[]) => {
    try {
      const result: Record<string, any> = {};

      for (const mapping of currentMappings) {
        const sourceValue = sourceData[mapping.sourceField];

        if (mapping.transformation) {
          // Apply transformation
          const context: ExpressionContext = {
            $json: { [mapping.sourceField]: sourceValue },
            $item: { json: { [mapping.sourceField]: sourceValue }, index: 0 }
          };
          result[mapping.targetField] = evaluateExpression(mapping.transformation, context);
        } else {
          // Direct mapping
          result[mapping.targetField] = sourceValue;
        }
      }

      onPreview?.(result);
    } catch (error) {
      logger.error('Preview generation failed:', error);
    }
  }, [sourceData, onPreview]);

  // Auto-map fields with matching names
  const handleAutoMap = useCallback(() => {
    const autoMappings: FieldMapping[] = [];

    for (const [targetField] of targetFields) {
      const sourceField = sourceFields.find(sf => sf.field === targetField);
      if (sourceField) {
        autoMappings.push({
          id: `${sourceField.field}-${targetField}-${Date.now()}`,
          sourceField: sourceField.field,
          targetField: targetField as string,
          type: 'direct'
        });
      }
    }

    setMappings(autoMappings);
    onMappingChange?.(autoMappings);
    generatePreview(autoMappings);
  }, [sourceFields, targetFields, onMappingChange]);

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b">
          <h3 className="text-lg font-semibold">Data Mapper</h3>
          <div className="flex space-x-2">
            <button
              onClick={handleAutoMap}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Auto Map
            </button>
            <button
              onClick={() => setShowArrayOperations(!showArrayOperations)}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              {showArrayOperations ? 'Hide' : 'Show'} Array Ops
            </button>
            <button
              onClick={() => setMappings([])}
              className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Mapping area */}
        <div className="flex-1 grid grid-cols-2 gap-6 overflow-y-auto">
          {/* Source fields */}
          <div>
            <h4 className="font-medium mb-3 text-sm text-gray-700">
              Source Fields ({sourceFields.length})
            </h4>
            <div className="space-y-2">
              {sourceFields.map(({ field, value }) => (
                <SourceField key={field} field={field} value={value} />
              ))}
            </div>
          </div>

          {/* Target fields */}
          <div>
            <h4 className="font-medium mb-3 text-sm text-gray-700">
              Target Fields ({targetFields.length})
            </h4>
            <div className="space-y-2">
              {targetFields.map(([field, type]) => {
                const mapping = mappings.find(m => m.targetField === field);
                return (
                  <TargetField
                    key={field as string}
                    field={field as string}
                    type={type as string}
                    mapping={mapping}
                    onRemoveMapping={() => handleRemoveMapping(field as string)}
                    onEditTransformation={() => mapping && setEditingMapping(mapping)}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 pt-4 border-t text-sm text-gray-600">
          {mappings.length} field{mappings.length !== 1 ? 's' : ''} mapped
          {' • '}
          {mappings.filter(m => m.transformation).length} with transformation
        </div>
      </div>

      {/* Transformation editor modal */}
      {editingMapping && (
        <TransformationEditor
          mapping={editingMapping}
          sourceValue={sourceData[editingMapping.sourceField]}
          onSave={(transformation) => handleSaveTransformation(editingMapping.id, transformation)}
          onClose={() => setEditingMapping(null)}
        />
      )}
    </DndContext>
  );
}

export default DataMapper;
