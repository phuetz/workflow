/**
 * Secret Storage
 * Handles storage and retrieval of secrets
 */

import { EventEmitter } from 'events';
import { Secret, SecretSearchQuery } from './types';

export class SecretStorage extends EventEmitter {
  private secrets: Map<string, Secret> = new Map();

  /**
   * Store a secret
   */
  public set(secret: Secret): void {
    this.secrets.set(secret.id, secret);
  }

  /**
   * Get a secret by ID
   */
  public get(secretId: string): Secret | undefined {
    return this.secrets.get(secretId);
  }

  /**
   * Get a secret by name
   */
  public getByName(name: string): Secret | undefined {
    for (const secret of this.secrets.values()) {
      if (secret.name === name) {
        return secret;
      }
    }
    return undefined;
  }

  /**
   * Delete a secret
   */
  public delete(secretId: string): boolean {
    return this.secrets.delete(secretId);
  }

  /**
   * Check if a secret exists
   */
  public has(secretId: string): boolean {
    return this.secrets.has(secretId);
  }

  /**
   * Get all secrets
   */
  public getAll(): Secret[] {
    return Array.from(this.secrets.values());
  }

  /**
   * Get secrets count
   */
  public count(): number {
    return this.secrets.size;
  }

  /**
   * Clear all secrets
   */
  public clear(): void {
    this.secrets.clear();
  }

  /**
   * Check if a secret has expired
   */
  public isExpired(secret: Secret): boolean {
    return !!(secret.metadata.expiresAt && new Date() > secret.metadata.expiresAt);
  }

  /**
   * Search secrets with filters
   */
  public search(query: SecretSearchQuery, filterFn?: (secret: Secret) => boolean): Secret[] {
    const results: Secret[] = [];

    for (const secret of this.secrets.values()) {
      // Apply custom filter function if provided
      if (filterFn && !filterFn(secret)) {
        continue;
      }

      // Check expiration
      if (this.isExpired(secret)) {
        continue;
      }

      // Apply query filters
      let matches = true;

      if (query.name && !secret.name.includes(query.name)) {
        matches = false;
      }

      if (query.tags && query.tags.length > 0) {
        const hasAllTags = query.tags.every(tag =>
          secret.metadata.tags.includes(tag)
        );
        if (!hasAllTags) {
          matches = false;
        }
      }

      if (query.createdBy && secret.metadata.createdBy !== query.createdBy) {
        matches = false;
      }

      if (query.createdAfter && secret.metadata.created < query.createdAfter) {
        matches = false;
      }

      if (query.createdBefore && secret.metadata.created > query.createdBefore) {
        matches = false;
      }

      if (matches) {
        results.push(secret);
      }
    }

    return results;
  }

  /**
   * Generate a unique secret ID
   */
  public static generateId(): string {
    return `secret_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sanitize a secret (hide encrypted value)
   */
  public static sanitize(secret: Secret): Secret {
    return {
      ...secret,
      value: '***ENCRYPTED***'
    };
  }

  /**
   * Update a secret's metadata
   */
  public updateMetadata(
    secretId: string,
    updates: { modifiedBy: string; value?: string }
  ): Secret | undefined {
    const secret = this.secrets.get(secretId);
    if (!secret) {
      return undefined;
    }

    secret.metadata.modified = new Date();
    secret.metadata.modifiedBy = updates.modifiedBy;
    secret.metadata.version++;

    if (updates.value !== undefined) {
      secret.value = updates.value;
    }

    return secret;
  }
}
