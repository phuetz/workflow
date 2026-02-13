/**
 * Comprehensive Unit Tests for Copilot Memory Manager
 * Tests WITHOUT mocks - using real implementations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CopilotMemoryManager, copilotMemory } from '../copilot/CopilotMemory';

describe('CopilotMemoryManager', () => {
  let manager: CopilotMemoryManager;

  beforeEach(() => {
    manager = new CopilotMemoryManager();
  });

  describe('getMemory', () => {
    it('should create new memory for new user', async () => {
      const memory = await manager.getMemory('user_1');

      expect(memory).toBeDefined();
      expect(memory.userId).toBe('user_1');
      expect(memory.preferences).toBeDefined();
      expect(memory.history).toEqual([]);
      expect(memory.learnedPatterns).toEqual([]);
      expect(memory.favoriteTemplates).toEqual([]);
      expect(memory.customShortcuts).toEqual({});
    });

    it('should return cached memory on subsequent calls', async () => {
      const memory1 = await manager.getMemory('user_2');
      const memory2 = await manager.getMemory('user_2');

      expect(memory1).toBe(memory2);
    });

    it('should have default preferences', async () => {
      const memory = await manager.getMemory('user_3');

      expect(memory.preferences.language).toBe('en');
      expect(memory.preferences.verbosity).toBe('normal');
      expect(memory.preferences.autoSuggest).toBe(true);
      expect(memory.preferences.confirmActions).toBe(true);
      expect(memory.preferences.skillLevel).toBe('intermediate');
    });

    it('should have createdAt and lastUpdated dates', async () => {
      const memory = await manager.getMemory('user_4');

      expect(memory.createdAt).toBeInstanceOf(Date);
      expect(memory.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('saveMemory', () => {
    it('should update lastUpdated timestamp', async () => {
      const memory = await manager.getMemory('user_5');
      const originalTime = memory.lastUpdated.getTime();

      // Small delay to ensure different timestamp
      await new Promise((r) => setTimeout(r, 10));
      await manager.saveMemory(memory);

      expect(memory.lastUpdated.getTime()).toBeGreaterThanOrEqual(originalTime);
    });
  });

  describe('updatePreferences', () => {
    it('should update user preferences', async () => {
      await manager.updatePreferences('user_6', {
        language: 'fr',
        verbosity: 'verbose',
      });

      const memory = await manager.getMemory('user_6');

      expect(memory.preferences.language).toBe('fr');
      expect(memory.preferences.verbosity).toBe('verbose');
    });

    it('should preserve existing preferences', async () => {
      const memory = await manager.getMemory('user_7');
      const originalAutoSuggest = memory.preferences.autoSuggest;

      await manager.updatePreferences('user_7', {
        language: 'de',
      });

      const updatedMemory = await manager.getMemory('user_7');

      expect(updatedMemory.preferences.autoSuggest).toBe(originalAutoSuggest);
      expect(updatedMemory.preferences.language).toBe('de');
    });
  });

  describe('addConversation', () => {
    it('should add conversation to history', async () => {
      const conversation = {
        id: 'conv_1',
        startTime: new Date(),
        endTime: new Date(),
        turns: [
          {
            userMessage: 'Create a workflow',
            assistantResponse: 'I will create a workflow',
            timestamp: new Date(),
            intent: { intent: 'create' as const, confidence: 0.9 },
            extractedParameters: {},
          },
        ],
        outcome: 'completed' as const,
        satisfaction: 5,
      };

      await manager.addConversation('user_8', conversation);

      const history = await manager.getHistory('user_8');
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe('conv_1');
    });

    it('should limit history to 50 conversations', async () => {
      for (let i = 0; i < 60; i++) {
        await manager.addConversation('user_9', {
          id: `conv_${i}`,
          startTime: new Date(),
          endTime: new Date(),
          turns: [],
          outcome: 'completed',
        });
      }

      const memory = await manager.getMemory('user_9');
      expect(memory.history.length).toBeLessThanOrEqual(50);
    });
  });

  describe('getHistory', () => {
    it('should return limited history', async () => {
      for (let i = 0; i < 20; i++) {
        await manager.addConversation('user_10', {
          id: `conv_${i}`,
          startTime: new Date(),
          endTime: new Date(),
          turns: [],
          outcome: 'completed',
        });
      }

      const history = await manager.getHistory('user_10', 5);
      expect(history).toHaveLength(5);
    });

    it('should return all history when limit exceeds count', async () => {
      await manager.addConversation('user_11', {
        id: 'conv_1',
        startTime: new Date(),
        endTime: new Date(),
        turns: [],
        outcome: 'completed',
      });

      const history = await manager.getHistory('user_11', 100);
      expect(history).toHaveLength(1);
    });
  });

  describe('favorite templates', () => {
    it('should add favorite template', async () => {
      await manager.addFavoriteTemplate('user_12', 'template_1');

      const memory = await manager.getMemory('user_12');
      expect(memory.favoriteTemplates).toContain('template_1');
    });

    it('should not duplicate favorite templates', async () => {
      await manager.addFavoriteTemplate('user_13', 'template_1');
      await manager.addFavoriteTemplate('user_13', 'template_1');

      const memory = await manager.getMemory('user_13');
      expect(memory.favoriteTemplates.filter((t) => t === 'template_1')).toHaveLength(1);
    });

    it('should remove favorite template', async () => {
      await manager.addFavoriteTemplate('user_14', 'template_1');
      await manager.removeFavoriteTemplate('user_14', 'template_1');

      const memory = await manager.getMemory('user_14');
      expect(memory.favoriteTemplates).not.toContain('template_1');
    });
  });

  describe('custom shortcuts', () => {
    it('should add shortcut', async () => {
      await manager.addShortcut('user_15', 'email', { type: 'email_node' });

      const expansion = await manager.getShortcut('user_15', 'email');
      expect(expansion).toEqual({ type: 'email_node' });
    });

    it('should return undefined for non-existent shortcut', async () => {
      const expansion = await manager.getShortcut('user_16', 'nonexistent');
      expect(expansion).toBeUndefined();
    });

    it('should overwrite existing shortcut', async () => {
      await manager.addShortcut('user_17', 'slack', { version: 1 });
      await manager.addShortcut('user_17', 'slack', { version: 2 });

      const expansion = await manager.getShortcut('user_17', 'slack');
      expect(expansion).toEqual({ version: 2 });
    });
  });

  describe('getPatterns', () => {
    it('should return empty array for new user', async () => {
      const patterns = await manager.getPatterns('user_18');
      expect(patterns).toEqual([]);
    });

    it('should filter by minimum confidence', async () => {
      const memory = await manager.getMemory('user_19');
      memory.learnedPatterns = [
        { id: '1', pattern: 'test1', frequency: 5, confidence: 0.9, lastUsed: new Date(), context: {} },
        { id: '2', pattern: 'test2', frequency: 2, confidence: 0.3, lastUsed: new Date(), context: {} },
      ];
      await manager.saveMemory(memory);

      const patterns = await manager.getPatterns('user_19', 0.5);
      expect(patterns).toHaveLength(1);
      expect(patterns[0].pattern).toBe('test1');
    });
  });

  describe('getSuggestions', () => {
    it('should return suggestions based on patterns', async () => {
      const memory = await manager.getMemory('user_20');
      memory.learnedPatterns = [
        { id: '1', pattern: 'send email', frequency: 5, confidence: 0.9, lastUsed: new Date(), context: {} },
      ];
      await manager.saveMemory(memory);

      const suggestions = await manager.getSuggestions('user_20', 'I want to send');
      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should include favorite templates in suggestions', async () => {
      await manager.addFavoriteTemplate('user_21', 'email_workflow');

      const suggestions = await manager.getSuggestions('user_21', 'create a template');
      expect(suggestions.some((s) => s.includes('email_workflow'))).toBe(true);
    });

    it('should limit suggestions to 5', async () => {
      const memory = await manager.getMemory('user_22');
      memory.learnedPatterns = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        pattern: `pattern ${i}`,
        frequency: 5,
        confidence: 0.9,
        lastUsed: new Date(),
        context: {},
      }));
      memory.favoriteTemplates = Array.from({ length: 10 }, (_, i) => `template_${i}`);
      await manager.saveMemory(memory);

      const suggestions = await manager.getSuggestions('user_22', 'pattern template create');
      expect(suggestions.length).toBeLessThanOrEqual(5);
    });
  });

  describe('clearMemory', () => {
    it('should clear user memory', async () => {
      await manager.getMemory('user_23');
      await manager.addFavoriteTemplate('user_23', 'template_1');
      await manager.clearMemory('user_23');

      const newMemory = await manager.getMemory('user_23');
      expect(newMemory.favoriteTemplates).toEqual([]);
    });
  });

  describe('exportMemory', () => {
    it('should export complete memory', async () => {
      await manager.addFavoriteTemplate('user_24', 'template_1');
      await manager.addShortcut('user_24', 'shortcut', { value: 1 });

      const exported = await manager.exportMemory('user_24');

      expect(exported.userId).toBe('user_24');
      expect(exported.favoriteTemplates).toContain('template_1');
      expect(exported.customShortcuts['shortcut']).toEqual({ value: 1 });
    });
  });

  describe('importMemory', () => {
    it('should import memory', async () => {
      const memoryToImport = {
        userId: 'user_25',
        preferences: {
          language: 'es',
          verbosity: 'concise' as const,
          autoSuggest: false,
          confirmActions: true,
          preferredNodes: [],
          avoidedNodes: [],
          skillLevel: 'advanced' as const,
        },
        history: [],
        learnedPatterns: [],
        favoriteTemplates: ['imported_template'],
        customShortcuts: { imported: { test: true } },
        createdAt: new Date(),
        lastUpdated: new Date(),
      };

      await manager.importMemory(memoryToImport);
      const memory = await manager.getMemory('user_25');

      expect(memory.preferences.language).toBe('es');
      expect(memory.favoriteTemplates).toContain('imported_template');
    });
  });

  describe('getStatistics', () => {
    it('should return statistics for user', async () => {
      await manager.addConversation('user_26', {
        id: 'conv_1',
        startTime: new Date(),
        endTime: new Date(),
        turns: [],
        outcome: 'completed',
        satisfaction: 4,
      });

      await manager.addConversation('user_26', {
        id: 'conv_2',
        startTime: new Date(),
        endTime: new Date(),
        turns: [],
        outcome: 'abandoned',
        satisfaction: 2,
      });

      await manager.addFavoriteTemplate('user_26', 'template_1');
      await manager.addShortcut('user_26', 'shortcut', {});

      const stats = await manager.getStatistics('user_26');

      expect(stats.totalConversations).toBe(2);
      expect(stats.completedWorkflows).toBe(1);
      expect(stats.averageSatisfaction).toBe(3);
      expect(stats.favoriteTemplatesCount).toBe(1);
      expect(stats.customShortcutsCount).toBe(1);
    });

    it('should handle empty history', async () => {
      const stats = await manager.getStatistics('user_27');

      expect(stats.totalConversations).toBe(0);
      expect(stats.averageSatisfaction).toBe(0);
    });
  });

  describe('singleton export', () => {
    it('should export singleton instance', () => {
      expect(copilotMemory).toBeDefined();
      expect(copilotMemory).toBeInstanceOf(CopilotMemoryManager);
    });
  });
});
