/**
 * Webhook Node Executor
 * Triggers workflows from incoming webhooks
 */

import { Node } from 'reactflow';
import { NodeExecutor } from './index';
import crypto from 'crypto';

export const webhookExecutor: NodeExecutor = {
  async execute(node: Node, context: unknown): Promise<unknown> {
    const {
      method = 'POST',
      authentication,
      responseType = 'json',
      responseData = { success: true }
    } = node.data;

    // For webhook trigger nodes, the input comes from the webhook request
    const webhookData = (context as any)?.webhookData || (context as any)?.input || {};

    try {
      // Validate authentication if configured
      if (authentication && authentication.enabled) {
        const isValid = await this.validateAuthentication(
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
    const config = node.data;

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
  },

  // Helper methods
  async validateAuthentication(
    webhookData: unknown,
    authConfig: unknown
  ): Promise<boolean> {
    switch (authConfig.type) {
      case 'secret':
        return this.validateSecretAuth(webhookData, authConfig);
      
      case 'api_key':
        return this.validateApiKeyAuth(webhookData, authConfig);
      
      case 'signature':
        return this.validateSignatureAuth(webhookData, authConfig);
      
      default:
        return false;
    }
  },

  validateSecretAuth(data: unknown, config: unknown): boolean {
    const providedSecret = (data as any).headers?.['x-secret'] ||
                          (data as any).query?.secret;

    return providedSecret === (config as any).secret;
  },

  validateApiKeyAuth(data: unknown, config: unknown): boolean {
    const providedKey = (data as any).headers?.['x-api-key'] ||
                       (data as any).headers?.['authorization']?.replace('Bearer ', '') ||
                       (data as any).query?.api_key;

    return providedKey === (config as any).apiKey;
  },

  validateSignatureAuth(data: unknown, config: unknown): boolean {
    const signature = (data as any).headers?.['x-signature'];
    if (!signature) return false;

    // Validate HMAC signature
    const payload = JSON.stringify((data as any).body);
    const expectedSignature = crypto
      .createHmac('sha256', (config as any).secret)
      .update(payload)
      .digest('hex');

    return signature === expectedSignature;
  }
};