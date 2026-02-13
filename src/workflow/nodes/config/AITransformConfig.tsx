import React from 'react';
import { WorkflowNode } from '../../../types/workflow';

interface AITransformConfigProps {
  node: WorkflowNode;
  onChange: (updates: Partial<WorkflowNode>) => void;
}

export const AITransformConfig: React.FC<AITransformConfigProps> = ({ node, onChange }) => {
  const config = (node.data?.config || {}) as Record<string, string | number | boolean>;

  const updateConfig = (key: string, value: string | number | boolean) => {
    onChange({
      data: {
        ...node.data,
        config: { ...config, [key]: value }
      }
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          AI Provider
        </label>
        <select
          value={String(config.provider || 'openai')}
          onChange={(e) => updateConfig('provider', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="openai">OpenAI (GPT-4)</option>
          <option value="anthropic">Anthropic (Claude)</option>
          <option value="google">Google (Gemini)</option>
          <option value="groq">Groq (Fast Inference)</option>
          <option value="ollama">Ollama (Local)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Transformation Type
        </label>
        <select
          value={String(config.transformationType || 'extract')}
          onChange={(e) => updateConfig('transformationType', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="extract">Extract Data</option>
          <option value="format">Format/Restructure</option>
          <option value="categorize">Categorize</option>
          <option value="summarize">Summarize</option>
          <option value="enrich">Enrich with Context</option>
          <option value="translate">Translate</option>
          <option value="custom">Custom Prompt</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Input Field
        </label>
        <input
          type="text"
          value={String(config.inputField || '{{ $json }}')}
          onChange={(e) => updateConfig('inputField', e.target.value)}
          placeholder="{{ $json.text }}"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <p className="text-xs text-gray-500 mt-1">Use expressions to specify input data</p>
      </div>

      {config.transformationType === 'extract' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Fields to Extract
          </label>
          <textarea
            value={String(config.extractFields || '')}
            onChange={(e) => updateConfig('extractFields', e.target.value)}
            placeholder="name, email, phone, company"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <p className="text-xs text-gray-500 mt-1">Comma-separated list of fields to extract</p>
        </div>
      )}

      {config.transformationType === 'categorize' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Categories
          </label>
          <textarea
            value={String(config.categories || '')}
            onChange={(e) => updateConfig('categories', e.target.value)}
            placeholder="positive, negative, neutral"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <p className="text-xs text-gray-500 mt-1">Comma-separated list of categories</p>
        </div>
      )}

      {config.transformationType === 'translate' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Target Language
          </label>
          <select
            value={String(config.targetLanguage || 'en')}
            onChange={(e) => updateConfig('targetLanguage', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="en">English</option>
            <option value="fr">French</option>
            <option value="es">Spanish</option>
            <option value="de">German</option>
            <option value="it">Italian</option>
            <option value="pt">Portuguese</option>
            <option value="zh">Chinese</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
            <option value="ar">Arabic</option>
          </select>
        </div>
      )}

      {config.transformationType === 'custom' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Custom Prompt
          </label>
          <textarea
            value={String(config.customPrompt || '')}
            onChange={(e) => updateConfig('customPrompt', e.target.value)}
            placeholder="Transform the input data by..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Output Format
        </label>
        <select
          value={String(config.outputFormat || 'json')}
          onChange={(e) => updateConfig('outputFormat', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="json">JSON Object</option>
          <option value="text">Plain Text</option>
          <option value="array">Array</option>
          <option value="markdown">Markdown</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Temperature
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={Number(config.temperature) || 0.3}
          onChange={(e) => updateConfig('temperature', parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Precise (0)</span>
          <span>{Number(config.temperature) || 0.3}</span>
          <span>Creative (1)</span>
        </div>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="includeReasoning"
          checked={Boolean(config.includeReasoning)}
          onChange={(e) => updateConfig('includeReasoning', e.target.checked)}
          className="h-4 w-4 text-blue-600 rounded"
        />
        <label htmlFor="includeReasoning" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
          Include AI reasoning in output
        </label>
      </div>
    </div>
  );
};

export default AITransformConfig;
