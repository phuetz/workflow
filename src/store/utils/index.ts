/**
 * Store Utilities - Barrel Export
 */

export { AtomicLock, atomicLock } from './AtomicLock';
export { SafeLocalStorage } from './SafeLocalStorage';
export { partializeState, onRehydrateStorage } from './persistConfig';

// Browser-compatible UUID generation
export const randomUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
