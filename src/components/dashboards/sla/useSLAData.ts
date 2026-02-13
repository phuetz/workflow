/**
 * Hook for loading and managing SLA data
 */

import { useState, useEffect, useCallback } from 'react';
import { subDays } from 'date-fns';
import { SLAService } from '../../../services/SLAService';
import { logger } from '../../../services/SimpleLogger';
import type {
  SLA,
  SLAStatus,
  SLAViolation,
  SLAReport,
  WorkflowMetrics,
  GlobalMetrics,
  TimeRangeOption,
  SLADataState,
  SLAFormData
} from './types';

const slaService = SLAService.getInstance();

// Mock auth service
const authService = {
  getCurrentUser: () => 'current-user'
};

interface UseSLADataOptions {
  workflowId?: string;
  selectedTimeRange: TimeRangeOption;
  selectedSLA: SLA | null;
}

interface UseSLADataReturn extends SLADataState {
  loadData: () => Promise<void>;
  handleCreateSLA: (formData: SLAFormData) => Promise<boolean>;
  toggleSLA: (sla: SLA) => Promise<void>;
  deleteSLA: (sla: SLA) => Promise<void>;
  acknowledgeViolation: (violation: SLAViolation) => Promise<void>;
}

export function useSLAData({
  workflowId,
  selectedTimeRange,
  selectedSLA
}: UseSLADataOptions): UseSLADataReturn {
  const [slas, setSLAs] = useState<SLA[]>([]);
  const [slaStatuses, setSLAStatuses] = useState<Map<string, SLAStatus>>(new Map());
  const [violations, setViolations] = useState<SLAViolation[]>([]);
  const [reports, setReports] = useState<SLAReport[]>([]);
  const [globalMetrics, setGlobalMetrics] = useState<GlobalMetrics | null>(null);
  const [workflowMetrics, setWorkflowMetrics] = useState<WorkflowMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const getTimeRange = useCallback(() => {
    const end = new Date();
    let start: Date;

    switch (selectedTimeRange) {
      case '24h':
        start = subDays(end, 1);
        break;
      case '7d':
        start = subDays(end, 7);
        break;
      case '30d':
        start = subDays(end, 30);
        break;
      case '90d':
        start = subDays(end, 90);
        break;
      default:
        start = subDays(end, 7);
    }

    return { start, end };
  }, [selectedTimeRange]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load SLAs
      const slaList = await slaService.listSLAs(workflowId ? { workflowId } : undefined);
      setSLAs(slaList);

      // Load SLA statuses
      const statuses = new Map<string, SLAStatus>();
      for (const sla of slaList) {
        if (sla.enabled) {
          const status = await slaService.checkSLA(sla.id);
          statuses.set(sla.id, status);
        }
      }
      setSLAStatuses(statuses);

      // Load violations
      const allViolations: SLAViolation[] = [];
      for (const sla of slaList) {
        const slaViolations = await slaService.getViolations(sla.id, getTimeRange());
        allViolations.push(...slaViolations);
      }
      setViolations(allViolations.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));

      // Load metrics
      if (workflowId) {
        const wfMetrics = await slaService.getWorkflowMetrics(workflowId, getTimeRange());
        setWorkflowMetrics(wfMetrics);
      } else {
        const global = await slaService.getGlobalMetrics(getTimeRange());
        setGlobalMetrics(global);
      }

      // Load reports for selected SLA
      if (selectedSLA) {
        const slaReports = await slaService.getReports(selectedSLA.id);
        setReports(slaReports);
      }
    } catch (error) {
      logger.error('Failed to load SLA data:', error);
    } finally {
      setLoading(false);
    }
  }, [workflowId, selectedSLA, getTimeRange]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleCreateSLA = useCallback(async (formData: SLAFormData): Promise<boolean> => {
    try {
      await slaService.createSLA({
        name: formData.name,
        description: formData.description,
        workflowId,
        targets: [{
          id: '',
          metric: {
            type: formData.metric,
            name: formData.name,
            aggregation: formData.aggregation
          },
          operator: formData.operator,
          threshold: formData.threshold,
          unit: formData.unit,
          window: {
            duration: formData.windowDuration,
            unit: formData.windowUnit,
            rolling: true
          },
          criticality: formData.criticality
        }],
        schedule: {
          type: formData.scheduleType,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          excludeHolidays: false
        },
        alerting: {
          enabled: formData.alertingEnabled,
          channels: [],
          escalation: [],
          cooldownPeriod: 30,
          includeContext: true
        },
        reporting: {
          enabled: formData.reportingEnabled,
          frequency: formData.reportFrequency,
          recipients: [],
          format: 'pdf',
          includeCharts: true,
          includeRawData: false
        },
        enabled: true,
        createdBy: authService.getCurrentUser()
      });

      await loadData();
      return true;
    } catch (error) {
      logger.error('Failed to create SLA:', error);
      return false;
    }
  }, [workflowId, loadData]);

  const toggleSLA = useCallback(async (sla: SLA) => {
    await slaService.updateSLA(sla.id, { enabled: !sla.enabled });
    await loadData();
  }, [loadData]);

  const deleteSLA = useCallback(async (sla: SLA) => {
    if (confirm(`Delete SLA "${sla.name}"?`)) {
      await slaService.deleteSLA(sla.id);
      await loadData();
    }
  }, [loadData]);

  const acknowledgeViolation = useCallback(async (violation: SLAViolation) => {
    await slaService.acknowledgeViolation(
      violation.id,
      authService.getCurrentUser(),
      'Acknowledged via dashboard'
    );
    await loadData();
  }, [loadData]);

  return {
    slas,
    slaStatuses,
    violations,
    reports,
    globalMetrics,
    workflowMetrics,
    loading,
    loadData,
    handleCreateSLA,
    toggleSLA,
    deleteSLA,
    acknowledgeViolation
  };
}
