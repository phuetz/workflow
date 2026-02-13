/**
 * N8N-Style Expandable Sidebar
 * Quick access panels with smooth expand/collapse
 * Reference: n8n 2.0 navigation patterns
 */

import React, { memo, useState, useCallback, useEffect } from 'react';
import {
  Home, Workflow, Play, FolderOpen, Users, Settings, ChevronLeft, ChevronRight,
  Clock, Star, Search, Plus, MoreVertical, Trash2, Copy, Edit3, Share2,
  LayoutTemplate, Zap, HelpCircle, Bell, ArrowUpRight, GitBranch, Tag,
  ChevronDown, Filter, SortAsc, Grid3X3, List, Folder, FileText
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

type SidebarSection = 'home' | 'workflows' | 'executions' | 'templates' | 'credentials' | 'team' | 'settings';

interface WorkflowItem {
  id: string;
  name: string;
  isActive: boolean;
  lastRun?: Date;
  status?: 'active' | 'inactive' | 'error';
  isFavorite?: boolean;
  tags?: string[];
  folder?: string;
}

interface FolderItem {
  id: string;
  name: string;
  workflowCount: number;
  isOpen?: boolean;
}

interface N8NStyleSidebarProps {
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  activeSection?: SidebarSection;
  onSectionChange?: (section: SidebarSection) => void;
  workflows?: WorkflowItem[];
  folders?: FolderItem[];
  onWorkflowSelect?: (id: string) => void;
  onWorkflowCreate?: () => void;
  onWorkflowDelete?: (id: string) => void;
  onWorkflowDuplicate?: (id: string) => void;
  onFolderCreate?: () => void;
  selectedWorkflowId?: string;
}

// ============================================================================
// Navigation Item Component
// ============================================================================

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isExpanded: boolean;
  isActive?: boolean;
  badge?: number;
  onClick?: () => void;
}> = ({ icon, label, isExpanded, isActive, badge, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`
        relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
        transition-all duration-200 group
        ${isActive
          ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
        }
      `}
    >
      <span className={`flex-shrink-0 ${isActive ? 'text-primary-600 dark:text-primary-400' : ''}`}>
        {icon}
      </span>

      {isExpanded && (
        <>
          <span className="flex-1 text-left text-sm font-medium truncate">
            {label}
          </span>

          {badge !== undefined && badge > 0 && (
            <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-500 text-white">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </>
      )}

      {/* Tooltip for collapsed state */}
      {!isExpanded && (
        <div className="
          absolute left-full ml-2 px-2 py-1 rounded-md
          bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium
          opacity-0 group-hover:opacity-100 pointer-events-none
          transition-opacity duration-200 whitespace-nowrap z-50
        ">
          {label}
          {badge !== undefined && badge > 0 && ` (${badge})`}
        </div>
      )}
    </button>
  );
};

// ============================================================================
// Workflow List Item Component
// ============================================================================

const WorkflowListItem: React.FC<{
  workflow: WorkflowItem;
  isSelected: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onToggleFavorite?: () => void;
}> = ({ workflow, isSelected, onSelect, onDelete, onDuplicate, onToggleFavorite }) => {
  const [showMenu, setShowMenu] = useState(false);

  const statusColors = {
    active: 'bg-green-500',
    inactive: 'bg-gray-400',
    error: 'bg-red-500',
  };

  return (
    <div
      className={`
        relative group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer
        transition-all duration-150
        ${isSelected
          ? 'bg-primary-100 dark:bg-primary-900/30 border-l-2 border-primary-500'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800 border-l-2 border-transparent'
        }
      `}
      onClick={onSelect}
    >
      {/* Status indicator */}
      <span className={`flex-shrink-0 w-2 h-2 rounded-full ${statusColors[workflow.status || 'inactive']}`} />

      {/* Workflow name */}
      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
        {workflow.name}
      </span>

      {/* Favorite star */}
      {workflow.isFavorite && (
        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
      )}

      {/* Actions menu */}
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="
            p-1 rounded opacity-0 group-hover:opacity-100
            hover:bg-gray-200 dark:hover:bg-gray-700
            transition-all duration-150
          "
        >
          <MoreVertical className="w-4 h-4 text-gray-500" />
        </button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
              }}
            />
            <div className="
              absolute right-0 top-full mt-1 w-40 z-20
              bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700
              py-1
            ">
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite?.();
                  setShowMenu(false);
                }}
              >
                <Star className="w-4 h-4" />
                {workflow.isFavorite ? 'Remove favorite' : 'Add to favorites'}
              </button>
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate?.();
                  setShowMenu(false);
                }}
              >
                <Copy className="w-4 h-4" />
                Duplicate
              </button>
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.();
                  setShowMenu(false);
                }}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Folder Item Component
