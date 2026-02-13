/**
 * Workflow Marketplace Component
 * Browse and install workflow templates and integrations
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  Star,
  Download,
  Eye,
  User,
  Calendar,
  Tag,
  Grid,
  List,
  TrendingUp,
  Clock,
  Award,
  Package,
  Plus,
  ExternalLink,
  Heart,
  MessageSquare,
  Users,
  Briefcase,
  ShoppingCart,
  Share2,
  HardDrive,
  Database,
  BarChart,
  Code,
  Megaphone,
  Brain,
  DollarSign,
  Wrench,
  Zap,
  Circle
} from 'lucide-react';
import { nodeRegistry } from '../../services/NodeRegistry';
import type {
  IntegrationNode,
  IntegrationCategory,
  IntegrationMarketplace,
  MarketplaceFilters
} from '../../types/integrations';
import { logger } from '../../services/SimpleLogger';

interface WorkflowMarketplaceProps {
  onInstall?: (nodeId: string) => void;
  onPreview?: (node: IntegrationNode) => void;
  onClose?: () => void;
}

type ViewMode = 'grid' | 'list';
type SortBy = 'popularity' | 'rating' | 'recent' | 'name';

export const WorkflowMarketplace: React.FC<WorkflowMarketplaceProps> = ({
  onInstall,
  onPreview,
  onClose
}) => {
  const [marketplace, setMarketplace] = useState<IntegrationMarketplace | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('popularity');
  const [selectedCategory, setSelectedCategory] = useState<IntegrationCategory | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState<MarketplaceFilters>({
    pricing: undefined,
    minRating: undefined,
    tags: []
  });

  useEffect(() => {
    loadMarketplace();
  }, []);

  const loadMarketplace = async () => {
    try {
      setLoading(true);
      const data = nodeRegistry.getMarketplace();
      setMarketplace(data);
    } catch (error) {
      logger.error('Failed to load marketplace:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort nodes
  const filteredNodes = useMemo(() => {
    if (!marketplace) return [];

    let nodes: IntegrationNode[] = [];

    if (searchQuery.trim()) {
      nodes = marketplace.search(searchQuery, filters);
    } else if (selectedCategory === 'all') {
      nodes = nodeRegistry.getAll();
    } else {
      nodes = nodeRegistry.getByCategory(selectedCategory);
    }

    // Apply additional filters
    if (filters.pricing) {
      nodes = nodes.filter(n => n.pricing === filters.pricing);
    }
    if (filters.minRating) {
      nodes = nodes.filter(n => n.rating >= filters.minRating!);
    }
    if (filters.tags?.length) {
      nodes = nodes.filter(n => 
        filters.tags!.some(tag => n.tags.includes(tag))
      );
    }

    // Sort nodes
    switch (sortBy) {
      case 'popularity':
        return [...nodes].sort((a, b) => b.popularity - a.popularity);
      case 'rating':
        return [...nodes].sort((a, b) => b.rating - a.rating);
      case 'recent':
        return [...nodes].sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());
      case 'name':
        return [...nodes].sort((a, b) => a.displayName.localeCompare(b.displayName));
      default:
        return nodes;
    }
  }, [marketplace, searchQuery, selectedCategory, filters, sortBy]);

  const getCategoryIcon = (category: IntegrationCategory) => {
    const icons = {
      communication: MessageSquare,
      crm: Users,
      productivity: Briefcase,
      ecommerce: ShoppingCart,
      social: Share2,
      storage: HardDrive,
      databases: Database,
      analytics: BarChart,
      development: Code,
      marketing: Megaphone,
      ai: Brain,
      finance: DollarSign,
      utilities: Wrench,
      triggers: Zap,
      custom: Circle
    };
    return icons[category] || Circle;
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-1 text-sm text-gray-600">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const renderNodeCard = (node: IntegrationNode) => {
    const IconComponent = getCategoryIcon(node.category);

    return (
      <div
        key={node.id}
        className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 overflow-hidden"
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white mr-3"
                style={{ backgroundColor: node.color }}
              >
                <IconComponent className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{node.displayName}</h3>
                <p className="text-sm text-gray-500">{node.author}</p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              {node.pricing === 'premium' && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                  Premium
                </span>
              )}
              {node.pricing === 'enterprise' && (
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                  Enterprise
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {node.description}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1 mb-3">
            {node.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
              >
                {tag}
              </span>
            ))}
            {node.tags.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                +{node.tags.length - 3}
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              {renderStars(node.rating)}
              <div className="flex items-center text-sm text-gray-500">
                <Download className="w-4 h-4 mr-1" />
                {node.popularity.toLocaleString()}
              </div>
            </div>
            <div className="text-xs text-gray-400">
              {node.lastUpdated.toLocaleDateString()}
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-2">
            <button
              onClick={() => onPreview?.(node)}
              className="flex-1 px-3 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 text-sm flex items-center justify-center"
            >
              <Eye className="w-4 h-4 mr-1" />
              Preview
            </button>
            <button
              onClick={() => onInstall?.(node.id)}
              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center justify-center"
            >
              <Plus className="w-4 h-4 mr-1" />
              Install
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderNodeListItem = (node: IntegrationNode) => {
    const IconComponent = getCategoryIcon(node.category);

    return (
      <div
        key={node.id}
        className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all duration-200"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-1">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white mr-4"
              style={{ backgroundColor: node.color }}
            >
              <IconComponent className="w-5 h-5" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center">
                <h3 className="font-semibold text-gray-900 mr-2">{node.displayName}</h3>
                {node.pricing !== 'free' && (
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    node.pricing === 'premium' ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {node.pricing}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">{node.description}</p>
              <div className="flex items-center space-x-4 mt-2">
                {renderStars(node.rating)}
                <div className="flex items-center text-sm text-gray-500">
                  <Download className="w-4 h-4 mr-1" />
                  {node.popularity.toLocaleString()}
                </div>
                <span className="text-sm text-gray-500">by {node.author}</span>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-2 ml-4">
            <button
              onClick={() => onPreview?.(node)}
              className="px-3 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
            >
              Preview
            </button>
            <button
              onClick={() => onInstall?.(node.id)}
              className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Install
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Package className="w-8 h-8 animate-pulse text-blue-600 mb-4" />
          <p className="text-gray-600">Loading marketplace...</p>
        </div>
      </div>
    );
  }

  if (!marketplace) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load marketplace</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Package className="w-6 h-6 text-gray-700 mr-3" />
            <div>
              <h2 className="text-lg font-semibold">Integration Marketplace</h2>
              <p className="text-sm text-gray-600">
                Discover and install workflow integrations
              </p>
            </div>
          </div>
          
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search integrations..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as IntegrationCategory | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {marketplace.categories.map((category) => (
              <option key={category.name} value={category.name}>
                {category.displayName} ({category.count})
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="popularity">Most Popular</option>
            <option value="rating">Highest Rated</option>
            <option value="recent">Recently Updated</option>
            <option value="name">Name (A-Z)</option>
          </select>

          {/* View Mode */}
          <div className="flex border border-gray-300 rounded-md">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 border-l border-gray-300 ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!searchQuery && selectedCategory === 'all' && (
          <>
            {/* Featured Section */}
            <div className="px-6 py-6">
              <div className="flex items-center mb-4">
                <Award className="w-5 h-5 text-yellow-500 mr-2" />
                <h3 className="text-lg font-semibold">Featured Integrations</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {marketplace.featured.map(renderNodeCard)}
              </div>
            </div>

            {/* Popular Section */}
            <div className="px-6 py-6 border-t border-gray-200">
              <div className="flex items-center mb-4">
                <TrendingUp className="w-5 h-5 text-green-500 mr-2" />
                <h3 className="text-lg font-semibold">Popular This Week</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {marketplace.popular.slice(0, 6).map(renderNodeCard)}
              </div>
            </div>

            {/* Recent Section */}
            <div className="px-6 py-6 border-t border-gray-200">
              <div className="flex items-center mb-4">
                <Clock className="w-5 h-5 text-blue-500 mr-2" />
                <h3 className="text-lg font-semibold">Recently Updated</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {marketplace.recent.slice(0, 6).map(renderNodeCard)}
              </div>
            </div>
          </>
        )}

        {/* Search Results / Category Results */}
        {(searchQuery || selectedCategory !== 'all') && (
          <div className="px-6 py-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {searchQuery ? `Search Results (${filteredNodes.length})` : 
                 `${marketplace.categories.find(c => c.name === selectedCategory)?.displayName} (${filteredNodes.length})`}
              </h3>
            </div>

            {filteredNodes.length > 0 ? (
              <div className={
                viewMode === 'grid' 
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                  : "space-y-4"
              }>
                {filteredNodes.map(viewMode === 'grid' ? renderNodeCard : renderNodeListItem)}
              </div>
            ) : (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No integrations found</p>
                <p className="text-gray-400 text-sm mt-2">
                  Try adjusting your search terms or filters
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};