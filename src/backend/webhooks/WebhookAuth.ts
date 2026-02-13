/**
 * Webhook Authentication System
 * Supports 7 authentication methods for webhooks
 */

import crypto from 'crypto';
import { logger } from '../../services/SimpleLogger';

export type AuthMethod = 'none' | 'basic' | 'header' | 'query' | 'jwt' | 'hmac' | 'oauth2';

export interface AuthConfig {
  method: AuthMethod;
  config: AuthMethodConfig;
}

export type AuthMethodConfig =
  | NoneAuthConfig
  | BasicAuthConfig
  | HeaderAuthConfig
  | QueryAuthConfig
  | JWTAuthConfig
  | HMACAuthConfig
  | OAuth2AuthConfig;

export interface NoneAuthConfig {
  type: 'none';
}

export interface BasicAuthConfig {
  type: 'basic';
  username: string;
  password: string;
}

export interface HeaderAuthConfig {
  type: 'header';
  headerName: string;
  headerValue: string;
  caseSensitive?: boolean;
}

export interface QueryAuthConfig {
  type: 'query';
  paramName: string;
  paramValue: string;
}

export interface JWTAuthConfig {
  type: 'jwt';
  secret: string;
  algorithm?: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512';
  issuer?: string;
  audience?: string;
  clockTolerance?: number; // seconds
}

export interface HMACAuthConfig {
  type: 'hmac';
  secret: string;
  algorithm: 'sha1' | 'sha256' | 'sha512';
  headerName: string; // Header containing the signature
  includeHeaders?: string[]; // Headers to include in signature
  prefix?: string; // e.g., "sha256=" for GitHub style
}

export interface OAuth2AuthConfig {
  type: 'oauth2';
  tokenEndpoint?: string;
  introspectionEndpoint?: string;
  requiredScopes?: string[];
  acceptedIssuers?: string[];
}

export interface AuthRequest {
  method: string;
  path: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body?: any;
  rawBody?: string | Buffer;
}

export interface AuthResult {
  authenticated: boolean;
  method: AuthMethod;
  error?: string;
  metadata?: Record<string, any>;
}

export class WebhookAuth {
  /**
   * Authenticate a webhook request
   */
  async authenticate(request: AuthRequest, authConfig: AuthConfig): Promise<AuthResult> {
    try {
      switch (authConfig.config.type) {
        case 'none':
          return this.authenticateNone();

        case 'basic':
          return this.authenticateBasic(request, authConfig.config);

        case 'header':
          return this.authenticateHeader(request, authConfig.config);

        case 'query':
          return this.authenticateQuery(request, authConfig.config);

        case 'jwt':
          return await this.authenticateJWT(request, authConfig.config);

        case 'hmac':
          return this.authenticateHMAC(request, authConfig.config);

        case 'oauth2':
          return await this.authenticateOAuth2(request, authConfig.config);

        default:
          return {
            authenticated: false,
            method: authConfig.method,
            error: 'Unknown authentication method'
          };
      }
    } catch (error) {
      logger.error('Authentication error:', error);
      return {
        authenticated: false,
        method: authConfig.method,
        error: (error as Error).message
      };
    }
  }

  /**
   * Method 1: No Authentication
   */
  private authenticateNone(): AuthResult {
    return {
      authenticated: true,
      method: 'none'
    };
  }

  /**
   * Method 2: Basic Authentication
   * Authorization: Basic base64(username:password)
   */
  private authenticateBasic(request: AuthRequest, config: BasicAuthConfig): AuthResult {
    const authHeader = request.headers['authorization'] || request.headers['Authorization'];

    if (!authHeader) {
      return {
        authenticated: false,
        method: 'basic',
        error: 'Missing Authorization header'
      };
    }

    if (!authHeader.startsWith('Basic ')) {
      return {
        authenticated: false,
        method: 'basic',
        error: 'Invalid Authorization header format'
      };
    }

    try {
      const base64Credentials = authHeader.substring(6);
      const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
      const [username, password] = credentials.split(':');

      if (username === config.username && password === config.password) {
        return {
          authenticated: true,
          method: 'basic',
          metadata: { username }
        };
      }

      return {
        authenticated: false,
        method: 'basic',
        error: 'Invalid credentials'
      };
    } catch (error) {
      return {
        authenticated: false,
        method: 'basic',
        error: 'Failed to decode credentials'
      };
    }
  }

