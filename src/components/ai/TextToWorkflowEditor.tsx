/**
 * Text-to-Workflow Editor
 * Main UI component for natural language workflow creation
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, RefreshCw, Check, AlertCircle, Loader2 } from 'lucide-react';
import { ConversationManager } from '../../nlp/ConversationManager';
import { TextToWorkflowResult } from '../../types/nlp';
import { ConversationPanel } from './ConversationPanel';
import { WorkflowPreview } from '../workflow/editor/WorkflowPreview';
import { useWorkflowStore } from '../../store/workflowStore';
import { logger } from '../../services/SimpleLogger';

export const TextToWorkflowEditor: React.FC = () => {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<TextToWorkflowResult | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const conversationManager = useRef(new ConversationManager());
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { setNodes, setEdges } = useWorkflowStore();

  // Start conversation on mount
  useEffect(() => {
    const id = conversationManager.current.startConversation();
    setConversationId(id);
  }, []);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /**
   * Handle user input submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || !conversationId || isProcessing) {
      return;
    }

    setIsProcessing(true);

    try {
      const response = await conversationManager.current.processMessage(
        conversationId,
        input
      );

      setResult(response);
      setInput('');

      // If workflow was successfully generated, show preview
      if (response.success && response.workflow) {
        setShowPreview(true);
      }

    } catch (error) {
      logger.error('Error processing message:', error);
      setResult({
        success: false,
        needsClarification: false,
        metrics: {
          intentRecognitionTime: 0,
          workflowGenerationTime: 0,
          totalProcessingTime: 0,
          entitiesExtracted: 0,
          confidence: 0
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Apply workflow to canvas
   */
  const applyWorkflow = () => {
    if (result?.workflow) {
      setNodes(result.workflow.nodes);
      setEdges(result.workflow.edges);
      setShowPreview(false);
      setResult(null);
    }
  };

  /**
   * Reset conversation
   */
  const resetConversation = () => {
    const id = conversationManager.current.startConversation();
    setConversationId(id);
    setResult(null);
    setShowPreview(false);
    setInput('');
  };

  /**
   * Handle quick example selection
   */
  const handleExampleClick = (example: string) => {
    setInput(example);
    inputRef.current?.focus();
  };

  // Example prompts
  const examples = [
    'Every morning at 9am, fetch top HN stories and send to Slack',
    'When webhook received, validate data, save to PostgreSQL, and notify team',
    'Hourly check database for new orders and send email notifications',
    'Monitor RSS feed, filter by keyword, summarize with AI, post to Discord',
    'Fetch weather data every 6 hours, format as report, send via email'
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="flex-none px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Text-to-Workflow
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Describe your workflow in plain English
              </p>
            </div>
          </div>

          <button
            onClick={resetConversation}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            New Conversation
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Input & Conversation */}
        <div className="flex-1 flex flex-col">
          {/* Examples */}
          {(!result || !result.conversation || result.conversation.messages.length === 0) && (
            <div className="flex-none px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                Try these examples:
              </h3>
              <div className="flex flex-wrap gap-2">
                {examples.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => handleExampleClick(example)}
                    className="px-3 py-2 text-xs text-left text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversation History */}
          {result?.conversation && (
            <div className="flex-1 overflow-y-auto">
              <ConversationPanel conversation={result.conversation} />
            </div>
          )}

          {/* Status Messages */}
          {result && (
            <div className="flex-none px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              {result.success && (
                <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-green-900 dark:text-green-100">
                      Workflow Created Successfully!
                    </h4>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      {result.workflow?.nodes.length} nodes created.
                      Confidence: {Math.round((result.metrics.confidence) * 100)}%
                    </p>
                    {result.workflow?.suggestions && result.workflow.suggestions.length > 0 && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                        💡 {result.workflow.suggestions[0]}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {result.error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-red-900 dark:text-red-100">
                      Error
                    </h4>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      {result.error}
                    </p>
                  </div>
                </div>
              )}

              {result.needsClarification && result.clarificationRequest && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-amber-900 dark:text-amber-100">
                      Need More Information
                    </h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      {result.clarificationRequest.question}
                    </p>
                    {result.clarificationRequest.suggestions && result.clarificationRequest.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {result.clarificationRequest.suggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleExampleClick(suggestion)}
                            className="px-3 py-1.5 text-xs font-medium text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900 rounded hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Input Form */}
          <div className="flex-none p-6 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder="Describe your workflow... (e.g., 'Every morning at 9am, fetch top HN stories and send to Slack')"
                  className="w-full px-4 py-3 pr-12 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 resize-none"
                  rows={3}
                  disabled={isProcessing}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isProcessing}
                  className="absolute bottom-3 right-3 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isProcessing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Press Enter to send, Shift+Enter for new line</span>
                {result?.metrics && (
                  <span>
                    Processing time: {result.metrics.totalProcessingTime}ms
                  </span>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Right Panel - Workflow Preview */}
        {showPreview && result?.workflow && (
          <div className="w-1/2 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <WorkflowPreview
              workflow={result.workflow}
              onApply={applyWorkflow}
              onClose={() => setShowPreview(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
