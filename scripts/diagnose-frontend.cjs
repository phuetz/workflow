#!/usr/bin/env node

/**
 * Script de diagnostic complet pour le démarrage du frontend
 * Identifie tous les problèmes bloquants avec logs détaillés
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Couleurs pour les logs
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const color = {
    ERROR: colors.red,
    SUCCESS: colors.green,
    WARNING: colors.yellow,
    INFO: colors.blue,
    DEBUG: colors.magenta,
  }[level] || colors.reset;

  console.log(`${color}[${timestamp}] [${level}]${colors.reset} ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }

  // Écrire dans un fichier de log
  const logFile = path.join(__dirname, '..', 'frontend-diagnostic.log');
  const logEntry = `[${timestamp}] [${level}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n`;
  fs.appendFileSync(logFile, logEntry);
}

// Nettoyer le fichier de log au démarrage
const logFile = path.join(__dirname, '..', 'frontend-diagnostic.log');
if (fs.existsSync(logFile)) {
  fs.unlinkSync(logFile);
}

log('INFO', '========================================');
log('INFO', 'DIAGNOSTIC DE DÉMARRAGE FRONTEND');
log('INFO', '========================================');

let hasErrors = false;
const diagnosticResults = {
  nodeVersion: null,
  npmVersion: null,
  dependencies: {},
  viteConfig: null,
  tsConfig: null,
  entryPoints: {},
  errors: [],
  warnings: [],
};

// 1. Vérifier la version de Node.js
try {
  log('INFO', '1. Vérification de la version Node.js...');
  const nodeVersion = process.version;
  diagnosticResults.nodeVersion = nodeVersion;

  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  log('INFO', `Version Node.js détectée: ${nodeVersion}`);

  if (majorVersion < 20) {
    hasErrors = true;
    const error = `ERREUR CRITIQUE: Vite 7.0 requiert Node.js 20.19+ ou 22.12+. Version actuelle: ${nodeVersion}`;
    diagnosticResults.errors.push(error);
    log('ERROR', error);
    log('WARNING', 'Solutions possibles:');
    log('WARNING', '  1. Mettre à jour Node.js: https://nodejs.org/');
    log('WARNING', '  2. Utiliser NVM pour gérer les versions: nvm install 20 && nvm use 20');
    log('WARNING', '  3. Downgrader Vite à la version 5.x (compatible Node 18)');
  } else {
    log('SUCCESS', `✓ Version Node.js compatible: ${nodeVersion}`);
  }
} catch (error) {
  hasErrors = true;
  const errorMsg = `Erreur lors de la vérification de Node.js: ${error.message}`;
  diagnosticResults.errors.push(errorMsg);
  log('ERROR', errorMsg);
}

// 2. Vérifier la version de npm
try {
  log('INFO', '2. Vérification de la version npm...');
  const npmVersion = execSync('npm --version', { encoding: 'utf-8' }).trim();
  diagnosticResults.npmVersion = npmVersion;
  log('SUCCESS', `✓ Version npm: ${npmVersion}`);
} catch (error) {
  const errorMsg = `Erreur lors de la vérification de npm: ${error.message}`;
  diagnosticResults.warnings.push(errorMsg);
  log('WARNING', errorMsg);
}

// 3. Vérifier les dépendances critiques
try {
  log('INFO', '3. Vérification des dépendances critiques...');
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

  const criticalDeps = {
    vite: packageJson.devDependencies?.vite || packageJson.dependencies?.vite,
    react: packageJson.dependencies?.react,
    'react-dom': packageJson.dependencies?.['react-dom'],
    typescript: packageJson.devDependencies?.typescript,
  };

  diagnosticResults.dependencies = criticalDeps;

  for (const [name, version] of Object.entries(criticalDeps)) {
    if (version) {
      log('INFO', `  ${name}: ${version}`);

      // Vérifier si le module est installé
      const modulePath = path.join(__dirname, '..', 'node_modules', name);
      if (fs.existsSync(modulePath)) {
        log('SUCCESS', `  ✓ ${name} installé`);
      } else {
        hasErrors = true;
        const error = `Module manquant: ${name}`;
        diagnosticResults.errors.push(error);
        log('ERROR', `  ✗ ${error}`);
      }
    } else {
      const warning = `Dépendance non trouvée dans package.json: ${name}`;
      diagnosticResults.warnings.push(warning);
      log('WARNING', `  ! ${warning}`);
    }
  }
} catch (error) {
  hasErrors = true;
  const errorMsg = `Erreur lors de la vérification des dépendances: ${error.message}`;
  diagnosticResults.errors.push(errorMsg);
  log('ERROR', errorMsg);
}

// 4. Vérifier la configuration Vite
try {
  log('INFO', '4. Vérification de la configuration Vite...');
  const viteConfigPath = path.join(__dirname, '..', 'vite.config.ts');

  if (fs.existsSync(viteConfigPath)) {
    const viteConfig = fs.readFileSync(viteConfigPath, 'utf-8');
    diagnosticResults.viteConfig = {
      exists: true,
      path: viteConfigPath,
      size: viteConfig.length,
    };
    log('SUCCESS', `✓ vite.config.ts trouvé (${viteConfig.length} caractères)`);

    // Vérifier les imports problématiques
    if (viteConfig.includes('crypto.hash')) {
      const warning = 'crypto.hash détecté dans vite.config.ts - incompatible avec Node.js 18';
      diagnosticResults.warnings.push(warning);
      log('WARNING', warning);
    }
  } else {
    hasErrors = true;
    const error = 'vite.config.ts non trouvé';
    diagnosticResults.errors.push(error);
    log('ERROR', error);
  }
} catch (error) {
  hasErrors = true;
  const errorMsg = `Erreur lors de la vérification de vite.config.ts: ${error.message}`;
  diagnosticResults.errors.push(errorMsg);
  log('ERROR', errorMsg);
}

// 5. Vérifier la configuration TypeScript
try {
  log('INFO', '5. Vérification de la configuration TypeScript...');
  const tsConfigPath = path.join(__dirname, '..', 'tsconfig.json');

  if (fs.existsSync(tsConfigPath)) {
    const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf-8'));
    diagnosticResults.tsConfig = {
      exists: true,
      compilerOptions: tsConfig.compilerOptions,
    };
    log('SUCCESS', `✓ tsconfig.json trouvé`);
    log('INFO', `  Target: ${tsConfig.compilerOptions?.target || 'non spécifié'}`);
    log('INFO', `  Module: ${tsConfig.compilerOptions?.module || 'non spécifié'}`);
  } else {
    const warning = 'tsconfig.json non trouvé';
    diagnosticResults.warnings.push(warning);
    log('WARNING', warning);
  }
} catch (error) {
  const errorMsg = `Erreur lors de la vérification de tsconfig.json: ${error.message}`;
  diagnosticResults.warnings.push(errorMsg);
  log('WARNING', errorMsg);
}

// 6. Vérifier les points d'entrée
try {
  log('INFO', '6. Vérification des points d\'entrée...');

  const entryPoints = [
    { name: 'index.html', path: path.join(__dirname, '..', 'index.html') },
    { name: 'src/main.tsx', path: path.join(__dirname, '..', 'src', 'main.tsx') },
    { name: 'src/App.tsx', path: path.join(__dirname, '..', 'src', 'App.tsx') },
  ];

  for (const entry of entryPoints) {
    if (fs.existsSync(entry.path)) {
      const content = fs.readFileSync(entry.path, 'utf-8');
      diagnosticResults.entryPoints[entry.name] = {
        exists: true,
        size: content.length,
      };
      log('SUCCESS', `✓ ${entry.name} trouvé (${content.length} caractères)`);
    } else {
      hasErrors = true;
      const error = `Point d'entrée manquant: ${entry.name}`;
      diagnosticResults.errors.push(error);
      log('ERROR', `✗ ${error}`);
    }
  }
} catch (error) {
  hasErrors = true;
  const errorMsg = `Erreur lors de la vérification des points d'entrée: ${error.message}`;
  diagnosticResults.errors.push(errorMsg);
  log('ERROR', errorMsg);
}

// 7. Vérifier les variables d'environnement
try {
  log('INFO', '7. Vérification des variables d\'environnement...');
  const envFiles = ['.env', '.env.local', '.env.development'];

  for (const envFile of envFiles) {
    const envPath = path.join(__dirname, '..', envFile);
    if (fs.existsSync(envPath)) {
      log('INFO', `  Trouvé: ${envFile}`);
    }
  }
} catch (error) {
  const errorMsg = `Erreur lors de la vérification des env: ${error.message}`;
  diagnosticResults.warnings.push(errorMsg);
  log('WARNING', errorMsg);
}

// 8. Vérifier les ports
try {
  log('INFO', '8. Vérification des ports...');
  const netstat = execSync('netstat -tuln 2>/dev/null || ss -tuln 2>/dev/null || echo "non disponible"', { encoding: 'utf-8' });

  if (netstat.includes(':3000')) {
    const warning = 'ATTENTION: Le port 3000 est déjà utilisé';
    diagnosticResults.warnings.push(warning);
    log('WARNING', warning);
    log('INFO', 'Processus utilisant le port 3000:');
    try {
      const lsof = execSync('lsof -i :3000 2>/dev/null || echo "lsof non disponible"', { encoding: 'utf-8' });
      log('INFO', lsof);
    } catch (e) {
      // Ignorer si lsof n'est pas disponible
    }
  } else {
    log('SUCCESS', '✓ Port 3000 disponible');
  }
} catch (error) {
  const errorMsg = `Erreur lors de la vérification des ports: ${error.message}`;
  diagnosticResults.warnings.push(errorMsg);
  log('WARNING', errorMsg);
}

// 9. Résumé final
log('INFO', '========================================');
log('INFO', 'RÉSUMÉ DU DIAGNOSTIC');
log('INFO', '========================================');

if (hasErrors) {
  log('ERROR', `❌ ${diagnosticResults.errors.length} erreur(s) critique(s) détectée(s)`);
  diagnosticResults.errors.forEach((error, index) => {
    log('ERROR', `  ${index + 1}. ${error}`);
  });
}

if (diagnosticResults.warnings.length > 0) {
  log('WARNING', `⚠️  ${diagnosticResults.warnings.length} avertissement(s)`);
  diagnosticResults.warnings.forEach((warning, index) => {
    log('WARNING', `  ${index + 1}. ${warning}`);
  });
}

if (!hasErrors) {
  log('SUCCESS', '✅ Aucune erreur critique détectée');
} else {
  log('ERROR', '');
  log('ERROR', 'ACTIONS RECOMMANDÉES:');
  log('ERROR', '1. Corriger les erreurs critiques ci-dessus');
  log('ERROR', '2. Relancer ce script pour vérifier');
  log('ERROR', '3. Consulter frontend-diagnostic.log pour les détails complets');
}

// Sauvegarder le résultat complet
const resultPath = path.join(__dirname, '..', 'frontend-diagnostic.json');
fs.writeFileSync(resultPath, JSON.stringify(diagnosticResults, null, 2));
log('INFO', `Résultats complets sauvegardés dans: ${resultPath}`);

log('INFO', '========================================');

process.exit(hasErrors ? 1 : 0);
