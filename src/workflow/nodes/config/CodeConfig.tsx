/**
 * Code Node Configuration
 * Execute JavaScript code in workflows
 * PROJET SAUVÉ - Phase 5.5: Data Processing Nodes
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface CodeConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

interface CodeNodeConfig extends NodeConfig {
  code?: string;
  mode?: string;
}

export const CodeConfig: React.FC<CodeConfigProps> = ({ config, onChange }) => {
  const codeConfig = config as CodeNodeConfig;

  const [code, setCode] = useState(
    codeConfig.code ||
    `// Access input data with $input
const items = $input.all();

// Process data
const result = items.map(item => ({
  ...item.json,
  processed: true,
  timestamp: Date.now()
}));

// Return the processed data
return result;`
  );

  const [mode, setMode] = useState(codeConfig.mode || 'runOnceForAllItems');

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    onChange({ ...config, code: newCode });
  };

  const handleModeChange = (newMode: string) => {
    setMode(newMode);
    onChange({ ...config, mode: newMode });
  };

  const examples = {
    basic: `// Basic data transformation
const items = $input.all();
return items.map(item => ({
  ...item.json,
  processed: true
}));`,

    filtering: `// Filter items
const items = $input.all();
return items.filter(item =>
  item.json.status === 'active'
);`,

    aggregation: `// Aggregate data
const items = $input.all();
const total = items.reduce((sum, item) =>
  sum + item.json.value, 0
);
return [{ total, count: items.length }];`,

    api: `// Make API call (async)
const items = $input.all();
const results = [];

for (const item of items) {
  const response = await fetch('https://api.example.com/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item.json)
  });
  results.push(await response.json());
}

return results;`
  };

  const loadExample = (example: keyof typeof examples) => {
    handleCodeChange(examples[example]);
  };

  return (
    <div className="code-config space-y-4">
      <div className="font-semibold text-lg mb-4">JavaScript Code</div>

      <div>
        <label className="block text-sm font-medium mb-2">Execution Mode</label>
        <select
          value={mode}
          onChange={(e) => handleModeChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="runOnceForAllItems">Run once for all items</option>
          <option value="runOnceForEachItem">Run once for each item</option>
        </select>
        <p className="text-xs text-gray-600 mt-1">
          {mode === 'runOnceForAllItems'
            ? 'Code runs once with all items available via $input.all()'
            : 'Code runs separately for each item, accessible via $input.item'}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Code Editor</label>
        <textarea
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
          placeholder="Write your JavaScript code here..."
          spellCheck={false}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => loadExample('basic')}
          className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
        >
          📝 Basic Transform
        </button>
        <button
          onClick={() => loadExample('filtering')}
          className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
        >
          🔍 Filtering
        </button>
        <button
          onClick={() => loadExample('aggregation')}
          className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
        >
          📊 Aggregation
        </button>
        <button
          onClick={() => loadExample('api')}
          className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
        >
          🌐 API Call
        </button>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm space-y-2">
        <div><strong>📚 Available Variables:</strong></div>
        <div><code className="bg-white px-2 py-1 rounded">$input</code> - Access input items</div>
        <div><code className="bg-white px-2 py-1 rounded">$json</code> - Current item JSON</div>
        <div><code className="bg-white px-2 py-1 rounded">$node</code> - Node outputs</div>
        <div><code className="bg-white px-2 py-1 rounded">$workflow</code> - Workflow info</div>
        <div><code className="bg-white px-2 py-1 rounded">$vars</code> - Workflow variables</div>
      </div>

      <div className="mt-2 p-3 bg-yellow-50 rounded text-sm">
        <strong>⚠️ Security:</strong> Code runs in a sandboxed environment. Access to Node.js APIs may be restricted.
      </div>
    </div>
  );
};
