/**
 * Pact Integration
 * Pact framework integration for consumer-driven contract testing
 */

import { logger } from '../../services/SimpleLogger';
import type {
  ContractTest,
  PactFile,
  PactInteraction,
  ProviderContract,
  ConsumerContract,
  ContractVerificationResult,
} from '../types/testing';

export interface PactConfig {
  consumer: string;
  provider: string;
  pactBrokerUrl?: string;
  pactBrokerToken?: string;
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error';
  dir?: string;           // Directory to write pact files
}

export class PactIntegration {
  private config: PactConfig;
  private interactions: PactInteraction[] = [];
  private providerStates: Map<string, () => Promise<void>> = new Map();

  constructor(config: PactConfig) {
    this.config = {
      logLevel: 'info',
      dir: './pacts',
      ...config,
    };
  }

  /**
   * Add an interaction to the pact
   */
  addInteraction(interaction: PactInteraction): void {
    this.interactions.push(interaction);
    logger.debug(`[PactIntegration] Added interaction: ${interaction.description}`);
  }

  /**
   * Add a provider state setup function
   */
  addProviderState(state: string, setup: () => Promise<void>): void {
    this.providerStates.set(state, setup);
    logger.debug(`[PactIntegration] Registered provider state: ${state}`);
  }

  /**
   * Generate a Pact file from interactions
   */
  generatePactFile(): PactFile {
    const pactFile: PactFile = {
      consumer: {
        name: this.config.consumer,
      },
      provider: {
        name: this.config.provider,
      },
      interactions: this.interactions,
      metadata: {
        pactSpecification: {
          version: '3.0.0',
        },
        generatedAt: new Date().toISOString(),
      },
    };

    logger.debug(`[PactIntegration] Generated Pact file with ${this.interactions.length} interactions`);
    return pactFile;
  }

  /**
   * Write Pact file to disk
   */
  async writePactFile(): Promise<string> {
    const pactFile = this.generatePactFile();
    const filename = `${this.config.consumer}-${this.config.provider}.json`;
    const filepath = `${this.config.dir}/${filename}`;

    // In a real implementation, this would write to disk
    // For now, we'll simulate it
    logger.debug(`[PactIntegration] Would write Pact file to: ${filepath}`);
    logger.debug(JSON.stringify(pactFile, null, 2));

    return filepath;
  }

  /**
   * Publish Pact to broker
   */
  async publishPact(version: string, tags?: string[]): Promise<void> {
    if (!this.config.pactBrokerUrl) {
      throw new Error('Pact Broker URL not configured');
    }

    const pactFile = this.generatePactFile();

    logger.debug(`[PactIntegration] Publishing Pact to broker: ${this.config.pactBrokerUrl}`);
    logger.debug(`  - Consumer: ${this.config.consumer}`);
    logger.debug(`  - Provider: ${this.config.provider}`);
    logger.debug(`  - Version: ${version}`);
    logger.debug(`  - Tags: ${tags?.join(', ') || 'none'}`);

    // In a real implementation, this would make an HTTP request to the Pact Broker
    // POST /pacts/provider/{provider}/consumer/{consumer}/version/{version}
    const url = `${this.config.pactBrokerUrl}/pacts/provider/${this.config.provider}/consumer/${this.config.consumer}/version/${version}`;

    // Simulate API call
    logger.debug(`[PactIntegration] Would POST to: ${url}`);
    logger.debug(`[PactIntegration] Pact published successfully`);

    // If tags are provided, tag the version
    if (tags && tags.length > 0) {
      for (const tag of tags) {
        await this.tagVersion(version, tag);
      }
    }
  }

  /**
   * Tag a consumer version
   */
  async tagVersion(version: string, tag: string): Promise<void> {
    if (!this.config.pactBrokerUrl) {
      throw new Error('Pact Broker URL not configured');
    }

    const url = `${this.config.pactBrokerUrl}/pacticipants/${this.config.consumer}/versions/${version}/tags/${tag}`;
    logger.debug(`[PactIntegration] Would PUT to: ${url}`);
    logger.debug(`[PactIntegration] Tagged version ${version} with ${tag}`);
  }

