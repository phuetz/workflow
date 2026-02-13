/**
 * Replicate Node Configuration
 * Comprehensive configuration for Replicate AI API
 */

import React, { useState, useEffect } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface ReplicateNodeConfig extends NodeConfig {
  operation?: string;
  modelVersion?: string;
  inputs?: string;
  apiToken?: string;
  predictionId?: string;
  webhookUrl?: string;
  waitForCompletion?: boolean;
  timeout?: number;
  pollInterval?: number;
}

interface ReplicateConfigProps {
  config: ReplicateNodeConfig;
  onChange: (config: NodeConfig) => void;
}

const REPLICATE_OPERATIONS = [
  { value: 'run', label: 'Run Prediction (sync)' },
  { value: 'create', label: 'Create Prediction (async)' },
  { value: 'get', label: 'Get Prediction Status' },
  { value: 'cancel', label: 'Cancel Prediction' },
  { value: 'listModels', label: 'List Models' },
  { value: 'getModel', label: 'Get Model Details' },
  { value: 'listVersions', label: 'List Model Versions' },
  { value: 'createTraining', label: 'Create Training' },
  { value: 'getTraining', label: 'Get Training Status' },
];

const POPULAR_MODELS = [
  { name: 'Stable Diffusion XL', version: 'stability-ai/sdxl', category: 'Image Generation' },
  { name: 'SDXL Lightning', version: 'bytedance/sdxl-lightning-4step', category: 'Image Generation' },
  { name: 'Stable Diffusion', version: 'stability-ai/stable-diffusion', category: 'Image Generation' },
  { name: 'LLaMA 2 70B Chat', version: 'meta/llama-2-70b-chat', category: 'Text' },
  { name: 'LLaMA 2 13B Chat', version: 'meta/llama-2-13b-chat', category: 'Text' },
  { name: 'Whisper', version: 'openai/whisper', category: 'Audio' },
  { name: 'BLIP', version: 'salesforce/blip', category: 'Vision' },
  { name: 'RemBG', version: 'cjwbw/rembg', category: 'Image Processing' },
  { name: 'GFPGAN', version: 'tencentarc/gfpgan', category: 'Face Restoration' },
  { name: 'Real-ESRGAN', version: 'xinntao/realesrgan', category: 'Upscaling' },
];

