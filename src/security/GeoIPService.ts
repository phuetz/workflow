/**
 * GeoIP Service
 *
 * Provides IP geolocation functionality with multiple provider support:
 * - MaxMind GeoLite2 (local database)
 * - MaxMind GeoIP2 API (cloud)
 * - ip-api.com (free API)
 * - ipinfo.io (API)
 * - ipdata.co (API)
 *
 * Features:
 * - LRU caching for fast lookups
 * - Fallback between providers
 * - VPN/Proxy/Tor detection
 * - Rate limiting for API providers
 *
 * @module GeoIPService
 */

import { LRUCache } from 'lru-cache';

/**
 * GeoIP lookup result
 */
export interface GeoIPResult {
  ip: string;
  countryCode: string;
  countryName: string;
  region?: string;
  regionCode?: string;
  city?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
  organization?: string;
  asn?: string;
  isProxy?: boolean;
  isVPN?: boolean;
  isTor?: boolean;
  isHosting?: boolean;
  isMobile?: boolean;
  threatLevel?: 'low' | 'medium' | 'high' | 'critical';
  cached?: boolean;
  provider?: string;
  lookupTime?: number;
}

/**
 * GeoIP provider configuration
 */
export interface GeoIPProviderConfig {
  /** Provider name */
  name: string;
  /** API key (if required) */
  apiKey?: string;
  /** API endpoint */
  endpoint?: string;
  /** Priority (lower = higher priority) */
  priority?: number;
  /** Max requests per minute (for rate limiting) */
  rateLimit?: number;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Whether this provider is enabled */
  enabled?: boolean;
}

/**
 * GeoIP service configuration
 */
export interface GeoIPConfig {
  /** Cache max size */
  cacheMaxSize?: number;
  /** Cache TTL in milliseconds */
  cacheTTL?: number;
  /** Default timeout for API calls */
  defaultTimeout?: number;
  /** Provider configurations */
  providers?: GeoIPProviderConfig[];
  /** Path to MaxMind database file */
  maxmindDbPath?: string;
}

/**
 * Rate limiter for API providers
 */
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 60, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  canMakeRequest(): boolean {
    const now = Date.now();
    this.requests = this.requests.filter(t => t > now - this.windowMs);
    return this.requests.length < this.maxRequests;
  }

  recordRequest(): void {
    this.requests.push(Date.now());
  }
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<GeoIPConfig> = {
  cacheMaxSize: 10000,
  cacheTTL: 3600000, // 1 hour
  defaultTimeout: 5000,
  providers: [
    { name: 'ip-api', priority: 1, rateLimit: 45, enabled: true },
    { name: 'ipinfo', priority: 2, rateLimit: 50, enabled: false },
    { name: 'ipdata', priority: 3, rateLimit: 100, enabled: false },
    { name: 'maxmind-api', priority: 4, rateLimit: 1000, enabled: false },
  ],
  maxmindDbPath: '',
};

/**
 * Country code to name mapping (ISO 3166-1 alpha-2)
 */
