/**
 * Hook for SLA calculations and computed values
 */

import { useMemo } from 'react';
import type { SLA, SLAStatus, SLAViolation, SLACalculations, StatusType } from './types';

interface UseSLACalculationsOptions {
  slas: SLA[];
  slaStatuses: Map<string, SLAStatus>;
  violations: SLAViolation[];
}

export function useSLACalculations({
  slas,
  slaStatuses,
  violations
}: UseSLACalculationsOptions): SLACalculations {
  return useMemo(() => {
    const statusValues = Array.from(slaStatuses.values());

    const healthySLAs = statusValues.filter(s => s.status === 'healthy').length;
    const warningSLAs = statusValues.filter(s => s.status === 'warning').length;
    const violatingSLAs = statusValues.filter(s => s.status === 'violation').length;
    const activeSLAsCount = slas.filter(s => s.enabled).length;
    const compliancePercentage = slaStatuses.size > 0
      ? (healthySLAs / slaStatuses.size) * 100
      : 0;
    const unresolvedViolationsCount = violations.filter(v => !v.resolved).length;
    const recentViolations = violations.slice(0, 5);

    return {
      healthySLAs,
      warningSLAs,
      violatingSLAs,
      recentViolations,
      activeSLAsCount,
      compliancePercentage,
      unresolvedViolationsCount
    };
  }, [slas, slaStatuses, violations]);
}

// Utility functions for status styling
export function getStatusColor(status: StatusType): string {
  switch (status) {
    case 'healthy': return 'text-green-500';
    case 'warning': return 'text-yellow-500';
    case 'violation': return 'text-red-500';
    default: return 'text-gray-500';
  }
}

export function getSeverityBadge(severity: string): string {
  switch (severity) {
    case 'critical': return 'bg-red-100 text-red-800';
    case 'high': return 'bg-orange-100 text-orange-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'low': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

export function getCriticalityBadge(criticality: string): string {
  return getSeverityBadge(criticality);
}
