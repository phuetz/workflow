import React, { useEffect, useState } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { Save, Check, AlertCircle } from 'lucide-react';

export default function AutoSaveManager() {
  const { nodes, edges, saveWorkflow, darkMode } = useWorkflowStore();
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!autoSaveEnabled) return;

    const interval = setInterval(async () => {
      if (nodes.length > 0) {
        setSaveStatus('saving');
        try {
          await saveWorkflow();
          setLastSaved(new Date());
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
          setSaveStatus('error');
          setTimeout(() => setSaveStatus('idle'), 3000);
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [nodes, edges, autoSaveEnabled, saveWorkflow]);

  // Save on significant changes
  useEffect(() => {
    if (!autoSaveEnabled || nodes.length === 0) return;

    const timeoutId = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await saveWorkflow();
        setLastSaved(new Date());
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error) {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    }, 5000); // Save 5 seconds after last change

    return () => clearTimeout(timeoutId);
  }, [nodes, edges]);

  const getStatusIcon = () => {
    switch (saveStatus) {
      case 'saving':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>;
      case 'saved':
        return <Check size={16} className="text-green-500" />;
      case 'error':
        return <AlertCircle size={16} className="text-red-500" />;
      default:
        return <Save size={16} className="text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (saveStatus) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return 'Saved';
      case 'error':
        return 'Save failed';
      default:
        return lastSaved ? `Last saved: ${lastSaved.toLocaleTimeString()}` : 'Auto-save ready';
    }
  };

  return (
    <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-30 ${
      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    } border rounded-lg shadow-lg px-3 py-2 flex items-center space-x-3`}>
      <div className="flex items-center space-x-2">
        {getStatusIcon()}
        <span className="text-sm">{getStatusText()}</span>
      </div>
      
      <div className="h-4 w-px bg-gray-300"></div>
      
      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={autoSaveEnabled}
          onChange={(e) => setAutoSaveEnabled(e.target.checked)}
          className="rounded"
        />
        <span className="text-sm">Auto-save</span>
      </label>
    </div>
  );
}