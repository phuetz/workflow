/**
 * Incident Responder Module
 * Barrel export for all incident response components
 */

// Export types
export * from './types'

// Export classes
export { ResponseCoordinator } from './ResponseCoordinator'
export { EscalationManager } from './EscalationManager'
export { ActionExecutor } from './ActionExecutor'

// Export default configuration
export { getDefaultDetectionRules, getDefaultPlaybooks, getAutomaticResponseActions } from './DefaultConfig'
