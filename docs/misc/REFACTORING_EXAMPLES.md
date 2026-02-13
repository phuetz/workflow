# REFACTORING EXAMPLES - Code Concret pour Migration 100/100

Ce document complète `AUDIT_ARCHITECTURE_100.md` avec des exemples de code prêts à l'emploi.

---

## 1. ZUSTAND SLICES - Exemples Complets

### 1.1 Credentials Store Slice

```typescript
// src/store/slices/credentialsStore.ts
import { StateCreator } from 'zustand';
import { EncryptionService } from '../../services/EncryptionService';
import { logger } from '../../services/LoggingService';

export interface Credential {
  id: string;
  service: string;
  type: 'oauth2' | 'api_key' | 'basic' | 'custom';
  data: Record<string, unknown>;
  encryptedData?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CredentialsSlice {
  // State
  credentials: Record<string, Credential>;

  // Actions
  addCredential: (service: string, data: Record<string, unknown>) => Promise<string>;
  updateCredential: (id: string, data: Partial<Record<string, unknown>>) => Promise<void>;
  deleteCredential: (id: string) => Promise<void>;
  getCredential: (service: string) => Credential | undefined;
  encryptCredentials: () => Promise<void>;
  decryptCredentials: () => Promise<void>;
}

const encryptionService = new EncryptionService();

export const createCredentialsSlice: StateCreator<
  CredentialsSlice,
  [],
  [],
  CredentialsSlice
> = (set, get) => ({
  credentials: {},

  addCredential: async (service: string, data: Record<string, unknown>) => {
    try {
      const id = `cred_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

      // Encrypt sensitive data
      const encryptedData = await encryptionService.encrypt(JSON.stringify(data));

      const credential: Credential = {
        id,
        service,
        type: 'custom',
        data: {}, // Don't store raw data
        encryptedData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      set((state) => ({
        credentials: {
          ...state.credentials,
          [service]: credential
        }
      }));

      logger.info('Credential added', { service, id });
      return id;
    } catch (error) {
      logger.error('Failed to add credential', { service, error });
      throw error;
    }
  },

  updateCredential: async (id: string, data: Partial<Record<string, unknown>>) => {
    try {
      const current = Object.values(get().credentials).find(c => c.id === id);
      if (!current) {
        throw new Error(`Credential ${id} not found`);
      }

      // Decrypt, merge, re-encrypt
      const decryptedData = JSON.parse(
        await encryptionService.decrypt(current.encryptedData!)
      );
      const mergedData = { ...decryptedData, ...data };
      const encryptedData = await encryptionService.encrypt(JSON.stringify(mergedData));

      set((state) => ({
        credentials: {
          ...state.credentials,
          [current.service]: {
            ...current,
            encryptedData,
            updatedAt: new Date()
          }
        }
      }));

      logger.info('Credential updated', { id });
    } catch (error) {
      logger.error('Failed to update credential', { id, error });
      throw error;
    }
  },

  deleteCredential: async (id: string) => {
    try {
      const current = Object.entries(get().credentials).find(([_, c]) => c.id === id);
      if (!current) {
        throw new Error(`Credential ${id} not found`);
      }

      set((state) => {
        const newCredentials = { ...state.credentials };
        delete newCredentials[current[0]];
        return { credentials: newCredentials };
      });

      logger.info('Credential deleted', { id });
    } catch (error) {
      logger.error('Failed to delete credential', { id, error });
      throw error;
    }
  },

  getCredential: (service: string) => {
    return get().credentials[service];
  },

  encryptCredentials: async () => {
    const credentials = get().credentials;
    for (const [service, cred] of Object.entries(credentials)) {
      if (!cred.encryptedData && Object.keys(cred.data).length > 0) {
        const encrypted = await encryptionService.encrypt(JSON.stringify(cred.data));
        set((state) => ({
          credentials: {
            ...state.credentials,
            [service]: {
              ...cred,
              data: {},
              encryptedData: encrypted
            }
          }
        }));
      }
    }
  },

  decryptCredentials: async () => {
    // Only decrypt in memory for usage, don't persist decrypted
    const credentials = get().credentials;
    const decrypted: Record<string, Credential> = {};

    for (const [service, cred] of Object.entries(credentials)) {
      if (cred.encryptedData) {
        const data = JSON.parse(
          await encryptionService.decrypt(cred.encryptedData)
        );
        decrypted[service] = { ...cred, data };
      }
    }

    return decrypted;
  }
});
```

### 1.2 Collaboration Store Slice

```typescript
// src/store/slices/collaborationStore.ts
import { StateCreator } from 'zustand';
import { logger } from '../../services/LoggingService';

