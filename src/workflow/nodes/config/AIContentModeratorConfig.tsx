/**
 * AI Content Moderator Node Configuration
 * Automated content moderation and filtering
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface AIContentModeratorConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const AIContentModeratorConfig: React.FC<AIContentModeratorConfigProps> = ({
  config,
  onChange,
}) => {
  const [provider, setProvider] = useState((config.provider as string) || 'openai');
  const [moderationLevel, setModerationLevel] = useState(
    (config.moderationLevel as string) || 'medium'
  );
  const [categories, setCategories] = useState(
    (config.categories as string[]) || [
      'hate',
      'harassment',
      'sexual',
      'violence',
      'self-harm',
    ]
  );
  const [autoFlag, setAutoFlag] = useState((config.autoFlag as boolean) ?? true);
  const [autoReject, setAutoReject] = useState((config.autoReject as boolean) ?? false);
  const [customKeywords, setCustomKeywords] = useState((config.customKeywords as string) || '');
  const [flagThreshold, setFlagThreshold] = useState((config.flagThreshold as number) || 0.5);
  const [rejectThreshold, setRejectThreshold] = useState((config.rejectThreshold as number) || 0.8);

  const handleChange = (updates: Partial<NodeConfig>) => {
    onChange({ ...config, ...updates });
  };

  const allCategories = [
    { id: 'hate', label: 'Hate Speech', description: 'Content promoting hatred' },
    { id: 'harassment', label: 'Harassment', description: 'Bullying or harassment' },
    { id: 'sexual', label: 'Sexual Content', description: 'Adult or sexual content' },
    { id: 'violence', label: 'Violence', description: 'Violent or graphic content' },
    { id: 'self-harm', label: 'Self-Harm', description: 'Self-harm or suicide related' },
    { id: 'spam', label: 'Spam', description: 'Spam or promotional content' },
    { id: 'profanity', label: 'Profanity', description: 'Offensive language' },
    { id: 'pii', label: 'PII Exposure', description: 'Personal information exposure' },
  ];

  const toggleCategory = (categoryId: string) => {
    const newCategories = categories.includes(categoryId)
      ? categories.filter((c) => c !== categoryId)
      : [...categories, categoryId];
    setCategories(newCategories);
    handleChange({ categories: newCategories });
  };

  return (
    <div className="ai-content-moderator-config space-y-4 text-gray-900 dark:text-gray-100">
      <div className="font-semibold text-lg mb-4">Content Moderator Configuration</div>

      <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded text-sm mb-4">
        <strong>🛡️ Content Moderation</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Moderation Provider</label>
        <select
          value={provider}
          onChange={(e) => {
            setProvider(e.target.value);
            handleChange({ provider: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md"
        >
          <option value="openai">OpenAI Moderation</option>
          <option value="perspective">Google Perspective API</option>
          <option value="azure">Azure Content Safety</option>
          <option value="aws">AWS Rekognition</option>
          <option value="custom">Custom ML Model</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Moderation Level</label>
        <select
          value={moderationLevel}
          onChange={(e) => {
            setModerationLevel(e.target.value);
            handleChange({ moderationLevel: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md"
        >
          <option value="low">Low - Permissive</option>
          <option value="medium">Medium - Balanced</option>
          <option value="high">High - Strict</option>
          <option value="custom">Custom - Fine-tuned</option>
        </select>
      </div>

      <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded text-sm mb-4 mt-6">
        <strong>📋 Categories to Monitor</strong>
      </div>

      <div className="space-y-2">
        {allCategories.map((category) => (
          <div
            key={category.id}
            className="flex items-start gap-3 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <input
              type="checkbox"
              checked={categories.includes(category.id)}
              onChange={() => toggleCategory(category.id)}
              className="w-4 h-4 mt-1"
            />
            <div className="flex-1">
              <label className="text-sm font-medium cursor-pointer block">
                {category.label}
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {category.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded text-sm mb-4 mt-6">
        <strong>⚙️ Actions & Thresholds</strong>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="autoFlag"
          checked={autoFlag}
          onChange={(e) => {
            setAutoFlag(e.target.checked);
            handleChange({ autoFlag: e.target.checked });
          }}
          className="w-4 h-4"
        />
        <label htmlFor="autoFlag" className="text-sm font-medium">
          Auto-flag suspicious content for review
        </label>
      </div>

      {autoFlag && (
        <div>
          <label className="block text-sm font-medium mb-2">
            Flag Threshold: {flagThreshold}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={flagThreshold}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setFlagThreshold(val);
              handleChange({ flagThreshold: val });
            }}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>Lenient (0)</span>
            <span>Strict (1)</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="autoReject"
          checked={autoReject}
          onChange={(e) => {
            setAutoReject(e.target.checked);
            handleChange({ autoReject: e.target.checked });
          }}
          className="w-4 h-4"
        />
        <label htmlFor="autoReject" className="text-sm font-medium">
          Auto-reject violating content
        </label>
      </div>

      {autoReject && (
        <div>
          <label className="block text-sm font-medium mb-2">
            Reject Threshold: {rejectThreshold}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={rejectThreshold}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setRejectThreshold(val);
              handleChange({ rejectThreshold: val });
            }}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>Lenient (0)</span>
            <span>Strict (1)</span>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-2">
          Custom Keywords to Block (comma-separated)
        </label>
        <textarea
          rows={3}
          value={customKeywords}
          onChange={(e) => {
            setCustomKeywords(e.target.value);
            handleChange({ customKeywords: e.target.value });
          }}
          placeholder="keyword1, keyword2, phrase to block"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md"
        />
      </div>

      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded text-sm">
        <strong>📝 Note:</strong> Automatically moderate content using AI. Flagged content can be
        reviewed or auto-rejected based on thresholds.
      </div>
    </div>
  );
};

export default AIContentModeratorConfig;
