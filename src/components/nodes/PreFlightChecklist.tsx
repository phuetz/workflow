/**
 * Pre-Flight Checklist - Safety Checks Display
 * Shows all pre-flight validation results
 */

import React from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Shield,
  Zap,
  DollarSign,
  Database,
  Key,
  Activity,
  Link,
} from 'lucide-react';
import { PreFlightCheck } from '../../types/simulation';

interface PreFlightChecklistProps {
  checks: PreFlightCheck[];
  onRetry?: () => void;
}

export const PreFlightChecklist: React.FC<PreFlightChecklistProps> = ({ checks, onRetry }) => {
  const categoryCounts = checks.reduce((acc, check) => {
    acc[check.category] = (acc[check.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const failedChecks = checks.filter(c => !c.passed);
  const criticalFailures = failedChecks.filter(c => c.severity === 'error');
  const warnings = failedChecks.filter(c => c.severity === 'warning');

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ReactNode> = {
      security: <Shield className="w-4 h-4" />,
      performance: <Zap className="w-4 h-4" />,
      cost: <DollarSign className="w-4 h-4" />,
      data: <Database className="w-4 h-4" />,
      credentials: <Key className="w-4 h-4" />,
      quota: <Activity className="w-4 h-4" />,
      integration: <Link className="w-4 h-4" />,
    };
    return icons[category] || <Info className="w-4 h-4" />;
  };

  const groupedChecks = checks.reduce((acc, check) => {
    if (!acc[check.category]) acc[check.category] = [];
    acc[check.category].push(check);
    return acc;
  }, {} as Record<string, PreFlightCheck[]>);

  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow-lg">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Pre-Flight Checklist</h2>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="p-3 bg-green-50 rounded-lg text-center">
            <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-green-600">
              {checks.filter(c => c.passed).length}
            </div>
            <div className="text-xs text-green-700">Passed</div>
          </div>
          <div className="p-3 bg-red-50 rounded-lg text-center">
            <XCircle className="w-5 h-5 text-red-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-red-600">{criticalFailures.length}</div>
            <div className="text-xs text-red-700">Critical</div>
          </div>
          <div className="p-3 bg-yellow-50 rounded-lg text-center">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-yellow-600">{warnings.length}</div>
            <div className="text-xs text-yellow-700">Warnings</div>
          </div>
        </div>

        {onRetry && failedChecks.length > 0 && (
          <button
            onClick={onRetry}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry Failed Checks
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.entries(groupedChecks).map(([category, categoryChecks]) => (
          <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
              {getCategoryIcon(category)}
              <span className="font-semibold text-gray-900 capitalize">{category}</span>
              <span className="ml-auto text-sm text-gray-600">
                {categoryChecks.filter(c => c.passed).length}/{categoryChecks.length}
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {categoryChecks.map(check => (
                <CheckItem key={check.id} check={check} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const CheckItem: React.FC<{ check: PreFlightCheck }> = ({ check }) => {
  const getIcon = () => {
    if (check.passed) {
      return <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />;
    }
    return check.severity === 'error' ? (
      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
    ) : check.severity === 'warning' ? (
      <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
    ) : (
      <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
    );
  };

  const getBgColor = () => {
    if (check.passed) return 'bg-white hover:bg-gray-50';
    return check.severity === 'error'
      ? 'bg-red-50 hover:bg-red-100'
      : check.severity === 'warning'
      ? 'bg-yellow-50 hover:bg-yellow-100'
      : 'bg-blue-50 hover:bg-blue-100';
  };

  return (
    <div className={`p-4 ${getBgColor()} transition-colors`}>
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900">{check.name}</h4>
          <p className="text-sm text-gray-600 mt-1">{check.message}</p>
          {check.fix && !check.passed && (
            <div className="mt-2 p-2 bg-white rounded border border-gray-200">
              <p className="text-xs text-gray-700">
                <span className="font-medium">Fix:</span> {check.fix}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
