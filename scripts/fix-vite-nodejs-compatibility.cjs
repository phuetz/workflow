#!/usr/bin/env node

/**
 * Script de correction automatique pour le problème d'incompatibilité Node.js/Vite
 * Downgrade Vite 7.x vers 5.x (compatible avec Node.js 18)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(level, message) {
  const timestamp = new Date().toISOString();
  const color = {
    ERROR: colors.red,
    SUCCESS: colors.green,
    WARNING: colors.yellow,
    INFO: colors.blue,
  }[level] || colors.reset;

  console.log(`${color}[${timestamp}] [${level}]${colors.reset} ${message}`);
}

log('INFO', '========================================');
log('INFO', 'CORRECTION COMPATIBILITÉ NODE.JS / VITE');
log('INFO', '========================================');

// 1. Vérifier la version Node.js
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
log('INFO', `Version Node.js actuelle: ${nodeVersion}`);

if (majorVersion >= 20) {
  log('SUCCESS', 'Node.js 20+ détecté - Vite 7 devrait fonctionner');
  log('INFO', 'Pas de correction nécessaire, test du démarrage...');
  process.exit(0);
}

log('WARNING', `Node.js ${nodeVersion} détecté - Incompatible avec Vite 7.0`);
log('INFO', 'Downgrade de Vite vers la version 5.x...');

// 2. Sauvegarder package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJsonBackup = path.join(__dirname, '..', 'package.json.backup-vite-fix');

try {
  log('INFO', 'Sauvegarde de package.json...');
  fs.copyFileSync(packageJsonPath, packageJsonBackup);
  log('SUCCESS', `✓ Backup créé: ${packageJsonBackup}`);
} catch (error) {
  log('ERROR', `Erreur lors de la sauvegarde: ${error.message}`);
  process.exit(1);
}

// 3. Lire package.json
let packageJson;
try {
  const content = fs.readFileSync(packageJsonPath, 'utf-8');
  packageJson = JSON.parse(content);
} catch (error) {
  log('ERROR', `Erreur lors de la lecture de package.json: ${error.message}`);
  process.exit(1);
}

// 4. Modifier les versions
log('INFO', 'Mise à jour des versions de dépendances...');

const updates = {
  'vite': '^5.4.11', // Dernière version stable de Vite 5
  '@vitejs/plugin-react': '^4.3.3', // Compatible avec Vite 5
};

let changed = false;

// Mettre à jour devDependencies
if (packageJson.devDependencies) {
  for (const [pkg, version] of Object.entries(updates)) {
    if (packageJson.devDependencies[pkg]) {
      const oldVersion = packageJson.devDependencies[pkg];
      packageJson.devDependencies[pkg] = version;
      log('INFO', `  ${pkg}: ${oldVersion} → ${version}`);
      changed = true;
    }
  }
}

// Mettre à jour dependencies si nécessaire
if (packageJson.dependencies) {
  for (const [pkg, version] of Object.entries(updates)) {
    if (packageJson.dependencies[pkg]) {
      const oldVersion = packageJson.dependencies[pkg];
      packageJson.dependencies[pkg] = version;
      log('INFO', `  ${pkg}: ${oldVersion} → ${version}`);
      changed = true;
    }
  }
}

if (!changed) {
  log('WARNING', 'Aucune dépendance Vite trouvée dans package.json');
}

// 5. Écrire le nouveau package.json
try {
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  log('SUCCESS', '✓ package.json mis à jour');
} catch (error) {
  log('ERROR', `Erreur lors de l'écriture de package.json: ${error.message}`);
  // Restaurer le backup
  fs.copyFileSync(packageJsonBackup, packageJsonPath);
  log('INFO', 'Backup restauré');
  process.exit(1);
}

// 6. Supprimer node_modules et package-lock.json pour forcer la réinstallation
log('INFO', 'Nettoyage des dépendances...');

const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
const packageLockPath = path.join(__dirname, '..', 'package-lock.json');

try {
  // Sauvegarder package-lock.json
  if (fs.existsSync(packageLockPath)) {
    const lockBackup = path.join(__dirname, '..', 'package-lock.json.backup-vite-fix');
    fs.copyFileSync(packageLockPath, lockBackup);
    log('INFO', `Backup de package-lock.json créé: ${lockBackup}`);
  }

  // Note: On ne supprime PAS node_modules car c'est très long
  // On va juste faire npm install qui mettra à jour les packages nécessaires
  log('INFO', 'Suppression de package-lock.json...');
  if (fs.existsSync(packageLockPath)) {
    fs.unlinkSync(packageLockPath);
    log('SUCCESS', '✓ package-lock.json supprimé');
  }
} catch (error) {
  log('WARNING', `Erreur lors du nettoyage: ${error.message}`);
}

// 7. Installer les nouvelles dépendances
log('INFO', 'Installation des dépendances (cela peut prendre quelques minutes)...');
log('INFO', 'Commande: npm install');

try {
  execSync('npm install', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
  log('SUCCESS', '✓✓✓ Dépendances installées avec succès !');
} catch (error) {
  log('ERROR', '✗✗✗ Erreur lors de l\'installation des dépendances');
  log('ERROR', 'Vous pouvez essayer manuellement: npm install');
  process.exit(1);
}

// 8. Résumé
log('INFO', '========================================');
log('SUCCESS', '✓✓✓ CORRECTION TERMINÉE AVEC SUCCÈS');
log('INFO', '========================================');
log('INFO', 'Changements effectués:');
log('INFO', '  • Vite 7.x → Vite 5.4.11');
log('INFO', '  • @vitejs/plugin-react mis à jour');
log('INFO', '  • Dépendances réinstallées');
log('INFO', '');
log('INFO', 'Fichiers de backup créés:');
log('INFO', `  • ${packageJsonBackup}`);
log('INFO', '');
log('INFO', 'Prochaines étapes:');
log('INFO', '  1. Tester le démarrage: npm run dev:frontend');
log('INFO', '  2. Si tout fonctionne, vous pouvez supprimer les backups');
log('INFO', '  3. Si problème, restaurer: cp package.json.backup-vite-fix package.json');
log('INFO', '========================================');

process.exit(0);
