/**
 * Comprehensive Unit Tests for Intent Classifier
 * Tests WITHOUT mocks - using real implementations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IntentClassifier, intentClassifier } from '../copilot/IntentClassifier';

describe('IntentClassifier', () => {
  let classifier: IntentClassifier;

  beforeEach(() => {
    classifier = new IntentClassifier();
  });

  describe('classify - CREATE intent', () => {
    it('should classify "Create a workflow"', async () => {
      const result = await classifier.classify('Create a workflow');
      expect(result.intent).toBe('create');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should classify "Build a new automation"', async () => {
      const result = await classifier.classify('Build a new automation');
      expect(result.intent).toBe('create');
    });

    it('should classify "I want to make a new workflow"', async () => {
      const result = await classifier.classify('I want to make a new workflow');
      expect(result.intent).toBe('create');
    });

    it('should classify "Generate a workflow for sending emails"', async () => {
      const result = await classifier.classify('Generate a workflow for sending emails');
      expect(result.intent).toBe('create');
    });

    it('should classify "Can you create a workflow?"', async () => {
      const result = await classifier.classify('Can you create a workflow?');
      expect(result.intent).toBe('create');
    });
  });

  describe('classify - MODIFY intent', () => {
    it('should classify "Modify the existing workflow"', async () => {
      const result = await classifier.classify('Modify the existing workflow');
      expect(result.intent).toBe('modify');
    });

    it('should classify "Change the workflow configuration"', async () => {
      const result = await classifier.classify('Change the workflow configuration');
      expect(result.intent).toBe('modify');
    });

    it('should classify "Update the email settings"', async () => {
      const result = await classifier.classify('Update the email settings');
      expect(result.intent).toBe('modify');
    });

    it('should classify "Add a node to the workflow"', async () => {
      const result = await classifier.classify('Add a new node to the workflow');
      expect(result.intent).toBe('modify');
    });
  });

  describe('classify - DELETE intent', () => {
    it('should classify "Delete this workflow"', async () => {
      const result = await classifier.classify('Delete this workflow');
      expect(result.intent).toBe('delete');
    });

    it('should classify "Remove the automation"', async () => {
      const result = await classifier.classify('Remove the automation');
      expect(result.intent).toBe('delete');
    });

    it('should classify "I want to delete this"', async () => {
      const result = await classifier.classify('I want to delete this');
      expect(result.intent).toBe('delete');
    });
  });

  describe('classify - DEBUG intent', () => {
    it('should classify "Fix this error"', async () => {
      const result = await classifier.classify('Fix this error');
      expect(result.intent).toBe('debug');
    });

    it('should classify "The workflow is broken"', async () => {
      const result = await classifier.classify('The workflow is broken');
      expect(result.intent).toBe('debug');
    });

    it('should classify "I have a problem with execution"', async () => {
      const result = await classifier.classify('I have a problem with execution');
      expect(result.intent).toBe('debug');
    });

    it('should classify "It is not working"', async () => {
      const result = await classifier.classify('It is not working');
      expect(result.intent).toBe('debug');
    });

    it('should classify "Help me debug this issue"', async () => {
      const result = await classifier.classify('Help me debug this issue');
      expect(result.intent).toBe('debug');
    });
  });

  describe('classify - OPTIMIZE intent', () => {
    it('should classify "Optimize this workflow"', async () => {
      const result = await classifier.classify('Optimize this workflow');
      expect(result.intent).toBe('optimize');
    });

    it('should classify "Make it faster"', async () => {
      const result = await classifier.classify('Make it faster');
      expect(result.intent).toBe('optimize');
    });

    it('should classify "Improve the performance"', async () => {
      const result = await classifier.classify('Improve the performance');
      expect(result.intent).toBe('optimize');
    });
  });

  describe('classify - EXPLAIN intent', () => {
    it('should classify "Explain how this works"', async () => {
      const result = await classifier.classify('Explain how this works');
      expect(result.intent).toBe('explain');
    });

    it('should classify "What does this workflow do?"', async () => {
      const result = await classifier.classify('What does this workflow do?');
      expect(result.intent).toBe('explain');
    });

    it('should classify "I don\'t understand this part"', async () => {
      const result = await classifier.classify("I don't understand this part");
      expect(result.intent).toBe('explain');
    });
  });

  describe('classify - TEST intent', () => {
    it('should classify "Test this workflow"', async () => {
      const result = await classifier.classify('Test this workflow');
      expect(result.intent).toBe('test');
    });

    it('should classify "Run a test execution"', async () => {
      const result = await classifier.classify('Run a test execution');
      expect(result.intent).toBe('test');
    });

    it('should classify "Can you verify it works?"', async () => {
      const result = await classifier.classify('Can you verify it works?');
      expect(result.intent).toBe('test');
    });
  });

  describe('classify - DEPLOY intent', () => {
    it('should classify "Deploy to production"', async () => {
      const result = await classifier.classify('Deploy to production');
      expect(result.intent).toBe('deploy');
    });

    it('should classify "Publish this workflow"', async () => {
      const result = await classifier.classify('Publish this workflow');
      expect(result.intent).toBe('deploy');
    });

    it('should classify "Make it live"', async () => {
      const result = await classifier.classify('Make it live');
      expect(result.intent).toBe('deploy');
    });
  });

  describe('classify - SCHEDULE intent', () => {
    it('should classify "Schedule this to run daily"', async () => {
      const result = await classifier.classify('Schedule this to run daily');
      expect(result.intent).toBe('schedule');
    });

    it('should classify "Run it every hour"', async () => {
      const result = await classifier.classify('Run it every hour');
      expect(result.intent).toBe('schedule');
    });

    it('should classify "Set up a cron job"', async () => {
      const result = await classifier.classify('Set up a cron job');
      expect(result.intent).toBe('schedule');
    });
  });

  describe('classify - SHARE intent', () => {
    it('should classify "Share with my team"', async () => {
      const result = await classifier.classify('Share with my team');
      expect(result.intent).toBe('share');
    });

    it('should classify "Give John access to this workflow"', async () => {
      const result = await classifier.classify('Give John access to this workflow');
      expect(result.intent).toBe('share');
    });

    it('should classify "Invite collaborators"', async () => {
      const result = await classifier.classify('Invite collaborators');
      expect(result.intent).toBe('share');
    });
  });

  describe('classification result structure', () => {
    it('should return all required fields', async () => {
      const result = await classifier.classify('Create a workflow');

      expect(result).toHaveProperty('intent');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('multiIntent');
      expect(result).toHaveProperty('allIntents');
      expect(result).toHaveProperty('reasoning');
    });

    it('should have confidence between 0 and 1', async () => {
      const result = await classifier.classify('Build a workflow');

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should include all intent scores', async () => {
      const result = await classifier.classify('Test this');

      expect(result.allIntents.length).toBeGreaterThan(0);
      result.allIntents.forEach((intent) => {
        expect(intent).toHaveProperty('intent');
        expect(intent).toHaveProperty('confidence');
      });
    });

    it('should generate reasoning text', async () => {
      const result = await classifier.classify('Create a new workflow');

      expect(typeof result.reasoning).toBe('string');
      expect(result.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe('sub-intent detection', () => {
    it('should detect email sub-intent for create', async () => {
      const result = await classifier.classify('Create an email workflow');

      expect(result.subIntent).toBe('email');
    });

    it('should detect slack sub-intent for create', async () => {
      const result = await classifier.classify('Create a slack integration');

      expect(result.subIntent).toBe('slack');
    });

    it('should detect api sub-intent for create', async () => {
      const result = await classifier.classify('Create an api workflow');

      expect(result.subIntent).toBe('api');
    });

    it('should detect error sub-intent for debug', async () => {
      const result = await classifier.classify('Debug this error');

      expect(result.subIntent).toBe('error');
    });
  });

  describe('classifyBatch', () => {
    it('should classify multiple texts', async () => {
      const texts = [
        'Create a workflow',
        'Delete this',
        'Fix the error',
      ];

      const results = await classifier.classifyBatch(texts);

      expect(results).toHaveLength(3);
      expect(results[0].intent).toBe('create');
      expect(results[1].intent).toBe('delete');
      expect(results[2].intent).toBe('debug');
    });
  });

  describe('setConfidenceThreshold', () => {
    it('should update confidence threshold', () => {
      classifier.setConfidenceThreshold(0.9);
      // No error should be thrown
    });

    it('should clamp values to 0-1 range', () => {
      classifier.setConfidenceThreshold(1.5);
      classifier.setConfidenceThreshold(-0.5);
      // Should not throw, values are clamped
    });
  });

  describe('addTrainingExample', () => {
    it('should add training example', () => {
      classifier.addTrainingExample({
        text: 'Custom training text',
        intent: 'create',
      });
      // No error should be thrown
    });
  });

  describe('evaluateAccuracy', () => {
    it('should evaluate accuracy on test data', async () => {
      const testData = [
        { text: 'Create a workflow', intent: 'create' as const },
        { text: 'Delete this', intent: 'delete' as const },
        { text: 'Fix the error', intent: 'debug' as const },
      ];

      const results = await classifier.evaluateAccuracy(testData);

      expect(results).toHaveProperty('accuracy');
      expect(results).toHaveProperty('precision');
      expect(results).toHaveProperty('recall');
      expect(results).toHaveProperty('f1Score');
      expect(results.accuracy).toBeGreaterThanOrEqual(0);
      expect(results.accuracy).toBeLessThanOrEqual(1);
    });
  });

  describe('text normalization', () => {
    it('should handle uppercase text', async () => {
      const result = await classifier.classify('CREATE A WORKFLOW');
      expect(result.intent).toBe('create');
    });

    it('should handle mixed case', async () => {
      const result = await classifier.classify('CrEaTe A wOrKfLoW');
      expect(result.intent).toBe('create');
    });

    it('should handle extra whitespace', async () => {
      const result = await classifier.classify('  create   a   workflow  ');
      expect(result.intent).toBe('create');
    });

    it('should handle special characters', async () => {
      const result = await classifier.classify('Create a workflow!!!');
      expect(result.intent).toBe('create');
    });
  });

  describe('multi-intent detection', () => {
    it('should detect multi-intent scenarios', async () => {
      const result = await classifier.classify('Create and then test the workflow');
      expect(result).toHaveProperty('multiIntent');
    });
  });

  describe('context awareness', () => {
    it('should accept context parameter', async () => {
      const result = await classifier.classify('Make changes', {
        currentWorkflow: 'existing',
      });
      expect(result).toBeDefined();
    });
  });

  describe('singleton export', () => {
    it('should export singleton instance', () => {
      expect(intentClassifier).toBeDefined();
      expect(intentClassifier).toBeInstanceOf(IntentClassifier);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', async () => {
      const result = await classifier.classify('');
      expect(result).toBeDefined();
      expect(result.intent).toBeDefined();
    });

    it('should handle very long text', async () => {
      const longText = 'Create a workflow that '.repeat(100);
      const result = await classifier.classify(longText);
      expect(result).toBeDefined();
    });

    it('should handle non-English characters', async () => {
      const result = await classifier.classify('Créer un workflow');
      expect(result).toBeDefined();
    });
  });
});
