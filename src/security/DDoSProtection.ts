/**
 * DDoS Protection Service
 *
 * Provides comprehensive DDoS mitigation including:
 * - Connection throttling
 * - Request queue management
 * - Automatic IP blacklisting
 * - Traffic pattern analysis
 * - Geographic blocking (optional)
 * - Bot detection
 * - Challenge-response verification
 *
 * @module DDoSProtection
 */

import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import crypto from 'crypto';
import { GeoIPService, getGeoIPService } from './GeoIPService';

/**
 * DDoS protection configuration
 */
export interface DDoSConfig {
  /** Maximum concurrent connections per IP */
  maxConnectionsPerIP?: number;
  /** Time window for connection counting (ms) */
  connectionWindowMs?: number;
  /** Maximum requests per IP in burst window */
  maxBurstRequests?: number;
  /** Burst time window (ms) */
  burstWindowMs?: number;
  /** Threshold for automatic blacklisting */
  blacklistThreshold?: number;
  /** Blacklist duration (ms) */
  blacklistDuration?: number;
  /** Enable challenge-response */
  enableChallenge?: boolean;
  /** Blocked countries (ISO codes) */
  blockedCountries?: string[];
  /** Allowed countries (if set, only these are allowed) */
  allowedCountries?: string[];
}

/**
 * Connection info
 */
export interface ConnectionInfo {
  ip: string;
  timestamp: Date;
  userAgent?: string;
  path: string;
  method: string;
  country?: string;
}

/**
 * Attack pattern
 */
export interface AttackPattern {
  type: 'burst' | 'distributed' | 'slowloris' | 'http-flood';
  confidence: number;
  ips: string[];
  requestCount: number;
  startTime: Date;
  endTime?: Date;
  mitigated: boolean;
}

/**
 * DDoS statistics
 */
export interface DDoSStats {
  totalRequests: number;
  blockedRequests: number;
  uniqueIPs: number;
  suspiciousIPs: number;
  blacklistedIPs: number;
  activeConnections: number;
  detectedAttacks: AttackPattern[];
  topAttackers: Array<{
    ip: string;
    requests: number;
    blocked: number;
  }>;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<DDoSConfig> = {
  maxConnectionsPerIP: 100,
  connectionWindowMs: 60000, // 1 minute
  maxBurstRequests: 50,
  burstWindowMs: 10000, // 10 seconds
  blacklistThreshold: 200,
  blacklistDuration: 3600000, // 1 hour
  enableChallenge: false,
  blockedCountries: [],
  allowedCountries: [],
};

/**
 * DDoS Protection Service
 */
export class DDoSProtectionService {
  private redis: Redis;
  private config: Required<DDoSConfig>;
  private connections: Map<string, ConnectionInfo[]> = new Map();
  private detectedAttacks: AttackPattern[] = [];
  private suspiciousIPs: Set<string> = new Set();
  private geoIPService: GeoIPService;

  constructor(config?: DDoSConfig, redisUrl?: string) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
    this.geoIPService = getGeoIPService();

    // Cleanup old connections every minute
    setInterval(() => this.cleanupConnections(), 60000);

    // Analyze traffic patterns every 30 seconds
    setInterval(() => this.analyzeTrafficPatterns(), 30000);
  }

  /**
   * Check if request should be allowed
   */
  public async checkRequest(req: Request): Promise<{
    allowed: boolean;
    reason?: string;
    challenge?: string;
  }> {
    const ip = this.getClientIP(req);

    // Check if IP is blacklisted
    const isBlacklisted = await this.isBlacklisted(ip);
    if (isBlacklisted) {
      return {
        allowed: false,
        reason: 'IP is blacklisted due to suspicious activity',
      };
    }

    // Check geographic restrictions
    if (this.config.blockedCountries.length > 0 || this.config.allowedCountries.length > 0) {
      const country = this.getCountryFromIP(ip);

      if (this.config.blockedCountries.includes(country)) {
        await this.recordBlockedRequest(ip, 'geo-block');
        return {
          allowed: false,
          reason: `Requests from ${country} are not allowed`,
        };
      }

      if (this.config.allowedCountries.length > 0 && !this.config.allowedCountries.includes(country)) {
        await this.recordBlockedRequest(ip, 'geo-block');
        return {
          allowed: false,
          reason: 'Geographic restrictions apply',
        };
      }
    }

    // Check connection limits
    const connectionCheck = await this.checkConnectionLimit(ip);
    if (!connectionCheck.allowed) {
      await this.recordSuspiciousActivity(ip, 'connection-limit');
      return connectionCheck;
    }

    // Check burst limits
    const burstCheck = await this.checkBurstLimit(ip);
    if (!burstCheck.allowed) {
      await this.recordSuspiciousActivity(ip, 'burst-limit');
      return burstCheck;
    }

    // Bot detection
    if (this.isSuspiciousBot(req)) {
      this.suspiciousIPs.add(ip);

      if (this.config.enableChallenge) {
        return {
          allowed: false,
          reason: 'Bot detected. Please solve the challenge.',
          challenge: this.generateChallenge(),
        };
      }
    }

    // Record the connection
    await this.recordConnection(ip, req);

    return { allowed: true };
  }

