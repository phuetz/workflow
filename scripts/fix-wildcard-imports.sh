#!/bin/bash

# Script de correction automatique des wildcard imports
# Remplace "import * as Icons from 'lucide-react'" par des named imports

set -e

echo "=== Fixing wildcard imports in workflow application ==="
echo ""

# Couleurs pour la sortie
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Compteurs
TOTAL_FILES=0
FIXED_FILES=0
ERRORS=0

# Fonction pour extraire les icônes utilisées dans un fichier
extract_icons() {
    local file=$1
    grep -oh "Icons\.[A-Z][a-zA-Z0-9]*" "$file" 2>/dev/null | sed 's/Icons\.//' | sort -u || echo ""
}

# Fonction pour corriger un fichier
fix_file() {
    local file=$1
    echo -e "${YELLOW}Processing: $file${NC}"

    # Vérifier si le fichier utilise import * as Icons
    if ! grep -q "import \* as Icons from 'lucide-react'" "$file"; then
        echo -e "${YELLOW}  → Skipping (no wildcard import found)${NC}"
        return 0
    fi

    # Extraire les icônes utilisées
    local icons=$(extract_icons "$file")

    if [ -z "$icons" ]; then
        echo -e "${RED}  → Error: No icon usage found${NC}"
        ((ERRORS++))
        return 1
    fi

    # Compter les icônes
    local icon_count=$(echo "$icons" | wc -l)
    echo -e "  → Found $icon_count unique icons"

    # Créer l'import statement
    local import_statement="import { "
    local first=1
    while IFS= read -r icon; do
        if [ $first -eq 1 ]; then
            import_statement="$import_statement$icon"
            first=0
        else
            import_statement="$import_statement, $icon"
        fi
    done <<< "$icons"
    import_statement="$import_statement } from 'lucide-react';"

    # Créer une backup
    cp "$file" "$file.bak"

    # Remplacer l'import wildcard par l'import nommé
    sed -i "s|import \* as Icons from 'lucide-react';|$import_statement|" "$file"

    # Remplacer toutes les utilisations Icons.XXX par XXX
    while IFS= read -r icon; do
        # Utiliser perl pour un remplacement plus précis (éviter les faux positifs)
        perl -i -pe "s/Icons\.$icon\b/$icon/g" "$file"
    done <<< "$icons"

    # Vérifier si la modification a réussi
    if grep -q "import \* as Icons from 'lucide-react'" "$file"; then
        echo -e "${RED}  → Error: Failed to replace import${NC}"
        mv "$file.bak" "$file"
        ((ERRORS++))
        return 1
    fi

    # Supprimer la backup
    rm "$file.bak"

    echo -e "${GREEN}  → Fixed successfully ✓${NC}"
    ((FIXED_FILES++))
    return 0
}

# Liste des fichiers prioritaires (top 10)
PRIORITY_FILES=(
    "src/components/CustomNode.tsx"
    "src/components/ModernWorkflowEditor.tsx"
    "src/components/ModernSidebar.tsx"
    "src/components/Sidebar.tsx"
    "src/App.tsx"
    "src/components/ModernDashboard.tsx"
    "src/components/ModernNodeConfig.tsx"
    "src/components/ModernHeader.tsx"
    "src/components/TemplateGalleryPanel.tsx"
    "src/components/KeyboardShortcutsModal.tsx"
)

echo "=== Phase 1: Fixing priority files ==="
echo ""

for file in "${PRIORITY_FILES[@]}"; do
    if [ -f "$file" ]; then
        ((TOTAL_FILES++))
        fix_file "$file"
    else
        echo -e "${RED}Warning: File not found: $file${NC}"
    fi
    echo ""
done

# Demander si l'utilisateur veut continuer avec tous les autres fichiers
echo ""
echo "=== Phase 1 Complete ==="
echo -e "Fixed: ${GREEN}$FIXED_FILES${NC}/$TOTAL_FILES files"
echo -e "Errors: ${RED}$ERRORS${NC}"
echo ""

read -p "Do you want to fix all remaining files? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "=== Phase 2: Fixing all remaining files ==="
    echo ""

    # Trouver tous les fichiers avec wildcard imports
    while IFS= read -r file; do
        # Vérifier si le fichier n'est pas déjà dans la liste prioritaire
        skip=0
        for pfile in "${PRIORITY_FILES[@]}"; do
            if [ "$file" = "$pfile" ]; then
                skip=1
                break
            fi
        done

        if [ $skip -eq 0 ]; then
            ((TOTAL_FILES++))
            fix_file "$file"
            echo ""
        fi
    done < <(grep -rl "import \* as Icons from 'lucide-react'" src/)
fi

echo ""
echo "=== Summary ==="
echo -e "Total files processed: $TOTAL_FILES"
echo -e "Successfully fixed: ${GREEN}$FIXED_FILES${NC}"
echo -e "Errors: ${RED}$ERRORS${NC}"
echo ""

# Estimer l'économie de bundle size
# Moyenne: ~100 icônes disponibles dans lucide-react, chaque icône ~2-5kb
# Si on importe tout: ~200-500kb
# Si on importe seulement ce qui est utilisé (moyenne 30 icônes): ~60-150kb
# Économie moyenne par fichier: ~140-350kb

ESTIMATED_SAVINGS=$((FIXED_FILES * 200))  # ~200kb par fichier en moyenne

echo "Estimated bundle size savings: ~${ESTIMATED_SAVINGS}kb"
echo ""

# Tester la compilation
echo "=== Testing TypeScript compilation ==="
if command -v npm &> /dev/null; then
    npm run typecheck
else
    echo -e "${YELLOW}npm not found, skipping typecheck${NC}"
fi

echo ""
echo -e "${GREEN}Done! ✓${NC}"
echo ""
echo "Note: Backups were created with .bak extension and automatically removed on success."
echo "If you encounter any issues, you can restore from git."
