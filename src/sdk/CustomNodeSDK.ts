/**
 * Custom Node SDK
 * Facade for creating, testing, and publishing custom workflow nodes
 * Delegates to modular components in /src/sdk/node-sdk/
 *
 * @module CustomNodeSDK
 */

import { EventEmitter } from 'events';

// Re-export all types from node-sdk module
export {
  // Node Definition Types
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

  // Credential Types
  CredentialDefinition,
  CredentialTestDefinition,
  RequestDefinition,
  TestRule,

  // Input/Output Types
  InputDefinition,
  OutputDefinition,

  // Method/Webhook/Trigger Types
  NodeMethod,
  WebhookDefinition,
  TriggerDefinition,
  PollingDefinition,

  // Codex/Metadata Types
  NodeCodex,
  CodexResource,
  NodeMetadata,

  // Node Implementation Types
  INodeType,
  IExecuteFunctions,
  ITriggerFunctions,
  IWebhookFunctions,
  IPollFunctions,
  ILoadOptionsFunctions,
  ICredentialTestFunctions,

  // Helper Types
  IExecuteFunctionsHelpers,
  ILoadOptionsFunctionsHelpers,
  ICredentialTestFunctionsHelpers,

  // Data Types
  INodeExecutionData,
  IDataObject,
  IBinaryData,
  IBinaryKeyData,
  IPairedItemData,
  ITriggerResponse,
  IWebhookResponseData,
  INodePropertyOptions,
  INodeCredentialTestResult,
  ICredentialDataDecryptedObject,
  IWorkflowMetadata,
  IHttpRequestOptions,
  IDeferredPromise,
  NodeOperationError,
  ResourceMapperFields,
  ResourceMapperField,
  WorkflowExecuteMode,

  // Package Types
  NodePackage,
  NodeAuthor,
  NodeRepository,
  NodeBugs,
  NodeEngines,
  PublishConfig,
  N8nConfig,

  // Testing Types
  NodeTestSuite,
  NodeTestCase,
  TestSetup,
  TestTeardown,
  TestFile,
  NodeDebugInfo,

  // Publishing Types
  PublishOptions,
  MarketplaceMetadata,

  // Internal Types
  NodeGeneratorConfig,
  ValidationResult,
  PackageOptions,
  TestResults,
  SuiteResult,
  TestCaseResult
} from './node-sdk/types';

// Import modules
import { NodeBuilder, NodeGenerator } from './node-sdk/NodeBuilder';
import { NodeValidator, PackageValidator } from './node-sdk/NodeValidator';
import { NodeRegistry } from './node-sdk/NodeRegistry';
import {
  TestRunner,
  NodeDebugger,
  NodePackager,
  NodePublisher,
  MarketplaceClient,
  DocumentationGenerator
} from './node-sdk/NodeLifecycle';

import type {
  CustomNodeDefinition,
  INodeType,
  NodeCategory,
  NodeMethod,
  NodeProperty,
  CredentialDefinition,
  NodeTestSuite,
  INodeExecutionData,
  NodeDebugInfo,
  PublishOptions,
  MarketplaceMetadata,
  PackageOptions,
  TestResults,
  ValidationResult,
  NodeGeneratorConfig
} from './node-sdk/types';

/**
 * CustomNodeSDK
 * Complete SDK for creating, testing, and publishing custom workflow nodes
 */
export class CustomNodeSDK extends EventEmitter {
  private static instance: CustomNodeSDK;

  private registry: NodeRegistry;
  private debugger: NodeDebugger;
  private packager: NodePackager;
  private publisher: NodePublisher;
  private generator: NodeGenerator;
  private marketplace: MarketplaceClient;

  private constructor() {
    super();
    this.registry = new NodeRegistry();
    this.debugger = new NodeDebugger();
    this.packager = new NodePackager();
    this.publisher = new NodePublisher();
    this.generator = new NodeGenerator();
    this.marketplace = new MarketplaceClient();
  }

  public static getInstance(): CustomNodeSDK {
    if (!CustomNodeSDK.instance) {
      CustomNodeSDK.instance = new CustomNodeSDK();
    }
    return CustomNodeSDK.instance;
  }

  // Node Creation
  public createNode(definition: CustomNodeDefinition): INodeType {
    const builder = new NodeBuilder(definition);
    const node = builder.build();

    const validator = new NodeValidator();
    const validation = validator.validate(node);

    if (!validation.valid) {
      throw new Error(`Node validation failed: ${validation.errors.join(', ')}`);
    }

    this.registry.registerNode(definition.name, node, builder);
    this.registry.setValidator(definition.name, validator);

    this.emit('nodeCreated', { name: definition.name, node });
    return node;
  }

  public generateNode(config: NodeGeneratorConfig): CustomNodeDefinition {
    return this.generator.generate(config);
  }

  public scaffoldNode(name: string, category: NodeCategory, outputDir: string): void {
    const definition = this.generator.scaffold(name, category);
    const files = this.generator.generateFiles(definition);
    const nodeDir = this.generator.writeFiles(outputDir, name, files);
    this.emit('nodeScaffolded', { name, path: nodeDir });
  }

