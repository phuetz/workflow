/**
 * useConnectionHandlers
 *
 * Handles connection start/end events for proximity connect feature.
 * When a user drags a connection and drops it on empty space,
 * opens the quick search to create a connected node.
 */

import { useCallback } from 'react';
import { usePanels } from '../../context';
import { notificationService } from '../../../../../services/NotificationService';

export interface UseConnectionHandlersOptions {
  /** Reference to pending connection state */
  pendingConnectionRef: React.MutableRefObject<{ nodeId: string; handleId: string | null } | null>;
  /** Reference to the ReactFlow wrapper */
  reactFlowWrapper: React.RefObject<HTMLDivElement>;
  /** Project screen coordinates to flow coordinates */
  project: (position: { x: number; y: number }) => { x: number; y: number };
}

export interface UseConnectionHandlersReturn {
  onConnectStart: (
    event: React.MouseEvent | React.TouchEvent,
    params: { nodeId: string | null; handleId: string | null }
  ) => void;
  onConnectEnd: (event: MouseEvent | TouchEvent) => void;
}

/**
 * Hook for handling connection events with proximity connect
 */
export function useConnectionHandlers(options: UseConnectionHandlersOptions): UseConnectionHandlersReturn {
  const { pendingConnectionRef, reactFlowWrapper, project } = options;

  const { openPanel, setQuickSearchPosition } = usePanels();

  /**
   * Track where connection starts
   */
  const onConnectStart = useCallback(
    (
      _event: React.MouseEvent | React.TouchEvent,
      { nodeId, handleId }: { nodeId: string | null; handleId: string | null }
    ) => {
      if (nodeId) {
        pendingConnectionRef.current = { nodeId, handleId };
      }
    },
    [pendingConnectionRef]
  );

  /**
   * Handle connection end - proximity connect
   * Opens quick search when dropping connection on empty space
   */
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement;
      const isOnPane = target.classList.contains('react-flow__pane');

      if (isOnPane && pendingConnectionRef.current) {
        const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
        if (reactFlowBounds) {
          const clientX = 'clientX' in event ? event.clientX : event.touches[0].clientX;
          const clientY = 'clientY' in event ? event.clientY : event.touches[0].clientY;

          const position = project({
            x: clientX - reactFlowBounds.left,
            y: clientY - reactFlowBounds.top,
          });

          // Open quick search at drop position
          setQuickSearchPosition({ x: position.x, y: position.y });
          openPanel('nodeSearch');

          // Store connection source for auto-connect after node creation
          localStorage.setItem('pendingConnection', JSON.stringify(pendingConnectionRef.current));

          notificationService.info('Quick Connect', 'Select a node to connect');
        }
      }

      pendingConnectionRef.current = null;
    },
    [project, reactFlowWrapper, pendingConnectionRef, setQuickSearchPosition, openPanel]
  );

  return {
    onConnectStart,
    onConnectEnd,
  };
}

export default useConnectionHandlers;
