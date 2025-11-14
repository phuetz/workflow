/**
 * Keyboard Shortcuts System
 * Global keyboard shortcut management with customization
 */

export interface KeyboardShortcut {
  id: string;
  key: string; // e.g., "cmd+s", "ctrl+shift+p"
  description: string;
  category: string;
  handler: (event: KeyboardEvent) => void | Promise<void>;
  enabled?: boolean;
  global?: boolean; // Works even in input fields
}

export interface ShortcutCategory {
  name: string;
  shortcuts: KeyboardShortcut[];
}

class KeyboardShortcutManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private customBindings: Map<string, string> = new Map(); // shortcutId -> customKey
  private isListening: boolean = false;

  constructor() {
    this.loadCustomBindings();
  }

  /**
   * Register a keyboard shortcut
   */
  register(shortcut: Omit<KeyboardShortcut, 'enabled'>): void {
    const fullShortcut: KeyboardShortcut = {
      ...shortcut,
      enabled: true
    };

    this.shortcuts.set(shortcut.id, fullShortcut);

    // Start listening if not already
    if (!this.isListening) {
      this.startListening();
    }
  }

  /**
   * Unregister a shortcut
   */
  unregister(id: string): void {
    this.shortcuts.delete(id);
  }

  /**
   * Enable/disable a shortcut
   */
  toggle(id: string, enabled?: boolean): void {
    const shortcut = this.shortcuts.get(id);
    if (shortcut) {
      shortcut.enabled = enabled ?? !shortcut.enabled;
    }
  }

  /**
   * Customize keybinding
   */
  customize(id: string, newKey: string): void {
    this.customBindings.set(id, newKey);
    this.saveCustomBindings();
  }

  /**
   * Reset keybinding to default
   */
  resetBinding(id: string): void {
    this.customBindings.delete(id);
    this.saveCustomBindings();
  }

  /**
   * Get effective key for shortcut (custom or default)
   */
  private getEffectiveKey(shortcut: KeyboardShortcut): string {
    return this.customBindings.get(shortcut.id) || shortcut.key;
  }

  /**
   * Check if key combination matches shortcut
   */
  private matchesShortcut(event: KeyboardEvent, keyCombo: string): boolean {
    const parts = keyCombo.toLowerCase().split('+');
    const key = parts[parts.length - 1];
    const modifiers = parts.slice(0, -1);

    // Check key
    const pressedKey = event.key.toLowerCase();
    if (pressedKey !== key && event.code.toLowerCase() !== key) {
      return false;
    }

    // Check modifiers
    const hasCtrl = modifiers.includes('ctrl') || modifiers.includes('cmd');
    const hasShift = modifiers.includes('shift');
    const hasAlt = modifiers.includes('alt');
    const hasMeta = modifiers.includes('meta') || modifiers.includes('cmd');

    // Handle cmd/ctrl based on platform
    const expectsCtrlOrCmd = hasCtrl || hasMeta;
    const hasCtrlOrCmd = event.ctrlKey || event.metaKey;

    if (expectsCtrlOrCmd && !hasCtrlOrCmd) return false;
    if (!expectsCtrlOrCmd && hasCtrlOrCmd) return false;

    if (hasShift && !event.shiftKey) return false;
    if (!hasShift && event.shiftKey) return false;

    if (hasAlt && !event.altKey) return false;
    if (!hasAlt && event.altKey) return false;

    return true;
  }

  /**
   * Handle keyboard event
   */
  private handleKeyDown = async (event: KeyboardEvent): Promise<void> => {
    // Skip if typing in input/textarea (unless shortcut is global)
    const target = event.target as HTMLElement;
    const isInputField =
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable;

    for (const shortcut of this.shortcuts.values()) {
      if (!shortcut.enabled) continue;

      // Skip non-global shortcuts in input fields
      if (isInputField && !shortcut.global) continue;

      const effectiveKey = this.getEffectiveKey(shortcut);

      if (this.matchesShortcut(event, effectiveKey)) {
        event.preventDefault();
        event.stopPropagation();

        try {
          await shortcut.handler(event);
        } catch (error) {
          console.error(`Error executing shortcut ${shortcut.id}:`, error);
        }

        break; // Only execute first matching shortcut
      }
    }
  };

  /**
   * Start listening for keyboard events
   */
  private startListening(): void {
    if (this.isListening) return;

    document.addEventListener('keydown', this.handleKeyDown);
    this.isListening = true;
  }

  /**
   * Stop listening
   */
  stopListening(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.isListening = false;
  }

  /**
   * Get all shortcuts grouped by category
   */
  getByCategory(): ShortcutCategory[] {
    const categories = new Map<string, KeyboardShortcut[]>();

    for (const shortcut of this.shortcuts.values()) {
      const existing = categories.get(shortcut.category) || [];
      existing.push(shortcut);
      categories.set(shortcut.category, existing);
    }

    return Array.from(categories.entries()).map(([name, shortcuts]) => ({
      name,
      shortcuts: shortcuts.sort((a, b) => a.description.localeCompare(b.description))
    }));
  }

  /**
   * Search shortcuts
   */
  search(query: string): KeyboardShortcut[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.shortcuts.values()).filter(
      s =>
        s.description.toLowerCase().includes(lowerQuery) ||
        s.key.toLowerCase().includes(lowerQuery) ||
        s.category.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Load custom bindings from localStorage
   */
  private loadCustomBindings(): void {
    try {
      const saved = localStorage.getItem('keyboard_shortcuts_custom');
      if (saved) {
        this.customBindings = new Map(Object.entries(JSON.parse(saved)));
      }
    } catch (error) {
      console.error('Failed to load custom keyboard shortcuts:', error);
    }
  }

  /**
   * Save custom bindings to localStorage
   */
  private saveCustomBindings(): void {
    try {
      localStorage.setItem(
        'keyboard_shortcuts_custom',
        JSON.stringify(Object.fromEntries(this.customBindings))
      );
    } catch (error) {
      console.error('Failed to save custom keyboard shortcuts:', error);
    }
  }

  /**
   * Export shortcuts configuration
   */
  export(): string {
    const config = {
      shortcuts: Array.from(this.shortcuts.values()).map(s => ({
        id: s.id,
        key: this.getEffectiveKey(s),
        enabled: s.enabled
      })),
      customBindings: Object.fromEntries(this.customBindings)
    };

    return JSON.stringify(config, null, 2);
  }

  /**
   * Import shortcuts configuration
   */
  import(configJson: string): void {
    try {
      const config = JSON.parse(configJson);

      if (config.customBindings) {
        this.customBindings = new Map(Object.entries(config.customBindings));
        this.saveCustomBindings();
      }

      if (config.shortcuts) {
        for (const shortcut of config.shortcuts) {
          this.toggle(shortcut.id, shortcut.enabled);
        }
      }
    } catch (error) {
      console.error('Failed to import shortcuts configuration:', error);
    }
  }
}

