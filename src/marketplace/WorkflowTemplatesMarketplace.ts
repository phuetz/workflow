/**
 * Workflow Templates Marketplace System
 * Community-driven marketplace for sharing and discovering workflow templates
 *
 * This file is a facade that re-exports from the modular templates/ directory.
 * For implementation details, see:
 * - ./templates/types.ts - Type definitions
 * - ./templates/TemplateRegistry.ts - Storage and search
 * - ./templates/TemplateValidator.ts - Validation and filtering
 * - ./templates/TemplateVersioning.ts - Versioning and payments
 * - ./templates/TemplateCatalog.ts - Analytics and recommendations
 * - ./templates/index.ts - Main class and barrel exports
 */

// Re-export everything from the modular implementation
export * from './templates';

// Re-export the singleton instance for backward compatibility
export { workflowMarketplace } from './templates';
