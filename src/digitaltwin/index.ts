/**
 * Digital Twin & Simulation System
 *
 * Complete digital twin system for workflow quality assurance,
 * simulation, fault injection, and pre-production testing.
 */

// Core Systems
export { WorkflowDigitalTwin, getDigitalTwinManager } from './WorkflowDigitalTwin';
export { FaultInjectionEngine, getFaultInjectionEngine } from './FaultInjectionEngine';
export { SimulationEngine, getSimulationEngine } from './SimulationEngine';
export { VirtualCommissioning, getVirtualCommissioning } from './VirtualCommissioning';
export { RegressionTesting, getRegressionTesting } from './RegressionTesting';
export { ScenarioManager, getScenarioManager } from './ScenarioManager';
export { TwinComparison, getTwinComparison } from './TwinComparison';

// Types
export type {
  // Core types
  VirtualWorkflow,
  SimulationConfig,
  SimulationResult,
  SimulationMode,
  SimulationMetrics,

  // Fault injection
  FaultScenario,
  FaultType,
  FaultTiming,
  FaultInjectionResult,

  // Commissioning
  CommissioningReport,
  CommissioningCheck,
  CommissioningIssue,
  CheckStatus,

  // Regression testing
  RegressionTest,
  TestResult,
  TestSuite,
  TestExecutionSummary,
  TestCoverage,
  Assertion,
  AssertionResult,

  // Scenarios
  TestScenario,
  ScenarioType,
  ScenarioParameters,
  ScenarioResult,
  ScenarioMetrics,
  ScenarioInsight,

  // Comparison
  ComparisonResult,
  ExecutionDifference,
  ComparisonMetrics,

  // Statistics
  TwinStatistics,
  DigitalTwinConfig,
  TwinSyncEvent,
} from './types/digitaltwin';

// UI Components
export { default as DigitalTwinViewer } from '../components/devices/DigitalTwinViewer';
export { default as FaultInjectionPanel } from '../components/testing/FaultInjectionPanel';
