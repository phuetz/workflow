import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { NodePreview } from '../components/NodePreview';
import { Workflow, WorkflowNode } from '../types';
import WorkflowService from '../services/WorkflowService';

const { width } = Dimensions.get('window');

interface WorkflowEditorScreenProps {
  route: {
    params?: {
      workflowId?: string;
    };
  };
  navigation: {
    goBack: () => void;
  };
}

export const WorkflowEditorScreen: React.FC<WorkflowEditorScreenProps> = ({
  route,
  navigation,
}) => {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const workflowId = route.params?.workflowId;

  useEffect(() => {
    if (workflowId) {
      loadWorkflow();
    } else {
      // New workflow
      setWorkflow({
        id: 'new',
        name: 'New Workflow',
        description: '',
        active: false,
        nodes: [],
        edges: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        executionCount: 0,
      });
    }
  }, [workflowId]);

  const loadWorkflow = async () => {
    if (!workflowId) return;

    try {
      setLoading(true);
      const data = await WorkflowService.getWorkflow(workflowId);
      setWorkflow(data);
      setName(data.name);
      setDescription(data.description || '');
    } catch (error) {
      console.error('Error loading workflow:', error);
      Alert.alert('Error', 'Failed to load workflow');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!workflow) return;

    if (!name.trim()) {
      Alert.alert('Validation Error', 'Workflow name is required');
      return;
    }

    try {
      setLoading(true);

      const workflowData: Partial<Workflow> = {
        ...workflow,
        name: name.trim(),
        description: description.trim(),
      };

      if (workflowId && workflowId !== 'new') {
        await WorkflowService.updateWorkflow(workflowId, workflowData);
        Alert.alert('Success', 'Workflow updated successfully');
      } else {
        await WorkflowService.createWorkflow(workflowData);
        Alert.alert('Success', 'Workflow created successfully');
      }

      navigation.goBack();
    } catch (error) {
      console.error('Error saving workflow:', error);
      Alert.alert('Error', 'Failed to save workflow');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNode = () => {
    Alert.alert(
      'Add Node',
      'Node editing is limited on mobile. Use the web app for full workflow editing.',
      [{ text: 'OK' }]
    );
  };

  if (!workflow) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workflow Details</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter workflow name"
              placeholderTextColor="#9ca3af"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter workflow description"
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Nodes Preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nodes ({workflow.nodes.length})</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddNode}>
              <Text style={styles.addButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {workflow.nodes.length === 0 ? (
            <View style={styles.emptyNodes}>
              <Text style={styles.emptyNodesText}>No nodes added yet</Text>
              <Text style={styles.emptyNodesSubtext}>
                Add nodes to build your workflow
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.nodesContainer}>
                {workflow.nodes.map((node) => (
                  <TouchableOpacity
                    key={node.id}
                    onPress={() =>
                      Alert.alert(
                        'Node',
                        'Full node editing is available on the web app',
                        [{ text: 'OK' }]
                      )
                    }
                  >
                    <NodePreview node={node} size="medium" />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            For full workflow editing capabilities including visual node connections and
            advanced configurations, please use the web application.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.disabledButton]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : 'Save Workflow'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginBottom: 12,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  addButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyNodes: {
    padding: 40,
    alignItems: 'center',
  },
  emptyNodesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  emptyNodesSubtext: {
    fontSize: 14,
    color: '#9ca3af',
  },
  nodesContainer: {
    flexDirection: 'row',
    padding: 8,
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    margin: 20,
    flexDirection: 'row',
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    padding: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#6366f1',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
});
