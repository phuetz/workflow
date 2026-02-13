/**
 * FormTriggerConfig Component
 * Configuration panel for Form Trigger nodes
 */

import React, { useState, useCallback } from 'react';
import { FormBuilder } from '@/components/forms';
import type { FormTriggerConfig as FormConfig, FormPage, FormStyle } from '@/types/forms';

interface FormTriggerConfigProps {
  nodeId: string;
  config: Partial<FormConfig>;
  onChange: (config: Partial<FormConfig>) => void;
}

const defaultConfig: FormConfig = {
  id: '',
  workflowId: '',
  title: 'Contact Form',
  description: '',
  pages: [
    {
      id: 'page_1',
      title: 'Your Information',
      fields: [],
    },
  ],
  style: {
    primaryColor: '#3B82F6',
    backgroundColor: '#FFFFFF',
    fontFamily: 'system-ui, sans-serif',
    borderRadius: '8px',
    showProgressBar: true,
  },
  authentication: {
    type: 'none',
  },
  submitButton: {
    text: 'Submit',
    loadingText: 'Submitting...',
  },
  successMessage: 'Thank you for your submission!',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const FormTriggerConfig: React.FC<FormTriggerConfigProps> = ({
  nodeId,
  config,
  onChange,
}) => {
  const [activeTab, setActiveTab] = useState<'builder' | 'settings' | 'style'>('builder');

  const formConfig: FormConfig = {
    ...defaultConfig,
    ...config,
    id: config.id || nodeId,
  };

  const handleConfigChange = useCallback((updates: Partial<FormConfig>) => {
    onChange({ ...formConfig, ...updates, updatedAt: new Date() });
  }, [formConfig, onChange]);

  const handleStyleChange = useCallback((styleUpdates: Partial<FormStyle>) => {
    handleConfigChange({
      style: { ...formConfig.style, ...styleUpdates },
    });
  }, [formConfig.style, handleConfigChange]);

  // Generate form URL
  const formUrl = `${window.location.origin}/forms/${formConfig.id}`;

  return (
    <div className="form-trigger-config h-full flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 px-4">
        {(['builder', 'settings', 'style'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'builder' ? 'Form Builder' : tab === 'settings' ? 'Settings' : 'Styling'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'builder' && (
          <FormBuilder
            config={formConfig}
            onChange={handleConfigChange}
          />
        )}

        {activeTab === 'settings' && (
          <div className="p-6 space-y-6 overflow-y-auto h-full">
            {/* Basic Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Basic Settings</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Form Title
                </label>
                <input
                  type="text"
                  value={formConfig.title}
                  onChange={(e) => handleConfigChange({ title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formConfig.description || ''}
                  onChange={(e) => handleConfigChange({ description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Submit Button</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Button Text
                  </label>
                  <input
                    type="text"
                    value={formConfig.submitButton.text}
                    onChange={(e) => handleConfigChange({
                      submitButton: { ...formConfig.submitButton, text: e.target.value },
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loading Text
                  </label>
                  <input
                    type="text"
                    value={formConfig.submitButton.loadingText || ''}
                    onChange={(e) => handleConfigChange({
                      submitButton: { ...formConfig.submitButton, loadingText: e.target.value },
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Success Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">After Submission</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Success Message
                </label>
                <input
                  type="text"
                  value={formConfig.successMessage || ''}
                  onChange={(e) => handleConfigChange({ successMessage: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Redirect URL (optional)
                </label>
                <input
                  type="url"
                  value={formConfig.redirectUrl || ''}
                  onChange={(e) => handleConfigChange({ redirectUrl: e.target.value })}
                  placeholder="https://example.com/thank-you"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
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
                  value={formConfig.authentication?.type || 'none'}
                  onChange={(e) => handleConfigChange({
                    authentication: { type: e.target.value as 'none' | 'basic' | 'jwt' | 'apiKey' },
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="none">No Authentication</option>
                  <option value="basic">Basic Auth</option>
                  <option value="jwt">JWT Token</option>
                  <option value="apiKey">API Key</option>
                </select>
              </div>
            </div>

            {/* Form URL */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Form URL</h3>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={formUrl}
                  readOnly
                  className="flex-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg font-mono text-sm"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(formUrl)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Copy
                </button>
              </div>
              <p className="text-sm text-gray-500">
                Share this URL to collect form submissions
              </p>
            </div>
          </div>
        )}

        {activeTab === 'style' && (
          <div className="p-6 space-y-6 overflow-y-auto h-full">
            <h3 className="text-lg font-semibold text-gray-900">Form Styling</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formConfig.style?.primaryColor || '#3B82F6'}
                    onChange={(e) => handleStyleChange({ primaryColor: e.target.value })}
                    className="w-10 h-10 rounded border border-gray-300"
                  />
                  <input
                    type="text"
                    value={formConfig.style?.primaryColor || '#3B82F6'}
                    onChange={(e) => handleStyleChange({ primaryColor: e.target.value })}
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
                    value={formConfig.style?.backgroundColor || '#FFFFFF'}
                    onChange={(e) => handleStyleChange({ backgroundColor: e.target.value })}
                    className="w-10 h-10 rounded border border-gray-300"
                  />
                  <input
                    type="text"
                    value={formConfig.style?.backgroundColor || '#FFFFFF'}
                    onChange={(e) => handleStyleChange({ backgroundColor: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Font Family
              </label>
              <select
                value={formConfig.style?.fontFamily || 'system-ui, sans-serif'}
                onChange={(e) => handleStyleChange({ fontFamily: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="system-ui, sans-serif">System Default</option>
                <option value="Inter, sans-serif">Inter</option>
                <option value="Roboto, sans-serif">Roboto</option>
                <option value="Open Sans, sans-serif">Open Sans</option>
                <option value="Georgia, serif">Georgia</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Border Radius
              </label>
              <select
                value={formConfig.style?.borderRadius || '8px'}
                onChange={(e) => handleStyleChange({ borderRadius: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="0">None</option>
                <option value="4px">Small</option>
                <option value="8px">Medium</option>
                <option value="12px">Large</option>
                <option value="16px">Extra Large</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Logo URL (optional)
              </label>
              <input
                type="url"
                value={formConfig.style?.logoUrl || ''}
                onChange={(e) => handleStyleChange({ logoUrl: e.target.value })}
                placeholder="https://example.com/logo.png"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formConfig.style?.showProgressBar ?? true}
                  onChange={(e) => handleStyleChange({ showProgressBar: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Show progress bar (for multi-page forms)</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom CSS (advanced)
              </label>
              <textarea
                value={formConfig.style?.customCss || ''}
                onChange={(e) => handleStyleChange({ customCss: e.target.value })}
                rows={5}
                placeholder=".form-renderer { /* your styles */ }"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormTriggerConfig;
