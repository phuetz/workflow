/**
 * ChatMessage Component
 * Renders individual chat messages with support for streaming
 */

import React, { useMemo } from 'react';
import type { ChatMessage as ChatMessageType, ChatAttachment } from '@/types/chat';

interface ChatMessageProps {
  message: ChatMessageType;
  avatarUrl?: string;
  userName?: string;
  assistantName?: string;
  onFeedback?: (rating: 'positive' | 'negative') => void;
  showFeedback?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  avatarUrl,
  userName = 'You',
  assistantName = 'Assistant',
  onFeedback,
  showFeedback = false,
}) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isStreaming = message.isStreaming;

  // Format timestamp
  const formattedTime = useMemo(() => {
    const date = new Date(message.timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [message.timestamp]);

  // Safe markdown-like content renderer (no dangerouslySetInnerHTML)
  const renderContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, i) => {
      // Code blocks
      if (line.startsWith('```')) {
        return null; // Handle in a more complex implementation
      }
      // Headers
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-lg font-bold mt-2 mb-1">{line.slice(4)}</h3>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-xl font-bold mt-3 mb-1">{line.slice(3)}</h2>;
      }
      if (line.startsWith('# ')) {
        return <h1 key={i} className="text-2xl font-bold mt-4 mb-2">{line.slice(2)}</h1>;
      }

      // Parse inline elements safely using React elements
      const parseInlineElements = (text: string): React.ReactNode[] => {
        const elements: React.ReactNode[] = [];
        let remaining = text;
        let keyCounter = 0;

        while (remaining.length > 0) {
          // Check for bold **text**
          const boldMatch = remaining.match(/^\*\*(.*?)\*\*/);
          if (boldMatch) {
            elements.push(<strong key={`bold-${keyCounter++}`}>{boldMatch[1]}</strong>);
            remaining = remaining.slice(boldMatch[0].length);
            continue;
          }

          // Check for inline code `code`
          const codeMatch = remaining.match(/^`(.*?)`/);
          if (codeMatch) {
            elements.push(
              <code key={`code-${keyCounter++}`} className="bg-gray-100 px-1 rounded text-sm">
                {codeMatch[1]}
              </code>
            );
            remaining = remaining.slice(codeMatch[0].length);
            continue;
          }

          // Check for links [text](url)
          const linkMatch = remaining.match(/^\[(.*?)\]\((.*?)\)/);
          if (linkMatch) {
            // Validate URL to prevent javascript: protocol
            const url = linkMatch[2];
            const isValidUrl = url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/');
            elements.push(
              <a
                key={`link-${keyCounter++}`}
                href={isValidUrl ? url : '#'}
                className="text-blue-500 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {linkMatch[1]}
              </a>
            );
            remaining = remaining.slice(linkMatch[0].length);
            continue;
          }

          // Find next special character or end of string
          const nextSpecial = remaining.search(/\*\*|`|\[/);
          if (nextSpecial === -1) {
            elements.push(remaining);
            break;
          } else if (nextSpecial === 0) {
            // Special char at start but didn't match - consume one char
            elements.push(remaining[0]);
            remaining = remaining.slice(1);
          } else {
            elements.push(remaining.slice(0, nextSpecial));
            remaining = remaining.slice(nextSpecial);
          }
        }

        return elements;
      };

      const parsedContent = parseInlineElements(line);

      return (
        <p key={i} className={line.trim() ? 'mb-2' : 'mb-4'}>
          {parsedContent.length > 0 ? parsedContent : '\u00A0'}
        </p>
      );
    });
  };

  // Render attachments
  const renderAttachments = (attachments: ChatAttachment[]) => {
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg"
          >
            {attachment.type === 'image' ? (
              <img
                src={attachment.thumbnailUrl || attachment.url}
                alt={attachment.name}
                className="w-16 h-16 object-cover rounded"
              />
            ) : (
              <>
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-700">{attachment.name}</p>
                  <p className="text-xs text-gray-500">
                    {(attachment.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    );
  };

  // System message
  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-600">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} max-w-[80%]`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 ${isUser ? 'ml-3' : 'mr-3'}`}>
          {isUser ? (
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {userName[0]?.toUpperCase()}
            </div>
          ) : (
            avatarUrl ? (
              <img src={avatarUrl} alt={assistantName} className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                AI
              </div>
            )
          )}
        </div>

        {/* Message Content */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          {/* Name and Time */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-gray-700">
              {isUser ? userName : assistantName}
            </span>
            <span className="text-xs text-gray-400">{formattedTime}</span>
          </div>

          {/* Message Bubble */}
          <div
            className={`px-4 py-3 rounded-2xl ${
              isUser
                ? 'bg-blue-500 text-white rounded-br-md'
                : 'bg-gray-100 text-gray-800 rounded-bl-md'
            }`}
          >
            {message.error ? (
              <div className="flex items-center text-red-500">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {message.error}
              </div>
            ) : (
              <div className="prose prose-sm max-w-none">
                {renderContent(message.content)}
                {isStreaming && (
                  <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
                )}
              </div>
            )}

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              renderAttachments(message.attachments)
            )}

            {/* Tool Calls */}
            {message.metadata?.toolCalls && message.metadata.toolCalls.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">Tools used:</p>
                <div className="space-y-1">
                  {message.metadata.toolCalls.map((tool) => (
                    <div
                      key={tool.id}
                      className="flex items-center gap-2 text-xs"
                    >
                      <span className={`w-2 h-2 rounded-full ${
                        tool.status === 'completed' ? 'bg-green-500' :
                        tool.status === 'failed' ? 'bg-red-500' :
                        tool.status === 'running' ? 'bg-yellow-500 animate-pulse' :
                        'bg-gray-400'
                      }`} />
                      <span className="font-mono">{tool.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Metadata */}
          {message.metadata && !isUser && (
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
              {message.metadata.model && (
                <span>{message.metadata.model}</span>
              )}
              {message.metadata.tokens && (
                <span>{message.metadata.tokens.output} tokens</span>
              )}
              {message.metadata.latency && (
                <span>{(message.metadata.latency / 1000).toFixed(2)}s</span>
              )}
            </div>
          )}

          {/* Feedback Buttons */}
          {showFeedback && !isUser && onFeedback && !isStreaming && (
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => onFeedback('positive')}
                className="p-1 text-gray-400 hover:text-green-500 transition-colors"
                title="Good response"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
              </button>
              <button
                onClick={() => onFeedback('negative')}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                title="Bad response"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