export interface Collaborator {
  id: string;
  email: string;
  name?: string;
  role: 'viewer' | 'editor' | 'admin';
  permissions: string[];
  addedAt: Date;
  lastActiveAt?: Date;
  status: 'pending' | 'active' | 'inactive';
}

export interface Comment {
  id: string;
  workflowId: string;
  nodeId?: string;
  userId: string;
  text: string;
  createdAt: Date;
  updatedAt?: Date;
  resolved: boolean;
  replies: Comment[];
}

export interface CollaborationSlice {
  // State
  collaborators: Collaborator[];
  comments: Comment[];
  activeUsers: Set<string>;

  // Actions
  addCollaborator: (email: string, role: Collaborator['role']) => Promise<string>;
  updateCollaboratorRole: (id: string, role: Collaborator['role']) => void;
  removeCollaborator: (id: string) => void;

  addComment: (workflowId: string, text: string, nodeId?: string) => string;
  updateComment: (id: string, text: string) => void;
  resolveComment: (id: string) => void;
  deleteComment: (id: string) => void;

  setActiveUsers: (userIds: string[]) => void;
  isUserActive: (userId: string) => boolean;
}

export const createCollaborationSlice: StateCreator<
  CollaborationSlice,
  [],
  [],
  CollaborationSlice
> = (set, get) => ({
  collaborators: [],
  comments: [],
  activeUsers: new Set(),

  addCollaborator: async (email: string, role: Collaborator['role']) => {
    const id = `collab_${Date.now()}`;

    const collaborator: Collaborator = {
      id,
      email,
      role,
      permissions: getRolePermissions(role),
      addedAt: new Date(),
      status: 'pending'
    };

    set((state) => ({
      collaborators: [...state.collaborators, collaborator]
    }));

    logger.info('Collaborator invited', { email, role });

    // TODO: Send invitation email

    return id;
  },

  updateCollaboratorRole: (id: string, role: Collaborator['role']) => {
    set((state) => ({
      collaborators: state.collaborators.map(c =>
        c.id === id
          ? { ...c, role, permissions: getRolePermissions(role) }
          : c
      )
    }));

    logger.info('Collaborator role updated', { id, role });
  },

  removeCollaborator: (id: string) => {
    set((state) => ({
      collaborators: state.collaborators.filter(c => c.id !== id)
    }));

    logger.info('Collaborator removed', { id });
  },

  addComment: (workflowId: string, text: string, nodeId?: string) => {
    const id = `comment_${Date.now()}`;

    const comment: Comment = {
      id,
      workflowId,
      nodeId,
      userId: 'current_user', // TODO: Get from auth context
      text,
      createdAt: new Date(),
      resolved: false,
      replies: []
    };

    set((state) => ({
      comments: [...state.comments, comment]
    }));

    return id;
  },

  updateComment: (id: string, text: string) => {
    set((state) => ({
      comments: state.comments.map(c =>
        c.id === id
          ? { ...c, text, updatedAt: new Date() }
          : c
      )
    }));
  },

  resolveComment: (id: string) => {
    set((state) => ({
      comments: state.comments.map(c =>
        c.id === id ? { ...c, resolved: true } : c
      )
    }));
  },

  deleteComment: (id: string) => {
    set((state) => ({
      comments: state.comments.filter(c => c.id !== id)
    }));
  },

  setActiveUsers: (userIds: string[]) => {
    set({ activeUsers: new Set(userIds) });
  },

  isUserActive: (userId: string) => {
    return get().activeUsers.has(userId);
  }
});

