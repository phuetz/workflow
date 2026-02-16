/**
 * AI Copilot - Chatbot-First Interface
 * Natural language interaction for workflow automation (2025 UX trend)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageCircle, X, Send, Sparkles, Zap, ChevronDown,
  Workflow, Plus, Play, Settings, HelpCircle, Lightbulb,
  ArrowRight, Loader2, Bot, User, Copy, ThumbsUp, ThumbsDown,
  Maximize2, Minimize2, Mic, MicOff
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  actions?: CopilotAction[];
  isStreaming?: boolean;
}

interface CopilotAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  variant?: 'primary' | 'secondary';
}

interface AICopilotProps {
  onAction?: (action: string, params?: Record<string, unknown>) => void;
  isOpen?: boolean;
  onToggle?: () => void;
}

// ============================================================================
// Quick Suggestions
// ============================================================================

const quickSuggestions = [
  { icon: <Plus className="w-4 h-4" />, text: "Create a new workflow", query: "Create a new workflow for me" },
  { icon: <Zap className="w-4 h-4" />, text: "Automate email notifications", query: "Help me automate email notifications when a form is submitted" },
  { icon: <Workflow className="w-4 h-4" />, text: "Connect to Slack", query: "How do I connect my workflow to Slack?" },
  { icon: <HelpCircle className="w-4 h-4" />, text: "Debug my workflow", query: "My workflow is failing, help me debug it" },
];

// ============================================================================
// AI Response via Backend LLM Service
// ============================================================================

const CHAT_API_BASE = '/api/chat';

let chatSessionId: string | null = null;

const getAIResponse = async (query: string): Promise<{ content: string; actions?: CopilotAction[] }> => {
  try {
    // Create session on first message
    if (!chatSessionId) {
      const sessionRes = await fetch(`${CHAT_API_BASE}/copilot/session/main`, { method: 'POST' });
      if (sessionRes.ok) {
        const session = await sessionRes.json();
        chatSessionId = session.id || 'main';
      }
    }

    const response = await fetch(`${CHAT_API_BASE}/copilot/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: query,
        sessionId: chatSessionId,
        context: { type: 'copilot' },
      }),
    });

    if (!response.ok) {
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content || data.message || 'I could not generate a response.';

    // Parse action suggestions from AI response
    const actions = parseActionsFromResponse(content, query);

    return { content, actions };
  } catch (error) {
    // Fallback to basic pattern matching if backend is unavailable
    return getLocalFallbackResponse(query);
  }
};

function parseActionsFromResponse(content: string, query: string): CopilotAction[] | undefined {
  const queryLower = query.toLowerCase();
  if (queryLower.includes('create') && queryLower.includes('workflow')) {
    return [
      { id: 'blank', label: 'Start from scratch', icon: <Plus className="w-4 h-4" />, action: () => {}, variant: 'primary' },
      { id: 'template', label: 'Use a template', icon: <Workflow className="w-4 h-4" />, action: () => {}, variant: 'secondary' },
    ];
  }
  if (queryLower.includes('debug') || queryLower.includes('error') || queryLower.includes('failing')) {
    return [
      { id: 'diagnose', label: 'Run diagnostics', icon: <Play className="w-4 h-4" />, action: () => {}, variant: 'primary' },
    ];
  }
  return undefined;
}

function getLocalFallbackResponse(query: string): { content: string } {
  return {
    content: "I'm currently unable to connect to the AI service. Here are some things I can help with:\n\n" +
      "- Creating workflows: Use the + button or templates\n" +
      "- Debugging: Check the execution logs panel\n" +
      "- Integrations: Browse the node panel on the left\n\n" +
      "Please check that the backend is running and an AI API key is configured.",
  };
}

// ============================================================================
// Message Component
// ============================================================================

const MessageBubble: React.FC<{
  message: Message;
  onActionClick?: (action: CopilotAction) => void;
}> = ({ message, onActionClick }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} animate-fade-in-up`}>
      {/* Avatar */}
      <div
        className={`
          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
          ${isUser
            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
            : 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white'
          }
        `}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Content */}
      <div className={`flex-1 max-w-[85%] ${isUser ? 'text-right' : ''}`}>
        <div
          className={`
            inline-block px-4 py-3 rounded-2xl text-sm
            ${isUser
              ? 'bg-primary-600 text-white rounded-br-md'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md'
            }
          `}
        >
          {message.isStreaming ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          ) : (
            <div className="whitespace-pre-wrap">{message.content}</div>
          )}
        </div>

        {/* Actions */}
        {message.actions && message.actions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {message.actions.map(action => (
              <button
                key={action.id}
                onClick={() => onActionClick?.(action)}
                className={`
                  inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                  transition-all duration-200 hover:scale-105
                  ${action.variant === 'primary'
                    ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-500/20'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }
                `}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Message actions */}
        {!isUser && !message.isStreaming && (
          <div className="flex items-center gap-2 mt-2 opacity-0 hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Copy"
            >
              {copied ? <ThumbsUp className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button className="p-1 text-gray-400 hover:text-green-500" title="Helpful">
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button className="p-1 text-gray-400 hover:text-red-500" title="Not helpful">
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Timestamp */}
        <div className={`text-xs text-gray-400 mt-1 ${isUser ? 'text-right' : ''}`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const AICopilot: React.FC<AICopilotProps> = ({
  onAction,
  isOpen: controlledIsOpen,
  onToggle,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm your AI Copilot. I can help you build workflows, debug issues, and answer questions. What would you like to do today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isOpen = controlledIsOpen ?? internalIsOpen;
  const toggleOpen = onToggle ?? (() => setInternalIsOpen(prev => !prev));

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = useCallback(async (e?: React.FormEvent, customQuery?: string) => {
    e?.preventDefault();
    const query = customQuery || input.trim();
    if (!query || isLoading) return;

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Add streaming placeholder
    const streamingId = `assistant-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: streamingId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    }]);

    try {
      const response = await getAIResponse(query);

      // Replace streaming message with actual response
      setMessages(prev => prev.map(m =>
        m.id === streamingId
          ? { ...m, content: response.content, actions: response.actions, isStreaming: false }
          : m
      ));
    } catch (error) {
      setMessages(prev => prev.map(m =>
        m.id === streamingId
          ? { ...m, content: "Sorry, I encountered an error. Please try again.", isStreaming: false }
          : m
      ));
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading]);

  const handleSuggestionClick = (query: string) => {
    handleSubmit(undefined, query);
  };

  const handleActionClick = (action: CopilotAction) => {
    action.action();
    onAction?.(action.id);
  };

  if (!isOpen) {
    return (
      <button
        onClick={toggleOpen}
        className="fixed bottom-6 right-6 z-50 group"
        aria-label="Open AI Copilot"
      >
        <div className="relative">
          {/* Pulse ring */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full animate-ping opacity-25" />

          {/* Button */}
          <div className="relative w-14 h-14 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transition-all duration-300 hover:scale-110">
            <Sparkles className="w-6 h-6" />
          </div>

          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            AI Copilot
            <div className="absolute top-full right-4 border-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      </button>
    );
  }

  return (
    <div
      className={`
        fixed z-50 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl
        border border-gray-200 dark:border-gray-700
        flex flex-col overflow-hidden
        transition-all duration-300 ease-out
        ${isExpanded
          ? 'bottom-4 right-4 left-4 top-4 md:left-auto md:w-[600px]'
          : 'bottom-6 right-6 w-[380px] h-[600px]'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold">AI Copilot</h3>
            <p className="text-xs text-white/70">Powered by Claude</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label={isExpanded ? 'Minimize' : 'Expand'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={toggleOpen}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <MessageBubble
            key={message.id}
            message={message}
            onActionClick={handleActionClick}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick suggestions */}
      {messages.length === 1 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
            <Lightbulb className="w-3 h-3" />
            Quick suggestions
          </p>
          <div className="grid grid-cols-2 gap-2">
            {quickSuggestions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionClick(suggestion.query)}
                className="flex items-center gap-2 p-2.5 text-left text-sm bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group"
              >
                <div className="text-primary-500 group-hover:scale-110 transition-transform">
                  {suggestion.icon}
                </div>
                <span className="text-gray-700 dark:text-gray-300 truncate">{suggestion.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              disabled={isLoading}
              className="w-full px-4 py-3 pr-12 bg-gray-100 dark:bg-gray-800 border-0 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Voice input (coming soon)"
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center mt-2">
          Press Enter to send • AI may make mistakes
        </p>
      </form>
    </div>
  );
};

export default AICopilot;
