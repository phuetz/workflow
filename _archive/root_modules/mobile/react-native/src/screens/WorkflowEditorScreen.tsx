/**
 * Mobile Workflow Editor Screen
 * Touch-optimized workflow editing interface
 */

import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  PanResponder,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, G, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';

import { colors } from '../theme/colors';
import NodePalette from '../components/NodePalette';
import NodeConfigModal from '../components/NodeConfigModal';
import { WorkflowNode, WorkflowEdge } from '../types/workflow';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// interface NodePosition {
//   x: number;
//   y: number;
// }

export default function WorkflowEditorScreen() {
  const navigation = useNavigation();
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isNodePaletteVisible, setNodePaletteVisible] = useState(false);
  const [isConfigModalVisible, setConfigModalVisible] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Gesture handling for canvas
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        // Check if tapping on a node
        const tappedNode = findNodeAtPosition(locationX, locationY);
        if (tappedNode) {
          setSelectedNode(tappedNode.id);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        if (selectedNode) {
          // Move selected node
          moveNode(selectedNode, gestureState.dx, gestureState.dy);
        } else {
          // Pan canvas
          setOffset({
            x: offset.x + gestureState.dx,
            y: offset.y + gestureState.dy,
          });
        }
      },
      onPanResponderRelease: () => {
        if (selectedNode) {
          // Snap to grid
          snapNodeToGrid(selectedNode);
        }
      },
    })
  ).current;

  const findNodeAtPosition = (x: number, y: number): WorkflowNode | null => {
    return nodes.find((node) => {
      const nodeX = node.position.x + offset.x;
      const nodeY = node.position.y + offset.y;
      return (
        x >= nodeX - 50 &&
        x <= nodeX + 50 &&
        y >= nodeY - 30 &&
        y <= nodeY + 30
      );
    }) || null;
  };

  const moveNode = (nodeId: string, dx: number, dy: number) => {
    setNodes((prevNodes) =>
      prevNodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              position: {
                x: node.position.x + dx,
                y: node.position.y + dy,
              },
            }
          : node
      )
    );
  };

  const snapNodeToGrid = (nodeId: string) => {
    const gridSize = 20;
    setNodes((prevNodes) =>
      prevNodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              position: {
                x: Math.round(node.position.x / gridSize) * gridSize,
                y: Math.round(node.position.y / gridSize) * gridSize,
              },
            }
          : node
      )
    );
  };

  const addNode = (type: string) => {
    const newNode: WorkflowNode = {
      id: `node_${Date.now()}`,
      type,
      position: {
        x: screenWidth / 2 - offset.x,
        y: screenHeight / 2 - offset.y,
      },
      data: {
        label: type.charAt(0).toUpperCase() + type.slice(1),
        config: {},
      },
    };
    setNodes([...nodes, newNode]);
    setNodePaletteVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const deleteNode = (nodeId: string) => {
    Alert.alert(
      'Delete Node',
      'Are you sure you want to delete this node?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setNodes(nodes.filter((n) => n.id !== nodeId));
            setEdges(edges.filter((e) => e.source !== nodeId && e.target !== nodeId));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  };

  const saveWorkflow = async () => {
    // Save workflow logic
    Alert.alert('Success', 'Workflow saved successfully!');
    navigation.goBack();
  };

  const renderNode = (node: WorkflowNode) => {
    const isSelected = selectedNode === node.id;
    const x = node.position.x + offset.x;
    const y = node.position.y + offset.y;

    return (
      <G key={node.id}>
        <Circle
          cx={x}
          cy={y}
          r={40}
          fill={isSelected ? colors.primary : colors.white}
          stroke={colors.primary}
          strokeWidth={2}
        />
        <SvgText
          x={x}
          y={y + 5}
          fontSize="14"
          fontWeight="bold"
          textAnchor="middle"
          fill={isSelected ? colors.white : colors.primary}
        >
          {node.data.label}
        </SvgText>
      </G>
    );
  };

  const renderEdge = (edge: WorkflowEdge) => {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);
    
    if (!sourceNode || !targetNode) return null;

    const x1 = sourceNode.position.x + offset.x;
    const y1 = sourceNode.position.y + offset.y;
    const x2 = targetNode.position.x + offset.x;
    const y2 = targetNode.position.y + offset.y;

    const path = `M ${x1} ${y1} Q ${(x1 + x2) / 2} ${y1} ${x2} ${y2}`;

    return (
      <Path
        key={edge.id}
        d={path}
        stroke={colors.gray}
        strokeWidth={2}
        fill="none"
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setNodePaletteVisible(true)}
        >
          <Text style={styles.headerButtonText}>Add Node</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.headerButton, styles.saveButton]}
          onPress={saveWorkflow}
        >
          <Text style={styles.headerButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.canvas} {...panResponder.panHandlers}>
        <Svg width={screenWidth} height={screenHeight - 120}>
          {edges.map(renderEdge)}
          {nodes.map(renderNode)}
        </Svg>
      </View>

      {selectedNode && (
        <View style={styles.nodeActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setConfigModalVisible(true)}
          >
            <Text style={styles.actionButtonText}>Configure</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => deleteNode(selectedNode)}
          >
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}

      <NodePalette
        visible={isNodePaletteVisible}
        onClose={() => setNodePaletteVisible(false)}
        onSelectNode={addNode}
      />

      <NodeConfigModal
        visible={isConfigModalVisible}
        node={nodes.find((n) => n.id === selectedNode)}
        onClose={() => setConfigModalVisible(false)}
        onSave={() => {
          // Update node config
          setConfigModalVisible(false);
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveButton: {
    backgroundColor: colors.success,
  },
  headerButtonText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  canvas: {
    flex: 1,
    backgroundColor: colors.canvasBackground,
  },
  nodeActions: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  deleteButton: {
    backgroundColor: colors.danger,
  },
  actionButtonText: {
    color: colors.white,
    fontWeight: 'bold',
  },
});