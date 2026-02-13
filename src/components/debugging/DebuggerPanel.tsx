/**
 * Debugger Panel
 * Chrome DevTools-like debugging interface
 */

import React, { useState, useEffect, useCallback } from 'react';
import type {
  DebugSession,
  BreakpointConfig,
  WatchExpression,
  LogEntry,
  LogFilter,
  NodePerformanceMetrics
} from '../../types/debugging';
import { BreakpointManager } from '../../debugging/BreakpointManager';
import { StepController } from '../../debugging/StepController';
import { ExtendedLogger } from '../../debugging/ExtendedLogger';
import { Profiler } from '../../debugging/Profiler';
import { MemoryProfiler } from '../../debugging/MemoryProfiler';

// Create singleton instances
const breakpointManager = new BreakpointManager();
const stepController = new StepController();
const extendedLogger = new ExtendedLogger();
const profiler = new Profiler();
const memoryProfiler = new MemoryProfiler();

interface DebuggerPanelProps {
  session: DebugSession | null;
  onStepOver: () => void;
  onStepInto: () => void;
  onStepOut: () => void;
  onContinue: () => void;
  onPause: () => void;
  onStop: () => void;
  onAddWatchExpression: (expression: string) => void;
  onRemoveWatchExpression: (id: string) => void;
}

