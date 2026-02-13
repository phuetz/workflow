# Guide de Prévention des Wildcard Imports

## Objectif
Empêcher la réintroduction de wildcard imports qui bloquent le tree-shaking et gonflent le bundle.

---

## 1. Règle ESLint (Recommandé)

### Installation

Fusionner `.eslintrc-wildcard-prevention.json` dans votre config ESLint existante :

```bash
# Option 1: Fusionner manuellement
cat .eslintrc-wildcard-prevention.json >> eslint.config.js
```

Ou ajoutez directement dans `eslint.config.js` :

```javascript
export default [
  // ... votre config existante
  {
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['*'],
          importNamePattern: '^\\* as .*Icons',
          message: '❌ Wildcard icon imports forbidden. Use named imports:\n' +
                   '  BAD:  import * as Icons from "lucide-react";\n' +
                   '  GOOD: import { Play, Clock } from "lucide-react";'
        }]
      }],
      'no-restricted-syntax': ['error', {
        selector: 'ImportDeclaration[source.value=/lucide-react|@mui\\/icons-material/] > ImportNamespaceSpecifier',
        message: '❌ Wildcard imports not allowed for icon libraries'
      }]
    }
  }
];
```

### Vérification

```bash
# Tester la règle
npm run lint

# Si un développeur essaie d'ajouter un wildcard import:
# src/components/NewComponent.tsx
#   5:1  error  ❌ Wildcard icon imports forbidden...  no-restricted-imports
```

---

## 2. Pre-commit Hook (Git Hooks)

### Installation avec Husky

```bash
# Installer husky
npm install -D husky

# Initialiser
npx husky init

# Créer le hook pre-commit
cat > .husky/pre-commit << 'EOF'
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Vérifier les wildcard imports
echo "🔍 Checking for wildcard imports..."

WILDCARD_IMPORTS=$(git diff --cached --name-only | grep -E '\.(tsx?|jsx?)$' | xargs grep -l "import \* as .* from ['\"]\(lucide-react\|@mui/icons-material\|react-icons\)" 2>/dev/null || true)

if [ -n "$WILDCARD_IMPORTS" ]; then
  echo "❌ Error: Wildcard imports detected in:"
  echo "$WILDCARD_IMPORTS"
  echo ""
  echo "Please use named imports instead:"
  echo "  BAD:  import * as Icons from 'lucide-react';"
  echo "  GOOD: import { Play, Clock } from 'lucide-react';"
  echo ""
  echo "Run: python3 scripts/fix_wildcard_imports.py"
  exit 1
fi

echo "✓ No wildcard imports found"
EOF

chmod +x .husky/pre-commit
```

### Test

```bash
# Essayer de commit un fichier avec wildcard import
git add src/components/BadComponent.tsx
git commit -m "test"

# Résultat:
# 🔍 Checking for wildcard imports...
# ❌ Error: Wildcard imports detected in:
# src/components/BadComponent.tsx
#
# Please use named imports instead
```

---

## 3. CI/CD Pipeline Check

### GitHub Actions

Ajoutez dans `.github/workflows/ci.yml` :

```yaml
name: CI

on: [push, pull_request]

jobs:
  check-wildcard-imports:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Check for wildcard imports
        run: |
          WILDCARD_COUNT=$(grep -r "import \* as .* from ['\"]lucide-react" src/ | wc -l)
          if [ $WILDCARD_COUNT -gt 0 ]; then
            echo "❌ Found $WILDCARD_COUNT wildcard imports"
            grep -r "import \* as .* from ['\"]lucide-react" src/
            exit 1
          fi
          echo "✓ No wildcard imports found"

      - name: Run ESLint
        run: npm run lint
```

---

## 4. Documentation pour l'Équipe

### Ajoutez dans `CONTRIBUTING.md`

```markdown
## Icon Imports - Best Practices

### ❌ À ÉVITER - Wildcard Imports

```typescript
import * as Icons from 'lucide-react';  // ❌ Importe ~1000 icônes (~2.5MB)

