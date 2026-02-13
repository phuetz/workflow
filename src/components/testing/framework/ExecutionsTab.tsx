import React from 'react';
import { Clock } from 'lucide-react';
import { ExecutionsTabProps } from './types';
import { StatusIcon, getStatusColor } from './StatusIcon';

export function ExecutionsTab({ darkMode, testCases, executions }: ExecutionsTabProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Test Executions</h3>

      <div
        className={`overflow-x-auto rounded-lg ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } border`}
      >
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left p-4">Test Case</th>
              <th className="text-left p-4">Status</th>
              <th className="text-left p-4">Duration</th>
              <th className="text-left p-4">Environment</th>
              <th className="text-left p-4">Started</th>
              <th className="text-left p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {executions.map((execution, index) => {
              const testCase = testCases.find(t => t.id === execution.testCaseId);
              return (
                <tr
                  key={index}
                  className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="p-4">
                    <div>
                      <p className="font-medium">{testCase?.name || 'Unknown Test'}</p>
                      <p className="text-sm text-gray-500">{execution.testCaseId}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <StatusIcon
                        status={execution.status}
                        className={`${getStatusColor(execution.status).split(' ')[0]}`}
                        size={16}
                      />
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${getStatusColor(execution.status)}`}
                      >
                        {execution.status}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-sm">{execution.duration}ms</span>
                  </td>
                  <td className="p-4">
                    <span className="text-sm">{execution.environment}</span>
                  </td>
                  <td className="p-4">
                    <span className="text-sm">{execution.startTime.toLocaleString()}</span>
                  </td>
                  <td className="p-4">
                    <button className="text-blue-500 hover:text-blue-600 text-sm">
                      View Details
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {executions.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Clock size={48} className="mx-auto mb-3 opacity-50" />
            <p>No test executions yet</p>
            <p className="text-sm mt-1">Run some tests to see execution history</p>
          </div>
        )}
      </div>
    </div>
  );
}
