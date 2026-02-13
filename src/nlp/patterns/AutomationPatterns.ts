/**
 * Automation Patterns Library
 * Pre-defined automation patterns for intent recognition
 */

import { AutomationPattern } from '../../types/nlp';

export const automationPatterns: AutomationPattern[] = [
  // ==== E-commerce Patterns ====
  {
    id: 'ecommerce-order-processing',
    name: 'E-commerce Order Processing',
    description: 'Process incoming orders from e-commerce platform',
    keywords: ['shopify', 'order', 'process', 'inventory', 'payment', 'shipping'],
    triggerType: 'webhook',
    actionSequence: ['validate', 'fetch', 'transform', 'save', 'notify'],
    examples: [
      'process shopify orders: validate, check inventory, charge customer, send confirmation',
      'when new order received, verify payment, update inventory, send shipping notification'
    ],
    nodeTemplate: {
      nodes: [],
      edges: []
    },
    confidence: 0.9
  },

  // ==== Social Media Patterns ====
  {
    id: 'social-media-monitoring',
    name: 'Social Media Monitoring',
    description: 'Monitor social media for brand mentions',
    keywords: ['twitter', 'monitor', 'sentiment', 'alert', 'brand', 'mention'],
    triggerType: 'schedule',
    actionSequence: ['fetch', 'analyze', 'filter', 'notify'],
    examples: [
      'monitor twitter for brand mentions, analyze sentiment, alert on negative posts',
      'track social media mentions, analyze sentiment, send alerts for negative feedback'
    ],
    nodeTemplate: {
      nodes: [],
      edges: []
    },
    confidence: 0.85
  },

  // ==== Lead Management Patterns ====
  {
    id: 'lead-qualification',
    name: 'Lead Qualification Pipeline',
    description: 'Automatically qualify and route leads',
    keywords: ['lead', 'qualify', 'score', 'route', 'crm', 'sales'],
    triggerType: 'webhook',
    actionSequence: ['validate', 'enrich', 'analyze', 'filter', 'save', 'notify'],
    examples: [
      'qualify leads: enrich data, score, route to sales team',
      'when lead submitted, enrich from clearbit, score, assign to rep'
    ],
    nodeTemplate: {
      nodes: [],
      edges: []
    },
    confidence: 0.88
  },

  // ==== Customer Support Patterns ====
  {
    id: 'ticket-routing',
    name: 'Support Ticket Routing',
    description: 'Route support tickets to appropriate teams',
    keywords: ['ticket', 'support', 'route', 'assign', 'priority', 'zendesk'],
    triggerType: 'webhook',
    actionSequence: ['analyze', 'filter', 'transform', 'notify'],
    examples: [
      'route support tickets by priority and category to teams',
      'when ticket created, analyze category, assign to team, notify'
    ],
    nodeTemplate: {
      nodes: [],
      edges: []
    },
    confidence: 0.87
  },

  // ==== Data Sync Patterns ====
  {
    id: 'data-sync',
    name: 'Cross-Platform Data Sync',
    description: 'Sync data between different platforms',
    keywords: ['sync', 'data', 'database', 'schedule', 'update', 'salesforce'],
    triggerType: 'schedule',
    actionSequence: ['fetch', 'transform', 'validate', 'save'],
    examples: [
      'sync salesforce contacts to database daily',
      'every morning, sync data from google sheets to postgres'
    ],
    nodeTemplate: {
      nodes: [],
      edges: []
    },
    confidence: 0.9
  },

  // ==== Marketing Automation Patterns ====
  {
    id: 'email-campaign',
    name: 'Email Campaign Automation',
    description: 'Trigger personalized email campaigns',
    keywords: ['email', 'campaign', 'mailchimp', 'segment', 'personalized'],
    triggerType: 'schedule',
    actionSequence: ['fetch', 'filter', 'transform', 'email', 'save'],
    examples: [
      'send personalized email campaign to segment based on behavior',
      'trigger email nurture sequence when user signs up'
    ],
    nodeTemplate: {
      nodes: [],
      edges: []
    },
    confidence: 0.86
  },

  // ==== Reporting Patterns ====
  {
    id: 'automated-reporting',
    name: 'Automated Report Generation',
    description: 'Generate and distribute reports automatically',
    keywords: ['report', 'generate', 'schedule', 'analytics', 'dashboard', 'send'],
    triggerType: 'schedule',
    actionSequence: ['fetch', 'aggregate', 'transform', 'email'],
    examples: [
      'generate weekly sales report and email to team',
      'every monday, create analytics report and send via slack'
    ],
    nodeTemplate: {
      nodes: [],
      edges: []
    },
    confidence: 0.89
  },

  // ==== Monitoring Patterns ====
  {
    id: 'system-monitoring',
    name: 'System Health Monitoring',
    description: 'Monitor system health and send alerts',
    keywords: ['monitor', 'health', 'alert', 'uptime', 'status', 'check'],
    triggerType: 'schedule',
    actionSequence: ['fetch', 'validate', 'filter', 'notify'],
    examples: [
      'monitor website uptime every 5 minutes, alert if down',
      'check api health every hour, notify on error'
    ],
    nodeTemplate: {
      nodes: [],
      edges: []
    },
    confidence: 0.91
  },

  // ==== Content Publishing Patterns ====
  {
    id: 'content-publishing',
    name: 'Multi-Channel Content Publishing',
    description: 'Publish content across multiple channels',
    keywords: ['publish', 'content', 'social', 'blog', 'cross-post'],
    triggerType: 'webhook',
    actionSequence: ['transform', 'post', 'post', 'save'],
    examples: [
      'publish blog post to wordpress, twitter, and linkedin',
      'when content ready, post to all social media channels'
    ],
    nodeTemplate: {
      nodes: [],
      edges: []
    },
    confidence: 0.84
  },

  // ==== Invoice Processing Patterns ====
  {
    id: 'invoice-automation',
    name: 'Invoice Processing Automation',
    description: 'Extract and process invoice data',
    keywords: ['invoice', 'ocr', 'extract', 'accounting', 'quickbooks', 'process'],
    triggerType: 'email',
    actionSequence: ['fetch', 'analyze', 'validate', 'save', 'notify'],
    examples: [
      'extract data from invoice pdfs, validate, save to quickbooks',
      'when invoice email received, ocr extract, validate, update accounting'
    ],
    nodeTemplate: {
      nodes: [],
      edges: []
    },
    confidence: 0.87
  }
];
