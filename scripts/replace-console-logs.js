#!/usr/bin/env node

/**
 * Script to replace console.log statements with proper logger calls
 * Usage: node scripts/replace-console-logs.js [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dryRun = process.argv.includes('--dry-run');

// Patterns to replace
const replacements = [
  {
    // console.log('message') -> logger.info('message')
    pattern: /console\.log\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
    replacement: "logger.info('$1')"
  },
  {
    // console.log('message', data) -> logger.info('message', data)
    pattern: /console\.log\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^)]+)\)/g,
    replacement: "logger.info('$1', $2)"
  },
  {
    // console.error('message') -> logger.error('message')
    pattern: /console\.error\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
    replacement: "logger.error('$1')"
  },
  {
    // console.error('message', error) -> logger.error('message', error)
    pattern: /console\.error\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^)]+)\)/g,
    replacement: "logger.error('$1', $2)"
  },
  {
    // console.warn('message') -> logger.warn('message')
    pattern: /console\.warn\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
    replacement: "logger.warn('$1')"
  },
  {
    // console.warn('message', data) -> logger.warn('message', data)
    pattern: /console\.warn\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^)]+)\)/g,
    replacement: "logger.warn('$1', $2)"
  },
  {
    // console.info('message') -> logger.info('message')
    pattern: /console\.info\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
    replacement: "logger.info('$1')"
  },
  {
    // console.debug('message') -> logger.debug('message')
    pattern: /console\.debug\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
    replacement: "logger.debug('$1')"
  }
];

// Files/directories to exclude
const excludePatterns = [
  'node_modules',
  'build',
  'dist',
  '.git',
  'scripts',
  'LoggingService.ts', // Don't modify the logging service itself
  '.test.',
  '.spec.'
];

// File extensions to process
const includeExtensions = ['.ts', '.tsx', '.js', '.jsx'];

function shouldProcessFile(filePath) {
  // Check if file should be excluded
  if (excludePatterns.some(pattern => filePath.includes(pattern))) {
    return false;
  }
  
  // Check if file has correct extension
  const ext = path.extname(filePath);
  return includeExtensions.includes(ext);
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let changeCount = 0;
    
    // Check if file already imports logger
    const hasLoggerImport = content.includes('from \'../services/LoggingService\'') ||
                           content.includes('from \'./services/LoggingService\'') ||
                           content.includes('from \'./LoggingService\'') ||
                           content.includes('{ logger }');
    
    // Apply replacements
    let newContent = content;
    replacements.forEach(({ pattern, replacement }) => {
      const matches = content.match(pattern);
      if (matches) {
        newContent = newContent.replace(pattern, replacement);
        changeCount += matches.length;
        modified = true;
      }
    });
    
    if (modified) {
      // Add import if needed
      if (!hasLoggerImport && newContent.includes('logger.')) {
        // Determine relative path to LoggingService
        const relativePath = path.relative(path.dirname(filePath), 'src/services/LoggingService');
        const importPath = relativePath.startsWith('.') ? relativePath : './' + relativePath;
        const importStatement = `import { logger } from '${importPath.replace(/\\/g, '/').replace('.ts', '')}';\n`;
        
        // Add import after other imports or at the beginning
        const importMatch = newContent.match(/^(import .+;\n)+/m);
        if (importMatch) {
          const lastImportIndex = importMatch.index + importMatch[0].length;
          newContent = newContent.slice(0, lastImportIndex) + importStatement + newContent.slice(lastImportIndex);
        } else {
          newContent = importStatement + newContent;
        }
      }
      
      if (!dryRun) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`✅ Updated ${filePath} (${changeCount} replacements)`);
      } else {
        console.log(`Would update ${filePath} (${changeCount} replacements)`);
      }
      
      return changeCount;
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
  
  return 0;
}

function processDirectory(dirPath) {
  let totalChanges = 0;
  
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory() && !excludePatterns.includes(item)) {
        totalChanges += processDirectory(itemPath);
      } else if (stats.isFile() && shouldProcessFile(itemPath)) {
        totalChanges += processFile(itemPath);
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${dirPath}:`, error.message);
  }
  
  return totalChanges;
}

// Main execution
console.log(dryRun ? '🔍 Running in DRY RUN mode...' : '🚀 Replacing console.log statements...');
console.log('');

const srcPath = path.join(process.cwd(), 'src');
const totalChanges = processDirectory(srcPath);

console.log('');
console.log(`${dryRun ? 'Would make' : 'Made'} ${totalChanges} total replacements`);

if (dryRun) {
  console.log('');
  console.log('Run without --dry-run to apply changes');
}