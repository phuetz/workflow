/**
 * Stream Processor - Handles windowing and stream processing
 */

import { EventEmitter } from 'events';
import { SecureExpressionEngineV2 } from '../../expressions/SecureExpressionEngineV2';
import {
  WindowConfig,
  WindowState,
  IngestionRecord,
  PipelineMetrics,
} from './types';

export class StreamProcessor extends EventEmitter {
  private windowStates: Map<string, WindowState[]> = new Map();
  private windowTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Initialize stream processor for a pipeline
   */
  initialize(pipelineId: string): void {
    this.windowStates.set(pipelineId, []);
  }

  /**
   * Add a record to appropriate window
   */
  async addToWindow(
    pipelineId: string,
    record: IngestionRecord,
    windowConfig: WindowConfig,
    metrics: PipelineMetrics | null
  ): Promise<void> {
    const windows = this.windowStates.get(pipelineId) || [];
    const recordTime = record.timestamp;

    // Find or create appropriate window
    let targetWindow = this.findWindow(windows, windowConfig, recordTime);

    if (!targetWindow) {
      targetWindow = this.createWindow(windowConfig, recordTime);
      windows.push(targetWindow);
      this.windowStates.set(pipelineId, windows);

      if (metrics?.windowStats) {
        metrics.windowStats.activeWindows++;
      }
    }

    // Add record to window
    targetWindow.records.push(record);

    // Update watermark
    if (recordTime > targetWindow.watermark) {
      targetWindow.watermark = recordTime;
    }

    // Check if window should close (for tumbling windows)
    if (windowConfig.type === 'tumbling' && targetWindow.endTime && recordTime >= targetWindow.endTime) {
      await this.closeWindow(pipelineId, targetWindow, windowConfig, metrics);
    }
  }

  /**
   * Start the window timer
   */
  startWindowTimer(
    pipelineId: string,
    config: WindowConfig,
    metrics: PipelineMetrics | null
  ): void {
    const checkInterval = Math.min(config.sizeMs / 4, 1000);

    const timer = setInterval(async () => {
      const windows = this.windowStates.get(pipelineId) || [];
      const now = new Date();

      for (const window of windows) {
        if (!window.isOpen) continue;

        // Check for window timeout
        if (config.type === 'tumbling' && window.endTime && now >= window.endTime) {
          await this.closeWindow(pipelineId, window, config, metrics);
        } else if (config.type === 'session') {
          const gap = now.getTime() - window.watermark.getTime();
          if (gap > (config.sessionGapMs || 30000)) {
            await this.closeWindow(pipelineId, window, config, metrics);
          }
        }
      }

      // Handle late records
      if (config.allowedLatenessMs) {
        const cutoff = new Date(now.getTime() - config.allowedLatenessMs);
        const updatedWindows = windows.filter((window) => {
          if (!window.isOpen && window.endTime && window.endTime < cutoff) {
            return false; // Remove old closed windows
          }
          return true;
        });
        this.windowStates.set(pipelineId, updatedWindows);
      }
    }, checkInterval);

    this.windowTimers.set(pipelineId, timer);
  }

  /**
   * Stop the window timer
   */
  stopWindowTimer(pipelineId: string): void {
    const timer = this.windowTimers.get(pipelineId);
    if (timer) {
      clearInterval(timer);
      this.windowTimers.delete(pipelineId);
    }
  }

  /**
   * Get window states for a pipeline
   */
  getWindowStates(pipelineId: string): WindowState[] {
    return this.windowStates.get(pipelineId) || [];
  }

  /**
   * Get active window count
   */
  getActiveWindowCount(pipelineId: string): number {
    const windows = this.windowStates.get(pipelineId) || [];
    return windows.filter((w) => w.isOpen).length;
  }

  /**
   * Clean up resources for a pipeline
   */
  cleanup(pipelineId: string): void {
    this.stopWindowTimer(pipelineId);
    this.windowStates.delete(pipelineId);
  }

