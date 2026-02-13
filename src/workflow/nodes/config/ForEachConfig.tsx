/**
 * ForEach Loop Configuration Component
 * AGENT 4 - Advanced Workflow Features
 * Implements for-each iteration with batch processing and error handling
 */

import React, { useState } from 'react';
import { WorkflowNode } from '../../../types/workflow';

interface ForEachConfigProps {
  node: WorkflowNode;
  onUpdate: (config: Record<string, unknown>) => void;
}

export const ForEachConfig: React.FC<ForEachConfigProps> = ({ node, onUpdate }) => {
  const config = node.data.config || {};

  const [itemsSource, setItemsSource] = useState(config.itemsSource as string || '{{input.items}}');
  const [itemVariable, setItemVariable] = useState(config.itemVariable as string || 'item');
  const [indexVariable, setIndexVariable] = useState(config.indexVariable as string || 'index');
  const [batchSize, setBatchSize] = useState(config.batchSize as number || 1);
  const [parallel, setParallel] = useState(config.parallel as boolean || false);
  const [maxParallel, setMaxParallel] = useState(config.maxParallel as number || 5);
  const [continueOnError, setContinueOnError] = useState(config.continueOnError as boolean || false);
  const [outputMode, setOutputMode] = useState(config.outputMode as string || 'collect');
  const [timeout, setTimeout] = useState(config.timeout as number || 0);

  const handleUpdate = (updates: Record<string, unknown>) => {
    const newConfig = { ...config, ...updates };
    onUpdate(newConfig);
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <label className="block text-sm font-medium mb-1">
          Items Source (Expression)
        </label>
        <input
          type="text"
          value={itemsSource}
          onChange={(e) => {
            setItemsSource(e.target.value);
            handleUpdate({ itemsSource: e.target.value });
          }}
          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="{{input.items}} or {{$node.getData()}}"
        />
        <p className="text-xs text-gray-500 mt-1">
          Expression that resolves to an array. Use {'{{'} and {'}}'}  for variables.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">
            Item Variable Name
          </label>
          <input
            type="text"
            value={itemVariable}
            onChange={(e) => {
              setItemVariable(e.target.value);
              handleUpdate({ itemVariable: e.target.value });
            }}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="item"
          />
          <p className="text-xs text-gray-500 mt-1">
            Variable name for current item (access as {'{{'}{itemVariable}{'}}'}  )
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Index Variable Name
          </label>
          <input
            type="text"
            value={indexVariable}
            onChange={(e) => {
              setIndexVariable(e.target.value);
              handleUpdate({ indexVariable: e.target.value });
            }}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="index"
          />
          <p className="text-xs text-gray-500 mt-1">
            Variable name for current index (0-based)
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Batch Size
        </label>
        <input
          type="number"
          min="1"
          value={batchSize}
          onChange={(e) => {
            setBatchSize(parseInt(e.target.value));
            handleUpdate({ batchSize: parseInt(e.target.value) });
          }}
          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Number of items to process in each batch. Set to 1 for individual processing.
        </p>
      </div>

      <div className="space-y-2">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={parallel}
            onChange={(e) => {
              setParallel(e.target.checked);
              handleUpdate({ parallel: e.target.checked });
            }}
            className="rounded text-blue-500 focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm font-medium">Enable Parallel Processing</span>
        </label>
        <p className="text-xs text-gray-500 ml-6">
          Process multiple items concurrently for better performance
        </p>
      </div>

      {parallel && (
        <div>
          <label className="block text-sm font-medium mb-1">
            Max Parallel Executions
          </label>
          <input
            type="number"
            min="1"
            max="20"
            value={maxParallel}
            onChange={(e) => {
              setMaxParallel(parseInt(e.target.value));
              handleUpdate({ maxParallel: parseInt(e.target.value) });
            }}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Maximum number of items to process simultaneously (1-20)
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">
          Output Mode
        </label>
        <select
          value={outputMode}
          onChange={(e) => {
            setOutputMode(e.target.value);
            handleUpdate({ outputMode: e.target.value });
          }}
          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="collect">Collect All Results</option>
          <option value="last">Only Last Result</option>
          <option value="first">Only First Result</option>
          <option value="passthrough">Pass Through (No Collection)</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          How to handle results from loop iterations
        </p>
      </div>

      <div className="space-y-2">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={continueOnError}
            onChange={(e) => {
              setContinueOnError(e.target.checked);
              handleUpdate({ continueOnError: e.target.checked });
            }}
            className="rounded text-blue-500 focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm font-medium">Continue on Error</span>
        </label>
        <p className="text-xs text-gray-500 ml-6">
          Continue processing remaining items if one fails
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Timeout (ms)
        </label>
        <input
          type="number"
          min="0"
          value={timeout}
          onChange={(e) => {
            setTimeout(parseInt(e.target.value));
            handleUpdate({ timeout: parseInt(e.target.value) });
          }}
          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="0 = no timeout"
        />
        <p className="text-xs text-gray-500 mt-1">
          Maximum time for entire loop execution. 0 = no timeout.
        </p>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Configuration Summary</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>Items from: <code className="bg-blue-100 px-1 rounded">{itemsSource}</code></li>
          <li>Variables: <code className="bg-blue-100 px-1 rounded">{itemVariable}</code>, <code className="bg-blue-100 px-1 rounded">{indexVariable}</code></li>
          <li>Mode: {parallel ? `Parallel (max ${maxParallel})` : 'Sequential'}, Batch size: {batchSize}</li>
          <li>Output: {outputMode}, Error handling: {continueOnError ? 'Continue' : 'Stop'}</li>
        </ul>
      </div>
    </div>
  );
};
