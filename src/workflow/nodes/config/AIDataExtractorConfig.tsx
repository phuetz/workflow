/**
 * AI Data Extractor Node Configuration
 * Extract structured data from unstructured text using AI
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface AIDataExtractorConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const AIDataExtractorConfig: React.FC<AIDataExtractorConfigProps> = ({
  config,
  onChange,
}) => {
  const [provider, setProvider] = useState((config.provider as string) || 'openai');
  const [model, setModel] = useState((config.model as string) || 'gpt-4');
  const [inputText, setInputText] = useState((config.inputText as string) || '');
  const [schema, setSchema] = useState(
    (config.schema as string) ||
      JSON.stringify(
        {
          name: 'string',
          email: 'string',
          phone: 'string',
          address: 'object',
        },
        null,
        2
      )
  );
  const [outputFormat, setOutputFormat] = useState((config.outputFormat as string) || 'json');
  const [temperature, setTemperature] = useState((config.temperature as number) || 0.1);
  const [extractionPrompt, setExtractionPrompt] = useState(
    (config.extractionPrompt as string) || ''
  );
  const [strictMode, setStrictMode] = useState((config.strictMode as boolean) ?? true);

  const handleChange = (updates: Partial<NodeConfig>) => {
    onChange({ ...config, ...updates });
  };

  const modelsByProvider: Record<string, string[]> = {
    openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    anthropic: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229'],
    google: ['gemini-pro'],
  };

  const schemaExamples = {
    contact: {
      firstName: 'string',
      lastName: 'string',
      email: 'string',
      phone: 'string',
      company: 'string',
    },
    invoice: {
      invoiceNumber: 'string',
      date: 'string',
      total: 'number',
      items: 'array',
      vendor: 'string',
    },
    event: {
      title: 'string',
      date: 'string',
      location: 'string',
      attendees: 'array',
      description: 'string',
    },
  };

  const loadExample = (exampleType: string) => {
    const example = schemaExamples[exampleType as keyof typeof schemaExamples];
    if (example) {
      const formatted = JSON.stringify(example, null, 2);
      setSchema(formatted);
      handleChange({ schema: formatted });
    }
  };

  return (
    <div className="ai-data-extractor-config space-y-4 text-gray-900 dark:text-gray-100">
      <div className="font-semibold text-lg mb-4">AI Data Extractor Configuration</div>

      <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded text-sm mb-4">
        <strong>🔍 Structured Data Extraction</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Provider</label>
        <select
          value={provider}
          onChange={(e) => {
            setProvider(e.target.value);
            const newModel = modelsByProvider[e.target.value][0];
            setModel(newModel);
            handleChange({ provider: e.target.value, model: newModel });
          }}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md"
        >
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic (Claude)</option>
          <option value="google">Google AI</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Model</label>
        <select
          value={model}
          onChange={(e) => {
            setModel(e.target.value);
            handleChange({ model: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md"
        >
          {modelsByProvider[provider].map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded text-sm mb-4 mt-6">
        <strong>📋 Data Schema</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Load Example Schema</label>
        <div className="flex gap-2">
          <button
            onClick={() => loadExample('contact')}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-sm"
          >
            Contact Info
          </button>
          <button
            onClick={() => loadExample('invoice')}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-sm"
          >
            Invoice
          </button>
          <button
            onClick={() => loadExample('event')}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-sm"
          >
            Event
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Extraction Schema (JSON)</label>
        <textarea
          rows={10}
          value={schema}
          onChange={(e) => {
            setSchema(e.target.value);
            handleChange({ schema: e.target.value });
          }}
          placeholder='{\n  "field1": "string",\n  "field2": "number"\n}'
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md font-mono text-sm"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Define the structure of data to extract
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Output Format</label>
        <select
          value={outputFormat}
          onChange={(e) => {
            setOutputFormat(e.target.value);
            handleChange({ outputFormat: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md"
        >
          <option value="json">JSON</option>
          <option value="csv">CSV</option>
          <option value="xml">XML</option>
          <option value="yaml">YAML</option>
        </select>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="strictMode"
          checked={strictMode}
          onChange={(e) => {
            setStrictMode(e.target.checked);
            handleChange({ strictMode: e.target.checked });
          }}
          className="w-4 h-4"
        />
        <label htmlFor="strictMode" className="text-sm font-medium">
          Strict mode (fail if schema doesn't match)
        </label>
      </div>

      <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded text-sm mb-4 mt-6">
        <strong>⚙️ Extraction Settings</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Input Text</label>
        <textarea
          rows={4}
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            handleChange({ inputText: e.target.value });
          }}
          placeholder="Text to extract data from... Use {{ $json.text }} for dynamic input"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Custom Extraction Instructions (Optional)
        </label>
        <textarea
          rows={3}
          value={extractionPrompt}
          onChange={(e) => {
            setExtractionPrompt(e.target.value);
            handleChange({ extractionPrompt: e.target.value });
          }}
          placeholder="Additional instructions for extraction..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Temperature: {temperature}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={temperature}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            setTemperature(val);
            handleChange({ temperature: val });
          }}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>Precise (0)</span>
          <span>Creative (1)</span>
        </div>
      </div>

      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded text-sm">
        <strong>📝 Note:</strong> Extract structured data from unstructured text using AI. Define
        your schema and the AI will parse the input accordingly.
      </div>
    </div>
  );
};

export default AIDataExtractorConfig;
