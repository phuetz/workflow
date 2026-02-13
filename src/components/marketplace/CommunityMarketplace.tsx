/**
 * Community Marketplace
 * Browse, install, and manage community-contributed nodes
 *
 * Refactored to use modular components from ./community/
 */

import React from 'react';
import { Package } from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import {
  MarketplaceHeader,
  MarketplaceFilters,
  MarketplaceGrid,
  FeaturedNodeCard,
  InstalledNodeCard,
  PluginDetails,
  SubmitNodeForm,
  useMarketplace
} from './community';

function CommunityMarketplace() {
  const { darkMode } = useWorkflowStore();

  const {
    // Data
    nodes,
    featuredNodes,
    installedNodes,

    // Pagination
    currentPage,
    totalPages,
    setCurrentPage,

    // Search & Filters
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    sortBy,
    setSortBy,

    // UI State
    loading,
    selectedNode,
    setSelectedNode,
    showFilters,
    setShowFilters,
    activeTab,
    setActiveTab,

    // Actions
    isNodeInstalled,
    installNode,
    uninstallNode
  } = useMarketplace();

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} pt-20`}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header with tabs */}
        <MarketplaceHeader
          darkMode={darkMode}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Discover Tab */}
        {activeTab === 'discover' && (
          <div>
            {/* Featured Section */}
            {featuredNodes.length > 0 && (
              <div className="mb-8">
                <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Featured Nodes
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featuredNodes.slice(0, 3).map(node => (
                    <FeaturedNodeCard
                      key={node.id}
                      node={node}
                      darkMode={darkMode}
                      isInstalled={isNodeInstalled(node.id)}
                      onInstall={() => installNode(node.id)}
                      onSelect={() => setSelectedNode(node)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Search and Filters */}
            <MarketplaceFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onToggleFilters={() => setShowFilters(!showFilters)}
              selectedCategory={selectedCategory}
              sortBy={sortBy}
              onCategoryChange={setSelectedCategory}
              onSortChange={setSortBy}
              showFilters={showFilters}
              darkMode={darkMode}
            />

            {/* Nodes Grid */}
            <MarketplaceGrid
              nodes={nodes}
              darkMode={darkMode}
              isNodeInstalled={isNodeInstalled}
              onInstall={installNode}
              onSelect={setSelectedNode}
              loading={loading}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}

        {/* Installed Tab */}
        {activeTab === 'installed' && (
          <InstalledNodesTab
            nodes={nodes}
            featuredNodes={featuredNodes}
            installedNodes={installedNodes}
            darkMode={darkMode}
            onUninstall={uninstallNode}
            onSelect={setSelectedNode}
          />
        )}

        {/* Submit Tab */}
        {activeTab === 'submit' && (
          <SubmitNodeForm darkMode={darkMode} />
        )}

        {/* Node Details Modal */}
        {selectedNode && (
          <PluginDetails
            node={selectedNode}
            isInstalled={isNodeInstalled(selectedNode.id)}
            onClose={() => setSelectedNode(null)}
            onInstall={() => installNode(selectedNode.id)}
            onUninstall={() => uninstallNode(selectedNode.id)}
            darkMode={darkMode}
          />
        )}
      </div>
    </div>
  );
}

// Installed Nodes Tab Component
interface InstalledNodesTabProps {
  nodes: ReturnType<typeof useMarketplace>['nodes'];
  featuredNodes: ReturnType<typeof useMarketplace>['featuredNodes'];
  installedNodes: ReturnType<typeof useMarketplace>['installedNodes'];
  darkMode: boolean;
  onUninstall: (nodeId: string) => void;
  onSelect: (node: ReturnType<typeof useMarketplace>['nodes'][0]) => void;
}

function InstalledNodesTab({
  nodes,
  featuredNodes,
  installedNodes,
  darkMode,
  onUninstall,
  onSelect
}: InstalledNodesTabProps) {
  if (installedNodes.length === 0) {
    return (
      <div className={`text-center py-16 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        <Package size={48} className="mx-auto mb-4 opacity-50" />
        <p className="text-lg">No nodes installed yet</p>
        <p className="text-sm mt-2">Browse the marketplace to find and install nodes</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {installedNodes.map(installation => {
        const node = [...nodes, ...featuredNodes].find(n => n.id === installation.nodeId);
        if (!node) return null;

        return (
          <InstalledNodeCard
            key={installation.id}
            node={node}
            installation={installation}
            darkMode={darkMode}
            onUninstall={() => onUninstall(node.id)}
            onSelect={() => onSelect(node)}
          />
        );
      })}
    </div>
  );
}

export default CommunityMarketplace;
