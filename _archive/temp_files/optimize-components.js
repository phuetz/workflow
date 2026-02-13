#!/usr/bin/env node

/**
 * Script d'optimisation automatique des composants React
 * Applique React.memo, useCallback, useMemo de manière systématique
 */

const fs = require('fs');
const path = require('path');

// Liste des composants à optimiser
const componentsToOptimize = [
  'CredentialsManager.tsx',
  'WebhookManager.tsx',
  'NotificationCenter.tsx',
  'VersionControlHub.tsx',
  'MarketplaceHub.tsx',
  'ScheduleManager.tsx',
  'VoiceAssistant.tsx',
  'CostOptimizerPro.tsx',
  'ErrorPredictionEngine.tsx',
  'ImportExportDashboard.tsx',
  'SmartSuggestions.tsx',
  'PerformanceDashboard.tsx'
];

const componentsDir = path.join(__dirname, 'src', 'components');

// Patterns d'optimisation
const patterns = {
  // Ajouter useCallback, useMemo aux imports
  addHooks: (content) => {
    if (!content.includes('useCallback') || !content.includes('useMemo')) {
      content = content.replace(
        /import React(?:, \{ ([^}]+) \})?/,
        (match, hooks) => {
          const hooksList = hooks ? hooks.split(',').map(h => h.trim()) : [];
          if (!hooksList.includes('useCallback')) hooksList.push('useCallback');
          if (!hooksList.includes('useMemo')) hooksList.push('useMemo');
          return `import React, { ${hooksList.join(', ')} }`;
        }
      );
    }
    return content;
  },

  // Wrapper les event handlers avec useCallback
  wrapHandlers: (content) => {
    // Identifier les fonctions qui commencent par handle ou on
    const handlerPattern = /const (handle\w+|on\w+)\s*=\s*(\([^)]*\)|\w+)\s*=>\s*{/g;

    content = content.replace(handlerPattern, (match, name, params) => {
      // Si déjà wrapped, ne pas modifier
      if (content.includes(`useCallback((${params}) =>`)) {
        return match;
      }
      return `const ${name} = useCallback(${params} => {`;
    });

    return content;
  },

  // Wrapper les computed values avec useMemo
  wrapComputedValues: (content) => {
    // Identifier les variables qui dépendent de calculs
    const computedPattern = /const (\w+)\s*=\s*(?!use|React\.|const|let|var)([^;]+);/g;

    content = content.replace(computedPattern, (match, name, value) => {
      // Skip si déjà wrapped ou si c'est simple
      if (content.includes(`useMemo(() =>`)) {
        return match;
      }

      // Ne wrapper que si le calcul est complexe (contient map, filter, reduce, etc)
      if (value.includes('.map(') || value.includes('.filter(') ||
          value.includes('.reduce(') || value.includes('.sort(')) {
        return `const ${name} = useMemo(() => ${value}, []);`;
      }

      return match;
    });

    return content;
  },

  // Convertir function component en const avec React.memo
  convertToMemo: (content) => {
    // Pattern: export default function ComponentName()
    const defaultExportPattern = /export default function (\w+)\s*\([^)]*\)\s*{/;
    const match = content.match(defaultExportPattern);

    if (match) {
      const componentName = match[1];

      // Convertir en const + React.FC
      content = content.replace(
        defaultExportPattern,
        `const ${componentName}: React.FC = () => {`
      );

      // Ajouter export avec React.memo à la fin
      content = content.replace(
        /}\s*$/,
        `};\n\nexport default React.memo(${componentName});`
      );
    }

    return content;
  },

  // Ajouter displayName pour React.memo
  addDisplayName: (content, componentName) => {
    if (!content.includes('.displayName =')) {
      content = content.replace(
        /export default React\.memo\((\w+)\);/,
        `export default React.memo($1);\n\n$1.displayName = '${componentName}';`
      );
    }
    return content;
  }
};

// Fonction principale d'optimisation
function optimizeComponent(filePath) {
  const componentName = path.basename(filePath, '.tsx');
  console.log(`\nOptimisation de ${componentName}...`);

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Appliquer les optimisations
    content = patterns.addHooks(content);
    content = patterns.convertToMemo(content);
    content = patterns.wrapHandlers(content);
    content = patterns.wrapComputedValues(content);
    content = patterns.addDisplayName(content, componentName);

    // Sauvegarder si modifié
    if (content !== originalContent) {
      // Créer backup
      fs.writeFileSync(filePath + '.backup', originalContent);

      // Écrire version optimisée
      fs.writeFileSync(filePath, content);

      console.log(`✓ ${componentName} optimisé avec succès`);
      console.log(`  - Backup créé: ${componentName}.backup`);

      return true;
    } else {
      console.log(`⊘ ${componentName} déjà optimisé`);
      return false;
    }
  } catch (error) {
    console.error(`✗ Erreur lors de l'optimisation de ${componentName}:`, error.message);
    return false;
  }
}

// Exécution
console.log('=== Optimisation automatique des composants React ===\n');

let optimizedCount = 0;
let skippedCount = 0;
let errorCount = 0;

componentsToOptimize.forEach(component => {
  const filePath = path.join(componentsDir, component);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠ ${component} introuvable, ignoré`);
    skippedCount++;
    return;
  }

  const result = optimizeComponent(filePath);
  if (result === true) {
    optimizedCount++;
  } else if (result === false) {
    skippedCount++;
  } else {
    errorCount++;
  }
});

console.log('\n=== Résumé ===');
console.log(`Composants optimisés: ${optimizedCount}`);
console.log(`Composants ignorés: ${skippedCount}`);
console.log(`Erreurs: ${errorCount}`);

if (optimizedCount > 0) {
  console.log('\n⚠ IMPORTANT: Vérifiez que le code compile avant de commit!');
  console.log('Commande: npm run typecheck');
}
