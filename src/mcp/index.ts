/**
 * MCP (Model Context Protocol) Integration
 *
 * This module provides a complete implementation of the Model Context Protocol v1.0
 * for seamless integration between AI models and workflow automation.
 *
 * @module mcp
 */

// Core Protocol
export { MCPProtocol, mcpProtocol } from './MCPProtocol';
export { MCPConnection } from './MCPConnection';

// Client & Server
export { MCPClient } from './MCPClient';
export type { MCPClientConfig } from './MCPClient';
export { MCPServer } from './MCPServer';

// Registries
export { MCPToolRegistry } from './MCPToolRegistry';
export { MCPResourceProvider } from './MCPResourceProvider';

// Orchestration
export { MCPOrchestrator } from './MCPOrchestrator';

// Tool Implementations
export { WorkflowTools } from './tools/WorkflowTool';
export type { WorkflowToolsConfig } from './tools/WorkflowTool';
export { DataTools } from './tools/DataTool';
export type { DataToolsConfig } from './tools/DataTool';
export { ExecutionTools } from './tools/ExecutionTool';
export type { ExecutionToolsConfig } from './tools/ExecutionTool';

// Types
export type {
  // Protocol Types
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCNotification,
  JSONRPCError,

  // MCP Types
  MCPCapabilities,
  MCPClientInfo,
  MCPServerInfo,
  MCPInitializeParams,
  MCPInitializeResult,

  // Tool Types
  MCPTool,
  MCPToolParameter,
  MCPToolSchema,
  MCPToolCallParams,
  MCPToolCallResult,
  MCPToolDefinition,
  MCPToolRegistryConfig,

  // Resource Types
  MCPResource,
  MCPResourceTemplate,
  MCPResourceContents,
  MCPReadResourceParams,
  MCPReadResourceResult,
  MCPResourceDefinition,
  MCPResourceProviderConfig,

  // Connection Types
  MCPConnectionConfig,
  MCPConnectionState,
  MCPConnectionStatus,
  MCPAuthentication,

  // Server Types
  MCPServerConfig,
  MCPServerStats,
  MCPServerConnection,

  // Orchestrator Types
  MCPOrchestratorConfig,
  MCPOrchestratorStats,

  // Event Types
  MCPEvent,
  MCPEventType,
  MCPEventHandler,

  // Content Types
  MCPContent,
  MCPTextContent,
  MCPImageContent,
  MCPResourceContent,

  // Workflow Types
  MCPWorkflowTool,
  MCPWorkflowResource,
  MCPExecutionContext,

  // Monitoring Types
  MCPMetrics,
  MCPHealthCheck,

  // Error Types
  MCPErrorCode,
} from '../types/mcp';
