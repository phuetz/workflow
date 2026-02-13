import React from 'react';
import { CheckCircle, Play, Plus, Target, TestTube, TrendingUp } from 'lucide-react';
import { TestsTabProps } from './types';
import { TestCard } from './TestCard';

export function TestsTab({
  darkMode,
  testCases,
  executions,
  isRunningTest,
  onCreateTest,
  onRunTest,
  onRunAllTests,
  onSelectTest,
  onEditTest,
  selectedTest
}: TestsTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Test Cases</h3>
          <p className="text-sm text-gray-500">Manage and execute your test cases</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onCreateTest}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>Create Test</span>
          </button>
          <button
            onClick={onRunAllTests}
            disabled={isRunningTest}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center space-x-2 disabled:opacity-50"
          >
            <Play size={16} />
            <span>Run All</span>
          </button>
        </div>
      </div>

      {/* Test Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          darkMode={darkMode}
          label="Total Tests"
          value={testCases.length}
          icon={<TestTube className="text-blue-500" size={24} />}
        />
        <StatCard
          darkMode={darkMode}
          label="Enabled"
          value={testCases.filter(t => t.enabled).length}
          valueColor="text-green-500"
          icon={<CheckCircle className="text-green-500" size={24} />}
        />
        <StatCard
          darkMode={darkMode}
          label="Last Run"
          value={executions.filter(e => e.status === 'passed').length}
          subLabel="passed"
          valueColor="text-blue-500"
          icon={<TrendingUp className="text-blue-500" size={24} />}
        />
        <StatCard
          darkMode={darkMode}
          label="Success Rate"
          value={
            executions.length > 0
              ? `${Math.round((executions.filter(e => e.status === 'passed').length * 100) / executions.length)}%`
              : '0%'
          }
          valueColor="text-green-500"
          icon={<Target className="text-green-500" size={24} />}
        />
      </div>

      {/* Test Cases List */}
      <div className="grid grid-cols-1 gap-4">
        {testCases.map(test => (
          <TestCard
            key={test.id}
            test={test}
            darkMode={darkMode}
            isSelected={selectedTest?.id === test.id}
            isRunningTest={isRunningTest}
            onSelect={onSelectTest}
            onRunTest={onRunTest}
            onEditTest={onEditTest}
          />
        ))}
        {testCases.length === 0 && (
          <div className="text-center py-12">
            <TestTube size={64} className="mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">No Test Cases Yet</h3>
            <p className="text-gray-500 mb-4">Create your first test case to start testing your workflows</p>
            <button
              onClick={onCreateTest}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Create First Test
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  darkMode: boolean;
  label: string;
  value: number | string;
  subLabel?: string;
  valueColor?: string;
  icon: React.ReactNode;
}

function StatCard({ darkMode, label, value, subLabel, valueColor, icon }: StatCardProps) {
  return (
    <div
      className={`p-4 rounded-lg ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } border`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className={`text-2xl font-bold ${valueColor || ''}`}>{value}</p>
          {subLabel && <p className="text-xs text-gray-500">{subLabel}</p>}
        </div>
        {icon}
      </div>
    </div>
  );
}
