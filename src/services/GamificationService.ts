export interface UserLevel {
  level: number;
  title: string;
  xpRequired: number;
  color: string;
  benefits: string[];
  icon: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'workflow' | 'collaboration' | 'performance' | 'learning' | 'special';
  type: 'single' | 'progressive' | 'streak' | 'milestone';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  points: number;
  conditions: AchievementCondition[];
  rewards: Reward[];
  icon: string;
  badgeColor: string;
  unlocked: boolean;
  unlockedAt?: Date;
  progress?: number;
  maxProgress?: number;
}

export interface AchievementCondition {
  type: 'workflow_created' | 'workflow_executed' | 'nodes_used' | 'collaboration' | 'streak' | 'performance' | 'learning' | 'time_spent' | 'custom';
  operator: 'equals' | 'greater_than' | 'less_than' | 'greater_equal' | 'less_equal' | 'contains';
  value: unknown;
  timeframe?: 'day' | 'week' | 'month' | 'year' | 'all_time';
}

export interface Reward {
  type: 'xp' | 'badge' | 'title' | 'theme' | 'feature' | 'currency' | 'item';
  value: unknown;
  temporary?: boolean;
  duration?: number; // in days
}

export interface UserStats {
  userId: string;
  level: number;
  totalXP: number;
  currentLevelXP: number;
  nextLevelXP: number;
  rank: number;
  totalWorkflows: number;
  totalExecutions: number;
  successfulExecutions: number;
  totalNodesUsed: number;
  uniqueNodesUsed: number;
  collaborations: number;
  timeSpent: number; // in minutes
  currentStreak: number;
  longestStreak: number;
  achievements: string[]; // achievement IDs
  badges: Badge[];
  titles: string[];
  joinedAt: Date;
  lastActivity: Date;
  weeklyStats: WeeklyStats;
  monthlyStats: MonthlyStats;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  earnedAt: Date;
  category: string;
}

export interface WeeklyStats {
  week: string; // ISO week format
  workflowsCreated: number;
  executionsRun: number;
  xpEarned: number;
  achievementsUnlocked: number;
  collaborations: number;
  activeStreak: number;
}

export interface MonthlyStats {
  month: string; // YYYY-MM format
  workflowsCreated: number;
  executionsRun: number;
  xpEarned: number;
  achievementsUnlocked: number;
  collaborations: number;
  averageStreak: number;
  topCategory: string;
}

export interface Leaderboard {
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
  category: 'xp' | 'workflows' | 'executions' | 'streak' | 'achievements';
  users: LeaderboardEntry[];
  lastUpdated: Date;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  avatar?: string;
  level: number;
  value: number;
  rank: number;
  change?: number; // position change from previous period
  badge?: string;
}

export interface Quest {
  id: string;
  name: string;
  description: string;
  category: 'daily' | 'weekly' | 'monthly' | 'special' | 'story';
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  objectives: QuestObjective[];
  rewards: Reward[];
  timeLimit?: Date;
  prerequisites?: string[]; // other quest IDs
  storyline?: string;
  progress: number;
  maxProgress: number;
  status: 'available' | 'active' | 'completed' | 'expired' | 'locked';
  startedAt?: Date;
  completedAt?: Date;
}

export interface QuestObjective {
  id: string;
  description: string;
  type: 'workflow_create' | 'workflow_execute' | 'node_use' | 'collaborate' | 'achieve' | 'learn' | 'custom';
  target: number;
  current: number;
  completed: boolean;
  rewards?: Reward[];
}

export interface Team {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  members: TeamMember[];
  level: number;
  totalXP: number;
  achievements: string[];
  quests: TeamQuest[];
  competitions: TeamCompetition[];
  createdAt: Date;
  settings: TeamSettings;
}

export interface TeamMember {
  userId: string;
  username: string;
  role: 'leader' | 'co-leader' | 'member';
  joinedAt: Date;
  contribution: number;
  level: number;
  avatar?: string;
}

