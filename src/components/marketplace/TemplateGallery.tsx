/**
 * Template Gallery
 * Main marketplace view with grid/list layouts, filtering, and search
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Grid,
  List,
  Search,
  Filter,
  SlidersHorizontal,
  ChevronDown,
  X,
  TrendingUp,
  Clock,
  Star,
  Download,
  Sparkles,
  Tag,
  Users,
  Heart,
  ArrowUpDown
} from 'lucide-react';
import { WorkflowTemplate, TemplateCategory } from '../../types/templates';
import { EnhancedTemplateFilters, SearchFacets } from '../../types/marketplaceEnhanced';
import { TemplateCard } from './TemplateCard';
import { SearchBar } from './SearchBar';
import { useWorkflowStore } from '../../store/workflowStore';
import { logger } from '../../services/SimpleLogger';

interface TemplateGalleryProps {
  onTemplateSelect?: (template: WorkflowTemplate) => void;
  initialCategory?: TemplateCategory;
  showHeader?: boolean;
}

type ViewMode = 'grid' | 'list';
type SortOption = 'popular' | 'recent' | 'rating' | 'installs' | 'name';

const ITEMS_PER_PAGE = 12;

const CATEGORIES: Array<{ value: TemplateCategory | 'all'; label: string; icon: string; color: string }> = [
  { value: 'all', label: 'All Templates', icon: '🎯', color: 'bg-blue-500' },
  { value: 'business_automation', label: 'Business Automation', icon: '💼', color: 'bg-purple-500' },
  { value: 'marketing', label: 'Marketing', icon: '📣', color: 'bg-pink-500' },
  { value: 'sales', label: 'Sales', icon: '💰', color: 'bg-green-500' },
  { value: 'customer_support', label: 'Customer Support', icon: '🎧', color: 'bg-blue-500' },
  { value: 'data_processing', label: 'Data Processing', icon: '📊', color: 'bg-indigo-500' },
  { value: 'notifications', label: 'Notifications', icon: '🔔', color: 'bg-yellow-500' },
  { value: 'social_media', label: 'Social Media', icon: '📱', color: 'bg-cyan-500' },
  { value: 'ecommerce', label: 'E-commerce', icon: '🛒', color: 'bg-orange-500' },
  { value: 'finance', label: 'Finance', icon: '💳', color: 'bg-emerald-500' },
  { value: 'hr', label: 'Human Resources', icon: '👥', color: 'bg-teal-500' },
  { value: 'development', label: 'Development', icon: '💻', color: 'bg-gray-500' },
  { value: 'analytics', label: 'Analytics', icon: '📈', color: 'bg-violet-500' },
  { value: 'productivity', label: 'Productivity', icon: '⚡', color: 'bg-amber-500' },
  { value: 'integration', label: 'Integration', icon: '🔗', color: 'bg-rose-500' },
  { value: 'monitoring', label: 'Monitoring', icon: '📡', color: 'bg-sky-500' }
];

export function TemplateGallery({
  onTemplateSelect,
  initialCategory,
  showHeader = true
}: TemplateGalleryProps) {
  const { darkMode } = useWorkflowStore();

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>(initialCategory || 'all');
  const [sortBy, setSortBy] = useState<SortOption>('popular');

  // Data state
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<EnhancedTemplateFilters>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Search facets
  const [facets, setFacets] = useState<SearchFacets>({
    categories: [],
    tags: [],
    authors: [],
    ratings: []
  });

  // Load templates
  useEffect(() => {
    loadTemplates();
  }, []);

  // Apply filters when they change
  useEffect(() => {
    applyFiltersAndSort();
  }, [templates, selectedCategory, sortBy, filters, searchQuery]);

  // Update pagination when filtered templates change
  useEffect(() => {
    setTotalPages(Math.ceil(filteredTemplates.length / ITEMS_PER_PAGE));
    setCurrentPage(1);
  }, [filteredTemplates]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      // Simulate API call
      const response = await fetch('/api/templates');
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      logger.error('Failed to load templates:', error);
      // Use mock data for demo
      setTemplates(generateMockTemplates());
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = useCallback(() => {
    let filtered = [...templates];

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply additional filters
    if (filters.difficulty) {
      filtered = filtered.filter(t => t.difficulty === filters.difficulty);
    }
    if (filters.pricing) {
      filtered = filtered.filter(t => t.pricing === filters.pricing);
    }
    if (filters.authorType) {
      filtered = filtered.filter(t => t.authorType === filters.authorType);
    }
    if (filters.minRating) {
      filtered = filtered.filter(t => t.rating >= (filters.minRating || 0));
    }
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(t =>
        filters.tags!.some(tag => t.tags.includes(tag))
      );
    }

    // Apply sorting
    switch (sortBy) {
      case 'popular':
        filtered.sort((a, b) => b.downloads - a.downloads);
        break;
      case 'recent':
        filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'installs':
        filtered.sort((a, b) => b.downloads - a.downloads);
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    setFilteredTemplates(filtered);
    updateFacets(filtered);
  }, [templates, selectedCategory, sortBy, filters, searchQuery]);

  const updateFacets = (templates: WorkflowTemplate[]) => {
    const categoryMap = new Map<TemplateCategory, number>();
    const tagMap = new Map<string, number>();
    const authorMap = new Map<string, number>();
    const ratingMap = new Map<number, number>();

    templates.forEach(template => {
      // Categories
      categoryMap.set(template.category, (categoryMap.get(template.category) || 0) + 1);

      // Tags
      template.tags.forEach(tag => {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      });

      // Authors
      authorMap.set(template.author, (authorMap.get(template.author) || 0) + 1);

      // Ratings (rounded)
      const rating = Math.floor(template.rating);
      ratingMap.set(rating, (ratingMap.get(rating) || 0) + 1);
    });

    setFacets({
      categories: Array.from(categoryMap.entries()).map(([category, count]) => ({ category, count })),
      tags: Array.from(tagMap.entries()).map(([tag, count]) => ({ tag, count })).slice(0, 20),
      authors: Array.from(authorMap.entries()).map(([author, count]) => ({ author, count })),
      ratings: Array.from(ratingMap.entries()).map(([rating, count]) => ({ rating, count }))
    });
  };

  const paginatedTemplates = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTemplates.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTemplates, currentPage]);

  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
    setSelectedCategory('all');
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.difficulty) count++;
    if (filters.pricing) count++;
    if (filters.authorType) count++;
    if (filters.minRating) count++;
    if (filters.tags && filters.tags.length > 0) count += filters.tags.length;
    if (selectedCategory !== 'all') count++;
    return count;
  }, [filters, selectedCategory]);

  return (
    <div className={`h-full flex flex-col ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      {showHeader && (
        <div className={`border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} p-6`}>
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <Sparkles className="w-8 h-8 text-purple-500" />
                  Template Marketplace
                </h1>
                <p className={`mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Discover and install workflow templates from the community
                </p>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid'
                      ? darkMode ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white'
                      : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  aria-label="Grid view"
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list'
                      ? darkMode ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white'
                      : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  aria-label="List view"
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search templates by name, description, or tags..."
              darkMode={darkMode}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Categories & Filters */}
        <div className={`w-64 border-r overflow-y-auto ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          {/* Categories */}
          <div className="p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Categories
            </h3>
            <div className="space-y-1">
              {CATEGORIES.map(category => (
                <button
                  key={category.value}
                  onClick={() => setSelectedCategory(category.value)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    selectedCategory === category.value
                      ? darkMode ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white'
                      : darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <span className="text-xl">{category.icon}</span>
                  <span className="flex-1 text-sm">{category.label}</span>
                  {facets.categories.find(f => f.category === category.value) && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      selectedCategory === category.value
                        ? 'bg-white bg-opacity-20'
                        : darkMode ? 'bg-gray-700' : 'bg-gray-200'
                    }`}>
                      {facets.categories.find(f => f.category === category.value)?.count || 0}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className={`border-t p-4 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </h3>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-purple-500 hover:text-purple-600 flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Clear ({activeFilterCount})
                </button>
              )}
            </div>

            {/* Difficulty Filter */}
            <div className="mb-4">
              <label className="text-xs font-medium mb-2 block">Difficulty</label>
              <select
                value={filters.difficulty || ''}
                onChange={(e) => setFilters({ ...filters, difficulty: e.target.value as any || undefined })}
                className={`w-full px-3 py-2 rounded-lg text-sm ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                } border`}
              >
                <option value="">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            {/* Pricing Filter */}
            <div className="mb-4">
              <label className="text-xs font-medium mb-2 block">Pricing</label>
              <select
                value={filters.pricing || ''}
                onChange={(e) => setFilters({ ...filters, pricing: e.target.value as any || undefined })}
                className={`w-full px-3 py-2 rounded-lg text-sm ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                } border`}
              >
                <option value="">All Prices</option>
                <option value="free">Free</option>
                <option value="premium">Premium</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            {/* Author Type Filter */}
            <div className="mb-4">
              <label className="text-xs font-medium mb-2 block">Author</label>
              <select
                value={filters.authorType || ''}
                onChange={(e) => setFilters({ ...filters, authorType: e.target.value as any || undefined })}
                className={`w-full px-3 py-2 rounded-lg text-sm ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                } border`}
              >
                <option value="">All Authors</option>
                <option value="official">Official</option>
                <option value="verified">Verified</option>
                <option value="community">Community</option>
              </select>
            </div>

            {/* Rating Filter */}
            <div className="mb-4">
              <label className="text-xs font-medium mb-2 block">Minimum Rating</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={filters.minRating || 0}
                  onChange={(e) => setFilters({ ...filters, minRating: parseFloat(e.target.value) || undefined })}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-8">{filters.minRating || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Templates Grid/List */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {filteredTemplates.length} templates found
                </span>
                {searchQuery && (
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    for "{searchQuery}"
                  </span>
                )}
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className={`px-3 py-2 rounded-lg text-sm ${
                    darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  } border`}
                >
                  <option value="popular">Most Popular</option>
                  <option value="recent">Recently Updated</option>
                  <option value="rating">Highest Rated</option>
                  <option value="installs">Most Installed</option>
                  <option value="name">Name (A-Z)</option>
                </select>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className={`h-64 rounded-lg animate-pulse ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
                ))}
              </div>
            )}

            {/* Templates Grid */}
            {!loading && viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedTemplates.map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onClick={() => onTemplateSelect?.(template)}
                    darkMode={darkMode}
                  />
                ))}
              </div>
            )}

            {/* Templates List */}
            {!loading && viewMode === 'list' && (
              <div className="space-y-4">
                {paginatedTemplates.map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onClick={() => onTemplateSelect?.(template)}
                    darkMode={darkMode}
                    compact
                  />
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loading && filteredTemplates.length === 0 && (
              <div className="text-center py-16">
                <Search className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <h3 className="text-xl font-semibold mb-2">No templates found</h3>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Try adjusting your filters or search query
                </p>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg ${
                    currentPage === 1
                      ? 'opacity-50 cursor-not-allowed'
                      : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                  }`}
                >
                  Previous
                </button>
                <span className={`px-4 py-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-lg ${
                    currentPage === totalPages
                      ? 'opacity-50 cursor-not-allowed'
                      : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                  }`}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Mock data generator for demo
function generateMockTemplates(): WorkflowTemplate[] {
  const templates: WorkflowTemplate[] = [];
  const categories: TemplateCategory[] = ['business_automation', 'marketing', 'sales', 'customer_support', 'data_processing'];

  for (let i = 1; i <= 50; i++) {
    templates.push({
      id: `template-${i}`,
      name: `Workflow Template ${i}`,
      description: `This is a sample workflow template for demonstration purposes.`,
      category: categories[i % categories.length],
      author: `Author ${Math.floor(i / 5)}`,
      authorType: i % 3 === 0 ? 'official' : i % 3 === 1 ? 'verified' : 'community',
      tags: [`tag${i}`, `category${i % 5}`, `feature${i % 3}`],
      difficulty: i % 3 === 0 ? 'beginner' : i % 3 === 1 ? 'intermediate' : 'advanced',
      workflow: { nodes: [], edges: [] },
      version: '1.0.0',
      createdAt: new Date(Date.now() - i * 86400000),
      updatedAt: new Date(Date.now() - i * 43200000),
      downloads: Math.floor(Math.random() * 10000),
      rating: 3 + Math.random() * 2,
      reviewCount: Math.floor(Math.random() * 100),
      featured: i % 10 === 0,
      requiredIntegrations: [],
      requiredCredentials: [],
      estimatedSetupTime: 5 + Math.floor(Math.random() * 25),
      documentation: {
        overview: 'Overview',
        setup: [],
        usage: 'Usage guide'
      },
      screenshots: [],
      customizableFields: [],
      pricing: i % 4 === 0 ? 'premium' : 'free'
    } as WorkflowTemplate);
  }

  return templates;
}