// ============================================================================

const FolderListItem: React.FC<{
  folder: FolderItem;
  onToggle: () => void;
  children?: React.ReactNode;
}> = ({ folder, onToggle, children }) => {
  return (
    <div>
      <button
        onClick={onToggle}
        className="
          w-full flex items-center gap-2 px-3 py-2 rounded-lg
          text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800
          transition-colors duration-150
        "
      >
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${folder.isOpen ? '' : '-rotate-90'}`}
        />
        <Folder className="w-4 h-4" />
        <span className="flex-1 text-left text-sm font-medium truncate">
          {folder.name}
        </span>
        <span className="text-xs text-gray-400">{folder.workflowCount}</span>
      </button>

      {folder.isOpen && (
        <div className="ml-4 pl-4 border-l border-gray-200 dark:border-gray-700">
          {children}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Search Bar Component
// ============================================================================

const SearchBar: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder = 'Search...' }) => {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          w-full pl-9 pr-3 py-2 rounded-lg
          bg-gray-100 dark:bg-gray-800
          border border-transparent focus:border-primary-500
          text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-primary-500/20
        "
      />
    </div>
  );
};

// ============================================================================
// Quick Stats Component
// ============================================================================

const QuickStats: React.FC<{
  totalWorkflows: number;
  activeWorkflows: number;
  executionsToday: number;
}> = ({ totalWorkflows, activeWorkflows, executionsToday }) => {
  return (
    <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
      <div className="text-center">
        <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{totalWorkflows}</div>
        <div className="text-xs text-gray-500">Workflows</div>
      </div>
      <div className="text-center border-l border-r border-gray-200 dark:border-gray-700">
        <div className="text-lg font-semibold text-green-600">{activeWorkflows}</div>
        <div className="text-xs text-gray-500">Active</div>
      </div>
      <div className="text-center">
        <div className="text-lg font-semibold text-blue-600">{executionsToday}</div>
        <div className="text-xs text-gray-500">Today</div>
      </div>
    </div>
  );
};

// ============================================================================
// Main Sidebar Component
// ============================================================================

export const N8NStyleSidebar = memo<N8NStyleSidebarProps>(({
  isExpanded,
  onExpandedChange,
  activeSection = 'workflows',
  onSectionChange,
  workflows = [],
  folders = [],
  onWorkflowSelect,
  onWorkflowCreate,
  onWorkflowDelete,
  onWorkflowDuplicate,
  onFolderCreate,
  selectedWorkflowId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'status'>('date');

  // Filter workflows based on search
  const filteredWorkflows = workflows.filter(w =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Keyboard shortcut for toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        onExpandedChange(!isExpanded);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, onExpandedChange]);

  return (
    <aside
      className={`
        relative flex flex-col h-full
        bg-white dark:bg-gray-900
        border-r border-gray-200 dark:border-gray-800
        transition-all duration-300 ease-out
        ${isExpanded ? 'w-64' : 'w-16'}
      `}
    >
      {/* Toggle Button */}
      <button
        onClick={() => onExpandedChange(!isExpanded)}
        className="
          absolute -right-3 top-6 z-10
          w-6 h-6 rounded-full
          bg-white dark:bg-gray-800
          border border-gray-200 dark:border-gray-700
          shadow-md
          flex items-center justify-center
          hover:bg-gray-50 dark:hover:bg-gray-700
          transition-colors duration-200
        "
        title={isExpanded ? 'Collapse sidebar (⌘B)' : 'Expand sidebar (⌘B)'}
      >
        {isExpanded ? (
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {/* Logo/Brand Area */}
      <div className={`flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-800 ${isExpanded ? '' : 'justify-center'}`}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        {isExpanded && (
          <span className="font-semibold text-gray-900 dark:text-gray-100">Workflow</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-2">
        <NavItem
          icon={<Home className="w-5 h-5" />}
          label="Home"
          isExpanded={isExpanded}
          isActive={activeSection === 'home'}
          onClick={() => onSectionChange?.('home')}
        />
        <NavItem
          icon={<Workflow className="w-5 h-5" />}
          label="Workflows"
          isExpanded={isExpanded}
          isActive={activeSection === 'workflows'}
          badge={workflows.length}
          onClick={() => onSectionChange?.('workflows')}
        />
        <NavItem
          icon={<Play className="w-5 h-5" />}
          label="Executions"
          isExpanded={isExpanded}
          isActive={activeSection === 'executions'}
          onClick={() => onSectionChange?.('executions')}
        />
        <NavItem
          icon={<LayoutTemplate className="w-5 h-5" />}
          label="Templates"
          isExpanded={isExpanded}
          isActive={activeSection === 'templates'}
          onClick={() => onSectionChange?.('templates')}
        />
        <NavItem
          icon={<FolderOpen className="w-5 h-5" />}
          label="Credentials"
          isExpanded={isExpanded}
          isActive={activeSection === 'credentials'}
          onClick={() => onSectionChange?.('credentials')}
        />
        <NavItem
          icon={<Users className="w-5 h-5" />}
          label="Team"
          isExpanded={isExpanded}
          isActive={activeSection === 'team'}
          onClick={() => onSectionChange?.('team')}
        />
      </nav>

      {/* Divider */}
      <div className="mx-4 my-2 border-t border-gray-200 dark:border-gray-800" />

      {/* Workflow List (when expanded and on workflows section) */}
      {isExpanded && activeSection === 'workflows' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Quick Stats */}
          <div className="px-3 mb-3">
            <QuickStats
              totalWorkflows={workflows.length}
              activeWorkflows={workflows.filter(w => w.status === 'active').length}
              executionsToday={42}
            />
          </div>

          {/* Search & Actions */}
          <div className="px-3 mb-3 space-y-2">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search workflows..."
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                  <List className="w-4 h-4 text-gray-500" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                  <Grid3X3 className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <button
                onClick={onWorkflowCreate}
                className="
                  flex items-center gap-1 px-2 py-1.5 rounded-lg
                  bg-primary-500 hover:bg-primary-600
                  text-white text-xs font-medium
                  transition-colors duration-200
                "
              >
                <Plus className="w-3.5 h-3.5" />
                New
              </button>
            </div>
          </div>

          {/* Workflow List */}
          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
            {/* Favorites Section */}
            {filteredWorkflows.some(w => w.isFavorite) && (
              <div className="mb-3">
                <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <Star className="w-3.5 h-3.5" />
                  Favorites
                </div>
                {filteredWorkflows
                  .filter(w => w.isFavorite)
                  .map(workflow => (
                    <WorkflowListItem
                      key={workflow.id}
                      workflow={workflow}
                      isSelected={selectedWorkflowId === workflow.id}
                      onSelect={() => onWorkflowSelect?.(workflow.id)}
                      onDelete={() => onWorkflowDelete?.(workflow.id)}
                      onDuplicate={() => onWorkflowDuplicate?.(workflow.id)}
                    />
                  ))}
              </div>
            )}

            {/* Recent Section */}
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5" />
              Recent
            </div>

            {filteredWorkflows
              .filter(w => !w.isFavorite)
              .map(workflow => (
                <WorkflowListItem
                  key={workflow.id}
                  workflow={workflow}
                  isSelected={selectedWorkflowId === workflow.id}
                  onSelect={() => onWorkflowSelect?.(workflow.id)}
                  onDelete={() => onWorkflowDelete?.(workflow.id)}
                  onDuplicate={() => onWorkflowDuplicate?.(workflow.id)}
                />
              ))}

            {filteredWorkflows.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                {searchQuery ? 'No workflows found' : 'No workflows yet'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="mt-auto border-t border-gray-200 dark:border-gray-800 p-2">
        <NavItem
          icon={<HelpCircle className="w-5 h-5" />}
          label="Help & Support"
          isExpanded={isExpanded}
          onClick={() => {}}
        />
        <NavItem
          icon={<Settings className="w-5 h-5" />}
          label="Settings"
          isExpanded={isExpanded}
          isActive={activeSection === 'settings'}
          onClick={() => onSectionChange?.('settings')}
        />
      </div>
    </aside>
  );
});

N8NStyleSidebar.displayName = 'N8NStyleSidebar';

// ============================================================================
// Hook for sidebar state
// ============================================================================

export function useSidebar(defaultExpanded = true) {
  const [isExpanded, setIsExpanded] = useState(() => {
    // Try to restore from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sidebar-expanded');
      return stored !== null ? stored === 'true' : defaultExpanded;
    }
    return defaultExpanded;
  });

  const toggleSidebar = useCallback(() => {
    setIsExpanded(prev => {
      const newValue = !prev;
      localStorage.setItem('sidebar-expanded', String(newValue));
      return newValue;
    });
  }, []);

  const expandSidebar = useCallback(() => {
    setIsExpanded(true);
    localStorage.setItem('sidebar-expanded', 'true');
  }, []);

  const collapseSidebar = useCallback(() => {
    setIsExpanded(false);
    localStorage.setItem('sidebar-expanded', 'false');
  }, []);

  return {
    isExpanded,
    setIsExpanded,
    toggleSidebar,
    expandSidebar,
    collapseSidebar,
  };
}

export default N8NStyleSidebar;
