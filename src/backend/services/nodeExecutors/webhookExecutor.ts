/**
 * Webhook Node Executor
 * Triggers workflows from incoming webhooks
 */

import { Node } from '@xyflow/react';
import { NodeExecutor } from './index';
import * as crypto from 'crypto';

export const webhookExecutor: NodeExecutor = {
  async execute(node: Node, context: unknown): Promise<unknown> {
    const data = node.data as {
      method?: string;
      authentication?: {
        enabled?: boolean;
        type?: string;
        secret?: string;
        apiKey?: string;
      };
      responseType?: string;
      responseData?: unknown;
    };

    const {
      method = 'POST',
      authentication,
      responseType = 'json',
      responseData = { success: true }
    } = data;

    // For webhook trigger nodes, the input comes from the webhook request
    const webhookData = (context as any)?.webhookData || (context as any)?.input || {};

    try {
      // Validate authentication if configured
      if (authentication && authentication.enabled) {
        const isValid = await validateAuthentication(
          webhookData,
          authentication
        );

        if (!isValid) {
          throw new Error('Webhook authentication failed');
        }
      }

      // Process webhook data
      const processedData = {
        method: webhookData.method || method,
        headers: webhookData.headers || {},
        query: webhookData.query || {},
        body: webhookData.body || {},
        timestamp: new Date().toISOString()
      };

      // Return processed data and response configuration
      return {
        data: processedData,
        response: {
          status: 200,
          type: responseType,
          data: responseData
        }
      };

    } catch (error) {
      return {
        data: null,
        response: {
          status: 401,
          type: 'json',
          data: { error: error instanceof Error ? error.message : String(error) }
        }
      };
    }
  },

  validate(node: Node): string[] {
    const errors: string[] = [];
    const config = node.data as {
      authentication?: {
        enabled?: boolean;
        type?: string;
        secret?: string;
        apiKey?: string;
      };
    };

    if (config.authentication?.enabled) {
      if (!config.authentication.type) {
        errors.push('Authentication type is required when authentication is enabled');
      }

      switch (config.authentication.type) {
        case 'secret':
          if (!config.authentication.secret) {
            errors.push('Secret is required for secret authentication');
          }
          break;

        case 'api_key':
          if (!config.authentication.apiKey) {
            errors.push('API key is required for API key authentication');
          }
          break;
      }
    }

    return errors;
  }
};

// Helper functions moved outside the object literal
async function validateAuthentication(
  webhookData: unknown,
  authConfig: unknown
): Promise<boolean> {
  const config = authConfig as { type?: string };

  switch (config.type) {
    case 'secret':
      return validateSecretAuth(webhookData, authConfig);

    case 'api_key':
      return validateApiKeyAuth(webhookData, authConfig);

    case 'signature':
      return validateSignatureAuth(webhookData, authConfig);

    default:
      return false;
  }
}

function validateSecretAuth(data: unknown, config: unknown): boolean {
  const dataRecord = data as Record<string, unknown>;
  const headers = dataRecord.headers as Record<string, string> | undefined;
  const query = dataRecord.query as Record<string, string> | undefined;
  const configRecord = config as { secret?: string };

  const providedSecret = headers?.['x-secret'] || query?.secret;

  return providedSecret === configRecord.secret;
}

function validateApiKeyAuth(data: unknown, config: unknown): boolean {
  const dataRecord = data as Record<string, unknown>;
  const headers = dataRecord.headers as Record<string, string> | undefined;
  const query = dataRecord.query as Record<string, string> | undefined;
  const configRecord = config as { apiKey?: string };

  const providedKey = headers?.['x-api-key'] ||
                     headers?.['authorization']?.replace('Bearer ', '') ||
                     query?.api_key;

  return providedKey === configRecord.apiKey;
}

function validateSignatureAuth(data: unknown, config: unknown): boolean {
  const dataRecord = data as Record<string, unknown>;
  const headers = dataRecord.headers as Record<string, string> | undefined;
  const body = dataRecord.body;
  const configRecord = config as { secret?: string };

  const signature = headers?.['x-signature'];
  if (!signature || !configRecord.secret) return false;

  // Validate HMAC signature
  const payload = JSON.stringify(body);
  const expectedSignature = crypto
    .createHmac('sha256', configRecord.secret)
    .update(payload)
    .digest('hex');

  return signature === expectedSignature;
}