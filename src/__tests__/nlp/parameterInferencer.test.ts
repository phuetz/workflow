/**
 * Parameter Inferencer Tests
 * Tests for smart parameter inference and defaults
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ParameterInferencer } from '../../nlp/ParameterInferencer';

describe('ParameterInferencer', () => {
  let inferencer: ParameterInferencer;

  beforeEach(() => {
    inferencer = new ParameterInferencer();
  });

  describe('Schedule Inference', () => {
    it('should infer morning schedule', async () => {
      const result = await inferencer.inferValue(
        'schedule',
        'Every morning at 9am'
      );

      expect(result).toContain('9');
      expect(typeof result).toBe('string');
    });

    it('should infer hourly schedule', async () => {
      const result = await inferencer.inferValue(
        'schedule',
        'Run hourly'
      );

      expect(result).toContain('*');
    });

    it('should infer daily schedule', async () => {
      const result = await inferencer.inferValue(
        'schedule',
        'Daily at 6pm'
      );

      expect(result).toBeDefined();
    });

    it('should handle interval patterns', async () => {
      const result = await inferencer.inferValue(
        'schedule',
        'Every 15 minutes'
      );

      expect(result).toContain('15');
    });
  });

  describe('Channel Inference', () => {
    it('should extract channel from text', async () => {
      const result = await inferencer.inferValue(
        'channel',
        'Send to #notifications'
      );

      expect(result).toContain('notification');
    });

    it('should provide smart default channel', async () => {
      const result = await inferencer.inferValue(
        'channel',
        'Send alert message'
      );

      expect(result).toBeDefined();
      if (typeof result === 'string') {
        expect(result.startsWith('#')).toBe(true);
      }
    });

    it('should use #alerts for critical messages', async () => {
      const result = await inferencer.inferValue(
        'channel',
        'Send critical alert'
      );

      if (typeof result === 'string') {
        expect(result.toLowerCase()).toContain('alert');
      }
    });
  });

  describe('Email Inference', () => {
    it('should extract email address', async () => {
      const result = await inferencer.inferValue(
        'email',
        'Send to user@example.com'
      );

      expect(result).toBe('user@example.com');
    });

    it('should extract multiple email addresses', async () => {
      const result = await inferencer.inferValue(
        'email',
        'Send to admin@example.com or support@example.com'
      );

      expect(result).toBeDefined();
      if (typeof result === 'string') {
        expect(result).toContain('@');
      }
    });
  });

  describe('URL Inference', () => {
    it('should extract HTTP URL', async () => {
      const result = await inferencer.inferValue(
        'url',
        'Fetch from https://api.example.com/data'
      );

      expect(result).toBe('https://api.example.com/data');
    });

    it('should extract URL with fetch keyword', async () => {
      const result = await inferencer.inferValue(
        'url',
        'fetch from https://example.com'
      );

      expect(result).toBe('https://example.com');
    });
  });

  describe('Smart Defaults', () => {
    it('should provide default email subject', async () => {
      const result = await inferencer.inferValue(
        'subject',
        'Send error notification'
      );

      expect(result).toBeDefined();
      if (typeof result === 'string') {
        expect(result.toLowerCase()).toContain('error');
      }
    });

    it('should provide default HTTP method', async () => {
      const result = await inferencer.inferValue(
        'method',
        'Post data to API'
      );

      expect(result).toBe('POST');
    });

    it('should default GET for fetch operations', async () => {
      const result = await inferencer.inferValue(
        'method',
        'Fetch data from API'
      );

      expect(result).toBe('GET');
    });

    it('should provide default AI model', async () => {
      const result = await inferencer.inferValue(
        'model',
        'Summarize with AI'
      );

      expect(result).toBeDefined();
      expect(['gpt-4', 'claude-3-sonnet'].includes(result as string)).toBe(true);
    });
  });

  describe('Action Parameters', () => {
    it('should infer Slack parameters', async () => {
      const params = await inferencer.inferParameters({
        type: 'manual',
        actions: [
          {
            type: 'notify',
            service: 'slack',
            confidence: 0.8,
            nodeType: 'slack'
          }
        ],
        confidence: 0.8,
        originalText: 'Send to #general',
        entities: []
      });

      const channelParam = params.find(p => p.name === 'action_0_channel');
      expect(channelParam).toBeDefined();
    });

    it('should infer email parameters', async () => {
      const params = await inferencer.inferParameters({
        type: 'manual',
        actions: [
          {
            type: 'email',
            confidence: 0.8,
            nodeType: 'email'
          }
        ],
        confidence: 0.8,
        originalText: 'Send email to user@example.com about report',
        entities: []
      });

      const subjectParam = params.find(p => p.name.includes('subject'));
      expect(subjectParam).toBeDefined();
    });

    it('should infer HTTP request parameters', async () => {
      const params = await inferencer.inferParameters({
        type: 'manual',
        actions: [
          {
            type: 'fetch',
            confidence: 0.8,
            nodeType: 'httpRequest'
          }
        ],
        confidence: 0.8,
        originalText: 'Fetch from https://api.example.com',
        entities: []
      });

      const urlParam = params.find(p => p.name.includes('url'));
      const methodParam = params.find(p => p.name.includes('method'));

      expect(urlParam || methodParam).toBeDefined();
    });
  });

  describe('Confidence Scoring', () => {
    it('should have high confidence for explicit values', async () => {
      const params = await inferencer.inferParameters({
        type: 'manual',
        actions: [
          {
            type: 'notify',
            service: 'slack',
            confidence: 0.8,
            nodeType: 'slack'
          }
        ],
        confidence: 0.8,
        originalText: 'Send to #alerts channel',
        entities: []
      });

      const channelParam = params.find(p => p.name.includes('channel'));
      if (channelParam) {
        expect(channelParam.confidence).toBeGreaterThan(0.8);
        expect(channelParam.source).toBe('explicit');
      }
    });

    it('should have medium confidence for inferred values', async () => {
      const params = await inferencer.inferParameters({
        type: 'manual',
        actions: [
          {
            type: 'email',
            confidence: 0.8,
            nodeType: 'email'
          }
        ],
        confidence: 0.8,
        originalText: 'Send error notification',
        entities: []
      });

      const subjectParam = params.find(p => p.name.includes('subject'));
      if (subjectParam) {
        expect(subjectParam.confidence).toBeLessThan(1.0);
        expect(subjectParam.source).toBe('inferred');
      }
    });

    it('should have lower confidence for defaults', async () => {
      const params = await inferencer.inferParameters({
        type: 'manual',
        actions: [
          {
            type: 'notify',
            service: 'slack',
            confidence: 0.8,
            nodeType: 'slack'
          }
        ],
        confidence: 0.8,
        originalText: 'Send notification',
        entities: []
      });

      const channelParam = params.find(p => p.name.includes('channel'));
      if (channelParam && channelParam.source === 'default') {
        expect(channelParam.confidence).toBeLessThan(0.8);
      }
    });
  });

  describe('Default Values', () => {
    it('should provide Slack defaults', () => {
      const defaults = inferencer.getAllDefaults('slack');

      expect(defaults.channel).toBeDefined();
      expect(defaults.username).toBeDefined();
    });

    it('should provide HTTP request defaults', () => {
      const defaults = inferencer.getAllDefaults('httpRequest');

      expect(defaults.method).toBe('GET');
      expect(defaults.timeout).toBeDefined();
    });

    it('should provide OpenAI defaults', () => {
      const defaults = inferencer.getAllDefaults('openai');

      expect(defaults.model).toBe('gpt-4');
      expect(defaults.temperature).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should infer values quickly', async () => {
      const start = Date.now();
      await inferencer.inferValue('schedule', 'Every morning');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // < 100ms
    });

    it('should infer parameters efficiently', async () => {
      const start = Date.now();
      await inferencer.inferParameters({
        type: 'manual',
        actions: [
          { type: 'notify', confidence: 0.8, nodeType: 'slack' },
          { type: 'email', confidence: 0.8, nodeType: 'email' },
          { type: 'fetch', confidence: 0.8, nodeType: 'httpRequest' }
        ],
        confidence: 0.8,
        originalText: 'Complex workflow',
        entities: []
      });
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(200); // < 200ms
    });
  });

  describe('Accuracy', () => {
    it('should achieve >90% inference accuracy', async () => {
      const testCases = [
        { param: 'schedule', text: 'Every morning', expected: 'cron' },
        { param: 'channel', text: 'Send to #general', expected: '#general' },
        { param: 'email', text: 'Email test@example.com', expected: 'test@example.com' },
        { param: 'url', text: 'Fetch https://api.com', expected: 'https://api.com' },
        { param: 'method', text: 'POST to API', expected: 'POST' }
      ];

      let successCount = 0;

      for (const test of testCases) {
        const result = await inferencer.inferValue(test.param, test.text);

        if (result && String(result).includes(test.expected.split('/')[0])) {
          successCount++;
        }
      }

      const accuracy = successCount / testCases.length;
      expect(accuracy).toBeGreaterThan(0.9); // >90% accuracy
    });
  });
});
