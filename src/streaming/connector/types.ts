/**
 * Types and interfaces for Stream Connector
 */

import type { StreamConfig, StreamEvent, ThroughputMetrics } from '../../types/streaming';

/**
 * Platform-specific client interface
 * All streaming platform clients must implement this interface
 */
export interface PlatformClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  consume(handler: (event: StreamEvent) => Promise<void>): Promise<void>;
  produce(event: StreamEvent): Promise<void>;
  isConnected(): boolean;
  getMetrics(): ThroughputMetrics;
}

/**
 * Batch producer interface for clients that support batch operations
 */
export interface BatchProducer {
  produceBatch(events: StreamEvent[]): Promise<void | string[]>;
}

/**
 * Reconnect configuration
 */
export interface ReconnectConfig {
  maxAttempts: number;
  baseDelay: number;
}

/**
 * Default reconnect configuration
 */
export const DEFAULT_RECONNECT_CONFIG: ReconnectConfig = {
  maxAttempts: 10,
  baseDelay: 1000,
};

/**
 * Create initial throughput metrics
 */
export function createInitialMetrics(): ThroughputMetrics {
  return {
    eventsPerSecond: 0,
    bytesPerSecond: 0,
    recordsIn: 0,
    recordsOut: 0,
  };
}

/**
 * Base reconnect handler mixin for platform clients
 */
export async function handleReconnectWithBackoff(
  reconnectAttempts: number,
  maxReconnectAttempts: number,
  baseReconnectDelay: number,
  platformName: string,
  disconnectFn: () => Promise<void>,
  connectFn: () => Promise<void>,
  setConnected: (connected: boolean) => void,
  incrementAttempts: () => number
): Promise<void> {
  if (reconnectAttempts >= maxReconnectAttempts) {
    setConnected(false);
    throw new Error(`Max reconnect attempts (${maxReconnectAttempts}) exceeded for ${platformName}`);
  }

  const currentAttempt = incrementAttempts();
  const delay = baseReconnectDelay * Math.pow(2, currentAttempt - 1);

  console.log(`${platformName} reconnect attempt ${currentAttempt}/${maxReconnectAttempts} in ${delay}ms`);

  await new Promise((resolve) => setTimeout(resolve, delay));

  try {
    await disconnectFn();
    await connectFn();
  } catch (error) {
    console.error(`${platformName} reconnect failed:`, error);
    if (currentAttempt < maxReconnectAttempts) {
      await handleReconnectWithBackoff(
        currentAttempt,
        maxReconnectAttempts,
        baseReconnectDelay,
        platformName,
        disconnectFn,
        connectFn,
        setConnected,
        incrementAttempts
      );
    } else {
      throw error;
    }
  }
}

// Re-export types from streaming
export type { StreamConfig, StreamEvent, ThroughputMetrics };
