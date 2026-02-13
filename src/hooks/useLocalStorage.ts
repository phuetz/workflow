/**
 * Local Storage Hook - Type-safe localStorage with SSR support
 */

import { useState, useEffect, useCallback } from 'react';

type SetValue<T> = T | ((prevValue: T) => T);

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options: { syncAcrossTabs?: boolean } = {}
): [T, (value: SetValue<T>) => void, () => void] {
  const { syncAcrossTabs = true } = options;

  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  const setValue = useCallback((value: SetValue<T>) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
      setStoredValue(valueToStore);
      window.dispatchEvent(new StorageEvent('storage', { key, newValue: JSON.stringify(valueToStore) }));
    } catch (error) {
      console.warn(\`Error setting localStorage key "\${key}":\`, error);
    }
  }, [key, storedValue]);

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.warn(\`Error removing localStorage key "\${key}":\`, error);
    }
  }, [key, initialValue]);

  useEffect(() => {
    if (!syncAcrossTabs) return;
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== key) return;
      try {
        setStoredValue(event.newValue ? JSON.parse(event.newValue) : initialValue);
      } catch {}
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, initialValue, syncAcrossTabs]);

  useEffect(() => { setStoredValue(readValue()); }, [readValue]);

  return [storedValue, setValue, removeValue];
}

export function useLocalStorageFlag(key: string, defaultValue = false): [boolean, () => void, (value: boolean) => void] {
  const [value, setValue, removeValue] = useLocalStorage(key, defaultValue);
  const toggle = useCallback(() => setValue((prev) => !prev), [setValue]);
  return [value, toggle, setValue];
}

export function useLocalStorageObject<T extends Record<string, unknown>>(key: string, initialValue: T): [T, (updates: Partial<T>) => void, () => void] {
  const [value, setValue, removeValue] = useLocalStorage<T>(key, initialValue);
  const updateValue = useCallback((updates: Partial<T>) => setValue((prev) => ({ ...prev, ...updates })), [setValue]);
  return [value, updateValue, removeValue];
}
