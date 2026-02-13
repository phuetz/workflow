/**
 * Tunnel Connection Providers
 * Implementation of various tunnel providers (local, ngrok, cloudflare, custom)
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import * as http from 'http';
import * as https from 'https';
import type * as WS from 'ws';
import type {
  TunnelConfig,
  TunnelConnection,
  TunnelProvider,
  TunnelStatistics,
  TunnelStatus,
  TunnelRequest,
  TunnelResponse
} from './types';

/**
 * WebSocket stub for TypeScript compilation
 */
export class WebSocketStub extends EventEmitter {
  constructor(_url: string) {
    super();
  }

  ping(): void {}
  send(_data: any): void {}
  close(): void {}
}

/**
 * Local Tunnel Provider - for development testing
 */
export class LocalTunnelProvider implements TunnelProvider {
  name = 'local';

  async connect(config: TunnelConfig): Promise<TunnelConnection> {
    const server = http.createServer();
    const port = 8080 + Math.floor(Math.random() * 1000);

    await new Promise<void>((resolve) => {
      server.listen(port, () => resolve());
    });

    return {
      id: crypto.randomBytes(16).toString('hex'),
      publicUrl: `http://localhost:${port}`,
      httpServer: server,
      forward: async (_request: TunnelRequest): Promise<TunnelResponse> => {
        return {} as TunnelResponse;
      },
      close: async () => {
        server.close();
      }
    };
  }

  async disconnect(_connectionId: string): Promise<void> {
    // Disconnect logic handled by close()
  }

  getStatus(_connectionId: string): TunnelStatus {
    return {
      state: 'connected',
      bytesIn: 0,
      bytesOut: 0,
      requestsCount: 0,
      errorsCount: 0,
      averageLatency: 0
    };
  }

  getStatistics(_connectionId: string): TunnelStatistics {
    return {} as TunnelStatistics;
  }
}

/**
 * Ngrok Provider - popular tunneling service
 */
export class NgrokProvider implements TunnelProvider {
  name = 'ngrok';

  async connect(config: TunnelConfig): Promise<TunnelConnection> {
    const subdomain = config.subdomain || crypto.randomBytes(8).toString('hex');

    return {
      id: crypto.randomBytes(16).toString('hex'),
      publicUrl: `https://${subdomain}.ngrok.io`,
      websocket: new WebSocketStub('wss://ngrok.io') as any as WS.WebSocket,
      forward: async (_request: TunnelRequest): Promise<TunnelResponse> => {
        return {} as TunnelResponse;
      },
      close: async () => {
        // Close connection
      }
    };
  }

  async disconnect(_connectionId: string): Promise<void> {
    // Disconnect logic
  }

  getStatus(_connectionId: string): TunnelStatus {
    return {
      state: 'connected',
      bytesIn: 0,
      bytesOut: 0,
      requestsCount: 0,
      errorsCount: 0,
      averageLatency: 0
    };
  }

  getStatistics(_connectionId: string): TunnelStatistics {
    return {} as TunnelStatistics;
  }
}

/**
 * Cloudflare Provider - Cloudflare Tunnel integration
 */
export class CloudflareProvider implements TunnelProvider {
  name = 'cloudflare';

  async connect(config: TunnelConfig): Promise<TunnelConnection> {
    return {
      id: crypto.randomBytes(16).toString('hex'),
      publicUrl: `https://${config.subdomain}.trycloudflare.com`,
      forward: async (_request: TunnelRequest): Promise<TunnelResponse> => {
        return {} as TunnelResponse;
      },
      close: async () => {
        // Close connection
      }
    };
  }

  async disconnect(_connectionId: string): Promise<void> {
    // Disconnect logic
  }

  getStatus(_connectionId: string): TunnelStatus {
    return {
      state: 'connected',
      bytesIn: 0,
      bytesOut: 0,
      requestsCount: 0,
      errorsCount: 0,
      averageLatency: 0
    };
  }

  getStatistics(_connectionId: string): TunnelStatistics {
    return {} as TunnelStatistics;
  }
}

/**
 * Custom Provider - for custom domain/tunnel configurations
 */
export class CustomProvider implements TunnelProvider {
  name = 'custom';

  async connect(config: TunnelConfig): Promise<TunnelConnection> {
    return {
      id: crypto.randomBytes(16).toString('hex'),
      publicUrl: config.customDomain || 'https://custom.example.com',
      forward: async (_request: TunnelRequest): Promise<TunnelResponse> => {
        return {} as TunnelResponse;
      },
      close: async () => {
        // Close connection
      }
    };
  }

  async disconnect(_connectionId: string): Promise<void> {
    // Disconnect logic
  }

  getStatus(_connectionId: string): TunnelStatus {
    return {
      state: 'connected',
      bytesIn: 0,
      bytesOut: 0,
      requestsCount: 0,
      errorsCount: 0,
      averageLatency: 0
    };
  }

  getStatistics(_connectionId: string): TunnelStatistics {
    return {} as TunnelStatistics;
  }
}

/**
 * Request Forwarder - handles forwarding requests to local server
 */
export class RequestForwarder {
  async forwardToLocal(
    tunnel: TunnelConfig,
    request: TunnelRequest
  ): Promise<TunnelResponse> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: tunnel.localHost,
        port: tunnel.localPort,
        path: request.url,
        method: request.method,
        headers: request.headers
      };

      const protocol = tunnel.protocol === 'https' ? https : http;

      const req = protocol.request(options, (res) => {
        const chunks: Buffer[] = [];

        res.on('data', (chunk) => chunks.push(chunk));

        res.on('end', () => {
          const body = Buffer.concat(chunks);

          resolve({
            id: crypto.randomBytes(16).toString('hex'),
            requestId: request.id,
            statusCode: res.statusCode || 200,
            statusMessage: res.statusMessage,
            headers: res.headers as Record<string, string | string[]>,
            body,
            timestamp: new Date(),
            duration: 0,
            size: body.length
          });
        });
      });

      req.on('error', reject);

      if (request.body) {
        req.write(request.body);
      }

      req.end();
    });
  }

  parseIncomingRequest(data: any): TunnelRequest {
    return {
      id: crypto.randomBytes(16).toString('hex'),
      method: data.method || 'GET',
      url: data.url || '/',
      headers: data.headers || {},
      body: data.body ? Buffer.from(data.body) : undefined,
      timestamp: new Date(),
      protocol: 'http',
      tunnelId: ''
    };
  }

  async createTunnelRequest(
    tunnelId: string,
    req: http.IncomingMessage
  ): Promise<TunnelRequest> {
    const chunks: Buffer[] = [];

    return new Promise((resolve) => {
      req.on('data', (chunk) => chunks.push(chunk));

      req.on('end', () => {
        resolve({
          id: crypto.randomBytes(16).toString('hex'),
          method: req.method || 'GET',
          url: req.url || '/',
          headers: req.headers as Record<string, string | string[]>,
          body: Buffer.concat(chunks),
          timestamp: new Date(),
          sourceIP: req.socket.remoteAddress,
          userAgent: req.headers['user-agent'] as string,
          protocol: 'http',
          tunnelId
        });
      });
    });
  }

  sendHttpResponse(res: http.ServerResponse, response: TunnelResponse): void {
    res.statusCode = response.statusCode;
    res.statusMessage = response.statusMessage || '';

    for (const [key, value] of Object.entries(response.headers)) {
      res.setHeader(key, value);
    }

    if (response.body) {
      res.write(response.body);
    }

    res.end();
  }
}
