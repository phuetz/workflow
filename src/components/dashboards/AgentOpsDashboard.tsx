/**
 * AgentOps Dashboard
 *
 * Main UI for AgentOps tooling with:
 * - Deployment pipeline status
 * - A/B test results
 * - Agent health metrics
 * - Recent deployments timeline
 * - Quick actions (deploy, rollback)
 */

import React, { useState, useEffect } from 'react';
import { useToast } from '../ui/Toast';
import {
  deploymentPipeline,
  versionControl,
  abTesting,
  monitoring,
  rollbackManager,
  testingFramework,
} from '../../agentops';
import type {
  ABTest,
  Agent,
  AgentHealthMetrics,
  DeploymentResult,
  RollbackHistory,
  TestExecutionResult,
} from '../../agentops/types/agentops';

/**
 * Dashboard stats component
 */
const DashboardStats: React.FC<{ metrics: AgentHealthMetrics }> = ({ metrics }) => (
  <div className="grid grid-cols-4 gap-4 mb-6">
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="text-sm text-gray-500">Uptime</div>
      <div className="text-2xl font-bold text-green-600">
        {(metrics.uptime * 100).toFixed(1)}%
      </div>
    </div>
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="text-sm text-gray-500">P95 Latency</div>
      <div className="text-2xl font-bold text-blue-600">
        {metrics.latency.p95.toFixed(0)}ms
      </div>
    </div>
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="text-sm text-gray-500">Success Rate</div>
      <div className="text-2xl font-bold text-green-600">
        {(metrics.successRate * 100).toFixed(1)}%
      </div>
    </div>
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="text-sm text-gray-500">Total Cost</div>
      <div className="text-2xl font-bold text-purple-600">
        ${metrics.totalCost.toFixed(2)}
      </div>
    </div>
  </div>
);

/**
 * Deployment status component
 */
