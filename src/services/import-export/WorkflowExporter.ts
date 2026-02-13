/**
 * Workflow Exporter
 * Handles workflow export operations including compression, encryption, and archiving
 */

import type {
  WorkflowExport,
  ExportFormat,
  ExportOptions,
  BulkExport,
  WorkflowNode,
  ExportedCustomNode,
  ArchiveFile,
  ArchiveResult,
  EncryptedPayload,
  CustomNodeDefinition
} from './types';
import { useWorkflowStore } from '../../store/workflowStore';
import { ValidationService, validationService } from './ValidationService';
import { BaseService } from '../BaseService';
import * as yaml from 'js-yaml';
import * as pako from 'pako';

// Browser-compatible hash function using Web Crypto API
async function sha256Hash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export class WorkflowExporter extends BaseService {
  private validator: ValidationService;
  private _crc32Table: Uint32Array | null = null;

  constructor() {
    super('WorkflowExporter');
    this.validator = validationService;
  }

  /**
   * Exports a single workflow
   */
  async exportWorkflow(
    workflowId: string,
    format: ExportFormat,
    options: ExportOptions = {},
    convertFormat: (data: unknown, format: ExportFormat) => Promise<unknown>
  ): Promise<WorkflowExport> {
    this.logger.info('Exporting workflow', { workflowId, format, options });

    try {
      const store = useWorkflowStore.getState();
      const workflows = Object.values(store.workflows);
      const workflow = workflows.find(w => w.id === workflowId);

      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      const exportData: WorkflowExport = {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description || '',
        version: '1.0.0',
        exportedAt: new Date(),
        exportedBy: 'system',
        format,
        metadata: {
          workflowId: workflow.id,
          executionId: '',
          startTime: new Date()
        },
        nodes: workflow.nodes || [],
        edges: workflow.edges || [],
        checksum: ''
      };

      // Include optional data
      if (options.includeCredentials) {
        const credentials = await this.exportCredentials(workflow.nodes);
        exportData.credentials = credentials as import('../../types/importExport').ExportedCredential[];
      }

      if (options.includeCustomNodes) {
        const customNodes = await this.exportCustomNodes(workflow.nodes);
        exportData.customNodes = customNodes as import('../../types/importExport').ExportedCustomNode[];
      }

      if (options.includeEnvironment) {
        const environment = await this.exportEnvironment(workflowId);
        exportData.environment = environment as import('../../types/importExport').EnvironmentConfig;
      }

      // Apply compression if requested
      let finalData: unknown = exportData;
      if (options.compression && options.compression !== 'none') {
        finalData = await this.compressData(exportData, options.compression);
      }

      // Apply encryption if requested
      if (options.encryption?.enabled) {
        finalData = await this.encryptData(finalData, options.encryption.publicKey);
      }

      // Generate checksum
      exportData.checksum = await this.generateChecksum(finalData);

      // Convert to requested format
      if (format !== 'json') {
        finalData = await convertFormat(finalData, format);
      }

      return exportData;
    } catch (error) {
      this.logger.error('Failed to export workflow', { workflowId, error });
      throw error;
    }
  }

  /**
   * Downloads an export to a file
   */
  async downloadExport(exportData: WorkflowExport, filename?: string): Promise<void> {
    const finalFilename = filename || `${exportData.name}.${exportData.format}`;

    let content: string;
    if (exportData.format === 'json') {
      content = JSON.stringify(exportData, null, 2);
    } else if (exportData.format === 'yaml') {
      content = yaml.dump(exportData);
    } else {
      content = JSON.stringify(exportData);
    }

    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = finalFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Generates a checksum for data
   */
  async generateChecksum(data: unknown): Promise<string> {
    const jsonString = JSON.stringify(data);
    return await sha256Hash(jsonString);
  }

  /**
   * Compresses data using gzip
   */
  async compressData(data: unknown, compression: 'gzip' | 'zip'): Promise<unknown> {
    const jsonString = JSON.stringify(data);
    const compressed = pako.gzip(jsonString);
    return compressed;
  }

  /**
   * Encrypts data using AES-256-GCM
   */
  async encryptData(data: unknown, key?: string): Promise<EncryptedPayload> {
    const jsonData = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(jsonData);

    let cryptoKey: CryptoKey;

    if (key && key.length === 64) {
      const keyBytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        keyBytes[i] = parseInt(key.substring(i * 2, i * 2 + 2), 16);
      }
      cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );
    } else {
      cryptoKey = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
    }

    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      cryptoKey,
      dataBuffer
    );

    const encryptedArray = new Uint8Array(encryptedBuffer);
    const ciphertext = encryptedArray.slice(0, -16);
    const authTag = encryptedArray.slice(-16);

    return {
      iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
      data: Array.from(ciphertext).map(b => b.toString(16).padStart(2, '0')).join(''),
      tag: Array.from(authTag).map(b => b.toString(16).padStart(2, '0')).join(''),
      algorithm: 'AES-256-GCM'
    };
  }

  /**
   * Decrypts data
   */
  async decryptData(encryptedPayload: EncryptedPayload, key: string): Promise<unknown> {
    const iv = new Uint8Array(encryptedPayload.iv.length / 2);
    for (let i = 0; i < iv.length; i++) {
      iv[i] = parseInt(encryptedPayload.iv.substring(i * 2, i * 2 + 2), 16);
    }

    const ciphertext = new Uint8Array(encryptedPayload.data.length / 2);
    for (let i = 0; i < ciphertext.length; i++) {
      ciphertext[i] = parseInt(encryptedPayload.data.substring(i * 2, i * 2 + 2), 16);
    }

    const authTag = new Uint8Array(encryptedPayload.tag.length / 2);
    for (let i = 0; i < authTag.length; i++) {
      authTag[i] = parseInt(encryptedPayload.tag.substring(i * 2, i * 2 + 2), 16);
    }

    const encryptedWithTag = new Uint8Array(ciphertext.length + authTag.length);
    encryptedWithTag.set(ciphertext);
    encryptedWithTag.set(authTag, ciphertext.length);

    const keyBytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      keyBytes[i] = parseInt(key.substring(i * 2, i * 2 + 2), 16);
    }

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      cryptoKey,
      encryptedWithTag
    );

    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decryptedBuffer);
    return JSON.parse(jsonString);
  }

  /**
   * Exports credentials from nodes
   */
  private async exportCredentials(nodes: WorkflowNode[]): Promise<unknown[]> {
    const credentialTypes = this.validator.extractCredentialTypes(nodes);

    return Array.from(credentialTypes).map(type => ({
      id: this.generateId(),
      name: type,
      type,
      requiredFields: this.validator.getCredentialFields(type),
      isEncrypted: true
    }));
  }

  /**
   * Exports custom node definitions
   */
  private async exportCustomNodes(nodes: WorkflowNode[]): Promise<ExportedCustomNode[]> {
    const customNodes: ExportedCustomNode[] = [];
    const processedTypes = new Set<string>();

    const store = useWorkflowStore.getState();
    const customNodeRegistry = (store as unknown as { customNodes?: Record<string, CustomNodeDefinition> }).customNodes || {};

    for (const node of nodes) {
      const isCustomNode =
        node.type.startsWith('custom-') ||
        node.type.startsWith('plugin-') ||
        (node.data as unknown as { isCustom?: boolean })?.isCustom === true;

      if (isCustomNode && !processedTypes.has(node.type)) {
        processedTypes.add(node.type);

        const customDef = customNodeRegistry[node.type];

        if (customDef) {
          customNodes.push({
            id: customDef.id || node.type,
            name: customDef.name || node.type,
            displayName: customDef.displayName || node.data.label || node.type,
            description: customDef.description || `Custom node: ${node.type}`,
            category: customDef.category || 'Custom',
            version: customDef.version || '1.0.0',
            executor: customDef.executor ? this.serializeFunction(customDef.executor) : '',
            documentation: customDef.documentation,
            icon: customDef.icon
          });
        } else {
          customNodes.push({
            id: node.type,
            name: node.type,
            displayName: node.data.label || node.type,
            description: `Custom node exported from workflow`,
            category: 'Custom',
            version: '1.0.0',
            executor: '',
            documentation: undefined,
            icon: (node.data as unknown as { icon?: string })?.icon
          });
        }
      }
    }

    return customNodes;
  }

  /**
   * Serializes a function to string
   */
  private serializeFunction(fn: unknown): string {
    if (typeof fn === 'function') {
      return fn.toString();
    }
    if (typeof fn === 'string') {
      return fn;
    }
    return '';
  }

  /**
   * Exports environment configuration
   */
  private async exportEnvironment(workflowId: string): Promise<unknown> {
    return {
      variables: [],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: navigator.language
    };
  }

  /**
   * Creates a ZIP archive from exports
   */
  async createArchive(exports: WorkflowExport[], options: ExportOptions): Promise<ArchiveResult> {
    const files: ArchiveFile[] = [];

    for (const exportData of exports) {
      const filename = `${this.sanitizeFilename(exportData.name)}.json`;
      const content = JSON.stringify(exportData, null, 2);
      files.push({ name: filename, content });
    }

    const manifest = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      workflowCount: exports.length,
      workflows: exports.map(e => ({
        id: e.id,
        name: e.name,
        filename: `${this.sanitizeFilename(e.name)}.json`
      }))
    };
    files.push({ name: 'manifest.json', content: JSON.stringify(manifest, null, 2) });

    const zipData = await this.createZipArchive(files, options.compression === 'gzip');

    const arrayBufferCopy = new ArrayBuffer(zipData.byteLength);
    new Uint8Array(arrayBufferCopy).set(zipData);
    const blob = new Blob([arrayBufferCopy], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);

    const arrayBuffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const checksum = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return {
      path: url,
      size: blob.size,
      checksum,
      fileCount: files.length
    };
  }

  /**
   * Creates a ZIP archive
   */
  private async createZipArchive(files: ArchiveFile[], useCompression: boolean): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const centralDirectory: Uint8Array[] = [];
    const localFiles: Uint8Array[] = [];
    let offset = 0;

    for (const file of files) {
      const fileNameBytes = encoder.encode(file.name);
      const contentBytes = typeof file.content === 'string'
        ? encoder.encode(file.content)
        : new Uint8Array(file.content);

      let compressedContent: Uint8Array;
      let compressionMethod: number;

      if (useCompression) {
        compressedContent = pako.deflateRaw(contentBytes);
        compressionMethod = 8;
      } else {
        compressedContent = contentBytes;
        compressionMethod = 0;
      }

      const crc = this.crc32(contentBytes);

      const localHeader = this.createLocalFileHeader(
        fileNameBytes,
        compressedContent.length,
        contentBytes.length,
        crc,
        compressionMethod
      );

      const centralEntry = this.createCentralDirectoryEntry(
        fileNameBytes,
        compressedContent.length,
        contentBytes.length,
        crc,
        compressionMethod,
        offset
      );

      localFiles.push(localHeader, compressedContent);
      centralDirectory.push(centralEntry);
      offset += localHeader.length + compressedContent.length;
    }

    const centralDirOffset = offset;
    const centralDirSize = centralDirectory.reduce((sum, entry) => sum + entry.length, 0);
    const endRecord = this.createEndOfCentralDirectory(
      files.length,
      centralDirSize,
      centralDirOffset
    );

    const totalSize = offset + centralDirSize + endRecord.length;
    const result = new Uint8Array(totalSize);
    let pos = 0;

    for (const part of localFiles) {
      result.set(part, pos);
      pos += part.length;
    }
    for (const entry of centralDirectory) {
      result.set(entry, pos);
      pos += entry.length;
    }
    result.set(endRecord, pos);

    return result;
  }

  private createLocalFileHeader(
    fileName: Uint8Array,
    compressedSize: number,
    uncompressedSize: number,
    crc: number,
    compressionMethod: number
  ): Uint8Array {
    const header = new Uint8Array(30 + fileName.length);
    const view = new DataView(header.buffer);

    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, compressionMethod, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, compressedSize, true);
    view.setUint32(22, uncompressedSize, true);
    view.setUint16(26, fileName.length, true);
    view.setUint16(28, 0, true);
    header.set(fileName, 30);

    return header;
  }

  private createCentralDirectoryEntry(
    fileName: Uint8Array,
    compressedSize: number,
    uncompressedSize: number,
    crc: number,
    compressionMethod: number,
    localHeaderOffset: number
  ): Uint8Array {
    const entry = new Uint8Array(46 + fileName.length);
    const view = new DataView(entry.buffer);

    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, compressionMethod, true);
    view.setUint16(12, 0, true);
    view.setUint16(14, 0, true);
    view.setUint32(16, crc, true);
    view.setUint32(20, compressedSize, true);
    view.setUint32(24, uncompressedSize, true);
    view.setUint16(28, fileName.length, true);
    view.setUint16(30, 0, true);
    view.setUint16(32, 0, true);
    view.setUint16(34, 0, true);
    view.setUint16(36, 0, true);
    view.setUint32(38, 0, true);
    view.setUint32(42, localHeaderOffset, true);
    entry.set(fileName, 46);

    return entry;
  }

  private createEndOfCentralDirectory(
    fileCount: number,
    centralDirSize: number,
    centralDirOffset: number
  ): Uint8Array {
    const record = new Uint8Array(22);
    const view = new DataView(record.buffer);

    view.setUint32(0, 0x06054b50, true);
    view.setUint16(4, 0, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, fileCount, true);
    view.setUint16(10, fileCount, true);
    view.setUint32(12, centralDirSize, true);
    view.setUint32(16, centralDirOffset, true);
    view.setUint16(20, 0, true);

    return record;
  }

  private crc32(data: Uint8Array): number {
    let crc = 0xffffffff;
    const table = this.getCrc32Table();

    for (let i = 0; i < data.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff];
    }

    return (crc ^ 0xffffffff) >>> 0;
  }

  private getCrc32Table(): Uint32Array {
    if (!this._crc32Table) {
      this._crc32Table = new Uint32Array(256);
      for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
          c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        }
        this._crc32Table[i] = c;
      }
    }
    return this._crc32Table;
  }

  private sanitizeFilename(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 200);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}

export const workflowExporter = new WorkflowExporter();
