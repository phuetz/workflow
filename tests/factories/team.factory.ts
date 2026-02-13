/**
 * Team Factory
 * Generate test teams and team members
 */

import { PrismaClient, Team, TeamMember, TeamRole } from '@prisma/client';

const prisma = new PrismaClient();

export interface TeamFactoryOptions {
  name?: string;
  description?: string;
  ownerId?: string;
  settings?: Record<string, unknown>;
}

export class TeamFactory {
  private static counter = 0;

  static async create(ownerId: string, options: TeamFactoryOptions = {}): Promise<Team> {
    TeamFactory.counter++;

    const team = await prisma.team.create({
      data: {
        name: options.name || `Test Team ${TeamFactory.counter}`,
        description: options.description || 'Test team created by factory',
        ownerId,
        settings: options.settings || {}
      }
    });

    // Add owner as admin
    await prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId: ownerId,
        role: TeamRole.ADMIN
      }
    });

    return team;
  }

  static async createMany(ownerId: string, count: number, options: TeamFactoryOptions = {}): Promise<Team[]> {
    const teams: Team[] = [];
    for (let i = 0; i < count; i++) {
      teams.push(await TeamFactory.create(ownerId, options));
    }
    return teams;
  }

  static async addMember(teamId: string, userId: string, role: TeamRole = TeamRole.MEMBER): Promise<TeamMember> {
    return prisma.teamMember.create({
      data: {
        teamId,
        userId,
        role
      }
    });
  }

  static async addMembers(teamId: string, userIds: string[], role: TeamRole = TeamRole.MEMBER): Promise<TeamMember[]> {
    const members: TeamMember[] = [];
    for (const userId of userIds) {
      members.push(await TeamFactory.addMember(teamId, userId, role));
    }
    return members;
  }

  static resetCounter(): void {
    TeamFactory.counter = 0;
  }
}
