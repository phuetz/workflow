/**
 * Binary Data Manager
 * Handle file uploads, downloads, and binary data in workflows (n8n-like)
 */

export interface BinaryData {
  data: string; // Base64 encoded data or URL
  mimeType: string;
  fileName?: string;
  fileSize?: number;
  fileExtension?: string;
  metadata?: Record<string, any>;
}

export interface BinaryDataStore {
  [key: string]: BinaryData;
}

class BinaryDataManager {
  private storage: Map<string, BinaryData> = new Map();
  private maxSize: number = 50 * 1024 * 1024; // 50MB default

  /**
   * Store binary data
   */
  async store(data: Blob | File, metadata?: Record<string, any>): Promise<string> {
    const id = this.generateId();

    if (data.size > this.maxSize) {
      throw new Error(`File size exceeds maximum allowed size of ${this.formatBytes(this.maxSize)}`);
    }

    const base64 = await this.blobToBase64(data);
    const fileName = data instanceof File ? data.name : undefined;
    const fileExtension = fileName ? fileName.split('.').pop() : undefined;

    const binaryData: BinaryData = {
      data: base64,
      mimeType: data.type || 'application/octet-stream',
      fileName,
      fileSize: data.size,
      fileExtension,
      metadata
    };

    this.storage.set(id, binaryData);

    return id;
  }

  /**
   * Retrieve binary data
   */
  get(id: string): BinaryData | undefined {
    return this.storage.get(id);
  }

  /**
   * Delete binary data
   */
  delete(id: string): boolean {
    return this.storage.delete(id);
  }

  /**
   * Get binary data as Blob
   */
  async getAsBlob(id: string): Promise<Blob | null> {
    const data = this.storage.get(id);
    if (!data) return null;

    return this.base64ToBlob(data.data, data.mimeType);
  }

  /**
   * Get binary data as Data URL
   */
  getAsDataURL(id: string): string | null {
    const data = this.storage.get(id);
    if (!data) return null;

    return `data:${data.mimeType};base64,${data.data}`;
  }

  /**
   * Download binary data
   */
  async download(id: string): Promise<void> {
    const data = this.storage.get(id);
    if (!data) {
      throw new Error('Binary data not found');
    }

    const blob = await this.base64ToBlob(data.data, data.mimeType);
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = data.fileName || `download.${data.fileExtension || 'bin'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  /**
   * Convert Blob to Base64
   */
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Convert Base64 to Blob
   */
  private async base64ToBlob(base64: string, mimeType: string): Promise<Blob> {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  /**
   * Get binary data from URL
   */
  async fetchFromURL(url: string, metadata?: Record<string, any>): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const blob = await response.blob();
    return this.store(blob, metadata);
  }

  /**
   * Convert image to different format
   */
  async convertImage(
    id: string,
    targetFormat: 'png' | 'jpeg' | 'webp',
    quality: number = 0.9
  ): Promise<string> {
    const data = this.storage.get(id);
    if (!data) {
      throw new Error('Binary data not found');
    }

    if (!data.mimeType.startsWith('image/')) {
      throw new Error('Data is not an image');
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          async blob => {
            if (!blob) {
              reject(new Error('Failed to convert image'));
              return;
            }

            const newId = await this.store(blob, {
              ...data.metadata,
              originalId: id,
              convertedFrom: data.mimeType
            });

            resolve(newId);
          },
          `image/${targetFormat}`,
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = this.getAsDataURL(id)!;
    });
  }

  /**
   * Resize image
   */
  async resizeImage(
    id: string,
    width: number,
    height: number,
    maintainAspectRatio: boolean = true
  ): Promise<string> {
    const data = this.storage.get(id);
    if (!data || !data.mimeType.startsWith('image/')) {
      throw new Error('Data is not an image');
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        let targetWidth = width;
        let targetHeight = height;

        if (maintainAspectRatio) {
          const aspectRatio = img.width / img.height;
          if (width / height > aspectRatio) {
            targetWidth = height * aspectRatio;
          } else {
            targetHeight = width / aspectRatio;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        canvas.toBlob(async blob => {
          if (!blob) {
            reject(new Error('Failed to resize image'));
            return;
          }

          const newId = await this.store(blob, {
            ...data.metadata,
            originalId: id,
            resizedFrom: `${img.width}x${img.height}`
          });

          resolve(newId);
        }, data.mimeType);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = this.getAsDataURL(id)!;
    });
  }

  /**
   * Get storage statistics
   */
  getStatistics() {
    const items = Array.from(this.storage.values());

    return {
      count: items.length,
      totalSize: items.reduce((sum, item) => sum + (item.fileSize || 0), 0),
      byMimeType: items.reduce((acc, item) => {
        acc[item.mimeType] = (acc[item.mimeType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  /**
   * Clear all binary data
   */
  clear(): void {
    this.storage.clear();
  }

  /**
   * Set maximum file size
   */
  setMaxSize(bytes: number): void {
    this.maxSize = bytes;
  }

  /**
   * Format bytes to human-readable
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(2)}KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(2)}MB`;
    return `${(bytes / 1073741824).toFixed(2)}GB`;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `binary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const binaryDataManager = new BinaryDataManager();

/**
 * File helper functions
 */
export const FileHelpers = {
  /**
   * Get file extension from filename
   */
  getExtension(filename: string): string {
    return filename.split('.').pop() || '';
  },

  /**
   * Get MIME type from extension
   */
  getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      // Images
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',

      // Documents
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

      // Text
      txt: 'text/plain',
      csv: 'text/csv',
      json: 'application/json',
      xml: 'application/xml',
      html: 'text/html',
      css: 'text/css',
      js: 'application/javascript',

      // Archives
      zip: 'application/zip',
      rar: 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed',
      tar: 'application/x-tar',
      gz: 'application/gzip',

      // Media
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      mp4: 'video/mp4',
      avi: 'video/x-msvideo',
      mov: 'video/quicktime'
    };

    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  },

  /**
   * Check if file is image
   */
  isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  },

  /**
   * Check if file is video
   */
  isVideo(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  },

  /**
   * Check if file is audio
   */
  isAudio(mimeType: string): boolean {
    return mimeType.startsWith('audio/');
  },

  /**
   * Check if file is document
   */
  isDocument(mimeType: string): boolean {
    return (
      mimeType === 'application/pdf' ||
      mimeType.includes('document') ||
      mimeType.includes('sheet') ||
      mimeType.includes('presentation')
    );
  }
};
