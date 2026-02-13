/**
 * Template Library Component
 * Browse, search, and install workflow templates from the marketplace
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  Star,
  Download,
  Clock,
  Eye,
  Grid,
  List,
  TrendingUp,
  Award,
  BookOpen,
  Filter,
  X,
  ChevronDown,
  Check,
  Briefcase,
  Megaphone,
  Headphones,
  Database,
  Bell,
  ShoppingCart,
  DollarSign,
  Code,
  BarChart,
  Shuffle,
  Activity,
  Users,
  Folder,
  PlayCircle,
  Share2
} from 'lucide-react';
import { templateService } from '../../services/TemplateService';
import { MarketplaceService } from '../../services/MarketplaceService';
import type {
  WorkflowTemplate,
  TemplateCategory,
  TemplateFilters,
  TemplateMarketplace,
} from '../../types/templates';
import { logger } from '../../services/SimpleLogger';

interface TemplateLibraryProps {
  onInstall?: (template: WorkflowTemplate) => void;
  onPreview?: (template: WorkflowTemplate) => void;
  onClose?: () => void;
  defaultCategory?: TemplateCategory | 'all';
}

type ViewMode = 'grid' | 'list';
type SortBy = 'popular' | 'rating' | 'recent' | 'name' | 'downloads';

const CATEGORY_ICONS: Record<TemplateCategory, React.ComponentType> = {
  business_automation: Briefcase,
  marketing: Megaphone,
  sales: TrendingUp,
  customer_support: Headphones,
  data_processing: Database,
  notifications: Bell,
  social_media: Share2,
  ecommerce: ShoppingCart,
  finance: DollarSign,
  hr: Users,
  development: Code,
  analytics: BarChart,
  productivity: Activity,
  integration: Shuffle,
  monitoring: Activity,
  communication: Share2,
  devops: Code,
  iot: Activity,
  security: Activity,
  lead_generation: TrendingUp,
  events: Bell,
  compliance: Activity,
  web3: Activity,
  data: Database,
  ai: Activity,
  creative: Activity,
  chat: Share2,
  forms: Activity,
  utilities: Activity,
  support: Headphones,
  social: Share2
};

export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  onInstall,
  onPreview,
  onClose,
  defaultCategory = 'all' as TemplateCategory | 'all'
}) => {
  const [marketplace, setMarketplace] = useState<TemplateMarketplace | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('popular');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>(defaultCategory ?? 'all');
  const [installing, setInstalling] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<TemplateFilters>({
    pricing: undefined,
    difficulty: undefined,
    minRating: undefined,
    maxSetupTime: undefined,
    authorType: undefined,
    tags: []
  });

  useEffect(() => {
    const loadMarketplace = async () => {
      try {
        setLoading(true);
        const data = templateService.getMarketplace(filters);
        setMarketplace(data);
      } catch (error) {
        logger.error('Failed to load marketplace:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMarketplace();
  }, [filters]);

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    if (!marketplace) return [];

    let templates: WorkflowTemplate[] = [];

    if (searchQuery.trim()) {
      templates = marketplace.search(searchQuery, filters);
    } else if (selectedCategory === 'all') {
      templates = templateService.getAll();
    } else {
      templates = templateService.getByCategory(selectedCategory);
    }

    // Apply additional filters
    if (filters.difficulty) {
      templates = templates.filter(t => t.difficulty === filters.difficulty);
    }
    if (filters.pricing) {
      templates = templates.filter(t => t.pricing === filters.pricing);
    }
    if (filters.authorType) {
      templates = templates.filter(t => t.authorType === filters.authorType);
    }
    if (filters.minRating) {
      templates = templates.filter(t => t.rating >= filters.minRating!);
    }
    if (filters.maxSetupTime) {
      templates = templates.filter(t => t.estimatedSetupTime <= filters.maxSetupTime!);
    }

    // Sort templates
    switch (sortBy) {
      case 'popular':
        return [...templates].sort((a, b) => b.downloads - a.downloads);
      case 'rating':
        return [...templates].sort((a, b) => b.rating - a.rating);
      case 'recent':
        return [...templates].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      case 'name':
        return [...templates].sort((a, b) => a.name.localeCompare(b.name));
      case 'downloads':
        return [...templates].sort((a, b) => b.downloads - a.downloads);
      default:
        return templates;
    }
  }, [marketplace, searchQuery, selectedCategory, filters, sortBy]);

  const getCategoryIcon = useCallback((category: TemplateCategory) => {
    return CATEGORY_ICONS[category] || Folder;
  }, []);

  const getDifficultyColor = useCallback((difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-100';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100';
      case 'advanced': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }, []);

  const getAuthorBadge = useCallback((authorType: string) => {
    switch (authorType) {
      case 'official':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Official</span>;
      case 'verified':
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Verified</span>;
      case 'community':
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">Community</span>;
      default:
        return null;
    }
  }, []);

  const renderStars = useCallback((rating: number) => {
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
  }, []);

  const handleInstall = async (template: WorkflowTemplate) => {
    try {
      setInstalling(template.id);
      await templateService.install(template.id);
      onInstall?.(template);

      setTimeout(() => {
        setInstalling(null);
      }, 2000);
    } catch (error) {
      logger.error('Failed to install template:', error);
      setInstalling(null);
    }
  };

  const updateFilter = useCallback((key: keyof TemplateFilters, value: unknown) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      pricing: undefined,
      difficulty: undefined,
      minRating: undefined,
      maxSetupTime: undefined,
      authorType: undefined,
      tags: []
    });
  }, []);

  const renderTemplateCard = useCallback((template: WorkflowTemplate) => {
    const IconComponent = getCategoryIcon(template.category);
    const isInstalling = installing === template.id;

    return (
      <div
        key={template.id}
        className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col h-full"
      >
        <div className="p-6 flex flex-col flex-1">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center flex-1">
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center mr-4 flex-shrink-0">
                <IconComponent className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 mb-1 truncate">{template.name}</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500 truncate">by {template.author}</span>
                  {getAuthorBadge(template.authorType)}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
              {template.featured && (
                <Award className="w-5 h-5 text-yellow-500" />
              )}
              {template.pricing !== 'free' && (
                <span className={`px-2 py-1 text-xs rounded-full ${
                  template.pricing === 'premium' ? 'bg-yellow-100 text-yellow-800' : 'bg-purple-100 text-purple-800'
                }`}>
                  {template.pricing}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 mb-4 line-clamp-2 flex-1">
            {template.description}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1 mb-4">
            {template.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
              >
                {tag}
              </span>
            ))}
            {template.tags.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                +{template.tags.length - 3}
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              {renderStars(template.rating)}
              <div className="flex items-center text-sm text-gray-500">
                <Download className="w-4 h-4 mr-1" />
                {template.downloads.toLocaleString()}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(template.difficulty)}`}>
                {template.difficulty}
              </span>
              <div className="flex items-center text-xs text-gray-500">
                <Clock className="w-3 h-3 mr-1" />
                {template.estimatedSetupTime}min
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-2">
            <button
              onClick={() => onPreview?.(template)}
              className="flex-1 px-3 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 text-sm flex items-center justify-center transition-colors"
            >
              <Eye className="w-4 h-4 mr-1" />
              Preview
            </button>
            <button
              onClick={() => handleInstall(template)}
              disabled={isInstalling}
              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 text-sm flex items-center justify-center transition-colors"
            >
              {isInstalling ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                  Installing...
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4 mr-1" />
                  Use Template
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }, [getCategoryIcon, getAuthorBadge, renderStars, getDifficultyColor, installing, onPreview, handleInstall]);

  const renderTemplateListItem = useCallback((template: WorkflowTemplate) => {
    const IconComponent = getCategoryIcon(template.category);
    const isInstalling = installing === template.id;

    return (
      <div
        key={template.id}
        className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all duration-200"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-1 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mr-4 flex-shrink-0">
              <IconComponent className="w-5 h-5 text-blue-600" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center mb-1">
                <h3 className="font-semibold text-gray-900 mr-2 truncate">{template.name}</h3>
                {template.featured && <Award className="w-4 h-4 text-yellow-500 mr-2 flex-shrink-0" />}
                {getAuthorBadge(template.authorType)}
                {template.pricing !== 'free' && (
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full flex-shrink-0 ${
                    template.pricing === 'premium' ? 'bg-yellow-100 text-yellow-800' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {template.pricing}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-2 truncate">{template.description}</p>
              <div className="flex items-center space-x-4 flex-wrap">
                {renderStars(template.rating)}
                <div className="flex items-center text-sm text-gray-500">
                  <Download className="w-4 h-4 mr-1" />
                  {template.downloads.toLocaleString()}
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(template.difficulty)}`}>
                  {template.difficulty}
                </span>
                <div className="flex items-center text-xs text-gray-500">
                  <Clock className="w-3 h-3 mr-1" />
                  {template.estimatedSetupTime}min
                </div>
                <span className="text-sm text-gray-500">by {template.author}</span>
              </div>
            </div>
          </div>

          <div className="flex space-x-2 ml-4 flex-shrink-0">
            <button
              onClick={() => onPreview?.(template)}
              className="px-3 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 text-sm transition-colors"
            >
              Preview
            </button>
            <button
              onClick={() => handleInstall(template)}
              disabled={isInstalling}
              className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 text-sm flex items-center transition-colors"
            >
              {isInstalling ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                  Installing...
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4 mr-1" />
                  Use Template
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }, [getCategoryIcon, getAuthorBadge, renderStars, getDifficultyColor, installing, onPreview, handleInstall]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <BookOpen className="w-8 h-8 animate-pulse text-blue-600 mb-4" />
          <p className="text-gray-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  if (!marketplace) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load templates</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
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
            <BookOpen className="w-6 h-6 text-gray-700 mr-3" />
            <div>
              <h2 className="text-lg font-semibold">Workflow Templates</h2>
              <p className="text-sm text-gray-600">
                Pre-built workflows to get you started quickly
              </p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
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
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as TemplateCategory | 'all')}
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
            <option value="popular">Most Popular</option>
            <option value="rating">Highest Rated</option>
            <option value="recent">Recently Updated</option>
            <option value="downloads">Most Downloaded</option>
            <option value="name">Name (A-Z)</option>
          </select>

          {/* Filters Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center transition-colors"
          >
            <Filter className="w-4 h-4 mr-1" />
            Filters
            <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* View Mode */}
          <div className="flex border border-gray-300 rounded-md">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 border-l border-gray-300 transition-colors ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Difficulty Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                <select
                  value={filters.difficulty || ''}
                  onChange={(e) => updateFilter('difficulty', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Levels</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              {/* Pricing Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pricing</label>
                <select
                  value={filters.pricing || ''}
                  onChange={(e) => updateFilter('pricing', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All</option>
                  <option value="free">Free</option>
                  <option value="premium">Premium</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              {/* Author Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Author</label>
                <select
                  value={filters.authorType || ''}
                  onChange={(e) => updateFilter('authorType', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Authors</option>
                  <option value="official">Official</option>
                  <option value="verified">Verified</option>
                  <option value="community">Community</option>
                </select>
              </div>

              {/* Setup Time Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Setup Time</label>
                <select
                  value={filters.maxSetupTime || ''}
                  onChange={(e) => updateFilter('maxSetupTime', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Any Time</option>
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!searchQuery && selectedCategory === 'all' && (
          <>
            {/* Featured Section */}
            {marketplace.featured.length > 0 && (
              <div className="px-6 py-6">
                <div className="flex items-center mb-4">
                  <Award className="w-5 h-5 text-yellow-500 mr-2" />
                  <h3 className="text-lg font-semibold">Featured Templates</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {marketplace.featured.map(renderTemplateCard)}
                </div>
              </div>
            )}

            {/* Popular Section */}
            {marketplace.popular.length > 0 && (
              <div className="px-6 py-6 border-t border-gray-200">
                <div className="flex items-center mb-4">
                  <TrendingUp className="w-5 h-5 text-green-500 mr-2" />
                  <h3 className="text-lg font-semibold">Popular Templates</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {marketplace.popular.slice(0, 6).map(renderTemplateCard)}
                </div>
              </div>
            )}

            {/* Recent Section */}
            {marketplace.recent.length > 0 && (
              <div className="px-6 py-6 border-t border-gray-200">
                <div className="flex items-center mb-4">
                  <Clock className="w-5 h-5 text-blue-500 mr-2" />
                  <h3 className="text-lg font-semibold">Recently Updated</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {marketplace.recent.slice(0, 6).map(renderTemplateCard)}
                </div>
              </div>
            )}
          </>
        )}

        {/* Search Results / Category Results */}
        {(searchQuery || selectedCategory !== 'all') && (
          <div className="px-6 py-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {searchQuery ? `Search Results (${filteredTemplates.length})` :
                 `${marketplace.categories.find(c => c.name === selectedCategory)?.displayName} (${filteredTemplates.length})`}
              </h3>
            </div>

            {filteredTemplates.length > 0 ? (
              <div className={
                viewMode === 'grid'
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  : "space-y-4"
              }>
                {filteredTemplates.map(viewMode === 'grid' ? renderTemplateCard : renderTemplateListItem)}
              </div>
            ) : (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No templates found</p>
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

export default TemplateLibrary;
