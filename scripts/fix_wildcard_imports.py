#!/usr/bin/env python3
"""
Script pour corriger automatiquement les wildcard imports de lucide-react
Remplace "import * as Icons from 'lucide-react'" par des named imports
"""

import re
import os
import sys
from pathlib import Path
from typing import Set, List, Tuple
import subprocess

# Couleurs ANSI
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'  # No Color

def extract_icon_usages(content: str) -> Set[str]:
    """Extrait tous les noms d'icônes utilisées dans le fichier"""
    # Pattern pour Icons.IconName
    pattern = r'Icons\.([A-Z][a-zA-Z0-9]*)'
    matches = re.findall(pattern, content)
    return set(matches)

def has_wildcard_import(content: str) -> bool:
    """Vérifie si le fichier contient un wildcard import lucide-react"""
    return "import * as Icons from 'lucide-react'" in content

def replace_wildcard_import(content: str, icons: Set[str]) -> str:
    """Remplace le wildcard import par un named import"""
    if not icons:
        return content

    # Créer l'import nommé (limiter à 3 icônes par ligne pour lisibilité)
    sorted_icons = sorted(icons)
    import_lines = []
    current_line = []

    for icon in sorted_icons:
        current_line.append(icon)
        if len(current_line) >= 6:  # 6 icônes par ligne
            import_lines.append(', '.join(current_line))
            current_line = []

    if current_line:
        import_lines.append(', '.join(current_line))

    # Construire l'import statement
    if len(import_lines) == 1:
        new_import = f"import {{ {import_lines[0]} }} from 'lucide-react';"
    else:
        import_str = ',\n  '.join(import_lines)
        new_import = f"import {{\n  {import_str}\n}} from 'lucide-react';"

    # Remplacer l'ancien import
    content = re.sub(
        r"import \* as Icons from ['\"]lucide-react['\"];",
        new_import,
        content
    )

    return content

def replace_icon_usages(content: str, icons: Set[str]) -> str:
    """Remplace Icons.IconName par IconName"""
    for icon in icons:
        # Utiliser word boundaries pour éviter les faux positifs
        pattern = rf'\bIcons\.{icon}\b'
        content = re.sub(pattern, icon, content)

    return content

