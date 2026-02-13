#!/usr/bin/env node
/**
 * Node Config Generator Script
 * Generates configuration components for workflow nodes
 * AGENT 9: Node Library Expansion - Batch Generator
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Template for a basic node configuration
const basicConfigTemplate = (nodeName, displayName, description, fields) => `/**
 * ${displayName} Node Configuration
 * ${description}
 * AGENT 9: Node Library Expansion - Auto-generated
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface ${nodeName}ConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const ${nodeName}Config: React.FC<${nodeName}ConfigProps> = ({ config, onChange }) => {
${fields.map(field => `  const [${field.name}, set${field.name.charAt(0).toUpperCase() + field.name.slice(1)}] = useState(config.${field.name} || ${field.default});`).join('\n')}

  return (
    <div className="${nodeName.toLowerCase()}-config space-y-4">
      <div className="font-semibold text-lg mb-4">${displayName}</div>

${fields.map(field => field.type === 'text' ? `
      <div>
        <label className="block text-sm font-medium mb-2">${field.label}</label>
        <input
          type="text"
          value={${field.name}}
          onChange={(e) => {
            set${field.name.charAt(0).toUpperCase() + field.name.slice(1)}(e.target.value);
            onChange({ ...config, ${field.name}: e.target.value });
          }}
          placeholder="${field.placeholder || ''}"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        ${field.help ? `<p className="text-xs text-gray-500 mt-1">${field.help}</p>` : ''}
      </div>` : field.type === 'select' ? `
      <div>
        <label className="block text-sm font-medium mb-2">${field.label}</label>
        <select
          value={${field.name}}
          onChange={(e) => {
            set${field.name.charAt(0).toUpperCase() + field.name.slice(1)}(e.target.value);
            onChange({ ...config, ${field.name}: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          ${field.options.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('\n          ')}
        </select>
        ${field.help ? `<p className="text-xs text-gray-500 mt-1">${field.help}</p>` : ''}
      </div>` : field.type === 'textarea' ? `
      <div>
        <label className="block text-sm font-medium mb-2">${field.label}</label>
        <textarea
          value={${field.name}}
          onChange={(e) => {
            set${field.name.charAt(0).toUpperCase() + field.name.slice(1)}(e.target.value);
            onChange({ ...config, ${field.name}: e.target.value });
          }}
          rows={${field.rows || 4}}
          placeholder="${field.placeholder || ''}"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        ${field.help ? `<p className="text-xs text-gray-500 mt-1">${field.help}</p>` : ''}
      </div>` : '').join('\n')}

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
        <strong>📝 Note:</strong> Configure ${displayName} integration settings above.
      </div>
    </div>
  );
};
`;

// Node definitions to generate
const nodesToGenerate = [
  // Data Processing
  {
    name: 'ETLConfig',
    displayName: 'ETL Pipeline',
    description: 'Extract, Transform, Load data pipeline',
    fields: [
      { name: 'source', label: 'Data Source', type: 'select', default: "'database'", options: [
        { value: 'database', label: 'Database' },
        { value: 'api', label: 'API' },
        { value: 'file', label: 'File' },
        { value: 'custom', label: 'Custom' }
      ]},
      { name: 'transformations', label: 'Transformations', type: 'textarea', default: "''", placeholder: 'JSON transformation rules...', rows: 6 },
      { name: 'destination', label: 'Destination', type: 'text', default: "''", placeholder: 'Output destination' }
    ]
  },
  {
    name: 'JSONParserConfig',
    displayName: 'JSON Parser',
    description: 'Parse and manipulate JSON data',
    fields: [
      { name: 'inputPath', label: 'Input JSON Path', type: 'text', default: "'$'", placeholder: '$.data.items' },
      { name: 'operation', label: 'Operation', type: 'select', default: "'parse'", options: [
        { value: 'parse', label: 'Parse JSON String' },
        { value: 'stringify', label: 'Stringify to JSON' },
        { value: 'extract', label: 'Extract Fields' },
        { value: 'transform', label: 'Transform' }
      ]},
      { name: 'outputFormat', label: 'Output Format', type: 'select', default: "'object'", options: [
        { value: 'object', label: 'JavaScript Object' },
        { value: 'string', label: 'JSON String' },
        { value: 'array', label: 'Array' }
      ]}
    ]
  },
  {
    name: 'CSVParserConfig',
    displayName: 'CSV Parser',
    description: 'Parse and generate CSV files',
    fields: [
      { name: 'operation', label: 'Operation', type: 'select', default: "'parse'", options: [
        { value: 'parse', label: 'Parse CSV to JSON' },
        { value: 'generate', label: 'Generate CSV from JSON' }
      ]},
      { name: 'delimiter', label: 'Delimiter', type: 'text', default: "','", placeholder: ',', help: 'Character to separate fields' },
      { name: 'hasHeaders', label: 'Has Headers', type: 'select', default: "'true'", options: [
        { value: 'true', label: 'Yes' },
        { value: 'false', label: 'No' }
      ]},
      { name: 'encoding', label: 'Encoding', type: 'text', default: "'utf-8'", placeholder: 'utf-8' }
    ]
  },
  {
    name: 'XMLParserConfig',
    displayName: 'XML Parser',
    description: 'Parse and generate XML documents',
    fields: [
      { name: 'operation', label: 'Operation', type: 'select', default: "'parse'", options: [
        { value: 'parse', label: 'Parse XML to JSON' },
        { value: 'generate', label: 'Generate XML from JSON' }
      ]},
      { name: 'rootElement', label: 'Root Element', type: 'text', default: "'root'", placeholder: 'root' },
      { name: 'preserveAttributes', label: 'Preserve Attributes', type: 'select', default: "'true'", options: [
        { value: 'true', label: 'Yes' },
        { value: 'false', label: 'No' }
      ]}
    ]
  },

  // Communication Advanced
  {
    name: 'TelegramConfig',
    displayName: 'Telegram Bot',
    description: 'Send messages via Telegram bot',
    fields: [
      { name: 'botToken', label: 'Bot Token', type: 'text', default: "''", placeholder: 'Your Telegram bot token', help: 'Get from @BotFather' },
      { name: 'chatId', label: 'Chat ID', type: 'text', default: "''", placeholder: 'Chat or channel ID' },
      { name: 'message', label: 'Message', type: 'textarea', default: "''", placeholder: 'Message to send...', rows: 4 },
      { name: 'parseMode', label: 'Parse Mode', type: 'select', default: "'Markdown'", options: [
        { value: 'Markdown', label: 'Markdown' },
        { value: 'HTML', label: 'HTML' },
        { value: 'none', label: 'Plain Text' }
      ]}
    ]
  },
  {
    name: 'WhatsAppConfig',
    displayName: 'WhatsApp Business',
    description: 'Send WhatsApp messages via Business API',
    fields: [
      { name: 'phoneNumberId', label: 'Phone Number ID', type: 'text', default: "''", placeholder: 'WhatsApp Business phone number ID' },
      { name: 'accessToken', label: 'Access Token', type: 'text', default: "''", placeholder: 'Meta/Facebook access token' },
      { name: 'to', label: 'Recipient', type: 'text', default: "''", placeholder: '+1234567890' },
      { name: 'message', label: 'Message', type: 'textarea', default: "''", placeholder: 'Message text...', rows: 3 }
    ]
  },
  {
    name: 'ZoomConfig',
    displayName: 'Zoom',
    description: 'Create and manage Zoom meetings',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'text', default: "''", placeholder: 'Zoom API key' },
      { name: 'apiSecret', label: 'API Secret', type: 'text', default: "''", placeholder: 'Zoom API secret' },
      { name: 'operation', label: 'Operation', type: 'select', default: "'createMeeting'", options: [
        { value: 'createMeeting', label: 'Create Meeting' },
        { value: 'getMeeting', label: 'Get Meeting' },
        { value: 'updateMeeting', label: 'Update Meeting' },
        { value: 'deleteMeeting', label: 'Delete Meeting' }
      ]}
    ]
  }
];

// Generate files
const outputDir = path.join(__dirname, '../src/workflow/nodes/config');

nodesToGenerate.forEach(node => {
  const content = basicConfigTemplate(node.name.replace('Config', ''), node.displayName, node.description, node.fields);
  const filename = path.join(outputDir, `${node.name}.tsx`);

  fs.writeFileSync(filename, content, 'utf8');
  console.log(`✅ Generated: ${node.name}.tsx`);
});

console.log(`\n✨ Generated ${nodesToGenerate.length} node configuration files!`);
