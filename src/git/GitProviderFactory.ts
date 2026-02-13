/**
 * Git Provider Factory
 * Creates instances of Git providers based on configuration
 */

import { IGitProvider } from './GitProviderInterface';
import { GitHubProvider } from './providers/GitHubProvider';
import { GitLabProvider } from './providers/GitLabProvider';
import { BitbucketProvider } from './providers/BitbucketProvider';
import { GitProviderConfig, GitProvider } from '../types/git';

export class GitProviderFactory {
  /**
   * Create a Git provider instance
   */
  static async createProvider(config: GitProviderConfig): Promise<IGitProvider> {
    let provider: IGitProvider;

    switch (config.provider) {
      case 'github':
        provider = new GitHubProvider();
        break;
      case 'gitlab':
        provider = new GitLabProvider();
        break;
      case 'bitbucket':
        provider = new BitbucketProvider();
        break;
      default:
        throw new Error(`Unsupported Git provider: ${config.provider}`);
    }

    await provider.initialize(config);
    return provider;
  }

  /**
   * Test provider connection before creating
   */
  static async testProvider(config: GitProviderConfig): Promise<boolean> {
    try {
      const provider = await this.createProvider(config);
      return await provider.testConnection();
    } catch {
      return false;
    }
  }

  /**
   * Get provider capabilities without full initialization
   */
  static getProviderCapabilities(providerType: GitProvider) {
    switch (providerType) {
      case 'github': {
        const provider = new GitHubProvider();
        return provider.getCapabilities();
      }
      case 'gitlab': {
        const provider = new GitLabProvider();
        return provider.getCapabilities();
      }
      case 'bitbucket': {
        const provider = new BitbucketProvider();
        return provider.getCapabilities();
      }
      default:
        throw new Error(`Unsupported Git provider: ${providerType}`);
    }
  }
}