export const DebuggerPanel: React.FC<DebuggerPanelProps> = ({
  session,
  onStepOver,
  onStepInto,
  onStepOut,
  onContinue,
  onPause,
  onStop,
  onAddWatchExpression,
  onRemoveWatchExpression
}) => {
  const [activeTab, setActiveTab] = useState<'variables' | 'watches' | 'callstack' | 'logs' | 'profiler'>('variables');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logFilter, setLogFilter] = useState<LogFilter>({});
  const [watchInput, setWatchInput] = useState('');
  const [selectedCallFrame, setSelectedCallFrame] = useState(0);

  // Listen to log events
  useEffect(() => {
    const unsubscribe = extendedLogger.on((entry) => {
      if (session && entry.context.executionId === session.executionId) {
        setLogs(prev => [...prev, entry]);
      }
    });

    return unsubscribe;
  }, [session]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!session) return;

      // F5: Continue
      if (e.key === 'F5' && !e.shiftKey) {
        e.preventDefault();
        onContinue();
      }
      // Shift+F5: Stop
      else if (e.key === 'F5' && e.shiftKey) {
        e.preventDefault();
        onStop();
      }
      // F6: Pause
      else if (e.key === 'F6') {
        e.preventDefault();
        onPause();
      }
      // F10: Step Over
      else if (e.key === 'F10') {
        e.preventDefault();
        onStepOver();
      }
      // F11: Step Into
      else if (e.key === 'F11' && !e.shiftKey) {
        e.preventDefault();
        onStepInto();
      }
      // Shift+F11: Step Out
      else if (e.key === 'F11' && e.shiftKey) {
        e.preventDefault();
        onStepOut();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [session, onStepOver, onStepInto, onStepOut, onContinue, onPause, onStop]);

  const handleAddWatch = useCallback(() => {
    if (watchInput.trim()) {
      onAddWatchExpression(watchInput.trim());
      setWatchInput('');
    }
  }, [watchInput, onAddWatchExpression]);

  const filteredLogs = logFilter ? extendedLogger.getLogs(logFilter) : logs;

  if (!session) {
    return (
      <div className="debugger-panel empty">
        <div className="empty-state">
          <h3>No Active Debug Session</h3>
          <p>Start debugging a workflow to use the debugger</p>
        </div>
      </div>
    );
  }

  return (
    <div className="debugger-panel">
      {/* Debug Toolbar */}
      <div className="debug-toolbar">
        <button
          onClick={onContinue}
          disabled={!session.isPaused}
          className="toolbar-btn"
          title="Continue (F5)"
        >
          ▶️ Continue
        </button>
        <button
          onClick={onPause}
          disabled={session.isPaused}
          className="toolbar-btn"
          title="Pause (F6)"
        >
          ⏸️ Pause
        </button>
        <button
          onClick={onStepOver}
          disabled={!session.isPaused}
          className="toolbar-btn"
          title="Step Over (F10)"
        >
          ⤵️ Step Over
        </button>
        <button
          onClick={onStepInto}
          disabled={!session.isPaused}
          className="toolbar-btn"
          title="Step Into (F11)"
        >
          ⬇️ Step Into
        </button>
        <button
          onClick={onStepOut}
          disabled={!session.isPaused}
          className="toolbar-btn"
          title="Step Out (Shift+F11)"
        >
          ⬆️ Step Out
        </button>
        <button
          onClick={onStop}
          className="toolbar-btn stop"
          title="Stop (Shift+F5)"
        >
          ⏹️ Stop
        </button>

        <div className="debug-status">
          <span className={`status-badge ${session.state}`}>
            {session.state}
          </span>
          {session.currentNodeId && (
            <span className="current-node">
              Node: {session.currentNodeId}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="debug-tabs">
        <button
          className={activeTab === 'variables' ? 'active' : ''}
          onClick={() => setActiveTab('variables')}
        >
          Variables
        </button>
        <button
          className={activeTab === 'watches' ? 'active' : ''}
          onClick={() => setActiveTab('watches')}
        >
          Watch
        </button>
        <button
          className={activeTab === 'callstack' ? 'active' : ''}
          onClick={() => setActiveTab('callstack')}
        >
          Call Stack
        </button>
        <button
          className={activeTab === 'logs' ? 'active' : ''}
          onClick={() => setActiveTab('logs')}
        >
          Logs ({filteredLogs.length})
        </button>
        <button
          className={activeTab === 'profiler' ? 'active' : ''}
          onClick={() => setActiveTab('profiler')}
        >
          Profiler
        </button>
      </div>

      {/* Content */}
      <div className="debug-content">
        {activeTab === 'variables' && (
          <VariablesPanel variables={session.variables} />
        )}

        {activeTab === 'watches' && (
          <WatchPanel
            watches={session.watchExpressions}
            watchInput={watchInput}
            onWatchInputChange={setWatchInput}
            onAddWatch={handleAddWatch}
            onRemoveWatch={onRemoveWatchExpression}
          />
        )}

        {activeTab === 'callstack' && (
          <CallStackPanel
            frames={session.callStack}
            selectedIndex={selectedCallFrame}
            onSelectFrame={setSelectedCallFrame}
          />
        )}

        {activeTab === 'logs' && (
          <LogsPanel
            logs={filteredLogs}
            filter={logFilter}
            onFilterChange={setLogFilter}
          />
        )}

        {activeTab === 'profiler' && (
          <ProfilerPanel session={session} />
        )}
      </div>

      <style>{debuggerPanelStyles}</style>
    </div>
  );
};

// Variables Panel Component
const VariablesPanelComponent: React.FC<{ variables: DebugSession['variables'] }> = ({ variables }) => {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const toggleExpand = (path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const renderVariable = (name: string, value: unknown, path: string = '', depth: number = 0) => {
    const isExpandable = typeof value === 'object' && value !== null;
    const isExpanded = expandedPaths.has(path);
    const indent = depth * 16;

    return (
      <div key={path} className="variable-item">
        <div className="variable-header" style={{ paddingLeft: indent }}>
          {isExpandable && (
            <span className="expand-icon" onClick={() => toggleExpand(path)}>
              {isExpanded ? '▼' : '▶'}
            </span>
          )}
          <span className="variable-name">{name}:</span>
          <span className="variable-value">
            {isExpandable ? (Array.isArray(value) ? `Array(${value.length})` : 'Object') : JSON.stringify(value)}
          </span>
        </div>
        {isExpanded && isExpandable && (
          <div className="variable-children">
            {Object.entries(value as Record<string, unknown>).map(([key, val]) =>
              renderVariable(key, val, `${path}.${key}`, depth + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="variables-panel">
      <div className="variable-section">
        <h4>Node Input</h4>
        {Object.entries(variables.nodeInput).map(([key, value]) =>
          renderVariable(key, value, `input.${key}`)
        )}
      </div>
      <div className="variable-section">
        <h4>Node Output</h4>
        {Object.entries(variables.nodeOutput).map(([key, value]) =>
          renderVariable(key, value, `output.${key}`)
        )}
      </div>
      <div className="variable-section">
        <h4>Workflow Variables</h4>
        {Object.entries(variables.workflowVariables).map(([key, value]) =>
          renderVariable(key, value, `workflow.${key}`)
        )}
      </div>
    </div>
  );
};

const VariablesPanel = React.memo(VariablesPanelComponent);

// Watch Panel Component
const WatchPanelComponent: React.FC<{
  watches: WatchExpression[];
  watchInput: string;
  onWatchInputChange: (value: string) => void;
  onAddWatch: () => void;
  onRemoveWatch: (id: string) => void;
}> = React.memo(({ watches, watchInput, onWatchInputChange, onAddWatch, onRemoveWatch }) => {
  return (
    <div className="watch-panel">
      <div className="watch-input">
        <input
          type="text"
          placeholder="Enter expression to watch..."
          value={watchInput}
          onChange={(e) => onWatchInputChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAddWatch()}
        />
        <button onClick={onAddWatch}>Add</button>
      </div>
      <div className="watch-list">
        {watches.map(watch => (
          <div key={watch.id} className="watch-item">
            <span className="watch-expression">{watch.expression}</span>
            <span className="watch-value">
              {watch.error ? (
                <span className="error">{watch.error}</span>
              ) : (
                JSON.stringify(watch.value)
              )}
            </span>
            <button className="remove-btn" onClick={() => onRemoveWatch(watch.id)}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
});

const WatchPanel = WatchPanelComponent;

// Call Stack Panel Component
const CallStackPanelComponent: React.FC<{
  frames: DebugSession['callStack'];
  selectedIndex: number;
  onSelectFrame: (index: number) => void;
}> = React.memo(({ frames, selectedIndex, onSelectFrame }) => {
  return (
    <div className="callstack-panel">
      {frames.map((frame, index) => (
        <div
          key={frame.id}
          className={`callstack-frame ${index === selectedIndex ? 'selected' : ''}`}
          onClick={() => onSelectFrame(index)}
        >
          <div className="frame-name">{frame.nodeName}</div>
          <div className="frame-location">
            {frame.workflowName} (depth: {frame.depth})
          </div>
        </div>
      ))}
    </div>
  );
});

const CallStackPanel = CallStackPanelComponent;

// Logs Panel Component
const LogsPanelComponent: React.FC<{
  logs: LogEntry[];
  filter: LogFilter;
  onFilterChange: (filter: LogFilter) => void;
}> = React.memo(({ logs, filter, onFilterChange }) => {
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  return (
    <div className="logs-panel">
      <div className="logs-toolbar">
        <select
          value={filter.levels?.[0] || 'all'}
          onChange={(e) => {
            const level = e.target.value;
            onFilterChange({
              ...filter,
              levels: level === 'all' ? undefined : [level as LogEntry['level']]
            });
          }}
        >
          <option value="all">All Levels</option>
          <option value="DEBUG">Debug</option>
          <option value="INFO">Info</option>
          <option value="WARN">Warning</option>
          <option value="ERROR">Error</option>
          <option value="FATAL">Fatal</option>
        </select>
        <input
          type="text"
          placeholder="Search logs..."
          value={filter.searchText || ''}
          onChange={(e) => onFilterChange({ ...filter, searchText: e.target.value })}
        />
        <label>
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
          />
          Auto-scroll
        </label>
      </div>
      <div className="logs-content">
        {logs.map(log => (
          <div key={log.id} className={`log-entry ${log.level.toLowerCase()}`}>
            <span className="log-timestamp">
              {new Date(log.timestamp).toLocaleTimeString()}
            </span>
            <span className={`log-level ${log.level.toLowerCase()}`}>
              [{log.level}]
            </span>
            <span className="log-source">[{log.source}]</span>
            <span className="log-message">{log.message}</span>
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
});

const LogsPanel = LogsPanelComponent;

// Profiler Panel Component
const ProfilerPanelComponent: React.FC<{ session: DebugSession }> = ({ session }) => {
  const stats = profiler.getStatistics();

  return (
    <div className="profiler-panel">
      <div className="profiler-summary">
        <div className="metric">
          <label>Total Execution Time</label>
          <div className="metric-value">{stats.totalExecutionTime.toFixed(0)}ms</div>
        </div>
        <div className="metric">
          <label>Network Requests</label>
          <div className="metric-value">{stats.totalNetworkRequests}</div>
        </div>
        <div className="metric">
          <label>Database Queries</label>
          <div className="metric-value">{stats.totalDatabaseQueries}</div>
        </div>
      </div>

      <div className="profiler-recommendations">
        <h4>Recommendations</h4>
        {stats.recommendations.map(rec => (
          <div key={rec.id} className={`recommendation ${rec.severity}`}>
            <span className="rec-icon">
              {rec.severity === 'critical' ? '🔴' : rec.severity === 'warning' ? '⚠️' : 'ℹ️'}
            </span>
            <div className="rec-content">
              <div className="rec-message">{rec.message}</div>
              <div className="rec-suggestion">{rec.suggestion}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProfilerPanel = React.memo(ProfilerPanelComponent);

const debuggerPanelStyles = `
  .debugger-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #1e1e1e;
    color: #d4d4d4;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 13px;
  }

  .debug-toolbar {
    display: flex;
    gap: 4px;
    padding: 8px;
    background: #2d2d2d;
    border-bottom: 1px solid #3e3e3e;
  }

  .toolbar-btn {
    padding: 6px 12px;
    background: #3e3e3e;
    border: none;
    color: #d4d4d4;
    cursor: pointer;
    border-radius: 3px;
    font-size: 12px;
  }

  .toolbar-btn:hover:not(:disabled) {
    background: #4e4e4e;
  }

  .toolbar-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .toolbar-btn.stop {
    background: #d32f2f;
  }

  .debug-status {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .status-badge {
    padding: 4px 8px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 600;
  }

  .status-badge.running { background: #4caf50; color: white; }
  .status-badge.paused { background: #ff9800; color: white; }
  .status-badge.stopped { background: #f44336; color: white; }
  .status-badge.completed { background: #2196f3; color: white; }

  .debug-tabs {
    display: flex;
    background: #2d2d2d;
    border-bottom: 1px solid #3e3e3e;
  }

  .debug-tabs button {
    padding: 8px 16px;
    background: transparent;
    border: none;
    color: #d4d4d4;
    cursor: pointer;
    border-bottom: 2px solid transparent;
  }

  .debug-tabs button:hover {
    background: #3e3e3e;
  }

  .debug-tabs button.active {
    border-bottom-color: #007acc;
    color: #007acc;
  }

  .debug-content {
    flex: 1;
    overflow: auto;
    padding: 12px;
  }

  .variable-item {
    margin-bottom: 4px;
  }

  .variable-header {
    display: flex;
    gap: 8px;
    padding: 4px 8px;
    cursor: pointer;
    border-radius: 3px;
  }

  .variable-header:hover {
    background: #2d2d2d;
  }

  .expand-icon {
    color: #858585;
    cursor: pointer;
    user-select: none;
  }

  .variable-name {
    color: #9cdcfe;
    font-weight: 500;
  }

  .variable-value {
    color: #ce9178;
  }

  .watch-input {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  .watch-input input {
    flex: 1;
    padding: 6px 12px;
    background: #2d2d2d;
    border: 1px solid #3e3e3e;
    color: #d4d4d4;
    border-radius: 3px;
  }

  .watch-item {
    display: flex;
    gap: 12px;
    padding: 8px;
    background: #2d2d2d;
    margin-bottom: 4px;
    border-radius: 3px;
  }

  .watch-expression {
    color: #9cdcfe;
    font-weight: 500;
  }

  .watch-value {
    flex: 1;
    color: #ce9178;
  }

  .callstack-frame {
    padding: 8px 12px;
    margin-bottom: 4px;
    background: #2d2d2d;
    cursor: pointer;
    border-radius: 3px;
  }

  .callstack-frame:hover {
    background: #3e3e3e;
  }

  .callstack-frame.selected {
    background: #094771;
  }

  .log-entry {
    padding: 4px 8px;
    margin-bottom: 2px;
    font-family: 'Consolas', monospace;
  }

  .log-entry.debug { color: #858585; }
  .log-entry.info { color: #4fc3f7; }
  .log-entry.warn { color: #ffb74d; }
  .log-entry.error { color: #f44336; }
  .log-entry.fatal { color: #ff1744; font-weight: 600; }

  .recommendation {
    display: flex;
    gap: 12px;
    padding: 12px;
    background: #2d2d2d;
    margin-bottom: 8px;
    border-radius: 3px;
    border-left: 3px solid;
  }

  .recommendation.info { border-left-color: #2196f3; }
  .recommendation.warning { border-left-color: #ff9800; }
  .recommendation.critical { border-left-color: #f44336; }
`;

export default DebuggerPanel;
