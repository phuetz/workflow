/**
 * Workflow Automation Platform - Custom Node SDK
 * Complete SDK for creating, testing, and publishing custom workflow nodes
 * Version: 1.0.0
 *
 * @packageDocumentation
 */

// Export base interfaces from NodeInterface (canonical source)
export * from './NodeInterface';

// Export CustomNodeSDK types (excluding duplicates from NodeInterface)
export type {
  CustomNodeDefinition,
  NodeIcon,
  NodeCategory,
  NodeProperty,
  PropertyType,
  PropertyOption,
  DisplayOptions,
  PropertyValidation,
  ValidationType,
  TypeOptions,
  RoutingOptions,
  RequestRouting,
  AuthRouting,
  OutputRouting,
  PostReceiveAction,
  CredentialDefinition,
  CredentialTestDefinition,
  RequestDefinition,
  TestRule,
  InputDefinition,
  OutputDefinition,
  NodeMethod,
  WebhookDefinition,
  TriggerDefinition,
  PollingDefinition,
  NodeCodex,
  CodexResource,
  NodeMetadata,
  INodeType,
  IExecuteFunctions,
  ITriggerFunctions,
  IWebhookFunctions,
  ILoadOptionsFunctions,
  ICredentialTestFunctions,
  IBinaryKeyData,
  IDeferredPromise,
  NodeOperationError,
} from './CustomNodeSDK';

// Export the CustomNodeSDK class
export { CustomNodeSDK, customNodeSDK } from './CustomNodeSDK';

// Export base classes and utilities
export * from './NodeBase';

// Export CredentialUtils (excluding ICredentialTestRequest which is in NodeInterface)
export type {
  ICredentialType,
  ICredentialProperty,
  IAuthenticateGeneric,
  ICredentialTestRequestRule,
} from './CredentialUtils';
export { CredentialUtils } from './CredentialUtils';

export * from './TestingUtils';
export * from './ValidationUtils';

// Export helper utilities
export { createNode, createCredential, createNodeManifest } from './helpers';

// Version info
export const SDK_VERSION = '1.0.0';
export const MINIMUM_ENGINE_VERSION = '1.0.0';