// Singleton instance
export const keyboardShortcuts = new KeyboardShortcutManager();

/**
 * Default shortcuts
 */
export function registerDefaultShortcuts() {
  // General
  keyboardShortcuts.register({
    id: 'global-search',
    key: 'cmd+k',
    description: 'Open global search',
    category: 'General',
    global: true,
    handler: () => {
      // Dispatch event for global search
      window.dispatchEvent(new CustomEvent('open-global-search'));
    }
  });

  keyboardShortcuts.register({
    id: 'shortcuts-help',
    key: 'cmd+/',
    description: 'Show keyboard shortcuts',
    category: 'General',
    global: true,
    handler: () => {
      window.dispatchEvent(new CustomEvent('open-shortcuts-help'));
    }
  });

  // Workflow
  keyboardShortcuts.register({
    id: 'save-workflow',
    key: 'cmd+s',
    description: 'Save workflow',
    category: 'Workflow',
    global: true,
    handler: () => {
      window.dispatchEvent(new CustomEvent('save-workflow'));
    }
  });

  keyboardShortcuts.register({
    id: 'run-workflow',
    key: 'cmd+enter',
    description: 'Run workflow',
    category: 'Workflow',
    handler: () => {
      window.dispatchEvent(new CustomEvent('run-workflow'));
    }
  });

  keyboardShortcuts.register({
    id: 'new-workflow',
    key: 'cmd+n',
    description: 'Create new workflow',
    category: 'Workflow',
    handler: () => {
      window.dispatchEvent(new CustomEvent('new-workflow'));
    }
  });

  // Editing
  keyboardShortcuts.register({
    id: 'undo',
    key: 'cmd+z',
    description: 'Undo',
    category: 'Editing',
    handler: () => {
      window.dispatchEvent(new CustomEvent('undo'));
    }
  });

  keyboardShortcuts.register({
    id: 'redo',
    key: 'cmd+shift+z',
    description: 'Redo',
    category: 'Editing',
    handler: () => {
      window.dispatchEvent(new CustomEvent('redo'));
    }
  });

  keyboardShortcuts.register({
    id: 'delete-node',
    key: 'delete',
    description: 'Delete selected node',
    category: 'Editing',
    handler: () => {
      window.dispatchEvent(new CustomEvent('delete-selected'));
    }
  });

  keyboardShortcuts.register({
    id: 'duplicate-node',
    key: 'cmd+d',
    description: 'Duplicate selected node',
    category: 'Editing',
    handler: () => {
      window.dispatchEvent(new CustomEvent('duplicate-selected'));
    }
  });

  // Navigation
  keyboardShortcuts.register({
    id: 'zoom-in',
    key: 'cmd+=',
    description: 'Zoom in',
    category: 'Navigation',
    handler: () => {
      window.dispatchEvent(new CustomEvent('zoom-in'));
    }
  });

  keyboardShortcuts.register({
    id: 'zoom-out',
    key: 'cmd+-',
    description: 'Zoom out',
    category: 'Navigation',
    handler: () => {
      window.dispatchEvent(new CustomEvent('zoom-out'));
    }
  });

  keyboardShortcuts.register({
    id: 'fit-view',
    key: 'cmd+0',
    description: 'Fit workflow to view',
    category: 'Navigation',
    handler: () => {
      window.dispatchEvent(new CustomEvent('fit-view'));
    }
  });

  // Debugging
  keyboardShortcuts.register({
    id: 'toggle-debugger',
    key: 'cmd+shift+d',
    description: 'Toggle debugger',
    category: 'Debugging',
    handler: () => {
      window.dispatchEvent(new CustomEvent('toggle-debugger'));
    }
  });

  keyboardShortcuts.register({
    id: 'step-over',
    key: 'f10',
    description: 'Step over (debugger)',
    category: 'Debugging',
    handler: () => {
      window.dispatchEvent(new CustomEvent('debugger-step-over'));
    }
  });

  keyboardShortcuts.register({
    id: 'continue',
    key: 'f5',
    description: 'Continue execution',
    category: 'Debugging',
    handler: () => {
      window.dispatchEvent(new CustomEvent('debugger-continue'));
    }
  });
}

