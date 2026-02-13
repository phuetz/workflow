/**
 * Intent Recognizer Tests
 * Comprehensive tests for natural language intent recognition
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IntentRecognizer } from '../../nlp/IntentRecognizer';

describe('IntentRecognizer', () => {
  let recognizer: IntentRecognizer;

  beforeEach(() => {
    recognizer = new IntentRecognizer();
  });

  describe('Schedule Pattern Recognition', () => {
    it('should recognize morning schedule pattern', async () => {
      const result = await recognizer.recognize(
        'Every morning at 9am, fetch top HN stories and send to Slack'
      );

      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.primaryIntent).toBeDefined();
      expect(result.primaryIntent?.type).toBe('schedule');
      expect(result.primaryIntent?.trigger?.schedule).toBeDefined();
      expect(result.primaryIntent?.actions.length).toBeGreaterThan(0);
    });

    it('should recognize hourly schedule', async () => {
      const result = await recognizer.recognize('Every hour check database');

      expect(result.primaryIntent?.type).toBe('schedule');
      expect(result.primaryIntent?.trigger?.schedule).toContain('*');
    });

    it('should recognize daily schedule', async () => {
      const result = await recognizer.recognize('Daily at 6pm send report');

      expect(result.primaryIntent?.type).toBe('schedule');
      expect(result.primaryIntent?.trigger?.schedule).toBeDefined();
    });
  });

  describe('Webhook Pattern Recognition', () => {
    it('should recognize webhook trigger', async () => {
      const result = await recognizer.recognize(
        'When webhook received, validate data and save to database'
      );

      expect(result.primaryIntent?.type).toBe('webhook');
      expect(result.primaryIntent?.actions.length).toBeGreaterThan(0);
    });

    it('should recognize API call trigger', async () => {
      const result = await recognizer.recognize(
        'On API call, process payment and send confirmation'
      );

      expect(result.primaryIntent?.type).toBe('webhook');
    });
  });

  describe('Watch Pattern Recognition', () => {
    it('should recognize file watch pattern', async () => {
      const result = await recognizer.recognize(
        'Watch for new files and process them'
      );

      expect(result.primaryIntent?.type).toBe('watch');
    });

    it('should recognize monitor pattern', async () => {
      const result = await recognizer.recognize(
        'Monitor database for new records'
      );

      expect(result.primaryIntent?.type).toBe('watch');
    });
  });

  describe('Entity Extraction', () => {
    it('should extract Slack service entity', async () => {
      const result = await recognizer.recognize(
        'Send message to Slack channel #general'
      );

      const slackEntity = result.entities.find(e =>
        e.value.toLowerCase().includes('slack')
      );
      expect(slackEntity).toBeDefined();
    });

    it('should extract email addresses', async () => {
      const result = await recognizer.recognize(
        'Send email to user@example.com'
      );

      const emailEntity = result.entities.find(e =>
        e.value.includes('@')
      );
      expect(emailEntity).toBeDefined();
    });

    it('should extract channel names', async () => {
      const result = await recognizer.recognize(
        'Post to #notifications channel'
      );

      const channelEntity = result.entities.find(e =>
        e.value.includes('notification')
      );
      expect(channelEntity).toBeDefined();
    });

    it('should extract schedule times', async () => {
      const result = await recognizer.recognize(
        'Run at 9am every morning'
      );

      const scheduleEntity = result.entities.find(e =>
        e.type === 'schedule'
      );
      expect(scheduleEntity).toBeDefined();
    });
  });

  describe('Action Recognition', () => {
    it('should recognize fetch action', async () => {
      const result = await recognizer.recognize(
        'Fetch data from API'
      );

      const fetchAction = result.primaryIntent?.actions.find(a =>
        a.type === 'fetch'
      );
      expect(fetchAction).toBeDefined();
    });

    it('should recognize send/notify action', async () => {
      const result = await recognizer.recognize(
        'Send notification to team'
      );

      const notifyAction = result.primaryIntent?.actions.find(a =>
        a.type === 'notify'
      );
      expect(notifyAction).toBeDefined();
    });

    it('should recognize save/store action', async () => {
      const result = await recognizer.recognize(
        'Save to PostgreSQL database'
      );

      const saveAction = result.primaryIntent?.actions.find(a =>
        a.type === 'save' || a.type === 'store'
      );
      expect(saveAction).toBeDefined();
    });

    it('should recognize transform action', async () => {
      const result = await recognizer.recognize(
        'Transform JSON data'
      );

      const transformAction = result.primaryIntent?.actions.find(a =>
        a.type === 'transform'
      );
      expect(transformAction).toBeDefined();
    });
  });

  describe('Multi-Action Workflows', () => {
    it('should recognize fetch-transform-send pattern', async () => {
      const result = await recognizer.recognize(
        'Fetch from API, transform data, and send to Slack'
      );

      expect(result.primaryIntent?.actions.length).toBeGreaterThanOrEqual(2);
    });

    it('should recognize validate-save-notify pattern', async () => {
      const result = await recognizer.recognize(
        'Validate input, save to database, and notify admin'
      );

      expect(result.primaryIntent?.actions.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Confidence Scoring', () => {
    it('should have high confidence for clear intents', async () => {
      const result = await recognizer.recognize(
        'Every morning at 9am, fetch GitHub trending repos and send to Slack'
      );

      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should have medium confidence for partial intents', async () => {
      const result = await recognizer.recognize(
        'Do something with data'
      );

      expect(result.confidence).toBeLessThan(0.7);
    });

    it('should have low confidence for vague intents', async () => {
      const result = await recognizer.recognize(
        'Process stuff'
      );

      expect(result.confidence).toBeLessThan(0.6);
    });
  });

  describe('Service Mapping', () => {
    it('should map to correct node type for Slack', async () => {
      const result = await recognizer.recognize(
        'Send message to Slack'
      );

      const slackAction = result.primaryIntent?.actions.find(a =>
        a.service?.toLowerCase().includes('slack') || a.nodeType === 'slack'
      );
      expect(slackAction).toBeDefined();
    });

    it('should map to correct node type for database', async () => {
      const result = await recognizer.recognize(
        'Save to PostgreSQL'
      );

      const dbAction = result.primaryIntent?.actions.find(a =>
        a.nodeType?.includes('postgres') || a.nodeType?.includes('database')
      );
      expect(dbAction).toBeDefined();
    });

    it('should map to HTTP request for API calls', async () => {
      const result = await recognizer.recognize(
        'Call external API'
      );

      const httpAction = result.primaryIntent?.actions.find(a =>
        a.nodeType === 'httpRequest'
      );
      expect(httpAction).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input', async () => {
      const result = await recognizer.recognize('');

      expect(result.confidence).toBe(0);
      expect(result.intents.length).toBe(0);
    });

    it('should handle very long input', async () => {
      const longInput = 'Every morning '.repeat(50) + 'send email';
      const result = await recognizer.recognize(longInput);

      expect(result).toBeDefined();
      expect(result.processingTime).toBeLessThan(5000); // Should process within 5s
    });

    it('should handle special characters', async () => {
      const result = await recognizer.recognize(
        'Send to #general-notifications channel'
      );

      expect(result).toBeDefined();
    });

    it('should handle multiple languages mixed', async () => {
      const result = await recognizer.recognize(
        'Fetch data et send to Slack'
      );

      expect(result).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should process simple intent quickly', async () => {
      const start = Date.now();
      await recognizer.recognize('Send email daily');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000); // Less than 1 second
    });

    it('should process complex intent efficiently', async () => {
      const start = Date.now();
      await recognizer.recognize(
        'Every morning at 9am, fetch top HN stories, filter by score > 100, summarize with AI, and send to Slack #tech'
      );
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(2000); // Less than 2 seconds
    });
  });

  describe('Accuracy Metrics', () => {
    it('should achieve >90% accuracy on clear patterns', async () => {
      const testCases = [
        'Every morning fetch data and send to Slack',
        'When webhook received save to database',
        'Hourly check API and notify team',
        'Daily at 6pm send report via email',
        'Monitor logs and alert on errors'
      ];

      let successCount = 0;

      for (const testCase of testCases) {
        const result = await recognizer.recognize(testCase);
        if (result.confidence > 0.7 && result.primaryIntent) {
          successCount++;
        }
      }

      const accuracy = successCount / testCases.length;
      expect(accuracy).toBeGreaterThan(0.9); // >90% accuracy
    });
  });
});
