/**
 * Webhook Node Executor
 * Processes incoming webhook data and returns response configuration
 */

import { NodeExecutor, NodeExecutionContext, NodeExecutionResult } from './types';
import * as crypto from 'crypto';

export const webhookExecutor: NodeExecutor = {
  async execute(context: NodeExecutionContext): Promise<NodeExecutionResult> {
    const config = context.config || {};

    const method = (config.method || 'POST') as string;
    const authentication = config.authentication as {
      enabled?: boolean;
      type?: string;
      secret?: string;
      apiKey?: string;
    } | undefined;
    const responseType = (config.responseType || 'json') as string;
    const responseData = config.responseData || { success: true };

    const webhookData = context.input || {};

    try {
      if (authentication && authentication.enabled) {
        const isValid = validateAuthentication(webhookData, authentication);
        if (!isValid) {
          throw new Error('Webhook authentication failed');
        }
      }

      const processedData = {
        method: webhookData.method || method,
        headers: webhookData.headers || {},
        query: webhookData.query || {},
        body: webhookData.body || {},
        timestamp: new Date().toISOString()
      };

      return {
        success: true,
        data: {
          data: processedData,
          response: {
            status: 200,
            type: responseType,
            data: responseData
          }
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        data: {
          data: null,
          response: {
            status: 401,
            type: 'json',
            data: { error: error instanceof Error ? error.message : String(error) }
          }
        },
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      };
    }
  },
};

function validateAuthentication(
  webhookData: any,
  authConfig: { type?: string; secret?: string; apiKey?: string }
): boolean {
  switch (authConfig.type) {
    case 'secret': {
      const headers = webhookData.headers || {};
      const query = webhookData.query || {};
      const providedSecret = headers['x-secret'] || query.secret;
      return providedSecret === authConfig.secret;
    }
    case 'api_key': {
      const headers = webhookData.headers || {};
      const query = webhookData.query || {};
      const providedKey = headers['x-api-key'] ||
                         headers['authorization']?.replace('Bearer ', '') ||
                         query.api_key;
      return providedKey === authConfig.apiKey;
    }
    case 'signature': {
      const headers = webhookData.headers || {};
      const body = webhookData.body;
      const signature = headers['x-signature'];
      if (!signature || !authConfig.secret) return false;
      const payload = JSON.stringify(body);
      const expectedSignature = crypto
        .createHmac('sha256', authConfig.secret)
        .update(payload)
        .digest('hex');
      return signature === expectedSignature;
    }
    default:
      return false;
  }
}