/**
 * Format key for display
 */
export function formatKey(key: string): string {
  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);

  return key
    .split('+')
    .map(part => {
      const replacements: Record<string, string> = {
        cmd: isMac ? '⌘' : 'Ctrl',
        ctrl: isMac ? '⌃' : 'Ctrl',
        shift: isMac ? '⇧' : 'Shift',
        alt: isMac ? '⌥' : 'Alt',
        meta: '⌘',
        enter: '↵',
        backspace: '⌫',
        delete: '⌦',
        escape: 'Esc',
        arrowup: '↑',
        arrowdown: '↓',
        arrowleft: '←',
        arrowright: '→'
      };

      return replacements[part.toLowerCase()] || part.toUpperCase();
    })
    .join(isMac ? '' : '+');
}

/**
 * React hook for shortcuts
 */
export function useKeyboardShortcut(
  key: string,
  handler: (event: KeyboardEvent) => void,
  options?: {
    enabled?: boolean;
    global?: boolean;
  }
) {
  React.useEffect(() => {
    if (options?.enabled === false) return;

    const id = `custom_${Math.random().toString(36).substr(2, 9)}`;

    keyboardShortcuts.register({
      id,
      key,
      description: 'Custom shortcut',
      category: 'Custom',
      global: options?.global,
      handler
    });

    return () => {
      keyboardShortcuts.unregister(id);
    };
  }, [key, handler, options?.enabled, options?.global]);
}

// React namespace
import * as React from 'react';
