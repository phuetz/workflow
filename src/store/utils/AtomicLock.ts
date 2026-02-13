/**
 * Atomic Lock Utility
 * Provides thread-safe locking mechanism for concurrent state operations
 */

export class AtomicLock {
  private locks = new Map<string, Promise<void>>();
  private globalLock: { locked: boolean; waiters: Array<() => void> } = {
    locked: false,
    waiters: []
  };

  async acquire(key: string = 'global'): Promise<() => void> {
    const existingLock = this.locks.get(key);
    if (existingLock) {
      await existingLock;
    }

    return new Promise((resolve) => {
      if (key === 'global') {
        if (!this.globalLock.locked) {
          this.globalLock.locked = true;
          resolve(() => {
            this.globalLock.locked = false;
            const waiter = this.globalLock.waiters.shift();
            if (waiter) waiter();
          });
        } else {
          this.globalLock.waiters.push(() => {
            this.globalLock.locked = true;
            resolve(() => {
              this.globalLock.locked = false;
              const waiter = this.globalLock.waiters.shift();
              if (waiter) waiter();
            });
          });
        }
      } else {
        const lockPromise = new Promise<void>((lockResolve) => {
          resolve(() => {
            lockResolve();
            this.locks.delete(key);
          });
        });
        this.locks.set(key, lockPromise);
      }
    });
  }

  isLocked(key: string = 'global'): boolean {
    return key === 'global' ? this.globalLock.locked : this.locks.has(key);
  }
}

// Singleton instance for global use
export const atomicLock = new AtomicLock();
