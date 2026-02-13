/**
 * Connection Status Service
 * Provides real-time online/offline status detection
 */

import { realMetricsCollector } from './RealMetricsCollector';
import { logger } from './LoggingService';
import { ConfigHelpers } from '../config/environment';

export type ConnectionStatus = 'online' | 'offline' | 'connecting' | 'disconnected';

export interface ConnectionInfo {
  status: ConnectionStatus;
  lastConnected: Date | null;
  latency: number;
  downlinkSpeed: number;
  isSlowConnection: boolean;
  connectionType: string;
}

export class ConnectionStatusService {
  private status: ConnectionStatus = 'online';
  private listeners: Set<(info: ConnectionInfo) => void> = new Set();
  private pingInterval: NodeJS.Timeout | null = null;
  private connectionInfo: ConnectionInfo;
  private serverUrl: string = '/api/health';

  constructor() {
    this.connectionInfo = {
      status: 'online',
      lastConnected: new Date(),
      latency: 0,
      downlinkSpeed: 0,
      isSlowConnection: false,
      connectionType: 'unknown'
    };

    this.initializeConnectionMonitoring();
  }

  private initializeConnectionMonitoring(): void {
    // Listen to browser online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
      
      // Get connection info if available
      this.updateConnectionInfo();
      
      // Start periodic health checks
      this.startHealthChecks();
    }
  }

  private handleOnline(): void {
    this.setStatus('connecting');
    this.verifyConnection();
  }

  private handleOffline(): void {
    this.setStatus('offline');
  }

  private async verifyConnection(): Promise<void> {
    try {
      
      // Try to fetch a simple resource to test connectivity
      // If backend health endpoint doesn't exist, fallback to a simple request
      await fetch('/api/health', {
        method: 'GET',
        cache: 'no-cache',
        signal: AbortSignal.timeout(ConfigHelpers.getTimeout('connectionStatus'))
      }).catch(async () => {
        // Fallback: try to fetch the current page or a static resource
        return await fetch(window.location.origin + '/manifest.json', {
          method: 'GET',
          cache: 'no-cache',
          signal: AbortSignal.timeout(ConfigHelpers.getTimeout('connectionStatus'))
        });
      });
      
      
      if (response.ok) {
        this.connectionInfo.latency = latency;
        this.connectionInfo.lastConnected = new Date();
        this.setStatus('online');
      } else {
        this.setStatus('disconnected');
      }
    } catch (error) {
      // If both primary and fallback requests fail, check navigator.onLine
      if (navigator.onLine) {
        // Browser thinks we're online but requests are failing
        this.setStatus('disconnected');
        this.connectionInfo.latency = 9999; // High latency indicates connection issues
      } else {
        // Browser confirms we're offline
        this.setStatus('offline');
      }
    }
  }

  private updateConnectionInfo(): void {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        this.connectionInfo.downlinkSpeed = connection.downlink || 0;
        this.connectionInfo.connectionType = connection.effectiveType || 'unknown';
        this.connectionInfo.isSlowConnection = connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g';
      }
    }
  }

  private startHealthChecks(): void {
    // Check connection every 30 seconds
    this.pingInterval = setInterval(async () => {
      if (navigator.onLine) {
        await this.verifyConnection();
      }
      this.updateConnectionInfo();
    }, 30000);
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.connectionInfo.status = status;
      
      // Record status change as user activity
      realMetricsCollector.recordUserActivity(`connection_status_changed_${previousStatus}_to_${status}`, 'connection_service');
      
      // Notify all listeners
      this.listeners.forEach(listener => {
        try {
          listener({ ...this.connectionInfo });
        } catch (error) {
          logger.error('Error in connection status listener:', error);
        }
      });
    }
  }

  // Public API
  getConnectionInfo(): ConnectionInfo {
    return { ...this.connectionInfo };
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  isOnline(): boolean {
    return this.status === 'online';
  }

  isOffline(): boolean {
    return this.status === 'offline';
  }

  getLatency(): number {
    return this.connectionInfo.latency;
  }

  getStatusText(): string {
    switch (this.status) {
      case 'online':
        return 'En ligne';
      case 'offline':
        return 'Hors ligne';
      case 'connecting':
        return 'Connexion...';
      case 'disconnected':
        return 'Déconnecté';
      default:
        return 'Inconnu';
    }
  }

  getStatusColor(): string {
    switch (this.status) {
      case 'online':
        return 'bg-green-500';
      case 'offline':
        return 'bg-red-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'disconnected':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  }

  // Event subscription
  subscribe(listener: (info: ConnectionInfo) => void): () => void {
    this.listeners.add(listener);
    
    // Immediately call with current status
    listener({ ...this.connectionInfo });
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Test connection manually
  async testConnection(): Promise<boolean> {
    try {
      await this.verifyConnection();
      return this.isOnline();
    } catch (error) {
      return false;
    }
  }

  // Get connection quality
  getConnectionQuality(): 'excellent' | 'good' | 'fair' | 'poor' | 'offline' {
    if (this.status === 'offline') return 'offline';
    
    if (latency === 0) return 'good'; // No measurement yet
    if (latency < 100) return 'excellent';
    if (latency < 300) return 'good';
    if (latency < 1000) return 'fair';
    return 'poor';
  }

  // Cleanup
  destroy(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline.bind(this));
      window.removeEventListener('offline', this.handleOffline.bind(this));
    }
    
    this.listeners.clear();
  }
}

// Singleton instance
export const connectionStatusService = new ConnectionStatusService();