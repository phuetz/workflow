/**
 * JSON Transform Node Configuration
 * Transform JSON data with expressions and filters
 * AGENT 2 - DATA TRANSFORMATION & EXPRESSION ENGINE
 */

import React, { useState, useEffect } from 'react';
import { useWorkflowStore } from '../../../store/workflowStore';
import { evaluateExpression, ExpressionContext } from '../../../utils/ExpressionEvaluator';

interface JSONTransformConfigProps {
  node: any;
}

export default function JSONTransformConfig({ node }: JSONTransformConfigProps) {
  const { updateNodeConfig, nodeExecutionData } = useWorkflowStore();
  const [operation, setOperation] = useState(node.data.config?.operation || 'transform');
  const [transformExpression, setTransformExpression] = useState(node.data.config?.transformExpression || '');
  const [filterExpression, setFilterExpression] = useState(node.data.config?.filterExpression || '');
  const [previewInput, setPreviewInput] = useState<Record<string, unknown> | null>(null);
  const [previewOutput, setPreviewOutput] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string>('');

  // Get sample data from previous node
  useEffect(() => {
    const previousNodes = useWorkflowStore.getState().edges
      .filter(e => e.target === node.id)
      .map(e => e.source);

    if (previousNodes.length > 0) {
      const prevNodeData = nodeExecutionData[previousNodes[0]] as { json?: any[] } | undefined;
      if (prevNodeData?.json) {
        setPreviewInput(prevNodeData.json[0] || {});
      }
    }

    if (!previewInput) {
      setPreviewInput({
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        status: 'active'
      });
    }
  }, [node.id, nodeExecutionData]);

  // Update preview when expression changes
  useEffect(() => {
    if (operation === 'transform' && transformExpression && previewInput) {
      try {
        const context: ExpressionContext = {
          $json: previewInput,
          $item: { json: previewInput, index: 0 }
        };
        const result = evaluateExpression(transformExpression, context);
        setPreviewOutput(result);
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Evaluation error');
        setPreviewOutput(null);
      }
    } else if (operation === 'filter' && filterExpression && previewInput) {
      try {
        const context: ExpressionContext = {
          $json: previewInput,
          $item: { json: previewInput, index: 0 }
        };
        const result = evaluateExpression(filterExpression, context);
        setPreviewOutput({ passed: !!result, result });
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Evaluation error');
        setPreviewOutput(null);
      }
    }
  }, [operation, transformExpression, filterExpression, previewInput]);

  // Handle operation change
  const handleOperationChange = (newOperation: string) => {
    setOperation(newOperation);
    updateNodeConfig(node.id, {
      ...node.data.config,
      operation: newOperation
    });
  };

  // Handle transform expression change
  const handleTransformExpressionChange = (value: string) => {
    setTransformExpression(value);
    updateNodeConfig(node.id, {
      ...node.data.config,
      transformExpression: value
    });
  };

  // Handle filter expression change
  const handleFilterExpressionChange = (value: string) => {
    setFilterExpression(value);
    updateNodeConfig(node.id, {
      ...node.data.config,
      filterExpression: value
    });
  };

  const transformExamples = [
    {
      label: 'Extract fields',
      value: '{ id: $json.id, fullName: `${$json.firstName} ${$json.lastName}` }'
    },
    {
      label: 'Uppercase name',
      value: '{ ...$json, name: string.upper($json.name) }'
    },
    {
      label: 'Format date',
      value: '{ ...$json, formattedDate: date.format($json.createdAt, "yyyy-MM-dd") }'
    },
    {
      label: 'Calculate age',
      value: '{ ...$json, age: Math.floor((Date.now() - new Date($json.birthDate).getTime()) / 31536000000) }'
    },
    {
      label: 'Add timestamp',
      value: '{ ...$json, processedAt: Date.now() }'
    }
  ];

  const filterExamples = [
    {
      label: 'Active users',
      value: '$json.status === "active"'
    },
    {
      label: 'Age over 18',
      value: '$json.age >= 18'
    },
    {
      label: 'Email contains domain',
      value: 'string.contains($json.email, "@example.com")'
    },
    {
      label: 'Has property',
      value: 'object.has($json, "email")'
    },
    {
      label: 'Array not empty',
      value: 'Array.isArray($json.items) && $json.items.length > 0'
    }
  ];

  return (
    <div className="p-4 max-w-4xl">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">JSON Transform</h3>
        <p className="text-sm text-gray-600">
          Transform or filter JSON data using expressions
        </p>
      </div>

      {/* Operation selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Operation</label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value)}
          className="w-full px-3 py-2 border rounded"
        >
          <option value="transform">Transform Data</option>
          <option value="filter">Filter Data</option>
          <option value="merge">Merge Objects</option>
          <option value="extract">Extract Values</option>
        </select>
      </div>

      {operation === 'transform' && (
        <>
          {/* Transform expression */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Transform Expression</label>
            <textarea
              value={transformExpression}
              onChange={(e) => handleTransformExpressionChange(e.target.value)}
              className="w-full h-32 px-3 py-2 border rounded font-mono text-sm"
              placeholder="{ id: $json.id, fullName: `${$json.firstName} ${$json.lastName}` }"
            />
          </div>

          {/* Quick examples */}
          <div className="mb-4">
            <div className="text-sm font-medium mb-2">Quick Examples:</div>
            <div className="grid grid-cols-2 gap-2">
              {transformExamples.map((ex) => (
                <button
                  key={ex.label}
                  onClick={() => handleTransformExpressionChange(ex.value)}
                  className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded text-left"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {operation === 'filter' && (
        <>
          {/* Filter expression */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Filter Expression</label>
            <textarea
              value={filterExpression}
              onChange={(e) => handleFilterExpressionChange(e.target.value)}
              className="w-full h-32 px-3 py-2 border rounded font-mono text-sm"
              placeholder='$json.status === "active" && $json.age >= 18'
            />
            <p className="text-xs text-gray-500 mt-1">
              Items will only pass through if this expression returns true
            </p>
          </div>

          {/* Quick examples */}
          <div className="mb-4">
            <div className="text-sm font-medium mb-2">Quick Examples:</div>
            <div className="grid grid-cols-2 gap-2">
              {filterExamples.map((ex) => (
                <button
                  key={ex.label}
                  onClick={() => handleFilterExpressionChange(ex.value)}
                  className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded text-left"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Preview */}
      <div className="mb-4">
        <h4 className="font-medium mb-2">Preview</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">Input:</div>
            <pre className="text-xs bg-gray-50 p-3 rounded border overflow-x-auto max-h-48">
              {JSON.stringify(previewInput, null, 2)}
            </pre>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Output:</div>
            {error ? (
              <div className="text-xs text-red-600 bg-red-50 p-3 rounded border border-red-200">
                {error}
              </div>
            ) : (
              <pre className="text-xs bg-green-50 p-3 rounded border border-green-200 overflow-x-auto max-h-48">
                {JSON.stringify(previewOutput, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>

      {/* Help panel */}
      <div className="p-4 bg-blue-50 rounded border border-blue-200">
        <h4 className="font-medium text-sm mb-2">Available Variables & Functions:</h4>
        <div className="space-y-2 text-xs">
          <div>
            <code className="bg-white px-2 py-1 rounded">$json</code> - Current item data
          </div>
          <div>
            <code className="bg-white px-2 py-1 rounded">$item</code> - Current item with metadata
          </div>
          <div className="mt-2 font-medium">Functions:</div>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div><code className="bg-white px-1 rounded">string.*</code> - String operations</div>
            <div><code className="bg-white px-1 rounded">date.*</code> - Date operations</div>
            <div><code className="bg-white px-1 rounded">array.*</code> - Array operations</div>
            <div><code className="bg-white px-1 rounded">number.*</code> - Number operations</div>
            <div><code className="bg-white px-1 rounded">object.*</code> - Object operations</div>
            <div><code className="bg-white px-1 rounded">Math.*</code> - Math functions</div>
          </div>
        </div>
      </div>

      {/* Advanced options */}
      <div className="mt-4">
        <details className="border rounded p-3">
          <summary className="font-medium text-sm cursor-pointer">Advanced Options</summary>
          <div className="mt-3 space-y-3">
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={node.data.config?.keepOnlyTransformed || false}
                onChange={(e) => updateNodeConfig(node.id, {
                  ...node.data.config,
                  keepOnlyTransformed: e.target.checked
                })}
                className="rounded"
              />
              <span>Keep only transformed fields (remove others)</span>
            </label>

            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={node.data.config?.continueOnError || false}
                onChange={(e) => updateNodeConfig(node.id, {
                  ...node.data.config,
                  continueOnError: e.target.checked
                })}
                className="rounded"
              />
              <span>Continue on transformation error</span>
            </label>
          </div>
        </details>
      </div>
    </div>
  );
}
