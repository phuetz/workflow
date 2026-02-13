/**
 * Marketplace API Routes
 * Endpoints for app and plugin marketplace with real functionality
 */

import { Router, Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiError } from '../middleware/errorHandler';
import { AuthRequest, authHandler } from '../middleware/auth';
import { prisma } from '../../database/prisma';
import { logger } from '../../../services/SimpleLogger';
import type {
  IntegrationPlugin,
  PluginInstallation,
  MarketplaceFilter,
  IntegrationCategory,
  PluginManifest
} from '../../../types/marketplace';
import {
  validateBody,
  validateParams,
  validateQuery,
  submitTemplateBodySchema,
  templateIdParamsSchema,
  searchQuerySchema,
  simpleIdParamsSchema,
} from '../middleware/validation';

const router = Router();

// ============================================================================
// Plugin Registry - In-memory store with sample data
// In production, this would come from a database
// ============================================================================

interface PluginRegistryEntry extends IntegrationPlugin {
  longDescription?: string;
  screenshots?: string[];
  requirements?: string[];
  manifest?: PluginManifest;
}

// Sample plugin data - in production this would be stored in database
const pluginRegistry: Map<string, PluginRegistryEntry> = new Map([
  ['slack-advanced', {
    id: 'slack-advanced',
    name: 'Slack Advanced Integration',
    version: '2.1.0',
    description: 'Complete Slack integration with advanced features including channels, DMs, reactions, and file sharing',
    longDescription: 'This comprehensive Slack integration enables full workflow automation with Slack workspaces. Features include sending messages to channels and DMs, managing reactions, uploading files, creating channels, and listening to various Slack events as triggers.',
    category: { id: 'communication', name: 'Communication', description: 'Messaging and communication tools', icon: 'message-circle', color: '#4A154B', popular: true },
    author: 'WorkflowPro Team',
    icon: 'slack',
    tags: ['slack', 'messaging', 'communication', 'notifications', 'team'],
    rating: 4.8,
    downloads: 15420,
    verified: true,
    premium: false,
    supportedMethods: ['GET', 'POST'],
    authTypes: [{ type: 'oauth2', name: 'Slack OAuth', description: 'OAuth 2.0 authentication with Slack', config: { scopes: ['chat:write', 'channels:read'] } }],
    endpoints: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-12-01T00:00:00Z',
    changelog: [
      { version: '2.1.0', date: '2024-12-01', changes: ['Added file sharing support', 'Improved error handling'] },
      { version: '2.0.0', date: '2024-06-01', changes: ['Complete rewrite with OAuth 2.0', 'Added reaction support'], breaking: true }
    ],
    documentation: 'https://docs.workflowpro.io/plugins/slack-advanced',
    examples: [],
    dependencies: [],
    minVersion: '1.0.0',
    maxVersion: '99.0.0',
    screenshots: ['/screenshots/slack-1.png', '/screenshots/slack-2.png'],
    requirements: ['Slack workspace', 'OAuth app configured']
  }],
  ['ai-assistant', {
    id: 'ai-assistant',
    name: 'AI Workflow Assistant',
    version: '1.5.0',
    description: 'GPT-powered workflow automation and optimization with natural language processing',
    longDescription: 'Harness the power of AI to create, optimize, and debug your workflows. This plugin integrates with OpenAI GPT models to provide natural language workflow creation, automatic optimization suggestions, and intelligent error analysis.',
    category: { id: 'ai-ml', name: 'AI & ML', description: 'Artificial intelligence and machine learning', icon: 'brain', color: '#10A37F', popular: true },
    author: 'AI Labs',
    icon: 'bot',
    tags: ['ai', 'gpt', 'openai', 'automation', 'nlp', 'machine-learning'],
    rating: 4.9,
    downloads: 8932,
    verified: true,
    premium: true,
    price: 9.99,
    supportedMethods: ['POST'],
    authTypes: [{ type: 'apikey', name: 'OpenAI API Key', description: 'API key authentication', config: { keyLocation: 'header', keyName: 'Authorization' } }],
    endpoints: [],
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2024-11-15T00:00:00Z',
    changelog: [
      { version: '1.5.0', date: '2024-11-15', changes: ['Added GPT-4 Turbo support', 'New optimization engine'] },
      { version: '1.4.0', date: '2024-09-01', changes: ['Workflow debugging assistant'] }
    ],
    documentation: 'https://docs.workflowpro.io/plugins/ai-assistant',
    examples: [],
    dependencies: [],
    minVersion: '1.0.0',
    maxVersion: '99.0.0',
    screenshots: ['/screenshots/ai-1.png'],
    requirements: ['OpenAI API key', 'GPT-4 access recommended']
  }],
  ['github-actions', {
    id: 'github-actions',
    name: 'GitHub Actions Sync',
    version: '1.3.0',
    description: 'Sync workflows with GitHub Actions for CI/CD integration',
    longDescription: 'Bridge your workflow automation with GitHub Actions. Trigger workflows from GitHub events, sync workflow definitions, and manage GitHub repositories directly from your automation platform.',
    category: { id: 'development', name: 'Development', description: 'Developer tools and CI/CD', icon: 'git-branch', color: '#24292E', popular: true },
    author: 'DevTools Inc',
    icon: 'github',
    tags: ['github', 'ci-cd', 'devops', 'automation', 'git'],
    rating: 4.7,
    downloads: 12304,
    verified: true,
    premium: false,
    supportedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    authTypes: [{ type: 'bearer', name: 'GitHub Token', description: 'Personal access token or GitHub App', config: {} }],
    endpoints: [],
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-10-20T00:00:00Z',
    changelog: [
      { version: '1.3.0', date: '2024-10-20', changes: ['Added workflow dispatch support', 'GitHub App authentication'] },
      { version: '1.2.0', date: '2024-07-01', changes: ['Improved event handling'] }
    ],
    documentation: 'https://docs.workflowpro.io/plugins/github-actions',
    examples: [],
    dependencies: [],
    minVersion: '1.0.0',
    maxVersion: '99.0.0',
    screenshots: ['/screenshots/github-1.png', '/screenshots/github-2.png'],
    requirements: ['GitHub account', 'Personal access token or GitHub App']
  }],
  ['salesforce-sync', {
    id: 'salesforce-sync',
    name: 'Salesforce Sync',
    version: '2.0.0',
    description: 'Two-way sync with Salesforce CRM including leads, contacts, and opportunities',
    longDescription: 'Full Salesforce CRM integration enabling bidirectional data sync. Manage leads, contacts, accounts, and opportunities. Trigger workflows from Salesforce events and push data back to your CRM.',
    category: { id: 'crm', name: 'CRM', description: 'Customer relationship management', icon: 'users', color: '#00A1E0', popular: true },
    author: 'CRM Experts',
    icon: 'cloud',
    tags: ['salesforce', 'crm', 'sales', 'leads', 'sync'],
    rating: 4.6,
    downloads: 5421,
    verified: true,
    premium: true,
    price: 19.99,
    supportedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    authTypes: [{ type: 'oauth2', name: 'Salesforce OAuth', description: 'OAuth 2.0 with Salesforce', config: { scopes: ['api', 'refresh_token'] } }],
    endpoints: [],
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-11-01T00:00:00Z',
    changelog: [
      { version: '2.0.0', date: '2024-11-01', changes: ['Complete API rewrite', 'Bulk operations support'], breaking: true },
      { version: '1.5.0', date: '2024-06-01', changes: ['Added opportunity management'] }
    ],
    documentation: 'https://docs.workflowpro.io/plugins/salesforce-sync',
    examples: [],
    dependencies: [],
    minVersion: '1.0.0',
    maxVersion: '99.0.0',
    screenshots: ['/screenshots/salesforce-1.png'],
    requirements: ['Salesforce account', 'Connected App configured']
  }],
  ['google-sheets', {
    id: 'google-sheets',
    name: 'Google Sheets Integration',
    version: '1.8.0',
    description: 'Read and write Google Sheets data with advanced formatting support',
    longDescription: 'Comprehensive Google Sheets integration for data automation. Read, write, and update spreadsheets. Support for multiple sheets, formatting, formulas, and batch operations.',
    category: { id: 'productivity', name: 'Productivity', description: 'Productivity and office tools', icon: 'table', color: '#0F9D58', popular: true },
    author: 'Productivity Labs',
    icon: 'file-spreadsheet',
    tags: ['google', 'sheets', 'spreadsheet', 'data', 'productivity'],
    rating: 4.5,
    downloads: 18745,
    verified: true,
    premium: false,
    supportedMethods: ['GET', 'POST', 'PUT'],
    authTypes: [{ type: 'oauth2', name: 'Google OAuth', description: 'OAuth 2.0 with Google', config: { scopes: ['spreadsheets', 'drive.file'] } }],
    endpoints: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-12-10T00:00:00Z',
    changelog: [
      { version: '1.8.0', date: '2024-12-10', changes: ['Added batch update support', 'Performance improvements'] },
      { version: '1.7.0', date: '2024-08-01', changes: ['Formula support', 'Sheet creation'] }
    ],
    documentation: 'https://docs.workflowpro.io/plugins/google-sheets',
    examples: [],
    dependencies: [],
    minVersion: '1.0.0',
    maxVersion: '99.0.0',
    screenshots: ['/screenshots/sheets-1.png', '/screenshots/sheets-2.png'],
    requirements: ['Google account', 'API access enabled']
  }],
  ['stripe-payments', {
    id: 'stripe-payments',
    name: 'Stripe Payments',
    version: '3.0.0',
    description: 'Process payments, manage subscriptions, and handle webhooks with Stripe',
    longDescription: 'Complete Stripe integration for payment processing. Handle one-time payments, subscriptions, refunds, and disputes. Listen to Stripe webhooks for real-time payment events.',
    category: { id: 'finance', name: 'Finance', description: 'Payment and financial tools', icon: 'credit-card', color: '#635BFF', popular: true },
    author: 'FinTech Solutions',
    icon: 'credit-card',
    tags: ['stripe', 'payments', 'subscriptions', 'finance', 'ecommerce'],
    rating: 4.9,
    downloads: 9876,
    verified: true,
    premium: false,
    supportedMethods: ['GET', 'POST', 'DELETE'],
    authTypes: [{ type: 'apikey', name: 'Stripe API Key', description: 'Secret API key', config: { keyLocation: 'header', keyName: 'Authorization' } }],
    endpoints: [],
    createdAt: '2024-02-15T00:00:00Z',
    updatedAt: '2024-12-01T00:00:00Z',
    changelog: [
      { version: '3.0.0', date: '2024-12-01', changes: ['Stripe API v2024-11 support', 'Payment Links'], breaking: true },
      { version: '2.5.0', date: '2024-08-01', changes: ['Subscription pause/resume'] }
    ],
    documentation: 'https://docs.workflowpro.io/plugins/stripe-payments',
    examples: [],
    dependencies: [],
    minVersion: '1.0.0',
    maxVersion: '99.0.0',
    screenshots: ['/screenshots/stripe-1.png'],
    requirements: ['Stripe account', 'API keys']
  }],
  ['mailchimp', {
    id: 'mailchimp',
    name: 'Mailchimp Marketing',
    version: '2.2.0',
    description: 'Email marketing automation with Mailchimp campaigns and audiences',
    longDescription: 'Automate your email marketing with Mailchimp. Manage audiences, create and send campaigns, track performance, and sync subscriber data with your workflows.',
    category: { id: 'marketing', name: 'Marketing', description: 'Marketing automation tools', icon: 'mail', color: '#FFE01B', popular: true },
    author: 'Marketing Automation Co',
    icon: 'mail',
    tags: ['mailchimp', 'email', 'marketing', 'campaigns', 'newsletters'],
    rating: 4.4,
    downloads: 7654,
    verified: true,
    premium: false,
    supportedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    authTypes: [{ type: 'apikey', name: 'Mailchimp API Key', description: 'API key with datacenter', config: { keyLocation: 'header' } }],
    endpoints: [],
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2024-10-15T00:00:00Z',
    changelog: [
      { version: '2.2.0', date: '2024-10-15', changes: ['Campaign analytics', 'A/B testing support'] },
      { version: '2.1.0', date: '2024-06-01', changes: ['Audience segmentation'] }
    ],
    documentation: 'https://docs.workflowpro.io/plugins/mailchimp',
    examples: [],
    dependencies: [],
    minVersion: '1.0.0',
    maxVersion: '99.0.0',
    screenshots: ['/screenshots/mailchimp-1.png'],
    requirements: ['Mailchimp account', 'API key']
  }],
  ['jira-integration', {
    id: 'jira-integration',
    name: 'Jira Project Management',
    version: '1.9.0',
    description: 'Manage Jira issues, projects, and sprints from your workflows',
    longDescription: 'Full Jira Cloud integration for project management automation. Create and update issues, manage sprints, track project progress, and sync with your development workflows.',
    category: { id: 'project-management', name: 'Project Management', description: 'Project and task management', icon: 'layout-dashboard', color: '#0052CC', popular: true },
    author: 'Atlassian Partners',
    icon: 'layout-kanban',
    tags: ['jira', 'atlassian', 'project-management', 'agile', 'scrum'],
    rating: 4.6,
    downloads: 11234,
    verified: true,
    premium: false,
    supportedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    authTypes: [
      { type: 'oauth2', name: 'Atlassian OAuth', description: 'OAuth 2.0 with Atlassian', config: { scopes: ['read:jira-work', 'write:jira-work'] } },
      { type: 'apikey', name: 'API Token', description: 'Email + API token', config: { keyLocation: 'header' } }
    ],
    endpoints: [],
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-11-20T00:00:00Z',
    changelog: [
      { version: '1.9.0', date: '2024-11-20', changes: ['JQL search support', 'Bulk issue updates'] },
      { version: '1.8.0', date: '2024-07-01', changes: ['Sprint management'] }
    ],
    documentation: 'https://docs.workflowpro.io/plugins/jira-integration',
    examples: [],
    dependencies: [],
    minVersion: '1.0.0',
    maxVersion: '99.0.0',
    screenshots: ['/screenshots/jira-1.png', '/screenshots/jira-2.png'],
    requirements: ['Jira Cloud account', 'API token or OAuth app']
  }],
  ['aws-s3', {
    id: 'aws-s3',
    name: 'AWS S3 Storage',
    version: '2.0.0',
    description: 'Upload, download, and manage files in AWS S3 buckets',
    longDescription: 'Complete AWS S3 integration for cloud storage automation. Upload and download files, manage buckets, set permissions, and handle large file transfers with multipart upload.',
    category: { id: 'cloud-storage', name: 'Cloud Storage', description: 'Cloud storage services', icon: 'cloud', color: '#FF9900', popular: true },
    author: 'Cloud Integrations',
    icon: 'cloud-upload',
    tags: ['aws', 's3', 'storage', 'cloud', 'files'],
    rating: 4.7,
    downloads: 14567,
    verified: true,
    premium: false,
    supportedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    authTypes: [{ type: 'custom', name: 'AWS Credentials', description: 'Access key and secret', config: {} }],
    endpoints: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-12-05T00:00:00Z',
    changelog: [
      { version: '2.0.0', date: '2024-12-05', changes: ['Multipart upload', 'Presigned URLs'], breaking: true },
      { version: '1.5.0', date: '2024-06-01', changes: ['Bucket lifecycle management'] }
    ],
    documentation: 'https://docs.workflowpro.io/plugins/aws-s3',
    examples: [],
    dependencies: [],
    minVersion: '1.0.0',
    maxVersion: '99.0.0',
    screenshots: ['/screenshots/s3-1.png'],
    requirements: ['AWS account', 'IAM user with S3 permissions']
  }],
  ['twilio-sms', {
    id: 'twilio-sms',
    name: 'Twilio SMS & Voice',
    version: '1.6.0',
    description: 'Send SMS, MMS, and make voice calls with Twilio',
    longDescription: 'Communication automation with Twilio. Send SMS and MMS messages, make and receive voice calls, and handle inbound webhooks for two-way communication.',
    category: { id: 'communication', name: 'Communication', description: 'Messaging and communication', icon: 'phone', color: '#F22F46', popular: true },
    author: 'Communication Tools',
    icon: 'smartphone',
    tags: ['twilio', 'sms', 'voice', 'communication', 'phone'],
    rating: 4.5,
    downloads: 6789,
    verified: true,
    premium: false,
    supportedMethods: ['GET', 'POST'],
    authTypes: [{ type: 'basic', name: 'Account SID + Auth Token', description: 'Twilio credentials', config: {} }],
    endpoints: [],
    createdAt: '2024-03-15T00:00:00Z',
    updatedAt: '2024-09-01T00:00:00Z',
    changelog: [
      { version: '1.6.0', date: '2024-09-01', changes: ['MMS support', 'Voice transcription'] },
      { version: '1.5.0', date: '2024-05-01', changes: ['WhatsApp integration'] }
    ],
    documentation: 'https://docs.workflowpro.io/plugins/twilio-sms',
    examples: [],
    dependencies: [],
    minVersion: '1.0.0',
    maxVersion: '99.0.0',
    screenshots: ['/screenshots/twilio-1.png'],
    requirements: ['Twilio account', 'Phone number']
  }]
]);

