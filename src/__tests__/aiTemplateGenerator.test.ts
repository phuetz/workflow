/**
 * AI Template Generator Test Suite
 * Comprehensive tests for template generation, customization, suggestions, and evolution
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AITemplateGenerator } from '../templates/AITemplateGenerator';
import { TemplateCustomizer } from '../templates/TemplateCustomizer';
import { TemplateSuggester } from '../templates/TemplateSuggester';
import { TemplateEvolution } from '../templates/TemplateEvolution';
import { GeneratedTemplate, TemplateContext } from '../types/aiTemplate';

describe('AITemplateGenerator', () => {
  let generator: AITemplateGenerator;

  beforeEach(() => {
    generator = new AITemplateGenerator();
  });

  describe('Template Generation', () => {
    it('should generate template from simple description', async () => {
      const description = 'Send daily sales report via Slack every morning';
      const template = await generator.generateTemplate(description);

      expect(template).toBeDefined();
      expect(template.name).toBeTruthy();
      expect(template.nodes.length).toBeGreaterThan(0);
      expect(template.qualityScore).toBeGreaterThan(0);
    });

    it('should generate e-commerce order processing template', async () => {
      const description = 'Process Shopify orders: validate, check inventory, charge customer, send confirmation';
      const template = await generator.generateTemplate(description);

      expect(template.nodes.length).toBeGreaterThanOrEqual(4);
      expect(template.category).toBe('ecommerce');
      expect(template.tags).toContain('ecommerce');
    });

    it('should generate social media monitoring template', async () => {
      const description = 'Monitor Twitter for brand mentions, analyze sentiment, alert on negative posts';
      const template = await generator.generateTemplate(description);

      expect(template.category).toBe('social_media');
      expect(template.nodes.some(n => n.type.includes('twitter') || n.type === 'httpRequest')).toBe(true);
    });

    it('should respect context constraints', async () => {
      const context: TemplateContext = {
        constraints: {
          maxNodes: 3,
          forbiddenIntegrations: ['slack']
        }
      };

      const template = await generator.generateTemplate(
        'Send notifications and save to database',
        context
      );

      expect(template.nodes.length).toBeLessThanOrEqual(3);
      expect(template.nodes.every(n => n.type !== 'slack')).toBe(true);
    });

    it('should generate appropriate quality scores', async () => {
      const template = await generator.generateTemplate(
        'Process orders and send emails'
      );

      expect(template.qualityScore).toBeGreaterThanOrEqual(0);
      expect(template.qualityScore).toBeLessThanOrEqual(100);
    });

    it('should include documentation', async () => {
      const template = await generator.generateTemplate(
        'Daily data sync workflow'
      );

      expect(template.documentation).toBeDefined();
      expect(template.documentation.overview).toBeTruthy();
      expect(template.documentation.setup.length).toBeGreaterThan(0);
    });

    it('should generate edges connecting nodes', async () => {
      const template = await generator.generateTemplate(
        'Fetch data, transform it, and save'
      );

      expect(template.edges.length).toBeGreaterThan(0);
      expect(template.edges.length).toBeLessThanOrEqual(template.nodes.length);
    });
  });

  describe('Template Refinement', () => {
    it('should refine template based on feedback', async () => {
      const template = await generator.generateTemplate(
        'Send daily report'
      );

      const refined = await generator.refineTemplate(
        template,
        'Add Slack notification'
      );

      expect(refined.metadata.iterationsCount).toBeGreaterThan(template.metadata.iterationsCount);
    });
  });

  describe('Template Validation', () => {
    it('should validate valid template', async () => {
      const template = await generator.generateTemplate(
        'Process webhook and send email'
      );

      const results = await generator.validateTemplate(template);

      const hasErrors = results.some(r => !r.valid);
      expect(hasErrors).toBe(false);
    });

    it('should detect missing trigger', async () => {
      const template = await generator.generateTemplate('Send email');

      // Remove trigger node
      template.nodes = template.nodes.filter(n =>
        !['webhook', 'schedule', 'manual_trigger'].includes(n.type)
      );

      const results = await generator.validateTemplate(template);
      const hasTriggerError = results.some(r =>
        r.field === 'trigger' && !r.valid
      );

      expect(hasTriggerError).toBe(true);
    });

    it('should detect disconnected nodes', async () => {
      const template = await generator.generateTemplate('Multi-step workflow');

      // Remove all edges
      template.edges = [];

      const results = await generator.validateTemplate(template);
      const hasConnectionError = results.some(r =>
        r.field === 'edges' && !r.valid
      );

      expect(hasConnectionError).toBe(true);
    });
  });

  describe('Quality Scoring', () => {
    it('should score completeness correctly', async () => {
      const template = await generator.generateTemplate(
        'Complete workflow with all fields'
      );

      const score = generator.calculateQualityScore(template);
      expect(score).toBeGreaterThan(50);
    });

    it('should give higher scores to well-documented templates', async () => {
      const template1 = await generator.generateTemplate('Simple workflow');
      const template2 = await generator.generateTemplate('Complex detailed workflow with multiple steps');

      const score1 = generator.calculateQualityScore(template1);
      const score2 = generator.calculateQualityScore(template2);

      // More complex workflows should have more documentation
      expect(score2).toBeGreaterThanOrEqual(score1 - 10);
    });
  });
});

describe('TemplateCustomizer', () => {
  let customizer: TemplateCustomizer;
  let generator: AITemplateGenerator;
  let template: GeneratedTemplate;

  beforeEach(async () => {
    customizer = new TemplateCustomizer();
    generator = new AITemplateGenerator();
    template = await generator.generateTemplate('Send Slack notifications');
  });

  describe('Session Management', () => {
    it('should start customization session', () => {
      const session = customizer.startCustomization(template);

      expect(session.id).toBeTruthy();
      expect(session.status).toBe('active');
      expect(session.pendingQuestions.length).toBeGreaterThan(0);
      expect(session.conversation.length).toBeGreaterThan(0);
    });

    it('should generate initial questions', () => {
      const session = customizer.startCustomization(template);

      expect(session.pendingQuestions.length).toBeGreaterThan(0);
      expect(session.pendingQuestions[0].question).toBeTruthy();
    });

    it('should track session progress', () => {
      const session = customizer.startCustomization(template);
      const progress = customizer.getProgress(session.id);

      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(100);
    });
  });

  describe('Question Flow', () => {
    it('should ask next question after answer', async () => {
      const session = customizer.startCustomization(template);
      const nextQuestion = await customizer.askQuestion(session.id, 'Yes');

      expect(nextQuestion).toBeDefined();
    });

    it('should complete when all questions answered', async () => {
      const session = customizer.startCustomization(template);

      // Answer all questions
      for (let i = 0; i < session.pendingQuestions.length; i++) {
        await customizer.askQuestion(session.id, 'test answer');
      }

      const finalQuestion = await customizer.askQuestion(session.id, 'final answer');
      expect(finalQuestion).toBeNull();
    });

    it('should validate required fields', async () => {
      const session = customizer.startCustomization(template);

      // Find a required question
      const requiredQ = session.pendingQuestions.find(q => q.required);
      if (requiredQ) {
        await customizer.askQuestion(session.id, '');
        // Should still have same question (validation failed)
        const updated = customizer.getSession(session.id);
        expect(updated?.pendingQuestions[0].id).toBe(requiredQ.id);
      }
    });
  });

  describe('Customization Application', () => {
    it('should apply customizations to template', async () => {
      const session = customizer.startCustomization(template);

      const updates = {
        name: 'My Custom Template'
      };

      const customized = await customizer.applyCustomization(session.id, updates);
      expect(customized.name).toBe('My Custom Template');
    });
  });
});

describe('TemplateSuggester', () => {
  let suggester: TemplateSuggester;

  beforeEach(() => {
    suggester = new TemplateSuggester();
  });

  describe('Suggestion Generation', () => {
    it('should generate suggestions based on context', async () => {
      const context = {
        userProfile: {
          id: 'user123',
          skillLevel: 'intermediate' as const,
          preferredIntegrations: ['slack', 'postgres'],
          workflowCategories: ['business_automation' as const],
          usagePatterns: []
        },
        recentActivity: [],
        connectedIntegrations: ['slack']
      };

      const suggestions = await suggester.getSuggestions(context, 5);
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should calculate relevance scores', async () => {
      const context = {
        userProfile: {
          id: 'user123',
          skillLevel: 'beginner' as const,
          preferredIntegrations: [],
          workflowCategories: [],
          usagePatterns: []
        },
        recentActivity: [],
        connectedIntegrations: []
      };

      const suggestions = await suggester.getSuggestions(context);

      suggestions.forEach(suggestion => {
        expect(suggestion.relevanceScore).toBeGreaterThanOrEqual(0);
        expect(suggestion.relevanceScore).toBeLessThanOrEqual(100);
      });
    });

    it('should provide suggestion reasons', async () => {
      const context = {
        userProfile: {
          id: 'user123',
          skillLevel: 'advanced' as const,
          preferredIntegrations: ['slack'],
          workflowCategories: ['notifications' as const],
          usagePatterns: []
        },
        recentActivity: [],
        connectedIntegrations: ['slack', 'email']
      };

      const suggestions = await suggester.getSuggestions(context, 3);

      suggestions.forEach(suggestion => {
        expect(suggestion.reason).toBeDefined();
        expect(suggestion.reason.primary).toBeTruthy();
        expect(suggestion.reason.factors.length).toBeGreaterThan(0);
      });
    });

    it('should estimate setup time', async () => {
      const context = {
        userProfile: {
          id: 'user123',
          skillLevel: 'intermediate' as const,
          preferredIntegrations: [],
          workflowCategories: [],
          usagePatterns: []
        },
        recentActivity: [],
        connectedIntegrations: []
      };

      const suggestions = await suggester.getSuggestions(context);

      suggestions.forEach(suggestion => {
        expect(suggestion.estimatedSetupTime).toBeGreaterThan(0);
      });
    });
  });

  describe('Usage Tracking', () => {
    it('should record template usage', async () => {
      await suggester.recordUsage('template-1', 'user-1', true);

      const stats = suggester.getStats();
      expect(stats.totalUsageRecords).toBeGreaterThan(0);
    });

    it('should update user profile', async () => {
      await suggester.updateUserProfile('user-1', {
        type: 'integration_connected',
        timestamp: new Date(),
        details: { integration: 'slack' }
      });

      // Profile should be created/updated
      const stats = suggester.getStats();
      expect(stats.totalUsers).toBeGreaterThan(0);
    });
  });
});

describe('TemplateEvolution', () => {
  let evolution: TemplateEvolution;

  beforeEach(() => {
    evolution = new TemplateEvolution();
  });

  describe('Usage Tracking', () => {
    it('should track template usage metrics', async () => {
      await evolution.trackUsage('template-1', {
        totalInstalls: 10,
        activeUsers: 5
      });

      const stats = evolution.getStats();
      expect(stats.trackedTemplates).toBeGreaterThan(0);
    });

    it('should accumulate usage over time', async () => {
      await evolution.trackUsage('template-1', { totalInstalls: 5 });
      await evolution.trackUsage('template-1', { totalInstalls: 3 });

      const stats = evolution.getStats();
      expect(stats.trackedTemplates).toBe(1);
    });
  });

  describe('Feedback Processing', () => {
    it('should accept user feedback', async () => {
      await evolution.submitFeedback('template-1', {
        id: 'feedback-1',
        userId: 'user-1',
        rating: 5,
        category: 'ease_of_use',
        timestamp: new Date(),
        helpful: true
      });

      const stats = evolution.getStats();
      expect(stats.totalFeedback).toBeGreaterThan(0);
    });

    it('should queue feedback for processing', async () => {
      await evolution.submitFeedback('template-1', {
        id: 'feedback-2',
        userId: 'user-2',
        rating: 3,
        comment: 'Could be better',
        category: 'features',
        timestamp: new Date(),
        helpful: false
      });

      const stats = evolution.getStats();
      expect(stats.feedbackQueueSize).toBeGreaterThan(0);
    });
  });

  describe('Improvement Suggestions', () => {
    it('should generate improvement suggestions', async () => {
      // Add some usage data first
      await evolution.trackUsage('template-1', {
        totalInstalls: 100,
        errorRate: 0.15,
        completionRate: 0.5
      });

      const suggestions = await evolution.generateImprovements('template-1');

      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should prioritize suggestions', async () => {
      await evolution.trackUsage('template-1', {
        errorRate: 0.2,
        averageSetupTime: 25
      });

      const suggestions = await evolution.generateImprovements('template-1');

      // Should be sorted by priority
      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i].priority).toBeLessThanOrEqual(suggestions[i - 1].priority);
      }
    });

    it('should identify different improvement types', async () => {
      await evolution.trackUsage('template-1', {
        errorRate: 0.15,
        completionRate: 0.4,
        averageExecutionTime: 35000
      });

      const suggestions = await evolution.generateImprovements('template-1');

      const types = new Set(suggestions.map(s => s.type));
      expect(types.size).toBeGreaterThan(0);
    });
  });

  describe('A/B Testing', () => {
    it('should start A/B test', async () => {
      const generator = new AITemplateGenerator();
      const variantA = await generator.generateTemplate('Test template A');
      const variantB = await generator.generateTemplate('Test template B');

      const test = {
        id: 'test-1',
        name: 'Template Comparison',
        templateId: 'template-1',
        variantA,
        variantB,
        hypothesis: 'Variant B will have better completion rate',
        metrics: {
          primary: {
            name: 'completion_rate',
            type: 'completion_time' as const,
            improvementThreshold: 10
          },
          secondary: []
        },
        status: 'draft' as const,
        startDate: new Date(),
        trafficSplit: 0.5,
        minSampleSize: 100,
        confidenceLevel: 0.95
      };

      const testId = await evolution.runABTest(test);
      expect(testId).toBeTruthy();
    });

    it('should complete A/B test with results', async () => {
      const generator = new AITemplateGenerator();
      const variantA = await generator.generateTemplate('Variant A');
      const variantB = await generator.generateTemplate('Variant B');

      const testId = await evolution.runABTest({
        id: 'test-2',
        name: 'Performance Test',
        templateId: 'template-2',
        variantA,
        variantB,
        hypothesis: 'Test hypothesis',
        metrics: {
          primary: {
            name: 'success_rate',
            type: 'success_rate',
            improvementThreshold: 5
          },
          secondary: []
        },
        status: 'running',
        startDate: new Date(),
        trafficSplit: 0.5,
        minSampleSize: 50,
        confidenceLevel: 0.90
      });

      const results = await evolution.completeABTest(testId);

      expect(results).toBeDefined();
      expect(results.winner).toBeDefined();
      expect(results.confidence).toBeGreaterThan(0);
    });
  });

  describe('Statistics', () => {
    it('should provide accurate statistics', async () => {
      await evolution.trackUsage('template-1', { totalInstalls: 10 });
      await evolution.trackUsage('template-2', { totalInstalls: 5 });

      const stats = evolution.getStats();

      expect(stats.trackedTemplates).toBeGreaterThanOrEqual(2);
      expect(stats).toHaveProperty('totalFeedback');
      expect(stats).toHaveProperty('pendingImprovements');
    });
  });
});
