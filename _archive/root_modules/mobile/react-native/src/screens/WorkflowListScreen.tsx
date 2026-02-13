/**
 * Workflow List Screen
 * Display and manage all workflows with search and filters
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { SwipeListView } from 'react-native-swipe-list-view';
import * as Haptics from 'expo-haptics';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { colors } from '../theme/colors';
import WorkflowCard from '../components/WorkflowCard';
import FilterModal from '../components/FilterModal';
import EmptyState from '../components/EmptyState';
import { useWorkflows } from '../hooks/useWorkflows';
import { Workflow } from '../types/workflow';

export default function WorkflowListScreen() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    sortBy: 'updated',
  });
  const [refreshing, setRefreshing] = useState(false);
  
  const { workflows, refetch, deleteWorkflow, duplicateWorkflow } = useWorkflows();

  const filteredWorkflows = useMemo(() => {
    let filtered = workflows;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (workflow) =>
          workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          workflow.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter((workflow) => workflow.status === filters.status);
    }

    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter((workflow) => workflow.category === filters.category);
    }

    // Sort
    switch (filters.sortBy) {
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'created':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'updated':
      default:
        filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
    }

    return filtered;
  }, [workflows, searchQuery, filters]);

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  };

  const handleEdit = (workflow: Workflow) => {
    navigation.navigate('WorkflowEditor', { workflowId: workflow.id });
  };

  const handleDuplicate = async (workflow: Workflow) => {
    try {
      await duplicateWorkflow(workflow.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Error', 'Failed to duplicate workflow');
    }
  };

  const handleDelete = (workflow: Workflow) => {
    Alert.alert(
      'Delete Workflow',
      `Are you sure you want to delete "${workflow.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWorkflow(workflow.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch {
              Alert.alert('Error', 'Failed to delete workflow');
            }
          },
        },
      ]
    );
  };

  const renderWorkflow = ({ item }: { item: Workflow }) => (
    <Animated.View style={styles.cardContainer}>
      <WorkflowCard
        workflow={item}
        onPress={() => handleEdit(item)}
        onExecute={() => navigation.navigate('ExecutionViewer', { workflowId: item.id })}
      />
    </Animated.View>
  );

  const renderHiddenItem = ({ item }: { item: Workflow }) => (
    <View style={styles.rowBack}>
      <TouchableOpacity
        style={[styles.backRightBtn, styles.backRightBtnLeft]}
        onPress={() => handleDuplicate(item)}
      >
        <Icon name="content-copy" size={24} color={colors.white} />
        <Text style={styles.backTextWhite}>Duplicate</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.backRightBtn, styles.backRightBtnRight]}
        onPress={() => handleDelete(item)}
      >
        <Icon name="delete" size={24} color={colors.white} />
        <Text style={styles.backTextWhite}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search workflows..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textSecondary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterVisible(true)}
        >
          <Icon name="filter-list" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Workflow Stats */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {filteredWorkflows.length} workflow{filteredWorkflows.length !== 1 ? 's' : ''}
        </Text>
        <View style={styles.statsRight}>
          <View style={[styles.statDot, { backgroundColor: colors.success }]} />
          <Text style={styles.statCount}>
            {workflows.filter(w => w.status === 'active').length} active
          </Text>
          <View style={[styles.statDot, { backgroundColor: colors.warning }]} />
          <Text style={styles.statCount}>
            {workflows.filter(w => w.status === 'paused').length} paused
          </Text>
        </View>
      </View>

      {/* Workflows List */}
      {filteredWorkflows.length === 0 ? (
        <EmptyState
          icon="workflow"
          title="No workflows found"
          subtitle={searchQuery ? "Try adjusting your search" : "Create your first workflow"}
          action={{
            label: 'Create Workflow',
            onPress: () => navigation.navigate('WorkflowEditor'),
          }}
        />
      ) : (
        <SwipeListView
          data={filteredWorkflows}
          renderItem={renderWorkflow}
          renderHiddenItem={renderHiddenItem}
          keyExtractor={(item) => item.id}
          rightOpenValue={-150}
          disableRightSwipe
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          navigation.navigate('WorkflowEditor');
        }}
      >
        <Icon name="add" size={28} color={colors.white} />
      </TouchableOpacity>

      {/* Filter Modal */}
      <FilterModal
        visible={filterVisible}
        filters={filters}
        onClose={() => setFilterVisible(false)}
        onApply={(newFilters) => {
          setFilters(newFilters);
          setFilterVisible(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: colors.text,
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: colors.white,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  statsText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  statsRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 12,
    marginRight: 4,
  },
  statCount: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  listContent: {
    paddingBottom: 100,
  },
  cardContainer: {
    paddingHorizontal: 16,
  },
  separator: {
    height: 8,
  },
  rowBack: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingRight: 16,
  },
  backRightBtn: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    width: 75,
  },
  backRightBtnLeft: {
    backgroundColor: colors.info,
    right: 75,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  backRightBtnRight: {
    backgroundColor: colors.danger,
    right: 0,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  backTextWhite: {
    color: colors.white,
    fontSize: 12,
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});