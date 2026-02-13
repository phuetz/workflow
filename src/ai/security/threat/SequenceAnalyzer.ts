/**
 * Attack Sequence Analyzer
 * Pattern recognition for attack sequences
 * @module threat/SequenceAnalyzer
 */

import type { SecurityEvent, SequencePattern } from './types';

/**
 * Kill chain stages for attack classification
 */
export const KILL_CHAIN_STAGES = [
  'Reconnaissance',
  'Weaponization',
  'Delivery',
  'Exploitation',
  'Installation',
  'Command & Control',
  'Actions on Objective',
] as const;

/**
 * Attack Sequence Analyzer
 */
export class SequenceAnalyzer {
  /**
   * Analyze attack patterns in event sequence
   */
  analyzePatterns(events: SecurityEvent[]): SequencePattern[] {
    const patterns: SequencePattern[] = [];

    if (events.length < 3) return patterns;

    // Pattern 1: Brute force detection
    if (this.detectBruteForce(events)) {
      patterns.push({
        pattern: ['failed_login', 'failed_login', 'failed_login'],
        confidence: 0.85,
        killChainStage: 'Exploitation',
        estimatedImpact: 0.7,
      });
    }

    // Pattern 2: Data exfiltration
    if (this.detectDataExfiltration(events)) {
      patterns.push({
        pattern: ['authenticate', 'access_data', 'transfer_data'],
        confidence: 0.9,
        killChainStage: 'Actions on Objective',
        estimatedImpact: 0.95,
      });
    }

    // Pattern 3: Privilege escalation
    if (this.detectPrivilegeEscalation(events)) {
      patterns.push({
        pattern: ['login', 'execute_command', 'system_access'],
        confidence: 0.8,
        killChainStage: 'Exploitation',
        estimatedImpact: 0.85,
      });
    }

    // Pattern 4: Reconnaissance
    if (this.detectReconnaissance(events)) {
      patterns.push({
        pattern: ['port_scan', 'service_probe', 'vulnerability_scan'],
        confidence: 0.75,
        killChainStage: 'Reconnaissance',
        estimatedImpact: 0.4,
      });
    }

    // Pattern 5: Lateral movement
    if (this.detectLateralMovement(events)) {
      patterns.push({
        pattern: ['login', 'remote_access', 'credential_use'],
        confidence: 0.8,
        killChainStage: 'Installation',
        estimatedImpact: 0.75,
      });
    }

    return patterns;
  }

  /**
   * Detect brute force attacks
   */
  private detectBruteForce(events: SecurityEvent[]): boolean {
    const failedLogins = events.filter(
      e => e.eventType === 'failed_login' && e.severity === 'high'
    );
    return failedLogins.length >= 5;
  }

  /**
   * Detect data exfiltration
   */
  private detectDataExfiltration(events: SecurityEvent[]): boolean {
    const dataAccess = events.filter(e => e.action === 'access_data');
    const transfers = events.filter(e => e.action === 'transfer_data');
    return dataAccess.length > 2 && transfers.length > 0;
  }

  /**
   * Detect privilege escalation
   */
  private detectPrivilegeEscalation(events: SecurityEvent[]): boolean {
    const logins = events.filter(e => e.eventType === 'login');
    const highPriv = events.filter(e => e.action === 'execute_command');
    return logins.length > 0 && highPriv.length > 0;
  }

  /**
   * Detect reconnaissance activity
   */
  private detectReconnaissance(events: SecurityEvent[]): boolean {
    const portScans = events.filter(e => e.eventType === 'port_scan');
    const probes = events.filter(e => e.eventType === 'service_probe');
    return portScans.length > 0 || probes.length > 2;
  }

  /**
   * Detect lateral movement
   */
  private detectLateralMovement(events: SecurityEvent[]): boolean {
    const uniqueTargets = new Set(events.map(e => e.targetIP));
    const remoteAccess = events.filter(e => e.eventType === 'remote_access');
    return uniqueTargets.size > 3 && remoteAccess.length > 0;
  }
}

export default SequenceAnalyzer;