const DeploymentStatus: React.FC<{ deployment: DeploymentResult }> = ({ deployment }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'rolled-back': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStageColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-4">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className="text-lg font-semibold">{deployment.config.agent.name}</h3>
          <p className="text-sm text-gray-500">
            {deployment.config.environment} • {deployment.config.strategy}
          </p>
        </div>
        <span className={`text-sm font-semibold ${getStatusColor(deployment.status)}`}>
          {deployment.status.toUpperCase()}
        </span>
      </div>

      <div className="flex space-x-2 mb-3">
        {deployment.stages.map((stage, idx) => (
          <div key={idx} className="flex-1">
            <div className={`text-xs px-2 py-1 rounded ${getStageColor(stage.status)}`}>
              {stage.name}
            </div>
            {stage.duration && (
              <div className="text-xs text-gray-500 mt-1">
                {(stage.duration / 1000).toFixed(1)}s
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="text-sm text-gray-600">
        Duration: {(deployment.duration / 1000).toFixed(1)}s
        {deployment.healthCheck && (
          <span className="ml-4">
            Health: <span className={deployment.healthCheck.status === 'healthy' ? 'text-green-600' : 'text-red-600'}>
              {deployment.healthCheck.status}
            </span>
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * A/B Test results component
 */
const ABTestResults: React.FC<{ test: ABTest }> = ({ test }) => {
  if (!test.results) {
    return (
      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <h3 className="text-lg font-semibold mb-2">{test.name}</h3>
        <p className="text-sm text-gray-500">Status: {test.status}</p>
        <p className="text-sm text-gray-500">
          Sample Size: {test.variantA.sampleSize + test.variantB.sampleSize}
        </p>
      </div>
    );
  }

  const getWinnerColor = (winner: string) => {
    switch (winner) {
      case 'A': return 'text-blue-600';
      case 'B': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold">{test.name}</h3>
        <span className={`text-sm font-semibold ${getWinnerColor(test.results.winner || 'tie')}`}>
          Winner: {test.results.winner?.toUpperCase() || 'TIE'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div className="border-r pr-4">
          <div className="text-sm font-medium mb-2">Variant A (Control)</div>
          {Object.entries(test.variantA.stats).map(([metric, stats]) => {
            const typedStats = stats as { mean: number; median: number; stdDev: number; p50: number; p95: number; p99: number };
            return (
              <div key={metric} className="text-xs text-gray-600">
                {metric}: {typedStats.mean.toFixed(2)} (±{typedStats.stdDev.toFixed(2)})
              </div>
            );
          })}
        </div>
        <div className="pl-4">
          <div className="text-sm font-medium mb-2">Variant B (Treatment)</div>
          {Object.entries(test.variantB.stats).map(([metric, stats]) => {
            const typedStats = stats as { mean: number; median: number; stdDev: number; p50: number; p95: number; p99: number };
            return (
              <div key={metric} className="text-xs text-gray-600">
                {metric}: {typedStats.mean.toFixed(2)} (±{typedStats.stdDev.toFixed(2)})
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-sm text-gray-600">
        <p className="mb-1">Confidence: {(test.results.confidence * 100).toFixed(1)}%</p>
        <p className="text-xs">{test.results.recommendation}</p>
      </div>
    </div>
  );
};

/**
 * Rollback history component
 */
const RollbackHistoryItem: React.FC<{ rollback: RollbackHistory }> = ({ rollback }) => {
  const getStatusColor = (status: string) => {
    return status === 'success' ? 'text-green-600' : 'text-red-600';
  };

  const getTriggerIcon = (trigger: string) => {
    return trigger === 'manual' ? '👤' : '🤖';
  };

  return (
    <div className="bg-white p-3 rounded-lg shadow mb-2">
      <div className="flex justify-between items-center">
        <div>
          <div className="text-sm font-medium">
            {getTriggerIcon(rollback.trigger)} {rollback.fromVersion} → {rollback.toVersion}
          </div>
          <div className="text-xs text-gray-500">{rollback.reason}</div>
        </div>
        <div className="text-right">
          <div className={`text-sm font-semibold ${getStatusColor(rollback.status)}`}>
            {rollback.status}
          </div>
          <div className="text-xs text-gray-500">
            {(rollback.duration / 1000).toFixed(1)}s
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Quick actions panel
 */
const QuickActions: React.FC<{
  onDeploy: () => void;
  onRollback: () => void;
  onABTest: () => void;
  onRunTests: () => void;
}> = ({ onDeploy, onRollback, onABTest, onRunTests }) => (
  <div className="bg-white p-4 rounded-lg shadow">
    <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={onDeploy}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        Deploy
      </button>
      <button
        onClick={onRollback}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
      >
        Rollback
      </button>
      <button
        onClick={onABTest}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
      >
        A/B Test
      </button>
      <button
        onClick={onRunTests}
        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
      >
        Run Tests
      </button>
    </div>
  </div>
);

/**
 * Test results component
 */
const TestResults: React.FC<{ results: TestExecutionResult }> = ({ results }) => {
  const getCoverageColor = (coverage: number) => {
    if (coverage >= 0.9) return 'text-green-600';
    if (coverage >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-4">
      <h3 className="text-lg font-semibold mb-3">Test Results</h3>

      <div className="grid grid-cols-4 gap-4 mb-3">
        <div>
          <div className="text-sm text-gray-500">Total</div>
          <div className="text-xl font-bold">{results.summary.total}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Passed</div>
          <div className="text-xl font-bold text-green-600">{results.summary.passed}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Failed</div>
          <div className="text-xl font-bold text-red-600">{results.summary.failed}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Coverage</div>
          <div className={`text-xl font-bold ${getCoverageColor(results.summary.coverage)}`}>
            {(results.summary.coverage * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="text-sm text-gray-600">
        Duration: {(results.summary.duration / 1000).toFixed(1)}s
      </div>
    </div>
  );
};

/**
 * Main AgentOps Dashboard
 */
export const AgentOpsDashboard: React.FC<{ agentId: string }> = ({ agentId }) => {
  const toast = useToast();
  const [metrics, setMetrics] = useState<AgentHealthMetrics | null>(null);
  const [deployments, setDeployments] = useState<DeploymentResult[]>([]);
  const [abTests, setABTests] = useState<ABTest[]>([]);
  const [rollbacks, setRollbacks] = useState<RollbackHistory[]>([]);
  const [testResults, setTestResults] = useState<TestExecutionResult | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'deployments' | 'tests' | 'rollbacks'>('overview');
  const [isDeploying, setIsDeploying] = useState(false);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [currentVersion] = useState('1.0.0');

  useEffect(() => {
    // Load initial data
    loadData();

    // Set up real-time updates
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [agentId]);

  const loadData = () => {
    // Load metrics
    const currentMetrics = monitoring.getCurrentMetrics(agentId);
    setMetrics(currentMetrics);

    // Load deployments
    const allDeployments = deploymentPipeline.getAllDeployments();
    const agentDeployments = allDeployments
      .filter(d => d.config.agent.id === agentId)
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, 10);
    setDeployments(agentDeployments);

    // Load A/B tests
    const agentTests = abTesting.getTestsByAgent(agentId);
    setABTests(agentTests);

    // Load rollbacks
    const agentRollbacks = rollbackManager.getHistory(agentId, 10);
    setRollbacks(agentRollbacks);

    // Load test results
    const allSuites = testingFramework.getAllTestSuites();
    const agentSuite = allSuites.find(s => s.agentId === agentId);
    if (agentSuite) {
      const results = testingFramework.getTestResults(agentSuite.id);
      if (results) setTestResults(results);
    }
  };

  const handleDeploy = async () => {
    const environment = window.prompt('Enter deployment environment (staging/production):', 'staging');
    if (!environment) return;

    const strategy = window.prompt('Enter deployment strategy (blue-green/canary/rolling):', 'blue-green');
    if (!strategy) return;

    try {
      setIsDeploying(true);
      const result = await deploymentPipeline.deploy({
        agent: {
          id: agentId,
          name: `Agent ${agentId}`,
          description: `Agent ${agentId}`,
          type: 'custom' as const,
          version: currentVersion || '1.0.0',
          code: '',
          dependencies: {},
          configuration: {},
          metadata: {
            created: Date.now(),
            updated: Date.now(),
            author: {
              id: 'user-1',
              email: 'user@example.com',
              name: 'User',
              role: 'admin'
            },
            tags: []
          }
        },
        environment: (environment === 'staging' ? 'staging' : environment === 'production' ? 'prod' : 'dev') as 'dev' | 'staging' | 'prod',
        strategy: strategy as 'blue-green' | 'canary' | 'rolling'
      });

      if (result.status === 'success') {
        toast.success('Deployment successful!');
      } else {
        toast.error(`Deployment ${result.status}: ${result.error || 'Check logs for details'}`);
      }
      loadData();
    } catch (error) {
      toast.error(`Deployment failed: ${error}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleRollback = async () => {
    if (confirm('Are you sure you want to rollback this agent?')) {
      try {
        await rollbackManager.rollback(agentId, 'Manual rollback from dashboard', {
          id: 'user-1',
          email: 'user@example.com',
          name: 'User',
          role: 'admin',
        });
        loadData();
      } catch (error) {
        toast.error(`Rollback failed: ${error}`);
      }
    }
  };

  const handleABTest = async () => {
    const testName = window.prompt('Enter A/B test name:', 'Test ' + new Date().toISOString().split('T')[0]);
    if (!testName) return;

    const trafficPercent = window.prompt('Enter traffic percentage for variant B (0-100):', '50');
    if (!trafficPercent) return;

    try {
      // Create mock agent versions for A/B testing
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        name: 'User',
        role: 'admin'
      };

      const baseAgent = {
        id: agentId,
        name: `Agent ${agentId}`,
        description: `Agent ${agentId}`,
        type: 'custom' as const,
        version: currentVersion || '1.0.0',
        code: '',
        dependencies: {},
        configuration: {},
        metadata: {
          created: Date.now(),
          updated: Date.now(),
          author: mockUser,
          tags: []
        }
      };

      const variantA = {
        id: 'version-a',
        agentId,
        version: currentVersion || '1.0.0',
        commit: 'commit-a',
        author: mockUser,
        timestamp: Date.now(),
        message: 'Control version',
        changes: [],
        tags: ['control'],
        branch: 'main',
        snapshot: baseAgent
      };

      const variantB = {
        id: 'version-b',
        agentId,
        version: currentVersion || '1.0.1',
        commit: 'commit-b',
        author: mockUser,
        timestamp: Date.now(),
        message: 'Treatment version',
        changes: [],
        tags: ['treatment'],
        branch: 'main',
        snapshot: { ...baseAgent, version: '1.0.1' }
      };

      const metrics = [
        { name: 'latency', type: 'gauge' as const, unit: 'ms', higherIsBetter: false },
        { name: 'successRate', type: 'rate' as const, unit: '%', higherIsBetter: true },
        { name: 'cost', type: 'gauge' as const, unit: '$', higherIsBetter: false }
      ];

      const test = await abTesting.createTest(
        testName,
        `A/B test for ${agentId}`,
        agentId,
        variantA,
        variantB,
        metrics,
        {
          trafficSplit: parseInt(trafficPercent) / 100,
          duration: 7 * 24 * 60 * 60 * 1000,
          minSampleSize: 100
        },
        mockUser
      );

      await abTesting.startTest(test.id);
      toast.success(`A/B test "${testName}" started successfully!`);
      loadData();
    } catch (error) {
      toast.error(`Failed to create A/B test: ${error}`);
    }
  };

  const handleRunTests = async () => {
    try {
      setIsRunningTests(true);
      const allSuites = testingFramework.getAllTestSuites();
      const agentSuite = allSuites.find(s => s.agentId === agentId);

      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        name: 'User',
        role: 'admin'
      };

      const mockAgent = {
        id: agentId,
        name: `Agent ${agentId}`,
        description: `Agent ${agentId}`,
        type: 'custom' as const,
        version: currentVersion || '1.0.0',
        code: '',
        dependencies: {},
        configuration: {},
        metadata: {
          created: Date.now(),
          updated: Date.now(),
          author: mockUser,
          tags: []
        }
      };

      if (!agentSuite) {
        // Create a default test suite if none exists
        const newSuite = testingFramework.createTestSuite(
          `Agent ${agentId} Tests`,
          agentId,
          mockUser
        );

        await testingFramework.executeTestSuite(newSuite.id, mockAgent, mockUser, {});
        toast.success('Test suite created and executed. Check results tab for details.');
      } else {
        const results = await testingFramework.executeTestSuite(agentSuite.id, mockAgent, mockUser, {});
        if (results) {
          setTestResults(results);
          toast.success(`Tests completed: ${results.summary.passed}/${results.summary.total} passed`);
        }
      }
      loadData();
    } catch (error) {
      toast.error(`Test execution failed: ${error}`);
    } finally {
      setIsRunningTests(false);
    }
  };

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-500">Loading AgentOps Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">AgentOps Dashboard</h1>

        {/* Stats Overview */}
        <DashboardStats metrics={metrics} />

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {(['overview', 'deployments', 'tests', 'rollbacks'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="col-span-2">
            {activeTab === 'overview' && (
              <>
                <h2 className="text-xl font-semibold mb-4">Recent Deployments</h2>
                {deployments.length > 0 ? (
                  deployments.slice(0, 3).map(deployment => (
                    <DeploymentStatus key={deployment.id} deployment={deployment} />
                  ))
                ) : (
                  <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
                    No deployments yet
                  </div>
                )}

                {abTests.length > 0 && (
                  <>
                    <h2 className="text-xl font-semibold mb-4 mt-6">Active A/B Tests</h2>
                    {abTests.filter(t => t.status === 'running').map(test => (
                      <ABTestResults key={test.id} test={test} />
                    ))}
                  </>
                )}
              </>
            )}

            {activeTab === 'deployments' && (
              <>
                <h2 className="text-xl font-semibold mb-4">All Deployments</h2>
                {deployments.map(deployment => (
                  <DeploymentStatus key={deployment.id} deployment={deployment} />
                ))}
              </>
            )}

            {activeTab === 'tests' && (
              <>
                <h2 className="text-xl font-semibold mb-4">Test Results</h2>
                {testResults ? (
                  <TestResults results={testResults} />
                ) : (
                  <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
                    No test results available
                  </div>
                )}

                <h2 className="text-xl font-semibold mb-4 mt-6">A/B Tests</h2>
                {abTests.map(test => (
                  <ABTestResults key={test.id} test={test} />
                ))}
              </>
            )}

            {activeTab === 'rollbacks' && (
              <>
                <h2 className="text-xl font-semibold mb-4">Rollback History</h2>
                {rollbacks.length > 0 ? (
                  rollbacks.map(rollback => (
                    <RollbackHistoryItem key={rollback.id} rollback={rollback} />
                  ))
                ) : (
                  <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
                    No rollbacks yet
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar */}
          <div>
            <QuickActions
              onDeploy={handleDeploy}
              onRollback={handleRollback}
              onABTest={handleABTest}
              onRunTests={handleRunTests}
            />

            {rollbacks.length > 0 && activeTab === 'overview' && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Recent Rollbacks</h3>
                {rollbacks.slice(0, 3).map(rollback => (
                  <RollbackHistoryItem key={rollback.id} rollback={rollback} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentOpsDashboard;
