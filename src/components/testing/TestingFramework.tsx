import React, { useState } from 'react';
import { BarChart3, Layers, Play, Server, TestTube, X } from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import {
  useTestingFramework,
  TestBuilder,
  TestsTab,
  ExecutionsTab,
  TabId,
  TabConfig,
  TestCase
} from './framework';

interface TestingFrameworkProps {
  isOpen: boolean;
  onClose: () => void;
}

const TABS: TabConfig[] = [
  { id: 'tests', label: 'Test Cases', icon: TestTube },
  { id: 'suites', label: 'Test Suites', icon: Layers },
  { id: 'executions', label: 'Executions', icon: Play },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'environments', label: 'Environments', icon: Server }
];

export default function TestingFramework({ isOpen, onClose }: TestingFrameworkProps) {
  const { darkMode, workflows: workflowsObject } = useWorkflowStore();
  const workflows = Object.values(workflowsObject || {});
  const [activeTab, setActiveTab] = useState<TabId>('tests');

  const {
    testCases,
    executions,
    selectedTest,
    isCreatingTest,
    isRunningTest,
    isLoading,
    setSelectedTest,
    setIsCreatingTest,
    runTest,
    runAllTests,
    saveTestCase
  } = useTestingFramework(isOpen);

  const handleCreateTest = () => {
    setSelectedTest(null);
    setIsCreatingTest(true);
  };

  const handleEditTest = (test: TestCase) => {
    setSelectedTest(test);
    setIsCreatingTest(true);
  };

  const handleCloseBuilder = () => {
    setIsCreatingTest(false);
    setSelectedTest(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className={`w-full max-w-7xl max-h-[90vh] ${
          darkMode ? 'bg-gray-900' : 'bg-white'
        } rounded-xl shadow-2xl overflow-hidden`}
      >
        {/* Header */}
        <Header darkMode={darkMode} onClose={onClose} />

        {/* Tabs */}
        <TabNavigation
          darkMode={darkMode}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ height: 'calc(90vh - 160px)' }}>
          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <>
              {activeTab === 'tests' && (
                <TestsTab
                  darkMode={darkMode}
                  testCases={testCases}
                  executions={executions}
                  isRunningTest={isRunningTest}
                  onCreateTest={handleCreateTest}
                  onRunTest={runTest}
                  onRunAllTests={runAllTests}
                  onSelectTest={setSelectedTest}
                  onEditTest={handleEditTest}
                  selectedTest={selectedTest}
                />
              )}
              {activeTab === 'executions' && (
                <ExecutionsTab
                  darkMode={darkMode}
                  testCases={testCases}
                  executions={executions}
                />
              )}
              {activeTab === 'suites' && <PlaceholderTab title="Test Suites" />}
              {activeTab === 'reports' && <PlaceholderTab title="Reports" />}
              {activeTab === 'environments' && <PlaceholderTab title="Environments" />}
            </>
          )}
        </div>
      </div>

      {/* Test Builder Modal */}
      {isCreatingTest && (
        <TestBuilder
          darkMode={darkMode}
          selectedTest={selectedTest}
          workflows={workflows}
          onClose={handleCloseBuilder}
          onSave={saveTestCase}
        />
      )}
    </div>
  );
}

interface HeaderProps {
  darkMode: boolean;
  onClose: () => void;
}

function Header({ darkMode, onClose }: HeaderProps) {
  return (
    <div
      className={`px-6 py-4 border-b ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
            <TestTube className="text-white" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold">Testing Framework</h2>
            <p className="text-sm text-gray-500">Automated testing for your workflows</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className={`p-2 rounded-lg transition-colors ${
            darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
          }`}
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}

interface TabNavigationProps {
  darkMode: boolean;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

function TabNavigation({ darkMode, activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className={`flex border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 transition-colors ${
            activeTab === tab.id
              ? darkMode
                ? 'bg-gray-800 text-purple-400 border-b-2 border-purple-400'
                : 'bg-gray-50 text-purple-600 border-b-2 border-purple-600'
              : darkMode
              ? 'text-gray-400 hover:text-gray-200'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <tab.icon size={18} />
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
    </div>
  );
}

interface PlaceholderTabProps {
  title: string;
}

function PlaceholderTab({ title }: PlaceholderTabProps) {
  return (
    <div className="text-center py-12 text-gray-500">
      <p>{title} - Coming soon</p>
    </div>
  );
}
