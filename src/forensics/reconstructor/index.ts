/**
 * IncidentReconstructor - Barrel Export and Facade
 * Re-exports all types and provides the main IncidentReconstructor class
 */

import { EventEmitter } from 'events';

// Re-export all types
export * from './types';

// Re-export modules
export { TimelineBuilder } from './TimelineBuilder';
export { EvidenceAnalyzer } from './EvidenceAnalyzer';
export { ReportGenerator } from './ReportGenerator';
export { RootCauseAnalyzer } from './RootCauseAnalyzer';
export { ImpactAnalyzer } from './ImpactAnalyzer';

// Import modules for facade
import { TimelineBuilder } from './TimelineBuilder';
import { EvidenceAnalyzer } from './EvidenceAnalyzer';
import { ReportGenerator } from './ReportGenerator';
import {
  IncidentReconstructorConfig,
  SecurityEvent,
  TimelineEvent,
  LateralMovement,
  Asset,
  KillChainMapping,
  RootCauseAnalysis,
  ImpactAssessment,
  AttackGraph,
  MitreTechnique,
  MITRE_TECHNIQUES
} from './types';

/**
 * IncidentReconstructor - Main Facade Class
 * Provides a unified API for incident reconstruction capabilities
 */
export class IncidentReconstructor extends EventEmitter {
  private static instance: IncidentReconstructor | null = null;
  private config: IncidentReconstructorConfig;
  private timelineBuilder: TimelineBuilder;
  private evidenceAnalyzer: EvidenceAnalyzer;
  private reportGenerator: ReportGenerator;
  private securityEvents: Map<string, SecurityEvent> = new Map();
  private timelineEvents: Map<string, TimelineEvent> = new Map();
  private lateralMovements: Map<string, LateralMovement> = new Map();
  private killChainMappings: Map<string, KillChainMapping> = new Map();
  private rootCauseAnalyses: Map<string, RootCauseAnalysis> = new Map();
  private impactAssessments: Map<string, ImpactAssessment> = new Map();
  private attackGraphs: Map<string, AttackGraph> = new Map();
  private initialized = false;

  private constructor(config?: Partial<IncidentReconstructorConfig>) {
    super();
    this.config = {
      enableAutomaticCorrelation: true,
      correlationTimeWindowMs: 300000,
      killChainMappingVersion: '14.1',
      maxTimelineEvents: 10000,
      maxGraphNodes: 500,
      enableThreatIntelEnrichment: true,
      threatIntelSources: ['mitre', 'virustotal', 'otx'],
      confidenceThreshold: 0.6,
      ...config
    };
    this.timelineBuilder = new TimelineBuilder(this.config);
    this.evidenceAnalyzer = new EvidenceAnalyzer(this.config);
    this.reportGenerator = new ReportGenerator(this.config);
  }

  public static getInstance(config?: Partial<IncidentReconstructorConfig>): IncidentReconstructor {
    if (!IncidentReconstructor.instance) {
      IncidentReconstructor.instance = new IncidentReconstructor(config);
    }
    return IncidentReconstructor.instance;
  }

  public static resetInstance(): void {
    if (IncidentReconstructor.instance) {
      IncidentReconstructor.instance.removeAllListeners();
      IncidentReconstructor.instance = null;
    }
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;
    this.emit('initializing', { timestamp: new Date() });
    this.initialized = true;
    this.emit('initialized', { timestamp: new Date(), config: this.config });
  }

  // ==========================================================================
  // Timeline Reconstruction
  // ==========================================================================

  public async reconstructTimeline(
    incidentId: string,
    events: SecurityEvent[],
    options?: {
      startTime?: Date;
      endTime?: Date;
      correlate?: boolean;
      enrichTechniques?: boolean;
    }
  ): Promise<TimelineEvent[]> {
    this.emit('timeline:reconstruction:started', { incidentId, eventCount: events.length });

    // Store events
    events.forEach(e => this.securityEvents.set(e.id, e));

    // Build timeline
    const timeline = this.timelineBuilder.reconstructTimeline(incidentId, events, options);

    // Store timeline events
    timeline.forEach(te => this.timelineEvents.set(te.id, te));

    this.emit('timeline:reconstruction:completed', {
      incidentId,
      eventCount: timeline.length,
      timespan: timeline.length > 0
        ? timeline[timeline.length - 1].timestamp.getTime() - timeline[0].timestamp.getTime()
        : 0
    });

    return timeline;
  }

  // ==========================================================================
  // Lateral Movement Tracking
  // ==========================================================================

  public async trackLateralMovement(
    incidentId: string,
    events: SecurityEvent[],
    options?: { detectMethods?: boolean; mapCredentials?: boolean }
  ): Promise<LateralMovement[]> {
    this.emit('lateral:tracking:started', { incidentId, eventCount: events.length });

    const movements = this.evidenceAnalyzer.trackLateralMovement(incidentId, events, options);

    // Store movements
    movements.forEach(m => this.lateralMovements.set(m.id, m));

    this.emit('lateral:tracking:completed', {
      incidentId,
      movementCount: movements.length,
      assetsCompromised: new Set(movements.map(m => m.destinationAsset.id)).size
    });

    return movements;
  }

