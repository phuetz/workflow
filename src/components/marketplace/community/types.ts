/**
 * Community Marketplace Types
 * Shared types for marketplace components
 */

import type { CommunityNode, NodeInstallation, NodeCategory, NodeSortOption } from '../../../types/community';

// Card component props
export interface PluginCardProps {
  node: CommunityNode;
  darkMode: boolean;
  isInstalled: boolean;
  onInstall: () => void;
  onSelect: () => void;
}

export interface FeaturedNodeCardProps extends PluginCardProps {}

export interface InstalledNodeCardProps {
  node: CommunityNode;
  installation: NodeInstallation;
  darkMode: boolean;
  onUninstall: () => void;
  onSelect: () => void;
}

// Modal props
export interface NodeDetailsModalProps {
  node: CommunityNode;
  isInstalled: boolean;
  onClose: () => void;
  onInstall: () => void;
  onUninstall: () => void;
  darkMode: boolean;
}

// Filter/Search props
export interface MarketplaceFiltersProps {
  selectedCategory: NodeCategory | 'all';
  sortBy: NodeSortOption;
  onCategoryChange: (category: NodeCategory | 'all') => void;
  onSortChange: (sort: NodeSortOption) => void;
  darkMode: boolean;
}

export interface MarketplaceSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onToggleFilters: () => void;
  darkMode: boolean;
}

// Grid props
export interface MarketplaceGridProps {
  nodes: CommunityNode[];
  darkMode: boolean;
  isNodeInstalled: (nodeId: string) => boolean;
  onInstall: (nodeId: string) => void;
  onSelect: (node: CommunityNode) => void;
  loading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

// Header props
export interface MarketplaceHeaderProps {
  darkMode: boolean;
  activeTab: 'discover' | 'installed' | 'submit';
  onTabChange: (tab: 'discover' | 'installed' | 'submit') => void;
}

// Categories config
export interface CategoryConfig {
  key: NodeCategory | 'all';
  label: string;
  icon: string;
}

export const CATEGORIES: CategoryConfig[] = [
  { key: 'all', label: 'All Categories', icon: '' },
  { key: 'data', label: 'Data', icon: '' },
  { key: 'communication', label: 'Communication', icon: '' },
  { key: 'marketing', label: 'Marketing', icon: '' },
  { key: 'productivity', label: 'Productivity', icon: '' },
  { key: 'development', label: 'Development', icon: '' },
  { key: 'ai-ml', label: 'AI & ML', icon: '' },
  { key: 'analytics', label: 'Analytics', icon: '' },
  { key: 'finance', label: 'Finance', icon: '' },
  { key: 'social', label: 'Social', icon: '' }
];

// Theme classes helper
export interface ThemeClasses {
  bg: string;
  border: string;
  text: string;
  textSecondary: string;
  input: string;
  inputPlaceholder: string;
  hover: string;
  card: string;
  cardHover: string;
}

export function getThemeClasses(darkMode: boolean): ThemeClasses {
  return darkMode ? {
    bg: 'bg-gray-800',
    border: 'border-gray-700',
    text: 'text-white',
    textSecondary: 'text-gray-400',
    input: 'bg-gray-700 border-gray-600 text-white',
    inputPlaceholder: 'placeholder-gray-400',
    hover: 'hover:bg-gray-700',
    card: 'bg-gray-800 border-gray-700',
    cardHover: 'hover:border-gray-600'
  } : {
    bg: 'bg-white',
    border: 'border-gray-200',
    text: 'text-gray-900',
    textSecondary: 'text-gray-500',
    input: 'bg-white border-gray-300 text-gray-900',
    inputPlaceholder: 'placeholder-gray-400',
    hover: 'hover:bg-gray-50',
    card: 'bg-white border-gray-200',
    cardHover: 'hover:border-gray-300'
  };
}

// Re-export community types for convenience
export type { CommunityNode, NodeInstallation, NodeCategory, NodeSortOption };
