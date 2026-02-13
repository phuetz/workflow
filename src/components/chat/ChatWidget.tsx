/**
 * ChatWidget Component
 * Embeddable chat widget with floating button
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ChatInterface } from './ChatInterface';
import type { ChatTriggerConfig, ChatWidgetConfig, ChatFeedback } from '@/types/chat';

interface ChatWidgetProps {
  config: ChatTriggerConfig;
  widgetConfig?: Partial<ChatWidgetConfig>;
  onSessionStart?: (sessionId: string) => void;
  onSessionEnd?: () => void;
  onFeedback?: (feedback: ChatFeedback) => void;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  config,
  widgetConfig = {},
  onSessionStart,
  onSessionEnd,
  onFeedback,
}) => {
  const [isOpen, setIsOpen] = useState(widgetConfig.autoOpen || false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const position = widgetConfig.position || config.style.position || 'bottom-right';
  const buttonText = widgetConfig.buttonText || 'Chat with us';

  // Auto-open after delay
  useEffect(() => {
    if (widgetConfig.autoOpen && widgetConfig.openDelay) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, widgetConfig.openDelay);
      return () => clearTimeout(timer);
    }
  }, [widgetConfig.autoOpen, widgetConfig.openDelay]);

  // Toggle chat
  const toggleChat = useCallback(() => {
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      setHasNewMessage(false);
      setUnreadCount(0);
    }
  }, [isOpen]);

  // Close chat
  const closeChat = useCallback(() => {
    setIsOpen(false);
    onSessionEnd?.();
  }, [onSessionEnd]);

  // Position classes
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'center': 'bottom-1/2 right-1/2 transform translate-x-1/2 translate-y-1/2',
  }[position];

  // Size classes
  const sizeClasses = {
    small: 'w-80 h-96',
    medium: 'w-96 h-[500px]',
    large: 'w-[450px] h-[600px]',
    fullscreen: 'w-full h-full fixed inset-0',
  }[config.style.size || 'medium'];

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div
          className={`fixed z-50 ${
            config.style.size === 'fullscreen'
              ? 'inset-0'
              : `${positionClasses} ${sizeClasses}`
          }`}
          style={{
            fontFamily: config.style.fontFamily,
          }}
        >
          <div className="relative w-full h-full">
            {/* Close Button (if not fullscreen) */}
            {config.style.size !== 'fullscreen' && (
              <button
                onClick={closeChat}
                className="absolute -top-3 -right-3 z-10 w-8 h-8 bg-gray-800 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            <ChatInterface
              config={config}
              onSessionStart={onSessionStart}
              onSessionEnd={onSessionEnd}
              onFeedback={onFeedback}
              embedded
            />
          </div>
        </div>
      )}

      {/* Floating Button */}
      {!isOpen && config.style.size !== 'fullscreen' && (
        <button
          onClick={toggleChat}
          className={`fixed z-50 ${positionClasses} flex items-center gap-2 px-5 py-3 rounded-full shadow-lg transition-all hover:scale-105`}
          style={{
            backgroundColor: config.style.primaryColor,
            fontFamily: config.style.fontFamily,
          }}
        >
          {/* Logo or Icon */}
          {config.style.logoUrl ? (
            <img src={config.style.logoUrl} alt="" className="w-6 h-6" />
          ) : (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          )}

          {/* Button Text */}
          <span className="text-white font-medium">{buttonText}</span>

          {/* Unread Badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}

          {/* New Message Pulse */}
          {hasNewMessage && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
          )}
        </button>
      )}

      {/* Fullscreen Close Button */}
      {isOpen && config.style.size === 'fullscreen' && (
        <button
          onClick={closeChat}
          className="fixed top-4 right-4 z-[60] p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </>
  );
};

export default ChatWidget;
