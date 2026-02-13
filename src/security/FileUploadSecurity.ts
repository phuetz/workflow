/**
 * File Upload Security
 *
 * Comprehensive file upload validation and security:
 * - Magic bytes validation (real file type detection)
 * - File size limits
 * - File extension validation
 * - MIME type validation
 * - Virus scanning integration (ClamAV ready)
 * - Content-based validation
 * - Malicious content detection
 * - Secure file storage
 *
 * @module FileUploadSecurity
 */

import { fileTypeFromBuffer } from 'file-type';
import crypto from 'crypto';
import path from 'path';

/**
 * File validation result
 */
export interface FileValidationResult {
  /** Whether file is safe */
  safe: boolean;
  /** File information */
  fileInfo?: FileInfo;
  /** Violations found */
  violations: SecurityViolation[];
  /** Virus scan result (if enabled) */
  virusScanResult?: VirusScanResult;
}

/**
 * File information
 */
export interface FileInfo {
  /** Original filename */
  originalName: string;
  /** Safe filename (sanitized) */
  safeName: string;
  /** File size (bytes) */
  size: number;
  /** Declared MIME type */
  declaredMimeType?: string;
  /** Detected MIME type (from magic bytes) */
  detectedMimeType?: string;
  /** File extension */
  extension: string;
  /** SHA-256 hash */
  hash: string;
  /** Upload timestamp */
  uploadedAt: Date;
}

/**
 * Security violation
 */
export interface SecurityViolation {
  type: 'extension' | 'mimetype' | 'size' | 'content' | 'virus';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  details?: any;
}

/**
 * Virus scan result
 */
export interface VirusScanResult {
  clean: boolean;
  virusName?: string;
  scanner: string;
  scannedAt: Date;
}

/**
 * File upload options
 */
export interface FileUploadOptions {
  /** Maximum file size (bytes) */
  maxSize?: number;
  /** Allowed file extensions */
  allowedExtensions?: string[];
  /** Allowed MIME types */
  allowedMimeTypes?: string[];
  /** Require magic bytes validation */
  requireMagicBytesValidation?: boolean;
  /** Enable virus scanning */
  enableVirusScanning?: boolean;
  /** Sanitize filename */
  sanitizeFilename?: boolean;
  /** Generate unique filename */
  generateUniqueName?: boolean;
  /** Validate file content */
  validateContent?: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_OPTIONS: Required<FileUploadOptions> = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedExtensions: [],
  allowedMimeTypes: [],
  requireMagicBytesValidation: true,
  enableVirusScanning: false,
  sanitizeFilename: true,
  generateUniqueName: false,
  validateContent: true,
};

/**
 * Known dangerous file extensions
 */
const DANGEROUS_EXTENSIONS = [
  // Executables
  '.exe', '.dll', '.so', '.dylib', '.app', '.dmg',
  // Scripts
  '.sh', '.bat', '.cmd', '.ps1', '.vbs', '.js',
  // Archives with executables
  '.zip', '.rar', '.7z', '.tar', '.gz',
  // Office macros
  '.docm', '.xlsm', '.pptm', '.dotm', '.xltm',
  // System files
  '.sys', '.ini', '.inf', '.reg',
  // Other dangerous
  '.scr', '.com', '.pif', '.jar',
];

/**
 * Known safe MIME types
 */
const SAFE_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Documents
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
  // Office (without macros)
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
];

/**
 * Magic bytes signatures for common file types
 */
const MAGIC_BYTES: Record<string, { signature: Buffer; offset: number }> = {
  'image/jpeg': { signature: Buffer.from([0xFF, 0xD8, 0xFF]), offset: 0 },
  'image/png': { signature: Buffer.from([0x89, 0x50, 0x4E, 0x47]), offset: 0 },
  'image/gif': { signature: Buffer.from([0x47, 0x49, 0x46, 0x38]), offset: 0 },
  'application/pdf': { signature: Buffer.from([0x25, 0x50, 0x44, 0x46]), offset: 0 },
  'application/zip': { signature: Buffer.from([0x50, 0x4B, 0x03, 0x04]), offset: 0 },
};

/**
 * File Upload Security Service
 */
export class FileUploadSecurityService {
  private options: Required<FileUploadOptions>;

