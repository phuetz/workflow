import React, { useState, useCallback } from 'react';
import { WorkflowNode } from '../../../types/workflow';
import { PythonExecutionConfig } from '../../../types/codeExecution';
// CodeMirror imports are already in dependencies (@codemirror packages)

interface PythonCodeConfigProps {
  node: WorkflowNode;
  onChange: (config: Record<string, unknown>) => void;
}

const DEFAULT_PYTHON_CODE = `# Python Code Node
# Access input data via 'input_data' variable
# Return result as 'result' variable

def main(input_data):
    """
    Main function - your code goes here

    Args:
        input_data: Data from previous node

    Returns:
        dict: Result to pass to next node
    """

    # Example: Process input data
    name = input_data.get('name', 'World')

    # Example: API call, data processing, etc.
    message = f"Hello, {name}!"

    # Return result
    return {
        "message": message,
        "processed": True,
        "timestamp": str(__import__('datetime').datetime.now())
    }

# Execute main function
result = main(input_data)
`;

export const PythonCodeConfig: React.FC<PythonCodeConfigProps> = ({ node, onChange }) => {
  const [config, setConfig] = useState<Partial<PythonExecutionConfig>>(
    (node.data.config as Partial<PythonExecutionConfig>) || {
      language: 'python',
      code: DEFAULT_PYTHON_CODE,
      pythonVersion: '3.11',
      timeout: 30000,
      memory: 512,
      mode: 'sync',
      pipPackages: [],
      enableNumpy: false,
      enablePandas: false,
      enableRequests: true,
      inputVariables: {},
      environment: {},
    }
  );

  const handleChange = useCallback((updates: Partial<PythonExecutionConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onChange(newConfig);
  }, [config, onChange]);

  const handleCodeChange = useCallback((value: string) => {
    handleChange({ code: value });
  }, [handleChange]);

  const addPackage = useCallback(() => {
    const packageName = prompt('Enter pip package name:');
    if (packageName && packageName.trim()) {
      const newPackages = [...(config.pipPackages || []), packageName.trim()];
      handleChange({ pipPackages: newPackages });
    }
  }, [config.pipPackages, handleChange]);

  const removePackage = useCallback((index: number) => {
    const newPackages = config.pipPackages?.filter((_, i) => i !== index) || [];
    handleChange({ pipPackages: newPackages });
  }, [config.pipPackages, handleChange]);

  const addEnvironmentVar = useCallback(() => {
    const key = prompt('Environment variable name:');
    if (!key) return;
    const value = prompt('Environment variable value:');
    if (!value) return;

    const newEnv = { ...config.environment, [key]: value };
    handleChange({ environment: newEnv });
  }, [config.environment, handleChange]);

  return (
    <div className="space-y-4 max-h-[600px] overflow-y-auto">
      <div>
        <h3 className="text-lg font-semibold mb-2">Python Code Execution</h3>
        <p className="text-sm text-gray-600 mb-4">
          Execute custom Python code with sandboxed environment
        </p>
      </div>

      {/* Python Version */}
      <div>
        <label className="block text-sm font-medium mb-1">Python Version</label>
        <select
          className="w-full p-2 border rounded"
          value={config.pythonVersion || '3.11'}
          onChange={(e) => handleChange({ pythonVersion: e.target.value as '3.9' | '3.10' | '3.11' | '3.12' })}
        >
          <option value="3.9">Python 3.9</option>
          <option value="3.10">Python 3.10</option>
          <option value="3.11">Python 3.11 (Recommended)</option>
          <option value="3.12">Python 3.12</option>
        </select>
      </div>

      {/* Code Editor */}
      <div>
        <label className="block text-sm font-medium mb-1">Python Code</label>
        <div className="border rounded">
          <textarea
            className="w-full p-3 font-mono text-sm"
            rows={20}
            value={config.code || ''}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="Enter your Python code here..."
            style={{
              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, monospace',
              fontSize: '13px',
              lineHeight: '1.5',
              tabSize: 4,
            }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Input data available as <code className="bg-gray-100 px-1">input_data</code> variable.
          Return result via <code className="bg-gray-100 px-1">result</code> variable.
        </p>
      </div>

      {/* Quick Libraries */}
      <div>
        <label className="block text-sm font-medium mb-2">Common Libraries (Pre-installed)</label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="mr-2"
              checked={config.enableRequests || false}
              onChange={(e) => handleChange({ enableRequests: e.target.checked })}
            />
            <span className="text-sm">requests (HTTP library)</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              className="mr-2"
              checked={config.enableNumpy || false}
              onChange={(e) => handleChange({ enableNumpy: e.target.checked })}
            />
            <span className="text-sm">numpy (Numerical computing)</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              className="mr-2"
              checked={config.enablePandas || false}
              onChange={(e) => handleChange({ enablePandas: e.target.checked })}
            />
            <span className="text-sm">pandas (Data analysis)</span>
          </label>
        </div>
      </div>

      {/* Custom Packages */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium">Custom Pip Packages</label>
          <button
            type="button"
            onClick={addPackage}
            className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            + Add Package
          </button>
        </div>
        {config.pipPackages && config.pipPackages.length > 0 ? (
          <div className="space-y-1">
            {config.pipPackages.map((pkg, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <code className="text-sm">{pkg}</code>
                <button
                  type="button"
                  onClick={() => removePackage(index)}
                  className="text-red-500 text-sm hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">No custom packages</p>
        )}
      </div>

      {/* Execution Settings */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium mb-3">Execution Settings</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Timeout (seconds)</label>
            <input
              type="number"
              min="1"
              max="300"
              className="w-full p-2 border rounded"
              value={(config.timeout || 30000) / 1000}
              onChange={(e) => handleChange({ timeout: parseInt(e.target.value) * 1000 })}
            />
            <p className="text-xs text-gray-500 mt-1">Max: 300s (5 minutes)</p>
          </div>

          <div>
            <label className="block text-sm mb-1">Memory Limit (MB)</label>
            <input
              type="number"
              min="128"
              max="2048"
              step="128"
              className="w-full p-2 border rounded"
              value={config.memory || 512}
              onChange={(e) => handleChange({ memory: parseInt(e.target.value) })}
            />
            <p className="text-xs text-gray-500 mt-1">Max: 2048 MB (2 GB)</p>
          </div>
        </div>

        <div className="mt-3">
          <label className="block text-sm mb-1">Execution Mode</label>
          <select
            className="w-full p-2 border rounded"
            value={config.mode || 'sync'}
            onChange={(e) => handleChange({ mode: e.target.value as 'sync' | 'async' })}
          >
            <option value="sync">Synchronous (Wait for completion)</option>
            <option value="async">Asynchronous (Non-blocking)</option>
          </select>
        </div>
      </div>

      {/* Environment Variables */}
      <div className="border-t pt-4">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium">Environment Variables</label>
          <button
            type="button"
            onClick={addEnvironmentVar}
            className="text-sm px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
          >
            + Add Variable
          </button>
        </div>
        {config.environment && Object.keys(config.environment).length > 0 ? (
          <div className="space-y-1">
            {Object.entries(config.environment).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between bg-gray-50 p-2 rounded font-mono text-sm">
                <span><strong>{key}</strong> = {value}</span>
                <button
                  type="button"
                  onClick={() => {
                    const newEnv = { ...config.environment };
                    delete newEnv[key];
                    handleChange({ environment: newEnv });
                  }}
                  className="text-red-500 text-sm hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">No environment variables</p>
        )}
      </div>

      {/* Security Warning */}
      <div className="text-xs text-gray-500 mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
        <strong>⚠️ Security:</strong> Code execution is sandboxed in an isolated Docker container with limited resources.
        Network access and file system access are restricted. Do not execute untrusted code.
      </div>

      {/* Examples */}
      <div className="border-t pt-4">
        <details className="cursor-pointer">
          <summary className="text-sm font-medium mb-2">📚 Code Examples</summary>
          <div className="mt-2 space-y-3 text-sm">
            <div>
              <strong>Example 1: Simple data transformation</strong>
              <pre className="bg-gray-100 p-2 rounded mt-1 text-xs overflow-x-auto">
{`def main(input_data):
    items = input_data.get('items', [])
    total = sum(item['price'] for item in items)
    return {'total': total, 'count': len(items)}`}
              </pre>
            </div>

            <div>
              <strong>Example 2: API call with requests</strong>
              <pre className="bg-gray-100 p-2 rounded mt-1 text-xs overflow-x-auto">
{`import requests

def main(input_data):
    url = input_data.get('url')
    response = requests.get(url)
    return {
        'status': response.status_code,
        'data': response.json()
    }`}
              </pre>
            </div>

            <div>
              <strong>Example 3: Data analysis with pandas</strong>
              <pre className="bg-gray-100 p-2 rounded mt-1 text-xs overflow-x-auto">
{`import pandas as pd

def main(input_data):
    df = pd.DataFrame(input_data['records'])
    stats = df.describe().to_dict()
    return {'statistics': stats}`}
              </pre>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
};
