/**
 * Governance Dashboard - Enterprise Governance UI
 * Comprehensive dashboard for agent governance and compliance monitoring
 */

import React, { useState, useEffect } from 'react';
import { PolicyEngine } from '../../governance/PolicyEngine';
import { RiskEvaluator } from '../../governance/RiskEvaluator';
import { PromptInjectionShield } from '../../governance/PromptInjectionShield';
import { PIIDetector } from '../../governance/PIIDetector';
import { AgentIdentityManager } from '../../governance/AgentIdentityManager';
import { TaskAdherenceMonitor } from '../../governance/TaskAdherenceMonitor';
import type { GovernanceSummary, PolicyViolation, RiskScore } from '../../governance/types/governance';

/**
 * Governance Dashboard Props
 */
interface GovernanceDashboardProps {
  policyEngine: PolicyEngine;
  riskEvaluator: RiskEvaluator;
  identityManager: AgentIdentityManager;
  adherenceMonitor: TaskAdherenceMonitor;
  injectionShield: PromptInjectionShield;
  piiDetector: PIIDetector;
}

/**
 * Governance Dashboard Component
 */
export const GovernanceDashboard: React.FC<GovernanceDashboardProps> = ({
  policyEngine,
  riskEvaluator,
  identityManager,
  adherenceMonitor,
  injectionShield,
  piiDetector,
}) => {
  const [summary, setSummary] = useState<GovernanceSummary | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'policies' | 'risk' | 'compliance' | 'security'>('overview');
  const [refreshing, setRefreshing] = useState(false);

  // Load summary data
  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    setRefreshing(true);
    try {
      const policyStats = policyEngine.getStatistics();
      const riskStats = riskEvaluator.getStatistics();
      const identityStats = identityManager.getStatistics();
      const adherenceStats = adherenceMonitor.getStatistics();
      const piiStats = piiDetector.getStatistics();
      const injectionStats = injectionShield.getStatistics();

      const summary: GovernanceSummary = {
        totalAgents: identityStats.totalAgents,
        activeAgents: identityStats.agentsByStatus.active,
        suspendedAgents: identityStats.agentsByStatus.suspended,
        totalPolicies: policyStats.policies.total,
        activePolicies: policyStats.policies.enabled,
        policyViolations: policyStats.violations.total,
        criticalViolations: policyStats.violations.bySeverity.critical,
        averageRiskScore: riskStats.avgRiskScore,
        complianceScore: policyEngine.getPolicyComplianceScore(),
        piiDetections: piiStats.totalDetections,
        promptInjections: injectionStats.totalDetections,
      };

      setSummary(summary);
    } finally {
      setRefreshing(false);
    }
  };

  if (!summary) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading governance data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Agent Governance</h1>
              <p className="mt-1 text-sm text-gray-500">Enterprise-grade governance and compliance monitoring</p>
            </div>
            <button
              onClick={loadSummary}
              disabled={refreshing}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {(['overview', 'policies', 'risk', 'compliance', 'security'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === tab
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedTab === 'overview' && <OverviewTab summary={summary} />}
        {selectedTab === 'policies' && <PoliciesTab policyEngine={policyEngine} />}
        {selectedTab === 'risk' && <RiskTab riskEvaluator={riskEvaluator} summary={summary} />}
        {selectedTab === 'compliance' && <ComplianceTab summary={summary} />}
        {selectedTab === 'security' && <SecurityTab injectionShield={injectionShield} piiDetector={piiDetector} />}
      </main>
    </div>
  );
};

/**
 * Overview Tab
 */
