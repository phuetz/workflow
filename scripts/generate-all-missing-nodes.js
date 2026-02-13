#!/usr/bin/env node
/**
 * Comprehensive Node Config Generator
 * Generates ALL missing node configurations
 * AGENT 9: Node Library Expansion - Complete Batch
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Standard credential config template
const credentialTemplate = (nodeName, displayName, description, credentialFields, operationFields = []) => `/**
 * ${displayName} Node Configuration
 * ${description}
 * AGENT 9: Node Library Expansion
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface ${nodeName}ConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const ${nodeName}Config: React.FC<${nodeName}ConfigProps> = ({ config, onChange }) => {
${credentialFields.map(field => `  const [${field.name}, set${field.name.charAt(0).toUpperCase() + field.name.slice(1)}] = useState(config.${field.name} || ${field.default});`).join('\n')}
${operationFields.map(field => `  const [${field.name}, set${field.name.charAt(0).toUpperCase() + field.name.slice(1)}] = useState(config.${field.name} || ${field.default});`).join('\n')}

  return (
    <div className="${nodeName.toLowerCase()}-config space-y-4">
      <div className="font-semibold text-lg mb-4">${displayName}</div>

      <div className="p-3 bg-blue-50 rounded text-sm mb-4">
        <strong>🔐 Authentication</strong>
      </div>

${credentialFields.map(field => `      <div>
        <label className="block text-sm font-medium mb-2">${field.label}</label>
        <input
          type="${field.type || 'text'}"
          value={${field.name}}
          onChange={(e) => {
            set${field.name.charAt(0).toUpperCase() + field.name.slice(1)}(e.target.value);
            onChange({ ...config, ${field.name}: e.target.value });
          }}
          placeholder="${field.placeholder || ''}"
          className="w-full px-3 py-2 border border-gray-300 rounded-md ${field.secret ? 'font-mono' : ''}"
        />
        ${field.help ? `<p className="text-xs text-gray-500 mt-1">${field.help}</p>` : ''}
      </div>`).join('\n\n')}

${operationFields.length > 0 ? `
      <div className="p-3 bg-green-50 rounded text-sm mb-4 mt-6">
        <strong>⚙️ Configuration</strong>
      </div>

${operationFields.map(field => field.type === 'select' ? `      <div>
        <label className="block text-sm font-medium mb-2">${field.label}</label>
        <select
          value={${field.name}}
          onChange={(e) => {
            set${field.name.charAt(0).toUpperCase() + field.name.slice(1)}(e.target.value);
            onChange({ ...config, ${field.name}: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
${field.options.map(opt => `          <option value="${opt.value}">${opt.label}</option>`).join('\n')}
        </select>
        ${field.help ? `<p className="text-xs text-gray-500 mt-1">${field.help}</p>` : ''}
      </div>` : `      <div>
        <label className="block text-sm font-medium mb-2">${field.label}</label>
        <${field.type === 'textarea' ? 'textarea' : 'input'}
          ${field.type === 'textarea' ? `rows={${field.rows || 4}}` : `type="${field.type || 'text'}"`}
          value={${field.name}}
          onChange={(e) => {
            set${field.name.charAt(0).toUpperCase() + field.name.slice(1)}(e.target.value);
            onChange({ ...config, ${field.name}: e.target.value });
          }}
          placeholder="${field.placeholder || ''}"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        ${field.help ? `<p className="text-xs text-gray-500 mt-1">${field.help}</p>` : ''}
      </div>`).join('\n\n')}` : ''}

      <div className="mt-4 p-3 bg-yellow-50 rounded text-sm">
        <strong>📝 Note:</strong> ${description}. Configure your credentials above.
      </div>
    </div>
  );
};
`;

// All nodes to generate
const allNodes = [
  // === AI & ML Services ===
  {
    name: 'OpenAIConfig',
    displayName: 'OpenAI / ChatGPT',
    description: 'OpenAI GPT models for text generation and chat',
    credentialFields: [
      { name: 'apiKey', label: 'API Key', type: 'password', default: "''", placeholder: 'sk-...', secret: true, help: 'Get from platform.openai.com' }
    ],
    operationFields: [
      { name: 'operation', label: 'Operation', type: 'select', default: "'chat'", options: [
        { value: 'chat', label: 'Chat Completion' },
        { value: 'completion', label: 'Text Completion' },
        { value: 'embedding', label: 'Create Embeddings' },
        { value: 'image', label: 'Generate Image (DALL-E)' }
      ]},
      { name: 'model', label: 'Model', type: 'select', default: "'gpt-4'", options: [
        { value: 'gpt-4', label: 'GPT-4' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
      ]},
      { name: 'prompt', label: 'Prompt', type: 'textarea', default: "''", placeholder: 'Your prompt...', rows: 4 }
    ]
  },
  {
    name: 'AnthropicConfig',
    displayName: 'Claude AI (Anthropic)',
    description: 'Anthropic Claude AI for intelligent conversations',
    credentialFields: [
      { name: 'apiKey', label: 'API Key', type: 'password', default: "''", placeholder: 'sk-ant-...', secret: true }
    ],
    operationFields: [
      { name: 'model', label: 'Model', type: 'select', default: "'claude-3-opus-20240229'", options: [
        { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
        { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
        { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' }
      ]},
      { name: 'prompt', label: 'Prompt', type: 'textarea', default: "''", placeholder: 'Your prompt...', rows: 4 },
      { name: 'maxTokens', label: 'Max Tokens', type: 'number', default: "1024" }
    ]
  },
  {
    name: 'MultiModelAIConfig',
    displayName: 'Multi-Model AI',
    description: 'Use multiple AI providers with automatic fallback',
    credentialFields: [
      { name: 'openaiKey', label: 'OpenAI API Key', type: 'password', default: "''", secret: true },
      { name: 'anthropicKey', label: 'Anthropic API Key', type: 'password', default: "''", secret: true },
      { name: 'googleKey', label: 'Google AI API Key', type: 'password', default: "''", secret: true }
    ],
    operationFields: [
      { name: 'primaryProvider', label: 'Primary Provider', type: 'select', default: "'openai'", options: [
        { value: 'openai', label: 'OpenAI' },
        { value: 'anthropic', label: 'Anthropic' },
        { value: 'google', label: 'Google Gemini' }
      ]},
      { name: 'enableFallback', label: 'Enable Fallback', type: 'select', default: "'true'", options: [
        { value: 'true', label: 'Yes' },
        { value: 'false', label: 'No' }
      ]},
      { name: 'prompt', label: 'Prompt', type: 'textarea', default: "''", rows: 4 }
    ]
  },

  // === Google Services ===
  {
    name: 'GoogleSheetsConfig',
    displayName: 'Google Sheets',
    description: 'Read and write Google Sheets data',
    credentialFields: [
      { name: 'serviceAccountJson', label: 'Service Account JSON', type: 'textarea', default: "''", placeholder: '{ "type": "service_account", ... }', rows: 4 }
    ],
    operationFields: [
      { name: 'operation', label: 'Operation', type: 'select', default: "'append'", options: [
        { value: 'append', label: 'Append Rows' },
        { value: 'read', label: 'Read Rows' },
        { value: 'update', label: 'Update Rows' },
        { value: 'clear', label: 'Clear Rows' }
      ]},
      { name: 'spreadsheetId', label: 'Spreadsheet ID', type: 'text', default: "''", placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms' },
      { name: 'range', label: 'Range', type: 'text', default: "'Sheet1!A1:Z'", placeholder: 'Sheet1!A1:Z' }
    ]
  },
  {
    name: 'GoogleCalendarConfig',
    displayName: 'Google Calendar',
    description: 'Manage Google Calendar events',
    credentialFields: [
      { name: 'serviceAccountJson', label: 'Service Account JSON', type: 'textarea', default: "''", rows: 4 }
    ],
    operationFields: [
      { name: 'operation', label: 'Operation', type: 'select', default: "'create'", options: [
        { value: 'create', label: 'Create Event' },
        { value: 'get', label: 'Get Event' },
        { value: 'update', label: 'Update Event' },
        { value: 'delete', label: 'Delete Event' },
        { value: 'list', label: 'List Events' }
      ]},
      { name: 'calendarId', label: 'Calendar ID', type: 'text', default: "'primary'", placeholder: 'primary or calendar@gmail.com' }
    ]
  },
  {
    name: 'GoogleMapsConfig',
    displayName: 'Google Maps',
    description: 'Google Maps geocoding and directions',
    credentialFields: [
      { name: 'apiKey', label: 'API Key', type: 'password', default: "''", secret: true }
    ],
    operationFields: [
      { name: 'operation', label: 'Operation', type: 'select', default: "'geocode'", options: [
        { value: 'geocode', label: 'Geocode Address' },
        { value: 'reverseGeocode', label: 'Reverse Geocode' },
        { value: 'directions', label: 'Get Directions' },
        { value: 'distance', label: 'Calculate Distance' }
      ]}
    ]
  },

  // === Storage ===
  {
    name: 'BoxConfig',
    displayName: 'Box',
    description: 'Box cloud storage operations',
    credentialFields: [
      { name: 'accessToken', label: 'Access Token', type: 'password', default: "''", secret: true }
    ],
    operationFields: [
      { name: 'operation', label: 'Operation', type: 'select', default: "'upload'", options: [
        { value: 'upload', label: 'Upload File' },
        { value: 'download', label: 'Download File' },
        { value: 'delete', label: 'Delete File' },
        { value: 'list', label: 'List Files' }
      ]}
    ]
  },

  // === CRM ===
  {
    name: 'ZohoCRMConfig',
    displayName: 'Zoho CRM',
    description: 'Zoho CRM customer management',
    credentialFields: [
      { name: 'clientId', label: 'Client ID', type: 'text', default: "''" },
      { name: 'clientSecret', label: 'Client Secret', type: 'password', default: "''", secret: true },
      { name: 'refreshToken', label: 'Refresh Token', type: 'password', default: "''", secret: true }
    ],
    operationFields: [
      { name: 'module', label: 'Module', type: 'select', default: "'Leads'", options: [
        { value: 'Leads', label: 'Leads' },
        { value: 'Contacts', label: 'Contacts' },
        { value: 'Accounts', label: 'Accounts' },
        { value: 'Deals', label: 'Deals' }
      ]},
      { name: 'operation', label: 'Operation', type: 'select', default: "'create'", options: [
        { value: 'create', label: 'Create' },
        { value: 'get', label: 'Get' },
        { value: 'update', label: 'Update' },
        { value: 'delete', label: 'Delete' },
        { value: 'search', label: 'Search' }
      ]}
    ]
  },
  {
    name: 'FreshsalesConfig',
    displayName: 'Freshsales CRM',
    description: 'Freshsales CRM operations',
    credentialFields: [
      { name: 'apiKey', label: 'API Key', type: 'password', default: "''", secret: true },
      { name: 'domain', label: 'Domain', type: 'text', default: "''", placeholder: 'your-domain.freshsales.io' }
    ],
    operationFields: [
      { name: 'resource', label: 'Resource', type: 'select', default: "'contacts'", options: [
        { value: 'contacts', label: 'Contacts' },
        { value: 'accounts', label: 'Accounts' },
        { value: 'deals', label: 'Deals' },
        { value: 'leads', label: 'Leads' }
      ]}
    ]
  },

  // === Project Management ===
  {
    name: 'TrelloConfig',
    displayName: 'Trello',
    description: 'Trello board and card management',
    credentialFields: [
      { name: 'apiKey', label: 'API Key', type: 'text', default: "''" },
      { name: 'token', label: 'Token', type: 'password', default: "''", secret: true }
    ],
    operationFields: [
      { name: 'operation', label: 'Operation', type: 'select', default: "'createCard'", options: [
        { value: 'createCard', label: 'Create Card' },
        { value: 'updateCard', label: 'Update Card' },
        { value: 'deleteCard', label: 'Delete Card' },
        { value: 'getBoard', label: 'Get Board' },
        { value: 'listCards', label: 'List Cards' }
      ]}
    ]
  },

  // === Databases ===
  {
    name: 'PostgreSQLConfig',
    displayName: 'PostgreSQL',
    description: 'PostgreSQL database operations',
    credentialFields: [
      { name: 'host', label: 'Host', type: 'text', default: "'localhost'" },
      { name: 'port', label: 'Port', type: 'number', default: "5432" },
      { name: 'database', label: 'Database', type: 'text', default: "''" },
      { name: 'username', label: 'Username', type: 'text', default: "''" },
      { name: 'password', label: 'Password', type: 'password', default: "''", secret: true }
    ],
    operationFields: [
      { name: 'operation', label: 'Operation', type: 'select', default: "'query'", options: [
        { value: 'query', label: 'Execute Query' },
        { value: 'insert', label: 'Insert' },
        { value: 'update', label: 'Update' },
        { value: 'delete', label: 'Delete' }
      ]},
      { name: 'query', label: 'SQL Query', type: 'textarea', default: "''", placeholder: 'SELECT * FROM ...', rows: 4 }
    ]
  },

  // === Social Media ===
  {
    name: 'TwitterConfig',
    displayName: 'Twitter/X',
    description: 'Post and manage Twitter/X content',
    credentialFields: [
      { name: 'apiKey', label: 'API Key', type: 'text', default: "''" },
      { name: 'apiSecret', label: 'API Secret', type: 'password', default: "''", secret: true },
      { name: 'accessToken', label: 'Access Token', type: 'password', default: "''", secret: true },
      { name: 'accessTokenSecret', label: 'Access Token Secret', type: 'password', default: "''", secret: true }
    ],
    operationFields: [
      { name: 'operation', label: 'Operation', type: 'select', default: "'tweet'", options: [
        { value: 'tweet', label: 'Post Tweet' },
        { value: 'retweet', label: 'Retweet' },
        { value: 'like', label: 'Like Tweet' },
        { value: 'search', label: 'Search Tweets' }
      ]},
      { name: 'text', label: 'Tweet Text', type: 'textarea', default: "''", rows: 3 }
    ]
  },
  {
    name: 'LinkedInConfig',
    displayName: 'LinkedIn',
    description: 'LinkedIn professional network integration',
    credentialFields: [
      { name: 'accessToken', label: 'Access Token', type: 'password', default: "''", secret: true }
    ],
    operationFields: [
      { name: 'operation', label: 'Operation', type: 'select', default: "'post'", options: [
        { value: 'post', label: 'Create Post' },
        { value: 'share', label: 'Share Content' },
        { value: 'getProfile', label: 'Get Profile' }
      ]},
      { name: 'text', label: 'Post Text', type: 'textarea', default: "''", rows: 3 }
    ]
  },
  {
    name: 'FacebookConfig',
    displayName: 'Facebook',
    description: 'Facebook social platform integration',
    credentialFields: [
      { name: 'accessToken', label: 'Access Token', type: 'password', default: "''", secret: true },
      { name: 'pageId', label: 'Page ID', type: 'text', default: "''", placeholder: 'Optional for page posts' }
    ],
    operationFields: [
      { name: 'operation', label: 'Operation', type: 'select', default: "'post'", options: [
        { value: 'post', label: 'Create Post' },
        { value: 'comment', label: 'Comment' },
        { value: 'like', label: 'Like' }
      ]},
      { name: 'message', label: 'Message', type: 'textarea', default: "''", rows: 3 }
    ]
  },
  {
    name: 'InstagramConfig',
    displayName: 'Instagram',
    description: 'Instagram Business account integration',
    credentialFields: [
      { name: 'accessToken', label: 'Access Token', type: 'password', default: "''", secret: true },
      { name: 'accountId', label: 'Instagram Business Account ID', type: 'text', default: "''" }
    ],
    operationFields: [
      { name: 'operation', label: 'Operation', type: 'select', default: "'post'", options: [
        { value: 'post', label: 'Create Post' },
        { value: 'story', label: 'Create Story' },
        { value: 'getMedia', label: 'Get Media' }
      ]}
    ]
  },

  // === Marketing ===
  {
    name: 'ActiveCampaignConfig',
    displayName: 'ActiveCampaign',
    description: 'ActiveCampaign marketing automation',
    credentialFields: [
      { name: 'apiUrl', label: 'API URL', type: 'text', default: "''", placeholder: 'https://youraccounת.api-us1.com' },
      { name: 'apiKey', label: 'API Key', type: 'password', default: "''", secret: true }
    ],
    operationFields: [
      { name: 'resource', label: 'Resource', type: 'select', default: "'contacts'", options: [
        { value: 'contacts', label: 'Contacts' },
        { value: 'lists', label: 'Lists' },
        { value: 'campaigns', label: 'Campaigns' },
        { value: 'automations', label: 'Automations' }
      ]}
    ]
  },

  // === Communication Advanced ===
  {
    name: 'GoogleMeetConfig',
    displayName: 'Google Meet',
    description: 'Create and manage Google Meet video calls',
    credentialFields: [
      { name: 'serviceAccountJson', label: 'Service Account JSON', type: 'textarea', default: "''", rows: 4 }
    ],
    operationFields: [
      { name: 'operation', label: 'Operation', type: 'select', default: "'createMeeting'", options: [
        { value: 'createMeeting', label: 'Create Meeting' },
        { value: 'getMeeting', label: 'Get Meeting Details' }
      ]}
    ]
  },
  {
    name: 'RocketChatConfig',
    displayName: 'Rocket.Chat',
    description: 'Rocket.Chat team messaging',
    credentialFields: [
      { name: 'serverUrl', label: 'Server URL', type: 'text', default: "''", placeholder: 'https://your-server.rocket.chat' },
      { name: 'userId', label: 'User ID', type: 'text', default: "''" },
      { name: 'authToken', label: 'Auth Token', type: 'password', default: "''", secret: true }
    ],
    operationFields: [
      { name: 'channel', label: 'Channel', type: 'text', default: "''", placeholder: '#general' },
      { name: 'message', label: 'Message', type: 'textarea', default: "''", rows: 3 }
    ]
  },
  {
    name: 'MattermostConfig',
    displayName: 'Mattermost',
    description: 'Mattermost team collaboration',
    credentialFields: [
      { name: 'serverUrl', label: 'Server URL', type: 'text', default: "''", placeholder: 'https://mattermost.example.com' },
      { name: 'accessToken', label: 'Access Token', type: 'password', default: "''", secret: true }
    ],
    operationFields: [
      { name: 'channelId', label: 'Channel ID', type: 'text', default: "''" },
      { name: 'message', label: 'Message', type: 'textarea', default: "''", rows: 3 }
    ]
  }
];

// Generate all files
const outputDir = path.join(__dirname, '../src/workflow/nodes/config');

let successCount = 0;
let errorCount = 0;

allNodes.forEach(node => {
  try {
    const content = credentialTemplate(
      node.name.replace('Config', ''),
      node.displayName,
      node.description,
      node.credentialFields,
      node.operationFields || []
    );
    const filename = path.join(outputDir, `${node.name}.tsx`);

    fs.writeFileSync(filename, content, 'utf8');
    console.log(`✅ Generated: ${node.name}.tsx`);
    successCount++;
  } catch (error) {
    console.error(`❌ Failed to generate ${node.name}.tsx:`, error.message);
    errorCount++;
  }
});

console.log(`\n✨ Generation Complete!`);
console.log(`   ✅ Success: ${successCount} files`);
console.log(`   ❌ Errors: ${errorCount} files`);