  /**
   * Shutdown the stream processor
   */
  shutdown(): void {
    this.windowTimers.forEach((timer) => {
      clearInterval(timer);
    });
    this.windowTimers.clear();
    this.windowStates.clear();
  }

  private findWindow(
    windows: WindowState[],
    config: WindowConfig,
    recordTime: Date
  ): WindowState | undefined {
    return windows.find((w) => {
      if (!w.isOpen) return false;

      switch (config.type) {
        case 'tumbling':
          return recordTime >= w.startTime && (!w.endTime || recordTime < w.endTime);
        case 'sliding':
          return (
            recordTime >= w.startTime &&
            recordTime <= new Date(w.startTime.getTime() + config.sizeMs)
          );
        case 'session':
          const gap = recordTime.getTime() - w.watermark.getTime();
          return gap <= (config.sessionGapMs || 30000);
        default:
          return false;
      }
    });
  }

  private createWindow(config: WindowConfig, startTime: Date): WindowState {
    const windowId = `window_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    let endTime: Date | undefined;
    if (config.type === 'tumbling') {
      endTime = new Date(startTime.getTime() + config.sizeMs);
    }

    return {
      id: windowId,
      type: config.type,
      startTime,
      endTime,
      records: [],
      isOpen: true,
      watermark: startTime,
    };
  }

  private async closeWindow(
    pipelineId: string,
    window: WindowState,
    config: WindowConfig,
    metrics: PipelineMetrics | null
  ): Promise<void> {
    window.isOpen = false;

    // Perform aggregation
    if (config.aggregation) {
      window.aggregatedValue = this.aggregateWindowRecords(window.records, config.aggregation);
    }

    // Emit window results
    const result = {
      windowId: window.id,
      type: window.type,
      startTime: window.startTime,
      endTime: window.endTime || new Date(),
      recordCount: window.records.length,
      aggregatedValue: window.aggregatedValue,
    };

    this.emit('window:closed', { pipelineId, result });

    // Update metrics
    if (metrics) {
      metrics.recordsProcessed += window.records.length;
      if (metrics.windowStats) {
        metrics.windowStats.closedWindows++;
        metrics.windowStats.activeWindows = Math.max(0, metrics.windowStats.activeWindows - 1);
      }
    }

    // Emit processed records
    for (const record of window.records) {
      this.emit('record:processed', {
        pipelineId,
        record: {
          ...record,
          transformations: [],
          enrichments: [],
          qualityFlags: [],
          processingTimeMs: Date.now() - record.timestamp.getTime(),
          windowId: window.id,
        },
      });
    }
  }

  private aggregateWindowRecords(
    records: IngestionRecord[],
    aggregation: NonNullable<WindowConfig['aggregation']>
  ): any {
    if (records.length === 0) return null;

    const values = records
      .map((r) =>
        aggregation.field ? this.getNestedValue(r.value, aggregation.field) : r.value
      )
      .filter((v) => v !== undefined && v !== null);

    switch (aggregation.type) {
      case 'count':
        return values.length;
      case 'sum':
        return values.reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);
      case 'avg':
        const numValues = values.filter((v) => typeof v === 'number');
        return numValues.length > 0
          ? numValues.reduce((a, b) => a + b, 0) / numValues.length
          : null;
      case 'min':
        return Math.min(...values.filter((v) => typeof v === 'number'));
      case 'max':
        return Math.max(...values.filter((v) => typeof v === 'number'));
      case 'first':
        return values[0];
      case 'last':
        return values[values.length - 1];
      case 'custom':
        if (aggregation.customFn) {
          try {
            const result = SecureExpressionEngineV2.evaluateExpression(
              aggregation.customFn,
              { values, records, Math, Array, Object, String, Number, Boolean, JSON },
              { timeout: 5000 }
            );
            if (!result.success) {
              console.warn('Custom aggregation blocked:', result.error, result.securityBlocks);
              return null;
            }
            return result.value;
          } catch {
            return null;
          }
        }
        return null;
      default:
        return values;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}
