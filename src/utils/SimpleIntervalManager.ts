/**
 * Simple Interval Manager - No dependencies
 * Used to avoid circular dependencies during bundling
 */

interface ManagedInterval {
  id: ReturnType<typeof setInterval>;
  name: string;
  interval: number;
}

class SimpleIntervalManager {
  private intervals: Map<string, ManagedInterval> = new Map();

  create(name: string, callback: () => void, interval: number, _category?: string): ReturnType<typeof setInterval> {
    // Clear existing interval with same name
    this.clear(name);

    const id = setInterval(callback, interval);
    this.intervals.set(name, { id, name, interval });
    return id;
  }

  clear(name: string): void {
    const managed = this.intervals.get(name);
    if (managed) {
      clearInterval(managed.id);
      this.intervals.delete(name);
    }
  }

  clearAll(): void {
    for (const [name] of this.intervals) {
      this.clear(name);
    }
  }

  getActive(): string[] {
    return Array.from(this.intervals.keys());
  }
}

export const intervalManager = new SimpleIntervalManager();
export const createInterval = intervalManager.create.bind(intervalManager);
export const clearIntervalById = intervalManager.clear.bind(intervalManager);
export const clearAllIntervals = intervalManager.clearAll.bind(intervalManager);

export default intervalManager;
