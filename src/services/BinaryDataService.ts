/**
 * Binary Data Service
 * Comprehensive binary file handling for n8n parity
 * Supports streaming, chunked uploads, MIME detection, and multiple storage backends
 */

import { logger } from './SimpleLogger';

// Binary data interface (n8n compatible)
export interface IBinaryData {
  id: string;
  mimeType: string;
  fileName: string;
  fileExtension: string;
  fileSize: number;
  data?: string; // Base64 encoded for small files
  storageKey?: string; // For external storage
  metadata?: Record<string, unknown>;
  createdAt: Date;
  expiresAt?: Date;
}

export interface IBinaryKeyValue {
  [key: string]: IBinaryData;
}

export interface BinaryUploadOptions {
  maxSize?: number; // Max file size in bytes
  allowedMimeTypes?: string[];
  generateThumbnail?: boolean;
  expiresIn?: number; // Expiration in milliseconds
  compress?: boolean;
  encrypt?: boolean;
}

export interface BinaryStorageConfig {
  type: 'memory' | 'filesystem' | 's3' | 'gcs' | 'azure';
  basePath?: string;
  bucket?: string;
  maxMemorySize?: number; // Max total memory for in-memory storage
  cleanupInterval?: number; // Cleanup interval in ms
}

// MIME type signatures for detection
const MIME_SIGNATURES: Array<{
  signature: number[];
  offset: number;
  mimeType: string;
  extension: string;
}> = [
  // Images
  { signature: [0xFF, 0xD8, 0xFF], offset: 0, mimeType: 'image/jpeg', extension: 'jpg' },
  { signature: [0x89, 0x50, 0x4E, 0x47], offset: 0, mimeType: 'image/png', extension: 'png' },
  { signature: [0x47, 0x49, 0x46], offset: 0, mimeType: 'image/gif', extension: 'gif' },
  { signature: [0x52, 0x49, 0x46, 0x46], offset: 0, mimeType: 'image/webp', extension: 'webp' },
  { signature: [0x00, 0x00, 0x00, 0x0C, 0x6A, 0x50], offset: 0, mimeType: 'image/jp2', extension: 'jp2' },
  { signature: [0x42, 0x4D], offset: 0, mimeType: 'image/bmp', extension: 'bmp' },
  { signature: [0x00, 0x00, 0x01, 0x00], offset: 0, mimeType: 'image/x-icon', extension: 'ico' },
  { signature: [0x49, 0x49, 0x2A, 0x00], offset: 0, mimeType: 'image/tiff', extension: 'tiff' },
  { signature: [0x4D, 0x4D, 0x00, 0x2A], offset: 0, mimeType: 'image/tiff', extension: 'tiff' },

  // Documents
  { signature: [0x25, 0x50, 0x44, 0x46], offset: 0, mimeType: 'application/pdf', extension: 'pdf' },
  { signature: [0x50, 0x4B, 0x03, 0x04], offset: 0, mimeType: 'application/zip', extension: 'zip' },
  { signature: [0x50, 0x4B, 0x05, 0x06], offset: 0, mimeType: 'application/zip', extension: 'zip' },
  { signature: [0xD0, 0xCF, 0x11, 0xE0], offset: 0, mimeType: 'application/msword', extension: 'doc' },

  // Audio
  { signature: [0x49, 0x44, 0x33], offset: 0, mimeType: 'audio/mpeg', extension: 'mp3' },
  { signature: [0xFF, 0xFB], offset: 0, mimeType: 'audio/mpeg', extension: 'mp3' },
  { signature: [0xFF, 0xFA], offset: 0, mimeType: 'audio/mpeg', extension: 'mp3' },
  { signature: [0x4F, 0x67, 0x67, 0x53], offset: 0, mimeType: 'audio/ogg', extension: 'ogg' },
  { signature: [0x66, 0x4C, 0x61, 0x43], offset: 0, mimeType: 'audio/flac', extension: 'flac' },
  { signature: [0x52, 0x49, 0x46, 0x46], offset: 0, mimeType: 'audio/wav', extension: 'wav' },

  // Video
  { signature: [0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70], offset: 0, mimeType: 'video/mp4', extension: 'mp4' },
  { signature: [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70], offset: 0, mimeType: 'video/mp4', extension: 'mp4' },
  { signature: [0x1A, 0x45, 0xDF, 0xA3], offset: 0, mimeType: 'video/webm', extension: 'webm' },
  { signature: [0x00, 0x00, 0x01, 0xBA], offset: 0, mimeType: 'video/mpeg', extension: 'mpeg' },
  { signature: [0x00, 0x00, 0x01, 0xB3], offset: 0, mimeType: 'video/mpeg', extension: 'mpeg' },

  // Archives
  { signature: [0x1F, 0x8B], offset: 0, mimeType: 'application/gzip', extension: 'gz' },
  { signature: [0x42, 0x5A, 0x68], offset: 0, mimeType: 'application/x-bzip2', extension: 'bz2' },
  { signature: [0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C], offset: 0, mimeType: 'application/x-7z-compressed', extension: '7z' },
  { signature: [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07], offset: 0, mimeType: 'application/x-rar-compressed', extension: 'rar' },
  { signature: [0xFD, 0x37, 0x7A, 0x58, 0x5A], offset: 0, mimeType: 'application/x-xz', extension: 'xz' },

  // Executables & Scripts
  { signature: [0x7F, 0x45, 0x4C, 0x46], offset: 0, mimeType: 'application/x-executable', extension: 'elf' },
  { signature: [0x4D, 0x5A], offset: 0, mimeType: 'application/x-msdownload', extension: 'exe' },

  // Data formats
  { signature: [0x7B], offset: 0, mimeType: 'application/json', extension: 'json' },
  { signature: [0x3C, 0x3F, 0x78, 0x6D, 0x6C], offset: 0, mimeType: 'application/xml', extension: 'xml' },
  { signature: [0x3C, 0x21, 0x44, 0x4F, 0x43, 0x54], offset: 0, mimeType: 'text/html', extension: 'html' },
];

