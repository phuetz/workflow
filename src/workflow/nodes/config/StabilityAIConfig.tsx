/**
 * Stability AI Node Configuration
 * AGENT 17: Node Library Expansion
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface StabilityAIConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

type StabilityOperation = 'textToImage' | 'imageToImage' | 'upscale' | 'inpaint';

export const StabilityAIConfig: React.FC<StabilityAIConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<StabilityOperation>(
    (config.operation as StabilityOperation) || 'textToImage'
  );
  const [prompt, setPrompt] = useState((config.prompt as string) || '');
  const [negativePrompt, setNegativePrompt] = useState((config.negativePrompt as string) || '');
  const [model, setModel] = useState((config.model as string) || 'stable-diffusion-xl-1024-v1-0');
  const [width, setWidth] = useState((config.width as number) || 1024);
  const [height, setHeight] = useState((config.height as number) || 1024);
  const [steps, setSteps] = useState((config.steps as number) || 30);
  const [cfgScale, setCfgScale] = useState((config.cfgScale as number) || 7);

  const handleChange = (updates: Partial<NodeConfig>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="stability-ai-config space-y-4">
      <div className="font-semibold text-lg mb-4">Stability AI Configuration</div>

      <div>
        <label className="block text-sm font-medium mb-2">Operation</label>
        <select
          value={operation}
          onChange={(e) => {
            setOperation(e.target.value as StabilityOperation);
            handleChange({ operation: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="textToImage">Text to Image</option>
          <option value="imageToImage">Image to Image</option>
          <option value="upscale">Upscale Image</option>
          <option value="inpaint">Inpainting</option>
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
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="stable-diffusion-xl-1024-v1-0">SDXL 1.0</option>
          <option value="stable-diffusion-v1-6">SD 1.6</option>
          <option value="stable-diffusion-512-v2-1">SD 2.1</option>
        </select>
      </div>

      {(operation === 'textToImage' || operation === 'imageToImage') && (
        <>
          <div>
            <label className="block text-sm font-medium mb-2">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                handleChange({ prompt: e.target.value });
              }}
              placeholder="A beautiful landscape with mountains..."
              className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Negative Prompt (Optional)</label>
            <textarea
              value={negativePrompt}
              onChange={(e) => {
                setNegativePrompt(e.target.value);
                handleChange({ negativePrompt: e.target.value });
              }}
              placeholder="blurry, low quality..."
              className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-2">Width</label>
              <input
                type="number"
                value={width}
                onChange={(e) => {
                  setWidth(parseInt(e.target.value));
                  handleChange({ width: parseInt(e.target.value) });
                }}
                min="512"
                max="2048"
                step="64"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Height</label>
              <input
                type="number"
                value={height}
                onChange={(e) => {
                  setHeight(parseInt(e.target.value));
                  handleChange({ height: parseInt(e.target.value) });
                }}
                min="512"
                max="2048"
                step="64"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-2">Steps</label>
              <input
                type="number"
                value={steps}
                onChange={(e) => {
                  setSteps(parseInt(e.target.value));
                  handleChange({ steps: parseInt(e.target.value) });
                }}
                min="10"
                max="150"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">CFG Scale</label>
              <input
                type="number"
                value={cfgScale}
                onChange={(e) => {
                  setCfgScale(parseFloat(e.target.value));
                  handleChange({ cfgScale: parseFloat(e.target.value) });
                }}
                min="1"
                max="35"
                step="0.5"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </>
      )}

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
        <strong>API Key:</strong> Required in credentials. Get it from{' '}
        <a
          href="https://platform.stability.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          platform.stability.ai
        </a>
      </div>
    </div>
  );
};

export default StabilityAIConfig;
