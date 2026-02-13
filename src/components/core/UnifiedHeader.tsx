/**
 * UnifiedHeader
 *
 * Consolidated header component using Linear design system.
 * Replaces Header.tsx, LinearHeader.tsx, and ModernHeader.tsx.
 *
 * Features:
 * - Automatic dark mode via CSS variables
 * - Variants: default, editor, minimal
 * - ReactFlow integration for workflow editor
 * - Command palette integration (Ctrl+K)
 */

import React, { useState, useCallback, useEffect, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  Bell,
  Moon,
  Sun,
  ChevronDown,
  Zap,
  Play,
  Command,
  Plus,
  User,
  LogOut,
  HelpCircle,
  Keyboard,
  MessageSquare,
  ExternalLink,
  Settings,
  Save,
  Bug,
  Check,
  X,
  Edit2,
  Download,
  Upload,
  MoreVertical,
  Lock,
  Unlock,
  Circle,
  Undo2,
  Redo2,
  Power,
  CheckCircle2,
  XCircle,
  Loader2,
  Square,
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import { usePanels } from '../workflow/editor/context';
import { zClass } from '../../styles/z-index';

// ============================================================================
// Types
// ============================================================================

export type HeaderVariant = 'default' | 'editor' | 'minimal';

export interface UnifiedHeaderProps {
  /** Header variant */
  variant?: HeaderVariant;
  /** Execute workflow callback (editor mode) */
  onExecute?: () => void;
  /** Save workflow callback (editor mode) */
  onSave?: () => void;
  /** Open debug panel callback (editor mode) */
  onDebug?: () => void;
  /** Export workflow callback (editor mode) */
  onExport?: () => void;
  /** Import workflow callback (editor mode) */
  onImport?: (file: File) => Promise<void>;
  /** Is workflow executing */
  isExecuting?: boolean;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Sub-components
// ============================================================================

const Logo = memo(() => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/dashboard')}
      className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
    >
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--linear-accent-purple)] to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
        <Zap className="w-4 h-4 text-white" />
      </div>
      <span className="font-semibold text-[var(--linear-text-primary)] hidden sm:block">
        Workflow
      </span>
    </button>
  );
});

Logo.displayName = 'Logo';

