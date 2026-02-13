import { Router, Request, Response, NextFunction } from 'express';

export const API_VERSIONS = {
  v1: '1.0',
  v2: '2.0',
} as const;

export type ApiVersion = keyof typeof API_VERSIONS;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      apiVersion?: ApiVersion;
    }
  }
}

export function apiVersionMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Extract version from URL path (/api/v1/... or /api/v2/...)
  const versionMatch = req.path.match(/^\/api\/(v\d+)\//);
  if (versionMatch) {
    req.apiVersion = versionMatch[1] as ApiVersion;
  } else {
    req.apiVersion = 'v1'; // Default to v1
  }

  // Set version header in response
  res.setHeader('X-API-Version', API_VERSIONS[req.apiVersion] || API_VERSIONS.v1);

  next();
}

// Helper to create versioned routes
export function createVersionedRouter(): { v1: Router; v2: Router } {
  return {
    v1: Router(),
    v2: Router()
  };
}
