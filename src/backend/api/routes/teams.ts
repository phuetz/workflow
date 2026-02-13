/**
 * Teams API Routes
 * RESTful endpoints for team management and organization support
 */

import { Router, Request, Response, NextFunction } from 'express';
import { TeamRole } from '@prisma/client';
import { teamRepository } from '../repositories/teams';
import { authHandler, AuthRequest } from '../middleware/auth';
import { logger } from '../../../services/SimpleLogger';

const router = Router();

// All routes require authentication
router.use(authHandler);

/**
 * GET /api/teams
 * List teams the authenticated user belongs to
 */
router.get('/', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    logger.info(`Listing teams for user ${userId}`);

    const teams = await teamRepository.listUserTeams(userId);

    res.status(200).json({
      teams: teams.map(team => ({
        id: team.id,
        name: team.name,
        description: team.description,
        ownerId: team.ownerId,
        owner: team.owner,
        settings: team.settings,
        memberCount: team._count.members,
        workflowCount: team._count.workflows,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt
      })),
      total: teams.length
    });
  } catch (error: unknown) {
    logger.error('Error listing teams:', error);
    res.status(500).json({
      error: 'Failed to list teams',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/teams
 * Create a new team
 */
router.post('/', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const { name, description, settings } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Team name is required'
      });
    }

    logger.info(`Creating team "${name}" for user ${userId}`);

    const team = await teamRepository.create({
      name: name.trim(),
      description: description?.trim(),
      ownerId: userId,
      settings
    });

    logger.info(`Team ${team.id} created successfully`);

    res.status(201).json({
      id: team.id,
      name: team.name,
      description: team.description,
      ownerId: team.ownerId,
      owner: team.owner,
      settings: team.settings,
      memberCount: team._count.members,
      workflowCount: team._count.workflows,
      members: team.members,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt
    });
  } catch (error: unknown) {
    logger.error('Error creating team:', error);
    res.status(500).json({
      error: 'Failed to create team',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/teams/:id
 * Get team details
 */
router.get('/:id', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    logger.info(`Fetching team ${id} for user ${userId}`);

    const team = await teamRepository.findById(id);

    if (!team) {
      return res.status(404).json({
        error: 'Not found',
        message: `Team with id ${id} does not exist`
      });
    }

    // Check if user is a member
    const isMember = await teamRepository.isMember(id, userId);
    if (!isMember) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You are not a member of this team'
      });
    }

    res.status(200).json({
      id: team.id,
      name: team.name,
      description: team.description,
      ownerId: team.ownerId,
      owner: team.owner,
      settings: team.settings,
      memberCount: team._count.members,
      workflowCount: team._count.workflows,
      members: team.members.map(m => ({
        id: m.id,
        userId: m.userId,
        user: m.user,
        role: m.role,
        joinedAt: m.joinedAt
      })),
      createdAt: team.createdAt,
      updatedAt: team.updatedAt
    });
  } catch (error: unknown) {
    logger.error('Error fetching team:', error);
    res.status(500).json({
      error: 'Failed to fetch team',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/teams/:id
 * Update team (owner/admin only)
 */
router.put('/:id', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    logger.info(`Updating team ${id} by user ${userId}`);

    // Check if team exists
    const team = await teamRepository.findById(id);
    if (!team) {
      return res.status(404).json({
        error: 'Not found',
        message: `Team with id ${id} does not exist`
      });
    }

    // Check if user is admin or owner
    const isAdminOrOwner = await teamRepository.isAdminOrOwner(id, userId);
    if (!isAdminOrOwner) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only team owners and admins can update the team'
      });
    }

    const { name, description, settings } = req.body;

    const updatedTeam = await teamRepository.update(id, {
      name: name?.trim(),
      description: description?.trim(),
      settings
    });

    logger.info(`Team ${id} updated successfully`);

    res.status(200).json({
      id: updatedTeam.id,
      name: updatedTeam.name,
      description: updatedTeam.description,
      ownerId: updatedTeam.ownerId,
      owner: updatedTeam.owner,
      settings: updatedTeam.settings,
      memberCount: updatedTeam._count.members,
      workflowCount: updatedTeam._count.workflows,
      createdAt: updatedTeam.createdAt,
      updatedAt: updatedTeam.updatedAt
    });
  } catch (error: unknown) {
    logger.error('Error updating team:', error);
    res.status(500).json({
      error: 'Failed to update team',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/teams/:id
 * Delete team (owner only)
 */
router.delete('/:id', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    logger.info(`Deleting team ${id} by user ${userId}`);

    // Check if team exists
    const team = await teamRepository.findById(id);
    if (!team) {
      return res.status(404).json({
        error: 'Not found',
        message: `Team with id ${id} does not exist`
      });
    }

    // Check if user is owner
    const isOwner = await teamRepository.isOwner(id, userId);
    if (!isOwner) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only the team owner can delete the team'
      });
    }

    await teamRepository.delete(id);

    logger.info(`Team ${id} deleted successfully`);

    res.status(200).json({
      success: true,
      message: `Team ${id} deleted successfully`
    });
  } catch (error: unknown) {
    logger.error('Error deleting team:', error);
    res.status(500).json({
      error: 'Failed to delete team',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/teams/:id/members
 * List team members
 */
router.get('/:id/members', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    logger.info(`Listing members for team ${id}`);

    // Check if team exists
    const team = await teamRepository.findById(id);
    if (!team) {
      return res.status(404).json({
        error: 'Not found',
        message: `Team with id ${id} does not exist`
      });
    }

    // Check if user is a member
    const isMember = await teamRepository.isMember(id, userId);
    if (!isMember) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You are not a member of this team'
      });
    }

    const members = await teamRepository.listMembers(id);

    res.status(200).json({
      members: members.map(m => ({
        id: m.id,
        userId: m.userId,
        user: m.user,
        role: m.role,
        joinedAt: m.joinedAt
      })),
      total: members.length
    });
  } catch (error: unknown) {
    logger.error('Error listing team members:', error);
    res.status(500).json({
      error: 'Failed to list team members',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/teams/:id/members
 * Add team member (admin only)
 */
router.post('/:id/members', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    logger.info(`Adding member to team ${id} by user ${userId}`);

    // Check if team exists
    const team = await teamRepository.findById(id);
    if (!team) {
      return res.status(404).json({
        error: 'Not found',
        message: `Team with id ${id} does not exist`
      });
    }

    // Check if user is admin or owner
    const isAdminOrOwner = await teamRepository.isAdminOrOwner(id, userId);
    if (!isAdminOrOwner) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only team owners and admins can add members'
      });
    }

    const { userId: newUserId, email, role } = req.body;

    // Either userId or email must be provided
    let targetUserId = newUserId;
    if (!targetUserId && email) {
      const user = await teamRepository.findUserByEmail(email);
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: `No user found with email ${email}`
        });
      }
      targetUserId = user.id;
    }

    if (!targetUserId) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Either userId or email is required'
      });
    }

    // Check if user is already a member
    const existingMember = await teamRepository.getMember(id, targetUserId);
    if (existingMember) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'User is already a member of this team'
      });
    }

    // Validate role
    const memberRole = role as TeamRole || TeamRole.MEMBER;
    if (!Object.values(TeamRole).includes(memberRole)) {
      return res.status(400).json({
        error: 'Validation error',
        message: `Invalid role. Must be one of: ${Object.values(TeamRole).join(', ')}`
      });
    }

    // Cannot assign OWNER role via this endpoint
    if (memberRole === TeamRole.OWNER) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Cannot assign OWNER role. Use transfer ownership instead.'
      });
    }

    const member = await teamRepository.addMember(id, {
      userId: targetUserId,
      role: memberRole
    });

    logger.info(`Member ${targetUserId} added to team ${id}`);

    res.status(201).json({
      id: member.id,
      userId: member.userId,
      user: member.user,
      role: member.role,
      joinedAt: member.joinedAt
    });
  } catch (error: unknown) {
    logger.error('Error adding team member:', error);
    res.status(500).json({
      error: 'Failed to add team member',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/teams/:id/members/:userId
 * Update member role
 */
router.put('/:id/members/:userId', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const currentUserId = authReq.user?.id;
    const { id, userId: targetUserId } = req.params;

    if (!currentUserId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    logger.info(`Updating member ${targetUserId} role in team ${id} by user ${currentUserId}`);

    // Check if team exists
    const team = await teamRepository.findById(id);
    if (!team) {
      return res.status(404).json({
        error: 'Not found',
        message: `Team with id ${id} does not exist`
      });
    }

    // Check if user is admin or owner
    const isAdminOrOwner = await teamRepository.isAdminOrOwner(id, currentUserId);
    if (!isAdminOrOwner) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only team owners and admins can update member roles'
      });
    }

    // Check if target member exists
    const existingMember = await teamRepository.getMember(id, targetUserId);
    if (!existingMember) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Member not found in this team'
      });
    }

    // Cannot modify owner role
    if (existingMember.role === TeamRole.OWNER) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Cannot modify owner role. Use transfer ownership instead.'
      });
    }

    const { role } = req.body;

    if (!role) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Role is required'
      });
    }

    // Validate role
    if (!Object.values(TeamRole).includes(role)) {
      return res.status(400).json({
        error: 'Validation error',
        message: `Invalid role. Must be one of: ${Object.values(TeamRole).join(', ')}`
      });
    }

    // Cannot assign OWNER role via this endpoint
    if (role === TeamRole.OWNER) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Cannot assign OWNER role. Use transfer ownership instead.'
      });
    }

    // Admin can only assign MEMBER or VIEWER roles
    const currentUserRole = await teamRepository.getUserRole(id, currentUserId);
    if (currentUserRole === TeamRole.ADMIN && role === TeamRole.ADMIN) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only team owners can assign admin role'
      });
    }

    const updatedMember = await teamRepository.updateMemberRole(id, targetUserId, role);

    logger.info(`Member ${targetUserId} role updated to ${role} in team ${id}`);

    res.status(200).json({
      id: updatedMember.id,
      userId: updatedMember.userId,
      user: updatedMember.user,
      role: updatedMember.role,
      joinedAt: updatedMember.joinedAt
    });
  } catch (error: unknown) {
    logger.error('Error updating member role:', error);
    res.status(500).json({
      error: 'Failed to update member role',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/teams/:id/members/:userId
 * Remove team member
 */
router.delete('/:id/members/:userId', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const currentUserId = authReq.user?.id;
    const { id, userId: targetUserId } = req.params;

    if (!currentUserId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    logger.info(`Removing member ${targetUserId} from team ${id} by user ${currentUserId}`);

    // Check if team exists
    const team = await teamRepository.findById(id);
    if (!team) {
      return res.status(404).json({
        error: 'Not found',
        message: `Team with id ${id} does not exist`
      });
    }

    // Check if target member exists
    const existingMember = await teamRepository.getMember(id, targetUserId);
    if (!existingMember) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Member not found in this team'
      });
    }

    // Cannot remove owner
    if (existingMember.role === TeamRole.OWNER) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Cannot remove team owner. Transfer ownership first or delete the team.'
      });
    }

    // Users can remove themselves, or admins/owners can remove others
    const isSelf = currentUserId === targetUserId;
    const isAdminOrOwner = await teamRepository.isAdminOrOwner(id, currentUserId);

    if (!isSelf && !isAdminOrOwner) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only team owners and admins can remove other members'
      });
    }

    await teamRepository.removeMember(id, targetUserId);

    logger.info(`Member ${targetUserId} removed from team ${id}`);

    res.status(200).json({
      success: true,
      message: `Member ${targetUserId} removed from team`
    });
  } catch (error: unknown) {
    logger.error('Error removing team member:', error);
    res.status(500).json({
      error: 'Failed to remove team member',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/teams/:id/invite
 * Send invite to join team (admin only)
 */
router.post('/:id/invite', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    logger.info(`Creating invite for team ${id} by user ${userId}`);

    // Check if team exists
    const team = await teamRepository.findById(id);
    if (!team) {
      return res.status(404).json({
        error: 'Not found',
        message: `Team with id ${id} does not exist`
      });
    }

    // Check if user is admin or owner
    const isAdminOrOwner = await teamRepository.isAdminOrOwner(id, userId);
    if (!isAdminOrOwner) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only team owners and admins can send invites'
      });
    }

    const { email, role, expiresInHours } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email is required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid email format'
      });
    }

    // Validate role
    const inviteRole = role as TeamRole || TeamRole.MEMBER;
    if (!Object.values(TeamRole).includes(inviteRole)) {
      return res.status(400).json({
        error: 'Validation error',
        message: `Invalid role. Must be one of: ${Object.values(TeamRole).join(', ')}`
      });
    }

    // Cannot invite as OWNER
    if (inviteRole === TeamRole.OWNER) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Cannot invite user as owner'
      });
    }

    // Check if user with this email is already a member
    const existingUser = await teamRepository.findUserByEmail(email);
    if (existingUser) {
      const isMember = await teamRepository.isMember(id, existingUser.id);
      if (isMember) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'User with this email is already a member of the team'
        });
      }
    }

    const invite = await teamRepository.createInvite(
      id,
      email,
      inviteRole,
      userId,
      expiresInHours || 72
    );

    // Generate invite link
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const inviteLink = `${baseUrl}/teams/invite/${invite.token}`;

    logger.info(`Invite created for ${email} to join team ${id}`);

    // In production, you would send an email here
    // await emailService.sendTeamInvite(email, team.name, inviteLink);

    res.status(201).json({
      success: true,
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt
      },
      inviteLink,
      message: `Invite sent to ${email}. The invite expires in ${expiresInHours || 72} hours.`
    });
  } catch (error: unknown) {
    logger.error('Error creating team invite:', error);
    res.status(500).json({
      error: 'Failed to create invite',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/teams/:id/invites
 * List pending invites for a team (admin only)
 */
router.get('/:id/invites', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // Check if team exists
    const team = await teamRepository.findById(id);
    if (!team) {
      return res.status(404).json({
        error: 'Not found',
        message: `Team with id ${id} does not exist`
      });
    }

    // Check if user is admin or owner
    const isAdminOrOwner = await teamRepository.isAdminOrOwner(id, userId);
    if (!isAdminOrOwner) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only team owners and admins can view invites'
      });
    }

    const invites = await teamRepository.listPendingInvites(id);

    res.status(200).json({
      invites: invites.map(i => ({
        id: i.id,
        email: i.email,
        role: i.role,
        expiresAt: i.expiresAt,
        createdAt: i.createdAt
      })),
      total: invites.length
    });
  } catch (error: unknown) {
    logger.error('Error listing team invites:', error);
    res.status(500).json({
      error: 'Failed to list invites',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/teams/invite/:token/accept
 * Accept a team invite
 */
router.post('/invite/:token/accept', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const { token } = req.params;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    logger.info(`User ${userId} accepting invite with token ${token.substring(0, 8)}...`);

    const member = await teamRepository.acceptInvite(token, userId);
    const team = await teamRepository.findById(member.teamId);

    logger.info(`User ${userId} joined team ${member.teamId}`);

    res.status(200).json({
      success: true,
      message: 'Successfully joined the team',
      team: team ? {
        id: team.id,
        name: team.name
      } : null,
      membership: {
        id: member.id,
        role: member.role,
        joinedAt: member.joinedAt
      }
    });
  } catch (error: unknown) {
    logger.error('Error accepting team invite:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message === 'Invalid or expired invite') {
      return res.status(404).json({
        error: 'Invalid invite',
        message: 'This invite is invalid or has expired'
      });
    }

    if (message === 'User is already a member of this team') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'You are already a member of this team'
      });
    }

    res.status(500).json({
      error: 'Failed to accept invite',
      message
    });
  }
});

export default router;
export { router as teamsRouter };
