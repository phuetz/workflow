/**
 * ImpactAnalyzer - Impact Assessment and Attack Graph Generation
 * Handles impact assessment, attack graph creation, and risk scoring
 */

import {
  TimelineEvent,
  LateralMovement,
  Asset,
  ImpactAssessment,
  ImpactType,
  BusinessImpact,
  TechnicalImpact,
  RegulatoryImpact,
  ReputationalImpact,
  FinancialImpact,
  RecoveryAssessment,
  AttackGraph,
  AttackGraphNode,
  AttackGraphEdge,
  SeverityLevel,
  IncidentReconstructorConfig,
  MITRE_TECHNIQUES,
  generateId
} from './types';

export class ImpactAnalyzer {
  private config: IncidentReconstructorConfig;
  private assets: Map<string, Asset> = new Map();

  constructor(config: IncidentReconstructorConfig) {
    this.config = config;
  }

  setAssets(assets: Map<string, Asset>): void {
    this.assets = assets;
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
    const opts = { includeFinancial: true, includeRegulatory: true, ...options };

    const compromisedAssets = this.getCompromisedAssets(timelineEvents, lateralMovements);
    const impactTypes = this.determineImpactTypes(timelineEvents);
    const overallImpact = this.calculateOverallImpact(compromisedAssets, impactTypes);

    return {
      incidentId,
      assessmentTimestamp: new Date(),
      overallImpact,
      impactTypes,
      businessImpact: this.assessBusinessImpact(compromisedAssets, timelineEvents),
      technicalImpact: this.assessTechnicalImpact(compromisedAssets, lateralMovements),
      regulatoryImpact: opts.includeRegulatory
        ? this.assessRegulatoryImpact(compromisedAssets, impactTypes)
        : { applicableRegulations: [], notificationRequired: false, potentialFines: 0, complianceViolations: [], reportingObligations: [] },
      reputationalImpact: this.assessReputationalImpact(impactTypes),
      financialImpact: opts.includeFinancial
        ? this.assessFinancialImpact(compromisedAssets, impactTypes)
        : { directCosts: 0, indirectCosts: 0, recoveryEstimate: 0, legalCosts: 0, regulatoryFines: 0, insuranceCoverage: 0, totalEstimatedLoss: 0 },
      recoveryAssessment: this.assessRecovery(compromisedAssets, impactTypes)
    };
  }

  private getCompromisedAssets(events: TimelineEvent[], movements: LateralMovement[]): Asset[] {
    const assetIds = new Set<string>();
    events.forEach(e => e.assets.forEach(a => assetIds.add(a)));
    movements.forEach(m => {
      assetIds.add(m.sourceAsset.id);
      assetIds.add(m.destinationAsset.id);
    });

    return Array.from(assetIds)
      .map(id => this.assets.get(id))
      .filter((a): a is Asset => a !== undefined && a.compromisedAt !== undefined);
  }

  private determineImpactTypes(events: TimelineEvent[]): ImpactType[] {
    const types: ImpactType[] = [];
    const hasExfil = events.some(e => e.phase === 'exfiltration');
    const hasRansomware = events.some(e => e.techniques.some(t => t.id === 'T1486'));
    const hasCredAccess = events.some(e => e.phase === 'credential_access');
    const hasC2 = events.some(e => e.phase === 'command_and_control');

    if (hasExfil) types.push('data_breach');
    if (hasRansomware) types.push('ransomware', 'service_disruption');
    if (hasCredAccess) types.push('credential_theft');
    if (hasC2) types.push('backdoor');

    return types.length > 0 ? types : ['service_disruption'];
  }

  private calculateOverallImpact(assets: Asset[], types: ImpactType[]): SeverityLevel {
    if (types.includes('ransomware') || types.includes('data_breach')) return 'critical';
    if (assets.some(a => a.criticality === 'critical')) return 'critical';
    if (assets.length > 10 || types.includes('credential_theft')) return 'high';
    if (assets.length > 3) return 'medium';
    return 'low';
  }

  private assessBusinessImpact(assets: Asset[], events: TimelineEvent[]): BusinessImpact {
    const criticalAssets = assets.filter(a => a.criticality === 'critical');
    return {
      affectedProcesses: criticalAssets.map(a => a.services).flat(),
      operationalDowntime: Math.min(assets.length * 4, 168),
      productivityLoss: assets.length * 8 * 100,
      customerImpact: criticalAssets.length > 0 ? 'Potential service disruption' : 'Minimal',
      partnerImpact: 'Assessment required',
      serviceDisruption: criticalAssets.length > 0
    };
  }

