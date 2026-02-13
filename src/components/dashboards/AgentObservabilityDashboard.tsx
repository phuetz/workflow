/**
 * Agent Observability Dashboard
 *
 * Comprehensive dashboard for monitoring agent traces, costs, SLAs,
 * policy violations, and performance metrics in real-time.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AgentTrace,
  SLAViolation,
  PolicyViolation,
  CostAttribution,
  PerformanceProfile,
  DashboardConfig,
  ObservabilityEvent,
} from '../../observability/types/observability';
import { AgentTraceCollector } from '../../observability/AgentTraceCollector';
import { ToolSpanTracker } from '../../observability/ToolSpanTracker';
import { CostAttributionEngine } from '../../observability/CostAttributionEngine';
import { AgentSLAMonitor } from '../../observability/AgentSLAMonitor';
import { PolicyViolationTracker } from '../../observability/PolicyViolationTracker';
import { AgentPerformanceProfiler } from '../../observability/AgentPerformanceProfiler';
import { TraceVisualization } from '../../observability/TraceVisualization';

interface AgentObservabilityDashboardProps {
  traceCollector: AgentTraceCollector;
  toolTracker: ToolSpanTracker;
  costEngine: CostAttributionEngine;
  slaMonitor: AgentSLAMonitor;
  violationTracker: PolicyViolationTracker;
  performanceProfiler: AgentPerformanceProfiler;
  refreshInterval?: number;
}

export const AgentObservabilityDashboard: React.FC<AgentObservabilityDashboardProps> = ({
  traceCollector,
  toolTracker,
  costEngine,
  slaMonitor,
  violationTracker,
  performanceProfiler,
  refreshInterval = 5000,
}) => {
  const [activeTab, setActiveTab] = useState<'traces' | 'costs' | 'sla' | 'violations' | 'performance'>('traces');
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [selectedTrace, setSelectedTrace] = useState<AgentTrace | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  // Real-time data
  const [traces, setTraces] = useState<AgentTrace[]>([]);
  const [costData, setCostData] = useState<CostAttribution | null>(null);
  const [slaViolations, setSlaViolations] = useState<SLAViolation[]>([]);
  const [policyViolations, setPolicyViolations] = useState<PolicyViolation[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceProfile | null>(null);

  // Statistics
  const [stats, setStats] = useState({
    totalTraces: 0,
    activeTraces: 0,
    totalCost: 0,
    activeSLAViolations: 0,
    activePolicyViolations: 0,
  });

  // Fetch data
  const fetchData = useCallback(async () => {
    const { start, end } = getTimeRangeTimestamps(timeRange);

    // Fetch traces
    const traceResult = await traceCollector.queryTraces({
      startTime: start,
      endTime: end,
      agentIds: selectedAgent ? [selectedAgent] : undefined,
      limit: 100,
    });
    setTraces(traceResult.traces);

    // Fetch cost data
    const costs = await costEngine.getAttribution(start, end, {
      agentIds: selectedAgent ? [selectedAgent] : undefined,
    });
    setCostData(costs);

    // Fetch SLA violations
    const slaViols = slaMonitor.getViolations({
      startTime: start,
      endTime: end,
      agentIds: selectedAgent ? [selectedAgent] : undefined,
      resolved: false,
    });
    setSlaViolations(slaViols);

    // Fetch policy violations
    const policyViols = violationTracker.getViolations({
      startTime: start,
      endTime: end,
      agentIds: selectedAgent ? [selectedAgent] : undefined,
      resolved: false,
    });
    setPolicyViolations(policyViols);

    // Update statistics
    const traceStats = traceCollector.getStatistics({ startTime: start, endTime: end });
    setStats({
      totalTraces: traceStats.totalTraces,
      activeTraces: traceCollector.getMetrics().activeTraces,
      totalCost: costs.total,
      activeSLAViolations: slaViols.length,
      activePolicyViolations: policyViols.length,
    });
  }, [timeRange, selectedAgent, traceCollector, costEngine, slaMonitor, violationTracker]);

  // Auto-refresh
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  // Listen for real-time events
  useEffect(() => {
    const handleTraceCompleted = (trace: AgentTrace) => {
      setTraces(prev => [trace, ...prev].slice(0, 100));
    };

    const handleViolation = () => {
      fetchData();
    };

    traceCollector.on('trace:completed', handleTraceCompleted);
    slaMonitor.on('violation:created', handleViolation);
    violationTracker.on('violation:detected', handleViolation);

    return () => {
      traceCollector.off('trace:completed', handleTraceCompleted);
      slaMonitor.off('violation:created', handleViolation);
      violationTracker.off('violation:detected', handleViolation);
    };
  }, [traceCollector, slaMonitor, violationTracker, fetchData]);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Agent Observability</h1>
          <div className="flex items-center gap-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mt-4">
          <StatCard title="Total Traces" value={stats.totalTraces} color="blue" />
          <StatCard title="Active Traces" value={stats.activeTraces} color="green" />
          <StatCard title="Total Cost" value={`$${stats.totalCost.toFixed(2)}`} color="purple" />
          <StatCard title="SLA Violations" value={stats.activeSLAViolations} color="amber" />
          <StatCard title="Policy Violations" value={stats.activePolicyViolations} color="red" />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-6">
          <TabButton
            label="Traces"
            active={activeTab === 'traces'}
            onClick={() => setActiveTab('traces')}
          />
          <TabButton
            label="Cost Attribution"
            active={activeTab === 'costs'}
            onClick={() => setActiveTab('costs')}
          />
          <TabButton
            label="SLA Monitoring"
            active={activeTab === 'sla'}
            onClick={() => setActiveTab('sla')}
          />
          <TabButton
            label="Policy Violations"
            active={activeTab === 'violations'}
            onClick={() => setActiveTab('violations')}
          />
          <TabButton
            label="Performance"
            active={activeTab === 'performance'}
            onClick={() => setActiveTab('performance')}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'traces' && (
          <TracesView
            traces={traces}
            selectedTrace={selectedTrace}
            onSelectTrace={setSelectedTrace}
          />
        )}
        {activeTab === 'costs' && costData && (
          <CostView costData={costData} />
        )}
        {activeTab === 'sla' && (
          <SLAView violations={slaViolations} monitor={slaMonitor} />
        )}
        {activeTab === 'violations' && (
          <ViolationsView violations={policyViolations} tracker={violationTracker} />
        )}
        {activeTab === 'performance' && (
          <PerformanceView profiler={performanceProfiler} agentId={selectedAgent} />
        )}
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard: React.FC<{ title: string; value: string | number; color: string }> = ({
  title,
  value,
  color,
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
  };

  return (
    <div className={`${colorClasses[color as keyof typeof colorClasses]} rounded-lg p-4`}>
      <div className="text-sm font-medium opacity-80">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
};

// Tab Button Component
const TabButton: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({
  label,
  active,
  onClick,
}) => (
  <button
    onClick={onClick}
    className={`
      px-4 py-3 text-sm font-medium border-b-2 transition-colors
      ${active
        ? 'border-blue-600 text-blue-600'
        : 'border-transparent text-gray-600 hover:text-gray-900'
      }
    `}
  >
    {label}
  </button>
);

// Traces View Component
const TracesView: React.FC<{
  traces: AgentTrace[];
  selectedTrace: AgentTrace | null;
  onSelectTrace: (trace: AgentTrace | null) => void;
}> = ({ traces, selectedTrace, onSelectTrace }) => {
  if (selectedTrace) {
    return <TraceDetails trace={selectedTrace} onBack={() => onSelectTrace(null)} />;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Recent Traces</h2>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trace ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operation</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {traces.map((trace) => (
              <tr
                key={trace.traceId}
                onClick={() => onSelectTrace(trace)}
                className="hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-6 py-4 text-sm font-mono text-gray-900">
                  {trace.traceId.substring(0, 12)}...
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{trace.agentName}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{trace.operation}</td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {trace.duration ? `${trace.duration}ms` : '-'}
                </td>
                <td className="px-6 py-4 text-sm">
                  <StatusBadge status={trace.status} />
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  ${trace.totalCost.toFixed(4)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(trace.startTime).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Trace Details Component
const TraceDetails: React.FC<{ trace: AgentTrace; onBack: () => void }> = ({ trace, onBack }) => {
  const flameGraph = useMemo(() => TraceVisualization.toFlameGraph(trace), [trace]);
  const summary = useMemo(() => TraceVisualization.generateSummary(trace), [trace]);
  const waterfall = useMemo(() => TraceVisualization.toWaterfall(trace), [trace]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="text-blue-600 hover:text-blue-700">
          ← Back
        </button>
        <h2 className="text-xl font-semibold">Trace Details</h2>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Summary</h3>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-500">Total Spans</div>
            <div className="text-lg font-semibold">{summary.totalSpans}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Duration</div>
            <div className="text-lg font-semibold">{summary.totalDuration}ms</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Errors</div>
            <div className="text-lg font-semibold">{summary.errorCount}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Cost</div>
            <div className="text-lg font-semibold">${trace.totalCost.toFixed(4)}</div>
          </div>
        </div>
      </div>

      {/* Waterfall */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Waterfall</h3>
        <div className="space-y-2">
          {waterfall.map((span) => (
            <div
              key={span.id}
              className="flex items-center gap-2"
              style={{ paddingLeft: `${span.depth * 20}px` }}
            >
              <div className="flex-1 flex items-center gap-2">
                <div className="text-sm font-mono">{span.name}</div>
                <div className="text-xs text-gray-500">{span.type}</div>
              </div>
              <div className="text-sm text-gray-600">{span.duration}ms</div>
              <StatusBadge status={span.status as any} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Cost View Component
const CostView: React.FC<{ costData: CostAttribution }> = ({ costData }) => (
  <div className="space-y-6">
    <h2 className="text-xl font-semibold">Cost Attribution</h2>

    {/* Total Cost */}
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-3xl font-bold text-purple-600">${costData.total.toFixed(2)}</div>
      <div className="text-sm text-gray-500 mt-1">Total Cost</div>
    </div>

    {/* By Category */}
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">By Category</h3>
      <div className="space-y-3">
        {Object.entries(costData.byCategory).map(([category, cost]) => (
          <div key={category} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <div className="text-sm capitalize">{category}</div>
            </div>
            <div className="text-sm font-semibold">${cost.toFixed(4)}</div>
          </div>
        ))}
      </div>
    </div>

    {/* Top Agents */}
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Top Agents by Cost</h3>
      <div className="space-y-3">
        {Object.entries(costData.byAgent)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([agentId, cost]) => (
            <div key={agentId} className="flex items-center justify-between">
              <div className="text-sm font-mono">{agentId}</div>
              <div className="text-sm font-semibold">${cost.toFixed(4)}</div>
            </div>
          ))}
      </div>
    </div>
  </div>
);

// SLA View Component
const SLAView: React.FC<{ violations: SLAViolation[]; monitor: AgentSLAMonitor }> = ({
  violations,
  monitor,
}) => (
  <div className="space-y-6">
    <h2 className="text-xl font-semibold">SLA Monitoring</h2>

    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SLA</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Metric</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actual</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {violations.map((violation) => (
            <tr key={violation.id}>
              <td className="px-6 py-4 text-sm text-gray-900">{violation.slaName}</td>
              <td className="px-6 py-4 text-sm text-gray-900">{violation.metric}</td>
              <td className="px-6 py-4 text-sm text-gray-900">{violation.target}</td>
              <td className="px-6 py-4 text-sm text-gray-900">{violation.actual.toFixed(2)}</td>
              <td className="px-6 py-4 text-sm">
                <SeverityBadge severity={violation.severity} />
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {new Date(violation.timestamp).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// Violations View Component
const ViolationsView: React.FC<{
  violations: PolicyViolation[];
  tracker: PolicyViolationTracker;
}> = ({ violations, tracker }) => (
  <div className="space-y-6">
    <h2 className="text-xl font-semibold">Policy Violations</h2>

    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {violations.map((violation) => (
            <tr key={violation.id}>
              <td className="px-6 py-4 text-sm text-gray-900">{violation.type}</td>
              <td className="px-6 py-4 text-sm font-mono text-gray-900">{violation.agentId}</td>
              <td className="px-6 py-4 text-sm text-gray-900">{violation.description}</td>
              <td className="px-6 py-4 text-sm">
                <SeverityBadge severity={violation.severity} />
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {new Date(violation.timestamp).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// Performance View Component
const PerformanceView: React.FC<{
  profiler: AgentPerformanceProfiler;
  agentId: string | null;
}> = ({ profiler, agentId }) => (
  <div className="space-y-6">
    <h2 className="text-xl font-semibold">Performance Profiling</h2>
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-gray-500">Select an agent to view performance metrics</p>
    </div>
  </div>
);

// Status Badge Component
const StatusBadge: React.FC<{ status: 'success' | 'error' | 'timeout' | 'cancelled' }> = ({ status }) => {
  const colors = {
    success: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
    timeout: 'bg-amber-100 text-amber-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status]}`}>
      {status}
    </span>
  );
};

// Severity Badge Component
const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const colors = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-amber-100 text-amber-800',
    low: 'bg-blue-100 text-blue-800',
    info: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[severity as keyof typeof colors]}`}>
      {severity}
    </span>
  );
};

// Helper function to get time range timestamps
function getTimeRangeTimestamps(range: '1h' | '24h' | '7d' | '30d'): { start: number; end: number } {
  const end = Date.now();
  const ranges = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };
  return { start: end - ranges[range], end };
}

export default AgentObservabilityDashboard;
