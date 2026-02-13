/**
 * Global Load Balancer Types
 * Extracted from GlobalLoadBalancer.ts for modular architecture
 */

// ============================================================================
// Core Types
// ============================================================================

export type RoutingPolicy =
  | 'round-robin'
  | 'weighted'
  | 'least-connections'
  | 'geolocation'
  | 'latency-based'
  | 'random'
  | 'ip-hash';

export type BackendStatus = 'healthy' | 'unhealthy' | 'degraded' | 'draining' | 'disabled';

export type HealthCheckProtocol = 'http' | 'https' | 'tcp' | 'grpc';

export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export type Region =
  | 'us-east'
  | 'us-west'
  | 'eu-west'
  | 'eu-central'
  | 'ap-southeast'
  | 'ap-northeast'
  | 'sa-east'
  | 'af-south'
  | 'me-south'
  | 'ap-south';

// ============================================================================
// Geolocation
// ============================================================================

export interface GeoLocation {
  region: Region;
  country?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

// ============================================================================
// Backend Configuration
// ============================================================================

export interface BackendConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'grpc';
  region: Region;
  weight: number;
  maxConnections: number;
  priority: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface Backend extends BackendConfig {
  status: BackendStatus;
  activeConnections: number;
  totalRequests: number;
  failedRequests: number;
  averageLatency: number;
  lastHealthCheck?: Date;
  lastSuccessfulRequest?: Date;
  healthCheckFailures: number;
  circuitBreaker: CircuitBreakerInfo;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Circuit Breaker
// ============================================================================

export interface CircuitBreakerInfo {
  state: CircuitBreakerState;
  failures: number;
  lastFailure?: Date;
  lastStateChange: Date;
  nextRetry?: Date;
}

export interface CircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  volumeThreshold: number;
  errorPercentageThreshold: number;
  rollingWindowMs: number;
}

// ============================================================================
// Health Check
// ============================================================================

export interface HealthCheckConfig {
  enabled: boolean;
  protocol: HealthCheckProtocol;
  path?: string;
  interval: number;
  timeout: number;
  healthyThreshold: number;
  unhealthyThreshold: number;
  expectedStatusCodes?: number[];
  expectedBody?: string;
  headers?: Record<string, string>;
}

// ============================================================================
// Session Affinity
// ============================================================================

export interface SessionAffinityConfig {
  enabled: boolean;
  type: 'cookie' | 'ip' | 'header';
  cookieName?: string;
  headerName?: string;
  ttl: number;
}

export interface SessionEntry {
  backendId: string;
  expiresAt: Date;
}

// ============================================================================
// SSL Configuration
// ============================================================================

export interface SSLConfig {
  enabled: boolean;
  certificate?: string;
  privateKey?: string;
  caCertificate?: string;
  protocols: string[];
  ciphers: string[];
  preferServerCiphers: boolean;
  sessionTimeout: number;
  sessionCacheSize: number;
}

// ============================================================================
// DDoS Protection
// ============================================================================

export interface DDoSProtectionConfig {
  enabled: boolean;
  rateLimit: number;
  burstLimit: number;
  blockDuration: number;
  whitelistedIPs: string[];
  blacklistedIPs: string[];
  geoBlocking?: {
    enabled: boolean;
    blockedCountries: string[];
    allowedCountries: string[];
  };
}

// ============================================================================
// Rate Limiting
// ============================================================================

export interface RateLimitConfig {
  enabled: boolean;
  requestsPerSecond: number;
  burstSize: number;
  perRegion: boolean;
  perBackend: boolean;
}

export interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

// ============================================================================
// Routing
// ============================================================================

export interface RoutingRequest {
  id: string;
  clientIP: string;
  clientRegion?: Region;
  path: string;
  method: string;
  headers: Record<string, string>;
  sessionId?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface RoutingResult {
  success: boolean;
  backend?: Backend;
  error?: string;
  errorCode?: string;
  latency?: number;
  fromCache?: boolean;
  sessionAffinity?: boolean;
}

// ============================================================================
// Metrics
// ============================================================================

export interface TrafficMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  requestsPerSecond: number;
  bytesTransferred: number;
  activeConnections: number;
  byRegion: Record<Region, RegionMetrics>;
  byBackend: Record<string, BackendMetrics>;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface RegionMetrics {
  requests: number;
  averageLatency: number;
  errorRate: number;
}

export interface BackendMetrics {
  requests: number;
  errors: number;
  averageLatency: number;
  activeConnections: number;
  healthCheckStatus: BackendStatus;
}

export interface RequestLogEntry {
  timestamp: Date;
  latency: number;
  success: boolean;
  region?: Region;
  backendId: string;
}

// ============================================================================
// Load Balancer Configuration
// ============================================================================

export interface LoadBalancerConfig {
  routingPolicy: RoutingPolicy;
  healthCheck: HealthCheckConfig;
  circuitBreaker: CircuitBreakerConfig;
  sessionAffinity: SessionAffinityConfig;
  ssl: SSLConfig;
  ddosProtection: DDoSProtectionConfig;
  rateLimit: RateLimitConfig;
  failoverEnabled: boolean;
  retryAttempts: number;
  retryDelay: number;
  connectionTimeout: number;
  requestTimeout: number;
}

// ============================================================================
// Statistics
// ============================================================================

export interface LoadBalancerStatistics {
  backends: {
    total: number;
    healthy: number;
    unhealthy: number;
    draining: number;
    disabled: number;
  };
  circuitBreakers: {
    closed: number;
    open: number;
    halfOpen: number;
  };
  sessions: number;
  blockedIPs: number;
  rateLimitBuckets: number;
}

export interface HealthStatus {
  healthy: boolean;
  healthyBackends: number;
  totalBackends: number;
  details: string;
}

// ============================================================================
// Regional Latency Matrix
// ============================================================================

export const REGIONAL_LATENCY_MS: Record<Region, Record<Region, number>> = {
  'us-east': {
    'us-east': 5, 'us-west': 70, 'eu-west': 80, 'eu-central': 90,
    'ap-southeast': 200, 'ap-northeast': 180, 'sa-east': 120,
    'af-south': 200, 'me-south': 180, 'ap-south': 220
  },
  'us-west': {
    'us-east': 70, 'us-west': 5, 'eu-west': 140, 'eu-central': 150,
    'ap-southeast': 150, 'ap-northeast': 120, 'sa-east': 180,
    'af-south': 280, 'me-south': 250, 'ap-south': 200
  },
  'eu-west': {
    'us-east': 80, 'us-west': 140, 'eu-west': 5, 'eu-central': 20,
    'ap-southeast': 180, 'ap-northeast': 220, 'sa-east': 200,
    'af-south': 150, 'me-south': 100, 'ap-south': 140
  },
  'eu-central': {
    'us-east': 90, 'us-west': 150, 'eu-west': 20, 'eu-central': 5,
    'ap-southeast': 160, 'ap-northeast': 200, 'sa-east': 220,
    'af-south': 140, 'me-south': 80, 'ap-south': 120
  },
  'ap-southeast': {
    'us-east': 200, 'us-west': 150, 'eu-west': 180, 'eu-central': 160,
    'ap-southeast': 5, 'ap-northeast': 60, 'sa-east': 320,
    'af-south': 280, 'me-south': 120, 'ap-south': 50
  },
  'ap-northeast': {
    'us-east': 180, 'us-west': 120, 'eu-west': 220, 'eu-central': 200,
    'ap-southeast': 60, 'ap-northeast': 5, 'sa-east': 280,
    'af-south': 320, 'me-south': 180, 'ap-south': 100
  },
  'sa-east': {
    'us-east': 120, 'us-west': 180, 'eu-west': 200, 'eu-central': 220,
    'ap-southeast': 320, 'ap-northeast': 280, 'sa-east': 5,
    'af-south': 280, 'me-south': 280, 'ap-south': 340
  },
  'af-south': {
    'us-east': 200, 'us-west': 280, 'eu-west': 150, 'eu-central': 140,
    'ap-southeast': 280, 'ap-northeast': 320, 'sa-east': 280,
    'af-south': 5, 'me-south': 100, 'ap-south': 180
  },
  'me-south': {
    'us-east': 180, 'us-west': 250, 'eu-west': 100, 'eu-central': 80,
    'ap-southeast': 120, 'ap-northeast': 180, 'sa-east': 280,
    'af-south': 100, 'me-south': 5, 'ap-south': 60
  },
  'ap-south': {
    'us-east': 220, 'us-west': 200, 'eu-west': 140, 'eu-central': 120,
    'ap-southeast': 50, 'ap-northeast': 100, 'sa-east': 340,
    'af-south': 180, 'me-south': 60, 'ap-south': 5
  }
};
