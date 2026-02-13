/**
 * MCP Protocol Implementation
 * Handles JSON-RPC 2.0 message formatting and protocol negotiation
 */

import type {
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCNotification,
  JSONRPCError,
  MCPInitializeParams,
  MCPInitializeResult,
  MCPCapabilities,
} from '../types/mcp';
import { MCPErrorCode } from '../types/mcp';

export class MCPProtocol {
  private requestId = 0;
  private readonly protocolVersion = '2024-11-05';

  /**
   * Create a JSON-RPC 2.0 request
   */
  createRequest(method: string, params?: Record<string, unknown> | unknown[]): JSONRPCRequest {
    return {
      jsonrpc: '2.0',
      id: ++this.requestId,
      method,
      params,
    };
  }

  /**
   * Create a JSON-RPC 2.0 notification (no response expected)
   */
  createNotification(method: string, params?: Record<string, unknown> | unknown[]): JSONRPCNotification {
    return {
      jsonrpc: '2.0',
      method,
      params,
    };
  }

  /**
   * Create a JSON-RPC 2.0 success response
   */
  createResponse(id: string | number, result: unknown): JSONRPCResponse {
    return {
      jsonrpc: '2.0',
      id,
      result,
    };
  }

  /**
   * Create a JSON-RPC 2.0 error response
   */
  createErrorResponse(
    id: string | number,
    code: MCPErrorCode,
    message: string,
    data?: unknown
  ): JSONRPCResponse {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
        data,
      },
    };
  }

  /**
   * Validate a JSON-RPC message
   */
  validateMessage(message: unknown): { valid: boolean; error?: string } {
    if (!message || typeof message !== 'object') {
      return { valid: false, error: 'Message must be an object' };
    }

    const msg = message as Record<string, unknown>;

    if (msg.jsonrpc !== '2.0') {
      return { valid: false, error: 'Invalid JSON-RPC version' };
    }

    // Check if it's a request or notification
    if ('method' in msg) {
      if (typeof msg.method !== 'string') {
        return { valid: false, error: 'Method must be a string' };
      }

      // Request must have an id
      if ('id' in msg && (typeof msg.id !== 'string' && typeof msg.id !== 'number')) {
        return { valid: false, error: 'ID must be a string or number' };
      }
    }
    // Check if it's a response
    else if ('result' in msg || 'error' in msg) {
      if (!('id' in msg)) {
        return { valid: false, error: 'Response must have an id' };
      }
    } else {
      return { valid: false, error: 'Invalid message format' };
    }

    return { valid: true };
  }

  /**
   * Parse a JSON-RPC message from string
   */
  parseMessage(data: string): { message?: unknown; error?: JSONRPCError } {
    try {
      const parsed = JSON.parse(data);
      const validation = this.validateMessage(parsed);

      if (!validation.valid) {
        return {
          error: {
            code: MCPErrorCode.INVALID_REQUEST,
            message: validation.error || 'Invalid request',
          },
        };
      }

      return { message: parsed };
    } catch (error) {
      return {
        error: {
          code: MCPErrorCode.PARSE_ERROR,
          message: 'Parse error',
          data: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Create an initialize request (first message in MCP handshake)
   */
  createInitializeRequest(
    clientName: string,
    clientVersion: string,
    capabilities: MCPCapabilities
  ): JSONRPCRequest {
    const params: MCPInitializeParams = {
      protocolVersion: this.protocolVersion,
      capabilities,
      clientInfo: {
        name: clientName,
        version: clientVersion,
      },
    };

    return this.createRequest('initialize', params as unknown as Record<string, unknown>);
  }

  /**
   * Create an initialize response (server's response to handshake)
   */
  createInitializeResponse(
    id: string | number,
    serverName: string,
    serverVersion: string,
    capabilities: MCPCapabilities,
    instructions?: string
  ): JSONRPCResponse {
    const result: MCPInitializeResult = {
      protocolVersion: this.protocolVersion,
      capabilities,
      serverInfo: {
        name: serverName,
        version: serverVersion,
        protocolVersion: this.protocolVersion,
      },
      instructions,
    };

    return this.createResponse(id, result);
  }

  /**
   * Validate protocol version compatibility
   */
  validateProtocolVersion(clientVersion: string): boolean {
    // For now, we only support exact version match
    // In production, you'd implement semantic versioning comparison
    return clientVersion === this.protocolVersion;
  }

  /**
   * Negotiate capabilities between client and server
   */
  negotiateCapabilities(
    clientCapabilities: MCPCapabilities,
    serverCapabilities: MCPCapabilities
  ): MCPCapabilities {
    const negotiated: MCPCapabilities = {};

    // Tools capability
    if (clientCapabilities.tools && serverCapabilities.tools) {
      negotiated.tools = {
        listChanged:
          clientCapabilities.tools.listChanged === true &&
          serverCapabilities.tools.listChanged === true,
      };
    }

    // Resources capability
    if (clientCapabilities.resources && serverCapabilities.resources) {
      negotiated.resources = {
        subscribe:
          clientCapabilities.resources.subscribe === true &&
          serverCapabilities.resources.subscribe === true,
        listChanged:
          clientCapabilities.resources.listChanged === true &&
          serverCapabilities.resources.listChanged === true,
      };
    }

    // Prompts capability
    if (clientCapabilities.prompts && serverCapabilities.prompts) {
      negotiated.prompts = {
        listChanged:
          clientCapabilities.prompts.listChanged === true &&
          serverCapabilities.prompts.listChanged === true,
      };
    }

    // Logging capability
    if (clientCapabilities.logging && serverCapabilities.logging) {
      negotiated.logging = { ...clientCapabilities.logging };
    }

    // Experimental capabilities
    if (clientCapabilities.experimental && serverCapabilities.experimental) {
      negotiated.experimental = {};
      for (const key in clientCapabilities.experimental) {
        if (key in serverCapabilities.experimental) {
          negotiated.experimental[key] = clientCapabilities.experimental[key];
        }
      }
    }

    return negotiated;
  }

  /**
   * Check if a capability is supported
   */
  hasCapability(capabilities: MCPCapabilities, capability: string): boolean {
    const parts = capability.split('.');
    let current: unknown = capabilities;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return false;
      }
    }

    return current === true;
  }

  /**
   * Get the protocol version
   */
  getProtocolVersion(): string {
    return this.protocolVersion;
  }

  /**
   * Reset request ID counter (useful for testing)
   */
  resetRequestId(): void {
    this.requestId = 0;
  }
}

// Singleton instance
export const mcpProtocol = new MCPProtocol();