function getRolePermissions(role: Collaborator['role']): string[] {
  switch (role) {
    case 'viewer':
      return ['read'];
    case 'editor':
      return ['read', 'write', 'execute'];
    case 'admin':
      return ['read', 'write', 'execute', 'manage', 'delete'];
    default:
      return ['read'];
  }
}
```

### 1.3 Combined Store

```typescript
// src/store/index.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createNodeSlice, NodeSlice } from './slices/nodeStore';
import { createExecutionSlice, ExecutionSlice } from './slices/executionStore';
import { createUISlice, UISlice } from './slices/uiStore';
import { createCredentialsSlice, CredentialsSlice } from './slices/credentialsStore';
import { createCollaborationSlice, CollaborationSlice } from './slices/collaborationStore';

export type WorkflowStore =
  & NodeSlice
  & ExecutionSlice
  & UISlice
  & CredentialsSlice
  & CollaborationSlice;

export const useWorkflowStore = create<WorkflowStore>()(
  persist(
    (...args) => ({
      ...createNodeSlice(...args),
      ...createExecutionSlice(...args),
      ...createUISlice(...args),
      ...createCredentialsSlice(...args),
      ...createCollaborationSlice(...args)
    }),
    {
      name: 'workflow-storage-v4',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist necessary data
        nodes: state.nodes,
        edges: state.edges,
        credentials: state.credentials,
        // Don't persist execution state (ephemeral)
        // Don't persist active users (runtime only)
      })
    }
  )
);

// Selectors for performance
export const useNodes = () => useWorkflowStore((state) => state.nodes);
export const useEdges = () => useWorkflowStore((state) => state.edges);
export const useSelectedNode = () => useWorkflowStore((state) => state.selectedNode);
export const useExecutionResults = () => useWorkflowStore((state) => state.executionResults);
export const useCredentials = () => useWorkflowStore((state) => state.credentials);
export const useCollaborators = () => useWorkflowStore((state) => state.collaborators);
```

---

## 2. CIRCULAR DEPENDENCIES FIXES

### 2.1 NodeExecutor ↔ AdvancedFlowExecutor

**Avant**:
```typescript
// components/execution/NodeExecutor.ts
import { AdvancedFlowExecutor } from './AdvancedFlowExecutor';

export class NodeExecutor {
  private flowExecutor: AdvancedFlowExecutor;

  async execute(node: Node) {
    if (node.type === 'subworkflow') {
      return this.flowExecutor.executeSubflow(node);
    }
    // ...
  }
}

// components/execution/AdvancedFlowExecutor.ts
import { NodeExecutor } from './NodeExecutor';

export class AdvancedFlowExecutor {
  private nodeExecutor: NodeExecutor;

  async executeSubflow(node: Node) {
    // Uses nodeExecutor
  }
}
```

**Après** (Interface Segregation):
```typescript
// components/execution/IExecutor.ts (nouveau)
export interface INodeExecutor {
  execute(node: Node): Promise<ExecutionResult>;
}

export interface IFlowExecutor {
  executeSubflow(node: Node): Promise<ExecutionResult>;
  executeFlow(nodes: Node[]): Promise<ExecutionResult[]>;
}

// components/execution/NodeExecutor.ts
import { IFlowExecutor } from './IExecutor';

export class NodeExecutor implements INodeExecutor {
  constructor(private flowExecutor: IFlowExecutor) {}

  async execute(node: Node): Promise<ExecutionResult> {
    if (node.type === 'subworkflow') {
      return this.flowExecutor.executeSubflow(node);
    }
    // ...
  }
}

// components/execution/AdvancedFlowExecutor.ts
import { INodeExecutor } from './IExecutor';

export class AdvancedFlowExecutor implements IFlowExecutor {
  constructor(private nodeExecutor: INodeExecutor) {}

