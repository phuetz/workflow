import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle, ArrowDown, Bot, Check, CheckCircle, Eye,
  Lightbulb, Link, Loader, MessageSquare, Play, Plus,
  Send, Settings, X
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import { logger } from '../../services/SimpleLogger';
import {
  conversationalWorkflowService,
  ConversationContext,
  ConversationMessage,
  MessageAction,
  // ClarificationRequest,
  // WorkflowSuggestion,
  WorkflowDraft
} from '../../services/ConversationalWorkflowService';

interface ConversationalWorkflowBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkflowCreated?: (workflow: unknown) => void;
}

export default function ConversationalWorkflowBuilder({ isOpen, onClose, onWorkflowCreated }: ConversationalWorkflowBuilderProps) {
  const { darkMode } = useWorkflowStore();
  const [conversationContext, setConversationContext] = useState<ConversationContext | null>(null);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [selectedAction, setSelectedAction] = useState<MessageAction | null>(null);
  const [showWorkflowPreview, setShowWorkflowPreview] = useState(false);
  const [workflowDraft, setWorkflowDraft] = useState<WorkflowDraft | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [conversationContext?.conversationHistory]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const startConversation = async (message: string) => {
    setIsLoading(true);
    try {
      // Use a default userId for now - in production, get from auth context
      const userId = 'current-user';
      const context = await conversationalWorkflowService.startConversation(userId, message);
      setConversationContext(context);
      setWorkflowDraft(context.workflowDraft);

      // Process the initial message
      const response = await conversationalWorkflowService.processMessage(context.sessionId, message);
      setConversationContext(response.context);
      setWorkflowDraft(response.context.workflowDraft);
    } catch (error) {
      logger.error('Failed to start conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    const message = currentMessage;
    if (!currentMessage.trim() || isLoading) return;

    setCurrentMessage('');
    setIsLoading(true);

    try {
      if (!conversationContext) {
        await startConversation(message);
      } else {
        const response = await conversationalWorkflowService.processMessage(conversationContext.sessionId, message);
        setConversationContext(response.context);
        setWorkflowDraft(response.context.workflowDraft);
      }
    } catch (error) {
      logger.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const executeAction = async (action: MessageAction) => {
    if (!conversationContext || isLoading) return;

    setIsLoading(true);
    setSelectedAction(action);

    try {
      const result = await conversationalWorkflowService.executeAction(
        conversationContext.sessionId,
        action.type,
        action.data
      );

      if (result.success) {
        action.executed = true;
        setWorkflowDraft(result.updatedWorkflow);

        // If this was a preview action, show the preview
        if (action.type === 'preview_workflow') {
          setShowWorkflowPreview(true);
        }
      }
    } catch (error) {
      logger.error('Failed to execute action:', error);
    } finally {
      setIsLoading(false);
      setSelectedAction(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getProgress = (): number => {
    if (!conversationContext) return 0;
    return conversationContext.currentStep.progress;
  };

  const formatTimestamp = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageActions = (message: ConversationMessage): MessageAction[] => {
    return message.metadata?.actions || [];
  };

  const getContextualSuggestions = (): string[] => {
    if (!conversationContext) {
      return [
        "Create a workflow to process emails",
        "Send notifications when files are uploaded",
        "Schedule daily reports",
        "Connect Google Sheets to Slack"
      ];
    }

    switch (conversationContext.currentStep.type) {
      case 'intent_recognition':
        return [
          "I want to automate email processing",
          "Create a data synchronization workflow",
          "Set up scheduled notifications",
          "Build an API integration"
        ];
      case 'entity_extraction':
        return [
          "Yes, that's correct",
          "I also need error handling",
          "Add email notifications",
          "Make it run daily"
        ];
      case 'workflow_design':
        return [
          "Looks good, continue",
          "Add more conditions",
          "I need different triggers",
          "Show me the preview"
        ];
      default:
        return [
          "Continue with this setup",
          "I need to modify something",
          "This looks perfect",
          "Start over"
        ];
    }
  };

  const renderMessage = (message: ConversationMessage) => {
    const isUser = message.role === 'user';
    const actions = getMessageActions(message);

    return (
      <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
          <div className={`flex items-start space-x-2 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              isUser
                ? 'bg-blue-500 text-white'
                : 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
            }`}>
              {isUser ? 'U' : '🤖'}
            </div>
            <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
              <div className={`rounded-lg px-4 py-2 max-w-full break-words ${
                isUser
                  ? darkMode
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-500 text-white'
                  : darkMode
                    ? 'bg-gray-700 text-gray-100'
                    : 'bg-gray-100 text-gray-900'
              }`}>
                {/* Render message content with markdown-like formatting */}
                <div className="whitespace-pre-wrap">
                  {message.content.split('\n').map((line, index) => {
                    // Bold text
                    if (line.includes('**')) {
                      const parts = line.split('**');
                      return (
                        <div key={index}>
                          {parts.map((part, i) =>
                            i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                          )}
                        </div>
                      );
                    }
                    // List items
                    if (line.trim().match(/^[\d•🔄⚡🔗-]/u)) {
                      return <div key={index} className="ml-2">{line}</div>;
                    }
                    return <div key={index}>{line}</div>;
                  })}
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {formatTimestamp(message.timestamp)}
                {message.metadata?.confidence && (
                  <span className="ml-2">
                    ({Math.round(message.metadata.confidence * 100)}% confident)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          {actions.length > 0 && (
            <div className={`mt-2 space-y-2 ${isUser ? 'mr-10' : 'ml-10'}`}>
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => executeAction(action)}
                  disabled={action.executed || isLoading}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    action.executed
                      ? 'bg-green-100 text-green-700 cursor-not-allowed'
                      : darkMode
                        ? 'bg-gray-600 text-white hover:bg-gray-500'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  } ${selectedAction?.type === action.type && isLoading ? 'animate-pulse' : ''}`}
                >
                  <div className="flex items-center space-x-2">
                    {action.executed ? (
                      <Check size={14} />
                    ) : action.type === 'create_node' ? (
                      <Plus size={14} />
                    ) : action.type === 'connect_nodes' ? (
                      <Link size={14} />
                    ) : action.type === 'configure_node' ? (
                      <Settings size={14} />
                    ) : action.type === 'preview_workflow' ? (
                      <Eye size={14} />
                    ) : (
                      <Play size={14} />
                    )}
                    <span>{action.label}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderProgressBar = () => {
    if (!conversationContext) return null;

    const { currentStep } = conversationContext;
    const progress = getProgress();

    return (
      <div className={`p-4 border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">{currentStep.name}</h3>
          <span className="text-sm text-gray-500">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{currentStep.description}</p>
      </div>
    );
  };

  const renderQuickReplies = () => {
    if (!showSuggestions || isLoading) return null;

    const suggestions = getContextualSuggestions();

    return (
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Quick suggestions:</p>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentMessage(suggestion);
                sendMessage();
              }}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                darkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderWorkflowPreview = () => {
    if (!showWorkflowPreview || !workflowDraft) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className={`w-full max-w-4xl max-h-[80vh] ${
          darkMode ? 'bg-gray-900' : 'bg-white'
        } rounded-xl shadow-2xl overflow-hidden`}>
          <div className={`px-6 py-4 border-b ${
            darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Workflow Preview</h3>
              <button
                onClick={() => setShowWorkflowPreview(false)}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 120px)' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Workflow Info */}
              <div>
                <h4 className="font-semibold mb-3">Workflow Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Name:</span>
                    <span className="font-medium">{workflowDraft.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Category:</span>
                    <span className="font-medium capitalize">{workflowDraft.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Triggers:</span>
                    <span className="font-medium">{workflowDraft.triggers.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Nodes:</span>
                    <span className="font-medium">{workflowDraft.nodes.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Connections:</span>
                    <span className="font-medium">{workflowDraft.connections.length}</span>
                  </div>
                </div>
              </div>

              {/* Performance Estimates */}
              <div>
                <h4 className="font-semibold mb-3">Performance Estimates</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Execution Time:</span>
                    <span className="font-medium">{workflowDraft.preview.estimatedExecutionTime}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Estimated Cost:</span>
                    <span className="font-medium">${workflowDraft.preview.estimatedCost.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">CPU Usage:</span>
                    <span className="font-medium">{workflowDraft.preview.resourceUsage.cpu}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Memory:</span>
                    <span className="font-medium">{workflowDraft.preview.resourceUsage.memory}MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">API Calls:</span>
                    <span className="font-medium">{workflowDraft.preview.resourceUsage.apiCalls}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Workflow Structure */}
            <div className="mt-6">
              <h4 className="font-semibold mb-3">Workflow Structure</h4>
              <div className="space-y-3">
                {/* Triggers */}
                {workflowDraft.triggers.map((trigger) => (
                  <div key={trigger.id} className="flex items-center space-x-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      T
                    </div>
                    <div>
                      <p className="font-medium text-blue-700 dark:text-blue-300">{trigger.name}</p>
                      <p className="text-sm text-blue-600 dark:text-blue-400 capitalize">{trigger.type}</p>
                    </div>
                  </div>
                ))}

                {/* Flow arrow */}
                {workflowDraft.triggers.length > 0 && workflowDraft.nodes.length > 0 && (
                  <div className="flex justify-center">
                    <ArrowDown className="text-gray-400" size={20} />
                  </div>
                )}

                {/* Nodes */}
                {workflowDraft.nodes.map((node, index) => (
                  <div key={node.id} className="flex items-center space-x-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-green-700 dark:text-green-300">{node.name}</p>
                      <p className="text-sm text-green-600 dark:text-green-400 capitalize">{node.type.replace('_', ' ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Validation Results */}
            {workflowDraft.validation && (
              <div className="mt-6">
                <h4 className="font-semibold mb-3">Validation Results</h4>
                <div className={`p-3 rounded-lg ${
                  workflowDraft.validation.isValid
                    ? 'bg-green-50 dark:bg-green-900/20'
                    : 'bg-red-50 dark:bg-red-900/20'
                }`}>
                  <div className="flex items-center space-x-2 mb-2">
                    {workflowDraft.validation.isValid ? (
                      <CheckCircle className="text-green-500" size={20} />
                    ) : (
                      <AlertTriangle className="text-red-500" size={20} />
                    )}
                    <span className={`font-medium ${
                      workflowDraft.validation.isValid
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-red-700 dark:text-red-300'
                    }`}>
                      {workflowDraft.validation.isValid ? 'Validation Passed' : 'Validation Issues Found'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Completeness: {workflowDraft.validation.completeness}%
                  </p>

                  {workflowDraft.validation.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">Errors:</p>
                      <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                        {workflowDraft.validation.errors.map((error, index) => (
                          <li key={index}>• {error.message}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowWorkflowPreview(false)}
                className={`px-4 py-2 border rounded-lg transition-colors ${
                  darkMode
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Close
              </button>
              {workflowDraft.validation.isValid && (
                <button
                  onClick={() => {
                    if (onWorkflowCreated) {
                      onWorkflowCreated(workflowDraft);
                    }
                    setShowWorkflowPreview(false);
                    onClose();
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Create Workflow
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
        <div className={`w-full max-w-4xl h-[90vh] ${
          darkMode ? 'bg-gray-900' : 'bg-white'
        } rounded-xl shadow-2xl overflow-hidden flex flex-col`}>
          {/* Header */}
          <div className={`px-6 py-4 border-b ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <MessageSquare className="text-white" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Conversational Workflow Builder</h2>
                  <p className="text-sm text-gray-500">Describe what you want to automate, and I'll build it for you</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          {renderProgressBar()}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6">
            {!conversationContext ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bot className="text-white" size={32} />
                </div>
                <h3 className="text-lg font-semibold mb-2">Hi! I'm your workflow assistant</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                  Tell me what you want to automate, and I'll help you build a workflow step by step.
                  You can describe it in plain English!
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                  {[
                    "Send me an email whenever a new file is uploaded to Dropbox",
                    "Create a daily report from Google Sheets and post it to Slack",
                    "When I receive an email with attachments, save them to Google Drive",
                    "Process new customer signups and add them to our CRM"
                  ].map((example, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setCurrentMessage(example);
                        startConversation(example);
                      }}
                      className={`p-3 text-left rounded-lg border transition-colors ${
                        darkMode
                          ? 'border-gray-700 hover:bg-gray-800 text-gray-300'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="text-sm">{example}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {conversationContext.conversationHistory.map(renderMessage)}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <Bot className="text-white" size={16} />
                      </div>
                      <div className={`rounded-lg px-4 py-2 ${
                        darkMode ? 'bg-gray-700' : 'bg-gray-100'
                      }`}>
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Quick Replies */}
          {renderQuickReplies()}

          {/* Input */}
          <div className={`p-4 border-t ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-end space-x-3">
              <div className="flex-1">
                <textarea
                  ref={inputRef}
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Describe what you want to automate..."
                  className={`w-full px-4 py-3 rounded-lg border resize-none transition-colors ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                  rows={1}
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                  disabled={isLoading}
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={!currentMessage.trim() || isLoading}
                className="px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? (
                  <Loader className="animate-spin" size={20} />
                ) : (
                  <Send size={20} />
                )}
              </button>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
              <span>Press Enter to send, Shift+Enter for new line</span>
              {conversationContext && (
                <button
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <Lightbulb size={12} />
                  <span>{showSuggestions ? 'Hide' : 'Show'} suggestions</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Preview Modal */}
      {renderWorkflowPreview()}
    </>
  );
}
