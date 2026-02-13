import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Workflow } from '../types';

class ShareService {
  async shareWorkflow(workflow: Workflow): Promise<void> {
    try {
      const isAvailable = await Sharing.isAvailableAsync();

      if (!isAvailable) {
        throw new Error('Sharing is not available on this device');
      }

      // Create a JSON file with workflow data
      const workflowData = JSON.stringify(workflow, null, 2);
      const fileName = `${workflow.name.replace(/[^a-z0-9]/gi, '_')}.json`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, workflowData);

      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: `Share workflow: ${workflow.name}`,
        UTI: 'public.json',
      });

      // Clean up temp file
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    } catch (error) {
      console.error('Error sharing workflow:', error);
      throw error;
    }
  }

  async shareWorkflows(workflows: Workflow[]): Promise<void> {
    try {
      const isAvailable = await Sharing.isAvailableAsync();

      if (!isAvailable) {
        throw new Error('Sharing is not available on this device');
      }

      const workflowsData = JSON.stringify(workflows, null, 2);
      const fileName = `workflows_${Date.now()}.json`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, workflowsData);

      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: `Share ${workflows.length} workflows`,
        UTI: 'public.json',
      });

      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    } catch (error) {
      console.error('Error sharing workflows:', error);
      throw error;
    }
  }

  async shareText(text: string, title?: string): Promise<void> {
    try {
      const isAvailable = await Sharing.isAvailableAsync();

      if (!isAvailable) {
        throw new Error('Sharing is not available on this device');
      }

      const fileName = 'shared_text.txt';
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, text);

      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/plain',
        dialogTitle: title || 'Share',
        UTI: 'public.plain-text',
      });

      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    } catch (error) {
      console.error('Error sharing text:', error);
      throw error;
    }
  }

  async exportWorkflowAsImage(workflowId: string): Promise<void> {
    // This would require a canvas/screenshot implementation
    // For now, just a placeholder
    console.log('Export workflow as image:', workflowId);
    throw new Error('Not implemented yet');
  }
}

export default new ShareService();
