/**
 * SLA Overview Component - Summary cards and performance metrics
 */

import React from 'react';
import { Target, AlertTriangle, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import type { SLA, SLAViolation, WorkflowMetrics, TabType } from './types';
import { getSeverityBadge } from './useSLACalculations';

interface SLAOverviewProps {
  slas: SLA[];
  healthySLAs: number;
  warningSLAs: number;
  violatingSLAs: number;
  slaStatusesSize: number;
  violations: SLAViolation[];
  recentViolations: SLAViolation[];
  workflowMetrics: WorkflowMetrics | null;
  onAcknowledgeViolation: (violation: SLAViolation) => void;
  onViewAllViolations: () => void;
}

export function SLAOverview({
  slas,
  healthySLAs,
  warningSLAs,
  violatingSLAs,
  slaStatusesSize,
  violations,
  recentViolations,
  workflowMetrics,
  onAcknowledgeViolation,
  onViewAllViolations
}: SLAOverviewProps) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total SLAs</span>
            <Target className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-2xl font-bold">{slas.length}</div>
          <div className="text-sm text-gray-500">
            {slas.filter(s => s.enabled).length} active
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Healthy</span>
            <Check className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-green-600">{healthySLAs}</div>
          <div className="text-sm text-gray-500">
            {((healthySLAs / Math.max(slaStatusesSize, 1)) * 100).toFixed(1)}% compliant
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Warnings</span>
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-2xl font-bold text-yellow-600">{warningSLAs}</div>
          <div className="text-sm text-gray-500">
            Near threshold
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Violations</span>
            <X className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-600">{violatingSLAs}</div>
          <div className="text-sm text-gray-500">
            {violations.filter(v => !v.resolved).length} unresolved
          </div>
        </div>
      </div>

      {/* Performance Overview */}
      {workflowMetrics && (
        <SLAPerformanceChart workflowMetrics={workflowMetrics} />
      )}

      {/* Recent Violations */}
      <SLARecentViolations
        slas={slas}
        recentViolations={recentViolations}
        onAcknowledgeViolation={onAcknowledgeViolation}
        onViewAllViolations={onViewAllViolations}
      />
    </div>
  );
}

interface SLAPerformanceChartProps {
  workflowMetrics: WorkflowMetrics;
}

function SLAPerformanceChart({ workflowMetrics }: SLAPerformanceChartProps) {
  return (
    <div className="bg-white border rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Workflow Performance</h3>
      <div className="grid grid-cols-3 gap-6">
        <div>
          <div className="text-sm text-gray-600 mb-2">Success Rate</div>
          <div className="h-32 flex items-center justify-center">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="#10b981"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${(workflowMetrics.reliability.successRate / 100) * 251} 251`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-green-600">
                  {workflowMetrics.reliability.successRate.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
          <div className="text-center mt-2">
            <div className="text-sm text-gray-500">
              Error: {workflowMetrics.reliability.errorRate.toFixed(1)}%
            </div>
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-600 mb-2">Average Execution Time</div>
          <div className="text-3xl font-bold text-blue-600 mt-8">
            {(workflowMetrics.performance.avgExecutionTime / 1000).toFixed(2)}s
          </div>
          <div className="text-sm text-gray-500">
            P95: {(workflowMetrics.performance.p95ExecutionTime / 1000).toFixed(2)}s
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-600 mb-2">Throughput</div>
          <div className="text-3xl font-bold text-purple-600 mt-8">
            {workflowMetrics.throughput.executionsPerMinute.toFixed(1)}
          </div>
          <div className="text-sm text-gray-500">
            executions/min
          </div>
        </div>
      </div>
    </div>
  );
}

interface SLARecentViolationsProps {
  slas: SLA[];
  recentViolations: SLAViolation[];
  onAcknowledgeViolation: (violation: SLAViolation) => void;
  onViewAllViolations: () => void;
}

function SLARecentViolations({
  slas,
  recentViolations,
  onAcknowledgeViolation,
  onViewAllViolations
}: SLARecentViolationsProps) {
  return (
    <div className="bg-white border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Recent Violations</h3>
        <button
          onClick={onViewAllViolations}
          className="text-sm text-blue-600 hover:underline"
        >
          View all
        </button>
      </div>

      {recentViolations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Check className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No recent violations</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recentViolations.map(violation => {
            const sla = slas.find(s => s.id === violation.slaId);
            return (
              <div key={violation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">{sla?.name || 'Unknown SLA'}</div>
                  <div className="text-sm text-gray-600">
                    {format(violation.timestamp, 'PPp')} ·
                    Value: {violation.value} (Threshold: {violation.threshold})
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${getSeverityBadge(violation.severity)}`}>
                    {violation.severity}
                  </span>
                  {!violation.acknowledged && (
                    <button
                      onClick={() => onAcknowledgeViolation(violation)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
