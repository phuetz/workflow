import React, { useState, useCallback } from 'react';
import { WorkflowNode } from '../../../types/workflow';
import { JavaExecutionConfig } from '../../../types/codeExecution';

interface JavaCodeConfigProps {
  node: WorkflowNode;
  onChange: (config: Record<string, unknown>) => void;
}

const DEFAULT_JAVA_CODE = `// Java Code Node
// Access input data via InputData class
// Return result via return statement

import java.util.*;
import com.google.gson.*;

public class WorkflowNode {

    public static Map<String, Object> execute(Map<String, Object> inputData) {
        /**
         * Main execution method
         *
         * @param inputData Data from previous node
         * @return Result to pass to next node
         */

        // Example: Get input
        String name = (String) inputData.getOrDefault("name", "World");

        // Example: Process data
        String message = "Hello, " + name + "!";

        // Example: Return result
        Map<String, Object> result = new HashMap<>();
        result.put("message", message);
        result.put("processed", true);
        result.put("timestamp", System.currentTimeMillis());

        return result;
    }
}
`;

export const JavaCodeConfig: React.FC<JavaCodeConfigProps> = ({ node, onChange }) => {
  const [config, setConfig] = useState<Partial<JavaExecutionConfig>>(
    (node.data.config as Partial<JavaExecutionConfig>) || {
      language: 'java',
      code: DEFAULT_JAVA_CODE,
      javaVersion: '17',
      timeout: 30000,
      memory: 512,
      mode: 'sync',
      mavenDependencies: [],
      className: 'WorkflowNode',
      mainMethod: 'execute',
      inputVariables: {},
      environment: {},
    }
  );

  const handleChange = useCallback((updates: Partial<JavaExecutionConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onChange(newConfig);
  }, [config, onChange]);

  const handleCodeChange = useCallback((value: string) => {
    handleChange({ code: value });
  }, [handleChange]);

  const addDependency = useCallback(() => {
    const groupId = prompt('Maven Group ID (e.g., com.google.code.gson):');
    if (!groupId) return;
    const artifactId = prompt('Artifact ID (e.g., gson):');
    if (!artifactId) return;
    const version = prompt('Version (e.g., 2.10.1):');
    if (!version) return;

    const newDeps = [
      ...(config.mavenDependencies || []),
      { groupId, artifactId, version }
    ];
    handleChange({ mavenDependencies: newDeps });
  }, [config.mavenDependencies, handleChange]);

  const removeDependency = useCallback((index: number) => {
    const newDeps = config.mavenDependencies?.filter((_, i) => i !== index) || [];
    handleChange({ mavenDependencies: newDeps });
  }, [config.mavenDependencies, handleChange]);

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
        <h3 className="text-lg font-semibold mb-2">Java Code Execution</h3>
        <p className="text-sm text-gray-600 mb-4">
          Execute custom Java code with sandboxed JVM environment
        </p>
      </div>

      {/* Java Version */}
      <div>
        <label className="block text-sm font-medium mb-1">Java Version</label>
        <select
          className="w-full p-2 border rounded"
          value={config.javaVersion || '17'}
          onChange={(e) => handleChange({ javaVersion: e.target.value as '11' | '17' | '21' })}
        >
          <option value="11">Java 11 (LTS)</option>
          <option value="17">Java 17 (LTS - Recommended)</option>
          <option value="21">Java 21 (LTS - Latest)</option>
        </select>
      </div>

      {/* Code Editor */}
      <div>
        <label className="block text-sm font-medium mb-1">Java Code</label>
        <div className="border rounded">
          <textarea
            className="w-full p-3 font-mono text-sm"
            rows={20}
            value={config.code || ''}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="Enter your Java code here..."
            style={{
              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, monospace',
              fontSize: '13px',
              lineHeight: '1.5',
              tabSize: 4,
            }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Input data passed as <code className="bg-gray-100 px-1">Map&lt;String, Object&gt; inputData</code>.
          Return <code className="bg-gray-100 px-1">Map&lt;String, Object&gt;</code> result.
        </p>
      </div>

      {/* Class Configuration */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Class Name</label>
          <input
            type="text"
            className="w-full p-2 border rounded"
            value={config.className || 'WorkflowNode'}
            onChange={(e) => handleChange({ className: e.target.value })}
            placeholder="WorkflowNode"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Main Method</label>
          <input
            type="text"
            className="w-full p-2 border rounded"
            value={config.mainMethod || 'execute'}
            onChange={(e) => handleChange({ mainMethod: e.target.value })}
            placeholder="execute"
          />
        </div>
      </div>

      {/* Maven Dependencies */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium">Maven Dependencies</label>
          <button
            type="button"
            onClick={addDependency}
            className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            + Add Dependency
          </button>
        </div>
        {config.mavenDependencies && config.mavenDependencies.length > 0 ? (
          <div className="space-y-1">
            {config.mavenDependencies.map((dep, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <code className="text-sm">
                  {dep.groupId}:{dep.artifactId}:{dep.version}
                </code>
                <button
                  type="button"
                  onClick={() => removeDependency(index)}
                  className="text-red-500 text-sm hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">No Maven dependencies. Using only JDK classes.</p>
        )}
        <p className="text-xs text-gray-500 mt-2">
          Common: <code>com.google.code.gson:gson:2.10.1</code> (JSON),
          <code>org.apache.commons:commons-lang3:3.12.0</code> (Utils)
        </p>
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
              min="256"
              max="2048"
              step="256"
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
        <strong>⚠️ Security:</strong> Code execution is sandboxed in an isolated JVM with SecurityManager.
        File system access and network access are restricted. Do not execute untrusted code.
      </div>

      {/* Examples */}
      <div className="border-t pt-4">
        <details className="cursor-pointer">
          <summary className="text-sm font-medium mb-2">📚 Code Examples</summary>
          <div className="mt-2 space-y-3 text-sm">
            <div>
              <strong>Example 1: Simple data processing</strong>
              <pre className="bg-gray-100 p-2 rounded mt-1 text-xs overflow-x-auto">
{`public static Map<String, Object> execute(Map<String, Object> input) {
    List<Map> items = (List) input.get("items");
    double total = items.stream()
        .mapToDouble(i -> (Double) i.get("price"))
        .sum();

    Map<String, Object> result = new HashMap<>();
    result.put("total", total);
    result.put("count", items.size());
    return result;
}`}
              </pre>
            </div>

            <div>
              <strong>Example 2: JSON processing with Gson</strong>
              <pre className="bg-gray-100 p-2 rounded mt-1 text-xs overflow-x-auto">
{`import com.google.gson.*;

public static Map<String, Object> execute(Map<String, Object> input) {
    Gson gson = new Gson();
    String json = gson.toJson(input);

    // Process JSON
    JsonObject obj = JsonParser.parseString(json).getAsJsonObject();

    Map<String, Object> result = new HashMap<>();
    result.put("processed", obj.toString());
    return result;
}`}
              </pre>
            </div>

            <div>
              <strong>Example 3: String manipulation</strong>
              <pre className="bg-gray-100 p-2 rounded mt-1 text-xs overflow-x-auto">
{`import org.apache.commons.lang3.StringUtils;

public static Map<String, Object> execute(Map<String, Object> input) {
    String text = (String) input.get("text");
    String capitalized = StringUtils.capitalize(text);

    Map<String, Object> result = new HashMap<>();
    result.put("original", text);
    result.put("capitalized", capitalized);
    return result;
}`}
              </pre>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
};
