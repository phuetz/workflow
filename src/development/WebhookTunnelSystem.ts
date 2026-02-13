/**
 * Webhook Tunnel System - Facade re-exporting from modular components
 * See ./tunnel/ directory for implementation details
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import {
  TunnelManager,
  TunnelMetricsService,
  RequestForwarder,
  RateLimiter,
  WebhookValidator,
  RequestTransformer
} from './tunnel';

export * from './tunnel/types';
export { TunnelManager, RateLimiter, WebhookValidator, RequestTransformer } from './tunnel';

import type {
  TunnelConfig,
  TunnelSettings,
  TunnelStatistics,
  TunnelStatus,
  TunnelConnection,
  TunnelProvider,
  TunnelRequest,
  TunnelResponse,
  RequestInspection,
  ReplayConfig
} from './tunnel/types';

/** Main facade class delegating to modular components */
export class WebhookTunnelSystem extends EventEmitter {
  private static instance: WebhookTunnelSystem;

  private tunnelManager: TunnelManager;
  private metricsService: TunnelMetricsService;
  private requestForwarder: RequestForwarder;
  private healthCheckInterval?: ReturnType<typeof setInterval>;

  private constructor() {
    super();
    this.tunnelManager = new TunnelManager();
    this.metricsService = new TunnelMetricsService();
    this.requestForwarder = new RequestForwarder();
    this.setupEventForwarding();
    this.startHealthCheck();
  }

  public static getInstance(): WebhookTunnelSystem {
    if (!WebhookTunnelSystem.instance) {
      WebhookTunnelSystem.instance = new WebhookTunnelSystem();
    }
    return WebhookTunnelSystem.instance;
  }

  private setupEventForwarding(): void {
    ['tunnelCreated', 'tunnelConnecting', 'tunnelConnected', 'tunnelDisconnected',
     'tunnelDeleted', 'tunnelError', 'tunnelReconnecting', 'tunnelReconnected',
     'tunnelReconnectFailed', 'tunnelSettingsUpdated', 'providerRegistered'
    ].forEach((event) => this.tunnelManager.on(event, (data) => this.emit(event, data)));
  }

  // Tunnel Management
  public async createTunnel(config: Partial<TunnelConfig>): Promise<TunnelConfig> {
    const tunnel = await this.tunnelManager.createTunnel(config);
    this.metricsService.initializeTunnel(tunnel.id);
    return tunnel;
  }

  public async connectTunnel(tunnelId: string): Promise<string> {
    const publicUrl = await this.tunnelManager.connectTunnel(tunnelId);
    const connection = this.tunnelManager.getConnection(tunnelId);
    if (connection) {
      this.setupConnectionHandlers(tunnelId, connection);
    }
    this.metricsService.logging.log(
      'info',
      `Tunnel ${tunnelId} connected: ${publicUrl}`
    );
    return publicUrl;
  }

  public async disconnectTunnel(tunnelId: string): Promise<void> {
    await this.tunnelManager.disconnectTunnel(tunnelId);
    this.metricsService.logging.log('info', `Tunnel ${tunnelId} disconnected`);
  }

  public async deleteTunnel(tunnelId: string): Promise<void> {
    await this.tunnelManager.deleteTunnel(tunnelId);
    this.metricsService.cleanupTunnel(tunnelId);
    this.emit('historyCleared', { tunnelId });
  }

  // Connection Handlers
  private setupConnectionHandlers(
    tunnelId: string,
    connection: TunnelConnection
  ): void {
    if (connection.websocket) {
      connection.websocket.on('message', async (data: any) => {
        try {
          const request = this.requestForwarder.parseIncomingRequest(data);
          request.tunnelId = tunnelId;
          await this.handleIncomingRequest(tunnelId, request);
        } catch (error) {
          this.handleRequestError(tunnelId, error as Error);
        }
      });

      connection.websocket.on('error', (error: Error) => {
        this.handleConnectionError(tunnelId, error);
      });

      connection.websocket.on('close', () => {
        this.handleConnectionClose(tunnelId);
      });
    }

    if (connection.httpServer) {
      connection.httpServer.on('request', async (req, res) => {
        const request = await this.requestForwarder.createTunnelRequest(
          tunnelId,
          req
        );
        const response = await this.handleIncomingRequest(tunnelId, request);
        this.requestForwarder.sendHttpResponse(res, response);
      });
    }
  }

