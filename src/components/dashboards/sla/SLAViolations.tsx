/**
 * SLA Violations Tab Component
 */

import React from 'react';
import { Check } from 'lucide-react';
import { format, formatDistance } from 'date-fns';
import type { SLA, SLAViolation } from './types';
import { getSeverityBadge } from './useSLACalculations';

interface SLAViolationsProps {
  slas: SLA[];
  violations: SLAViolation[];
  onShowDetails: (violation: SLAViolation) => void;
  onAcknowledgeViolation: (violation: SLAViolation) => void;
}

export function SLAViolations({
  slas,
  violations,
  onShowDetails,
  onAcknowledgeViolation
}: SLAViolationsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">SLA Violations</h3>

      <div className="bg-white border rounded-lg overflow-hidden">
        {violations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Check className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No violations in the selected time range</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">SLA</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Timestamp</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Severity</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Value</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Duration</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {violations.map((violation, index) => {
                const sla = slas.find(s => s.id === violation.slaId);
                return (
                  <tr key={violation.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm">{sla?.name || 'Unknown'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">{format(violation.timestamp, 'PPp')}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${getSeverityBadge(violation.severity)}`}>
                        {violation.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        {violation.value} / {violation.threshold}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        {violation.duration > 0
                          ? formatDistance(0, violation.duration, { includeSeconds: true })
                          : 'Ongoing'
                        }
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {violation.resolved ? (
                          <span className="text-sm text-green-600">Resolved</span>
                        ) : (
                          <span className="text-sm text-red-600">Active</span>
                        )}
                        {violation.acknowledged && (
                          <span className="text-sm text-gray-600">(Ack)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onShowDetails(violation)}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          Details
                        </button>
                        {!violation.acknowledged && (
                          <button
                            onClick={() => onAcknowledgeViolation(violation)}
                            className="text-sm text-green-600 hover:underline"
                          >
                            Acknowledge
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
