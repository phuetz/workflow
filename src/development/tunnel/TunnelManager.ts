/**
 * Tunnel Manager
 * Core tunnel lifecycle management (create, connect, disconnect, delete)
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import type {
  TunnelConfig,
  TunnelSettings,
  TunnelStatistics,
  TunnelStatus,
  TunnelConnection,
  TunnelProvider,
  RequestInspection
} from './types';
import { RateLimiter } from './TunnelAuth';
import { WebhookValidator, RequestTransformer } from './TunnelAuth';
import { TunnelMetricsService } from './TunnelMetrics';
import {
  LocalTunnelProvider,
  NgrokProvider,
  CloudflareProvider,
  CustomProvider
} from './TunnelConnection';

export class TunnelManager extends EventEmitter {
  private tunnels: Map<string, TunnelConfig> = new Map();
  private connections: Map<string, TunnelConnection> = new Map();
  private providers: Map<string, TunnelProvider> = new Map();
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private validators: Map<string, WebhookValidator> = new Map();
  private transformers: Map<string, RequestTransformer> = new Map();
  private statistics: Map<string, TunnelStatistics> = new Map();
  private requests: Map<string, RequestInspection> = new Map();
  private metricsService: TunnelMetricsService;

  constructor() {
    super();
    this.metricsService = new TunnelMetricsService();
    this.initializeProviders();
  }

  private initializeProviders(): void {
    this.providers.set('local', new LocalTunnelProvider());
    this.providers.set('ngrok', new NgrokProvider());
    this.providers.set('cloudflare', new CloudflareProvider());
    this.providers.set('custom', new CustomProvider());
  }

  public async createTunnel(config: Partial<TunnelConfig>): Promise<TunnelConfig> {
    const tunnelId = crypto.randomBytes(16).toString('hex');

    const tunnel: TunnelConfig = {
      id: tunnelId,
      name: config.name || `tunnel-${tunnelId}`,
      localPort: config.localPort || 3000,
      localHost: config.localHost || 'localhost',
      protocol: config.protocol || 'http',
      metadata: {
        owner: config.metadata?.owner || 'anonymous',
        ...config.metadata
      },
      settings: this.createDefaultSettings(config.settings),
      createdAt: new Date(),
      status: this.createDefaultStatus()
    };

    this.tunnels.set(tunnelId, tunnel);
    this.initializeTunnelServices(tunnelId, tunnel);
    this.initializeStatistics(tunnelId);

    this.emit('tunnelCreated', tunnel);
    return tunnel;
  }

  private createDefaultSettings(overrides?: Partial<TunnelSettings>): TunnelSettings {
    return {
      autoReconnect: true,
      reconnectDelay: 5000,
      maxReconnectAttempts: 10,
      requestTimeout: 30000,
      keepAlive: true,
      keepAliveInterval: 30000,
      compression: true,
      encryption: true,
      logging: {
        enabled: true,
        level: 'info',
        logRequests: true,
        logResponses: true,
        logErrors: true,
        logValidation: true,
        destination: 'console'
      },
      monitoring: {
        enabled: true,
        metricsInterval: 10000,
        healthCheckInterval: 30000,
        alerting: {
          enabled: false,
          rules: [],
          destinations: []
        }
      },
      ...overrides
    };
  }

  private createDefaultStatus(): TunnelStatus {
    return {
      state: 'disconnected',
      bytesIn: 0,
      bytesOut: 0,
      requestsCount: 0,
      errorsCount: 0,
      averageLatency: 0
    };
  }

  private initializeTunnelServices(tunnelId: string, tunnel: TunnelConfig): void {
    if (tunnel.settings.rateLimit) {
      this.rateLimiters.set(tunnelId, new RateLimiter(tunnel.settings.rateLimit));
    }

    if (tunnel.settings.webhookValidation) {
      this.validators.set(tunnelId, new WebhookValidator(tunnel.settings.webhookValidation));
    }

    if (tunnel.settings.requestTransform || tunnel.settings.responseTransform) {
      this.transformers.set(
        tunnelId,
        new RequestTransformer(
          tunnel.settings.requestTransform,
          tunnel.settings.responseTransform
        )
      );
    }
  }

  private initializeStatistics(tunnelId: string): void {
    this.statistics.set(tunnelId, {
      tunnelId,
      startTime: new Date(),
      uptime: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalBytesIn: 0,
      totalBytesOut: 0,
      averageLatency: 0,
      p50Latency: 0,
      p95Latency: 0,
      p99Latency: 0,
      requestsPerSecond: 0,
      errorsPerSecond: 0,
      topPaths: [],
      topMethods: [],
      topStatusCodes: [],
      topUserAgents: [],
      topIPs: []
    });
  }

  public async connectTunnel(tunnelId: string): Promise<string> {
    const tunnel = this.tunnels.get(tunnelId);
    if (!tunnel) {
      throw new Error(`Tunnel ${tunnelId} not found`);
    }

    if (this.connections.has(tunnelId)) {
      throw new Error(`Tunnel ${tunnelId} is already connected`);
    }

    tunnel.status.state = 'connecting';
    this.emit('tunnelConnecting', { tunnelId });

    try {
      const provider = this.selectProvider(tunnel);
      const connection = await provider.connect(tunnel);
      this.connections.set(tunnelId, connection);

      tunnel.status.state = 'connected';
      tunnel.status.publicUrl = connection.publicUrl;
      tunnel.status.connectionTime = new Date();

      this.emit('tunnelConnected', {
        tunnelId,
        publicUrl: connection.publicUrl
      });

      return connection.publicUrl;
    } catch (error) {
      tunnel.status.state = 'error';
      this.emit('tunnelError', { tunnelId, error });
      throw error;
    }
  }

  public async disconnectTunnel(tunnelId: string): Promise<void> {
    const tunnel = this.tunnels.get(tunnelId);
    if (!tunnel) {
      throw new Error(`Tunnel ${tunnelId} not found`);
    }

    const connection = this.connections.get(tunnelId);
    if (!connection) {
      throw new Error(`Tunnel ${tunnelId} is not connected`);
    }

    try {
      await connection.close();
      this.connections.delete(tunnelId);

      tunnel.status.state = 'disconnected';
      tunnel.status.publicUrl = undefined;

      this.emit('tunnelDisconnected', { tunnelId });
    } catch (error) {
      this.emit('tunnelError', { tunnelId, error });
      throw error;
    }
  }

  public async deleteTunnel(tunnelId: string): Promise<void> {
    if (this.connections.has(tunnelId)) {
      await this.disconnectTunnel(tunnelId);
    }

    this.tunnels.delete(tunnelId);
    this.connections.delete(tunnelId);
    this.rateLimiters.delete(tunnelId);
    this.validators.delete(tunnelId);
    this.transformers.delete(tunnelId);
    this.statistics.delete(tunnelId);

    this.requests.forEach((inspection, requestId) => {
      if (inspection.metadata.tunnelId === tunnelId) {
        this.requests.delete(requestId);
      }
    });

    this.emit('tunnelDeleted', { tunnelId });
  }

  public async reconnectTunnel(tunnelId: string): Promise<void> {
    const tunnel = this.tunnels.get(tunnelId);
    if (!tunnel) return;

    tunnel.status.state = 'reconnecting';
    this.emit('tunnelReconnecting', { tunnelId });

    let attempts = 0;
    const maxAttempts = tunnel.settings.maxReconnectAttempts;
    const delay = tunnel.settings.reconnectDelay;

    while (attempts < maxAttempts) {
      attempts++;

      try {
        if (this.connections.has(tunnelId)) {
          await this.disconnectTunnel(tunnelId);
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
        await this.connectTunnel(tunnelId);

        this.emit('tunnelReconnected', { tunnelId });
        return;
      } catch (error) {
        if (attempts >= maxAttempts) {
          tunnel.status.state = 'error';
          this.emit('tunnelReconnectFailed', { tunnelId, error });
          throw error;
        }
      }
    }
  }

  private selectProvider(tunnel: TunnelConfig): TunnelProvider {
    if (tunnel.customDomain) {
      return this.providers.get('custom')!;
    }

    if (tunnel.region) {
      return this.providers.get('cloudflare')!;
    }

    return this.providers.get('ngrok')!;
  }

  public async updateTunnelSettings(
    tunnelId: string,
    settings: Partial<TunnelSettings>
  ): Promise<void> {
    const tunnel = this.tunnels.get(tunnelId);
    if (!tunnel) {
      throw new Error(`Tunnel ${tunnelId} not found`);
    }

    Object.assign(tunnel.settings, settings);

    if (settings.rateLimit) {
      this.rateLimiters.set(tunnelId, new RateLimiter(settings.rateLimit));
    }

    if (settings.webhookValidation) {
      this.validators.set(tunnelId, new WebhookValidator(settings.webhookValidation));
    }

    this.emit('tunnelSettingsUpdated', { tunnelId, settings });
  }

  // Public accessors
  public getTunnels(): TunnelConfig[] {
    return Array.from(this.tunnels.values());
  }

  public getTunnel(tunnelId: string): TunnelConfig | undefined {
    return this.tunnels.get(tunnelId);
  }

  public getConnection(tunnelId: string): TunnelConnection | undefined {
    return this.connections.get(tunnelId);
  }

  public getStatistics(tunnelId: string): TunnelStatistics | undefined {
    return this.statistics.get(tunnelId);
  }

  public getTunnelStatus(tunnelId: string): TunnelStatus | undefined {
    return this.tunnels.get(tunnelId)?.status;
  }

  public getRateLimiter(tunnelId: string): RateLimiter | undefined {
    return this.rateLimiters.get(tunnelId);
  }

  public getValidator(tunnelId: string): WebhookValidator | undefined {
    return this.validators.get(tunnelId);
  }

  public getTransformer(tunnelId: string): RequestTransformer | undefined {
    return this.transformers.get(tunnelId);
  }

  public getRequests(): Map<string, RequestInspection> {
    return this.requests;
  }

  public registerProvider(name: string, provider: TunnelProvider): void {
    this.providers.set(name, provider);
    this.emit('providerRegistered', { name });
  }

  public exportConfiguration(tunnelId: string): string {
    const tunnel = this.tunnels.get(tunnelId);
    if (!tunnel) {
      throw new Error(`Tunnel ${tunnelId} not found`);
    }

    return JSON.stringify(tunnel, null, 2);
  }

  public async importConfiguration(config: string): Promise<TunnelConfig> {
    const tunnelConfig = JSON.parse(config) as TunnelConfig;
    return this.createTunnel(tunnelConfig);
  }
}
