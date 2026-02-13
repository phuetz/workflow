/**
 * Conversation Panel
 * Displays conversation history between user and AI
 */

import React, { useRef, useEffect } from 'react';
import { User, Bot, AlertCircle, Sparkles } from 'lucide-react';
import { ConversationContext } from '../../types/nlp';

interface ConversationPanelProps {
  conversation: ConversationContext;
}

export const ConversationPanel: React.FC<ConversationPanelProps> = ({ conversation }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.messages]);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {conversation.messages.map((message, index) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              </div>
            )}

            <div
              className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {/* Message Content */}
              <div className="text-sm whitespace-pre-wrap break-words">
                {message.content}
              </div>

              {/* Intent Badge */}
              {message.intent && message.role === 'assistant' && (
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <Sparkles className="w-3 h-3" />
                    <span>
                      Intent: {message.intent.type} •
                      Confidence: {Math.round(message.intent.confidence * 100)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Workflow Preview Info */}
              {message.workflowPreview && (
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Workflow:</span>
                      <span>
                        {message.workflowPreview.nodes.length} nodes,{' '}
                        {message.workflowPreview.edges.length} connections
                      </span>
                    </div>
                    {message.workflowPreview.warnings && message.workflowPreview.warnings.length > 0 && (
                      <div className="flex items-start gap-1 mt-1 text-amber-600 dark:text-amber-400">
                        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>{message.workflowPreview.warnings[0]}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <div className={`text-xs mt-2 ${
                message.role === 'user' ? 'text-indigo-200' : 'text-slate-400'
              }`}>
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>

            {message.role === 'user' && (
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center">
                  <User className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Empty State */}
        {conversation.messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Start Creating Your Workflow
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md">
              Describe your workflow in plain English and I'll help you build it.
              Try starting with "Every morning..." or "When webhook received..."
            </p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
