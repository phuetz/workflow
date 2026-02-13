/**
 * New API Key Modal Component
 * Shows the newly created API key (one-time view)
 */

import React from 'react';
import { CheckCircle, Copy, AlertTriangle } from 'lucide-react';

interface NewAPIKeyModalProps {
  darkMode: boolean;
  apiKey: string;
  onClose: () => void;
  onCopy: (text: string) => void;
}

export function NewAPIKeyModal({
  darkMode,
  apiKey,
  onClose,
  onCopy
}: NewAPIKeyModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg w-full max-w-md`}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center space-x-3 mb-4">
            <CheckCircle className="text-green-500" size={24} />
            <h2
              className={`text-xl font-semibold ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}
            >
              API Key Created!
            </h2>
          </div>

          {/* Key Display */}
          <div
            className={`p-4 rounded-lg border-2 border-dashed ${
              darkMode ? 'border-gray-600 bg-gray-900' : 'border-gray-300 bg-gray-50'
            } mb-4`}
          >
            <p
              className={`text-sm mb-2 ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              Your API key (copy it now - you won't see it again):
            </p>
            <div className="flex items-center space-x-2">
              <code
                className={`flex-1 p-2 rounded text-sm font-mono ${
                  darkMode
                    ? 'bg-gray-800 text-green-400'
                    : 'bg-white text-green-600'
                } border`}
              >
                {apiKey}
              </code>
              <button
                onClick={() => onCopy(apiKey)}
                className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded transition-colors"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>

          {/* Warning */}
          <div
            className={`p-3 rounded-lg ${
              darkMode
                ? 'bg-yellow-900 border-yellow-700'
                : 'bg-yellow-50 border-yellow-200'
            } border mb-4`}
          >
            <div className="flex items-start space-x-2">
              <AlertTriangle
                className="text-yellow-500 flex-shrink-0 mt-0.5"
                size={16}
              />
              <p
                className={`text-sm ${
                  darkMode ? 'text-yellow-200' : 'text-yellow-800'
                }`}
              >
                Make sure to copy your API key now. You won't be able to see it
                again!
              </p>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-medium transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