// User plugin installations - in production this would be in database
const userInstallations: Map<string, Map<string, PluginInstallation>> = new Map();

// Plugin categories
const categories: IntegrationCategory[] = [
  { id: 'communication', name: 'Communication', description: 'Messaging and communication tools', icon: 'message-circle', color: '#4A154B', popular: true },
  { id: 'crm', name: 'CRM', description: 'Customer relationship management', icon: 'users', color: '#00A1E0', popular: true },
  { id: 'development', name: 'Development', description: 'Developer tools and CI/CD', icon: 'git-branch', color: '#24292E', popular: true },
  { id: 'ai-ml', name: 'AI & ML', description: 'Artificial intelligence and machine learning', icon: 'brain', color: '#10A37F', popular: true },
  { id: 'productivity', name: 'Productivity', description: 'Productivity and office tools', icon: 'table', color: '#0F9D58', popular: true },
  { id: 'marketing', name: 'Marketing', description: 'Marketing automation tools', icon: 'mail', color: '#FFE01B', popular: true },
  { id: 'finance', name: 'Finance', description: 'Payment and financial tools', icon: 'credit-card', color: '#635BFF', popular: true },
  { id: 'project-management', name: 'Project Management', description: 'Project and task management', icon: 'layout-dashboard', color: '#0052CC', popular: true },
  { id: 'cloud-storage', name: 'Cloud Storage', description: 'Cloud storage services', icon: 'cloud', color: '#FF9900', popular: true },
  { id: 'analytics', name: 'Analytics', description: 'Data analytics and reporting', icon: 'bar-chart', color: '#F9AB00', popular: false }
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get plugins with filtering, sorting, and pagination
 */
function getPlugins(options: {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
  verified?: boolean;
  premium?: boolean;
  sort?: string;
}): { plugins: PluginRegistryEntry[]; total: number } {
  const { category, search, page = 1, limit = 20, verified, premium, sort = 'popular' } = options;

  let plugins = Array.from(pluginRegistry.values());

  // Filter by category
  if (category) {
    plugins = plugins.filter(p => p.category.id === category || p.category.name.toLowerCase() === category.toLowerCase());
  }

  // Filter by search query
  if (search) {
    const searchLower = search.toLowerCase();
    plugins = plugins.filter(p =>
      p.name.toLowerCase().includes(searchLower) ||
      p.description.toLowerCase().includes(searchLower) ||
      p.tags.some(t => t.toLowerCase().includes(searchLower))
    );
  }

  // Filter by verified status
  if (verified !== undefined) {
    plugins = plugins.filter(p => p.verified === verified);
  }

  // Filter by premium status
  if (premium !== undefined) {
    plugins = plugins.filter(p => p.premium === premium);
  }

  // Sort plugins
  switch (sort) {
    case 'popular':
    case 'downloads':
      plugins.sort((a, b) => b.downloads - a.downloads);
      break;
    case 'rating':
      plugins.sort((a, b) => b.rating - a.rating);
      break;
    case 'newest':
      plugins.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      break;
    case 'name':
      plugins.sort((a, b) => a.name.localeCompare(b.name));
      break;
    default:
      plugins.sort((a, b) => b.downloads - a.downloads);
  }

  const total = plugins.length;

  // Apply pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  plugins = plugins.slice(startIndex, endIndex);

  return { plugins, total };
}

/**
 * Get plugin by ID
 */
function getPluginById(id: string): PluginRegistryEntry | null {
  return pluginRegistry.get(id) || null;
}

/**
 * Install plugin for a user
 */
async function installPlugin(pluginId: string, userId: string): Promise<{
  success: boolean;
  installation?: PluginInstallation;
  error?: string;
}> {
  const plugin = pluginRegistry.get(pluginId);

  if (!plugin) {
    return { success: false, error: 'Plugin not found' };
  }

  // Check if already installed
  let userPlugins = userInstallations.get(userId);
  if (!userPlugins) {
    userPlugins = new Map();
    userInstallations.set(userId, userPlugins);
  }

  if (userPlugins.has(pluginId)) {
    return { success: false, error: 'Plugin already installed' };
  }

  // Create installation record
  const installation: PluginInstallation = {
    pluginId,
    version: plugin.version,
    installedAt: new Date().toISOString(),
    enabled: true,
    config: {}
  };

  // Store installation
  userPlugins.set(pluginId, installation);

  // Update download count
  plugin.downloads += 1;

  // Try to persist to database
  try {
    // Note: pluginInstallation table may not exist in all environments
    // This is a best-effort persistence attempt
    const prismaAny = prisma as unknown as Record<string, unknown>;
    if (typeof prismaAny.pluginInstallation === 'object' && prismaAny.pluginInstallation !== null) {
      await (prismaAny.pluginInstallation as { create: (args: unknown) => Promise<unknown> }).create({
        data: {
          pluginId,
          userId,
          version: plugin.version,
          enabled: true,
          config: {},
          installedAt: new Date()
        }
      });
    }
  } catch (error) {
    // Database table might not exist, continue with in-memory storage
    logger.debug('Plugin installation stored in memory (database table not available)');
  }

  logger.info(`Plugin ${pluginId} installed for user ${userId}`);

  return { success: true, installation };
}

/**
 * Uninstall plugin for a user
 */
async function uninstallPlugin(pluginId: string, userId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const userPlugins = userInstallations.get(userId);

  if (!userPlugins || !userPlugins.has(pluginId)) {
    return { success: false, error: 'Plugin not installed' };
  }

  // Remove installation
  userPlugins.delete(pluginId);

  // Try to remove from database
  try {
    // Note: pluginInstallation table may not exist in all environments
    const prismaAny = prisma as unknown as Record<string, unknown>;
    if (typeof prismaAny.pluginInstallation === 'object' && prismaAny.pluginInstallation !== null) {
      await (prismaAny.pluginInstallation as { deleteMany: (args: unknown) => Promise<unknown> }).deleteMany({
        where: {
          pluginId,
          userId
        }
      });
    }
  } catch (error) {
    // Database table might not exist, continue with in-memory storage
    logger.debug('Plugin uninstallation processed in memory (database table not available)');
  }

  logger.info(`Plugin ${pluginId} uninstalled for user ${userId}`);

  return { success: true };
}

/**
 * Get user's installed plugins
 */
function getUserInstalledPlugins(userId: string): PluginInstallation[] {
  const userPlugins = userInstallations.get(userId);
  return userPlugins ? Array.from(userPlugins.values()) : [];
}

// ============================================================================
// API Routes
// ============================================================================

// Marketplace API info endpoint
router.get('/', asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    message: 'Marketplace API',
    version: '2.0.0',
    endpoints: [
      'GET /api/marketplace/plugins - List available plugins with search and pagination',
      'GET /api/marketplace/plugins/:id - Get plugin details',
      'POST /api/marketplace/plugins/:id/install - Install a plugin (auth required)',
      'DELETE /api/marketplace/plugins/:id - Uninstall a plugin (auth required)',
      'GET /api/marketplace/apps/featured - Get featured apps',
      'GET /api/marketplace/apps - List all apps',
      'GET /api/marketplace/apps/:id - Get app details',
      'GET /api/marketplace/categories - List plugin categories',
      'GET /api/marketplace/installed - Get installed plugins (auth required)'
    ]
  });
}));