const OverviewTab: React.FC<{ summary: GovernanceSummary }> = ({ summary }) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRiskColor = (score: number) => {
    if (score < 25) return 'text-green-600';
    if (score < 50) return 'text-yellow-600';
    if (score < 75) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Compliance Score"
          value={`${summary.complianceScore.toFixed(1)}%`}
          change="+2.5%"
          trend="up"
          color={getScoreColor(summary.complianceScore)}
        />
        <MetricCard
          title="Risk Score"
          value={`${summary.averageRiskScore.toFixed(1)}/100`}
          change="-5.2%"
          trend="down"
          color={getRiskColor(summary.averageRiskScore)}
        />
        <MetricCard
          title="Active Agents"
          value={summary.activeAgents.toString()}
          subtitle={`${summary.suspendedAgents} suspended`}
        />
        <MetricCard
          title="Policy Violations"
          value={summary.policyViolations.toString()}
          subtitle={`${summary.criticalViolations} critical`}
          color={summary.criticalViolations > 0 ? 'text-red-600' : 'text-gray-900'}
        />
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Governance Health */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Governance Health</h3>
            <div className="space-y-3">
              <ProgressBar label="Compliance" value={summary.complianceScore} max={100} />
              <ProgressBar label="Policy Coverage" value={(summary.activePolicies / summary.totalPolicies) * 100} max={100} />
              <ProgressBar label="Agent Health" value={(summary.activeAgents / summary.totalAgents) * 100} max={100} />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Security Overview</h3>
            <div className="space-y-3">
              <StatRow label="PII Detections (24h)" value={summary.piiDetections} />
              <StatRow label="Prompt Injections (24h)" value={summary.promptInjections} />
              <StatRow label="Active Policies" value={summary.activePolicies} />
              <StatRow label="Total Agents" value={summary.totalAgents} />
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {summary.criticalViolations > 0 && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Critical Violations Detected</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{summary.criticalViolations} critical policy violation(s) require immediate attention.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Policies Tab
 */
const PoliciesTab: React.FC<{ policyEngine: PolicyEngine }> = ({ policyEngine }) => {
  const policies = policyEngine.getAllPolicies();
  const violations = policyEngine.getViolations();
  const stats = policyEngine.getStatistics();

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <MetricCard title="Total Policies" value={stats.policies.total.toString()} />
        <MetricCard title="Enabled Policies" value={stats.policies.enabled.toString()} />
        <MetricCard title="Total Violations" value={stats.violations.total.toString()} />
      </div>

      {/* Policies List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Active Policies</h3>
        </div>
        <ul className="divide-y divide-gray-200">
          {policies.slice(0, 10).map((policy) => (
            <li key={policy.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-indigo-600 truncate">{policy.name}</p>
                  <p className="mt-1 text-sm text-gray-500">{policy.description}</p>
                  <div className="mt-2 flex items-center space-x-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      policy.severity === 'critical' ? 'bg-red-100 text-red-800' :
                      policy.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                      policy.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {policy.severity}
                    </span>
                    <span className="text-sm text-gray-500">{policy.category}</span>
                    <span className={`text-sm ${policy.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                      {policy.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

/**
 * Risk Tab
 */
const RiskTab: React.FC<{ riskEvaluator: RiskEvaluator; summary: GovernanceSummary }> = ({ riskEvaluator, summary }) => {
  const stats = riskEvaluator.getStatistics();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <MetricCard title="Avg Risk Score" value={`${stats.avgRiskScore.toFixed(1)}/100`} />
        <MetricCard title="High-Risk Agents" value={stats.highRiskAgents.toString()} color="text-red-600" />
        <MetricCard title="Total Evaluations" value={stats.totalEvaluations.toString()} />
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Distribution</h3>
        <div className="space-y-3">
          <ProgressBar label="Data Access Risk" value={45} max={100} color="bg-yellow-500" />
          <ProgressBar label="External API Risk" value={30} max={100} color="bg-green-500" />
          <ProgressBar label="PII Exposure Risk" value={60} max={100} color="bg-orange-500" />
          <ProgressBar label="Compliance Risk" value={25} max={100} color="bg-green-500" />
        </div>
      </div>
    </div>
  );
};

/**
 * Compliance Tab
 */
const ComplianceTab: React.FC<{ summary: GovernanceSummary }> = ({ summary }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <MetricCard title="Compliance Score" value={`${summary.complianceScore.toFixed(1)}%`} />
        <MetricCard title="Active Policies" value={`${summary.activePolicies}/${summary.totalPolicies}`} />
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Framework Compliance</h3>
        <div className="space-y-4">
          <FrameworkStatus name="SOC2" score={95} />
          <FrameworkStatus name="ISO 27001" score={92} />
          <FrameworkStatus name="HIPAA" score={88} />
          <FrameworkStatus name="GDPR" score={97} />
        </div>
      </div>
    </div>
  );
};

/**
 * Security Tab
 */
const SecurityTab: React.FC<{ injectionShield: PromptInjectionShield; piiDetector: PIIDetector }> = ({
  injectionShield,
  piiDetector,
}) => {
  const injectionStats = injectionShield.getStatistics();
  const piiStats = piiDetector.getStatistics();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <MetricCard title="Prompt Injections" value={injectionStats.totalDetections.toString()} />
        <MetricCard title="Block Rate" value={`${injectionStats.blockRate.toFixed(1)}%`} />
        <MetricCard title="PII Detections" value={piiStats.totalDetections.toString()} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Injection Patterns</h3>
          <div className="space-y-2">
            {Object.entries(injectionStats.patternsByType).map(([type, count]) => (
              <StatRow key={type} label={type.replace(/_/g, ' ')} value={count} />
            ))}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">PII Types Detected</h3>
          <div className="space-y-2">
            {Object.entries(piiStats.patternsByType).slice(0, 8).map(([type, count]) => (
              <StatRow key={type} label={type} value={count} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Helper Components
 */
interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  change?: string;
  trend?: 'up' | 'down';
  color?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, change, trend, color = 'text-gray-900' }) => (
  <div className="bg-white overflow-hidden shadow rounded-lg">
    <div className="px-4 py-5 sm:p-6">
      <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
      <dd className="mt-1 flex items-baseline justify-between">
        <div className={`text-3xl font-semibold ${color}`}>{value}</div>
        {change && (
          <div className={`inline-flex items-baseline px-2.5 py-0.5 rounded-full text-sm font-medium ${
            trend === 'up' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {change}
          </div>
        )}
      </dd>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>
  </div>
);

const ProgressBar: React.FC<{ label: string; value: number; max: number; color?: string }> = ({
  label,
  value,
  max,
  color = 'bg-indigo-600',
}) => {
  const percentage = (value / max) * 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-500">{value.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all duration-300`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};

const StatRow: React.FC<{ label: string; value: number | string }> = ({ label, value }) => (
  <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
    <span className="text-sm text-gray-600 capitalize">{label}</span>
    <span className="text-sm font-medium text-gray-900">{value}</span>
  </div>
);

const FrameworkStatus: React.FC<{ name: string; score: number }> = ({ name, score }) => (
  <div className="flex items-center justify-between">
    <div className="flex-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">{name}</span>
        <span className={`text-sm font-medium ${
          score >= 95 ? 'text-green-600' : score >= 80 ? 'text-yellow-600' : 'text-red-600'
        }`}>
          {score}%
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${
            score >= 95 ? 'bg-green-500' : score >= 80 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  </div>
);

export default GovernanceDashboard;