  private assessTechnicalImpact(assets: Asset[], movements: LateralMovement[]): TechnicalImpact {
    const compromisedAccounts = movements.filter(m => m.credentialsUsed).length;
    return {
      systemsCompromised: assets.length,
      accountsCompromised: compromisedAccounts,
      dataRecordsAffected: assets.length * 10000,
      dataVolume: assets.length * 1024 * 1024 * 100,
      integrityImpacted: movements.length > 0,
      availabilityImpacted: assets.some(a => a.criticality === 'critical'),
      confidentialityImpacted: true,
      assetsAffected: assets
    };
  }

  private assessRegulatoryImpact(assets: Asset[], types: ImpactType[]): RegulatoryImpact {
    const regulations: string[] = [];
    const violations: string[] = [];

    if (types.includes('data_breach')) {
      regulations.push('GDPR', 'CCPA', 'HIPAA');
      violations.push('Data protection breach');
    }

    return {
      applicableRegulations: regulations,
      notificationRequired: types.includes('data_breach'),
      notificationDeadline: types.includes('data_breach') ? new Date(Date.now() + 72 * 60 * 60 * 1000) : undefined,
      potentialFines: types.includes('data_breach') ? 10000000 : 0,
      complianceViolations: violations,
      reportingObligations: regulations.map(r => `${r} breach notification`)
    };
  }

  private assessReputationalImpact(types: ImpactType[]): ReputationalImpact {
    const hasDataBreach = types.includes('data_breach');
    return {
      publicExposure: hasDataBreach,
      mediaAttention: hasDataBreach,
      customerNotificationRequired: hasDataBreach,
      estimatedCustomerChurn: hasDataBreach ? 5 : 0,
      brandDamageAssessment: hasDataBreach ? 'Significant' : 'Minimal'
    };
  }

  private assessFinancialImpact(assets: Asset[], types: ImpactType[]): FinancialImpact {
    const directCosts = assets.length * 50000;
    const indirectCosts = types.includes('data_breach') ? 500000 : 100000;
    const legalCosts = types.includes('data_breach') ? 200000 : 50000;
    const regulatoryFines = types.includes('data_breach') ? 1000000 : 0;

    return {
      directCosts,
      indirectCosts,
      recoveryEstimate: assets.length * 10000,
      legalCosts,
      regulatoryFines,
      insuranceCoverage: 500000,
      totalEstimatedLoss: directCosts + indirectCosts + legalCosts + regulatoryFines
    };
  }

