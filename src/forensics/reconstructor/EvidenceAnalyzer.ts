/**
 * EvidenceAnalyzer - Lateral Movement Tracking and Kill Chain Mapping
 * Handles evidence analysis, lateral movement detection, and kill chain mapping
 */

import {
  SecurityEvent,
  TimelineEvent,
  LateralMovement,
  Asset,
  AssetType,
  CredentialUsage,
  MovementMethod,
  KillChainMapping,
  KillChainPhase,
  AttackPhase,
  ThreatActorProfile,
  MitreTechnique,
  SeverityLevel,
  IncidentReconstructorConfig,
  MITRE_TECHNIQUES,
  generateId,
  PHASE_ORDER
} from './types';
import { TimelineBuilder } from './TimelineBuilder';

export class EvidenceAnalyzer {
  private config: IncidentReconstructorConfig;
  private timelineBuilder: TimelineBuilder;
  private assets: Map<string, Asset> = new Map();

  constructor(config: IncidentReconstructorConfig) {
    this.config = config;
    this.timelineBuilder = new TimelineBuilder(config);
  }

  /**
   * Get or set assets map
   */
  getAssets(): Map<string, Asset> {
    return this.assets;
  }

  setAssets(assets: Map<string, Asset>): void {
    this.assets = assets;
  }

  /**
   * Track lateral movement across assets
   */
  trackLateralMovement(
    incidentId: string,
    events: SecurityEvent[],
    options?: { detectMethods?: boolean; mapCredentials?: boolean }
  ): LateralMovement[] {
    const opts = { detectMethods: true, mapCredentials: true, ...options };
    const movements: LateralMovement[] = [];

    // Group events by source-destination pairs
    const movementGroups = this.groupLateralMovementEvents(events);

    for (const [key, group] of Array.from(movementGroups.entries())) {
      const [sourceId, destId] = key.split('->');
      const sourceAsset = this.getOrCreateAsset(sourceId, group);
      const destAsset = this.getOrCreateAsset(destId, group);

      const movement: LateralMovement = {
        id: generateId('LM'),
        timestamp: group[0].timestamp,
        sourceAsset,
        destinationAsset: destAsset,
        method: opts.detectMethods ? this.detectMovementMethod(group) : 'ssh',
        credentialsUsed: opts.mapCredentials ? this.extractCredentialUsage(group) : undefined,
        techniques: this.timelineBuilder.mapEventsToTechniques(group),
        success: group.some(e => e.outcome === 'success'),
        confidence: this.timelineBuilder.calculateConfidence(group),
        sourceEvents: group.map(e => e.id),
        duration: group.length > 1
          ? group[group.length - 1].timestamp.getTime() - group[0].timestamp.getTime()
          : undefined,
        dataTransferred: this.estimateDataTransferred(group)
      };

      movements.push(movement);

      // Mark destination asset as compromised
      destAsset.compromisedAt = movement.timestamp;
      this.assets.set(destAsset.id, destAsset);
    }

    return movements;
  }

  /**
   * Group events by lateral movement patterns
   */
  private groupLateralMovementEvents(events: SecurityEvent[]): Map<string, SecurityEvent[]> {
    const groups = new Map<string, SecurityEvent[]>();

    for (const event of events) {
      if (!this.isLateralMovementEvent(event)) continue;

      const sourceId = event.sourceHost || event.sourceIp || 'unknown';
      const destId = event.destinationHost || event.destinationIp || 'unknown';
      if (sourceId === destId) continue;

      const key = `${sourceId}->${destId}`;
      const group = groups.get(key) || [];
      group.push(event);
      groups.set(key, group);
    }

    return groups;
  }

  /**
   * Check if event indicates lateral movement
   */
  private isLateralMovementEvent(event: SecurityEvent): boolean {
    const lateralIndicators = ['rdp', 'ssh', 'smb', 'wmi', 'psexec', 'winrm', 'dcom'];
    const eventLower = JSON.stringify(event).toLowerCase();
    return lateralIndicators.some(i => eventLower.includes(i)) ||
           (event.sourceHost && event.destinationHost && event.sourceHost !== event.destinationHost);
  }

