/**
 * Framework Registry
 * Manages registration and retrieval of compliance frameworks
 */

import { EventEmitter } from 'events'
import {
  ComplianceFramework,
  ControlDefinition,
  ControlHierarchy,
  CustomFramework
} from './types'

/**
 * FrameworkRegistry handles the storage and retrieval of compliance frameworks
 */
export class FrameworkRegistry extends EventEmitter {
  private frameworks: Map<string, ComplianceFramework> = new Map()
  private customFrameworks: Map<string, CustomFramework> = new Map()

  /**
   * Register a framework
   */
  registerFramework(framework: ComplianceFramework): void {
    this.frameworks.set(framework.id, framework)
    this.emit('framework-registered', { frameworkId: framework.id })
  }

  /**
   * Get a framework by ID
   */
  getFramework(frameworkId: string): ComplianceFramework | undefined {
    return this.frameworks.get(frameworkId)
  }

  /**
   * Get all frameworks
   */
  getAllFrameworks(): ComplianceFramework[] {
    return Array.from(this.frameworks.values())
  }

  /**
   * Get non-deprecated frameworks
   */
  getActiveFrameworks(): ComplianceFramework[] {
    return Array.from(this.frameworks.values()).filter(f => !f.deprecated)
  }

  /**
   * Register a custom framework
   */
  registerCustomFramework(framework: CustomFramework): void {
    this.customFrameworks.set(framework.id, framework)
    this.emit('custom-framework-registered', { frameworkId: framework.id })
  }

  /**
   * Get a custom framework by ID
   */
  getCustomFramework(frameworkId: string): CustomFramework | undefined {
    return this.customFrameworks.get(frameworkId)
  }

  /**
   * Get all custom frameworks
   */
  getAllCustomFrameworks(): CustomFramework[] {
    return Array.from(this.customFrameworks.values())
  }

  /**
   * Check if framework exists
   */
  hasFramework(frameworkId: string): boolean {
    return this.frameworks.has(frameworkId) || this.customFrameworks.has(frameworkId)
  }

  /**
   * Remove a framework
   */
  removeFramework(frameworkId: string): boolean {
    const deleted = this.frameworks.delete(frameworkId)
    if (deleted) {
      this.emit('framework-removed', { frameworkId })
    }
    return deleted
  }

  /**
   * Build a simple control hierarchy
   */
  buildControlHierarchy(controls: ControlDefinition[], rootCount: number = 5): ControlHierarchy {
    return {
      rootControls: controls.slice(0, rootCount).map(c => c.id),
      childMap: new Map(),
      parentMap: new Map()
    }
  }

  /**
   * Get control category based on index
   */
  getCategoryByIndex(index: number, categories: string[]): string {
    return categories[index % categories.length]
  }

  /**
   * Get random control type
   */
  getRandomControlType(): 'preventive' | 'detective' | 'corrective' | 'directive' {
    const types: Array<'preventive' | 'detective' | 'corrective' | 'directive'> = [
      'preventive', 'detective', 'corrective', 'directive'
    ]
    return types[Math.floor(Math.random() * types.length)]
  }
}

export default FrameworkRegistry
