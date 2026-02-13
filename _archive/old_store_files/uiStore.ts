/**
 * PLAN C PHASE 3 - Refactoring: UI State Store
 * Extracted from monolithic workflowStore.ts
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { logger } from '../../services/LoggingService';

export interface UIState {
  // Theme & Display
  darkMode: boolean;
  sidebarOpen: boolean;
  zoomLevel: number;
  gridEnabled: boolean;
  miniMapEnabled: boolean;
  
  // Debug & Development
  debugMode: boolean;
  performanceMode: boolean;
  showNodeIds: boolean;
  showExecutionTimes: boolean;
  
  // Panels & Modals
  activePanel: 'config' | 'debug' | 'logs' | 'variables' | null;
  modalOpen: string | null;
  notificationsEnabled: boolean;
  
  // View Options
  viewMode: 'compact' | 'normal' | 'detailed';
  layoutDirection: 'TB' | 'LR' | 'RL' | 'BT';
  connectionMode: 'straight' | 'smooth' | 'step';
  
  // Actions
  toggleDarkMode: () => void;
  toggleSidebar: () => void;
  setZoomLevel: (level: number) => void;
  toggleGrid: () => void;
  toggleMiniMap: () => void;
  
  toggleDebugMode: () => void;
  togglePerformanceMode: () => void;
  toggleShowNodeIds: () => void;
  toggleShowExecutionTimes: () => void;
  
  setActivePanel: (panel: UIState['activePanel']) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  toggleNotifications: () => void;
  
  setViewMode: (mode: UIState['viewMode']) => void;
  setLayoutDirection: (direction: UIState['layoutDirection']) => void;
  setConnectionMode: (mode: UIState['connectionMode']) => void;
  
  // Helpers
  resetUISettings: () => void;
  exportUISettings: () => any;
  importUISettings: (settings: Partial<UIState>) => void;
}

const defaultUIState = {
  darkMode: false,
  sidebarOpen: true,
  zoomLevel: 1,
  gridEnabled: true,
  miniMapEnabled: false,
  debugMode: false,
  performanceMode: false,
  showNodeIds: false,
  showExecutionTimes: false,
  activePanel: null as UIState['activePanel'],
  modalOpen: null,
  notificationsEnabled: true,
  viewMode: 'normal' as UIState['viewMode'],
  layoutDirection: 'TB' as UIState['layoutDirection'],
  connectionMode: 'smooth' as UIState['connectionMode']
};

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      ...defaultUIState,
      
      toggleDarkMode: () => {
        set((state) => {
          const newMode = !state.darkMode;
          
          // Apply to document
          if (typeof document !== 'undefined') {
            if (newMode) {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }
          
          logger.info(`Dark mode: ${newMode ? 'enabled' : 'disabled'}`);
          return { darkMode: newMode };
        });
      },
      
      toggleSidebar: () => {
        set((state) => ({ sidebarOpen: !state.sidebarOpen }));
      },
      
      setZoomLevel: (level) => {
        const clampedLevel = Math.max(0.1, Math.min(2, level));
        set({ zoomLevel: clampedLevel });
        logger.debug(`Zoom level set to ${clampedLevel}`);
      },
      
      toggleGrid: () => {
        set((state) => ({ gridEnabled: !state.gridEnabled }));
      },
      
      toggleMiniMap: () => {
        set((state) => ({ miniMapEnabled: !state.miniMapEnabled }));
      },
      
      toggleDebugMode: () => {
        set((state) => {
          const newMode = !state.debugMode;
          logger.info(`Debug mode: ${newMode ? 'enabled' : 'disabled'}`);
          return { debugMode: newMode };
        });
      },
      
      togglePerformanceMode: () => {
        set((state) => {
          const newMode = !state.performanceMode;
          
          if (newMode) {
            // Disable heavy features for performance
            logger.info('Performance mode enabled - disabling heavy features');
            return {
              performanceMode: true,
              miniMapEnabled: false,
              showExecutionTimes: false,
              notificationsEnabled: false
            };
          } else {
            logger.info('Performance mode disabled');
            return { performanceMode: false };
          }
        });
      },
      
      toggleShowNodeIds: () => {
        set((state) => ({ showNodeIds: !state.showNodeIds }));
      },
      
      toggleShowExecutionTimes: () => {
        set((state) => ({ showExecutionTimes: !state.showExecutionTimes }));
      },
      
      setActivePanel: (panel) => {
        set({ activePanel: panel });
        
        if (panel) {
          logger.debug(`Opened panel: ${panel}`);
        }
      },
      
      openModal: (modalId) => {
        set({ modalOpen: modalId });
        logger.debug(`Opened modal: ${modalId}`);
      },
      
      closeModal: () => {
        set({ modalOpen: null });
      },
      
      toggleNotifications: () => {
        set((state) => {
          const newState = !state.notificationsEnabled;
          logger.info(`Notifications: ${newState ? 'enabled' : 'disabled'}`);
          return { notificationsEnabled: newState };
        });
      },
      
      setViewMode: (mode) => {
        set({ viewMode: mode });
        logger.info(`View mode changed to: ${mode}`);
      },
      
      setLayoutDirection: (direction) => {
        set({ layoutDirection: direction });
        logger.info(`Layout direction changed to: ${direction}`);
      },
      
      setConnectionMode: (mode) => {
        set({ connectionMode: mode });
        logger.info(`Connection mode changed to: ${mode}`);
      },
      
      resetUISettings: () => {
        set(defaultUIState);
        logger.info('UI settings reset to defaults');
      },
      
      exportUISettings: () => {
        const state = get();
        const settings = {
          darkMode: state.darkMode,
          sidebarOpen: state.sidebarOpen,
          zoomLevel: state.zoomLevel,
          gridEnabled: state.gridEnabled,
          miniMapEnabled: state.miniMapEnabled,
          debugMode: state.debugMode,
          performanceMode: state.performanceMode,
          showNodeIds: state.showNodeIds,
          showExecutionTimes: state.showExecutionTimes,
          notificationsEnabled: state.notificationsEnabled,
          viewMode: state.viewMode,
          layoutDirection: state.layoutDirection,
          connectionMode: state.connectionMode
        };
        
        logger.info('UI settings exported');
        return settings;
      },
      
      importUISettings: (settings) => {
        set((state) => ({
          ...state,
          ...settings
        }));
        
        // Apply dark mode to document
        if (settings.darkMode !== undefined && typeof document !== 'undefined') {
          if (settings.darkMode) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
        
        logger.info('UI settings imported');
      }
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        darkMode: state.darkMode,
        sidebarOpen: state.sidebarOpen,
        gridEnabled: state.gridEnabled,
        miniMapEnabled: state.miniMapEnabled,
        debugMode: state.debugMode,
        performanceMode: state.performanceMode,
        showNodeIds: state.showNodeIds,
        showExecutionTimes: state.showExecutionTimes,
        notificationsEnabled: state.notificationsEnabled,
        viewMode: state.viewMode,
        layoutDirection: state.layoutDirection,
        connectionMode: state.connectionMode
      })
    }
  )
);