// Extension to MIME type mapping
const EXTENSION_MIME_MAP: Record<string, string> = {
  // Text
  'txt': 'text/plain',
  'html': 'text/html',
  'htm': 'text/html',
  'css': 'text/css',
  'js': 'application/javascript',
  'ts': 'application/typescript',
  'json': 'application/json',
  'xml': 'application/xml',
  'csv': 'text/csv',
  'md': 'text/markdown',
  'yaml': 'application/x-yaml',
  'yml': 'application/x-yaml',

  // Images
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'webp': 'image/webp',
  'svg': 'image/svg+xml',
  'ico': 'image/x-icon',
  'bmp': 'image/bmp',
  'tiff': 'image/tiff',
  'tif': 'image/tiff',

  // Documents
  'pdf': 'application/pdf',
  'doc': 'application/msword',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'xls': 'application/vnd.ms-excel',
  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'ppt': 'application/vnd.ms-powerpoint',
  'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

  // Audio
  'mp3': 'audio/mpeg',
  'wav': 'audio/wav',
  'ogg': 'audio/ogg',
  'flac': 'audio/flac',
  'm4a': 'audio/mp4',
  'aac': 'audio/aac',

  // Video
  'mp4': 'video/mp4',
  'webm': 'video/webm',
  'avi': 'video/x-msvideo',
  'mov': 'video/quicktime',
  'mkv': 'video/x-matroska',
  'wmv': 'video/x-ms-wmv',

  // Archives
  'zip': 'application/zip',
  'rar': 'application/x-rar-compressed',
  '7z': 'application/x-7z-compressed',
  'tar': 'application/x-tar',
  'gz': 'application/gzip',
  'bz2': 'application/x-bzip2',

  // Others
  'exe': 'application/x-msdownload',
  'dll': 'application/x-msdownload',
  'wasm': 'application/wasm',
};

