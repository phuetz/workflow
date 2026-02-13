/**
 * Contract Broker
 * Centralized contract storage and versioning
 */

import type {
import { logger } from '../../services/LoggingService';
  ContractTest,
  PactFile,
  ProviderContract,
  BreakingChange,
  ContractVerificationResult,
} from '../types/testing';

export interface ContractVersion {
  version: string;
  contract: ContractTest;
  publishedAt: number;
  publishedBy: string;
  tags: string[];
  verified: boolean;
  verificationResults?: ContractVerificationResult[];
}

export interface ContractBrokerConfig {
  storageType: 'memory' | 'filesystem' | 'database';
  basePath?: string;
  webhooks?: WebhookConfig[];
}

export interface WebhookConfig {
  url: string;
  events: ('contract.published' | 'contract.verified' | 'breaking.change.detected')[];
  headers?: Record<string, string>;
}

export class ContractBroker {
  private contracts: Map<string, ContractVersion[]> = new Map();
  private config: ContractBrokerConfig;
  private webhooks: WebhookConfig[] = [];

  constructor(config: ContractBrokerConfig = { storageType: 'memory' }) {
    this.config = config;
    this.webhooks = config.webhooks || [];
    logger.debug(`[ContractBroker] Initialized with ${config.storageType} storage`);
  }

  /**
   * Publish a contract version
   */
  async publish(
    contract: ContractTest,
    version: string,
    publishedBy: string,
    tags: string[] = []
  ): Promise<ContractVersion> {
    const contractKey = this.getContractKey(contract);
    const contractVersion: ContractVersion = {
      version,
      contract,
      publishedAt: Date.now(),
      publishedBy,
      tags,
      verified: false,
    };

    // Get existing versions or create new array
    const versions = this.contracts.get(contractKey) || [];

    // Check if this version already exists
    const existingIndex = versions.findIndex((v) => v.version === version);
    if (existingIndex >= 0) {
      // Update existing version
      versions[existingIndex] = contractVersion;
      logger.debug(`[ContractBroker] Updated contract version: ${contractKey}@${version}`);
    } else {
      // Add new version
      versions.push(contractVersion);
      logger.debug(`[ContractBroker] Published new contract version: ${contractKey}@${version}`);
    }

    // Sort versions by publishedAt (newest first)
    versions.sort((a, b) => b.publishedAt - a.publishedAt);

    this.contracts.set(contractKey, versions);

    // Trigger webhook
    await this.triggerWebhook('contract.published', {
      contractKey,
      version,
      publishedBy,
      tags,
    });

    return contractVersion;
  }

  /**
   * Retrieve a specific contract version
   */
  retrieve(
    consumerName: string,
    providerName: string,
    version?: string,
    tag?: string
  ): ContractVersion | undefined {
    const contractKey = `${consumerName}-${providerName}`;
    const versions = this.contracts.get(contractKey);

    if (!versions || versions.length === 0) {
      logger.warn(`[ContractBroker] Contract not found: ${contractKey}`);
      return undefined;
    }

    // If specific version requested
    if (version) {
      const contractVersion = versions.find((v) => v.version === version);
      if (!contractVersion) {
        logger.warn(`[ContractBroker] Version not found: ${contractKey}@${version}`);
      }
      return contractVersion;
    }

    // If tag requested, find latest version with that tag
    if (tag) {
      const taggedVersions = versions.filter((v) => v.tags.includes(tag));
      if (taggedVersions.length === 0) {
        logger.warn(`[ContractBroker] No versions found with tag: ${tag}`);
        return undefined;
      }
      return taggedVersions[0]; // Already sorted by publishedAt
    }

    // Return latest version
    return versions[0];
  }

  /**
   * Get all versions of a contract
   */
  getAllVersions(consumerName: string, providerName: string): ContractVersion[] {
    const contractKey = `${consumerName}-${providerName}`;
    return this.contracts.get(contractKey) || [];
  }

  /**
   * Tag a contract version
   */
  async tagVersion(
    consumerName: string,
    providerName: string,
    version: string,
    tag: string
  ): Promise<boolean> {
    const contractKey = `${consumerName}-${providerName}`;
    const versions = this.contracts.get(contractKey);

    if (!versions) {
      logger.warn(`[ContractBroker] Contract not found: ${contractKey}`);
      return false;
    }

    const contractVersion = versions.find((v) => v.version === version);
    if (!contractVersion) {
      logger.warn(`[ContractBroker] Version not found: ${contractKey}@${version}`);
      return false;
    }

    if (!contractVersion.tags.includes(tag)) {
      contractVersion.tags.push(tag);
      logger.debug(`[ContractBroker] Tagged ${contractKey}@${version} with ${tag}`);
    }

    return true;
  }

