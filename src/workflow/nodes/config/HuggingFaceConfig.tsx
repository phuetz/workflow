/**
 * Hugging Face Node Configuration
 * AGENT 17: Node Library Expansion
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface HuggingFaceConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

type HFOperation =
  | 'textGeneration'
  | 'textClassification'
  | 'translation'
  | 'summarization'
  | 'questionAnswering'
  | 'imageGeneration'
  | 'imageClassification'
  | 'objectDetection'
  | 'speechRecognition';

export const HuggingFaceConfig: React.FC<HuggingFaceConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<HFOperation>(
    (config.operation as HFOperation) || 'textGeneration'
  );
  const [model, setModel] = useState((config.model as string) || 'gpt2');
  const [inputText, setInputText] = useState((config.inputText as string) || '');
  const [maxLength, setMaxLength] = useState((config.maxLength as number) || 100);

  const handleChange = (updates: Partial<NodeConfig>) => {
    onChange({ ...config, ...updates });
  };

  const modelSuggestions: Record<string, string[]> = {
    textGeneration: ['gpt2', 'gpt2-large', 'EleutherAI/gpt-neo-2.7B', 'meta-llama/Llama-2-7b-hf'],
    textClassification: ['distilbert-base-uncased-finetuned-sst-2-english', 'bert-base-uncased'],
    translation: ['Helsinki-NLP/opus-mt-en-fr', 't5-base', 'facebook/m2m100_418M'],
    summarization: ['facebook/bart-large-cnn', 't5-base', 'google/pegasus-xsum'],
    questionAnswering: ['distilbert-base-cased-distilled-squad', 'deepset/roberta-base-squad2'],
  };

  return (
    <div className="huggingface-config space-y-4">
      <div className="font-semibold text-lg mb-4">Hugging Face Configuration</div>

      <div>
        <label className="block text-sm font-medium mb-2">Task</label>
        <select
          value={operation}
          onChange={(e) => {
            setOperation(e.target.value as HFOperation);
            handleChange({ operation: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="textGeneration">Text Generation</option>
          <option value="textClassification">Text Classification</option>
          <option value="translation">Translation</option>
          <option value="summarization">Summarization</option>
          <option value="questionAnswering">Question Answering</option>
          <option value="imageGeneration">Image Generation</option>
          <option value="imageClassification">Image Classification</option>
          <option value="objectDetection">Object Detection</option>
          <option value="speechRecognition">Speech Recognition</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Model ID</label>
        <input
          type="text"
          value={model}
          onChange={(e) => {
            setModel(e.target.value);
            handleChange({ model: e.target.value });
          }}
          placeholder="e.g., gpt2, facebook/bart-large-cnn"
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
        />
        {modelSuggestions[operation] && (
          <div className="mt-2">
            <p className="text-xs text-gray-600 mb-1">Popular models:</p>
            <div className="flex flex-wrap gap-2">
              {modelSuggestions[operation].map((modelId) => (
                <button
                  key={modelId}
                  onClick={() => {
                    setModel(modelId);
                    handleChange({ model: modelId });
                  }}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                >
                  {modelId.split('/').pop()}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Input Text</label>
        <textarea
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            handleChange({ inputText: e.target.value });
          }}
          placeholder="Enter your text or use {{ expressions }}"
          className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      {(operation === 'textGeneration' || operation === 'summarization') && (
        <div>
          <label className="block text-sm font-medium mb-2">Max Length</label>
          <input
            type="number"
            value={maxLength}
            onChange={(e) => {
              setMaxLength(parseInt(e.target.value));
              handleChange({ maxLength: parseInt(e.target.value) });
            }}
            min="10"
            max="1000"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm space-y-2">
        <div>
          <strong>API Token:</strong> Required in credentials
        </div>
        <div>
          Explore models:{' '}
          <a
            href="https://huggingface.co/models"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            huggingface.co/models
          </a>
        </div>
      </div>
    </div>
  );
};

export default HuggingFaceConfig;
