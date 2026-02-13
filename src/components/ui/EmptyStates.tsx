/**
 * Empty States Components
 * Modern empty state designs with guided actions (2025 UX best practices)
 */

import React from 'react';
import {
  Workflow, Plus, FileText, Search, Inbox, AlertCircle,
  Sparkles, Zap, Clock, Users, FolderOpen, Settings,
  ArrowRight, Play, Upload, Download, RefreshCw
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface EmptyStateAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actions?: EmptyStateAction[];
  illustration?: 'workflow' | 'search' | 'inbox' | 'error' | 'folder' | 'custom';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// ============================================================================
// Illustrations
// ============================================================================

const WorkflowIllustration: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Connection lines */}
    <path
      d="M45 70 L80 70 M120 70 L155 70 M45 70 C60 70 65 40 80 40 M45 70 C60 70 65 100 80 100"
      stroke="currentColor"
      strokeWidth="2"
      strokeDasharray="4 4"
      className="text-gray-300 dark:text-gray-600"
    />

    {/* Start node */}
    <rect x="15" y="55" width="30" height="30" rx="6" className="fill-primary-100 dark:fill-primary-900/30 stroke-primary-500" strokeWidth="2" />
    <circle cx="30" cy="70" r="6" className="fill-primary-500" />

    {/* Middle nodes */}
    <rect x="80" y="25" width="40" height="30" rx="6" className="fill-blue-100 dark:fill-blue-900/30 stroke-blue-500" strokeWidth="2" />
    <rect x="80" y="55" width="40" height="30" rx="6" className="fill-green-100 dark:fill-green-900/30 stroke-green-500" strokeWidth="2" />
    <rect x="80" y="85" width="40" height="30" rx="6" className="fill-amber-100 dark:fill-amber-900/30 stroke-amber-500" strokeWidth="2" />

    {/* End node */}
    <rect x="155" y="55" width="30" height="30" rx="6" className="fill-purple-100 dark:fill-purple-900/30 stroke-purple-500" strokeWidth="2" />
    <path d="M165 70 L175 70 M170 65 L170 75" stroke="currentColor" strokeWidth="2" className="text-purple-500" />

    {/* Decorative dots */}
    <circle cx="10" cy="30" r="3" className="fill-gray-200 dark:fill-gray-700" />
    <circle cx="190" cy="120" r="4" className="fill-gray-200 dark:fill-gray-700" />
    <circle cx="180" cy="20" r="2" className="fill-gray-200 dark:fill-gray-700" />
  </svg>
);

const SearchIllustration: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="30" className="stroke-gray-300 dark:stroke-gray-600" strokeWidth="4" />
    <line x1="72" y1="72" x2="100" y2="100" className="stroke-gray-300 dark:stroke-gray-600" strokeWidth="4" strokeLinecap="round" />
    <circle cx="50" cy="50" r="15" className="stroke-primary-300 dark:stroke-primary-700" strokeWidth="2" strokeDasharray="4 4" />
    <circle cx="50" cy="50" r="5" className="fill-primary-400" />
  </svg>
);

const InboxIllustration: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Box */}
    <path
      d="M10 35 L60 10 L110 35 L110 85 L10 85 Z"
      className="fill-gray-100 dark:fill-gray-800 stroke-gray-300 dark:stroke-gray-600"
      strokeWidth="2"
    />
    <path d="M10 35 L60 55 L110 35" className="stroke-gray-300 dark:stroke-gray-600" strokeWidth="2" />
    <path d="M60 55 L60 85" className="stroke-gray-200 dark:stroke-gray-700" strokeWidth="2" strokeDasharray="4 4" />

    {/* Sparkle */}
    <path d="M85 25 L88 20 L91 25 L96 22 L91 25 L88 30 L85 25 L80 22 Z" className="fill-primary-400" />
  </svg>
);

