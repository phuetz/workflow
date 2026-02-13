/**
 * Keyboard Navigation Demo Component
 * Showcases enhanced keyboard navigation capabilities
 * Can be used as a template for implementing keyboard navigation in other components
 */

import React, { useState, useMemo } from 'react';
import {
  Accessibility, Check, Grid3x3, Info, Keyboard, List,
  Settings, X
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import { useKeyboardNavigation, NavigationItem } from '../../hooks/useKeyboardNavigation';
import { announceToScreenReader } from '../../utils/accessibility';
import { logger } from '../../services/SimpleLogger';
import { nodeTypes } from '../../data/nodeTypes';

interface KeyboardNavigationDemoProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyboardNavigationDemo({ isOpen, onClose }: KeyboardNavigationDemoProps) {
  const { darkMode } = useWorkflowStore();
  const [activeDemo, setActiveDemo] = useState<'list' | 'grid' | 'toolbar'>('list');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Demo data - list of workflow nodes
  const nodeItems = useMemo<NavigationItem[]>(() => {
    return Object.entries(nodeTypes).slice(0, 12).map(([type, config], index) => ({
      id: `node-${type}`,
      label: config.label,
      description: config.description,
      onActivate: () => {
        announceToScreenReader(`Activated ${config.label}`, 'assertive');
        logger.info('Node activated via keyboard:', type);
      },
      onSecondaryAction: () => {
        setSelectedItems(prev => {
          const newSet = new Set(prev);
          if (newSet.has(type)) {
            newSet.delete(type);
            announceToScreenReader(`${config.label} deselected`, 'polite');
          } else {
            newSet.add(type);
            announceToScreenReader(`${config.label} selected`, 'polite');
          }
          return newSet;
        });
      },
      group: config.category,
    }));
  }, []);

  // Toolbar items
  const toolbarItems = useMemo<NavigationItem[]>(() => [
    {
      id: 'save',
      label: 'Save',
      description: 'Save current workflow',
      onActivate: () => announceToScreenReader('Workflow saved', 'assertive'),
    },
    {
      id: 'run',
      label: 'Run',
      description: 'Execute workflow',
      onActivate: () => announceToScreenReader('Workflow execution started', 'assertive'),
    },
    {
      id: 'debug',
      label: 'Debug',
      description: 'Debug workflow',
      onActivate: () => announceToScreenReader('Debug mode activated', 'assertive'),
    },
    {
      id: 'export',
      label: 'Export',
      description: 'Export workflow',
      onActivate: () => announceToScreenReader('Export dialog opened', 'assertive'),
    },
  ], []);

  // List navigation
  const listNavigation = useKeyboardNavigation({
    items: nodeItems,
    orientation: 'vertical',
    wrap: true,
    autoFocus: activeDemo === 'list',
    onSelectionChange: (item) => {
      if (item) {
        logger.debug('List selection changed:', item.label);
      }
    },
  });

  // Grid navigation
  const gridNavigation = useKeyboardNavigation({
    items: nodeItems,
    orientation: 'grid',
    gridColumns: 3,
    wrap: true,
    autoFocus: activeDemo === 'grid',
    onSelectionChange: (item) => {
      if (item) {
        logger.debug('Grid selection changed:', item.label);
      }
    },
  });

  // Toolbar navigation
  const toolbarNavigation = useKeyboardNavigation({
    items: toolbarItems,
    orientation: 'horizontal',
    wrap: true,
    autoFocus: activeDemo === 'toolbar',
    onSelectionChange: (item) => {
      if (item) {
        logger.debug('Toolbar selection changed:', item.label);
      }
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} rounded-lg shadow-xl max-w-4xl max-h-[90vh] overflow-hidden`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Keyboard className="text-blue-500" size={24} />
              <div>
                <h2 className="text-xl font-semibold">Enhanced Keyboard Navigation Demo</h2>
                <p className="text-sm text-gray-500">Showcase of accessibility features</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
              }`}
              aria-label="Close demo"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Demo selector */}
        <div className={`px-6 py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex space-x-1" role="tablist">
            {[
              { id: 'list', label: 'List Navigation', icon: List },
              { id: 'grid', label: 'Grid Navigation', icon: Grid3x3 },
              { id: 'toolbar', label: 'Toolbar Navigation', icon: Settings }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveDemo(id as 'list' | 'grid' | 'toolbar')}
                role="tab"
                aria-selected={activeDemo === id}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
                  activeDemo === id
                    ? 'bg-blue-500 text-white'
                    : darkMode
                    ? 'hover:bg-gray-800 text-gray-300'
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className={`px-6 py-3 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} text-sm`}>
          <div className="flex items-start space-x-4">
            <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium mb-1">Keyboard Navigation Instructions:</p>
              <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                <li><kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">↑↓←→</kbd> Navigate items</li>
                <li><kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Enter</kbd> Activate item</li>
                <li><kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Space</kbd> Secondary action (select/toggle)</li>
                <li><kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Home/End</kbd> First/Last item</li>
                <li><kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">A-Z</kbd> Jump to item by first letter</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Demo content */}
        <div className="px-6 py-4 h-96 overflow-hidden">
          {/* List Demo */}
          {activeDemo === 'list' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Vertical List Navigation</h3>
              <div
                {...listNavigation.getContainerProps()}
                className={`border rounded-lg p-4 h-80 overflow-y-auto ${
                  darkMode ? 'border-gray-700' : 'border-gray-200'
                }`}
                aria-label="Workflow nodes list"
              >
                {nodeItems.map((item, index) => {
                  const isSelected = listNavigation.selectedItem?.id === item.id;
                  const isToggled = selectedItems.has(item.id.replace('node-', ''));
                  return (
                    <div
                      key={item.id}
                      {...listNavigation.getItemProps(item, index)}
                      className={`p-3 rounded-lg mb-2 border transition-all ${
                        isSelected
                          ? 'ring-2 ring-blue-500 border-blue-500'
                          : darkMode
                          ? 'border-gray-700 hover:border-gray-600'
                          : 'border-gray-200 hover:border-gray-300'
                      } ${
                        isToggled ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{item.label}</h4>
                          <p className="text-sm text-gray-500">{item.description}</p>
                        </div>
                        {isToggled && (
                          <Check size={16} className="text-blue-500" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Grid Demo */}
          {activeDemo === 'grid' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Grid Navigation (3 columns)</h3>
              <div
                {...gridNavigation.getContainerProps()}
                className={`border rounded-lg p-4 h-80 overflow-y-auto ${
                  darkMode ? 'border-gray-700' : 'border-gray-200'
                }`}
                aria-label="Workflow nodes grid"
              >
                <div className="grid grid-cols-3 gap-3">
                  {nodeItems.map((item, index) => {
                    const isSelected = gridNavigation.selectedItem?.id === item.id;
                    const isToggled = selectedItems.has(item.id.replace('node-', ''));
                    return (
                      <div
                        key={item.id}
                        {...gridNavigation.getItemProps(item, index)}
                        className={`p-3 rounded-lg border transition-all text-center ${
                          isSelected
                            ? 'ring-2 ring-blue-500 border-blue-500'
                            : darkMode
                            ? 'border-gray-700 hover:border-gray-600'
                            : 'border-gray-200 hover:border-gray-300'
                        } ${
                          isToggled ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                      >
                        <h4 className="font-medium text-sm mb-1">{item.label}</h4>
                        <p className="text-xs text-gray-500 truncate">{item.description}</p>
                        {isToggled && (
                          <Check size={14} className="text-blue-500 mx-auto mt-2" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Toolbar Demo */}
          {activeDemo === 'toolbar' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Horizontal Toolbar Navigation</h3>
              <div className="space-y-6">
                <div
                  {...toolbarNavigation.getContainerProps()}
                  className={`flex space-x-2 p-4 border rounded-lg ${
                    darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
                  }`}
                  aria-label="Workflow toolbar"
                >
                  {toolbarItems.map((item, index) => {
                    const isSelected = toolbarNavigation.selectedItem?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        {...toolbarNavigation.getItemProps(item, index)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2 ${
                          isSelected
                            ? 'ring-2 ring-blue-500 bg-blue-500 text-white'
                            : darkMode
                            ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                            : 'bg-white hover:bg-gray-100 text-gray-700'
                        }`}
                        title={item.description}
                      >
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
                
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Use <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">←→</kbd> to navigate toolbar items horizontally.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Status */}
        <div className={`px-6 py-3 border-t ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <span className="text-gray-600 dark:text-gray-400">
                Selected: {selectedItems.size} items
              </span>
              {(activeDemo === 'list' ? listNavigation.selectedItem : 
                activeDemo === 'grid' ? gridNavigation.selectedItem : 
                toolbarNavigation.selectedItem) && (
                <span className="text-blue-600 dark:text-blue-400">
                  Current: {(activeDemo === 'list' ? listNavigation.selectedItem : 
                           activeDemo === 'grid' ? gridNavigation.selectedItem : 
                           toolbarNavigation.selectedItem)?.label}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Accessibility size={16} className="text-green-500" />
              <span className="text-green-600 dark:text-green-400">Screen reader optimized</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}