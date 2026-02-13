/**
 * Deployment Pipeline Viewer
 *
 * Stage-by-stage visualization of deployment pipeline with:
 * - Real-time logs
 * - Error highlighting
 * - Deployment history
 * - Stage progress indicators
 */

import React, { useState, useEffect, useRef } from 'react';
import { deploymentPipeline } from '../../agentops';
import type { DeploymentResult, DeploymentStage, PipelineEvent } from '../../agentops/types/agentops';

/**
 * Stage status icon
 */
const StageIcon: React.FC<{ status: DeploymentStage['status'] }> = ({ status }) => {
  switch (status) {
    case 'success':
      return <span className="text-green-500 text-2xl">✓</span>;
    case 'failed':
      return <span className="text-red-500 text-2xl">✗</span>;
    case 'running':
      return <span className="text-blue-500 text-2xl">⟳</span>;
    case 'pending':
      return <span className="text-gray-400 text-2xl">○</span>;
    case 'skipped':
      return <span className="text-gray-400 text-2xl">−</span>;
    default:
      return <span className="text-gray-400 text-2xl">?</span>;
  }
};

/**
 * Stage component
 */
const StageView: React.FC<{
  stage: DeploymentStage;
  isActive: boolean;
  onClick: () => void;
}> = ({ stage, isActive, onClick }) => {
  const getStatusColor = (status: DeploymentStage['status']) => {
    switch (status) {
      case 'success': return 'border-green-500 bg-green-50';
      case 'failed': return 'border-red-500 bg-red-50';
      case 'running': return 'border-blue-500 bg-blue-50';
      case 'pending': return 'border-gray-300 bg-gray-50';
      case 'skipped': return 'border-gray-300 bg-gray-100';
      default: return 'border-gray-300 bg-white';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`
        p-4 border-2 rounded-lg cursor-pointer transition-all
        ${getStatusColor(stage.status)}
        ${isActive ? 'ring-2 ring-blue-400' : ''}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold capitalize">{stage.name}</h3>
        <StageIcon status={stage.status} />
      </div>

      <div className="text-sm text-gray-600">
        <div>Status: <span className="font-medium capitalize">{stage.status}</span></div>
        {stage.duration && (
          <div>Duration: <span className="font-medium">{(stage.duration / 1000).toFixed(2)}s</span></div>
        )}
        {stage.error && (
          <div className="text-red-600 mt-1">Error: {stage.error}</div>
        )}
      </div>

      {stage.logs.length > 0 && (
        <div className="text-xs text-gray-500 mt-2">
          {stage.logs.length} log entries
        </div>
      )}
    </div>
  );
};

/**
 * Logs viewer component
 */
const LogsViewer: React.FC<{ stage: DeploymentStage }> = ({ stage }) => {
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [stage.logs]);

  const getLogClass = (log: string) => {
    if (log.includes('✓') || log.includes('passed') || log.includes('success')) {
      return 'text-green-700';
    }
    if (log.includes('✗') || log.includes('failed') || log.includes('error')) {
      return 'text-red-700';
    }
    if (log.includes('⚠') || log.includes('warning')) {
      return 'text-yellow-700';
    }
    return 'text-gray-700';
  };

  return (
    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto">
      {stage.logs.length === 0 ? (
        <div className="text-gray-500">No logs available</div>
      ) : (
        <>
          {stage.logs.map((log, idx) => (
            <div key={idx} className={`py-1 ${getLogClass(log)}`}>
              <span className="text-gray-500 mr-2">[{idx + 1}]</span>
              {log}
            </div>
          ))}
          <div ref={logsEndRef} />
        </>
      )}
    </div>
  );
};

/**
 * Progress bar component
 */
const ProgressBar: React.FC<{ deployment: DeploymentResult }> = ({ deployment }) => {
  const totalStages = deployment.stages.length;
  const completedStages = deployment.stages.filter(
    s => s.status === 'success' || s.status === 'failed' || s.status === 'skipped'
  ).length;
  const progress = (completedStages / totalStages) * 100;

  const getProgressColor = () => {
    if (deployment.status === 'failed') return 'bg-red-500';
    if (deployment.status === 'rolled-back') return 'bg-yellow-500';
    if (deployment.status === 'success') return 'bg-green-500';
    return 'bg-blue-500';
  };

  return (
    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
      <div
        className={`h-2 rounded-full transition-all duration-500 ${getProgressColor()}`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

/**
 * Deployment info panel
 */
const DeploymentInfo: React.FC<{ deployment: DeploymentResult }> = ({ deployment }) => {
  const { config } = deployment;

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-4">
      <h2 className="text-xl font-semibold mb-3">Deployment Information</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-sm text-gray-500">Agent</div>
          <div className="font-medium">{config.agent.name}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Version</div>
          <div className="font-medium">{config.agent.version}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Environment</div>
          <div className="font-medium capitalize">{config.environment}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Strategy</div>
          <div className="font-medium capitalize">{config.strategy}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Status</div>
          <div className={`font-medium ${
            deployment.status === 'success' ? 'text-green-600' :
            deployment.status === 'failed' ? 'text-red-600' :
            'text-yellow-600'
          }`}>
            {deployment.status.toUpperCase()}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Duration</div>
          <div className="font-medium">
            {deployment.duration ? (deployment.duration / 1000).toFixed(2) : 0}s
          </div>
        </div>
      </div>

      {deployment.healthCheck && (
        <div className="mt-4 pt-4 border-t">
          <div className="text-sm text-gray-500 mb-2">Health Check</div>
          <div className={`font-medium ${
            deployment.healthCheck.status === 'healthy' ? 'text-green-600' : 'text-red-600'
          }`}>
            {deployment.healthCheck.status.toUpperCase()}
          </div>
          <div className="mt-2 space-y-1">
            {deployment.healthCheck.checks.map((check, idx) => (
              <div key={idx} className="text-sm">
                <span className={check.status ? 'text-green-600' : 'text-red-600'}>
                  {check.status ? '✓' : '✗'}
                </span>
                <span className="ml-2">{check.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {deployment.error && (
        <div className="mt-4 pt-4 border-t">
          <div className="text-sm text-gray-500 mb-1">Error</div>
          <div className="text-red-600 text-sm font-mono bg-red-50 p-2 rounded">
            {deployment.error}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Timeline component
 */
const Timeline: React.FC<{ deployments: DeploymentResult[] }> = ({ deployments }) => {
  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-3">Recent Deployments</h3>
      <div className="space-y-2">
        {deployments.map((deployment) => (
          <div
            key={deployment.id}
            className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
          >
            <div>
              <div className="text-sm font-medium">{deployment.config.agent.name}</div>
              <div className="text-xs text-gray-500">
                {deployment.config.environment} • {getTimeAgo(deployment.startTime)}
              </div>
            </div>
            <div className={`text-xs font-semibold ${
              deployment.status === 'success' ? 'text-green-600' :
              deployment.status === 'failed' ? 'text-red-600' :
              'text-yellow-600'
            }`}>
              {deployment.status.toUpperCase()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Main Deployment Pipeline Viewer
 */
export const DeploymentPipelineViewer: React.FC<{ deploymentId?: string }> = ({ deploymentId }) => {
  const [deployment, setDeployment] = useState<DeploymentResult | null>(null);
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [allDeployments, setAllDeployments] = useState<DeploymentResult[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    loadDeployments();

    // Listen for pipeline events
    const handleEvent = (event: PipelineEvent) => {
      if (deploymentId && event.deploymentId === deploymentId) {
        loadDeployment();
      }
      loadDeployments();
    };

    deploymentPipeline.on('stage-started', handleEvent);
    deploymentPipeline.on('stage-completed', handleEvent);
    deploymentPipeline.on('stage-failed', handleEvent);
    deploymentPipeline.on('deployment-completed', handleEvent);
    deploymentPipeline.on('deployment-failed', handleEvent);

    return () => {
      deploymentPipeline.off('stage-started', handleEvent);
      deploymentPipeline.off('stage-completed', handleEvent);
      deploymentPipeline.off('stage-failed', handleEvent);
      deploymentPipeline.off('deployment-completed', handleEvent);
      deploymentPipeline.off('deployment-failed', handleEvent);
    };
  }, [deploymentId]);

  const loadDeployment = () => {
    if (!deploymentId) return;
    const dep = deploymentPipeline.getDeployment(deploymentId);
    if (dep) {
      setDeployment(dep);

      // Auto-scroll to running stage
      if (autoScroll) {
        const runningIndex = dep.stages.findIndex(s => s.status === 'running');
        if (runningIndex !== -1) {
          setActiveStageIndex(runningIndex);
        }
      }
    }
  };

  const loadDeployments = () => {
    const deps = deploymentPipeline.getAllDeployments();
    setAllDeployments(deps.sort((a, b) => b.startTime - a.startTime).slice(0, 10));

    // Load current deployment if not specified
    if (!deploymentId && deps.length > 0) {
      setDeployment(deps[0]);
    } else {
      loadDeployment();
    }
  };

  if (!deployment) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-500">No deployment selected</div>
      </div>
    );
  }

  const activeStage = deployment.stages[activeStageIndex];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Deployment Pipeline</h1>
          <div className="flex items-center space-x-2">
            <label className="flex items-center text-sm text-gray-600">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="mr-2"
              />
              Auto-scroll
            </label>
          </div>
        </div>

        <ProgressBar deployment={deployment} />

        <div className="grid grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="col-span-2">
            <DeploymentInfo deployment={deployment} />

            {/* Stages */}
            <div className="bg-white p-4 rounded-lg shadow mb-4">
              <h2 className="text-xl font-semibold mb-4">Pipeline Stages</h2>
              <div className="grid grid-cols-5 gap-3 mb-6">
                {deployment.stages.map((stage, idx) => (
                  <StageView
                    key={idx}
                    stage={stage}
                    isActive={idx === activeStageIndex}
                    onClick={() => setActiveStageIndex(idx)}
                  />
                ))}
              </div>

              {/* Logs for active stage */}
              {activeStage && (
                <div>
                  <h3 className="text-lg font-semibold mb-2 capitalize">{activeStage.name} Logs</h3>
                  <LogsViewer stage={activeStage} />
                </div>
              )}
            </div>

            {/* Artifacts */}
            {deployment.artifacts && (
              <div className="bg-white p-4 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-3">Artifacts</h2>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Build ID</span>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {deployment.artifacts.buildId}
                    </code>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Package</span>
                    <a
                      href={deployment.artifacts.packageUrl}
                      className="text-xs text-blue-600 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Download
                    </a>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Manifest</span>
                    <a
                      href={deployment.artifacts.manifestUrl}
                      className="text-xs text-blue-600 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View
                    </a>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Logs</span>
                    <a
                      href={deployment.artifacts.logsUrl}
                      className="text-xs text-blue-600 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View All
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div>
            <Timeline deployments={allDeployments} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeploymentPipelineViewer;