  /**
   * Method 3: Header Authentication
   * Custom header with specific value (e.g., X-API-Key)
   */
  private authenticateHeader(request: AuthRequest, config: HeaderAuthConfig): AuthResult {
    const headerValue = request.headers[config.headerName] || request.headers[config.headerName.toLowerCase()];

    if (!headerValue) {
      return {
        authenticated: false,
        method: 'header',
        error: `Missing header: ${config.headerName}`
      };
    }

    const matches = config.caseSensitive
      ? headerValue === config.headerValue
      : headerValue.toLowerCase() === config.headerValue.toLowerCase();

    if (matches) {
      return {
        authenticated: true,
        method: 'header',
        metadata: { headerName: config.headerName }
      };
    }

    return {
      authenticated: false,
      method: 'header',
      error: 'Invalid header value'
    };
  }

  /**
   * Method 4: Query Parameter Authentication
   * API key in query string (e.g., ?api_key=xxx)
   */
  private authenticateQuery(request: AuthRequest, config: QueryAuthConfig): AuthResult {
    const paramValue = request.query[config.paramName];

    if (!paramValue) {
      return {
        authenticated: false,
        method: 'query',
        error: `Missing query parameter: ${config.paramName}`
      };
    }

    if (paramValue === config.paramValue) {
      return {
        authenticated: true,
        method: 'query',
        metadata: { paramName: config.paramName }
      };
    }

    return {
      authenticated: false,
      method: 'query',
      error: 'Invalid query parameter value'
    };
  }

  /**
   * Method 5: JWT (JSON Web Token) Authentication
   * Authorization: Bearer <token>
   */
  private async authenticateJWT(request: AuthRequest, config: JWTAuthConfig): Promise<AuthResult> {
    const authHeader = request.headers['authorization'] || request.headers['Authorization'];

    if (!authHeader) {
      return {
        authenticated: false,
        method: 'jwt',
        error: 'Missing Authorization header'
      };
    }

    if (!authHeader.startsWith('Bearer ')) {
      return {
        authenticated: false,
        method: 'jwt',
        error: 'Invalid Authorization header format'
      };
    }

    const token = authHeader.substring(7);

    try {
      // Simple JWT verification (in production, use jsonwebtoken library)
      const [headerB64, payloadB64, signature] = token.split('.');

      if (!headerB64 || !payloadB64 || !signature) {
        return {
          authenticated: false,
          method: 'jwt',
          error: 'Invalid JWT format'
        };
      }

      // Verify signature
      const algorithm = config.algorithm || 'HS256';
      const signatureInput = `${headerB64}.${payloadB64}`;
      const expectedSignature = this.createJWTSignature(signatureInput, config.secret, algorithm);

      if (signature !== expectedSignature) {
        return {
          authenticated: false,
          method: 'jwt',
          error: 'Invalid signature'
        };
      }

      // Decode payload
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));

      // Verify expiration
      if (payload.exp) {
        const now = Math.floor(Date.now() / 1000);
        const clockTolerance = config.clockTolerance || 0;

        if (payload.exp < now - clockTolerance) {
          return {
            authenticated: false,
            method: 'jwt',
            error: 'Token expired'
          };
        }
      }

      // Verify not before
      if (payload.nbf) {
        const now = Math.floor(Date.now() / 1000);
        const clockTolerance = config.clockTolerance || 0;

        if (payload.nbf > now + clockTolerance) {
          return {
            authenticated: false,
            method: 'jwt',
            error: 'Token not yet valid'
          };
        }
      }

      // Verify issuer
      if (config.issuer && payload.iss !== config.issuer) {
        return {
          authenticated: false,
          method: 'jwt',
          error: 'Invalid issuer'
        };
      }

      // Verify audience
      if (config.audience) {
        const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
        if (!audiences.includes(config.audience)) {
          return {
            authenticated: false,
            method: 'jwt',
            error: 'Invalid audience'
          };
        }
      }

