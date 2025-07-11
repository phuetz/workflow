import React, { useState } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { Globe, Plus, Copy, Edit, Trash2, Eye, Activity } from 'lucide-react';

export default function WebhookManager() {
  const { darkMode, webhookEndpoints, generateWebhookUrl } = useWorkflowStore();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<string | null>(null);

  const webhooks = Object.entries(webhookEndpoints).map(([id, webhook]) => ({
    id,
    ...webhook
  }));

  const createWebhook = () => {
    const url = generateWebhookUrl('current-workflow');
    navigator.clipboard.writeText(url);
    setIsCreating(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Show toast notification
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg z-50';
    toast.textContent = 'Copied to clipboard!';
    document.body.appendChild(toast);
    setTimeout(() => document.body.removeChild(toast), 2000);
  };

  const testWebhook = async (url: string) => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true, timestamp: new Date().toISOString() })
      });
      
      const toast = document.createElement('div');
      toast.className = `fixed top-4 right-4 px-4 py-2 rounded-lg z-50 ${
        response.ok ? 'bg-green-500' : 'bg-red-500'
      } text-white`;
      toast.textContent = response.ok ? 'Webhook test successful!' : 'Webhook test failed!';
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 3000);
    } catch (error) {
      console.error('Webhook test failed:', error);
    }
  };

  const generateCurlCommand = (webhook: any) => {
    return `curl -X POST "${webhook.url}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "event": "test",
    "data": {
      "message": "Hello from webhook!"
    }
  }'`;
  };

  const generateJavaScriptCode = (webhook: any) => {
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
.then(data => console.log('Success:', data))
.catch(error => console.error('Error:', error));`;
  };

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
          {webhooks.map((webhook) => (
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
                    onClick={() => testWebhook(webhook.url)}
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
                  onClick={() => testWebhook(webhook.url)}
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
                const webhook = webhooks.find(w => w.id === selectedWebhook);
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
                        onClick={() => testWebhook(webhook.url)}
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
        {webhooks.length === 0 && (
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