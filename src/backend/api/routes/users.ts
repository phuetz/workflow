/**
 * User Management API Routes
 * Complete user management endpoints for multi-tenant support
 *
 * Endpoints:
 * - GET /api/users - List users (admin only)
 * - GET /api/users/me - Get current user profile
 * - GET /api/users/:id - Get user by ID (admin or self)
 * - PUT /api/users/:id - Update user (admin or self)
 * - DELETE /api/users/:id - Deactivate user (admin only)
 * - POST /api/users/:id/change-password - Change password (self only)
 * - GET /api/users/:id/activity - Get user activity log
 */

import { Router, Request, Response } from 'express';
import { authHandler, AuthRequest, requireRoleHandler } from '../middleware/auth';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { validate, ValidationSchema } from '../middleware/validation';
import { userRepository, User } from '../../database/userRepository';
import { logger } from '../../../services/SimpleLogger';
import * as crypto from 'crypto';

const router = Router();

// Validation schemas for user operations
const userSchemas: Record<string, ValidationSchema> = {
  updateUser: {
    body: {
      firstName: { type: 'string', required: false, maxLength: 100 },
      lastName: { type: 'string', required: false, maxLength: 100 },
      displayName: { type: 'string', required: false, maxLength: 200 },
      department: { type: 'string', required: false, maxLength: 100 },
      title: { type: 'string', required: false, maxLength: 100 },
    }
  },
  changePassword: {
    body: {
      currentPassword: { type: 'string', required: true, minLength: 1, maxLength: 128, sanitize: false },
      newPassword: { type: 'password', required: true },
    }
  },
  listUsers: {
    query: {
      page: { type: 'number', required: false, min: 1 },
      limit: { type: 'number', required: false, min: 1, max: 100 },
      role: { type: 'string', required: false, enum: ['admin', 'user', 'viewer'] },
      status: { type: 'string', required: false, enum: ['active', 'inactive', 'suspended'] },
      search: { type: 'string', required: false, maxLength: 100 },
    }
  }
};

/**
 * Helper to sanitize user object for response (remove sensitive fields)
 */
function sanitizeUser(user: User): Partial<User> {
  const {
    passwordHash: _passwordHash,
    passwordResetToken: _passwordResetToken,
    passwordResetExpires: _passwordResetExpires,
    emailVerificationToken: _emailVerificationToken,
    emailVerificationExpires: _emailVerificationExpires,
    ...safeUser
  } = user;
  return safeUser;
}

/**
 * Check if the requesting user is an admin
 */
function isAdmin(req: AuthRequest): boolean {
  return req.user?.role === 'admin';
}

/**
 * Check if the requesting user is accessing their own data
 */
function isSelf(req: AuthRequest, targetUserId: string): boolean {
  return req.user?.id === targetUserId;
}

// API info endpoint
router.get('/', authHandler, asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;

  res.json({
    success: true,
    message: 'User Management API',
    currentUser: authReq.user?.id,
    endpoints: [
      'GET /api/users - List users (admin only)',
      'GET /api/users/me - Get current user profile',
      'GET /api/users/:id - Get user by ID (admin or self)',
      'PUT /api/users/:id - Update user (admin or self)',
      'DELETE /api/users/:id - Deactivate user (admin only)',
      'POST /api/users/:id/change-password - Change password (self only)',
      'GET /api/users/:id/activity - Get user activity log'
    ]
  });
}));

/**
 * GET /api/users/me - Get current user profile
 * Requires: Authentication
 */
router.get('/me', authHandler, asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;

  if (!authReq.user?.id) {
    throw new ApiError(401, 'Authentication required');
  }

  const user = await userRepository.findById(authReq.user.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  logger.info('User profile retrieved', { userId: user.id });

  res.json({
    success: true,
    user: sanitizeUser(user)
  });
}));

/**
 * GET /api/users - List all users
 * Requires: Admin role
 */
router.get(
  '/',
  authHandler,
  requireRoleHandler('admin'),
  validate(userSchemas.listUsers),
  asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 10, role, status, search } = req.query;

    logger.info('Listing users', { page, limit, role, status, search });

    // If search is provided, use the search method
    if (search && typeof search === 'string') {
      const searchResults = await userRepository.search(search);

      // Apply role and status filters to search results
      let filteredResults = searchResults;
      if (role && typeof role === 'string') {
        filteredResults = filteredResults.filter(u => u.role === role);
      }
      if (status && typeof status === 'string') {
        filteredResults = filteredResults.filter(u => u.status === status);
      }

      // Paginate results
      const skip = (Number(page) - 1) * Number(limit);
      const paginatedResults = filteredResults.slice(skip, skip + Number(limit));

      res.json({
        success: true,
        users: paginatedResults.map(sanitizeUser),
        total: filteredResults.length,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(filteredResults.length / Number(limit))
      });
      return;
    }

    // Standard listing with pagination
    const { users, total } = await userRepository.findAll({
      skip: (Number(page) - 1) * Number(limit),
      limit: Number(limit),
      role: typeof role === 'string' ? role : undefined,
      status: typeof status === 'string' ? status : undefined,
    });

    res.json({
      success: true,
      users: users.map(sanitizeUser),
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    });
  })
);

