/**
 * RootCauseAnalyzer - Root Cause Analysis Module
 * Handles RCA, entry point identification, and recommendations
 */

import {
  TimelineEvent,
  Asset,
  AssetType,
  RootCauseAnalysis,
  CauseNode,
  ContributingFactor,
  EntryPoint,
  Vulnerability,
  SecurityGap,
  Recommendation,
  SeverityLevel,
  generateId
} from './types';

export class RootCauseAnalyzer {
  private assets: Map<string, Asset> = new Map();

  setAssets(assets: Map<string, Asset>): void {
    this.assets = assets;
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
    const opts = { depth: 5, includeRecommendations: true, ...options };

    // Store assets
    assets.forEach(a => this.assets.set(a.id, a));

    const entryPoint = this.identifyEntryPoint(timelineEvents, assets);
    const primaryCause = this.buildCauseTree(timelineEvents, entryPoint, opts.depth);
    const contributingFactors = this.identifyContributingFactors(timelineEvents, assets);
    const vulnerabilities = this.findExploitedVulnerabilities(timelineEvents, assets);
    const securityGaps = this.identifySecurityGaps(timelineEvents);
    const recommendations = opts.includeRecommendations
      ? this.generateRecommendations(primaryCause, contributingFactors, securityGaps)
      : [];

    return {
      incidentId,
      analysisTimestamp: new Date(),
      primaryCause,
      contributingFactors,
      entryPoint,
      vulnerabilitiesExploited: vulnerabilities,
      securityGaps,
      recommendations,
      confidenceLevel: this.calculateRCAConfidence(primaryCause, entryPoint)
    };
  }

  /**
   * Identify entry point of attack
   */
  identifyEntryPoint(events: TimelineEvent[], assets: Asset[]): EntryPoint {
    const initialAccessEvents = events.filter(e => e.phase === 'initial_access');
    const firstEvent = initialAccessEvents[0] || events[0];

    const affectedAsset = assets.find(a =>
      firstEvent.assets.includes(a.id) ||
      firstEvent.assets.includes(a.hostname || '') ||
      firstEvent.assets.includes(a.ipAddress || '')
    ) || assets[0] || { id: 'unknown', type: 'workstation' as AssetType, criticality: 'medium' as SeverityLevel, services: [], vulnerabilities: [] };

    const technique = firstEvent.techniques[0];
    let entryType: EntryPoint['type'] = 'misconfiguration';

    if (technique?.id.startsWith('T1566')) entryType = 'phishing';
    else if (technique?.id.startsWith('T1190')) entryType = 'exploit';
    else if (technique?.id === 'T1078') entryType = 'credential_compromise';
    else if (technique?.id.startsWith('T1195')) entryType = 'supply_chain';

    return {
      type: entryType,
      description: `Initial access via ${technique?.name || 'unknown method'}`,
      asset: affectedAsset,
      timestamp: firstEvent.timestamp,
      technique,
      indicators: firstEvent.indicators
    };
  }

  /**
   * Build cause tree for root cause analysis
   */
  buildCauseTree(events: TimelineEvent[], entryPoint: EntryPoint, maxDepth: number): CauseNode {
    const root: CauseNode = {
      id: generateId('CAUSE'),
      description: `Security breach via ${entryPoint.type}`,
      category: this.categorizeRootCause(entryPoint),
      evidence: events.slice(0, 5).map(e => e.id),
      children: [],
      confidence: 0.8
    };

    if (maxDepth > 0) {
      if (entryPoint.type === 'phishing') {
        root.children.push({
          id: generateId('CAUSE'),
          description: 'User clicked malicious link or opened attachment',
          category: 'human',
          evidence: [],
          children: [{
            id: generateId('CAUSE'),
            description: 'Insufficient security awareness training',
            category: 'process',
            evidence: [],
            children: [],
            confidence: 0.7
          }],
          confidence: 0.85
        });
      }

      if (entryPoint.type === 'exploit') {
        root.children.push({
          id: generateId('CAUSE'),
          description: 'Unpatched vulnerability exploited',
          category: 'technical',
          evidence: [],
          children: [{
            id: generateId('CAUSE'),
            description: 'Delayed patch management',
            category: 'process',
            evidence: [],
            children: [],
            confidence: 0.75
          }],
          confidence: 0.9
        });
      }

      root.children.push({
        id: generateId('CAUSE'),
        description: 'Insufficient network segmentation allowed lateral movement',
        category: 'technical',
        evidence: events.filter(e => e.phase === 'lateral_movement').map(e => e.id),
        children: [],
        confidence: 0.65
      });
    }

    return root;
  }

  private categorizeRootCause(entryPoint: EntryPoint): CauseNode['category'] {
    switch (entryPoint.type) {
      case 'phishing': return 'human';
      case 'insider': return 'human';
      case 'exploit': return 'technical';
      case 'misconfiguration': return 'technical';
      case 'supply_chain': return 'external';
      case 'credential_compromise': return 'process';
      default: return 'technical';
    }
  }

