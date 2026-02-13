/**
 * SLA Reports Tab Component
 */

import React from 'react';
import { FileText, Download, Target } from 'lucide-react';
import { format } from 'date-fns';
import type { SLA, SLAReport } from './types';

interface SLAReportsProps {
  selectedSLA: SLA | null;
  reports: SLAReport[];
}

export function SLAReports({ selectedSLA, reports }: SLAReportsProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">SLA Reports</h3>
        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Generate Report
        </button>
      </div>

      {selectedSLA ? (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-700">
              Showing reports for: <strong>{selectedSLA.name}</strong>
            </div>
          </div>

          {reports.length === 0 ? (
            <div className="bg-white border rounded-lg p-8 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No reports generated yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {reports.map(report => (
                <SLAReportCard key={report.id} report={report} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border rounded-lg p-8 text-center text-gray-500">
          <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Select an SLA from the SLAs tab to view its reports</p>
        </div>
      )}
    </div>
  );
}

interface SLAReportCardProps {
  report: SLAReport;
}

function SLAReportCard({ report }: SLAReportCardProps) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium">
          {format(report.period.start, 'PP')} - {format(report.period.end, 'PP')}
        </h4>
        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded">
          <Download className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-gray-600">Uptime</div>
          <div className="font-medium">{report.summary.uptime.toFixed(2)}%</div>
        </div>
        <div>
          <div className="text-gray-600">Violations</div>
          <div className="font-medium">{report.summary.violations}</div>
        </div>
        <div>
          <div className="text-gray-600">MTTR</div>
          <div className="font-medium">
            {(report.summary.mttr / 1000 / 60).toFixed(1)} min
          </div>
        </div>
        <div>
          <div className="text-gray-600">Performance</div>
          <div className="font-medium">{report.summary.performance.toFixed(1)}%</div>
        </div>
      </div>

      {report.recommendations.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <div className="text-sm font-medium mb-1">Recommendations</div>
          <ul className="text-xs text-gray-600 space-y-1">
            {report.recommendations.slice(0, 2).map((rec, idx) => (
              <li key={idx}>- {rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
