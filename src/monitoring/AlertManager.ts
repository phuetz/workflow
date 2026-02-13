/**
 * Comprehensive Alert Manager
 * Multi-channel alerting system with escalation policies, deduplication, and intelligent routing
 * Week 8 Phase 2: Security Monitoring & Alerting
 *
 * This file serves as a facade - all implementation has been split into:
 * - alerts/types.ts - Type definitions and alert templates
 * - alerts/AlertProcessor.ts - Alert creation, management, and statistics
 * - alerts/AlertRouter.ts - Routing rules and escalation management
 * - alerts/AlertNotifier.ts - Multi-channel notification delivery
 * - alerts/index.ts - Barrel export and main facade
 */

// Re-export everything from the alerts module
export * from './alerts';
