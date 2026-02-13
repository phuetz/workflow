import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { Save, CheckCircle, AlertTriangle, Settings, X, History, RefreshCw } from 'lucide-react';
import { logger } from '../../services/SimpleLogger';

interface AutoSaveManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

// Auto-save state and settings types
interface AutoSaveState {
  status: 'idle' | 'saving' | 'saved' | 'error';
  error?: string;
  lastSaveAttempt?: Date;
  consecutiveFailures: number;
}

interface AutoSaveSettings {
  enabled: boolean;
  interval: number;
  maxVersions: number;
  saveOnNodeChange: boolean;
  saveOnConnectionChange: boolean;
  saveBeforeExecution: boolean;
  saveOnBlur: boolean;
  createVersionOnSave: boolean;
}

interface AutoSaveVersion {
  id: string;
  timestamp: Date;
  nodeCount: number;
  edgeCount: number;
  description: string;
}

// Local storage key for settings persistence
const AUTOSAVE_SETTINGS_KEY = 'workflow_autosave_settings';
const AUTOSAVE_VERSIONS_KEY = 'workflow_autosave_versions';

// Load settings from localStorage
const loadSettings = (): AutoSaveSettings => {
  try {
    const stored = localStorage.getItem(AUTOSAVE_SETTINGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    logger.warn('Failed to load auto-save settings from storage', error);
  }
  return {
    enabled: true,
    interval: 30000, // 30 seconds
    maxVersions: 10,
    saveOnNodeChange: true,
    saveOnConnectionChange: true,
    saveBeforeExecution: true,
    saveOnBlur: true,
    createVersionOnSave: false
  };
};

// Save settings to localStorage
const persistSettings = (settings: AutoSaveSettings): void => {
  try {
    localStorage.setItem(AUTOSAVE_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    logger.warn('Failed to persist auto-save settings', error);
  }
};

// Load saved versions from localStorage
const loadVersions = (): AutoSaveVersion[] => {
  try {
    const stored = localStorage.getItem(AUTOSAVE_VERSIONS_KEY);
    if (stored) {
      const versions = JSON.parse(stored);
      return versions.map((v: AutoSaveVersion) => ({
        ...v,
        timestamp: new Date(v.timestamp)
      }));
    }
  } catch (error) {
    logger.warn('Failed to load auto-save versions from storage', error);
  }
  return [];
};

// Save versions to localStorage
const persistVersions = (versions: AutoSaveVersion[]): void => {
  try {
    localStorage.setItem(AUTOSAVE_VERSIONS_KEY, JSON.stringify(versions));
  } catch (error) {
    logger.warn('Failed to persist auto-save versions', error);
  }
};

export const AutoSaveManager: React.FC<AutoSaveManagerProps> = ({ isOpen, onClose }) => {
  // Get store properties and actions
  const {
    lastSaved: storageLastSaved,
    darkMode,
    nodes,
    edges,
    isSaved,
    saveWorkflow,
    createVersion,
    currentWorkflowId,
    workflowName
  } = useWorkflowStore();

  // Auto-save state
  const [autoSaveState, setAutoSaveState] = useState<AutoSaveState>({
    status: 'idle',
    consecutiveFailures: 0
  });

  // Settings state with persistence
  const [autoSaveSettings, setAutoSaveSettings] = useState<AutoSaveSettings>(loadSettings);
  const [localSettings, setLocalSettings] = useState<AutoSaveSettings>(autoSaveSettings);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Version tracking
  const [autoSaveVersions, setAutoSaveVersions] = useState<AutoSaveVersion[]>(loadVersions);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Refs for tracking changes and preventing duplicate saves
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastNodesRef = useRef<string>('');
  const lastEdgesRef = useRef<string>('');
  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef(false);

  // Convert lastSaved from Date to number if needed
  const lastSaved = storageLastSaved ? new Date(storageLastSaved).getTime() : null;

  // Check if workflow has changes by comparing nodes and edges
  const hasWorkflowChanges = useCallback((): boolean => {
    const currentNodes = JSON.stringify(nodes);
    const currentEdges = JSON.stringify(edges);

    const nodesChanged = currentNodes !== lastNodesRef.current;
    const edgesChanged = currentEdges !== lastEdgesRef.current;

    return nodesChanged || edgesChanged;
  }, [nodes, edges]);

  // Update refs when save completes
  const updateChangeRefs = useCallback(() => {
    lastNodesRef.current = JSON.stringify(nodes);
    lastEdgesRef.current = JSON.stringify(edges);
  }, [nodes, edges]);

  // Core save function with error handling and retry logic
  const performSave = useCallback(async (reason: string = 'auto'): Promise<boolean> => {
    // Prevent concurrent saves
    if (isSavingRef.current) {
      pendingSaveRef.current = true;
      logger.debug('[AutoSave] Save already in progress, queuing next save');
      return false;
    }

    // Check if there are actual changes to save
    if (!hasWorkflowChanges() && isSaved) {
      logger.debug('[AutoSave] No changes detected, skipping save');
      return true;
    }

    isSavingRef.current = true;
    setAutoSaveState(prev => ({ ...prev, status: 'saving', lastSaveAttempt: new Date() }));

    try {
      // Create a version before saving if enabled
      if (autoSaveSettings.createVersionOnSave && currentWorkflowId) {
        try {
          const versionId = createVersion(`Auto-save: ${reason}`);

          // Track version locally
          const newVersion: AutoSaveVersion = {
            id: versionId,
            timestamp: new Date(),
            nodeCount: nodes.length,
            edgeCount: edges.length,
            description: `Auto-save (${reason})`
          };

          setAutoSaveVersions(prev => {
            const updated = [newVersion, ...prev].slice(0, autoSaveSettings.maxVersions);
            persistVersions(updated);
            return updated;
          });
        } catch (versionError) {
          logger.warn('[AutoSave] Failed to create version:', versionError);
        }
      }

      // Perform the actual save
      await saveWorkflow(workflowName || null);

      // Update change tracking refs
      updateChangeRefs();

      setAutoSaveState({
        status: 'saved',
        consecutiveFailures: 0
      });

      logger.info('[AutoSave] Workflow saved automatically', { reason, workflowId: currentWorkflowId });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      setAutoSaveState(prev => ({
        status: 'error',
        error: errorMessage,
        lastSaveAttempt: new Date(),
        consecutiveFailures: prev.consecutiveFailures + 1
      }));

      logger.error('[AutoSave] Failed to save workflow:', { error, reason });

      // If we've had too many failures, disable auto-save temporarily
      if (autoSaveState.consecutiveFailures >= 5) {
        logger.warn('[AutoSave] Too many consecutive failures, disabling auto-save');
        setAutoSaveSettings(prev => ({ ...prev, enabled: false }));
      }

      return false;
    } finally {
      isSavingRef.current = false;

      // Process pending save if one was queued
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        setTimeout(() => performSave('queued'), 100);
      }
    }
  }, [
    hasWorkflowChanges,
    isSaved,
    autoSaveSettings.createVersionOnSave,
    autoSaveSettings.maxVersions,
    currentWorkflowId,
    createVersion,
    nodes,
    edges,
    saveWorkflow,
    workflowName,
    updateChangeRefs,
    autoSaveState.consecutiveFailures
  ]);

  // Toggle auto-save enabled state
  const toggleAutoSave = useCallback(() => {
    setAutoSaveSettings(prev => {
      const updated = { ...prev, enabled: !prev.enabled };
      persistSettings(updated);
      setLocalSettings(updated);
      logger.info(`[AutoSave] ${updated.enabled ? 'Enabled' : 'Disabled'}`);
      return updated;
    });

    // Reset failure count when re-enabling
    if (!autoSaveSettings.enabled) {
      setAutoSaveState(prev => ({ ...prev, consecutiveFailures: 0, status: 'idle', error: undefined }));
    }
  }, [autoSaveSettings.enabled]);

  // Update settings
  const updateAutoSaveSettings = useCallback((settings: AutoSaveSettings) => {
    setAutoSaveSettings(settings);
    persistSettings(settings);
    logger.info('[AutoSave] Settings updated', settings);
  }, []);

  // Manual save trigger
  const manualSave = useCallback(async (): Promise<void> => {
    await performSave('manual');
  }, [performSave]);

  // Interval-based auto-save
  useEffect(() => {
    if (!autoSaveSettings.enabled) {
      if (saveTimeoutRef.current) {
        clearInterval(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      return;
    }

    saveTimeoutRef.current = setInterval(() => {
      performSave('interval');
    }, autoSaveSettings.interval);

    return () => {
      if (saveTimeoutRef.current) {
        clearInterval(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [autoSaveSettings.enabled, autoSaveSettings.interval, performSave]);

  // Save on window blur
  useEffect(() => {
    if (!autoSaveSettings.saveOnBlur || !autoSaveSettings.enabled) return;

    const handleBlur = () => {
      performSave('blur');
    };

    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [autoSaveSettings.saveOnBlur, autoSaveSettings.enabled, performSave]);

  // Save on node changes (debounced)
  useEffect(() => {
    if (!autoSaveSettings.saveOnNodeChange || !autoSaveSettings.enabled) return;

    const nodesStr = JSON.stringify(nodes);
    if (nodesStr !== lastNodesRef.current && lastNodesRef.current !== '') {
      // Debounce node change saves
      const timeout = setTimeout(() => {
        performSave('node-change');
      }, 2000); // 2 second debounce

      return () => clearTimeout(timeout);
    }
  }, [nodes, autoSaveSettings.saveOnNodeChange, autoSaveSettings.enabled, performSave]);

  // Save on edge/connection changes (debounced)
  useEffect(() => {
    if (!autoSaveSettings.saveOnConnectionChange || !autoSaveSettings.enabled) return;

    const edgesStr = JSON.stringify(edges);
    if (edgesStr !== lastEdgesRef.current && lastEdgesRef.current !== '') {
      // Debounce connection change saves
      const timeout = setTimeout(() => {
        performSave('connection-change');
      }, 2000); // 2 second debounce

      return () => clearTimeout(timeout);
    }
  }, [edges, autoSaveSettings.saveOnConnectionChange, autoSaveSettings.enabled, performSave]);

  // Save before page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasWorkflowChanges() && !isSaved) {
        // Perform synchronous save attempt (limited browser support)
        navigator.sendBeacon?.('/api/workflows/autosave', JSON.stringify({
          workflowId: currentWorkflowId,
          nodes,
          edges
        }));

        // Show browser warning
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasWorkflowChanges, isSaved, currentWorkflowId, nodes, edges]);

  // Initialize change tracking refs on mount
  useEffect(() => {
    lastNodesRef.current = JSON.stringify(nodes);
    lastEdgesRef.current = JSON.stringify(edges);
  }, []);

  // Handle local settings changes
  const handleLocalSettingsChange = useCallback((key: keyof AutoSaveSettings, value: boolean | number) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  }, []);

  // Apply settings
  const handleApplySettings = useCallback(() => {
    updateAutoSaveSettings(localSettings);
    setHasUnsavedChanges(false);
  }, [localSettings, updateAutoSaveSettings]);

  // Save now handler
  const handleSaveNow = useCallback(async () => {
    await manualSave();
  }, [manualSave]);

  // Format last saved timestamp
  const formatLastSaved = (timestamp: number | null): string => {
    if (!timestamp) return 'Never';

    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    return new Date(timestamp).toLocaleString();
  };

  // Get status icon based on current state
  const getStatusIcon = () => {
    switch (autoSaveState.status) {
      case 'saving':
        return <RefreshCw className="animate-spin text-blue-500" size={16} />;
      case 'saved':
        return <CheckCircle className="text-green-500" size={16} />;
      case 'error':
        return <AlertTriangle className="text-red-500" size={16} />;
      default:
        return <Save className="text-gray-500" size={16} />;
    }
  };

  // Get status text
  const getStatusText = () => {
    switch (autoSaveState.status) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return 'All changes saved';
      case 'error':
        return 'Save failed';
      default:
        return autoSaveSettings.enabled ? 'Auto-save enabled' : 'Auto-save disabled';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed right-4 top-20 w-96 rounded-lg shadow-xl border z-50 ${
        darkMode ? 'bg-gray-900 text-white border-gray-700' : 'bg-white text-gray-800 border-gray-200'
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between p-4 border-b ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}
      >
        <h3
          className={`text-lg font-semibold flex items-center gap-2 ${
            darkMode ? 'text-white' : 'text-gray-800'
          }`}
        >
          <Settings size={20} />
          Auto-Save Manager
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowVersionHistory(!showVersionHistory)}
            className={`p-1 rounded hover:bg-gray-200 ${
              darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
            }`}
            title="Version History"
          >
            <History size={16} />
          </button>
          <button
            onClick={onClose}
            className={`p-1 rounded hover:bg-gray-200 ${
              darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
            }`}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Status Card */}
        <div
          className={`p-3 rounded-lg flex items-center justify-between ${
            autoSaveState.status === 'error'
              ? darkMode ? 'bg-red-900/30 border border-red-700' : 'bg-red-50 border border-red-200'
              : autoSaveState.status === 'saved'
              ? darkMode ? 'bg-green-900/30 border border-green-700' : 'bg-green-50 border border-green-200'
              : darkMode ? 'bg-gray-800' : 'bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm font-medium">{getStatusText()}</span>
          </div>
          {!isSaved && (
            <span className={`text-xs px-2 py-1 rounded ${
              darkMode ? 'bg-yellow-900/50 text-yellow-300' : 'bg-yellow-100 text-yellow-700'
            }`}>
              Unsaved changes
            </span>
          )}
        </div>

        {/* Auto-Save Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Auto-Save Enabled</span>
          <button
            onClick={toggleAutoSave}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              autoSaveSettings.enabled
                ? 'bg-blue-600'
                : darkMode
                ? 'bg-gray-600'
                : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                autoSaveSettings.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Save Interval */}
        <div>
          <label className="text-sm font-medium block mb-1">
            Save Interval (seconds)
          </label>
          <input
            type="number"
            min="10"
            max="300"
            value={localSettings.interval / 1000}
            onChange={(e) => handleLocalSettingsChange('interval', parseInt(e.target.value) * 1000 || 30000)}
            disabled={!autoSaveSettings.enabled}
            className={`w-full px-3 py-2 rounded border ${
              darkMode
                ? 'bg-gray-800 border-gray-600 text-white'
                : 'bg-white border-gray-300'
            } ${!autoSaveSettings.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Minimum 10 seconds, maximum 5 minutes
          </p>
        </div>

        {/* Max Versions */}
        <div>
          <label className="text-sm font-medium block mb-1">
            Max Versions to Keep
          </label>
          <input
            type="number"
            min="1"
            max="50"
            value={localSettings.maxVersions}
            onChange={(e) => handleLocalSettingsChange('maxVersions', parseInt(e.target.value) || 10)}
            className={`w-full px-3 py-2 rounded border ${
              darkMode
                ? 'bg-gray-800 border-gray-600 text-white'
                : 'bg-white border-gray-300'
            }`}
          />
        </div>

        {/* Save Triggers */}
        <div className="space-y-2">
          <label className="text-sm font-medium block">Save Triggers</label>

          <label className={`flex items-center p-2 rounded ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}>
            <input
              type="checkbox"
              checked={localSettings.saveOnNodeChange}
              onChange={(e) => handleLocalSettingsChange('saveOnNodeChange', e.target.checked)}
              className="mr-3 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm">Save on node changes</span>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Auto-save when nodes are added, removed, or modified
              </p>
            </div>
          </label>

          <label className={`flex items-center p-2 rounded ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}>
            <input
              type="checkbox"
              checked={localSettings.saveOnConnectionChange}
              onChange={(e) => handleLocalSettingsChange('saveOnConnectionChange', e.target.checked)}
              className="mr-3 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm">Save on connection changes</span>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Auto-save when connections are added or removed
              </p>
            </div>
          </label>

          <label className={`flex items-center p-2 rounded ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}>
            <input
              type="checkbox"
              checked={localSettings.saveBeforeExecution}
              onChange={(e) => handleLocalSettingsChange('saveBeforeExecution', e.target.checked)}
              className="mr-3 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm">Save before execution</span>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Automatically save before running the workflow
              </p>
            </div>
          </label>

          <label className={`flex items-center p-2 rounded ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}>
            <input
              type="checkbox"
              checked={localSettings.saveOnBlur}
              onChange={(e) => handleLocalSettingsChange('saveOnBlur', e.target.checked)}
              className="mr-3 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm">Save on window blur</span>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Auto-save when switching to another window or tab
              </p>
            </div>
          </label>

          <label className={`flex items-center p-2 rounded ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}>
            <input
              type="checkbox"
              checked={localSettings.createVersionOnSave}
              onChange={(e) => handleLocalSettingsChange('createVersionOnSave', e.target.checked)}
              className="mr-3 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm">Create version on auto-save</span>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Create a restorable version each time auto-save runs
              </p>
            </div>
          </label>
        </div>

        {/* Apply Settings Button */}
        {hasUnsavedChanges && (
          <button
            onClick={handleApplySettings}
            className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
          >
            Apply Settings
          </button>
        )}

        {/* Version History Panel */}
        {showVersionHistory && (
          <div className={`border rounded-lg ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className={`px-3 py-2 border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
              <h4 className="text-sm font-medium flex items-center gap-2">
                <History size={14} />
                Auto-Save Versions ({autoSaveVersions.length})
              </h4>
            </div>
            <div className="max-h-40 overflow-y-auto">
              {autoSaveVersions.length === 0 ? (
                <p className={`p-3 text-sm text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  No auto-save versions yet
                </p>
              ) : (
                autoSaveVersions.map((version) => (
                  <div
                    key={version.id}
                    className={`px-3 py-2 border-b last:border-b-0 ${
                      darkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {version.timestamp.toLocaleString()}
                      </span>
                      <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {version.nodeCount} nodes, {version.edgeCount} edges
                      </span>
                    </div>
                    <p className="text-sm truncate">{version.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Status Details */}
        <div
          className={`p-3 rounded-lg ${
            darkMode ? 'bg-gray-800' : 'bg-gray-50'
          }`}
        >
          <div className="text-xs space-y-2">
            <div className="flex justify-between">
              <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Last Saved:</span>
              <span className="font-mono">{formatLastSaved(lastSaved)}</span>
            </div>

            <div className="flex justify-between">
              <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Workflow:</span>
              <span className="font-mono truncate max-w-32">{workflowName || 'Untitled'}</span>
            </div>

            <div className="flex justify-between">
              <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Content:</span>
              <span className="font-mono">{nodes.length} nodes, {edges.length} edges</span>
            </div>

            {autoSaveState.error && (
              <div className={`mt-2 p-2 rounded text-red-500 ${darkMode ? 'bg-red-900/20' : 'bg-red-50'}`}>
                <span className="font-medium">Error:</span> {autoSaveState.error}
                {autoSaveState.consecutiveFailures > 0 && (
                  <span className="ml-2">({autoSaveState.consecutiveFailures} failures)</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleSaveNow}
            disabled={autoSaveState.status === 'saving'}
            className={`flex-1 px-3 py-2 rounded flex items-center justify-center gap-2 transition-colors font-medium ${
              autoSaveState.status === 'saving'
                ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                : darkMode
                ? 'bg-blue-700 text-white hover:bg-blue-600'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {autoSaveState.status === 'saving' ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Now
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Export a hook for using auto-save functionality in other components
export const useAutoSave = () => {
  const { saveWorkflow, isSaved, nodes, edges, workflowName } = useWorkflowStore();
  const [settings] = useState<AutoSaveSettings>(loadSettings);

  const performSave = useCallback(async () => {
    if (!isSaved) {
      try {
        await saveWorkflow(workflowName || null);
        return true;
      } catch (error) {
        logger.error('[useAutoSave] Save failed:', error);
        return false;
      }
    }
    return true;
  }, [isSaved, saveWorkflow, workflowName]);

  return {
    settings,
    performSave,
    hasChanges: !isSaved,
    nodeCount: nodes.length,
    edgeCount: edges.length
  };
};