  private async handleIncomingRequest(
    tunnelId: string,
    request: TunnelRequest
  ): Promise<TunnelResponse> {
    const tunnel = this.tunnelManager.getTunnel(tunnelId)!;
    const startTime = Date.now();

    this.emit('requestReceived', { tunnelId, request });
    this.metricsService.logging.logRequest(tunnelId, request);
    this.metricsService.statistics.recordRequest(
      tunnelId,
      request.body?.length || 0,
      true
    );

    tunnel.status.requestsCount++;
    tunnel.status.lastActivity = new Date();

    try {
      // Rate limiting
      const rateLimiter = this.tunnelManager.getRateLimiter(tunnelId);
      if (rateLimiter && !rateLimiter.checkLimit(request)) {
        throw new Error('Rate limit exceeded');
      }

      // Webhook validation
      const validator = this.tunnelManager.getValidator(tunnelId);
      let validationResult;
      if (validator) {
        validationResult = validator.validate(request);
        if (!validationResult.valid) {
          throw new Error(
            `Webhook validation failed: ${validationResult.errors?.join(', ')}`
          );
        }
      }

      // Request transformation
      const transformer = this.tunnelManager.getTransformer(tunnelId);
      let transformedRequest = request;
      if (transformer) {
        transformedRequest = await transformer.transformRequest(request);
      }

      // Forward to local server
      const response = await this.requestForwarder.forwardToLocal(
        tunnel,
        transformedRequest
      );

      // Response transformation
      let transformedResponse = response;
      if (transformer) {
        transformedResponse = await transformer.transformResponse(response);
      }

      const duration = Date.now() - startTime;
      transformedResponse.duration = duration;

      // Update statistics
      this.metricsService.statistics.recordResponse(
        tunnelId,
        transformedResponse.body?.length || 0
      );
      this.metricsService.statistics.updateLatency(tunnelId, duration);

      // Store request inspection
      this.metricsService.history.storeInspection(
        tunnelId,
        request,
        transformedResponse,
        { validation: validationResult, timing: { total: duration } }
      );

      this.emit('responseSent', { tunnelId, response: transformedResponse });
      this.metricsService.logging.logResponse(tunnelId, transformedResponse);

      return transformedResponse;
    } catch (error) {
      const errorResponse: TunnelResponse = {
        id: crypto.randomBytes(16).toString('hex'),
        requestId: request.id,
        statusCode: 500,
        statusMessage: 'Internal Server Error',
        headers: { 'Content-Type': 'text/plain' },
        body: Buffer.from((error as Error).message),
        timestamp: new Date(),
        duration: Date.now() - startTime,
        size: 0
      };

      tunnel.status.errorsCount++;
      this.emit('requestError', { tunnelId, request, error });
      this.metricsService.logging.logError(tunnelId, error as Error);

      return errorResponse;
    }
  }

  // Error Handlers
  private handleConnectionError(tunnelId: string, error: Error): void {
    const tunnel = this.tunnelManager.getTunnel(tunnelId);
    if (tunnel) {
      tunnel.status.state = 'error';
      tunnel.status.errorsCount++;
    }

    this.emit('connectionError', { tunnelId, error });
    this.metricsService.logging.logError(tunnelId, error);
  }

  private handleConnectionClose(tunnelId: string): void {
    const tunnel = this.tunnelManager.getTunnel(tunnelId);
    if (tunnel) {
      tunnel.status.state = 'disconnected';
      tunnel.status.publicUrl = undefined;
    }

    this.emit('connectionClosed', { tunnelId });
  }

