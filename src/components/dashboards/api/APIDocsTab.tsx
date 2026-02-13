/**
 * API Documentation Tab Component
 * Displays API documentation, endpoints, and quick start guide
 */

import React from 'react';
import { Download, Copy } from 'lucide-react';
import type { APIEndpoint } from '../../../types/api';
import { getMethodBadgeClass } from './useAPIMetrics';

interface APIDocsTabProps {
  darkMode: boolean;
  endpoints: APIEndpoint[];
  onCopy: (text: string) => void;
  onDownloadSpec: () => void;
}

export function APIDocsTab({
  darkMode,
  endpoints,
  onCopy,
  onDownloadSpec
}: APIDocsTabProps) {
  const generateCurlCommand = (example: any) => {
    if (!example) return '';

    const headers = Object.entries(example.request.headers || {})
      .map(([key, value]) => `-H "${key}: ${value}"`)
      .join(' ');

    const body = example.request.body
      ? `-d '${JSON.stringify(example.request.body, null, 2)}'`
      : '';

    return `curl -X ${example.request.method} \\
  ${headers} \\
  ${body} \\
  "${window.location.origin}${example.request.url}"`;
  };

  return (
    <div className="space-y-6">
      {/* Quick Start */}
      <QuickStartSection darkMode={darkMode} />

      {/* Endpoints */}
      <EndpointsSection
        darkMode={darkMode}
        endpoints={endpoints}
        onCopy={onCopy}
        generateCurlCommand={generateCurlCommand}
      />

      {/* OpenAPI Spec */}
      <OpenAPISection darkMode={darkMode} onDownloadSpec={onDownloadSpec} />
    </div>
  );
}

interface QuickStartSectionProps {
  darkMode: boolean;
}

function QuickStartSection({ darkMode }: QuickStartSectionProps) {
  return (
    <div
      className={`${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } rounded-lg border p-6`}
    >
      <h2
        className={`text-xl font-semibold mb-4 ${
          darkMode ? 'text-white' : 'text-gray-900'
        }`}
      >
        Quick Start
      </h2>
      <div className="space-y-4">
        <div>
          <h3
            className={`font-medium mb-2 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}
          >
            1. Create an API Key
          </h3>
          <p
            className={`text-sm ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            Click "Create API Key" above to generate a new key with the required
            permissions.
          </p>
        </div>
        <div>
          <h3
            className={`font-medium mb-2 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}
          >
            2. Authenticate Your Requests
          </h3>
          <div className={`${darkMode ? 'bg-gray-900' : 'bg-gray-50'} rounded p-3`}>
            <code className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Authorization: Bearer your_api_key_here
            </code>
          </div>
        </div>
        <div>
          <h3
            className={`font-medium mb-2 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}
          >
            3. Make Your First Request
          </h3>
          <div className={`${darkMode ? 'bg-gray-900' : 'bg-gray-50'} rounded p-3`}>
            <pre
              className={`text-sm ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              } overflow-x-auto`}
            >
              {`curl -X GET \\
  -H "Authorization: Bearer your_api_key_here" \\
  -H "Content-Type: application/json" \\
  "${window.location.origin}/api/v1/workflows"`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

interface EndpointsSectionProps {
  darkMode: boolean;
  endpoints: APIEndpoint[];
  onCopy: (text: string) => void;
  generateCurlCommand: (example: any) => string;
}

function EndpointsSection({
  darkMode,
  endpoints,
  onCopy,
  generateCurlCommand
}: EndpointsSectionProps) {
  return (
    <div
      className={`${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } rounded-lg border p-6`}
    >
      <h2
        className={`text-xl font-semibold mb-4 ${
          darkMode ? 'text-white' : 'text-gray-900'
        }`}
      >
        API Endpoints
      </h2>
      <div className="space-y-4">
        {endpoints.map((endpoint, index) => (
          <EndpointCard
            key={index}
            endpoint={endpoint}
            darkMode={darkMode}
            onCopy={onCopy}
            generateCurlCommand={generateCurlCommand}
          />
        ))}
      </div>
    </div>
  );
}

interface EndpointCardProps {
  endpoint: APIEndpoint;
  darkMode: boolean;
  onCopy: (text: string) => void;
  generateCurlCommand: (example: any) => string;
}

function EndpointCard({
  endpoint,
  darkMode,
  onCopy,
  generateCurlCommand
}: EndpointCardProps) {
  return (
    <div className={`${darkMode ? 'bg-gray-900' : 'bg-gray-50'} rounded-lg p-4`}>
      <div className="flex items-center space-x-3 mb-3">
        <span
          className={`px-2 py-1 text-xs font-mono rounded ${getMethodBadgeClass(
            endpoint.method
          )}`}
        >
          {endpoint.method}
        </span>
        <code className={`font-mono ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          {endpoint.path}
        </code>
      </div>
      <p className={`text-sm mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        {endpoint.description}
      </p>

      {endpoint.examples.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4
              className={`text-sm font-medium ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Example Request
            </h4>
            <button
              onClick={() => onCopy(generateCurlCommand(endpoint.examples[0]))}
              className={`text-xs px-2 py-1 rounded ${
                darkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              } transition-colors`}
            >
              Copy cURL
            </button>
          </div>
          <div
            className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded p-3 border`}
          >
            <pre
              className={`text-xs ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              } overflow-x-auto`}
            >
              {generateCurlCommand(endpoint.examples[0])}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

interface OpenAPISectionProps {
  darkMode: boolean;
  onDownloadSpec: () => void;
}

function OpenAPISection({ darkMode, onDownloadSpec }: OpenAPISectionProps) {
  return (
    <div
      className={`${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } rounded-lg border p-6`}
    >
      <h2
        className={`text-xl font-semibold mb-4 ${
          darkMode ? 'text-white' : 'text-gray-900'
        }`}
      >
        OpenAPI Specification
      </h2>
      <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        Download our OpenAPI specification to generate client libraries or import
        into API testing tools.
      </p>
      <button
        onClick={onDownloadSpec}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
      >
        <Download size={16} />
        <span>Download OpenAPI Spec</span>
      </button>
    </div>
  );
}
