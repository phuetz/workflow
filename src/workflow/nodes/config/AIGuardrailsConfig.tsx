import React from 'react';
import { WorkflowNode } from '../../../types/workflow';

interface AIGuardrailsConfigProps {
  node: WorkflowNode;
  onChange: (updates: Partial<WorkflowNode>) => void;
}

export const AIGuardrailsConfig: React.FC<AIGuardrailsConfigProps> = ({ node, onChange }) => {
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
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          AI Guardrails help ensure AI outputs are safe, appropriate, and comply with your policies.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Content Checks
        </label>
        <div className="space-y-2">
          {[
            { key: 'checkToxicity', label: 'Block toxic/harmful content' },
            { key: 'checkPII', label: 'Detect and mask PII (personal data)' },
            { key: 'checkProfanity', label: 'Filter profanity' },
            { key: 'checkBias', label: 'Detect potential bias' },
            { key: 'checkHallucination', label: 'Detect potential hallucinations' },
            { key: 'checkPromptInjection', label: 'Detect prompt injection attempts' }
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center">
              <input
                type="checkbox"
                id={key}
                checked={config[key] !== false}
                onChange={(e) => updateConfig(key, e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label htmlFor={key} className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                {label}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Toxicity Threshold
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={Number(config.toxicityThreshold) || 0.7}
          onChange={(e) => updateConfig('toxicityThreshold', parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Strict (0)</span>
          <span>{Number(config.toxicityThreshold) || 0.7}</span>
          <span>Permissive (1)</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Custom Blocked Terms
        </label>
        <textarea
          value={String(config.blockedTerms || '')}
          onChange={(e) => updateConfig('blockedTerms', e.target.value)}
          placeholder="term1, term2, term3"
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <p className="text-xs text-gray-500 mt-1">Comma-separated list of terms to block</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          On Violation
        </label>
        <select
          value={String(config.onViolation || 'block')}
          onChange={(e) => updateConfig('onViolation', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="block">Block (route to error output)</option>
          <option value="redact">Redact problematic content</option>
          <option value="warn">Warn (add flag but continue)</option>
          <option value="log">Log only (no action)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Max Output Length
        </label>
        <input
          type="number"
          value={Number(config.maxOutputLength) || 10000}
          onChange={(e) => updateConfig('maxOutputLength', parseInt(e.target.value))}
          min={100}
          max={100000}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <p className="text-xs text-gray-500 mt-1">Maximum characters in AI output</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Allowed Topics (Optional)
        </label>
        <textarea
          value={String(config.allowedTopics || '')}
          onChange={(e) => updateConfig('allowedTopics', e.target.value)}
          placeholder="customer support, product information, company policies"
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <p className="text-xs text-gray-500 mt-1">If set, AI must stay on-topic</p>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="logViolations"
          checked={config.logViolations !== false}
          onChange={(e) => updateConfig('logViolations', e.target.checked)}
          className="h-4 w-4 text-blue-600 rounded"
        />
        <label htmlFor="logViolations" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
          Log all violations for audit
        </label>
      </div>
    </div>
  );
};

export default AIGuardrailsConfig;
