/**
 * Regulatory Module - Barrel Export
 * Re-exports all regulatory compliance components
 */

// Types
export * from './types'

// Core modules
export { FrameworkRegistry, default as frameworkRegistry } from './FrameworkRegistry'
export { ComplianceChecker, default as complianceChecker } from './ComplianceChecker'
export { ReportGenerator, default as reportGenerator } from './ReportGenerator'
export { AuditTrail, default as auditTrail } from './AuditTrail'
