/**
 * Linear-Style Header Component
 * Modern, minimalist header inspired by Linear, Vercel, Raycast
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search, Bell, Settings, Moon, Sun, ChevronDown,
  Zap, Play, Command, Plus, User, LogOut, HelpCircle,
  Keyboard, MessageSquare, ExternalLink
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import { useToast } from '../ui/Toast';
import { logger } from '../../services/SimpleLogger';

// ============================================================================
// Types
// ============================================================================

interface HeaderProps {
  onExecute?: () => void;
  onOpenCommandPalette?: () => void;
}

// ============================================================================
// Breadcrumb Component
// ============================================================================

const Breadcrumb: React.FC = () => {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  const formatSegment = (segment: string) => {
    return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-[var(--linear-text-tertiary)]">Workflow</span>
      {pathSegments.map((segment, index) => (
        <React.Fragment key={segment}>
          <span className="text-[var(--linear-text-muted)]">/</span>
          <span className={index === pathSegments.length - 1
            ? 'text-[var(--linear-text-primary)] font-medium'
            : 'text-[var(--linear-text-tertiary)]'
          }>
            {formatSegment(segment)}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
};

// ============================================================================
// Search Button Component
// ============================================================================

const SearchButton: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="
        flex items-center gap-3 px-3 py-2
        bg-[var(--linear-surface-1)] hover:bg-[var(--linear-surface-2)]
        border border-[var(--linear-border-subtle)] hover:border-[var(--linear-border-default)]
        rounded-lg transition-all duration-150
        min-w-[240px] text-left
      "
    >
      <Search className="w-4 h-4 text-[var(--linear-text-muted)]" />
      <span className="flex-1 text-sm text-[var(--linear-text-tertiary)]">
        Search...
      </span>
      <div className="flex items-center gap-1">
        <kbd className="px-1.5 py-0.5 text-[10px] font-medium bg-[var(--linear-surface-2)] text-[var(--linear-text-muted)] rounded">
          <Command className="w-3 h-3 inline" />
        </kbd>
        <kbd className="px-1.5 py-0.5 text-[10px] font-medium bg-[var(--linear-surface-2)] text-[var(--linear-text-muted)] rounded">
          K
        </kbd>
      </div>
    </button>
  );
};

// ============================================================================
// Icon Button Component
// ============================================================================

const IconButton: React.FC<{
  icon: React.ReactNode;
  onClick?: () => void;
  badge?: number;
  active?: boolean;
  tooltip?: string;
}> = ({ icon, onClick, badge, active, tooltip }) => {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={`
        relative flex items-center justify-center w-8 h-8
        rounded-lg transition-all duration-150
        ${active
          ? 'bg-[var(--linear-surface-2)] text-[var(--linear-text-primary)]'
          : 'text-[var(--linear-text-secondary)] hover:text-[var(--linear-text-primary)] hover:bg-[var(--linear-surface-hover)]'
        }
      `}
    >
      {icon}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center text-[10px] font-medium bg-[var(--linear-accent-red)] text-white rounded-full">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
};

// ============================================================================
// User Menu Component
// ============================================================================

const UserMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  // Sign out handler - clears auth state and redirects to login
  const handleSignOut = useCallback(async () => {
    try {
      // Clear local storage/session
      localStorage.removeItem('auth_token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      sessionStorage.clear();

      // Call logout API endpoint
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });

      // Redirect to login page
      window.location.href = '/login';
    } catch (error) {
      logger.error('Sign out failed', { error });
      // Still redirect even if API call fails
      window.location.href = '/login';
    }
  }, []);

  // Keyboard shortcuts handler - shows modal with common shortcuts
  const handleKeyboardShortcuts = useCallback(() => {
    const shortcuts = [
      { key: 'Ctrl+S', action: 'Save workflow' },
      { key: 'Ctrl+Z', action: 'Undo' },
      { key: 'Ctrl+Shift+Z', action: 'Redo' },
      { key: 'Delete', action: 'Delete selected' },
      { key: 'Ctrl+D', action: 'Duplicate' },
      { key: '+/-', action: 'Zoom in/out' },
      { key: 'Ctrl+K', action: 'Open command palette' },
      { key: 'Ctrl+A', action: 'Select all' },
      { key: 'Escape', action: 'Deselect / Close modal' },
    ];
    toast.info('Keyboard shortcuts: Ctrl+S (Save), Ctrl+Z (Undo), Ctrl+K (Command palette), +/- (Zoom)');
  }, []);

  // Help handler - opens help/documentation page
  const handleHelp = useCallback(() => {
    window.open('/docs', '_blank');
  }, []);

  // Feedback handler - opens feedback form or issue tracker
  const handleFeedback = useCallback(() => {
    window.open('https://github.com/anthropics/claude-code/issues', '_blank');
  }, []);

  const menuItems = [
    { icon: <User className="w-4 h-4" />, label: 'Profile', action: () => navigate('/settings') },
    { icon: <Settings className="w-4 h-4" />, label: 'Settings', action: () => navigate('/settings') },
    { icon: <Keyboard className="w-4 h-4" />, label: 'Keyboard shortcuts', action: handleKeyboardShortcuts, shortcut: '?' },
    { icon: <HelpCircle className="w-4 h-4" />, label: 'Help & Support', action: handleHelp },
    { type: 'divider' },
    { icon: <ExternalLink className="w-4 h-4" />, label: 'Documentation', action: () => navigate('/documentation') },
    { icon: <MessageSquare className="w-4 h-4" />, label: 'Feedback', action: handleFeedback },
    { type: 'divider' },
    { icon: <LogOut className="w-4 h-4" />, label: 'Sign out', action: handleSignOut, danger: true },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          flex items-center gap-2 p-1.5 rounded-lg
          hover:bg-[var(--linear-surface-hover)] transition-colors duration-150
        "
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <span className="text-xs font-semibold text-white">U</span>
        </div>
        <ChevronDown className={`w-3 h-3 text-[var(--linear-text-muted)] transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="
            absolute right-0 top-full mt-2 w-56 py-1.5 z-50
            bg-[var(--linear-bg-elevated)] border border-[var(--linear-border-default)]
            rounded-xl shadow-xl
            animate-[linear-scale-in_0.15s_ease-out]
          ">
            {menuItems.map((item, index) => (
              item.type === 'divider' ? (
                <div key={index} className="h-px bg-[var(--linear-border-subtle)] my-1.5" />
              ) : (
                <button
                  key={index}
                  onClick={() => {
                    item.action?.();
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 text-sm
                    transition-colors duration-100
                    ${item.danger
                      ? 'text-[var(--linear-accent-red)] hover:bg-red-500/10'
                      : 'text-[var(--linear-text-secondary)] hover:text-[var(--linear-text-primary)] hover:bg-[var(--linear-surface-hover)]'
                    }
                  `}
                >
                  {item.icon}
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.shortcut && (
                    <kbd className="px-1.5 py-0.5 text-[10px] bg-[var(--linear-surface-2)] text-[var(--linear-text-muted)] rounded">
                      {item.shortcut}
                    </kbd>
                  )}
                </button>
              )
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ============================================================================
// Main Header Component
// ============================================================================

export const LinearHeader: React.FC<HeaderProps> = ({
  onExecute,
  onOpenCommandPalette,
}) => {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode, isExecuting } = useWorkflowStore();
  const [notifications] = useState(3);

  // Keyboard shortcut for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenCommandPalette?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenCommandPalette]);

  const handleToggleDarkMode = useCallback(() => {
    toggleDarkMode();
  }, [toggleDarkMode]);

  return (
    <header className="
      h-14 px-4 flex items-center justify-between
      bg-[var(--linear-bg-secondary)] border-b border-[var(--linear-border-subtle)]
      sticky top-0 z-50
    ">
      {/* Left section */}
      <div className="flex items-center gap-4">
        {/* Logo */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-[var(--linear-text-primary)] hidden sm:block">
            Workflow
          </span>
        </button>

        {/* Breadcrumb */}
        <div className="hidden md:block">
          <Breadcrumb />
        </div>
      </div>

      {/* Center section - Search */}
      <div className="hidden lg:block">
        <SearchButton onClick={onOpenCommandPalette} />
      </div>

      {/* Right section */}
      <div className="flex items-center gap-1">
        {/* New workflow button */}
        <button
          onClick={() => navigate('/workflows')}
          className="
            hidden sm:flex items-center gap-2 px-3 py-1.5 mr-2
            bg-[var(--linear-accent-purple)] hover:bg-[var(--linear-accent-purple)]/90
            text-white text-sm font-medium rounded-lg
            transition-all duration-150 hover:shadow-lg hover:shadow-purple-500/25
          "
        >
          <Plus className="w-4 h-4" />
          <span>New</span>
        </button>

        {/* Execute button */}
        {onExecute && (
          <button
            onClick={onExecute}
            disabled={isExecuting}
            className="
              hidden sm:flex items-center gap-2 px-3 py-1.5 mr-2
              bg-[var(--linear-accent-green)] hover:bg-[var(--linear-accent-green)]/90
              disabled:opacity-50 disabled:cursor-not-allowed
              text-white text-sm font-medium rounded-lg
              transition-all duration-150
            "
          >
            {isExecuting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Running</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Run</span>
              </>
            )}
          </button>
        )}

        {/* Search button (mobile) */}
        <div className="lg:hidden">
          <IconButton
            icon={<Search className="w-4 h-4" />}
            onClick={onOpenCommandPalette}
            tooltip="Search (⌘K)"
          />
        </div>

        {/* Notifications */}
        <IconButton
          icon={<Bell className="w-4 h-4" />}
          badge={notifications}
          tooltip="Notifications"
        />

        {/* Dark mode toggle */}
        <IconButton
          icon={darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          onClick={handleToggleDarkMode}
          tooltip={darkMode ? 'Light mode' : 'Dark mode'}
        />

        {/* Divider */}
        <div className="w-px h-5 bg-[var(--linear-border-subtle)] mx-2" />

        {/* User menu */}
        <UserMenu />
      </div>
    </header>
  );
};

export default LinearHeader;