def fix_file(file_path: Path) -> Tuple[bool, str, int]:
    """
    Corrige un fichier
    Retourne: (success, message, icon_count)
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            original_content = f.read()

        if not has_wildcard_import(original_content):
            return True, "No wildcard import found", 0

        # Extraire les icônes utilisées
        icons = extract_icon_usages(original_content)

        if not icons:
            return False, "No icon usages found (icons used but not detected)", 0

        # Appliquer les transformations
        new_content = original_content
        new_content = replace_wildcard_import(new_content, icons)
        new_content = replace_icon_usages(new_content, icons)

        # Vérifier que le remplacement a fonctionné
        if "import * as Icons from 'lucide-react'" in new_content:
            return False, "Failed to replace import", 0

        # Sauvegarder
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)

        return True, f"Fixed with {len(icons)} icons", len(icons)

    except Exception as e:
        return False, f"Error: {str(e)}", 0

def find_files_with_wildcard_imports(src_dir: Path) -> List[Path]:
    """Trouve tous les fichiers TypeScript/JavaScript avec des wildcard imports"""
    files = []
    for ext in ['*.tsx', '*.ts', '*.jsx', '*.js']:
        files.extend(src_dir.rglob(ext))

    wildcard_files = []
    for file_path in files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                if has_wildcard_import(content):
                    wildcard_files.append(file_path)
        except Exception:
            pass

    return wildcard_files

def main():
    print(f"{Colors.BLUE}=== Fixing Wildcard Imports ==={Colors.NC}\n")

    # Fichiers prioritaires
    priority_files = [
        "src/components/CustomNode.tsx",
        "src/components/ModernWorkflowEditor.tsx",
        "src/components/ModernSidebar.tsx",
        "src/components/Sidebar.tsx",
        "src/App.tsx",
        "src/components/ModernDashboard.tsx",
        "src/components/ModernNodeConfig.tsx",
        "src/components/ModernHeader.tsx",
        "src/components/TemplateGalleryPanel.tsx",
        "src/components/KeyboardShortcutsModal.tsx",
    ]

    base_dir = Path.cwd()
    total_files = 0
    fixed_files = 0
    errors = 0
    total_icons = 0

    # Phase 1: Fichiers prioritaires
    print(f"{Colors.YELLOW}=== Phase 1: Priority Files ==={Colors.NC}\n")

    for file_rel in priority_files:
        file_path = base_dir / file_rel
        if not file_path.exists():
            print(f"{Colors.RED}Not found: {file_rel}{Colors.NC}")
            continue

        total_files += 1
        print(f"{Colors.YELLOW}Processing: {file_rel}{Colors.NC}")

        success, message, icon_count = fix_file(file_path)

        if success:
            if icon_count > 0:
                print(f"{Colors.GREEN}  ✓ {message}{Colors.NC}")
                fixed_files += 1
                total_icons += icon_count
            else:
                print(f"  → {message}")
        else:
            print(f"{Colors.RED}  ✗ {message}{Colors.NC}")
            errors += 1
        print()

    # Phase 2: Demander si on continue avec tous les autres fichiers
    print(f"\n{Colors.BLUE}=== Phase 1 Complete ==={Colors.NC}")
    print(f"Fixed: {Colors.GREEN}{fixed_files}{Colors.NC}/{total_files} files")
    print(f"Errors: {Colors.RED}{errors}{Colors.NC}")
    print(f"Total icons optimized: {total_icons}\n")

    response = input("Do you want to fix all remaining files? (y/n) ")

    if response.lower() == 'y':
        print(f"\n{Colors.YELLOW}=== Phase 2: All Remaining Files ==={Colors.NC}\n")

        # Trouver tous les fichiers avec wildcard imports
        all_files = find_files_with_wildcard_imports(base_dir / "src")

        # Filtrer les fichiers déjà traités
        priority_paths = {base_dir / f for f in priority_files}
        remaining_files = [f for f in all_files if f not in priority_paths]

        for file_path in remaining_files:
            total_files += 1
            rel_path = file_path.relative_to(base_dir)
            print(f"{Colors.YELLOW}Processing: {rel_path}{Colors.NC}")

            success, message, icon_count = fix_file(file_path)

            if success:
                if icon_count > 0:
                    print(f"{Colors.GREEN}  ✓ {message}{Colors.NC}")
                    fixed_files += 1
                    total_icons += icon_count
                else:
                    print(f"  → {message}")
            else:
                print(f"{Colors.RED}  ✗ {message}{Colors.NC}")
                errors += 1
            print()

    # Résumé
    print(f"\n{Colors.BLUE}=== Summary ==={Colors.NC}")
    print(f"Total files processed: {total_files}")
    print(f"Successfully fixed: {Colors.GREEN}{fixed_files}{Colors.NC}")
    print(f"Errors: {Colors.RED}{errors}{Colors.NC}")
    print(f"Total icons optimized: {total_icons}")

    # Estimation des économies
    # Moyenne: lucide-react a ~1000 icônes, chaque icône ~2-3kb
    # Import wildcard: ~2-3MB
    # Import nommé (moyenne 30 icônes): ~60-90kb
    # Économie par fichier: ~2-3MB
    avg_icons_per_file = total_icons / max(fixed_files, 1)
    estimated_wildcard_size = 2500  # ~2.5MB par wildcard import
    estimated_named_size = int(avg_icons_per_file * 3)  # ~3kb par icône
    estimated_savings_per_file = estimated_wildcard_size - estimated_named_size
    total_savings = estimated_savings_per_file * fixed_files

    print(f"\n{Colors.GREEN}Estimated bundle size savings: ~{total_savings}kb (~{total_savings/1024:.1f}MB){Colors.NC}")
    print(f"Average icons per file: {avg_icons_per_file:.1f}")

    # Tester la compilation TypeScript
    print(f"\n{Colors.YELLOW}=== Testing TypeScript Compilation ==={Colors.NC}")
    try:
        result = subprocess.run(
            ['npm', 'run', 'typecheck'],
            capture_output=True,
            text=True,
            timeout=60
        )
        if result.returncode == 0:
            print(f"{Colors.GREEN}✓ TypeScript compilation successful{Colors.NC}")
        else:
            print(f"{Colors.RED}✗ TypeScript errors detected:{Colors.NC}")
            print(result.stderr[:500])  # Afficher les premières erreurs
    except subprocess.TimeoutExpired:
        print(f"{Colors.YELLOW}⚠ Typecheck timeout (skipping){Colors.NC}")
    except FileNotFoundError:
        print(f"{Colors.YELLOW}⚠ npm not found (skipping typecheck){Colors.NC}")
    except Exception as e:
        print(f"{Colors.YELLOW}⚠ Could not run typecheck: {e}{Colors.NC}")

    print(f"\n{Colors.GREEN}Done! ✓{Colors.NC}\n")

    return 0 if errors == 0 else 1

if __name__ == '__main__':
    sys.exit(main())