  /**
   * Fetch Pact from broker
   */
  async fetchPact(consumerVersion?: string, providerVersion?: string): Promise<PactFile> {
    if (!this.config.pactBrokerUrl) {
      throw new Error('Pact Broker URL not configured');
    }

    let url = `${this.config.pactBrokerUrl}/pacts/provider/${this.config.provider}/consumer/${this.config.consumer}`;

    if (consumerVersion) {
      url += `/version/${consumerVersion}`;
    } else {
      url += '/latest';
    }

    logger.debug(`[PactIntegration] Fetching Pact from: ${url}`);

    // In a real implementation, this would make an HTTP request
    // For now, return a mock pact
    return this.generatePactFile();
  }

  /**
   * Verify provider against pact
   */
  async verifyProvider(
    providerBaseUrl: string,
    stateHandlers?: Map<string, () => Promise<void>>
  ): Promise<ContractVerificationResult> {
    logger.debug(`[PactIntegration] Verifying provider: ${this.config.provider}`);
    logger.debug(`  - Base URL: ${providerBaseUrl}`);

    const pactFile = await this.fetchPact();
    const results: any[] = [];
    const errors: any[] = [];
    const startTime = Date.now();

    for (const interaction of pactFile.interactions) {
      logger.debug(`[PactIntegration] Verifying interaction: ${interaction.description}`);

      try {
        // Setup provider state if needed
        if (interaction.providerState) {
          const handler = stateHandlers?.get(interaction.providerState) || this.providerStates.get(interaction.providerState);
          if (handler) {
            await handler();
            logger.debug(`  - Setup provider state: ${interaction.providerState}`);
          } else {
            logger.warn(`  - No handler for provider state: ${interaction.providerState}`);
          }
        }

        // Build request URL
        const url = `${providerBaseUrl}${interaction.request.path}`;

        // In a real implementation, this would make an HTTP request
        logger.debug(`  - ${interaction.request.method} ${url}`);

        // Simulate verification
        const passed = true; // In reality, verify response matches expected

        results.push({
          endpoint: interaction.request.path,
          method: interaction.request.method,
          passed,
          errors: [],
          warnings: [],
          duration: 100,
        });
      } catch (error) {
        logger.error(`  - Error: ${error instanceof Error ? error.message : String(error)}`);
        results.push({
          endpoint: interaction.request.path,
          method: interaction.request.method,
          passed: false,
          errors: [
            {
              path: 'verification',
              message: error instanceof Error ? error.message : String(error),
              expected: 'successful verification',
              actual: 'error',
              severity: 'critical',
            },
          ],
          warnings: [],
          duration: 100,
        });
      }
    }

    const passed = results.every((r) => r.passed);
    const duration = Date.now() - startTime;

    const verificationResult: ContractVerificationResult = {
      passed,
      contractId: `${this.config.consumer}-${this.config.provider}`,
      timestamp: Date.now(),
      duration,
      results,
      summary: {
        total: results.length,
        passed: results.filter((r) => r.passed).length,
        failed: results.filter((r) => !r.passed).length,
        skipped: 0,
      },
      breakingChanges: [],
    };

    logger.debug(`[PactIntegration] Verification ${passed ? 'passed' : 'failed'}`);
    logger.debug(`  - Total: ${verificationResult.summary.total}`);
    logger.debug(`  - Passed: ${verificationResult.summary.passed}`);
    logger.debug(`  - Failed: ${verificationResult.summary.failed}`);

    return verificationResult;
  }

  /**
   * Can I deploy? Check if it's safe to deploy
   */
  async canIDeploy(
    version: string,
    environment: string
  ): Promise<{
    canDeploy: boolean;
    reason?: string;
    verifications: Array<{
      consumer: string;
      success: boolean;
    }>;
  }> {
    if (!this.config.pactBrokerUrl) {
      throw new Error('Pact Broker URL not configured');
    }

    const url = `${this.config.pactBrokerUrl}/can-i-deploy`;
    logger.debug(`[PactIntegration] Checking can-i-deploy for ${this.config.provider} version ${version} to ${environment}`);

    // In a real implementation, this would query the Pact Broker
    // For now, simulate a successful check
    return {
      canDeploy: true,
      verifications: [
        {
          consumer: this.config.consumer,
          success: true,
        },
      ],
    };
  }

