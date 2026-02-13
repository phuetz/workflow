/**
 * Community Marketplace Utilities
 * Shared utility functions for marketplace components
 */

/**
 * Format number for display (e.g., 1000 -> 1k, 1000000 -> 1M)
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toString();
}

/**
 * Format time ago from a date
 */
export function formatTimeAgo(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' years ago';

  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' months ago';

  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' days ago';

  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' hours ago';

  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' minutes ago';

  return Math.floor(seconds) + ' seconds ago';
}

/**
 * Get icon emoji for a node based on its icon name
 */
export function getNodeIcon(icon: string): string {
  const iconMap: Record<string, string> = {
    slack: '',
    sheets: '',
    openai: '',
    stripe: '',
    notion: '',
    default: ''
  };
  return iconMap[icon] || iconMap.default;
}

/**
 * Get class names for dark/light mode
 */
export function getThemeClasses(darkMode: boolean) {
  return {
    bg: darkMode ? 'bg-gray-800' : 'bg-white',
    bgSecondary: darkMode ? 'bg-gray-700' : 'bg-gray-50',
    border: darkMode ? 'border-gray-700' : 'border-gray-200',
    text: darkMode ? 'text-white' : 'text-gray-900',
    textSecondary: darkMode ? 'text-gray-400' : 'text-gray-600',
    textMuted: darkMode ? 'text-gray-500' : 'text-gray-400',
    hover: darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100',
    input: darkMode
      ? 'bg-gray-700 border-gray-600 text-white'
      : 'bg-white border-gray-300 text-gray-900',
    inputPlaceholder: darkMode ? 'placeholder-gray-400' : 'placeholder-gray-500'
  };
}
