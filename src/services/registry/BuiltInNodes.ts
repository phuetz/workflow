/**
 * Built-in Nodes
 * Defines utility nodes and priority integrations
 */

import type { IntegrationNode } from './types';
import { SecureExpressionEvaluator } from '../../utils/SecureExpressionEvaluator';
import { logger } from '../SimpleLogger';

/**
 * Create HTTP Request node definition
 */
export function createHttpRequestNode(): IntegrationNode {
  return {
    id: 'http-request',
    name: 'http_request',
    displayName: 'HTTP Request',
    description: 'Make HTTP requests to any API endpoint',
    category: 'utilities',
    icon: 'globe',
    color: '#2563eb',
    version: '1.0.0',
    author: 'System',
    tags: ['http', 'api', 'request', 'utility'],
    inputs: [{ name: 'main', displayName: 'Input', type: 'main', required: false }],
    outputs: [
      { name: 'main', displayName: 'Success', type: 'main' },
      { name: 'error', displayName: 'Error', type: 'error' }
    ],
    properties: [
      {
        name: 'method',
        displayName: 'HTTP Method',
        type: 'select',
        required: true,
        default: 'GET',
        options: [
          { name: 'GET', value: 'GET' },
          { name: 'POST', value: 'POST' },
          { name: 'PUT', value: 'PUT' },
          { name: 'DELETE', value: 'DELETE' },
          { name: 'PATCH', value: 'PATCH' }
        ]
      },
      {
        name: 'url',
        displayName: 'URL',
        type: 'string',
        required: true,
        placeholder: 'https://api.example.com/data'
      },
      {
        name: 'headers',
        displayName: 'Headers',
        type: 'json',
        required: false,
        default: {},
        description: 'HTTP headers as JSON object'
      },
      {
        name: 'body',
        displayName: 'Request Body',
        type: 'json',
        required: false,
        conditional: { property: 'method', value: 'POST' }
      }
    ],
    executor: {
      execute: async (params) => {
        const { method, url, headers = {}, body } = params.properties;

        try {
          const response = await params.helpers.httpRequest({
            method: method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
            url: url as string,
            headers: headers as Record<string, string>,
            body: ['POST', 'PUT', 'PATCH'].includes(method as string) ? body : undefined
          });

          return {
            success: true,
            data: [response.body],
            metadata: {
              statusCode: response.statusCode,
              headers: response.headers
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      }
    },
    documentation: {
      description: 'Make HTTP requests to any API endpoint with full control over method, headers, and body.',
      usage: 'Configure the HTTP method, URL, and any required headers or body data.',
      parameters: [
        { name: 'method', description: 'HTTP method to use (GET, POST, PUT, DELETE, PATCH)' },
        { name: 'url', description: 'Target URL for the request' },
        { name: 'headers', description: 'HTTP headers as key-value pairs' },
        { name: 'body', description: 'Request body for POST/PUT/PATCH requests' }
      ],
      examples: []
    },
    examples: [
      {
        name: 'Simple GET Request',
        description: 'Fetch data from a REST API',
        configuration: {
          method: 'GET',
          url: 'https://api.workflow.local/users',
          headers: { 'Accept': 'application/json' }
        }
      }
    ],
    pricing: 'free',
    popularity: 1000,
    rating: 4.8,
    lastUpdated: new Date()
  };
}

/**
 * Create Code (JavaScript) node definition
 */
export function createCodeJavaScriptNode(): IntegrationNode {
  return {
    id: 'code-javascript',
    name: 'code_javascript',
    displayName: 'Code (JavaScript)',
    description: 'Execute custom JavaScript code with access to input data',
    category: 'utilities',
    icon: 'code',
    color: '#f7df1e',
    version: '1.0.0',
    author: 'System',
    tags: ['code', 'javascript', 'custom', 'transform'],
    inputs: [{ name: 'main', displayName: 'Input', type: 'main', required: false }],
    outputs: [
      { name: 'main', displayName: 'Output', type: 'main' },
      { name: 'error', displayName: 'Error', type: 'error' }
    ],
    properties: [
      {
        name: 'code',
        displayName: 'JavaScript Code',
        type: 'string',
        required: true,
        description: 'JavaScript code to execute. Access input data via $input variable.',
        placeholder: 'return $input.map(item => ({ ...item, processed: true }));'
      }
    ],
    executor: {
      execute: async (params) => {
        const { code } = params.properties;

        try {
          if (!code) {
            return {
              success: true,
              data: Array.isArray(params.inputData) ? params.inputData : [params.inputData]
            };
          }

          const evaluator = new SecureExpressionEvaluator();
          const context = {
            $input: params.inputData,
            $env: process.env,
            $now: new Date().toISOString(),
            $random: Math.random,
            $JSON: JSON,
            $Math: Math,
            $Date: Date
          };

          const result = evaluator.evaluate(code, context);

          return {
            success: true,
            data: Array.isArray(result) ? result : [result]
          };
        } catch (error) {
          logger.error('Code execution failed', { error });
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      }
    },
    documentation: {
      description: 'Execute custom JavaScript code to transform, filter, or process data.',
      usage: 'Write JavaScript code that processes the input data and returns the result.',
      parameters: [
        { name: 'code', description: 'JavaScript code to execute. Use $input to access input data.' }
      ],
      examples: []
    },
    examples: [
      {
        name: 'Transform Data',
        description: 'Add a timestamp to each item',
        configuration: {
          code: 'return $input.map(item => ({ ...item, timestamp: new Date().toISOString() }));'
        }
      }
    ],
    pricing: 'free',
    popularity: 950,
    rating: 4.7,
    lastUpdated: new Date()
  };
}

/**
 * Create Webhook Trigger node definition
 */
export function createWebhookTriggerNode(): IntegrationNode {
  return {
    id: 'webhook-trigger',
    name: 'webhook_trigger',
    displayName: 'Webhook Trigger',
    description: 'Trigger workflow when webhook URL is called',
    category: 'triggers',
    icon: 'webhook',
    color: '#10b981',
    version: '1.0.0',
    author: 'System',
    tags: ['webhook', 'trigger', 'http', 'api'],
    inputs: [],
    outputs: [{ name: 'main', displayName: 'Webhook Data', type: 'main' }],
    properties: [
      {
        name: 'path',
        displayName: 'Webhook Path',
        type: 'string',
        required: true,
        placeholder: '/my-webhook',
        description: 'URL path for the webhook (e.g., /my-webhook)'
      },
      {
        name: 'methods',
        displayName: 'HTTP Methods',
        type: 'multiSelect',
        required: true,
        default: ['POST'],
        options: [
          { name: 'GET', value: 'GET' },
          { name: 'POST', value: 'POST' },
          { name: 'PUT', value: 'PUT' },
          { name: 'DELETE', value: 'DELETE' }
        ]
      }
    ],
    executor: {
      execute: async (params) => {
        return {
          success: true,
          data: [params.inputData]
        };
      },
      webhook: async (params) => {
        return {
          workflowData: [{
            method: params.request.method,
            headers: params.request.headers,
            body: params.request.body,
            query: params.request.query,
            timestamp: new Date().toISOString()
          }],
          response: {
            statusCode: 200,
            body: { received: true, timestamp: new Date().toISOString() }
          }
        };
      }
    },
    documentation: {
      description: 'Trigger workflows when external systems call your webhook URL.',
      setup: 'Configure the webhook path and allowed HTTP methods. The webhook URL will be available after saving.',
      usage: 'External systems can POST data to your webhook URL to trigger the workflow.',
      parameters: [
        { name: 'path', description: 'URL path for the webhook endpoint' },
        { name: 'methods', description: 'Allowed HTTP methods for the webhook' }
      ],
      examples: []
    },
    examples: [
      {
        name: 'API Integration',
        description: 'Receive data from external API',
        configuration: {
          path: '/api/integration',
          methods: ['POST']
        }
      }
    ],
    pricing: 'free',
    popularity: 900,
    rating: 4.6,
    lastUpdated: new Date()
  };
}

/**
 * Create Slack node definition
 */
export function createSlackNode(): IntegrationNode {
  return {
    id: 'slack',
    name: 'slack',
    displayName: 'Slack',
    description: 'Send messages and interact with Slack workspaces',
    category: 'communication',
    icon: 'message-square',
    color: '#4a154b',
    version: '1.0.0',
    author: 'System',
    tags: ['slack', 'communication', 'messaging', 'team'],
    credentials: [{
      name: 'slackApi',
      displayName: 'Slack API',
      type: 'oauth2',
      required: true,
      description: 'Slack Bot Token or OAuth credentials',
      properties: {
        botToken: {
          type: 'password',
          displayName: 'Bot Token',
          description: 'Slack Bot User OAuth Token (starts with xoxb-)',
          placeholder: 'xoxb-your-bot-token'
        }
      },
      authUrl: 'https://slack.com/oauth/v2/authorize',
      tokenUrl: 'https://slack.com/api/oauth.v2.access',
      scopes: ['chat:write', 'channels:read', 'users:read']
    }],
    inputs: [{ name: 'main', displayName: 'Input', type: 'main', required: false }],
    outputs: [
      { name: 'main', displayName: 'Success', type: 'main' },
      { name: 'error', displayName: 'Error', type: 'error' }
    ],
    properties: [
      {
        name: 'operation',
        displayName: 'Operation',
        type: 'select',
        required: true,
        default: 'sendMessage',
        options: [
          { name: 'Send Message', value: 'sendMessage' },
          { name: 'Get Channels', value: 'getChannels' },
          { name: 'Get Users', value: 'getUsers' }
        ]
      },
      {
        name: 'channel',
        displayName: 'Channel',
        type: 'string',
        required: true,
        placeholder: '#general or @username',
        conditional: { property: 'operation', value: 'sendMessage' }
      },
      {
        name: 'text',
        displayName: 'Message Text',
        type: 'string',
        required: true,
        placeholder: 'Hello from workflow!',
        conditional: { property: 'operation', value: 'sendMessage' }
      }
    ],
    executor: {
      execute: async (params) => {
        const { credentials, properties } = params;
        const { operation, channel, text } = properties;
        const botToken = credentials?.botToken as string | undefined;

        if (!botToken) {
          return { success: false, error: 'Slack bot token is required' };
        }

        try {
          switch (operation) {
            case 'sendMessage':
              const response = await params.helpers.httpRequest({
                method: 'POST',
                url: 'https://slack.com/api/chat.postMessage',
                headers: {
                  'Authorization': `Bearer ${botToken}`,
                  'Content-Type': 'application/json'
                },
                body: {
                  channel: channel as string,
                  text: text as string
                }
              });

              const responseBody = response.body as { ok?: boolean; ts?: string; error?: string };
              if (responseBody.ok) {
                return {
                  success: true,
                  data: [response.body],
                  metadata: { channel, timestamp: responseBody.ts }
                };
              } else {
                return {
                  success: false,
                  error: responseBody.error || 'Failed to send message'
                };
              }

            default:
              return { success: false, error: `Operation ${operation} not implemented` };
          }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      }
    },
    documentation: {
      description: 'Integrate with Slack to send messages, manage channels, and interact with your team.',
      setup: 'Create a Slack app at api.slack.com, add a bot user, and copy the Bot User OAuth Token.',
      usage: 'Configure your credentials and select the operation you want to perform.',
      parameters: [
        { name: 'operation', description: 'The action to perform (send message, get channels, etc.)' },
        { name: 'channel', description: 'Channel name (#general) or user (@username) to send message to' },
        { name: 'text', description: 'Message content to send' }
      ],
      examples: []
    },
    examples: [
      {
        name: 'Alert Notification',
        description: 'Send alert to #alerts channel',
        configuration: {
          operation: 'sendMessage',
          channel: '#alerts',
          text: 'System alert: High CPU usage detected!'
        }
      }
    ],
    pricing: 'free',
    popularity: 850,
    rating: 4.9,
    lastUpdated: new Date()
  };
}

/**
 * Create Google Sheets node definition
 */
export function createGoogleSheetsNode(): IntegrationNode {
  return {
    id: 'google-sheets',
    name: 'google_sheets',
    displayName: 'Google Sheets',
    description: 'Read from and write to Google Sheets',
    category: 'productivity',
    icon: 'table',
    color: '#0f9d58',
    version: '1.0.0',
    author: 'System',
    tags: ['google', 'sheets', 'spreadsheet', 'data'],
    credentials: [{
      name: 'googleSheetsApi',
      displayName: 'Google Sheets API',
      type: 'oauth2',
      required: true,
      description: 'Google OAuth2 credentials for Sheets API',
      properties: {
        clientId: {
          type: 'string',
          displayName: 'Client ID',
          description: 'Google OAuth2 Client ID'
        },
        clientSecret: {
          type: 'password',
          displayName: 'Client Secret',
          description: 'Google OAuth2 Client Secret'
        }
      },
      authUrl: 'https://accounts.google.com/oauth2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    }],
    inputs: [{ name: 'main', displayName: 'Input', type: 'main', required: false }],
    outputs: [
      { name: 'main', displayName: 'Success', type: 'main' },
      { name: 'error', displayName: 'Error', type: 'error' }
    ],
    properties: [
      {
        name: 'operation',
        displayName: 'Operation',
        type: 'select',
        required: true,
        default: 'read',
        options: [
          { name: 'Read Rows', value: 'read' },
          { name: 'Append Row', value: 'append' },
          { name: 'Update Row', value: 'update' }
        ]
      },
      {
        name: 'spreadsheetId',
        displayName: 'Spreadsheet ID',
        type: 'string',
        required: true,
        placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        description: 'ID from the Google Sheets URL'
      },
      {
        name: 'range',
        displayName: 'Range',
        type: 'string',
        required: true,
        default: 'A:Z',
        placeholder: 'Sheet1!A1:D10',
        description: 'Range to read/write (e.g., A1:D10 or A:Z for all columns)'
      }
    ],
    executor: {
      execute: async (_params) => {
        return {
          success: false,
          error: 'Google Sheets integration not fully implemented'
        };
      }
    },
    documentation: {
      description: 'Read from and write to Google Sheets spreadsheets.',
      setup: 'Enable Google Sheets API in Google Cloud Console and create OAuth2 credentials.',
      usage: 'Provide the spreadsheet ID and range to read from or write to.',
      parameters: [
        { name: 'operation', description: 'Action to perform (read, append, update)' },
        { name: 'spreadsheetId', description: 'Google Sheets spreadsheet ID from URL' },
        { name: 'range', description: 'Cell range in A1 notation (e.g., A1:D10)' }
      ],
      examples: []
    },
    examples: [
      {
        name: 'Read Data',
        description: 'Read all data from Sheet1',
        configuration: {
          operation: 'read',
          spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
          range: 'Sheet1!A:Z'
        }
      }
    ],
    pricing: 'free',
    popularity: 900,
    rating: 4.8,
    lastUpdated: new Date()
  };
}

/**
 * Create GitHub node definition
 */
export function createGitHubNode(): IntegrationNode {
  return {
    id: 'github',
    name: 'github',
    displayName: 'GitHub',
    description: 'Integrate with GitHub repositories, issues, and pull requests',
    category: 'development',
    icon: 'github',
    color: '#24292e',
    version: '1.0.0',
    author: 'System',
    tags: ['github', 'git', 'development', 'repository'],
    credentials: [{
      name: 'githubApi',
      displayName: 'GitHub API',
      type: 'apiKey',
      required: true,
      description: 'GitHub Personal Access Token',
      properties: {
        token: {
          type: 'password',
          displayName: 'Personal Access Token',
          description: 'GitHub Personal Access Token with appropriate scopes',
          placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxx'
        }
      }
    }],
    inputs: [{ name: 'main', displayName: 'Input', type: 'main', required: false }],
    outputs: [
      { name: 'main', displayName: 'Success', type: 'main' },
      { name: 'error', displayName: 'Error', type: 'error' }
    ],
    properties: [
      {
        name: 'operation',
        displayName: 'Operation',
        type: 'select',
        required: true,
        default: 'getRepository',
        options: [
          { name: 'Get Repository', value: 'getRepository' },
          { name: 'List Issues', value: 'listIssues' },
          { name: 'Create Issue', value: 'createIssue' },
          { name: 'List Pull Requests', value: 'listPullRequests' }
        ]
      },
      {
        name: 'owner',
        displayName: 'Repository Owner',
        type: 'string',
        required: true,
        placeholder: 'octocat',
        description: 'GitHub username or organization name'
      },
      {
        name: 'repo',
        displayName: 'Repository Name',
        type: 'string',
        required: true,
        placeholder: 'Hello-World',
        description: 'Repository name'
      }
    ],
    executor: {
      execute: async (_params) => {
        return {
          success: false,
          error: 'GitHub integration not fully implemented'
        };
      }
    },
    documentation: {
      description: 'Integrate with GitHub to manage repositories, issues, and pull requests.',
      setup: 'Create a Personal Access Token in GitHub Settings > Developer settings > Personal access tokens.',
      usage: 'Configure your token and specify the repository owner and name.',
      parameters: [
        { name: 'operation', description: 'GitHub operation to perform' },
        { name: 'owner', description: 'Repository owner (username or organization)' },
        { name: 'repo', description: 'Repository name' }
      ],
      examples: []
    },
    examples: [
      {
        name: 'Monitor Issues',
        description: 'Get all open issues from a repository',
        configuration: {
          operation: 'listIssues',
          owner: 'microsoft',
          repo: 'vscode'
        }
      }
    ],
    pricing: 'free',
    popularity: 800,
    rating: 4.7,
    lastUpdated: new Date()
  };
}

/**
 * Get all utility nodes
 */
export function getUtilityNodes(): IntegrationNode[] {
  return [
    createHttpRequestNode(),
    createCodeJavaScriptNode(),
    createWebhookTriggerNode()
  ];
}

/**
 * Get all priority integration nodes
 */
export function getPriorityIntegrationNodes(): IntegrationNode[] {
  return [
    createSlackNode(),
    createGoogleSheetsNode(),
    createGitHubNode()
  ];
}

/**
 * Get all built-in nodes
 */
export function getAllBuiltInNodes(): IntegrationNode[] {
  return [...getUtilityNodes(), ...getPriorityIntegrationNodes()];
}