const COUNTRY_NAMES: Record<string, string> = {
  AF: 'Afghanistan', AL: 'Albania', DZ: 'Algeria', AD: 'Andorra', AO: 'Angola',
  AR: 'Argentina', AM: 'Armenia', AU: 'Australia', AT: 'Austria', AZ: 'Azerbaijan',
  BS: 'Bahamas', BH: 'Bahrain', BD: 'Bangladesh', BB: 'Barbados', BY: 'Belarus',
  BE: 'Belgium', BZ: 'Belize', BJ: 'Benin', BT: 'Bhutan', BO: 'Bolivia',
  BA: 'Bosnia and Herzegovina', BW: 'Botswana', BR: 'Brazil', BN: 'Brunei', BG: 'Bulgaria',
  BF: 'Burkina Faso', BI: 'Burundi', KH: 'Cambodia', CM: 'Cameroon', CA: 'Canada',
  CV: 'Cape Verde', CF: 'Central African Republic', TD: 'Chad', CL: 'Chile', CN: 'China',
  CO: 'Colombia', KM: 'Comoros', CG: 'Congo', CD: 'DR Congo', CR: 'Costa Rica',
  HR: 'Croatia', CU: 'Cuba', CY: 'Cyprus', CZ: 'Czech Republic', DK: 'Denmark',
  DJ: 'Djibouti', DM: 'Dominica', DO: 'Dominican Republic', EC: 'Ecuador', EG: 'Egypt',
  SV: 'El Salvador', GQ: 'Equatorial Guinea', ER: 'Eritrea', EE: 'Estonia', ET: 'Ethiopia',
  FJ: 'Fiji', FI: 'Finland', FR: 'France', GA: 'Gabon', GM: 'Gambia',
  GE: 'Georgia', DE: 'Germany', GH: 'Ghana', GR: 'Greece', GD: 'Grenada',
  GT: 'Guatemala', GN: 'Guinea', GW: 'Guinea-Bissau', GY: 'Guyana', HT: 'Haiti',
  HN: 'Honduras', HU: 'Hungary', IS: 'Iceland', IN: 'India', ID: 'Indonesia',
  IR: 'Iran', IQ: 'Iraq', IE: 'Ireland', IL: 'Israel', IT: 'Italy',
  JM: 'Jamaica', JP: 'Japan', JO: 'Jordan', KZ: 'Kazakhstan', KE: 'Kenya',
  KI: 'Kiribati', KP: 'North Korea', KR: 'South Korea', KW: 'Kuwait', KG: 'Kyrgyzstan',
  LA: 'Laos', LV: 'Latvia', LB: 'Lebanon', LS: 'Lesotho', LR: 'Liberia',
  LY: 'Libya', LI: 'Liechtenstein', LT: 'Lithuania', LU: 'Luxembourg', MK: 'North Macedonia',
  MG: 'Madagascar', MW: 'Malawi', MY: 'Malaysia', MV: 'Maldives', ML: 'Mali',
  MT: 'Malta', MH: 'Marshall Islands', MR: 'Mauritania', MU: 'Mauritius', MX: 'Mexico',
  FM: 'Micronesia', MD: 'Moldova', MC: 'Monaco', MN: 'Mongolia', ME: 'Montenegro',
  MA: 'Morocco', MZ: 'Mozambique', MM: 'Myanmar', NA: 'Namibia', NR: 'Nauru',
  NP: 'Nepal', NL: 'Netherlands', NZ: 'New Zealand', NI: 'Nicaragua', NE: 'Niger',
  NG: 'Nigeria', NO: 'Norway', OM: 'Oman', PK: 'Pakistan', PW: 'Palau',
  PS: 'Palestine', PA: 'Panama', PG: 'Papua New Guinea', PY: 'Paraguay', PE: 'Peru',
  PH: 'Philippines', PL: 'Poland', PT: 'Portugal', QA: 'Qatar', RO: 'Romania',
  RU: 'Russia', RW: 'Rwanda', KN: 'Saint Kitts and Nevis', LC: 'Saint Lucia',
  VC: 'Saint Vincent', WS: 'Samoa', SM: 'San Marino', ST: 'Sao Tome and Principe',
  SA: 'Saudi Arabia', SN: 'Senegal', RS: 'Serbia', SC: 'Seychelles', SL: 'Sierra Leone',
  SG: 'Singapore', SK: 'Slovakia', SI: 'Slovenia', SB: 'Solomon Islands', SO: 'Somalia',
  ZA: 'South Africa', SS: 'South Sudan', ES: 'Spain', LK: 'Sri Lanka', SD: 'Sudan',
  SR: 'Suriname', SZ: 'Eswatini', SE: 'Sweden', CH: 'Switzerland', SY: 'Syria',
  TW: 'Taiwan', TJ: 'Tajikistan', TZ: 'Tanzania', TH: 'Thailand', TL: 'Timor-Leste',
  TG: 'Togo', TO: 'Tonga', TT: 'Trinidad and Tobago', TN: 'Tunisia', TR: 'Turkey',
  TM: 'Turkmenistan', TV: 'Tuvalu', UG: 'Uganda', UA: 'Ukraine', AE: 'United Arab Emirates',
  GB: 'United Kingdom', US: 'United States', UY: 'Uruguay', UZ: 'Uzbekistan',
  VU: 'Vanuatu', VA: 'Vatican City', VE: 'Venezuela', VN: 'Vietnam', YE: 'Yemen',
  ZM: 'Zambia', ZW: 'Zimbabwe',
};

