/**
 * Behavior Analytics Module
 *
 * Barrel export for all behavior analytics components.
 */

// Types
export type {
  UserBaseline,
  EntityBaseline,
  ActivityEvent,
  BehavioralAnomaly,
  UserRiskProfile,
  PeerGroup,
  BehaviorAlert,
  AnomalyThresholds
} from './types'

// Components
export { PatternAnalyzer } from './PatternAnalyzer'
export { BaselineBuilder } from './BaselineBuilder'
export { DeviationDetector } from './DeviationDetector'
export { RiskScorer } from './RiskScorer'
