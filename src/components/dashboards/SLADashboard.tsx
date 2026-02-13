/**
 * SLA Dashboard - Main Component
 * Refactored to use extracted sub-components for maintainability
 */

import React, { useState } from 'react';
import { Target, AlertTriangle, Activity, FileText, BarChart } from 'lucide-react';
import {
  SLAOverview,
  SLAList,
  SLAViolations,
  SLAReports,
  SLACreateModal,
  ViolationDetailsModal,
  useSLAData,
  useSLACalculations,
  DEFAULT_FORM_DATA
} from './sla';
import type { SLA, SLAViolation, SLAFormData, TabType, TimeRangeOption } from './sla';

interface SLADashboardProps {
  workflowId?: string;
}

function SLADashboard({ workflowId }: SLADashboardProps) {
  // UI State
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRangeOption>('7d');
  const [selectedSLA, setSelectedSLA] = useState<SLA | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViolationDetails, setShowViolationDetails] = useState<SLAViolation | null>(null);
  const [formData, setFormData] = useState<SLAFormData>(DEFAULT_FORM_DATA);

  // Data hooks
  const {
    slas,
    slaStatuses,
    violations,
    reports,
    workflowMetrics,
    handleCreateSLA,
    toggleSLA,
    deleteSLA,
    acknowledgeViolation
  } = useSLAData({
    workflowId,
    selectedTimeRange,
    selectedSLA
  });

  // Calculations
  const {
    healthySLAs,
    warningSLAs,
    violatingSLAs,
    recentViolations
  } = useSLACalculations({ slas, slaStatuses, violations });

  // Handlers
  const handleFormChange = (updates: Partial<SLAFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSubmitSLA = async () => {
    const success = await handleCreateSLA(formData);
    if (success) {
      setShowCreateModal(false);
      setFormData(DEFAULT_FORM_DATA);
    }
  };

  const handleSelectSLA = (sla: SLA) => {
    setSelectedSLA(sla);
    setActiveTab('reports');
  };

  // Tab configuration
  const tabs: { key: TabType; icon: React.ReactNode; label: string }[] = [
    { key: 'overview', icon: <Activity className="w-4 h-4 inline mr-2" />, label: 'Overview' },
    { key: 'slas', icon: <Target className="w-4 h-4 inline mr-2" />, label: 'SLAs' },
    { key: 'violations', icon: <AlertTriangle className="w-4 h-4 inline mr-2" />, label: 'Violations' },
    { key: 'reports', icon: <FileText className="w-4 h-4 inline mr-2" />, label: 'Reports' },
    { key: 'metrics', icon: <BarChart className="w-4 h-4 inline mr-2" />, label: 'Metrics' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">SLA Monitoring</h2>
          <p className="text-gray-600">
            Monitor service level agreements and track performance metrics
          </p>
        </div>

        {/* Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex gap-2 bg-white p-2 rounded-lg shadow-sm">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded ${
                  activeTab === tab.key
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Time Range:</label>
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value as TimeRangeOption)}
              className="px-3 py-2 border rounded-lg bg-white"
            >
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {activeTab === 'overview' && (
            <SLAOverview
              slas={slas}
              healthySLAs={healthySLAs}
              warningSLAs={warningSLAs}
              violatingSLAs={violatingSLAs}
              slaStatusesSize={slaStatuses.size}
              violations={violations}
              recentViolations={recentViolations}
              workflowMetrics={workflowMetrics}
              onAcknowledgeViolation={acknowledgeViolation}
              onViewAllViolations={() => setActiveTab('violations')}
            />
          )}

          {activeTab === 'slas' && (
            <SLAList
              slas={slas}
              slaStatuses={slaStatuses}
              violations={violations}
              onCreateSLA={() => setShowCreateModal(true)}
              onSelectSLA={handleSelectSLA}
              onToggleSLA={toggleSLA}
              onDeleteSLA={deleteSLA}
            />
          )}

          {activeTab === 'violations' && (
            <SLAViolations
              slas={slas}
              violations={violations}
              onShowDetails={setShowViolationDetails}
              onAcknowledgeViolation={acknowledgeViolation}
            />
          )}

          {activeTab === 'reports' && (
            <SLAReports
              selectedSLA={selectedSLA}
              reports={reports}
            />
          )}

          {activeTab === 'metrics' && (
            <div className="text-center py-8 text-gray-500">
              <BarChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Detailed metrics view coming soon</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <SLACreateModal
        isOpen={showCreateModal}
        formData={formData}
        onFormChange={handleFormChange}
        onSubmit={handleSubmitSLA}
        onClose={() => setShowCreateModal(false)}
      />

      <ViolationDetailsModal
        violation={showViolationDetails}
        slas={slas}
        onClose={() => setShowViolationDetails(null)}
      />
    </div>
  );
}

export default SLADashboard;
