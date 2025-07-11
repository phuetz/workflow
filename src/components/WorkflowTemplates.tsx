import React, { useState } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { Download, Play, Eye, Star, Copy } from 'lucide-react';

export default function WorkflowTemplates() {
  const { workflowTemplates, darkMode, setNodes, setEdges } = useWorkflowStore();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const templates = [
    {
      id: 'email-automation',
      name: 'Email Automation',
      description: 'Automated email sequences for customer onboarding',
      category: 'Marketing',
      tags: ['email', 'automation', 'customers'],
      rating: 4.8,
      downloads: 1200,
      preview: '/templates/email-automation.png',
      nodes: [
        {
          id: 'trigger-1',
          type: 'custom',
          position: { x: 100, y: 100 },
          data: { 
            type: 'webhook', 
            label: 'New Customer', 
            config: { webhookUrl: 'https://webhook.site/new-customer' }
          }
        },
        {
          id: 'delay-1',
          type: 'custom',
          position: { x: 300, y: 100 },
          data: { 
            type: 'delay', 
            label: 'Wait 1 Hour', 
            config: { delay: 1, unit: 'hours' }
          }
        },
        {
          id: 'email-1',
          type: 'custom',
          position: { x: 500, y: 100 },
          data: { 
            type: 'email', 
            label: 'Welcome Email', 
            config: { 
              to: '{{$json.email}}',
              subject: 'Welcome to our platform!',
              body: 'Thank you for signing up!'
            }
          }
        }
      ],
      edges: [
        { id: 'e1-2', source: 'trigger-1', target: 'delay-1', type: 'default' },
        { id: 'e2-3', source: 'delay-1', target: 'email-1', type: 'default' }
      ]
    },
    {
      id: 'data-sync',
      name: 'Database Sync',
      description: 'Synchronize data between multiple databases',
      category: 'Data',
      tags: ['database', 'sync', 'automation'],
      rating: 4.6,
      downloads: 800,
      preview: '/templates/data-sync.png',
      nodes: [
        {
          id: 'schedule-1',
          type: 'custom',
          position: { x: 100, y: 100 },
          data: { 
            type: 'schedule', 
            label: 'Every 5 Minutes', 
            config: { cron: '*/5 * * * *' }
          }
        },
        {
          id: 'mysql-1',
          type: 'custom',
          position: { x: 300, y: 100 },
          data: { 
            type: 'mysql', 
            label: 'Source DB', 
            config: { 
              host: 'localhost',
              database: 'source_db',
              query: 'SELECT * FROM users WHERE updated_at > NOW() - INTERVAL 5 MINUTE'
            }
          }
        },
        {
          id: 'postgres-1',
          type: 'custom',
          position: { x: 500, y: 100 },
          data: { 
            type: 'postgres', 
            label: 'Target DB', 
            config: { 
              host: 'localhost',
              database: 'target_db',
              operation: 'insert'
            }
          }
        }
      ],
      edges: [
        { id: 'e1-2', source: 'schedule-1', target: 'mysql-1', type: 'default' },
        { id: 'e2-3', source: 'mysql-1', target: 'postgres-1', type: 'default' }
      ]
    },
    {
      id: 'ai-content',
      name: 'AI Content Generation',
      description: 'Generate and publish content using AI',
      category: 'AI',
      tags: ['ai', 'content', 'automation'],
      rating: 4.9,
      downloads: 2100,
      preview: '/templates/ai-content.png',
      nodes: [
        {
          id: 'rss-1',
          type: 'custom',
          position: { x: 100, y: 100 },
          data: { 
            type: 'rssFeed', 
            label: 'Industry News', 
            config: { feedUrl: 'https://feeds.feedburner.com/oreilly' }
          }
        },
        {
          id: 'openai-1',
          type: 'custom',
          position: { x: 300, y: 100 },
          data: { 
            type: 'openai', 
            label: 'Summarize Article', 
            config: { 
              model: 'gpt-3.5-turbo',
              prompt: 'Summarize this article in 2 paragraphs: {{$json.content}}'
            }
          }
        },
        {
          id: 'slack-1',
          type: 'custom',
          position: { x: 500, y: 100 },
          data: { 
            type: 'slack', 
            label: 'Post to Slack', 
            config: { 
              channel: '#content',
              message: 'New article summary: {{$json.summary}}'
            }
          }
        }
      ],
      edges: [
        { id: 'e1-2', source: 'rss-1', target: 'openai-1', type: 'default' },
        { id: 'e2-3', source: 'openai-1', target: 'slack-1', type: 'default' }
      ]
    },
    {
      id: 'e-commerce',
      name: 'E-commerce Order Processing',
      description: 'Automated order fulfillment and notification system',
      category: 'E-commerce',
      tags: ['orders', 'fulfillment', 'notifications'],
      rating: 4.7,
      downloads: 950,
      preview: '/templates/e-commerce.png',
      nodes: [
        {
          id: 'webhook-1',
          type: 'custom',
          position: { x: 100, y: 100 },
          data: { 
            type: 'webhook', 
            label: 'New Order', 
            config: { webhookUrl: 'https://webhook.site/new-order' }
          }
        },
        {
          id: 'condition-1',
          type: 'custom',
          position: { x: 300, y: 100 },
          data: { 
            type: 'condition', 
            label: 'Order > $100?', 
            config: { condition: '$json.amount > 100' }
          }
        },
        {
          id: 'email-premium',
          type: 'custom',
          position: { x: 500, y: 50 },
          data: { 
            type: 'email', 
            label: 'Premium Customer Email', 
            config: { 
              to: '{{$json.email}}',
              subject: 'Thank you for your premium order!'
            }
          }
        },
        {
          id: 'email-standard',
          type: 'custom',
          position: { x: 500, y: 150 },
          data: { 
            type: 'email', 
            label: 'Standard Order Email', 
            config: { 
              to: '{{$json.email}}',
              subject: 'Order confirmation'
            }
          }
        }
      ],
      edges: [
        { id: 'e1-2', source: 'webhook-1', target: 'condition-1', type: 'default' },
        { id: 'e2-3', source: 'condition-1', target: 'email-premium', sourceHandle: 'true', type: 'default' },
        { id: 'e2-4', source: 'condition-1', target: 'email-standard', sourceHandle: 'false', type: 'default' }
      ]
    }
  ];

  const loadTemplate = (template: any) => {
    setNodes(template.nodes);
    setEdges(template.edges);
    setSelectedTemplate(null);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Marketing': return 'bg-blue-100 text-blue-800';
      case 'Data': return 'bg-purple-100 text-purple-800';
      case 'AI': return 'bg-green-100 text-green-800';
      case 'E-commerce': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-white'}`}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Workflow Templates</h1>
          <p className="text-gray-500">Get started quickly with pre-built workflows</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer`}
              onClick={() => setSelectedTemplate(template.id)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{template.name}</h3>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getCategoryColor(template.category)}`}>
                    {template.category}
                  </span>
                </div>
                <div className="flex items-center space-x-1 text-yellow-400">
                  <Star size={16} fill="currentColor" />
                  <span className="text-sm font-medium">{template.rating}</span>
                </div>
              </div>

              {/* Description */}
              <p className="text-gray-600 text-sm mb-4">{template.description}</p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mb-4">
                {template.tags.map((tag) => (
                  <span
                    key={tag}
                    className={`px-2 py-1 rounded text-xs ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <div className="flex items-center">
                  <Download size={14} className="mr-1" />
                  <span>{template.downloads} downloads</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                  <span>{template.nodes.length} nodes</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    loadTemplate(template);
                  }}
                  className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"
                >
                  <Copy size={16} />
                  <span>Use Template</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTemplate(template.id);
                  }}
                  className={`px-4 py-2 rounded-lg transition-colors ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  <Eye size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Template Detail Modal */}
        {selectedTemplate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Workflow Details</h2>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>

              {(() => {
                const template = templates.find(t => t.id === selectedTemplate);
                if (!template) return null;

                return (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold">{template.name}</h2>
                      <p className="text-gray-600">{template.description}</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {template.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`px-3 py-1 rounded-full text-sm ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-500">{template.rating}</div>
                        <div className="text-sm text-gray-500">Rating</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-500">{template.downloads}</div>
                        <div className="text-sm text-gray-500">Downloads</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold">Workflow Steps:</h3>
                      {template.nodes.map((node, index) => (
                        <div key={node.id} className="flex items-center space-x-3 p-2 rounded bg-gray-50">
                          <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{node.data.label}</div>
                            <div className="text-sm text-gray-500">{node.data.type}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <button
                        onClick={() => loadTemplate(template)}
                        className="flex-1 bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"
                      >
                        <Copy size={18} />
                        <span>Use This Template</span>
                      </button>
                      <button
                        onClick={() => setSelectedTemplate(null)}
                        className={`px-6 py-3 rounded-lg transition-colors ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}