export interface TeamQuest {
  questId: string;
  progress: number;
  maxProgress: number;
  contributors: { userId: string; contribution: number }[];
  status: 'active' | 'completed' | 'failed';
  startedAt: Date;
  deadline?: Date;
}

export interface TeamCompetition {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  category: 'workflows' | 'executions' | 'collaboration' | 'innovation';
  teams: { teamId: string; score: number; rank: number }[];
  rewards: { rank: number; rewards: Reward[] }[];
  status: 'upcoming' | 'active' | 'ended';
}

export interface TeamSettings {
  isPublic: boolean;
  allowJoinRequests: boolean;
  autoAcceptMembers: boolean;
  shareProgress: boolean;
  competitiveMode: boolean;
}

export interface GamificationEvent {
  type: 'xp_earned' | 'level_up' | 'achievement_unlocked' | 'badge_earned' | 'quest_completed' | 'streak_milestone' | 'rank_changed';
  userId: string;
  data: unknown;
  timestamp: Date;
  points?: number;
  visible: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'achievement' | 'level_up' | 'quest' | 'team' | 'competition' | 'reward';
  title: string;
  message: string;
  data: unknown;
  read: boolean;
  createdAt: Date;
  expiresAt?: Date;
  actionUrl?: string;
}

export class GamificationService {
  private userStats: Map<string, UserStats> = new Map();
  private achievements: Map<string, Achievement> = new Map();
  private quests: Map<string, Quest> = new Map();
  private teams: Map<string, Team> = new Map();
  private leaderboards: Map<string, Leaderboard> = new Map();
  private notifications: Map<string, Notification[]> = new Map();
  private events: GamificationEvent[] = [];
  private levels: UserLevel[] = [];

  constructor() {
    this.initializeLevels();
    this.initializeAchievements();
    this.initializeQuests();
    this.initializeSampleData();
  }

  // User Stats Management
  async getUserStats(userId: string): Promise<UserStats> {
    let stats = this.userStats.get(userId);
    if (!stats) {
      stats = this.createInitialUserStats(userId);
      this.userStats.set(userId, stats);
    }
    return { ...stats };
  }

  async updateUserStats(userId: string, updates: Partial<UserStats>): Promise<UserStats> {
    const currentStats = await this.getUserStats(userId);
    const updatedStats = { ...currentStats, ...updates };
    this.userStats.set(userId, updatedStats);
    return updatedStats;
  }

  // XP and Leveling
  async addXP(userId: string, amount: number, reason: string): Promise<{
    newXP: number;
    levelUp: boolean;
    newLevel?: number;
    rewards?: Reward[];
  }> {
    const stats = await this.getUserStats(userId);
    const currentLevel = stats.level;
    const newTotalXP = stats.totalXP + amount;
    const newLevel = this.calculateLevel(newTotalXP);
    const levelUp = newLevel > currentLevel;

    // Update stats
    await this.updateUserStats(userId, {
      totalXP: newTotalXP,
      level: newLevel,
      currentLevelXP: this.getCurrentLevelXP(newTotalXP, newLevel),
      nextLevelXP: this.getNextLevelXP(newLevel),
      lastActivity: new Date()
    });

    // Record event
    this.recordEvent({
      type: 'xp_earned',
      userId,
      data: { amount, reason, newTotal: newTotalXP },
      timestamp: new Date(),
      points: amount,
      visible: true
    });

    const result = {
      newXP: newTotalXP,
      levelUp,
      newLevel: levelUp ? newLevel : undefined,
      rewards: levelUp ? this.getLevelRewards(newLevel) : undefined
    };

    // Handle level up
    if (levelUp) {
      await this.handleLevelUp(userId, newLevel);
    }

    return result;
  }

