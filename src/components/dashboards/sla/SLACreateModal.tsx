/**
 * SLA Create Modal Component
 */

import React from 'react';
import type {
  SLAFormData,
  MetricType,
  AggregationType,
  ComparisonOperator,
  MetricUnit,
  TimeUnit,
  CriticalityLevel,
  ReportFrequency
} from './types';

interface SLACreateModalProps {
  isOpen: boolean;
  formData: SLAFormData;
  onFormChange: (updates: Partial<SLAFormData>) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function SLACreateModal({
  isOpen,
  formData,
  onFormChange,
  onSubmit,
  onClose
}: SLACreateModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Create New SLA</h3>

        <div className="space-y-4">
          {/* Basic Info */}
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => onFormChange({ name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="e.g., API Response Time SLA"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => onFormChange({ description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Describe what this SLA monitors..."
            />
          </div>

          {/* Target Configuration */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Target Configuration</h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Metric Type</label>
                <select
                  value={formData.metric}
                  onChange={(e) => onFormChange({ metric: e.target.value as MetricType })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="response_time">Response Time</option>
                  <option value="availability">Availability</option>
                  <option value="throughput">Throughput</option>
                  <option value="error_rate">Error Rate</option>
                  <option value="success_rate">Success Rate</option>
                  <option value="execution_time">Execution Time</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Aggregation</label>
                <select
                  value={formData.aggregation}
                  onChange={(e) => onFormChange({ aggregation: e.target.value as AggregationType })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="avg">Average</option>
                  <option value="sum">Sum</option>
                  <option value="min">Minimum</option>
                  <option value="max">Maximum</option>
                  <option value="p50">P50 (Median)</option>
                  <option value="p90">P90</option>
                  <option value="p95">P95</option>
                  <option value="p99">P99</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1">Operator</label>
                <select
                  value={formData.operator}
                  onChange={(e) => onFormChange({ operator: e.target.value as ComparisonOperator })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="<">Less than</option>
                  <option value="<=">Less than or equal</option>
                  <option value=">">Greater than</option>
                  <option value=">=">Greater than or equal</option>
                  <option value="=">Equal to</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Threshold</label>
                <input
                  type="number"
                  value={formData.threshold}
                  onChange={(e) => onFormChange({ threshold: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Unit</label>
                <select
                  value={formData.unit}
                  onChange={(e) => onFormChange({ unit: e.target.value as MetricUnit })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="milliseconds">Milliseconds</option>
                  <option value="seconds">Seconds</option>
                  <option value="minutes">Minutes</option>
                  <option value="percentage">Percentage</option>
                  <option value="count">Count</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1">Time Window</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={formData.windowDuration}
                    onChange={(e) => onFormChange({ windowDuration: Number(e.target.value) })}
                    className="flex-1 px-3 py-2 border rounded-lg"
                  />
                  <select
                    value={formData.windowUnit}
                    onChange={(e) => onFormChange({ windowUnit: e.target.value as TimeUnit })}
                    className="px-3 py-2 border rounded-lg"
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Criticality</label>
                <select
                  value={formData.criticality}
                  onChange={(e) => onFormChange({ criticality: e.target.value as CriticalityLevel })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
          </div>

          {/* Schedule & Notifications */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Schedule & Notifications</h4>

            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.alertingEnabled}
                  onChange={(e) => onFormChange({ alertingEnabled: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Enable alerting for violations</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.reportingEnabled}
                  onChange={(e) => onFormChange({ reportingEnabled: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Enable automatic reporting</span>
              </label>

              {formData.reportingEnabled && (
                <div>
                  <label className="block text-sm font-medium mb-1">Report Frequency</label>
                  <select
                    value={formData.reportFrequency}
                    onChange={(e) => onFormChange({ reportFrequency: e.target.value as ReportFrequency })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Create SLA
          </button>
        </div>
      </div>
    </div>
  );
}