  // ==========================================================================
  // Kill Chain Mapping
  // ==========================================================================

  public async mapToKillChain(
    incidentId: string,
    timelineEvents: TimelineEvent[],
    options?: { detectGaps?: boolean; attributeActor?: boolean }
  ): Promise<KillChainMapping> {
    this.emit('killchain:mapping:started', { incidentId, eventCount: timelineEvents.length });

    const mapping = this.evidenceAnalyzer.mapToKillChain(incidentId, timelineEvents, options);

    this.killChainMappings.set(incidentId, mapping);

    this.emit('killchain:mapping:completed', {
      incidentId,
      completeness: mapping.completeness,
      phasesDetected: mapping.phases.filter(p => p.detected).length,
      dwellTimeHours: Math.round((mapping.dwellTime || 0) / 3600000)
    });

    return mapping;
  }

  // ==========================================================================
  // Root Cause Analysis
  // ==========================================================================

  public async performRootCauseAnalysis(
    incidentId: string,
    timelineEvents: TimelineEvent[],
    assets: Asset[],
    options?: { depth?: number; includeRecommendations?: boolean }
  ): Promise<RootCauseAnalysis> {
    this.emit('rca:started', { incidentId, eventCount: timelineEvents.length });

    // Sync assets with evidence analyzer
    assets.forEach(a => this.evidenceAnalyzer.getAssets().set(a.id, a));
    this.reportGenerator.setAssets(this.evidenceAnalyzer.getAssets());

    const analysis = this.reportGenerator.performRootCauseAnalysis(incidentId, timelineEvents, assets, options);

    this.rootCauseAnalyses.set(incidentId, analysis);

    this.emit('rca:completed', {
      incidentId,
      causeCategory: analysis.primaryCause.category,
      recommendationCount: analysis.recommendations.length
    });

    return analysis;
  }

  // ==========================================================================
  // Impact Assessment
  // ==========================================================================

  public async assessImpact(
    incidentId: string,
    timelineEvents: TimelineEvent[],
    lateralMovements: LateralMovement[],
    options?: { includeFinancial?: boolean; includeRegulatory?: boolean }
  ): Promise<ImpactAssessment> {
    this.emit('impact:assessment:started', { incidentId });

    this.reportGenerator.setAssets(this.evidenceAnalyzer.getAssets());
    const assessment = this.reportGenerator.assessImpact(incidentId, timelineEvents, lateralMovements, options);

    this.impactAssessments.set(incidentId, assessment);

    this.emit('impact:assessment:completed', {
      incidentId,
      overallImpact: assessment.overallImpact,
      systemsCompromised: assessment.technicalImpact.systemsCompromised
    });

    return assessment;
  }

  // ==========================================================================
  // Attack Graph Generation
  // ==========================================================================

  public async generateAttackGraph(
    incidentId: string,
    timeline: TimelineEvent[],
    movements: LateralMovement[],
    options?: { includeCriticalPaths?: boolean; maxNodes?: number }
  ): Promise<AttackGraph> {
    this.emit('graph:generation:started', { incidentId });

    this.reportGenerator.setAssets(this.evidenceAnalyzer.getAssets());
    const graph = this.reportGenerator.generateAttackGraph(incidentId, timeline, movements, options);

    this.attackGraphs.set(incidentId, graph);

    this.emit('graph:generation:completed', {
      incidentId,
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      criticalPathCount: graph.criticalPaths.length
    });

    return graph;
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  public getTimeline(incidentId: string): TimelineEvent[] {
    return Array.from(this.timelineEvents.values()).filter(e =>
      e.sourceEvents.some(se => this.securityEvents.get(se))
    );
  }

  public getLateralMovements(incidentId: string): LateralMovement[] {
    return Array.from(this.lateralMovements.values());
  }

  public getKillChainMapping(incidentId: string): KillChainMapping | undefined {
    return this.killChainMappings.get(incidentId);
  }

  public getRootCauseAnalysis(incidentId: string): RootCauseAnalysis | undefined {
    return this.rootCauseAnalyses.get(incidentId);
  }

  public getImpactAssessment(incidentId: string): ImpactAssessment | undefined {
    return this.impactAssessments.get(incidentId);
  }

  public getAttackGraph(incidentId: string): AttackGraph | undefined {
    return this.attackGraphs.get(incidentId);
  }

  public getMitreTechnique(id: string): MitreTechnique | undefined {
    return MITRE_TECHNIQUES.get(id);
  }

  public getAllMitreTechniques(): MitreTechnique[] {
    return Array.from(MITRE_TECHNIQUES.values());
  }

  public getConfig(): IncidentReconstructorConfig {
    return { ...this.config };
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public clearData(): void {
    this.securityEvents.clear();
    this.timelineEvents.clear();
    this.lateralMovements.clear();
    this.killChainMappings.clear();
    this.rootCauseAnalyses.clear();
    this.impactAssessments.clear();
    this.attackGraphs.clear();
    this.emit('data:cleared', { timestamp: new Date() });
  }
}

export const getIncidentReconstructor = IncidentReconstructor.getInstance;
export default IncidentReconstructor;
