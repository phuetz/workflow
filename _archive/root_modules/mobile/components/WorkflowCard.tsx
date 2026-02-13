import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Workflow } from '../types';
import { formatDistanceToNow } from 'date-fns';

interface WorkflowCardProps {
  workflow: Workflow;
  onPress: () => void;
  onToggle?: (active: boolean) => void;
  onDelete?: () => void;
  onExecute?: () => void;
}

export const WorkflowCard: React.FC<WorkflowCardProps> = ({
  workflow,
  onPress,
  onToggle,
  onExecute,
}) => {
  const lastExecuted = workflow.lastExecutedAt
    ? formatDistanceToNow(new Date(workflow.lastExecutedAt), { addSuffix: true })
    : 'Never';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {workflow.name}
          </Text>
          {workflow.tags && workflow.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {workflow.tags.slice(0, 2).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
              {workflow.tags.length > 2 && (
                <Text style={styles.moreTagsText}>+{workflow.tags.length - 2}</Text>
              )}
            </View>
          )}
        </View>
        {onToggle && (
          <Switch
            value={workflow.active}
            onValueChange={onToggle}
            trackColor={{ false: '#ccc', true: '#6366f1' }}
            thumbColor={workflow.active ? '#fff' : '#f4f3f4'}
          />
        )}
      </View>

      {workflow.description && (
        <Text style={styles.description} numberOfLines={2}>
          {workflow.description}
        </Text>
      )}

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Nodes</Text>
          <Text style={styles.statValue}>{workflow.nodes.length}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Executions</Text>
          <Text style={styles.statValue}>{workflow.executionCount || 0}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Last Run</Text>
          <Text style={styles.statValue} numberOfLines={1}>
            {lastExecuted}
          </Text>
        </View>
      </View>

      {onExecute && (
        <TouchableOpacity
          style={[styles.executeButton, !workflow.active && styles.disabledButton]}
          onPress={onExecute}
          disabled={!workflow.active}
        >
          <Text style={styles.executeButtonText}>Execute</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  tag: {
    backgroundColor: '#e0e7ff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 11,
    color: '#6366f1',
    fontWeight: '500',
  },
  moreTagsText: {
    fontSize: 11,
    color: '#6b7280',
    marginLeft: 4,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  executeButton: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#d1d5db',
  },
  executeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
