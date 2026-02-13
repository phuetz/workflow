/**
 * Webhook Configuration UI Component
 * Complete webhook configuration interface
 */

import React, { useState, useEffect } from 'react';
import {
  Globe,
  Lock,
  Activity,
  Settings,
  BarChart,
  Shield,
  Zap,
  Copy,
  Play,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface WebhookConfigProps {
  webhookId?: string;
  workflowId: string;
  onSave?: (config: WebhookConfiguration) => void;
  onClose?: () => void;
}

interface WebhookConfiguration {
  mode: 'test' | 'production';
  name?: string;
  description?: string;
  authentication?: AuthConfiguration;
  rateLimit?: RateLimitConfiguration;
  response?: ResponseConfiguration;
  cors?: CORSConfiguration;
  compression?: CompressionConfiguration;
  analytics?: AnalyticsConfiguration;
}

interface AuthConfiguration {
  method: 'none' | 'basic' | 'header' | 'query' | 'jwt' | 'hmac' | 'oauth2';
  config: any;
}

interface RateLimitConfiguration {
  webhookLimits?: {
    requests: number;
    window: 'second' | 'minute' | 'hour' | 'day';
  };
  ipLimits?: {
    requests: number;
    window: 'second' | 'minute' | 'hour' | 'day';
  };
}

interface ResponseConfiguration {
  mode: 'lastNode' | 'allNodes' | 'custom' | 'file' | 'redirect';
  statusCode?: number;
  headers?: Record<string, string>;
  body?: any;
}

interface CORSConfiguration {
  enabled: boolean;
  origins?: string[];
  methods?: string[];
  credentials?: boolean;
}

interface CompressionConfiguration {
  enabled: boolean;
  threshold?: number;
}

interface AnalyticsConfiguration {
  enabled: boolean;
  trackHeaders?: boolean;
  trackBody?: boolean;
  trackIP?: boolean;
}

export default function WebhookConfig({ webhookId, workflowId, onSave, onClose }: WebhookConfigProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'auth' | 'limits' | 'response' | 'analytics'>('general');
  const [config, setConfig] = useState<WebhookConfiguration>({
    mode: 'test',
    analytics: { enabled: true, trackHeaders: true, trackBody: true, trackIP: true }
  });
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const updateConfig = (updates: Partial<WebhookConfiguration>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave?.(config);
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Globe className="text-blue-500" size={24} />
            <div>
              <h2 className="text-xl font-bold dark:text-white">
                {webhookId ? 'Edit Webhook' : 'Create Webhook'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Configure webhook settings and authentication
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ×
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex space-x-1">
          {[
            { id: 'general', label: 'General', icon: Settings },
            { id: 'auth', label: 'Authentication', icon: Lock },
            { id: 'limits', label: 'Rate Limits', icon: Zap },
            { id: 'response', label: 'Response', icon: Activity },
            { id: 'analytics', label: 'Analytics', icon: BarChart }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <tab.icon size={16} />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'general' && (
          <GeneralTab config={config} updateConfig={updateConfig} />
        )}

        {activeTab === 'auth' && (
          <AuthenticationTab
            config={config.authentication}
            updateConfig={(auth) => updateConfig({ authentication: auth })}
          />
        )}

        {activeTab === 'limits' && (
          <RateLimitsTab
            config={config.rateLimit}
            updateConfig={(limits) => updateConfig({ rateLimit: limits })}
          />
        )}

        {activeTab === 'response' && (
          <ResponseTab
            config={config.response}
            updateConfig={(response) => updateConfig({ response })}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab
            config={config.analytics}
            updateConfig={(analytics) => updateConfig({ analytics })}
          />
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {config.mode === 'test' && (
            <span className="flex items-center space-x-1 text-orange-500 text-sm">
              <Clock size={14} />
              <span>Test webhook (expires in 24h)</span>
            </span>
          )}
          {config.mode === 'production' && (
            <span className="flex items-center space-x-1 text-green-500 text-sm">
              <CheckCircle size={14} />
              <span>Production webhook</span>
            </span>
          )}
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Webhook</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// General Tab Component
function GeneralTab({ config, updateConfig }: any) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2 dark:text-white">Webhook Mode</label>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => updateConfig({ mode: 'test' })}
            className={`p-4 border-2 rounded-lg transition-all ${
              config.mode === 'test'
                ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          >
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="text-orange-500" size={20} />
              <span className="font-medium dark:text-white">Test Webhook</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Temporary URL for testing (expires in 24 hours)
            </p>
          </button>
          <button
            onClick={() => updateConfig({ mode: 'production' })}
            className={`p-4 border-2 rounded-lg transition-all ${
              config.mode === 'production'
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          >
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="text-green-500" size={20} />
              <span className="font-medium dark:text-white">Production Webhook</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Permanent URL for production use
            </p>
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 dark:text-white">Name (Optional)</label>
        <input
          type="text"
          value={config.name || ''}
          onChange={(e) => updateConfig({ name: e.target.value })}
          placeholder="My Webhook"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 dark:text-white">Description (Optional)</label>
        <textarea
          value={config.description || ''}
          onChange={(e) => updateConfig({ description: e.target.value })}
          placeholder="Describe what this webhook does..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Quick Start</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
          <li>Configure authentication in the Authentication tab</li>
          <li>Set rate limits in the Rate Limits tab</li>
          <li>Customize response in the Response tab</li>
          <li>Save and copy your webhook URL</li>
        </ol>
      </div>
    </div>
  );
}

// Authentication Tab Component
function AuthenticationTab({ config, updateConfig }: any) {
  const [authMethod, setAuthMethod] = useState<string>(config?.method || 'none');
  const [authConfig, setAuthConfig] = useState<Record<string, unknown>>(config?.config || {});

  const methods = [
    { id: 'none', name: 'No Authentication', description: 'Anyone can trigger this webhook' },
    { id: 'basic', name: 'Basic Auth', description: 'Username and password' },
    { id: 'header', name: 'Header Auth', description: 'Custom header (X-API-Key)' },
    { id: 'query', name: 'Query Parameter', description: 'API key in URL' },
    { id: 'jwt', name: 'JWT', description: 'JSON Web Token' },
    { id: 'hmac', name: 'HMAC Signature', description: 'GitHub/Shopify style' },
    { id: 'oauth2', name: 'OAuth2', description: 'Bearer token' }
  ];

  useEffect(() => {
    updateConfig({ method: authMethod, config: authConfig });
  }, [authMethod, authConfig]);

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-3 dark:text-white">Authentication Method</label>
        <div className="grid grid-cols-1 gap-3">
          {methods.map(method => (
            <button
              key={method.id}
              onClick={() => setAuthMethod(method.id)}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                authMethod === method.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium dark:text-white">{method.name}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{method.description}</div>
                </div>
                {authMethod === method.id && <Shield className="text-blue-500" size={20} />}
              </div>
            </button>
          ))}
        </div>
      </div>

      {authMethod === 'basic' && (
        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h4 className="font-medium dark:text-white">Basic Authentication Settings</h4>
          <div>
            <label className="block text-sm mb-1 dark:text-gray-300">Username</label>
            <input
              type="text"
              value={(authConfig.username as string) || ''}
              onChange={(e) => setAuthConfig({ ...authConfig, username: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm mb-1 dark:text-gray-300">Password</label>
            <input
              type="password"
              value={(authConfig.password as string) || ''}
              onChange={(e) => setAuthConfig({ ...authConfig, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-600 dark:text-white"
            />
          </div>
        </div>
      )}

      {authMethod === 'header' && (
        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h4 className="font-medium dark:text-white">Header Authentication Settings</h4>
          <div>
            <label className="block text-sm mb-1 dark:text-gray-300">Header Name</label>
            <input
              type="text"
              value={(authConfig.headerName as string) || 'X-API-Key'}
              onChange={(e) => setAuthConfig({ ...authConfig, headerName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm mb-1 dark:text-gray-300">Header Value</label>
            <input
              type="text"
              value={(authConfig.headerValue as string) || ''}
              onChange={(e) => setAuthConfig({ ...authConfig, headerValue: e.target.value })}
              placeholder="your-api-key"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-600 dark:text-white"
            />
          </div>
        </div>
      )}

      {authMethod === 'hmac' && (
        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h4 className="font-medium dark:text-white">HMAC Signature Settings</h4>
          <div>
            <label className="block text-sm mb-1 dark:text-gray-300">Secret Key</label>
            <input
              type="password"
              value={(authConfig.secret as string) || ''}
              onChange={(e) => setAuthConfig({ ...authConfig, secret: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm mb-1 dark:text-gray-300">Algorithm</label>
            <select
              value={(authConfig.algorithm as string) || 'sha256'}
              onChange={(e) => setAuthConfig({ ...authConfig, algorithm: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-600 dark:text-white"
            >
              <option value="sha1">SHA-1</option>
              <option value="sha256">SHA-256</option>
              <option value="sha512">SHA-512</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1 dark:text-gray-300">Header Name</label>
            <input
              type="text"
              value={(authConfig.headerName as string) || 'X-Signature'}
              onChange={(e) => setAuthConfig({ ...authConfig, headerName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-600 dark:text-white"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Rate Limits Tab Component
function RateLimitsTab({ config, updateConfig }: any) {
  const [webhookLimits, setWebhookLimits] = useState(config?.webhookLimits || null);
  const [ipLimits, setIpLimits] = useState(config?.ipLimits || null);

  useEffect(() => {
    updateConfig({ webhookLimits, ipLimits });
  }, [webhookLimits, ipLimits]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium dark:text-white">Per-Webhook Limits</h3>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={!!webhookLimits}
              onChange={(e) => setWebhookLimits(e.target.checked ? { requests: 100, window: 'hour' } : null)}
              className="rounded"
            />
            <span className="text-sm dark:text-gray-300">Enable</span>
          </label>
        </div>

        {webhookLimits && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <label className="block text-sm mb-1 dark:text-gray-300">Requests</label>
              <input
                type="number"
                value={webhookLimits.requests}
                onChange={(e) => setWebhookLimits({ ...webhookLimits, requests: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 dark:text-gray-300">Per</label>
              <select
                value={webhookLimits.window}
                onChange={(e) => setWebhookLimits({ ...webhookLimits, window: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-600 dark:text-white"
              >
                <option value="second">Second</option>
                <option value="minute">Minute</option>
                <option value="hour">Hour</option>
                <option value="day">Day</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium dark:text-white">Per-IP Limits</h3>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={!!ipLimits}
              onChange={(e) => setIpLimits(e.target.checked ? { requests: 10, window: 'minute' } : null)}
              className="rounded"
            />
            <span className="text-sm dark:text-gray-300">Enable</span>
          </label>
        </div>

        {ipLimits && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <label className="block text-sm mb-1 dark:text-gray-300">Requests</label>
              <input
                type="number"
                value={ipLimits.requests}
                onChange={(e) => setIpLimits({ ...ipLimits, requests: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 dark:text-gray-300">Per</label>
              <select
                value={ipLimits.window}
                onChange={(e) => setIpLimits({ ...ipLimits, window: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-600 dark:text-white"
              >
                <option value="second">Second</option>
                <option value="minute">Minute</option>
                <option value="hour">Hour</option>
                <option value="day">Day</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Response Tab Component
function ResponseTab({ config, updateConfig }: any) {
  const [mode, setMode] = useState(config?.mode || 'lastNode');
  const [statusCode, setStatusCode] = useState(config?.statusCode || 200);

  useEffect(() => {
    updateConfig({ mode, statusCode });
  }, [mode, statusCode]);

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-3 dark:text-white">Response Mode</label>
        <div className="grid grid-cols-1 gap-3">
          {[
            { id: 'lastNode', name: 'Last Node Output', description: 'Return output from final node' },
            { id: 'allNodes', name: 'All Nodes Output', description: 'Return outputs from all nodes' },
            { id: 'custom', name: 'Custom Response', description: 'Define custom JSON response' },
            { id: 'file', name: 'File Download', description: 'Download result as file' },
            { id: 'redirect', name: 'Redirect', description: '302 redirect to URL' }
          ].map(option => (
            <button
              key={option.id}
              onClick={() => setMode(option.id)}
              className={`p-3 border-2 rounded-lg text-left transition-all ${
                mode === option.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              <div className="font-medium dark:text-white">{option.name}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{option.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 dark:text-white">HTTP Status Code</label>
        <select
          value={statusCode}
          onChange={(e) => setStatusCode(parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
        >
          <option value={200}>200 OK</option>
          <option value={201}>201 Created</option>
          <option value={202}>202 Accepted</option>
          <option value={204}>204 No Content</option>
          <option value={400}>400 Bad Request</option>
          <option value={404}>404 Not Found</option>
          <option value={500}>500 Internal Server Error</option>
        </select>
      </div>
    </div>
  );
}

// Analytics Tab Component
function AnalyticsTab({ config, updateConfig }: any) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium dark:text-white">Enable Analytics</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Track webhook requests and performance</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={config?.enabled !== false}
            onChange={(e) => updateConfig({ ...config, enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {config?.enabled !== false && (
        <div className="space-y-4">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={config?.trackHeaders !== false}
              onChange={(e) => updateConfig({ ...config, trackHeaders: e.target.checked })}
              className="rounded"
            />
            <div>
              <div className="font-medium dark:text-white">Track Headers</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Record request headers</div>
            </div>
          </label>

          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={config?.trackBody !== false}
              onChange={(e) => updateConfig({ ...config, trackBody: e.target.checked })}
              className="rounded"
            />
            <div>
              <div className="font-medium dark:text-white">Track Body</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Record request body (may consume storage)</div>
            </div>
          </label>

          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={config?.trackIP !== false}
              onChange={(e) => updateConfig({ ...config, trackIP: e.target.checked })}
              className="rounded"
            />
            <div>
              <div className="font-medium dark:text-white">Track IP Addresses</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Record source IP addresses</div>
            </div>
          </label>
        </div>
      )}
    </div>
  );
}