  /**
   * Identify contributing factors
   */
  identifyContributingFactors(events: TimelineEvent[], assets: Asset[]): ContributingFactor[] {
    const factors: ContributingFactor[] = [];

    if (events.some(e => e.phase === 'privilege_escalation')) {
      factors.push({
        id: generateId('CF'),
        description: 'Privilege escalation was possible',
        category: 'Access Control',
        impact: 'high',
        remediation: 'Implement least privilege access and PAM'
      });
    }

    if (events.some(e => e.phase === 'credential_access')) {
      factors.push({
        id: generateId('CF'),
        description: 'Credentials were accessible',
        category: 'Credential Management',
        impact: 'high',
        remediation: 'Deploy credential guard and LSASS protection'
      });
    }

    if (events.filter(e => e.phase === 'lateral_movement').length > 2) {
      factors.push({
        id: generateId('CF'),
        description: 'Extensive lateral movement was possible',
        category: 'Network Segmentation',
        impact: 'high',
        remediation: 'Implement micro-segmentation and zero trust'
      });
    }

    const criticalCompromised = assets.filter(a => a.criticality === 'critical' && a.compromisedAt);
    if (criticalCompromised.length > 0) {
      factors.push({
        id: generateId('CF'),
        description: 'Critical assets were compromised',
        category: 'Asset Protection',
        impact: 'critical',
        remediation: 'Implement enhanced monitoring for critical assets'
      });
    }

    return factors;
  }

  /**
   * Find exploited vulnerabilities
   */
  findExploitedVulnerabilities(events: TimelineEvent[], assets: Asset[]): Vulnerability[] {
    const vulns: Vulnerability[] = [];

    for (const event of events) {
      if (event.techniques.some(t => t.id.startsWith('T1190'))) {
        vulns.push({
          id: generateId('VULN'),
          name: 'Public-Facing Application Vulnerability',
          description: 'A vulnerability in a public-facing application was exploited',
          severity: 'critical',
          affectedAssets: event.assets,
          exploitedAt: event.timestamp,
          patchAvailable: true
        });
      }
    }

    for (const asset of assets) {
      for (const vuln of asset.vulnerabilities) {
        vulns.push({
          id: generateId('VULN'),
          name: vuln,
          description: `Vulnerability on ${asset.hostname || asset.id}`,
          severity: 'high',
          affectedAssets: [asset.id],
          patchAvailable: true
        });
      }
    }

    return vulns;
  }

  /**
   * Identify security gaps
   */
  identifySecurityGaps(events: TimelineEvent[]): SecurityGap[] {
    const gaps: SecurityGap[] = [];

    const avgConfidence = events.reduce((sum, e) => sum + e.confidence, 0) / Math.max(events.length, 1);
    if (avgConfidence < 0.7) {
      gaps.push({
        id: generateId('GAP'),
        category: 'detection',
        description: 'Low detection confidence indicates visibility gaps',
        impact: 'Attacks may go undetected',
        currentState: 'Limited security monitoring',
        recommendedState: 'Comprehensive EDR and SIEM coverage',
        priority: 'high'
      });
    }

    if (events.some(e => e.phase === 'execution')) {
      gaps.push({
        id: generateId('GAP'),
        category: 'prevention',
        description: 'Malicious execution was not prevented',
        impact: 'Attackers can execute arbitrary code',
        currentState: 'Basic antivirus',
        recommendedState: 'Advanced endpoint protection with behavior analysis',
        priority: 'critical'
      });
    }

    const dwellTime = events.length > 1
      ? events[events.length - 1].timestamp.getTime() - events[0].timestamp.getTime()
      : 0;
    if (dwellTime > 24 * 60 * 60 * 1000) {
      gaps.push({
        id: generateId('GAP'),
        category: 'response',
        description: 'Extended dwell time indicates slow response',
        impact: 'Attackers have more time to achieve objectives',
        currentState: 'Manual incident response',
        recommendedState: 'Automated response with SOAR integration',
        priority: 'high'
      });
    }

    return gaps;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(
    cause: CauseNode,
    factors: ContributingFactor[],
    gaps: SecurityGap[]
  ): Recommendation[] {
    const recs: Recommendation[] = [];

    if (cause.category === 'human') {
      recs.push({
        id: generateId('REC'),
        title: 'Enhance Security Awareness Program',
        description: 'Implement phishing simulations and security training',
        priority: 'high',
        category: 'short_term',
        effort: 'medium',
        cost: 'medium',
        frameworks: ['NIST CSF', 'ISO 27001']
      });
    }

    for (const gap of gaps) {
      recs.push({
        id: generateId('REC'),
        title: `Address ${gap.category} gap`,
        description: gap.recommendedState,
        priority: gap.priority,
        category: gap.priority === 'critical' ? 'immediate' : 'short_term',
        effort: 'high',
        cost: 'high',
        frameworks: ['MITRE D3FEND']
      });
    }

    for (const factor of factors) {
      recs.push({
        id: generateId('REC'),
        title: `Remediate: ${factor.category}`,
        description: factor.remediation,
        priority: factor.impact,
        category: factor.impact === 'critical' ? 'immediate' : 'short_term',
        effort: 'medium',
        cost: 'medium',
        frameworks: ['CIS Controls']
      });
    }

    return recs;
  }

  private calculateRCAConfidence(cause: CauseNode, entryPoint: EntryPoint): number {
    let confidence = cause.confidence;
    if (entryPoint.technique) confidence += 0.1;
    if (entryPoint.indicators.length > 0) confidence += 0.05;
    return Math.min(confidence, 1.0);
  }
}
