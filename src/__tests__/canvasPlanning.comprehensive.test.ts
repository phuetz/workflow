/**
 * Comprehensive Unit Tests for Canvas Planning
 * Tests WITHOUT mocks - using real implementations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CanvasPlanningManager,
  createCanvasPlanningManager,
  Canvas,
  CanvasElement,
  CanvasConnection,
} from '../canvas/CanvasPlanning';

describe('CanvasPlanningManager', () => {
  let manager: CanvasPlanningManager;

  beforeEach(() => {
    manager = createCanvasPlanningManager();
  });

  describe('constructor', () => {
    it('should create instance', () => {
      expect(manager).toBeInstanceOf(CanvasPlanningManager);
    });
  });

  describe('createCanvas', () => {
    it('should create a new canvas', () => {
      const canvas = manager.createCanvas('Test Canvas');

      expect(canvas).toBeDefined();
      expect(canvas.id).toBeDefined();
      expect(canvas.name).toBe('Test Canvas');
    });

    it('should generate unique canvas IDs', () => {
      const canvas1 = manager.createCanvas('Canvas 1');
      const canvas2 = manager.createCanvas('Canvas 2');

      expect(canvas1.id).not.toBe(canvas2.id);
    });

    it('should emit canvas:created event', () => {
      let created = false;
      manager.on('canvas:created', () => { created = true; });

      manager.createCanvas('Event Test');

      expect(created).toBe(true);
    });

    it('should initialize with empty elements and connections', () => {
      const canvas = manager.createCanvas('Empty');

      expect(canvas.elements).toEqual([]);
      expect(canvas.connections).toEqual([]);
    });

    it('should add createdAt timestamp', () => {
      const canvas = manager.createCanvas('Timestamp');

      expect(canvas.createdAt).toBeDefined();
      expect(canvas.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('getCanvas', () => {
    it('should retrieve created canvas', () => {
      const created = manager.createCanvas('Get Test');
      const retrieved = manager.getCanvas(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return undefined for non-existent canvas', () => {
      const result = manager.getCanvas('non_existent');
      expect(result).toBeUndefined();
    });
  });

  describe('listCanvases', () => {
    it('should list all canvases', async () => {
      await manager.createCanvas({ name: 'List 1' });
      await manager.createCanvas({ name: 'List 2' });

      const canvases = manager.listCanvases();

      expect(canvases).toBeInstanceOf(Array);
      expect(canvases.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array initially', () => {
      const freshManager = createCanvasPlanningManager();
      const canvases = freshManager.listCanvases();

      expect(canvases).toEqual([]);
    });
  });

  describe('updateSettings', () => {
    it('should update canvas settings', () => {
      const canvas = manager.createCanvas('Original');

      const updated = manager.updateSettings(canvas.id, { snapToGrid: false });

      expect(updated).not.toBeNull();
      expect(manager.getCanvas(canvas.id)?.settings.snapToGrid).toBe(false);
    });

    it('should update grid size', () => {
      const canvas = manager.createCanvas('GridSize');

      manager.updateSettings(canvas.id, { gridSize: 20 });

      expect(manager.getCanvas(canvas.id)?.settings.gridSize).toBe(20);
    });

    it('should return null for non-existent canvas', () => {
      const result = manager.updateSettings('non_existent', { snapToGrid: false });
      expect(result).toBeNull();
    });

    it('should update version on settings change', () => {
      const canvas = manager.createCanvas('Version');
      const initialVersion = canvas.version;

      manager.updateSettings(canvas.id, { snapToGrid: false });

      expect(manager.getCanvas(canvas.id)?.version).toBeGreaterThan(initialVersion);
    });

    it('should set updatedAt timestamp', () => {
      const canvas = manager.createCanvas('UpdateTime');
      manager.updateSettings(canvas.id, { snapToGrid: false });

      expect(manager.getCanvas(canvas.id)?.updatedAt).toBeDefined();
    });
  });

  describe('deleteCanvas', () => {
    it('should delete canvas', () => {
      const canvas = manager.createCanvas('ToDelete');

      const deleted = manager.deleteCanvas(canvas.id);

      expect(deleted).toBe(true);
      expect(manager.getCanvas(canvas.id)).toBeUndefined();
    });

    it('should return false for non-existent canvas', async () => {
      const result = await manager.deleteCanvas('non_existent');
      expect(result).toBe(false);
    });

    it('should emit canvas:deleted event', async () => {
      let deletedId: string | null = null;
      manager.on('canvas:deleted', (id) => { deletedId = id; });

      const canvas = await manager.createCanvas({ name: 'DeleteEvent' });
      await manager.deleteCanvas(canvas.id);

      expect(deletedId).toBe(canvas.id);
    });
  });

  describe('addElement', () => {
    it('should add element to canvas', async () => {
      const canvas = await manager.createCanvas({ name: 'AddElement' });

      const element = await manager.addElement(canvas.id, {
        type: 'shape',
        shape: 'rectangle',
        position: { x: 100, y: 100 },
        size: { width: 200, height: 100 },
        style: { fill: '#ffffff', stroke: '#000000' },
      });

      expect(element).toBeDefined();
      expect(element.id).toBeDefined();
      expect(element.type).toBe('shape');
    });

    it('should support different element types', async () => {
      const canvas = await manager.createCanvas({ name: 'ElementTypes' });

      const elementTypes: Array<CanvasElement['type']> = [
        'shape', 'text', 'note', 'connector', 'image', 'icon',
        'group', 'workflow-placeholder', 'node-placeholder', 'swimlane', 'frame',
      ];

      for (const type of elementTypes) {
        const element = await manager.addElement(canvas.id, {
          type,
          position: { x: 0, y: 0 },
          size: { width: 100, height: 100 },
        });

        expect(element.type).toBe(type);
      }
    });

    it('should emit element:added event', async () => {
      let added = false;
      manager.on('element:added', () => { added = true; });

      const canvas = await manager.createCanvas({ name: 'AddEvent' });
      await manager.addElement(canvas.id, {
        type: 'shape',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
      });

      expect(added).toBe(true);
    });

    it('should generate unique element IDs', async () => {
      const canvas = await manager.createCanvas({ name: 'UniqueIds' });

      const elem1 = await manager.addElement(canvas.id, {
        type: 'shape',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
      });

      const elem2 = await manager.addElement(canvas.id, {
        type: 'shape',
        position: { x: 200, y: 0 },
        size: { width: 100, height: 100 },
      });

      expect(elem1.id).not.toBe(elem2.id);
    });

    it('should add text element with content', async () => {
      const canvas = await manager.createCanvas({ name: 'TextElement' });

      const element = await manager.addElement(canvas.id, {
        type: 'text',
        position: { x: 100, y: 100 },
        size: { width: 200, height: 50 },
        content: 'Hello World',
      });

      expect(element.content).toBe('Hello World');
    });

    it('should add note element', async () => {
      const canvas = await manager.createCanvas({ name: 'NoteElement' });

      const element = await manager.addElement(canvas.id, {
        type: 'note',
        position: { x: 100, y: 100 },
        size: { width: 200, height: 150 },
        content: 'This is a note',
        style: { fill: '#ffff00' },
      });

      expect(element.type).toBe('note');
      expect(element.content).toBe('This is a note');
    });
  });

  describe('updateElement', () => {
    it('should update element position', async () => {
      const canvas = await manager.createCanvas({ name: 'UpdatePos' });
      const element = await manager.addElement(canvas.id, {
        type: 'shape',
        position: { x: 100, y: 100 },
        size: { width: 100, height: 100 },
      });

      await manager.updateElement(canvas.id, element.id, {
        position: { x: 200, y: 200 },
      });

      const updated = manager.getCanvas(canvas.id)?.elements.find(e => e.id === element.id);
      expect(updated?.position).toEqual({ x: 200, y: 200 });
    });

    it('should update element size', async () => {
      const canvas = await manager.createCanvas({ name: 'UpdateSize' });
      const element = await manager.addElement(canvas.id, {
        type: 'shape',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
      });

      await manager.updateElement(canvas.id, element.id, {
        size: { width: 200, height: 150 },
      });

      const updated = manager.getCanvas(canvas.id)?.elements.find(e => e.id === element.id);
      expect(updated?.size).toEqual({ width: 200, height: 150 });
    });

    it('should update element style', async () => {
      const canvas = await manager.createCanvas({ name: 'UpdateStyle' });
      const element = await manager.addElement(canvas.id, {
        type: 'shape',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
        style: { fill: '#ffffff' },
      });

      await manager.updateElement(canvas.id, element.id, {
        style: { fill: '#ff0000', stroke: '#000000' },
      });

      const updated = manager.getCanvas(canvas.id)?.elements.find(e => e.id === element.id);
      expect(updated?.style?.fill).toBe('#ff0000');
    });

    it('should emit element:updated event', async () => {
      let updated = false;
      manager.on('element:updated', () => { updated = true; });

      const canvas = await manager.createCanvas({ name: 'UpdateEvent' });
      const element = await manager.addElement(canvas.id, {
        type: 'shape',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
      });

      await manager.updateElement(canvas.id, element.id, {
        position: { x: 50, y: 50 },
      });

      expect(updated).toBe(true);
    });
  });

  describe('deleteElement', () => {
    it('should delete element from canvas', async () => {
      const canvas = await manager.createCanvas({ name: 'DeleteElem' });
      const element = await manager.addElement(canvas.id, {
        type: 'shape',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
      });

      await manager.deleteElement(canvas.id, element.id);

      const updated = manager.getCanvas(canvas.id);
      expect(updated?.elements.find(e => e.id === element.id)).toBeUndefined();
    });

    it('should emit element:deleted event', async () => {
      let deleted = false;
      manager.on('element:deleted', () => { deleted = true; });

      const canvas = await manager.createCanvas({ name: 'DeleteEvent' });
      const element = await manager.addElement(canvas.id, {
        type: 'shape',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
      });

      await manager.deleteElement(canvas.id, element.id);

      expect(deleted).toBe(true);
    });

    it('should also delete connections involving the element', async () => {
      const canvas = await manager.createCanvas({ name: 'DeleteWithConn' });

      const elem1 = await manager.addElement(canvas.id, {
        type: 'shape',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
      });

      const elem2 = await manager.addElement(canvas.id, {
        type: 'shape',
        position: { x: 200, y: 0 },
        size: { width: 100, height: 100 },
      });

      await manager.addConnection(canvas.id, {
        sourceId: elem1.id,
        targetId: elem2.id,
      });

      await manager.deleteElement(canvas.id, elem1.id);

      const updated = manager.getCanvas(canvas.id);
      expect(updated?.connections.length).toBe(0);
    });
  });

  describe('addConnection', () => {
    it('should add connection between elements', async () => {
      const canvas = await manager.createCanvas({ name: 'AddConn' });

      const elem1 = await manager.addElement(canvas.id, {
        type: 'shape',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
      });

      const elem2 = await manager.addElement(canvas.id, {
        type: 'shape',
        position: { x: 200, y: 0 },
        size: { width: 100, height: 100 },
      });

      const connection = await manager.addConnection(canvas.id, {
        sourceId: elem1.id,
        targetId: elem2.id,
      });

      expect(connection).toBeDefined();
      expect(connection.id).toBeDefined();
      expect(connection.sourceId).toBe(elem1.id);
      expect(connection.targetId).toBe(elem2.id);
    });

    it('should emit connection:added event', async () => {
      let added = false;
      manager.on('connection:added', () => { added = true; });

      const canvas = await manager.createCanvas({ name: 'ConnEvent' });

      const elem1 = await manager.addElement(canvas.id, {
        type: 'shape',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
      });

      const elem2 = await manager.addElement(canvas.id, {
        type: 'shape',
        position: { x: 200, y: 0 },
        size: { width: 100, height: 100 },
      });

      await manager.addConnection(canvas.id, {
        sourceId: elem1.id,
        targetId: elem2.id,
      });

      expect(added).toBe(true);
    });

    it('should support connection labels', async () => {
      const canvas = await manager.createCanvas({ name: 'ConnLabel' });

      const elem1 = await manager.addElement(canvas.id, {
        type: 'shape',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
      });

      const elem2 = await manager.addElement(canvas.id, {
        type: 'shape',
        position: { x: 200, y: 0 },
        size: { width: 100, height: 100 },
      });

      const connection = await manager.addConnection(canvas.id, {
        sourceId: elem1.id,
        targetId: elem2.id,
        label: 'Next Step',
      });

      expect(connection.label).toBe('Next Step');
    });

    it('should support connection style', async () => {
      const canvas = await manager.createCanvas({ name: 'ConnStyle' });

      const elem1 = await manager.addElement(canvas.id, {
        type: 'shape',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
      });

      const elem2 = await manager.addElement(canvas.id, {
        type: 'shape',
        position: { x: 200, y: 0 },
        size: { width: 100, height: 100 },
      });

      const connection = await manager.addConnection(canvas.id, {
        sourceId: elem1.id,
        targetId: elem2.id,
        style: { stroke: '#0000ff', strokeWidth: 2 },
      });

      expect(connection.style?.stroke).toBe('#0000ff');
    });
  });

  describe('deleteConnection', () => {
    it('should delete connection', async () => {
      const canvas = await manager.createCanvas({ name: 'DeleteConn' });

      const elem1 = await manager.addElement(canvas.id, {
        type: 'shape',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
      });

      const elem2 = await manager.addElement(canvas.id, {
        type: 'shape',
        position: { x: 200, y: 0 },
        size: { width: 100, height: 100 },
      });

      const connection = await manager.addConnection(canvas.id, {
        sourceId: elem1.id,
        targetId: elem2.id,
      });

      await manager.deleteConnection(canvas.id, connection.id);

      const updated = manager.getCanvas(canvas.id);
      expect(updated?.connections.find(c => c.id === connection.id)).toBeUndefined();
    });
  });

  describe('undo/redo', () => {
    it('should undo last action', async () => {
      const canvas = await manager.createCanvas({ name: 'Undo' });

      await manager.addElement(canvas.id, {
        type: 'shape',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
      });

      expect(manager.getCanvas(canvas.id)?.elements.length).toBe(1);

      await manager.undo(canvas.id);

      expect(manager.getCanvas(canvas.id)?.elements.length).toBe(0);
    });

    it('should redo undone action', async () => {
      const canvas = await manager.createCanvas({ name: 'Redo' });

      await manager.addElement(canvas.id, {
        type: 'shape',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
      });

      await manager.undo(canvas.id);
      expect(manager.getCanvas(canvas.id)?.elements.length).toBe(0);

      await manager.redo(canvas.id);
      expect(manager.getCanvas(canvas.id)?.elements.length).toBe(1);
    });

    it('should emit undo event', async () => {
      let undone = false;
      manager.on('canvas:undo', () => { undone = true; });

      const canvas = await manager.createCanvas({ name: 'UndoEvent' });
      await manager.addElement(canvas.id, {
        type: 'shape',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
      });

      await manager.undo(canvas.id);

      expect(undone).toBe(true);
    });

    it('should emit redo event', async () => {
      let redone = false;
      manager.on('canvas:redo', () => { redone = true; });

      const canvas = await manager.createCanvas({ name: 'RedoEvent' });
      await manager.addElement(canvas.id, {
        type: 'shape',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
      });

      await manager.undo(canvas.id);
      await manager.redo(canvas.id);

      expect(redone).toBe(true);
    });

    it('should handle multiple undo operations', async () => {
      const canvas = await manager.createCanvas({ name: 'MultiUndo' });

      await manager.addElement(canvas.id, {
        type: 'shape',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
      });

      await manager.addElement(canvas.id, {
        type: 'shape',
        position: { x: 200, y: 0 },
        size: { width: 100, height: 100 },
      });

      await manager.addElement(canvas.id, {
        type: 'shape',
        position: { x: 400, y: 0 },
        size: { width: 100, height: 100 },
      });

      expect(manager.getCanvas(canvas.id)?.elements.length).toBe(3);

      await manager.undo(canvas.id);
      await manager.undo(canvas.id);

      expect(manager.getCanvas(canvas.id)?.elements.length).toBe(1);
    });

    it('should return false when nothing to undo', async () => {
      const canvas = await manager.createCanvas({ name: 'NothingUndo' });

      const result = await manager.undo(canvas.id);

      expect(result).toBe(false);
    });

    it('should return false when nothing to redo', async () => {
      const canvas = await manager.createCanvas({ name: 'NothingRedo' });

      const result = await manager.redo(canvas.id);

      expect(result).toBe(false);
    });
  });

  describe('templates', () => {
    it('should apply basic-flow template', async () => {
      const canvas = await manager.createCanvas({ name: 'BasicFlow' });

      await manager.applyTemplate(canvas.id, 'basic-flow');

      const updated = manager.getCanvas(canvas.id);
      expect(updated?.elements.length).toBeGreaterThan(0);
    });

    it('should apply decision-flow template', async () => {
      const canvas = await manager.createCanvas({ name: 'DecisionFlow' });

      await manager.applyTemplate(canvas.id, 'decision-flow');

      const updated = manager.getCanvas(canvas.id);
      expect(updated?.elements.length).toBeGreaterThan(0);
    });

    it('should apply swimlane template', async () => {
      const canvas = await manager.createCanvas({ name: 'Swimlane' });

      await manager.applyTemplate(canvas.id, 'swimlane');

      const updated = manager.getCanvas(canvas.id);
      expect(updated?.elements.some(e => e.type === 'swimlane')).toBe(true);
    });

    it('should emit template:applied event', () => {
      let templateId: string | null = null;
      manager.on('template:applied', (data) => { templateId = data.templateId; });

      const canvas = manager.createCanvas('TemplateEvent');
      manager.applyTemplate(canvas.id, 'basic-flow');

      expect(templateId).toBe('basic-flow');
    });

    it('should list available templates', () => {
      const templates = manager.getTemplates();

      expect(templates).toBeInstanceOf(Array);
      expect(templates.length).toBeGreaterThan(0);
    });
  });

  describe('exportToWorkflow', () => {
    it('should export canvas to workflow format', async () => {
      const canvas = await manager.createCanvas({ name: 'ExportTest' });

      manager.addElement(canvas.id, {
        type: 'node-placeholder',
        position: { x: 100, y: 100 },
        size: { width: 150, height: 80 },
        content: { nodeType: 'http_request', label: 'HTTP Request' },
      });

      manager.addElement(canvas.id, {
        type: 'node-placeholder',
        position: { x: 350, y: 100 },
        size: { width: 150, height: 80 },
        content: { nodeType: 'email', label: 'Send Email' },
      });

      const workflow = manager.exportToWorkflow(canvas.id);

      expect(workflow).toBeDefined();
      expect(workflow?.nodes).toBeInstanceOf(Array);
      expect(workflow?.nodes.length).toBe(2);
    });

    it('should include connections as edges', () => {
      const canvas = manager.createCanvas('ExportEdges');

      const elem1 = manager.addElement(canvas.id, {
        type: 'node-placeholder',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 80 },
        content: { nodeType: 'trigger' },
      });

      const elem2 = manager.addElement(canvas.id, {
        type: 'node-placeholder',
        position: { x: 200, y: 0 },
        size: { width: 100, height: 80 },
        content: { nodeType: 'action' },
      });

      manager.addConnection(canvas.id, {
        sourceId: elem1!.id,
        targetId: elem2!.id,
      });

      const workflow = manager.exportToWorkflow(canvas.id);

      expect(workflow?.edges).toBeInstanceOf(Array);
      expect(workflow?.edges.length).toBe(1);
    });

    it('should preserve node positions', () => {
      const canvas = manager.createCanvas('Positions', { snapToGrid: false });

      manager.addElement(canvas.id, {
        type: 'node-placeholder',
        position: { x: 123, y: 456 },
        size: { width: 100, height: 80 },
        content: { nodeType: 'test' },
      });

      const workflow = manager.exportToWorkflow(canvas.id);

      expect(workflow?.nodes[0].position.x).toBe(123);
      expect(workflow?.nodes[0].position.y).toBe(456);
    });
  });

  describe('groupElements', () => {
    it('should group multiple elements', async () => {
      const canvas = await manager.createCanvas({ name: 'Group' });

      const elem1 = await manager.addElement(canvas.id, {
        type: 'shape',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
      });

      const elem2 = await manager.addElement(canvas.id, {
        type: 'shape',
        position: { x: 150, y: 0 },
        size: { width: 100, height: 100 },
      });

      const group = await manager.groupElements(canvas.id, [elem1.id, elem2.id]);

      expect(group).toBeDefined();
      expect(group.type).toBe('group');
      expect((group.content as { children: string[] })?.children).toContain(elem1.id);
      expect((group.content as { children: string[] })?.children).toContain(elem2.id);
    });

    it('should emit elements:grouped event', async () => {
      let grouped = false;
      manager.on('elements:grouped', () => { grouped = true; });

      const canvas = await manager.createCanvas({ name: 'GroupEvent' });

      const elem1 = await manager.addElement(canvas.id, {
        type: 'shape',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
      });

      const elem2 = await manager.addElement(canvas.id, {
        type: 'shape',
        position: { x: 150, y: 0 },
        size: { width: 100, height: 100 },
      });

      await manager.groupElements(canvas.id, [elem1.id, elem2.id]);

      expect(grouped).toBe(true);
    });
  });

  describe('ungroupElements', () => {
    it('should ungroup elements', async () => {
      const canvas = await manager.createCanvas({ name: 'Ungroup' });

      const elem1 = await manager.addElement(canvas.id, {
        type: 'shape',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
      });

      const elem2 = await manager.addElement(canvas.id, {
        type: 'shape',
        position: { x: 150, y: 0 },
        size: { width: 100, height: 100 },
      });

      const group = await manager.groupElements(canvas.id, [elem1.id, elem2.id]);
      await manager.ungroupElements(canvas.id, group.id);

      const updated = manager.getCanvas(canvas.id);
      expect(updated?.elements.find(e => e.id === group.id)).toBeUndefined();
    });
  });

  describe('duplicateCanvas', () => {
    it('should duplicate canvas', () => {
      const original = manager.createCanvas('Original');
      manager.addElement(original.id, {
        type: 'shape',
        position: { x: 100, y: 100 },
        size: { width: 150, height: 100 },
        style: { fill: '#ff0000' },
      });

      const duplicate = manager.duplicateCanvas(original.id, 'Duplicate');

      expect(duplicate).toBeDefined();
      expect(duplicate?.id).not.toBe(original.id);
      expect(duplicate?.name).toBe('Duplicate');
    });

    it('should copy elements to duplicated canvas', () => {
      const original = manager.createCanvas('Original');
      manager.addElement(original.id, {
        type: 'shape',
        position: { x: 100, y: 100 },
        size: { width: 100, height: 100 },
      });

      const duplicate = manager.duplicateCanvas(original.id);

      expect(duplicate?.elements.length).toBe(original.elements.length);
    });
  });

  describe('factory function', () => {
    it('should create manager instance', () => {
      const instance = createCanvasPlanningManager();
      expect(instance).toBeInstanceOf(CanvasPlanningManager);
    });
  });
});
