/**
 * Violation Details Modal Component
 */

import React from 'react';
import { format } from 'date-fns';
import type { SLA, SLAViolation } from './types';

interface ViolationDetailsModalProps {
  violation: SLAViolation | null;
  slas: SLA[];
  onClose: () => void;
}

export function ViolationDetailsModal({
  violation,
  slas,
  onClose
}: ViolationDetailsModalProps) {
  if (!violation) return null;

  const sla = slas.find(s => s.id === violation.slaId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <h3 className="text-lg font-semibold mb-4">Violation Details</h3>

        <div className="space-y-3">
          <div>
            <div className="text-sm text-gray-600">SLA</div>
            <div className="font-medium">{sla?.name || 'Unknown SLA'}</div>
          </div>

          <div>
            <div className="text-sm text-gray-600">Timestamp</div>
            <div className="font-medium">
              {format(violation.timestamp, 'PPpp')}
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600">Value / Threshold</div>
            <div className="font-medium">
              {violation.value} / {violation.threshold}
            </div>
          </div>

          {violation.acknowledged && (
            <div>
              <div className="text-sm text-gray-600">Acknowledged</div>
              <div className="font-medium">
                By {violation.acknowledgedBy} at{' '}
                {violation.acknowledgedAt &&
                  format(violation.acknowledgedAt, 'PPp')
                }
              </div>
            </div>
          )}

          {violation.notes && (
            <div>
              <div className="text-sm text-gray-600">Notes</div>
              <div className="font-medium">{violation.notes}</div>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