/**
 * GET /api/users/:id - Get user by ID
 * Requires: Admin role OR self
 */
router.get('/:id', authHandler, asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const { id } = req.params;

  // Authorization: admin or self
  if (!isAdmin(authReq) && !isSelf(authReq, id)) {
    throw new ApiError(403, 'Access denied. You can only view your own profile.');
  }

  const user = await userRepository.findById(id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  logger.info('User retrieved', {
    userId: id,
    requestedBy: authReq.user?.id,
    isAdmin: isAdmin(authReq)
  });

  res.json({
    success: true,
    user: sanitizeUser(user)
  });
}));

/**
 * PUT /api/users/:id - Update user
 * Requires: Admin role OR self (with limited fields)
 */
router.put(
  '/:id',
  authHandler,
  validate(userSchemas.updateUser),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { id } = req.params;
    const updates = req.body;

    // Authorization: admin or self
    if (!isAdmin(authReq) && !isSelf(authReq, id)) {
      throw new ApiError(403, 'Access denied. You can only update your own profile.');
    }

    // Check if user exists
    const existingUser = await userRepository.findById(id);
    if (!existingUser) {
      throw new ApiError(404, 'User not found');
    }

    // Build allowed updates based on role
    const allowedUpdates: Partial<User> = {};

    // Fields that users can update themselves
    const selfUpdatableFields = ['firstName', 'lastName', 'displayName', 'department', 'title'];

    // Fields that only admins can update
    const adminOnlyFields = ['role', 'status', 'permissions', 'email'];

    // Process self-updatable fields
    for (const field of selfUpdatableFields) {
      if (updates[field] !== undefined) {
        (allowedUpdates as Record<string, unknown>)[field] = updates[field];
      }
    }

    // Process admin-only fields
    if (isAdmin(authReq)) {
      for (const field of adminOnlyFields) {
        if (updates[field] !== undefined) {
          // Prevent admin from demoting themselves
          if (field === 'role' && isSelf(authReq, id) && updates[field] !== 'admin') {
            throw new ApiError(400, 'Admins cannot demote themselves');
          }
          // Prevent admin from deactivating themselves
          if (field === 'status' && isSelf(authReq, id) && updates[field] !== 'active') {
            throw new ApiError(400, 'Admins cannot deactivate themselves');
          }
          (allowedUpdates as Record<string, unknown>)[field] = updates[field];
        }
      }
    } else {
      // Non-admins trying to update restricted fields
      const restrictedAttempts = adminOnlyFields.filter(f => updates[f] !== undefined);
      if (restrictedAttempts.length > 0) {
        throw new ApiError(403, `Cannot update restricted fields: ${restrictedAttempts.join(', ')}`);
      }
    }

    // Perform the update
    const updatedUser = await userRepository.update(id, allowedUpdates);

    if (!updatedUser) {
      throw new ApiError(500, 'Failed to update user');
    }

    logger.info('User updated', {
      userId: id,
      updatedBy: authReq.user?.id,
      updatedFields: Object.keys(allowedUpdates)
    });

    res.json({
      success: true,
      user: sanitizeUser(updatedUser),
      message: 'User updated successfully'
    });
  })
);

/**
 * DELETE /api/users/:id - Deactivate user (soft delete)
 * Requires: Admin role
 */
router.delete(
  '/:id',
  authHandler,
  requireRoleHandler('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { id } = req.params;
    const { reason } = req.body || {};

    // Prevent admin from deleting themselves
    if (isSelf(authReq, id)) {
      throw new ApiError(400, 'Admins cannot deactivate themselves');
    }

    // Check if user exists
    const existingUser = await userRepository.findById(id);
    if (!existingUser) {
      throw new ApiError(404, 'User not found');
    }

    // Check if already deactivated
    if (existingUser.status === 'inactive') {
      throw new ApiError(400, 'User is already deactivated');
    }

    // Soft delete: set status to inactive and record deactivation
    const deactivatedUser = await userRepository.update(id, {
      status: 'inactive',
      deactivatedAt: new Date(),
      deactivationReason: reason || 'Deactivated by admin'
    });

    if (!deactivatedUser) {
      throw new ApiError(500, 'Failed to deactivate user');
    }

    logger.info('User deactivated', {
      userId: id,
      deactivatedBy: authReq.user?.id,
      reason: reason || 'Deactivated by admin'
    });

    res.json({
      success: true,
      message: `User ${id} has been deactivated`,
      user: sanitizeUser(deactivatedUser)
    });
  })
);

/**
 * POST /api/users/:id/change-password - Change password
 * Requires: Self only
 */
