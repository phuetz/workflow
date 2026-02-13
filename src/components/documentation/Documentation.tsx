import React, { useState } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { Book, Search, ChevronRight, Code, Zap, Shield, Globe, Database, Mail, /* MessageCircle, */ Clock, GitBranch, AlertTriangle, CheckCircle, Copy, ExternalLink } from 'lucide-react';

interface DocSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  subSections?: {
    id: string;
    title: string;
    content: React.ReactNode;
  }[];
}

export default function Documentation() {
  const { darkMode } = useWorkflowStore();
  const [activeSection, setActiveSection] = useState('getting-started');
  const [expandedSections, setExpandedSections] = useState<string[]>(['getting-started']);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const CodeBlock = ({ code, language, id }: { code: string; language: string; id: string }) => (
    <div className={`relative rounded-lg overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
        <span className="text-sm text-gray-500">{language}</span>
        <button
          onClick={() => copyToClipboard(code, id)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          {copiedCode === id ? <CheckCircle size={16} /> : <Copy size={16} />}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto">
        <code className="text-sm">{code}</code>
      </pre>
    </div>
  );

  const sections: DocSection[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <Book size={20} />,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-4">Welcome to Workflow Editor</h2>
            <p className="text-lg mb-4">
              Workflow Editor is a powerful visual automation platform that allows you to create, manage, and execute complex workflows with ease.
            </p>
            <p className="mb-4">
              Whether you're automating business processes, integrating APIs, or building data pipelines, our platform provides the tools you need to succeed.
            </p>
          </div>
          
          <div>
            <h3 className="text-xl font-semibold mb-3">Quick Start</h3>
            <ol className="list-decimal list-inside space-y-2">
              <li>Navigate to the Dashboard and click "Create New Workflow"</li>
              <li>Drag and drop nodes from the sidebar to build your workflow</li>
              <li>Connect nodes by dragging from output to input handles</li>
              <li>Configure each node by clicking on it and using the config panel</li>
              <li>Test your workflow with the "Execute" button</li>
              <li>Save and deploy your workflow for production use</li>
            </ol>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-3">Key Features</h3>
            <ul className="space-y-2">
              <li className="flex items-start space-x-2">
                <CheckCircle size={20} className="text-green-500 mt-0.5" />
                <span>Visual workflow builder with drag-and-drop interface</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle size={20} className="text-green-500 mt-0.5" />
                <span>100+ pre-built nodes for common tasks</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle size={20} className="text-green-500 mt-0.5" />
                <span>Real-time collaboration with team members</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle size={20} className="text-green-500 mt-0.5" />
                <span>Advanced scheduling and trigger options</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle size={20} className="text-green-500 mt-0.5" />
                <span>Comprehensive monitoring and analytics</span>
              </li>
            </ul>
          </div>
        </div>
      ),
      subSections: [
        {
          id: 'installation',
          title: 'Installation',
          content: (
            <div className="space-y-4">
              <p>To get started with Workflow Editor, you can either use our cloud platform or self-host the application.</p>
              
              <h4 className="font-semibold">Cloud Platform</h4>
              <p>Sign up at workflow-editor.com and start building workflows immediately.</p>
              
              <h4 className="font-semibold mt-4">Self-Hosted</h4>
              <p>Install using Docker:</p>
              <CodeBlock 
                id="docker-install"
                code={`docker pull workflow-editor/app:latest
docker run -d -p 3000:3000 workflow-editor/app:latest`}
                language="bash"
              />
              
              <p className="mt-4">Or using npm:</p>
              <CodeBlock 
                id="npm-install"
                code={`npm install -g workflow-editor
workflow-editor start`}
                language="bash"
              />
            </div>
          )
        },
        {
          id: 'first-workflow',
          title: 'Creating Your First Workflow',
          content: (
            <div className="space-y-4">
              <p>Let's create a simple workflow that fetches data from an API and sends an email notification.</p>
              
              <ol className="list-decimal list-inside space-y-3">
                <li>
                  <strong>Add a Trigger Node:</strong>
                  <p className="ml-6">Drag a "Manual Trigger" node from the sidebar. This will allow you to manually start the workflow.</p>
                </li>
                <li>
                  <strong>Add an HTTP Request Node:</strong>
                  <p className="ml-6">Connect it to the trigger and configure it to fetch data from your API.</p>
                </li>
                <li>
                  <strong>Add an Email Node:</strong>
                  <p className="ml-6">Connect it to the HTTP node and configure the recipient and message template.</p>
                </li>
                <li>
                  <strong>Test the Workflow:</strong>
                  <p className="ml-6">Click the "Execute" button and watch your workflow run in real-time.</p>
                </li>
              </ol>
            </div>
          )
        }
      ]
    },
    {
      id: 'nodes',
      title: 'Node Types',
      icon: <Zap size={20} />,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-4">Available Node Types</h2>
            <p className="mb-4">
              Workflow Editor provides a comprehensive set of nodes to handle various automation tasks. Each node type is designed for specific operations and can be configured to meet your needs.
            </p>
          </div>
        </div>
      ),
      subSections: [
        {
          id: 'trigger-nodes',
          title: 'Trigger Nodes',
          content: (
            <div className="space-y-4">
              <p>Trigger nodes start your workflow execution. Every workflow must have at least one trigger.</p>
              
              <div className="space-y-3">
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <h4 className="font-semibold flex items-center space-x-2">
                    <Clock size={18} />
                    <span>Schedule Trigger</span>
                  </h4>
                  <p className="mt-2 text-sm">Execute workflows on a schedule using cron expressions.</p>
                  <CodeBlock 
                    id="schedule-example"
                    code={`{
  "type": "schedule",
  "config": {
    "cron": "0 9 * * 1-5", // Every weekday at 9 AM
    "timezone": "America/New_York"
  }
}`}
                    language="json"
                  />
                </div>

                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <h4 className="font-semibold flex items-center space-x-2">
                    <Globe size={18} />
                    <span>Webhook Trigger</span>
                  </h4>
                  <p className="mt-2 text-sm">Start workflows via HTTP requests.</p>
                  <CodeBlock 
                    id="webhook-example"
                    code={`// POST https://api.workflow-editor.com/webhook/your-webhook-id
{
  "event": "user_signup",
  "data": {
    "email": "user@example.com",
    "name": "John Doe"
  }
}`}
                    language="javascript"
                  />
                </div>

                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <h4 className="font-semibold">Manual Trigger</h4>
                  <p className="mt-2 text-sm">Manually start workflows from the UI or API.</p>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'action-nodes',
          title: 'Action Nodes',
          content: (
            <div className="space-y-4">
              <p>Action nodes perform operations on your data.</p>
              
              <div className="space-y-3">
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <h4 className="font-semibold flex items-center space-x-2">
                    <Globe size={18} />
                    <span>HTTP Request</span>
                  </h4>
                  <p className="mt-2 text-sm">Make HTTP requests to any API.</p>
                  <CodeBlock 
                    id="http-config"
                    code={`{
  "method": "POST",
  "url": "https://api.example.com/users",
  "headers": {
    "Authorization": "Bearer {{credentials.apiKey}}",
    "Content-Type": "application/json"
  },
  "body": {
    "name": "{{input.name}}",
    "email": "{{input.email}}"
  }
}`}
                    language="json"
                  />
                </div>

                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <h4 className="font-semibold flex items-center space-x-2">
                    <Database size={18} />
                    <span>Database Query</span>
                  </h4>
                  <p className="mt-2 text-sm">Execute SQL queries on your databases.</p>
                  <CodeBlock 
                    id="db-query"
                    code={`SELECT * FROM users 
WHERE created_at > '{{workflow.lastRun}}'
ORDER BY created_at DESC
LIMIT 100`}
                    language="sql"
                  />
                </div>

                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <h4 className="font-semibold flex items-center space-x-2">
                    <Mail size={18} />
                    <span>Send Email</span>
                  </h4>
                  <p className="mt-2 text-sm">Send emails with dynamic content.</p>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'logic-nodes',
          title: 'Logic Nodes',
          content: (
            <div className="space-y-4">
              <p>Logic nodes control the flow of your workflow.</p>
              
              <div className="space-y-3">
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <h4 className="font-semibold">Condition Node</h4>
                  <p className="mt-2 text-sm">Branch workflow based on conditions.</p>
                  <CodeBlock 
                    id="condition-example"
                    code={`// JavaScript expression
input.amount > 1000 && input.status === 'approved'`}
                    language="javascript"
                  />
                </div>

                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <h4 className="font-semibold">Loop Node</h4>
                  <p className="mt-2 text-sm">Iterate over arrays or repeat operations.</p>
                </div>

                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <h4 className="font-semibold">Error Handler</h4>
                  <p className="mt-2 text-sm">Catch and handle errors in your workflow.</p>
                </div>
              </div>
            </div>
          )
        }
      ]
    },
    {
      id: 'expressions',
      title: 'Expressions & Variables',
      icon: <Code size={20} />,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-4">Working with Expressions</h2>
            <p className="mb-4">
              Expressions allow you to dynamically reference data, transform values, and create complex logic in your workflows.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-3">Variable Syntax</h3>
            <p className="mb-4">Use double curly braces to reference variables:</p>
            <CodeBlock 
              id="variable-syntax"
              code={`{{variable.name}}           // Access object property
{{array[0]}}               // Access array element
{{node.output.data}}       // Access node output
{{workflow.lastRun}}       // Access workflow metadata
{{env.API_KEY}}           // Access environment variables`}
              language="javascript"
            />
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-3">Built-in Functions</h3>
            <CodeBlock 
              id="builtin-functions"
              code={`{{$now()}}                 // Current timestamp
{{$json(data)}}            // Parse JSON string
{{$number(value)}}         // Convert to number
{{$string(value)}}         // Convert to string
{{$base64(text)}}          // Base64 encode
{{$hash(text, 'sha256')}}  // Generate hash`}
              language="javascript"
            />
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-3">JavaScript Expressions</h3>
            <p className="mb-4">Use JavaScript for complex logic:</p>
            <CodeBlock 
              id="js-expressions"
              code={`{{input.items.filter(item => item.price > 100)}}
{{Object.keys(data).map(key => data[key].toUpperCase())}}
{{new Date().toISOString().split('T')[0]}}
{{input.firstName + ' ' + input.lastName}}`}
              language="javascript"
            />
          </div>
        </div>
      )
    },
    {
      id: 'api-reference',
      title: 'API Reference',
      icon: <Globe size={20} />,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-4">REST API</h2>
            <p className="mb-4">
              Interact with Workflow Editor programmatically using our REST API.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-3">Authentication</h3>
            <p className="mb-4">All API requests require authentication using Bearer tokens:</p>
            <CodeBlock 
              id="api-auth"
              code={`curl -H "Authorization: Bearer YOUR_API_TOKEN" \\
     https://api.workflow-editor.com/v1/workflows`}
              language="bash"
            />
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-3">Endpoints</h3>
            
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <h4 className="font-semibold">List Workflows</h4>
                <CodeBlock 
                  id="api-list"
                  code={`GET /v1/workflows

Response:
{
  "workflows": [
    {
      "id": "wf_123",
      "name": "Daily Report",
      "status": "active",
      "created": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 1
}`}
                  language="http"
                />
              </div>

              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <h4 className="font-semibold">Execute Workflow</h4>
                <CodeBlock 
                  id="api-execute"
                  code={`POST /v1/workflows/{id}/execute
Content-Type: application/json

{
  "input": {
    "email": "user@example.com",
    "orderId": "12345"
  }
}

Response:
{
  "executionId": "exec_789",
  "status": "running",
  "startedAt": "2024-01-15T10:30:00Z"
}`}
                  language="http"
                />
              </div>

              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <h4 className="font-semibold">Get Execution Status</h4>
                <CodeBlock 
                  id="api-status"
                  code={`GET /v1/executions/{id}

Response:
{
  "id": "exec_789",
  "workflowId": "wf_123",
  "status": "completed",
  "result": {
    "success": true,
    "output": {...}
  },
  "duration": 2340
}`}
                  language="http"
                />
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'best-practices',
      title: 'Best Practices',
      icon: <Shield size={20} />,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-4">Workflow Best Practices</h2>
            <p className="mb-4">
              Follow these guidelines to build reliable, maintainable, and performant workflows.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-3">Error Handling</h3>
            <ul className="space-y-2">
              <li className="flex items-start space-x-2">
                <AlertTriangle size={20} className="text-yellow-500 mt-0.5" />
                <span>Always add error handlers for external API calls</span>
              </li>
              <li className="flex items-start space-x-2">
                <AlertTriangle size={20} className="text-yellow-500 mt-0.5" />
                <span>Implement retry logic for transient failures</span>
              </li>
              <li className="flex items-start space-x-2">
                <AlertTriangle size={20} className="text-yellow-500 mt-0.5" />
                <span>Log errors with sufficient context for debugging</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-3">Performance</h3>
            <ul className="space-y-2">
              <li className="flex items-start space-x-2">
                <Zap size={20} className="text-blue-500 mt-0.5" />
                <span>Use parallel execution for independent operations</span>
              </li>
              <li className="flex items-start space-x-2">
                <Zap size={20} className="text-blue-500 mt-0.5" />
                <span>Implement caching for frequently accessed data</span>
              </li>
              <li className="flex items-start space-x-2">
                <Zap size={20} className="text-blue-500 mt-0.5" />
                <span>Set appropriate timeouts for HTTP requests</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-3">Security</h3>
            <ul className="space-y-2">
              <li className="flex items-start space-x-2">
                <Shield size={20} className="text-green-500 mt-0.5" />
                <span>Store sensitive data in encrypted credentials</span>
              </li>
              <li className="flex items-start space-x-2">
                <Shield size={20} className="text-green-500 mt-0.5" />
                <span>Use environment-specific configurations</span>
              </li>
              <li className="flex items-start space-x-2">
                <Shield size={20} className="text-green-500 mt-0.5" />
                <span>Implement proper authentication for webhooks</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-3">Maintenance</h3>
            <ul className="space-y-2">
              <li className="flex items-start space-x-2">
                <GitBranch size={20} className="text-purple-500 mt-0.5" />
                <span>Use version control for workflow definitions</span>
              </li>
              <li className="flex items-start space-x-2">
                <GitBranch size={20} className="text-purple-500 mt-0.5" />
                <span>Document complex logic and business rules</span>
              </li>
              <li className="flex items-start space-x-2">
                <GitBranch size={20} className="text-purple-500 mt-0.5" />
                <span>Test workflows in a staging environment</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      icon: <AlertTriangle size={20} />,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-4">Common Issues</h2>
            <p className="mb-4">
              Solutions to frequently encountered problems.
            </p>
          </div>

          <div className="space-y-4">
            <div className={`p-4 rounded-lg border ${darkMode ? 'border-red-800 bg-red-900/20' : 'border-red-200 bg-red-50'}`}>
              <h4 className="font-semibold text-red-600 mb-2">Workflow Not Executing</h4>
              <ul className="space-y-1 text-sm">
                <li>• Check if the workflow has at least one trigger node</li>
                <li>• Verify all required node configurations are complete</li>
                <li>• Ensure there are no circular dependencies</li>
                <li>• Check the execution logs for error messages</li>
              </ul>
            </div>

            <div className={`p-4 rounded-lg border ${darkMode ? 'border-yellow-800 bg-yellow-900/20' : 'border-yellow-200 bg-yellow-50'}`}>
              <h4 className="font-semibold text-yellow-600 mb-2">API Request Failing</h4>
              <ul className="space-y-1 text-sm">
                <li>• Verify the API endpoint URL is correct</li>
                <li>• Check authentication credentials</li>
                <li>• Ensure request headers and body format are correct</li>
                <li>• Test the API independently using tools like Postman</li>
              </ul>
            </div>

            <div className={`p-4 rounded-lg border ${darkMode ? 'border-blue-800 bg-blue-900/20' : 'border-blue-200 bg-blue-50'}`}>
              <h4 className="font-semibold text-blue-600 mb-2">Performance Issues</h4>
              <ul className="space-y-1 text-sm">
                <li>• Reduce the number of nodes in large workflows</li>
                <li>• Use caching for repeated API calls</li>
                <li>• Implement pagination for large data sets</li>
                <li>• Consider breaking complex workflows into sub-workflows</li>
              </ul>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-3">Debug Mode</h3>
            <p className="mb-4">Enable debug mode to get detailed execution information:</p>
            <CodeBlock 
              id="debug-mode"
              code={`// In workflow settings
{
  "debug": true,
  "logLevel": "verbose",
  "stepExecution": true
}`}
              language="json"
            />
          </div>
        </div>
      )
    }
  ];

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const filteredSections = sections.filter(section => {
    const matchesSearch = section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         section.content.toString().toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Find current section based on activeSection
  const currentSection = sections.find(s => s.id === activeSection);

  // For sub-sections, find parent and sub-section
  const [parentId, subId] = activeSection.includes('-') ? activeSection.split('-') : [activeSection, null];
  const parentSection = sections.find(s => s.id === parentId);
  const subSection = parentSection?.subSections?.find(sub => sub.id === subId);

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
      <div className="flex h-full">
        {/* Sidebar */}
        <div className={`w-80 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg overflow-y-auto`}>
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Documentation</h1>
            
            {/* Search */}
            <div className="relative mb-6">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                }`}
              />
            </div>
            
            {/* Navigation */}
            <nav className="space-y-1">
              {filteredSections.map(section => (
                <div key={section.id}>
                  <button
                    onClick={() => {
                      setActiveSection(section.id);
                      if (section.subSections) {
                        toggleSection(section.id);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                      activeSection === section.id
                        ? 'bg-blue-500 text-white'
                        : darkMode 
                          ? 'hover:bg-gray-700' 
                          : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {section.icon}
                      <span>{section.title}</span>
                    </div>
                    {section.subSections && (
                      <ChevronRight 
                        size={16} 
                        className={`transform transition-transform ${
                          expandedSections.includes(section.id) ? 'rotate-90' : ''
                        }`}
                      />
                    )}
                  </button>
                  
                  {/* Sub-sections */}
                  {section.subSections && expandedSections.includes(section.id) && (
                    <div className="ml-4 mt-1 space-y-1">
                      {section.subSections.map(subSection => (
                        <button
                          key={subSection.id}
                          onClick={() => setActiveSection(`${section.id}-${subSection.id}`)}
                          className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${
                            activeSection === `${section.id}-${subSection.id}`
                              ? 'bg-blue-500/20 text-blue-400'
                              : darkMode
                                ? 'hover:bg-gray-700'
                                : 'hover:bg-gray-100'
                          }`}
                        >
                          {subSection.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-8">
            {(() => {
              // Check if it's a sub-section
              if (activeSection.includes('-')) {
                const [parentId, subId] = activeSection.split('-');
                
                if (subSection) {
                  return (
                    <div>
                      <nav className="flex items-center space-x-2 text-sm mb-6">
                        <button
                          onClick={() => setActiveSection(parentId)}
                          className="text-blue-500 hover:underline"
                        >
                          {parentSection?.title}
                        </button>
                        <ChevronRight size={16} />
                        <span>{subSection.title}</span>
                      </nav>
                      <h1 className="text-3xl font-bold mb-6">{subSection.title}</h1>
                      {subSection.content}
                    </div>
                  );
                }
              }
              
              // Regular section
              if (currentSection) {
                return (
                  <div>
                    <h1 className="text-3xl font-bold mb-6">{currentSection.title}</h1>
                    {currentSection.content}
                  </div>
                );
              }
              
              return null;
            })()}
            
            {/* External Links */}
            <div className="mt-12 pt-8 border-t border-gray-700">
              <h3 className="text-lg font-semibold mb-4">Additional Resources</h3>
              <div className="flex flex-wrap gap-4">
                <a
                  href="#"
                  className="flex items-center space-x-2 text-blue-500 hover:underline"
                >
                  <ExternalLink size={16} />
                  <span>API Documentation</span>
                </a>
                <a
                  href="#"
                  className="flex items-center space-x-2 text-blue-500 hover:underline"
                >
                  <ExternalLink size={16} />
                  <span>Video Tutorials</span>
                </a>
                <a
                  href="#"
                  className="flex items-center space-x-2 text-blue-500 hover:underline"
                >
                  <ExternalLink size={16} />
                  <span>Community Forum</span>
                </a>
                <a
                  href="#"
                  className="flex items-center space-x-2 text-blue-500 hover:underline"
                >
                  <ExternalLink size={16} />
                  <span>GitHub Repository</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}