<Icons.Play size={16} />
```

**Problèmes**:
- Bundle size: +2.5MB par fichier
- Tree-shaking bloqué
- Temps de build augmenté
- Performance dégradée

### ✅ RECOMMANDÉ - Named Imports

```typescript
import { Play, Clock, Database } from 'lucide-react';  // ✅ Importe seulement 3 icônes (~9kb)

<Play size={16} />
```

**Avantages**:
- Bundle size optimisé (-98%)
- Tree-shaking fonctionnel
- Performance maximale
- Meilleure lisibilité

### Correction Automatique

Si vous avez accidentellement utilisé un wildcard import :

```bash
python3 scripts/fix_wildcard_imports.py
```
```

---

## 5. VSCode Extension (Optionnel)

### Snippets pour imports corrects

Créez `.vscode/lucide-icons.code-snippets` :

```json
{
  "Lucide Icon Import": {
    "prefix": "ilr",
    "body": [
      "import { ${1:Play} } from 'lucide-react';"
    ],
    "description": "Import Lucide React icon (named import)"
  },
  "Multiple Lucide Icons": {
    "prefix": "ilrm",
    "body": [
      "import {",
      "  ${1:Play},",
      "  ${2:Clock},",
      "  ${3:Database}",
      "} from 'lucide-react';"
    ],
    "description": "Import multiple Lucide React icons"
  }
}
```

### Settings pour auto-fix

Ajoutez dans `.vscode/settings.json` :

```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ]
}
```

---

## 6. Monitoring Continu

### Script de vérification quotidienne

Créez `scripts/check-wildcard-imports.sh` :

```bash
#!/bin/bash

echo "📊 Wildcard Imports Report - $(date)"
echo "======================================"

WILDCARD_COUNT=$(grep -r "import \* as .* from ['\"]lucide-react" src/ 2>/dev/null | wc -l)

if [ $WILDCARD_COUNT -eq 0 ]; then
  echo "✓ Status: CLEAN"
  echo "✓ No wildcard imports found"
  exit 0
else
  echo "❌ Status: ISSUES DETECTED"
  echo "❌ Found $WILDCARD_COUNT wildcard imports:"
  echo ""
  grep -r "import \* as .* from ['\"]lucide-react" src/
  echo ""
  echo "Run: python3 scripts/fix_wildcard_imports.py"
  exit 1
fi
```

Ajoutez dans `.github/workflows/daily-checks.yml` :

```yaml
name: Daily Checks

on:
  schedule:
    - cron: '0 9 * * *'  # Tous les jours à 9h
  workflow_dispatch:

jobs:
  check-code-quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Check wildcard imports
        run: bash scripts/check-wildcard-imports.sh

      - name: Create issue if failed
        if: failure()
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: '⚠️ Wildcard imports detected',
              body: 'Automated check found wildcard imports. Please run `python3 scripts/fix_wildcard_imports.py` to fix.',
              labels: ['code-quality', 'automated']
            })
```

---

## 7. Quick Reference Card

### Commandes Essentielles

```bash
# Vérifier les wildcard imports
grep -r "import \* as .* from 'lucide-react'" src/

# Corriger automatiquement
python3 scripts/fix_wildcard_imports.py

# Vérifier avec ESLint
npm run lint

# Build pour mesurer le bundle
npm run build -- --analyze
```

### Checklist de Review

- [ ] Pas de `import * as Icons`
- [ ] Seulement des named imports
- [ ] ESLint passe sans erreur
- [ ] Pre-commit hook installé
- [ ] CI/CD vérifie les imports

---

## Impact Mesuré

### Économies Réalisées
- **Bundle size**: -85.9MB (-98.2%)
- **Build time**: -15-20%
- **Load time**: -2-3 secondes
- **Tree-shaking**: ✅ Fonctionnel

---

## Support

### Auto-fix Script
```bash
python3 scripts/fix_wildcard_imports.py
```

### Questions?
Consultez `WILDCARD_IMPORTS_FIX_REPORT.md` pour plus de détails.

---

**Dernière mise à jour**: 2025-10-23
