/**
 * Enhanced FileReader Utility
 * Provides robust file reading with comprehensive error handling, timeouts, and validation
 */

import { logger } from '../services/SimpleLogger';

export interface FileReadOptions {
  maxSize?: number;
  allowedTypes?: string[];
  timeout?: number;
  encoding?: string;
  validateContent?: (content: string | ArrayBuffer) => boolean;
  onProgress?: (loaded: number, total: number) => void;
  chunkSize?: number;
}

export interface FileReadResult<T = string> {
  success: boolean;
  data?: T;
  error?: string;
  fileInfo: {
    name: string;
    size: number;
    type: string;
    lastModified: Date;
  };
}

export class EnhancedFileReader {
  private static readonly DEFAULT_MAX_SIZE = 50 * 1024 * 1024; // 50MB
  private static readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private static readonly CHUNK_SIZE = 64 * 1024; // 64KB chunks for progress

  /**
   * Read file as text with comprehensive error handling
   */
  static async readAsText(
    file: File, 
    options: FileReadOptions = {}
  ): Promise<FileReadResult<string>> {
    return this.readFile(file, 'text', options);
  }

  /**
   * Read file as data URL with comprehensive error handling
   */
  static async readAsDataURL(
    file: File, 
    options: FileReadOptions = {}
  ): Promise<FileReadResult<string>> {
    return this.readFile(file, 'dataURL', options);
  }

  /**
   * Read file as array buffer with comprehensive error handling
   */
  static async readAsArrayBuffer(
    file: File, 
    options: FileReadOptions = {}
  ): Promise<FileReadResult<ArrayBuffer>> {
    return this.readFile(file, 'arrayBuffer', options);
  }

  /**
   * Read file with chunked progress reporting
   */
  static async readWithProgress<T = string>(
    file: File,
    readType: 'text' | 'dataURL' | 'arrayBuffer' = 'text',
    options: FileReadOptions = {}
  ): Promise<FileReadResult<T>> {
    const fileInfo = this.getFileInfo(file);

    try {
      // Validate file before reading
      const validation = await this.validateFile(file, options);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          fileInfo
        };
      }