  async executeSubflow(node: Node): Promise<ExecutionResult> {
    // Uses nodeExecutor interface
  }

  async executeFlow(nodes: Node[]): Promise<ExecutionResult[]> {
    return Promise.all(
      nodes.map(node => this.nodeExecutor.execute(node))
    );
  }
}

// components/execution/index.ts (factory)
export function createExecutionContext() {
  // Break cycle with lazy initialization
  let nodeExecutor: INodeExecutor;
  let flowExecutor: IFlowExecutor;

  flowExecutor = new AdvancedFlowExecutor({
    execute: (node) => nodeExecutor.execute(node)
  } as INodeExecutor);

  nodeExecutor = new NodeExecutor(flowExecutor);

  return { nodeExecutor, flowExecutor };
}
```

### 2.2 Agentic Patterns Registry

**Avant** (9 cycles):
```typescript
// agentic/AgenticWorkflowEngine.ts
import { SequentialPattern } from './patterns/SequentialPattern';
import { ParallelPattern } from './patterns/ParallelPattern';
// ... 7 more imports

export class AgenticWorkflowEngine {
  private patterns = [
    new SequentialPattern(this),
    new ParallelPattern(this),
    // ...
  ];
}

// agentic/patterns/SequentialPattern.ts
import { AgenticWorkflowEngine } from '../AgenticWorkflowEngine';

export class SequentialPattern {
  constructor(private engine: AgenticWorkflowEngine) {}
}
```

**Après** (Registry):
```typescript
// agentic/IPattern.ts
export interface IPattern {
  name: string;
  execute(context: PatternContext): Promise<PatternResult>;
}

export interface PatternContext {
  nodes: AgentNode[];
  data: Record<string, any>;
  getEngine(): IAgenticEngine;
}

export interface IAgenticEngine {
  executePattern(patternName: string, context: PatternContext): Promise<PatternResult>;
}

// agentic/PatternRegistry.ts
export class PatternRegistry {
  private patterns = new Map<string, IPattern>();

  register(pattern: IPattern) {
    this.patterns.set(pattern.name, pattern);
  }

  get(name: string): IPattern | undefined {
    return this.patterns.get(name);
  }

  getAll(): IPattern[] {
    return Array.from(this.patterns.values());
  }
}

// agentic/AgenticWorkflowEngine.ts
import { PatternRegistry } from './PatternRegistry';
import { IAgenticEngine, PatternContext } from './IPattern';

export class AgenticWorkflowEngine implements IAgenticEngine {
  constructor(private registry: PatternRegistry) {}

  async executePattern(patternName: string, context: PatternContext): Promise<PatternResult> {
    const pattern = this.registry.get(patternName);
    if (!pattern) {
      throw new Error(`Pattern ${patternName} not found`);
    }

    return pattern.execute({
      ...context,
      getEngine: () => this
    });
  }
}

// agentic/patterns/SequentialPattern.ts
import { IPattern, PatternContext } from '../IPattern';

export class SequentialPattern implements IPattern {
  name = 'sequential';

  async execute(context: PatternContext): Promise<PatternResult> {
    const results = [];
    for (const node of context.nodes) {
      const result = await context.getEngine().executeNode(node);
      results.push(result);
    }
    return { results };
  }
}

// agentic/bootstrap.ts
import { PatternRegistry } from './PatternRegistry';
import { AgenticWorkflowEngine } from './AgenticWorkflowEngine';
import { SequentialPattern } from './patterns/SequentialPattern';
import { ParallelPattern } from './patterns/ParallelPattern';
// ...

export function createAgenticEngine(): AgenticWorkflowEngine {
  const registry = new PatternRegistry();

  // Register all patterns
  registry.register(new SequentialPattern());
  registry.register(new ParallelPattern());
  // ... register others

  return new AgenticWorkflowEngine(registry);
}
```

---

## 3. FACTORY PATTERNS

### 3.1 Node Factory

```typescript
// factories/NodeFactory.ts
import { Node } from '../types/workflow';
import { nodeTypes } from '../data/nodeTypes';

