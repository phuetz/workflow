/**
 * Canvas Planning Tool
 * Visual workflow architecture sketching and planning before building
 */

import { EventEmitter } from 'events';

// Types
export interface CanvasElement {
  id: string;
  type: CanvasElementType;
  position: Position;
  size: Size;
  content: ElementContent;
  style?: ElementStyle;
  connections?: string[];
  metadata?: Record<string, unknown>;
  locked?: boolean;
  zIndex?: number;
}

export type CanvasElementType =
  | 'shape'
  | 'text'
  | 'note'
  | 'connector'
  | 'image'
  | 'icon'
  | 'group'
  | 'workflow-placeholder'
  | 'node-placeholder'
  | 'swimlane'
  | 'frame';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface ElementContent {
  text?: string;
  shape?: ShapeType;
  icon?: string;
  imageUrl?: string;
  nodeType?: string;
  children?: string[];
}

export type ShapeType =
  | 'rectangle'
  | 'rounded-rectangle'
  | 'circle'
  | 'ellipse'
  | 'diamond'
  | 'hexagon'
  | 'triangle'
  | 'parallelogram'
  | 'cylinder'
  | 'cloud'
  | 'arrow'
  | 'callout';

export interface ElementStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  opacity?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
  textColor?: string;
  borderRadius?: number;
  shadow?: boolean;
  dashed?: boolean;
}

export interface CanvasConnection {
  id: string;
  sourceId: string;
  targetId: string;
  sourceHandle?: string;
  targetHandle?: string;
  style?: ConnectionStyle;
  label?: string;
  labelPosition?: number; // 0-1, position along the path
}

export interface ConnectionStyle {
  stroke?: string;
  strokeWidth?: number;
  type?: 'straight' | 'curved' | 'step' | 'smoothstep';
  animated?: boolean;
  dashed?: boolean;
  arrowStart?: boolean;
  arrowEnd?: boolean;
}

export interface Canvas {
  id: string;
  name: string;
  description?: string;
  elements: CanvasElement[];
  connections: CanvasConnection[];
  settings: CanvasSettings;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  version: number;
  collaborators?: string[];
}

export interface CanvasSettings {
  width: number;
  height: number;
  backgroundColor: string;
  gridEnabled: boolean;
  gridSize: number;
  snapToGrid: boolean;
  showRulers: boolean;
  zoom: number;
  panX: number;
  panY: number;
}

export interface CanvasTemplate {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  elements: CanvasElement[];
  connections: CanvasConnection[];
  category: string;
}

export interface WorkflowExport {
  name: string;
  description?: string;
  nodes: Array<{
    id: string;
    type: string;
    position: Position;
    data: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
  }>;
}

// Predefined templates
const CANVAS_TEMPLATES: CanvasTemplate[] = [
  {
    id: 'basic-flow',
    name: 'Basic Flow',
    description: 'Simple start to end workflow',
    category: 'starter',
    elements: [
      {
        id: 'start',
        type: 'shape',
        position: { x: 100, y: 200 },
        size: { width: 100, height: 50 },
        content: { shape: 'rounded-rectangle', text: 'Start' },
        style: { fill: '#10b981', textColor: '#fff' },
      },
      {
        id: 'process',
        type: 'shape',
        position: { x: 300, y: 200 },
        size: { width: 120, height: 60 },
        content: { shape: 'rectangle', text: 'Process' },
        style: { fill: '#3b82f6', textColor: '#fff' },
      },
      {
        id: 'end',
        type: 'shape',
        position: { x: 500, y: 200 },
        size: { width: 100, height: 50 },
        content: { shape: 'rounded-rectangle', text: 'End' },
        style: { fill: '#ef4444', textColor: '#fff' },
      },
    ],
    connections: [
      { id: 'conn1', sourceId: 'start', targetId: 'process', style: { arrowEnd: true } },
      { id: 'conn2', sourceId: 'process', targetId: 'end', style: { arrowEnd: true } },
    ],
  },
  {
    id: 'decision-flow',
    name: 'Decision Flow',
    description: 'Flow with conditional branching',
    category: 'starter',
    elements: [
      {
        id: 'start',
        type: 'shape',
        position: { x: 100, y: 200 },
        size: { width: 100, height: 50 },
        content: { shape: 'rounded-rectangle', text: 'Start' },
        style: { fill: '#10b981', textColor: '#fff' },
      },
      {
        id: 'decision',
        type: 'shape',
        position: { x: 280, y: 185 },
        size: { width: 80, height: 80 },
        content: { shape: 'diamond', text: '?' },
        style: { fill: '#f59e0b', textColor: '#fff' },
      },
      {
        id: 'yes-path',
        type: 'shape',
        position: { x: 450, y: 100 },
        size: { width: 100, height: 50 },
        content: { shape: 'rectangle', text: 'Yes Path' },
        style: { fill: '#3b82f6', textColor: '#fff' },
      },
      {
        id: 'no-path',
        type: 'shape',
        position: { x: 450, y: 280 },
        size: { width: 100, height: 50 },
        content: { shape: 'rectangle', text: 'No Path' },
        style: { fill: '#3b82f6', textColor: '#fff' },
      },
    ],
    connections: [
      { id: 'conn1', sourceId: 'start', targetId: 'decision', style: { arrowEnd: true } },
      { id: 'conn2', sourceId: 'decision', targetId: 'yes-path', label: 'Yes', style: { arrowEnd: true } },
      { id: 'conn3', sourceId: 'decision', targetId: 'no-path', label: 'No', style: { arrowEnd: true } },
    ],
  },
  {
    id: 'swimlane',
    name: 'Swimlane Diagram',
    description: 'Process flow across departments',
    category: 'business',
    elements: [
      {
        id: 'lane1',
        type: 'swimlane',
        position: { x: 50, y: 50 },
        size: { width: 800, height: 150 },
        content: { text: 'Department A' },
        style: { fill: '#e0f2fe', stroke: '#0284c7' },
      },
      {
        id: 'lane2',
        type: 'swimlane',
        position: { x: 50, y: 200 },
        size: { width: 800, height: 150 },
        content: { text: 'Department B' },
        style: { fill: '#fef3c7', stroke: '#d97706' },
      },
    ],
    connections: [],
  },
];

// Default styles
const DEFAULT_STYLES: Record<string, Partial<ElementStyle>> = {
  shape: {
    fill: '#ffffff',
    stroke: '#e5e7eb',
    strokeWidth: 2,
    fontSize: 14,
    textColor: '#1f2937',
  },
  text: {
    fontSize: 16,
    textColor: '#1f2937',
    fontFamily: 'Inter',
  },
  note: {
    fill: '#fef3c7',
    stroke: '#f59e0b',
    strokeWidth: 1,
    fontSize: 12,
    textColor: '#92400e',
  },
  'node-placeholder': {
    fill: '#dbeafe',
    stroke: '#3b82f6',
    strokeWidth: 2,
    strokeDasharray: '5,5',
  },
};

/**
 * Canvas Planning Manager
 */
export class CanvasPlanningManager extends EventEmitter {
  private canvases: Map<string, Canvas> = new Map();
  private undoStack: Map<string, Canvas[]> = new Map();
  private redoStack: Map<string, Canvas[]> = new Map();
  private maxUndoLevels: number = 50;

  constructor() {
    super();
  }

  /**
   * Create a new canvas
   */
  createCanvas(name: string, options?: Partial<CanvasSettings>): Canvas {
    const canvas: Canvas = {
      id: this.generateId('canvas'),
      name,
      elements: [],
      connections: [],
      settings: {
        width: options?.width || 4000,
        height: options?.height || 3000,
        backgroundColor: options?.backgroundColor || '#ffffff',
        gridEnabled: options?.gridEnabled ?? true,
        gridSize: options?.gridSize || 20,
        snapToGrid: options?.snapToGrid ?? true,
        showRulers: options?.showRulers ?? false,
        zoom: options?.zoom || 1,
        panX: options?.panX || 0,
        panY: options?.panY || 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    };

    this.canvases.set(canvas.id, canvas);
    this.undoStack.set(canvas.id, []);
    this.redoStack.set(canvas.id, []);

    this.emit('canvas:created', canvas);
    return canvas;
  }

  /**
   * Get canvas by ID
   */
  getCanvas(canvasId: string): Canvas | undefined {
    return this.canvases.get(canvasId);
  }

  /**
   * List all canvases
   */
  listCanvases(): Canvas[] {
    return Array.from(this.canvases.values());
  }

  /**
   * Delete canvas
   */
  deleteCanvas(canvasId: string): boolean {
    const deleted = this.canvases.delete(canvasId);
    if (deleted) {
      this.undoStack.delete(canvasId);
      this.redoStack.delete(canvasId);
      this.emit('canvas:deleted', canvasId);
    }
    return deleted;
  }

  /**
   * Add element to canvas
   */
  addElement(canvasId: string, element: Omit<CanvasElement, 'id'>): CanvasElement | null {
    const canvas = this.canvases.get(canvasId);
    if (!canvas) return null;

    this.saveUndoState(canvasId);

    const newElement: CanvasElement = {
      ...element,
      id: this.generateId('elem'),
      style: {
        ...DEFAULT_STYLES[element.type],
        ...element.style,
      },
      zIndex: canvas.elements.length,
    };

    // Snap to grid if enabled
    if (canvas.settings.snapToGrid) {
      newElement.position = this.snapToGrid(newElement.position, canvas.settings.gridSize);
    }

    canvas.elements.push(newElement);
    canvas.updatedAt = new Date();
    canvas.version++;

    this.emit('element:added', { canvasId, element: newElement });
    return newElement;
  }

  /**
   * Update element
   */
  updateElement(canvasId: string, elementId: string, updates: Partial<CanvasElement>): CanvasElement | null {
    const canvas = this.canvases.get(canvasId);
    if (!canvas) return null;

    const elementIndex = canvas.elements.findIndex(e => e.id === elementId);
    if (elementIndex === -1) return null;

    this.saveUndoState(canvasId);

    const element = canvas.elements[elementIndex];
    const updatedElement: CanvasElement = {
      ...element,
      ...updates,
      id: element.id, // Preserve ID
    };

    // Snap to grid if position changed and snap is enabled
    if (updates.position && canvas.settings.snapToGrid) {
      updatedElement.position = this.snapToGrid(updatedElement.position, canvas.settings.gridSize);
    }

    canvas.elements[elementIndex] = updatedElement;
    canvas.updatedAt = new Date();
    canvas.version++;

    this.emit('element:updated', { canvasId, element: updatedElement });
    return updatedElement;
  }

  /**
   * Delete element
   */
  deleteElement(canvasId: string, elementId: string): boolean {
    const canvas = this.canvases.get(canvasId);
    if (!canvas) return false;

    this.saveUndoState(canvasId);

    const elementIndex = canvas.elements.findIndex(e => e.id === elementId);
    if (elementIndex === -1) return false;

    canvas.elements.splice(elementIndex, 1);

    // Remove connections involving this element
    canvas.connections = canvas.connections.filter(
      c => c.sourceId !== elementId && c.targetId !== elementId
    );

    canvas.updatedAt = new Date();
    canvas.version++;

    this.emit('element:deleted', { canvasId, elementId });
    return true;
  }

  /**
   * Add connection
   */
  addConnection(canvasId: string, connection: Omit<CanvasConnection, 'id'>): CanvasConnection | null {
    const canvas = this.canvases.get(canvasId);
    if (!canvas) return null;

    // Verify source and target exist
    const sourceExists = canvas.elements.some(e => e.id === connection.sourceId);
    const targetExists = canvas.elements.some(e => e.id === connection.targetId);
    if (!sourceExists || !targetExists) return null;

    this.saveUndoState(canvasId);

    const newConnection: CanvasConnection = {
      ...connection,
      id: this.generateId('conn'),
      style: {
        type: 'smoothstep',
        arrowEnd: true,
        stroke: '#94a3b8',
        strokeWidth: 2,
        ...connection.style,
      },
    };

    canvas.connections.push(newConnection);
    canvas.updatedAt = new Date();
    canvas.version++;

    this.emit('connection:added', { canvasId, connection: newConnection });
    return newConnection;
  }

  /**
   * Delete connection
   */
  deleteConnection(canvasId: string, connectionId: string): boolean {
    const canvas = this.canvases.get(canvasId);
    if (!canvas) return false;

    this.saveUndoState(canvasId);

    const connIndex = canvas.connections.findIndex(c => c.id === connectionId);
    if (connIndex === -1) return false;

    canvas.connections.splice(connIndex, 1);
    canvas.updatedAt = new Date();
    canvas.version++;

    this.emit('connection:deleted', { canvasId, connectionId });
    return true;
  }

  /**
   * Apply template to canvas
   */
  applyTemplate(canvasId: string, templateId: string): boolean {
    const canvas = this.canvases.get(canvasId);
    const template = CANVAS_TEMPLATES.find(t => t.id === templateId);

    if (!canvas || !template) return false;

    this.saveUndoState(canvasId);

    // Generate new IDs for elements and update connections
    const idMap = new Map<string, string>();

    for (const element of template.elements) {
      const newId = this.generateId('elem');
      idMap.set(element.id, newId);
      canvas.elements.push({
        ...element,
        id: newId,
        zIndex: canvas.elements.length,
      });
    }

    for (const connection of template.connections) {
      canvas.connections.push({
        ...connection,
        id: this.generateId('conn'),
        sourceId: idMap.get(connection.sourceId) || connection.sourceId,
        targetId: idMap.get(connection.targetId) || connection.targetId,
      });
    }

    canvas.updatedAt = new Date();
    canvas.version++;

    this.emit('template:applied', { canvasId, templateId });
    return true;
  }

  /**
   * Get available templates
   */
  getTemplates(): CanvasTemplate[] {
    return CANVAS_TEMPLATES;
  }

  /**
   * Convert canvas to workflow
   */
  exportToWorkflow(canvasId: string): WorkflowExport | null {
    const canvas = this.canvases.get(canvasId);
    if (!canvas) return null;

    const nodes: WorkflowExport['nodes'] = [];
    const edges: WorkflowExport['edges'] = [];
    const elementToNodeId = new Map<string, string>();

    // Convert node-placeholder elements to workflow nodes
    for (const element of canvas.elements) {
      if (element.type === 'node-placeholder' || element.type === 'shape') {
        const nodeId = `node_${element.id}`;
        elementToNodeId.set(element.id, nodeId);

        // Infer node type from content
        const nodeType = element.content.nodeType || this.inferNodeType(element);

        nodes.push({
          id: nodeId,
          type: nodeType,
          position: element.position,
          data: {
            label: element.content.text || nodeType,
            ...element.metadata,
          },
        });
      }
    }

    // Convert connections to edges
    for (const connection of canvas.connections) {
      const sourceNodeId = elementToNodeId.get(connection.sourceId);
      const targetNodeId = elementToNodeId.get(connection.targetId);

      if (sourceNodeId && targetNodeId) {
        edges.push({
          id: `edge_${connection.id}`,
          source: sourceNodeId,
          target: targetNodeId,
        });
      }
    }

    return {
      name: canvas.name,
      description: canvas.description,
      nodes,
      edges,
    };
  }

  /**
   * Infer node type from element
   */
  private inferNodeType(element: CanvasElement): string {
    const text = element.content.text?.toLowerCase() || '';

    // Common mappings
    if (text.includes('start') || text.includes('trigger')) return 'webhook';
    if (text.includes('end') || text.includes('finish')) return 'respond_to_webhook';
    if (text.includes('email')) return 'email';
    if (text.includes('slack')) return 'slack';
    if (text.includes('http') || text.includes('api')) return 'http_request';
    if (text.includes('database') || text.includes('db')) return 'database';
    if (text.includes('filter')) return 'filter';
    if (text.includes('transform')) return 'transform';
    if (text.includes('code') || text.includes('script')) return 'code';
    if (text.includes('condition') || text.includes('if') || element.content.shape === 'diamond') return 'condition';
    if (text.includes('delay') || text.includes('wait')) return 'delay';
    if (text.includes('loop') || text.includes('each')) return 'loop';

    return 'set'; // Default to Set node
  }

  /**
   * Group elements
   */
  groupElements(canvasId: string, elementIds: string[]): CanvasElement | null {
    const canvas = this.canvases.get(canvasId);
    if (!canvas || elementIds.length < 2) return null;

    this.saveUndoState(canvasId);

    // Calculate bounding box
    const elements = canvas.elements.filter(e => elementIds.includes(e.id));
    if (elements.length === 0) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const elem of elements) {
      minX = Math.min(minX, elem.position.x);
      minY = Math.min(minY, elem.position.y);
      maxX = Math.max(maxX, elem.position.x + elem.size.width);
      maxY = Math.max(maxY, elem.position.y + elem.size.height);
    }

    // Create group element
    const group: CanvasElement = {
      id: this.generateId('group'),
      type: 'group',
      position: { x: minX - 10, y: minY - 10 },
      size: { width: maxX - minX + 20, height: maxY - minY + 20 },
      content: { children: elementIds },
      style: {
        fill: 'transparent',
        stroke: '#94a3b8',
        strokeWidth: 1,
        dashed: true,
      },
      zIndex: Math.max(...elements.map(e => e.zIndex || 0)) + 1,
    };

    canvas.elements.push(group);
    canvas.updatedAt = new Date();
    canvas.version++;

    this.emit('elements:grouped', { canvasId, groupId: group.id, elementIds });
    return group;
  }