// ============================================================================
// Plugin Routes (Primary endpoints per requirements)
// ============================================================================

/**
 * GET /api/marketplace/plugins - List available plugins
 * Query params: category, search, page, limit, verified, premium, sort
 */
router.get('/plugins', asyncHandler(async (req: Request, res: Response) => {
  const {
    category,
    search,
    page = '1',
    limit = '20',
    verified,
    premium,
    sort = 'popular'
  } = req.query;

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));

  const { plugins, total } = getPlugins({
    category: category as string,
    search: search as string,
    page: pageNum,
    limit: limitNum,
    verified: verified === 'true' ? true : verified === 'false' ? false : undefined,
    premium: premium === 'true' ? true : premium === 'false' ? false : undefined,
    sort: sort as string
  });

  res.json({
    success: true,
    plugins: plugins.map(p => ({
      id: p.id,
      name: p.name,
      version: p.version,
      description: p.description,
      category: p.category,
      author: p.author,
      icon: p.icon,
      tags: p.tags,
      rating: p.rating,
      downloads: p.downloads,
      verified: p.verified,
      premium: p.premium,
      price: p.price,
      updatedAt: p.updatedAt
    })),
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum)
  });
}));

/**
 * GET /api/marketplace/plugins/:id - Get plugin details
 */
