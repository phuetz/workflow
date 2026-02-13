/**
 * Centralized Z-Index Registry
 *
 * This file defines the z-index hierarchy for the entire application.
 * All z-index values should be imported from here to ensure consistency.
 *
 * Hierarchy:
 * - Base layers (0-99): Canvas, nodes, edges
 * - UI overlays (100-199): Status bar, sidebar, header
 * - Panels (200-299): Config panels, focus panels
 * - Dropdowns (300-399): Menus, context menus, tooltips
 * - Modals (400-499): Modal backdrops, modals, drawers
 * - Popups (500-599): Popups, toasts, notifications
 * - Critical (600+): Command palette, spotlight
 */

export const zIndex = {
  // Base layers (0-99)
  base: 0,
  canvas: 10,
  edges: 15,
  nodes: 20,
  minimap: 30,
  alignmentGuides: 40,

  // UI Overlays (100-199)
  statusBar: 100,
  sidebar: 110,
  header: 120,

  // Panels (200-299)
  panel: 200,
  configPanel: 200,
  focusPanel: 210,
  debugPanel: 220,
  bulkPanel: 230,
  dataPinningPanel: 240,
  executionHistoryPanel: 250,

  // Dropdowns/Menus (300-399)
  dropdown: 300,
  contextMenu: 310,
  tooltip: 320,
  quickSearch: 330,

  // Modals (400-499)
  modalBackdrop: 400,
  modal: 410,
  drawer: 420,
  nodePanel: 430,

  // Popups (500-599)
  popup: 500,
  toast: 510,
  notification: 520,

  // Critical Overlays (600-699)
  commandPalette: 600,
  keyboardShortcuts: 610,
  spotlight: 620,

  // Maximum (reserved for critical overlays)
  max: 9999,
} as const;

export type ZIndexKey = keyof typeof zIndex;

/**
 * Get z-index value by key
 */
export function getZIndex(key: ZIndexKey): number {
  return zIndex[key];
}

/**
 * Get CSS variable name for z-index
 */
export function getZIndexVar(key: ZIndexKey): string {
  return `var(--linear-z-${key.replace(/([A-Z])/g, '-$1').toLowerCase()})`;
}

/**
 * Tailwind class mapping for z-index
 * Use these in className props
 */
export const zClass = {
  base: 'z-0',
  canvas: 'z-[10]',
  edges: 'z-[15]',
  nodes: 'z-[20]',
  minimap: 'z-[30]',
  alignmentGuides: 'z-[40]',
  statusBar: 'z-[100]',
  sidebar: 'z-[110]',
  header: 'z-[120]',
  panel: 'z-[200]',
  configPanel: 'z-[200]',
  focusPanel: 'z-[210]',
  debugPanel: 'z-[220]',
  bulkPanel: 'z-[230]',
  dataPinningPanel: 'z-[240]',
  executionHistoryPanel: 'z-[250]',
  dropdown: 'z-[300]',
  contextMenu: 'z-[310]',
  tooltip: 'z-[320]',
  quickSearch: 'z-[330]',
  modalBackdrop: 'z-[400]',
  modal: 'z-[410]',
  drawer: 'z-[420]',
  nodePanel: 'z-[430]',
  popup: 'z-[500]',
  toast: 'z-[510]',
  notification: 'z-[520]',
  commandPalette: 'z-[600]',
  keyboardShortcuts: 'z-[610]',
  spotlight: 'z-[620]',
  max: 'z-[9999]',
} as const;

export type ZClassKey = keyof typeof zClass;

export default zIndex;
