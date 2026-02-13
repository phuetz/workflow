/**
 * Array Operations Node Configuration
 * Perform operations on arrays: map, filter, reduce, sort, etc.
 * AGENT 2 - DATA TRANSFORMATION & EXPRESSION ENGINE
 */

import React, { useState, useEffect } from 'react';
import { useWorkflowStore } from '../../../store/workflowStore';
import { evaluateExpression, ExpressionContext } from '../../../utils/ExpressionEvaluator';

interface ArrayOperationsConfigProps {
  node: any;
}

export default function ArrayOperationsConfig({ node }: ArrayOperationsConfigProps) {
  const { updateNodeConfig, nodeExecutionData } = useWorkflowStore();
  const [operation, setOperation] = useState(node.data.config?.operation || 'map');
  const [expression, setExpression] = useState(node.data.config?.expression || '');
  const [previewInput, setPreviewInput] = useState<any[]>([]);
  const [previewOutput, setPreviewOutput] = useState<unknown[] | null>(null);
  const [error, setError] = useState<string>('');

  // Sample data
  const sampleData = [
    { id: 1, name: 'Alice', age: 25, status: 'active' },
    { id: 2, name: 'Bob', age: 30, status: 'active' },
    { id: 3, name: 'Charlie', age: 35, status: 'inactive' },
    { id: 4, name: 'Diana', age: 28, status: 'active' }
  ];

  // Get data from previous node
  useEffect(() => {
    const previousNodes = useWorkflowStore.getState().edges
      .filter(e => e.target === node.id)
      .map(e => e.source);

    if (previousNodes.length > 0) {
      const prevNodeData = nodeExecutionData[previousNodes[0]] as { json?: any } | undefined;
      if (prevNodeData && prevNodeData.json && Array.isArray(prevNodeData.json)) {
        setPreviewInput(prevNodeData.json);
      }
    }

    if (previewInput.length === 0) {
      setPreviewInput(sampleData);
    }
  }, [node.id, nodeExecutionData]);

  // Update preview
  useEffect(() => {
    if (!expression || !previewInput.length) return;

    try {
      let result: any;

      switch (operation) {
        case 'map':
          result = previewInput.map((item, index) => {
            const context: ExpressionContext = {
              $json: item,
              $item: { json: item, index }
            };
            return evaluateExpression(expression, context);
          });
          break;

        case 'filter':
          result = previewInput.filter((item, index) => {
            const context: ExpressionContext = {
              $json: item,
              $item: { json: item, index }
            };
            return evaluateExpression(expression, context);
          });
          break;

        case 'reduce':
          result = previewInput.reduce((acc, item, index) => {
            const context: ExpressionContext = {
              $json: item,
              $item: { json: item, index },
              $vars: { accumulator: acc }
            };
            return evaluateExpression(expression, context);
          }, 0);
          break;

        case 'find':
          result = previewInput.find((item, index) => {
            const context: ExpressionContext = {
              $json: item,
              $item: { json: item, index }
            };
            return evaluateExpression(expression, context);
          });
          break;

        case 'sort':
          result = [...previewInput].sort((a, b) => {
            const contextA: ExpressionContext = { $json: a };
            const contextB: ExpressionContext = { $json: b };
            const valA = evaluateExpression(expression.replace('$json', '$json'), contextA);
            const valB = evaluateExpression(expression.replace('$json', '$json'), contextB);
            return valA > valB ? 1 : valA < valB ? -1 : 0;
          });
          break;

        case 'group':
          result = previewInput.reduce((groups, item, index) => {
            const context: ExpressionContext = {
              $json: item,
              $item: { json: item, index }
            };
            const key = String(evaluateExpression(expression, context));
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
            return groups;
          }, {} as Record<string, any[]>);
          break;

        case 'unique':
          const seen = new Set();
          result = previewInput.filter((item, index) => {
            const context: ExpressionContext = {
              $json: item,
              $item: { json: item, index }
            };
            const value = JSON.stringify(evaluateExpression(expression, context));
            if (seen.has(value)) return false;
            seen.add(value);
            return true;
          });
          break;

        case 'flatten':
          result = previewInput.flat(Infinity);
          break;

        case 'chunk':
          const chunkSize = parseInt(expression) || 2;
          result = [];
          for (let i = 0; i < previewInput.length; i += chunkSize) {
            result.push(previewInput.slice(i, i + chunkSize));
          }
          break;

        default:
          result = previewInput;
      }

      setPreviewOutput(result);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluation error');
      setPreviewOutput(null);
    }
  }, [operation, expression, previewInput]);

  // Handle changes
  const handleOperationChange = (newOperation: string) => {
    setOperation(newOperation);
    updateNodeConfig(node.id, {
      ...node.data.config,
      operation: newOperation
    });
  };

  const handleExpressionChange = (value: string) => {
    setExpression(value);
    updateNodeConfig(node.id, {
      ...node.data.config,
      expression: value
    });
  };

  // Operation-specific examples
  const examples: Record<string, Array<{ label: string; value: string }>> = {
    map: [
      { label: 'Extract name', value: '$json.name' },
      { label: 'Uppercase name', value: 'string.upper($json.name)' },
      { label: 'Transform object', value: '{ id: $json.id, fullName: $json.name, year: new Date().getFullYear() }' },
      { label: 'Add index', value: '{ ...$json, index: $item.index }' }
    ],
    filter: [
      { label: 'Active only', value: '$json.status === "active"' },
      { label: 'Age over 30', value: '$json.age > 30' },
      { label: 'Has email', value: 'object.has($json, "email")' },
      { label: 'Name starts with A', value: 'string.test($json.name, "^A")' }
    ],
    reduce: [
      { label: 'Sum ages', value: '$vars.accumulator + $json.age' },
      { label: 'Count items', value: '$vars.accumulator + 1' },
      { label: 'Concatenate names', value: '$vars.accumulator + ", " + $json.name' },
      { label: 'Max age', value: 'Math.max($vars.accumulator, $json.age)' }
    ],
    find: [
      { label: 'Find by ID', value: '$json.id === 2' },
      { label: 'Find by name', value: '$json.name === "Bob"' },
      { label: 'First inactive', value: '$json.status === "inactive"' }
    ],
    sort: [
      { label: 'Sort by age', value: '$json.age' },
      { label: 'Sort by name', value: '$json.name' },
      { label: 'Sort by date', value: 'new Date($json.createdAt).getTime()' }
    ],
    group: [
      { label: 'Group by status', value: '$json.status' },
      { label: 'Group by age range', value: 'Math.floor($json.age / 10) * 10' },
      { label: 'Group by first letter', value: '$json.name.charAt(0)' }
    ],
    unique: [
      { label: 'Unique by ID', value: '$json.id' },
      { label: 'Unique by status', value: '$json.status' },
      { label: 'Unique names', value: '$json.name' }
    ],
    chunk: [
      { label: 'Chunks of 2', value: '2' },
      { label: 'Chunks of 5', value: '5' },
      { label: 'Chunks of 10', value: '10' }
    ]
  };

  return (
    <div className="p-4 max-w-4xl">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Array Operations</h3>
        <p className="text-sm text-gray-600">
          Perform operations on array data
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
          <option value="map">Map - Transform each item</option>
          <option value="filter">Filter - Keep items matching condition</option>
          <option value="reduce">Reduce - Aggregate to single value</option>
          <option value="find">Find - Get first matching item</option>
          <option value="sort">Sort - Order items</option>
          <option value="group">Group - Group by key</option>
          <option value="unique">Unique - Remove duplicates</option>
          <option value="flatten">Flatten - Flatten nested arrays</option>
          <option value="chunk">Chunk - Split into chunks</option>
        </select>
      </div>

      {/* Expression input */}
      {operation !== 'flatten' && (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              {operation === 'chunk' ? 'Chunk Size' : 'Expression'}
            </label>
            <textarea
              value={expression}
              onChange={(e) => handleExpressionChange(e.target.value)}
              className="w-full h-24 px-3 py-2 border rounded font-mono text-sm"
              placeholder={`Expression for ${operation} operation`}
            />
          </div>

          {/* Quick examples */}
          {examples[operation] && (
            <div className="mb-4">
              <div className="text-sm font-medium mb-2">Quick Examples:</div>
              <div className="grid grid-cols-2 gap-2">
                {examples[operation].map((ex) => (
                  <button
                    key={ex.label}
                    onClick={() => handleExpressionChange(ex.value)}
                    className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded text-left"
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Preview */}
      <div className="mb-4">
        <h4 className="font-medium mb-2">Preview</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">
              Input ({previewInput.length} items):
            </div>
            <pre className="text-xs bg-gray-50 p-3 rounded border overflow-x-auto max-h-64">
              {JSON.stringify(previewInput, null, 2)}
            </pre>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">
              Output{previewOutput && Array.isArray(previewOutput) ? ` (${previewOutput.length} items)` : ''}:
            </div>
            {error ? (
              <div className="text-xs text-red-600 bg-red-50 p-3 rounded border border-red-200">
                {error}
              </div>
            ) : (
              <pre className="text-xs bg-green-50 p-3 rounded border border-green-200 overflow-x-auto max-h-64">
                {JSON.stringify(previewOutput, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>

      {/* Operation descriptions */}
      <div className="p-4 bg-blue-50 rounded border border-blue-200">
        <h4 className="font-medium text-sm mb-2">Operation Details:</h4>
        <div className="text-xs space-y-1">
          {operation === 'map' && (
            <p>Transform each item in the array. Returns array of same length.</p>
          )}
          {operation === 'filter' && (
            <p>Keep only items where expression returns true. Returns filtered array.</p>
          )}
          {operation === 'reduce' && (
            <p>Aggregate array into single value. Access accumulator via $vars.accumulator.</p>
          )}
          {operation === 'find' && (
            <p>Return first item where expression returns true. Returns single item or undefined.</p>
          )}
          {operation === 'sort' && (
            <p>Sort items by expression value. Returns sorted array.</p>
          )}
          {operation === 'group' && (
            <p>Group items by expression value. Returns object with groups.</p>
          )}
          {operation === 'unique' && (
            <p>Remove duplicates based on expression value. Returns array with unique items.</p>
          )}
          {operation === 'flatten' && (
            <p>Flatten nested arrays into single array. No expression needed.</p>
          )}
          {operation === 'chunk' && (
            <p>Split array into chunks of specified size. Enter number as expression.</p>
          )}
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
                checked={node.data.config?.continueOnError || false}
                onChange={(e) => updateNodeConfig(node.id, {
                  ...node.data.config,
                  continueOnError: e.target.checked
                })}
                className="rounded"
              />
              <span>Continue on item error (skip failed items)</span>
            </label>

            {operation === 'sort' && (
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={node.data.config?.sortDescending || false}
                  onChange={(e) => updateNodeConfig(node.id, {
                    ...node.data.config,
                    sortDescending: e.target.checked
                  })}
                  className="rounded"
                />
                <span>Sort in descending order</span>
              </label>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}
