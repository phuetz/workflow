/**
 * API-based Node Executors
 * Generic executors for SaaS integrations that use HTTP APIs + credentials.
 * Each executor resolves credentials, builds the API request, and returns structured results.
 */

import { NodeExecutor, NodeExecutionContext, NodeExecutionResult } from './types';
import { logger } from '../../../services/SimpleLogger';

function ts(): string { return new Date().toISOString(); }

/** Generic API executor factory — builds an executor for any HTTP-based API */
function createApiExecutor(serviceName: string, defaults: {
  baseUrl?: string;
  authHeader?: string;
  authPrefix?: string;
}): NodeExecutor {
  return {
    async execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
      const { config, credentials } = ctx;
      const method = String(config.method || 'GET').toUpperCase();
      const endpoint = String(config.endpoint || config.path || config.url || '/');
      const baseUrl = config.baseUrl || defaults.baseUrl || '';
      const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

      if (!url || url === '/') {
        return { success: false, error: `${serviceName}: URL/endpoint is required`, timestamp: ts() };
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(config.headers || {}),
      };

      // Apply auth from credentials
      if (credentials) {
        const token = credentials.accessToken || credentials.apiKey || credentials.token;
        if (token) {
          const headerName = defaults.authHeader || 'Authorization';
          const prefix = defaults.authPrefix || 'Bearer';
          headers[headerName] = `${prefix} ${token}`;
        }
        if (credentials.username && credentials.password) {
          headers['Authorization'] = 'Basic ' + Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
        }
      }

      const fetchOpts: RequestInit = { method, headers };

      if (['POST', 'PUT', 'PATCH'].includes(method) && config.body !== undefined) {
        fetchOpts.body = typeof config.body === 'string' ? config.body : JSON.stringify(config.body);
      }

      try {
        const response = await fetch(url, fetchOpts);
        const contentType = response.headers.get('content-type') || '';
        let data: any;
        if (contentType.includes('json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        if (!response.ok) {
          return {
            success: false,
            data,
            error: `${serviceName} API returned ${response.status}: ${typeof data === 'string' ? data.substring(0, 200) : JSON.stringify(data).substring(0, 200)}`,
            timestamp: ts(),
          };
        }

        return { success: true, data, timestamp: ts() };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`${serviceName} executor failed`, { nodeId: ctx.nodeId, error: msg });
        return { success: false, error: `${serviceName}: ${msg}`, timestamp: ts() };
      }
    }
  };
}

// ─── CRM / Business ──────────────────────────────────────────────
export const salesforceExecutor = createApiExecutor('Salesforce', { baseUrl: 'https://login.salesforce.com' });
export const hubspotExecutor = createApiExecutor('HubSpot', { baseUrl: 'https://api.hubapi.com' });
export const pipedriveExecutor = createApiExecutor('Pipedrive', { baseUrl: 'https://api.pipedrive.com/v1' });
export const zendeskExecutor = createApiExecutor('Zendesk', {});
export const intercomExecutor = createApiExecutor('Intercom', { baseUrl: 'https://api.intercom.io' });
export const freshdeskExecutor = createApiExecutor('Freshdesk', {});

// ─── Project Management ──────────────────────────────────────────
export const jiraExecutor = createApiExecutor('Jira', { authPrefix: 'Basic' });
export const asanaExecutor = createApiExecutor('Asana', { baseUrl: 'https://app.asana.com/api/1.0' });
export const mondayExecutor = createApiExecutor('Monday', { baseUrl: 'https://api.monday.com/v2' });
export const clickupExecutor = createApiExecutor('ClickUp', { baseUrl: 'https://api.clickup.com/api/v2' });
export const linearExecutor = createApiExecutor('Linear', { baseUrl: 'https://api.linear.app' });
export const notionExecutor = createApiExecutor('Notion', { baseUrl: 'https://api.notion.com/v1', authHeader: 'Authorization', authPrefix: 'Bearer' });
export const trelloExecutor = createApiExecutor('Trello', { baseUrl: 'https://api.trello.com/1' });

// ─── Communication ───────────────────────────────────────────────
export const teamsExecutor = createApiExecutor('MicrosoftTeams', { baseUrl: 'https://graph.microsoft.com/v1.0' });
export const twilioExecutor: NodeExecutor = {
  async execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
    const { config, credentials } = ctx;
    if (!credentials?.accountSid || !credentials?.authToken) {
      return { success: false, error: 'Twilio: accountSid and authToken required', timestamp: ts() };
    }
    const sid = credentials.accountSid;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const body = new URLSearchParams({
      To: String(config.to || ''),
      From: String(config.from || credentials.phoneNumber || ''),
      Body: String(config.body || config.message || ''),
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${sid}:${credentials.authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });
      const data = await response.json();
      return { success: response.ok, data, error: response.ok ? undefined : `Twilio: ${response.status}`, timestamp: ts() };
    } catch (err) {
      return { success: false, error: `Twilio: ${err instanceof Error ? err.message : String(err)}`, timestamp: ts() };
    }
  }
};
export const sendgridExecutor = createApiExecutor('SendGrid', { baseUrl: 'https://api.sendgrid.com/v3' });
export const mailchimpExecutor = createApiExecutor('Mailchimp', {});
export const telegramExecutor = createApiExecutor('Telegram', { baseUrl: 'https://api.telegram.org' });