/**
 * GeoIP Service
 */
export class GeoIPService {
  private cache: LRUCache<string, GeoIPResult>;
  private config: Required<GeoIPConfig>;
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private providerConfigs: Map<string, GeoIPProviderConfig> = new Map();

  constructor(config?: GeoIPConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize cache
    this.cache = new LRUCache<string, GeoIPResult>({
      max: this.config.cacheMaxSize,
      ttl: this.config.cacheTTL,
    });

    // Initialize provider configs and rate limiters
    for (const provider of this.config.providers) {
      this.providerConfigs.set(provider.name, provider);
      if (provider.rateLimit) {
        this.rateLimiters.set(provider.name, new RateLimiter(provider.rateLimit));
      }
    }

    // Check for API keys from environment
    this.configureFromEnvironment();
  }

  /**
   * Configure providers from environment variables
   */
  private configureFromEnvironment(): void {
    // MaxMind GeoIP2
    if (process.env.MAXMIND_ACCOUNT_ID && process.env.MAXMIND_LICENSE_KEY) {
      const provider = this.providerConfigs.get('maxmind-api');
      if (provider) {
        provider.apiKey = `${process.env.MAXMIND_ACCOUNT_ID}:${process.env.MAXMIND_LICENSE_KEY}`;
        provider.enabled = true;
      }
    }

    // IPInfo
    if (process.env.IPINFO_TOKEN) {
      const provider = this.providerConfigs.get('ipinfo');
      if (provider) {
        provider.apiKey = process.env.IPINFO_TOKEN;
        provider.enabled = true;
      }
    }

    // IPData
    if (process.env.IPDATA_API_KEY) {
      const provider = this.providerConfigs.get('ipdata');
      if (provider) {
        provider.apiKey = process.env.IPDATA_API_KEY;
        provider.enabled = true;
      }
    }

    // MaxMind database path
    if (process.env.MAXMIND_DB_PATH) {
      this.config.maxmindDbPath = process.env.MAXMIND_DB_PATH;
    }
  }

  /**
   * Lookup IP address (async)
   */
  async lookup(ip: string): Promise<GeoIPResult | null> {
    const startTime = Date.now();

    // Validate IP
    if (!this.isValidIP(ip)) {
      return null;
    }

    // Check cache
    const cached = this.cache.get(ip);
    if (cached) {
      return { ...cached, cached: true, lookupTime: Date.now() - startTime };
    }

    // Check for private/reserved IPs
    if (this.isPrivateIP(ip)) {
      const result: GeoIPResult = {
        ip,
        countryCode: 'PRIVATE',
        countryName: 'Private Network',
        provider: 'internal',
        lookupTime: Date.now() - startTime,
      };
      this.cache.set(ip, result);
      return result;
    }

    // Try providers in order of priority
    const enabledProviders = Array.from(this.providerConfigs.values())
      .filter(p => p.enabled)
      .sort((a, b) => (a.priority || 99) - (b.priority || 99));

    for (const provider of enabledProviders) {
      const rateLimiter = this.rateLimiters.get(provider.name);
      if (rateLimiter && !rateLimiter.canMakeRequest()) {
        continue; // Skip if rate limited
      }

      try {
        const result = await this.lookupWithProvider(ip, provider);
        if (result) {
          result.lookupTime = Date.now() - startTime;
          this.cache.set(ip, result);
          rateLimiter?.recordRequest();
          return result;
        }
      } catch (error) {
        console.warn(`GeoIP lookup failed with ${provider.name}:`, error);
        continue;
      }
    }

    return null;
  }

