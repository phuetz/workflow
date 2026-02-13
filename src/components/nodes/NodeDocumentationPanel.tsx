/**
 * Node Documentation Panel
 * Built-in documentation for each node type (like n8n)
 */

import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  X,
  ExternalLink,
  Code,
  Copy,
  CheckCircle,
  AlertCircle,
  Info,
  Zap,
  Settings,
  ChevronDown,
  ChevronRight,
  Search,
  Lightbulb,
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';

interface NodeDocumentationPanelProps {
  nodeType: string;
  isOpen: boolean;
  onClose: () => void;
}

interface NodeDocumentation {
  name: string;
  category: string;
  description: string;
  version: string;
  inputs: ParameterDoc[];
  outputs: OutputDoc[];
  examples: ExampleDoc[];
  tips: string[];
  relatedNodes: string[];
  externalDocs?: string;
}

interface ParameterDoc {
  name: string;
  type: string;
  required: boolean;
  default?: string;
  description: string;
  options?: string[];
}

interface OutputDoc {
  name: string;
  type: string;
  description: string;
}

interface ExampleDoc {
  title: string;
  description: string;
  code: string;
}

// Mock documentation data - in production would come from a documentation service
const getNodeDocumentation = (nodeType: string): NodeDocumentation => {
  const docs: Record<string, NodeDocumentation> = {
    'http-request': {
      name: 'HTTP Request',
      category: 'Core',
      description: 'Make HTTP requests to any URL. Supports GET, POST, PUT, PATCH, DELETE methods with authentication, headers, and body configuration.',
      version: '2.0',
      inputs: [
        { name: 'method', type: 'string', required: true, default: 'GET', description: 'HTTP method to use', options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
        { name: 'url', type: 'string', required: true, description: 'The URL to send the request to. Supports expressions.' },
        { name: 'authentication', type: 'string', required: false, default: 'none', description: 'Authentication type', options: ['none', 'basic', 'bearer', 'oauth2', 'apiKey'] },
        { name: 'headers', type: 'object', required: false, description: 'Custom headers to send with the request' },
        { name: 'body', type: 'any', required: false, description: 'Request body (for POST, PUT, PATCH)' },
        { name: 'timeout', type: 'number', required: false, default: '30000', description: 'Request timeout in milliseconds' },
      ],
      outputs: [
        { name: 'json', type: 'object', description: 'Parsed JSON response' },
        { name: 'binary', type: 'Buffer', description: 'Binary response data' },
        { name: 'headers', type: 'object', description: 'Response headers' },
        { name: 'statusCode', type: 'number', description: 'HTTP status code' },
      ],
      examples: [
        {
          title: 'Simple GET Request',
          description: 'Fetch data from an API endpoint',
          code: '{\n  "method": "GET",\n  "url": "https://api.example.com/users"\n}',
        },
        {
          title: 'POST with JSON Body',
          description: 'Send JSON data to an API',
          code: '{\n  "method": "POST",\n  "url": "https://api.example.com/users",\n  "body": {\n    "name": "{{ $json.name }}",\n    "email": "{{ $json.email }}"\n  }\n}',
        },
      ],
      tips: [
        'Use expressions like {{ $json.field }} to reference data from previous nodes',
        'Enable "Continue on Fail" to handle errors gracefully',
        'Use the retry option for unreliable APIs',
      ],
      relatedNodes: ['Webhook', 'GraphQL', 'REST API'],
      externalDocs: 'https://docs.n8n.io/nodes/http-request',
    },
    'webhook': {
      name: 'Webhook',
      category: 'Trigger',
      description: 'Receive data sent to a webhook URL. Can listen for various HTTP methods and parse different content types.',
      version: '1.0',
      inputs: [
        { name: 'httpMethod', type: 'string', required: true, default: 'POST', description: 'HTTP method to listen for', options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
        { name: 'path', type: 'string', required: true, description: 'Webhook path (appended to base URL)' },
        { name: 'responseMode', type: 'string', required: false, default: 'onReceived', description: 'When to send response', options: ['onReceived', 'lastNode'] },
        { name: 'authentication', type: 'string', required: false, default: 'none', description: 'Authentication required for webhook' },
      ],
      outputs: [
        { name: 'body', type: 'object', description: 'Request body' },
        { name: 'headers', type: 'object', description: 'Request headers' },
        { name: 'query', type: 'object', description: 'Query parameters' },
      ],
      examples: [
        {
          title: 'Basic Webhook',
          description: 'Listen for POST requests',
          code: '{\n  "httpMethod": "POST",\n  "path": "/my-webhook"\n}',
        },
      ],
      tips: [
        'The webhook URL is displayed after activating the workflow',
        'Use authentication to secure your webhook',
        'Test with tools like curl or Postman',
      ],
      relatedNodes: ['HTTP Request', 'Respond to Webhook'],
    },
  };

  return docs[nodeType] || {
    name: nodeType,
    category: 'General',
    description: 'Documentation not available for this node type.',
    version: '1.0',
    inputs: [],
    outputs: [],
    examples: [],
    tips: [],
    relatedNodes: [],
  };
};

const NodeDocumentationPanel: React.FC<NodeDocumentationPanelProps> = ({
  nodeType,
  isOpen,
  onClose,
}) => {
  const [activeSection, setActiveSection] = useState<'overview' | 'parameters' | 'examples'>('overview');
  const [expandedParams, setExpandedParams] = useState<Set<string>>(new Set());
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const doc = useMemo(() => getNodeDocumentation(nodeType), [nodeType]);

  // Filter parameters based on search
  const filteredInputs = useMemo(() => {
    if (!searchTerm) return doc.inputs;
    return doc.inputs.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [doc.inputs, searchTerm]);

  // Toggle parameter expansion
  const toggleParam = (name: string) => {
    const newExpanded = new Set(expandedParams);
    if (newExpanded.has(name)) {
      newExpanded.delete(name);
    } else {
      newExpanded.add(name);
    }
    setExpandedParams(newExpanded);
  };

  // Copy code to clipboard
  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-16 bottom-8 w-[420px] bg-white shadow-2xl border-l border-gray-200 z-40 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <BookOpen size={20} className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{doc.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                {doc.category}
              </span>
              <span className="text-xs text-gray-500">v{doc.version}</span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <X size={18} className="text-gray-500" />
        </button>
      </div>

      {/* Section tabs */}
      <div className="flex border-b border-gray-200">
        {(['overview', 'parameters', 'examples'] as const).map(section => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeSection === section
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {section.charAt(0).toUpperCase() + section.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeSection === 'overview' && (
          <div className="p-4 space-y-4">
            {/* Description */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Info size={14} className="text-blue-500" />
                Description
              </h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                {doc.description}
              </p>
            </div>

            {/* Outputs */}
            {doc.outputs.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Zap size={14} className="text-amber-500" />
                  Output
                </h4>
                <div className="space-y-2">
                  {doc.outputs.map(output => (
                    <div
                      key={output.name}
                      className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg text-sm"
                    >
                      <code className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-mono text-xs">
                        {output.name}
                      </code>
                      <span className="text-gray-400">:</span>
                      <span className="text-purple-600 font-mono text-xs">{output.type}</span>
                      <span className="text-gray-500 text-xs flex-1">{output.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tips */}
            {doc.tips.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Lightbulb size={14} className="text-yellow-500" />
                  Tips
                </h4>
                <ul className="space-y-2">
                  {doc.tips.map((tip, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-gray-600"
                    >
                      <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Related nodes */}
            {doc.relatedNodes.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Related Nodes</h4>
                <div className="flex flex-wrap gap-2">
                  {doc.relatedNodes.map(node => (
                    <span
                      key={node}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200 cursor-pointer"
                    >
                      {node}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* External docs link */}
            {doc.externalDocs && (
              <a
                href={doc.externalDocs}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
              >
                <ExternalLink size={14} />
                View full documentation
              </a>
            )}
          </div>
        )}

        {activeSection === 'parameters' && (
          <div className="p-4">
            {/* Search */}
            <div className="relative mb-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search parameters..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Parameters list */}
            <div className="space-y-2">
              {filteredInputs.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Settings size={32} className="mx-auto opacity-50 mb-2" />
                  <p className="text-sm">No parameters found</p>
                </div>
              ) : (
                filteredInputs.map(param => (
                  <div
                    key={param.name}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => toggleParam(param.name)}
                      className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      {expandedParams.has(param.name) ? (
                        <ChevronDown size={14} className="text-gray-400" />
                      ) : (
                        <ChevronRight size={14} className="text-gray-400" />
                      )}
                      <code className="text-sm font-mono text-gray-900">{param.name}</code>
                      <span className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                        {param.type}
                      </span>
                      {param.required ? (
                        <span className="text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                          required
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">optional</span>
                      )}
                    </button>

                    {expandedParams.has(param.name) && (
                      <div className="p-3 border-t border-gray-200 bg-white space-y-2">
                        <p className="text-sm text-gray-600">{param.description}</p>
                        {param.default && (
                          <p className="text-xs text-gray-500">
                            <span className="font-medium">Default:</span>{' '}
                            <code className="bg-gray-100 px-1 rounded">{param.default}</code>
                          </p>
                        )}
                        {param.options && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {param.options.map(opt => (
                              <span
                                key={opt}
                                className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs"
                              >
                                {opt}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeSection === 'examples' && (
          <div className="p-4 space-y-4">
            {doc.examples.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Code size={32} className="mx-auto opacity-50 mb-2" />
                <p className="text-sm">No examples available</p>
              </div>
            ) : (
              doc.examples.map((example, i) => (
                <div
                  key={i}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h5 className="font-medium text-gray-900">{example.title}</h5>
                    <p className="text-sm text-gray-500 mt-0.5">{example.description}</p>
                  </div>
                  <div className="relative">
                    <pre className="p-4 text-sm font-mono bg-gray-900 text-gray-100 overflow-x-auto">
                      {example.code}
                    </pre>
                    <button
                      onClick={() => copyCode(example.code, `example-${i}`)}
                      className="absolute top-2 right-2 p-1.5 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                      title="Copy code"
                    >
                      {copiedCode === `example-${i}` ? (
                        <CheckCircle size={14} className="text-green-400" />
                      ) : (
                        <Copy size={14} className="text-gray-300" />
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <AlertCircle size={12} />
            {doc.inputs.filter(p => p.required).length} required parameters
          </span>
          <span>{doc.examples.length} examples</span>
        </div>
      </div>
    </div>
  );
};

export default NodeDocumentationPanel;