  private assessRecovery(assets: Asset[], types: ImpactType[]): RecoveryAssessment {
    const hasRansomware = types.includes('ransomware');
    return {
      recoveryTimeObjective: 4,
      recoveryPointObjective: 1,
      estimatedRecoveryTime: hasRansomware ? 72 : 24,
      recoveryPriorities: ['Restore critical systems', 'Reset credentials', 'Patch vulnerabilities'],
      resourcesRequired: ['IR Team', 'IT Operations', 'Executive Support'],
      recoveryPlan: [
        { order: 1, description: 'Contain threat', owner: 'IR Team', estimatedDuration: 2, dependencies: [], status: 'pending' },
        { order: 2, description: 'Eradicate malware', owner: 'IR Team', estimatedDuration: 4, dependencies: [1], status: 'pending' },
        { order: 3, description: 'Restore from backup', owner: 'IT Ops', estimatedDuration: 8, dependencies: [2], status: 'pending' },
        { order: 4, description: 'Reset all credentials', owner: 'IT Ops', estimatedDuration: 4, dependencies: [2], status: 'pending' }
      ]
    };
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
    const opts = { includeCriticalPaths: true, maxNodes: this.config.maxGraphNodes, ...options };

    const nodes: AttackGraphNode[] = [];
    const edges: AttackGraphEdge[] = [];
    const entryPoints: string[] = [];
    const objectives: string[] = [];

    // Create asset nodes
    const assetIds = new Set<string>();
    timeline.forEach(e => e.assets.forEach(a => assetIds.add(a)));
    movements.forEach(m => {
      assetIds.add(m.sourceAsset.id);
      assetIds.add(m.destinationAsset.id);
    });

    let nodeCount = 0;
    for (const assetId of Array.from(assetIds)) {
      if (nodeCount >= opts.maxNodes) break;
      const asset = this.assets.get(assetId);
      nodes.push({
        id: `asset_${assetId}`,
        type: 'asset',
        label: asset?.hostname || assetId,
        properties: { assetType: asset?.type, criticality: asset?.criticality },
        compromised: !!asset?.compromisedAt,
        compromisedAt: asset?.compromisedAt,
        severity: asset?.criticality || 'medium'
      });
      nodeCount++;
    }

    // Create technique nodes
    const techniqueIds = new Set<string>();
    timeline.forEach(e => e.techniques.forEach(t => techniqueIds.add(t.id)));

    for (const techId of Array.from(techniqueIds)) {
      if (nodeCount >= opts.maxNodes) break;
      const tech = MITRE_TECHNIQUES.get(techId);
      nodes.push({
        id: `tech_${techId}`,
        type: 'technique',
        label: tech?.name || techId,
        properties: { tactic: tech?.tactic, mitreid: techId },
        compromised: true,
        severity: 'high'
      });
      nodeCount++;
    }

    // Create edges from lateral movements
    for (const movement of movements) {
      edges.push({
        id: generateId('EDGE'),
        source: `asset_${movement.sourceAsset.id}`,
        target: `asset_${movement.destinationAsset.id}`,
        type: 'lateral_movement',
        label: movement.method,
        timestamp: movement.timestamp,
        confidence: movement.confidence,
        properties: { method: movement.method }
      });
    }

    // Create edges from timeline to techniques
    for (const event of timeline) {
      for (const asset of event.assets) {
        for (const technique of event.techniques) {
          edges.push({
            id: generateId('EDGE'),
            source: `asset_${asset}`,
            target: `tech_${technique.id}`,
            type: 'technique_used',
            label: technique.name,
            timestamp: event.timestamp,
            confidence: event.confidence,
            properties: {}
          });
        }
      }
    }

    // Identify entry points
    const sortedEvents = [...timeline].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    if (sortedEvents.length > 0 && sortedEvents[0].assets.length > 0) {
      entryPoints.push(`asset_${sortedEvents[0].assets[0]}`);
    }

    // Identify objectives
    const impactEvents = timeline.filter(e => e.phase === 'impact' || e.phase === 'exfiltration');
    impactEvents.forEach(e => e.assets.forEach(a => objectives.push(`asset_${a}`)));

    // Find critical paths
    const criticalPaths: string[][] = [];
    if (opts.includeCriticalPaths && entryPoints.length > 0 && objectives.length > 0) {
      criticalPaths.push(...this.findCriticalPaths(nodes, edges, entryPoints[0], objectives[0]));
    }

    // Calculate risk score
    const riskScore = this.calculateGraphRiskScore(nodes, edges, movements);

    return {
      id: generateId('GRAPH'),
      incidentId,
      generatedAt: new Date(),
      nodes,
      edges,
      entryPoints,
      objectives,
      criticalPaths,
      riskScore
    };
  }

  private findCriticalPaths(
    nodes: AttackGraphNode[],
    edges: AttackGraphEdge[],
    start: string,
    end: string
  ): string[][] {
    const paths: string[][] = [];
    const visited = new Set<string>();
    const adjacency = new Map<string, string[]>();

    for (const edge of edges) {
      const neighbors = adjacency.get(edge.source) || [];
      neighbors.push(edge.target);
      adjacency.set(edge.source, neighbors);
    }

    const dfs = (current: string, path: string[]): void => {
      if (current === end) {
        paths.push([...path]);
        return;
      }
      if (visited.has(current) || path.length > 10) return;

      visited.add(current);
      const neighbors = adjacency.get(current) || [];
      for (const neighbor of neighbors) {
        dfs(neighbor, [...path, neighbor]);
      }
      visited.delete(current);
    };

    dfs(start, [start]);
    return paths.slice(0, 5);
  }

  private calculateGraphRiskScore(
    nodes: AttackGraphNode[],
    edges: AttackGraphEdge[],
    movements: LateralMovement[]
  ): number {
    let score = 0;
    const criticalCompromised = nodes.filter(n => n.compromised && n.severity === 'critical').length;
    score += criticalCompromised * 20;
    score += movements.length * 5;
    score += Math.min(edges.length, 50);
    return Math.min(score, 100);
  }
}
