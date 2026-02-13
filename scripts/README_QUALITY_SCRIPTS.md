# Quality Improvement Scripts

Collection de scripts pour améliorer la qualité du code de 85/100 à 100/100.

## 🎯 Quick Start

### Vérifier le Score Actuel

```bash
./scripts/quality-check.sh
```

**Output Example**:
```
================================================
  CODE QUALITY DASHBOARD
================================================

📊 Checking console statements...
  ✗ Console statements: 736 (target: 0)

📊 Checking TypeScript any types...
  ✗ Any types: 3195 (target: <500)

📊 Checking large files (>1500 lines)...
  ✗ Large files: 17 (target: 0)

================================================
  ⚠ QUALITY SCORE: 88/100 - NEEDS IMPROVEMENT
================================================
```

---

## 📋 Scripts Disponibles

### 1. quality-check.sh - Dashboard Global

**Utilisation**:
```bash
./scripts/quality-check.sh
```

**Checks**:
- ✅ Console statements
- ✅ TypeScript `any` types
- ✅ Large files (>1500 lignes)
- ✅ Backup/broken files
- ✅ TODO/FIXME comments
- ✅ ESLint
- ✅ TypeScript compilation

**Exit Code**:
- `0` si score ≥ 90
- `1` si score < 90

---

### 2. find-console-statements.sh - Audit Console.log

**Utilisation**:
```bash
./scripts/find-console-statements.sh
```

**Output**: Génère `console-statements-report.txt` avec:
- Statistiques par type (log/error/warn/debug)
- Top 20 fichiers
- Liste complète avec numéros de ligne

**Exemple**:
```
Summary:
--------
  console.log:   461
  console.error: 193
  console.warn:   75
  TOTAL:         729

Files by Count (Top 20):
53 statements - src/evaluation/example.ts
28 statements - src/testing/contract/PactIntegration.ts
...
```

---

### 3. replace-error-any.sh - Remplacer `error: any`

**Utilisation**:
```bash
# Dry run (preview)
./scripts/replace-error-any.sh --dry-run

# Apply changes
./scripts/replace-error-any.sh
```

**Actions**:
1. Trouve tous les `catch (error: any)`
2. Crée un backup automatique
3. Remplace par `catch (error: unknown)`

**Impact**: ~800 any types en moins

**Post-Migration**:
```typescript
// AVANT
} catch (error: any) {
  console.error(error.message);
}

// APRÈS
} catch (error: unknown) {
  if (error instanceof Error) {
    logger.error(error.message);
  }
}
```

---

### 4. delete-backup-files.sh - Supprimer Fichiers Backup

**Utilisation**:
```bash
# Dry run (preview)
./scripts/delete-backup-files.sh --dry-run

# Apply changes
./scripts/delete-backup-files.sh
```

**Fichiers supprimés**:
- `*.BACKUP.*`
- `*.OLD.*`
- `*.NEW.*`
- `*.COMPLETE.*`
- `*.IMPROVED.*`
- `*.broken.*`
- `*.backup`

**Sécurité**:
- Vérifie si les fichiers sont importés
- Crée un backup avant suppression
- Demande confirmation

---

## 🚀 Workflow Recommandé

### Étape 1: Quick Wins (2h → +6 points)

```bash
# 1. Check current score
./scripts/quality-check.sh

# 2. Delete backup files
./scripts/delete-backup-files.sh

# 3. Replace error: any
./scripts/replace-error-any.sh

# 4. Run tests
npm test
npm run typecheck

# 5. Commit
git add .
git commit -m "chore: quality improvements - remove backups and fix error types"
```

**Expected Score**: 85 → 91

---

### Étape 2: Console.log Migration (7h → +2 points)

```bash
# 1. Audit console statements
./scripts/find-console-statements.sh

# 2. Review report
cat console-statements-report.txt

# 3. Migrate critical files manually
# Example:
sed -i "s/console\.error(/logger.error(/g" src/services/CacheService.ts

# 4. Add logger import
# import { logger } from '@/utils/logger';

# 5. Test
npm test

# 6. Commit
git commit -m "refactor: migrate console.* to centralized logger"
```

**Expected Score**: 91 → 93

---

### Étape 3: Large Files Split (38h → +2 points)

Voir `AUDIT_CODE_QUALITY_100.md` Section 3 pour le plan détaillé.

---

## 🔧 Intégration CI/CD

### GitHub Actions

