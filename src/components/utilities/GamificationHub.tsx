import React, { useState, useEffect } from 'react';
import {
  BarChart3, Bell, Check, CheckCircle, Minus, Target,
  TrendingDown, TrendingUp, Trophy, User, X
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import { logger } from '../../services/SimpleLogger';
import { 
  gamificationService, 
  UserStats, 
  Achievement, 
  Quest, 
  Leaderboard, 
  Notification,
  Team
} from '../../services/GamificationService';

interface GamificationHubProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GamificationHub({ isOpen, onClose }: GamificationHubProps) {
  const { darkMode } = useWorkflowStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'achievements' | 'quests' | 'leaderboard' | 'teams' | 'notifications'>('profile');
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'workflow' | 'collaboration' | 'performance' | 'learning'>('all');

  const currentUserId = 'user-001'; // Mock user ID

  useEffect(() => {
    if (isOpen) {
      loadGamificationData();
    }
  }, [isOpen]);

  const loadGamificationData = async () => {
    setIsLoading(true);
    try {
      const [stats, userAchievements, availableQuests, leaderboardData, userNotifications] = await Promise.all([
        gamificationService.getUserStats(currentUserId),
        gamificationService.getUserAchievements(currentUserId),
        gamificationService.getAvailableQuests(currentUserId),
        gamificationService.getLeaderboard('weekly', 'xp'),
        gamificationService.getNotifications(currentUserId)
      ]);

      setUserStats(stats);
      setAchievements(userAchievements);
      setQuests(availableQuests);
      setLeaderboard(leaderboardData);
      setNotifications(userNotifications);
    } catch (error) {
      logger.error('Failed to load gamification data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    // PRECISION FIX: Avoid division precision errors in number formatting
    if (num >= 1000000) return `${Math.round(num / 100000) / 10}M`;
    if (num >= 1000) return `${Math.round(num / 100) / 10}K`;
    return num.toString();
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-500 bg-gray-100';
      case 'uncommon': return 'text-green-500 bg-green-100';
      case 'rare': return 'text-blue-500 bg-blue-100';
      case 'epic': return 'text-purple-500 bg-purple-100';
      case 'legendary': return 'text-yellow-500 bg-yellow-100';
      default: return 'text-gray-500 bg-gray-100';
    }
  };

  const ProfileTab = () => {
    if (!userStats) return <div>Loading...</div>;

    const progressToNextLevel = userStats.nextLevelXP > 0 
      ? (userStats.currentLevelXP / userStats.nextLevelXP) * 100 
      : 100;

    return (
      <div className="space-y-6">
        {/* User Profile Card */}
        <div className={`p-6 rounded-lg border ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {userStats.level}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">User {currentUserId}</h2>
              <p className="text-lg text-blue-500 font-medium">Level {userStats.level}</p>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                <span>🏆 #{userStats.rank || 'Unranked'}</span>
                <span>⚡ {formatNumber(userStats.totalXP)} XP</span>
                <span>🔥 {userStats.currentStreak} day streak</span>
              </div>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Progress to Level {userStats.level + 1}</span>
              <span>{userStats.currentLevelXP} / {userStats.nextLevelXP} XP</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressToNextLevel}%` }}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <div className="text-2xl font-bold text-blue-500">{userStats.totalWorkflows}</div>
              <div className="text-sm text-gray-500">Workflows</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
              <div className="text-2xl font-bold text-green-500">{userStats.totalExecutions}</div>
              <div className="text-sm text-gray-500">Executions</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <div className="text-2xl font-bold text-purple-500">{userStats.achievements.length}</div>
              <div className="text-sm text-gray-500">Achievements</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
              <div className="text-2xl font-bold text-orange-500">{userStats.collaborations}</div>
              <div className="text-sm text-gray-500">Collaborations</div>
            </div>
          </div>
        </div>

        {/* Recent Achievements */}
        <div className={`p-6 rounded-lg border ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h3 className="text-lg font-semibold mb-4">Recent Achievements</h3>
          <div className="space-y-3">
            {achievements.filter(a => a.unlocked).slice(0, 3).map(achievement => (
              <div key={achievement.id} className="flex items-center space-x-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                <div className="text-2xl">{achievement.icon}</div>
                <div className="flex-1">
                  <h4 className="font-medium text-yellow-700 dark:text-yellow-300">{achievement.name}</h4>
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">{achievement.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-yellow-500">+{achievement.points} XP</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Quests */}
        <div className={`p-6 rounded-lg border ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Active Quests</h3>
            <button 
              onClick={() => setActiveTab('quests')}
              className="text-blue-500 hover:text-blue-600 text-sm"
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {quests.filter(q => q.status === 'active').slice(0, 2).map(quest => {
              const progress = quest.maxProgress > 0 ? (quest.progress / quest.maxProgress) * 100 : 0;
              return (
                <div key={quest.id} className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-blue-700 dark:text-blue-300">{quest.name}</h4>
                    <span className={`px-2 py-1 rounded text-xs ${
                      quest.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                      quest.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      quest.difficulty === 'hard' ? 'bg-red-100 text-red-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {quest.difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mb-2">{quest.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 mr-4">
                      <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm text-blue-500">{quest.progress}/{quest.maxProgress}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const AchievementsTab = () => {
    const filteredAchievements = achievements.filter(achievement => 
      selectedCategory === 'all' || achievement.category === selectedCategory
    );

    return (
      <div className="space-y-6">
        {/* Filter Tabs */}
        <div className="flex space-x-2 overflow-x-auto">
          {['all', 'workflow', 'collaboration', 'performance', 'learning'].map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category as 'all' | 'workflow' | 'collaboration' | 'performance' | 'learning')}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-500 text-white'
                  : darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>

        {/* Achievement Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-lg border ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="text-2xl font-bold text-green-500">
              {achievements.filter(a => a.unlocked).length}
            </div>
            <div className="text-sm text-gray-500">Unlocked</div>
          </div>
          <div className={`p-4 rounded-lg border ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="text-2xl font-bold text-blue-500">{achievements.length}</div>
            <div className="text-sm text-gray-500">Total</div>
          </div>
          <div className={`p-4 rounded-lg border ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="text-2xl font-bold text-purple-500">
              {achievements.filter(a => a.unlocked).reduce((sum, a) => sum + a.points, 0)}
            </div>
            <div className="text-sm text-gray-500">Points Earned</div>
          </div>
          <div className={`p-4 rounded-lg border ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="text-2xl font-bold text-orange-500">
              {Math.round((achievements.filter(a => a.unlocked).length / achievements.length) * 100)}%
            </div>
            <div className="text-sm text-gray-500">Completion</div>
          </div>
        </div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAchievements.map(achievement => (
            <div 
              key={achievement.id} 
              className={`p-4 rounded-lg border transition-all hover:shadow-md ${
                achievement.unlocked
                  ? darkMode 
                    ? 'bg-gray-800 border-gray-700 ring-2 ring-yellow-500' 
                    : 'bg-white border-gray-200 ring-2 ring-yellow-500'
                  : darkMode 
                    ? 'bg-gray-800 border-gray-700 opacity-60' 
                    : 'bg-white border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="text-3xl">{achievement.icon}</div>
                <div className="flex flex-col items-end space-y-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRarityColor(achievement.rarity)}`}>
                    {achievement.rarity}
                  </span>
                  {achievement.unlocked && (
                    <CheckCircle className="text-green-500" size={16} />
                  )}
                </div>
              </div>
              <h3 className={`font-semibold mb-1 ${achievement.unlocked ? '' : 'text-gray-500'}`}>
                {achievement.name}
              </h3>
              <p className={`text-sm mb-3 ${achievement.unlocked ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400'}`}>
                {achievement.description}
              </p>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${achievement.unlocked ? 'text-blue-500' : 'text-gray-400'}`}>
                  +{achievement.points} XP
                </span>
                {!achievement.unlocked && achievement.progress !== undefined && (
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                      <div 
                        className="bg-blue-500 h-1 rounded-full"
                        style={{ width: `${achievement.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{achievement.progress}%</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const QuestsTab = () => (
    <div className="space-y-6">
      {/* Quest Categories */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['daily', 'weekly', 'monthly', 'special'].map(category => {
          const categoryQuests = quests.filter(q => q.category === category);
          const completedQuests = categoryQuests.filter(q => q.status === 'completed').length;
          
          return (
            <div key={category} className={`p-4 rounded-lg border ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <div className="text-center">
                <div className="text-2xl mb-2">
                  {category === 'daily' ? '📅' : 
                   category === 'weekly' ? '📊' : 
                   category === 'monthly' ? '🗓️' : '⭐'}
                </div>
                <h3 className="font-semibold capitalize">{category}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {completedQuests}/{categoryQuests.length} completed
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Available Quests */}
      <div className={`rounded-lg border ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold">Available Quests</h3>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {quests.filter(q => q.status === 'available').map(quest => (
            <div key={quest.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-medium">{quest.name}</h4>
                    <span className={`px-2 py-1 rounded text-xs ${
                      quest.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                      quest.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      quest.difficulty === 'hard' ? 'bg-red-100 text-red-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {quest.difficulty}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      quest.category === 'daily' ? 'bg-blue-100 text-blue-800' :
                      quest.category === 'weekly' ? 'bg-green-100 text-green-800' :
                      quest.category === 'monthly' ? 'bg-purple-100 text-purple-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {quest.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{quest.description}</p>
                  
                  {/* Objectives */}
                  <div className="space-y-2">
                    {quest.objectives.map(objective => (
                      <div key={objective.id} className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          objective.completed ? 'bg-green-500 border-green-500' : 'border-gray-300'
                        }`}>
                          {objective.completed && <Check size={10} className="text-white" />}
                        </div>
                        <span className={`text-sm ${objective.completed ? 'line-through text-gray-500' : ''}`}>
                          {objective.description}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({objective.current}/{objective.target})
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Rewards */}
                  <div className="flex items-center space-x-4 mt-3 text-sm text-green-600">
                    {quest.rewards.map((reward, index) => (
                      <span key={index}>
                        {reward.type === 'xp' ? `+${reward.value as number} XP` : String(reward.value)}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="flex flex-col items-end space-y-2">
                  {quest.timeLimit && (
                    <div className="text-xs text-gray-500">
                      Expires: {quest.timeLimit.toLocaleDateString()}
                    </div>
                  )}
                  <button 
                    onClick={() => gamificationService.startQuest(currentUserId, quest.id)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                  >
                    Start Quest
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const LeaderboardTab = () => {
    if (!leaderboard) return <div>Loading leaderboard...</div>;

    return (
      <div className="space-y-6">
        {/* Leaderboard Controls */}
        <div className="flex items-center space-x-4">
          <select className={`px-3 py-2 rounded-lg border ${
            darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200'
          }`}>
            <option value="weekly">This Week</option>
            <option value="monthly">This Month</option>
            <option value="all_time">All Time</option>
          </select>
          <select className={`px-3 py-2 rounded-lg border ${
            darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200'
          }`}>
            <option value="xp">Experience Points</option>
            <option value="workflows">Workflows Created</option>
            <option value="executions">Executions</option>
            <option value="achievements">Achievements</option>
          </select>
        </div>

        {/* Top 3 Podium */}
        <div className="flex items-end justify-center space-x-4 mb-8">
          {leaderboard.users.slice(0, 3).map((user, index) => {
            const heights = ['h-20', 'h-24', 'h-16'];
            const positions = [2, 1, 3];
            const colors = ['bg-gray-400', 'bg-yellow-400', 'bg-orange-400'];
            
            return (
              <div key={user.userId} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-lg font-bold mb-2">
                  {user.level}
                </div>
                <div className={`w-20 ${heights[index]} ${colors[index]} rounded-t-lg flex items-end justify-center pb-2`}>
                  <span className="text-white font-bold text-2xl">{positions[index]}</span>
                </div>
                <p className="font-medium mt-2">{user.username}</p>
                <p className="text-sm text-gray-500">{formatNumber(user.value)} XP</p>
              </div>
            );
          })}
        </div>

        {/* Full Leaderboard */}
        <div className={`rounded-lg border ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } overflow-hidden`}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold">Leaderboard</h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {leaderboard.users.slice(0, 20).map((user, index) => (
              <div key={user.userId} className="p-4 flex items-center space-x-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  index < 3 ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' : 'bg-gray-200 text-gray-700'
                }`}>
                  {user.rank}
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                  {user.level}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{user.username}</p>
                  <p className="text-sm text-gray-500">Level {user.level}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatNumber(user.value)}</p>
                  <p className="text-sm text-gray-500">XP</p>
                </div>
                {user.change !== undefined && (
                  <div className={`flex items-center text-sm ${
                    user.change > 0 ? 'text-green-500' : user.change < 0 ? 'text-red-500' : 'text-gray-500'
                  }`}>
                    {user.change > 0 ? (
                      <TrendingUp size={14} />
                    ) : user.change < 0 ? (
                      <TrendingDown size={14} />
                    ) : (
                      <Minus size={14} />
                    )}
                    <span className="ml-1">{Math.abs(user.change)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const NotificationsTab = () => (
    <div className="space-y-4">
      {notifications.length === 0 ? (
        <div className="text-center py-8">
          <Bell className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-gray-500">No notifications yet</p>
        </div>
      ) : (
        notifications.map(notification => (
          <div 
            key={notification.id}
            className={`p-4 rounded-lg border ${
              notification.read 
                ? darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                : darkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-full ${
                  notification.type === 'achievement' ? 'bg-yellow-100 text-yellow-600' :
                  notification.type === 'level_up' ? 'bg-green-100 text-green-600' :
                  notification.type === 'quest' ? 'bg-blue-100 text-blue-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {notification.type === 'achievement' ? <Trophy size={16} /> :
                   notification.type === 'level_up' ? <TrendingUp size={16} /> :
                   notification.type === 'quest' ? <Target size={16} /> :
                   <Bell size={16} />}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{notification.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {notification.createdAt.toLocaleDateString()}
                  </p>
                </div>
              </div>
              {!notification.read && (
                <button
                  onClick={() => gamificationService.markNotificationRead(currentUserId, notification.id)}
                  className="text-blue-500 hover:text-blue-600"
                >
                  <Check size={16} />
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`w-full max-w-6xl max-h-[90vh] ${
        darkMode ? 'bg-gray-900' : 'bg-white'
      } rounded-xl shadow-2xl overflow-hidden`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                <Trophy className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Gamification Hub</h2>
                <p className="text-sm text-gray-500">Achievements, quests, and leaderboards</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'achievements', label: 'Achievements', icon: Trophy },
            { id: 'quests', label: 'Quests', icon: Target },
            { id: 'leaderboard', label: 'Leaderboard', icon: BarChart3 },
            { id: 'notifications', label: 'Notifications', icon: Bell }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'profile' | 'achievements' | 'quests' | 'leaderboard' | 'teams' | 'notifications')}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 transition-colors ${
                activeTab === tab.id
                  ? darkMode
                    ? 'bg-gray-800 text-yellow-400 border-b-2 border-yellow-400'
                    : 'bg-gray-50 text-yellow-600 border-b-2 border-yellow-600'
                  : darkMode
                    ? 'text-gray-400 hover:text-gray-200'
                    : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
              {tab.id === 'notifications' && notifications.filter(n => !n.read).length > 0 && (
                <div className="w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ height: 'calc(90vh - 160px)' }}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
            </div>
          ) : (
            <>
              {activeTab === 'profile' && <ProfileTab />}
              {activeTab === 'achievements' && <AchievementsTab />}
              {activeTab === 'quests' && <QuestsTab />}
              {activeTab === 'leaderboard' && <LeaderboardTab />}
              {activeTab === 'notifications' && <NotificationsTab />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}