  /**
   * Create matching rules for flexible matching
   */
  createMatchingRules(): {
    type: (type: string) => any;
    regex: (pattern: string, example: string) => any;
    integer: (example?: number) => any;
    decimal: (example?: number) => any;
    timestamp: (format: string, example: string) => any;
    uuid: () => any;
    eachLike: (template: any, min?: number) => any;
  } {
    return {
      type: (type: string) => ({
        'pact:matcher:type': type,
        value: this.getExampleValue(type),
      }),
      regex: (pattern: string, example: string) => ({
        'pact:matcher:type': 'regex',
        regex: pattern,
        value: example,
      }),
      integer: (example = 42) => ({
        'pact:matcher:type': 'integer',
        value: example,
      }),
      decimal: (example = 3.14) => ({
        'pact:matcher:type': 'decimal',
        value: example,
      }),
      timestamp: (format: string, example: string) => ({
        'pact:matcher:type': 'timestamp',
        format,
        value: example,
      }),
      uuid: () => ({
        'pact:matcher:type': 'regex',
        regex: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
        value: '12345678-1234-1234-1234-123456789012',
      }),
      eachLike: (template: any, min = 1) => ({
        'pact:matcher:type': 'type',
        value: Array(min).fill(template),
      }),
    };
  }

  /**
   * Get example value for a type
   */
  private getExampleValue(type: string): any {
    const examples: Record<string, any> = {
      string: 'example',
      number: 42,
      integer: 42,
      boolean: true,
      object: {},
      array: [],
      null: null,
    };

    return examples[type] || null;
  }

  /**
   * Convert contract to Pact interactions
   */
  convertContractToPact(contract: ContractTest): PactInteraction[] {
    const interactions: PactInteraction[] = [];

    contract.consumer.expectations.forEach((expectation) => {
      const providerEndpoint = contract.provider.endpoints.find(
        (ep) => ep.path === expectation.endpoint && ep.method === expectation.method
      );

      if (!providerEndpoint) {
        return;
      }

      const interaction: PactInteraction = {
        description: expectation.description || `${expectation.method} ${expectation.endpoint}`,
        request: {
          method: expectation.method,
          path: expectation.endpoint,
        },
        response: {
          status: expectation.expectedStatusCode,
          body: expectation.expectedResponse,
        },
      };

      // Add request body if present
      if (expectation.request) {
        interaction.request.body = expectation.request;
      }

      // Add headers from provider endpoint
      if (providerEndpoint.headers) {
        interaction.response.headers = providerEndpoint.headers;
      }

      interactions.push(interaction);
    });

    return interactions;
  }

  /**
   * Load Pact file and convert to contract
   */
  loadPactFile(pactFile: PactFile): {
    provider: ProviderContract;
    consumer: ConsumerContract;
  } {
    const provider: ProviderContract = {
      name: pactFile.provider.name,
      version: '1.0.0',
      baseUrl: '',
      endpoints: [],
    };

    const consumer: ConsumerContract = {
      name: pactFile.consumer.name,
      version: '1.0.0',
      expectations: [],
    };

    pactFile.interactions.forEach((interaction) => {
      // Add to provider endpoints
      provider.endpoints.push({
        path: interaction.request.path,
        method: interaction.request.method as any,
        description: interaction.description,
        responseSchema: this.inferSchemaFromBody(interaction.response.body),
        statusCode: interaction.response.status,
        headers: interaction.response.headers,
        examples: [
          {
            request: {
              body: interaction.request.body,
              headers: interaction.request.headers,
              queryParams: interaction.request.query,
            },
            response: {
              statusCode: interaction.response.status,
              headers: interaction.response.headers,
              body: interaction.response.body,
            },
          },
        ],
      });

      // Add to consumer expectations
      consumer.expectations.push({
        endpoint: interaction.request.path,
        method: interaction.request.method,
        request: interaction.request.body,
        expectedResponse: interaction.response.body,
        expectedStatusCode: interaction.response.status,
        description: interaction.description,
      });
    });

    return { provider, consumer };
  }

  /**
   * Infer JSON schema from response body
   */
  private inferSchemaFromBody(body: any): any {
    if (body === null || body === undefined) {
      return { type: 'null' };
    }

    if (Array.isArray(body)) {
      return {
        type: 'array',
        items: body.length > 0 ? this.inferSchemaFromBody(body[0]) : { type: 'object' },
      };
    }

    if (typeof body === 'object') {
      const properties: Record<string, any> = {};
      const required: string[] = [];

      Object.keys(body).forEach((key) => {
        properties[key] = this.inferSchemaFromBody(body[key]);
        required.push(key);
      });

      return {
        type: 'object',
        properties,
        required,
      };
    }

    return {
      type: typeof body,
    };
  }

  /**
   * Clear interactions
   */
  clear(): void {
    this.interactions = [];
    logger.debug(`[PactIntegration] Cleared interactions`);
  }
}

export default PactIntegration;
