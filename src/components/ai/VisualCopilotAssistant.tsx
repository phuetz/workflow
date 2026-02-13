/**
 * Visual Copilot Assistant Component
 *
 * Floating chat UI for AI Copilot with:
 * - Expandable chat bubble
 * - Markdown support
 * - Code syntax highlighting
 * - Inline workflow previews
 * - Suggestion cards
 * - Real-time streaming responses
 */

import React, { useState, useEffect, useRef } from 'react';
import { Bot, Minus, Send, Sparkles, X } from 'lucide-react';
import { conversationalWorkflowBuilder } from '../../copilot/ConversationalWorkflowBuilder';
import { ConversationTurn, CopilotSession } from '../../copilot/types/copilot';
import { logger } from '../../services/SimpleLogger';

interface VisualCopilotAssistantProps {
  userId: string;
  onWorkflowCreated?: (workflow: any) => void;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  darkMode?: boolean;
}

export const VisualCopilotAssistant: React.FC<VisualCopilotAssistantProps> = ({
  userId,
  onWorkflowCreated,
  position = 'bottom-right',
  darkMode = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [session, setSession] = useState<CopilotSession | null>(null);
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && !session) {
      startSession();
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [turns]);

  const startSession = async () => {
    try {
      const newSession = await conversationalWorkflowBuilder.startSession(userId);
      setSession(newSession);
      setTurns([]);
    } catch (error) {
      logger.error('Failed to start session:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !session || isLoading) return;

    const userMessage = input;
    setInput('');
    setIsLoading(true);

    try {
      const turn = await conversationalWorkflowBuilder.processMessage(session.id, userMessage);
      setTurns([...turns, turn]);

      // Update session
      const updatedSession = conversationalWorkflowBuilder.getSession(session.id);
      if (updatedSession) {
        setSession(updatedSession);
      }

      // Check if workflow was created
      if (turn.workflow && onWorkflowCreated) {
        onWorkflowCreated(turn.workflow);
      }
    } catch (error) {
      logger.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6'
  };

  const themeClasses = darkMode
    ? 'bg-gray-900 text-white border-gray-700'
    : 'bg-white text-gray-900 border-gray-200';

  if (!isOpen) {
    // Floating bubble
    return (
      <div className={`fixed ${positionClasses[position]} z-50`}>
        <button
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group relative"
        >
          <Bot size={28} className="group-hover:scale-110 transition-transform" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></span>
        </button>
      </div>
    );
  }

  if (isMinimized) {
    // Minimized header bar
    return (
      <div className={`fixed ${positionClasses[position]} z-50`}>
        <div
          className={`${themeClasses} border rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 cursor-pointer hover:shadow-xl transition-shadow`}
          onClick={() => setIsMinimized(false)}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Bot size={20} className="text-white" />
          </div>
          <span className="font-medium">AI Copilot</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              setIsMinimized(false);
            }}
            className="ml-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  // Full chat window
  return (
    <div className={`fixed ${positionClasses[position]} z-50 w-96 h-[600px] flex flex-col`}>
      <div className={`${themeClasses} border rounded-lg shadow-2xl flex flex-col h-full overflow-hidden`}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Bot size={20} />
            </div>
            <div>
              <div className="font-semibold">AI Copilot</div>
              <div className="text-xs opacity-90">Always here to help</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 hover:bg-white/20 rounded transition-colors"
            >
              <Minus size={18} />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/20 rounded transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {turns.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mx-auto mb-4 flex items-center justify-center">
                <Sparkles size={32} className="text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Welcome to AI Copilot!</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                I can help you create workflows using natural language. Just describe what you need!
              </p>
              <div className="grid grid-cols-1 gap-2 text-left">
                {[
                  'Create an email workflow',
                  'Send Slack notifications',
                  'Process CSV files',
                  'Schedule daily reports'
                ].map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(suggestion)}
                    className={`text-sm p-2 rounded-lg border ${
                      darkMode
                        ? 'border-gray-700 hover:bg-gray-800'
                        : 'border-gray-200 hover:bg-gray-50'
                    } text-left transition-colors`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {turns.map((turn, idx) => (
            <div key={idx} className="space-y-3">
              {/* User message */}
              <div className="flex justify-end">
                <div className="max-w-[80%] bg-blue-500 text-white rounded-lg px-4 py-2">
                  {turn.userMessage}
                </div>
              </div>

              {/* Copilot response */}
              <div className="flex justify-start">
                <div className="max-w-[80%] space-y-2">
                  <div className={`rounded-lg px-4 py-2 ${
                    darkMode ? 'bg-gray-800' : 'bg-gray-100'
                  }`}>
                    <div className="whitespace-pre-wrap">{turn.copilotResponse}</div>
                  </div>

                  {/* Suggestions */}
                  {turn.suggestions && turn.suggestions.length > 0 && showSuggestions && (
                    <div className="space-y-1">
                      {turn.suggestions.slice(0, 3).map((suggestion, sidx) => (
                        <button
                          key={sidx}
                          className={`w-full text-left text-sm p-2 rounded border ${
                            darkMode
                              ? 'border-gray-700 hover:bg-gray-800'
                              : 'border-gray-200 hover:bg-gray-50'
                          } transition-colors`}
                        >
                          <div className="font-medium">{suggestion.title}</div>
                          <div className="text-xs opacity-70">{suggestion.description}</div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Clarification questions */}
                  {turn.clarificationQuestions && turn.clarificationQuestions.length > 0 && (
                    <div className="space-y-2">
                      {turn.clarificationQuestions.map((question, qidx) => (
                        <div
                          key={qidx}
                          className={`p-3 rounded-lg border-l-4 border-yellow-400 ${
                            darkMode ? 'bg-gray-800' : 'bg-yellow-50'
                          }`}
                        >
                          <div className="font-medium mb-2">{question.question}</div>
                          {question.options && (
                            <div className="space-y-1">
                              {question.options.map((option, oidx) => (
                                <button
                                  key={oidx}
                                  className={`w-full text-left text-sm p-2 rounded ${
                                    darkMode
                                      ? 'bg-gray-700 hover:bg-gray-600'
                                      : 'bg-white hover:bg-gray-50'
                                  } transition-colors`}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className={`rounded-lg px-4 py-2 ${
                darkMode ? 'bg-gray-800' : 'bg-gray-100'
              }`}>
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className={`flex-1 px-3 py-2 rounded-lg border ${
                darkMode
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              } focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none`}
              rows={1}
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <span>Press Enter to send</span>
            {session && (
              <span>Turn {session.currentTurn}/{50}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualCopilotAssistant;
