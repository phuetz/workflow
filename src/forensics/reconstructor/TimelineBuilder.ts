/**
 * TimelineBuilder - Timeline Reconstruction and Event Correlation
 * Handles event correlation, timeline construction, and attack phase mapping
 */

import {
  SecurityEvent,
  TimelineEvent,
  MitreTechnique,
  AttackPhase,
  SeverityLevel,
  IncidentReconstructorConfig,
  MITRE_TECHNIQUES,
  generateId,
  getMaxSeverity,
  PHASE_ORDER
} from './types';

export class TimelineBuilder {
  private config: IncidentReconstructorConfig;

  constructor(config: IncidentReconstructorConfig) {
    this.config = config;
  }

  /**
   * Reconstruct timeline from security events
   */
  reconstructTimeline(
    incidentId: string,
    events: SecurityEvent[],
    options?: {
      startTime?: Date;
      endTime?: Date;
      correlate?: boolean;
      enrichTechniques?: boolean;
    }
  ): TimelineEvent[] {
    const opts = { correlate: true, enrichTechniques: true, ...options };

    // Filter by time window
    let filtered = [...events];
    if (opts.startTime) filtered = filtered.filter(e => e.timestamp >= opts.startTime!);
    if (opts.endTime) filtered = filtered.filter(e => e.timestamp <= opts.endTime!);

    // Sort chronologically
    filtered.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Group and correlate events
    const correlatedGroups = opts.correlate
      ? this.correlateEvents(filtered)
      : filtered.map(e => [e]);

    // Convert to timeline events
    const timeline: TimelineEvent[] = [];
    for (const group of correlatedGroups) {
      const timelineEvent = this.createTimelineEvent(incidentId, group, opts.enrichTechniques);
      timeline.push(timelineEvent);
    }

    // Identify attack phases
    this.assignAttackPhases(timeline);

    return timeline;
  }

