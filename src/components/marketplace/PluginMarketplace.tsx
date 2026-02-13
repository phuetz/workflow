import React, { useState } from 'react';
import { 
  Store, 
  Download, 
  Star, 
  Shield, 
  TrendingUp, 
  // User, 
  // DollarSign, 
  Search,
  // Filter,
  Package,
  Zap,
  Award,
  // Clock,
  CheckCircle,
  // AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';

interface PluginDeveloper {
  id: string;
  name: string;
  avatar: string;
  verified: boolean;
  rating: number;
  totalDownloads: number;
  totalPlugins: number;
  joinDate: string;
}

interface PluginRating {
  userId: string;
  username: string;
  rating: number;
  comment: string;
  date: string;
  verified: boolean;
}

interface PluginMetrics {
  downloads: number;
  activeInstallations: number;
  rating: number;
  totalRatings: number;
  revenue: number;
  lastUpdated: string;
}

interface MarketplacePlugin {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  version: string;
  category: string;
  tags: string[];
  developer: PluginDeveloper;
  price: number;
  currency: string;
  license: 'free' | 'paid' | 'subscription';
  metrics: PluginMetrics;
  screenshots: string[];
  documentation: string;
  source: string;
  demo: string;
  requirements: string[];
  changelog: string;
  ratings: PluginRating[];
  securityScore: number;
  compatibility: string[];
  featured: boolean;
  trending: boolean;
  newRelease: boolean;
  status: 'active' | 'deprecated' | 'beta';
}

interface _SecurityCertification {
  passed: boolean;
  score: number;
  issues: string[];
  scanDate: string;
  certificate: string;
}

const SAMPLE_PLUGINS: MarketplacePlugin[] = [
  {
    id: 'ai-optimizer-pro',
    name: 'AI Optimizer Pro',
    description: 'Optimisation automatique des workflows avec IA avancée',
    longDescription: 'Plugin révolutionnaire utilisant l\'intelligence artificielle pour optimiser automatiquement vos workflows. Analyse les patterns d\'exécution, prédit les goulots d\'étranglement et suggère des améliorations en temps réel.',
    version: '2.1.0',
    category: 'AI & ML',
    tags: ['AI', 'Optimization', 'Machine Learning', 'Performance'],
    developer: {
      id: 'dev-1',
      name: 'TechFlow Studios',
      avatar: '🏢',
      verified: true,
      rating: 4.8,
      totalDownloads: 15420,
      totalPlugins: 12,
      joinDate: '2023-01-15'
    },
    price: 29.99,
    currency: 'USD',
    license: 'paid',
    metrics: {
      downloads: 3240,
      activeInstallations: 2890,
      rating: 4.9,
      totalRatings: 187,
      revenue: 97156,
      lastUpdated: '2024-01-10'
    },
    screenshots: ['screenshot1.jpg', 'screenshot2.jpg'],
    documentation: 'https://docs.techflow.com/ai-optimizer-pro',
    source: 'https://github.com/techflow/ai-optimizer-pro',
    demo: 'https://demo.techflow.com/ai-optimizer-pro',
    requirements: ['Node.js >= 18', 'Memory >= 4GB', 'WorkflowBuilder >= 2.0'],
    changelog: 'v2.1.0: Improved ML algorithms, Better performance, Bug fixes',
    ratings: [],
    securityScore: 98,
    compatibility: ['2.0.x', '2.1.x'],
    featured: true,
    trending: true,
    newRelease: false,
    status: 'active'
  },
  {
    id: 'blockchain-nodes',
    name: 'Blockchain Nodes Suite',
    description: 'Collection complète de nœuds blockchain pour DeFi et NFT',
    longDescription: 'Suite complète de nœuds pour interagir avec les principales blockchains. Support pour Ethereum, Polygon, Solana, et plus. Parfait pour les applications DeFi, NFT et Web3.',
    version: '1.5.2',
    category: 'Blockchain',
    tags: ['Blockchain', 'DeFi', 'NFT', 'Web3', 'Ethereum'],
    developer: {
      id: 'dev-2',
      name: 'BlockFlow Labs',
      avatar: '⛓️',
      verified: true,
      rating: 4.7,
      totalDownloads: 8950,
      totalPlugins: 8,
      joinDate: '2023-03-22'
    },
    price: 0,
    currency: 'USD',
    license: 'free',
    metrics: {
      downloads: 2140,
      activeInstallations: 1850,
      rating: 4.6,
      totalRatings: 92,
      revenue: 0,
      lastUpdated: '2024-01-08'
    },
    screenshots: ['blockchain1.jpg', 'blockchain2.jpg'],
    documentation: 'https://docs.blockflow.com/blockchain-nodes',
    source: 'https://github.com/blockflow/blockchain-nodes',
    demo: 'https://demo.blockflow.com/blockchain-nodes',
    requirements: ['WorkflowBuilder >= 1.8'],
    changelog: 'v1.5.2: Added Solana support, Fixed gas estimation',
    ratings: [],
    securityScore: 95,
    compatibility: ['1.8.x', '2.0.x', '2.1.x'],
    featured: false,
    trending: true,
    newRelease: true,
    status: 'active'
  },
  {
    id: 'advanced-analytics',
    name: 'Advanced Analytics Dashboard',
    description: 'Tableaux de bord analytiques avancés avec visualisations ML',
    longDescription: 'Créez des tableaux de bord analytiques sophistiqués avec des visualisations alimentées par machine learning. Intègre des prédictions, des anomalies et des insights automatiques.',
    version: '3.0.1',
    category: 'Analytics',
    tags: ['Analytics', 'Dashboard', 'ML', 'Visualization', 'BI'],
    developer: {
      id: 'dev-3',
      name: 'DataViz Pro',
      avatar: '📊',
      verified: true,
      rating: 4.9,
      totalDownloads: 12340,
      totalPlugins: 15,
      joinDate: '2022-11-10'
    },
    price: 49.99,
    currency: 'USD',
    license: 'subscription',
    metrics: {
      downloads: 1890,
      activeInstallations: 1650,
      rating: 4.8,
      totalRatings: 134,
      revenue: 82485,
      lastUpdated: '2024-01-12'
    },
    screenshots: ['analytics1.jpg', 'analytics2.jpg'],
    documentation: 'https://docs.dataviz.com/advanced-analytics',
    source: 'https://github.com/dataviz/advanced-analytics',
    demo: 'https://demo.dataviz.com/advanced-analytics',
    requirements: ['WorkflowBuilder >= 2.0', 'Python >= 3.8'],
    changelog: 'v3.0.1: New ML models, Better performance, Dark mode',
    ratings: [],
    securityScore: 96,
    compatibility: ['2.0.x', '2.1.x'],
    featured: true,
    trending: false,
    newRelease: false,
    status: 'active'
  }
];

const PLUGIN_CATEGORIES = [
  { id: 'all', name: 'Tous les plugins', icon: Package },
  { id: 'AI & ML', name: 'IA & ML', icon: Zap },
  { id: 'Blockchain', name: 'Blockchain', icon: Shield },
  { id: 'Analytics', name: 'Analytics', icon: TrendingUp },
  { id: 'Integration', name: 'Intégrations', icon: ExternalLink },
  { id: 'Utilities', name: 'Utilitaires', icon: Award }
];

export default function PluginMarketplace() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlugin, setSelectedPlugin] = useState<MarketplacePlugin | null>(null);
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'rating' | 'price'>('popular');
  const [showOnlyFree, setShowOnlyFree] = useState(false);
  const [installedPlugins, setInstalledPlugins] = useState<Set<string>>(new Set());
  const [isInstalling, setIsInstalling] = useState<string | null>(null);
  
  const { addLog } = useWorkflowStore();

  // Filtrer et trier les plugins
  const filteredPlugins = SAMPLE_PLUGINS
    .filter(plugin => {
      const matchesCategory = selectedCategory === 'all' || plugin.category === selectedCategory;
      const matchesSearch = plugin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           plugin.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           plugin.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesPrice = !showOnlyFree || plugin.price === 0;
      return matchesCategory && matchesSearch && matchesPrice;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return b.metrics.downloads - a.metrics.downloads;
        case 'newest':
          return new Date(b.metrics.lastUpdated).getTime() - new Date(a.metrics.lastUpdated).getTime();
        case 'rating':
          return b.metrics.rating - a.metrics.rating;
        case 'price':
          return a.price - b.price;
        default:
          return 0;
      }
    });

  const installPlugin = async (plugin: MarketplacePlugin) => {
    setIsInstalling(plugin.id);
    
    // Simulation d'installation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setInstalledPlugins(prev => new Set([...prev, plugin.id]));
    setIsInstalling(null);
    
    addLog({
      level: 'info',
      message: `Plugin "${plugin.name}" installé avec succès`,
      data: { pluginId: plugin.id, version: plugin.version }
    });
  };

  const uninstallPlugin = async (pluginId: string) => {
    setInstalledPlugins(prev => {
      const newSet = new Set(prev);
      newSet.delete(pluginId);
      return newSet;
    });
    
    addLog({
      level: 'info',
      message: `Plugin désinstallé avec succès`,
      data: { pluginId }
    });
  };

  const formatPrice = (plugin: MarketplacePlugin) => {
    if (plugin.price === 0) return 'Gratuit';
    if (plugin.license === 'subscription') return `${plugin.price}€/mois`;
    return `${plugin.price}€`;
  };

  const getStatusBadge = (plugin: MarketplacePlugin) => {
    if (plugin.newRelease) return { text: 'Nouveau', color: 'bg-green-100 text-green-800' };
    if (plugin.trending) return { text: 'Tendance', color: 'bg-orange-100 text-orange-800' };
    if (plugin.featured) return { text: 'Recommandé', color: 'bg-blue-100 text-blue-800' };
    return null;
  };

  const getSecurityColor = (score: number) => {
    if (score >= 95) return 'text-green-600';
    if (score >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-32 right-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 z-50"
        title="Ouvrir le Plugin Marketplace"
      >
        <Store size={24} />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl h-full max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Store size={32} />
              <div>
                <h2 className="text-2xl font-bold">Plugin Marketplace</h2>
                <p className="text-purple-100">Étendez vos workflows avec des plugins premium</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-300 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-1/4 bg-gray-50 p-4 border-r overflow-y-auto">
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Rechercher plugins..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Categories */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Catégories</h3>
              <div className="space-y-2">
                {PLUGIN_CATEGORIES.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                      selectedCategory === category.id ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <category.icon size={16} />
                    <span>{category.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Filtres</h3>
              <div className="space-y-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={showOnlyFree}
                    onChange={(e) => setShowOnlyFree(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Gratuits seulement</span>
                </label>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Trier par</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'popular' | 'newest' | 'rating' | 'price')}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="popular">Popularité</option>
                    <option value="newest">Plus récent</option>
                    <option value="rating">Note</option>
                    <option value="price">Prix</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h3 className="font-semibold mb-2">Statistiques</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Plugins disponibles:</span>
                  <span className="font-medium">{SAMPLE_PLUGINS.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Plugins installés:</span>
                  <span className="font-medium">{installedPlugins.size}</span>
                </div>
                <div className="flex justify-between">
                  <span>Développeurs:</span>
                  <span className="font-medium">{new Set(SAMPLE_PLUGINS.map(p => p.developer.id)).size}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            {selectedPlugin ? (
              /* Plugin Detail View */
              <div className="p-6">
                <button
                  onClick={() => setSelectedPlugin(null)}
                  className="text-purple-600 hover:text-purple-700 mb-4"
                >
                  ← Retour au marketplace
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Plugin Info */}
                  <div className="lg:col-span-2">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-2xl font-bold mb-2">{selectedPlugin.name}</h3>
                        <p className="text-gray-600 mb-4">{selectedPlugin.description}</p>
                        
                        <div className="flex items-center space-x-4 mb-4">
                          <div className="flex items-center space-x-1">
                            <Star className="text-yellow-500 fill-current" size={16} />
                            <span className="font-medium">{selectedPlugin.metrics.rating}</span>
                            <span className="text-gray-600 text-sm">({selectedPlugin.metrics.totalRatings})</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Download size={16} className="text-gray-500" />
                            <span className="text-sm">{selectedPlugin.metrics.downloads.toLocaleString()} téléchargements</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Shield size={16} className={getSecurityColor(selectedPlugin.securityScore)} />
                            <span className={`text-sm ${getSecurityColor(selectedPlugin.securityScore)}`}>
                              Sécurité {selectedPlugin.securityScore}%
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {selectedPlugin.tags.map(tag => (
                            <span key={tag} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600 mb-2">
                          {formatPrice(selectedPlugin)}
                        </div>
                        {installedPlugins.has(selectedPlugin.id) ? (
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2 text-green-600">
                              <CheckCircle size={16} />
                              <span>Installé</span>
                            </div>
                            <button
                              onClick={() => uninstallPlugin(selectedPlugin.id)}
                              className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                            >
                              Désinstaller
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => installPlugin(selectedPlugin)}
                            disabled={isInstalling === selectedPlugin.id}
                            className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
                          >
                            {isInstalling === selectedPlugin.id ? (
                              <div className="flex items-center justify-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Installation...</span>
                              </div>
                            ) : (
                              'Installer'
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="prose max-w-none">
                      <h4 className="font-semibold mb-2">Description détaillée</h4>
                      <p className="text-gray-700 mb-4">{selectedPlugin.longDescription}</p>
                      
                      <h4 className="font-semibold mb-2">Prérequis</h4>
                      <ul className="list-disc list-inside text-gray-700 mb-4">
                        {selectedPlugin.requirements.map((req, index) => (
                          <li key={index}>{req}</li>
                        ))}
                      </ul>
                      
                      <h4 className="font-semibold mb-2">Changelog</h4>
                      <p className="text-gray-700">{selectedPlugin.changelog}</p>
                    </div>
                  </div>

                  {/* Sidebar */}
                  <div className="space-y-4">
                    {/* Developer Info */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-3">Développeur</h4>
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          {selectedPlugin.developer.avatar}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{selectedPlugin.developer.name}</span>
                            {selectedPlugin.developer.verified && (
                              <CheckCircle className="text-blue-500" size={16} />
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {selectedPlugin.developer.totalPlugins} plugins
                          </div>
                        </div>
                      </div>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>Note moyenne:</span>
                          <span>{selectedPlugin.developer.rating}/5</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Téléchargements:</span>
                          <span>{selectedPlugin.developer.totalDownloads.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Plugin Stats */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-3">Statistiques</h4>
                      <div className="text-sm space-y-2">
                        <div className="flex justify-between">
                          <span>Version:</span>
                          <span className="font-medium">{selectedPlugin.version}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Installations actives:</span>
                          <span>{selectedPlugin.metrics.activeInstallations.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Dernière mise à jour:</span>
                          <span>{new Date(selectedPlugin.metrics.lastUpdated).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Compatibilité:</span>
                          <span>{selectedPlugin.compatibility.join(', ')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Links */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-3">Liens</h4>
                      <div className="space-y-2">
                        <a
                          href={selectedPlugin.documentation?.startsWith('http://') || selectedPlugin.documentation?.startsWith('https://') ? selectedPlugin.documentation : '#'}
                          rel="noopener noreferrer"
                          target="_blank"
                          className="flex items-center space-x-2 text-purple-600 hover:text-purple-700"
                        >
                          <ExternalLink size={16} />
                          <span>Documentation</span>
                        </a>
                        <a
                          href={selectedPlugin.source?.startsWith('http://') || selectedPlugin.source?.startsWith('https://') ? selectedPlugin.source : '#'}
                          rel="noopener noreferrer"
                          target="_blank"
                          className="flex items-center space-x-2 text-purple-600 hover:text-purple-700"
                        >
                          <ExternalLink size={16} />
                          <span>Code source</span>
                        </a>
                        <a
                          href={selectedPlugin.demo?.startsWith('http://') || selectedPlugin.demo?.startsWith('https://') ? selectedPlugin.demo : '#'}
                          rel="noopener noreferrer"
                          target="_blank"
                          className="flex items-center space-x-2 text-purple-600 hover:text-purple-700"
                        >
                          <ExternalLink size={16} />
                          <span>Démonstration</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Plugin Grid */
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-2">
                    {selectedCategory === 'all' ? 'Tous les plugins' : 
                     PLUGIN_CATEGORIES.find(c => c.id === selectedCategory)?.name}
                  </h3>
                  <p className="text-gray-600">
                    {filteredPlugins.length} plugins trouvés
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPlugins.map(plugin => (
                    <div
                      key={plugin.id}
                      className="bg-white border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => setSelectedPlugin(plugin)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold mb-1">{plugin.name}</h4>
                          <p className="text-sm text-gray-600 mb-2">{plugin.description}</p>
                          
                          <div className="flex items-center space-x-4 mb-2">
                            <div className="flex items-center space-x-1">
                              <Star className="text-yellow-500 fill-current" size={14} />
                              <span className="text-sm">{plugin.metrics.rating}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Download size={14} className="text-gray-500" />
                              <span className="text-sm">{plugin.metrics.downloads}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Shield size={14} className={getSecurityColor(plugin.securityScore)} />
                              <span className={`text-sm ${getSecurityColor(plugin.securityScore)}`}>
                                {plugin.securityScore}%
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="font-bold text-green-600 mb-1">
                            {formatPrice(plugin)}
                          </div>
                          {installedPlugins.has(plugin.id) && (
                            <div className="text-xs text-green-600 flex items-center space-x-1">
                              <CheckCircle size={12} />
                              <span>Installé</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">par {plugin.developer.name}</span>
                          {plugin.developer.verified && (
                            <CheckCircle className="text-blue-500" size={12} />
                          )}
                        </div>
                        
                        {(() => {
                          const badge = getStatusBadge(plugin);
                          return badge ? (
                            <span className={`px-2 py-1 rounded-full text-xs ${badge.color}`}>
                              {badge.text}
                            </span>
                          ) : null;
                        })()}
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mt-3">
                        {plugin.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}