export interface NodeCreationOptions {
  id?: string;
  label?: string;
  position?: { x: number; y: number };
  config?: Record<string, any>;
  metadata?: Record<string, any>;
}

export class NodeFactory {
  private static counter = 0;

  static createNode(type: string, options: NodeCreationOptions = {}): Node {
    const definition = nodeTypes.find(n => n.type === type);
    if (!definition) {
      throw new Error(`Unknown node type: ${type}`);
    }

    const id = options.id || this.generateId(type);

    return {
      id,
      type,
      position: options.position || { x: 0, y: 0 },
      data: {
        label: options.label || definition.label,
        type,
        config: {
          ...definition.defaultConfig,
          ...options.config
        },
        metadata: {
          createdAt: new Date().toISOString(),
          version: '1.0',
          ...options.metadata
        }
      }
    };
  }

  static createTrigger(type: string, options: NodeCreationOptions = {}): Node {
    const node = this.createNode(type, options);

    // Validate it's a trigger type
    const definition = nodeTypes.find(n => n.type === type);
    if (definition?.category !== 'trigger') {
      throw new Error(`${type} is not a trigger node`);
    }

    return {
      ...node,
      data: {
        ...node.data,
        isTrigger: true
      }
    };
  }

  static createFromTemplate(template: NodeTemplate): Node[] {
    return template.nodes.map(nodeSpec => {
      return this.createNode(nodeSpec.type, {
        label: nodeSpec.label,
        position: nodeSpec.position,
        config: nodeSpec.config
      });
    });
  }

  static createConnectedPair(
    sourceType: string,
    targetType: string,
    spacing = 200
  ): { nodes: Node[]; edge: Edge } {
    const source = this.createNode(sourceType, {
      position: { x: 0, y: 0 }
    });

    const target = this.createNode(targetType, {
      position: { x: spacing, y: 0 }
    });

    const edge: Edge = {
      id: `edge_${source.id}_${target.id}`,
      source: source.id,
      target: target.id
    };

    return { nodes: [source, target], edge };
  }

  private static generateId(type: string): string {
    const timestamp = Date.now();
    const counter = ++this.counter;
    const random = Math.random().toString(36).slice(2, 7);
    return `${type}_${timestamp}_${counter}_${random}`;
  }

  static cloneNode(node: Node, offset = { x: 50, y: 50 }): Node {
    return {
      ...node,
      id: this.generateId(node.type),
      position: {
        x: node.position.x + offset.x,
        y: node.position.y + offset.y
      },
      data: {
        ...node.data,
        metadata: {
          ...node.data.metadata,
          clonedFrom: node.id,
          clonedAt: new Date().toISOString()
        }
      }
    };
  }
}

// Usage examples
const httpNode = NodeFactory.createNode('http', {
  label: 'Fetch Users',
  config: {
    url: 'https://api.example.com/users',
    method: 'GET'
  }
});

const webhook = NodeFactory.createTrigger('webhook', {
  label: 'User Created',
  config: {
    path: '/webhooks/user-created'
  }
});

const { nodes, edge } = NodeFactory.createConnectedPair('webhook', 'email');

const duplicateNode = NodeFactory.cloneNode(httpNode);
```

### 3.2 Executor Factory

```typescript
// factories/ExecutorFactory.ts
import { NodeExecutor } from '../types/execution';

export class ExecutorFactory {
  private static executors = new Map<string, NodeExecutor>();
  private static loadedTypes = new Set<string>();

  static async getExecutor(nodeType: string): Promise<NodeExecutor> {
    // Check cache
    if (this.executors.has(nodeType)) {
      return this.executors.get(nodeType)!;
    }

    // Lazy load executor
    const executor = await this.loadExecutor(nodeType);
    this.executors.set(nodeType, executor);
    this.loadedTypes.add(nodeType);

    return executor;
  }

