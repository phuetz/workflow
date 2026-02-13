/**
 * Web3 Workflow Builder
 * Specialized workflow builder for blockchain automation
 */

import React, { useState, useCallback } from 'react';
import { ALL_BLOCKCHAIN_NODES } from '../../web3/nodeTypes';
import type { BlockchainNetwork } from '../../types/web3';

interface Web3WorkflowBuilderProps {
  onSave?: (workflow: any) => void;
}

export const Web3WorkflowBuilder: React.FC<Web3WorkflowBuilderProps> = ({ onSave }) => {
  const [selectedNetwork, setSelectedNetwork] = useState<BlockchainNetwork>('ethereum');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNodes, setSelectedNodes] = useState<any[]>([]);

  const networks: BlockchainNetwork[] = [
    'ethereum',
    'polygon',
    'arbitrum',
    'optimism',
    'base',
    'solana',
    'bsc',
    'avalanche',
    'cardano',
    'polkadot',
    'cosmos',
    'sui',
    'aptos',
  ];

  const categories = [
    { id: 'all', name: 'All Nodes', icon: '📦' },
    { id: 'trigger', name: 'Triggers', icon: '⚡' },
    { id: 'action', name: 'Actions', icon: '🎯' },
    { id: 'query', name: 'Queries', icon: '🔍' },
    { id: 'data-processing', name: 'Data Processing', icon: '⚙️' },
  ];

  const filteredNodes = ALL_BLOCKCHAIN_NODES.filter((node) => {
    const matchesCategory = selectedCategory === 'all' || node.category === selectedCategory;
    const matchesNetwork =
      node.networks.includes('all') || node.networks.includes(selectedNetwork);
    const matchesSearch =
      searchQuery === '' ||
      node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesNetwork && matchesSearch;
  });

  const addNode = useCallback((node: any) => {
    setSelectedNodes((prev) => [...prev, { ...node, id: `${node.id}-${Date.now()}` }]);
  }, []);

  const removeNode = useCallback((nodeId: string) => {
    setSelectedNodes((prev) => prev.filter((n) => n.id !== nodeId));
  }, []);

  const handleSave = useCallback(() => {
    if (onSave) {
      onSave({
        network: selectedNetwork,
        nodes: selectedNodes,
        createdAt: Date.now(),
      });
    }
  }, [selectedNetwork, selectedNodes, onSave]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">⛓️ Web3 Workflow Builder</h1>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Save Workflow
          </button>
        </div>

        {/* Network Selector */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Network:</label>
          <select
            value={selectedNetwork}
            onChange={(e) => setSelectedNetwork(e.target.value as BlockchainNetwork)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            {networks.map((network) => (
              <option key={network} value={network}>
                {network.charAt(0).toUpperCase() + network.slice(1)}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Node Categories */}
        <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Categories</h2>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`w-full text-left px-3 py-2 rounded-lg mb-1 transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-purple-100 text-purple-900'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <span className="mr-2">{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content - Available Nodes */}
        <div className="flex-1 overflow-y-auto p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Available Nodes ({filteredNodes.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNodes.map((node) => (
              <div
                key={node.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => addNode(node)}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-2xl">{node.icon}</span>
                  <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                    {node.category}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{node.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{node.description}</p>
                <div className="flex flex-wrap gap-1">
                  {node.networks.includes('all') ? (
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                      All Networks
                    </span>
                  ) : (
                    node.networks.slice(0, 3).map((network) => (
                      <span
                        key={network}
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded"
                      >
                        {network}
                      </span>
                    ))
                  )}
                  {node.networks.length > 3 && !node.networks.includes('all') && (
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                      +{node.networks.length - 3}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredNodes.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No nodes found matching your criteria</p>
            </div>
          )}
        </div>

        {/* Right Sidebar - Selected Nodes */}
        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Workflow Nodes ({selectedNodes.length})
            </h2>

            {selectedNodes.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-sm">
                  Click on nodes to add them to your workflow
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedNodes.map((node, index) => (
                  <div
                    key={node.id}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{node.icon}</span>
                          <span className="text-sm font-medium text-gray-900">
                            {index + 1}. {node.name}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">{node.description}</p>
                      </div>
                      <button
                        onClick={() => removeNode(node.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="bg-white border-t border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex gap-6">
            <span className="text-gray-600">
              <strong className="text-gray-900">{filteredNodes.length}</strong> available nodes
            </span>
            <span className="text-gray-600">
              <strong className="text-gray-900">{selectedNodes.length}</strong> selected
            </span>
            <span className="text-gray-600">
              Network: <strong className="text-gray-900">{selectedNetwork}</strong>
            </span>
          </div>
          <div className="text-gray-500">
            Total 50+ blockchain nodes across 13 networks
          </div>
        </div>
      </div>
    </div>
  );
};
