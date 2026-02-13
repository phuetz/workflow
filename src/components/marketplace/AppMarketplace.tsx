import React, { useState } from 'react';
import {
  AlertCircle, BookOpen, Check, CheckCircle, Download, ExternalLink,
  Mail, Package, Search, Star, User, X
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import { notificationService } from '../../services/NotificationService';
import { marketplaceService } from '../../services/MarketplaceService';
import { logger } from '../../services/SimpleLogger';

interface MarketplaceApp {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  icon: string;
  category: string;
  publisher: string;
  version: string;
  rating: number;
  downloads: number;
  price: number;
  currency: string;
  tags: string[];
  screenshots: string[];
  features: string[];
  requirements: string[];
  changelog: string;
  documentation: string;
  support: string;
  website: string;
  isInstalled: boolean;
  isVerified: boolean;
  isPremium: boolean;
  size: string;
  lastUpdated: string;
}

interface AppMarketplaceProps {
  isOpen: boolean;
  onClose: () => void;
}

const marketplaceApps: MarketplaceApp[] = [
  {
    id: 'slack-pro',
    name: 'Slack Pro Integration',
    description: 'Advanced Slack integration with rich formatting and workflows',
    longDescription: 'Professional Slack integration that goes beyond basic messaging. Features include rich message formatting, custom slack commands, workflow automation, and advanced notification management.',
    icon: '🔥',
    category: 'Communication',
    publisher: 'WorkflowPro Team',
    version: '2.1.0',
    rating: 4.8,
    downloads: 12500,
    price: 29.99,
    currency: 'USD',
    tags: ['slack', 'communication', 'teams', 'notifications'],
    screenshots: ['slack-1.png', 'slack-2.png'],
    features: [
      'Rich message formatting with blocks and attachments',
      'Custom slash commands creation',
      'Workflow triggers from Slack events',
      'Advanced notification routing',
      'Multi-workspace support'
    ],
    requirements: ['Slack workspace admin access', 'Webhook permissions'],
    changelog: 'Added multi-workspace support and improved error handling',
    documentation: 'https://docs.workflowpro.com/slack-pro',
    support: 'support@workflowpro.com',
    website: 'https://workflowpro.com/apps/slack-pro',
    isInstalled: false,
    isVerified: true,
    isPremium: true,
    size: '2.3 MB',
    lastUpdated: '2024-01-15'
  },
  {
    id: 'ai-content-generator',
    name: 'AI Content Generator',
    description: 'Generate high-quality content using multiple AI models',
    longDescription: 'Powerful AI content generation tool supporting OpenAI, Anthropic, and Google models. Perfect for creating blog posts, social media content, and marketing copy.',
    icon: '🤖',
    category: 'AI & ML',
    publisher: 'AI Solutions Inc.',
    version: '1.5.2',
    rating: 4.6,
    downloads: 8900,
    price: 49.99,
    currency: 'USD',
    tags: ['ai', 'content', 'gpt', 'writing', 'automation'],
    screenshots: ['ai-1.png', 'ai-2.png'],
    features: [
      'Multiple AI model support (GPT-4, Claude, Gemini)',
      'Content templates and prompts library',
      'Batch content generation',
      'SEO optimization suggestions',
      'Multi-language support'
    ],
    requirements: ['AI API keys', 'Internet connection'],
    changelog: 'Added Gemini Pro support and improved prompt templates',
    documentation: 'https://docs.aisolutions.com/content-generator',
    support: 'help@aisolutions.com',
    website: 'https://aisolutions.com/content-generator',
    isInstalled: true,
    isVerified: true,
    isPremium: true,
    size: '5.1 MB',
    lastUpdated: '2024-01-10'
  },
  {
    id: 'salesforce-sync',
    name: 'Salesforce Sync Pro',
    description: 'Real-time bidirectional sync with Salesforce CRM',
    longDescription: 'Enterprise-grade Salesforce integration with real-time synchronization, custom field mapping, and advanced workflow automation.',
    icon: '☁️',
    category: 'CRM',
    publisher: 'CRM Solutions Ltd.',
    version: '3.0.1',
    rating: 4.9,
    downloads: 5600,
    price: 99.99,
    currency: 'USD',
    tags: ['salesforce', 'crm', 'sync', 'enterprise', 'automation'],
    screenshots: ['sf-1.png', 'sf-2.png'],
    features: [
      'Real-time bidirectional synchronization',
      'Custom field mapping interface',
      'Bulk data operations',
      'Advanced filtering and conditions',
      'Enterprise security compliance'
    ],
    requirements: ['Salesforce API access', 'Admin permissions'],
    changelog: 'Major release with new sync engine and improved performance',
    documentation: 'https://docs.crmsolutions.com/salesforce-sync',
    support: 'support@crmsolutions.com',
    website: 'https://crmsolutions.com/salesforce-sync',
    isInstalled: false,
    isVerified: true,
    isPremium: true,
    size: '8.7 MB',
    lastUpdated: '2024-01-08'
  },
  {
    id: 'github-automation',
    name: 'GitHub Automation Suite',
    description: 'Complete GitHub workflow automation toolkit',
    longDescription: 'Comprehensive GitHub integration for repository management, CI/CD automation, and team collaboration workflows.',
    icon: '🐙',
    category: 'Development',
    publisher: 'DevTools Pro',
    version: '1.8.0',
    rating: 4.7,
    downloads: 15200,
    price: 0,
    currency: 'USD',
    tags: ['github', 'git', 'cicd', 'automation', 'development'],
    screenshots: ['github-1.png', 'github-2.png'],
    features: [
      'Repository management automation',
      'Pull request workflows',
      'Issue tracking integration',
      'CI/CD pipeline triggers',
      'Team collaboration tools'
    ],
    requirements: ['GitHub API token', 'Repository access'],
    changelog: 'Added support for GitHub Actions and improved webhook handling',
    documentation: 'https://docs.devtools.com/github-automation',
    support: 'support@devtools.com',
    website: 'https://devtools.com/github-automation',
    isInstalled: false,
    isVerified: true,
    isPremium: false,
    size: '3.2 MB',
    lastUpdated: '2024-01-12'
  },
  {
    id: 'data-transformer',
    name: 'Advanced Data Transformer',
    description: 'Powerful data transformation and validation toolkit',
    longDescription: 'Enterprise data transformation engine with support for complex data mapping, validation rules, and format conversions.',
    icon: '🔄',
    category: 'Data Processing',
    publisher: 'DataFlow Systems',
    version: '2.3.0',
    rating: 4.5,
    downloads: 7800,
    price: 39.99,
    currency: 'USD',
    tags: ['data', 'transformation', 'validation', 'etl', 'processing'],
    screenshots: ['data-1.png', 'data-2.png'],
    features: [
      'Visual data mapping interface',
      'Advanced validation rules',
      'Multiple format support (JSON, XML, CSV)',
      'Real-time data preview',
      'Error handling and logging'
    ],
    requirements: ['Data source access', 'Processing permissions'],
    changelog: 'Added XML support and improved validation performance',
    documentation: 'https://docs.dataflow.com/transformer',
    support: 'help@dataflow.com',
    website: 'https://dataflow.com/transformer',
    isInstalled: false,
    isVerified: true,
    isPremium: true,
    size: '4.5 MB',
    lastUpdated: '2024-01-07'
  },
  {
    id: 'email-marketing',
    name: 'Email Marketing Pro',
    description: 'Professional email marketing automation platform',
    longDescription: 'Complete email marketing solution with advanced segmentation, A/B testing, and campaign automation.',
    icon: '📧',
    category: 'Marketing',
    publisher: 'Marketing Automation Co.',
    version: '1.9.2',
    rating: 4.4,
    downloads: 9300,
    price: 79.99,
    currency: 'USD',
    tags: ['email', 'marketing', 'automation', 'campaigns', 'analytics'],
    screenshots: ['email-1.png', 'email-2.png'],
    features: [
      'Advanced email segmentation',
      'A/B testing capabilities',
      'Automated campaign workflows',
      'Analytics and reporting',
      'Template library'
    ],
    requirements: ['SMTP server access', 'Email service provider'],
    changelog: 'Enhanced analytics dashboard and new template designs',
    documentation: 'https://docs.marketingauto.com/email-pro',
    support: 'support@marketingauto.com',
    website: 'https://marketingauto.com/email-pro',
    isInstalled: false,
    isVerified: true,
    isPremium: true,
    size: '6.8 MB',
    lastUpdated: '2024-01-05'
  }
];

// Categories derived from app data
const categories = ['all', ...Array.from(new Set(marketplaceApps.map(app => app.category)))];

export default function AppMarketplace({ isOpen, onClose }: AppMarketplaceProps) {
  const { darkMode } = useWorkflowStore();
  const [selectedApp, setSelectedApp] = useState<MarketplaceApp | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('popularity');
  const [showPremiumOnly, setShowPremiumOnly] = useState(false);
  const [installedApps, setInstalledApps] = useState<Set<string>>(new Set());

  const sortOptions = [
    { value: 'popularity', label: 'Most Popular' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'name', label: 'Name A-Z' },
    { value: 'price', label: 'Price Low to High' },
    { value: 'updated', label: 'Recently Updated' }
  ];

  const filteredApps = marketplaceApps
    .filter(app => {
      const matchesSearch = !searchTerm || 
                           app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           app.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           app.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || app.category === selectedCategory;
      const matchesPremium = !showPremiumOnly || app.isPremium;
      return matchesSearch && matchesCategory && matchesPremium;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'popularity':
          return b.downloads - a.downloads;
        case 'rating':
          return b.rating - a.rating;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price':
          return a.price - b.price;
        case 'updated':
          return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
        default:
          return 0;
      }
    });

  const handleInstall = async (appId: string) => {
    const app = marketplaceApps.find(a => a.id === appId);
    if (!app) return;

    try {
      // Show installing notification
      notificationService.show('info', 'Installing App', `Installing ${app.name}...`, { duration: 0 });

      // Use the marketplace service for actual installation
      const success = await marketplaceService.installApp(appId, {
        name: app.name,
        version: app.version,
        publisher: app.publisher,
        price: app.price
      });

      if (success) {
        setInstalledApps(prev => new Set([...prev, appId]));
        notificationService.show('success', 'Installation Complete', 
          `${app.name} has been installed successfully!`, { duration: 5000 });
      } else {
        notificationService.show('error', 'Installation Failed', 
          `Failed to install ${app.name}. Please try again.`, { duration: 5000 });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      logger.error('Installation error:', error);
      notificationService.show('error', 'Installation Error', 
        errorMessage, { duration: 5000 });
    }
  };

  const handleUninstall = async (appId: string) => {
    const app = marketplaceApps.find(a => a.id === appId);
    if (!app) return;

    try {
      // Show uninstalling notification
      notificationService.show('info', 'Uninstalling App', `Uninstalling ${app.name}...`, { duration: 0 });

      // Use the marketplace service for actual uninstallation
      const success = await marketplaceService.uninstallApp(appId);

      if (success) {
        setInstalledApps(prev => {
          const newSet = new Set(prev);
          newSet.delete(appId);
          return newSet;
        });
        notificationService.show('success', 'Uninstallation Complete', 
          `${app.name} has been uninstalled successfully!`, { duration: 5000 });
      } else {
        notificationService.show('error', 'Uninstallation Failed', 
          `Failed to uninstall ${app.name}. Please try again.`, { duration: 5000 });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      logger.error('Uninstallation error:', error);
      notificationService.show('error', 'Uninstallation Error', 
        errorMessage, { duration: 5000 });
    }
  };

  const renderAppCard = (app: MarketplaceApp) => (
    <div className={`p-4 rounded-lg border transition-all cursor-pointer ${
      darkMode
        ? 'bg-gray-800 border-gray-700 hover:bg-gray-750'
        : 'bg-white border-gray-200 hover:bg-gray-50'
    }`}
    onClick={() => setSelectedApp(app)}
    >
      <div className="flex items-start space-x-3">
        <div className="text-3xl">{app.icon}</div>
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="font-semibold">{app.name}</h3>
            {app.isVerified && (
              <CheckCircle className="text-blue-500" size={16} />
            )}
            {app.isPremium && (
              <span className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs rounded-full">
                Premium
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-2">{app.description}</p>
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <Star className="text-yellow-500 fill-current" size={12} />
              <span>{app.rating}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Download size={12} />
              <span>{app.downloads.toLocaleString()}</span>
            </div>
            <div className="flex items-center space-x-1">
              <User size={12} />
              <span>{app.publisher}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-semibold text-lg">
            {app.price === 0 ? 'Free' : `$${app.price}`}
          </div>
          <div className="text-xs text-gray-500">v{app.version}</div>
        </div>
      </div>
    </div>
  );

  const renderAppDetails = (app: MarketplaceApp) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`w-full max-w-4xl max-h-[90vh] ${
        darkMode ? 'bg-gray-900' : 'bg-white'
      } rounded-xl shadow-2xl overflow-hidden`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-4xl">{app.icon}</div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-2xl font-bold">{app.name}</h2>
                  {app.isVerified && (
                    <CheckCircle className="text-blue-500" size={20} />
                  )}
                  {app.isPremium && (
                    <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm rounded-full">
                      Premium
                    </span>
                  )}
                </div>
                <p className="text-gray-500">{app.publisher}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {app.price === 0 ? 'Free' : `$${app.price}`}
                </div>
                <div className="text-sm text-gray-500">v{app.version}</div>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-full" style={{ height: 'calc(90vh - 120px)' }}>
          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Description</h3>
                <p className="text-gray-600 dark:text-gray-300">{app.longDescription}</p>
              </div>

              {/* Features */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Features</h3>
                <ul className="space-y-2">
                  {app.features.map((feature, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <Check className="text-green-500 mt-0.5" size={16} />
                      <span className="text-gray-600 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Requirements */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Requirements</h3>
                <ul className="space-y-2">
                  {app.requirements.map((req, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <AlertCircle className="text-orange-500 mt-0.5" size={16} />
                      <span className="text-gray-600 dark:text-gray-300">{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Changelog */}
              <div>
                <h3 className="text-lg font-semibold mb-3">What's New</h3>
                <p className="text-gray-600 dark:text-gray-300">{app.changelog}</p>
              </div>

              {/* Tags */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {app.tags.map((tag, index) => (
                    <span key={index} className={`px-3 py-1 rounded-full text-sm ${
                      darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className={`w-80 border-l ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
          } p-6`}>
            <div className="space-y-6">
              {/* Install Button */}
              <button
                onClick={() => installedApps.has(app.id) ? handleUninstall(app.id) : handleInstall(app.id)}
                className={`w-full px-4 py-3 rounded-lg font-medium transition-all ${
                  installedApps.has(app.id)
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {installedApps.has(app.id) ? 'Uninstall' : 'Install'}
              </button>

              {/* App Stats */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Rating</span>
                  <div className="flex items-center space-x-1">
                    <Star className="text-yellow-500 fill-current" size={14} />
                    <span className="font-medium">{app.rating}/5</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Downloads</span>
                  <span className="font-medium">{app.downloads.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Size</span>
                  <span className="font-medium">{app.size}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Updated</span>
                  <span className="font-medium">{new Date(app.lastUpdated).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Category</span>
                  <span className="font-medium">{app.category}</span>
                </div>
              </div>

              {/* Links */}
              <div className="space-y-2">
                <a
                  href={(app.website?.startsWith('http://') || app.website?.startsWith('https://')) ? app.website : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-sm text-blue-500 hover:text-blue-600"
                >
                  <ExternalLink size={14} />
                  <span>Visit Website</span>
                </a>
                <a
                  href={(app.documentation?.startsWith('http://') || app.documentation?.startsWith('https://')) ? app.documentation : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-sm text-blue-500 hover:text-blue-600"
                >
                  <BookOpen size={14} />
                  <span>Documentation</span>
                </a>
                <a
                  href={app.support?.includes('@') ? `mailto:${app.support}` : '#'}
                  className="flex items-center space-x-2 text-sm text-blue-500 hover:text-blue-600"
                >
                  <Mail size={14} />
                  <span>Support</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`w-full max-w-7xl max-h-[90vh] ${
        darkMode ? 'bg-gray-900' : 'bg-white'
      } rounded-xl shadow-2xl overflow-hidden`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Package className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold">App Marketplace</h2>
                <p className="text-sm text-gray-500">Discover and install apps to extend your workflows</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className={`px-6 py-4 border-b ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search apps..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg ${
                    darkMode
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-200 text-gray-900'
                  } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`px-3 py-2 rounded-lg ${
                darkMode
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-200 text-gray-900'
              } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={`px-3 py-2 rounded-lg ${
                darkMode
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-200 text-gray-900'
              } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showPremiumOnly}
                onChange={(e) => setShowPremiumOnly(e.target.checked)}
                className="rounded text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm">Premium only</span>
            </label>
          </div>
        </div>

        {/* App Grid */}
        <div className="p-6 overflow-y-auto" style={{ height: 'calc(90vh - 200px)' }}>
          {filteredApps.length === 0 ? (
            <div className="text-center py-12">
              <Package size={64} className="mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-medium mb-2">No apps found</h3>
              <p className="text-gray-500">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredApps.map(app => (
                <React.Fragment key={app.id}>
                  {renderAppCard(app)}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* App Detail Modal */}
      {selectedApp && renderAppDetails(selectedApp)}
    </div>
  );
}