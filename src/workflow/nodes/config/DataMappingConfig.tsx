/**
 * Data Mapping Node Configuration
 * Visual field mapping with drag & drop
 * AGENT 2 - DATA TRANSFORMATION & EXPRESSION ENGINE
 */

import React, { useState, useEffect } from 'react';
import { DataMapper, FieldMapping } from '../../../components/data/DataMapper';
import { useWorkflowStore } from '../../../store/workflowStore';

interface DataMappingConfigProps {
  node: any;
}

export default function DataMappingConfig({ node }: DataMappingConfigProps) {
  const { updateNodeConfig, nodeExecutionData } = useWorkflowStore();
  const [sourceData, setSourceData] = useState<Record<string, any>>({});
  const [targetSchema, setTargetSchema] = useState<Record<string, string>>({});
  const [mappings, setMappings] = useState<FieldMapping[]>(node.data.config?.mappings || []);
  const [previewData, setPreviewData] = useState<Record<string, any> | null>(null);
  const [mode, setMode] = useState<'visual' | 'manual'>(node.data.config?.mode || 'visual');

  // Get source data from previous node execution
  useEffect(() => {
    // Try to get data from previous node
    const previousNodes = useWorkflowStore.getState().edges
      .filter(e => e.target === node.id)
      .map(e => e.source);

    if (previousNodes.length > 0) {
      const prevNodeData = nodeExecutionData[previousNodes[0]] as { json?: any[] } | undefined;
      if (prevNodeData?.json) {
        setSourceData(prevNodeData.json[0] || {});
      }
    }

    // If no data, show sample
    if (Object.keys(sourceData).length === 0) {
      setSourceData({
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        age: 30,
        city: 'New York',
        createdAt: new Date().toISOString()
      });
    }
  }, [node.id, nodeExecutionData]);

  // Handle mapping changes
  const handleMappingChange = (newMappings: FieldMapping[]) => {
    setMappings(newMappings);
    updateNodeConfig(node.id, {
      ...node.data.config,
      mappings: newMappings,
      mode
    });
  };

  // Handle preview updates
  const handlePreview = (data: Record<string, any>) => {
    setPreviewData(data);
  };

  // Manual JSON mapping
  const handleManualMappingChange = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      updateNodeConfig(node.id, {
        ...node.data.config,
        manualMapping: value,
        mode: 'manual'
      });
    } catch (error) {
      // Invalid JSON, don't update
    }
  };

  return (
    <div className="p-4 max-w-6xl">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Data Mapping</h3>
        <p className="text-sm text-gray-600 mb-4">
          Map fields from input data to output structure
        </p>

        {/* Mode selector */}
        <div className="flex space-x-2 mb-4">
          <button
            onClick={() => setMode('visual')}
            className={`px-4 py-2 rounded text-sm font-medium ${
              mode === 'visual'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Visual Mapper
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`px-4 py-2 rounded text-sm font-medium ${
              mode === 'manual'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Manual JSON
          </button>
        </div>
      </div>

      {mode === 'visual' ? (
        <>
          {/* Visual mapper */}
          <div className="border rounded-lg p-4 bg-white mb-4" style={{ height: '500px' }}>
            <DataMapper
              sourceData={sourceData}
              targetSchema={targetSchema}
              initialMappings={mappings}
              onMappingChange={handleMappingChange}
              onPreview={handlePreview}
            />
          </div>

          {/* Target schema editor */}
          <div className="mb-4">
            <button
              onClick={() => {
                const schema: Record<string, string> = {};
                Object.keys(sourceData).forEach(key => {
                  schema[key] = typeof sourceData[key];
                });
                setTargetSchema(schema);
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Define Custom Target Schema
            </button>
          </div>

          {/* Preview */}
          {previewData && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium mb-2">Preview Output:</h4>
              <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
                {JSON.stringify(previewData, null, 2)}
              </pre>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Manual JSON mapping */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Mapping Configuration (JSON)
            </label>
            <textarea
              defaultValue={node.data.config?.manualMapping || JSON.stringify({
                mappings: mappings.map(m => ({
                  source: m.sourceField,
                  target: m.targetField,
                  transform: m.transformation
                }))
              }, null, 2)}
              onChange={(e) => handleManualMappingChange(e.target.value)}
              className="w-full h-64 px-3 py-2 border rounded font-mono text-xs"
              placeholder='{"mappings": [{"source": "field1", "target": "field2", "transform": "string.upper($json.field1)"}]}'
            />
          </div>

          {/* Help text */}
          <div className="p-3 bg-blue-50 rounded text-sm">
            <div className="font-medium mb-2">Manual Mapping Format:</div>
            <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
{`{
  "mappings": [
    {
      "source": "sourceField",
      "target": "targetField",
      "transform": "string.upper($json.sourceField)"
    }
  ]
}`}
            </pre>
          </div>
        </>
      )}

      {/* Instructions */}
      <div className="mt-4 p-4 bg-yellow-50 rounded border border-yellow-200">
        <h4 className="font-medium text-sm mb-2">How to use:</h4>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li>Drag source fields to target fields to create mappings</li>
          <li>Click "Edit" on a mapping to add transformations</li>
          <li>Use expressions like <code className="bg-white px-1 rounded">string.upper($json.name)</code></li>
          <li>Preview shows the transformed output</li>
          <li>Switch to Manual mode for advanced JSON configuration</li>
        </ul>
      </div>

      {/* Mapping summary */}
      <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
        <div className="font-medium mb-2">Mapping Summary:</div>
        {mappings.length === 0 ? (
          <div className="text-gray-500 italic">No mappings defined yet</div>
        ) : (
          <div className="space-y-2">
            {mappings.map((mapping) => (
              <div key={mapping.id} className="flex items-start space-x-2">
                <span className="text-blue-600">{mapping.sourceField}</span>
                <span>→</span>
                <span className="text-green-600">{mapping.targetField}</span>
                {mapping.transformation && (
                  <code className="text-xs bg-white px-2 py-1 rounded flex-1 truncate">
                    {mapping.transformation}
                  </code>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
