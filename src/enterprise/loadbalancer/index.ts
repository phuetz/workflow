/**
 * Load Balancer Module - Barrel Export
 * Enterprise-grade load balancing with geographic routing, health checking,
 * circuit breakers, and real-time traffic analytics
 */

// Types
export * from './types';

// Core modules
export {
  BackendManager,
  CircuitBreakerManager,
  DEFAULT_CONFIG
} from './LoadBalancerCore';

// Health checking and protection
export {
  HealthCheckManager,
  DDoSProtectionManager,
  RateLimitManager
} from './HealthChecker';

// Routing strategies
export {
  IRoutingStrategy,
  RoundRobinStrategy,
  WeightedStrategy,
  LeastConnectionsStrategy,
  GeolocationStrategy,
  LatencyBasedStrategy,
  RandomStrategy,
  IPHashStrategy,
  RoutingStrategyFactory,
  Router
} from './RoutingStrategy';

// Session affinity and metrics
export {
  SessionAffinityManager,
  TrafficMetricsManager,
  SSLConfigManager,
  MaintenanceManager
} from './SessionAffinity';
