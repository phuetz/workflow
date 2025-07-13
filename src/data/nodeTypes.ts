import { NodeType } from '../types/workflow';

export const nodeTypes: { [key: string]: NodeType } = {
  // Triggers
  trigger: {
    type: 'trigger',
    label: 'Déclencheur HTTP',
    icon: 'Webhook',
    color: 'bg-blue-500',
    category: 'trigger',
    inputs: 0,
    outputs: 1,
    description: 'Receive HTTP requests'
  },
  webhook: {
    type: 'webhook',
    label: 'Webhook',
    icon: 'Link',
    color: 'bg-green-500',
    category: 'trigger',
    inputs: 0,
    outputs: 1,
    description: 'Webhook endpoint'
  },
  schedule: {
    type: 'schedule',
    label: 'Schedule / Cron',
    icon: 'Clock',
    color: 'bg-indigo-500',
    category: 'trigger',
    inputs: 0,
    outputs: 1,
    description: 'Schedule execution'
  },
  rssFeed: {
    type: 'rssFeed',
    label: 'RSS Feed',
    icon: 'Rss',
    color: 'bg-orange-500',
    category: 'trigger',
    inputs: 0,
    outputs: 1,
    description: 'Monitor RSS feeds'
  },
  
  // Manual Trigger
  manualTrigger: {
    type: 'manualTrigger',
    label: 'Manual Trigger',
    icon: 'Play',
    color: 'bg-orange-600',
    category: 'trigger',
    inputs: 0,
    outputs: 1,
    description: 'Manual execution start'
  },
  
  // Communication
  email: {
    type: 'email',
    label: 'Email (SMTP)',
    icon: 'Mail',
    color: 'bg-red-500',
    category: 'communication',
    inputs: 1,
    outputs: 1,
    description: 'Send emails via SMTP'
  },
  gmail: {
    type: 'gmail',
    label: 'Gmail',
    icon: 'Mail',
    color: 'bg-red-600',
    category: 'communication',
    inputs: 1,
    outputs: 1,
    description: 'Gmail integration'
  },
  slack: {
    type: 'slack',
    label: 'Slack',
    icon: 'MessageSquare',
    color: 'bg-purple-600',
    category: 'communication',
    inputs: 1,
    outputs: 1,
    description: 'Send Slack messages'
  },
  discord: {
    type: 'discord',
    label: 'Discord',
    icon: 'MessageCircle',
    color: 'bg-indigo-600',
    category: 'communication',
    inputs: 1,
    outputs: 1,
    description: 'Discord bot integration'
  },
  telegram: {
    type: 'telegram',
    label: 'Telegram',
    icon: 'Send',
    color: 'bg-blue-400',
    category: 'communication',
    inputs: 1,
    outputs: 1,
    description: 'Telegram bot'
  },
  teams: {
    type: 'teams',
    label: 'Microsoft Teams',
    icon: 'Users',
    color: 'bg-blue-700',
    category: 'communication',
    inputs: 1,
    outputs: 1,
    description: 'Microsoft Teams integration'
  },
  twilio: {
    type: 'twilio',
    label: 'Twilio SMS',
    icon: 'Phone',
    color: 'bg-red-700',
    category: 'communication',
    inputs: 1,
    outputs: 1,
    description: 'Send SMS via Twilio'
  },
  whatsapp: {
    type: 'whatsapp',
    label: 'WhatsApp',
    icon: 'MessageCircle',
    color: 'bg-green-600',
    category: 'communication',
    inputs: 1,
    outputs: 1,
    description: 'WhatsApp Business API'
  },
  
  // Databases
  mysql: {
    type: 'mysql',
    label: 'MySQL',
    icon: 'Database',
    color: 'bg-blue-800',
    category: 'database',
    inputs: 1,
    outputs: 1,
    description: 'MySQL database operations'
  },
  postgres: {
    type: 'postgres',
    label: 'PostgreSQL',
    icon: 'Database',
    color: 'bg-blue-900',
    category: 'database',
    inputs: 1,
    outputs: 1,
    description: 'PostgreSQL operations'
  },
  mongodb: {
    type: 'mongodb',
    label: 'MongoDB',
    icon: 'Database',
    color: 'bg-green-700',
    category: 'database',
    inputs: 1,
    outputs: 1,
    description: 'MongoDB operations'
  },
  redis: {
    type: 'redis',
    label: 'Redis',
    icon: 'Database',
    color: 'bg-red-800',
    category: 'database',
    inputs: 1,
    outputs: 1,
    description: 'Redis cache operations'
  },
  
  // Google Services
  googleSheets: {
    type: 'googleSheets',
    label: 'Google Sheets',
    icon: 'FileSpreadsheet',
    color: 'bg-green-500',
    category: 'google',
    inputs: 1,
    outputs: 1,
    description: 'Google Sheets integration'
  },
  googleDrive: {
    type: 'googleDrive',
    label: 'Google Drive',
    icon: 'HardDrive',
    color: 'bg-blue-500',
    category: 'google',
    inputs: 1,
    outputs: 1,
    description: 'Google Drive file operations'
  },
  googleCalendar: {
    type: 'googleCalendar',
    label: 'Google Calendar',
    icon: 'Calendar',
    color: 'bg-blue-600',
    category: 'google',
    inputs: 1,
    outputs: 1,
    description: 'Google Calendar events'
  },
  googleMaps: {
    type: 'googleMaps',
    label: 'Google Maps',
    icon: 'Map',
    color: 'bg-green-600',
    category: 'google',
    inputs: 1,
    outputs: 1,
    description: 'Google Maps API'
  },
  
  // Cloud Services
  aws: {
    type: 'aws',
    label: 'AWS',
    icon: 'Cloud',
    color: 'bg-orange-600',
    category: 'cloud',
    inputs: 1,
    outputs: 1,
    description: 'AWS services'
  },
  s3: {
    type: 's3',
    label: 'AWS S3',
    icon: 'Archive',
    color: 'bg-orange-700',
    category: 'cloud',
    inputs: 1,
    outputs: 1,
    description: 'AWS S3 storage'
  },
  lambda: {
    type: 'lambda',
    label: 'AWS Lambda',
    icon: 'Zap',
    color: 'bg-orange-500',
    category: 'cloud',
    inputs: 1,
    outputs: 1,
    description: 'AWS Lambda functions'
  },
  
  // Development Tools
  github: {
    type: 'github',
    label: 'GitHub',
    icon: 'Github',
    color: 'bg-gray-800',
    category: 'development',
    inputs: 1,
    outputs: 1,
    description: 'GitHub API integration'
  },
  gitlab: {
    type: 'gitlab',
    label: 'GitLab',
    icon: 'GitBranch',
    color: 'bg-orange-800',
    category: 'development',
    inputs: 1,
    outputs: 1,
    description: 'GitLab integration'
  },
  jira: {
    type: 'jira',
    label: 'Jira',
    icon: 'Bug',
    color: 'bg-blue-700',
    category: 'development',
    inputs: 1,
    outputs: 1,
    description: 'Jira issue tracking'
  },
  
  // E-commerce
  stripe: {
    type: 'stripe',
    label: 'Stripe',
    icon: 'CreditCard',
    color: 'bg-purple-700',
    category: 'ecommerce',
    inputs: 1,
    outputs: 1,
    description: 'Stripe payments'
  },
  paypal: {
    type: 'paypal',
    label: 'PayPal',
    icon: 'DollarSign',
    color: 'bg-blue-600',
    category: 'ecommerce',
    inputs: 1,
    outputs: 1,
    description: 'PayPal payments'
  },
  shopify: {
    type: 'shopify',
    label: 'Shopify',
    icon: 'ShoppingBag',
    color: 'bg-green-800',
    category: 'ecommerce',
    inputs: 1,
    outputs: 1,
    description: 'Shopify store integration'
  },
  
  // AI & Analytics
  openai: {
    type: 'openai',
    label: 'OpenAI / ChatGPT',
    icon: 'Bot',
    color: 'bg-gray-700',
    category: 'ai',
    inputs: 1,
    outputs: 1,
    description: 'OpenAI GPT models'
  },
  anthropic: {
    type: 'anthropic',
    label: 'Claude AI',
    icon: 'Brain',
    color: 'bg-amber-600',
    category: 'ai',
    inputs: 1,
    outputs: 1,
    description: 'Anthropic Claude AI'
  },
  
  // Productivity
  notion: {
    type: 'notion',
    label: 'Notion',
    icon: 'BookOpen',
    color: 'bg-gray-600',
    category: 'productivity',
    inputs: 1,
    outputs: 1,
    description: 'Notion workspace'
  },
  airtable: {
    type: 'airtable',
    label: 'Airtable',
    icon: 'Table',
    color: 'bg-blue-500',
    category: 'productivity',
    inputs: 1,
    outputs: 1,
    description: 'Airtable database'
  },
  trello: {
    type: 'trello',
    label: 'Trello',
    icon: 'Kanban',
    color: 'bg-blue-700',
    category: 'productivity',
    inputs: 1,
    outputs: 1,
    description: 'Trello boards'
  },
  
  // Core Nodes
  httpRequest: {
    type: 'httpRequest',
    label: 'Requête HTTP',
    icon: 'Globe',
    color: 'bg-purple-500',
    category: 'core',
    inputs: 1,
    outputs: 1,
    description: 'Make HTTP requests'
  },
  transform: {
    type: 'transform',
    label: 'Transformer',
    icon: 'Shuffle',
    color: 'bg-yellow-500',
    category: 'core',
    inputs: 1,
    outputs: 1,
    description: 'Transform data'
  },
  condition: {
    type: 'condition',
    label: 'Condition',
    icon: 'GitBranch',
    color: 'bg-red-500',
    category: 'core',
    inputs: 1,
    outputs: 2,
    description: 'Conditional branching'
  },
  code: {
    type: 'code',
    label: 'Code JavaScript',
    icon: 'Code',
    color: 'bg-pink-500',
    category: 'core',
    inputs: 1,
    outputs: 1,
    description: 'Execute JavaScript code'
  },
  python: {
    type: 'python',
    label: 'Code Python',
    icon: 'FileText',
    color: 'bg-green-700',
    category: 'core',
    inputs: 1,
    outputs: 1,
    description: 'Execute Python code'
  },
  
  // Flow Control
  merge: {
    type: 'merge',
    label: 'Fusion',
    icon: 'Merge',
    color: 'bg-teal-500',
    category: 'flow',
    inputs: 2,
    outputs: 1,
    description: 'Merge multiple inputs'
  },
  split: {
    type: 'split',
    label: 'Diviser',
    icon: 'Split',
    color: 'bg-teal-600',
    category: 'flow',
    inputs: 1,
    outputs: 2,
    description: 'Split data flow'
  },
  loop: {
    type: 'loop',
    label: 'Boucle',
    icon: 'RotateCcw',
    color: 'bg-orange-600',
    category: 'flow',
    inputs: 1,
    outputs: 2,
    description: 'Loop through items'
  },
  forEach: {
    type: 'forEach',
    label: 'For Each',
    icon: 'List',
    color: 'bg-orange-500',
    category: 'flow',
    inputs: 1,
    outputs: 1,
    description: 'Iterate over a list of items'
  },
  delay: {
    type: 'delay',
    label: 'Délai',
    icon: 'Timer',
    color: 'bg-gray-500',
    category: 'flow',
    inputs: 1,
    outputs: 1,
    description: 'Add delay'
  },
  
  // Data Processing
  filter: {
    type: 'filter',
    label: 'Filtrer',
    icon: 'Filter',
    color: 'bg-purple-600',
    category: 'data',
    inputs: 1,
    outputs: 1,
    description: 'Filter data'
  },
  sort: {
    type: 'sort',
    label: 'Trier',
    icon: 'ArrowUpDown',
    color: 'bg-indigo-600',
    category: 'data',
    inputs: 1,
    outputs: 1,
    description: 'Sort data'
  },
  etl: {
    type: 'etl',
    label: 'ETL Pipeline',
    icon: 'Database',
    color: 'bg-orange-700',
    category: 'data',
    inputs: 1,
    outputs: 1,
    description: 'Extract, transform and load data'
  },

  // SaaS Platforms
  salesforce: {
    type: 'salesforce',
    label: 'Salesforce',
    icon: 'Cloud',
    color: 'bg-blue-600',
    category: 'saas',
    inputs: 1,
    outputs: 1,
    description: 'Salesforce CRM integration'
  },
  hubspot: {
    type: 'hubspot',
    label: 'HubSpot',
    icon: 'Users',
    color: 'bg-orange-500',
    category: 'saas',
    inputs: 1,
    outputs: 1,
    description: 'HubSpot CRM integration'
  },
  monday: {
    type: 'monday',
    label: 'Monday.com',
    icon: 'CalendarClock',
    color: 'bg-teal-500',
    category: 'saas',
    inputs: 1,
    outputs: 1,
    description: 'Monday.com project management'
  },
  pipedrive: {
    type: 'pipedrive',
    label: 'Pipedrive',
    icon: 'Handshake',
    color: 'bg-green-600',
    category: 'saas',
    inputs: 1,
    outputs: 1,
    description: 'Pipedrive CRM integration'
  },
  zendesk: {
    type: 'zendesk',
    label: 'Zendesk',
    icon: 'MessageSquare',
    color: 'bg-green-700',
    category: 'support',
    inputs: 1,
    outputs: 1,
    description: 'Zendesk support platform'
  },
  intercom: {
    type: 'intercom',
    label: 'Intercom',
    icon: 'MessageCircle',
    color: 'bg-blue-500',
    category: 'support',
    inputs: 1,
    outputs: 1,
    description: 'Intercom customer messaging'
  },
  
  // Social Media
  facebook: {
    type: 'facebook',
    label: 'Facebook',
    icon: 'Facebook',
    color: 'bg-blue-700',
    category: 'social',
    inputs: 1,
    outputs: 1,
    description: 'Facebook social platform'
  },
  instagram: {
    type: 'instagram',
    label: 'Instagram',
    icon: 'Camera',
    color: 'bg-pink-500',
    category: 'social',
    inputs: 1,
    outputs: 1,
    description: 'Instagram social platform'
  },
  linkedin: {
    type: 'linkedin',
    label: 'LinkedIn',
    icon: 'Linkedin',
    color: 'bg-blue-800',
    category: 'social',
    inputs: 1,
    outputs: 1,
    description: 'LinkedIn professional network'
  },
  twitter: {
    type: 'twitter',
    label: 'Twitter/X',
    icon: 'Twitter',
    color: 'bg-black',
    category: 'social',
    inputs: 1,
    outputs: 1,
    description: 'Twitter/X social platform'
  },
  youtube: {
    type: 'youtube',
    label: 'YouTube',
    icon: 'Youtube',
    color: 'bg-red-600',
    category: 'social',
    inputs: 1,
    outputs: 1,
    description: 'YouTube video platform'
  },
  
  // Marketing & Email
  mailchimp: {
    type: 'mailchimp',
    label: 'Mailchimp',
    icon: 'Mail',
    color: 'bg-yellow-500',
    category: 'marketing',
    inputs: 1,
    outputs: 1,
    description: 'Mailchimp email marketing'
  },
  sendgrid: {
    type: 'sendgrid',
    label: 'SendGrid',
    icon: 'Send',
    color: 'bg-blue-600',
    category: 'marketing',
    inputs: 1,
    outputs: 1,
    description: 'SendGrid email service'
  },
  convertkit: {
    type: 'convertkit',
    label: 'ConvertKit',
    icon: 'Mail',
    color: 'bg-pink-500',
    category: 'marketing',
    inputs: 1,
    outputs: 1,
    description: 'ConvertKit email marketing'
  },
  
  // File Storage
  dropbox: {
    type: 'dropbox',
    label: 'Dropbox',
    icon: 'Cloud',
    color: 'bg-blue-500',
    category: 'storage',
    inputs: 1,
    outputs: 1,
    description: 'Dropbox cloud storage'
  },
  onedrive: {
    type: 'onedrive',
    label: 'OneDrive',
    icon: 'HardDrive',
    color: 'bg-blue-600',
    category: 'storage',
    inputs: 1,
    outputs: 1,
    description: 'Microsoft OneDrive'
  },
  box: {
    type: 'box',
    label: 'Box',
    icon: 'Package',
    color: 'bg-blue-700',
    category: 'storage',
    inputs: 1,
    outputs: 1,
    description: 'Box cloud storage'
  },
  
  // Advanced Triggers
  fileWatcher: {
    type: 'fileWatcher',
    label: 'File Watcher',
    icon: 'Eye',
    color: 'bg-purple-500',
    category: 'trigger',
    inputs: 0,
    outputs: 1,
    description: 'Watch file system changes'
  },
  databaseTrigger: {
    type: 'databaseTrigger',
    label: 'Database Trigger',
    icon: 'Database',
    color: 'bg-green-500',
    category: 'trigger',
    inputs: 0,
    outputs: 1,
    description: 'Database change trigger'
  },
  emailTrigger: {
    type: 'emailTrigger',
    label: 'Email Trigger',
    icon: 'MailOpen',
    color: 'bg-red-500',
    category: 'trigger',
    inputs: 0,
    outputs: 1,
    description: 'Monitor email inbox'
  },
  
  // Advanced Flow Control
  subWorkflow: {
    type: 'subWorkflow',
    label: 'Sub-Workflow',
    icon: 'Workflow',
    color: 'bg-purple-600',
    category: 'flow',
    inputs: 1,
    outputs: 1,
    description: 'Execute sub-workflow'
  },
  errorWorkflow: {
    type: 'errorWorkflow',
    label: 'Error Workflow',
    icon: 'AlertTriangle',
    color: 'bg-red-600',
    category: 'flow',
    inputs: 1,
    outputs: 1,
    description: 'Error handling workflow'
  },
  retry: {
    type: 'retry',
    label: 'Retry',
    icon: 'RotateCcw',
    color: 'bg-orange-500',
    category: 'flow',
    inputs: 1,
    outputs: 2,
    description: 'Retry failed operations'
  },
  
  // Data Processing
  jsonParser: {
    type: 'jsonParser',
    label: 'JSON Parser',
    icon: 'Braces',
    color: 'bg-indigo-500',
    category: 'data',
    inputs: 1,
    outputs: 1,
    description: 'Parse and manipulate JSON'
  },
  csvParser: {
    type: 'csvParser',
    label: 'CSV Parser',
    icon: 'FileText',
    color: 'bg-green-500',
    category: 'data',
    inputs: 1,
    outputs: 1,
    description: 'Parse CSV files'
  },
  xmlParser: {
    type: 'xmlParser',
    label: 'XML Parser',
    icon: 'Code',
    color: 'bg-blue-500',
    category: 'data',
    inputs: 1,
    outputs: 1,
    description: 'Parse XML documents'
  },
  
  // Analytics
  googleAnalytics: {
    type: 'googleAnalytics',
    label: 'Google Analytics',
    icon: 'BarChart3',
    color: 'bg-orange-500',
    category: 'analytics',
    inputs: 1,
    outputs: 1,
    description: 'Google Analytics integration'
  },
  mixpanel: {
    type: 'mixpanel',
    label: 'Mixpanel',
    icon: 'TrendingUp',
    color: 'bg-purple-600',
    category: 'analytics',
    inputs: 1,
    outputs: 1,
    description: 'Mixpanel analytics'
  },

  // Financial Services
  quickbooks: {
    type: 'quickbooks',
    label: 'QuickBooks',
    icon: 'Wallet',
    color: 'bg-green-600',
    category: 'finance',
    inputs: 1,
    outputs: 1,
    description: 'QuickBooks accounting'
  },
  
  // Crypto & Finance
  coinbase: {
    type: 'coinbase',
    label: 'Coinbase',
    icon: 'DollarSign',
    color: 'bg-blue-600',
    category: 'crypto',
    inputs: 1,
    outputs: 1,
    description: 'Coinbase cryptocurrency'
  },
  binance: {
    type: 'binance',
    label: 'Binance',
    icon: 'TrendingUp',
    color: 'bg-yellow-500',
    category: 'crypto',
    inputs: 1,
    outputs: 1,
    description: 'Binance exchange'
  },
};