  static register(nodeType: string, executor: NodeExecutor) {
    this.executors.set(nodeType, executor);
  }

  static preload(nodeTypes: string[]) {
    return Promise.all(
      nodeTypes.map(type => this.getExecutor(type))
    );
  }

  private static async loadExecutor(nodeType: string): Promise<NodeExecutor> {
    try {
      // Try specific executor
      const module = await import(`../backend/services/nodeExecutors/${nodeType}Executor`);
      return new module.default();
    } catch (error) {
      // Fallback to generic executor
      const { GenericExecutor } = await import('../backend/services/nodeExecutors/genericExecutor');
      return new GenericExecutor(nodeType);
    }
  }

  static clearCache() {
    this.executors.clear();
    this.loadedTypes.clear();
  }

  static getLoadedTypes(): string[] {
    return Array.from(this.loadedTypes);
  }

  static isLoaded(nodeType: string): boolean {
    return this.loadedTypes.has(nodeType);
  }
}

// Usage
const executor = await ExecutorFactory.getExecutor('http');
const result = await executor.execute(node, context);

// Preload common executors for performance
await ExecutorFactory.preload(['http', 'email', 'slack', 'database']);
```

---

## 4. STRATEGY PATTERN

### 4.1 Storage Strategy

```typescript
// strategies/IStorageStrategy.ts
export interface IStorageStrategy {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

// strategies/LocalStorageStrategy.ts
export class LocalStorageStrategy implements IStorageStrategy {
  async getItem(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('LocalStorage getItem error:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        // Try to free space
        await this.cleanup();
        // Retry
        localStorage.setItem(key, value);
      } else {
        throw error;
      }
    }
  }

  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key);
  }

  async clear(): Promise<void> {
    localStorage.clear();
  }

  async keys(): Promise<string[]> {
    return Object.keys(localStorage);
  }

  private async cleanup() {
    // Remove old execution data
    const keys = await this.keys();
    const execKeys = keys.filter(k => k.startsWith('exec_'));
    execKeys.sort(); // Oldest first

    // Remove oldest 20%
    const toRemove = execKeys.slice(0, Math.floor(execKeys.length * 0.2));
    for (const key of toRemove) {
      await this.removeItem(key);
    }
  }
}

// strategies/IndexedDBStrategy.ts
export class IndexedDBStrategy implements IStorageStrategy {
  private dbName = 'WorkflowStorage';
  private storeName = 'keyvalue';
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = this.openDB();
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  async getItem(key: string): Promise<string | null> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async setItem(key: string, value: string): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(value, key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async removeItem(key: string): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async keys(): Promise<string[]> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAllKeys();

      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () => reject(request.error);
    });
  }
}

// strategies/StorageFactory.ts
export class StorageFactory {
  static create(preferredType?: 'localStorage' | 'indexedDB'): IStorageStrategy {
    // Auto-select based on environment and size needs
    if (preferredType === 'indexedDB' || this.shouldUseIndexedDB()) {
      return new IndexedDBStrategy();
    }

    return new LocalStorageStrategy();
  }

  private static shouldUseIndexedDB(): boolean {
    // Check if data is too large for localStorage
    try {
      const test = localStorage.getItem('workflow-storage-v4');
      if (test && test.length > 2 * 1024 * 1024) { // 2MB threshold
        return true;
      }
    } catch {
      return true; // Quota exceeded
    }

    // Check IndexedDB support
    return 'indexedDB' in window;
  }
}

// Usage in store
const storage = StorageFactory.create();
const persistConfig = {
  name: 'workflow-storage-v4',
  storage: {
    getItem: (name) => storage.getItem(name),
    setItem: (name, value) => storage.setItem(name, value),
    removeItem: (name) => storage.removeItem(name)
  }
};
```

---

## 5. API RESPONSE STANDARDIZATION

```typescript
// utils/apiResponse.ts
export class ApiResponse<T = any> {
  constructor(
    public success: boolean,
    public data?: T,
    public error?: ApiError,
    public meta?: ResponseMeta
  ) {}

