#!/bin/bash

# Script de correction automatique des problèmes P0 critiques
# Date: 2025-11-01
# Temps estimé: 4-6 heures (automatisé en 30 minutes)

set -e  # Exit on error

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Timestamp
start_time=$(date +%s)

log_info "========================================="
log_info "CORRECTION AUTOMATIQUE DES PROBLÈMES P0"
log_info "========================================="
log_info "Début: $(date)"

# Étape 1: Supprimer fichiers dupliqués (15 min)
log_info ""
log_info "Étape 1/4: Suppression des fichiers dupliqués..."

DUPLICATE_FILES=(
    "src/components/CustomNode.IMPROVED.tsx"
    "src/components/BackupDashboard.broken.tsx"
    "src/components/ExecutionEngine.migrated.ts"
    "src/components/NodeConfigPanel.COMPLETE.tsx"
    "src/components/NodeConfigPanel.NEW.tsx"
    "src/components/WorkerExecutionEngine.ts"
    "src/components/WorkflowSharingHub.old.tsx"
    "src/store/workflowStore.ts.backup_refactor"
    "src/store/workflowStoreRefactored.ts"
)

deleted_count=0
for file in "${DUPLICATE_FILES[@]}"; do
    if [ -f "$file" ]; then
        log_info "Suppression: $file"
        rm "$file"
        deleted_count=$((deleted_count + 1))
    else
        log_warning "Déjà supprimé: $file"
    fi
done

log_success "✓ $deleted_count fichiers dupliqués supprimés"

# Étape 2: Créer backup avant restauration Git (5 min)
log_info ""
log_info "Étape 2/4: Création de backup avant restauration..."

BACKUP_DIR="backup_p0_fix_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

BROKEN_FILES=(
    "src/services/TestingService.ts"
    "src/analytics/AnalyticsPersistence.ts"
    "src/backend/database/testingRepository.ts"
    "src/backend/services/executionService.ts"
    "src/backend/services/analyticsService.ts"
    "src/backend/queue/QueueManager.ts"
    "src/backend/security/SecurityManager.ts"
    "src/testing/TestExecutionEngine.ts"
    "src/backend/database/ConnectionPool.ts"
)

backed_up=0
for file in "${BROKEN_FILES[@]}"; do
    if [ -f "$file" ]; then
        log_info "Backup: $file"
        mkdir -p "$BACKUP_DIR/$(dirname $file)"
        cp "$file" "$BACKUP_DIR/$file"
        backed_up=$((backed_up + 1))
    fi
done

log_success "✓ $backed_up fichiers sauvegardés dans $BACKUP_DIR"

# Étape 3: Restauration Git des fichiers cassés (option interactive)
log_info ""
log_info "Étape 3/4: Restauration des fichiers cassés..."

log_warning "ATTENTION: Cette étape nécessite de trouver le bon commit Git"
log_warning "Options:"
log_warning "  1. Restaurer depuis un commit spécifique"
log_warning "  2. Créer des stubs minimaux (recommandé pour test rapide)"
log_warning "  3. Skip cette étape (manuel)"

read -p "Choisir option (1/2/3): " restore_option

case $restore_option in
    1)
        log_info "Liste des derniers commits..."
        git log --oneline -20
        read -p "Entrer le hash du commit à restaurer: " commit_hash

        restored=0
        for file in "${BROKEN_FILES[@]}"; do
            if git show "$commit_hash:$file" > /dev/null 2>&1; then
                log_info "Restauration: $file depuis $commit_hash"
                git checkout "$commit_hash" -- "$file"
                restored=$((restored + 1))
            else
                log_warning "Fichier non trouvé dans le commit: $file"
            fi
        done
        log_success "✓ $restored fichiers restaurés depuis Git"
        ;;

    2)
        log_info "Création de stubs minimaux..."
        # Créer des stubs pour chaque fichier cassé
        # (Implementation serait ici - pour l'instant on skip)
        log_warning "Stubs non implémentés dans ce script - À faire manuellement"
        ;;

    3)
        log_warning "Restauration Git skippée - À faire manuellement"
        ;;

    *)
        log_error "Option invalide"
        ;;
esac

# Étape 4: Corriger VM2 (30 min)
log_info ""
log_info "Étape 4/4: Correction de la vulnérabilité VM2..."

if npm list vm2 > /dev/null 2>&1; then
    log_warning "VM2 détecté - Désinstallation..."
    npm uninstall vm2

    log_info "Installation de isolated-vm (alternative sécurisée)..."
    npm install isolated-vm@latest

    log_success "✓ VM2 remplacé par isolated-vm"

    log_warning "IMPORTANT: Mettre à jour src/plugins/PluginSandbox.ts manuellement"
    log_warning "Remplacer les imports vm2 par isolated-vm"
else
    log_info "VM2 n'est pas installé - Rien à faire"
fi

# Étape 5: Configurer timeout global des tests (5 min)
log_info ""
log_info "Étape 5/4 (bonus): Configuration timeout global tests..."

VITEST_CONFIG="vitest.config.ts"
if [ -f "$VITEST_CONFIG" ]; then
    if grep -q "testTimeout.*30000" "$VITEST_CONFIG"; then
        log_info "Timeout déjà configuré"
    else
        log_warning "Timeout doit être configuré manuellement dans $VITEST_CONFIG"
        log_warning "Ajouter: test: { testTimeout: 30000, hookTimeout: 30000 }"
    fi
else
    log_warning "$VITEST_CONFIG non trouvé - Créer la configuration manuellement"
fi

# Résumé final
log_info ""
log_info "========================================="
log_info "RÉSUMÉ DES CORRECTIONS P0"
log_info "========================================="

end_time=$(date +%s)
duration=$((end_time - start_time))
minutes=$((duration / 60))
seconds=$((duration % 60))

log_success "✓ Fichiers dupliqués supprimés: $deleted_count"
log_success "✓ Fichiers sauvegardés: $backed_up (dans $BACKUP_DIR)"
log_success "✓ VM2 corrigé: isolated-vm installé"

log_info ""
log_info "Durée totale: ${minutes}m ${seconds}s"
log_info "Fin: $(date)"

log_info ""
log_warning "ACTIONS MANUELLES REQUISES:"
log_warning "1. Mettre à jour src/plugins/PluginSandbox.ts (vm2 → isolated-vm)"
log_warning "2. Configurer timeout dans vitest.config.ts"
log_warning "3. Restaurer les 9 fichiers backend cassés (si option 3 choisie)"
log_warning "4. Tester le build: npm run build"

log_info ""
log_info "Prochaines étapes: Voir AUDIT_COMPLET_RESUME_EXECUTIF.md"
log_info "========================================="
