/**
 * Fault Injection Panel Component
 *
 * UI for configuring and managing fault injection scenarios
 * for workflow resilience testing.
 */

import React, { useState, useEffect, useMemo } from 'react';
import type {
  FaultScenario,
  FaultType,
  FaultTiming,
} from '../../digitaltwin/types/digitaltwin';
import { getFaultInjectionEngine } from '../../digitaltwin/FaultInjectionEngine';

interface FaultInjectionPanelProps {
  workflowId: string;
  nodeId?: string;
  onFaultCreated?: (fault: FaultScenario) => void;
}

const FAULT_TYPES: { value: FaultType; label: string; description: string }[] = [
  { value: 'network_timeout', label: 'Network Timeout', description: 'Simulates network timeout' },
  { value: 'invalid_data', label: 'Invalid Data', description: 'Returns malformed data' },
  { value: 'api_failure', label: 'API Failure', description: 'API returns error status' },
  { value: 'auth_failure', label: 'Auth Failure', description: 'Authentication fails' },
  { value: 'resource_exhaustion', label: 'Resource Exhaustion', description: 'Out of memory/CPU' },
  { value: 'data_corruption', label: 'Data Corruption', description: 'Random data corruption' },
  { value: 'cascading_failure', label: 'Cascading Failure', description: 'Failure propagates' },
  { value: 'intermittent_failure', label: 'Intermittent Failure', description: 'Random success/failure' },
  { value: 'slow_response', label: 'Slow Response', description: 'High latency' },
  { value: 'partial_failure', label: 'Partial Failure', description: 'Some data missing' },
];

export const FaultInjectionPanel: React.FC<FaultInjectionPanelProps> = ({
  workflowId,
  nodeId,
  onFaultCreated,
}) => {
  const [scenarios, setScenarios] = useState<FaultScenario[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState(nodeId || '');
  const [faultType, setFaultType] = useState<FaultType>('network_timeout');
  const [probability, setProbability] = useState(0.5);
  const [timing, setTiming] = useState<FaultTiming>('during');
  const [duration, setDuration] = useState(5000);
  const [chaosMode, setChaosMode] = useState(false);
  const [chaosLevel, setChaosLevel] = useState(0.3);

  const faultEngine = useMemo(() => getFaultInjectionEngine(), []);

  useEffect(() => {
    loadScenarios();
  }, [workflowId]);

  const loadScenarios = () => {
    const allScenarios = faultEngine.listScenarios();
    setScenarios(allScenarios);
  };

  const handleCreateFromTemplate = () => {
    if (!selectedTemplate || !selectedNodeId) return;

    const fault = faultEngine.createFromTemplate(selectedTemplate, selectedNodeId, {
      probability,
      timing,
      duration,
    });

    setScenarios(prev => [...prev, fault]);
    onFaultCreated?.(fault);
  };

  const handleCreateCustom = () => {
    if (!selectedNodeId) return;

    const fault = faultEngine.createScenario({
      name: `Custom ${faultType} - ${selectedNodeId}`,
      description: `Custom fault injection for ${selectedNodeId}`,
      nodeId: selectedNodeId,
      faultType,
      probability,
      timing,
      duration,
      enabled: true,
    });

    setScenarios(prev => [...prev, fault]);
    onFaultCreated?.(fault);
  };

  const handleToggleScenario = (scenarioId: string) => {
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) return;

    faultEngine.updateScenario(scenarioId, {
      enabled: !scenario.enabled,
    });

    loadScenarios();
  };

  const handleDeleteScenario = (scenarioId: string) => {
    faultEngine.deleteScenario(scenarioId);
    setScenarios(prev => prev.filter(s => s.id !== scenarioId));
  };

  const handleToggleChaos = () => {
    if (chaosMode) {
      faultEngine.disableChaos();
    } else {
      faultEngine.enableChaos(chaosLevel);
    }
    setChaosMode(!chaosMode);
  };

  const templates = faultEngine.listTemplates();

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 bg-gray-50 p-4">
        <h2 className="text-xl font-semibold text-gray-900">Fault Injection</h2>
        <p className="text-sm text-gray-600 mt-1">
          Configure fault scenarios for resilience testing
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Chaos Mode Toggle */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-yellow-900">Chaos Mode</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Enable random fault injection across all scenarios
              </p>
            </div>
            <button
              onClick={handleToggleChaos}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                chaosMode ? 'bg-yellow-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  chaosMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          {chaosMode && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">
                Chaos Level: {(chaosLevel * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={chaosLevel * 100}
                onChange={e => {
                  const level = parseInt(e.target.value) / 100;
                  setChaosLevel(level);
                  faultEngine.enableChaos(level);
                }}
                className="w-full mt-2"
              />
            </div>
          )}
        </div>

        {/* Quick Templates */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium mb-4">Quick Templates</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template
              </label>
              <select
                value={selectedTemplate}
                onChange={e => setSelectedTemplate(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Select a template...</option>
                {templates.map(template => (
                  <option key={template.name} value={template.name}>
                    {template.name} - {template.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Node ID
              </label>
              <input
                type="text"
                value={selectedNodeId}
                onChange={e => setSelectedNodeId(e.target.value)}
                placeholder="Enter node ID"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleCreateFromTemplate}
              disabled={!selectedTemplate || !selectedNodeId}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create from Template
            </button>
          </div>
        </div>

        {/* Custom Fault Configuration */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium mb-4">Custom Fault</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fault Type
              </label>
              <select
                value={faultType}
                onChange={e => setFaultType(e.target.value as FaultType)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {FAULT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label} - {type.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Probability: {(probability * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={probability * 100}
                onChange={e => setProbability(parseInt(e.target.value) / 100)}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timing
              </label>
              <div className="flex space-x-2">
                {(['before', 'during', 'after'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTiming(t)}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      timing === t
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (ms)
              </label>
              <input
                type="number"
                value={duration}
                onChange={e => setDuration(parseInt(e.target.value))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleCreateCustom}
              disabled={!selectedNodeId}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Custom Fault
            </button>
          </div>
        </div>

        {/* Active Scenarios */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="font-medium">Active Scenarios ({scenarios.length})</h3>
          </div>
          {scenarios.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No fault scenarios configured yet
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {scenarios.map(scenario => (
                <div key={scenario.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{scenario.name}</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          scenario.enabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {scenario.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {scenario.description}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>Type: {scenario.faultType}</span>
                        <span>Probability: {(scenario.probability * 100).toFixed(0)}%</span>
                        <span>Timing: {scenario.timing}</span>
                        <span>Node: {scenario.nodeId}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleToggleScenario(scenario.id)}
                        className="p-2 text-gray-600 hover:text-gray-900 rounded hover:bg-gray-100"
                        title={scenario.enabled ? 'Disable' : 'Enable'}
                      >
                        {scenario.enabled ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteScenario(scenario.id)}
                        className="p-2 text-red-600 hover:text-red-900 rounded hover:bg-red-50"
                        title="Delete"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FaultInjectionPanel;
