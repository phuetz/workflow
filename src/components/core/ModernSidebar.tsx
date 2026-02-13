/** @deprecated Use UnifiedSidebar instead. Kept for backward compatibility with non-editor views. */
import React, { useState, useMemo, useCallback } from 'react';
import {
  BarChart, Brain, Briefcase, Building, ChevronDown, ChevronRight,
  Chrome, Clock, Cloud, Code, Coins, Database,
  DollarSign, Download, GitBranch, HardDrive, Headphones, Keyboard,
  Mail, Megaphone, MessageSquare, Monitor, Move, Package,
  PanelLeftClose, PanelLeftOpen, Puzzle, Search, Settings, ShoppingCart,
  Star, TrendingUp, Users, Workflow, Zap
} from 'lucide-react';
import { nodeTypes, nodeCategories } from '../../data/nodeTypes';
import { useWorkflowStore } from '../../store/workflowStore';
import AppMarketplace from '../marketplace/AppMarketplace';
import { logger } from '../../services/SimpleLogger';
import { useAccessibility, KeyboardNavigation, announceToScreenReader } from '../../utils/accessibility';
import { useKeyboardNavigation, NavigationItem } from '../../hooks/useKeyboardNavigation';

interface ModernSidebarProps {
  open: boolean;
  onToggle: () => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filterCategory: string;
  onFilterChange: (category: string) => void;
}