  constructor(options?: FileUploadOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Validate uploaded file
   */
  public async validateFile(
    file: { filename: string; buffer: Buffer; mimetype?: string },
    options?: FileUploadOptions
  ): Promise<FileValidationResult> {
    const finalOptions = { ...this.options, ...options };
    const violations: SecurityViolation[] = [];

    // 1. File info extraction
    const fileInfo = await this.extractFileInfo(file, finalOptions);

    // 2. Size validation
    if (fileInfo.size > finalOptions.maxSize) {
      violations.push({
        type: 'size',
        severity: 'high',
        message: `File size ${fileInfo.size} bytes exceeds maximum ${finalOptions.maxSize} bytes`,
        details: { size: fileInfo.size, maxSize: finalOptions.maxSize },
      });
    }

    // 3. Extension validation
    if (finalOptions.allowedExtensions.length > 0) {
      if (!finalOptions.allowedExtensions.includes(fileInfo.extension.toLowerCase())) {
        violations.push({
          type: 'extension',
          severity: 'high',
          message: `File extension '${fileInfo.extension}' not allowed`,
          details: { extension: fileInfo.extension, allowed: finalOptions.allowedExtensions },
        });
      }
    }

    // Check for dangerous extensions
    if (DANGEROUS_EXTENSIONS.includes(fileInfo.extension.toLowerCase())) {
      violations.push({
        type: 'extension',
        severity: 'critical',
        message: `Dangerous file extension detected: ${fileInfo.extension}`,
        details: { extension: fileInfo.extension },
      });
    }

    // 4. MIME type validation
    if (finalOptions.requireMagicBytesValidation) {
      if (fileInfo.declaredMimeType !== fileInfo.detectedMimeType) {
        violations.push({
          type: 'mimetype',
          severity: 'high',
          message: 'MIME type mismatch: declared vs detected',
          details: {
            declared: fileInfo.declaredMimeType,
            detected: fileInfo.detectedMimeType,
          },
        });
      }
    }

    if (finalOptions.allowedMimeTypes.length > 0) {
      if (
        fileInfo.detectedMimeType &&
        !finalOptions.allowedMimeTypes.includes(fileInfo.detectedMimeType)
      ) {
        violations.push({
          type: 'mimetype',
          severity: 'high',
          message: `MIME type '${fileInfo.detectedMimeType}' not allowed`,
          details: {
            mimeType: fileInfo.detectedMimeType,
            allowed: finalOptions.allowedMimeTypes,
          },
        });
      }
    }

    // 5. Content validation
    if (finalOptions.validateContent) {
      const contentViolations = await this.validateContent(file.buffer, fileInfo);
      violations.push(...contentViolations);
    }

    // 6. Virus scanning
    let virusScanResult: VirusScanResult | undefined;
    if (finalOptions.enableVirusScanning) {
      virusScanResult = await this.scanForViruses(file.buffer);
      if (!virusScanResult.clean) {
        violations.push({
          type: 'virus',
          severity: 'critical',
          message: `Virus detected: ${virusScanResult.virusName}`,
          details: virusScanResult,
        });
      }
    }

    // Determine if safe
    const criticalViolations = violations.filter(
      v => v.severity === 'critical' || v.severity === 'high'
    );
    const safe = criticalViolations.length === 0;

    return {
      safe,
      fileInfo,
      violations,
      virusScanResult,
    };
  }

  /**
   * Extract file information
   */
  private async extractFileInfo(
    file: { filename: string; buffer: Buffer; mimetype?: string },
    options: Required<FileUploadOptions>
  ): Promise<FileInfo> {
    const originalName = file.filename;
    const size = file.buffer.length;
    const extension = path.extname(originalName).toLowerCase();
    const hash = crypto.createHash('sha256').update(file.buffer).digest('hex');

    // Detect actual file type from magic bytes
    const fileType = await fileTypeFromBuffer(file.buffer);
    const detectedMimeType = fileType?.mime;

    // Sanitize filename if needed
    let safeName = originalName;
    if (options.sanitizeFilename) {
      safeName = this.sanitizeFilename(originalName);
    }

    // Generate unique name if needed
    if (options.generateUniqueName) {
      const uniqueId = crypto.randomBytes(8).toString('hex');
      const ext = path.extname(safeName);
      const name = path.basename(safeName, ext);
      safeName = `${name}-${uniqueId}${ext}`;
    }

    return {
      originalName,
      safeName,
      size,
      declaredMimeType: file.mimetype,
      detectedMimeType,
      extension,
      hash,
      uploadedAt: new Date(),
    };
  }

  /**
   * Sanitize filename
   */
  private sanitizeFilename(filename: string): string {
    // Remove path traversal attempts
    let safe = filename.replace(/\.\.[\/\\]/g, '');

    // Remove special characters except .-_
    safe = safe.replace(/[^a-zA-Z0-9._-]/g, '-');

    // Remove multiple consecutive dots
    safe = safe.replace(/\.{2,}/g, '.');

    // Ensure it doesn't start with dot or dash
    safe = safe.replace(/^[.-]+/, '');

    // Limit length
    const ext = path.extname(safe);
    const name = path.basename(safe, ext);
    if (name.length > 100) {
      safe = name.substring(0, 100) + ext;
    }

    return safe || 'unnamed-file';
  }

  /**
   * Validate file content
   */
  private async validateContent(
    buffer: Buffer,
    fileInfo: FileInfo
  ): Promise<SecurityViolation[]> {
    const violations: SecurityViolation[] = [];

    // Check for embedded scripts in images
    if (fileInfo.detectedMimeType?.startsWith('image/')) {
      if (this.containsScript(buffer)) {
        violations.push({
          type: 'content',
          severity: 'critical',
          message: 'Image contains embedded script',
        });
      }
    }

    // Check for embedded macros in documents
    if (fileInfo.detectedMimeType?.includes('officedocument')) {
      if (await this.containsMacros(buffer)) {
        violations.push({
          type: 'content',
          severity: 'high',
          message: 'Document contains macros',
        });
      }
    }

    // Check for null bytes (file hiding technique)
    if (buffer.includes(0x00)) {
      violations.push({
        type: 'content',
        severity: 'medium',
        message: 'File contains null bytes',
      });
    }

    return violations;
  }

  /**
   * Check if buffer contains script tags
   */
  private containsScript(buffer: Buffer): boolean {
    const content = buffer.toString('utf8', 0, Math.min(buffer.length, 10000));
    return /<script/i.test(content) || /javascript:/i.test(content);
  }

  /**
   * Check if document contains macros
   */
  private async containsMacros(buffer: Buffer): Promise<boolean> {
    // Office files are ZIP archives
    // Check for vbaProject.bin (macro storage)
    const content = buffer.toString('binary');
    return content.includes('vbaProject.bin') || content.includes('VBA');
  }

  /**
   * Scan for viruses using ClamAV (if available)
   */
  private async scanForViruses(buffer: Buffer): Promise<VirusScanResult> {
    // Note: This is a placeholder. In production, integrate with ClamAV or similar
    // Example: Use node-clam or clamscan npm package

    // For now, return mock result
    return {
      clean: true,
      scanner: 'mock-scanner',
      scannedAt: new Date(),
    };

    /* Real implementation example:
    const NodeClam = require('clamscan');
    const clamscan = await new NodeClam().init({
      clamdscan: {
        host: process.env.CLAMAV_HOST || 'localhost',
        port: process.env.CLAMAV_PORT || 3310,
      },
    });

    const result = await clamscan.scanBuffer(buffer);

    return {
      clean: result.isInfected === false,
      virusName: result.viruses?.[0],
      scanner: 'clamav',
      scannedAt: new Date(),
    };
    */
  }

  /**
   * Express middleware factory
   */
  public middleware(options?: FileUploadOptions) {
    return async (req: any, res: any, next: any) => {
      if (!req.file && !req.files) {
        return next();
      }

      const files = req.files || [req.file];
      const results: FileValidationResult[] = [];

      for (const file of Array.isArray(files) ? files : [files]) {
        const result = await this.validateFile(
          {
            filename: file.originalname || file.name,
            buffer: file.buffer,
            mimetype: file.mimetype,
          },
          options
        );

        results.push(result);

        if (!result.safe) {
          return res.status(400).json({
            error: 'File Validation Error',
            message: 'One or more uploaded files failed security validation',
            results,
            violations: result.violations,
          });
        }
      }

      // Attach results to request
      req.fileValidationResults = results;

      next();
    };
  }

  /**
   * Get safe file types configuration
   */
  public static getSafeImageTypes(): FileUploadOptions {
    return {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      requireMagicBytesValidation: true,
      validateContent: true,
    };
  }

  public static getSafeDocumentTypes(): FileUploadOptions {
    return {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedExtensions: ['.pdf', '.txt', '.csv', '.docx', '.xlsx', '.pptx'],
      allowedMimeTypes: [
        'application/pdf',
        'text/plain',
        'text/csv',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ],
      requireMagicBytesValidation: true,
      validateContent: true,
    };
  }
}

/**
 * Singleton instance
 */
let fileUploadSecurityInstance: FileUploadSecurityService | null = null;

/**
 * Get singleton instance
 */
export function getFileUploadSecurity(
  options?: FileUploadOptions
): FileUploadSecurityService {
  if (!fileUploadSecurityInstance) {
    fileUploadSecurityInstance = new FileUploadSecurityService(options);
  }
  return fileUploadSecurityInstance;
}