  private async handleLevelUp(userId: string, newLevel: number): Promise<void> {
    // Record level up event
    this.recordEvent({
      type: 'level_up',
      userId,
      data: { newLevel },
      timestamp: new Date(),
      visible: true
    });

    // Create notification
    await this.createNotification(userId, {
      type: 'level_up',
      title: 'Level Up!',
      message: `Congratulations! You've reached level ${newLevel}`,
      data: { newLevel },
      actionUrl: '/profile'
    });

    // Check for level-based achievements
    await this.checkAchievements(userId, 'level_up', { level: newLevel });
  }

  // Achievement System
  async getAchievements(): Promise<Achievement[]> {
    return Array.from(this.achievements.values());
  }

  async getUserAchievements(userId: string): Promise<Achievement[]> {
    const stats = await this.getUserStats(userId);
    return Array.from(this.achievements.values()).map(achievement => ({
      ...achievement,
      unlocked: stats.achievements.includes(achievement.id),
      progress: this.getAchievementProgress(userId, achievement.id)
    }));
  }

  async unlockAchievement(userId: string, achievementId: string): Promise<boolean> {
    const achievement = this.achievements.get(achievementId);
    const stats = await this.getUserStats(userId);

    if (!achievement || stats.achievements.includes(achievementId)) {
      return false;
    }

    // Add achievement to user
    stats.achievements.push(achievementId);
    await this.updateUserStats(userId, { achievements: stats.achievements });

    // Apply rewards
    for (const reward of achievement.rewards) {
      await this.applyReward(userId, reward);
    }

    // Record event
    this.recordEvent({
      type: 'achievement_unlocked',
      userId,
      data: { achievementId, achievement },
      timestamp: new Date(),
      points: achievement.points,
      visible: true
    });

    // Create notification
    await this.createNotification(userId, {
      type: 'achievement',
      title: 'Achievement Unlocked!',
      message: `You've unlocked: ${achievement.name}`,
      data: { achievement },
      actionUrl: '/achievements'
    });

    return true;
  }

  async checkAchievements(userId: string, eventType: string, eventData: unknown): Promise<string[]> {
    const unlockedAchievements: string[] = [];
    const userStats = await this.getUserStats(userId);

    for (const achievement of Array.from(this.achievements.values())) {
      if (userStats.achievements.includes(achievement.id)) continue;

      const meetsConditions = await this.checkAchievementConditions(
        userId,
        achievement,
        eventType,
        eventData
      );

      if (meetsConditions) {
        const unlocked = await this.unlockAchievement(userId, achievement.id);
        if (unlocked) {
          unlockedAchievements.push(achievement.id);
        }
      }
    }

    return unlockedAchievements;
  }

  private async checkAchievementConditions(
    userId: string,
    achievement: Achievement,
    _eventType: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    _eventData: unknown // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<boolean> {
    const userStats = await this.getUserStats(userId);

    return achievement.conditions.every(condition => {
      switch (condition.type) {
        case 'workflow_created':
          return this.checkCondition(userStats.totalWorkflows, condition);
        case 'workflow_executed':
          return this.checkCondition(userStats.totalExecutions, condition);
        case 'nodes_used':
          return this.checkCondition(userStats.totalNodesUsed, condition);
        case 'streak':
          return this.checkCondition(userStats.currentStreak, condition);
        case 'performance': {
          const successRate = userStats.totalExecutions > 0
            ? (userStats.successfulExecutions / userStats.totalExecutions) * 100
            : 0;
          return this.checkCondition(successRate, condition);
        }
        default:
          return false;
      }
    });
  }

  private checkCondition(value: number, condition: AchievementCondition): boolean {
    const conditionValue = Number(condition.value);
    switch (condition.operator) {
      case 'equals': return value === conditionValue;
      case 'greater_than': return value > conditionValue;
      case 'less_than': return value < conditionValue;
      case 'greater_equal': return value >= conditionValue;
      case 'less_equal': return value <= conditionValue;
      default: return false;
    }
  }

