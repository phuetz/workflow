/**
 * Middleware Tests
 * Tests for auth, role-based access, and error handling middleware.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before imports
vi.mock('../../backend/auth/jwt', () => ({
  jwtService: {
    verifyToken: vi.fn(),
  },
}));

vi.mock('../../backend/database/userRepository', () => ({
  userRepository: {
    findById: vi.fn(),
  },
}));

vi.mock('../../services/SimpleLogger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { authMiddleware, requireRole, requirePermission, type AuthRequest } from '../../backend/api/middleware/auth';
import { jwtService } from '../../backend/auth/jwt';
import { userRepository } from '../../backend/database/userRepository';

function mockReq(overrides = {}): any {
  return { headers: {}, ...overrides };
}

function mockRes(): any {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function mockNext(): any {
  return vi.fn();
}

describe('authMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no token provided', async () => {
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No authentication token provided' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is invalid', async () => {
    const req = mockReq({ headers: { authorization: 'Bearer invalid-token' } });
    const res = mockRes();
    const next = mockNext();

    vi.mocked(jwtService.verifyToken).mockResolvedValue(null as any);

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
  });

  it('returns 401 when user not found', async () => {
    const req = mockReq({ headers: { authorization: 'Bearer valid-token' } });
    const res = mockRes();
    const next = mockNext();

    vi.mocked(jwtService.verifyToken).mockResolvedValue({ sub: 'user-1' } as any);
    vi.mocked(userRepository.findById).mockResolvedValue(null as any);

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'User account not found or inactive' });
  });

  it('returns 401 when user is inactive', async () => {
    const req = mockReq({ headers: { authorization: 'Bearer valid-token' } });
    const res = mockRes();
    const next = mockNext();

    vi.mocked(jwtService.verifyToken).mockResolvedValue({ sub: 'user-1' } as any);
    vi.mocked(userRepository.findById).mockResolvedValue({
      id: 'user-1', email: 'test@test.com', role: 'USER', status: 'disabled', permissions: [],
    } as any);

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('attaches user and calls next() on valid token', async () => {
    const req = mockReq({ headers: { authorization: 'Bearer valid-token' } }) as AuthRequest;
    const res = mockRes();
    const next = mockNext();

    vi.mocked(jwtService.verifyToken).mockResolvedValue({ sub: 'user-1' } as any);
    vi.mocked(userRepository.findById).mockResolvedValue({
      id: 'user-1', email: 'test@test.com', role: 'ADMIN', status: 'active', permissions: ['read', 'write'],
    } as any);

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({
      id: 'user-1',
      email: 'test@test.com',
      role: 'ADMIN',
      permissions: ['read', 'write'],
    });
  });

  it('handles exceptions gracefully', async () => {
    const req = mockReq({ headers: { authorization: 'Bearer crash-token' } });
    const res = mockRes();
    const next = mockNext();

    vi.mocked(jwtService.verifyToken).mockRejectedValue(new Error('JWT decode failed'));

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication failed' });
  });
});

describe('requireRole', () => {
  it('returns 401 when no user on request', () => {
    const middleware = requireRole('ADMIN');
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when user has wrong role', () => {
    const middleware = requireRole('ADMIN');
    const req = mockReq({ user: { id: '1', email: 'u@t.com', role: 'USER', permissions: [] } });
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
  });

  it('calls next() when user has correct role', () => {
    const middleware = requireRole('ADMIN', 'SUPERADMIN');
    const req = mockReq({ user: { id: '1', email: 'u@t.com', role: 'ADMIN', permissions: [] } });
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

describe('requirePermission', () => {
  it('returns 401 when no user on request', () => {
    const middleware = requirePermission('write');
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 403 when user lacks permission', () => {
    const middleware = requirePermission('write', 'admin');
    const req = mockReq({ user: { id: '1', email: 'u@t.com', role: 'USER', permissions: ['read'] } });
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('calls next() when user has all required permissions', () => {
    const middleware = requirePermission('read', 'write');
    const req = mockReq({ user: { id: '1', email: 'u@t.com', role: 'USER', permissions: ['read', 'write', 'delete'] } });
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
