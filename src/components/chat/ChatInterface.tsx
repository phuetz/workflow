/**
 * ChatInterface Component
 * Main chat interface with message history and streaming support
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import type {
  ChatMessage as ChatMessageType,
  ChatTriggerConfig,
  ChatSession,
  ChatWebSocketMessage,
  ChatFeedback,
} from '@/types/chat';
import { logger } from '../../services/SimpleLogger';

interface ChatInterfaceProps {
  config: ChatTriggerConfig;
  sessionId?: string;
  onSessionStart?: (sessionId: string) => void;
  onSessionEnd?: () => void;
  onFeedback?: (feedback: ChatFeedback) => void;
  className?: string;
  embedded?: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  config,
  sessionId: initialSessionId,
  onSessionStart,
  onSessionEnd,
  onFeedback,
  className = '',
  embedded = false,
}) => {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string>(initialSessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize WebSocket connection
  useEffect(() => {
    const connect = () => {
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/chat/${config.workflowId}/${sessionIdRef.current}`;

      try {
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setIsConnected(true);
          setError(null);

          // Send connect message
          ws.send(JSON.stringify({
            type: 'connect',
            sessionId: sessionIdRef.current,
            data: { config: config.id },
            timestamp: new Date(),
          }));

          onSessionStart?.(sessionIdRef.current);
        };

        ws.onmessage = (event) => {
          try {
            const message: ChatWebSocketMessage = JSON.parse(event.data);
            handleWebSocketMessage(message);
          } catch (e) {
            logger.error('Failed to parse WebSocket message', { error: e });
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          // Attempt reconnect after 3 seconds
          setTimeout(connect, 3000);
        };

        ws.onerror = (error) => {
          logger.error('WebSocket error', { error });
          setError('Connection error. Retrying...');
        };

        wsRef.current = ws;
      } catch (e) {
        logger.error('Failed to create WebSocket', { error: e });
        setError('Failed to connect to chat server');
      }
    };

    // For demo, use HTTP fallback if WebSocket not available
    if (typeof WebSocket !== 'undefined') {
      connect();
    } else {
      setIsConnected(true); // Fake connection for HTTP fallback
    }

    return () => {
      wsRef.current?.close();
    };
  }, [config.workflowId, config.id, onSessionStart]);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((message: ChatWebSocketMessage) => {
    switch (message.type) {
      case 'stream_start':
        // Add placeholder message for streaming
        setMessages((prev) => [
          ...prev,
          {
            id: `msg_${Date.now()}`,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            isStreaming: true,
          },
        ]);
        setIsTyping(false);
        break;

      case 'stream_chunk':
        // Append to last assistant message
        setMessages((prev) => {
          const lastIndex = prev.length - 1;
          if (lastIndex >= 0 && prev[lastIndex].isStreaming) {
            const updated = [...prev];
            updated[lastIndex] = {
              ...updated[lastIndex],
              content: updated[lastIndex].content + (message.data as string),
            };
            return updated;
          }
          return prev;
        });
        break;

      case 'stream_end':
        // Finalize streaming message
        setMessages((prev) => {
          const lastIndex = prev.length - 1;
          if (lastIndex >= 0 && prev[lastIndex].isStreaming) {
            const updated = [...prev];
            updated[lastIndex] = {
              ...updated[lastIndex],
              isStreaming: false,
              metadata: message.data as ChatMessageType['metadata'],
            };
            return updated;
          }
          return prev;
        });
        setIsLoading(false);
        break;

      case 'typing_start':
        setIsTyping(true);
        break;

      case 'typing_end':
        setIsTyping(false);
        break;

      case 'tool_start':
        // Update last message with tool call
        setMessages((prev) => {
          const lastIndex = prev.length - 1;
          if (lastIndex >= 0) {
            const updated = [...prev];
            const toolCalls = updated[lastIndex].metadata?.toolCalls || [];
            updated[lastIndex] = {
              ...updated[lastIndex],
              metadata: {
                ...updated[lastIndex].metadata,
                toolCalls: [
                  ...toolCalls,
                  {
                    id: (message.data as { id: string }).id,
                    name: (message.data as { name: string }).name,
                    arguments: (message.data as { arguments: Record<string, unknown> }).arguments,
                    status: 'running',
                  },
                ],
              },
            };
            return updated;
          }
          return prev;
        });
        break;

      case 'tool_end':
        // Update tool call status
        setMessages((prev) => {
          const lastIndex = prev.length - 1;
          if (lastIndex >= 0 && prev[lastIndex].metadata?.toolCalls) {
            const updated = [...prev];
            const toolCalls = updated[lastIndex].metadata!.toolCalls!.map((tc) =>
              tc.id === (message.data as { id: string }).id
                ? { ...tc, status: 'completed' as const, result: (message.data as { result: unknown }).result }
                : tc
            );
            updated[lastIndex] = {
              ...updated[lastIndex],
              metadata: {
                ...updated[lastIndex].metadata,
                toolCalls,
              },
            };
            return updated;
          }
          return prev;
        });
        break;

      case 'error':
        setError(message.data as string);
        setIsLoading(false);
        setIsTyping(false);
        break;
    }
  }, []);

  // Send message
  const sendMessage = useCallback(async (content: string, files?: File[]) => {
    if (!content.trim() && (!files || files.length === 0)) return;

    // Add user message
    const userMessage: ChatMessageType = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
      attachments: files?.map((file) => ({
        id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: file.type.startsWith('image/') ? 'image' : 'file',
        name: file.name,
        size: file.size,
        mimeType: file.type,
        url: URL.createObjectURL(file),
      })),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    // Send via WebSocket
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        sessionId: sessionIdRef.current,
        data: {
          content,
          attachments: userMessage.attachments,
        },
        timestamp: new Date(),
      }));
    } else {
      // HTTP fallback
      try {
        const response = await fetch(`/api/chat/${config.workflowId}/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            content,
            attachments: userMessage.attachments,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        const data = await response.json();

        // Add assistant response
        setMessages((prev) => [
          ...prev,
          {
            id: data.id,
            role: 'assistant',
            content: data.content,
            timestamp: new Date(),
            metadata: data.metadata,
          },
        ]);
      } catch (e) {
        setError('Failed to send message. Please try again.');
        logger.error('Chat error', { error: e });
      } finally {
        setIsLoading(false);
      }
    }
  }, [config.workflowId]);

  // Handle feedback
  const handleFeedback = useCallback((messageId: string, rating: 'positive' | 'negative') => {
    const feedback: ChatFeedback = {
      messageId,
      sessionId: sessionIdRef.current,
      rating,
      timestamp: new Date(),
    };
    onFeedback?.(feedback);

    // Send via WebSocket
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'feedback',
        sessionId: sessionIdRef.current,
        data: feedback,
        timestamp: new Date(),
      }));
    }
  }, [onFeedback]);

  // Add welcome message on mount
  useEffect(() => {
    if (config.welcomeMessage && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: config.welcomeMessage,
          timestamp: new Date(),
        },
      ]);
    }
  }, [config.welcomeMessage, messages.length]);

  // Custom styles
  const customStyles = useMemo(() => ({
    '--chat-primary': config.style.primaryColor,
    '--chat-bg': config.style.backgroundColor,
    '--chat-font': config.style.fontFamily,
    '--chat-radius': config.style.borderRadius,
  } as React.CSSProperties), [config.style]);

  return (
    <div
      className={`chat-interface flex flex-col ${embedded ? 'h-full' : 'h-[600px]'} bg-white rounded-lg shadow-xl overflow-hidden ${className}`}
      style={customStyles}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ backgroundColor: config.style.primaryColor }}
      >
        <div className="flex items-center gap-3">
          {config.style.avatarUrl ? (
            <img
              src={config.style.avatarUrl}
              alt="Assistant"
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-white font-bold">
              AI
            </div>
          )}
          <div>
            <h2 className="text-white font-semibold">{config.title}</h2>
            {config.subtitle && (
              <p className="text-white text-sm opacity-80">{config.subtitle}</p>
            )}
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-white text-sm opacity-80">
            {isConnected ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4" style={{ backgroundColor: config.style.backgroundColor }}>
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            avatarUrl={config.style.avatarUrl}
            assistantName={config.title}
            showFeedback={config.features.feedback}
            onFeedback={(rating) => handleFeedback(message.id, rating)}
          />
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-center gap-2 px-4 py-2">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm text-gray-500">Typing...</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mx-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        placeholder={config.placeholderText}
        disabled={!isConnected}
        maxLength={config.limits.maxMessageLength}
        enableFileUpload={config.features.fileUpload}
        enableVoiceInput={config.features.voiceInput}
        maxFileSize={config.limits.maxFileSize}
        isLoading={isLoading}
      />
    </div>
  );
};

export default ChatInterface;