const ModernSidebar: React.FC<ModernSidebarProps> = ({
  open,
  onToggle,
  searchTerm,
  onSearchChange,
  filterCategory,
  onFilterChange,
}) => {
  const { darkMode } = useWorkflowStore();
  const [activeTab, setActiveTab] = useState<'nodes' | 'recent' | 'favorites' | 'marketplace'>('nodes');
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['trigger', 'core']));
  const [recentNodes, setRecentNodes] = useState<string[]>([]);
  const [favoriteNodes, setFavoriteNodes] = useState<Set<string>>(new Set());
  const [selectedNodeType, setSelectedNodeType] = useState<string | null>(null);
  const [keyboardFocusedIndex, setKeyboardFocusedIndex] = useState(-1);

  // Filtrage des nœuds
  const filteredAndGroupedNodes = useMemo(() => {
    const filtered = Object.entries(nodeTypes).filter(([type, config]) => {
      const matchesSearch =
        config.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        config.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        type.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = !filterCategory || config.category === filterCategory;

      return matchesSearch && matchesCategory;
    });

    // Grouper par catégorie
    const grouped = filtered.reduce((acc, [type, config]) => {
      const category = config.category || 'other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({ type, config });
      return acc;
    }, {} as Record<string, Array<{ type: string; config: typeof nodeTypes[keyof typeof nodeTypes] }>>);

    return grouped;
  }, [searchTerm, filterCategory]);

  // Gestion du drag start
  const handleDragStart = useCallback((event: React.DragEvent, nodeType: string) => {
    logger.info('Drag start - nodeType:', nodeType);
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('text/plain', nodeType); // Fallback
    event.dataTransfer.effectAllowed = 'move';

    // Ajouter à la liste des nœuds récents
    setRecentNodes(prev => {
      const updated = [nodeType, ...prev.filter(n => n !== nodeType)];
      return updated.slice(0, 10);
    });
  }, []);

  // Basculer l'état d'expansion d'une catégorie
  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories(prev => {
      const updated = new Set(prev);
      if (updated.has(category)) {
        updated.delete(category);
      } else {
        updated.add(category);
      }
      return updated;
    });
  }, []);

  // Basculer les favoris
  const toggleFavorite = useCallback((nodeType: string) => {
    setFavoriteNodes(prev => {
      const updated = new Set(prev);
      if (updated.has(nodeType)) {
        updated.delete(nodeType);
      } else {
        updated.add(nodeType);
      }
      return updated;
    });
  }, []);

  // Handle keyboard-based node selection
  const handleKeyboardNodeSelect = useCallback((nodeType: string) => {
    const nodeConfig = nodeTypes[nodeType];
    setSelectedNodeType(nodeType);

    // Add to recent nodes (same as drag start)
    setRecentNodes(prev => {
      const updated = [nodeType, ...prev.filter(n => n !== nodeType)];
      return updated.slice(0, 10);
    });

    // Announce to screen reader
    announceToScreenReader(
      `${nodeConfig?.label || nodeType} node selected. Press Enter to add to canvas or use Tab to navigate to next node.`,
      'polite'
    );

    logger.info('Keyboard node selection:', nodeType);
  }, []);

  // Get all available nodes for keyboard navigation
  const availableNodes = useMemo(() => {
    const allNodes: string[] = [];
    Object.entries(filteredAndGroupedNodes).forEach(([category, nodes]) => {
      if (expandedCategories.has(category)) {
        nodes.forEach(({ type }) => allNodes.push(type));
      }
    });
    return allNodes;
  }, [filteredAndGroupedNodes, expandedCategories]);

  // Handle keyboard navigation
  const handleKeyboardNavigation = useCallback((event: React.KeyboardEvent) => {
    if (availableNodes.length === 0) return;

    KeyboardNavigation.handleArrowNavigation(
      event.nativeEvent,
      keyboardFocusedIndex,
      availableNodes.length,
      (newIndex) => {
        setKeyboardFocusedIndex(newIndex);
        const nodeType = availableNodes[newIndex];
        if (nodeType) {
          handleKeyboardNodeSelect(nodeType);
        }
      }
    );

    // Handle Enter key to trigger "add to canvas" action
    if (event.key === 'Enter' && selectedNodeType) {
      event.preventDefault();
      // Create a synthetic drag start event for consistency
      const fakeEvent = {
        dataTransfer: {
          setData: (format: string, data: string) => {
            // Store data for potential canvas drop handling
            localStorage.setItem('keyboardSelectedNode', data);
          },
          effectAllowed: 'move'
        }
      } as React.DragEvent;

      handleDragStart(fakeEvent, selectedNodeType);
      const nodeConfig = nodeTypes[selectedNodeType];
      announceToScreenReader(
        `${nodeConfig?.label || selectedNodeType} node ready to add to canvas. Navigate to the canvas and press Space to add.`,
        'assertive'
      );
    }

    // Handle Space key to toggle favorites
    if (event.key === ' ' && selectedNodeType) {
      event.preventDefault();
      const isFavorite = favoriteNodes.has(selectedNodeType);
      toggleFavorite(selectedNodeType);
      const nodeConfig = nodeTypes[selectedNodeType];
      announceToScreenReader(
        `${nodeConfig?.label || selectedNodeType} ${isFavorite ? 'removed from' : 'added to'} favorites.`,
        'polite'
      );
    }
  }, [availableNodes, keyboardFocusedIndex, selectedNodeType, handleKeyboardNodeSelect, handleDragStart, toggleFavorite, favoriteNodes]);

  // Icônes pour les catégories
  const categoryIcons: Record<string, any> = {
    trigger: Zap,
    core: Settings,
    communication: MessageSquare,
    database: Database,
    google: Chrome,
    microsoft: Monitor,
    cloud: Cloud,
    development: Code,
    devops: GitBranch,
    ecommerce: ShoppingCart,
    ai: Brain,
    productivity: Briefcase,
    flow: GitBranch,
    data: BarChart,
    saas: Building,
    social: Users,
    marketing: Mail,
    storage: HardDrive,
    support: Headphones,
    analytics: TrendingUp,
    crypto: Coins,
    finance: DollarSign,
    crm: Users,
  };

  const NodeItem: React.FC<{ type: string; config: any; showCategory?: boolean }> = ({
    type,
    config,
    showCategory = false
  }) => {
    const nodeIndex = availableNodes.indexOf(type);
    const isKeyboardSelected = selectedNodeType === type;
    const isKeyboardFocused = keyboardFocusedIndex === nodeIndex;
    const IconComponent = categoryIcons[config.category] || Settings;
    const CategoryIconComponent = categoryIcons[config.category] || Settings;

    return (
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, type)}
        tabIndex={0}
        role="button"
        aria-label={`${config.label} - ${config.description}. Press Enter to add to canvas, Space to toggle favorite, or use arrow keys to navigate.`}
        aria-describedby={`node-${type}-details`}
        aria-pressed={isKeyboardSelected}
        onKeyDown={handleKeyboardNavigation}
        onFocus={() => {
          if (nodeIndex >= 0) {
            setKeyboardFocusedIndex(nodeIndex);
            handleKeyboardNodeSelect(type);
          }
        }}
        className={`group relative flex items-center p-3 rounded-lg cursor-move transition-all duration-200 hover:scale-105 ${
          darkMode
            ? 'bg-gray-800 hover:bg-gray-700 border-gray-700'
            : 'bg-white hover:bg-gray-50 border-gray-200'
        } border shadow-sm hover:shadow-md ${
          isKeyboardSelected ? 'ring-2 ring-blue-500' : ''
        } ${
          isKeyboardFocused ? 'ring-2 ring-blue-300' : ''
        }`}
      >
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-medium mr-3 ${config.color}`}>
          <IconComponent size={20} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {config.label}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(type);
              }}
              className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded ${
                favoriteNodes.has(type) ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'
              }`}
            >
              <Star size={14} fill={favoriteNodes.has(type) ? 'currentColor' : 'none'} />
            </button>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
            {config.description}
          </p>

          {showCategory && (
            <div className="flex items-center mt-2">
              <CategoryIconComponent size={12} className="text-gray-400 mr-1" />
              <span className="text-xs text-gray-400 capitalize">
                {nodeCategories[config.category]?.name || config.category}
              </span>
            </div>
          )}
        </div>

        {/* Indicateur de glissement */}
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
          <Move size={12} className="text-white p-0.5" />
        </div>

        {/* Hidden accessibility description */}
        <div id={`node-${type}-details`} className="sr-only">
          Node type: {type}. Category: {config.category}.
          {favoriteNodes.has(type) ? 'In favorites. ' : 'Not in favorites. '}
          Keyboard shortcuts: Enter to add to canvas, Space to toggle favorite, Arrow keys to navigate.
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Sidebar */}
      <nav 
        className={`fixed left-0 top-0 h-full transition-all duration-300 z-40 ${
          open ? 'w-80' : 'w-16'
        } ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} border-r shadow-lg`}
        role="navigation"
        aria-label="Navigation des nœuds de workflow"
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
          {open && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                <Workflow size={16} className="text-white" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Nœuds
              </h2>
            </div>
          )}
          <button
            onClick={onToggle}
            className={`p-2 rounded-lg transition-colors ${
              darkMode
                ? 'hover:bg-gray-800 text-gray-400 hover:text-white'
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            }`}
          >
            {open ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
          </button>
        </div>

        {open && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              {[
                { id: 'nodes', label: 'Nœuds', icon: Puzzle },
                { id: 'recent', label: 'Récents', icon: Clock },
                { id: 'favorites', label: 'Favoris', icon: Star },
                { id: 'marketplace', label: 'Apps', icon: Package },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'nodes' | 'recent' | 'favorites' | 'marketplace')}
                  className={`flex-1 flex items-center justify-center px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? darkMode
                        ? 'text-primary-400 border-b-2 border-primary-400'
                        : 'text-primary-600 border-b-2 border-primary-600'
                      : darkMode
                        ? 'text-gray-400 hover:text-gray-300'
                        : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon size={16} className="mr-2" />
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'nodes' && (
              <>
                {/* Recherche */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Rechercher des nœuds..."
                      value={searchTerm}
                      onChange={(e) => onSearchChange(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2 text-sm rounded-lg transition-colors ${
                        darkMode
                          ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400'
                          : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500'
                      } border focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent`}
                      aria-label="Rechercher des nœuds de workflow"
                      aria-describedby="search-help"
                      role="searchbox"
                    />
                    <div id="search-help" className="sr-only">
                      Tapez pour rechercher parmi les nœuds disponibles
                    </div>
                    {/* ACCESSIBILITY FIX: Live region for search results */}
                    <div
                      aria-live="polite"
                      aria-atomic="true"
                      className="sr-only"
                    >
                      {searchTerm && Object.keys(filteredAndGroupedNodes).length === 0
                        ? "Aucun nœud trouvé pour cette recherche"
                        : searchTerm && Object.values(filteredAndGroupedNodes).flat().length > 0
                        ? `${Object.values(filteredAndGroupedNodes).flat().length} nœuds trouvés`
                        : ""
                      }
                    </div>
                  </div>
                </div>

                {/* Filtre par catégorie */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <select
                    value={filterCategory}
                    onChange={(e) => onFilterChange(e.target.value)}
                    className={`w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                      darkMode
                        ? 'bg-gray-800 border-gray-700 text-white'
                        : 'bg-gray-50 border-gray-200 text-gray-900'
                    } border focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent`}
                  >
                    <option value="all">Toutes les catégories</option>
                    {Object.entries(nodeCategories).map(([key, category]) => (
                      <option key={key} value={key}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Keyboard navigation instructions */}
                <div className={`px-4 py-2 text-xs ${darkMode ? 'text-gray-400 bg-gray-800' : 'text-gray-600 bg-gray-50'} border-b border-gray-200 dark:border-gray-700`}>
                  <div className="flex items-center space-x-1">
                    <Keyboard size={12} />
                    <span>Navigation: ↑↓ to select, Enter to add, Space for favorites</span>
                  </div>
                </div>

                {/* Liste des nœuds par catégorie */}
                <div className="flex-1 overflow-y-auto"
                     role="region"
                     aria-label="Node categories and items"
                     onKeyDown={handleKeyboardNavigation}
                     tabIndex={-1}>
                  {Object.entries(filteredAndGroupedNodes).map(([category, nodes]) => {
                    const CategoryIcon = categoryIcons[category] || Settings;
                    const categoryInfo = nodeCategories[category] || { name: category, icon: '📦' };
                    const isExpanded = expandedCategories.has(category);

                    return (
                      <div key={category} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                        <button
                          onClick={() => toggleCategory(category)}
                          className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                            darkMode
                              ? 'hover:bg-gray-800 text-gray-300'
                              : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <div className="flex items-center">
                            <CategoryIcon size={16} className="mr-2" />
                            <span className="text-sm font-medium">{categoryInfo.name}</span>
                            <span className="ml-2 text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                              {nodes.length}
                            </span>
                          </div>
                          <ChevronDown
                            size={16}
                            className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-3 space-y-2">
                            {nodes.map(({ type, config }) => (
                              <NodeItem key={type} type={type} config={config} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {activeTab === 'recent' && (
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {recentNodes.length > 0 ? (
                    recentNodes.map((type) => (
                      nodeTypes[type] && (
                        <NodeItem 
                          key={type} 
                          type={type} 
                          config={nodeTypes[type]}
                          showCategory={true}
                        />
                      )
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Clock size={48} className="mx-auto mb-3 opacity-50" />
                      <p>Aucun nœud récent</p>
                      <p className="text-sm mt-1">Glissez des nœuds pour les voir apparaître ici</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'favorites' && (
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {Array.from(favoriteNodes).length > 0 ? (
                    Array.from(favoriteNodes).map((type) => (
                      nodeTypes[type] && (
                        <NodeItem 
                          key={type} 
                          type={type} 
                          config={nodeTypes[type]}
                          showCategory={true}
                        />
                      )
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Star size={48} className="mx-auto mb-3 opacity-50" />
                      <p>Aucun favori</p>
                      <p className="text-sm mt-1">Cliquez sur ⭐ pour ajouter des nœuds aux favoris</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            {activeTab === 'marketplace' && (
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="text-center py-4">
                    <Package size={48} className="mx-auto mb-3 text-purple-500" />
                    <h3 className="text-lg font-semibold mb-2">App Marketplace</h3>
                    <p className="text-sm text-gray-500">Découvrez des applications pour étendre vos workflows</p>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="space-y-3">
                    <button
                      onClick={() => setMarketplaceOpen(true)}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 transform hover:scale-105"
                    >
                      <Package size={16} />
                      <span>Parcourir le Marketplace</span>
                    </button>
                    
                    <button
                      onClick={() => setMarketplaceOpen(true)}
                      className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors ${
                        darkMode
                          ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Download size={16} />
                      <span>Mes Applications</span>
                    </button>
                  </div>

                  {/* Featured Apps */}
                  <div>
                    <h4 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Applications populaires</h4>
                    <div className="space-y-2">
                      {[
                        { name: 'Slack Pro', icon: '🔥', category: 'Communication' },
                        { name: 'AI Content Generator', icon: '🤖', category: 'AI & ML' },
                        { name: 'GitHub Automation', icon: '🐙', category: 'Development' },
                        { name: 'Salesforce Sync', icon: '☁️', category: 'CRM' }
                      ].map((app, index) => (
                        <button
                          key={index}
                          onClick={() => setMarketplaceOpen(true)}
                          className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all ${
                            darkMode
                              ? 'bg-gray-800 hover:bg-gray-700 border-gray-700'
                              : 'bg-white hover:bg-gray-50 border-gray-200'
                          } border hover:shadow-md`}
                        >
                          <div className="text-2xl">{app.icon}</div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium">{app.name}</p>
                            <p className="text-xs text-gray-500">{app.category}</p>
                          </div>
                          <ChevronRight size={16} className="text-gray-400" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Categories */}
                  <div>
                    <h4 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Catégories</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { name: 'Communication', icon: MessageSquare, color: 'bg-blue-500' },
                        { name: 'AI & ML', icon: Brain, color: 'bg-purple-500' },
                        { name: 'CRM', icon: Users, color: 'bg-green-500' },
                        { name: 'Development', icon: Code, color: 'bg-orange-500' },
                        { name: 'Marketing', icon: Megaphone, color: 'bg-pink-500' },
                        { name: 'Data Processing', icon: Database, color: 'bg-indigo-500' }
                      ].map((category, index) => (
                        <button
                          key={index}
                          onClick={() => setMarketplaceOpen(true)}
                          className={`flex flex-col items-center p-3 rounded-lg transition-all ${
                            darkMode
                              ? 'bg-gray-800 hover:bg-gray-700'
                              : 'bg-white hover:bg-gray-50'
                          } border ${
                            darkMode ? 'border-gray-700' : 'border-gray-200'
                          } hover:shadow-md`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white mb-2 ${category.color}`}>
                            <category.icon size={16} />
                          </div>
                          <span className="text-xs font-medium">{category.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Version compacte */}
        {!open && (
          <div className="flex flex-col items-center py-4 space-y-4">
            {Object.entries(nodeCategories).slice(0, 6).map(([key, category]) => {
              const CategoryIcon = categoryIcons[key] || Settings;
              return (
                <button
                  key={key}
                  onClick={() => {
                    onFilterChange(key);
                    onToggle();
                  }}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                    darkMode
                      ? 'hover:bg-gray-800 text-gray-400 hover:text-white'
                      : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                  }`}
                  title={category.name}
                >
                  <CategoryIcon size={20} />
                </button>
              );
            })}
          </div>
        )}
      </nav>

      {/* Overlay pour mobile */}
      {open && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* App Marketplace Modal */}
      <AppMarketplace
        isOpen={marketplaceOpen}
        onClose={() => setMarketplaceOpen(false)}
      />
    </>
  );
};

export default ModernSidebar;