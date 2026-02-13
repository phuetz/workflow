/**
 * Linear-Style Layout Component
 * Unified layout combining header, sidebar, and main content area
 */

import React, { useState, useCallback, useEffect } from 'react';
import { LinearHeader } from './LinearHeader';
import { LinearSidebar } from './LinearSidebar';
import { CommandPalette } from '../ui/CommandPalette';

// ============================================================================
// Types
// ============================================================================

interface LinearLayoutProps {
  children: React.ReactNode;
  onExecute?: () => void;
  showExecuteButton?: boolean;
}

// ============================================================================
// Main Layout Component
// ============================================================================

export const LinearLayout: React.FC<LinearLayoutProps> = ({
  children,
  onExecute,
  showExecuteButton = false,
}) => {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Handle command palette toggle
  const handleOpenCommandPalette = useCallback(() => {
    setCommandPaletteOpen(true);
  }, []);

  const handleCloseCommandPalette = useCallback(() => {
    setCommandPaletteOpen(false);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close command palette
      if (e.key === 'Escape' && commandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen]);

  return (
    <div className="h-screen flex flex-col bg-[var(--linear-bg-primary)] text-[var(--linear-text-primary)]">
      {/* Header */}
      <LinearHeader
        onExecute={showExecuteButton ? onExecute : undefined}
        onOpenCommandPalette={handleOpenCommandPalette}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <LinearSidebar />

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-[var(--linear-bg-primary)]">
          {children}
        </main>
      </div>

      {/* Command Palette */}
      {commandPaletteOpen && (
        <CommandPalette
          isOpen={commandPaletteOpen}
          onClose={handleCloseCommandPalette}
        />
      )}
    </div>
  );
};

export default LinearLayout;