router.get('/plugins/:id', validateParams(simpleIdParamsSchema), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const plugin = getPluginById(id);

  if (!plugin) {
    throw new ApiError(404, 'Plugin not found');
  }

  res.json({
    success: true,
    plugin: {
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      longDescription: plugin.longDescription,
      category: plugin.category,
      author: plugin.author,
      icon: plugin.icon,
      tags: plugin.tags,
      rating: plugin.rating,
      downloads: plugin.downloads,
      verified: plugin.verified,
      premium: plugin.premium,
      price: plugin.price,
      supportedMethods: plugin.supportedMethods,
      authTypes: plugin.authTypes,
      createdAt: plugin.createdAt,
      updatedAt: plugin.updatedAt,
      changelog: plugin.changelog,
      documentation: plugin.documentation,
      screenshots: plugin.screenshots,
      requirements: plugin.requirements,
      dependencies: plugin.dependencies,
      minVersion: plugin.minVersion,
      maxVersion: plugin.maxVersion
    }
  });
}));

/**
 * POST /api/marketplace/plugins/:id/install - Install a plugin
 * Requires authentication
 */
router.post('/plugins/:id/install', authHandler, asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const { id } = req.params;

  const userId = authReq.user?.id || 'anonymous';

  const result = await installPlugin(id, userId);

  if (!result.success) {
    throw new ApiError(result.error === 'Plugin not found' ? 404 : 400, result.error || 'Installation failed');
  }

  res.json({
    success: true,
    message: 'Plugin installed successfully',
    pluginId: id,
    installation: result.installation
  });
}));

