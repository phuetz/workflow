/**
 * Stream Join
 *
 * Join operations for stream processing:
 * - Stream-stream joins (inner, left, right, full)
 * - Stream-table joins (enrichment)
 * - Window-based joins
 * - Temporal joins with time bounds
 */

import { EventEmitter } from 'events';
import type {
  StreamEvent,
  StreamJoinConfig,
  JoinedEvent,
  WindowConfig,
  Window,
} from '../types/streaming';

export class StreamJoin extends EventEmitter {
  private leftBuffer = new Map<string, StreamEvent[]>();
  private rightBuffer = new Map<string, StreamEvent[]>();
  private tableData = new Map<string, any>();

  /**
   * Join two streams
   */
  async joinStreams(
    leftEvents: StreamEvent[],
    rightEvents: StreamEvent[],
    config: StreamJoinConfig
  ): Promise<JoinedEvent[]> {
    // Add events to buffers by join key
    this.addToBuffer(leftEvents, config.leftKey, this.leftBuffer);
    this.addToBuffer(rightEvents, config.rightKey, this.rightBuffer);

    // Perform join based on type
    const joined: JoinedEvent[] = [];

    switch (config.type) {
      case 'inner':
        joined.push(...this.performInnerJoin(config));
        break;

      case 'left':
        joined.push(...this.performLeftJoin(config));
        break;

      case 'right':
        joined.push(...this.performRightJoin(config));
        break;

      case 'full':
        joined.push(...this.performFullJoin(config));
        break;
    }

    // Clean old entries based on window
    this.cleanBuffers(config.window);

    return joined;
  }

  /**
   * Join stream with static table (enrichment)
   */
  async enrichStream(
    events: StreamEvent[],
    table: Map<string, any>,
    streamKey: string,
    tableKey: string
  ): Promise<JoinedEvent[]> {
    this.tableData = table;

    const enriched: JoinedEvent[] = [];

    for (const event of events) {
      const keyValue = this.extractKeyValue(event, streamKey);
      const tableValue = this.tableData.get(keyValue);

      if (tableValue) {
        enriched.push({
          left: event,
          right: { key: keyValue, value: tableValue, timestamp: event.timestamp },
          joinKey: keyValue,
          timestamp: event.timestamp,
        });
      }
    }

    return enriched;
  }

  /**
   * Clear buffers
   */
  clear(): void {
    this.leftBuffer.clear();
    this.rightBuffer.clear();
    this.tableData.clear();
  }

  // ============================================================================
  // Join Implementations
  // ============================================================================

  private performInnerJoin(config: StreamJoinConfig): JoinedEvent[] {
    const joined: JoinedEvent[] = [];

    for (const [key, leftEvents] of this.leftBuffer) {
      const rightEvents = this.rightBuffer.get(key);

      if (rightEvents) {
        // Cartesian product within window
        for (const left of leftEvents) {
          for (const right of rightEvents) {
            if (this.withinWindow(left, right, config.window)) {
              joined.push({
                left,
                right,
                joinKey: key,
                timestamp: Math.max(left.timestamp, right.timestamp),
              });
            }
          }
        }
      }
    }

    return joined;
  }

  private performLeftJoin(config: StreamJoinConfig): JoinedEvent[] {
    const joined: JoinedEvent[] = [];

    for (const [key, leftEvents] of this.leftBuffer) {
      const rightEvents = this.rightBuffer.get(key);

      for (const left of leftEvents) {
        if (rightEvents) {
          let matched = false;
          for (const right of rightEvents) {
            if (this.withinWindow(left, right, config.window)) {
              joined.push({
                left,
                right,
                joinKey: key,
                timestamp: Math.max(left.timestamp, right.timestamp),
              });
              matched = true;
            }
          }

          if (!matched) {
            // Left event with no match
            joined.push({
              left,
              right: undefined,
              joinKey: key,
              timestamp: left.timestamp,
            });
          }
        } else {
          // Left event with no match
          joined.push({
            left,
            right: undefined,
            joinKey: key,
            timestamp: left.timestamp,
          });
        }
      }
    }

    return joined;
  }

  private performRightJoin(config: StreamJoinConfig): JoinedEvent[] {
    const joined: JoinedEvent[] = [];

    for (const [key, rightEvents] of this.rightBuffer) {
      const leftEvents = this.leftBuffer.get(key);

      for (const right of rightEvents) {
        if (leftEvents) {
          let matched = false;
          for (const left of leftEvents) {
            if (this.withinWindow(left, right, config.window)) {
              joined.push({
                left,
                right,
                joinKey: key,
                timestamp: Math.max(left.timestamp, right.timestamp),
              });
              matched = true;
            }
          }

          if (!matched) {
            joined.push({
              left: undefined,
              right,
              joinKey: key,
              timestamp: right.timestamp,
            });
          }
        } else {
          joined.push({
            left: undefined,
            right,
            joinKey: key,
            timestamp: right.timestamp,
          });
        }
      }
    }

    return joined;
  }

  private performFullJoin(config: StreamJoinConfig): JoinedEvent[] {
    const joined: JoinedEvent[] = [];
    const processedRightKeys = new Set<string>();

    // Process left side
    for (const [key, leftEvents] of this.leftBuffer) {
      const rightEvents = this.rightBuffer.get(key);

      for (const left of leftEvents) {
        if (rightEvents) {
          let matched = false;
          for (const right of rightEvents) {
            if (this.withinWindow(left, right, config.window)) {
              joined.push({
                left,
                right,
                joinKey: key,
                timestamp: Math.max(left.timestamp, right.timestamp),
              });
              matched = true;
            }
          }

          if (!matched) {
            joined.push({
              left,
              right: undefined,
              joinKey: key,
              timestamp: left.timestamp,
            });
          }

          processedRightKeys.add(key);
        } else {
          joined.push({
            left,
            right: undefined,
            joinKey: key,
            timestamp: left.timestamp,
          });
        }
      }
    }

    // Process unmatched right side
    for (const [key, rightEvents] of this.rightBuffer) {
      if (!processedRightKeys.has(key)) {
        for (const right of rightEvents) {
          joined.push({
            left: undefined,
            right,
            joinKey: key,
            timestamp: right.timestamp,
          });
        }
      }
    }

    return joined;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private addToBuffer(
    events: StreamEvent[],
    keyField: string,
    buffer: Map<string, StreamEvent[]>
  ): void {
    for (const event of events) {
      const key = this.extractKeyValue(event, keyField);

      if (!buffer.has(key)) {
        buffer.set(key, []);
      }

      buffer.get(key)!.push(event);
    }
  }

  private extractKeyValue(event: StreamEvent, keyField: string): string {
    const value = this.getNestedValue(event.value, keyField);
    return String(value);
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private withinWindow(
    left: StreamEvent,
    right: StreamEvent,
    window: WindowConfig
  ): boolean {
    const timeDiff = Math.abs(left.timestamp - right.timestamp);
    return timeDiff <= window.size;
  }

  private cleanBuffers(window: WindowConfig): void {
    const now = Date.now();
    const cutoff = now - window.size;

    this.cleanBuffer(this.leftBuffer, cutoff);
    this.cleanBuffer(this.rightBuffer, cutoff);
  }

  private cleanBuffer(buffer: Map<string, StreamEvent[]>, cutoff: number): void {
    for (const [key, events] of buffer) {
      const filtered = events.filter((e) => e.timestamp >= cutoff);

      if (filtered.length === 0) {
        buffer.delete(key);
      } else {
        buffer.set(key, filtered);
      }
    }
  }
}
