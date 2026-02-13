import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useAppStore } from '../store/appStore';
import { LoadingSpinner } from '../components/LoadingSpinner';
import WorkflowService from '../services/WorkflowService';
import { DashboardStats } from '../types';

const { width } = Dimensions.get('window');

export const HomeScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const { stats, setStats, workflows, executions, isOnline } = useAppStore();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [workflowsData, executionsData] = await Promise.all([
        WorkflowService.getWorkflows(),
        WorkflowService.getExecutions(),
      ]);

      useAppStore.getState().setWorkflows(workflowsData);
      useAppStore.getState().setExecutions(executionsData);

      // Calculate stats
      const activeWorkflows = workflowsData.filter((w) => w.active).length;
      const successfulExecutions = executionsData.filter((e) => e.status === 'success').length;
      const failedExecutions = executionsData.filter((e) => e.status === 'error').length;
      const totalExecutions = executionsData.length;
      const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

      const avgExecutionTime =
        executionsData
          .filter((e) => e.duration)
          .reduce((sum, e) => sum + (e.duration || 0), 0) / executionsData.length || 0;

      const dashboardStats: DashboardStats = {
        totalWorkflows: workflowsData.length,
        activeWorkflows,
        totalExecutions,
        successRate,
        failedExecutions,
        avgExecutionTime,
      };

      setStats(dashboardStats);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  if (!stats) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  const StatCard = ({
    label,
    value,
    color,
    subtitle,
  }: {
    label: string;
    value: string | number;
    color: string;
    subtitle?: string;
  }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const QuickActionButton = ({
    icon,
    label,
    onPress,
  }: {
    icon: string;
    label: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <Text style={styles.quickActionIcon}>{icon}</Text>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Dashboard</Text>
        <View style={[styles.statusBadge, { backgroundColor: isOnline ? '#10b981' : '#ef4444' }]}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          label="Total Workflows"
          value={stats.totalWorkflows}
          color="#6366f1"
          subtitle={`${stats.activeWorkflows} active`}
        />
        <StatCard
          label="Total Executions"
          value={stats.totalExecutions}
          color="#3b82f6"
        />
        <StatCard
          label="Success Rate"
          value={`${stats.successRate.toFixed(1)}%`}
          color="#10b981"
        />
        <StatCard
          label="Failed Runs"
          value={stats.failedExecutions}
          color="#ef4444"
        />
      </View>

      {/* Average Execution Time */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Performance</Text>
        <View style={styles.performanceRow}>
          <Text style={styles.performanceLabel}>Avg Execution Time</Text>
          <Text style={styles.performanceValue}>
            {stats.avgExecutionTime < 1000
              ? `${Math.round(stats.avgExecutionTime)}ms`
              : `${(stats.avgExecutionTime / 1000).toFixed(2)}s`}
          </Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <QuickActionButton
            icon="➕"
            label="New Workflow"
            onPress={() => console.log('New workflow')}
          />
          <QuickActionButton
            icon="▶️"
            label="Execute"
            onPress={() => console.log('Execute')}
          />
          <QuickActionButton
            icon="📊"
            label="Analytics"
            onPress={() => console.log('Analytics')}
          />
          <QuickActionButton
            icon="⚙️"
            label="Settings"
            onPress={() => console.log('Settings')}
          />
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent Workflows</Text>
        {workflows.slice(0, 3).map((workflow) => (
          <TouchableOpacity key={workflow.id} style={styles.recentItem}>
            <View style={styles.recentItemLeft}>
              <View
                style={[
                  styles.recentItemDot,
                  { backgroundColor: workflow.active ? '#10b981' : '#9ca3af' },
                ]}
              />
              <Text style={styles.recentItemName}>{workflow.name}</Text>
            </View>
            <Text style={styles.recentItemCount}>{workflow.executionCount || 0} runs</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginRight: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
  statCard: {
    width: (width - 48) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 6,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statSubtitle: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  performanceLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  performanceValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6366f1',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  quickAction: {
    width: (width - 80) / 4,
    alignItems: 'center',
    margin: 8,
  },
  quickActionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
  },
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  recentItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recentItemDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  recentItemName: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
    flex: 1,
  },
  recentItemCount: {
    fontSize: 12,
    color: '#6b7280',
  },
});