      // Use chunked reading for large files to provide progress updates
      if (file.size > this.CHUNK_SIZE && options.onProgress) {
        return await this.readFileChunked<T>(file, readType, options, fileInfo);
      } else {
        return await this.readFile<T>(file, readType, options);
      }
    } catch (error) {
      logger.error('File reading failed', { fileName: file.name, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        fileInfo
      };
    }
  }

  /**
   * Core file reading method with enhanced error handling
   */
  private static async readFile<T = string>(
    file: File,
    readType: 'text' | 'dataURL' | 'arrayBuffer',
    options: FileReadOptions = {}
  ): Promise<FileReadResult<T>> {
    const reader = new FileReader();
    let hasCompleted = false;
    const fileInfo = this.getFileInfo(file);
    const timeout = options.timeout || this.DEFAULT_TIMEOUT;

    return new Promise((resolve) => {
      // Validate file first
      this.validateFile(file, options).then(validation => {
        if (!validation.valid) {
          resolve({
            success: false,
            error: validation.error,
            fileInfo
          });
          return;
        }

        // Setup timeout
        const timeoutId = setTimeout(() => {
          if (!hasCompleted) {
            hasCompleted = true;
            reader.abort(); // Abort the read operation
            logger.warn('File read timeout', { 
              fileName: file.name, 
              timeout,
              fileSize: file.size 
            });
            resolve({
              success: false,
              error: `File read timeout after ${timeout}ms`,
              fileInfo
            });
          }
        }, timeout);

        // Success handler
        reader.onload = () => {
          if (hasCompleted) return;
          hasCompleted = true;
          clearTimeout(timeoutId);

          try {
            const result = reader.result as string | ArrayBuffer;

            // Validate content if validator provided
            if (options.validateContent && !options.validateContent(result as string | ArrayBuffer)) {
              resolve({
                success: false,
                error: 'File content validation failed',
                fileInfo
              });
              return;
            }

            logger.debug('File read successfully', {
              fileName: file.name,
              size: file.size,
              type: readType
            });

            resolve({
              success: true,
              data: result as T,
              fileInfo
            });
          } catch (error) {
            logger.error('File processing error', { fileName: file.name, error });
            resolve({
              success: false,
              error: error instanceof Error ? error.message : 'File processing failed',
              fileInfo
            });
          }
        };

        // Error handler
        reader.onerror = () => {
          if (hasCompleted) return;
          hasCompleted = true;
          clearTimeout(timeoutId);

          const errorMessage = this.getFileReaderErrorMessage(reader.error);

          logger.error('FileReader error', {
            fileName: file.name,
            error: errorMessage,
            domError: reader.error
          });

          resolve({
            success: false,
            error: errorMessage,
            fileInfo
          });
        };

        // Abort handler
        reader.onabort = () => {
          if (hasCompleted) return;
          hasCompleted = true;
          clearTimeout(timeoutId);

          logger.warn('File read aborted', { fileName: file.name });
          resolve({
            success: false,
            error: 'File read was aborted',
            fileInfo
          });
        };

        // Progress handler
        if (options.onProgress) {
          reader.onprogress = (event) => {
            if (event.lengthComputable) {
              options.onProgress!(event.loaded, event.total);
            }
          };
        }

        // Start reading based on type
        try {
          switch (readType) {
            case 'text':
              reader.readAsText(file, options.encoding || 'UTF-8');
              break;
            case 'dataURL':
              reader.readAsDataURL(file);
              break;
            case 'arrayBuffer':
              reader.readAsArrayBuffer(file);
              break;
            default:
              throw new Error(`Unsupported read type: ${readType}`);
          }
        } catch (error) {
          hasCompleted = true;
          clearTimeout(timeoutId);
          logger.error('Failed to start file reading', { fileName: file.name, error });
          resolve({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to start reading file',
            fileInfo
          });
        }
      }).catch(error => {
        resolve({
          success: false,
          error: error instanceof Error ? error.message : 'File validation failed',
          fileInfo
        });
      });
    });
  }

  /**
   * Internal file reading method without validation
   */
  private static async readFileInternal<T>(
    file: File | Blob,
    readType: 'text' | 'dataURL' | 'arrayBuffer',
    options: FileReadOptions
  ): Promise<FileReadResult<T>> {
    const reader = new FileReader();
    const fileInfo = file instanceof File ? this.getFileInfo(file) : {
      name: 'blob',
      size: file.size,
      type: file.type,
      lastModified: new Date()
    };

    return new Promise((resolve) => {
      reader.onload = () => {
        resolve({
          success: true,
          data: reader.result as T,
          fileInfo
        });
      };

      reader.onerror = () => {
        resolve({
          success: false,
          error: this.getFileReaderErrorMessage(reader.error),
          fileInfo
        });
      };

      switch (readType) {
        case 'text':
          reader.readAsText(file, options.encoding || 'UTF-8');
          break;
        case 'dataURL':
          reader.readAsDataURL(file);
          break;
        case 'arrayBuffer':
          reader.readAsArrayBuffer(file);
          break;
      }
    });
  }

  /**
   * Read file in chunks for progress reporting on large files
   */
  private static async readFileChunked<T>(
    file: File,
    readType: 'text' | 'dataURL' | 'arrayBuffer',
    options: FileReadOptions,
    fileInfo: {
      name: string;
      size: number;
      type: string;
      lastModified: Date;
    }
  ): Promise<FileReadResult<T>> {
    try {
      let result: T;

      // For text files, read in chunks
      if (readType === 'text') {
        const chunks: string[] = [];
        let totalRead = 0;
        const chunkSize = options.chunkSize || 1024 * 1024; // 1MB default

        while (totalRead < file.size) {
          const chunk = file.slice(totalRead, totalRead + chunkSize);
          const chunkResult = await this.readFileInternal<string>(chunk, readType, options);

          if (!chunkResult.success) {
            return {
              success: false,
              error: chunkResult.error,
              fileInfo
            };
          }

          chunks.push(chunkResult.data!);
          totalRead += chunk.size;

          if (options.onProgress) {
            options.onProgress(totalRead, file.size);
          }
        }

        result = chunks.join('') as T;
      } else {
        // For other types, read normally (chunked reading is more complex for binary data)
        const fileResult = await this.readFileInternal<T>(file, readType, options);
        if (!fileResult.success) {
          return fileResult;
        }
        result = fileResult.data!;
      }

      return {
        success: true,
        data: result,
        fileInfo
      };
    } catch (error) {
      logger.error('Chunked file read failed', { fileName: file.name, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Chunked read failed',
        fileInfo
      };
    }
  }

  /**
   * Validate file before reading
   */
  private static async validateFile(
    file: File,
    options: FileReadOptions
  ): Promise<{ valid: boolean; error?: string }> {
    const maxSize = options.maxSize || this.DEFAULT_MAX_SIZE;

    // Check if file exists and is valid
    if (!file || !(file instanceof File)) {
      return { valid: false, error: 'Invalid file object' };
    }

    // Check file size
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size (${this.formatFileSize(file.size)}) exceeds maximum allowed size (${this.formatFileSize(maxSize)})`
      };
    }

    // Check if file is empty
    if (file.size === 0) {
      return { valid: false, error: 'File is empty' };
    }

    // Check file type if specified
    if (options.allowedTypes && options.allowedTypes.length > 0) {
      const mimeType = file.type;
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      const isAllowed = options.allowedTypes.some(allowed => {
        return file.name.toLowerCase().endsWith(allowed) ||
               mimeType.includes(allowed) ||
               allowed.includes(fileExtension);
      });

      if (!isAllowed) {
        return {
          valid: false,
          error: `File type not allowed. Supported types: ${options.allowedTypes.join(', ')}`
        };
      }
    }

    // Check file date (not too old or in the future)
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const fileDate = new Date(file.lastModified);

    if (fileDate < oneYearAgo) {
      logger.warn('File is very old', { fileName: file.name, lastModified: fileDate });
    }

    if (fileDate > oneHourFromNow) {
      return { valid: false, error: 'File modification date is in the future' };
    }

    return { valid: true };
  }

  /**
   * Get file information
   */
  private static getFileInfo(file: File) {
    return {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified)
    };
  }

  /**
   * Get human-readable error message from FileReader error
   */
  private static getFileReaderErrorMessage(error: DOMException | null): string {
    if (!error) {
      return 'Unknown file reading error';
    }

    switch (error.name) {
      case 'NotFoundError':
        return 'File not found';
      case 'SecurityError':
        return 'Security error - file access denied';
      case 'AbortError':
        return 'File reading was aborted';
      case 'NotReadableError':
        return 'File is not readable';
      case 'EncodingError':
        return 'File encoding error';
      default:
        return error.message || 'File reading error';
    }
  }

  /**
   * Format file size for human reading
   */
  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Detect file type from content (for validation)
   */
  static async detectFileType(file: File): Promise<string> {
    try {
      // Read first few bytes to detect file type
      const headerBlob = file.slice(0, 8);
      const result = await this.readFileInternal<ArrayBuffer>(headerBlob, 'arrayBuffer', {});

      if (!result.success || !result.data) {
        return 'unknown';
      }

      const bytes = new Uint8Array(result.data);

      // Check for common file signatures
      if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
        return 'image/png';
      }
      if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
        return 'image/jpeg';
      }
      if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
        return 'application/pdf';
      }
      if (bytes[0] === 0x7B || bytes[0] === 0x5B) {
        return 'application/json';
      }

      return file.type || 'unknown';
    } catch (error) {
      logger.warn('Failed to detect file type', error);
      return file.type || 'unknown';
    }
  }
}

// Convenience functions for backward compatibility
export const readFileAsText = EnhancedFileReader.readAsText;
export const readFileAsDataURL = EnhancedFileReader.readAsDataURL;
export const readFileAsArrayBuffer = EnhancedFileReader.readAsArrayBuffer;