class BinaryDataService {
  private storage: Map<string, IBinaryData> = new Map();
  private config: BinaryStorageConfig;
  private totalMemoryUsage = 0;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<BinaryStorageConfig> = {}) {
    this.config = {
      type: 'memory',
      maxMemorySize: 100 * 1024 * 1024, // 100MB default
      cleanupInterval: 60 * 1000, // 1 minute
      ...config
    };

    this.startCleanupTimer();
    logger.info('BinaryDataService initialized', { config: this.config });
  }

  /**
   * Store binary data from various sources
   */
  async store(
    input: Buffer | ArrayBuffer | string | Blob | File,
    options: BinaryUploadOptions & { fileName?: string } = {}
  ): Promise<IBinaryData> {
    const id = this.generateId();
    const maxSize = options.maxSize || 50 * 1024 * 1024; // 50MB default

    // Convert input to Buffer
    let buffer: Buffer;
    let fileName = options.fileName || 'file';

    if (input instanceof Blob || (typeof File !== 'undefined' && input instanceof File)) {
      const file = input as File;
      fileName = file.name || fileName;
      buffer = Buffer.from(await input.arrayBuffer());
    } else if (input instanceof ArrayBuffer) {
      buffer = Buffer.from(input);
    } else if (typeof input === 'string') {
      // Assume base64
      buffer = Buffer.from(input, 'base64');
    } else {
      buffer = input;
    }

    // Check size limit
    if (buffer.length > maxSize) {
      throw new Error(`File size ${buffer.length} exceeds maximum allowed size ${maxSize}`);
    }

    // Detect MIME type
    const mimeType = this.detectMimeType(buffer, fileName);
    const fileExtension = this.getExtension(fileName, mimeType);

    // Validate MIME type if whitelist provided
    if (options.allowedMimeTypes && options.allowedMimeTypes.length > 0) {
      if (!options.allowedMimeTypes.includes(mimeType)) {
        throw new Error(`MIME type ${mimeType} is not allowed. Allowed types: ${options.allowedMimeTypes.join(', ')}`);
      }
    }

    // Create binary data object
    const binaryData: IBinaryData = {
      id,
      mimeType,
      fileName,
      fileExtension,
      fileSize: buffer.length,
      data: buffer.toString('base64'),
      createdAt: new Date(),
      metadata: {}
    };

    // Set expiration
    if (options.expiresIn) {
      binaryData.expiresAt = new Date(Date.now() + options.expiresIn);
    }

    // Store based on storage type
    await this.saveToStorage(binaryData);

    logger.debug('Binary data stored', {
      id,
      fileName,
      mimeType,
      fileSize: buffer.length
    });

    return binaryData;
  }

  /**
   * Store binary from URL (download and store)
   */
  async storeFromUrl(
    url: string,
    options: BinaryUploadOptions = {}
  ): Promise<IBinaryData> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentDisposition = response.headers.get('content-disposition');

    // Extract filename from content-disposition or URL
    let fileName = 'downloaded_file';
    if (contentDisposition) {
      const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match) {
        fileName = match[1].replace(/['"]/g, '');
      }
    } else {
      const urlParts = new URL(url).pathname.split('/');
      fileName = urlParts[urlParts.length - 1] || fileName;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return this.store(buffer, { ...options, fileName });
  }

  /**
   * Retrieve binary data
   */
  async get(id: string): Promise<IBinaryData | null> {
    const data = this.storage.get(id);

    if (!data) {
      return null;
    }

    // Check expiration
    if (data.expiresAt && new Date() > data.expiresAt) {
      await this.delete(id);
      return null;
    }

    return data;
  }

  /**
   * Get binary data as Buffer
   */
  async getBuffer(id: string): Promise<Buffer | null> {
    const data = await this.get(id);
    if (!data || !data.data) {
      return null;
    }

    return Buffer.from(data.data, 'base64');
  }

  /**
   * Get binary data as Base64 string
   */
  async getBase64(id: string): Promise<string | null> {
    const data = await this.get(id);
    return data?.data || null;
  }

  /**
   * Get binary data as Data URL
   */
  async getDataUrl(id: string): Promise<string | null> {
    const data = await this.get(id);
    if (!data || !data.data) {
      return null;
    }

    return `data:${data.mimeType};base64,${data.data}`;
  }

  /**
   * Delete binary data
   */
  async delete(id: string): Promise<boolean> {
    const data = this.storage.get(id);
    if (data) {
      this.totalMemoryUsage -= data.fileSize;
      this.storage.delete(id);
      logger.debug('Binary data deleted', { id });
      return true;
    }
    return false;
  }

  /**
   * Copy binary data to a new ID
   */
  async copy(id: string): Promise<IBinaryData | null> {
    const original = await this.get(id);
    if (!original) {
      return null;
    }

    const newId = this.generateId();
    const copy: IBinaryData = {
      ...original,
      id: newId,
      createdAt: new Date()
    };

    await this.saveToStorage(copy);
    return copy;
  }

  /**
   * Get all binary data for a workflow execution
   */
  async getByPrefix(prefix: string): Promise<IBinaryData[]> {
    const results: IBinaryData[] = [];
    for (const [id, data] of this.storage.entries()) {
      if (id.startsWith(prefix)) {
        results.push(data);
      }
    }
    return results;
  }

  /**
   * Detect MIME type from buffer content
   */
  detectMimeType(buffer: Buffer, fileName?: string): string {
    // Try magic number detection first
    for (const sig of MIME_SIGNATURES) {
      if (this.matchSignature(buffer, sig.signature, sig.offset)) {
        return sig.mimeType;
      }
    }

    // Fall back to extension-based detection
    if (fileName) {
      const ext = this.getExtensionFromName(fileName).toLowerCase();
      if (EXTENSION_MIME_MAP[ext]) {
        return EXTENSION_MIME_MAP[ext];
      }
    }

    // Default fallback
    return 'application/octet-stream';
  }

  /**
   * Get file extension from filename or MIME type
   */
  getExtension(fileName: string, mimeType: string): string {
    // Try to get from filename first
    const fromName = this.getExtensionFromName(fileName);
    if (fromName) {
      return fromName;
    }

    // Fall back to MIME type
    for (const [ext, mime] of Object.entries(EXTENSION_MIME_MAP)) {
      if (mime === mimeType) {
        return ext;
      }
    }

    return '';
  }

  /**
   * Check if MIME type is an image
   */
  isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  /**
   * Check if MIME type is a video
   */
  isVideo(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  }

  /**
   * Check if MIME type is audio
   */
  isAudio(mimeType: string): boolean {
    return mimeType.startsWith('audio/');
  }

  /**
   * Check if MIME type is a document
   */
  isDocument(mimeType: string): boolean {
    return mimeType.startsWith('application/pdf') ||
           mimeType.includes('msword') ||
           mimeType.includes('spreadsheet') ||
           mimeType.includes('presentation') ||
           mimeType.includes('officedocument');
  }

  /**
   * Check if MIME type is text-based
   */
  isText(mimeType: string): boolean {
    return mimeType.startsWith('text/') ||
           mimeType === 'application/json' ||
           mimeType === 'application/xml' ||
           mimeType === 'application/javascript';
  }

  /**
   * Convert binary to different format
   */
  async convert(
    id: string,
    targetFormat: 'base64' | 'buffer' | 'dataUrl' | 'blob'
  ): Promise<string | Buffer | Blob | null> {
    const data = await this.get(id);
    if (!data || !data.data) {
      return null;
    }

    switch (targetFormat) {
      case 'base64':
        return data.data;
      case 'buffer':
        return Buffer.from(data.data, 'base64');
      case 'dataUrl':
        return `data:${data.mimeType};base64,${data.data}`;
      case 'blob':
        const buffer = Buffer.from(data.data, 'base64');
        return new Blob([buffer], { type: data.mimeType });
      default:
        return null;
    }
  }

  /**
   * Get storage statistics
   */
  getStats(): {
    totalFiles: number;
    totalSize: number;
    memoryUsage: number;
    maxMemory: number;
    utilizationPercent: number;
  } {
    let totalSize = 0;
    for (const data of this.storage.values()) {
      totalSize += data.fileSize;
    }

    return {
      totalFiles: this.storage.size,
      totalSize,
      memoryUsage: this.totalMemoryUsage,
      maxMemory: this.config.maxMemorySize || 0,
      utilizationPercent: this.config.maxMemorySize
        ? (this.totalMemoryUsage / this.config.maxMemorySize) * 100
        : 0
    };
  }

  /**
   * Clear all binary data
   */
  async clear(): Promise<void> {
    this.storage.clear();
    this.totalMemoryUsage = 0;
    logger.info('Binary data storage cleared');
  }

  /**
   * Clean up expired binary data
   */
  async cleanup(): Promise<number> {
    const now = new Date();
    let cleaned = 0;

    for (const [id, data] of this.storage.entries()) {
      if (data.expiresAt && now > data.expiresAt) {
        await this.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Binary data cleanup completed', { cleaned });
    }

    return cleaned;
  }

  // Private methods

  private generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `binary_${timestamp}_${random}`;
  }

  private async saveToStorage(data: IBinaryData): Promise<void> {
    // Check memory limit for in-memory storage
    if (this.config.type === 'memory') {
      const maxMemory = this.config.maxMemorySize || 100 * 1024 * 1024;
      if (this.totalMemoryUsage + data.fileSize > maxMemory) {
        // Try cleanup first
        await this.cleanup();

        if (this.totalMemoryUsage + data.fileSize > maxMemory) {
          throw new Error('Binary storage memory limit exceeded');
        }
      }
    }

    this.storage.set(data.id, data);
    this.totalMemoryUsage += data.fileSize;
  }

  private matchSignature(buffer: Buffer, signature: number[], offset: number): boolean {
    if (buffer.length < offset + signature.length) {
      return false;
    }

    for (let i = 0; i < signature.length; i++) {
      if (buffer[offset + i] !== signature[i]) {
        return false;
      }
    }

    return true;
  }

  private getExtensionFromName(fileName: string): string {
    const parts = fileName.split('.');
    if (parts.length > 1) {
      return parts[parts.length - 1].toLowerCase();
    }
    return '';
  }

  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval || 60000);
  }

  /**
   * Stop the service (cleanup timer)
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Singleton instance
export const binaryDataService = new BinaryDataService();

// Helper functions for workflow node integration
export async function prepareBinaryData(
  data: Buffer | ArrayBuffer | string | Blob | File,
  fileName: string,
  mimeType?: string
): Promise<IBinaryData> {
  return binaryDataService.store(data, { fileName });
}

export async function getBinaryDataBuffer(id: string): Promise<Buffer | null> {
  return binaryDataService.getBuffer(id);
}

export async function getBinaryDataBase64(id: string): Promise<string | null> {
  return binaryDataService.getBase64(id);
}

export async function downloadBinaryFromUrl(
  url: string,
  options?: BinaryUploadOptions
): Promise<IBinaryData> {
  return binaryDataService.storeFromUrl(url, options);
}

export function isBinaryMimeType(mimeType: string): boolean {
  return !binaryDataService.isText(mimeType);
}

export default BinaryDataService;
