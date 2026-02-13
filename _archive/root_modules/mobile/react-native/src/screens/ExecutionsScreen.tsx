/**
 * Executions Screen
 * Monitor and manage workflow executions
 */

import React, { useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';

import { colors } from '../theme/colors';
import ExecutionCard from '../components/ExecutionCard';
import FilterChips from '../components/FilterChips';
import EmptyState from '../components/EmptyState';
import { useExecutions } from '../hooks/useExecutions';
import { Execution } from '../types/execution';

export default function ExecutionsScreen() {
  const navigation = useNavigation();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [isRealtime, setIsRealtime] = useState(true);
  
  const { executions, loading, refetch, stopExecution } = useExecutions({
    status: selectedStatus,
    realtime: isRealtime,
  });

  const statuses = [
    { id: 'all', label: 'All', count: executions.length },
    { id: 'running', label: 'Running', count: executions.filter(e => e.status === 'running').length },
    { id: 'success', label: 'Success', count: executions.filter(e => e.status === 'success').length },
    { id: 'failed', label: 'Failed', count: executions.filter(e => e.status === 'failed').length },
  ];

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  };

  const handleExecutionPress = (execution: Execution) => {
    navigation.navigate('ExecutionDetail', { executionId: execution.id });
  };

  const handleStopExecution = async (execution: Execution) => {
    try {
      await stopExecution(execution.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error) {
      console.error('Failed to stop execution:', error);
    }
  };

  const renderExecution = ({ item, index }: { item: Execution; index: number }) => {
    const fadeAnim = new Animated.Value(0);
    const slideAnim = new Animated.Value(50);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();

    return (
      <Animated.View
        style={[
          styles.cardContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <ExecutionCard
          execution={item}
          onPress={() => handleExecutionPress(item)}
          onStop={item.status === 'running' ? () => handleStopExecution(item) : undefined}
        />
      </Animated.View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Status Filters */}
      <FilterChips
        filters={statuses}
        selected={selectedStatus}
        onSelect={setSelectedStatus}
      />

      {/* Realtime Toggle */}
      <View style={styles.realtimeContainer}>
        <Text style={styles.realtimeLabel}>Real-time updates</Text>
        <TouchableOpacity
          style={[styles.toggle, isRealtime && styles.toggleActive]}
          onPress={() => {
            setIsRealtime(!isRealtime);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Animated.View
            style={[
              styles.toggleThumb,
              {
                transform: [
                  {
                    translateX: isRealtime ? 20 : 0,
                  },
                ],
              },
            ]}
          />
        </TouchableOpacity>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Icon name="speed" size={24} color={colors.primary} />
          <View style={styles.statContent}>
            <Text style={styles.statValue}>
              {executions.filter(e => e.status === 'running').length}
            </Text>
            <Text style={styles.statLabel}>Running</Text>
          </View>
        </View>
        <View style={styles.statCard}>
          <Icon name="schedule" size={24} color={colors.warning} />
          <View style={styles.statContent}>
            <Text style={styles.statValue}>
              {Math.round(
                executions.reduce((acc, e) => acc + (e.duration || 0), 0) /
                executions.length || 0
              )}s
            </Text>
            <Text style={styles.statLabel}>Avg. Duration</Text>
          </View>
        </View>
        <View style={styles.statCard}>
          <Icon name="check-circle" size={24} color={colors.success} />
          <View style={styles.statContent}>
            <Text style={styles.statValue}>
              {Math.round(
                (executions.filter(e => e.status === 'success').length /
                  executions.length) * 100 || 0
              )}%
            </Text>
            <Text style={styles.statLabel}>Success Rate</Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (loading && executions.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={executions}
        renderItem={renderExecution}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyState
            icon="play-circle"
            title="No executions yet"
            subtitle={
              selectedStatus === 'all'
                ? "Your workflow executions will appear here"
                : `No ${selectedStatus} executions`
            }
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: colors.background,
    paddingBottom: 16,
  },
  realtimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  realtimeLabel: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  toggle: {
    width: 50,
    height: 30,
    backgroundColor: colors.gray,
    borderRadius: 15,
    padding: 5,
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    backgroundColor: colors.white,
    borderRadius: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statContent: {
    marginLeft: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardContainer: {
    paddingHorizontal: 16,
  },
  separator: {
    height: 8,
  },
  listContent: {
    paddingBottom: 20,
  },
});