      return {
        authenticated: true,
        method: 'jwt',
        metadata: {
          subject: payload.sub,
          issuer: payload.iss,
          audience: payload.aud,
          expiresAt: payload.exp ? new Date(payload.exp * 1000) : undefined
        }
      };
    } catch (error) {
      return {
        authenticated: false,
        method: 'jwt',
        error: `JWT verification failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Method 6: HMAC Signature Authentication
   * Used by GitHub, Shopify, Stripe, etc.
   */
  private authenticateHMAC(request: AuthRequest, config: HMACAuthConfig): AuthResult {
    const signatureHeader = request.headers[config.headerName] || request.headers[config.headerName.toLowerCase()];

    if (!signatureHeader) {
      return {
        authenticated: false,
        method: 'hmac',
        error: `Missing signature header: ${config.headerName}`
      };
    }

    try {
      // Get the signature from header (remove prefix if configured)
      let providedSignature = signatureHeader;
      if (config.prefix && signatureHeader.startsWith(config.prefix)) {
        providedSignature = signatureHeader.substring(config.prefix.length);
      }

      // Build the data to sign
      let dataToSign: string;

      if (config.includeHeaders && config.includeHeaders.length > 0) {
        // Include specific headers in signature (for request signing)
        const parts: string[] = [];

        // Add method and path
        parts.push(request.method.toUpperCase());
        parts.push(request.path);

        // Add specified headers
        for (const headerName of config.includeHeaders) {
          const headerValue = request.headers[headerName] || request.headers[headerName.toLowerCase()] || '';
          parts.push(`${headerName}:${headerValue}`);
        }

        // Add body
        if (request.rawBody) {
          const bodyString = Buffer.isBuffer(request.rawBody)
            ? request.rawBody.toString('utf-8')
            : request.rawBody;
          parts.push(bodyString);
        }

        dataToSign = parts.join('\n');
      } else {
        // Simple body-only signature (most common)
        if (request.rawBody) {
          dataToSign = Buffer.isBuffer(request.rawBody)
            ? request.rawBody.toString('utf-8')
            : request.rawBody;
        } else if (request.body) {
          dataToSign = typeof request.body === 'string'
            ? request.body
            : JSON.stringify(request.body);
        } else {
          dataToSign = '';
        }
      }

      // Calculate expected signature
      const expectedSignature = crypto
        .createHmac(config.algorithm, config.secret)
        .update(dataToSign)
        .digest('hex');

      // Timing-safe comparison
      if (!this.timingSafeEqual(providedSignature, expectedSignature)) {
        return {
          authenticated: false,
          method: 'hmac',
          error: 'Invalid signature'
        };
      }

      return {
        authenticated: true,
        method: 'hmac',
        metadata: {
          algorithm: config.algorithm,
          headerName: config.headerName
        }
      };
    } catch (error) {
      return {
        authenticated: false,
        method: 'hmac',
        error: `HMAC verification failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Method 7: OAuth2 Bearer Token Authentication
   * Authorization: Bearer <access_token>
   */
  private async authenticateOAuth2(request: AuthRequest, config: OAuth2AuthConfig): Promise<AuthResult> {
    const authHeader = request.headers['authorization'] || request.headers['Authorization'];

    if (!authHeader) {
      return {
        authenticated: false,
        method: 'oauth2',
        error: 'Missing Authorization header'
      };
    }

    if (!authHeader.startsWith('Bearer ')) {
      return {
        authenticated: false,
        method: 'oauth2',
        error: 'Invalid Authorization header format'
      };
    }

    const token = authHeader.substring(7);

    try {
      // If introspection endpoint is configured, validate token
      if (config.introspectionEndpoint) {
        const introspectionResult = await this.introspectToken(token, config.introspectionEndpoint);

        if (!introspectionResult.active) {
          return {
            authenticated: false,
            method: 'oauth2',
            error: 'Token is not active'
          };
        }

        // Verify scopes if required
        if (config.requiredScopes && config.requiredScopes.length > 0) {
          const tokenScopes = introspectionResult.scope ? introspectionResult.scope.split(' ') : [];
          const hasRequiredScopes = config.requiredScopes.every(scope => tokenScopes.includes(scope));

          if (!hasRequiredScopes) {
            return {
              authenticated: false,
              method: 'oauth2',
              error: 'Insufficient scopes'
            };
          }
        }

        // Verify issuer if configured
        if (config.acceptedIssuers && config.acceptedIssuers.length > 0) {
          if (!introspectionResult.iss || !config.acceptedIssuers.includes(introspectionResult.iss)) {
            return {
              authenticated: false,
              method: 'oauth2',
              error: 'Invalid issuer'
            };
          }
        }

        return {
          authenticated: true,
          method: 'oauth2',
          metadata: {
            subject: introspectionResult.sub,
            scopes: introspectionResult.scope,
            clientId: introspectionResult.client_id,
            expiresAt: introspectionResult.exp ? new Date(introspectionResult.exp * 1000) : undefined
          }
        };
      }

      // Simple token validation (just check if token exists)
      // In production, you should validate against your OAuth2 provider
      if (token && token.length > 0) {
        return {
          authenticated: true,
          method: 'oauth2',
          metadata: {
            token: token.substring(0, 10) + '...' // Don't log full token
          }
        };
      }

      return {
        authenticated: false,
        method: 'oauth2',
        error: 'Invalid token'
      };
    } catch (error) {
      return {
        authenticated: false,
        method: 'oauth2',
        error: `OAuth2 verification failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Create JWT signature
   */
  private createJWTSignature(data: string, secret: string, algorithm: string): string {
    const hmacAlg = algorithm.replace('HS', 'sha').replace('RS', 'sha').toLowerCase();

    return crypto
      .createHmac(hmacAlg as any, secret)
      .update(data)
      .digest('base64url');
  }

  /**
   * Timing-safe string comparison
   */
  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      // Still do comparison to prevent timing attacks
      const bufA = Buffer.from(a);
      const bufB = Buffer.from(b.substring(0, a.length).padEnd(a.length, '0'));
      try {
        return crypto.timingSafeEqual(bufA, bufB);
      } catch {
        return false;
      }
    }

    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);

    try {
      return crypto.timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }

  /**
   * Introspect OAuth2 token
   */
  private async introspectToken(token: string, introspectionEndpoint: string): Promise<any> {
    const response = await fetch(introspectionEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `token=${encodeURIComponent(token)}`
    });

    if (!response.ok) {
      throw new Error(`Token introspection failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Generate authentication examples for documentation
   */
  generateExample(config: AuthMethodConfig): {
    curl: string;
    javascript: string;
    python: string;
  } {
    switch (config.type) {
      case 'none':
        return {
          curl: `curl -X POST https://example.com/webhook`,
          javascript: `fetch('https://example.com/webhook', { method: 'POST' })`,
          python: `requests.post('https://example.com/webhook')`
        };

      case 'basic':
        return {
          curl: `curl -X POST https://example.com/webhook \\
  -u ${config.username}:${config.password}`,
          javascript: `fetch('https://example.com/webhook', {
  method: 'POST',
  headers: {
    'Authorization': 'Basic ' + btoa('${config.username}:${config.password}')
  }
})`,
          python: `requests.post('https://example.com/webhook',
  auth=('${config.username}', '${config.password}'))`
        };

      case 'header':
        return {
          curl: `curl -X POST https://example.com/webhook \\
  -H "${config.headerName}: ${config.headerValue}"`,
          javascript: `fetch('https://example.com/webhook', {
  method: 'POST',
  headers: {
    '${config.headerName}': '${config.headerValue}'
  }
})`,
          python: `requests.post('https://example.com/webhook',
  headers={'${config.headerName}': '${config.headerValue}'})`
        };

      case 'query':
        return {
          curl: `curl -X POST "https://example.com/webhook?${config.paramName}=${config.paramValue}"`,
          javascript: `fetch('https://example.com/webhook?${config.paramName}=${config.paramValue}', {
  method: 'POST'
})`,
          python: `requests.post('https://example.com/webhook',
  params={'${config.paramName}': '${config.paramValue}'})`
        };

      case 'jwt':
        return {
          curl: `curl -X POST https://example.com/webhook \\
  -H "Authorization: Bearer <your-jwt-token>"`,
          javascript: `fetch('https://example.com/webhook', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + yourJWTToken
  }
})`,
          python: `requests.post('https://example.com/webhook',
  headers={'Authorization': 'Bearer ' + your_jwt_token})`
        };

      case 'hmac':
        return {
          curl: `# Calculate HMAC signature
signature=$(echo -n "$payload" | openssl dgst -${config.algorithm} -hmac "$secret" | sed 's/^.* //')
curl -X POST https://example.com/webhook \\
  -H "${config.headerName}: ${config.prefix || ''}$signature" \\
  -d "$payload"`,
          javascript: `const crypto = require('crypto');
const signature = crypto.createHmac('${config.algorithm}', secret)
  .update(payload)
  .digest('hex');

fetch('https://example.com/webhook', {
  method: 'POST',
  headers: {
    '${config.headerName}': '${config.prefix || ''}' + signature
  },
  body: payload
})`,
          python: `import hmac
import hashlib

signature = hmac.new(
  secret.encode(),
  payload.encode(),
  hashlib.${config.algorithm}
).hexdigest()

requests.post('https://example.com/webhook',
  headers={'${config.headerName}': '${config.prefix || ''}' + signature},
  data=payload)`
        };

      case 'oauth2':
        return {
          curl: `curl -X POST https://example.com/webhook \\
  -H "Authorization: Bearer <your-access-token>"`,
          javascript: `fetch('https://example.com/webhook', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + accessToken
  }
})`,
          python: `requests.post('https://example.com/webhook',
  headers={'Authorization': 'Bearer ' + access_token})`
        };
    }
  }
}

// Export singleton instance
export const webhookAuth = new WebhookAuth();