```yaml
# .github/workflows/quality.yml
name: Quality Check

on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - name: Quality Check
        run: |
          ./scripts/quality-check.sh
          if [ $? -ne 0 ]; then
            echo "Quality score below threshold"
            exit 1
          fi
```

---

### Pre-commit Hook

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run quality check
npm run quality:check

# Block console.log commits
if git diff --cached --name-only | xargs grep -l "console\." 2>/dev/null | grep -v "__tests__" | grep -v ".test.ts"; then
  echo "❌ Error: console.* statements found in staged files"
  echo "Run: ./scripts/find-console-statements.sh"
  exit 1
fi

# Block backup files
if git diff --cached --name-only | grep -E '\.(BACKUP|OLD|NEW|broken)\.'; then
  echo "❌ Error: backup files in staged changes"
  exit 1
fi
```

---

## 📊 Métriques à Suivre

### Daily Dashboard

```bash
#!/bin/bash
# scripts/daily-metrics.sh

echo "Quality Metrics - $(date +%Y-%m-%d)"
echo "================================="
echo ""

echo "Console statements: $(grep -r 'console\.' src/ --include='*.ts' --exclude-dir=__tests__ | wc -l)"
echo "Any types: $(grep -r ': any\|as any' src/ --include='*.ts' | wc -l)"
echo "Large files: $(find src -name '*.ts' | xargs wc -l | awk '$1 > 1500' | wc -l)"
echo "Backup files: $(find src -name '*.BACKUP.*' | wc -l)"
echo "TODO comments: $(grep -r 'TODO\|FIXME' src/ --exclude-dir=__tests__ | wc -l)"
echo ""

./scripts/quality-check.sh
```

### Ajouter à package.json

```json
{
  "scripts": {
    "quality:check": "./scripts/quality-check.sh",
    "quality:console": "./scripts/find-console-statements.sh",
    "quality:fix-any": "./scripts/replace-error-any.sh",
    "quality:cleanup": "./scripts/delete-backup-files.sh"
  }
}
```

---

## 🎯 Objectifs par Sprint

### Sprint 1 (Score: 85 → 91)
```bash
npm run quality:cleanup        # Delete backups
npm run quality:fix-any        # Fix error: any
npm test                       # Validate
```
**Time**: 2h | **Gain**: +6 points

### Sprint 2 (Score: 91 → 95)
```bash
npm run quality:console        # Audit console.log
# Manual migration to logger
npm test                       # Validate
```
**Time**: 7h | **Gain**: +4 points

### Sprint 3 (Score: 95 → 100)
```bash
# Large files refactoring (see main report)
# Code duplication fixes
# ESLint strict rules
```
**Time**: 62h | **Gain**: +5 points

---

## 🐛 Troubleshooting

### "bc: command not found"
```bash
sudo apt-get install bc
```

### "Permission denied"
```bash
chmod +x scripts/*.sh
```

### "Failed to run quality-check.sh"
```bash
# Check dependencies
npm install

# Run with debug
bash -x scripts/quality-check.sh
```

### "Too many console.log in examples"
```bash
# Exclude examples from production build
# Add to .dockerignore:
src/evaluation/example.ts
src/logging/examples/
src/mcp/examples.ts
```

---

## 📚 Documentation Complète

- **Full Audit**: `AUDIT_CODE_QUALITY_100.md` (38KB, 700+ lignes)
- **Executive Summary**: `AUDIT_QUALITY_EXECUTIVE_SUMMARY.md`
- **Architecture**: `AUDIT_ARCHITECTURE_100.md`
- **Performance**: `AUDIT_PERFORMANCE_100.md`

---

## 🤝 Contributing

### Ajouter un Nouveau Check

Éditer `scripts/quality-check.sh`:

```bash
# Add new metric
echo ""
echo "📊 Checking new metric..."
NEW_METRIC=$(your_command | wc -l)

if [ "$NEW_METRIC" -gt 0 ]; then
  echo -e "  ${RED}✗${NC} New metric: $NEW_METRIC (target: 0)"
  PENALTY=$(echo "scale=1; $NEW_METRIC / threshold" | bc)
  SCORE=$(echo "scale=1; $SCORE - $PENALTY" | bc)
else
  echo -e "  ${GREEN}✓${NC} New metric: 0"
fi
```

---

## 📞 Support

**Issues**: Créer un ticket avec label `quality`
**Questions**: Voir documentation dans `AUDIT_CODE_QUALITY_100.md`
**Updates**: Scripts mis à jour après chaque sprint

---

**Last Updated**: 2025-10-23
**Maintainer**: Claude Code Quality Team
**Version**: 1.0.0
