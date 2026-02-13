/**
 * Content Security Policy Configuration
 * Secure CSP headers to prevent XSS and other attacks
 */

import { Request, Response, NextFunction } from 'express';

export interface CSPDirectives {
  'default-src'?: string[];
  'script-src'?: string[];
  'style-src'?: string[];
  'img-src'?: string[];
  'font-src'?: string[];
  'connect-src'?: string[];
  'media-src'?: string[];
  'object-src'?: string[];
  'frame-src'?: string[];
  'worker-src'?: string[];
  'form-action'?: string[];
  'frame-ancestors'?: string[];
  'base-uri'?: string[];
  'manifest-src'?: string[];
  'report-uri'?: string;
  'report-to'?: string;
}

export interface SecurityHeaders {
  'Content-Security-Policy': string;
  'X-Content-Type-Options': string;
  'X-Frame-Options': string;
  'X-XSS-Protection': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
  'Strict-Transport-Security': string;
}

export class CSPConfig {
  private static instance: CSPConfig;
  private isDevelopment = process.env.NODE_ENV === 'development';
  
  private constructor() {}
  
  public static getInstance(): CSPConfig {
    if (!CSPConfig.instance) {
      CSPConfig.instance = new CSPConfig();
    }
    return CSPConfig.instance;
  }
  
  /**
   * Get CSP directives based on environment
   */
  public getCSPDirectives(): CSPDirectives {
    const baseDirectives: CSPDirectives = {
      'default-src': ["'self'"],
      'script-src': this.getScriptSources(),
      'style-src': this.getStyleSources(),
      'img-src': ["'self'", 'data:', 'https:', 'blob:'],
      'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
      'connect-src': this.getConnectSources(),
      'media-src': ["'self'", 'blob:'],
      'object-src': ["'none'"],
      'frame-src': ["'self'"],
      'worker-src': ["'self'", 'blob:'],
      'form-action': ["'self'"],
      'frame-ancestors': ["'self'"],
      'base-uri': ["'self'"],
      'manifest-src': ["'self'"],
    };
    
    // Add reporting in production
    if (!this.isDevelopment) {
      baseDirectives['report-uri'] = '/api/csp-report';
      baseDirectives['report-to'] = 'csp-endpoint';
    }
    
    return baseDirectives;
  }
  
  /**
   * Get script sources based on environment
   */
  private getScriptSources(): string[] {
    const sources = ["'self'"];
    
    // Add nonce support for inline scripts
    sources.push("'nonce-{NONCE}'");
    
    // Add strict-dynamic for better security
    sources.push("'strict-dynamic'");
    
    // Development only: Allow HMR and dev tools
    if (this.isDevelopment) {
      sources.push("'unsafe-eval'"); // Required for HMR in development only
      sources.push('http://localhost:*');
      sources.push('ws://localhost:*');
    }
    
    // Add trusted CDNs
    sources.push(
      'https://cdn.jsdelivr.net',
      'https://unpkg.com',
      'https://cdnjs.cloudflare.com'
    );
    
    return sources;
  }
  
  /**
   * Get style sources
   */
  private getStyleSources(): string[] {
    const sources = ["'self'"];
    
    // Add nonce support for inline styles
    sources.push("'nonce-{NONCE}'");
    
    // Development only: Allow inline styles for HMR
    if (this.isDevelopment) {
      sources.push("'unsafe-inline'");
    }
    
    // Add trusted style sources
    sources.push(
      'https://fonts.googleapis.com',
      'https://cdn.jsdelivr.net'
    );
    
    return sources;
  }
  