/**
 * DELETE /api/marketplace/plugins/:id - Uninstall a plugin
 * Requires authentication
 */
router.delete('/plugins/:id', authHandler, validateParams(simpleIdParamsSchema), asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const { id } = req.params;

  const userId = authReq.user?.id || 'anonymous';

  const result = await uninstallPlugin(id, userId);

  if (!result.success) {
    throw new ApiError(result.error === 'Plugin not installed' ? 404 : 400, result.error || 'Uninstallation failed');
  }

  res.json({
    success: true,
    message: 'Plugin uninstalled successfully',
    pluginId: id
  });
}));

// ============================================================================
// Additional Plugin Routes
// ============================================================================

/**
 * GET /api/marketplace/plugins/featured - Get featured plugins
 */
router.get('/plugins/featured', asyncHandler(async (_req: Request, res: Response) => {
  const featured = Array.from(pluginRegistry.values())
    .filter(p => p.verified && p.rating >= 4.5)
    .sort((a, b) => b.downloads - a.downloads)
    .slice(0, 6);

  res.json({
    success: true,
    plugins: featured.map(p => ({
      id: p.id,
      name: p.name,
      version: p.version,
      description: p.description,
      category: p.category,
      author: p.author,
      icon: p.icon,
      rating: p.rating,
      downloads: p.downloads,
      verified: p.verified,
      premium: p.premium,
      price: p.price
    }))
  });
}));