  /**
   * Detect lateral movement method
   */
  private detectMovementMethod(events: SecurityEvent[]): MovementMethod {
    for (const event of events) {
      if (event.networkPort === 3389) return 'rdp';
      if (event.networkPort === 22) return 'ssh';
      if (event.networkPort === 445 || event.networkPort === 139) return 'smb';
      if (event.networkPort === 5985 || event.networkPort === 5986) return 'winrm';
      if (event.processName?.toLowerCase().includes('psexec')) return 'psexec';
      if (event.eventType?.toLowerCase().includes('wmi')) return 'wmi';
      if (event.eventType?.toLowerCase().includes('dcom')) return 'dcom';
      if (event.commandLine?.toLowerCase().includes('pass-the-hash')) return 'pass_the_hash';
      if (event.commandLine?.toLowerCase().includes('golden')) return 'golden_ticket';
    }
    return 'smb';
  }

  /**
   * Extract credential usage from events
   */
  private extractCredentialUsage(events: SecurityEvent[]): CredentialUsage | undefined {
    for (const event of events) {
      if (event.sourceUser || event.destinationUser) {
        const username = event.destinationUser || event.sourceUser || '';
        return {
          accountName: username,
          accountType: username.includes('$') ? 'service' : (username.includes('\\') ? 'domain' : 'local'),
          domain: username.includes('\\') ? username.split('\\')[0] : undefined,
          authMethod: this.inferAuthMethod(events),
          privilegeLevel: this.inferPrivilegeLevel(username),
          validCredential: events.some(e => e.outcome === 'success')
        };
      }
    }
    return undefined;
  }

  /**
   * Infer authentication method from events
   */
  private inferAuthMethod(events: SecurityEvent[]): string {
    for (const event of events) {
      if (event.eventType?.toLowerCase().includes('ntlm')) return 'NTLM';
      if (event.eventType?.toLowerCase().includes('kerberos')) return 'Kerberos';
      if (event.eventType?.toLowerCase().includes('certificate')) return 'Certificate';
    }
    return 'NTLM';
  }

  /**
   * Infer privilege level from username
   */
  private inferPrivilegeLevel(username: string): string {
    const adminIndicators = ['admin', 'administrator', 'root', 'system', 'domain'];
    if (adminIndicators.some(i => username.toLowerCase().includes(i))) return 'high';
    if (username.includes('$')) return 'service';
    return 'standard';
  }

  /**
   * Estimate data transferred from events
   */
  private estimateDataTransferred(events: SecurityEvent[]): number {
    let total = 0;
    for (const event of events) {
      if (typeof event.rawData['bytesTransferred'] === 'number') {
        total += event.rawData['bytesTransferred'] as number;
      }
    }
    return total;
  }

  /**
   * Get or create asset from identifier
   */
  getOrCreateAsset(identifier: string, events: SecurityEvent[]): Asset {
    let asset = this.assets.get(identifier);
    if (!asset) {
      const isIp = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(identifier);
      asset = {
        id: identifier,
        type: 'workstation',
        hostname: isIp ? undefined : identifier,
        ipAddress: isIp ? identifier : undefined,
        criticality: 'medium',
        services: [],
        vulnerabilities: []
      };
      this.assets.set(identifier, asset);
    }
    return asset;
  }

  /**
   * Map timeline events to kill chain phases
   */
  mapToKillChain(
    incidentId: string,
    timelineEvents: TimelineEvent[],
    options?: { detectGaps?: boolean; attributeActor?: boolean }
  ): KillChainMapping {
    const opts = { detectGaps: true, attributeActor: true, ...options };
    const phases: KillChainPhase[] = this.initializeKillChainPhases();

    // Map timeline events to phases
    for (const event of timelineEvents) {
      const phase = phases.find(p => p.phase === event.phase);
      if (phase) {
        phase.detected = true;
        if (!phase.startTime || event.timestamp < phase.startTime) phase.startTime = event.timestamp;
        if (!phase.endTime || event.timestamp > phase.endTime) phase.endTime = event.timestamp;
        phase.events.push(event.id);
        phase.techniques.push(...event.techniques.filter(t => !phase.techniques.some(pt => pt.id === t.id)));
        phase.confidence = Math.max(phase.confidence, event.confidence);
      }
    }

    // Calculate completeness
    const detectedPhases = phases.filter(p => p.detected).length;
    const completeness = detectedPhases / phases.length * 100;

    // Detect gaps
    if (opts.detectGaps) {
      this.annotateKillChainGaps(phases);
    }

    // Determine attack vector
    const attackVector = this.determineAttackVector(timelineEvents);

    // Calculate dwell time
    const firstActivity = timelineEvents.length > 0 ? timelineEvents[0].timestamp : new Date();
    const lastActivity = timelineEvents.length > 0 ? timelineEvents[timelineEvents.length - 1].timestamp : new Date();
    const dwellTime = lastActivity.getTime() - firstActivity.getTime();

    // Attribution
    const attackerProfile = opts.attributeActor
      ? this.attemptAttribution(timelineEvents)
      : undefined;

    return {
      incidentId,
      phases: phases.filter(p => p.detected || p.notes),
      completeness,
      attackVector,
      attackObjective: this.inferAttackObjective(phases),
      dwellTime,
      firstActivity,
      lastActivity,
      attackerProfile
    };
  }