  /**
   * Get connect sources (API endpoints, WebSocket connections)
   */
  private getConnectSources(): string[] {
    const sources = ["'self'"];
    
    // Add API endpoints
    const apiUrl = process.env.VITE_API_BASE_URL || 'http://localhost:3001';
    sources.push(apiUrl);
    
    // Add WebSocket endpoints
    const wsUrl = process.env.VITE_WS_URL || 'ws://localhost:3001';
    sources.push(wsUrl);
    
    // Development only
    if (this.isDevelopment) {
      sources.push('http://localhost:*');
      sources.push('ws://localhost:*');
      sources.push('wss://localhost:*');
    }
    
    // Add external API endpoints that the app might connect to
    sources.push(
      'https://api.github.com',
      'https://api.openai.com',
      'https://api.anthropic.com',
      'https://www.googleapis.com',
      'https://graph.microsoft.com',
      'https://api.stripe.com',
      'https://api.sendgrid.com'
    );
    
    return sources;
  }
  
  /**
   * Build CSP header string from directives
   */
  public buildCSPHeader(nonce?: string): string {
    const directives = this.getCSPDirectives();
    const headerParts: string[] = [];
    
    for (const [directive, values] of Object.entries(directives)) {
      if (values) {
        let valueString: string;
        
        if (Array.isArray(values)) {
          valueString = values.join(' ');
        } else {
          valueString = values;
        }
        
        // Replace nonce placeholder if provided
        if (nonce) {
          valueString = valueString.replace(/{NONCE}/g, nonce);
        } else {
          // Remove nonce directive if no nonce provided
          valueString = valueString.replace(/'nonce-{NONCE}'/g, '');
        }
        
        headerParts.push(`${directive} ${valueString}`);
      }
    }
    
    return headerParts.join('; ');
  }
  
  /**
   * Get all security headers
   */
  public getSecurityHeaders(nonce?: string): SecurityHeaders {
    return {
      'Content-Security-Policy': this.buildCSPHeader(nonce),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': this.getPermissionsPolicy(),
      'Strict-Transport-Security': this.getHSTSHeader()
    };
  }
  
  /**
   * Get Permissions Policy header
   */
  private getPermissionsPolicy(): string {
    const policies = [
      'accelerometer=()',
      'ambient-light-sensor=()',
      'autoplay=(self)',
      'battery=()',
      'camera=()',
      'display-capture=()',
      'document-domain=()',
      'encrypted-media=()',
      'execution-while-not-rendered=()',
      'execution-while-out-of-viewport=()',
      'fullscreen=(self)',
      'geolocation=()',
      'gyroscope=()',
      'magnetometer=()',
      'microphone=()',
      'midi=()',
      'navigation-override=()',
      'payment=()',
      'picture-in-picture=()',
      'publickey-credentials-get=()',
      'screen-wake-lock=()',
      'sync-xhr=()',
      'usb=()',
      'web-share=()',
      'xr-spatial-tracking=()'
    ];
    
    return policies.join(', ');
  }
  
  /**
   * Get HSTS header
   */
  private getHSTSHeader(): string {
    if (this.isDevelopment) {
      // Don't set HSTS in development
      return '';
    }
    
    // Set HSTS for 1 year, including subdomains, with preload
    return 'max-age=31536000; includeSubDomains; preload';
  }
  
  /**
   * Generate a random nonce for CSP
   */
  public generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Buffer.from(array).toString('base64');
  }
  
  /**
   * Validate CSP report
   */
  public validateCSPReport(report: any): boolean {
    // Validate that the report has the expected structure
    if (!report || typeof report !== 'object') {
      return false;
    }
    
    const cspReport = report['csp-report'];
    if (!cspReport || typeof cspReport !== 'object') {
      return false;
    }
    
    // Check for required fields
    const requiredFields = [
      'document-uri',
      'violated-directive',
      'blocked-uri'
    ];
    
    for (const field of requiredFields) {
      if (!cspReport[field]) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Create Express middleware for CSP
   */
  public expressMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Generate nonce for this request
      const nonce = this.generateNonce();
      
      // Store nonce on response locals for use in templates
      res.locals.cspNonce = nonce;
      
      // Set security headers
      const headers = this.getSecurityHeaders(nonce);
      
      for (const [header, value] of Object.entries(headers)) {
        if (value) {
          res.setHeader(header, value);
        }
      }
      
      next();
    };
  }
}

// Export singleton instance
export default CSPConfig.getInstance();