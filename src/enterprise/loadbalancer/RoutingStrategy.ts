/**
 * Routing Strategy
 * Backend selection algorithms for load balancing
 */

import type { Backend, Region, RoutingPolicy, RoutingRequest, REGIONAL_LATENCY_MS } from './types';
import { REGIONAL_LATENCY_MS as latencyMatrix } from './types';

/**
 * Base Routing Strategy interface
 */
export interface IRoutingStrategy {
  select(backends: Backend[], request: RoutingRequest): Backend | undefined;
  reset(): void;
}

/**
 * Round Robin Strategy
 */
export class RoundRobinStrategy implements IRoutingStrategy {
  private index: number = 0;

  select(backends: Backend[], _request: RoutingRequest): Backend | undefined {
    if (backends.length === 0) return undefined;

    const backend = backends[this.index % backends.length];
    this.index++;
    return backend;
  }

  reset(): void {
    this.index = 0;
  }
}

/**
 * Weighted Strategy
 */
export class WeightedStrategy implements IRoutingStrategy {
  select(backends: Backend[], _request: RoutingRequest): Backend | undefined {
    if (backends.length === 0) return undefined;

    const totalWeight = backends.reduce((sum, b) => sum + b.weight, 0);
    let random = Math.random() * totalWeight;

    for (const backend of backends) {
      random -= backend.weight;
      if (random <= 0) {
        return backend;
      }
    }

    return backends[0];
  }

  reset(): void {
    // No state to reset
  }
}

/**
 * Least Connections Strategy
 */
export class LeastConnectionsStrategy implements IRoutingStrategy {
  select(backends: Backend[], _request: RoutingRequest): Backend | undefined {
    if (backends.length === 0) return undefined;

    return backends.reduce((min, b) =>
      b.activeConnections < min.activeConnections ? b : min
    );
  }

  reset(): void {
    // No state to reset
  }
}

/**
 * Geolocation Strategy
 */
export class GeolocationStrategy implements IRoutingStrategy {
  private leastConnectionsStrategy: LeastConnectionsStrategy;
  private latencyStrategy: LatencyBasedStrategy;

  constructor() {
    this.leastConnectionsStrategy = new LeastConnectionsStrategy();
    this.latencyStrategy = new LatencyBasedStrategy();
  }

  select(backends: Backend[], request: RoutingRequest): Backend | undefined {
    if (backends.length === 0) return undefined;

    const clientRegion = request.clientRegion;
    if (!clientRegion) {
      return this.leastConnectionsStrategy.select(backends, request);
    }

    // Find backends in the same region
    const regionalBackends = backends.filter((b) => b.region === clientRegion);
    if (regionalBackends.length > 0) {
      return this.leastConnectionsStrategy.select(regionalBackends, request);
    }

    // Fall back to latency-based
    return this.latencyStrategy.select(backends, request);
  }

  reset(): void {
    this.leastConnectionsStrategy.reset();
    this.latencyStrategy.reset();
  }
}

/**
 * Latency-Based Strategy
 */
export class LatencyBasedStrategy implements IRoutingStrategy {
  private leastConnectionsStrategy: LeastConnectionsStrategy;

  constructor() {
    this.leastConnectionsStrategy = new LeastConnectionsStrategy();
  }

  select(backends: Backend[], request: RoutingRequest): Backend | undefined {
    if (backends.length === 0) return undefined;

    const clientRegion = request.clientRegion;
    if (!clientRegion) {
      return this.leastConnectionsStrategy.select(backends, request);
    }

    // Calculate expected latency for each backend
    const backendsWithLatency = backends.map((backend) => {
      const networkLatency = latencyMatrix[clientRegion]?.[backend.region] || 100;
      const backendLatency = backend.averageLatency || 10;
      const totalLatency = networkLatency + backendLatency;

      return { backend, totalLatency };
    });

    // Sort by latency and select lowest
    backendsWithLatency.sort((a, b) => a.totalLatency - b.totalLatency);

    return backendsWithLatency[0].backend;
  }

  reset(): void {
    this.leastConnectionsStrategy.reset();
  }
}

/**
 * Random Strategy
 */
export class RandomStrategy implements IRoutingStrategy {
  select(backends: Backend[], _request: RoutingRequest): Backend | undefined {
    if (backends.length === 0) return undefined;

    const index = Math.floor(Math.random() * backends.length);
    return backends[index];
  }

  reset(): void {
    // No state to reset
  }
}

/**
 * IP Hash Strategy (consistent hashing)
 */
export class IPHashStrategy implements IRoutingStrategy {
  select(backends: Backend[], request: RoutingRequest): Backend | undefined {
    if (backends.length === 0) return undefined;

    const hash = this.hashString(request.clientIP);
    const index = hash % backends.length;
    return backends[index];
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  reset(): void {
    // No state to reset
  }
}

/**
 * Routing Strategy Factory
 */
export class RoutingStrategyFactory {
  private strategies: Map<RoutingPolicy, IRoutingStrategy> = new Map();

  constructor() {
    this.strategies.set('round-robin', new RoundRobinStrategy());
    this.strategies.set('weighted', new WeightedStrategy());
    this.strategies.set('least-connections', new LeastConnectionsStrategy());
    this.strategies.set('geolocation', new GeolocationStrategy());
    this.strategies.set('latency-based', new LatencyBasedStrategy());
    this.strategies.set('random', new RandomStrategy());
    this.strategies.set('ip-hash', new IPHashStrategy());
  }

  getStrategy(policy: RoutingPolicy): IRoutingStrategy {
    return this.strategies.get(policy) || new RoundRobinStrategy();
  }

  resetStrategy(policy: RoutingPolicy): void {
    const strategy = this.strategies.get(policy);
    if (strategy) {
      strategy.reset();
    }
  }

  resetAllStrategies(): void {
    for (const strategy of this.strategies.values()) {
      strategy.reset();
    }
  }
}

/**
 * Router - main routing component
 */
export class Router {
  private strategyFactory: RoutingStrategyFactory;
  private currentPolicy: RoutingPolicy;

  constructor(initialPolicy: RoutingPolicy = 'latency-based') {
    this.strategyFactory = new RoutingStrategyFactory();
    this.currentPolicy = initialPolicy;
  }

  selectBackend(backends: Backend[], request: RoutingRequest): Backend | undefined {
    const strategy = this.strategyFactory.getStrategy(this.currentPolicy);
    return strategy.select(backends, request);
  }

  setPolicy(policy: RoutingPolicy): void {
    this.strategyFactory.resetStrategy(this.currentPolicy);
    this.currentPolicy = policy;
  }

  getPolicy(): RoutingPolicy {
    return this.currentPolicy;
  }

  reset(): void {
    this.strategyFactory.resetAllStrategies();
  }
}