  /**
   * Initialize kill chain phases
   */
  private initializeKillChainPhases(): KillChainPhase[] {
    return PHASE_ORDER.map(phase => ({
      phase,
      detected: false,
      techniques: [],
      events: [],
      confidence: 0,
      notes: ''
    }));
  }

  /**
   * Annotate gaps in kill chain visibility
   */
  private annotateKillChainGaps(phases: KillChainPhase[]): void {
    let lastDetectedIdx = -1;
    for (let i = 0; i < phases.length; i++) {
      if (phases[i].detected) {
        if (lastDetectedIdx >= 0 && i - lastDetectedIdx > 1) {
          for (let j = lastDetectedIdx + 1; j < i; j++) {
            phases[j].notes = `Gap in visibility - activity likely occurred but not detected`;
          }
        }
        lastDetectedIdx = i;
      }
    }
  }

  /**
   * Determine attack vector from timeline
   */
  private determineAttackVector(events: TimelineEvent[]): string {
    const initialEvents = events.filter(e => e.phase === 'initial_access');
    if (initialEvents.length === 0) return 'Unknown';

    const techniques = initialEvents.flatMap(e => e.techniques);
    if (techniques.some(t => t.id.startsWith('T1566'))) return 'Phishing';
    if (techniques.some(t => t.id === 'T1078')) return 'Valid Accounts';
    if (techniques.some(t => t.id.startsWith('T1190'))) return 'Exploit Public-Facing Application';
    if (techniques.some(t => t.id.startsWith('T1195'))) return 'Supply Chain Compromise';

    return 'Unknown';
  }

  /**
   * Infer attack objective from phases
   */
  private inferAttackObjective(phases: KillChainPhase[]): string | undefined {
    const impactPhase = phases.find(p => p.phase === 'impact' && p.detected);
    const exfilPhase = phases.find(p => p.phase === 'exfiltration' && p.detected);

    if (impactPhase?.techniques.some(t => t.id === 'T1486')) return 'Ransomware';
    if (exfilPhase) return 'Data Exfiltration';
    if (phases.find(p => p.phase === 'collection' && p.detected)) return 'Data Theft';
    if (phases.find(p => p.phase === 'credential_access' && p.detected)) return 'Credential Harvesting';

    return undefined;
  }

  /**
   * Attempt attribution based on TTP overlap
   */
  private attemptAttribution(events: TimelineEvent[]): ThreatActorProfile | undefined {
    const techniques = new Set(events.flatMap(e => e.techniques.map(t => t.id)));

    const knownActors: ThreatActorProfile[] = [
      { id: 'APT29', name: 'APT29', aliases: ['Cozy Bear', 'The Dukes'], motivation: 'espionage', sophistication: 'advanced', targetSectors: ['Government'], knownTechniques: ['T1566', 'T1078', 'T1055', 'T1071'], attribution: 'Russia', confidence: 0 },
      { id: 'FIN7', name: 'FIN7', aliases: ['Carbanak'], motivation: 'financial', sophistication: 'high', targetSectors: ['Retail', 'Hospitality'], knownTechniques: ['T1566', 'T1059.001', 'T1003', 'T1486'], attribution: 'Unknown', confidence: 0 }
    ];

    let bestMatch: ThreatActorProfile | undefined;
    let highestOverlap = 0;

    for (const actor of knownActors) {
      const overlap = actor.knownTechniques.filter(t => techniques.has(t)).length;
      const score = overlap / actor.knownTechniques.length;
      if (score > highestOverlap && score >= this.config.confidenceThreshold) {
        highestOverlap = score;
        bestMatch = { ...actor, confidence: score };
      }
    }

    return bestMatch;
  }
}