  static success<T>(data: T, meta?: Partial<ResponseMeta>): ApiResponse<T> {
    return new ApiResponse(
      true,
      data,
      undefined,
      {
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId(),
        ...meta
      }
    );
  }

  static error(
    error: string | ApiError,
    statusCode = 500
  ): ApiResponse<never> {
    const apiError = typeof error === 'string'
      ? { code: `ERR_${statusCode}`, message: error }
      : error;

    return new ApiResponse(
      false,
      undefined,
      apiError,
      {
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId()
      }
    );
  }

  static paginated<T>(
    items: T[],
    pagination: PaginationInfo
  ): ApiResponse<T[]> {
    return new ApiResponse(
      true,
      items,
      undefined,
      {
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId(),
        pagination: {
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          totalPages: Math.ceil(pagination.total / pagination.pageSize)
        }
      }
    );
  }

  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}

// Middleware for Express
export function responseFormatter(req: Request, res: Response, next: NextFunction) {
  // Add helper methods to response object
  res.apiSuccess = function<T>(data: T, meta?: Partial<ResponseMeta>) {
    return this.json(ApiResponse.success(data, meta));
  };

  res.apiError = function(error: string | ApiError, statusCode = 500) {
    return this.status(statusCode).json(ApiResponse.error(error, statusCode));
  };

  res.apiPaginated = function<T>(items: T[], pagination: PaginationInfo) {
    return this.json(ApiResponse.paginated(items, pagination));
  };

  next();
}

// Usage in routes
router.get('/workflows', async (req, res) => {
  const workflows = await workflowService.findAll();
  return res.apiSuccess(workflows);
});

router.get('/workflows/:id', async (req, res) => {
  try {
    const workflow = await workflowService.findById(req.params.id);
    return res.apiSuccess(workflow);
  } catch (error) {
    return res.apiError({
      code: 'WORKFLOW_NOT_FOUND',
      message: 'Workflow not found',
      details: { id: req.params.id }
    }, 404);
  }
});

router.get('/workflows/paginated', async (req, res) => {
  const { page = 1, pageSize = 20 } = req.query;
  const { items, total } = await workflowService.findPaginated(
    Number(page),
    Number(pageSize)
  );

  return res.apiPaginated(items, {
    page: Number(page),
    pageSize: Number(pageSize),
    total
  });
});
```

---

## 6. MIGRATION SCRIPT EXAMPLE

```typescript
// scripts/migrateStore.ts
import { useWorkflowStore as useOldStore } from '../store/workflowStore';
import { useWorkflowStore as useNewStore } from '../store/index';

export async function migrateStoreData() {
  console.log('Starting store migration...');

  // 1. Get old store data
  const oldData = localStorage.getItem('workflow-storage-v3');
  if (!oldData) {
    console.log('No old data to migrate');
    return;
  }

  const parsed = JSON.parse(oldData);
  console.log('Old data loaded:', Object.keys(parsed.state || {}).length, 'keys');

  // 2. Map to new structure
  const newData = {
    nodes: parsed.state?.nodes || [],
    edges: parsed.state?.edges || [],
    credentials: parsed.state?.credentials || {},
    collaborators: parsed.state?.collaborators || [],
    // ... map other fields
  };

  // 3. Save to new store
  localStorage.setItem('workflow-storage-v4', JSON.stringify({ state: newData }));
  console.log('New data saved');

  // 4. Backup old data
  localStorage.setItem('workflow-storage-v3-backup', oldData);
  console.log('Old data backed up');

  // 5. Remove old store (optional, after verification)
  // localStorage.removeItem('workflow-storage-v3');

  console.log('Migration complete!');
}

// Run on app startup
if (import.meta.env.DEV) {
  migrateStoreData().catch(console.error);
}
```

---

Ces exemples fournissent du code prêt à l'emploi pour implémenter les refactorings recommandés dans le document principal. Chaque section peut être adaptée selon les besoins spécifiques du projet.
