import React, { useState, useMemo, useEffect } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { eventNotificationService } from '../../services/EventNotificationService';
import { Globe, Plus, Copy, Edit, Trash2, Eye, Activity } from 'lucide-react';
import { logger } from '../../services/SimpleLogger';

// Type definition for webhook with timeout tracking
interface ToastElement extends HTMLElement {
  timeoutId?: NodeJS.Timeout;
}

// Type definition for webhook data
interface WebhookData {
  id: string;
  url: string;
  workflowId: string;
  created: string;
}

export default function WebhookManager() {
  const { darkMode, webhookEndpoints, generateWebhookUrl } = useWorkflowStore();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<string | null>(null);
  // UI/UX FIX: Track active toasts to prevent accumulation
  const [activeToasts, setActiveToasts] = useState<Set<ToastElement>>(new Set());

  const webhookList = useMemo(() =>
    Object.entries(webhookEndpoints).map(([id, webhook]) => ({
      id,
      ...(webhook as Record<string, unknown>)
    })) as WebhookData[], [webhookEndpoints]);

  const addWebhook = (url: string) => {
    try {
      
      // Emit event for notification system
      eventNotificationService.emitEvent('webhook_configured', {
        webhookName: `Webhook ${Object.keys(webhookEndpoints).length + 1}`,
        url: url,
        workflowId: 'current-workflow',
        events: ['workflow.completed', 'workflow.failed']
      }, 'webhook_manager');
      
      // UI/UX FIX: Use improved copy to clipboard function
      copyToClipboard(url);
      setIsCreating(false);
      showToast('Webhook created and URL copied!', 'success');
    } catch (error) {
      showToast('Failed to create webhook', 'error');
    }
  };

  const copyToClipboard = async (text: string) => {
    // BROWSER COMPATIBILITY FIX: Feature detection before using clipboard API
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!', 'success');
      } else {
        // Fallback for browsers that don't support clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (success) {
          showToast('Copied to clipboard!', 'success');
        } else {
          showToast('Could not copy to clipboard. Please copy manually.', 'warning');
        }
      }
    } catch (error) {
      logger.warn('Clipboard operation failed:', error);
      showToast('Copy failed. Please copy manually.', 'error');
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    // UI/UX FIX: Centralized toast system to prevent accumulation
    // Clear existing toasts to prevent accumulation
    activeToasts.forEach(toast => {
      if (toast.parentNode === document.body) {
        document.body.removeChild(toast);
      }
    });
    setActiveToasts(new Set());

    const toast = document.createElement('div') as ToastElement;
    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-yellow-500';
    toast.className = `fixed top-4 right-4 ${bgColor} text-white px-4 py-2 rounded-lg z-50 transition-opacity`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setActiveToasts(prev => new Set(prev).add(toast));

    const timeoutId = setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        if (toast.parentNode === document.body) {
          document.body.removeChild(toast);
          setActiveToasts(prev => {
            const newSet = new Set(prev);
            newSet.delete(toast);
            return newSet;
          });
        }
      }, 300);
    }, 2000);

    // Store timeout ID for cleanup
    toast.timeoutId = timeoutId;
  };

  // MEMORY LEAK FIX: Cleanup DOM elements on component unmount
  useEffect(() => {
    return () => {
      // Clear all active toasts and their timeouts
      activeToasts.forEach(toast => {
        if (toast.timeoutId) {
          clearTimeout(toast.timeoutId);
        }
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      });
    };
  }, [activeToasts]);

  const testWebhook = async (webhook: { url: string }) => {
    try {
      // UI/UX FIX: Show loading state during test
      showToast('Testing webhook...', 'warning');

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true, timestamp: new Date().toISOString() })
      });

      // UI/UX FIX: Use centralized toast system
      showToast(
        response.ok ? 'Webhook test successful!' : `Webhook test failed (${response.status})`,
        response.ok ? 'success' : 'error'
      );
    } catch (error) {
      logger.error('Webhook test failed:', error);
      // UI/UX FIX: Better error messaging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showToast(`Webhook test failed: ${errorMessage}`, 'error');
    }
  };

  const generateCurlCommand = (webhook: { url: string }) => {
    return `curl -X POST "${webhook.url}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "event": "test",
    "data": {
      "message": "Hello from webhook!"
    }
  }'`;
  };

  const generateJavaScriptCode = (webhook: { url: string }) => {
    return `fetch('${webhook.url}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    event: 'test',
    data: {
      message: 'Hello from webhook!'
    }
  })
})
.then(response => response.json())
.then(data => logger.info('Success:', data))
.catch(error => logger.error('Error:', error));`;
  };

  const createWebhook = () => {
    // Generate a unique workflow ID for this webhook
    const workflowId = 'current-workflow'; // This should ideally come from the current workflow context
    const webhookUrl = generateWebhookUrl(workflowId);
    addWebhook(webhookUrl);
  };

  const webhook = selectedWebhook
    ? webhookList.find(w => w.id === selectedWebhook)
    : null;

  return (
    <div className={`p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-white'}`}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Globe className="text-green-500" size={24} />
            <h1 className="text-2xl font-bold">Webhook Manager</h1>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>Create Webhook</span>
          </button>
        </div>

        {/* Webhooks List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {webhookList.map((webhook) => (
            <div
              key={webhook.id}
              className={`p-4 rounded-lg border ${
                darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="font-semibold">Webhook #{webhook.id.slice(-4)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => testWebhook(webhook)}
                    className="p-2 hover:bg-gray-100 rounded"
                    title="Test webhook"
                  >
                    <Activity size={16} />
                  </button>
                  <button
                    onClick={() => setSelectedWebhook(webhook.id)}
                    className="p-2 hover:bg-gray-100 rounded"
                    title="View details"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => copyToClipboard(webhook.url)}
                    className="p-2 hover:bg-gray-100 rounded"
                    title="Copy URL"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="text-sm font-medium">URL</label>
                  <div className={`p-2 rounded font-mono text-sm ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    {webhook.url}
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Created: {new Date(webhook.created).toLocaleDateString()}</span>
                  <span>Workflow: {webhook.workflowId}</span>
                </div>
              </div>

              <div className="mt-4 flex space-x-2">
                <button
                  onClick={() => copyToClipboard(webhook.url)}
                  className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
                >
                  Copy URL
                </button>
                <button
                  onClick={() => testWebhook(webhook)}
                  className="flex-1 bg-green-500 text-white py-2 rounded hover:bg-green-600"
                >
                  Test
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Create Webhook Modal */}
        {isCreating && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 max-w-md w-full mx-4`}>
              <h2 className="text-xl font-bold mb-4">Create New Webhook</h2>
              <p className="text-gray-600 mb-6">
                This will generate a unique webhook URL for your workflow that can receive HTTP requests.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={createWebhook}
                  className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600"
                >
                  Generate Webhook
                </button>
                <button
                  onClick={() => setIsCreating(false)}
                  className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Webhook Details Modal */}
        {selectedWebhook && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Webhook Details</h2>
                <button
                  onClick={() => setSelectedWebhook(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>

              {(() => {
                if (!webhook) return null;

                return (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Webhook URL</label>
                      <div className={`p-3 rounded-lg font-mono text-sm ${
                        darkMode ? 'bg-gray-700' : 'bg-gray-100'
                      }`}>
                        {webhook.url}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">cURL Example</label>
                      <pre className={`p-3 rounded-lg text-sm overflow-x-auto ${
                        darkMode ? 'bg-gray-700' : 'bg-gray-100'
                      }`}>
                        {generateCurlCommand(webhook)}
                      </pre>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">JavaScript Example</label>
                      <pre className={`p-3 rounded-lg text-sm overflow-x-auto ${
                        darkMode ? 'bg-gray-700' : 'bg-gray-100'
                      }`}>
                        {generateJavaScriptCode(webhook)}
                      </pre>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Methods</label>
                        <div className="flex flex-wrap gap-1">
                          {['GET', 'POST', 'PUT', 'DELETE'].map(method => (
                            <span key={method} className="px-2 py-1 bg-blue-500 text-white text-xs rounded">
                              {method}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Content-Type</label>
                        <div className="text-sm">application/json</div>
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={() => copyToClipboard(webhook.url)}
                        className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
                      >
                        Copy URL
                      </button>
                      <button
                        onClick={() => testWebhook(webhook)}
                        className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600"
                      >
                        Test Webhook
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Empty State */}
        {webhookList.length === 0 && (
          <div className="text-center py-12">
            <Globe size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No webhooks yet</h3>
            <p className="text-gray-500 mb-4">Create your first webhook to start receiving HTTP requests</p>
            <button
              onClick={() => setIsCreating(true)}
              className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600"
            >
              Create First Webhook
            </button>
          </div>
        )}
      </div>
    </div>
  );
}