  /**
   * Synchronous lookup (cache only)
   */
  lookupSync(ip: string): GeoIPResult | null {
    if (!this.isValidIP(ip)) {
      return null;
    }

    // Check cache
    const cached = this.cache.get(ip);
    if (cached) {
      return { ...cached, cached: true };
    }

    // Check for private IPs
    if (this.isPrivateIP(ip)) {
      return {
        ip,
        countryCode: 'PRIVATE',
        countryName: 'Private Network',
        provider: 'internal',
      };
    }

    // Trigger async lookup for next time
    this.lookup(ip).catch(() => {});

    return null;
  }

  /**
   * Lookup with specific provider
   */
  private async lookupWithProvider(ip: string, provider: GeoIPProviderConfig): Promise<GeoIPResult | null> {
    const timeout = provider.timeout || this.config.defaultTimeout;

    switch (provider.name) {
      case 'ip-api':
        return this.lookupWithIpApi(ip, timeout);
      case 'ipinfo':
        return this.lookupWithIpInfo(ip, provider.apiKey!, timeout);
      case 'ipdata':
        return this.lookupWithIpData(ip, provider.apiKey!, timeout);
      case 'maxmind-api':
        return this.lookupWithMaxMindApi(ip, provider.apiKey!, timeout);
      default:
        return null;
    }
  }

