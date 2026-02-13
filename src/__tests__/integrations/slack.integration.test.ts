/**
 * Slack Integration Tests
 * Tests for Slack API client and operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SlackClient } from '../../integrations/slack/SlackClient';
import type { SlackCredentials, SlackMessage } from '../../integrations/slack/slack.types';

describe('Slack Integration', () => {
  let client: SlackClient;
  const mockCredentials: SlackCredentials = {
    botToken: 'xoxb-test-token',
    userToken: 'xoxp-test-token',
    webhookUrl: 'https://hooks.slack.com/services/test/test/test'
  };

  beforeEach(() => {
    client = new SlackClient(mockCredentials);
    global.fetch = vi.fn();
  });

  describe('sendMessage', () => {
    it('should send a message to a channel', async () => {
      const mockResponse = {
        ok: true,
        channel: 'C1234567890',
        ts: '1234567890.123456',
        message: {
          type: 'message',
          subtype: 'bot_message',
          text: 'Test message',
          ts: '1234567890.123456',
          username: 'TestBot',
          bot_id: 'B1234567890'
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      const result = await client.sendMessage({
        channel: '#general',
        text: 'Test message'
      });

      expect(result.ok).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://slack.com/api/chat.postMessage',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer xoxb-test-token',
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should handle errors gracefully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ ok: false, error: 'invalid_auth' })
      });

      const result = await client.sendMessage({
        channel: '#general',
        text: 'Test message'
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('invalid_auth');
    });

    it('should support rich formatting with blocks', async () => {
      const mockBlocks = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Bold* _italic_ `code`'
          }
        }
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, ts: '123.456' })
      });

      await client.sendMessage({
        channel: '#general',
        text: 'Fallback text',
        blocks: mockBlocks
      });

      const fetchCall = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.blocks).toEqual(mockBlocks);
    });
  });

  describe('uploadFile', () => {
    it('should upload a file to a channel', async () => {
      const mockFile = new Blob(['test content'], { type: 'text/plain' });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          file: {
            id: 'F1234567890',
            name: 'test.txt',
            title: 'Test File',
            mimetype: 'text/plain',
            size: 12
          }
        })
      });

      const result = await client.uploadFile({
        channels: ['#general'],
        file: mockFile,
        filename: 'test.txt',
        title: 'Test File'
      });

      expect(result.ok).toBe(true);
      expect(result.data?.file?.name).toBe('test.txt');
    });
  });

  describe('sendWebhook', () => {
    it('should send message via webhook URL', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'ok'
      });

      const result = await client.sendWebhookMessage({
        text: 'Webhook message',
        username: 'TestBot',
        icon_emoji: ':robot_face:'
      });

      expect(result.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        mockCredentials.webhookUrl,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });
  });

  describe('getChannels', () => {
    it('should fetch list of channels', async () => {
      const mockChannels = {
        ok: true,
        channels: [
          { id: 'C1', name: 'general', is_member: true },
          { id: 'C2', name: 'random', is_member: false }
        ]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockChannels
      });

      const result = await client.getChannels({});

      expect(result.ok).toBe(true);
      expect(result.data?.channels).toHaveLength(2);
    });
  });

  describe('getUserInfo', () => {
    it('should fetch user information', async () => {
      const mockUser = {
        ok: true,
        user: {
          id: 'U1234567890',
          name: 'testuser',
          real_name: 'Test User',
          profile: {
            email: 'test@example.com',
            display_name: 'Test'
          }
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser
      });

      const result = await client.getUserInfo({ user: 'U1234567890' });

      expect(result.ok).toBe(true);
      expect(result.data?.user?.name).toBe('testuser');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await client.sendMessage({
        channel: '#general',
        text: 'Test'
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should handle rate limiting', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'Retry-After': '60' }),
        json: async () => ({ ok: false, error: 'rate_limited' })
      });

      const result = await client.sendMessage({
        channel: '#general',
        text: 'Test'
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('rate_limited');
    });
  });
});
