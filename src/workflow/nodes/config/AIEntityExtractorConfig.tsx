/**
 * AI Entity Extractor Node Configuration
 * Named Entity Recognition (NER) using AI models
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface AIEntityExtractorConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

interface EntityType {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

export const AIEntityExtractorConfig: React.FC<AIEntityExtractorConfigProps> = ({
  config,
  onChange,
}) => {
  const [provider, setProvider] = useState((config.provider as string) || 'openai');
  const [model, setModel] = useState((config.model as string) || 'gpt-4');
  const [inputText, setInputText] = useState((config.inputText as string) || '');
  const [confidence, setConfidence] = useState((config.confidence as number) || 0.7);
  const [includeContext, setIncludeContext] = useState((config.includeContext as boolean) ?? true);
  const [deduplication, setDeduplication] = useState((config.deduplication as boolean) ?? true);

  const defaultEntityTypes: EntityType[] = [
    { id: 'PERSON', label: 'Person', description: 'Names of people', enabled: true },
    { id: 'ORG', label: 'Organization', description: 'Companies, agencies, institutions', enabled: true },
    { id: 'GPE', label: 'Location', description: 'Countries, cities, states', enabled: true },
    { id: 'DATE', label: 'Date', description: 'Dates and time periods', enabled: true },
    { id: 'MONEY', label: 'Money', description: 'Monetary values', enabled: true },
    { id: 'EMAIL', label: 'Email', description: 'Email addresses', enabled: true },
    { id: 'PHONE', label: 'Phone', description: 'Phone numbers', enabled: true },
    { id: 'URL', label: 'URL', description: 'Web URLs', enabled: true },
    { id: 'PRODUCT', label: 'Product', description: 'Product names', enabled: false },
    { id: 'EVENT', label: 'Event', description: 'Named events', enabled: false },
    { id: 'LAW', label: 'Law', description: 'Legal references', enabled: false },
    { id: 'LANGUAGE', label: 'Language', description: 'Language names', enabled: false },
  ];

  const [entityTypes, setEntityTypes] = useState<EntityType[]>(
    (config.entityTypes as EntityType[]) || defaultEntityTypes
  );

  const handleChange = (updates: Partial<NodeConfig>) => {
    onChange({ ...config, ...updates });
  };

  const toggleEntityType = (id: string) => {
    const newTypes = entityTypes.map((type) =>
      type.id === id ? { ...type, enabled: !type.enabled } : type
    );
    setEntityTypes(newTypes);
    handleChange({ entityTypes: newTypes });
  };

  const modelsByProvider: Record<string, string[]> = {
    openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    anthropic: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229'],
    google: ['gemini-pro'],
    spacy: ['en_core_web_sm', 'en_core_web_md', 'en_core_web_lg'],
    huggingface: ['dbmdz/bert-large-cased-finetuned-conll03-english'],
  };

  return (
    <div className="ai-entity-extractor-config space-y-4 text-gray-900 dark:text-gray-100">
      <div className="font-semibold text-lg mb-4">Entity Extractor Configuration</div>

      <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded text-sm mb-4">
        <strong>🏷️ Named Entity Recognition</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">NER Provider</label>
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
          <option value="spacy">spaCy (Local)</option>
          <option value="huggingface">Hugging Face</option>
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
        <strong>🎯 Entity Types to Extract</strong>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {entityTypes.map((type) => (
          <div
            key={type.id}
            className="flex items-start gap-3 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <input
              type="checkbox"
              checked={type.enabled}
              onChange={() => toggleEntityType(type.id)}
              className="w-4 h-4 mt-1"
            />
            <div className="flex-1">
              <label className="text-sm font-medium cursor-pointer block">
                {type.label}
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">{type.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded text-sm mb-4 mt-6">
        <strong>⚙️ Extraction Settings</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Input Text</label>
        <textarea
          rows={5}
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            handleChange({ inputText: e.target.value });
          }}
          placeholder="Text to extract entities from... Use {{ $json.text }} for dynamic input"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Confidence Threshold: {confidence}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={confidence}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            setConfidence(val);
            handleChange({ confidence: val });
          }}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>Low (0)</span>
          <span>Medium (0.5)</span>
          <span>High (1)</span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Only return entities above this confidence score
        </p>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="includeContext"
          checked={includeContext}
          onChange={(e) => {
            setIncludeContext(e.target.checked);
            handleChange({ includeContext: e.target.checked });
          }}
          className="w-4 h-4"
        />
        <label htmlFor="includeContext" className="text-sm font-medium">
          Include surrounding context for each entity
        </label>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="deduplication"
          checked={deduplication}
          onChange={(e) => {
            setDeduplication(e.target.checked);
            handleChange({ deduplication: e.target.checked });
          }}
          className="w-4 h-4"
        />
        <label htmlFor="deduplication" className="text-sm font-medium">
          Remove duplicate entities
        </label>
      </div>

      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded text-sm space-y-2">
        <div>
          <strong>📝 Output Format:</strong>
        </div>
        <pre className="text-xs bg-white dark:bg-gray-800 p-2 rounded overflow-x-auto">
          {JSON.stringify(
            [
              {
                text: 'John Doe',
                type: 'PERSON',
                confidence: 0.95,
                position: { start: 0, end: 8 },
              },
            ],
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
};

export default AIEntityExtractorConfig;