export const nodeCategories = {
  trigger: { name: '⚡ Déclencheurs', icon: '⚡' },
  core: { name: '🔧 Core', icon: '🔧' },
  communication: { name: '💬 Communication', icon: '💬' },
  database: { name: '🗄️ Base de données', icon: '🗄️' },
  google: { name: '🔷 Google', icon: '🔷' },
  cloud: { name: '☁️ Cloud', icon: '☁️' },
  development: { name: '👨‍💻 Développement', icon: '👨‍💻' },
  ecommerce: { name: '🛒 E-commerce', icon: '🛒' },
  ai: { name: '🤖 Intelligence Artificielle', icon: '🤖' },
  productivity: { name: '📊 Productivité', icon: '📊' },
  flow: { name: '🔀 Contrôle de flux', icon: '🔀' },
  data: { name: '📊 Traitement de données', icon: '📊' },
  saas: { name: '🏢 SaaS Platforms', icon: '🏢' },
  social: { name: '📱 Social Media', icon: '📱' },
  marketing: { name: '📧 Marketing', icon: '📧' },
  storage: { name: '💾 File Storage', icon: '💾' },
  support: { name: '🎧 Customer Support', icon: '🎧' },
  analytics: { name: '📈 Analytics', icon: '📈' },
  crypto: { name: '₿ Cryptocurrency', icon: '₿' },
  finance: { name: '💸 Finance', icon: '💸' },
};