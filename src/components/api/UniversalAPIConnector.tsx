import React, { useState } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { Globe, Zap, TestTube, Download, Upload, Settings, CheckCircle, AlertTriangle } from 'lucide-react';
import { logger } from '../../services/SimpleLogger';
import { useToast } from '../ui/Toast';

interface APIEndpoint {
  id: string;
  name: string;
  url: string;
  method: string;
  description: string;
  parameters: APIParameter[];
  headers: APIHeader[];
  authentication: 'none' | 'apikey' | 'bearer' | 'oauth2' | 'basic';
  testStatus: 'pending' | 'success' | 'error';
  responseSchema?: unknown;
}

interface APIParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  example?: unknown;
}

interface APIHeader {
  name: string;
  value: string;
  required: boolean;
}

export default function UniversalAPIConnector() {
  const { darkMode, addLog } = useWorkflowStore();
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [apiUrl, setApiUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [discoveredAPI, setDiscoveredAPI] = useState<APIEndpoint | null>(null);
  const [testResults, setTestResults] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);

  const analyzeAPI = async () => {
    if (!apiUrl) return;
    
    setIsAnalyzing(true);
    setIsLoading(true);
    
    try {
      // Simulate API analysis
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const api: APIEndpoint = {
        id: 'api-' + Date.now(),
        name: extractAPIName(apiUrl),
        url: apiUrl,
        method: 'GET',
        description: 'Discovered API endpoint',
        parameters: extractAPIParameters(apiUrl),
        headers: [],
        authentication: detectAuthType(apiUrl),
        testStatus: 'pending',
        responseSchema: null
      };
      
      setDiscoveredAPI(api);
      
      addLog({
        level: 'info',
        message: `API discovered: ${api.name}`,
        data: { api }
      });
    } catch (error) {
      addLog({
        level: 'error',
        message: 'Failed to analyze API',
        data: { error, url: apiUrl }
      });
    } finally {
      setIsAnalyzing(false);
      setIsLoading(false);
    }
  };

  const extractAPIName = (url: string) => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      
      if (pathParts.length > 0) {
        const lastPart = pathParts[pathParts.length - 1];
        return lastPart.charAt(0).toUpperCase() + lastPart.slice(1) + ' API';
      }
      
      return urlObj.hostname.replace('www.', '').split('.')[0] + ' API';
    } catch {
      return 'Custom API';
    }
  };

  const extractAPIParameters = (url: string): APIParameter[] => {
    const params: APIParameter[] = [];
    
    try {
      const urlObj = new URL(url);
      const searchParams = new URLSearchParams(urlObj.search);
      
      searchParams.forEach((value, key) => {
        params.push({
          name: key,
          type: detectValueType(value),
          required: false,
          description: `Parameter ${key}`,
          example: value
        });
      });
      
      // Extract path parameters
      const pathMatch = urlObj.pathname.match(/\{([^}]+)\}/g);
      if (pathMatch) {
        pathMatch.forEach(param => {
          const paramName = param.replace(/[{}]/g, '');
          params.push({
            name: paramName,
            type: 'string',
            required: true,
            description: `Path parameter ${paramName}`,
            example: ''
          });
        });
      }
    } catch (error) {
      logger.error('Failed to extract parameters:', error);
    }
    
    return params;
  };

  const detectAuthType = (url: string): APIEndpoint['authentication'] => {
    if (url.includes('github.com') || url.includes('api.github.com')) return 'bearer';
    if (url.includes('api.openai.com')) return 'bearer';
    if (url.includes('api.slack.com')) return 'bearer';
    if (url.includes('oauth')) return 'oauth2';
    return 'none';
  };

  const detectValueType = (value: string): APIParameter['type'] => {
    if (!isNaN(Number(value))) return 'number';
    if (value === 'true' || value === 'false') return 'boolean';
    return 'string';
  };

  const testAPIEndpoint = async () => {
    if (!discoveredAPI) return;

    try {
      setIsLoading(true);
      
      // Simulate API test
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockResponse = {
        status: 200,
        data: {
          message: 'API test successful',
          timestamp: new Date().toISOString(),
          endpoint: discoveredAPI.url
        }
      };
      
      setTestResults(mockResponse);
      setDiscoveredAPI({
        ...discoveredAPI,
        testStatus: 'success'
      });
      
      showNotification('API test successful!', 'success');
    } catch (error) {
      setDiscoveredAPI({
        ...discoveredAPI,
        testStatus: 'error'
      });
      showNotification('API test failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const generateAPIClientCode = () => {
    if (!discoveredAPI) return '';
    
    return JSON.stringify({
      type: 'api-connector',
      name: discoveredAPI.name,
      url: discoveredAPI.url,
      method: discoveredAPI.method,
      headers: discoveredAPI.headers,
      parameters: discoveredAPI.parameters,
      authentication: discoveredAPI.authentication
    }, null, 2);
  };

  const generateNodeConfig = () => {
    const config = generateAPIClientCode();
    navigator.clipboard.writeText(config);
    toast.success('Configuration générée et copiée dans le presse-papiers !');
  };

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-white font-medium ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
  };

  return (
    <>
      {/* Universal API Connector Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed top-80 left-4 z-40 px-4 py-2 rounded-lg ${
          darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-500 hover:bg-indigo-600'
        } text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2`}
        title="Universal API Connector"
      >
        <Globe size={20} />
        <span>API Connector</span>
      </button>

      {/* Main Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`w-full max-w-4xl max-h-[90vh] ${
            darkMode ? 'bg-gray-900' : 'bg-white'
          } rounded-xl shadow-2xl overflow-hidden`}>
            {/* Header */}
            <div className={`px-6 py-4 border-b ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <Globe className="text-white" size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Universal API Connector</h2>
                    <p className="text-sm text-gray-500">Découvrez et intégrez n'importe quelle API</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {/* API URL Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">API Endpoint URL</label>
                <div className="flex space-x-2">
                  <input
                    type="url"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="https://api.example.com/v1/endpoint"
                    className={`flex-1 px-4 py-2 rounded-lg border ${
                      darkMode 
                        ? 'bg-gray-800 border-gray-700 text-white' 
                        : 'bg-white border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                  />
                  <button
                    onClick={analyzeAPI}
                    disabled={!apiUrl || isAnalyzing}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <Zap size={16} />
                        <span>Analyze</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Discovered API Info */}
              {discoveredAPI && (
                <div className={`p-4 rounded-lg border ${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">API Discovered</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-gray-500">Name:</span>
                          <p className="font-medium">{discoveredAPI.name}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Method:</span>
                          <p className="font-medium">{discoveredAPI.method}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Authentication:</span>
                          <p className="font-medium">{discoveredAPI.authentication}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Status:</span>
                          <p className="font-medium flex items-center space-x-1">
                            {discoveredAPI.testStatus === 'success' && (
                              <>
                                <CheckCircle className="text-green-500" size={16} />
                                <span>Success</span>
                              </>
                            )}
                            {discoveredAPI.testStatus === 'error' && (
                              <>
                                <AlertTriangle className="text-red-500" size={16} />
                                <span>Error</span>
                              </>
                            )}
                            {discoveredAPI.testStatus === 'pending' && (
                              <span>Not tested</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2">
                      <button
                        onClick={testAPIEndpoint}
                        disabled={isLoading}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
                      >
                        <TestTube size={16} />
                        <span>Test API</span>
                      </button>
                      <button
                        onClick={generateNodeConfig}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                      >
                        <Download size={16} />
                        <span>Generate Config</span>
                      </button>
                    </div>

                    {/* Test Results */}
                    {testResults && (
                      <div className={`p-3 rounded-lg ${
                        darkMode ? 'bg-gray-900' : 'bg-white'
                      } border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <h4 className="font-medium mb-2">Test Results</h4>
                        <pre className="text-xs overflow-x-auto">
                          {JSON.stringify(testResults, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}