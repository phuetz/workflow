/**
 * Workflow Importer
 * Handles workflow import operations
 */

import type {
  WorkflowExport,
  ImportOptions,
  ImportResult,
  ImportSource,
  ImportMappings,
  ExportedCredential,
  EncryptedPayload
} from './types';
import { useWorkflowStore } from '../../store/workflowStore';
import { ValidationService, validationService } from './ValidationService';
import { BaseService } from '../BaseService';

export class WorkflowImporter extends BaseService {
  private validator: ValidationService;

  constructor() {
    super('WorkflowImporter');
    this.validator = validationService;
  }

  /**
   * Imports a workflow from a source
   */
  async importWorkflow(
    source: ImportSource,
    options: ImportOptions = { format: 'json' },
    getConverter: (from: string, to: string) => { convert: (data: unknown) => Promise<unknown> } | null,
    detectFormat: (data: unknown) => string | null
  ): Promise<ImportResult> {
    this.logger.info('Importing workflow', { source: source.type, options });

    const result: ImportResult = {
      success: false,
      errors: [],
      warnings: [],
      statistics: {
        totalNodes: 0,
        importedNodes: 0,
        totalEdges: 0,
        importedEdges: 0,
        totalCredentials: 0,
        importedCredentials: 0,
        executionTime: Date.now()
      },
      mappingsApplied: {}
    };

    try {
      // Parse source data
      const data = await this.parseImportSource(source);

      // Detect format if not specified
      const format = options.format || detectFormat(data) || 'json';

      // Convert to internal format if needed
      let workflowData: WorkflowExport;
      if (format !== 'json') {
        const converter = getConverter(format, 'json');
        if (!converter) {
          result.errors.push({
            type: 'invalid_format',
            message: `No converter available for format: ${format}`
          });
          return result;
        }
        workflowData = await converter.convert(data) as WorkflowExport;
      } else {
        workflowData = data as WorkflowExport;
      }

      // Validate import
      if (options.validation) {
        const validationResult = await this.validator.validateImportData(workflowData, options.validation);
        result.errors.push(...validationResult.errors);
        result.warnings.push(...validationResult.warnings);

        if (validationResult.errors.length > 0 && options.validation.strictMode) {
          return result;
        }
      }

      // Apply mappings
      if (options.mappings) {
        workflowData = await this.applyImportMappings(workflowData, options.mappings);
        result.mappingsApplied = options.mappings;
      }

      // Dry run mode
      if (options.dryRun) {
        result.success = true;
        result.statistics.totalNodes = workflowData.nodes.length;
        result.statistics.totalEdges = workflowData.edges.length;
        result.statistics.totalCredentials = workflowData.credentials?.length || 0;
        return result;
      }

      // Import workflow
      const importedWorkflow = {
        id: options.overwriteExisting ? workflowData.id : this.generateId(),
        name: workflowData.name,
        description: workflowData.description || '',
        nodes: workflowData.nodes,
        edges: workflowData.edges,
        version: workflowData.version || '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        settings: {
          environment: 'default',
          variables: {}
        }
      };

      // Import nodes
      result.statistics.totalNodes = workflowData.nodes.length;
      for (const node of workflowData.nodes) {
        try {
          if (!this.validator.isNodeTypeAvailable(node.type)) {
            result.warnings.push({
              type: 'missing_optional_field',
              message: `Node type ${node.type} not available`,
              nodeId: node.id,
              suggestion: 'Install the required integration'
            });
          }
          result.statistics.importedNodes++;
        } catch (error) {
          result.errors.push({
            type: 'missing_node_type',
            message: `Failed to import node ${node.id}`,
            nodeId: node.id,
            details: error
          });
        }
      }

      // Import edges
      result.statistics.totalEdges = workflowData.edges.length;
      result.statistics.importedEdges = workflowData.edges.length;

      // Import credentials if requested
      if (options.importCredentials && workflowData.credentials) {
        result.statistics.totalCredentials = workflowData.credentials.length;
        for (const cred of workflowData.credentials) {
          try {
            await this.importCredential(cred);
            result.statistics.importedCredentials++;
          } catch (error) {
            result.warnings.push({
              type: 'credential_not_found',
              message: `Could not import credential ${cred.name}`,
              suggestion: 'Configure credentials manually'
            });
          }
        }
      }

      // Save workflow
      const newWorkflow = importedWorkflow;
      useWorkflowStore.setState((state) => ({
        workflows: {
          ...state.workflows,
          [newWorkflow.id]: newWorkflow
        }
      }));
      result.success = true;
      result.workflowId = newWorkflow.id;

      result.statistics.executionTime = Date.now() - result.statistics.executionTime;
      return result;
    } catch (error) {
      result.errors.push({
        type: 'invalid_format',
        message: 'Import failed',
        details: error
      });
      return result;
    }
  }

  /**
   * Parses the import source and returns the data
   */
  async parseImportSource(source: ImportSource): Promise<unknown> {
    switch (source.type) {
      case 'file':
        return this.readFile(source.data as File);
      case 'url':
        return this.fetchUrl(source.data as URL);
      case 'text':
        return source.data;
      case 'clipboard':
        return navigator.clipboard.readText();
      default:
        throw new Error(`Unknown import source type: ${source.type}`);
    }
  }

  /**
   * Reads a file and returns its content
   */
  private async readFile(file: File): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          resolve(JSON.parse(text));
        } catch {
          resolve(e.target?.result);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  /**
   * Fetches data from a URL
   */
  private async fetchUrl(url: URL): Promise<unknown> {
    const response = await fetch(url.toString());
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  /**
   * Applies import mappings to workflow data
   */
  private async applyImportMappings(
    data: WorkflowExport,
    mappings: ImportMappings
  ): Promise<WorkflowExport> {
    const mapped = { ...data };

    // Apply node type mappings
    if (mappings.nodeTypes) {
      mapped.nodes = mapped.nodes.map(node => {
        if (mappings.nodeTypes![node.type]) {
          return {
            ...node,
            type: mappings.nodeTypes![node.type]
          };
        }
        return node;
      });
    }

    return mapped;
  }

  /**
   * Imports a credential placeholder into the store
   */
  async importCredential(credential: ExportedCredential): Promise<void> {
    this.logger.info('Importing credential', { credentialType: credential.type, name: credential.name });

    try {
      const store = useWorkflowStore.getState();
      const updateCredentials = (store as unknown as { updateCredentials?: (service: string, credentials: Record<string, unknown>) => void }).updateCredentials;

      if (!updateCredentials) {
        throw new Error('Credential store not available');
      }

      if (!credential.type || !credential.name) {
        throw new Error('Invalid credential: missing type or name');
      }

      // Create placeholder that needs configuration
      const credentialData: Record<string, unknown> = {
        _imported: true,
        _importedAt: new Date().toISOString(),
        _originalId: credential.id,
        _originalName: credential.name,
        _needsConfiguration: true
      };

      for (const field of credential.requiredFields) {
        credentialData[field] = '';
      }

      updateCredentials(credential.type, credentialData);

      this.logger.info('Credential imported successfully', {
        credentialType: credential.type,
        name: credential.name,
        requiresConfiguration: true
      });
    } catch (error) {
      this.logger.error('Failed to import credential', {
        credentialType: credential.type,
        name: credential.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Imports credentials with actual values (for secure use only)
   */
  async importCredentialWithValues(
    credential: ExportedCredential,
    encryptedValues: EncryptedPayload,
    decryptionKey: string,
    decryptData: (payload: EncryptedPayload, key: string) => Promise<unknown>
  ): Promise<void> {
    try {
      const decryptedValues = await decryptData(encryptedValues, decryptionKey) as Record<string, unknown>;

      if (typeof decryptedValues !== 'object' || decryptedValues === null) {
        throw new Error('Invalid decrypted credential data');
      }

      const store = useWorkflowStore.getState();
      const updateCredentials = (store as unknown as { updateCredentials?: (service: string, credentials: Record<string, unknown>) => void }).updateCredentials;

      if (!updateCredentials) {
        throw new Error('Credential store not available');
      }

      const credentialData: Record<string, unknown> = {
        ...decryptedValues,
        _imported: true,
        _importedAt: new Date().toISOString(),
        _originalId: credential.id,
        _originalName: credential.name,
        _needsConfiguration: false
      };

      updateCredentials(credential.type, credentialData);

      this.logger.info('Credential with values imported successfully', {
        credentialType: credential.type,
        name: credential.name
      });
    } catch (error) {
      this.logger.error('Failed to import credential with values', {
        credentialType: credential.type,
        name: credential.name,
        error: error instanceof Error ? error.message : 'Decryption failed'
      });
      throw error;
    }
  }

  /**
   * Generates a unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}

export const workflowImporter = new WorkflowImporter();
