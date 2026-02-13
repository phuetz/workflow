import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WorkflowNode } from '../types';

interface NodePreviewProps {
  node: WorkflowNode;
  size?: 'small' | 'medium' | 'large';
}

export const NodePreview: React.FC<NodePreviewProps> = ({ node, size = 'medium' }) => {
  const getNodeColor = (type: string): string => {
    const colorMap: Record<string, string> = {
      trigger: '#10b981',
      action: '#6366f1',
      transform: '#f59e0b',
      condition: '#8b5cf6',
      loop: '#ec4899',
      database: '#3b82f6',
      ai: '#14b8a6',
      webhook: '#84cc16',
      email: '#f43f5e',
      http: '#06b6d4',
    };

    for (const [key, color] of Object.entries(colorMap)) {
      if (type.toLowerCase().includes(key)) {
        return color;
      }
    }

    return '#6b7280';
  };

  const getNodeIcon = (type: string): string => {
    const iconMap: Record<string, string> = {
      trigger: '⚡',
      action: '⚙️',
      transform: '🔄',
      condition: '❓',
      loop: '🔁',
      database: '💾',
      ai: '🤖',
      webhook: '🔗',
      email: '📧',
      http: '🌐',
      slack: '💬',
      schedule: '⏰',
      code: '💻',
      filter: '🔍',
      merge: '🔀',
      split: '✂️',
    };

    for (const [key, icon] of Object.entries(iconMap)) {
      if (type.toLowerCase().includes(key)) {
        return icon;
      }
    }

    return '📦';
  };

  const sizeStyles = {
    small: {
      container: { width: 60, height: 60 },
      icon: { fontSize: 20 },
      label: { fontSize: 10, marginTop: 2 },
    },
    medium: {
      container: { width: 80, height: 80 },
      icon: { fontSize: 28 },
      label: { fontSize: 11, marginTop: 4 },
    },
    large: {
      container: { width: 100, height: 100 },
      icon: { fontSize: 36 },
      label: { fontSize: 12, marginTop: 6 },
    },
  };

  const currentSize = sizeStyles[size];
  const backgroundColor = getNodeColor(node.type);
  const icon = getNodeIcon(node.type);
  const label = (node.data.label as string) || node.type;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.nodeContainer,
          currentSize.container,
          { backgroundColor },
        ]}
      >
        <Text style={[styles.icon, currentSize.icon]}>{icon}</Text>
      </View>
      <Text
        style={[styles.label, currentSize.label]}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    margin: 8,
  },
  nodeContainer: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  icon: {
    color: '#fff',
  },
  label: {
    textAlign: 'center',
    color: '#4b5563',
    fontWeight: '500',
    maxWidth: 100,
  },
});