const ErrorIllustration: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="40" className="fill-red-50 dark:fill-red-900/20 stroke-red-300 dark:stroke-red-700" strokeWidth="2" />
    <path d="M50 30 L50 55" className="stroke-red-500" strokeWidth="4" strokeLinecap="round" />
    <circle cx="50" cy="68" r="3" className="fill-red-500" />
  </svg>
);

const FolderIllustration: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Folder back */}
    <path
      d="M10 30 L10 80 L110 80 L110 30 L55 30 L45 20 L10 20 Z"
      className="fill-amber-100 dark:fill-amber-900/30 stroke-amber-400" strokeWidth="2"
    />
    {/* Folder front */}
    <path
      d="M10 40 L110 40 L110 80 L10 80 Z"
      className="fill-amber-50 dark:fill-amber-900/20 stroke-amber-300 dark:stroke-amber-700" strokeWidth="2"
    />
    {/* Dashed lines */}
    <line x1="30" y1="55" x2="90" y2="55" className="stroke-amber-300 dark:stroke-amber-700" strokeWidth="2" strokeDasharray="4 4" />
    <line x1="30" y1="68" x2="70" y2="68" className="stroke-amber-200 dark:stroke-amber-800" strokeWidth="2" strokeDasharray="4 4" />
  </svg>
);

const illustrations = {
  workflow: WorkflowIllustration,
  search: SearchIllustration,
  inbox: InboxIllustration,
  error: ErrorIllustration,
  folder: FolderIllustration,
  custom: null,
};

