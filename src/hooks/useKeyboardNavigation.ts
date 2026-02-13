/**
 * Enhanced Keyboard Navigation Hook
 * Provides comprehensive keyboard navigation support for complex components
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { announceToScreenReader } from '../utils/accessibility';
import { logger } from '../services/SimpleLogger';

export interface NavigationItem {
  id: string;
  element?: HTMLElement;
  label: string;
  description?: string;
  onActivate?: () => void;
  onSecondaryAction?: () => void;
  disabled?: boolean;
  group?: string;
}

export interface KeyboardNavigationOptions {
  items: NavigationItem[];
  orientation?: 'vertical' | 'horizontal' | 'grid';
  wrap?: boolean;
  gridColumns?: number;
  autoFocus?: boolean;
  onSelectionChange?: (item: NavigationItem | null) => void;
  onActivate?: (item: NavigationItem) => void;
}

export function useKeyboardNavigation(options: KeyboardNavigationOptions) {
  const {
    items,
    orientation = 'vertical',
    wrap = true,
    gridColumns = 1,
    autoFocus = false,
    onSelectionChange,
    onActivate
  } = options;

  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isActive, setIsActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get current selected item
  const selectedItem = selectedIndex >= 0 && selectedIndex < items.length
    ? items[selectedIndex]
    : null;

  // Update selection and notify
  const updateSelection = useCallback((index: number) => {
    const clampedIndex = Math.max(-1, Math.min(index, items.length - 1));
    const item = clampedIndex >= 0 && clampedIndex < items.length
      ? items[clampedIndex]
      : null;

    setSelectedIndex(clampedIndex);

    onSelectionChange?.(item);

    // Announce to screen reader
    if (item) {
      const announcement = item.description
        ? `${item.label}, ${item.description}`
        : item.label;
      announceToScreenReader(announcement, 'polite');
    }

    logger.debug('Keyboard navigation selection changed', {
      index: clampedIndex,
      item: item?.label
    });
  }, [items, onSelectionChange]);

  // Handle keyboard events
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!items.length || !isActive) return;

    // Skip disabled items
    const enabledItems = items
      .map((item, originalIndex) => ({ item, originalIndex }))
      .filter(({ item }) => !item.disabled);

    if (!enabledItems.length) return;

    // Find current position in enabled items
    const currentEnabledIndex = enabledItems.findIndex(
      ({ originalIndex }) => originalIndex === selectedIndex
    );

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (orientation === 'vertical' || orientation === 'grid') {
          if (orientation === 'grid') {
            // Grid navigation - move down by gridColumns
            const newIndex = Math.min(
              currentEnabledIndex + gridColumns,
              enabledItems.length - 1
            );
            updateSelection(enabledItems[newIndex]?.originalIndex ?? selectedIndex);
          } else {
            // Vertical navigation
            const nextIndex = wrap
              ? (currentEnabledIndex + 1) % enabledItems.length
              : Math.min(currentEnabledIndex + 1, enabledItems.length - 1);
            updateSelection(enabledItems[nextIndex]?.originalIndex ?? selectedIndex);
          }
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (orientation === 'vertical' || orientation === 'grid') {
          if (orientation === 'grid') {
            // Grid navigation - move up by gridColumns
            const newIndex = Math.max(currentEnabledIndex - gridColumns, 0);
            updateSelection(enabledItems[newIndex]?.originalIndex ?? selectedIndex);
          } else {
            // Vertical navigation
            const prevIndex = wrap
              ? currentEnabledIndex <= 0 ? enabledItems.length - 1 : currentEnabledIndex - 1
              : Math.max(currentEnabledIndex - 1, 0);
            updateSelection(enabledItems[prevIndex]?.originalIndex ?? selectedIndex);
          }
        }
        break;

      case 'ArrowRight':
        event.preventDefault();
        if (orientation === 'horizontal') {
          const nextIndex = wrap
            ? (currentEnabledIndex + 1) % enabledItems.length
            : Math.min(currentEnabledIndex + 1, enabledItems.length - 1);
          updateSelection(enabledItems[nextIndex]?.originalIndex ?? selectedIndex);
        } else if (orientation === 'grid') {
          // Grid navigation - move right
          const nextIndex = Math.min(currentEnabledIndex + 1, enabledItems.length - 1);
          updateSelection(enabledItems[nextIndex]?.originalIndex ?? selectedIndex);
        }
        break;

      case 'ArrowLeft':
        event.preventDefault();
        if (orientation === 'horizontal') {
          const prevIndex = wrap
            ? currentEnabledIndex <= 0 ? enabledItems.length - 1 : currentEnabledIndex - 1
            : Math.max(currentEnabledIndex - 1, 0);
          updateSelection(enabledItems[prevIndex]?.originalIndex ?? selectedIndex);
        } else if (orientation === 'grid') {
          // Grid navigation - move left
          const prevIndex = Math.max(currentEnabledIndex - 1, 0);
          updateSelection(enabledItems[prevIndex]?.originalIndex ?? selectedIndex);
        }
        break;

      case 'Home':
        event.preventDefault();
        updateSelection(enabledItems[0]?.originalIndex ?? 0);
        break;

      case 'End':
        event.preventDefault();
        updateSelection(enabledItems[enabledItems.length - 1]?.originalIndex ?? items.length - 1);
        break;

      case 'Enter':
      case ' ':
        event.preventDefault();
        if (selectedItem) {
          if (event.key === 'Enter') {
            selectedItem.onActivate?.();
            onActivate?.(selectedItem);
          } else if (event.key === ' ') {
            selectedItem.onSecondaryAction?.();
          }
        }
        break;

      case 'Escape':
        event.preventDefault();
        setIsActive(false);
        updateSelection(-1);
        break;

      // Letter-based navigation
      default:
        if (event.key.length === 1 && /[a-zA-Z0-9]/.test(event.key)) {
          event.preventDefault();
          // Time tracking removed - not needed for current implementation

          // Find first item that starts with the letter
          const letter = event.key.toLowerCase();
          const matchingIndex = enabledItems.findIndex(({ item }) =>
            item.label.toLowerCase().startsWith(letter)
          );

          if (matchingIndex >= 0) {
            updateSelection(enabledItems[matchingIndex].originalIndex);
          }
        }
        break;
    }
  }, [items, isActive, selectedIndex, orientation, wrap, gridColumns, updateSelection, selectedItem, onActivate]);

  // Auto-focus first item if requested
  useEffect(() => {
    if (autoFocus && items.length > 0 && selectedIndex === -1) {
      updateSelection(0);
      setIsActive(true);
    }
  }, [autoFocus, items.length, selectedIndex, updateSelection]);

  // Focus management
  const focus = useCallback(() => {
    setIsActive(true);
    if (selectedIndex === -1 && items.length > 0) {
      updateSelection(0);
    }
  }, [selectedIndex, items.length, updateSelection]);

  const blur = useCallback(() => {
    setIsActive(false);
  }, []);

  // Get accessibility attributes for container
  const getContainerProps = useCallback(() => ({
    ref: containerRef,
    role: orientation === 'grid' ? 'grid' : 'listbox',
    'aria-orientation': orientation === 'grid' ? undefined : orientation,
    'aria-activedescendant': selectedItem?.id,
    tabIndex: isActive ? 0 : -1,
    onKeyDown: handleKeyDown,
    onFocus: focus,
    onBlur: blur,
  }), [orientation, selectedItem, isActive, handleKeyDown, focus, blur]);

  // Get accessibility attributes for items
  const getItemProps = useCallback((item: NavigationItem, index: number) => ({
    id: item.id,
    role: orientation === 'grid' ? 'gridcell' : 'option',
    'aria-selected': index === selectedIndex,
    'aria-disabled': item.disabled,
    tabIndex: -1, // Managed by container
    'data-keyboard-navigation-item': true,
  }), [orientation, selectedIndex]);

  return {
    selectedIndex,
    selectedItem,
    isActive,
    focus,
    blur,
    updateSelection,
    getContainerProps,
    getItemProps,
    handleKeyDown,
  };
}

export default useKeyboardNavigation;
