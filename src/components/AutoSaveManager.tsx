import React, { useState, useEffect } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { Save, CheckCircle, AlertTriangle, Clock, Settings, X } from 'lucide-react';

interface AutoSaveManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AutoSaveManager: React.FC<AutoSaveManagerProps> = ({ isOpen, onClose }) => {
  const {
    autoSaveState,
    autoSaveSettings,
    toggleAutoSave,
    updateAutoSaveSettings,
    manualSave,
    lastSaved,
    darkMode
  } = useWorkflowStore();
  
  const [localSettings, setLocalSettings] = useState(autoSaveSettings);
  
  useEffect(() => {
    setLocalSettings(autoSaveSettings);
  }, [autoSaveSettings]);

  const handleSaveSettings = () => {
    updateAutoSaveSettings(localSettings);
  };

  const handleManualSave = () => {
    manualSave();
  };

  const formatLastSaved = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    return new Date(timestamp).toLocaleString();
  };

  const getStatusIcon = () => {
    switch (autoSaveState.status) {
      case 'saving':
        return <Clock className="animate-spin text-blue-500" size={16} />;
      case 'saved':
        return <CheckCircle className="text-green-500" size={16} />;
      case 'error':
        return <AlertTriangle className="text-red-500" size={16} />;
      default:
        return <Save className="text-gray-500" size={16} />;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed right-4 top-20 w-80 rounded-lg shadow-xl border z-50 ${
        darkMode ? 'bg-gray-900 text-white border-gray-700' : 'bg-white text-gray-800 border-gray-200'
      }`}
    >
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
          <Save size={20} className="text-blue-500" />
          Auto-Save Manager
        </h3>
        <button
          onClick={onClose}
          className={`transition-colors ${
            darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <X size={20} />
        </button>
      </div>

      <div className={`p-4 space-y-4 ${darkMode ? 'bg-gray-800' : ''}`}>
        {/* Status */}
        <div className={`${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-50'} p-3 rounded-lg`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>Status</span>
            {getStatusIcon()}
          </div>
          <div className={`text-sm capitalize ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{autoSaveState.status}</div>
          {autoSaveState.lastError && (
            <div className="text-xs text-red-600 mt-1">{autoSaveState.lastError}</div>
          )}
        </div>

        {/* Last Saved */}
        <div className={`${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-50'} p-3 rounded-lg`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>Last Saved</span>
            <Clock size={16} className="text-gray-400" />
          </div>
          <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{formatLastSaved(lastSaved)}</div>
        </div>

        {/* Manual Save */}
        <div className="flex gap-2">
          <button
            onClick={handleManualSave}
            disabled={autoSaveState.status === 'saving'}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            <Save size={16} />
            Save Now
          </button>
          <button
            onClick={toggleAutoSave}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              autoSaveSettings.enabled
                ? darkMode
                  ? 'bg-red-700 text-white hover:bg-red-600'
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
                : darkMode
                  ? 'bg-green-700 text-white hover:bg-green-600'
                  : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}
          >
            {autoSaveSettings.enabled ? 'Disable' : 'Enable'}
          </button>
        </div>

        {/* Settings */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Settings size={16} className="text-gray-400" />
            <span className={`text-sm font-medium ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>Settings</span>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Auto-save interval (seconds)
              </label>
              <input
                type="number"
                min="10"
                max="300"
                value={localSettings.interval}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  interval: parseInt(e.target.value) || 30
                })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="saveOnChange"
                  checked={localSettings.saveOnChange}
                  onChange={(e) => setLocalSettings({
                    ...localSettings,
                    saveOnChange: e.target.checked
                  })}
                  className="mr-2"
                />
                <label htmlFor="saveOnChange" className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Save on every change
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="saveOnExecute"
                  checked={localSettings.saveOnExecute}
                  onChange={(e) => setLocalSettings({
                    ...localSettings,
                    saveOnExecute: e.target.checked
                  })}
                  className="mr-2"
                />
                <label htmlFor="saveOnExecute" className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Save before execution
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="saveOnBlur"
                  checked={localSettings.saveOnBlur}
                  onChange={(e) => setLocalSettings({
                    ...localSettings,
                    saveOnBlur: e.target.checked
                  })}
                  className="mr-2"
                />
                <label htmlFor="saveOnBlur" className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Save when window loses focus
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showNotifications"
                  checked={localSettings.showNotifications}
                  onChange={(e) => setLocalSettings({
                    ...localSettings,
                    showNotifications: e.target.checked
                  })}
                  className="mr-2"
                />
                <label htmlFor="showNotifications" className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Show save notifications
                </label>
              </div>
            </div>

            <button
              onClick={handleSaveSettings}
              className={`w-full px-4 py-2 rounded-lg transition-colors ${
                darkMode ? 'bg-gray-600 text-gray-100 hover:bg-gray-500' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Apply Settings
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className={`${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-50'} p-3 rounded-lg`}>
          <div className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>Statistics</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total saves</div>
              <div className="font-medium">{autoSaveState.saveCount}</div>
            </div>
            <div>
              <div className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Failed saves</div>
              <div className="font-medium text-red-600">{autoSaveState.errorCount}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};