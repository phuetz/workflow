/**
 * AI Text Classifier Node Configuration
 * Classify text into custom categories using AI
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface AITextClassifierConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

interface Category {
  id: string;
  name: string;
  description: string;
}

export const AITextClassifierConfig: React.FC<AITextClassifierConfigProps> = ({
  config,
  onChange,
}) => {
  const [provider, setProvider] = useState((config.provider as string) || 'openai');
  const [model, setModel] = useState((config.model as string) || 'gpt-4');
  const [inputText, setInputText] = useState((config.inputText as string) || '');
  const [temperature, setTemperature] = useState((config.temperature as number) || 0.3);
  const [multiLabel, setMultiLabel] = useState((config.multiLabel as boolean) ?? false);
  const [includeConfidence, setIncludeConfidence] = useState(
    (config.includeConfidence as boolean) ?? true
  );
  const [confidenceThreshold, setConfidenceThreshold] = useState(
    (config.confidenceThreshold as number) || 0.5
  );

  const defaultCategories: Category[] = [
    { id: 'support', name: 'Support Request', description: 'Customer support inquiries' },
    { id: 'sales', name: 'Sales', description: 'Sales and pricing questions' },
    { id: 'feedback', name: 'Feedback', description: 'Product feedback or suggestions' },
    { id: 'complaint', name: 'Complaint', description: 'Customer complaints' },
  ];

  const [categories, setCategories] = useState<Category[]>(
    (config.categories as Category[]) || defaultCategories
  );
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');

  const handleChange = (updates: Partial<NodeConfig>) => {
    onChange({ ...config, ...updates });
  };

  const addCategory = () => {
    if (newCategoryName.trim()) {
      const newCategory: Category = {
        id: newCategoryName.toLowerCase().replace(/\s+/g, '-'),
        name: newCategoryName,
        description: newCategoryDesc || '',
      };
      const newCategories = [...categories, newCategory];
      setCategories(newCategories);
      handleChange({ categories: newCategories });
      setNewCategoryName('');
      setNewCategoryDesc('');
    }
  };

  const removeCategory = (id: string) => {
    const newCategories = categories.filter((cat) => cat.id !== id);
    setCategories(newCategories);
    handleChange({ categories: newCategories });
  };

  const modelsByProvider: Record<string, string[]> = {
    openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    anthropic: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
    google: ['gemini-pro'],
    huggingface: ['facebook/bart-large-mnli', 'distilbert-base-uncased'],
  };

  const loadTemplate = (templateType: string) => {
    const templates: Record<string, Category[]> = {
      support: [
        { id: 'technical', name: 'Technical Issue', description: 'Technical problems' },
        { id: 'billing', name: 'Billing', description: 'Billing and payments' },
        { id: 'account', name: 'Account', description: 'Account management' },
        { id: 'general', name: 'General', description: 'General inquiries' },
      ],
      content: [
        { id: 'news', name: 'News', description: 'News articles' },
        { id: 'blog', name: 'Blog', description: 'Blog posts' },
        { id: 'documentation', name: 'Documentation', description: 'Technical docs' },
        { id: 'marketing', name: 'Marketing', description: 'Marketing content' },
      ],
      sentiment: [
        { id: 'positive', name: 'Positive', description: 'Positive sentiment' },
        { id: 'negative', name: 'Negative', description: 'Negative sentiment' },
        { id: 'neutral', name: 'Neutral', description: 'Neutral sentiment' },
      ],
    };

    if (templates[templateType]) {
      setCategories(templates[templateType]);
      handleChange({ categories: templates[templateType] });
    }
  };

  return (
    <div className="ai-text-classifier-config space-y-4 text-gray-900 dark:text-gray-100">
      <div className="font-semibold text-lg mb-4">Text Classifier Configuration</div>

      <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded text-sm mb-4">
        <strong>🎯 Custom Text Classification</strong>
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
        <strong>📋 Classification Categories</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Load Template</label>
        <div className="flex gap-2">
          <button
            onClick={() => loadTemplate('support')}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-sm"
          >
            Support Tickets
          </button>
          <button
            onClick={() => loadTemplate('content')}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-sm"
          >
            Content Type
          </button>
          <button
            onClick={() => loadTemplate('sentiment')}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-sm"
          >
            Sentiment
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {categories.map((category) => (
          <div
            key={category.id}
            className="flex items-start gap-2 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800/50"
          >
            <div className="flex-1">
              <div className="font-medium text-sm">{category.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {category.description}
              </div>
            </div>
            <button
              onClick={() => removeCategory(category.id)}
              className="px-2 py-1 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded text-xs"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-md p-3">
        <div className="text-sm font-medium mb-2">Add New Category</div>
        <input
          type="text"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="Category name"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md mb-2"
        />
        <input
          type="text"
          value={newCategoryDesc}
          onChange={(e) => setNewCategoryDesc(e.target.value)}
          placeholder="Description (optional)"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md mb-2"
        />
        <button
          onClick={addCategory}
          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm"
        >
          Add Category
        </button>
      </div>

      <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded text-sm mb-4 mt-6">
        <strong>⚙️ Classification Settings</strong>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="multiLabel"
          checked={multiLabel}
          onChange={(e) => {
            setMultiLabel(e.target.checked);
            handleChange({ multiLabel: e.target.checked });
          }}
          className="w-4 h-4"
        />
        <label htmlFor="multiLabel" className="text-sm font-medium">
          Multi-label classification (assign multiple categories)
        </label>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="includeConfidence"
          checked={includeConfidence}
          onChange={(e) => {
            setIncludeConfidence(e.target.checked);
            handleChange({ includeConfidence: e.target.checked });
          }}
          className="w-4 h-4"
        />
        <label htmlFor="includeConfidence" className="text-sm font-medium">
          Include confidence scores
        </label>
      </div>

      {includeConfidence && (
        <div>
          <label className="block text-sm font-medium mb-2">
            Confidence Threshold: {confidenceThreshold}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={confidenceThreshold}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setConfidenceThreshold(val);
              handleChange({ confidenceThreshold: val });
            }}
            className="w-full"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Minimum confidence to assign a category
          </p>
        </div>
      )}

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

      <div>
        <label className="block text-sm font-medium mb-2">Input Text</label>
        <textarea
          rows={5}
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            handleChange({ inputText: e.target.value });
          }}
          placeholder="Text to classify... Use {{ $json.text }} for dynamic input"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md"
        />
      </div>

      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded text-sm">
        <strong>📝 Note:</strong> Classify text into custom categories using AI. Define your
        categories above and the AI will classify input text accordingly.
      </div>
    </div>
  );
};

export default AITextClassifierConfig;