  /**
   * Ungroup elements
   */
  ungroupElements(canvasId: string, groupId: string): string[] {
    const canvas = this.canvases.get(canvasId);
    if (!canvas) return [];

    const groupIndex = canvas.elements.findIndex(e => e.id === groupId && e.type === 'group');
    if (groupIndex === -1) return [];

    this.saveUndoState(canvasId);

    const group = canvas.elements[groupIndex];
    const childIds = group.content.children || [];

    canvas.elements.splice(groupIndex, 1);
    canvas.updatedAt = new Date();
    canvas.version++;

    this.emit('elements:ungrouped', { canvasId, groupId, elementIds: childIds });
    return childIds;
  }

  /**
   * Undo last action
   */
  undo(canvasId: string): boolean {
    const undoStack = this.undoStack.get(canvasId);
    const redoStack = this.redoStack.get(canvasId);
    const currentCanvas = this.canvases.get(canvasId);

    if (!undoStack || !redoStack || !currentCanvas || undoStack.length === 0) {
      return false;
    }

    // Save current state to redo stack
    redoStack.push(JSON.parse(JSON.stringify(currentCanvas)));

    // Restore previous state
    const previousState = undoStack.pop()!;
    this.canvases.set(canvasId, previousState);

    this.emit('canvas:undo', canvasId);
    return true;
  }

