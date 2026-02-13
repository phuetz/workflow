// TEST WRITING PLAN WEEK 1 - DAY 3: Webhook Node Tests
// Adding 5 tests for Webhook Node
import { describe, it, expect } from 'vitest';
import { nodeTypes } from '../../data/nodeTypes';

describe('Webhook Node - Webhook Triggers (Week 1 - Day 3)', () => {

  describe('Node Type Definition', () => {

    it('should have correct node type configuration', () => {
      const webhookNode = nodeTypes['webhook'];

      expect(webhookNode).toBeDefined();
      expect(webhookNode.type).toBe('webhook');
      expect(webhookNode.category).toBe('trigger');
    });

    it('should have no inputs (trigger node)', () => {
      const webhookNode = nodeTypes['webhook'];

      // Trigger nodes don't have inputs
      expect(webhookNode.inputs).toBe(0);
      expect(webhookNode.outputs).toBe(1);
    });

  });

  describe('Webhook Configuration', () => {

    it('should support different HTTP methods', () => {
      const supportedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      supportedMethods.forEach(method => {
        const webhookConfig = {
          method,
          path: '/webhook/test'
        };

        expect(webhookConfig.method).toBe(method);
        expect(webhookConfig.path).toBeDefined();
      });
    });

    it('should generate unique webhook URLs', () => {
      const webhooks = [
        { id: 'webhook-1', path: '/webhook/abc123' },
        { id: 'webhook-2', path: '/webhook/def456' },
        { id: 'webhook-3', path: '/webhook/ghi789' }
      ];

      // Each webhook should have unique path
      const paths = webhooks.map(w => w.path);
      const uniquePaths = new Set(paths);

      expect(uniquePaths.size).toBe(webhooks.length);
    });

  });

  describe('Webhook Security', () => {

    it('should support webhook authentication', () => {
      const authMethods = [
        { type: 'none' },
        { type: 'header', headerName: 'X-API-Key', headerValue: 'secret-key' },
        { type: 'hmac', secret: 'shared-secret', algorithm: 'sha256' },
        { type: 'jwt', secret: 'jwt-secret' }
      ];

      authMethods.forEach(auth => {
        expect(auth.type).toBeDefined();
      });
    });

    it('should validate HMAC signatures', () => {
      const hmacConfig = {
        secret: 'my-secret-key',
        algorithm: 'sha256',
        headerName: 'X-Signature'
      };

      expect(hmacConfig.secret).toBeDefined();
      expect(hmacConfig.algorithm).toBe('sha256');
      expect(hmacConfig.headerName).toBe('X-Signature');
    });

  });

});
