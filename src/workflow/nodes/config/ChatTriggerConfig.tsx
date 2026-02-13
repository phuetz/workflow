/**
 * ChatTriggerConfig Component
 * Configuration panel for Chat Trigger nodes
 */

import React, { useState, useCallback } from 'react';
import { ChatWidget } from '@/components/chat';
import type { ChatTriggerConfig as ChatConfig } from '@/types/chat';

interface ChatTriggerConfigProps {
  nodeId: string;
  config: Partial<ChatConfig>;
  onChange: (config: Partial<ChatConfig>) => void;
}

const defaultConfig: ChatConfig = {
  id: '',
  workflowId: '',
  title: 'AI Assistant',
  subtitle: 'How can I help you today?',
  welcomeMessage: 'Hello! How can I assist you today?',
  placeholderText: 'Type your message...',
  authentication: {
    type: 'none',
  },
  features: {
    streaming: true,
    memory: true,
    fileUpload: true,
    voiceInput: false,
    voiceOutput: false,
    typing: true,
    feedback: true,
    history: true,
  },
  limits: {
    maxMessageLength: 4000,
    maxHistoryLength: 50,
    maxFileSize: 10,
    rateLimit: {
      maxMessages: 60,
      windowMs: 60000,
    },
  },
  style: {
    primaryColor: '#8B5CF6',
    backgroundColor: '#F9FAFB',
    fontFamily: 'system-ui, sans-serif',
    borderRadius: '12px',
    position: 'bottom-right',
    size: 'medium',
  },
  ai: {
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2000,
    systemPrompt: 'You are a helpful assistant.',
    memoryType: 'buffer',
  },
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const ChatTriggerConfig: React.FC<ChatTriggerConfigProps> = ({
  nodeId,
  config,
  onChange,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'features' | 'style' | 'preview'>('general');

  const chatConfig: ChatConfig = {
    ...defaultConfig,
    ...config,
    id: config.id || nodeId,
    features: { ...defaultConfig.features, ...config.features },
    limits: { ...defaultConfig.limits, ...config.limits },
    style: { ...defaultConfig.style, ...config.style },
    ai: { ...defaultConfig.ai, ...config.ai },
  };

  const handleConfigChange = useCallback((updates: Partial<ChatConfig>) => {
    onChange({ ...chatConfig, ...updates, updatedAt: new Date() });
  }, [chatConfig, onChange]);

  // Generate embed code
  const embedCode = `<script src="${window.location.origin}/chat-widget.js" data-chat-id="${chatConfig.id}"></script>`;

  return (
    <div className="chat-trigger-config h-full flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 px-4 overflow-x-auto">
        {(['general', 'ai', 'features', 'style', 'preview'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab
                ? 'border-violet-500 text-violet-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'general' && (
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Chat Settings</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chat Title
                </label>
                <input
                  type="text"
                  value={chatConfig.title}
                  onChange={(e) => handleConfigChange({ title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subtitle
                </label>
                <input
                  type="text"
                  value={chatConfig.subtitle || ''}
                  onChange={(e) => handleConfigChange({ subtitle: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Welcome Message
                </label>
                <textarea
                  value={chatConfig.welcomeMessage || ''}
                  onChange={(e) => handleConfigChange({ welcomeMessage: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Input Placeholder
                </label>
                <input
                  type="text"
                  value={chatConfig.placeholderText || ''}
                  onChange={(e) => handleConfigChange({ placeholderText: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
                />
              </div>
            </div>

            {/* Authentication */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Authentication</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Authentication Type
                </label>
                <select
                  value={chatConfig.authentication.type}
                  onChange={(e) => handleConfigChange({
                    authentication: { type: e.target.value as 'none' | 'jwt' | 'session' | 'apiKey' },
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
                >
                  <option value="none">No Authentication</option>
                  <option value="jwt">JWT Token</option>
                  <option value="session">Session</option>
                  <option value="apiKey">API Key</option>
                </select>
              </div>
            </div>

            {/* Embed Code */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Embed Code</h3>

              <div className="relative">
                <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg text-sm overflow-x-auto">
                  {embedCode}
                </pre>
                <button
                  onClick={() => navigator.clipboard.writeText(embedCode)}
                  className="absolute top-2 right-2 px-3 py-1 bg-violet-500 text-white text-sm rounded hover:bg-violet-600 transition-colors"
                >
                  Copy
                </button>
              </div>
              <p className="text-sm text-gray-500">
                Add this script to your website to embed the chat widget
              </p>
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="p-6 space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">AI Configuration</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model
              </label>
              <select
                value={chatConfig.ai?.model || 'gpt-4'}
                onChange={(e) => handleConfigChange({
                  ai: { ...chatConfig.ai, model: e.target.value },
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
              >
                <optgroup label="OpenAI">
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </optgroup>
                <optgroup label="Anthropic">
                  <option value="claude-3-opus">Claude 3 Opus</option>
                  <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                  <option value="claude-3-haiku">Claude 3 Haiku</option>
                </optgroup>
                <optgroup label="Google">
                  <option value="gemini-pro">Gemini Pro</option>
                  <option value="gemini-ultra">Gemini Ultra</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                System Prompt
              </label>
              <textarea
                value={chatConfig.ai?.systemPrompt || ''}
                onChange={(e) => handleConfigChange({
                  ai: { ...chatConfig.ai, systemPrompt: e.target.value },
                })}
                rows={5}
                placeholder="You are a helpful assistant..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temperature
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={chatConfig.ai?.temperature ?? 0.7}
                  onChange={(e) => handleConfigChange({
                    ai: { ...chatConfig.ai, temperature: parseFloat(e.target.value) },
                  })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Precise (0)</span>
                  <span>{chatConfig.ai?.temperature ?? 0.7}</span>
                  <span>Creative (2)</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Tokens
                </label>
                <input
                  type="number"
                  value={chatConfig.ai?.maxTokens ?? 2000}
                  onChange={(e) => handleConfigChange({
                    ai: { ...chatConfig.ai, maxTokens: parseInt(e.target.value) },
                  })}
                  min={100}
                  max={8000}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Memory Type
              </label>
              <select
                value={chatConfig.ai?.memoryType || 'buffer'}
                onChange={(e) => handleConfigChange({
                  ai: { ...chatConfig.ai, memoryType: e.target.value as 'buffer' | 'summary' | 'vector' },
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
              >
                <option value="buffer">Buffer Memory (last N messages)</option>
                <option value="summary">Summary Memory (condensed history)</option>
                <option value="vector">Vector Memory (semantic search)</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'features' && (
          <div className="p-6 space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Features</h3>

            <div className="space-y-3">
              {[
                { key: 'streaming', label: 'Streaming Responses', desc: 'Show responses as they are generated' },
                { key: 'memory', label: 'Conversation Memory', desc: 'Remember previous messages in the conversation' },
                { key: 'fileUpload', label: 'File Upload', desc: 'Allow users to upload files' },
                { key: 'voiceInput', label: 'Voice Input', desc: 'Allow voice messages' },
                { key: 'voiceOutput', label: 'Voice Output', desc: 'Read responses aloud' },
                { key: 'typing', label: 'Typing Indicator', desc: 'Show when AI is thinking' },
                { key: 'feedback', label: 'Feedback Buttons', desc: 'Allow users to rate responses' },
                { key: 'history', label: 'Conversation History', desc: 'Save conversation history' },
              ].map(({ key, label, desc }) => (
                <label key={key} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chatConfig.features[key as keyof typeof chatConfig.features] as boolean}
                    onChange={(e) => handleConfigChange({
                      features: { ...chatConfig.features, [key]: e.target.checked },
                    })}
                    className="mt-1 w-4 h-4 text-violet-600 border-gray-300 rounded focus:ring-violet-500"
                  />
                  <div>
                    <span className="block text-sm font-medium text-gray-700">{label}</span>
                    <span className="block text-xs text-gray-500">{desc}</span>
                  </div>
                </label>
              ))}
            </div>

            <h3 className="text-lg font-semibold text-gray-900 pt-4">Limits</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Message Length
                </label>
                <input
                  type="number"
                  value={chatConfig.limits.maxMessageLength}
                  onChange={(e) => handleConfigChange({
                    limits: { ...chatConfig.limits, maxMessageLength: parseInt(e.target.value) },
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max History Length
                </label>
                <input
                  type="number"
                  value={chatConfig.limits.maxHistoryLength}
                  onChange={(e) => handleConfigChange({
                    limits: { ...chatConfig.limits, maxHistoryLength: parseInt(e.target.value) },
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max File Size (MB)
                </label>
                <input
                  type="number"
                  value={chatConfig.limits.maxFileSize}
                  onChange={(e) => handleConfigChange({
                    limits: { ...chatConfig.limits, maxFileSize: parseInt(e.target.value) },
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rate Limit (msg/min)
                </label>
                <input
                  type="number"
                  value={chatConfig.limits.rateLimit.maxMessages}
                  onChange={(e) => handleConfigChange({
                    limits: {
                      ...chatConfig.limits,
                      rateLimit: { ...chatConfig.limits.rateLimit, maxMessages: parseInt(e.target.value) },
                    },
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'style' && (
          <div className="p-6 space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Appearance</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={chatConfig.style.primaryColor}
                    onChange={(e) => handleConfigChange({
                      style: { ...chatConfig.style, primaryColor: e.target.value },
                    })}
                    className="w-10 h-10 rounded border border-gray-300"
                  />
                  <input
                    type="text"
                    value={chatConfig.style.primaryColor}
                    onChange={(e) => handleConfigChange({
                      style: { ...chatConfig.style, primaryColor: e.target.value },
                    })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Background Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={chatConfig.style.backgroundColor}
                    onChange={(e) => handleConfigChange({
                      style: { ...chatConfig.style, backgroundColor: e.target.value },
                    })}
                    className="w-10 h-10 rounded border border-gray-300"
                  />
                  <input
                    type="text"
                    value={chatConfig.style.backgroundColor}
                    onChange={(e) => handleConfigChange({
                      style: { ...chatConfig.style, backgroundColor: e.target.value },
                    })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Widget Size
              </label>
              <select
                value={chatConfig.style.size}
                onChange={(e) => handleConfigChange({
                  style: { ...chatConfig.style, size: e.target.value as 'small' | 'medium' | 'large' | 'fullscreen' },
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
              >
                <option value="small">Small (320x384)</option>
                <option value="medium">Medium (384x500)</option>
                <option value="large">Large (450x600)</option>
                <option value="fullscreen">Fullscreen</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Position
              </label>
              <select
                value={chatConfig.style.position}
                onChange={(e) => handleConfigChange({
                  style: { ...chatConfig.style, position: e.target.value as 'bottom-right' | 'bottom-left' | 'center' },
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
              >
                <option value="bottom-right">Bottom Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="center">Center</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Avatar URL
              </label>
              <input
                type="url"
                value={chatConfig.style.avatarUrl || ''}
                onChange={(e) => handleConfigChange({
                  style: { ...chatConfig.style, avatarUrl: e.target.value },
                })}
                placeholder="https://example.com/avatar.png"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom CSS
              </label>
              <textarea
                value={chatConfig.style.customCss || ''}
                onChange={(e) => handleConfigChange({
                  style: { ...chatConfig.style, customCss: e.target.value },
                })}
                rows={5}
                placeholder=".chat-interface { /* your styles */ }"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-violet-500 focus:border-violet-500"
              />
            </div>
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden h-[500px]">
              <ChatWidget
                config={chatConfig}
                widgetConfig={{ autoOpen: true }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatTriggerConfig;