export const ReplicateConfig: React.FC<ReplicateConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation || 'run');
  const [modelVersion, setModelVersion] = useState(config.modelVersion || '');
  const [inputs, setInputs] = useState(config.inputs || '{\n  "prompt": ""\n}');
  const [apiToken, setApiToken] = useState(config.apiToken || '');
  const [predictionId, setPredictionId] = useState(config.predictionId || '');
  const [webhookUrl, setWebhookUrl] = useState(config.webhookUrl || '');
  const [waitForCompletion, setWaitForCompletion] = useState(config.waitForCompletion !== false);
  const [timeout, setTimeout] = useState(config.timeout || 300);
  const [pollInterval, setPollInterval] = useState(config.pollInterval || 5);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const handleChange = (updates: Partial<NodeConfig>) => {
    onChange({ ...config, ...updates });
  };

  useEffect(() => {
    // Sync local state with config changes
    handleChange({
      operation,
      modelVersion,
      inputs,
      apiToken,
      predictionId,
      webhookUrl,
      waitForCompletion,
      timeout,
      pollInterval,
    });
  }, [operation, modelVersion, inputs, apiToken, predictionId, webhookUrl, waitForCompletion, timeout, pollInterval]);

  const categories = ['all', ...Array.from(new Set(POPULAR_MODELS.map(m => m.category)))];
  const filteredModels = selectedCategory === 'all'
    ? POPULAR_MODELS
    : POPULAR_MODELS.filter(m => m.category === selectedCategory);

  const inputClass = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-sm bg-white dark:bg-gray-700";
  const labelClass = "block text-sm font-medium mb-2";
  const sectionClass = "space-y-4 mb-6";

  return (
    <div className="replicate-config p-4 max-w-md">
      <div className="font-semibold text-lg mb-4">Replicate AI Configuration</div>

      {/* API Token */}
      <div className={sectionClass}>
        <label className={labelClass}>API Token</label>
        <input
          type="password"
          value={apiToken}
          onChange={(e) => setApiToken(e.target.value)}
          placeholder="r8_xxxxxxxxxxxxxxxxxxxx"
          className={inputClass}
        />
        <p className="text-xs text-gray-500 mt-1">
          Get your token from{' '}
          <a
            href="https://replicate.com/account/api-tokens"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            replicate.com/account/api-tokens
          </a>
        </p>
      </div>

      {/* Operation */}
      <div className={sectionClass}>
        <label className={labelClass}>Operation</label>
        <select
          value={operation}
          onChange={(e) => setOperation(e.target.value)}
          className={inputClass}
        >
          {REPLICATE_OPERATIONS.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>
      </div>

      {/* Model Selection for run/create operations */}
      {['run', 'create', 'getModel', 'listVersions'].includes(operation) && (
        <div className={sectionClass}>
          <label className={labelClass}>Model Version</label>
          <input
            type="text"
            value={modelVersion}
            onChange={(e) => setModelVersion(e.target.value)}
            placeholder="owner/model-name:version"
            className={inputClass}
          />
          <p className="text-xs text-gray-500 mt-1">
            Format: owner/model-name or owner/model-name:version
          </p>

          {/* Category Filter */}
          <div className="mt-3">
            <label className="block text-sm font-medium mb-2">Filter by Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={inputClass}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Popular Models */}
          <div className="mt-3">
            <label className="block text-sm font-medium mb-2">Popular Models</label>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
              {filteredModels.map((model) => (
                <button
                  key={model.version}
                  onClick={() => setModelVersion(model.version)}
                  className={`px-3 py-2 rounded text-sm text-left transition-colors ${
                    modelVersion === model.version
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="font-medium">{model.name}</div>
                  <div className="text-xs opacity-75">{model.version}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Prediction ID for get/cancel operations */}
      {['get', 'cancel', 'getTraining'].includes(operation) && (
        <div className={sectionClass}>
          <label className={labelClass}>Prediction/Training ID</label>
          <input
            type="text"
            value={predictionId}
            onChange={(e) => setPredictionId(e.target.value)}
            placeholder="Use {{ $json.id }} for dynamic reference"
            className={inputClass}
          />
        </div>
      )}

      {/* Input Parameters for run/create operations */}
      {['run', 'create', 'createTraining'].includes(operation) && (
        <div className={sectionClass}>
          <label className={labelClass}>Input Parameters (JSON)</label>
          <textarea
            value={inputs}
            onChange={(e) => setInputs(e.target.value)}
            placeholder={'{\n  "prompt": "A beautiful sunset over mountains",\n  "width": 512,\n  "height": 512\n}'}
            className={`${inputClass} h-40 resize-y`}
          />
          <p className="text-xs text-gray-500 mt-1">
            Model-specific input parameters. Use {'{{ $json.field }}'} for dynamic values.
          </p>
        </div>
      )}

      {/* Webhook URL */}
      {['run', 'create', 'createTraining'].includes(operation) && (
        <div className={sectionClass}>
          <label className={labelClass}>Webhook URL (optional)</label>
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://your-server.com/webhook"
            className={inputClass}
          />
          <p className="text-xs text-gray-500 mt-1">
            Receive updates when prediction completes
          </p>
        </div>
      )}

      {/* Wait options for run operation */}
      {operation === 'run' && (
        <div className={sectionClass}>
          <div className="flex items-center mb-3">
            <input
              type="checkbox"
              id="waitForCompletion"
              checked={waitForCompletion}
              onChange={(e) => setWaitForCompletion(e.target.checked)}
              className="mr-2 h-4 w-4"
            />
            <label htmlFor="waitForCompletion" className="text-sm">
              Wait for prediction to complete
            </label>
          </div>

          {waitForCompletion && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Timeout (seconds)</label>
                <input
                  type="number"
                  value={timeout}
                  onChange={(e) => setTimeout(parseInt(e.target.value) || 300)}
                  min={10}
                  max={3600}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Poll Interval (s)</label>
                <input
                  type="number"
                  value={pollInterval}
                  onChange={(e) => setPollInterval(parseInt(e.target.value) || 5)}
                  min={1}
                  max={60}
                  className={inputClass}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Help Info */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm space-y-2">
        <div className="font-medium">Tips:</div>
        <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300">
          <li>Use expressions like {'{{ $json.prompt }}'} for dynamic inputs</li>
          <li>Find more models at{' '}
            <a
              href="https://replicate.com/explore"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 underline"
            >
              replicate.com/explore
            </a>
          </li>
          <li>Async predictions are faster but require polling</li>
        </ul>
      </div>
    </div>
  );
};

export default ReplicateConfig;
