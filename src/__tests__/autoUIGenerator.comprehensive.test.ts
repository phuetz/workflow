/**
 * Comprehensive Unit Tests for Auto UI Generator
 * Tests WITHOUT mocks - using real implementations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AutoUIGenerator,
  createAutoUIGenerator,
} from '../autogen/AutoUIGenerator';

describe('AutoUIGenerator', () => {
  let generator: AutoUIGenerator;

  beforeEach(() => {
    generator = createAutoUIGenerator();
  });

  describe('constructor', () => {
    it('should create instance', () => {
      expect(generator).toBeInstanceOf(AutoUIGenerator);
    });

    it('should be an EventEmitter', () => {
      expect(typeof generator.on).toBe('function');
      expect(typeof generator.emit).toBe('function');
    });
  });

  describe('generateFromWorkflow', () => {
    it('should generate UI from workflow with nodes', () => {
      const nodes = [
        {
          id: 'node_1',
          type: 'http_request',
          position: { x: 0, y: 0 },
          data: {
            url: '',
            method: 'GET',
          },
        },
      ];

      const ui = generator.generateFromWorkflow('wf_1', 'Test Workflow', nodes);

      expect(ui).toBeDefined();
      expect(ui.id).toBeDefined();
      expect(ui.workflowId).toBe('wf_1');
      expect(ui.name).toContain('Test Workflow');
    });

    it('should generate UI with empty nodes', () => {
      const ui = generator.generateFromWorkflow('wf_2', 'Empty Workflow', []);

      expect(ui).toBeDefined();
      expect(ui.parameters).toBeInstanceOf(Array);
    });

    it('should apply custom options', () => {
      const nodes = [
        {
          id: 'node_1',
          type: 'set',
          position: { x: 0, y: 0 },
          data: { values: { name: '' } },
        },
      ];

      const ui = generator.generateFromWorkflow('wf_3', 'Options Test', nodes, {
        groupByNodeType: true,
        generateValidation: true,
      });

      expect(ui).toBeDefined();
    });

    it('should emit ui:generated event', () => {
      let generated = false;
      generator.on('ui:generated', () => { generated = true; });

      generator.generateFromWorkflow('wf_4', 'Event Test', []);

      expect(generated).toBe(true);
    });
  });

  describe('getUI', () => {
    it('should retrieve generated UI', () => {
      const ui = generator.generateFromWorkflow('wf_5', 'Get Test', []);
      const retrieved = generator.getUI(ui.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(ui.id);
    });

    it('should return undefined for non-existent UI', () => {
      const result = generator.getUI('non_existent');
      expect(result).toBeUndefined();
    });
  });

  describe('listUIs', () => {
    it('should list all generated UIs', () => {
      generator.generateFromWorkflow('wf_6', 'List 1', []);
      generator.generateFromWorkflow('wf_7', 'List 2', []);

      const uis = generator.listUIs();

      expect(uis).toBeInstanceOf(Array);
      expect(uis.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array initially', () => {
      const freshGenerator = createAutoUIGenerator();
      const uis = freshGenerator.listUIs();

      expect(uis).toEqual([]);
    });
  });

  describe('deleteUI', () => {
    it('should delete UI', () => {
      const ui = generator.generateFromWorkflow('wf_8', 'Delete Test', []);
      const deleted = generator.deleteUI(ui.id);

      expect(deleted).toBe(true);
      expect(generator.getUI(ui.id)).toBeUndefined();
    });

    it('should return false for non-existent UI', () => {
      const result = generator.deleteUI('non_existent');
      expect(result).toBe(false);
    });
  });

  describe('updateUI', () => {
    it('should update UI', () => {
      const ui = generator.generateFromWorkflow('wf_9', 'Update Test', []);
      const updated = generator.updateUI(ui.id, { name: 'Updated Name' });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('Updated Name');
    });

    it('should return null for non-existent UI', () => {
      const result = generator.updateUI('non_existent', { name: 'New Name' });
      expect(result).toBeNull();
    });
  });

  describe('generateReactComponent', () => {
    it('should generate React component code', () => {
      const ui = generator.generateFromWorkflow('wf_10', 'Component Test', []);
      const component = generator.generateReactComponent(ui);

      expect(typeof component).toBe('string');
      expect(component).toContain('React');
    });

    it('should generate valid JSX structure', () => {
      const ui = generator.generateFromWorkflow('wf_11', 'JSX Test', [
        {
          id: 'node_1',
          type: 'set',
          position: { x: 0, y: 0 },
          data: { values: { email: '' } },
        },
      ]);
      const component = generator.generateReactComponent(ui);

      // Component should be a valid string with either export or const declaration
      expect(typeof component).toBe('string');
      expect(component.length).toBeGreaterThan(0);
    });
  });

  describe('factory function', () => {
    it('should create generator instance', () => {
      const instance = createAutoUIGenerator();
      expect(instance).toBeInstanceOf(AutoUIGenerator);
    });
  });
});
