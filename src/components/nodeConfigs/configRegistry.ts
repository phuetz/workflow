import { NodeConfigDefinition } from '../../types/nodeConfig';

// AI Configurations
import { openAIConfig } from './ai/openAIConfig';
import { anthropicConfig } from './ai/anthropicConfig';
import { pineconeConfig } from './ai/pineconeConfig';

// Database Configurations
import { mysqlConfig } from './database/mysqlConfig';
import { postgresConfig } from './database/postgresConfig';
import { mongodbConfig } from './database/mongodbConfig';
import { redisConfig } from './database/redisConfig';
import { elasticsearchConfig } from './database/elasticsearchConfig';
import { bigqueryConfig } from './database/bigqueryConfig';

// Cloud Service Configurations
import { s3Config } from './cloud/s3Config';
import { googleSheetsConfig } from './cloud/googleSheetsConfig';
import { awsConfig } from './cloud/awsConfig';
import { lambdaConfig } from './cloud/lambdaConfig';

// Communication Configurations
import { slackConfig } from './communication/slackConfig';
import { discordConfig } from './communication/discordConfig';
import { telegramConfig } from './communication/telegramConfig';
import { teamsConfig } from './communication/teamsConfig';
import { twilioConfig } from './communication/twilioConfig';
import { whatsappConfig } from './communication/whatsappConfig';
import { zoomConfig } from './communication/zoomConfig';

// E-commerce Configurations
import { stripeConfig } from './ecommerce/stripeConfig';
import { paypalConfig } from './ecommerce/paypalConfig';
import { shopifyConfig } from './ecommerce/shopifyConfig';

// Development Configurations
import { githubConfig } from './development/githubConfig';
import { gitlabConfig } from './development/gitlabConfig';
import { jiraConfig } from './development/jiraConfig';

// CRM Configurations
import { salesforceConfig } from './crm/salesforceConfig';
import { hubspotConfig } from './crm/hubspotConfig';

// Marketing Configurations
import { mailchimpConfig } from './marketing/mailchimpConfig';

// Analytics Configurations
import { googleAnalyticsConfig } from './analytics/googleAnalyticsConfig';
import { mixpanelConfig } from './analytics/mixpanelConfig';

// Productivity Configurations
import { notionConfig } from './productivity/notionConfig';
import { airtableConfig } from './productivity/airtableConfig';

// Microsoft Office Configurations
import { excel365Config } from './microsoft/excel365Config';
import { outlookConfig } from './microsoft/outlookConfig';

// Social Media Configurations
import { twitterConfig } from './social/twitterConfig';
import { linkedinConfig } from './social/linkedinConfig';
import { instagramConfig } from './social/instagramConfig';
import { youtubeConfig } from './social/youtubeConfig';

// DevOps Configurations
import { dockerConfig } from './devops/dockerConfig';
import { jenkinsConfig } from './devops/jenkinsConfig';
import { sentryConfig } from './devops/sentryConfig';
import { bitbucketConfig } from './devops/bitbucketConfig';
import { circleciConfig } from './devops/circleciConfig';

// Support Configurations
import { zendeskConfig } from './support/zendeskConfig';
import { intercomConfig } from './support/intercomConfig';

// Storage Configurations
import { dropboxConfig } from './storage/dropboxConfig';
import { boxConfig } from './storage/boxConfig';
import { googleDriveConfig } from './storage/googleDriveConfig';

// Scheduling Configurations
import { calendlyConfig } from './scheduling/calendlyConfig';

// Forms Configurations
import { typeformConfig } from './forms/typeformConfig';

// Signature Configurations
import { docusignConfig } from './signature/docusignConfig';

// Monitoring Configurations
import { grafanaConfig } from './monitoring/grafanaConfig';
import { datadogConfig } from './monitoring/datadogConfig';

// Extended field config type to support additional field types used by some configs
interface ExtendedFieldConfig {
  label: string;
  field: string;
  type: string;
  placeholder?: string;
  options?: Array<{ value: string; label: string }> | ((config?: Record<string, unknown>) => Array<{ value: string; label: string }>);
  required?: boolean | ((config?: Record<string, unknown>) => boolean);
  validation?: (value: unknown, config?: Record<string, unknown>) => string | null;
  description?: string;
  defaultValue?: unknown;
  tooltip?: string;
  showWhen?: boolean | ((config?: Record<string, unknown>) => boolean);
  visible?: boolean | ((config?: Record<string, unknown>) => boolean);
  min?: number;
  max?: number;
  credentialTypes?: string[];
}

