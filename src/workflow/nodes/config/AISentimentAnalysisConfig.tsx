/**
 * AI Sentiment Analysis Node Configuration
 * Analyze sentiment and emotions in text using AI
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface AISentimentAnalysisConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const AISentimentAnalysisConfig: React.FC<AISentimentAnalysisConfigProps> = ({
  config,
  onChange,
}) => {
  const [provider, setProvider] = useState((config.provider as string) || 'openai');
  const [model, setModel] = useState((config.model as string) || 'gpt-4');
  const [inputText, setInputText] = useState((config.inputText as string) || '');
  const [analysisType, setAnalysisType] = useState((config.analysisType as string) || 'sentiment');
  const [granularity, setGranularity] = useState((config.granularity as string) || 'document');
  const [includeScore, setIncludeScore] = useState((config.includeScore as boolean) ?? true);
  const [includeEmotions, setIncludeEmotions] = useState((config.includeEmotions as boolean) ?? false);
  const [includeAspects, setIncludeAspects] = useState((config.includeAspects as boolean) ?? false);
  const [language, setLanguage] = useState((config.language as string) || 'en');

  const handleChange = (updates: Partial<NodeConfig>) => {
    onChange({ ...config, ...updates });
  };

  const modelsByProvider: Record<string, string[]> = {
    openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    anthropic: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229'],
    google: ['gemini-pro'],
    huggingface: ['distilbert-base-uncased-finetuned-sst-2-english', 'cardiffnlp/twitter-roberta-base-sentiment'],
    aws: ['comprehend-standard'],
    azure: ['text-analytics-v3'],
  };

  return (
    <div className="ai-sentiment-analysis-config space-y-4 text-gray-900 dark:text-gray-100">
      <div className="font-semibold text-lg mb-4">Sentiment Analysis Configuration</div>

      <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded text-sm mb-4">
        <strong>💭 Sentiment & Emotion Analysis</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Analysis Provider</label>
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
          <option value="aws">AWS Comprehend</option>
          <option value="azure">Azure Text Analytics</option>
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

      <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded text-sm mb-4 mt-6">
        <strong>⚙️ Analysis Settings</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Analysis Type</label>
        <select
          value={analysisType}
          onChange={(e) => {
            setAnalysisType(e.target.value);
            handleChange({ analysisType: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md"
        >
          <option value="sentiment">Sentiment Only (Positive/Negative/Neutral)</option>
          <option value="emotion">Emotion Detection (Joy, Anger, Sadness, etc.)</option>
          <option value="both">Both Sentiment & Emotion</option>
          <option value="advanced">Advanced (Sentiment + Emotion + Aspects)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Analysis Granularity</label>
        <select
          value={granularity}
          onChange={(e) => {
            setGranularity(e.target.value);
            handleChange({ granularity: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md"
        >
          <option value="document">Document Level (Overall)</option>
          <option value="sentence">Sentence Level</option>
          <option value="aspect">Aspect Level (Product features, etc.)</option>
        </select>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Analyze at document, sentence, or aspect level
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Language</label>
        <select
          value={language}
          onChange={(e) => {
            setLanguage(e.target.value);
            handleChange({ language: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md"
        >
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
          <option value="it">Italian</option>
          <option value="pt">Portuguese</option>
          <option value="auto">Auto-detect</option>
        </select>
      </div>

      <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded text-sm mb-4 mt-6">
        <strong>📊 Output Options</strong>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="includeScore"
          checked={includeScore}
          onChange={(e) => {
            setIncludeScore(e.target.checked);
            handleChange({ includeScore: e.target.checked });
          }}
          className="w-4 h-4"
        />
        <label htmlFor="includeScore" className="text-sm font-medium">
          Include confidence scores
        </label>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="includeEmotions"
          checked={includeEmotions}
          onChange={(e) => {
            setIncludeEmotions(e.target.checked);
            handleChange({ includeEmotions: e.target.checked });
          }}
          className="w-4 h-4"
        />
        <label htmlFor="includeEmotions" className="text-sm font-medium">
          Detect specific emotions (joy, anger, sadness, fear, surprise)
        </label>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="includeAspects"
          checked={includeAspects}
          onChange={(e) => {
            setIncludeAspects(e.target.checked);
            handleChange({ includeAspects: e.target.checked });
          }}
          className="w-4 h-4"
        />
        <label htmlFor="includeAspects" className="text-sm font-medium">
          Aspect-based sentiment (sentiment about specific features/topics)
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Input Text</label>
        <textarea
          rows={6}
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            handleChange({ inputText: e.target.value });
          }}
          placeholder="Text to analyze... Use {{ $json.text }} for dynamic input"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md"
        />
      </div>

      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded text-sm space-y-2">
        <div>
          <strong>📝 Example Output:</strong>
        </div>
        <pre className="text-xs bg-white dark:bg-gray-800 p-2 rounded overflow-x-auto">
          {JSON.stringify(
            {
              sentiment: 'positive',
              score: 0.87,
              emotions: {
                joy: 0.75,
                surprise: 0.12,
              },
              confidence: 0.92,
            },
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
};

export default AISentimentAnalysisConfig;