const Breadcrumb = memo(() => {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  const formatSegment = (segment: string) =>
    segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-[var(--linear-text-tertiary)]">Workflow</span>
      {pathSegments.map((segment, index) => (
        <React.Fragment key={segment}>
          <span className="text-[var(--linear-text-muted)]">/</span>
          <span
            className={
              index === pathSegments.length - 1
                ? 'text-[var(--linear-text-primary)] font-medium'
                : 'text-[var(--linear-text-tertiary)]'
            }
          >
            {formatSegment(segment)}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
});

Breadcrumb.displayName = 'Breadcrumb';

const SearchButton = memo<{ onClick?: () => void }>(({ onClick }) => (
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
));

SearchButton.displayName = 'SearchButton';

interface IconButtonProps {
  icon: React.ReactNode;
  onClick?: () => void;
  badge?: number;
  active?: boolean;
  tooltip?: string;
}

const IconButton = memo<IconButtonProps>(
  ({ icon, onClick, badge, active, tooltip }) => (
    <button
      onClick={onClick}
      title={tooltip}
      className={`
        relative flex items-center justify-center w-8 h-8
        rounded-lg transition-all duration-150
        ${
          active
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
  )
);

IconButton.displayName = 'IconButton';

interface UserMenuProps {
  onSignOut?: () => void;
}

const UserMenu = memo<UserMenuProps>(({ onSignOut }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = useCallback(async () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    sessionStorage.clear();

    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // Continue even if logout API fails
    }

    window.location.href = '/login';
  }, []);

  const menuItems = [
    { icon: <User className="w-4 h-4" />, label: 'Profile', action: () => navigate('/settings') },
    { icon: <Settings className="w-4 h-4" />, label: 'Settings', action: () => navigate('/settings') },
    { icon: <Keyboard className="w-4 h-4" />, label: 'Shortcuts', shortcut: '?' },
    { icon: <HelpCircle className="w-4 h-4" />, label: 'Help', action: () => window.open('/docs', '_blank') },
    { type: 'divider' as const },
    { icon: <ExternalLink className="w-4 h-4" />, label: 'Documentation', action: () => navigate('/documentation') },
    { icon: <MessageSquare className="w-4 h-4" />, label: 'Feedback', action: () => window.open('https://github.com/anthropics/claude-code/issues', '_blank') },
    { type: 'divider' as const },
    { icon: <LogOut className="w-4 h-4" />, label: 'Sign out', action: onSignOut || handleSignOut, danger: true },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[var(--linear-surface-hover)] transition-colors duration-150"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <span className="text-xs font-semibold text-white">U</span>
        </div>
        <ChevronDown
          className={`w-3 h-3 text-[var(--linear-text-muted)] transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-dropdown" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-56 py-1.5 z-context-menu bg-[var(--linear-bg-elevated)] border border-[var(--linear-border-default)] rounded-xl shadow-xl animate-scale-in">
            {menuItems.map((item, index) =>
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
                    ${
                      item.danger
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
            )}
          </div>
        </>
      )}
    </div>
  );
});

UserMenu.displayName = 'UserMenu';

// ============================================================================
// Editor Sub-components
// ============================================================================

const WorkflowNameEditor = memo(() => {
  const { workflowName, setWorkflowName, isSaved } = useWorkflowStore();
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(workflowName);

  const handleSubmit = useCallback(() => {
    setWorkflowName(tempName);
    setIsEditing(false);
  }, [tempName, setWorkflowName]);

  const handleCancel = useCallback(() => {
    setTempName(workflowName);
    setIsEditing(false);
  }, [workflowName]);

  if (isEditing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={tempName}
          onChange={(e) => setTempName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') handleCancel();
          }}
          className="px-2 py-0.5 text-sm font-semibold bg-transparent border-b-2 border-[var(--linear-accent-purple)] focus:outline-none text-[var(--linear-text-primary)] w-48"
          autoFocus
        />
        <button onClick={handleSubmit} className="text-[var(--linear-accent-green)] hover:opacity-80 p-0.5">
          <Check className="w-3.5 h-3.5" />
        </button>
        <button onClick={handleCancel} className="text-[var(--linear-accent-red)] hover:opacity-80 p-0.5">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setIsEditing(true)}
        className="flex items-center gap-1.5 hover:bg-[var(--linear-surface-hover)] px-2 py-0.5 rounded transition-colors"
      >
        <span className="text-sm font-semibold text-[var(--linear-text-primary)] max-w-[200px] truncate">
          {workflowName}
        </span>
        <Edit2 className="w-3 h-3 text-[var(--linear-text-muted)]" />
      </button>
      <span className="flex items-center gap-1 text-xs text-[var(--linear-text-muted)]">
        {isSaved ? (
          <>
            <Check className="w-3 h-3 text-[var(--linear-accent-green)]" />
            <span>Saved</span>
          </>
        ) : (
          <>
            <Circle className="w-2.5 h-2.5 fill-current text-orange-400" />
            <span>Unsaved</span>
          </>
        )}
      </span>
    </div>
  );
});

WorkflowNameEditor.displayName = 'WorkflowNameEditor';

/**
 * WorkflowTags - n8n-style tag pills displayed next to workflow name
 */
