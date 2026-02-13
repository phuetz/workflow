/**
 * AI Template Builder Component
 * Natural language interface for generating workflow templates
 */

import React, { useState, useRef, useEffect } from 'react';
import { GeneratedTemplate, TemplateContext } from '../../types/aiTemplate';
import { aiTemplateGenerator } from '../../templates/AITemplateGenerator';
import { templateCustomizer } from '../../templates/TemplateCustomizer';
import { logger } from '../../services/SimpleLogger';
import { useToast } from '../ui/Toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  template?: GeneratedTemplate;
  timestamp: Date;
}

export const AITemplateBuilder: React.FC = () => {
  const toast = useToast();
  const [description, setDescription] = useState('');
  const [messages, setMessages] = useState<Message[]>([{
    id: '1',
    role: 'assistant',
    content: 'Hi! I can help you create a custom workflow template. Just describe what you want to automate in plain English. For example:\n\n• "Process Shopify orders: validate, check inventory, charge customer, send confirmation"\n• "Monitor Twitter for brand mentions, analyze sentiment, alert on negative posts"\n• "Send weekly sales report via email every Monday morning"',
    timestamp: new Date()
  }]);
  const [generating, setGenerating] = useState(false);
  const [generatedTemplate, setGeneratedTemplate] = useState<GeneratedTemplate | null>(null);
  const [context, setContext] = useState<Partial<TemplateContext>>({
    userSkillLevel: 'intermediate',
    connectedApps: []
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleGenerate = async () => {
    if (!description.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: description,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setDescription('');
    setGenerating(true);

    try {
      // Generate template
      const template = await aiTemplateGenerator.generateTemplate(
        userMessage.content,
        context as TemplateContext
      );

      // Add assistant response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Great! I've created a template called "${template.name}" with ${template.nodes.length} nodes.\n\n**Quality Score:** ${template.qualityScore}/100\n**Category:** ${template.category}\n**Tags:** ${template.tags.join(', ')}\n\nWould you like to customize it or use it as-is?`,
        template,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setGeneratedTemplate(template);

      logger.info('Template generated successfully', {
        name: template.name,
        nodesCount: template.nodes.length
      });

    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I couldn't generate that template. ${error instanceof Error ? error.message : 'Please try rephrasing your request.'}`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      logger.error('Template generation failed', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleRefine = async (feedback: string) => {
    if (!generatedTemplate || !feedback.trim()) return;

    setGenerating(true);

    try {
      const refinedTemplate = await aiTemplateGenerator.refineTemplate(
        generatedTemplate,
        feedback
      );

      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `I've updated the template based on your feedback. It now has ${refinedTemplate.nodes.length} nodes with a quality score of ${refinedTemplate.qualityScore}/100.`,
        template: refinedTemplate,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setGeneratedTemplate(refinedTemplate);

    } catch (error) {
      logger.error('Template refinement failed', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleCustomize = () => {
    if (!generatedTemplate) return;

    // Start customization session
    const session = templateCustomizer.startCustomization(generatedTemplate);

    const assistantMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Let's customize this template! ${session.conversation[0].content}`,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, assistantMessage]);
  };

  const handleUseTemplate = () => {
    if (!generatedTemplate) return;

    // In production, would save template and redirect to workflow editor
    logger.info('Using template', { name: generatedTemplate.name });

    const assistantMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Perfect! Opening the workflow editor with your template...`,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, assistantMessage]);

    // Simulate redirect
    setTimeout(() => {
      toast.success(`Template "${generatedTemplate.name}" is ready to use!`);
    }, 500);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">AI Template Builder</h1>
        <p className="text-sm text-gray-600 mt-1">
          Describe your workflow in natural language and I'll generate a template for you
        </p>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl rounded-lg px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-900 border border-gray-200'
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>

              {/* Template Preview */}
              {message.template && (
                <div className="mt-4 p-4 bg-gray-50 rounded border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Template Preview</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Nodes:</span>{' '}
                      {message.template.nodes.map(n => n.data.label).join(' → ')}
                    </div>
                    <div>
                      <span className="font-medium">Documentation:</span>{' '}
                      {message.template.documentation.overview.substring(0, 150)}...
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={handleCustomize}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Customize
                    </button>
                    <button
                      onClick={handleUseTemplate}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                    >
                      Use Template
                    </button>
                  </div>
                </div>
              )}

              <div className="text-xs mt-2 opacity-70">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {generating && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-gray-600">Generating template...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          {/* Context Options */}
          <div className="mb-3 flex gap-4 text-sm">
            <select
              value={context.userSkillLevel}
              onChange={(e) => setContext(prev => ({
                ...prev,
                userSkillLevel: e.target.value as any
              }))}
              className="px-3 py-1 border border-gray-300 rounded-md"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>

            <input
              type="text"
              placeholder="Connected apps (comma-separated)"
              value={context.connectedApps?.join(', ')}
              onChange={(e) => setContext(prev => ({
                ...prev,
                connectedApps: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
              }))}
              className="flex-1 px-3 py-1 border border-gray-300 rounded-md"
            />
          </div>

          {/* Message Input */}
          <div className="flex gap-2">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              placeholder="Describe your workflow... (e.g., 'Process Shopify orders and send confirmation emails')"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              disabled={generating}
            />
            <button
              onClick={handleGenerate}
              disabled={generating || !description.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? 'Generating...' : 'Generate'}
            </button>
          </div>

          {/* Quick Examples */}
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-sm text-gray-500">Examples:</span>
            {[
              'Send daily sales report via Slack',
              'Monitor website uptime and alert on error',
              'Sync contacts from Salesforce to database'
            ].map((example, i) => (
              <button
                key={i}
                onClick={() => setDescription(example)}
                className="text-sm text-blue-600 hover:underline"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AITemplateBuilder;