  // Quest System
  async getAvailableQuests(userId: string): Promise<Quest[]> {
    const userStats = await this.getUserStats(userId);
    return Array.from(this.quests.values()).filter(quest => {
      // Check prerequisites
      if (quest.prerequisites) {
        return quest.prerequisites.every(prereq => userStats.achievements.includes(prereq));
      }
      return true;
    });
  }

  async startQuest(userId: string, questId: string): Promise<boolean> {
    const quest = this.quests.get(questId);
    if (!quest || quest.status !== 'available') return false;

    quest.status = 'active';
    quest.startedAt = new Date();
    
    await this.createNotification(userId, {
      type: 'quest',
      title: 'Quest Started!',
      message: `You've started: ${quest.name}`,
      data: { quest },
      actionUrl: '/quests'
    });

    return true;
  }

  async updateQuestProgress(userId: string, questId: string, objectiveId: string, progress: number): Promise<void> {
    const quest = this.quests.get(questId);
    if (!quest || quest.status !== 'active') return;

    const objective = quest.objectives.find(obj => obj.id === objectiveId);
    if (!objective) return;

    objective.current = Math.min(objective.current + progress, objective.target);
    objective.completed = objective.current >= objective.target;

    // Update overall quest progress
    quest.progress = quest.objectives.reduce((sum, obj) => sum + obj.current, 0);
    quest.maxProgress = quest.objectives.reduce((sum, obj) => sum + obj.target, 0);

    // Check if quest is completed
    if (quest.objectives.every(obj => obj.completed)) {
      await this.completeQuest(userId, questId);
    }
  }

  private async completeQuest(userId: string, questId: string): Promise<void> {
    const quest = this.quests.get(questId);
    if (!quest) return;

    quest.status = 'completed';
    quest.completedAt = new Date();

    // Apply rewards
    for (const reward of quest.rewards) {
      await this.applyReward(userId, reward);
    }

    // Record event
    this.recordEvent({
      type: 'quest_completed',
      userId,
      data: { questId, quest },
      timestamp: new Date(),
      visible: true
    });

    await this.createNotification(userId, {
      type: 'quest',
      title: 'Quest Completed!',
      message: `You've completed: ${quest.name}`,
      data: { quest },
      actionUrl: '/quests'
    });
  }

  // Leaderboard System
  async getLeaderboard(period: 'daily' | 'weekly' | 'monthly' | 'all_time', category: 'xp' | 'workflows' | 'executions' | 'streak' | 'achievements'): Promise<Leaderboard> {
    const key = `${period}_${category}`;
    let leaderboard = this.leaderboards.get(key);

    if (!leaderboard || this.shouldUpdateLeaderboard(leaderboard)) {
      leaderboard = await this.generateLeaderboard(period, category);
      this.leaderboards.set(key, leaderboard);
    }

    return leaderboard;
  }

  private async generateLeaderboard(period: string, category: string): Promise<Leaderboard> {
    const users = Array.from(this.userStats.values());

    const entries: LeaderboardEntry[] = users.map((stats, index) => {
      let value = 0;
      switch (category) {
        case 'xp': value = stats.totalXP; break;
        case 'workflows': value = stats.totalWorkflows; break;
        case 'executions': value = stats.totalExecutions; break;
        case 'streak': value = stats.currentStreak; break;
        case 'achievements': value = stats.achievements.length; break;
      }

      return {
        userId: stats.userId,
        username: `User ${stats.userId}`, // Would fetch from user service
        level: stats.level,
        value,
        rank: index + 1,
        change: Math.floor(Math.random() * 10) - 5 // Mock change
      };
    }).sort((a, b) => b.value - a.value);

    // Update ranks
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return {
      period: period as 'daily' | 'weekly' | 'monthly' | 'all_time',
      category: category as 'xp' | 'workflows' | 'executions' | 'streak' | 'achievements',
      users: entries,
      lastUpdated: new Date()
    };
  }

