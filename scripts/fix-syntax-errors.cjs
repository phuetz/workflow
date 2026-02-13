#!/usr/bin/env node

/**
 * Script to automatically fix common syntax errors in TypeScript/TSX files
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Common patterns that cause syntax errors
const fixes = [
  {
    name: 'Missing const/let/var declaration',
    pattern: /^\s+['"`][\w\s]+['"`][,;]?\s*$/gm,
    fix: (match) => {
      // Check if it's part of an array
      if (match.trim().endsWith(',')) {
        return match; // Keep as is if it's in an array
      }
      return match; // Can't auto-fix without context
    }
  },
  {
    name: 'Floating function body',
    pattern: /^\s+e\.preventDefault\(\);/gm,
    fix: (match, content, index) => {
      // Look for context to determine the function
      const before = content.substring(Math.max(0, index - 200), index);
      if (!before.includes('const') && !before.includes('function')) {
        return '  const handleSubmit = (e: React.FormEvent) => {\n' + match;
      }
      return match;
    }
  },
  {
    name: 'Missing function declaration',
    pattern: /^\s+if\s*\([^)]+\)\s+return\s+[^;]+;/gm,
    fix: (match, content, index) => {
      const before = content.substring(Math.max(0, index - 100), index);
      if (!before.includes('=>') && !before.includes('function')) {
        // This might be a floating function body
        return `  const formatValue = (value: any): string => {\n${match}`;
      }
      return match;
    }
  }
];

function fixFile(filePath) {
  console.log(`Checking ${filePath}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Apply fixes
  for (const fix of fixes) {
    const matches = content.match(fix.pattern);
    if (matches) {
      console.log(`  Found ${fix.name} pattern`);
      content = content.replace(fix.pattern, (match, ...args) => {
        const index = args[args.length - 2];
        const result = fix.fix(match, content, index);
        if (result !== match) {
          modified = true;
          console.log(`  Applied fix for ${fix.name}`);
        }
        return result;
      });
    }
  }
  
  // Check brace balance
  let braceDepth = 0;
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const opens = (line.match(/{/g) || []).length;
    const closes = (line.match(/}/g) || []).length;
    braceDepth += opens - closes;
  }
  
  if (braceDepth > 0) {
    console.log(`  Missing ${braceDepth} closing brace(s), adding...`);
    content += '\n' + '}'.repeat(braceDepth) + '\n';
    modified = true;
  } else if (braceDepth < 0) {
    console.log(`  Extra ${-braceDepth} closing brace(s)`);
    // Remove extra closing braces from the end
    const extraBraces = -braceDepth;
    for (let i = 0; i < extraBraces; i++) {
      content = content.replace(/}\s*$/, '');
    }
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✓ Fixed ${filePath}`);
    return true;
  }
  
  return false;
}

// Get list of files with errors from build output
function getErrorFiles() {
  try {
    const buildOutput = execSync('npm run build 2>&1', { encoding: 'utf8' });
    const errorPattern = /file: ([^\s]+\.tsx?)/g;
    const files = new Set();
    let match;
    
    while ((match = errorPattern.exec(buildOutput)) !== null) {
      files.add(match[1]);
    }
    
    return Array.from(files);
  } catch (error) {
    // Build failed, parse error output
    const output = error.stdout + error.stderr;
    const errorPattern = /file: ([^\s]+\.tsx?):/g;
    const files = new Set();
    let match;
    
    while ((match = errorPattern.exec(output)) !== null) {
      files.add(match[1]);
    }
    
    return Array.from(files);
  }
}

// Main execution
console.log('🔧 Scanning for syntax errors...\n');

const errorFiles = getErrorFiles();

if (errorFiles.length === 0) {
  console.log('✅ No syntax errors found!');
  process.exit(0);
}

console.log(`Found ${errorFiles.length} files with potential errors:\n`);

let fixedCount = 0;
for (const file of errorFiles) {
  if (fs.existsSync(file)) {
    if (fixFile(file)) {
      fixedCount++;
    }
  } else {
    console.log(`  ⚠️  File not found: ${file}`);
  }
}

console.log(`\n✅ Fixed ${fixedCount} files`);

// Run build again to check
console.log('\n🔨 Running build to verify fixes...\n');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('\n✅ Build successful!');
} catch (error) {
  console.log('\n⚠️  Build still has errors. Manual intervention may be required.');
  process.exit(1);
}