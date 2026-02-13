/**
 * Mobile Dashboard Screen
 * Main screen showing workflow statistics and quick actions
 */

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { LineChart } from 'react-native-chart-kit';

import { colors } from '../theme/colors';
import StatCard from '../components/StatCard';
import RecentWorkflows from '../components/RecentWorkflows';
import QuickActions from '../components/QuickActions';
import { useDashboardData } from '../hooks/useDashboardData';

const { width: screenWidth } = Dimensions.get('window');

export default function DashboardScreen() {
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const { data, refetch } = useDashboardData();

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  };

  const chartConfig = {
    backgroundColor: colors.primary,
    backgroundGradientFrom: colors.primary,
    backgroundGradientTo: colors.primaryDark,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16,
    },
  };

  const executionData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        data: data?.executionHistory || [20, 45, 28, 80, 99, 43, 60],
      },
    ],
  };

  const performanceData = {
    labels: ['Success', 'Failed', 'Running'],
    data: [
      data?.performanceMetrics?.success || 0.75,
      data?.performanceMetrics?.failed || 0.15,
      data?.performanceMetrics?.running || 0.10,
    ],
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.header}
        >
          <Text style={styles.greeting}>Good {getTimeOfDay()},</Text>
          <Text style={styles.userName}>{data?.userName || 'User'}</Text>
          <Text style={styles.subtitle}>
            You have {data?.activeWorkflows || 0} active workflows
          </Text>
        </LinearGradient>

        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <StatCard
            title="Total Workflows"
            value={data?.totalWorkflows || 0}
            trend={+12}
            icon="workflow"
            color={colors.primary}
          />
          <StatCard
            title="Executions Today"
            value={data?.executionsToday || 0}
            trend={+5}
            icon="play"
            color={colors.success}
          />
          <StatCard
            title="Success Rate"
            value={`${(data?.successRate || 0) * 100}%`}
            trend={+2.5}
            icon="check"
            color={colors.info}
          />
          <StatCard
            title="Avg. Duration"
            value={`${data?.avgDuration || 0}s`}
            trend={-10}
            icon="timer"
            color={colors.warning}
          />
        </View>

        {/* Quick Actions */}
        <QuickActions
          onCreateWorkflow={() => navigation.navigate('WorkflowEditor')}
          onImportWorkflow={() => navigation.navigate('Import')}
          onViewTemplates={() => navigation.navigate('Templates')}
          onSchedule={() => navigation.navigate('Schedule')}
        />

        {/* Execution Chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Weekly Executions</Text>
          <LineChart
            data={executionData}
            width={screenWidth - 32}
            height={200}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>

        {/* Recent Workflows */}
        <RecentWorkflows
          workflows={data?.recentWorkflows || []}
          onWorkflowPress={(workflow) =>
            navigation.navigate('WorkflowEditor', { workflowId: workflow.id })
          }
        />

        {/* Performance Overview */}
        <View style={styles.performanceContainer}>
          <Text style={styles.sectionTitle}>Performance Overview</Text>
          <View style={styles.performanceStats}>
            {performanceData.labels.map((label, index) => (
              <View key={label} style={styles.performanceStat}>
                <View
                  style={[
                    styles.performanceIndicator,
                    {
                      backgroundColor:
                        index === 0
                          ? colors.success
                          : index === 1
                          ? colors.danger
                          : colors.warning,
                    },
                  ]}
                />
                <Text style={styles.performanceLabel}>{label}</Text>
                <Text style={styles.performanceValue}>
                  {Math.round(performanceData.data[index] * 100)}%
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* System Status */}
        <View style={styles.statusContainer}>
          <Text style={styles.sectionTitle}>System Status</Text>
          <View style={styles.statusItems}>
            <StatusItem
              label="API"
              status="operational"
              latency={42}
            />
            <StatusItem
              label="Workers"
              status="operational"
              count={8}
            />
            <StatusItem
              label="Database"
              status="operational"
              latency={15}
            />
            <StatusItem
              label="Queue"
              status="operational"
              count={23}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusItem({ label, status, latency, count }) {
  const statusColor =
    status === 'operational'
      ? colors.success
      : status === 'degraded'
      ? colors.warning
      : colors.danger;

  return (
    <View style={styles.statusItem}>
      <View style={styles.statusHeader}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={styles.statusLabel}>{label}</Text>
      </View>
      <Text style={styles.statusValue}>
        {latency ? `${latency}ms` : `${count} active`}
      </Text>
    </View>
  );
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 24,
    paddingTop: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  greeting: {
    fontSize: 16,
    color: colors.white,
    opacity: 0.8,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.white,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.8,
    marginTop: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    marginTop: -20,
  },
  chartContainer: {
    margin: 16,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  performanceContainer: {
    margin: 16,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  performanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  performanceStat: {
    alignItems: 'center',
  },
  performanceIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  performanceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  performanceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  statusContainer: {
    margin: 16,
    marginBottom: 32,
  },
  statusItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statusItem: {
    width: '50%',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
});