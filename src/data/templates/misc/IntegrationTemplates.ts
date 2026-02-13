/**
 * IntegrationTemplates.ts
 *
 * Integration workflow templates including CI/CD, bug tracking, Web3, and external services.
 *
 * @module data/templates/misc/IntegrationTemplates
 */

import type { WorkflowTemplate } from '../../../types/templates';

export const INTEGRATION_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'cicd-pipeline-integration',
    name: 'CI/CD Pipeline Integration',
    description: 'Integrate with your CI/CD pipeline to send deployment notifications and track releases across multiple channels.',
    category: 'development',
    subcategory: 'cicd',
    author: 'System',
    authorType: 'official',
    tags: ['cicd', 'deployment', 'github', 'devops', 'releases'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'github_trigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'Deployment Event',
            properties: {
              event: 'deployment',
              repository: 'your-org/your-repo'
            },
            credentials: ['githubApi']
          }
        },
        {
          id: 'extract-1',
          type: 'code_javascript',
          position: { x: 300, y: 200 },
          data: {
            label: 'Extract Details',
            properties: {
              code: `// Extract deployment details
return [{
  environment: deployment.environment,
  version: deployment.ref,
  status: deployment.state,
  deployer: deployment.creator.login,
  timestamp: new Date().toISOString()
}];`
            }
          }
        },
        {
          id: 'slack-1',
          type: 'slack',
          position: { x: 500, y: 150 },
          data: {
            label: 'Notify Team',
            properties: {
              channel: '#deployments',
              text: 'Deployment to {{$node["extract-1"].json.environment}}: {{$node["extract-1"].json.version}} by {{$node["extract-1"].json.deployer}}'
            },
            credentials: ['slackApi']
          }
        },
        {
          id: 'jira-1',
          type: 'jira',
          position: { x: 500, y: 250 },
          data: {
            label: 'Update Tickets',
            properties: {
              operation: 'transitionIssue',
              issueKey: '={{$node["extract-1"].json.version}}',
              transition: 'deployed'
            },
            credentials: ['jiraApi']
          }
        },
        {
          id: 'datadog-1',
          type: 'datadog',
          position: { x: 700, y: 200 },
          data: {
            label: 'Log Event',
            properties: {
              operation: 'createEvent',
              title: 'Deployment',
              text: 'Deployed {{$node["extract-1"].json.version}} to {{$node["extract-1"].json.environment}}',
              tags: ['deployment', '={{$node["extract-1"].json.environment}}']
            },
            credentials: ['datadogApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'extract-1' },
        { id: 'e2', source: 'extract-1', target: 'slack-1' },
        { id: 'e3', source: 'extract-1', target: 'jira-1' },
        { id: 'e4', source: 'extract-1', target: 'datadog-1' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-02-22'),
    updatedAt: new Date(),
    downloads: 678,
    rating: 4.7,
    reviewCount: 76,
    featured: false,
    requiredIntegrations: ['github_trigger', 'code_javascript', 'slack', 'jira', 'datadog'],
    requiredCredentials: ['githubApi', 'slackApi', 'jiraApi', 'datadogApi'],
    estimatedSetupTime: 30,
    documentation: {
      overview: 'Comprehensive CI/CD pipeline integration for deployment tracking.',
      setup: [],
      usage: 'Automatically tracks and notifies on all deployments.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'bug-report-automation',
    name: 'Bug Report Automation',
    description: 'Automatically create bug reports in your issue tracker from error monitoring tools and customer reports.',
    category: 'development',
    subcategory: 'bug_tracking',
    author: 'System',
    authorType: 'official',
    tags: ['bugs', 'errors', 'tracking', 'sentry', 'jira'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'sentry_trigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'New Error',
            properties: {
              event: 'error_created',
              minimumLevel: 'error'
            },
            credentials: ['sentryApi']
          }
        },
        {
          id: 'dedupe-1',
          type: 'code_javascript',
          position: { x: 300, y: 200 },
          data: {
            label: 'Check for Duplicates',
            properties: {
              code: `// Check if this error already has a ticket
const isDuplicate = cache.get(error.fingerprint);
if (isDuplicate) {
  return []; // Skip if duplicate
}

cache.set(error.fingerprint, true, 3600); // Cache for 1 hour
return [{...error, isNew: true}];`
            }
          }
        },
        {
          id: 'jira-1',
          type: 'jira',
          position: { x: 500, y: 200 },
          data: {
            label: 'Create Bug Ticket',
            properties: {
              operation: 'createIssue',
              project: 'BUGS',
              issueType: 'Bug',
              summary: '={{$input.message}}',
              description: 'Error: {{$input.message}}\nStack Trace: {{$input.stackTrace}}\nURL: {{$input.sentryUrl}}',
              priority: '={{$input.level === "fatal" ? "Critical" : "High"}}'
            },
            credentials: ['jiraApi']
          }
        },
        {
          id: 'slack-1',
          type: 'slack',
          position: { x: 700, y: 200 },
          data: {
            label: 'Notify Developers',
            properties: {
              channel: '#bugs',
              text: 'New bug reported: {{$node["jira-1"].json.key}} - {{$input.message}}'
            },
            credentials: ['slackApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'dedupe-1' },
        { id: 'e2', source: 'dedupe-1', target: 'jira-1' },
        { id: 'e3', source: 'jira-1', target: 'slack-1' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-02-25'),
    updatedAt: new Date(),
    downloads: 567,
    rating: 4.6,
    reviewCount: 62,
    featured: false,
    requiredIntegrations: ['sentry_trigger', 'code_javascript', 'jira', 'slack'],
    requiredCredentials: ['sentryApi', 'jiraApi', 'slackApi'],
    estimatedSetupTime: 25,
    documentation: {
      overview: 'Automate bug report creation from error monitoring.',
      setup: [],
      usage: 'Automatically creates tickets when errors are detected.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'nft-minting-workflow',
    name: 'NFT Minting Workflow',
    description: 'Automated NFT minting with IPFS storage and marketplace listing.',
    category: 'web3',
    subcategory: 'nft',
    author: 'System',
    authorType: 'official',
    tags: ['nft', 'web3', 'ethereum', 'ipfs', 'blockchain'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'webhook_trigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'Mint Request',
            properties: {
              path: '/mint-nft',
              methods: ['POST']
            }
          }
        },
        {
          id: 'ipfs-1',
          type: 'http_request',
          position: { x: 300, y: 200 },
          data: {
            label: 'Upload to IPFS',
            properties: {
              method: 'POST',
              url: 'https://api.pinata.cloud/pinning/pinFileToIPFS'
            },
            credentials: ['pinataApi']
          }
        },
        {
          id: 'eth-1',
          type: 'ethereum',
          position: { x: 500, y: 200 },
          data: {
            label: 'Mint NFT',
            properties: {
              operation: 'contractCall',
              contract: 'your-nft-contract',
              method: 'mint',
              args: ['={{$input.wallet}}', '={{$node["ipfs-1"].json.IpfsHash}}']
            },
            credentials: ['ethereumApi']
          }
        },
        {
          id: 'airtable-1',
          type: 'airtable',
          position: { x: 700, y: 200 },
          data: {
            label: 'Log Mint',
            properties: {
              operation: 'createRecord',
              table: 'MintedNFTs',
              fields: {
                wallet: '={{$input.wallet}}',
                tokenId: '={{$node["eth-1"].json.tokenId}}',
                ipfsHash: '={{$node["ipfs-1"].json.IpfsHash}}'
              }
            },
            credentials: ['airtableApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'ipfs-1' },
        { id: 'e2', source: 'ipfs-1', target: 'eth-1' },
        { id: 'e3', source: 'eth-1', target: 'airtable-1' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-06-21'),
    updatedAt: new Date(),
    downloads: 0,
    rating: 4.5,
    reviewCount: 0,
    featured: false,
    requiredIntegrations: ['webhook_trigger', 'http_request', 'ethereum', 'airtable'],
    requiredCredentials: ['pinataApi', 'ethereumApi', 'airtableApi'],
    estimatedSetupTime: 35,
    documentation: {
      overview: 'Automated NFT minting pipeline.',
      setup: [],
      usage: 'Send mint requests via webhook.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'crypto-price-alerts',
    name: 'Crypto Price Alerts',
    description: 'Monitor cryptocurrency prices and send alerts when targets are reached.',
    category: 'web3',
    subcategory: 'trading',
    author: 'System',
    authorType: 'official',
    tags: ['crypto', 'trading', 'alerts', 'bitcoin', 'ethereum'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'schedule_trigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'Every 5 Minutes',
            properties: {
              cron: '*/5 * * * *'
            }
          }
        },
        {
          id: 'coinbase-1',
          type: 'coinbase',
          position: { x: 300, y: 200 },
          data: {
            label: 'Get Prices',
            properties: {
              operation: 'getPrices',
              currencies: ['BTC', 'ETH', 'SOL']
            },
            credentials: ['coinbaseApi']
          }
        },
        {
          id: 'check-1',
          type: 'code',
          position: { x: 500, y: 200 },
          data: {
            label: 'Check Alerts',
            properties: {
              code: `// Check price alerts
const alerts = [];
const targets = {BTC: 50000, ETH: 3000, SOL: 100};
prices.forEach(p => {
  if (p.price >= targets[p.currency]) {
    alerts.push(p.currency + ' hit target: $' + p.price);
  }
});
return [{alerts, hasAlerts: alerts.length > 0}];`
            }
          }
        },
        {
          id: 'telegram-1',
          type: 'telegram',
          position: { x: 700, y: 200 },
          data: {
            label: 'Send Alert',
            properties: {
              operation: 'sendMessage',
              chatId: 'your-chat-id',
              text: 'Price Alert: {{$node["check-1"].json.alerts.join(", ")}}'
            },
            credentials: ['telegramApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'coinbase-1' },
        { id: 'e2', source: 'coinbase-1', target: 'check-1' },
        { id: 'e3', source: 'check-1', target: 'telegram-1', sourceHandle: 'has-alerts' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-06-22'),
    updatedAt: new Date(),
    downloads: 0,
    rating: 4.6,
    reviewCount: 0,
    featured: false,
    requiredIntegrations: ['schedule_trigger', 'coinbase', 'code', 'telegram'],
    requiredCredentials: ['coinbaseApi', 'telegramApi'],
    estimatedSetupTime: 10,
    documentation: {
      overview: 'Cryptocurrency price monitoring.',
      setup: [],
      usage: 'Configure price targets in code node.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  }
];

export default INTEGRATION_TEMPLATES;