// ============================================================================
// App Routes (Legacy compatibility)
// ============================================================================

// Get featured apps
router.get('/apps/featured', asyncHandler(async (_req, res) => {
  const featured = Array.from(pluginRegistry.values())
    .filter(p => p.verified && p.rating >= 4.5)
    .sort((a, b) => b.downloads - a.downloads)
    .slice(0, 6);

  res.json(featured.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    icon: p.icon,
    category: p.category.name,
    rating: p.rating,
    installs: p.downloads,
    price: p.price || 0,
    author: p.author,
    verified: p.verified
  })));
}));

// Search apps
router.get('/apps/search', validateQuery(searchQuerySchema), asyncHandler(async (req, res) => {
  const { q, category, sort = 'popular' } = req.query;

  const { plugins } = getPlugins({
    category: category as string,
    search: q as string,
    sort: sort as string
  });

  res.json(plugins.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    icon: p.icon,
    category: p.category.name,
    rating: p.rating,
    installs: p.downloads,
    price: p.price || 0
  })));
}));

// Get app details
router.get('/apps/:id', validateParams(simpleIdParamsSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const plugin = getPluginById(id);

  if (!plugin) {
    throw new ApiError(404, 'App not found');
  }

  res.json({
    id: plugin.id,
    name: plugin.name,
    description: plugin.description,
    longDescription: plugin.longDescription,
    icon: plugin.icon,
    category: plugin.category.name,
    rating: plugin.rating,
    installs: plugin.downloads,
    price: plugin.price || 0,
    screenshots: plugin.screenshots,
    features: plugin.tags.map(t => `Feature: ${t}`),
    requirements: plugin.requirements,
    changelog: plugin.changelog,
    author: {
      name: plugin.author,
      website: plugin.documentation,
      support: `support@${plugin.author.toLowerCase().replace(/\s+/g, '')}.com`
    }
  });
}));

