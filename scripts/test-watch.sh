#!/bin/bash

# ============================================
# Test Watcher - Surveillance Automatique
# Relance les tests à chaque modification
# ============================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   👁  TEST WATCHER - Mode Surveillance      ║${NC}"
echo -e "${BLUE}║   Les tests se relancent automatiquement    ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Vérifier si inotify-tools est installé
if ! command -v inotifywait &> /dev/null; then
    echo -e "${YELLOW}⚠ inotify-tools n'est pas installé${NC}"
    echo "Installation recommandée: sudo apt-get install inotify-tools"
    echo ""
    echo "Utilisation du mode polling (plus lent)..."
    echo ""

    # Fallback: mode polling avec watch
    while true; do
        echo -e "${BLUE}🔍 Lancement des tests...${NC}"
        bash "$SCRIPT_DIR/quick-test.sh"

        echo ""
        echo -e "${GREEN}✓ Tests terminés. Attente de modifications...${NC}"
        echo -e "${YELLOW}Appuyez sur Ctrl+C pour arrêter${NC}"
        sleep 5
    done
else
    # Mode inotify (plus efficace)
    echo -e "${GREEN}✓ Mode surveillance inotify activé${NC}"
    echo -e "${YELLOW}Surveillance des fichiers .ts, .tsx, .js, .jsx...${NC}"
    echo ""

    # Lancer les tests immédiatement
    echo -e "${BLUE}🔍 Tests initiaux...${NC}"
    bash "$SCRIPT_DIR/quick-test.sh"
    echo ""

    # Surveiller les changements
    while inotifywait -r -e modify,create,delete \
        --exclude '(node_modules|dist|\.git|coverage)' \
        "$PROJECT_DIR/src" 2>/dev/null; do

        echo ""
        echo -e "${BLUE}📝 Fichier modifié détecté!${NC}"
        echo -e "${BLUE}🔍 Relancement des tests...${NC}"
        echo ""

        # Petit délai pour éviter les multiples déclenchements
        sleep 1

        # Relancer les tests
        bash "$SCRIPT_DIR/quick-test.sh"

        echo ""
        echo -e "${GREEN}✓ Tests terminés. En attente de modifications...${NC}"
        echo ""
    done
fi
