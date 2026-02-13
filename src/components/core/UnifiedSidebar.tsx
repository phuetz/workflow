/**
 * UnifiedSidebar
 *
 * Consolidated sidebar component using Linear design system.
 * Replaces Sidebar.tsx, ModernSidebar.tsx, and N8NStyleSidebar.tsx.
 *
 * Features:
 * - Automatic dark mode via CSS variables
 * - Expandable/collapsible with keyboard shortcut (Ctrl+B)
 * - Draggable node palette with ReactFlow integration
 * - Category-based node organization
 */

import React, { useState, useCallback, useEffect, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  Workflow,
  Play,
  FolderOpen,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Clock,
  Star,
  Search,
  Plus,
  MoreVertical,
  Trash2,
  Copy,
  Zap,
  HelpCircle,
  LayoutTemplate,
  ChevronDown,
  Folder,
  Database,
  Cloud,
  Code,
  GitBranch,
  Cpu,
  Mail,
  Globe,
  Bot,
  Shuffle,
  Shield,
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import { nodeTypes, nodeCategories } from '../../data/nodeTypes';
import { zClass } from '../../styles/z-index';
import { logger } from '../../services/SimpleLogger';

// ============================================================================
// Types
// ============================================================================

export type SidebarSection =
  | 'home'
  | 'workflows'
  | 'executions'
  | 'templates'
  | 'credentials'
  | 'team'
  | 'settings';

export interface WorkflowItem {
  id: string;
  name: string;
  isActive: boolean;
  lastRun?: Date;
  status?: 'active' | 'inactive' | 'error';
  isFavorite?: boolean;
  tags?: string[];
  folder?: string;
}

export interface UnifiedSidebarProps {
  /** Is sidebar expanded */
  isExpanded?: boolean;
  /** Callback when expansion state changes */
  onExpandedChange?: (expanded: boolean) => void;
  /** Current active section */
  activeSection?: SidebarSection;
  /** Callback when section changes */
  onSectionChange?: (section: SidebarSection) => void;
  /** Show node palette for workflow editor */
  showNodePalette?: boolean;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Navigation Item Component
// ============================================================================

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  isExpanded: boolean;
  isActive?: boolean;
  badge?: number;
  onClick?: () => void;
}

const NavItem = memo<NavItemProps>(({ icon, label, isExpanded, isActive, badge, onClick }) => (
  <button
    onClick={onClick}
    className={`
      relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
      transition-all duration-200 group
      ${
        isActive
          ? 'bg-[var(--linear-accent-purple)]/10 text-[var(--linear-accent-purple)]'
          : 'text-[var(--linear-text-secondary)] hover:bg-[var(--linear-surface-hover)] hover:text-[var(--linear-text-primary)]'
      }
    `}
  >
    <span className={`flex-shrink-0 ${isActive ? 'text-[var(--linear-accent-purple)]' : ''}`}>
      {icon}
    </span>

    {isExpanded && (
      <>
        <span className="flex-1 text-left text-sm font-medium truncate">{label}</span>
        {badge !== undefined && badge > 0 && (
          <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--linear-accent-purple)] text-white">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </>
    )}

    {/* Tooltip for collapsed state */}
    {!isExpanded && (
      <div className="absolute left-full ml-2 px-2 py-1 rounded-md bg-[var(--linear-bg-elevated)] text-[var(--linear-text-primary)] text-xs font-medium opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-tooltip shadow-lg border border-[var(--linear-border-subtle)]">
        {label}
        {badge !== undefined && badge > 0 && ` (${badge})`}
      </div>
    )}
  </button>
));

NavItem.displayName = 'NavItem';

// ============================================================================
// Node Palette Component (for editor mode)
// ============================================================================

interface NodePaletteProps {
  isExpanded: boolean;
}

// Category icon mapping
const categoryIcons: Record<string, React.ReactNode> = {
  trigger: <Zap className="w-4 h-4" />,
  core: <Code className="w-4 h-4" />,
  communication: <Mail className="w-4 h-4" />,
  database: <Database className="w-4 h-4" />,
  cloud: <Cloud className="w-4 h-4" />,
  ai: <Bot className="w-4 h-4" />,
  flow: <GitBranch className="w-4 h-4" />,
  action: <Play className="w-4 h-4" />,
  transform: <Shuffle className="w-4 h-4" />,
  devops: <Cpu className="w-4 h-4" />,
  security: <Shield className="w-4 h-4" />,
  marketing: <Globe className="w-4 h-4" />,
};

// Persistent recent nodes (persisted in localStorage)
const RECENT_NODES_KEY = 'n8n-recent-nodes';
const MAX_RECENT = 6;

const getRecentNodes = (): string[] => {
  try {
    const stored = localStorage.getItem(RECENT_NODES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
};

const addRecentNode = (nodeType: string) => {
  const recent = getRecentNodes().filter(t => t !== nodeType);
  recent.unshift(nodeType);
  localStorage.setItem(RECENT_NODES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
};

const NodePalette = memo<NodePaletteProps>(({ isExpanded }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [recentNodes, setRecentNodes] = useState<string[]>(getRecentNodes);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['trigger', 'core'])
  );

  // Filter and group nodes
  const groupedNodes = useMemo(() => {
    const filtered = Object.entries(nodeTypes).filter(([type, config]) => {
      const matchesSearch =
        config.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        config.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        type.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });

    const grouped = filtered.reduce(
      (acc, [type, config]) => {
        const category = config.category || 'other';
        if (!acc[category]) acc[category] = [];
        acc[category].push({ type, config });
        return acc;
      },
      {} as Record<string, Array<{ type: string; config: (typeof nodeTypes)[keyof typeof nodeTypes] }>>
    );

    return grouped;
  }, [searchTerm]);

  // Recent nodes data
  const recentNodeData = useMemo(() => {
    return recentNodes
      .filter(type => nodeTypes[type])
      .map(type => ({ type, config: nodeTypes[type] }));
  }, [recentNodes]);

  // Drag start handler
  const handleDragStart = useCallback((event: React.DragEvent, nodeType: string) => {
    logger.info('Drag start - nodeType:', nodeType);
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('text/plain', nodeType);
    event.dataTransfer.effectAllowed = 'move';
    // Track recent
    addRecentNode(nodeType);
    setRecentNodes(getRecentNodes());
  }, []);

  // Toggle category
  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories((prev) => {
      const updated = new Set(prev);
      if (updated.has(category)) {
        updated.delete(category);
      } else {
        updated.add(category);
      }
      return updated;
    });
  }, []);

  if (!isExpanded) return null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Search */}
      <div className="px-3 mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--linear-text-muted)]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search nodes..."
            className="
              w-full pl-9 pr-3 py-2 rounded-lg
              bg-[var(--linear-surface-1)]
              border border-[var(--linear-border-subtle)]
              focus:border-[var(--n8n-color-primary,#ff6d5a)]
              text-sm text-[var(--linear-text-primary)]
              placeholder-[var(--linear-text-muted)]
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-[var(--n8n-color-primary,#ff6d5a)]/20
            "
          />
        </div>
      </div>

      {/* Recently used nodes */}
      {!searchTerm && recentNodeData.length > 0 && (
        <div className="px-2 mb-2">
          <div className="flex items-center gap-2 px-3 py-1.5 text-[var(--linear-text-muted)]">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Recent</span>
          </div>
          <div className="space-y-0.5">
            {recentNodeData.map(({ type, config }) => (
              <div
                key={type}
                draggable
                onDragStart={(e) => handleDragStart(e, type)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md cursor-grab active:cursor-grabbing text-[var(--linear-text-secondary)] hover:bg-[var(--linear-surface-hover)] hover:text-[var(--linear-text-primary)] transition-colors duration-150"
              >
                <span
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 text-white text-[10px]"
                  style={{ backgroundColor: nodeCategories[config.category]?.color || '#6b7280' }}
                >
                  {config.icon?.charAt(0)?.toUpperCase() || '?'}
                </span>
                <span className="text-sm truncate">{config.label}</span>
              </div>
            ))}
          </div>
          <div className="mx-3 my-2 border-t border-[var(--linear-border-subtle)]" />
        </div>
      )}

      {/* Node categories */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {Object.entries(groupedNodes).map(([category, nodes]) => {
          const categoryConfig = nodeCategories[category];
          const isCatExpanded = expandedCategories.has(category);
          const catIcon = categoryIcons[category] || <Folder className="w-4 h-4" />;

          return (
            <div key={category}>
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[var(--linear-text-secondary)] hover:bg-[var(--linear-surface-hover)] transition-colors duration-150"
              >
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 flex-shrink-0 ${isCatExpanded ? '' : '-rotate-90'}`}
                />
                <span
                  className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: (categoryConfig?.color || '#6b7280') + '20', color: categoryConfig?.color || '#6b7280' }}
                >
                  {catIcon}
                </span>
                <span className="flex-1 text-left text-sm font-medium capitalize">{category}</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--linear-surface-2)] text-[var(--linear-text-muted)]">{nodes.length}</span>
              </button>

              {isCatExpanded && (
                <div className="ml-5 pl-4 border-l border-[var(--linear-border-subtle)] mt-1 space-y-0.5">
                  {nodes.map(({ type, config }) => (
                    <div
                      key={type}
                      draggable
                      onDragStart={(e) => handleDragStart(e, type)}
                      className="
                        flex items-center gap-2 px-2 py-1.5 rounded-md
                        cursor-grab active:cursor-grabbing
                        text-[var(--linear-text-secondary)]
                        hover:bg-[var(--linear-surface-hover)]
                        hover:text-[var(--linear-text-primary)]
                        transition-colors duration-150
                      "
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: categoryConfig?.color || '#6b7280' }}
                      />
                      <span className="text-sm truncate">{config.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {Object.keys(groupedNodes).length === 0 && (
          <div className="text-center py-8 text-[var(--linear-text-muted)] text-sm">
            No nodes found
          </div>
        )}
      </div>
    </div>
  );
});

NodePalette.displayName = 'NodePalette';

// ============================================================================
// Quick Stats Component
// ============================================================================

interface QuickStatsProps {
  totalWorkflows: number;
  activeWorkflows: number;
  executionsToday: number;
}

const QuickStats = memo<QuickStatsProps>(({ totalWorkflows, activeWorkflows, executionsToday }) => (
  <div className="grid grid-cols-3 gap-2 p-3 bg-[var(--linear-surface-1)] rounded-lg">
    <div className="text-center">
      <div className="text-lg font-semibold text-[var(--linear-text-primary)]">{totalWorkflows}</div>
      <div className="text-xs text-[var(--linear-text-muted)]">Workflows</div>
    </div>
    <div className="text-center border-l border-r border-[var(--linear-border-subtle)]">
      <div className="text-lg font-semibold text-[var(--linear-accent-green)]">{activeWorkflows}</div>
      <div className="text-xs text-[var(--linear-text-muted)]">Active</div>
    </div>
    <div className="text-center">
      <div className="text-lg font-semibold text-[var(--linear-accent-blue)]">{executionsToday}</div>
      <div className="text-xs text-[var(--linear-text-muted)]">Today</div>
    </div>
  </div>
));

QuickStats.displayName = 'QuickStats';

// ============================================================================
// Main Component
// ============================================================================

export const UnifiedSidebar: React.FC<UnifiedSidebarProps> = memo(
  ({
    isExpanded: isExpandedProp = true,
    onExpandedChange,
    activeSection = 'workflows',
    onSectionChange,
    showNodePalette = false,
    className = '',
  }) => {
    const navigate = useNavigate();
    const { darkMode } = useWorkflowStore();

    // Use local state if no prop provided
    const [localExpanded, setLocalExpanded] = useState(() => {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('sidebar-expanded');
        return stored !== null ? stored === 'true' : true;
      }
      return true;
    });

    const isExpanded = onExpandedChange ? isExpandedProp : localExpanded;
    const setIsExpanded = onExpandedChange || ((expanded: boolean) => {
      setLocalExpanded(expanded);
      localStorage.setItem('sidebar-expanded', String(expanded));
    });

    // Keyboard shortcut for toggle
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
          e.preventDefault();
          setIsExpanded(!isExpanded);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isExpanded, setIsExpanded]);

    // Editor mode: in-flow sidebar with just the node palette
    if (showNodePalette) {
      return (
        <aside
          className={`
            relative h-full flex-shrink-0
            flex flex-col
            bg-[var(--linear-bg-secondary)]
            border-r border-[var(--linear-border-subtle)]
            transition-all duration-300 ease-out
            ${isExpanded ? 'w-64' : 'w-16'}
            ${className}
          `}
        >
          {/* Toggle Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="
              absolute -right-3 top-3 z-10
              w-6 h-6 rounded-full
              bg-[var(--linear-bg-elevated)]
              border border-[var(--linear-border-default)]
              shadow-md
              flex items-center justify-center
              hover:bg-[var(--linear-surface-hover)]
              transition-colors duration-200
            "
            title={isExpanded ? 'Collapse sidebar (⌘B)' : 'Expand sidebar (⌘B)'}
          >
            {isExpanded ? (
              <ChevronLeft className="w-4 h-4 text-[var(--linear-text-muted)]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[var(--linear-text-muted)]" />
            )}
          </button>

          {/* Section header */}
          {isExpanded && (
            <div className="px-3 pt-3 pb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--linear-text-muted)]">
                Nodes
              </h3>
            </div>
          )}

          {/* Node Palette */}
          <NodePalette isExpanded={isExpanded} />
        </aside>
      );
    }

    // Dashboard mode: fixed sidebar with full navigation
    return (
      <aside
        className={`
          fixed left-0 top-0 h-full
          flex flex-col
          bg-[var(--linear-bg-secondary)]
          border-r border-[var(--linear-border-subtle)]
          transition-all duration-300 ease-out
          ${zClass.sidebar}
          ${isExpanded ? 'w-64' : 'w-16'}
          ${className}
        `}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="
            absolute -right-3 top-6 z-10
            w-6 h-6 rounded-full
            bg-[var(--linear-bg-elevated)]
            border border-[var(--linear-border-default)]
            shadow-md
            flex items-center justify-center
            hover:bg-[var(--linear-surface-hover)]
            transition-colors duration-200
          "
          title={isExpanded ? 'Collapse sidebar (⌘B)' : 'Expand sidebar (⌘B)'}
        >
          {isExpanded ? (
            <ChevronLeft className="w-4 h-4 text-[var(--linear-text-muted)]" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[var(--linear-text-muted)]" />
          )}
        </button>

        {/* Logo/Brand Area */}
        <div
          className={`flex items-center gap-3 p-4 border-b border-[var(--linear-border-subtle)] ${
            isExpanded ? '' : 'justify-center'
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--linear-accent-purple)] to-purple-600 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          {isExpanded && (
            <span className="font-semibold text-[var(--linear-text-primary)]">Workflow</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 p-2">
          <NavItem
            icon={<Home className="w-5 h-5" />}
            label="Home"
            isExpanded={isExpanded}
            isActive={activeSection === 'home'}
            onClick={() => {
              onSectionChange?.('home');
              navigate('/dashboard');
            }}
          />
          <NavItem
            icon={<Workflow className="w-5 h-5" />}
            label="Workflows"
            isExpanded={isExpanded}
            isActive={activeSection === 'workflows'}
            onClick={() => {
              onSectionChange?.('workflows');
              navigate('/workflows');
            }}
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
        <div className="mx-4 my-2 border-t border-[var(--linear-border-subtle)]" />

        {/* Quick Stats (when expanded) */}
        {isExpanded && (
          <div className="px-3 mb-3">
            <QuickStats totalWorkflows={12} activeWorkflows={8} executionsToday={42} />
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="mt-auto border-t border-[var(--linear-border-subtle)] p-2">
          <NavItem
            icon={<HelpCircle className="w-5 h-5" />}
            label="Help & Support"
            isExpanded={isExpanded}
            onClick={() => window.open('/docs', '_blank')}
          />
          <NavItem
            icon={<Settings className="w-5 h-5" />}
            label="Settings"
            isExpanded={isExpanded}
            isActive={activeSection === 'settings'}
            onClick={() => {
              onSectionChange?.('settings');
              navigate('/settings');
            }}
          />
        </div>
      </aside>
    );
  }
);

UnifiedSidebar.displayName = 'UnifiedSidebar';

export default UnifiedSidebar;