  private handleRequestError(tunnelId: string, error: Error): void {
    const tunnel = this.tunnelManager.getTunnel(tunnelId);
    if (tunnel) {
      tunnel.status.errorsCount++;
    }

    this.emit('requestError', { tunnelId, error });
    this.metricsService.logging.logError(tunnelId, error);
  }

  // Health Check
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      this.tunnelManager.getTunnels().forEach((tunnel) => {
        if (tunnel.status.state === 'connected') {
          const connection = this.tunnelManager.getConnection(tunnel.id);
          if (connection) {
            this.performHealthCheck(tunnel.id, connection);
          }
        }
      });
    }, 30000);
  }

  private async performHealthCheck(
    tunnelId: string,
    connection: TunnelConnection
  ): Promise<void> {
    try {
      if (connection.websocket) {
        connection.websocket.ping();
      }
      this.emit('healthCheckSuccess', { tunnelId });
    } catch (error) {
      this.emit('healthCheckFailed', { tunnelId, error });
      const tunnel = this.tunnelManager.getTunnel(tunnelId);
      if (tunnel?.settings.autoReconnect) {
        await this.tunnelManager.reconnectTunnel(tunnelId);
      }
    }
  }

  // Inspection & Replay
  public getRequestHistory(
    tunnelId?: string,
    filter?: {
      startTime?: Date;
      endTime?: Date;
      method?: string;
      path?: string;
      statusCode?: number;
      limit?: number;
    }
  ): RequestInspection[] {
    return this.metricsService.history.getHistory(tunnelId, filter);
  }

  public async replayRequest(
    requestId: string,
    config?: ReplayConfig
  ): Promise<TunnelResponse> {
    const inspection = this.metricsService.history.getInspection(requestId);
    if (!inspection) {
      throw new Error(`Request ${requestId} not found`);
    }

    let request = { ...inspection.request };

    if (config?.modifyRequest) {
      request = config.modifyRequest(request);
    }

    if (config?.delay) {
      await new Promise((resolve) => setTimeout(resolve, config.delay));
    }

    const response = await this.handleIncomingRequest(
      inspection.metadata.tunnelId,
      request
    );

    if (config?.modifyResponse) {
      return config.modifyResponse(response);
    }

    return response;
  }

  public clearRequestHistory(tunnelId?: string): void {
    this.metricsService.history.clearHistory(tunnelId);
    this.emit('historyCleared', { tunnelId });
  }

  // Public API
  public getTunnels(): TunnelConfig[] {
    return this.tunnelManager.getTunnels();
  }

  public getTunnel(tunnelId: string): TunnelConfig | undefined {
    return this.tunnelManager.getTunnel(tunnelId);
  }

  public getConnection(tunnelId: string): TunnelConnection | undefined {
    return this.tunnelManager.getConnection(tunnelId);
  }

  public getStatistics(tunnelId: string): TunnelStatistics | undefined {
    return this.metricsService.statistics.getStatistics(tunnelId);
  }

  public getTunnelStatus(tunnelId: string): TunnelStatus | undefined {
    return this.tunnelManager.getTunnelStatus(tunnelId);
  }

  public registerProvider(name: string, provider: TunnelProvider): void {
    this.tunnelManager.registerProvider(name, provider);
  }

  public async updateTunnelSettings(
    tunnelId: string,
    settings: Partial<TunnelSettings>
  ): Promise<void> {
    await this.tunnelManager.updateTunnelSettings(tunnelId, settings);
  }

  public exportConfiguration(tunnelId: string): string {
    return this.tunnelManager.exportConfiguration(tunnelId);
  }

  public async importConfiguration(config: string): Promise<TunnelConfig> {
    return this.tunnelManager.importConfiguration(config);
  }
}

// Export singleton instance
export const webhookTunnel = WebhookTunnelSystem.getInstance();