  // Node Development
  public addMethod(nodeName: string, method: NodeMethod, implementation: Function): void {
    const builder = this.registry.getBuilder(nodeName);
    if (!builder) throw new Error(`Node ${nodeName} not found`);

    builder.addMethod(method, implementation);
    const node = builder.build();
    this.registry.registerNode(nodeName, node, builder);
    this.emit('methodAdded', { nodeName, method: method.name });
  }

  public addProperty(nodeName: string, property: NodeProperty): void {
    const builder = this.registry.getBuilder(nodeName);
    if (!builder) throw new Error(`Node ${nodeName} not found`);

    builder.addProperty(property);
    const node = builder.build();
    this.registry.registerNode(nodeName, node, builder);
    this.emit('propertyAdded', { nodeName, property: property.name });
  }

  public addCredential(nodeName: string, credential: CredentialDefinition): void {
    const builder = this.registry.getBuilder(nodeName);
    if (!builder) throw new Error(`Node ${nodeName} not found`);

    builder.addCredential(credential);
    const node = builder.build();
    this.registry.registerNode(nodeName, node, builder);
    this.emit('credentialAdded', { nodeName, credential: credential.name });
  }

  // Testing
  public createTestSuite(suite: NodeTestSuite): void {
    this.registry.registerTestSuite(suite);
    this.emit('testSuiteCreated', { name: suite.name });
  }

  public async runTests(nodeName: string, testSuiteName?: string): Promise<TestResults> {
    const node = this.registry.getNode(nodeName);
    if (!node) throw new Error(`Node ${nodeName} not found`);

    const suites = testSuiteName
      ? [this.registry.getTestSuite(testSuiteName)!].filter(Boolean)
      : this.registry.getTestSuites(nodeName);

    if (suites.length === 0) {
      throw new Error(`No test suites found for node ${nodeName}`);
    }

    const runner = new TestRunner(node);
    const results = await runner.runSuites(suites);
    this.emit('testsCompleted', { nodeName, results });
    return results;
  }

  public async debugNode(
    nodeName: string,
    input: INodeExecutionData[][],
    parameters: Record<string, any>
  ): Promise<NodeDebugInfo> {
    const node = this.registry.getNode(nodeName);
    if (!node) throw new Error(`Node ${nodeName} not found`);

    const debugInfo = await this.debugger.debug(node, input, parameters);
    this.emit('debugCompleted', { nodeName, debugInfo });
    return debugInfo;
  }

  // Validation
  public validateNode(nodeName: string): ValidationResult {
    const node = this.registry.getNode(nodeName);
    if (!node) throw new Error(`Node ${nodeName} not found`);

    const validator = this.registry.getValidator(nodeName) || new NodeValidator();
    return validator.validate(node);
  }

  public validatePackage(packagePath: string): ValidationResult {
    const packageValidator = new PackageValidator();
    return packageValidator.validatePackageDir(packagePath);
  }

  // Packaging
  public async packageNode(
    nodeName: string,
    outputDir: string,
    options?: PackageOptions
  ): Promise<string> {
    const node = this.registry.getNode(nodeName);
    if (!node) throw new Error(`Node ${nodeName} not found`);

    const packagePath = await this.packager.package(node, outputDir, options);
    this.emit('nodePackaged', { nodeName, packagePath });
    return packagePath;
  }

  public async buildPackage(packagePath: string): Promise<void> {
    await this.packager.build(packagePath);
    this.emit('packageBuilt', { packagePath });
  }

  // Publishing
  public async publishNode(nodeName: string, options?: PublishOptions): Promise<void> {
    const node = this.registry.getNode(nodeName);
    if (!node) throw new Error(`Node ${nodeName} not found`);

    await this.publisher.publish(node, options);
    this.emit('nodePublished', { nodeName });
  }

  public async publishToMarketplace(nodeName: string, metadata: MarketplaceMetadata): Promise<void> {
    const node = this.registry.getNode(nodeName);
    if (!node) throw new Error(`Node ${nodeName} not found`);

    await this.marketplace.publish(node, metadata);
    this.emit('publishedToMarketplace', { nodeName });
  }

  // Utilities
  public getNode(nodeName: string): INodeType | undefined {
    return this.registry.getNode(nodeName);
  }

  public listNodes(): string[] {
    return this.registry.listNodes();
  }

  public exportNode(nodeName: string): string {
    return this.registry.exportNode(nodeName);
  }

  public importNode(definition: string): INodeType {
    return this.registry.importNode(definition);
  }

  public generateDocumentation(nodeName: string): string {
    const node = this.registry.getNode(nodeName);
    if (!node) throw new Error(`Node ${nodeName} not found`);

    const docGenerator = new DocumentationGenerator();
    return docGenerator.generate(node);
  }
}

// Export singleton instance
export const customNodeSDK = CustomNodeSDK.getInstance();