// ============================================================================
// Main Empty State Component
// ============================================================================

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actions = [],
  illustration = 'workflow',
  size = 'md',
  className = '',
}) => {
  const Illustration = illustrations[illustration];

  const sizeClasses = {
    sm: {
      container: 'py-8 px-4',
      illustration: 'w-24 h-20',
      title: 'text-base',
      description: 'text-sm',
      icon: 'w-10 h-10',
    },
    md: {
      container: 'py-12 px-6',
      illustration: 'w-40 h-32',
      title: 'text-lg',
      description: 'text-sm',
      icon: 'w-12 h-12',
    },
    lg: {
      container: 'py-16 px-8',
      illustration: 'w-52 h-40',
      title: 'text-xl',
      description: 'text-base',
      icon: 'w-16 h-16',
    },
  };

  const sizes = sizeClasses[size];

  return (
    <div className={`flex flex-col items-center justify-center text-center ${sizes.container} ${className}`}>
      {/* Illustration or Icon */}
      {Illustration ? (
        <Illustration className={`${sizes.illustration} text-gray-400 dark:text-gray-500 mb-6`} />
      ) : icon ? (
        <div className={`${sizes.icon} mb-6 text-gray-400 dark:text-gray-500`}>
          {icon}
        </div>
      ) : null}

      {/* Title */}
      <h3 className={`font-semibold text-gray-900 dark:text-gray-100 mb-2 ${sizes.title}`}>
        {title}
      </h3>

      {/* Description */}
      <p className={`text-gray-500 dark:text-gray-400 max-w-md mb-6 ${sizes.description}`}>
        {description}
      </p>

      {/* Actions */}
      {actions.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              className={`
                inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium
                transition-all duration-200 hover:scale-105
                ${action.variant === 'primary'
                  ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-500/20'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }
              `}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Pre-built Empty States
// ============================================================================

interface PrebuiltEmptyStateProps {
  onAction?: (action: string) => void;
  className?: string;
}

export const EmptyWorkflows: React.FC<PrebuiltEmptyStateProps> = ({ onAction, className }) => (
  <EmptyState
    title="No workflows yet"
    description="Create your first workflow to automate tasks and connect your apps together."
    illustration="workflow"
    actions={[
      { label: 'Create Workflow', icon: <Plus className="w-4 h-4" />, onClick: () => onAction?.('create'), variant: 'primary' },
      { label: 'Browse Templates', icon: <FileText className="w-4 h-4" />, onClick: () => onAction?.('templates') },
    ]}
    className={className}
  />
);

export const EmptySearch: React.FC<PrebuiltEmptyStateProps & { query?: string }> = ({ query, onAction, className }) => (
  <EmptyState
    title="No results found"
    description={query ? `We couldn't find anything matching "${query}". Try different keywords.` : 'Try searching with different keywords.'}
    illustration="search"
    actions={[
      { label: 'Clear Search', icon: <RefreshCw className="w-4 h-4" />, onClick: () => onAction?.('clear') },
    ]}
    className={className}
  />
);

export const EmptyInbox: React.FC<PrebuiltEmptyStateProps> = ({ onAction, className }) => (
  <EmptyState
    title="All caught up!"
    description="You have no pending notifications or tasks. Check back later."
    illustration="inbox"
    size="sm"
    className={className}
  />
);

export const EmptyError: React.FC<PrebuiltEmptyStateProps & { message?: string }> = ({ message, onAction, className }) => (
  <EmptyState
    title="Something went wrong"
    description={message || "We encountered an error loading this content. Please try again."}
    illustration="error"
    actions={[
      { label: 'Try Again', icon: <RefreshCw className="w-4 h-4" />, onClick: () => onAction?.('retry'), variant: 'primary' },
      { label: 'Go Back', onClick: () => onAction?.('back') },
    ]}
    className={className}
  />
);

export const EmptyFolder: React.FC<PrebuiltEmptyStateProps> = ({ onAction, className }) => (
  <EmptyState
    title="This folder is empty"
    description="Add workflows or subfolders to organize your automation projects."
    illustration="folder"
    actions={[
      { label: 'Add Workflow', icon: <Plus className="w-4 h-4" />, onClick: () => onAction?.('add'), variant: 'primary' },
      { label: 'Upload', icon: <Upload className="w-4 h-4" />, onClick: () => onAction?.('upload') },
    ]}
    className={className}
  />
);

export const EmptyCanvas: React.FC<PrebuiltEmptyStateProps> = ({ onAction, className }) => (
  <EmptyState
    title="Start building your workflow"
    description="Drag nodes from the sidebar or click below to add your first node. Connect nodes to create powerful automations."
    illustration="workflow"
    size="lg"
    actions={[
      { label: 'Add First Node', icon: <Plus className="w-4 h-4" />, onClick: () => onAction?.('addNode'), variant: 'primary' },
      { label: 'Use AI Assistant', icon: <Sparkles className="w-4 h-4" />, onClick: () => onAction?.('ai') },
      { label: 'From Template', icon: <FileText className="w-4 h-4" />, onClick: () => onAction?.('template') },
    ]}
    className={className}
  />
);

export const EmptyExecutions: React.FC<PrebuiltEmptyStateProps> = ({ onAction, className }) => (
  <EmptyState
    title="No executions yet"
    description="Run your workflow to see execution history and results here."
    icon={<Play className="w-12 h-12" />}
    actions={[
      { label: 'Execute Workflow', icon: <Play className="w-4 h-4" />, onClick: () => onAction?.('execute'), variant: 'primary' },
    ]}
    className={className}
  />
);

export const EmptyCredentials: React.FC<PrebuiltEmptyStateProps> = ({ onAction, className }) => (
  <EmptyState
    title="No credentials configured"
    description="Add credentials to connect your workflow nodes to external services securely."
    icon={<Settings className="w-12 h-12" />}
    actions={[
      { label: 'Add Credential', icon: <Plus className="w-4 h-4" />, onClick: () => onAction?.('add'), variant: 'primary' },
    ]}
    className={className}
  />
);

export const EmptyTeamMembers: React.FC<PrebuiltEmptyStateProps> = ({ onAction, className }) => (
  <EmptyState
    title="No team members"
    description="Invite team members to collaborate on workflows together."
    icon={<Users className="w-12 h-12" />}
    actions={[
      { label: 'Invite Members', icon: <Plus className="w-4 h-4" />, onClick: () => onAction?.('invite'), variant: 'primary' },
    ]}
    className={className}
  />
);

export default EmptyState;
