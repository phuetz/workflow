import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Execution } from '../types';
import { formatDistanceToNow, differenceInSeconds } from 'date-fns';

interface ExecutionCardProps {
  execution: Execution;
  onPress: () => void;
}

export const ExecutionCard: React.FC<ExecutionCardProps> = ({ execution, onPress }) => {
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'success':
        return '#10b981';
      case 'error':
        return '#ef4444';
      case 'running':
        return '#3b82f6';
      case 'waiting':
        return '#f59e0b';
      case 'queued':
        return '#6b7280';
      default:
        return '#9ca3af';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'running':
        return '⟳';
      case 'waiting':
        return '⏸';
      case 'queued':
        return '⋯';
      default:
        return '•';
    }
  };

  const formatDuration = (ms?: number): string => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const getDuration = (): number | undefined => {
    if (execution.duration) return execution.duration;
    if (execution.startedAt && execution.finishedAt) {
      return (
        differenceInSeconds(new Date(execution.finishedAt), new Date(execution.startedAt)) * 1000
      );
    }
    if (execution.startedAt && execution.status === 'running') {
      return differenceInSeconds(new Date(), new Date(execution.startedAt)) * 1000;
    }
    return undefined;
  };

  const statusColor = getStatusColor(execution.status);
  const statusIcon = getStatusIcon(execution.status);
  const duration = getDuration();
  const startedAt = formatDistanceToNow(new Date(execution.startedAt), { addSuffix: true });

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusIcon}>{statusIcon}</Text>
          <Text style={styles.statusText}>{execution.status.toUpperCase()}</Text>
        </View>
        <Text style={styles.time}>{startedAt}</Text>
      </View>

      <Text style={styles.workflowName} numberOfLines={1}>
        {execution.workflowName}
      </Text>

      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Duration</Text>
          <Text style={styles.detailValue}>{formatDuration(duration)}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Nodes</Text>
          <Text style={styles.detailValue}>
            {Object.keys(execution.nodeResults || {}).length}
          </Text>
        </View>
        {execution.triggeredBy && (
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Triggered by</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {execution.triggeredBy}
            </Text>
          </View>
        )}
      </View>

      {execution.error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText} numberOfLines={2}>
            {execution.error}
          </Text>
        </View>
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
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusIcon: {
    color: '#fff',
    fontSize: 12,
    marginRight: 4,
    fontWeight: 'bold',
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  time: {
    fontSize: 12,
    color: '#6b7280',
  },
  workflowName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  errorContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
  errorText: {
    fontSize: 12,
    color: '#991b1b',
    lineHeight: 16,
  },
});