const WorkflowTags = memo(() => {
  const store = useWorkflowStore();
  const tags = ((store as Record<string, unknown>).workflowTags as string[]) || [];
  const [showAdd, setShowAdd] = useState(false);
  const [newTag, setNewTag] = useState('');

  const setWorkflowTags = (store as Record<string, unknown>).setWorkflowTags as ((tags: string[]) => void) | undefined;

  const handleAddTag = useCallback(() => {
    const trimmed = newTag.trim();
    if (trimmed && !tags.includes(trimmed) && setWorkflowTags) {
      setWorkflowTags([...tags, trimmed]);
    }
    setNewTag('');
    setShowAdd(false);
  }, [newTag, tags, setWorkflowTags]);

  const handleRemoveTag = useCallback((tag: string) => {
    if (setWorkflowTags) {
      setWorkflowTags(tags.filter(t => t !== tag));
    }
  }, [tags, setWorkflowTags]);

  const tagColors = ['bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700', 'bg-green-100 text-green-700', 'bg-amber-100 text-amber-700', 'bg-pink-100 text-pink-700'];

  return (
    <div className="flex items-center gap-1 ml-1">
      {tags.slice(0, 3).map((tag, i) => (
        <span
          key={tag}
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${tagColors[i % tagColors.length]} cursor-pointer hover:opacity-80`}
          onClick={() => handleRemoveTag(tag)}
          title={`Click to remove "${tag}"`}
        >
          {tag}
        </span>
      ))}
      {tags.length > 3 && (
        <span className="text-[10px] text-[var(--linear-text-muted)]">+{tags.length - 3}</span>
      )}
      {showAdd ? (
        <input
          type="text"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddTag();
            if (e.key === 'Escape') setShowAdd(false);
          }}
          onBlur={handleAddTag}
          placeholder="tag"
          className="w-16 px-1.5 py-0.5 text-[10px] rounded border border-gray-300 focus:outline-none focus:border-[var(--n8n-color-primary,#ff6d5a)]"
          autoFocus
        />
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="text-[10px] text-[var(--linear-text-muted)] hover:text-[var(--linear-text-secondary)] px-1"
          title="Add tag"
        >
          + tag
        </button>
      )}
    </div>
  );
});
WorkflowTags.displayName = 'WorkflowTags';

interface EditorOverflowMenuProps {
  onExport?: () => void;
  onImport?: (file: File) => Promise<void>;
}

const EditorOverflowMenu = memo<EditorOverflowMenuProps>(({ onExport, onImport }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { isCurrentWorkflowLocked, setWorkflowLocked, currentWorkflowId } = useWorkflowStore();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
    setIsOpen(false);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImport) {
      onImport(file);
    }
  }, [onImport]);

  const handleToggleLock = useCallback(() => {
    setWorkflowLocked(currentWorkflowId, !isCurrentWorkflowLocked);
    setIsOpen(false);
  }, [setWorkflowLocked, currentWorkflowId, isCurrentWorkflowLocked]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--linear-text-secondary)] hover:text-[var(--linear-text-primary)] hover:bg-[var(--linear-surface-hover)] transition-all duration-150"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-dropdown" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-48 py-1.5 z-context-menu bg-[var(--linear-bg-elevated)] border border-[var(--linear-border-default)] rounded-xl shadow-xl animate-scale-in">
            {onExport && (
              <button
                onClick={() => { onExport(); setIsOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[var(--linear-text-secondary)] hover:text-[var(--linear-text-primary)] hover:bg-[var(--linear-surface-hover)] transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            )}
            {onImport && (
              <button
                onClick={handleImport}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[var(--linear-text-secondary)] hover:text-[var(--linear-text-primary)] hover:bg-[var(--linear-surface-hover)] transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>Import</span>
              </button>
            )}
            <div className="h-px bg-[var(--linear-border-subtle)] my-1.5" />
            <button
              onClick={handleToggleLock}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[var(--linear-text-secondary)] hover:text-[var(--linear-text-primary)] hover:bg-[var(--linear-surface-hover)] transition-colors"
            >
              {isCurrentWorkflowLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              <span>{isCurrentWorkflowLocked ? 'Unlock' : 'Lock'}</span>
            </button>
          </div>
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
});

EditorOverflowMenu.displayName = 'EditorOverflowMenu';

// ============================================================================
// Editor Actions (undo/redo, execution status, active toggle, save, debug, run)
// ============================================================================

interface EditorActionsProps {
  onSave?: () => void;
  onDebug?: () => void;
  onExecute?: () => void;
  onExport?: () => void;
  onImport?: (file: File) => Promise<void>;
  isExecuting: boolean;
}

const EditorActions = memo<EditorActionsProps>(({ onSave, onDebug, onExecute, onExport, onImport, isExecuting }) => {
  const store = useWorkflowStore();
  const { undo, redo, undoHistory, redoHistory, currentWorkflowId } = store;
  const canUndo = undoHistory && undoHistory.length > 0;
  const canRedo = redoHistory && redoHistory.length > 0;

  // Workflow active state - use store property if available, default to false
  const isWorkflowActive = (store as Record<string, unknown>).isWorkflowActive as boolean ?? false;
  const setWorkflowActive = (store as Record<string, unknown>).setWorkflowActive as ((id: string, active: boolean) => void) | undefined;

  // Execution status
  const lastExecutionStatus = (store as Record<string, unknown>).lastExecutionStatus as string | undefined;
  const execStatus = isExecuting ? 'running' : (lastExecutionStatus || 'idle');

  const statusConfig: Record<string, { icon: React.ReactNode; label: string; class: string }> = {
    idle: { icon: <Square className="w-3 h-3" />, label: 'Idle', class: 'n8n-exec-status idle' },
    running: { icon: <Loader2 className="w-3 h-3 animate-spin" />, label: 'Running', class: 'n8n-exec-status running' },
    success: { icon: <CheckCircle2 className="w-3 h-3" />, label: 'Success', class: 'n8n-exec-status success' },
    error: { icon: <XCircle className="w-3 h-3" />, label: 'Error', class: 'n8n-exec-status error' },
  };

  const currentStatus = statusConfig[execStatus] || statusConfig.idle;

  return (
    <>
      {/* Undo/Redo */}
      <div className="hidden sm:flex items-center gap-0.5 mr-1">
        <button
          onClick={() => canUndo && undo()}
          disabled={!canUndo}
          className="flex items-center justify-center w-7 h-7 rounded-md text-[var(--linear-text-secondary)] hover:text-[var(--linear-text-primary)] hover:bg-[var(--linear-surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => canRedo && redo()}
          disabled={!canRedo}
          className="flex items-center justify-center w-7 h-7 rounded-md text-[var(--linear-text-secondary)] hover:text-[var(--linear-text-primary)] hover:bg-[var(--linear-surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Separator */}
      <div className="w-px h-5 bg-[var(--linear-border-subtle)] mx-1 hidden sm:block" />

      {/* Execution Status Badge */}
      <div className={`hidden sm:flex ${currentStatus.class}`}>
        {currentStatus.icon}
        <span>{currentStatus.label}</span>
      </div>

      {/* Separator */}
      <div className="w-px h-5 bg-[var(--linear-border-subtle)] mx-1 hidden sm:block" />

      {/* Active/Inactive Toggle */}
      <button
        onClick={() => setWorkflowActive?.(currentWorkflowId, !isWorkflowActive)}
        className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 mr-1 rounded-lg text-xs font-medium transition-all duration-150 ${
          isWorkflowActive
            ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-[var(--linear-surface-2)] text-[var(--linear-text-muted)] hover:bg-[var(--linear-surface-hover)]'
        }`}
        title={isWorkflowActive ? 'Deactivate workflow' : 'Activate workflow'}
      >
        <Power className="w-3 h-3" />
        <span>{isWorkflowActive ? 'Active' : 'Inactive'}</span>
      </button>

      {/* Save button */}
      {onSave && (
        <button
          onClick={onSave}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 mr-1 bg-[var(--linear-surface-2)] hover:bg-[var(--linear-surface-hover)] text-[var(--linear-text-secondary)] text-sm font-medium rounded-lg transition-all duration-150"
        >
          <Save className="w-4 h-4" />
          <span>Save</span>
        </button>
      )}

      {/* Debug button */}
      {onDebug && (
        <button
          onClick={onDebug}
          className="hidden sm:flex items-center justify-center w-8 h-8 mr-1 bg-[var(--linear-surface-2)] hover:bg-[var(--linear-surface-hover)] text-[var(--linear-text-secondary)] rounded-lg transition-all duration-150"
          title="Debug"
        >
          <Bug className="w-4 h-4" />
        </button>
      )}

      {/* Execute button */}
      {onExecute && (
        <button
          onClick={onExecute}
          disabled={isExecuting}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 mr-1 bg-[var(--n8n-color-primary,#ff6d5a)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all duration-150"
        >
          {isExecuting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
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

      {/* Overflow menu (Export, Import, Lock) */}
      <EditorOverflowMenu onExport={onExport} onImport={onImport} />
    </>
  );
});

EditorActions.displayName = 'EditorActions';

// ============================================================================
// Main Component
// ============================================================================

export const UnifiedHeader: React.FC<UnifiedHeaderProps> = memo(
  ({ variant = 'default', onExecute, onSave, onDebug, onExport, onImport, isExecuting = false, className = '' }) => {
    const navigate = useNavigate();
    const { darkMode, toggleDarkMode } = useWorkflowStore();
    const [notifications] = useState(3);

    // Try to use panel context if available
    let openCommandPalette: (() => void) | undefined;
    try {
      const panels = usePanels();
      openCommandPalette = () => panels.openModal('commandBar');
    } catch {
      // Context not available, command palette won't work
    }

    // Apply dark class to document
    useEffect(() => {
      if (darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }, [darkMode]);

    // Keyboard shortcut for command palette
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          openCommandPalette?.();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [openCommandPalette]);

    const handleToggleDarkMode = useCallback(() => {
      toggleDarkMode();
    }, [toggleDarkMode]);

    return (
      <header
        className={`
          ${variant === 'editor' ? 'h-12' : 'h-14'} px-4 flex items-center justify-between
          bg-[var(--linear-bg-secondary)]
          border-b border-[var(--linear-border-subtle)]
          sticky top-0 ${zClass.header}
          ${className}
        `}
      >
        {/* Left section */}
        <div className="flex items-center gap-4">
          <Logo />
          {variant === 'editor' ? (
            <div className="hidden md:flex items-center gap-2">
              <WorkflowNameEditor />
              <WorkflowTags />
            </div>
          ) : variant === 'default' ? null : null}
        </div>

        {/* Center section - Search */}
        {variant !== 'minimal' && (
          <div className="hidden lg:block">
            <SearchButton onClick={openCommandPalette} />
          </div>
        )}

        {/* Right section */}
        <div className="flex items-center gap-1">
          {/* New workflow button */}
          {variant === 'default' && (
            <button
              onClick={() => navigate('/workflows')}
              className="
                hidden sm:flex items-center gap-2 px-3 py-1.5 mr-2
                bg-[var(--linear-accent-purple)] hover:opacity-90
                text-white text-sm font-medium rounded-lg
                transition-all duration-150 hover:shadow-lg hover:shadow-purple-500/25
              "
            >
              <Plus className="w-4 h-4" />
              <span>New</span>
            </button>
          )}

          {/* Editor actions */}
          {variant === 'editor' && (
            <EditorActions
              onSave={onSave}
              onDebug={onDebug}
              onExecute={onExecute}
              onExport={onExport}
              onImport={onImport}
              isExecuting={isExecuting}
            />
          )}

          {/* Search button (mobile) */}
          {variant !== 'minimal' && (
            <div className="lg:hidden">
              <IconButton
                icon={<Search className="w-4 h-4" />}
                onClick={openCommandPalette}
                tooltip="Search (⌘K)"
              />
            </div>
          )}

          {/* Notifications */}
          <IconButton icon={<Bell className="w-4 h-4" />} badge={notifications} tooltip="Notifications" />

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
  }
);

UnifiedHeader.displayName = 'UnifiedHeader';

export default UnifiedHeader;
