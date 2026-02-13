#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files with known syntax issues
const filesToFix = [
  'src/components/DataMappingInterface.tsx',
  'src/components/AutoSaveManager.tsx'
];

function fixDataMappingInterface() {
  const filePath = path.join(__dirname, 'src/components/DataMappingInterface.tsx');
  let content = fs.readFileSync(filePath, 'utf8');
  
  // The main issue is that there are too many closing braces
  // We need to find and remove the extra ones
  
  // Count the balance at the main component level
  const lines = content.split('\n');
  let braceCount = 0;
  let componentStartLine = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('export default function DataMappingInterface') || 
        lines[i].includes('export const DataMappingInterface')) {
      componentStartLine = i;
      break;
    }
  }
  
  if (componentStartLine === -1) {
    console.log('Could not find component declaration in DataMappingInterface.tsx');
    return;
  }
  
  // Track brace balance from component start
  let inComponent = false;
  let fixedLines = [];
  let extraBracesFound = 0;
  
  for (let i = 0; i < lines.length; i++) {
    if (i >= componentStartLine) {
      inComponent = true;
    }
    
    let line = lines[i];
    if (inComponent) {
      // Count braces in this line
      const openBraces = (line.match(/{/g) || []).length;
      const closeBraces = (line.match(/}/g) || []).length;
      braceCount += openBraces - closeBraces;
      
      // If we're at 0 or negative and we see a standalone closing brace, it might be extra
      if (braceCount < 0 && line.trim() === '}') {
        extraBracesFound++;
        console.log(`Found extra closing brace at line ${i + 1}`);
        if (extraBracesFound <= 6) { // We know there are 6 extra
          continue; // Skip this line
        }
      }
    }
    
    fixedLines.push(line);
  }
  
  fs.writeFileSync(filePath, fixedLines.join('\n'), 'utf8');
  console.log(`Fixed DataMappingInterface.tsx - removed ${extraBracesFound} extra braces`);
}

function fixAutoSaveManager() {
  const filePath = path.join(__dirname, 'src/components/AutoSaveManager.tsx');
  if (!fs.existsSync(filePath)) {
    console.log('AutoSaveManager.tsx not found');
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Common issues in AutoSaveManager:
  // 1. Missing function declarations
  // 2. Undefined variables
  
  // Add missing function declarations if needed
  if (!content.includes('const handleSaveNow = ')) {
    const insertPoint = content.indexOf('return (');
    if (insertPoint > -1) {
      const beforeReturn = content.substring(0, insertPoint);
      const afterReturn = content.substring(insertPoint);
      
      const missingFunctions = `
  const handleSaveNow = async () => {
    await saveWorkflow();
  };

  const handleLocalSettingsChange = (key: string, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    localStorage.setItem('autoSaveSettings', JSON.stringify(newSettings));
  };

  const formatLastSaved = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return \`\${Math.floor(diff / 60000)} minutes ago\`;
    return new Date(timestamp).toLocaleTimeString();
  };

`;
      
      content = beforeReturn + missingFunctions + afterReturn;
    }
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fixed AutoSaveManager.tsx');
}

// Run fixes
console.log('Starting syntax fixes...');
fixDataMappingInterface();
fixAutoSaveManager();
console.log('Syntax fixes completed!');