  /**
   * Express middleware
   */
  public middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await this.checkRequest(req);

        if (!result.allowed) {
          if (result.challenge) {
            return res.status(429).json({
              error: 'Too Many Requests',
              message: result.reason,
              challenge: result.challenge,
            });
          }

          return res.status(403).json({
            error: 'Forbidden',
            message: result.reason || 'Request blocked by DDoS protection',
          });
        }

        next();
      } catch (error) {
        console.error('DDoS protection check failed:', error);
        // Fail open
        next();
      }
    };
  }

  /**
   * Check connection limit
   */
  private async checkConnectionLimit(ip: string): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    const key = `ddos:connections:${ip}`;
    const now = Date.now();
    const windowStart = now - this.config.connectionWindowMs;

    // Count active connections
    await this.redis.zremrangebyscore(key, 0, windowStart);
    await this.redis.zadd(key, now, `${now}-${Math.random()}`);
    const count = await this.redis.zcard(key);
    await this.redis.pexpire(key, this.config.connectionWindowMs + 10000);

    if (count > this.config.maxConnectionsPerIP) {
      return {
        allowed: false,
        reason: `Too many concurrent connections from your IP (${count}/${this.config.maxConnectionsPerIP})`,
      };
    }

    return { allowed: true };
  }

  /**
   * Check burst limit
   */
  private async checkBurstLimit(ip: string): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    const key = `ddos:burst:${ip}`;
    const now = Date.now();
    const windowStart = now - this.config.burstWindowMs;

    await this.redis.zremrangebyscore(key, 0, windowStart);
    await this.redis.zadd(key, now, `${now}-${Math.random()}`);
    const count = await this.redis.zcard(key);
    await this.redis.pexpire(key, this.config.burstWindowMs + 10000);

    if (count > this.config.maxBurstRequests) {
      // Auto-blacklist if exceeds threshold significantly
      if (count > this.config.blacklistThreshold) {
        await this.blacklist(ip, this.config.blacklistDuration);
      }

      return {
        allowed: false,
        reason: `Too many requests in a short time (${count}/${this.config.maxBurstRequests})`,
      };
    }

    return { allowed: true };
  }

  /**
   * Get client IP address
   */
  private getClientIP(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = (forwarded as string).split(',');
      return ips[0].trim();
    }

    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  /**
   * Get country from IP using GeoIP service
   */
  private getCountryFromIP(ip: string): string {
    try {
      const geoData = this.geoIPService.lookupSync(ip);
      return geoData?.countryCode || 'UNKNOWN';
    } catch {
      return 'UNKNOWN';
    }
  }

  /**
   * Get detailed geo information from IP
   */
  public async getGeoInfo(ip: string): Promise<{
    countryCode: string;
    countryName: string;
    city?: string;
    region?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
    isp?: string;
    isProxy?: boolean;
    isVPN?: boolean;
    isTor?: boolean;
  } | null> {
    try {
      const geoData = await this.geoIPService.lookup(ip);
      if (!geoData) return null;

      return {
        countryCode: geoData.countryCode,
        countryName: geoData.countryName,
        city: geoData.city,
        region: geoData.region,
        latitude: geoData.latitude,
        longitude: geoData.longitude,
        timezone: geoData.timezone,
        isp: geoData.isp,
        isProxy: geoData.isProxy,
        isVPN: geoData.isVPN,
        isTor: geoData.isTor,
      };
    } catch {
      return null;
    }
  }

  /**
   * Check if IP is from a high-risk country
   */
  public async isHighRiskCountry(ip: string): Promise<boolean> {
    const geoData = await this.geoIPService.lookup(ip);
    if (!geoData) return false;

    // Define high-risk countries (customize as needed)
    const highRiskCountries = [
      'RU', 'CN', 'KP', 'IR', 'SY', 'CU', 'VE', 'BY'
    ];

    return highRiskCountries.includes(geoData.countryCode);
  }

  /**
   * Check if IP is using anonymizing service
   */
  public async isAnonymizingService(ip: string): Promise<boolean> {
    const geoData = await this.geoIPService.lookup(ip);
    if (!geoData) return false;

    return geoData.isProxy || geoData.isVPN || geoData.isTor || false;
  }

  /**
   * Detect suspicious bots
   */
  private isSuspiciousBot(req: Request): boolean {
    const userAgent = req.headers['user-agent'] || '';

    // Check for missing or suspicious user agents
    if (!userAgent || userAgent.length < 10) {
      return true;
    }

    // Check for common bot signatures
    const botSignatures = [
      'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'python-requests',
      'scrapy', 'headless', 'phantom', 'selenium',
    ];

    const lowerUA = userAgent.toLowerCase();
    const isSuspicious = botSignatures.some(sig => lowerUA.includes(sig));

    if (isSuspicious) {
      // Check if it's a legitimate bot (Google, Bing, etc.)
      const legitimateBots = ['googlebot', 'bingbot', 'slackbot', 'linkedinbot'];
      const isLegitimate = legitimateBots.some(bot => lowerUA.includes(bot));

      return !isLegitimate;
    }

    // Check for missing common headers
    if (!req.headers.accept || !req.headers['accept-language']) {
      return true;
    }

    return false;
  }

  /**
   * Generate challenge for suspected bots
   */
  private generateChallenge(): string {
    const challenge = crypto.randomBytes(16).toString('hex');
    return challenge;
  }

  /**
   * Record connection
   */
  private async recordConnection(ip: string, req: Request): Promise<void> {
    const connection: ConnectionInfo = {
      ip,
      timestamp: new Date(),
      userAgent: req.headers['user-agent'],
      path: req.path,
      method: req.method,
    };

    const connections = this.connections.get(ip) || [];
    connections.push(connection);
    this.connections.set(ip, connections);

    // Update Redis stats
    await this.redis.incr('ddos:stats:total_requests');
    await this.redis.sadd('ddos:stats:unique_ips', ip);
  }

  /**
   * Record blocked request
   */
  private async recordBlockedRequest(ip: string, reason: string): Promise<void> {
    await this.redis.incr('ddos:stats:blocked_requests');
    await this.redis.hincrby('ddos:blocked_by_reason', reason, 1);
    await this.redis.zincrby('ddos:top_blocked_ips', 1, ip);
  }

  /**
   * Record suspicious activity
   */
  private async recordSuspiciousActivity(ip: string, type: string): Promise<void> {
    this.suspiciousIPs.add(ip);
    await this.redis.sadd('ddos:suspicious_ips', ip);
    await this.redis.hincrby(`ddos:suspicious:${ip}`, type, 1);
  }

  /**
   * Blacklist an IP
   */
  public async blacklist(ip: string, durationMs?: number): Promise<void> {
    const key = `ddos:blacklist:${ip}`;

    if (durationMs) {
      await this.redis.setex(key, Math.ceil(durationMs / 1000), '1');
    } else {
      await this.redis.set(key, '1');
    }

    await this.redis.sadd('ddos:blacklisted_ips', ip);
  }

  /**
   * Check if IP is blacklisted
   */
  public async isBlacklisted(ip: string): Promise<boolean> {
    const result = await this.redis.get(`ddos:blacklist:${ip}`);
    return result === '1';
  }

  /**
   * Remove IP from blacklist
   */
  public async unblacklist(ip: string): Promise<void> {
    await this.redis.del(`ddos:blacklist:${ip}`);
    await this.redis.srem('ddos:blacklisted_ips', ip);
  }

  /**
   * Get blacklisted IPs
   */
  public async getBlacklist(): Promise<string[]> {
    return await this.redis.smembers('ddos:blacklisted_ips');
  }

  /**
   * Cleanup old connections
   */
  private cleanupConnections(): void {
    const cutoff = Date.now() - this.config.connectionWindowMs;

    for (const [ip, connections] of this.connections.entries()) {
      const recent = connections.filter(c => c.timestamp.getTime() > cutoff);

      if (recent.length === 0) {
        this.connections.delete(ip);
      } else {
        this.connections.set(ip, recent);
      }
    }
  }

  /**
   * Analyze traffic patterns for attacks
   */
  private async analyzeTrafficPatterns(): Promise<void> {
    const now = Date.now();
    const recentWindow = 60000; // Last 1 minute

    // Analyze burst patterns
    const burstIPs: Map<string, number> = new Map();

    for (const [ip, connections] of this.connections.entries()) {
      const recentConnections = connections.filter(
        c => c.timestamp.getTime() > now - recentWindow
      );

      if (recentConnections.length > this.config.maxBurstRequests * 2) {
        burstIPs.set(ip, recentConnections.length);
      }
    }

    if (burstIPs.size > 0) {
      const attack: AttackPattern = {
        type: 'burst',
        confidence: 0.8,
        ips: Array.from(burstIPs.keys()),
        requestCount: Array.from(burstIPs.values()).reduce((a, b) => a + b, 0),
        startTime: new Date(now - recentWindow),
        mitigated: false,
      };

      this.detectedAttacks.push(attack);

      // Auto-mitigate
      for (const ip of attack.ips) {
        await this.blacklist(ip, this.config.blacklistDuration);
      }

      attack.mitigated = true;
      attack.endTime = new Date();
    }

    // Analyze distributed attacks
    const totalConnections = Array.from(this.connections.values())
      .flat()
      .filter(c => c.timestamp.getTime() > now - recentWindow);

    if (totalConnections.length > 1000 && this.connections.size > 50) {
      const attack: AttackPattern = {
        type: 'distributed',
        confidence: 0.7,
        ips: Array.from(this.connections.keys()).slice(0, 50),
        requestCount: totalConnections.length,
        startTime: new Date(now - recentWindow),
        mitigated: false,
      };

      this.detectedAttacks.push(attack);
      attack.mitigated = true; // Just record, don't block all IPs
      attack.endTime = new Date();
    }
  }

  /**
   * Get DDoS statistics
   */
  public async getStats(): Promise<DDoSStats> {
    const totalRequests = parseInt(await this.redis.get('ddos:stats:total_requests') || '0');
    const blockedRequests = parseInt(await this.redis.get('ddos:stats:blocked_requests') || '0');
    const uniqueIPs = await this.redis.scard('ddos:stats:unique_ips');
    const suspiciousIPs = await this.redis.scard('ddos:suspicious_ips');
    const blacklistedIPs = await this.redis.scard('ddos:blacklisted_ips');

    // Active connections
    const activeConnections = Array.from(this.connections.values())
      .flat()
      .filter(c => c.timestamp.getTime() > Date.now() - 60000)
      .length;

    // Top attackers
    const topBlockedData = await this.redis.zrevrange('ddos:top_blocked_ips', 0, 9, 'WITHSCORES');
    const topAttackers: Array<{ ip: string; requests: number; blocked: number }> = [];

    for (let i = 0; i < topBlockedData.length; i += 2) {
      const ip = topBlockedData[i];
      const blocked = parseInt(topBlockedData[i + 1]);
      const connections = this.connections.get(ip)?.length || 0;

      topAttackers.push({
        ip,
        requests: connections + blocked,
        blocked,
      });
    }

    return {
      totalRequests,
      blockedRequests,
      uniqueIPs,
      suspiciousIPs,
      blacklistedIPs,
      activeConnections,
      detectedAttacks: this.detectedAttacks.slice(-10), // Last 10 attacks
      topAttackers,
    };
  }

  /**
   * Close Redis connection
   */
  public async close(): Promise<void> {
    await this.redis.quit();
  }
}

/**
 * Singleton instance
 */
let ddosProtectionInstance: DDoSProtectionService | null = null;

/**
 * Get singleton instance
 */
export function getDDoSProtectionService(
  config?: DDoSConfig,
  redisUrl?: string
): DDoSProtectionService {
  if (!ddosProtectionInstance) {
    ddosProtectionInstance = new DDoSProtectionService(config, redisUrl);
  }
  return ddosProtectionInstance;
}