// Extended node config definition to support extended field configs
interface ExtendedNodeConfigDefinition {
  fields: ExtendedFieldConfig[];
  validate?: (config: Record<string, unknown>) => Record<string, string>;
  validation?: Record<string, (value: unknown, config?: Record<string, unknown>) => string | null>;
  transform?: (config: Record<string, unknown>) => Record<string, unknown>;
  examples?: Array<{
    name?: string;
    label?: string;
    description?: string;
    config: Record<string, unknown>;
  }>;
}

// Configuration registry - Maps node types to their configuration definitions
export const nodeConfigRegistry: Record<string, NodeConfigDefinition | ExtendedNodeConfigDefinition> = {
  // AI & ML
  openai: openAIConfig,
  anthropic: anthropicConfig,
  pinecone: pineconeConfig,
  
  // Databases
  mysql: mysqlConfig,
  postgres: postgresConfig,
  mongodb: mongodbConfig,
  redis: redisConfig,
  elasticsearch: elasticsearchConfig,
  bigquery: bigqueryConfig,
  
  // Cloud Services
  s3: s3Config,
  googleSheets: googleSheetsConfig,
  aws: awsConfig,
  lambda: lambdaConfig,
  
  // Communication
  slack: slackConfig,
  discord: discordConfig,
  telegram: telegramConfig,
  teams: teamsConfig,
  twilio: twilioConfig,
  whatsapp: whatsappConfig,
  zoom: zoomConfig,
  
  // E-commerce
  stripe: stripeConfig,
  paypal: paypalConfig,
  shopify: shopifyConfig,
  
  // Development
  github: githubConfig,
  gitlab: gitlabConfig,
  jira: jiraConfig,
  
  // CRM
  salesforce: salesforceConfig,
  hubspot: hubspotConfig,
  
  // Marketing
  mailchimp: mailchimpConfig,
  
  // Analytics
  googleAnalytics: googleAnalyticsConfig,
  mixpanel: mixpanelConfig,
  
  // Productivity
  notion: notionConfig,
  airtable: airtableConfig,
  
  // Microsoft Office
  excel365: excel365Config,
  outlook: outlookConfig,
  
  // Social Media
  twitter: twitterConfig,
  linkedin: linkedinConfig,
  instagram: instagramConfig,
  youtube: youtubeConfig,
  
  // DevOps
  docker: dockerConfig,
  jenkins: jenkinsConfig,
  sentry: sentryConfig,
  bitbucket: bitbucketConfig,
  circleci: circleciConfig,
  
  // Support
  zendesk: zendeskConfig,
  intercom: intercomConfig,
  
  // Storage
  dropbox: dropboxConfig,
  box: boxConfig,
  googleDrive: googleDriveConfig,
  
  // Scheduling
  calendly: calendlyConfig,
  
  // Forms
  typeform: typeformConfig,
  
  // Signature
  docusign: docusignConfig,
  
  // Monitoring
  grafana: grafanaConfig,
  datadog: datadogConfig,
  
  // Additional configurations can be registered dynamically
  // redis: redisConfig,
  // elasticsearch: elasticsearchConfig,
  // aws: awsConfig,
  // lambda: lambdaConfig,
  // googleDrive: googleDriveConfig,
  
  // Communication
  // slack: slackConfig,
  // discord: discordConfig,
  // telegram: telegramConfig,
  // teams: teamsConfig,
  // twilio: twilioConfig,
  // whatsapp: whatsappConfig,
  
  // Development
  // github: githubConfig,
  // gitlab: gitlabConfig,
  // jira: jiraConfig,
  
  // E-commerce
  // stripe: stripeConfig,
  // paypal: paypalConfig,
  // shopify: shopifyConfig,
  
  // Productivity
  // notion: notionConfig,
  // airtable: airtableConfig,
  // trello: trelloConfig,
};

// Helper function to check if a node type has a configuration
export const hasNodeConfig = (nodeType: string): boolean => {
  return nodeType in nodeConfigRegistry;
};

// Helper function to get node configuration
export const getNodeConfig = (nodeType: string): NodeConfigDefinition | ExtendedNodeConfigDefinition | null => {
  return nodeConfigRegistry[nodeType] || null;
};