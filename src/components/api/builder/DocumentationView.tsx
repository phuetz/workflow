import React, { useState } from 'react';
import { APIGateway } from './types';

interface DocumentationViewProps {
  darkMode: boolean;
  gateways: APIGateway[];
}

type CodeLanguage = 'javascript' | 'python' | 'curl' | 'php';

export function DocumentationView({ darkMode, gateways }: DocumentationViewProps) {
  const [selectedGateway, setSelectedGateway] = useState<APIGateway | null>(
    gateways.length > 0 ? gateways[0] : null
  );
  const [codeLanguage, setCodeLanguage] = useState<CodeLanguage>('javascript');

  const generateClientCode = (gateway: APIGateway | null, language: CodeLanguage): string => {
    if (!gateway) return '';
    return `// ${language.toUpperCase()} client code for ${gateway.name}\n// Generated code would appear here`;
  };

  const generateOpenAPISpec = (gateway: APIGateway | null) => {
    if (!gateway) return null;
    return {
      openapi: '3.0.0',
      info: {
        title: gateway.name,
        version: gateway.version || '1.0.0',
        description: gateway.description || ''
      },
      paths: {}
    };
  };

  const clientCode = generateClientCode(selectedGateway, codeLanguage);
  const openAPISpec = generateOpenAPISpec(selectedGateway);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">API Documentation</h3>
        <div className="flex items-center space-x-2">
          <select
            value={selectedGateway?.id || ''}
            onChange={(e) => {
              const gateway = gateways.find(g => g.id === e.target.value);
              setSelectedGateway(gateway || null);
            }}
            className={`px-3 py-2 border rounded-lg ${
              darkMode
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-200 text-gray-900'
            }`}
          >
            {gateways.map((gateway) => (
              <option key={gateway.id} value={gateway.id}>
                {gateway.name}
              </option>
            ))}
          </select>
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            Export OpenAPI
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* OpenAPI Spec */}
        <div className={`p-4 rounded-lg ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        } border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h4 className="font-medium mb-4">OpenAPI Specification</h4>
          <pre className={`p-3 rounded border text-xs font-mono overflow-auto ${
            darkMode
              ? 'bg-gray-700 border-gray-600 text-white'
              : 'bg-gray-50 border-gray-200 text-gray-900'
          }`} style={{ height: '400px' }}>
            {openAPISpec
              ? JSON.stringify(openAPISpec, null, 2)
              : 'Select a gateway to view specification'}
          </pre>
        </div>

        {/* Client Code */}
        <div className={`p-4 rounded-lg ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        } border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium">Client Code</h4>
            <select
              value={codeLanguage}
              onChange={(e) => setCodeLanguage(e.target.value as CodeLanguage)}
              className={`px-3 py-2 border rounded ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-200 text-gray-900'
              }`}
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="curl">cURL</option>
              <option value="php">PHP</option>
            </select>
          </div>
          <pre className={`p-3 rounded border text-xs font-mono overflow-auto ${
            darkMode
              ? 'bg-gray-700 border-gray-600 text-white'
              : 'bg-gray-50 border-gray-200 text-gray-900'
          }`} style={{ height: '400px' }}>
            {clientCode || 'Select a gateway to generate client code'}
          </pre>
        </div>
      </div>
    </div>
  );
}