  // Team System
  async createTeam(leaderId: string, name: string, description: string): Promise<Team> {
    const team: Team = {
      id: this.generateId(),
      name,
      description,
      members: [{
        userId: leaderId,
        username: `User ${leaderId}`,
        role: 'leader',
        joinedAt: new Date(),
        contribution: 0,
        level: 1
      }],
      level: 1,
      totalXP: 0,
      achievements: [],
      quests: [],
      competitions: [],
      createdAt: new Date(),
      settings: {
        isPublic: true,
        allowJoinRequests: true,
        autoAcceptMembers: false,
        shareProgress: true,
        competitiveMode: false
      }
    };

    this.teams.set(team.id, team);
    return team;
  }

  async joinTeam(userId: string, teamId: string): Promise<boolean> {
    const team = this.teams.get(teamId);
    if (!team || team.members.length >= 50) return false; // Max 50 members

    const existingMember = team.members.find(m => m.userId === userId);
    if (existingMember) return false;

    const userStats = await this.getUserStats(userId);
    team.members.push({
      userId,
      username: `User ${userId}`,
      role: 'member',
      joinedAt: new Date(),
      contribution: 0,
      level: userStats.level
    });

    return true;
  }

  // Notification System
  async getNotifications(userId: string, unreadOnly = false): Promise<Notification[]> {
    const userNotifications = this.notifications.get(userId) || [];

    if (unreadOnly) {
      return userNotifications.filter(n => !n.read);
    }

    return userNotifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createNotification(userId: string, notificationData: Omit<Notification, 'id' | 'userId' | 'read' | 'createdAt'>): Promise<Notification> {
    const notification: Notification = {
      id: this.generateId(),
      userId,
      read: false,
      createdAt: new Date(),
      ...notificationData
    };

    const userNotifications = this.notifications.get(userId) || [];
    userNotifications.push(notification);
    this.notifications.set(userId, userNotifications);

    return notification;
  }

  async markNotificationRead(userId: string, notificationId: string): Promise<boolean> {
    const userNotifications = this.notifications.get(userId) || [];
    const notification = userNotifications.find(n => n.id === notificationId);

    if (notification) {
      notification.read = true;
      return true;
    }

    return false;
  }

  // Event Recording
  async trackEvent(userId: string, eventType: string, data: unknown): Promise<void> {
    // Update user stats based on event
    switch (eventType) {
      case 'workflow_created':
        await this.handleWorkflowCreated(userId, data);
        break;
      case 'workflow_executed':
        await this.handleWorkflowExecuted(userId, data);
        break;
      case 'node_used':
        await this.handleNodeUsed(userId, data);
        break;
      case 'collaboration':
        await this.handleCollaboration(userId, data);
        break;
    }

    // Check for achievements
    await this.checkAchievements(userId, eventType, data);
  }

  private async handleWorkflowCreated(userId: string, _data: unknown): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars
    const stats = await this.getUserStats(userId);
    await this.updateUserStats(userId, {
      totalWorkflows: stats.totalWorkflows + 1
    });

    // Award XP
    await this.addXP(userId, 50, 'Created a workflow');
  }

  private async handleWorkflowExecuted(userId: string, data: unknown): Promise<void> {
    const stats = await this.getUserStats(userId);
    const executionData = data as { status?: string };
    const isSuccess = executionData.status === 'success';
    await this.updateUserStats(userId, {
      totalExecutions: stats.totalExecutions + 1,
      successfulExecutions: isSuccess ? stats.successfulExecutions + 1 : stats.successfulExecutions
    });

    // Award XP
    const xpAmount = isSuccess ? 30 : 10;
    await this.addXP(userId, xpAmount, `Executed a workflow (${executionData.status})`);
  }

