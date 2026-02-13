/**
 * SLA List Tab Component - Table of all SLAs
 */

import React from 'react';
import { Plus, BarChart, Play, Pause, Trash2, Check, AlertTriangle, X, Info } from 'lucide-react';
import { formatDistance } from 'date-fns';
import type { SLA, SLAStatus, SLAViolation, StatusType } from './types';
import { getStatusColor } from './useSLACalculations';

interface SLAListProps {
  slas: SLA[];
  slaStatuses: Map<string, SLAStatus>;
  violations: SLAViolation[];
  onCreateSLA: () => void;
  onSelectSLA: (sla: SLA) => void;
  onToggleSLA: (sla: SLA) => void;
  onDeleteSLA: (sla: SLA) => void;
}

export function SLAList({
  slas,
  slaStatuses,
  violations,
  onCreateSLA,
  onSelectSLA,
  onToggleSLA,
  onDeleteSLA
}: SLAListProps) {
  const getStatusIcon = (status: StatusType) => {
    switch (status) {
      case 'healthy': return <Check className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'violation': return <X className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Service Level Agreements</h3>
        <button
          onClick={onCreateSLA}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create SLA
        </button>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Targets</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Uptime</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Violations</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Last Checked</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {slas.map((sla, index) => {
              const status = slaStatuses.get(sla.id);
              return (
                <tr key={sla.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium">{sla.name}</div>
                      {sla.description && (
                        <div className="text-sm text-gray-600">{sla.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {status ? (
                      <div className="flex items-center gap-2">
                        {getStatusIcon(status.status)}
                        <span className={`text-sm ${getStatusColor(status.status)}`}>
                          {status.status}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">
                        {sla.enabled ? 'Loading...' : 'Disabled'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      {sla.targets.length} target{sla.targets.length !== 1 ? 's' : ''}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      {status ? `${status.uptime.toFixed(1)}%` : '-'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      {violations.filter(v => v.slaId === sla.id).length}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-600">
                      {status ? formatDistance(status.lastChecked, new Date(), { addSuffix: true }) : '-'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onSelectSLA(sla)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                        title="View details"
                      >
                        <BarChart className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onToggleSLA(sla)}
                        className={`p-2 rounded ${
                          sla.enabled
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        title={sla.enabled ? 'Disable' : 'Enable'}
                      >
                        {sla.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => onDeleteSLA(sla)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
