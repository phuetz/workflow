/**
 * Edge Deployment Panel
 * Deploy workflows to edge devices with platform selection
 */

import React, { useState } from 'react';
import { Loader, Rocket, Server, Settings, Zap } from 'lucide-react';
import { createCompiler, type CompilationResult } from '../../edge/EdgeCompiler';
import type { Workflow } from '../../types/workflowTypes';
import type { EdgeDevice } from '../../types/edge';
import { logger } from '../../services/SimpleLogger';

interface EdgeDeploymentPanelProps {
  workflow: Workflow;
  devices: EdgeDevice[];
  onDeploy: (deploymentId: string) => void;
}

const compiler = createCompiler();

export default function EdgeDeploymentPanel({ workflow, devices, onDeploy }: EdgeDeploymentPanelProps) {
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [targetPlatform, setTargetPlatform] = useState<'node' | 'deno'>('node');
  const [optimization, setOptimization] = useState<'basic' | 'aggressive'>('aggressive');
  const [isCompiling, setIsCompiling] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [compilationResult, setCompilationResult] = useState<CompilationResult | null>(null);

  const handleCompile = async () => {
    setIsCompiling(true);
    try {
      const result = await compiler.compile(workflow, {
        targetPlatform,
        optimization,
        minify: true,
        treeShake: true,
        bundleDependencies: true
      });

      setCompilationResult(result);
    } catch (error) {
      logger.error('Compilation failed:', error);
    } finally {
      setIsCompiling(false);
    }
  };

  const handleDeploy = async () => {
    if (!compilationResult || selectedDevices.length === 0) return;

    setIsDeploying(true);
    try {
      // Simulate deployment
      await new Promise(resolve => setTimeout(resolve, 2000));
      onDeploy(`deployment-${Date.now()}`);
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Compilation Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <Settings size={20} />
          <span>Compilation Settings</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Target Platform</label>
            <select
              value={targetPlatform}
              onChange={(e) => setTargetPlatform(e.target.value as 'node' | 'deno')}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
            >
              <option value="node">Node.js</option>
              <option value="deno">Deno</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Optimization</label>
            <select
              value={optimization}
              onChange={(e) => setOptimization(e.target.value as 'basic' | 'aggressive')}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
            >
              <option value="basic">Basic</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleCompile}
          disabled={isCompiling}
          className="mt-4 w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center space-x-2"
        >
          {isCompiling ? (
            <>
              <Loader className="animate-spin" size={16} />
              <span>Compiling...</span>
            </>
          ) : (
            <>
              <Zap size={16} />
              <span>Compile Workflow</span>
            </>
          )}
        </button>

        {compilationResult && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Compiled Size</p>
                <p className="font-semibold">{(compilationResult.stats.compiledSize / 1024).toFixed(2)} KB</p>
              </div>
              <div>
                <p className="text-gray-500">Compression</p>
                <p className="font-semibold">{compilationResult.stats.compressionRatio.toFixed(2)}x</p>
              </div>
              <div>
                <p className="text-gray-500">Nodes Compiled</p>
                <p className="font-semibold">{compilationResult.stats.nodesCompiled}</p>
              </div>
              <div>
                <p className="text-gray-500">Compilation Time</p>
                <p className="font-semibold">{compilationResult.stats.compilationTime} ms</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Device Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <Server size={20} />
          <span>Target Devices</span>
        </h3>

        <div className="space-y-2">
          {devices.map(device => (
            <label key={device.id} className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750">
              <input
                type="checkbox"
                checked={selectedDevices.includes(device.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedDevices([...selectedDevices, device.id]);
                  } else {
                    setSelectedDevices(selectedDevices.filter(id => id !== device.id));
                  }
                }}
                className="mr-3"
              />
              <div className="flex-1">
                <p className="font-medium">{device.name}</p>
                <p className="text-sm text-gray-500">{device.type} • {device.platform}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs ${
                device.status === 'online' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {device.status}
              </span>
            </label>
          ))}
        </div>

        <p className="mt-4 text-sm text-gray-500">
          {selectedDevices.length} device(s) selected
        </p>
      </div>

      {/* Deploy Button */}
      <button
        onClick={handleDeploy}
        disabled={!compilationResult || selectedDevices.length === 0 || isDeploying}
        className="w-full px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center justify-center space-x-2 text-lg font-semibold"
      >
        {isDeploying ? (
          <>
            <Loader className="animate-spin" size={20} />
            <span>Deploying...</span>
          </>
        ) : (
          <>
            <Rocket size={20} />
            <span>Deploy to Edge</span>
          </>
        )}
      </button>
    </div>
  );
}