  /**
   * Store verification results for a contract
   */
  async storeVerificationResults(
    consumerName: string,
    providerName: string,
    version: string,
    results: ContractVerificationResult
  ): Promise<boolean> {
    const contractKey = `${consumerName}-${providerName}`;
    const versions = this.contracts.get(contractKey);

    if (!versions) {
      logger.warn(`[ContractBroker] Contract not found: ${contractKey}`);
      return false;
    }

    const contractVersion = versions.find((v) => v.version === version);
    if (!contractVersion) {
      logger.warn(`[ContractBroker] Version not found: ${contractKey}@${version}`);
      return false;
    }

    // Initialize verification results array if needed
    if (!contractVersion.verificationResults) {
      contractVersion.verificationResults = [];
    }

    contractVersion.verificationResults.push(results);
    contractVersion.verified = results.passed;

    logger.debug(`[ContractBroker] Stored verification results for ${contractKey}@${version}: ${results.passed ? 'PASSED' : 'FAILED'}`);

    // Trigger webhook
    await this.triggerWebhook('contract.verified', {
      contractKey,
      version,
      passed: results.passed,
      breakingChanges: results.breakingChanges.length,
    });

    // If there are breaking changes, trigger webhook
    if (results.breakingChanges.length > 0) {
      await this.triggerWebhook('breaking.change.detected', {
        contractKey,
        version,
        breakingChanges: results.breakingChanges,
      });
    }

    return true;
  }

  /**
   * Check if deployment is safe (can-i-deploy)
   */
  canIDeploy(
    consumerName: string,
    providerName: string,
    consumerVersion: string,
    environment: string
  ): {
    canDeploy: boolean;
    reason?: string;
    details: {
      consumerVersion: string;
      providerVersion?: string;
      verified: boolean;
      breakingChanges: number;
    };
  } {
    const contractKey = `${consumerName}-${providerName}`;
    const versions = this.contracts.get(contractKey);

    if (!versions || versions.length === 0) {
      return {
        canDeploy: false,
        reason: 'No contract versions found',
        details: {
          consumerVersion,
          verified: false,
          breakingChanges: 0,
        },
      };
    }

    const contractVersion = versions.find((v) => v.version === consumerVersion);
    if (!contractVersion) {
      return {
        canDeploy: false,
        reason: `Contract version ${consumerVersion} not found`,
        details: {
          consumerVersion,
          verified: false,
          breakingChanges: 0,
        },
      };
    }

    if (!contractVersion.verified) {
      return {
        canDeploy: false,
        reason: 'Contract has not been verified',
        details: {
          consumerVersion,
          verified: false,
          breakingChanges: 0,
        },
      };
    }

    // Check for breaking changes in latest verification
    const latestVerification = contractVersion.verificationResults?.[contractVersion.verificationResults.length - 1];
    const breakingChanges = latestVerification?.breakingChanges.length || 0;

    if (breakingChanges > 0) {
      return {
        canDeploy: false,
        reason: `${breakingChanges} breaking change(s) detected`,
        details: {
          consumerVersion,
          verified: true,
          breakingChanges,
        },
      };
    }

    return {
      canDeploy: true,
      details: {
        consumerVersion,
        verified: true,
        breakingChanges: 0,
      },
    };
  }

  /**
   * Get breaking changes between versions
   */
  getBreakingChanges(
    consumerName: string,
    providerName: string,
    fromVersion: string,
    toVersion: string
  ): BreakingChange[] {
    const contractKey = `${consumerName}-${providerName}`;
    const versions = this.contracts.get(contractKey);

    if (!versions) {
      return [];
    }

    const fromContract = versions.find((v) => v.version === fromVersion);
    const toContract = versions.find((v) => v.version === toVersion);

    if (!fromContract || !toContract) {
      return [];
    }

    // Compare provider contracts
    return this.compareProviderContracts(
      fromContract.contract.provider,
      toContract.contract.provider
    );
  }

  /**
   * Compare two provider contracts
   */
  private compareProviderContracts(
    oldProvider: ProviderContract,
    newProvider: ProviderContract
  ): BreakingChange[] {
    const breakingChanges: BreakingChange[] = [];

    // Check for removed endpoints
    oldProvider.endpoints.forEach((oldEndpoint) => {
      const newEndpoint = newProvider.endpoints.find(
        (ep) => ep.path === oldEndpoint.path && ep.method === oldEndpoint.method
      );

      if (!newEndpoint) {
        breakingChanges.push({
          type: 'removed_endpoint',
          endpoint: oldEndpoint.path,
          path: oldEndpoint.path,
          oldValue: `${oldEndpoint.method} ${oldEndpoint.path}`,
          newValue: null,
          severity: 'breaking',
          message: `Endpoint ${oldEndpoint.method} ${oldEndpoint.path} was removed`,
        });
      }
    });

    return breakingChanges;
  }

