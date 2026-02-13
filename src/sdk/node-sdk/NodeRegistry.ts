/**
 * Node Registry
 * Manages registration and retrieval of custom nodes
 */

import { EventEmitter } from 'events';
import {
  INodeType,
  NodePackage,
  NodeTestSuite,
  CustomNodeDefinition
} from './types';
import { NodeBuilder } from './NodeBuilder';
import { NodeValidator } from './NodeValidator';

/**
 * NodeRegistry manages the collection of registered nodes
 */
export class NodeRegistry extends EventEmitter {
  private nodes: Map<string, INodeType> = new Map();
  private packages: Map<string, NodePackage> = new Map();
  private testSuites: Map<string, NodeTestSuite> = new Map();
  private validators: Map<string, NodeValidator> = new Map();
  private builders: Map<string, NodeBuilder> = new Map();

  /**
   * Register a node
   */
  registerNode(name: string, node: INodeType, builder?: NodeBuilder): void {
    this.nodes.set(name, node);
    if (builder) {
      this.builders.set(name, builder);
    }
    this.emit('nodeRegistered', { name });
  }

  /**
   * Get a node by name
   */
  getNode(nodeName: string): INodeType | undefined {
    return this.nodes.get(nodeName);
  }

  /**
   * Get all node names
   */
  listNodes(): string[] {
    return Array.from(this.nodes.keys());
  }

  /**
   * Get all nodes
   */
  getAllNodes(): Map<string, INodeType> {
    return this.nodes;
  }

  /**
   * Check if a node exists
   */
  hasNode(nodeName: string): boolean {
    return this.nodes.has(nodeName);
  }

  /**
   * Remove a node
   */
  removeNode(nodeName: string): boolean {
    const deleted = this.nodes.delete(nodeName);
    this.builders.delete(nodeName);
    this.validators.delete(nodeName);
    if (deleted) {
      this.emit('nodeRemoved', { name: nodeName });
    }
    return deleted;
  }

  /**
   * Get the builder for a node
   */
  getBuilder(nodeName: string): NodeBuilder | undefined {
    return this.builders.get(nodeName);
  }

  /**
   * Set the builder for a node
   */
  setBuilder(nodeName: string, builder: NodeBuilder): void {
    this.builders.set(nodeName, builder);
  }

  /**
   * Get the validator for a node
   */
  getValidator(nodeName: string): NodeValidator | undefined {
    return this.validators.get(nodeName);
  }

  /**
   * Set the validator for a node
   */
  setValidator(nodeName: string, validator: NodeValidator): void {
    this.validators.set(nodeName, validator);
  }

  /**
   * Register a package
   */
  registerPackage(name: string, pkg: NodePackage): void {
    this.packages.set(name, pkg);
    this.emit('packageRegistered', { name });
  }

  /**
   * Get a package by name
   */
  getPackage(name: string): NodePackage | undefined {
    return this.packages.get(name);
  }

  /**
   * Register a test suite
   */
  registerTestSuite(suite: NodeTestSuite): void {
    this.testSuites.set(suite.name, suite);
    this.emit('testSuiteRegistered', { name: suite.name });
  }

  /**
   * Get test suites for a node
   */
  getTestSuites(nodeName: string): NodeTestSuite[] {
    return Array.from(this.testSuites.values()).filter(s => s.node === nodeName);
  }

  /**
   * Get a specific test suite
   */
  getTestSuite(suiteName: string): NodeTestSuite | undefined {
    return this.testSuites.get(suiteName);
  }

  /**
   * Export a node definition as JSON
   */
  exportNode(nodeName: string): string {
    const node = this.nodes.get(nodeName);
    if (!node) {
      throw new Error(`Node ${nodeName} not found`);
    }
    return JSON.stringify(node.description, null, 2);
  }

  /**
   * Import a node from JSON definition
   */
  importNode(definition: string | CustomNodeDefinition): INodeType {
    const parsed = typeof definition === 'string'
      ? JSON.parse(definition) as CustomNodeDefinition
      : definition;

    const builder = new NodeBuilder(parsed);
    const node = builder.build();

    // Validate node
    const validator = new NodeValidator();
    const validation = validator.validate(node);

    if (!validation.valid) {
      throw new Error(`Node validation failed: ${validation.errors.join(', ')}`);
    }

    this.registerNode(parsed.name, node, builder);
    this.setValidator(parsed.name, validator);

    return node;
  }

  /**
   * Clear all registered nodes
   */
  clear(): void {
    this.nodes.clear();
    this.packages.clear();
    this.testSuites.clear();
    this.validators.clear();
    this.builders.clear();
    this.emit('cleared');
  }
}

export default NodeRegistry;
