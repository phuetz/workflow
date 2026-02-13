import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAppStore } from '../store/appStore';
import { ExecutionCard } from '../components/ExecutionCard';
import { EmptyState } from '../components/EmptyState';
import { LoadingSpinner } from '../components/LoadingSpinner';
import WorkflowService from '../services/WorkflowService';
import { Execution } from '../types';

export const ExecutionScreen: React.FC = () => {
  const { executions, setExecutions, isOnline } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'success' | 'error' | 'running'>('all');

  useEffect(() => {
    loadExecutions();
  }, []);

  const loadExecutions = async () => {
    try {
      const data = await WorkflowService.getExecutions();
      setExecutions(data);
    } catch (error) {
      console.error('Error loading executions:', error);
      Alert.alert('Error', 'Failed to load executions');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadExecutions();
    setRefreshing(false);
  };

  const handleExecutionPress = (execution: Execution) => {
    // Navigate to execution details
    console.log('View execution:', execution.id);
  };

  const handleRetryExecution = async (execution: Execution) => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot retry execution while offline');
      return;
    }

    Alert.alert(
      'Retry Execution',
      `Retry execution for "${execution.workflowName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Retry',
          onPress: async () => {
            try {
              const newExecution = await WorkflowService.retryExecution(execution.id);
              Alert.alert('Success', `Execution retry started: ${newExecution.id}`);
              await loadExecutions();
            } catch (error) {
              console.error('Error retrying execution:', error);
              Alert.alert('Error', 'Failed to retry execution');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const filteredExecutions = executions.filter((execution) => {
    if (filter === 'all') return true;
    return execution.status === filter;
  });

  if (loading) {
    return <LoadingSpinner message="Loading executions..." />;
  }

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
            All
          </Text>
          <Text style={[styles.filterTabCount, filter === 'all' && styles.filterTabCountActive]}>
            {executions.length}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'success' && styles.filterTabActive]}
          onPress={() => setFilter('success')}
        >
          <Text
            style={[styles.filterTabText, filter === 'success' && styles.filterTabTextActive]}
          >
            Success
          </Text>
          <Text
            style={[styles.filterTabCount, filter === 'success' && styles.filterTabCountActive]}
          >
            {executions.filter((e) => e.status === 'success').length}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'error' && styles.filterTabActive]}
          onPress={() => setFilter('error')}
        >
          <Text style={[styles.filterTabText, filter === 'error' && styles.filterTabTextActive]}>
            Failed
          </Text>
          <Text
            style={[styles.filterTabCount, filter === 'error' && styles.filterTabCountActive]}
          >
            {executions.filter((e) => e.status === 'error').length}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'running' && styles.filterTabActive]}
          onPress={() => setFilter('running')}
        >
          <Text
            style={[styles.filterTabText, filter === 'running' && styles.filterTabTextActive]}
          >
            Running
          </Text>
          <Text
            style={[styles.filterTabCount, filter === 'running' && styles.filterTabCountActive]}
          >
            {executions.filter((e) => e.status === 'running').length}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Execution List */}
      {filteredExecutions.length === 0 ? (
        <EmptyState
          icon="📊"
          title="No Executions"
          message={
            filter === 'all'
              ? 'No workflow executions yet'
              : `No ${filter} executions found`
          }
        />
      ) : (
        <FlatList
          data={filteredExecutions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View>
              <ExecutionCard
                execution={item}
                onPress={() => handleExecutionPress(item)}
              />
              {item.status === 'error' && (
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => handleRetryExecution(item)}
                >
                  <Text style={styles.retryButtonText}>🔄 Retry</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabActive: {
    borderBottomColor: '#6366f1',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  filterTabTextActive: {
    color: '#6366f1',
  },
  filterTabCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#9ca3af',
  },
  filterTabCountActive: {
    color: '#6366f1',
  },
  listContent: {
    padding: 16,
  },
  retryButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    padding: 8,
    marginHorizontal: 16,
    marginTop: -8,
    marginBottom: 12,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
