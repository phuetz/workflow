import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAppStore } from '../store/appStore';
import { WorkflowCard } from '../components/WorkflowCard';
import { EmptyState } from '../components/EmptyState';
import { LoadingSpinner } from '../components/LoadingSpinner';
import WorkflowService from '../services/WorkflowService';
import SyncService from '../services/SyncService';
import { Workflow } from '../types';

export const WorkflowListScreen: React.FC = () => {
  const { workflows, setWorkflows, updateWorkflow, deleteWorkflow, isOnline } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      const data = await WorkflowService.getWorkflows();
      setWorkflows(data);
    } catch (error) {
      console.error('Error loading workflows:', error);
      Alert.alert('Error', 'Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWorkflows();
    setRefreshing(false);
  };

  const handleToggleWorkflow = async (workflow: Workflow) => {
    const newActive = !workflow.active;

    // Optimistic update
    updateWorkflow(workflow.id, { active: newActive });

    try {
      if (isOnline) {
        await WorkflowService.toggleWorkflow(workflow.id, newActive);
      } else {
        // Queue for sync when online
        await SyncService.queueSync({
          type: 'update',
          entity: 'workflow',
          data: { id: workflow.id, active: newActive },
        });
      }
    } catch (error) {
      console.error('Error toggling workflow:', error);
      // Revert on error
      updateWorkflow(workflow.id, { active: !newActive });
      Alert.alert('Error', 'Failed to toggle workflow');
    }
  };

  const handleExecuteWorkflow = async (workflow: Workflow) => {
    if (!workflow.active) {
      Alert.alert('Workflow Inactive', 'Please activate the workflow before executing');
      return;
    }

    try {
      Alert.alert(
        'Execute Workflow',
        `Execute "${workflow.name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Execute',
            onPress: async () => {
              if (isOnline) {
                const execution = await WorkflowService.executeWorkflow(workflow.id);
                Alert.alert('Success', `Workflow execution started: ${execution.id}`);
              } else {
                await SyncService.queueSync({
                  type: 'execute',
                  entity: 'workflow',
                  data: { id: workflow.id },
                });
                Alert.alert('Queued', 'Workflow execution queued for when you are online');
              }
            },
          },
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error('Error executing workflow:', error);
      Alert.alert('Error', 'Failed to execute workflow');
    }
  };

  const handleDeleteWorkflow = async (workflow: Workflow) => {
    Alert.alert(
      'Delete Workflow',
      `Are you sure you want to delete "${workflow.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Optimistic delete
            deleteWorkflow(workflow.id);

            try {
              if (isOnline) {
                await WorkflowService.deleteWorkflow(workflow.id);
              } else {
                await SyncService.queueSync({
                  type: 'delete',
                  entity: 'workflow',
                  data: { id: workflow.id },
                });
              }
            } catch (error) {
              console.error('Error deleting workflow:', error);
              // Could revert here, but deletion is typically final
              Alert.alert('Error', 'Failed to delete workflow');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const filteredWorkflows = workflows.filter((workflow) => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workflow.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = filterActive === null || workflow.active === filterActive;

    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return <LoadingSpinner message="Loading workflows..." />;
  }

  return (
    <View style={styles.container}>
      {/* Search and Filter */}
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search workflows..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9ca3af"
        />
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, filterActive === null && styles.filterButtonActive]}
            onPress={() => setFilterActive(null)}
          >
            <Text
              style={[styles.filterButtonText, filterActive === null && styles.filterButtonTextActive]}
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterActive === true && styles.filterButtonActive]}
            onPress={() => setFilterActive(true)}
          >
            <Text
              style={[styles.filterButtonText, filterActive === true && styles.filterButtonTextActive]}
            >
              Active
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterActive === false && styles.filterButtonActive]}
            onPress={() => setFilterActive(false)}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterActive === false && styles.filterButtonTextActive,
              ]}
            >
              Inactive
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Workflow List */}
      {filteredWorkflows.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No Workflows"
          message={
            searchQuery
              ? 'No workflows match your search'
              : 'Create your first workflow to get started'
          }
          actionLabel={searchQuery ? undefined : 'Create Workflow'}
          onAction={searchQuery ? undefined : () => console.log('Create workflow')}
        />
      ) : (
        <FlatList
          data={filteredWorkflows}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WorkflowCard
              workflow={item}
              onPress={() => console.log('View workflow:', item.id)}
              onToggle={() => handleToggleWorkflow(item)}
              onDelete={() => handleDeleteWorkflow(item)}
              onExecute={() => handleExecuteWorkflow(item)}
            />
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
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#6366f1',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
});
