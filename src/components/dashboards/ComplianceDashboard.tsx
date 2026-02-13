/**
 * Compliance Dashboard
 * Visual dashboard for compliance monitoring and reporting
 */

import React, { useState, useEffect } from 'react';
import {
  ComplianceFramework,
  ComplianceDashboardData,
  ComplianceMetrics,
  ComplianceGap,
} from '../../types/compliance';

interface ComplianceDashboardProps {
  dashboardData?: ComplianceDashboardData;
  onFrameworkSelect?: (framework: ComplianceFramework) => void;
  onGapClick?: (gap: ComplianceGap) => void;
  onGenerateReport?: (framework: ComplianceFramework) => void;
}

export const ComplianceDashboard: React.FC<ComplianceDashboardProps> = ({
  dashboardData,
  onFrameworkSelect,
  onGapClick,
  onGenerateReport,
}) => {
  const [selectedFramework, setSelectedFramework] = useState<ComplianceFramework | null>(null);

  const handleFrameworkSelect = (framework: ComplianceFramework) => {
    setSelectedFramework(framework);
    onFrameworkSelect?.(framework);
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!dashboardData) {
    return (
      <div className="p-8 text-center">
        <div className="text-gray-500">Loading compliance data...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Compliance Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Monitor compliance across multiple frameworks
          </p>
        </div>

        {/* Overall Score */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-700">Overall Compliance Score</h2>
              <p className="text-sm text-gray-500">Across all enabled frameworks</p>
            </div>
            <div className={`text-5xl font-bold ${getScoreColor(dashboardData.overallComplianceScore)}`}>
              {dashboardData.overallComplianceScore.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Framework Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {dashboardData.frameworkMetrics?.map((metric: ComplianceMetrics) => (
            <div
              key={metric.framework}
              onClick={() => handleFrameworkSelect(metric.framework)}
              className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{metric.framework}</h3>
                <span className={`text-2xl font-bold ${getScoreColor(metric.complianceScore)}`}>
                  {metric.complianceScore.toFixed(0)}%
                </span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Controls:</span>
                  <span className="font-medium">{metric.totalControls}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Compliant:</span>
                  <span className="font-medium text-green-600">{metric.compliantControls}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Non-Compliant:</span>
                  <span className="font-medium text-red-600">{metric.nonCompliantControls}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Open Gaps:</span>
                  <span className="font-medium text-yellow-600">{metric.openGaps}</span>
                </div>
              </div>
              {onGenerateReport && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onGenerateReport(metric.framework);
                  }}
                  className="mt-3 w-full bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                  Generate Report
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Data Residency */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Data Residency</h3>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Region:</span>
              <span className="font-medium">{dashboardData.dataResidencyStatus?.region}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-gray-600">Status:</span>
              <span className={`font-medium ${dashboardData.dataResidencyStatus?.compliant ? 'text-green-600' : 'text-red-600'}`}>
                {dashboardData.dataResidencyStatus?.compliant ? 'Compliant' : 'Non-Compliant'}
              </span>
            </div>
          </div>

          {/* Retention Policies */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Retention Policies</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Active Records:</span>
                <span className="font-medium">{dashboardData.retentionPolicyStatus?.activeRecords || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Expiring Soon:</span>
                <span className="font-medium text-yellow-600">{dashboardData.retentionPolicyStatus?.expiringSoon || 0}</span>
              </div>
            </div>
          </div>

          {/* Privacy Metrics */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Privacy & Consent</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Active Consents:</span>
                <span className="font-medium">{dashboardData.privacyMetrics?.activeConsents || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pending DSRs:</span>
                <span className="font-medium text-yellow-600">{dashboardData.privacyMetrics?.pendingDSRs || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Open Gaps */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Open Compliance Gaps</h2>
            <p className="text-sm text-gray-500">Issues requiring attention</p>
          </div>
          <div className="divide-y divide-gray-200">
            {dashboardData.openGaps?.slice(0, 10).map((gap: ComplianceGap) => (
              <div
                key={gap.id}
                onClick={() => onGapClick?.(gap)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(gap.severity)}`}>
                        {gap.severity.toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{gap.framework}</span>
                      <span className="text-sm text-gray-500">{gap.controlId}</span>
                    </div>
                    <p className="text-sm text-gray-700">{gap.gapDescription}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Impact: {gap.impact} | Effort: {gap.estimatedEffort}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-gray-500">Priority {gap.priority}</div>
                    {gap.assignedTo && (
                      <div className="text-xs text-gray-400 mt-1">Assigned to: {gap.assignedTo}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        {dashboardData.alerts && dashboardData.alerts.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Alerts</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {dashboardData.alerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(alert.severity)}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-gray-700">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {alert.timestamp.toLocaleString()}
                        {alert.framework && ` | ${alert.framework}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplianceDashboard;
