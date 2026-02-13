/**
 * Node Palette Component
 * Modal for selecting node types to add to workflow
 */

import React, { useState } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';

import { colors } from '../theme/colors';
import { nodeCategories, NodeType } from '../data/nodeTypes';

interface NodePaletteProps {
  visible: boolean;
  onClose: () => void;
  onSelectNode: (type: string) => void;
}

export default function NodePalette({ visible, onClose, onSelectNode }: NodePaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredNodes = React.useMemo(() => {
    let nodes: NodeType[] = [];
    
    if (selectedCategory) {
      const category = nodeCategories.find(c => c.id === selectedCategory);
      nodes = category?.nodes || [];
    } else {
      nodes = nodeCategories.flatMap(c => c.nodes);
    }

    if (searchQuery) {
      nodes = nodes.filter(
        node =>
          node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          node.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return nodes;
  }, [searchQuery, selectedCategory]);

  const handleSelectNode = (type: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectNode(type);
    onClose();
    // Reset state
    setSearchQuery('');
    setSelectedCategory(null);
  };

  const renderCategory = (category: { id: string; name: string; icon: string; color: string; nodes: unknown[] }) => {
    const isSelected = selectedCategory === category.id;
    
    return (
      <TouchableOpacity
        key={category.id}
        style={[styles.categoryCard, isSelected && styles.categoryCardSelected]}
        onPress={() => {
          setSelectedCategory(isSelected ? null : category.id);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      >
        <Icon
          name={category.icon}
          size={24}
          color={isSelected ? colors.white : colors.primary}
        />
        <Text style={[styles.categoryName, isSelected && styles.categoryNameSelected]}>
          {category.name}
        </Text>
        <Text style={[styles.categoryCount, isSelected && styles.categoryCountSelected]}>
          {category.nodes.length}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderNode = (node: NodeType) => (
    <TouchableOpacity
      key={node.type}
      style={styles.nodeItem}
      onPress={() => handleSelectNode(node.type)}
    >
      <View style={[styles.nodeIcon, { backgroundColor: node.color }]}>
        <Icon name={node.icon || 'extension'} size={20} color={colors.white} />
      </View>
      <View style={styles.nodeContent}>
        <Text style={styles.nodeLabel}>{node.label}</Text>
        {node.description && (
          <Text style={styles.nodeDescription} numberOfLines={1}>
            {node.description}
          </Text>
        )}
      </View>
      <Icon name="add" size={20} color={colors.primary} />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <SafeAreaView style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Add Node</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search nodes..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Categories */}
          {!selectedCategory && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoriesContainer}
              contentContainerStyle={styles.categoriesContent}
            >
              {nodeCategories.map(renderCategory)}
            </ScrollView>
          )}

          {/* Nodes List */}
          <ScrollView style={styles.nodesList} showsVerticalScrollIndicator={false}>
            {selectedCategory && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setSelectedCategory(null)}
              >
                <Icon name="arrow-back" size={20} color={colors.primary} />
                <Text style={styles.backText}>All Categories</Text>
              </TouchableOpacity>
            )}
            
            {filteredNodes.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="search-off" size={48} color={colors.textLight} />
                <Text style={styles.emptyText}>No nodes found</Text>
              </View>
            ) : (
              filteredNodes.map(renderNode)
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backdrop,
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
    marginTop: 100,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
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
  categoriesContainer: {
    maxHeight: 120,
    marginBottom: 16,
  },
  categoriesContent: {
    paddingHorizontal: 20,
  },
  categoryCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 100,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryCardSelected: {
    backgroundColor: colors.primary,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 8,
  },
  categoryNameSelected: {
    color: colors.white,
  },
  categoryCount: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  categoryCountSelected: {
    color: colors.white,
    opacity: 0.8,
  },
  nodesList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backText: {
    fontSize: 16,
    color: colors.primary,
    marginLeft: 8,
    fontWeight: '500',
  },
  nodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  nodeIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nodeContent: {
    flex: 1,
    marginLeft: 12,
  },
  nodeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  nodeDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
});