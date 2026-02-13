/**
 * Threat Clustering Model
 * Groups similar threats into clusters for campaign detection
 * @module threat/ThreatClusterer
 */

import type { SecurityFeatures } from './types';

/**
 * Threat Clustering Model
 */
export class ThreatClusterer {
  private clusters: Map<number, SecurityFeatures[]> = new Map();
  private maxClusters: number = 20;
  private nextClusterId: number = 0;

  /**
   * Assign threat to cluster
   */
  assignCluster(features: SecurityFeatures): number {
    if (this.clusters.size === 0) {
      return this.createCluster(features);
    }

    let bestCluster = -1;
    let bestSimilarity = 0.5;

    Array.from(this.clusters.entries()).forEach(([id, clusterFeatures]) => {
      const similarity = this.calculateSimilarity(features, clusterFeatures[0]);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestCluster = id;
      }
    });

    if (bestCluster === -1 && this.clusters.size < this.maxClusters) {
      return this.createCluster(features);
    }

    if (bestCluster !== -1) {
      this.clusters.get(bestCluster)?.push(features);
    }

    return bestCluster === -1 ? 0 : bestCluster;
  }

  /**
   * Create new cluster
   */
  private createCluster(features: SecurityFeatures): number {
    const id = this.nextClusterId++;
    this.clusters.set(id, [features]);
    return id;
  }

  /**
   * Calculate similarity between features
   */
  private calculateSimilarity(f1: SecurityFeatures, f2: SecurityFeatures): number {
    let similarity = 0;

    if (f1.eventTypes.size === f2.eventTypes.size) similarity += 0.2;
    if (Math.abs(f1.eventsPerHour - f2.eventsPerHour) < 5) similarity += 0.2;
    if (Math.abs(f1.failureRate - f2.failureRate) < 0.2) similarity += 0.2;
    if (f1.protocolDiversity === f2.protocolDiversity) similarity += 0.2;
    if (Math.abs(f1.uniqueSourceIPs - f2.uniqueSourceIPs) < 10) similarity += 0.2;

    return Math.min(similarity, 1);
  }

  /**
   * Update cluster
   */
  update(features: SecurityFeatures, clusterId: number): void {
    if (!this.clusters.has(clusterId)) {
      this.createCluster(features);
    }
  }

  /**
   * Get cluster evolution
   */
  getClusterEvolution(clusterId: number): SecurityFeatures[] | undefined {
    return this.clusters.get(clusterId);
  }

  /**
   * Get all cluster IDs
   */
  getClusterIds(): number[] {
    return Array.from(this.clusters.keys());
  }

  /**
   * Get cluster size
   */
  getClusterSize(clusterId: number): number {
    return this.clusters.get(clusterId)?.length || 0;
  }

  /**
   * Reset clusters
   */
  reset(): void {
    this.clusters.clear();
    this.nextClusterId = 0;
  }
}

export default ThreatClusterer;