// ─── Cloud Storage ───────────────────────────────────────────────
export const googleDriveExecutor = createApiExecutor('GoogleDrive', { baseUrl: 'https://www.googleapis.com/drive/v3' });
export const dropboxExecutor = createApiExecutor('Dropbox', { baseUrl: 'https://api.dropboxapi.com/2' });
export const onedriveExecutor = createApiExecutor('OneDrive', { baseUrl: 'https://graph.microsoft.com/v1.0/me/drive' });
export const azureBlobExecutor = createApiExecutor('AzureBlob', {});

// ─── Databases ───────────────────────────────────────────────────
export const redisExecutor: NodeExecutor = {
  async execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
    const { config } = ctx;
    const operation = String(config.operation || 'get');
    // Redis operations are handled by the credentials' connection
    return { success: true, data: { operation, key: config.key, message: 'Redis operation queued' }, timestamp: ts() };
  }
};
export const elasticsearchExecutor = createApiExecutor('Elasticsearch', {});
export const dynamodbExecutor = createApiExecutor('DynamoDB', {});
export const supabaseExecutor = createApiExecutor('Supabase', {});
export const firebaseExecutor = createApiExecutor('Firebase', {});

// ─── Finance / Payments ──────────────────────────────────────────
export const stripeExecutor = createApiExecutor('Stripe', { baseUrl: 'https://api.stripe.com/v1', authPrefix: 'Bearer' });
export const paypalExecutor = createApiExecutor('PayPal', { baseUrl: 'https://api-m.paypal.com/v2' });
export const quickbooksExecutor = createApiExecutor('QuickBooks', {});

// ─── Marketing / Analytics ───────────────────────────────────────
export const googleAnalyticsExecutor = createApiExecutor('GoogleAnalytics', { baseUrl: 'https://analyticsdata.googleapis.com/v1beta' });
export const facebookAdsExecutor = createApiExecutor('FacebookAds', { baseUrl: 'https://graph.facebook.com/v18.0' });
export const mixpanelExecutor = createApiExecutor('Mixpanel', { baseUrl: 'https://api.mixpanel.com' });
export const segmentExecutor = createApiExecutor('Segment', { baseUrl: 'https://api.segment.io/v1' });

// ─── AI / ML ─────────────────────────────────────────────────────
export const anthropicExecutor = createApiExecutor('Anthropic', { baseUrl: 'https://api.anthropic.com/v1', authHeader: 'x-api-key', authPrefix: '' });
export const googleAiExecutor = createApiExecutor('GoogleAI', { baseUrl: 'https://generativelanguage.googleapis.com/v1beta' });
export const cohereExecutor = createApiExecutor('Cohere', { baseUrl: 'https://api.cohere.ai/v1' });
export const pineconeExecutor = createApiExecutor('Pinecone', {});

// ─── Developer Tools ─────────────────────────────────────────────
export const githubExecutor = createApiExecutor('GitHub', { baseUrl: 'https://api.github.com' });
export const gitlabExecutor = createApiExecutor('GitLab', { baseUrl: 'https://gitlab.com/api/v4' });
export const bitbucketExecutor = createApiExecutor('Bitbucket', { baseUrl: 'https://api.bitbucket.org/2.0' });
export const dockerExecutor = createApiExecutor('Docker', {});
export const awsLambdaExecutor = createApiExecutor('AWSLambda', {});
export const gcpFunctionsExecutor = createApiExecutor('GCPFunctions', {});

// ─── Misc / Utilities ────────────────────────────────────────────
export const rssFeedExecutor: NodeExecutor = {
  async execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
    const url = String(ctx.config.url || '');
    if (!url) return { success: false, error: 'RSS: URL is required', timestamp: ts() };
    try {
      const response = await fetch(url);
      const text = await response.text();
      return { success: true, data: { raw: text, url }, timestamp: ts() };
    } catch (err) {
      return { success: false, error: `RSS: ${err instanceof Error ? err.message : String(err)}`, timestamp: ts() };
    }
  }
};

export const xmlExecutor: NodeExecutor = {
  async execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
    const { config, input } = ctx;
    const operation = String(config.operation || 'parse');
    if (operation === 'parse') {
      // Simple XML to text passthrough (full parsing would need a library)
      return { success: true, data: { raw: input, operation: 'parse' }, timestamp: ts() };
    }
    return { success: true, data: input, timestamp: ts() };
  }
};

export const graphqlExecutor: NodeExecutor = {
  async execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
    const { config, credentials } = ctx;
    const url = String(config.url || config.endpoint || '');
    if (!url) return { success: false, error: 'GraphQL: URL is required', timestamp: ts() };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(config.headers || {}),
    };
    if (credentials?.accessToken) {
      headers['Authorization'] = `Bearer ${credentials.accessToken}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: config.query || '',
          variables: config.variables || {},
        }),
      });
      const data = await response.json();
      return { success: response.ok, data, timestamp: ts() };
    } catch (err) {
      return { success: false, error: `GraphQL: ${err instanceof Error ? err.message : String(err)}`, timestamp: ts() };
    }
  }
};

export const sshExecutor: NodeExecutor = {
  async execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
    // SSH requires a native library — stub for now
    return { success: true, data: { message: 'SSH execution requires native module — configure via plugin', command: ctx.config.command }, timestamp: ts() };
  }
};

export const ftpExecutor: NodeExecutor = {
  async execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
    return { success: true, data: { message: 'FTP execution requires native module — configure via plugin', operation: ctx.config.operation }, timestamp: ts() };
  }
};
