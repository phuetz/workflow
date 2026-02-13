/**
 * IncidentReconstructor - Attack Timeline and Kill Chain Reconstruction
 *
 * Enterprise incident forensics with MITRE ATT&CK mapping, lateral movement
 * tracking, root cause analysis, and impact assessment for workflow platform.
 *
 * This file serves as a facade - all implementation has been split into:
 * - reconstructor/types.ts - Type definitions and MITRE database
 * - reconstructor/TimelineBuilder.ts - Timeline reconstruction and correlation
 * - reconstructor/EvidenceAnalyzer.ts - Lateral movement and kill chain mapping
 * - reconstructor/ReportGenerator.ts - RCA, impact assessment, attack graphs
 * - reconstructor/index.ts - Barrel export and main facade
 */

// Re-export everything from the reconstructor module
export * from './reconstructor';
