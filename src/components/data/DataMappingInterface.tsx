/**
 * Data Mapping Interface Component
 * Visual data mapping between workflow nodes like n8n
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  Plus,
  Minus,
  Eye,
  Code,
  Type,
  Hash,
  Calendar,
  ToggleLeft,
  FileText,
  Brackets,
  Search,
  Wand2,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface DataField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date' | 'null';
  value?: unknown;
  path: string;
  children?: DataField[];
  isExpanded?: boolean;
}

interface MappingConnection {
  id: string;
  sourceField: string;
  targetField: string;
  transform?: string; // JavaScript expression
}

interface DataMappingInterfaceProps {
  sourceData: Record<string, unknown>;
  targetSchema: DataField[];
  existingMapping?: MappingConnection[];
  onMappingChange: (mapping: MappingConnection[]) => void;
  onClose?: () => void;
}

export const DataMappingInterface: React.FC<DataMappingInterfaceProps> = ({
  sourceData,
  targetSchema,
  existingMapping = [],
  onMappingChange,
  onClose
}) => {
  const [sourceFields, setSourceFields] = useState<DataField[]>([]);
  const [mapping, setMapping] = useState<MappingConnection[]>(existingMapping);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, unknown>>({});
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual');
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Extract fields from source data
  const extractFields = (data: any, basePath = ''): DataField[] => {
    const fields: DataField[] = [];

    if (data === null || data === undefined) {
      return fields;
    }

    if (Array.isArray(data)) {
      fields.push({
        name: basePath ? basePath.split('.').pop() || 'array' : 'array',
        type: 'array',
        value: data,
        path: basePath,
        children: data.length > 0 ? extractFields(data[0], `${basePath}[0]`) : []
      });
    } else if (typeof data === 'object') {
      Object.entries(data).forEach(([key, value]) => {
        const path = basePath ? `${basePath}.${key}` : key;
        const field: DataField = {
          name: key,
          type: getFieldType(value),
          value,
          path
        };

        if (typeof value === 'object' && value !== null) {
          field.children = extractFields(value, path);
          field.isExpanded = false;
        }

        fields.push(field);
      });
    } else {
      fields.push({
        name: basePath ? basePath.split('.').pop() || 'value' : 'value',
        type: getFieldType(data),
        value: data,
        path: basePath
      });
    }

    return fields;
  };

  // Get field type
  const getFieldType = (value: any): DataField['type'] => {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (value instanceof Date) return 'date';
    if (typeof value === 'object') return 'object';
    return typeof value as 'string' | 'number' | 'boolean';
  };

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'string': return <Type className="w-4 h-4 text-green-500" />;
      case 'number': return <Hash className="w-4 h-4 text-blue-500" />;
      case 'boolean': return <ToggleLeft className="w-4 h-4 text-purple-500" />;
      case 'date': return <Calendar className="w-4 h-4 text-orange-500" />;
      case 'array': return <Brackets className="w-4 h-4 text-red-500" />;
      case 'object': return <FileText className="w-4 h-4 text-gray-500" />;
      default: return <Code className="w-4 h-4 text-gray-400" />;
    }
  };

  // Toggle field expansion
  const toggleFieldExpansion = (fields: DataField[], targetPath: string): DataField[] => {
    return fields.map(field => {
      if (field.path === targetPath) {
        return { ...field, isExpanded: !field.isExpanded };
      }
      if (field.children) {
        return { ...field, children: toggleFieldExpansion(field.children, targetPath) };
      }
      return field;
    });
  };

  // Get value by path
  const getValueByPath = (data: any, path: string): any => {
    return path.split('.').reduce((current, key) => {
      if (current === null || current === undefined) return undefined;
      if (key.includes('[') && key.includes(']')) {
        const [arrayKey, indexStr] = key.split('[');
        const index = parseInt(indexStr.replace(']', ''), 10);
        return current[arrayKey]?.[index];
      }
      return current[key];
    }, data);
  };

  // Set value by path
  const setValueByPath = (obj: any, path: string, value: any): void => {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  };

  // Generate mapping preview
  const generateMappingPreview = React.useCallback(() => {
    const preview: Record<string, unknown> = {};

    mapping.forEach(conn => {
      const sourceValue = getValueByPath(sourceData, conn.sourceField);
      let transformedValue = sourceValue;

      if (conn.transform) {
        try {
          // Simple transform evaluation (in production, use SecureExpressionEvaluator)
          const func = new Function('value', 'data', conn.transform);
          transformedValue = func(sourceValue, sourceData);
        } catch (error) {
          transformedValue = `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      }

      setValueByPath(preview, conn.targetField, transformedValue);
    });

    setPreviewData(preview);
  }, [mapping, sourceData]);

  useEffect(() => {
    // Convert source data to field structure
    const fields = extractFields(sourceData);
    setSourceFields(fields);
  }, [sourceData]);

  useEffect(() => {
    // Generate preview data when mapping changes
    generateMappingPreview();
  }, [mapping, sourceData, generateMappingPreview]);

  // Handle connection creation
  const handleConnect = () => {
    if (!selectedSource || !selectedTarget) return;

    const existingConnection = mapping.find(
      m => m.sourceField === selectedSource && m.targetField === selectedTarget
    );

    if (existingConnection) {
      // Remove existing connection
      const newMapping = mapping.filter(m => m.id !== existingConnection.id);
      setMapping(newMapping);
      onMappingChange(newMapping);
    } else {
      // Create new connection
      const connectionId = `conn_${Date.now()}`;
      const newConnection: MappingConnection = {
        id: connectionId,
        sourceField: selectedSource,
        targetField: selectedTarget
      };
      const newMapping = [...mapping, newConnection];
      setMapping(newMapping);
      onMappingChange(newMapping);
    }

    setSelectedSource(null);
    setSelectedTarget(null);
  };

  // Handle transform update
  const handleTransformUpdate = (connectionId: string, transform: string) => {
    const newMapping = mapping.map(conn =>
      conn.id === connectionId ? { ...conn, transform } : conn
    );
    setMapping(newMapping);
    onMappingChange(newMapping);
  };

  // Remove connection
  const removeConnection = (connectionId: string) => {
    const newMapping = mapping.filter(conn => conn.id !== connectionId);
    setMapping(newMapping);
    onMappingChange(newMapping);
  };

  // Suggest automatic mapping
  const suggestMapping = () => {
    const suggestions: MappingConnection[] = [];

    const findMatches = (sourceFields: DataField[], targetFields: DataField[]) => {
      sourceFields.forEach(sourceField => {
        targetFields.forEach(targetField => {
          // Simple name matching
          if (sourceField.name.toLowerCase() === targetField.name.toLowerCase()) {
            suggestions.push({
              id: `${sourceField.path}-${targetField.path}`,
              sourceField: sourceField.path,
              targetField: targetField.path
            });
          }

          // Recurse into children
          if (sourceField.children && targetField.children) {
            findMatches(sourceField.children, targetField.children);
          }
        });
      });
    };

    findMatches(sourceFields, targetSchema);

    const newMapping = [...mapping, ...suggestions.filter(
      suggestion => !mapping.some(existing =>
        existing.sourceField === suggestion.sourceField &&
        existing.targetField === suggestion.targetField
      )
    )];

    setMapping(newMapping);
    onMappingChange(newMapping);
  };

  // Render field
  const renderField = (
    field: DataField,
    isSource: boolean,
    level: number = 0,
    onSelect: (path: string) => void
  ) => {
    const isSelected = isSource 
      ? selectedSource === field.path
      : selectedTarget === field.path;

    const isConnected = mapping.some(conn =>
      isSource ? conn.sourceField === field.path : conn.targetField === field.path
    );

    const filteredBySearch = !searchTerm || 
      field.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      field.path.toLowerCase().includes(searchTerm.toLowerCase());

    if (!filteredBySearch) return null;

    return (
      <div key={field.path} className="space-y-1">
        <div
          className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
            isSelected ? 'bg-blue-100 border-blue-300' : 
            isConnected ? 'bg-green-50 border-green-200' : 
            'hover:bg-gray-50'
          } border`}
          style={{ marginLeft: level * 16 }}
          onClick={() => onSelect(field.path)}
          data-field-path={field.path}
        >
          {field.children && field.children.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSourceFields(prev => toggleFieldExpansion(prev, field.path));
              }}
              className="mr-2"
            >
              {field.isExpanded ? 
                <ChevronDown className="w-4 h-4" /> : 
                <ChevronRight className="w-4 h-4" />
              }
            </button>
          )}

          {getTypeIcon(field.type)}
          
          <span className="ml-2 font-medium text-gray-900">{field.name}</span>
          
          <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {field.type}
          </span>

          {field.value !== undefined && typeof field.value !== 'object' && (
            <span className="ml-auto text-sm text-gray-600 truncate max-w-32">
              {String(field.value)}
            </span>
          )}

          {isConnected && (
            <div className="ml-2 w-2 h-2 bg-green-500 rounded-full"></div>
          )}
        </div>

        {field.children && field.isExpanded && (
          <div className="space-y-1">
            {field.children.map(child => 
              renderField(child, isSource, level + 1, onSelect)
            )}
          </div>
        )}
      </div>
    );
  };

  // Render connections
  const renderConnections = () => {
    if (!containerRef.current) return null;

    return (
      <svg
        ref={svgRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 1 }}
      >
        {mapping.map(conn => {
          const sourceElement = containerRef.current?.querySelector(
            `[data-field-path="${conn.sourceField}"]`
          );
          const targetElement = containerRef.current?.querySelector(
            `[data-field-path="${conn.targetField}"]`
          );

          if (!sourceElement || !targetElement) return null;

          const sourceRect = sourceElement.getBoundingClientRect();
          const targetRect = targetElement.getBoundingClientRect();
          const containerRect = containerRef.current!.getBoundingClientRect();

          const x1 = sourceRect.right - containerRect.left;
          const y1 = sourceRect.top + sourceRect.height / 2 - containerRect.top;
          const x2 = targetRect.left - containerRect.left;
          const y2 = targetRect.top + targetRect.height / 2 - containerRect.top;
          const midX = (x1 + x2) / 2;

          return (
            <g key={conn.id}>
              <path
                d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                stroke="#3b82f6"
                strokeWidth="2"
                fill="none"
                className="drop-shadow-sm"
              />
              <circle cx={x1} cy={y1} r="4" fill="#3b82f6" />
              <circle cx={x2} cy={y2} r="4" fill="#3b82f6" />
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <ArrowRight className="w-6 h-6 text-gray-700 mr-3" />
            <div>
              <h2 className="text-lg font-semibold">Data Mapping</h2>
              <p className="text-sm text-gray-600">
                Map data between workflow nodes
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Tabs */}
            <div className="flex border border-gray-300 rounded-md">
              <button
                onClick={() => setActiveTab('visual')}
                className={`px-3 py-1 text-sm ${
                  activeTab === 'visual' 
                    ? 'bg-blue-50 text-blue-600 border-blue-300' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Visual
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`px-3 py-1 text-sm border-l border-gray-300 ${
                  activeTab === 'code' 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Code
              </button>
            </div>

            <button
              onClick={suggestMapping}
              className="px-3 py-2 text-purple-600 border border-purple-300 rounded-md hover:bg-purple-50 flex items-center"
            >
              <Wand2 className="w-4 h-4 mr-1" />
              Auto Map
            </button>
            
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-3 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center"
            >
              <Eye className="w-4 h-4 mr-1" />
              Preview
            </button>
            
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'visual' ? (
          <div ref={containerRef} className="flex-1 flex relative">
            {/* Source Data */}
            <div className="w-1/3 border-r border-gray-200 flex flex-col">
              <div className="border-b border-gray-200 px-4 py-3">
                <h3 className="font-medium text-gray-900">Source Data</h3>
                <div className="mt-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search fields..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-1">
                  {sourceFields.map(field => 
                    renderField(field, true, 0, setSelectedSource)
                  )}
                </div>
              </div>
            </div>

            {/* Mapping Area */}
            <div className="w-1/3 border-r border-gray-200 flex flex-col">
              <div className="border-b border-gray-200 px-4 py-3">
                <h3 className="font-medium text-gray-900">Connections</h3>
                <div className="flex items-center space-x-2 mt-2">
                  <button
                    onClick={handleConnect}
                    disabled={!selectedSource || !selectedTarget}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-300 flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Connect
                  </button>
                  <span className="text-xs text-gray-500">
                    {mapping.length} connections
                  </span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                  {mapping.map(conn => (
                    <div key={conn.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <ArrowRight className="w-4 h-4 text-blue-500 mr-2" />
                          <span className="text-sm font-medium">Connection</span>
                        </div>
                        <button
                          onClick={() => removeConnection(conn.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-xs text-gray-600 mb-2">
                        <div className="truncate">{conn.sourceField}</div>
                        <div className="text-center text-gray-400">↓</div>
                        <div className="truncate">{conn.targetField}</div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Transform (optional)
                        </label>
                        <input
                          type="text"
                          value={conn.transform || ''}
                          onChange={(e) => handleTransformUpdate(conn.id, e.target.value)}
                          placeholder="e.g., value.toUpperCase()"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Target Schema */}
            <div className="w-1/3 flex flex-col">
              <div className="border-b border-gray-200 px-4 py-3">
                <h3 className="font-medium text-gray-900">Target Schema</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-1">
                  {targetSchema.map(field => 
                    renderField(field, false, 0, setSelectedTarget)
                  )}
                </div>
              </div>
            </div>

            {/* Connection Lines */}
            {renderConnections()}
          </div>
        ) : (
          /* Code View */
          <div className="flex-1 p-6">
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
              <pre>{JSON.stringify(mapping, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>

      {/* Preview Panel */}
      {showPreview && (
        <div className="border-t border-gray-200 h-64 flex flex-col">
          <div className="border-b border-gray-200 px-4 py-2">
            <h3 className="font-medium text-gray-900">Preview Output</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <pre className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
              {JSON.stringify(previewData, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};