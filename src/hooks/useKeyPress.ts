/**
 * useKeyPress Hook
 * Detects when specific keys are pressed
 */

import { useState, useEffect } from 'react';

export function useKeyPress(
  targetKey: string,
  options: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
  } = {}
): boolean {
  const [keyPressed, setKeyPressed] = useState(false);

  useEffect(() => {
    const downHandler = (event: KeyboardEvent) => {
      // Check if the target key matches
      if (event.key !== targetKey) return;

      // Check modifier keys
      if (options.ctrl && !event.ctrlKey) return;
      if (options.shift && !event.shiftKey) return;
      if (options.alt && !event.altKey) return;
      if (options.meta && !event.metaKey) return;

      setKeyPressed(true);
    };

    const upHandler = (event: KeyboardEvent) => {
      if (event.key === targetKey) {
        setKeyPressed(false);
      }
    };

    window.addEventListener('keydown', downHandler);
    window.addEventListener('keyup', upHandler);

    return () => {
      window.removeEventListener('keydown', downHandler);
      window.removeEventListener('keyup', upHandler);
    };
  }, [targetKey, options.ctrl, options.shift, options.alt, options.meta]);

  return keyPressed;
}

// Common keyboard shortcuts
export function useCtrlS(callback: () => void): void {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        callback();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [callback]);
}

export function useEscape(callback: () => void): void {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        callback();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [callback]);
}