  /**
   * Redo last undone action
   */
  redo(canvasId: string): boolean {
    const undoStack = this.undoStack.get(canvasId);
    const redoStack = this.redoStack.get(canvasId);
    const currentCanvas = this.canvases.get(canvasId);

    if (!undoStack || !redoStack || !currentCanvas || redoStack.length === 0) {
      return false;
    }

    // Save current state to undo stack
    undoStack.push(JSON.parse(JSON.stringify(currentCanvas)));

    // Restore next state
    const nextState = redoStack.pop()!;
    this.canvases.set(canvasId, nextState);

    this.emit('canvas:redo', canvasId);
    return true;
  }

  /**
   * Save undo state
   */
  private saveUndoState(canvasId: string): void {
    const canvas = this.canvases.get(canvasId);
    const undoStack = this.undoStack.get(canvasId);

    if (!canvas || !undoStack) return;

    // Save deep copy of current state
    undoStack.push(JSON.parse(JSON.stringify(canvas)));

    // Limit undo stack size
    if (undoStack.length > this.maxUndoLevels) {
      undoStack.shift();
    }

    // Clear redo stack on new action
    this.redoStack.set(canvasId, []);
  }

  /**
   * Snap position to grid
   */
  private snapToGrid(position: Position, gridSize: number): Position {
    return {
      x: Math.round(position.x / gridSize) * gridSize,
      y: Math.round(position.y / gridSize) * gridSize,
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Export canvas to JSON
   */
  exportToJSON(canvasId: string): string | null {
    const canvas = this.canvases.get(canvasId);
    if (!canvas) return null;
    return JSON.stringify(canvas, null, 2);
  }

  /**
   * Import canvas from JSON
   */
  importFromJSON(json: string): Canvas | null {
    try {
      const data = JSON.parse(json) as Canvas;
      data.id = this.generateId('canvas');
      data.createdAt = new Date();
      data.updatedAt = new Date();
      data.version = 1;

      this.canvases.set(data.id, data);
      this.undoStack.set(data.id, []);
      this.redoStack.set(data.id, []);

      this.emit('canvas:imported', data);
      return data;
    } catch {
      return null;
    }
  }

  /**
   * Update canvas settings
   */
  updateSettings(canvasId: string, settings: Partial<CanvasSettings>): Canvas | null {
    const canvas = this.canvases.get(canvasId);
    if (!canvas) return null;

    canvas.settings = { ...canvas.settings, ...settings };
    canvas.updatedAt = new Date();
    canvas.version++;

    this.emit('settings:updated', { canvasId, settings: canvas.settings });
    return canvas;
  }

  /**
   * Duplicate canvas
   */
  duplicateCanvas(canvasId: string, newName?: string): Canvas | null {
    const original = this.canvases.get(canvasId);
    if (!original) return null;

    const copy: Canvas = {
      ...JSON.parse(JSON.stringify(original)),
      id: this.generateId('canvas'),
      name: newName || `${original.name} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    };

    this.canvases.set(copy.id, copy);
    this.undoStack.set(copy.id, []);
    this.redoStack.set(copy.id, []);

    this.emit('canvas:duplicated', { originalId: canvasId, newCanvas: copy });
    return copy;
  }
}

// Export factory function
export function createCanvasPlanningManager(): CanvasPlanningManager {
  return new CanvasPlanningManager();
}

export default CanvasPlanningManager;