router.post(
  '/:id/change-password',
  authHandler,
  validate(userSchemas.changePassword),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    // Authorization: self only (even admins cannot change other users' passwords)
    if (!isSelf(authReq, id)) {
      throw new ApiError(403, 'You can only change your own password');
    }

    // Get user to verify current password
    const user = await userRepository.findById(id);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Verify current password
    // Note: In a real implementation, use bcrypt.compare
    const currentPasswordHash = hashPassword(currentPassword);
    if (user.passwordHash && user.passwordHash !== currentPasswordHash) {
      logger.warn('Password change failed - incorrect current password', { userId: id });
      throw new ApiError(401, 'Current password is incorrect');
    }

    // Ensure new password is different from current
    const newPasswordHash = hashPassword(newPassword);
    if (newPasswordHash === user.passwordHash) {
      throw new ApiError(400, 'New password must be different from current password');
    }

    // Update password
    const updatedUser = await userRepository.update(id, {
      passwordHash: newPasswordHash
    });

    if (!updatedUser) {
      throw new ApiError(500, 'Failed to update password');
    }

    logger.info('Password changed successfully', { userId: id });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  })
);

/**
 * GET /api/users/:id/activity - Get user activity log
 * Requires: Admin role OR self
 */
router.get('/:id/activity', authHandler, asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const { id } = req.params;
  const { page = 1, limit = 20, type } = req.query;

  // Authorization: admin or self
  if (!isAdmin(authReq) && !isSelf(authReq, id)) {
    throw new ApiError(403, 'Access denied. You can only view your own activity.');
  }

  // Verify user exists
  const user = await userRepository.findById(id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // In a real implementation, this would query an audit log table
  // For now, we'll return a mock activity structure
  const mockActivities = generateMockActivity(id, user);

  // Filter by type if provided
  let filteredActivities = mockActivities;
  if (type && typeof type === 'string') {
    filteredActivities = mockActivities.filter(a => a.type === type);
  }

  // Paginate
  const skip = (Number(page) - 1) * Number(limit);
  const paginatedActivities = filteredActivities.slice(skip, skip + Number(limit));

  logger.info('User activity retrieved', {
    userId: id,
    requestedBy: authReq.user?.id,
    activityCount: paginatedActivities.length
  });

  res.json({
    success: true,
    activities: paginatedActivities,
    total: filteredActivities.length,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(filteredActivities.length / Number(limit))
  });
}));

/**
 * POST /api/users/:id/reactivate - Reactivate a deactivated user
 * Requires: Admin role
 */
router.post(
  '/:id/reactivate',
  authHandler,
  requireRoleHandler('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { id } = req.params;

    // Check if user exists
    const existingUser = await userRepository.findById(id);
    if (!existingUser) {
      throw new ApiError(404, 'User not found');
    }

    // Check if actually deactivated
    if (existingUser.status === 'active') {
      throw new ApiError(400, 'User is already active');
    }

    // Reactivate user
    const reactivatedUser = await userRepository.update(id, {
      status: 'active',
      deactivatedAt: undefined,
      deactivationReason: undefined,
      failedLoginAttempts: 0,
      lockedUntil: undefined
    });

    if (!reactivatedUser) {
      throw new ApiError(500, 'Failed to reactivate user');
    }

    logger.info('User reactivated', {
      userId: id,
      reactivatedBy: authReq.user?.id
    });

    res.json({
      success: true,
      message: `User ${id} has been reactivated`,
      user: sanitizeUser(reactivatedUser)
    });
  })
);

/**
 * Helper function to hash password
 * In production, use bcrypt instead
 */
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Generate mock activity data for a user
 * In production, this would query an audit log table
 */
function generateMockActivity(_userId: string, user: User): Array<{
  id: string;
  type: string;
  action: string;
  timestamp: Date;
  details: Record<string, unknown>;
  ipAddress?: string;
}> {
  const activities = [];
  const now = new Date();

  // Add login activity if user has logged in
  if (user.lastLoginAt) {
    activities.push({
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-1`,
      type: 'auth',
      action: 'login',
      timestamp: user.lastLoginAt,
      details: { method: 'password' },
      ipAddress: '192.168.1.1'
    });
  }

  // Add account creation activity
  activities.push({
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-2`,
    type: 'account',
    action: 'created',
    timestamp: user.createdAt,
    details: { email: user.email }
  });

  // Add profile update if updated time differs from created
  if (user.updatedAt.getTime() !== user.createdAt.getTime()) {
    activities.push({
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-3`,
      type: 'profile',
      action: 'updated',
      timestamp: user.updatedAt,
      details: { }
    });
  }

  // Add email verification if verified
  if (user.emailVerified) {
    activities.push({
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-4`,
      type: 'account',
      action: 'email_verified',
      timestamp: new Date(user.createdAt.getTime() + 3600000), // 1 hour after creation
      details: { email: user.email }
    });
  }

  // Add failed login attempts if any
  if (user.failedLoginAttempts > 0) {
    for (let i = 0; i < Math.min(user.failedLoginAttempts, 5); i++) {
      activities.push({
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${5 + i}`,
        type: 'auth',
        action: 'login_failed',
        timestamp: new Date(now.getTime() - (i + 1) * 300000), // Every 5 minutes back
        details: { attempt: i + 1 },
        ipAddress: '192.168.1.100'
      });
    }
  }

  // Sort by timestamp descending
  activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return activities;
}

export { router as usersRouter };
export default router;
