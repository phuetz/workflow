/**
 * Workflow Testing Component
 * UI for creating and running workflow tests
 */

import React, { useState, useEffect /*, useCallback */ } from 'react';
import {
  Play,
  /* Pause, */
  /* RotateCcw, */
  CheckCircle,
  XCircle,
  AlertCircle,
  /* FileText, */
  /* Download, */
  /* Upload, */
  Plus,
  Trash2,
  Edit,
  Eye,
  Bug,
  /* Zap, */
  /* BarChart3, */
  Clock,
  /* Code */
} from 'lucide-react';
import { workflowTesting } from '../../services/WorkflowTestingService';
import { useWorkflowStore } from '../../store/workflowStore';
import { useToast } from '../ui/Toast';
import type {
  WorkflowTestCase,
  WorkflowTestResult,
  TestAssertion,
  TestStatus,
  TestReport
} from '../../types/testing';

interface WorkflowTestingProps {
  workflowId: string;
  onClose?: () => void;
}

export const WorkflowTesting: React.FC<WorkflowTestingProps> = ({
  workflowId,
  onClose
}) => {
  const toast = useToast();
  const [testCases, setTestCases] = useState<WorkflowTestCase[]>([]);
  const [_selectedTest, setSelectedTest] = useState<WorkflowTestCase | null>(null); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [testResults, setTestResults] = useState<Map<string, WorkflowTestResult>>(new Map());
  const [isRunning, setIsRunning] = useState(false);
  const [showCreateTest, setShowCreateTest] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [currentReport, setCurrentReport] = useState<TestReport | null>(null);
  
  // Form state for creating tests
  const [testForm, setTestForm] = useState({
    name: '',
    description: '',
    input: '{}',
    expectedOutput: '',
    assertions: [] as TestAssertion[]
  });

  const { nodes: _nodes, edges: _edges } = useWorkflowStore(); // eslint-disable-line @typescript-eslint/no-unused-vars

  // Load existing test cases
  useEffect(() => {
    loadTestCases();
  }, [workflowId]);

  const loadTestCases = () => {
    // In a real app, this would load from backend
    const mockTestCases: WorkflowTestCase[] = [
      {
        id: 'test-1',
        name: 'Basic Flow Test',
        description: 'Tests the basic workflow execution',
        workflowId,
        input: { message: 'Hello World' },
        expectedOutput: { processed: true },
        assertions: [
          {
            type: 'output',
            description: 'Output should be processed',
            operator: 'deep_equals',
            expected: { processed: true }
          }
        ],
        timeout: 5000,
        tags: ['smoke', 'basic'],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    setTestCases(mockTestCases);
  };

  // Create new test case
  const createTestCase = () => {
    try {
      const input = JSON.parse(testForm.input);
      const expectedOutput = testForm.expectedOutput
        ? JSON.parse(testForm.expectedOutput)
        : undefined;

      const newTestCase: WorkflowTestCase = {
        id: `test-${Date.now()}`,
        name: testForm.name,
        description: testForm.description,
        workflowId,
        input,
        expectedOutput,
        assertions: testForm.assertions,
        tags: [],
        timeout: 5000,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      setTestCases([...testCases, newTestCase]);
      setShowCreateTest(false);
      resetTestForm();
    } catch {
      toast.error('Invalid JSON in input or expected output');
    }
  };

  // Run single test
  const runTest = async (testCase: WorkflowTestCase) => {
    setIsRunning(true);
    try {
      const result = await workflowTesting.executeTest(testCase, {
        coverage: true,
        debug: false
      });

      setTestResults(prev => {
        const next = new Map(prev);
        next.set(testCase.id, result);
        return next;
      });

      // Test results are handled in UI, no console logging needed
    } catch {
      // Error handling for test execution
    } finally {
      setIsRunning(false);
    }
  };

  // Run all tests
  const runAllTests = async () => {
    setIsRunning(true);
    try {
      const report = await workflowTesting.executeTestSuite(testCases, {
        parallel: false,
        coverage: true
      });

      setCurrentReport(report);
      setShowResults(true);

      // Update individual results
      report.results.forEach(result => {
        setTestResults(prev => {
          const next = new Map(prev);
          next.set(result.testCaseId, result);
          return next;
        });
      });
    } catch {
      // Error handling for test suite execution
    } finally {
      setIsRunning(false);
    }
  };

  // Add assertion
  const addAssertion = () => {
    setTestForm({
      ...testForm,
      assertions: [
        ...testForm.assertions,
        {
          type: 'output',
          description: '',
          operator: 'equals',
          expected: ''
        }
      ]
    });
  };

  // Update assertion
  const updateAssertion = (index: number, updates: Partial<TestAssertion>) => {
    const newAssertions = [...testForm.assertions];
    newAssertions[index] = { ...newAssertions[index], ...updates };
    setTestForm({ ...testForm, assertions: newAssertions });
  };

  // Remove assertion
  const removeAssertion = (index: number) => {
    setTestForm({
      ...testForm,
      assertions: testForm.assertions.filter((_, i) => i !== index)
    });
  };

  // Export test results
  const exportResults = (format: 'json' | 'junit' | 'html') => {
    if (!currentReport) return;

    const content = JSON.stringify(currentReport, null, 2);
    const blob = new Blob([content], {
      type: format === 'json' ? 'application/json' :
            format === 'html' ? 'text/html' : 'text/xml'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-results-${Date.now()}.${format === 'junit' ? 'xml' : format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Reset form
  const resetTestForm = () => {
    setTestForm({
      name: '',
      description: '',
      input: '{}',
      expectedOutput: '',
      assertions: []
    });
  };

  // Get test status icon
  const getStatusIcon = (status: TestStatus) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'running':
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  // Render test creation form
  const renderTestCreationForm = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Create Test Case</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Test Name
              </label>
              <input
                type="text"
                value={testForm.name}
                onChange={(e) => setTestForm({ ...testForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Test user registration flow"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={testForm.description}
                onChange={(e) => setTestForm({ ...testForm, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Describe what this test validates"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Input Data (JSON)
              </label>
              <textarea
                value={testForm.input}
                onChange={(e) => setTestForm({ ...testForm, input: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder='{"key": "value"}'
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expected Output (JSON, optional)
              </label>
              <textarea
                value={testForm.expectedOutput}
                onChange={(e) => setTestForm({ ...testForm, expectedOutput: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder='{"result": "expected value"}'
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Assertions
                </label>
                <button
                  onClick={addAssertion}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Assertion
                </button>
              </div>

              <div className="space-y-2">
                {testForm.assertions.map((assertion, index) => (
                  <div key={index} className="border border-gray-200 rounded-md p-3">
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <select
                        value={assertion.type}
                        onChange={(e) => updateAssertion(index, { type: e.target.value as TestAssertion['type'] })}
                        className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="output">Output</option>
                        <option value="node">Node Output</option>
                        <option value="duration">Duration</option>
                        <option value="status">Status</option>
                      </select>

                      <select
                        value={assertion.operator}
                        onChange={(e) => updateAssertion(index, { operator: e.target.value as TestAssertion['operator'] })}
                        className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="equals">Equals</option>
                        <option value="not_equals">Not Equals</option>
                        <option value="contains">Contains</option>
                        <option value="greater_than">Greater Than</option>
                        <option value="less_than">Less Than</option>
                        <option value="exists">Exists</option>
                      </select>

                      <button
                        onClick={() => removeAssertion(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={assertion.description}
                      onChange={(e) => updateAssertion(index, { description: e.target.value })}
                      className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm mb-2"
                      placeholder="Assertion description"
                    />

                    {assertion.operator !== 'exists' && assertion.operator !== 'not_exists' && (
                      <input
                        type="text"
                        value={String(assertion.expected || '')}
                        onChange={(e) => updateAssertion(index, { expected: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                        placeholder="Expected value"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => {
                setShowCreateTest(false);
                resetTestForm();
              }}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={createTestCase}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Test
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Render test results
  const renderTestResults = () => {
    if (!currentReport) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Test Results</h3>
              <button
                onClick={() => setShowResults(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Total Tests</p>
                <p className="text-2xl font-bold">{currentReport.summary.total}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-green-600">Passed</p>
                <p className="text-2xl font-bold text-green-700">
                  {currentReport.summary.passed}
                </p>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-sm text-red-600">Failed</p>
                <p className="text-2xl font-bold text-red-700">
                  {currentReport.summary.failed}
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-600">Pass Rate</p>
                <p className="text-2xl font-bold text-blue-700">
                  {currentReport.summary.passRate.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Coverage */}
            {currentReport.coverage && (
              <div className="mb-6">
                <h4 className="font-medium mb-3">Test Coverage</h4>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Node Coverage</span>
                      <span>{currentReport.coverage.nodes.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${currentReport.coverage.nodes.percentage}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Path Coverage</span>
                      <span>{currentReport.coverage.paths.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${currentReport.coverage.paths.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Insights */}
            {currentReport.insights.length > 0 && (
              <div className="mb-6">
                <h4 className="font-medium mb-3">Insights</h4>
                <ul className="space-y-2">
                  {currentReport.insights.map((insight, index) => (
                    <li key={index} className="flex items-start">
                      <AlertCircle className="w-4 h-4 text-orange-500 mr-2 mt-0.5" />
                      <span className="text-sm text-gray-700">{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Detailed Results */}
            <div>
              <h4 className="font-medium mb-3">Test Details</h4>
              <div className="space-y-3">
                {currentReport.results.map((result) => {
                  const testCase = testCases.find(t => t.id === result.testCaseId);
                  return (
                    <div key={result.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center">
                            {getStatusIcon(result.status)}
                            <h5 className="ml-2 font-medium">{testCase?.name}</h5>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            Duration: {result.duration}ms
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedTest(testCase || null)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          View Details
                        </button>
                      </div>

                      {result.status === 'failed' && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-red-700 mb-2">
                            Failed Assertions:
                          </p>
                          <ul className="space-y-1">
                            {result.assertions
                              .filter(a => !a.passed)
                              .map((assertion, index) => (
                                <li key={index} className="text-sm text-red-600">
                                  • {assertion.description}: Expected {String(assertion.expected)},
                                  got {String(assertion.actual)}
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Export Options */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => exportResults('json')}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Export JSON
              </button>
              <button
                onClick={() => exportResults('junit')}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Export JUnit
              </button>
              <button
                onClick={() => exportResults('html')}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Export HTML
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Bug className="w-6 h-6 text-gray-700 mr-3" />
            <h2 className="text-lg font-semibold">Workflow Testing</h2>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowCreateTest(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Test
            </button>
            <button
              onClick={runAllTests}
              disabled={isRunning || testCases.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 flex items-center"
            >
              {isRunning ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run All Tests
                </>
              )}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Test List */}
      <div className="flex-1 overflow-y-auto p-6">
        {testCases.length === 0 ? (
          <div className="text-center py-12">
            <Bug className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No test cases yet.</p>
            <p className="text-gray-400 text-sm mt-2">
              Create your first test to ensure your workflow works correctly.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {testCases.map((testCase) => {
              const result = testResults.get(testCase.id);
              return (
                <div
                  key={testCase.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        {result && getStatusIcon(result.status)}
                        <h3 className="ml-2 font-medium text-gray-900">
                          {testCase.name}
                        </h3>
                      </div>
                      {testCase.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {testCase.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 mt-2">
                        <span className="text-xs text-gray-500">
                          {testCase.assertions.length} assertions
                        </span>
                        {testCase.tags && testCase.tags.length > 0 && (
                          <div className="flex space-x-1">
                            {testCase.tags.map(tag => (
                              <span
                                key={tag}
                                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => runTest(testCase)}
                        disabled={isRunning}
                        className="p-2 text-gray-600 hover:text-gray-900 disabled:text-gray-300"
                        title="Run test"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setSelectedTest(testCase)}
                        className="p-2 text-gray-600 hover:text-gray-900"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 text-gray-600 hover:text-gray-900"
                        title="Edit test"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setTestCases(testCases.filter(t => t.id !== testCase.id));
                          testResults.delete(testCase.id);
                        }}
                        className="p-2 text-red-600 hover:text-red-900"
                        title="Delete test"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Test result summary */}
                  {result && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4">
                          <span className="text-gray-600">
                            Duration: <span className="font-medium">{result.duration}ms</span>
                          </span>
                          <span className="text-gray-600">
                            Assertions: 
                            <span className="font-medium text-green-600 ml-1">
                              {result.metrics.assertionsPassed}
                            </span>
                            /
                            <span className="font-medium">
                              {result.assertions.length}
                            </span>
                          </span>
                        </div>
                        {result.coverage && (
                          <span className="text-gray-600">
                            Coverage: 
                            <span className="font-medium ml-1">
                              {result.coverage.overall.toFixed(1)}%
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateTest && renderTestCreationForm()}
      {showResults && renderTestResults()}
    </div>
  );
};