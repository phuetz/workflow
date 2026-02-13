/**
 * useMarketplace Hook
 * Manages marketplace state and API calls
 */

import { useState, useEffect, useCallback } from 'react';
import { CommunityService } from '../../../services/CommunityService';
import { logger } from '../../../services/SimpleLogger';
import type {
  CommunityNode,
  NodeInstallation,
  NodeCategory,
  NodeSortOption,
  NodeSearchFilters
} from './types';

interface UseMarketplaceReturn {
  // Data
  nodes: CommunityNode[];
  featuredNodes: CommunityNode[];
  installedNodes: NodeInstallation[];

  // Pagination
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;

  // Search & Filters
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: NodeCategory | 'all';
  setSelectedCategory: (category: NodeCategory | 'all') => void;
  sortBy: NodeSortOption;
  setSortBy: (sort: NodeSortOption) => void;

  // UI State
  loading: boolean;
  selectedNode: CommunityNode | null;
  setSelectedNode: (node: CommunityNode | null) => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  activeTab: 'discover' | 'installed' | 'submit';
  setActiveTab: (tab: 'discover' | 'installed' | 'submit') => void;

  // Actions
  isNodeInstalled: (nodeId: string) => boolean;
  installNode: (nodeId: string) => Promise<void>;
  uninstallNode: (nodeId: string) => Promise<void>;
}

export function useMarketplace(): UseMarketplaceReturn {
  // Data state
  const [nodes, setNodes] = useState<CommunityNode[]>([]);
  const [featuredNodes, setFeaturedNodes] = useState<CommunityNode[]>([]);
  const [installedNodes, setInstalledNodes] = useState<NodeInstallation[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<NodeCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<NodeSortOption>('relevance');

  // UI state
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<CommunityNode | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'discover' | 'installed' | 'submit'>('discover');

  const communityService = CommunityService.getInstance();

  // Load initial data
  const loadInitialData = useCallback(async () => {
    try {
      const [featured, _trending, installed] = await Promise.all([
        communityService.getFeaturedNodes(),
        communityService.getTrendingNodes(),
        communityService.getInstalledNodes('current-user')
      ]);

      setFeaturedNodes(featured);
      setInstalledNodes(installed);
    } catch (error) {
      logger.error('Failed to load marketplace data:', error);
    }
  }, [communityService]);

  // Search nodes
  const searchNodes = useCallback(async () => {
    setLoading(true);
    try {
      const filters: NodeSearchFilters = {
        query: searchQuery,
        categories: selectedCategory === 'all' ? undefined : [selectedCategory],
        sortBy,
        page: currentPage,
        limit: 12
      };

      const result = await communityService.searchNodes(filters);
      setNodes(result.nodes);
      setTotalPages(result.totalPages);
    } catch (error) {
      logger.error('Failed to search nodes:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, sortBy, currentPage, communityService]);

  // Initial load
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Search on filter changes
  useEffect(() => {
    searchNodes();
  }, [searchNodes]);

  // Check if node is installed
  const isNodeInstalled = useCallback(
    (nodeId: string) => installedNodes.some(i => i.nodeId === nodeId),
    [installedNodes]
  );

  // Install node
  const installNode = useCallback(async (nodeId: string) => {
    try {
      const installation = await communityService.installNode(nodeId);
      setInstalledNodes(prev => [...prev, installation]);
    } catch (error) {
      logger.error('Failed to install node:', error);
    }
  }, [communityService]);

  // Uninstall node
  const uninstallNode = useCallback(async (nodeId: string) => {
    try {
      await communityService.uninstallNode(nodeId);
      setInstalledNodes(prev => prev.filter(i => i.nodeId !== nodeId));
    } catch (error) {
      logger.error('Failed to uninstall node:', error);
    }
  }, [communityService]);

  return {
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
  };
}

export default useMarketplace;
