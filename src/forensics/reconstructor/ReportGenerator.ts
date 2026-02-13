/**
 * ReportGenerator - Facade for Root Cause Analysis and Impact Assessment
 * Delegates to RootCauseAnalyzer and ImpactAnalyzer for implementation
 */

import {
  TimelineEvent,
  LateralMovement,
  Asset,
  RootCauseAnalysis,
  ImpactAssessment,
  AttackGraph,
  IncidentReconstructorConfig
} from './types';
import { RootCauseAnalyzer } from './RootCauseAnalyzer';
import { ImpactAnalyzer } from './ImpactAnalyzer';

export class ReportGenerator {
  private rootCauseAnalyzer: RootCauseAnalyzer;
  private impactAnalyzer: ImpactAnalyzer;

  constructor(config: IncidentReconstructorConfig) {
    this.rootCauseAnalyzer = new RootCauseAnalyzer();
    this.impactAnalyzer = new ImpactAnalyzer(config);
  }

  setAssets(assets: Map<string, Asset>): void {
    this.rootCauseAnalyzer.setAssets(assets);
    this.impactAnalyzer.setAssets(assets);
  }

  /**
   * Perform root cause analysis
   */
  performRootCauseAnalysis(
    incidentId: string,
    timelineEvents: TimelineEvent[],
    assets: Asset[],
    options?: { depth?: number; includeRecommendations?: boolean }
  ): RootCauseAnalysis {
    return this.rootCauseAnalyzer.performRootCauseAnalysis(incidentId, timelineEvents, assets, options);
  }

  /**
   * Assess impact of incident
   */
  assessImpact(
    incidentId: string,
    timelineEvents: TimelineEvent[],
    lateralMovements: LateralMovement[],
    options?: { includeFinancial?: boolean; includeRegulatory?: boolean }
  ): ImpactAssessment {
    return this.impactAnalyzer.assessImpact(incidentId, timelineEvents, lateralMovements, options);
  }

  /**
   * Generate attack graph
   */
  generateAttackGraph(
    incidentId: string,
    timeline: TimelineEvent[],
    movements: LateralMovement[],
    options?: { includeCriticalPaths?: boolean; maxNodes?: number }
  ): AttackGraph {
    return this.impactAnalyzer.generateAttackGraph(incidentId, timeline, movements, options);
  }
}