  /**
   * Correlate related events based on time window and shared attributes
   */
  correlateEvents(events: SecurityEvent[]): SecurityEvent[][] {
    const groups: SecurityEvent[][] = [];
    const processed = new Set<string>();

    for (const event of events) {
      if (processed.has(event.id)) continue;

      const group: SecurityEvent[] = [event];
      processed.add(event.id);

      // Find related events within time window
      for (const other of events) {
        if (processed.has(other.id)) continue;
        if (this.areEventsCorrelated(event, other)) {
          group.push(other);
          processed.add(other.id);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  /**
   * Check if two events are correlated
   */
  private areEventsCorrelated(a: SecurityEvent, b: SecurityEvent): boolean {
    const timeDiff = Math.abs(a.timestamp.getTime() - b.timestamp.getTime());
    if (timeDiff > this.config.correlationTimeWindowMs) return false;

    // Same host correlation
    if (a.sourceHost && a.sourceHost === b.sourceHost) return true;
    if (a.sourceIp && a.sourceIp === b.sourceIp) return true;

    // Process lineage correlation
    if (a.processId && a.processId === b.parentProcessId) return true;
    if (b.processId && b.processId === a.parentProcessId) return true;

    // Same user correlation
    if (a.sourceUser && a.sourceUser === b.sourceUser) return true;

    // Shared indicators
    const sharedIndicators = a.indicators.filter(i => b.indicators.includes(i));
    if (sharedIndicators.length > 0) return true;

    return false;
  }

  /**
   * Create a timeline event from a group of correlated security events
   */
  private createTimelineEvent(
    incidentId: string,
    events: SecurityEvent[],
    enrichTechniques: boolean
  ): TimelineEvent {
    const primaryEvent = events[0];
    const techniques: MitreTechnique[] = enrichTechniques
      ? this.mapEventsToTechniques(events)
      : [];

    const assets = new Set<string>();
    events.forEach(e => {
      if (e.sourceHost) assets.add(e.sourceHost);
      if (e.destinationHost) assets.add(e.destinationHost);
    });

    const maxSeverity = getMaxSeverity(events.map(e => e.severity));

    return {
      id: generateId('TLE'),
      timestamp: primaryEvent.timestamp,
      phase: this.inferPhase(events, techniques),
      description: this.generateEventDescription(events),
      severity: maxSeverity,
      confidence: this.calculateConfidence(events),
      sourceEvents: events.map(e => e.id),
      assets: Array.from(assets),
      techniques,
      indicators: Array.from(new Set(events.flatMap(e => e.indicators))),
      notes: events.length > 1 ? `Correlated ${events.length} events` : undefined
    };
  }

  /**
   * Map security events to MITRE ATT&CK techniques
   */
  mapEventsToTechniques(events: SecurityEvent[]): MitreTechnique[] {
    const techniques: MitreTechnique[] = [];
    const seen = new Set<string>();

    for (const event of events) {
      const matched = this.matchEventToTechnique(event);
      for (const technique of matched) {
        if (!seen.has(technique.id)) {
          seen.add(technique.id);
          techniques.push(technique);
        }
      }
    }

    return techniques;
  }

  /**
   * Match a single event to MITRE techniques
   */
  private matchEventToTechnique(event: SecurityEvent): MitreTechnique[] {
    const matched: MitreTechnique[] = [];

    // PowerShell execution
    if (event.processName?.toLowerCase().includes('powershell') ||
        event.commandLine?.toLowerCase().includes('powershell')) {
      const t = MITRE_TECHNIQUES.get('T1059.001');
      if (t) matched.push(t);
    }

    // Credential dumping indicators
    if (event.processName?.toLowerCase().includes('mimikatz') ||
        event.commandLine?.toLowerCase().includes('sekurlsa') ||
        event.processName?.toLowerCase() === 'lsass.exe' && event.action === 'access') {
      const t = MITRE_TECHNIQUES.get('T1003.001');
      if (t) matched.push(t);
    }

    // RDP lateral movement
    if (event.eventType?.toLowerCase().includes('rdp') ||
        (event.networkPort === 3389 && event.protocol?.toLowerCase() === 'tcp')) {
      const t = MITRE_TECHNIQUES.get('T1021.001');
      if (t) matched.push(t);
    }

    // SMB lateral movement
    if (event.networkPort === 445 || event.networkPort === 139) {
      const t = MITRE_TECHNIQUES.get('T1021.002');
      if (t) matched.push(t);
    }

    // Process injection
    if (event.eventType?.includes('CreateRemoteThread') ||
        event.eventType?.includes('NtMapViewOfSection')) {
      const t = MITRE_TECHNIQUES.get('T1055');
      if (t) matched.push(t);
    }

    // File encryption (ransomware)
    if (event.eventType?.includes('FileEncrypt') ||
        event.filePath?.match(/\.(encrypted|locked|ransom)$/i)) {
      const t = MITRE_TECHNIQUES.get('T1486');
      if (t) matched.push(t);
    }

    return matched;
  }

  /**
   * Infer attack phase from events and techniques
   */
  inferPhase(events: SecurityEvent[], techniques: MitreTechnique[]): AttackPhase {
    // Use technique tactics to infer phase
    const tacticsCount: Record<string, number> = {};
    for (const technique of techniques) {
      const tactic = technique.tactic.toLowerCase().replace(/ /g, '_');
      tacticsCount[tactic] = (tacticsCount[tactic] || 0) + 1;
    }

    // Find most common tactic
    let maxTactic = 'discovery';
    let maxCount = 0;
    for (const [tactic, count] of Object.entries(tacticsCount)) {
      if (count > maxCount) {
        maxCount = count;
        maxTactic = tactic;
      }
    }

    // Map tactic to phase
    const tacticToPhase: Record<string, AttackPhase> = {
      'initial_access': 'initial_access',
      'execution': 'execution',
      'persistence': 'persistence',
      'privilege_escalation': 'privilege_escalation',
      'defense_evasion': 'defense_evasion',
      'credential_access': 'credential_access',
      'discovery': 'discovery',
      'lateral_movement': 'lateral_movement',
      'collection': 'collection',
      'command_and_control': 'command_and_control',
      'exfiltration': 'exfiltration',
      'impact': 'impact'
    };

    return tacticToPhase[maxTactic] || 'execution';
  }

  /**
   * Assign attack phases and ensure logical progression
   */
  private assignAttackPhases(timeline: TimelineEvent[]): void {
    for (let i = 1; i < timeline.length; i++) {
      const prev = timeline[i - 1];
      const curr = timeline[i];

      // Ensure logical phase progression when confidence is low
      if (curr.confidence < 0.5 && this.isPhaseRegression(prev.phase, curr.phase)) {
        curr.phase = prev.phase;
      }
    }
  }

  /**
   * Check if there is a phase regression
   */
  private isPhaseRegression(prevPhase: AttackPhase, currPhase: AttackPhase): boolean {
    return PHASE_ORDER.indexOf(currPhase) < PHASE_ORDER.indexOf(prevPhase);
  }

  /**
   * Generate human-readable event description
   */
  private generateEventDescription(events: SecurityEvent[]): string {
    if (events.length === 1) {
      const e = events[0];
      const parts = [e.eventType];
      if (e.processName) parts.push(`process: ${e.processName}`);
      if (e.sourceHost) parts.push(`host: ${e.sourceHost}`);
      if (e.sourceUser) parts.push(`user: ${e.sourceUser}`);
      return parts.join(' | ');
    }
    const types = Array.from(new Set(events.map(e => e.eventType)));
    return `${events.length} correlated events: ${types.slice(0, 3).join(', ')}${types.length > 3 ? '...' : ''}`;
  }

  /**
   * Calculate confidence score for correlated events
   */
  calculateConfidence(events: SecurityEvent[]): number {
    // Base confidence from event count
    let confidence = Math.min(0.5 + events.length * 0.1, 0.9);

    // Boost for multiple indicators
    const indicatorCount = new Set(events.flatMap(e => e.indicators)).size;
    confidence += Math.min(indicatorCount * 0.05, 0.1);

    // Boost for successful outcomes
    const successCount = events.filter(e => e.outcome === 'success').length;
    confidence += successCount / events.length * 0.1;

    return Math.min(confidence, 1.0);
  }
}
