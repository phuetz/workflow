/**
 * Retry Configuration Panel
 * Configure retry logic for workflow nodes
 */

import React, { useState, useEffect } from 'react';
import { RefreshCw, Info, Settings, TrendingUp } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { RetryConfig, RetryManager } from '../../execution/RetryManager';

export const RetryConfigPanel: React.FC<{
  nodeId: string;
  initialConfig?: Partial<RetryConfig>;
  onChange?: (config: RetryConfig) => void;
}> = ({ nodeId, initialConfig, onChange }) => {
  const toast = useToast();
  const [config, setConfig] = useState<RetryConfig>({
    enabled: initialConfig?.enabled ?? false,
    maxAttempts: initialConfig?.maxAttempts ?? 3,
    strategy: initialConfig?.strategy ?? 'exponential',
    initialDelay: initialConfig?.initialDelay ?? 1000,
    maxDelay: initialConfig?.maxDelay ?? 30000,
    multiplier: initialConfig?.multiplier ?? 2,
    jitter: initialConfig?.jitter ?? true,
    retryOnErrors: initialConfig?.retryOnErrors,
    skipOnErrors: initialConfig?.skipOnErrors
  });

  const [estimatedTotalDelay, setEstimatedTotalDelay] = useState(0);
  const [delayPreview, setDelayPreview] = useState<number[]>([]);

  useEffect(() => {
    calculateDelayPreview();
  }, [config]);

  const calculateDelayPreview = () => {
    const delays: number[] = [];
    let totalDelay = 0;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      let delay: number;

      switch (config.strategy) {
        case 'fixed':
          delay = config.initialDelay;
          break;
        case 'linear':
          delay = config.initialDelay * attempt * (config.multiplier || 1);
          break;
        case 'exponential':
          delay = config.initialDelay * Math.pow(config.multiplier || 2, attempt - 1);
          break;
        case 'fibonacci':
          delay = config.initialDelay * getFibonacci(attempt);
          break;
        default:
          delay = config.initialDelay;
      }

      if (config.maxDelay !== undefined) {
        delay = Math.min(delay, config.maxDelay);
      }

      delays.push(delay);
      totalDelay += delay;
    }

    setDelayPreview(delays);
    setEstimatedTotalDelay(totalDelay);
  };

  const handleChange = (updates: Partial<RetryConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);

    if (onChange) {
      onChange(newConfig);
    }
  };

  const validateAndNotify = () => {
    const validation = RetryManager.validateConfig(config);
    if (!validation.valid) {
      toast.error('Validation errors: ' + validation.errors.join(', '));
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <RefreshCw className="w-5 h-5 text-blue-500" />
        <h3 className="text-lg font-semibold text-gray-900">Retry Configuration</h3>
      </div>

      <div className="space-y-6">
        {/* Enable Retry */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">Enable Retry</label>
            <p className="text-xs text-gray-500 mt-1">
              Automatically retry failed executions
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={e => handleChange({ enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
          </label>
        </div>

        {config.enabled && (
          <>
            {/* Max Attempts */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Retry Attempts
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={config.maxAttempts}
                onChange={e =>
                  handleChange({ maxAttempts: parseInt(e.target.value) || 1 })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Number of times to retry before giving up (1-10)
              </p>
            </div>

            {/* Retry Strategy */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Retry Strategy
              </label>
              <select
                value={config.strategy}
                onChange={e => handleChange({ strategy: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="fixed">Fixed Delay</option>
                <option value="linear">Linear Backoff</option>
                <option value="exponential">Exponential Backoff</option>
                <option value="fibonacci">Fibonacci Backoff</option>
                <option value="custom">Custom Function</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {RetryManager.getStrategyDescription(config.strategy)}
              </p>
            </div>

            {/* Initial Delay */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Initial Delay (ms)
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={config.initialDelay}
                onChange={e =>
                  handleChange({ initialDelay: parseInt(e.target.value) || 1000 })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Base delay before first retry
              </p>
            </div>

            {/* Max Delay */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Delay (ms)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={config.maxDelay || ''}
                onChange={e =>
                  handleChange({
                    maxDelay: e.target.value ? parseInt(e.target.value) : undefined
                  })
                }
                placeholder="No limit"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Cap the maximum delay between retries
              </p>
            </div>

            {/* Multiplier (for exponential/linear) */}
            {(config.strategy === 'exponential' || config.strategy === 'linear') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {config.strategy === 'exponential' ? 'Backoff Multiplier' : 'Linear Factor'}
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  value={config.multiplier || 2}
                  onChange={e =>
                    handleChange({ multiplier: parseFloat(e.target.value) || 2 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {config.strategy === 'exponential'
                    ? 'Exponential growth factor (e.g., 2 = double each time)'
                    : 'Linear increment factor'}
                </p>
              </div>
            )}

            {/* Jitter */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Add Jitter</label>
                <p className="text-xs text-gray-500 mt-1">
                  Add randomness to delays (±25%) to prevent thundering herd
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.jitter}
                onChange={e => handleChange({ jitter: e.target.checked })}
                className="rounded text-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Error Filters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Retry Only On These Errors
                <span className="text-gray-500 font-normal ml-2">(optional)</span>
              </label>
              <input
                type="text"
                value={config.retryOnErrors?.join(', ') || ''}
                onChange={e =>
                  handleChange({
                    retryOnErrors: e.target.value
                      ? e.target.value.split(',').map(s => s.trim())
                      : undefined
                  })
                }
                placeholder="e.g., TIMEOUT, ECONNREFUSED, 503"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Comma-separated list of error codes/messages to retry
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skip Retry On These Errors
                <span className="text-gray-500 font-normal ml-2">(optional)</span>
              </label>
              <input
                type="text"
                value={config.skipOnErrors?.join(', ') || ''}
                onChange={e =>
                  handleChange({
                    skipOnErrors: e.target.value
                      ? e.target.value.split(',').map(s => s.trim())
                      : undefined
                  })
                }
                placeholder="e.g., 401, 403, INVALID"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Comma-separated list of error codes/messages to never retry
              </p>
            </div>

            {/* Delay Preview */}
            <div className="bg-blue-50 rounded-lg p-4 mt-6">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <h4 className="font-semibold text-blue-900">Delay Preview</h4>
              </div>

              <div className="space-y-2">
                {delayPreview.map((delay, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <span className="text-blue-700 font-medium w-20">
                      Attempt {index + 1}:
                    </span>
                    <div className="flex-1 bg-blue-200 rounded-full h-4 relative overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full transition-all"
                        style={{
                          width: `${(delay / Math.max(...delayPreview)) * 100}%`
                        }}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-blue-900">
                        {formatDelay(delay)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t border-blue-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-700 font-medium">Total Retry Time:</span>
                  <span className="text-blue-900 font-semibold">
                    {formatDelay(estimatedTotalDelay)}
                  </span>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-gray-50 rounded-lg p-4 flex gap-3">
              <Info className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-900 mb-1">Retry Best Practices</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Use exponential backoff for external API calls</li>
                  <li>Enable jitter to prevent thundering herd problem</li>
                  <li>Set appropriate max delay to avoid excessive wait times</li>
                  <li>Skip retries for authentication/validation errors (4xx)</li>
                  <li>Retry only transient errors (timeouts, 5xx, network issues)</li>
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Helper Functions

function formatDelay(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function getFibonacci(n: number): number {
  if (n <= 1) return n === 0 ? 0 : 1;

  let a = 0,
    b = 1;
  for (let i = 2; i <= n; i++) {
    const temp = a + b;
    a = b;
    b = temp;
  }
  return b;
}
