import React, { useState, useEffect, useCallback } from 'react';
import { Search, Download, Star, /* Filter, */ Grid, List, Package, Zap, Shield, Crown } from 'lucide-react';
import { MarketplaceService } from '../../services/MarketplaceService';
import { IntegrationPlugin, MarketplaceFilter, MarketplaceStats } from '../../types/marketplace';
import { logger } from '../../services/SimpleLogger';

// Initialize marketplace configuration
const marketplaceConfig = {
  repositoryUrl: 'https://marketplace.your-workflow.com/api',
  updateInterval: 86400000, // 24 hours
  autoUpdate: true,
  allowBeta: false,
  maxConcurrentDownloads: 3,
  cacheSize: 100
};

// Initialize marketplace service
const marketplaceService = new MarketplaceService(marketplaceConfig);

interface MarketplaceHubProps {
  isOpen: boolean;
  onClose: () => void;
}

const MarketplaceHub: React.FC<MarketplaceHubProps> = ({ isOpen, onClose }) => {
  const [plugins, setPlugins] = useState<IntegrationPlugin[]>([]);
  const [featuredPlugins, setFeaturedPlugins] = useState<IntegrationPlugin[]>([]);
  const [stats, setStats] = useState<MarketplaceStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<MarketplaceFilter>({
    sort: 'popular',
    price: 'all'
  });

  const categories = [
    { id: 'all', name: 'All Categories', icon: '📂', color: 'bg-gray-500' },
    { id: 'communication', name: 'Communication', icon: '💬', color: 'bg-blue-500' },
    { id: 'database', name: 'Database', icon: '🗄️', color: 'bg-purple-500' },
    { id: 'ai', name: 'AI & Machine Learning', icon: '🤖', color: 'bg-green-500' },
    { id: 'cloud', name: 'Cloud Services', icon: '☁️', color: 'bg-cyan-500' },
    { id: 'productivity', name: 'Productivity', icon: '⚡', color: 'bg-yellow-500' },
    { id: 'security', name: 'Security', icon: '🔒', color: 'bg-red-500' },
    { id: 'analytics', name: 'Analytics', icon: '📊', color: 'bg-indigo-500' },
    { id: 'ecommerce', name: 'E-commerce', icon: '🛒', color: 'bg-orange-500' },
    { id: 'social', name: 'Social Media', icon: '📱', color: 'bg-pink-500' }
  ];

  const loadMarketplaceData = async () => {
    setLoading(true);
    try {
      const [pluginsData, featuredData, statsData] = await Promise.all([
        marketplaceService.searchPlugins({
          ...filter,
          category: selectedCategory === 'all' ? undefined : selectedCategory,
          search: searchTerm || undefined
        }),
        marketplaceService.getFeaturedPlugins(),
        marketplaceService.getMarketplaceStats()
      ]);

      setPlugins(pluginsData);
      setFeaturedPlugins(featuredData);
      setStats(statsData);
    } catch (error) {
      logger.error('Error loading marketplace data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarketplaceData();
  }, [filter, selectedCategory, searchTerm]);

  useEffect(() => {
    if (isOpen) {
      loadMarketplaceData();
    }
  }, [isOpen]);

  const installPlugin = async (pluginId: string) => {
    try {
      const success = await marketplaceService.installPlugin(pluginId);
      if (success) {
        // Show success toast
        logger.info(`Plugin ${pluginId} installed successfully`);
        // Refresh plugin list to update install status
        loadMarketplaceData();
      }
    } catch (error) {
      logger.error('Error installing plugin:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadMarketplaceData();
  };

  const renderPluginCard = (plugin: any, featured = false) => {
    const isInstalled = marketplaceService.isPluginInstalled(plugin.id);

    const handleInstallPlugin = async (pluginId: string) => {
      await installPlugin(pluginId);
    };

    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 ${featured ? 'border-2 border-blue-500' : ''}`}>
        {featured && (
          <div className="flex items-center mb-2">
            <Crown className="h-4 w-4 text-yellow-500 mr-1" />
            <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Featured</span>
          </div>
        )}

        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg mr-3">
              {plugin.icon || plugin.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-semibold text-lg dark:text-white">{plugin.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">by {plugin.author}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {plugin.verified && (
              <span title="Verified">
                <Shield className="h-4 w-4 text-green-500" />
              </span>
            )}
            {plugin.premium && (
              <span title="Premium">
                <Crown className="h-4 w-4 text-yellow-500" />
              </span>
            )}
          </div>
        </div>

        <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
          {plugin.description}
        </p>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <Star className="h-4 w-4 text-yellow-500 mr-1" />
              <span className="text-sm font-medium">{plugin.rating}</span>
            </div>
            <div className="flex items-center">
              <Download className="h-4 w-4 text-gray-500 mr-1" />
              <span className="text-sm text-gray-600">{plugin.downloads.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {plugin.premium && plugin.price && (
              <span className="text-sm font-medium text-green-600">${plugin.price}</span>
            )}
            <span className="text-xs text-gray-500">v{plugin.version}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {plugin.tags.slice(0, 3).map((tag: string) => (
            <span key={tag} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded-full text-gray-600 dark:text-gray-300">
              {tag}
            </span>
          ))}
        </div>

        <button
          onClick={() => handleInstallPlugin(plugin.id)}
          disabled={isInstalled}
          className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
            isInstalled
              ? 'bg-green-100 text-green-800 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {isInstalled ? 'Installed' : 'Install'}
        </button>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-7xl h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <h2 className="text-2xl font-bold dark:text-white">Integration Marketplace</h2>
                <p className="text-gray-600 dark:text-gray-400">Discover and install powerful integrations</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalPlugins}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Plugins</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.totalDownloads.toLocaleString()}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Downloads</div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.averageRating.toFixed(1)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Avg Rating</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.categoriesCount}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Categories</div>
              </div>
            </div>
          )}

          {/* Search and Filters */}
          <div className="flex items-center space-x-4 mb-4">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search integrations..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                />
              </div>
            </form>
            
            <select
              value={filter.sort}
              onChange={(e) => setFilter({ ...filter, sort: e.target.value as 'popular' | 'newest' | 'rating' | 'name' })}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            >
              <option value="popular">Popular</option>
              <option value="newest">Newest</option>
              <option value="rating">Highest Rated</option>
              <option value="name">Name</option>
            </select>

            <select
              value={filter.price}
              onChange={(e) => setFilter({ ...filter, price: e.target.value as 'all' | 'free' | 'paid' })}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            >
              <option value="all">All Prices</option>
              <option value="free">Free Only</option>
              <option value="paid">Paid Only</option>
            </select>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <span className="mr-2">{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Featured Plugins */}
              {featuredPlugins.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold mb-4 dark:text-white flex items-center">
                    <Zap className="h-5 w-5 text-yellow-500 mr-2" />
                    Featured Plugins
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {featuredPlugins.slice(0, 3).map(plugin => (
                      <React.Fragment key={plugin.id}>
                        {renderPluginCard(plugin, true)}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {/* All Plugins */}
              <div>
                <h3 className="text-xl font-bold mb-4 dark:text-white">
                  {selectedCategory === 'all' ? 'All Plugins' : `${categories.find(c => c.id === selectedCategory)?.name} Plugins`}
                </h3>

                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {plugins.map(plugin => (
                      <React.Fragment key={plugin.id}>
                        {renderPluginCard(plugin)}
                      </React.Fragment>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {plugins.map(plugin => {
                      const isPluginInstalled = marketplaceService.isPluginInstalled(plugin.id);
                      return (
                        <div key={plugin.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold mr-4">
                              {plugin.icon || plugin.name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="font-semibold dark:text-white">{plugin.name}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{plugin.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                              <Star className="h-4 w-4 text-yellow-500 mr-1" />
                              <span className="text-sm">{plugin.rating}</span>
                            </div>
                            <button
                              onClick={() => installPlugin(plugin.id)}
                              disabled={isPluginInstalled}
                              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                isPluginInstalled
                                  ? 'bg-green-100 text-green-800 cursor-not-allowed'
                                  : 'bg-blue-500 hover:bg-blue-600 text-white'
                              }`}
                            >
                              {isPluginInstalled ? 'Installed' : 'Install'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketplaceHub;