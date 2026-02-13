import React from 'react';
import { Play, Zap } from 'lucide-react';
import { APIEndpoint, TestRequest, TestResponse } from './types';
import { logger } from '../../../services/SimpleLogger';

interface TestViewProps {
  darkMode: boolean;
  endpoints: APIEndpoint[];
  selectedEndpoint: APIEndpoint | null;
  testRequest: TestRequest;
  testResponse: TestResponse | null;
  isTestRunning: boolean;
  onSelectEndpoint: (endpoint: APIEndpoint | null) => void;
  onUpdateRequest: (field: keyof TestRequest, value: string) => void;
  onRunTest: () => void;
}

export function TestView({
  darkMode,
  endpoints,
  selectedEndpoint,
  testRequest,
  testResponse,
  isTestRunning,
  onSelectEndpoint,
  onUpdateRequest,
  onRunTest
}: TestViewProps) {
  const handleJsonInput = (field: keyof TestRequest, value: string, maxSize: number) => {
    if (value.length <= maxSize) {
      if (value.trim() && value.trim() !== '{}') {
        try {
          JSON.parse(value);
        } catch (parseError) {
          logger.warn(`Invalid JSON in ${field}:`, parseError);
        }
      }
      onUpdateRequest(field, value);
    }
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'bg-green-100 text-green-800';
    if (status >= 400) return 'bg-red-100 text-red-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const formatResponseBody = (body: unknown): string => {
    try {
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
      return bodyStr.length > 10000
        ? bodyStr.substring(0, 10000) + '\n\n... (response truncated for security)'
        : bodyStr;
    } catch {
      return 'Unable to display response body';
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">API Testing</h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Panel */}
        <div className={`p-4 rounded-lg ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        } border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h4 className="font-medium mb-4">Request</h4>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Endpoint</label>
              <select
                value={selectedEndpoint?.id || ''}
                onChange={(e) => {
                  const endpoint = endpoints.find(ep => ep.id === e.target.value);
                  onSelectEndpoint(endpoint || null);
                }}
                className={`w-full px-3 py-2 border rounded-lg ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-200 text-gray-900'
                }`}
              >
                <option value="">Select an endpoint</option>
                {endpoints.map((endpoint) => (
                  <option key={endpoint.id} value={endpoint.id}>
                    {endpoint.method} {endpoint.path} - {endpoint.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedEndpoint && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Headers (JSON)</label>
                  <textarea
                    value={testRequest.headers}
                    onChange={(e) => handleJsonInput('headers', e.target.value, 5000)}
                    className={`w-full px-3 py-2 border rounded-lg font-mono text-sm ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-200 text-gray-900'
                    }`}
                    rows={3}
                    placeholder='{"Authorization": "Bearer token"}'
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Query Parameters (JSON)</label>
                  <textarea
                    value={testRequest.query}
                    onChange={(e) => handleJsonInput('query', e.target.value, 2000)}
                    className={`w-full px-3 py-2 border rounded-lg font-mono text-sm ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-200 text-gray-900'
                    }`}
                    rows={3}
                    placeholder='{"limit": 10, "offset": 0}'
                  />
                </div>

                {selectedEndpoint.method !== 'GET' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Body (JSON)</label>
                    <textarea
                      value={testRequest.body}
                      onChange={(e) => handleJsonInput('body', e.target.value, 10000)}
                      className={`w-full px-3 py-2 border rounded-lg font-mono text-sm ${
                        darkMode
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-200 text-gray-900'
                      }`}
                      rows={6}
                      placeholder='{"name": "John Doe", "email": "john@example.com"}'
                    />
                  </div>
                )}

                <button
                  onClick={onRunTest}
                  disabled={isTestRunning}
                  className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isTestRunning ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Running Test...</span>
                    </>
                  ) : (
                    <>
                      <Play size={16} />
                      <span>Send Request</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Response Panel */}
        <div className={`p-4 rounded-lg ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        } border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h4 className="font-medium mb-4">Response</h4>

          {testResponse ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Status:</span>
                <span className={`px-2 py-1 rounded text-xs ${getStatusColor(testResponse.status)}`}>
                  {testResponse.status}
                </span>
                {testResponse.responseTime && (
                  <span className="text-sm text-gray-500">
                    ({testResponse.responseTime}ms)
                  </span>
                )}
              </div>

              {testResponse.headers && (
                <div>
                  <label className="block text-sm font-medium mb-2">Headers</label>
                  <pre className={`p-3 rounded border text-xs font-mono overflow-auto ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-gray-50 border-gray-200 text-gray-900'
                  }`}>
                    {JSON.stringify(testResponse.headers, null, 2).substring(0, 2000)}
                  </pre>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Body</label>
                <pre className={`p-3 rounded border text-xs font-mono overflow-auto ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-gray-50 border-gray-200 text-gray-900'
                }`} style={{ maxHeight: '300px' }}>
                  {formatResponseBody(testResponse.body || testResponse.error)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Zap size={48} className="mx-auto mb-3 opacity-50" />
              <p>Send a request to see the response</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