  /**
   * Lookup using ip-api.com (free, no API key required)
   */
  private async lookupWithIpApi(ip: string, timeout: number): Promise<GeoIPResult | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(
        `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,proxy,hosting,mobile`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      if (data.status !== 'success') {
        return null;
      }

      return {
        ip,
        countryCode: data.countryCode || 'UNKNOWN',
        countryName: data.country || 'Unknown',
        region: data.regionName,
        regionCode: data.region,
        city: data.city,
        postalCode: data.zip,
        latitude: data.lat,
        longitude: data.lon,
        timezone: data.timezone,
        isp: data.isp,
        organization: data.org,
        asn: data.as,
        isProxy: data.proxy,
        isHosting: data.hosting,
        isMobile: data.mobile,
        provider: 'ip-api',
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Lookup using ipinfo.io
   */
  private async lookupWithIpInfo(ip: string, apiKey: string, timeout: number): Promise<GeoIPResult | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(
        `https://ipinfo.io/${ip}?token=${apiKey}`,
        {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' },
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      const [lat, lon] = data.loc?.split(',').map(Number) || [undefined, undefined];

      return {
        ip,
        countryCode: data.country || 'UNKNOWN',
        countryName: COUNTRY_NAMES[data.country] || data.country || 'Unknown',
        region: data.region,
        city: data.city,
        postalCode: data.postal,
        latitude: lat,
        longitude: lon,
        timezone: data.timezone,
        isp: data.org,
        organization: data.org,
        asn: data.asn?.asn,
        isVPN: data.privacy?.vpn,
        isProxy: data.privacy?.proxy,
        isTor: data.privacy?.tor,
        isHosting: data.privacy?.hosting,
        provider: 'ipinfo',
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Lookup using ipdata.co
   */
  private async lookupWithIpData(ip: string, apiKey: string, timeout: number): Promise<GeoIPResult | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(
        `https://api.ipdata.co/${ip}?api-key=${apiKey}`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      return {
        ip,
        countryCode: data.country_code || 'UNKNOWN',
        countryName: data.country_name || 'Unknown',
        region: data.region,
        regionCode: data.region_code,
        city: data.city,
        postalCode: data.postal,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.time_zone?.name,
        isp: data.asn?.name,
        organization: data.asn?.name,
        asn: `AS${data.asn?.asn}`,
        isProxy: data.threat?.is_proxy,
        isVPN: data.threat?.is_vpn,
        isTor: data.threat?.is_tor,
        isHosting: data.threat?.is_datacenter,
        threatLevel: this.mapThreatLevel(data.threat),
        provider: 'ipdata',
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Lookup using MaxMind GeoIP2 API
   */
  private async lookupWithMaxMindApi(ip: string, apiKey: string, timeout: number): Promise<GeoIPResult | null> {
    const [accountId, licenseKey] = apiKey.split(':');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const auth = Buffer.from(`${accountId}:${licenseKey}`).toString('base64');
      const response = await fetch(
        `https://geoip.maxmind.com/geoip/v2.1/city/${ip}`,
        {
          signal: controller.signal,
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json',
          },
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      return {
        ip,
        countryCode: data.country?.iso_code || 'UNKNOWN',
        countryName: data.country?.names?.en || 'Unknown',
        region: data.subdivisions?.[0]?.names?.en,
        regionCode: data.subdivisions?.[0]?.iso_code,
        city: data.city?.names?.en,
        postalCode: data.postal?.code,
        latitude: data.location?.latitude,
        longitude: data.location?.longitude,
        timezone: data.location?.time_zone,
        isp: data.traits?.isp,
        organization: data.traits?.organization,
        asn: data.traits?.autonomous_system_number ? `AS${data.traits.autonomous_system_number}` : undefined,
        isProxy: data.traits?.is_anonymous_proxy,
        isHosting: data.traits?.user_type === 'hosting',
        provider: 'maxmind-api',
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Map threat data to threat level
   */
  private mapThreatLevel(threat: { is_threat?: boolean; is_known_attacker?: boolean; is_known_abuser?: boolean } | undefined): 'low' | 'medium' | 'high' | 'critical' | undefined {
    if (!threat) return undefined;

    if (threat.is_known_attacker) return 'critical';
    if (threat.is_known_abuser) return 'high';
    if (threat.is_threat) return 'medium';
    return 'low';
  }

  /**
   * Validate IP address format
   */
  private isValidIP(ip: string): boolean {
    // IPv4
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Pattern.test(ip)) {
      const parts = ip.split('.').map(Number);
      return parts.every(part => part >= 0 && part <= 255);
    }

    // IPv6
    const ipv6Pattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    const ipv6CompressedPattern = /^(([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4})?::(([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4})?$/;

    return ipv6Pattern.test(ip) || ipv6CompressedPattern.test(ip);
  }

  /**
   * Check if IP is private/reserved
   */
  private isPrivateIP(ip: string): boolean {
    // Private IPv4 ranges
    const privateRanges = [
      /^10\./,                          // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
      /^192\.168\./,                    // 192.168.0.0/16
      /^127\./,                         // 127.0.0.0/8 (loopback)
      /^169\.254\./,                    // 169.254.0.0/16 (link-local)
      /^::1$/,                          // IPv6 loopback
      /^fe80:/i,                        // IPv6 link-local
      /^fc00:/i,                        // IPv6 unique local
      /^fd00:/i,                        // IPv6 unique local
    ];

    return privateRanges.some(pattern => pattern.test(ip));
  }

  /**
   * Bulk lookup
   */
  async bulkLookup(ips: string[]): Promise<Map<string, GeoIPResult | null>> {
    const results = new Map<string, GeoIPResult | null>();

    // Process in parallel with concurrency limit
    const concurrency = 10;
    const chunks: string[][] = [];

    for (let i = 0; i < ips.length; i += concurrency) {
      chunks.push(ips.slice(i, i + concurrency));
    }

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(async ip => ({ ip, result: await this.lookup(ip) }))
      );

      for (const { ip, result } of chunkResults) {
        results.set(ip, result);
      }
    }

    return results;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.config.cacheMaxSize,
      hitRate: 0, // Would need to track hits/misses
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Pre-warm cache with known IPs
   */
  async warmCache(ips: string[]): Promise<void> {
    await this.bulkLookup(ips);
  }
}

/**
 * Singleton instance
 */
let geoIPServiceInstance: GeoIPService | null = null;

/**
 * Get singleton instance
 */
export function getGeoIPService(config?: GeoIPConfig): GeoIPService {
  if (!geoIPServiceInstance) {
    geoIPServiceInstance = new GeoIPService(config);
  }
  return geoIPServiceInstance;
}

/**
 * Initialize GeoIP service with custom config
 */
export function initializeGeoIPService(config: GeoIPConfig): GeoIPService {
  geoIPServiceInstance = new GeoIPService(config);
  return geoIPServiceInstance;
}