// Get categories
router.get('/categories', asyncHandler(async (_req, res) => {
  const categoryCounts = new Map<string, number>();

  for (const plugin of Array.from(pluginRegistry.values())) {
    const catId = plugin.category.id;
    categoryCounts.set(catId, (categoryCounts.get(catId) || 0) + 1);
  }

  const categoriesWithCounts = categories.map(cat => ({
    id: cat.id,
    name: cat.name,
    description: cat.description,
    icon: cat.icon,
    color: cat.color,
    count: categoryCounts.get(cat.id) || 0
  }));

  res.json(categoriesWithCounts);
}));

// ============================================================================
// Protected Routes (Auth Required)
// ============================================================================

// Get installed plugins/apps for current user
router.get('/installed', authHandler, asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id || 'anonymous';

  const installations = getUserInstalledPlugins(userId);

  const installedWithDetails = installations.map(inst => {
    const plugin = pluginRegistry.get(inst.pluginId);
    return {
      ...inst,
      plugin: plugin ? {
        id: plugin.id,
        name: plugin.name,
        icon: plugin.icon,
        version: plugin.version,
        author: plugin.author
      } : null
    };
  });

  res.json({
    success: true,
    installations: installedWithDetails
  });
}));

// Install app (legacy route)
router.post('/install/:id', authHandler, asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const { id } = req.params;
  const userId = authReq.user?.id || 'anonymous';

  const result = await installPlugin(id, userId);

  if (!result.success) {
    throw new ApiError(result.error === 'Plugin not found' ? 404 : 400, result.error || 'Installation failed');
  }

  res.json({
    success: true,
    appId: id,
    message: 'App installed successfully'
  });
}));

