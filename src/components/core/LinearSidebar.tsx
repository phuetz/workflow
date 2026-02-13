/**
 * Linear-Style Sidebar Navigation
 * Modern, collapsible sidebar inspired by Linear, Notion, Raycast
 */

import React, { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, GitBranch, Play, Settings, Puzzle,
  ChevronRight, ChevronLeft, FolderOpen, Clock, Star,
  Zap, Database, Globe, Shield, Users, BarChart3,
  FileText, BookOpen, HelpCircle, Sparkles, Box,
  Layers, Activity, Terminal, Workflow, Plus
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';

// ============================================================================
// Types
// ============================================================================

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  badge?: number | string;
  children?: NavItem[];
  isNew?: boolean;
}

interface NavSectionProps {
  title?: string;
  items: NavItem[];
  collapsed: boolean;
  onNavigate: (path: string) => void;
  currentPath: string;
}

// ============================================================================
// Navigation Data
// ============================================================================

const navigationItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="w-4 h-4" />,
    path: '/dashboard',
  },
  {
    id: 'workflows',
    label: 'Workflows',
    icon: <Workflow className="w-4 h-4" />,
    path: '/workflows',
    children: [
      { id: 'all-workflows', label: 'All Workflows', icon: <Layers className="w-4 h-4" />, path: '/workflows' },
      { id: 'recent', label: 'Recent', icon: <Clock className="w-4 h-4" />, path: '/workflows?filter=recent' },
      { id: 'starred', label: 'Starred', icon: <Star className="w-4 h-4" />, path: '/workflows?filter=starred' },
      { id: 'templates', label: 'Templates', icon: <FileText className="w-4 h-4" />, path: '/templates' },
    ],
  },
  {
    id: 'executions',
    label: 'Executions',
    icon: <Play className="w-4 h-4" />,
    path: '/executions',
  },
];

const resourceItems: NavItem[] = [
  {
    id: 'connections',
    label: 'Connections',
    icon: <Database className="w-4 h-4" />,
    path: '/connections',
  },
  {
    id: 'credentials',
    label: 'Credentials',
    icon: <Shield className="w-4 h-4" />,
    path: '/credentials',
  },
  {
    id: 'webhooks',
    label: 'Webhooks',
    icon: <Globe className="w-4 h-4" />,
    path: '/webhooks',
  },
  {
    id: 'variables',
    label: 'Variables',
    icon: <Box className="w-4 h-4" />,
    path: '/variables',
  },
];

const advancedItems: NavItem[] = [
  {
    id: 'ai-copilot',
    label: 'AI Copilot',
    icon: <Sparkles className="w-4 h-4" />,
    path: '/ai',
    isNew: true,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: <BarChart3 className="w-4 h-4" />,
    path: '/analytics',
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    icon: <Puzzle className="w-4 h-4" />,
    path: '/marketplace',
  },
  {
    id: 'team',
    label: 'Team',
    icon: <Users className="w-4 h-4" />,
    path: '/team',
  },
];

const bottomItems: NavItem[] = [
  {
    id: 'documentation',
    label: 'Documentation',
    icon: <BookOpen className="w-4 h-4" />,
    path: '/documentation',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <Settings className="w-4 h-4" />,
    path: '/settings',
  },
];

// ============================================================================
// NavItem Component
// ============================================================================

