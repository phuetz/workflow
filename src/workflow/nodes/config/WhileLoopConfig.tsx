/**
 * While Loop Configuration Component
 * AGENT 4 - Advanced Workflow Features
 * Implements while loop with condition evaluation and safety limits
 */

import React, { useState } from 'react';
import { WorkflowNode } from '../../../types/workflow';

interface WhileLoopConfigProps {
  node: WorkflowNode;
  onUpdate: (config: Record<string, unknown>) => void;
}

export const WhileLoopConfig: React.FC<WhileLoopConfigProps> = ({ node, onUpdate }) => {
  const config = (node.data.config || {}) as Record<string, unknown>;

  const [condition, setCondition] = useState((config.condition as string | undefined) || '{{$iteration}} < 10');
  const [maxIterations, setMaxIterations] = useState((config.maxIterations as number | undefined) || 1000);
  const [loopVariable, setLoopVariable] = useState((config.loopVariable as string | undefined) || '$iteration');
  const [continueOnError, setContinueOnError] = useState((config.continueOnError as boolean | undefined) ?? false);
  const [collectResults, setCollectResults] = useState((config.collectResults as boolean | undefined) ?? true);
  const [timeout, setTimeout] = useState((config.timeout as number | undefined) || 60000);

  const handleUpdate = (updates: Record<string, unknown>) => {
    const newConfig = { ...config, ...updates };
    onUpdate(newConfig);
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <label className="block text-sm font-medium mb-1">
          Loop Condition
        </label>
        <input
          type="text"
          value={condition}
          onChange={(e) => {
            setCondition(e.target.value);
            handleUpdate({ condition: e.target.value });
          }}
          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="{{$iteration}} < 10"
        />
        <p className="text-xs text-gray-500 mt-1">
          Boolean expression. Loop continues while this is true.
        </p>
      </div>

      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
        <h4 className="text-sm font-medium text-yellow-900 mb-2">Available Variables</h4>
        <ul className="text-xs text-yellow-800 space-y-1">
          <li><code className="bg-yellow-100 px-1 rounded">{'{{'}{loopVariable}{'}}'}</code> - Current iteration count (starts at 0)</li>
          <li><code className="bg-yellow-100 px-1 rounded">{'{{$prevResult}}'}</code> - Result from previous iteration</li>
          <li><code className="bg-yellow-100 px-1 rounded">{'{{$input}}'}</code> - Initial loop input data</li>
          <li><code className="bg-yellow-100 px-1 rounded">{'{{$now}}'}</code> - Current timestamp</li>
        </ul>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Loop Variable Name
        </label>
        <input
          type="text"
          value={loopVariable}
          onChange={(e) => {
            setLoopVariable(e.target.value);
            handleUpdate({ loopVariable: e.target.value });
          }}
          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="$iteration"
        />
        <p className="text-xs text-gray-500 mt-1">
          Variable name for iteration counter (must start with $)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Max Iterations (Safety Limit)
        </label>
        <input
          type="number"
          min="1"
          max="10000"
          value={maxIterations}
          onChange={(e) => {
            setMaxIterations(parseInt(e.target.value));
            handleUpdate({ maxIterations: parseInt(e.target.value) });
          }}
          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Maximum iterations to prevent infinite loops (1-10,000)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Timeout (ms)
        </label>
        <input
          type="number"
          min="1000"
          max="600000"
          value={timeout}
          onChange={(e) => {
            setTimeout(parseInt(e.target.value));
            handleUpdate({ timeout: parseInt(e.target.value) });
          }}
          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Maximum execution time in milliseconds (1s - 10min)
        </p>
      </div>

      <div className="space-y-2">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={collectResults}
            onChange={(e) => {
              setCollectResults(e.target.checked);
              handleUpdate({ collectResults: e.target.checked });
            }}
            className="rounded text-blue-500 focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm font-medium">Collect All Results</span>
        </label>
        <p className="text-xs text-gray-500 ml-6">
          Store results from each iteration in an array
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
          Continue loop execution if an iteration fails
        </p>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Example Conditions</h4>
        <ul className="text-xs text-blue-800 space-y-1 font-mono">
          <li>{'{{$iteration}} < 100'} - Run 100 times</li>
          <li>{'{{$prevResult.hasMore}} === true'} - While more data exists</li>
          <li>{'{{$prevResult.count}} > 0'} - While count is positive</li>
          <li>{'{{$iteration}} < 50 && {{$prevResult.status}} === "pending"'} - Combined conditions</li>
        </ul>
      </div>

      <div className="p-3 bg-red-50 border border-red-200 rounded">
        <h4 className="text-sm font-medium text-red-900 mb-1">Safety Features</h4>
        <p className="text-xs text-red-800">
          Loop will automatically stop if: max iterations reached, timeout exceeded, or infinite loop detected.
        </p>
      </div>
    </div>
  );
};
