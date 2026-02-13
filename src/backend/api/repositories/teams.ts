/**
 * Team Repository
 * Data access layer for team management operations
 */

import { prisma } from '../../database/prisma';
import { TeamRole, Prisma } from '@prisma/client';
import * as crypto from 'crypto';

export interface TeamCreateInput {
  name: string;
  description?: string;
  ownerId: string;
  settings?: Record<string, unknown>;
}

export interface TeamUpdateInput {
  name?: string;
  description?: string;
  settings?: Record<string, unknown>;
}

export interface TeamMemberInput {
  userId: string;
  role?: TeamRole;
}

export interface TeamInvite {
  id: string;
  teamId: string;
  email: string;
  role: TeamRole;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  createdBy: string;
}

// In-memory store for invites (in production, use database table)
const pendingInvites = new Map<string, TeamInvite>();

export const teamRepository = {
  /**
   * List teams that a user belongs to
   */
  async listUserTeams(userId: string) {
    // Get teams where user is owner
    const ownedTeams = await prisma.team.findMany({
      where: { ownerId: userId },
      include: {
        owner: {
          select: { id: true, email: true, firstName: true, lastName: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true }
            }
          }
        },
        _count: {
          select: { workflows: true, members: true }
        }
      }
    });

    // Get teams where user is a member (not owner)
    const memberTeams = await prisma.team.findMany({
      where: {
        members: {
          some: { userId }
        },
        ownerId: { not: userId }
      },
      include: {
        owner: {
          select: { id: true, email: true, firstName: true, lastName: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true }
            }
          }
        },
        _count: {
          select: { workflows: true, members: true }
        }
      }
    });

    return [...ownedTeams, ...memberTeams];
  },

  /**
   * Create a new team
   */
  async create(data: TeamCreateInput) {
    const team = await prisma.team.create({
      data: {
        name: data.name,
        description: data.description,
        ownerId: data.ownerId,
        settings: (data.settings || {}) as Prisma.InputJsonValue,
        // Add owner as a member with OWNER role
        members: {
          create: {
            userId: data.ownerId,
            role: TeamRole.OWNER
          }
        }
      },
      include: {
        owner: {
          select: { id: true, email: true, firstName: true, lastName: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true }
            }
          }
        },
        _count: {
          select: { workflows: true, members: true }
        }
      }
    });

    return team;
  },

  /**
   * Get a team by ID
   */
  async findById(teamId: string) {
    return prisma.team.findUnique({
      where: { id: teamId },
      include: {
        owner: {
          select: { id: true, email: true, firstName: true, lastName: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true }
            }
          }
        },
        _count: {
          select: { workflows: true, members: true }
        }
      }
    });
  },

  /**
   * Update a team
   */
  async update(teamId: string, data: TeamUpdateInput) {
    return prisma.team.update({
      where: { id: teamId },
      data: {
        name: data.name,
        description: data.description,
        settings: data.settings as Prisma.InputJsonValue
      },
      include: {
        owner: {
          select: { id: true, email: true, firstName: true, lastName: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true }
            }
          }
        },
        _count: {
          select: { workflows: true, members: true }
        }
      }
    });
  },

  /**
   * Delete a team
   */
  async delete(teamId: string) {
    // Delete team (cascade will handle members)
    await prisma.team.delete({
      where: { id: teamId }
    });
    return true;
  },

  /**
   * Check if user is owner of team
   */
  async isOwner(teamId: string, userId: string): Promise<boolean> {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { ownerId: true }
    });
    return team?.ownerId === userId;
  },

  /**
   * Check if user is admin or owner of team
   */
  async isAdminOrOwner(teamId: string, userId: string): Promise<boolean> {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { ownerId: true }
    });

    if (team?.ownerId === userId) {
      return true;
    }

    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId }
      },
      select: { role: true }
    });

    return membership?.role === TeamRole.ADMIN || membership?.role === TeamRole.OWNER;
  },

  /**
   * Check if user is a member of team
   */
  async isMember(teamId: string, userId: string): Promise<boolean> {
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId }
      }
    });
    return !!membership;
  },

  /**
   * Get user's role in a team
   */
  async getUserRole(teamId: string, userId: string): Promise<TeamRole | null> {
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId }
      },
      select: { role: true }
    });
    return membership?.role || null;
  },

  /**
   * List team members
   */
  async listMembers(teamId: string) {
    return prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, profilePicture: true }
        }
      },
      orderBy: { joinedAt: 'asc' }
    });
  },

  /**
   * Add a member to a team
   */
  async addMember(teamId: string, data: TeamMemberInput) {
    return prisma.teamMember.create({
      data: {
        teamId,
        userId: data.userId,
        role: data.role || TeamRole.MEMBER
      },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true }
        }
      }
    });
  },

  /**
   * Update a member's role
   */
  async updateMemberRole(teamId: string, userId: string, role: TeamRole) {
    return prisma.teamMember.update({
      where: {
        teamId_userId: { teamId, userId }
      },
      data: { role },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true }
        }
      }
    });
  },

  /**
   * Remove a member from a team
   */
  async removeMember(teamId: string, userId: string) {
    await prisma.teamMember.delete({
      where: {
        teamId_userId: { teamId, userId }
      }
    });
    return true;
  },

  /**
   * Get member by team and user ID
   */
  async getMember(teamId: string, userId: string) {
    return prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId }
      },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true }
        }
      }
    });
  },

  /**
   * Create an invite link for a team
   */
  async createInvite(
    teamId: string,
    email: string,
    role: TeamRole,
    createdBy: string,
    expiresInHours: number = 72
  ): Promise<TeamInvite> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    const invite: TeamInvite = {
      id: crypto.randomUUID(),
      teamId,
      email,
      role,
      token,
      expiresAt,
      createdAt: new Date(),
      createdBy
    };

    pendingInvites.set(token, invite);
    return invite;
  },

  /**
   * Get invite by token
   */
  async getInviteByToken(token: string): Promise<TeamInvite | null> {
    const invite = pendingInvites.get(token);
    if (!invite) return null;

    // Check if expired
    if (new Date() > invite.expiresAt) {
      pendingInvites.delete(token);
      return null;
    }

    return invite;
  },

  /**
   * Accept an invite
   */
  async acceptInvite(token: string, userId: string) {
    const invite = await this.getInviteByToken(token);
    if (!invite) {
      throw new Error('Invalid or expired invite');
    }

    // Check if user is already a member
    const existingMember = await this.getMember(invite.teamId, userId);
    if (existingMember) {
      pendingInvites.delete(token);
      throw new Error('User is already a member of this team');
    }

    // Add user as member
    const member = await this.addMember(invite.teamId, {
      userId,
      role: invite.role
    });

    // Remove invite
    pendingInvites.delete(token);

    return member;
  },

  /**
   * Delete an invite
   */
  async deleteInvite(token: string) {
    pendingInvites.delete(token);
    return true;
  },

  /**
   * List pending invites for a team
   */
  async listPendingInvites(teamId: string): Promise<TeamInvite[]> {
    const invites: TeamInvite[] = [];
    const now = new Date();

    pendingInvites.forEach((invite, token) => {
      if (invite.teamId === teamId) {
        if (invite.expiresAt > now) {
          invites.push(invite);
        } else {
          // Clean up expired invite
          pendingInvites.delete(token);
        }
      }
    });

    return invites;
  },

  /**
   * Find user by email
   */
  async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, firstName: true, lastName: true }
    });
  }
};

export default teamRepository;
