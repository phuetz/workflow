/**
 * ChatInput Component
 * Input area for chat with file upload and voice support
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { logger } from '../../services/SimpleLogger';

interface ChatInputProps {
  onSend: (message: string, files?: File[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  enableFileUpload?: boolean;
  enableVoiceInput?: boolean;
  acceptedFileTypes?: string[];
  maxFileSize?: number; // MB
  isLoading?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  placeholder = 'Type a message...',
  disabled = false,
  maxLength = 4000,
  enableFileUpload = true,
  enableVoiceInput = false,
  acceptedFileTypes = ['image/*', '.pdf', '.doc', '.docx', '.txt'],
  maxFileSize = 10,
  isLoading = false,
}) => {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  // Handle send
  const handleSend = useCallback(() => {
    if ((!message.trim() && files.length === 0) || disabled || isLoading) return;

    onSend(message.trim(), files.length > 0 ? files : undefined);
    setMessage('');
    setFiles([]);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [message, files, disabled, isLoading, onSend]);

  // Handle key press
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Handle file selection
  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const validFiles: File[] = [];
    const errors: string[] = [];

    Array.from(selectedFiles).forEach((file) => {
      // Check size
      if (file.size > maxFileSize * 1024 * 1024) {
        errors.push(`${file.name} exceeds ${maxFileSize}MB limit`);
        return;
      }

      // Check type
      const isAccepted = acceptedFileTypes.some((type) => {
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.replace('/*', '/'));
        }
        return file.type === type || file.name.toLowerCase().endsWith(type.toLowerCase());
      });

      if (!isAccepted) {
        errors.push(`${file.name} is not an accepted file type`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      // Could show a toast notification here
      logger.warn('File upload errors', { errors });
    }

    setFiles((prev) => [...prev, ...validFiles]);
  }, [maxFileSize, acceptedFileTypes]);

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  // Remove file
  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Handle voice input
  const toggleVoiceInput = useCallback(async () => {
    if (isRecording) {
      // Stop recording
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          // Here you would send to speech-to-text API
          // For now, just add as file
          const audioFile = new File([audioBlob], 'voice-message.webm', { type: 'audio/webm' });
          setFiles((prev) => [...prev, audioFile]);
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (error) {
        logger.error('Failed to start recording', { error });
      }
    }
  }, [isRecording]);

  const isDisabled = disabled || isLoading;

  return (
    <div
      className={`chat-input border-t border-gray-200 bg-white p-4 ${
        dragActive ? 'ring-2 ring-blue-500 ring-inset' : ''
      }`}
      onDrop={enableFileUpload ? handleDrop : undefined}
      onDragEnter={enableFileUpload ? handleDrag : undefined}
      onDragLeave={enableFileUpload ? handleDrag : undefined}
      onDragOver={enableFileUpload ? handleDrag : undefined}
    >
      {/* File Previews */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg group"
            >
              {file.type.startsWith('image/') ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="w-10 h-10 object-cover rounded"
                />
              ) : (
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              <span className="text-sm text-gray-700 max-w-[120px] truncate">{file.name}</span>
              <button
                onClick={() => removeFile(index)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-2">
        {/* File Upload Button */}
        {enableFileUpload && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={acceptedFileTypes.join(',')}
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isDisabled}
              className="p-2 text-gray-500 hover:text-blue-500 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Attach file"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
          </>
        )}

        {/* Voice Input Button */}
        {enableVoiceInput && (
          <button
            onClick={toggleVoiceInput}
            disabled={isDisabled}
            className={`p-2 rounded-lg transition-colors ${
              isRecording
                ? 'text-red-500 bg-red-100 animate-pulse'
                : 'text-gray-500 hover:text-blue-500 hover:bg-gray-100'
            } disabled:opacity-50`}
            title={isRecording ? 'Stop recording' : 'Voice input'}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
        )}

        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, maxLength))}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isDisabled}
            rows={1}
            className="w-full px-4 py-3 bg-gray-100 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors disabled:opacity-50"
            style={{ maxHeight: '200px' }}
          />
          {/* Character Count */}
          {message.length > maxLength * 0.8 && (
            <span className={`absolute bottom-1 right-3 text-xs ${
              message.length >= maxLength ? 'text-red-500' : 'text-gray-400'
            }`}>
              {message.length}/{maxLength}
            </span>
          )}
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={isDisabled || (!message.trim() && files.length === 0)}
          className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Send message"
        >
          {isLoading ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>

      {/* Drag Overlay */}
      {dragActive && enableFileUpload && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-10 flex items-center justify-center pointer-events-none">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <svg className="w-12 h-12 text-blue-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-gray-700 font-medium">Drop files here</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInput;
