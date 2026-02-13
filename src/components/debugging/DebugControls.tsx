/**
 * Debug Controls Component
 * Toolbar for debugging workflow execution
 */

import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Square,
  StepForward,
  SkipForward,
  ArrowRight,
  Bug,
  Circle,
  Activity,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { debugManager, DebugSession } from '../../execution/DebugManager';
import { logger } from '../../services/SimpleLogger';

interface DebugControlsProps {
  sessionId: string | null;
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onStepOver?: () => void;
  onStepInto?: () => void;
  onStepOut?: () => void;
  className?: string;
}

function DebugControlsComponent({
  sessionId,
  onPlay,
  onPause,
  onStop,
  onStepOver,
  onStepInto,
  onStepOut,
  className = ''
}: DebugControlsProps) {
  const [session, setSession] = useState<DebugSession | null>(null);
  const [stats, setStats] = useState<ReturnType<typeof debugManager.getStats> | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  useEffect(() => {
    if (sessionId) {
      const currentSession = debugManager.getSession(sessionId);
      setSession(currentSession || null);

      if (currentSession) {
        const currentStats = debugManager.getStats(sessionId);
        setStats(currentStats);
      }
    } else {
      setSession(null);
      setStats(null);
    }
  }, [sessionId]);

  const handleContinue = () => {
    if (sessionId) {
      debugManager.continue(sessionId);
      onPlay?.();
      logger.info('▶️ Debug: Continue execution');
    }
  };

  const handlePause = () => {
    if (sessionId && session?.currentNode) {
      debugManager.pause(sessionId, session.currentNode);
      onPause?.();
      logger.info('⏸️ Debug: Pause execution');
    }
  };

  const handleStop = () => {
    if (sessionId) {
      debugManager.stop(sessionId);
      onStop?.();
      logger.info('⏹️ Debug: Stop execution');
    }
  };

  const handleStepOver = () => {
    if (sessionId) {
      debugManager.stepOver(sessionId);
      onStepOver?.();
      logger.info('👣 Debug: Step over');
    }
  };

  const handleStepInto = () => {
    if (sessionId) {
      debugManager.stepInto(sessionId);
      onStepInto?.();
      logger.info('👣 Debug: Step into');
    }
  };

  const handleStepOut = () => {
    if (sessionId) {
      debugManager.stepOut(sessionId);
      onStepOut?.();
      logger.info('👣 Debug: Step out');
    }
  };

  const isPaused = session?.status === 'paused';
  const isRunning = session?.status === 'running';
  const isStopped = !session || session.status === 'stopped' || session.status === 'idle';

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-lg ${className}`}>
      {/* Main Controls */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Bug size={20} className="text-blue-600" />
          <span className="font-semibold text-gray-900">Debug Controls</span>
          {session && (
            <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded ${
              isRunning
                ? 'bg-green-100 text-green-800'
                : isPaused
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {session.status.toUpperCase()}
            </span>
          )}
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-600 hover:text-gray-900 transition-colors"
        >
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* Control Buttons */}
      <div className="px-4 pb-3 flex items-center gap-2">
        {/* Play/Pause */}
        {isPaused || isStopped ? (
          <button
            onClick={handleContinue}
            disabled={isStopped}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            title="Continue execution"
          >
            <Play size={18} />
            <span>Continue</span>
          </button>
        ) : (
          <button
            onClick={handlePause}
            disabled={!isRunning}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            title="Pause execution"
          >
            <Pause size={18} />
            <span>Pause</span>
          </button>
        )}

        {/* Stop */}
        <button
          onClick={handleStop}
          disabled={isStopped}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          title="Stop debugging"
        >
          <Square size={18} />
          <span>Stop</span>
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-300 mx-2" />

        {/* Step Controls */}
        <button
          onClick={handleStepOver}
          disabled={!isPaused}
          className="flex items-center gap-2 px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Step over (F10)"
        >
          <StepForward size={18} />
          <span>Step Over</span>
        </button>

        <button
          onClick={handleStepInto}
          disabled={!isPaused}
          className="flex items-center gap-2 px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Step into (F11)"
        >
          <ArrowRight size={18} />
          <span>Step Into</span>
        </button>

        <button
          onClick={handleStepOut}
          disabled={!isPaused}
          className="flex items-center gap-2 px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Step out (Shift+F11)"
        >
          <SkipForward size={18} />
          <span>Step Out</span>
        </button>
      </div>

      {/* Expanded Details */}
      {isExpanded && session && stats && (
        <div className="border-t border-gray-200 px-4 py-3">
          {/* Current Node */}
          {session.currentNode && (
            <div className="mb-3 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Activity size={16} className="text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  Current Node
                </span>
              </div>
              <div className="text-sm text-blue-800 font-mono">
                {session.currentNode}
              </div>
            </div>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-600 mb-1">Breakpoints</div>
              <div className="flex items-center gap-2">
                <Circle size={16} className="text-red-600 fill-red-600" />
                <span className="text-lg font-semibold text-gray-900">
                  {stats.enabledBreakpoints}
                </span>
                <span className="text-xs text-gray-500">
                  / {stats.totalBreakpoints}
                </span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-600 mb-1">Total Hits</div>
              <div className="text-lg font-semibold text-gray-900">
                {stats.totalHits}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-600 mb-1">Variables</div>
              <div className="text-lg font-semibold text-gray-900">
                {stats.variableCount}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-600 mb-1">Stack Depth</div>
              <div className="text-lg font-semibold text-gray-900">
                {stats.stackDepth}
              </div>
            </div>
          </div>

          {/* Execution Stack */}
          {session.executionStack.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-medium text-gray-700 mb-2">
                Execution Stack
              </div>
              <div className="bg-gray-50 rounded-lg p-2 max-h-32 overflow-y-auto">
                {session.executionStack.map((nodeId, index) => (
                  <div
                    key={index}
                    className="text-xs font-mono text-gray-700 py-1"
                  >
                    {index + 1}. {nodeId}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Elapsed Time */}
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Info size={14} />
            <span>
              Elapsed: {Math.floor(stats.elapsedTime / 1000)}s
            </span>
          </div>
        </div>
      )}

      {/* No Session Info */}
      {!session && (
        <div className="px-4 pb-3 text-sm text-gray-500">
          Start debugging a workflow to use debug controls
        </div>
      )}
    </div>
  );
}

export const DebugControls = React.memo(DebugControlsComponent, (prev, next) => {
  return (
    prev.sessionId === next.sessionId &&
    prev.className === next.className &&
    prev.onPlay === next.onPlay &&
    prev.onPause === next.onPause &&
    prev.onStop === next.onStop &&
    prev.onStepOver === next.onStepOver &&
    prev.onStepInto === next.onStepInto &&
    prev.onStepOut === next.onStepOut
  );
});

export default DebugControls;
