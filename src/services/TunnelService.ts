/**
 * Tunnel Service
 * Creates public tunnels for webhook testing (like ngrok/localtunnel)
 */

import { EventEmitter } from 'events';
import { logger } from './SimpleLogger';

interface TunnelOptions {
  port: number;
  subdomain?: string;
  host?: string;
}

interface TunnelInfo {
  url: string;
  port: number;
  subdomain?: string;
  createdAt: Date;
}

export class TunnelService extends EventEmitter {
  private tunnel: unknown = null;
  private tunnelInfo: TunnelInfo | null = null;
  private isConnected: boolean = false;

  constructor() {
    super();
  }

  /**
   * Create a public tunnel
   */
  async create(options: TunnelOptions): Promise<string> {
    const { port, subdomain, host = 'localhost' } = options;

    try {
      // Try localtunnel first (most common)
      const url = await this.createLocalTunnel(port, subdomain);

      this.tunnelInfo = {
        url,
        port,
        subdomain,
        createdAt: new Date(),
      };

      this.isConnected = true;
      this.emit('connected', this.tunnelInfo);

      return url;
    } catch (error) {
      // Fallback to alternative methods
      logger.warn('localtunnel failed, trying alternatives...');

      try {
        const url = await this.createNgrokTunnel(port);

        this.tunnelInfo = {
          url,
          port,
          createdAt: new Date(),
        };

        this.isConnected = true;
        this.emit('connected', this.tunnelInfo);

        return url;
      } catch (ngrokError) {
        throw new Error(
          'Failed to create tunnel. Please install localtunnel (npm i -g localtunnel) or ngrok.'
        );
      }
    }
  }

  /**
   * Create tunnel using localtunnel
   */
  private async createLocalTunnel(port: number, subdomain?: string): Promise<string> {
    try {
      // Dynamic import to avoid bundling issues
      const localtunnel = await import('localtunnel' as string) as {
        default: (options: { port: number; subdomain?: string }) => Promise<{
          url: string;
          on: (event: string, callback: (...args: unknown[]) => void) => void;
        }>;
      };

      const options: { port: number; subdomain?: string } = { port };
      if (subdomain) {
        options.subdomain = subdomain;
      }

      const tunnel = await localtunnel.default(options);
      this.tunnel = tunnel;

      // Handle tunnel events
      tunnel.on('close', () => {
        this.isConnected = false;
        this.emit('disconnected');
        logger.info('Tunnel closed');
      });

      tunnel.on('error', (err: Error) => {
        this.emit('error', err);
        logger.error('Tunnel error:', err);
      });

      return tunnel.url;
    } catch (error) {
      throw new Error('localtunnel not available');
    }
  }

  /**
   * Create tunnel using ngrok
   */
  private async createNgrokTunnel(port: number): Promise<string> {
    try {
      // Dynamic import
      const ngrok = await import('ngrok' as string) as {
        connect: (options: { addr: number; proto: string }) => Promise<string>;
        disconnect: () => Promise<void>;
      };

      const url = await ngrok.connect({
        addr: port,
        proto: 'http',
      });

      this.tunnel = ngrok;

      return url;
    } catch (error) {
      throw new Error('ngrok not available');
    }
  }

  /**
   * Close the tunnel
   */
  async close(): Promise<void> {
    if (!this.tunnel) return;

    try {
      if (typeof (this.tunnel as { close?: () => void }).close === 'function') {
        (this.tunnel as { close: () => void }).close();
      } else if (typeof (this.tunnel as { disconnect?: () => Promise<void> }).disconnect === 'function') {
        await (this.tunnel as { disconnect: () => Promise<void> }).disconnect();
      }
    } catch (error) {
      logger.error('Error closing tunnel:', error);
    }

    this.tunnel = null;
    this.tunnelInfo = null;
    this.isConnected = false;
    this.emit('disconnected');
  }

  /**
   * Get current tunnel info
   */
  getInfo(): TunnelInfo | null {
    return this.tunnelInfo;
  }

  /**
   * Check if tunnel is connected
   */
  isActive(): boolean {
    return this.isConnected;
  }

  /**
   * Get webhook URL for the tunnel
   */
  getWebhookUrl(path: string = '/webhook'): string | null {
    if (!this.tunnelInfo) return null;
    return `${this.tunnelInfo.url}${path}`;
  }
}

// Singleton instance for easy access
let tunnelInstance: TunnelService | null = null;

export function getTunnelService(): TunnelService {
  if (!tunnelInstance) {
    tunnelInstance = new TunnelService();
  }
  return tunnelInstance;
}

export default TunnelService;
