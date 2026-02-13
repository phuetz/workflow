#!/usr/bin/env node

/**
 * Script to replace console.log statements with proper logger calls
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');

// Patterns to search for TypeScript/TSX files
const patterns = [
  'src/**/*.ts',
  'src/**/*.tsx'
];

// Directories to exclude
const excludeDirs = [
  '__tests__',
  '__mocks__',
  'test-setup'
];

// Counter for replacements
let totalReplacements = 0;
let filesModified = 0;

// Function to process a single file
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Skip test files
  if (filePath.includes('test') || filePath.includes('spec')) {
    return;
  }
  
  // Skip files that already import logger
  const hasLoggerImport = content.includes("import { logger }") || 
                          content.includes("import logger") ||
                          content.includes("from '../utils/logger'") ||
                          content.includes("from './logger'");
  
  // Replace console.log with logger.debug
  let replacements = 0;
  
  // Replace console.log
  content = content.replace(/console\.log\(/g, () => {
    replacements++;
    return 'logger.debug(';
  });
  
  // Replace console.error with logger.error
  content = content.replace(/console\.error\(/g, () => {
    replacements++;
    return 'logger.error(';
  });
  
  // Replace console.warn with logger.warn
  content = content.replace(/console\.warn\(/g, () => {
    replacements++;
    return 'logger.warn(';
  });
  
  // Replace console.info with logger.info
  content = content.replace(/console\.info\(/g, () => {
    replacements++;
    return 'logger.info(';
  });
  
  // If we made replacements and don't have logger import, add it
  if (replacements > 0 && !hasLoggerImport) {
    // Find the right import path based on file location
    const fileDir = path.dirname(filePath);
    const relativePathToUtils = path.relative(fileDir, path.join(SRC_DIR, 'utils'));
    let importPath = path.join(relativePathToUtils, 'logger').replace(/\\/g, '/');
    
    // Ensure import path starts with ./
    if (!importPath.startsWith('.')) {
      importPath = './' + importPath;
    }
    
    // Add import at the top of the file (after any existing imports)
    const importStatement = `import { logger } from '${importPath}';\n`;
    
    // Find where to insert the import
    const firstImportMatch = content.match(/^import /m);
    if (firstImportMatch) {
      // Add after the last import
      const lastImportMatch = content.match(/^import [^;]+;?\n/gm);
      if (lastImportMatch) {
        const lastImport = lastImportMatch[lastImportMatch.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        content = content.slice(0, lastImportIndex + lastImport.length) + 
                  importStatement + 
                  content.slice(lastImportIndex + lastImport.length);
      }
    } else {
      // No imports found, add at the beginning
      content = importStatement + '\n' + content;
    }
  }
  
  // Write back only if changes were made
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalReplacements += replacements;
    filesModified++;
    console.log(`✓ Modified ${filePath} (${replacements} replacements)`);
  }
}

// Main execution
console.log('🔍 Searching for console.log statements to replace...\n');

patterns.forEach(pattern => {
  const files = glob.sync(pattern, {
    cwd: ROOT_DIR,
    absolute: true,
    ignore: excludeDirs.map(dir => `**/${dir}/**`)
  });
  
  files.forEach(processFile);
});

console.log('\n📊 Summary:');
console.log(`Files modified: ${filesModified}`);
console.log(`Total replacements: ${totalReplacements}`);
console.log('\n✅ Cleanup complete!');

// Create or update logger utility if it doesn't exist
const loggerPath = path.join(SRC_DIR, 'utils', 'logger.ts');
if (!fs.existsSync(loggerPath)) {
  const loggerContent = `/**
 * Logger utility for consistent logging across the application
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  
  debug(...args: any[]): void {
    if (this.isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  }
  
  info(...args: any[]): void {
    console.info('[INFO]', ...args);
  }
  
  warn(...args: any[]): void {
    console.warn('[WARN]', ...args);
  }
  
  error(...args: any[]): void {
    console.error('[ERROR]', ...args);
  }
  
  log(level: LogLevel, ...args: any[]): void {
    switch (level) {
      case LogLevel.DEBUG:
        this.debug(...args);
        break;
      case LogLevel.INFO:
        this.info(...args);
        break;
      case LogLevel.WARN:
        this.warn(...args);
        break;
      case LogLevel.ERROR:
        this.error(...args);
        break;
    }
  }
}

export const logger = new Logger();
export default logger;
`;
  
  fs.writeFileSync(loggerPath, loggerContent, 'utf8');
  console.log('\n✅ Created logger utility at', loggerPath);
}