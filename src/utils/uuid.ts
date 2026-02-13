/**
 * UUID Generation Utility
 * Cross-platform UUID generation
 */

/**
 * Generate a UUID v4
 * Works in both Node.js and browser environments
 */
export function generateUUID(): string {
  // Try Node.js crypto first
  if (typeof globalThis !== 'undefined' && (globalThis as any).crypto?.randomUUID) {
    return (globalThis as any).crypto.randomUUID();
  }

  // Try require crypto for Node.js
  try {
    const crypto = require('crypto');
    if (crypto && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch (e) {
    // Continue to fallback
  }

  // Fallback to manual UUID generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