// Uninstall app (legacy route)
router.delete('/uninstall/:id', authHandler, asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const { id } = req.params;
  const userId = authReq.user?.id || 'anonymous';

  const result = await uninstallPlugin(id, userId);

  if (!result.success) {
    throw new ApiError(result.error === 'Plugin not installed' ? 404 : 400, result.error || 'Uninstallation failed');
  }

  res.json({
    success: true,
    appId: id,
    message: 'App uninstalled successfully'
  });
}));

// Update app configuration
router.put('/apps/:id/config', authHandler, asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const { id } = req.params;
  const { config } = req.body;
  const userId = authReq.user?.id || 'anonymous';

  const userPlugins = userInstallations.get(userId);
  if (!userPlugins || !userPlugins.has(id)) {
    throw new ApiError(404, 'Plugin not installed');
  }

  const installation = userPlugins.get(id)!;
  installation.config = config;
  installation.lastUpdated = new Date().toISOString();

  res.json({
    success: true,
    appId: id,
    config
  });
}));

// Submit app review
router.post('/apps/:id/reviews', authHandler, asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const { id } = req.params;
  const { rating, title, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    throw new ApiError(400, 'Rating must be between 1 and 5');
  }

  const plugin = pluginRegistry.get(id);
  if (!plugin) {
    throw new ApiError(404, 'Plugin not found');
  }

  // In production, this would be stored in a database
  const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  logger.info(`Review submitted for plugin ${id}`, {
    reviewId,
    rating,
    userId: authReq.user?.id
  });

  res.json({
    success: true,
    reviewId,
    message: 'Review submitted successfully'
  });
}));

// ============================================================================
// Stats and Analytics
// ============================================================================

// Get marketplace stats
router.get('/stats', asyncHandler(async (_req, res) => {
  const plugins = Array.from(pluginRegistry.values());

  const totalDownloads = plugins.reduce((sum, p) => sum + p.downloads, 0);
  const avgRating = plugins.reduce((sum, p) => sum + p.rating, 0) / plugins.length;

  const categoryStats = new Map<string, number>();
  for (const plugin of plugins) {
    const catId = plugin.category.id;
    categoryStats.set(catId, (categoryStats.get(catId) || 0) + 1);
  }

  const popularCategories = Array.from(categoryStats.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => {
      const cat = categories.find(c => c.id === id);
      return { ...cat, count };
    });

  res.json({
    totalPlugins: plugins.length,
    totalDownloads,
    averageRating: Math.round(avgRating * 10) / 10,
    categoriesCount: categories.length,
    featuredPlugins: plugins
      .filter(p => p.verified && p.rating >= 4.5)
      .slice(0, 3)
      .map(p => ({ id: p.id, name: p.name, rating: p.rating })),
    popularCategories
  });
}));

export const marketplaceRouter = router;