  /**
   * Get contract statistics
   */
  getStatistics(): {
    totalContracts: number;
    totalVersions: number;
    verifiedContracts: number;
    unverifiedContracts: number;
    breakingChanges: number;
  } {
    let totalVersions = 0;
    let verifiedContracts = 0;
    let unverifiedContracts = 0;
    let breakingChanges = 0;

    this.contracts.forEach((versions) => {
      totalVersions += versions.length;
      const latestVersion = versions[0];

      if (latestVersion.verified) {
        verifiedContracts++;
      } else {
        unverifiedContracts++;
      }

      // Count breaking changes in latest verification
      const latestVerification = latestVersion.verificationResults?.[latestVersion.verificationResults.length - 1];
      if (latestVerification) {
        breakingChanges += latestVerification.breakingChanges.length;
      }
    });

    return {
      totalContracts: this.contracts.size,
      totalVersions,
      verifiedContracts,
      unverifiedContracts,
      breakingChanges,
    };
  }

  /**
   * List all contracts
   */
  listContracts(): Array<{
    consumer: string;
    provider: string;
    latestVersion: string;
    verified: boolean;
    tags: string[];
  }> {
    const contracts: Array<{
      consumer: string;
      provider: string;
      latestVersion: string;
      verified: boolean;
      tags: string[];
    }> = [];

    this.contracts.forEach((versions, contractKey) => {
      const [consumer, provider] = contractKey.split('-');
      const latestVersion = versions[0];

      contracts.push({
        consumer,
        provider,
        latestVersion: latestVersion.version,
        verified: latestVersion.verified,
        tags: latestVersion.tags,
      });
    });

    return contracts;
  }

  /**
   * Delete a contract
   */
  deleteContract(consumerName: string, providerName: string): boolean {
    const contractKey = `${consumerName}-${providerName}`;
    const deleted = this.contracts.delete(contractKey);

    if (deleted) {
      logger.debug(`[ContractBroker] Deleted contract: ${contractKey}`);
    } else {
      logger.warn(`[ContractBroker] Contract not found: ${contractKey}`);
    }

    return deleted;
  }

  /**
   * Delete a specific version
   */
  deleteVersion(consumerName: string, providerName: string, version: string): boolean {
    const contractKey = `${consumerName}-${providerName}`;
    const versions = this.contracts.get(contractKey);

    if (!versions) {
      logger.warn(`[ContractBroker] Contract not found: ${contractKey}`);
      return false;
    }

    const index = versions.findIndex((v) => v.version === version);
    if (index < 0) {
      logger.warn(`[ContractBroker] Version not found: ${contractKey}@${version}`);
      return false;
    }

    versions.splice(index, 1);

    if (versions.length === 0) {
      this.contracts.delete(contractKey);
    }

    logger.debug(`[ContractBroker] Deleted version: ${contractKey}@${version}`);
    return true;
  }

  /**
   * Export all contracts
   */
  exportContracts(): Record<string, ContractVersion[]> {
    const exported: Record<string, ContractVersion[]> = {};

    this.contracts.forEach((versions, contractKey) => {
      exported[contractKey] = versions;
    });

    return exported;
  }

  /**
   * Import contracts
   */
  importContracts(contracts: Record<string, ContractVersion[]>): void {
    Object.entries(contracts).forEach(([contractKey, versions]) => {
      this.contracts.set(contractKey, versions);
    });

    logger.debug(`[ContractBroker] Imported ${Object.keys(contracts).length} contracts`);
  }

  /**
   * Trigger webhook
   */
  private async triggerWebhook(event: string, payload: any): Promise<void> {
    const webhooks = this.webhooks.filter((w) => w.events.includes(event as any));

    if (webhooks.length === 0) {
      return;
    }

    logger.debug(`[ContractBroker] Triggering ${webhooks.length} webhook(s) for event: ${event}`);

    for (const webhook of webhooks) {
      try {
        // In a real implementation, this would make an HTTP request
        logger.debug(`  - POST ${webhook.url}`);
        logger.debug(`    Payload:`, payload);
      } catch (error) {
        logger.error(`  - Failed to trigger webhook: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Get contract key
   */
  private getContractKey(contract: ContractTest): string {
    return `${contract.consumer.name}-${contract.provider.name}`;
  }
}

export default ContractBroker;