const NavItemComponent: React.FC<{
  item: NavItem;
  collapsed: boolean;
  currentPath: string;
  onNavigate: (path: string) => void;
  depth?: number;
}> = ({ item, collapsed, currentPath, onNavigate, depth = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isActive = item.path === currentPath || currentPath.startsWith(item.path + '/');
  const hasChildren = item.children && item.children.length > 0;

  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    } else if (item.path) {
      onNavigate(item.path);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={`
          w-full flex items-center gap-3 px-3 py-2 rounded-lg
          transition-all duration-150 group relative
          ${depth > 0 ? 'ml-4' : ''}
          ${isActive
            ? 'bg-[var(--linear-surface-active)] text-[var(--linear-text-primary)]'
            : 'text-[var(--linear-text-secondary)] hover:text-[var(--linear-text-primary)] hover:bg-[var(--linear-surface-hover)]'
          }
        `}
        title={collapsed ? item.label : undefined}
      >
        {/* Icon */}
        <span className={`flex-shrink-0 ${isActive ? 'text-[var(--linear-accent-purple)]' : ''}`}>
          {item.icon}
        </span>

        {/* Label */}
        {!collapsed && (
          <>
            <span className="flex-1 text-left text-sm font-medium truncate">
              {item.label}
            </span>

            {/* Badge */}
            {item.badge && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-[var(--linear-surface-2)] text-[var(--linear-text-muted)] rounded">
                {item.badge}
              </span>
            )}

            {/* New tag */}
            {item.isNew && (
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-[var(--linear-accent-purple)] text-white rounded">
                NEW
              </span>
            )}

            {/* Expand indicator */}
            {hasChildren && (
              <ChevronRight
                className={`w-3.5 h-3.5 text-[var(--linear-text-muted)] transition-transform duration-150 ${
                  isExpanded ? 'rotate-90' : ''
                }`}
              />
            )}
          </>
        )}

        {/* Active indicator */}
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[var(--linear-accent-purple)] rounded-r" />
        )}
      </button>

      {/* Children */}
      {hasChildren && isExpanded && !collapsed && (
        <div className="mt-1 space-y-0.5">
          {item.children!.map((child) => (
            <NavItemComponent
              key={child.id}
              item={child}
              collapsed={collapsed}
              currentPath={currentPath}
              onNavigate={onNavigate}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// NavSection Component
// ============================================================================

const NavSection: React.FC<NavSectionProps> = ({
  title,
  items,
  collapsed,
  onNavigate,
  currentPath,
}) => {
  return (
    <div className="mb-4">
      {title && !collapsed && (
        <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--linear-text-muted)]">
          {title}
        </div>
      )}
      <div className="space-y-0.5">
        {items.map((item) => (
          <NavItemComponent
            key={item.id}
            item={item}
            collapsed={collapsed}
            currentPath={currentPath}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// Workspace Selector Component
// ============================================================================

const WorkspaceSelector: React.FC<{ collapsed: boolean }> = ({ collapsed }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (collapsed) {
    return (
      <button className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
        <Zap className="w-5 h-5 text-white" />
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--linear-surface-hover)] transition-colors duration-150"
      >
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 text-left">
          <div className="text-sm font-semibold text-[var(--linear-text-primary)]">Workflow</div>
          <div className="text-[11px] text-[var(--linear-text-muted)]">Personal workspace</div>
        </div>
        <ChevronRight className={`w-4 h-4 text-[var(--linear-text-muted)] transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-2 py-1.5 bg-[var(--linear-bg-elevated)] border border-[var(--linear-border-default)] rounded-xl shadow-xl z-50 animate-[linear-scale-in_0.15s_ease-out]">
            <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--linear-text-muted)]">
              Workspaces
            </div>
            <button className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[var(--linear-surface-hover)] transition-colors">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm text-[var(--linear-text-primary)]">Personal</span>
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--linear-accent-green)]" />
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[var(--linear-surface-hover)] transition-colors">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm text-[var(--linear-text-secondary)]">Team workspace</span>
            </button>
            <div className="h-px bg-[var(--linear-border-subtle)] my-1.5" />
            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--linear-text-secondary)] hover:text-[var(--linear-text-primary)] hover:bg-[var(--linear-surface-hover)] transition-colors">
              <Plus className="w-4 h-4" />
              <span>Create workspace</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ============================================================================
// Quick Create Button
// ============================================================================

const QuickCreateButton: React.FC<{ collapsed: boolean; onClick?: () => void }> = ({ collapsed, onClick }) => {
  if (collapsed) {
    return (
      <button
        onClick={onClick}
        className="w-10 h-10 flex items-center justify-center rounded-lg bg-[var(--linear-accent-purple)] hover:bg-[var(--linear-accent-purple)]/90 text-white transition-colors"
        title="New Workflow"
      >
        <Plus className="w-5 h-5" />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[var(--linear-accent-purple)] hover:bg-[var(--linear-accent-purple)]/90 text-white font-medium text-sm transition-all duration-150 hover:shadow-lg hover:shadow-purple-500/25"
    >
      <Plus className="w-4 h-4" />
      <span>New Workflow</span>
    </button>
  );
};

// ============================================================================
// Main Sidebar Component
// ============================================================================

export const LinearSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { workflows } = useWorkflowStore();
  const [collapsed, setCollapsed] = useState(false);

  const handleNavigate = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  const handleNewWorkflow = useCallback(() => {
    navigate('/workflows/new');
  }, [navigate]);

  return (
    <aside
      className={`
        flex flex-col h-full
        bg-[var(--linear-bg-secondary)] border-r border-[var(--linear-border-subtle)]
        transition-all duration-300 ease-out
        ${collapsed ? 'w-16' : 'w-60'}
      `}
    >
      {/* Header */}
      <div className={`p-3 ${collapsed ? 'flex justify-center' : ''}`}>
        <WorkspaceSelector collapsed={collapsed} />
      </div>

      {/* Quick Create */}
      <div className={`px-3 mb-4 ${collapsed ? 'flex justify-center' : ''}`}>
        <QuickCreateButton collapsed={collapsed} onClick={handleNewWorkflow} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-thin">
        <NavSection
          items={navigationItems}
          collapsed={collapsed}
          onNavigate={handleNavigate}
          currentPath={location.pathname}
        />

        <NavSection
          title="Resources"
          items={resourceItems}
          collapsed={collapsed}
          onNavigate={handleNavigate}
          currentPath={location.pathname}
        />

        <NavSection
          title="Advanced"
          items={advancedItems}
          collapsed={collapsed}
          onNavigate={handleNavigate}
          currentPath={location.pathname}
        />
      </nav>

      {/* Bottom Section */}
      <div className="px-2 pb-2 border-t border-[var(--linear-border-subtle)]">
        <div className="pt-2">
          <NavSection
            items={bottomItems}
            collapsed={collapsed}
            onNavigate={handleNavigate}
            currentPath={location.pathname}
          />
        </div>

        {/* Collapse Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 p-2 mt-2 rounded-lg text-[var(--linear-text-muted)] hover:text-[var(--linear-text-secondary)] hover:bg-[var(--linear-surface-hover)] transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};

export default LinearSidebar;