  private async handleNodeUsed(userId: string, data: unknown): Promise<void> {
    const stats = await this.getUserStats(userId);
    await this.updateUserStats(userId, {
      totalNodesUsed: stats.totalNodesUsed + 1
    });

    // Award XP for unique nodes
    const nodeData = data as { previouslyUsed?: boolean; nodeType?: string };
    if (!nodeData.previouslyUsed) {
      await this.addXP(userId, 15, `Used a new node type: ${nodeData.nodeType}`);
    }
  }

  private async handleCollaboration(userId: string, _data: unknown): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars
    const stats = await this.getUserStats(userId);
    await this.updateUserStats(userId, {
      collaborations: stats.collaborations + 1
    });

    await this.addXP(userId, 30, 'Collaboration activity');
  }

  // Utility Methods
  private async applyReward(userId: string, reward: Reward): Promise<void> {
    switch (reward.type) {
      case 'xp':
        await this.addXP(userId, Number(reward.value), 'Reward');
        break;
      case 'badge':
        await this.awardBadge(userId, reward.value);
        break;
      case 'title':
        await this.awardTitle(userId, String(reward.value));
        break;
      default:
        return;
    }
  }

  private async awardBadge(userId: string, badgeData: unknown): Promise<void> {
    const stats = await this.getUserStats(userId);
    const badgeInfo = badgeData as { name: string; description: string; icon: string; color: string; category: string };
    const badge: Badge = {
      id: this.generateId(),
      name: badgeInfo.name,
      description: badgeInfo.description,
      icon: badgeInfo.icon,
      color: badgeInfo.color,
      earnedAt: new Date(),
      category: badgeInfo.category
    };

    stats.badges.push(badge);
    await this.updateUserStats(userId, { badges: stats.badges });
  }

  private async awardTitle(userId: string, title: string): Promise<void> {
    const stats = await this.getUserStats(userId);
    if (!stats.titles.includes(title)) {
      stats.titles.push(title);
      await this.updateUserStats(userId, { titles: stats.titles });
    }
  }

  private calculateLevel(totalXP: number): number {
    for (let i = this.levels.length - 1; i >= 0; i--) {
      if (totalXP >= this.levels[i].xpRequired) {
        return this.levels[i].level;
      }
    }
    return 1;
  }

  private getCurrentLevelXP(totalXP: number, level: number): number {
    const currentLevel = this.levels.find(l => l.level === level);
    if (!currentLevel) return 0;

    const currentLevelStart = currentLevel.xpRequired;
    return totalXP - currentLevelStart;
  }

  private getNextLevelXP(level: number): number {
    const currentLevel = this.levels.find(l => l.level === level);
    const nextLevel = this.levels.find(l => l.level === level + 1);
    if (!nextLevel || !currentLevel) return 0;

    return nextLevel.xpRequired - currentLevel.xpRequired;
  }

  private getLevelRewards(level: number): Reward[] {
    // Return level-specific rewards
    const rewards: Reward[] = [
      { type: 'title', value: `Level ${level} User` }
    ];

    if (level % 5 === 0) {
      rewards.push({ type: 'badge', value: { name: `Milestone ${level}`, icon: '🏆' } });
    }

    return rewards;
  }

  private getAchievementProgress(_userId: string, _achievementId: string): number { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Mock implementation - would calculate actual progress
    return Math.floor(Math.random() * 100);
  }

  private shouldUpdateLeaderboard(leaderboard: Leaderboard): boolean {
    const now = new Date();
    const hoursSinceUpdate = (now.getTime() - leaderboard.lastUpdated.getTime()) / (1000 * 60 * 60);
    return hoursSinceUpdate >= 1; // Update every hour
  }

  private recordEvent(event: GamificationEvent): void {
    this.events.push(event);
    
    // Keep only last 10000 events
    if (this.events.length > 10000) {
      this.events.shift();
    }
  }

  private createInitialUserStats(userId: string): UserStats {
    return {
      userId,
      level: 1,
      totalXP: 0,
      currentLevelXP: 0,
      nextLevelXP: 100,
      rank: 0,
      totalWorkflows: 0,
      totalExecutions: 0,
      successfulExecutions: 0,
      totalNodesUsed: 0,
      uniqueNodesUsed: 0,
      collaborations: 0,
      timeSpent: 0,
      currentStreak: 0,
      longestStreak: 0,
      achievements: [],
      badges: [],
      titles: ['Newcomer'],
      joinedAt: new Date(),
      lastActivity: new Date(),
      weeklyStats: {
        week: new Date().toISOString().slice(0, 10),
        workflowsCreated: 0,
        executionsRun: 0,
        xpEarned: 0,
        achievementsUnlocked: 0,
        collaborations: 0,
        activeStreak: 0
      },
      monthlyStats: {
        month: new Date().toISOString().slice(0, 7),
        workflowsCreated: 0,
        executionsRun: 0,
        xpEarned: 0,
        achievementsUnlocked: 0,
        collaborations: 0,
        averageStreak: 0,
        topCategory: 'workflow'
      }
    };
  }

  private initializeLevels(): void {
    this.levels = [
      { level: 1, title: 'Beginner', xpRequired: 0, color: '#94A3B8', benefits: ['Access to basic features'], icon: '🌱' },
      { level: 2, title: 'Novice', xpRequired: 100, color: '#10B981', benefits: ['Custom themes'], icon: '🌿' },
      { level: 3, title: 'Apprentice', xpRequired: 300, color: '#3B82F6', benefits: ['Advanced nodes'], icon: '⚡' },
      { level: 4, title: 'Skilled', xpRequired: 600, color: '#8B5CF6', benefits: ['Team features'], icon: '🔥' },
      { level: 5, title: 'Expert', xpRequired: 1000, color: '#F59E0B', benefits: ['Priority support'], icon: '💎' },
      { level: 6, title: 'Master', xpRequired: 1500, color: '#EF4444', benefits: ['Beta features'], icon: '👑' },
      { level: 7, title: 'Grandmaster', xpRequired: 2200, color: '#EC4899', benefits: ['Custom integrations'], icon: '🚀' },
      { level: 8, title: 'Legend', xpRequired: 3000, color: '#6366F1', benefits: ['Unlimited resources'], icon: '🌟' },
      { level: 9, title: 'Mythic', xpRequired: 4000, color: '#14B8A6', benefits: ['Personal consultant'], icon: '🎖️' },
      { level: 10, title: 'Divine', xpRequired: 5500, color: '#F97316', benefits: ['Lifetime premium'], icon: '🏆' }
    ];
  }

  private initializeAchievements(): void {
    const achievements: Achievement[] = [
      {
        id: 'first_workflow',
        name: 'First Steps',
        description: 'Create your first workflow',
        category: 'workflow',
        type: 'single',
        rarity: 'common',
        points: 50,
        conditions: [{ type: 'workflow_created', operator: 'greater_equal', value: 1 }],
        rewards: [{ type: 'xp', value: 50 }, { type: 'badge', value: { name: 'Creator', icon: '🎨' } }],
        icon: '🎯',
        badgeColor: '#10B981',
        unlocked: false
      },
      {
        id: 'workflow_master',
        name: 'Workflow Master',
        description: 'Create 50 workflows',
        category: 'workflow',
        type: 'milestone',
        rarity: 'rare',
        points: 500,
        conditions: [{ type: 'workflow_created', operator: 'greater_equal', value: 50 }],
        rewards: [{ type: 'xp', value: 500 }, { type: 'title', value: 'Workflow Master' }],
        icon: '👑',
        badgeColor: '#8B5CF6',
        unlocked: false
      },
      {
        id: 'execution_streak',
        name: 'Consistent Performer',
        description: 'Execute workflows for 7 days straight',
        category: 'performance',
        type: 'streak',
        rarity: 'uncommon',
        points: 200,
        conditions: [{ type: 'streak', operator: 'greater_equal', value: 7 }],
        rewards: [{ type: 'xp', value: 200 }, { type: 'badge', value: { name: 'Streak', icon: '🔥' } }],
        icon: '🔥',
        badgeColor: '#F59E0B',
        unlocked: false
      },
      {
        id: 'perfect_execution',
        name: 'Perfectionist',
        description: 'Achieve 100% success rate with 100+ executions',
        category: 'performance',
        type: 'milestone',
        rarity: 'epic',
        points: 1000,
        conditions: [
          { type: 'workflow_executed', operator: 'greater_equal', value: 100 },
          { type: 'performance', operator: 'equals', value: 100 }
        ],
        rewards: [{ type: 'xp', value: 1000 }, { type: 'title', value: 'Perfectionist' }],
        icon: '💎',
        badgeColor: '#EC4899',
        unlocked: false
      },
      {
        id: 'collaborator',
        name: 'Team Player',
        description: 'Collaborate on 10 different workflows',
        category: 'collaboration',
        type: 'progressive',
        rarity: 'uncommon',
        points: 300,
        conditions: [{ type: 'collaboration', operator: 'greater_equal', value: 10 }],
        rewards: [{ type: 'xp', value: 300 }, { type: 'badge', value: { name: 'Collaborator', icon: '🤝' } }],
        icon: '🤝',
        badgeColor: '#3B82F6',
        unlocked: false
      }
    ];

    achievements.forEach(achievement => {
      this.achievements.set(achievement.id, achievement);
    });
  }

  private initializeQuests(): void {
    const quests: Quest[] = [
      {
        id: 'daily_creator',
        name: 'Daily Creator',
        description: 'Create and execute 3 workflows today',
        category: 'daily',
        difficulty: 'easy',
        objectives: [
          { id: 'create_3', description: 'Create 3 workflows', type: 'workflow_create', target: 3, current: 0, completed: false },
          { id: 'execute_3', description: 'Execute 3 workflows', type: 'workflow_execute', target: 3, current: 0, completed: false }
        ],
        rewards: [{ type: 'xp', value: 100 }],
        timeLimit: new Date(Date.now() + 24 * 60 * 60 * 1000),
        progress: 0,
        maxProgress: 6,
        status: 'available'
      },
      {
        id: 'weekly_explorer',
        name: 'Weekly Explorer',
        description: 'Use 15 different node types this week',
        category: 'weekly',
        difficulty: 'medium',
        objectives: [
          { id: 'nodes_15', description: 'Use 15 different node types', type: 'node_use', target: 15, current: 0, completed: false }
        ],
        rewards: [{ type: 'xp', value: 300 }, { type: 'badge', value: { name: 'Explorer', icon: '🧭' } }],
        timeLimit: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        progress: 0,
        maxProgress: 15,
        status: 'available'
      },
      {
        id: 'collaboration_champion',
        name: 'Collaboration Champion',
        description: 'Work with 5 team members on shared projects',
        category: 'monthly',
        difficulty: 'hard',
        objectives: [
          { id: 'collaborate_5', description: 'Collaborate with 5 different users', type: 'collaborate', target: 5, current: 0, completed: false }
        ],
        rewards: [{ type: 'xp', value: 500 }, { type: 'title', value: 'Champion' }],
        timeLimit: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        progress: 0,
        maxProgress: 5,
        status: 'available'
      }
    ];

    quests.forEach(quest => {
      this.quests.set(quest.id, quest);
    });
  }

  private initializeSampleData(): void {
    // Create sample user stats
    const sampleUser = this.createInitialUserStats('user-001');
    sampleUser.level = 3;
    sampleUser.totalXP = 450;
    sampleUser.totalWorkflows = 15;
    sampleUser.totalExecutions = 78;
    sampleUser.successfulExecutions = 72;
    sampleUser.currentStreak = 5;
    sampleUser.achievements = ['first_workflow'];

    this.userStats.set('user-001', sampleUser);
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

// Singleton instance
export const gamificationService = new GamificationService();