# 🚨 GUIDE DE SURVIE - ÉQUIPE DÉVELOPPEMENT

## ⚡ COMMANDES D'URGENCE (COPIER-COLLER)

### 🔴 CRASH EN PRODUCTION - QUE FAIRE?
```bash
# 1. ROLLBACK IMMÉDIAT (30 secondes)
kubectl rollout undo deployment/workflow-api -n production

# 2. VÉRIFIER STATUS
kubectl get pods -n production
curl https://api.workflow.com/health

# 3. ANALYSER LOGS
kubectl logs -n production -l app=workflow-api --tail=100

# 4. SI TOUJOURS DOWN - RESTART FORCÉ
kubectl delete pods -n production -l app=workflow-api
```

### 💾 MEMORY LEAK - ACTIONS IMMÉDIATES
```bash
# 1. IDENTIFIER LE PROCESS
ps aux | grep node | head -5

# 2. HEAP SNAPSHOT
kill -USR2 <PID>  # Génère heapdump

# 3. RESTART GRACEFUL
pm2 reload workflow-api --update-env

# 4. MONITORING
watch -n 1 'ps aux | grep node | head -5'
```

### 🐛 BUG CRITIQUE - DÉBUG RAPIDE
```bash
# 1. ISOLER LE PROBLÈME
git stash               # Sauver work en cours
git checkout main       # Retour à stable
git bisect start        # Trouver commit problématique

# 2. DEBUG
NODE_ENV=development npm run dev
chrome://inspect        # Attach debugger

# 3. HOT FIX
git checkout -b hotfix/critical-bug
# Fix le bug
git commit -m "fix: critical bug in [component]"
git push origin hotfix/critical-bug
```

---

## 📋 DAILY ROUTINE OBLIGATOIRE

### 🌅 MATIN (09:00 - 09:30)
```bash
# 1. CHECK SANTÉ
./transformation/scripts/daily-health-check.sh

# 2. PULL LATEST
git pull origin transformation-urgence
npm install  # Si package.json modifié

# 3. RUN TESTS
npm test

# 4. CHECK METRICS
open http://localhost:3001  # Grafana
```

### 🏃 PENDANT LA JOURNÉE
```bash
# AVANT CHAQUE COMMIT
npm run lint
npm run typecheck
npm test

# TOUTES LES 2 HEURES
git add .
git commit -m "wip: [description]"
git push origin [branch]
```

### 🌙 FIN DE JOURNÉE (17:30 - 18:00)
```bash
# 1. COMMIT FINAL
git add .
git commit -m "feat/fix/chore: [description]"
git push

# 2. UPDATE TRACKER
# Mettre à jour le dashboard

# 3. BACKUP
./scripts/backup-work.sh

# 4. LAISSER NOTE POUR DEMAIN
echo "TODO: [tâches]" >> tomorrow.md
```

---

## 🛠️ OUTILS ESSENTIELS

### Extensions VS Code OBLIGATOIRES
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-tslint-plugin",
    "streetsidesoftware.code-spell-checker",
    "eamodio.gitlens",
    "usernamehw.errorlens",
    "yzhang.markdown-all-in-one",
    "ms-azuretools.vscode-docker",
    "ms-kubernetes-tools.vscode-kubernetes-tools"
  ]
}
```

### Aliases Bash Utiles
```bash
# Ajouter dans ~/.bashrc ou ~/.zshrc

# Navigation rapide
alias cdw='cd ~/workflow'
alias cdt='cd ~/workflow/transformation'

# Git shortcuts
alias gs='git status'
alias gp='git push'
alias gc='git commit -m'
alias gco='git checkout'

# Docker/K8s
alias d='docker'
alias dc='docker-compose'
alias k='kubectl'
alias kgp='kubectl get pods'

# Project specific
alias nr='npm run'
alias nrd='npm run dev'
alias nrt='npm run test'
alias health='./transformation/scripts/daily-health-check.sh'
alias fixsql='ts-node ./transformation/scripts/fix-sql-injections.ts'
```

---

## 🔥 PATTERNS À SUIVRE ABSOLUMENT

### ✅ TOUJOURS FAIRE
```typescript
// 1. ERROR HANDLING PARTOUT
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  logger.error('Operation failed', error);
  throw new AppError('User-friendly message', 'ERROR_CODE');
}

// 2. TYPE SAFETY - JAMAIS DE 'ANY'
interface WorkflowData {
  id: string;
  name: string;
  nodes: Node[];
}
// PAS: const data: any = ...

// 3. CLEANUP RESOURCES
class Service {
  private intervals: Set<NodeJS.Timeout> = new Set();
  
  destroy() {
    this.intervals.forEach(id => clearInterval(id));
  }
}

// 4. PARAMETERIZED QUERIES
db.query('SELECT * FROM users WHERE id = ?', [userId]);
// JAMAIS: `SELECT * FROM users WHERE id = ${userId}`

// 5. VALIDATION INPUT
const schema = z.object({
  email: z.string().email(),
  age: z.number().min(0).max(120)
});
const validated = schema.parse(userInput);
```

### ❌ NE JAMAIS FAIRE
```typescript
// 1. JAMAIS DE CONSOLE.LOG EN PROD
console.log(userData);  // NON!
logger.info('User action', { userId });  // OUI!

// 2. JAMAIS DE SECRETS EN DUR
const secret = "abc123";  // NON!
const secret = process.env.JWT_SECRET;  // OUI!

// 3. JAMAIS DE EVAL
eval(userInput);  // DANGER!
new Function(userInput);  // DANGER!

// 4. JAMAIS DE CATCH VIDE
try {
  risky();
} catch (e) {
  // Ne rien faire = BUG CACHÉ
}

// 5. JAMAIS DE MODIFICATION ÉTAT DIRECT
state.users.push(newUser);  // NON!
setState({ users: [...state.users, newUser] });  // OUI!
```

---

## 🚑 RÉSOLUTION PROBLÈMES COURANTS

### Problème: "Cannot compile TypeScript"
```bash
# Solution 1: Clean build
rm -rf dist/ node_modules/
npm install
npm run build

# Solution 2: Check tsconfig
cat tsconfig.json  # Vérifier strict: false temporairement

# Solution 3: Skip lib check
echo '{ "compilerOptions": { "skipLibCheck": true } }' > tsconfig.override.json
```

### Problème: "Memory leak detected"
```javascript
// Identifier la source
// 1. Chrome DevTools Memory Profiler
// 2. Chercher patterns dangereux:

// Maps qui grossissent
const cache = new Map();  // Remplacer par WeakMap

// Event listeners non nettoyés
element.addEventListener('click', handler);
// Ajouter: element.removeEventListener('click', handler);

// Intervals/Timeouts orphelins
setInterval(() => {}, 1000);
// Toujours: const id = setInterval(...); clearInterval(id);
```

### Problème: "Database connection lost"
```bash
# Quick fix
docker restart postgres

# Check connections
psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Si pool épuisé
# Augmenter dans .env
DATABASE_POOL_MAX=20  # était 10
```

### Problème: "Tests failing"
```bash
# Run specific test
npm test -- workflow.test.ts

# Debug mode
npm test -- --detectOpenHandles

# Update snapshots si UI change
npm test -- -u

# Skip flaky tests temporairement
test.skip('flaky test', () => {
  // TODO: Fix this
});
```

---

## 📊 MÉTRIQUES À SURVEILLER

### Dashboard Personnel
```javascript
// Ouvrir: http://localhost:3001/dashboard

const MY_METRICS = {
  // Vérifier toutes les heures
  must_watch: [
    "response_time",      // < 500ms
    "error_rate",         // < 5%
    "memory_usage",       // < 3GB
    "active_users"        // Trend ↗️
  ],
  
  // Vérifier 2x/jour
  daily_check: [
    "test_coverage",      // > 35%
    "code_complexity",    // < 18
    "tech_debt",          // Trending ↘️
    "open_bugs"           // < 100
  ]
};
```

---

## 🤝 QUI CONTACTER POUR QUOI

### Escalation Matrix
```yaml
database_issues:
  primary: "@alice"
  backup: "@bob"
  escalate: "@cto"

frontend_bugs:
  primary: "@charlie"
  backup: "@diana"

devops_infra:
  primary: "@eve"
  backup: "@frank"

security_urgent:
  primary: "@security-team"
  escalate: "@ciso IMMEDIATELY"

business_questions:
  primary: "@product-owner"
  backup: "@scrum-master"
```

### Canaux Slack
```
#transformation-general    - Updates quotidiens
#transformation-urgent     - Problèmes critiques only
#transformation-help       - Questions techniques
#transformation-wins       - Célébrer les succès!
#random                   - Memes et détente
```

---

## 📚 DOCUMENTATION RAPIDE

### Où Trouver Quoi
```
/transformation/
├── docs/              # Documentation technique
├── scripts/           # Scripts d'automation
├── reports/           # Rapports quotidiens
├── templates/         # Templates réutilisables
└── monitoring/        # Config Grafana/Prometheus

/src/
├── components/        # React components
├── services/          # Business logic
├── utils/            # Helpers
└── __tests__/        # Tests
```

### Commandes NPM Customs
```json
{
  "scripts": {
    "fix:sql": "ts-node transformation/scripts/fix-sql-injections.ts",
    "fix:memory": "ts-node transformation/scripts/fix-memory-leaks.ts",
    "fix:compilation": "ts-node transformation/scripts/fix-compilation.ts",
    "health": "./transformation/scripts/daily-health-check.sh",
    "report": "node transformation/scripts/generate-report.js",
    "dashboard": "open http://localhost:3001"
  }
}
```

---

## 🎯 OBJECTIFS PERSONNELS SEMAINE

### Checklist Individuelle
```markdown
## SEMAINE 1 - [TON NOM]

### Lundi
- [ ] Fix compilation errors (2h)
- [ ] Team standup (30min)
- [ ] Update documentation (1h)

### Mardi  
- [ ] Implement error handling (4h)
- [ ] Write tests (2h)
- [ ] Code review (1h)

### Mercredi
- [ ] Service extraction (6h)
- [ ] Update tests (1h)

### Jeudi
- [ ] Performance optimization (4h)
- [ ] Load testing (2h)
- [ ] Documentation (1h)

### Vendredi
- [ ] Security audit (2h)
- [ ] Week report (2h)
- [ ] Retrospective (1h)
- [ ] Planning next week (2h)

Progress: ████████░░░░░░░░ 50%
```

---

## 💪 MOTIVATION & TIPS

### Rappels Importants
```
🎯 "On transforme un chaos en chef-d'œuvre"
⏰ "Chaque bug fixé = 1 client sauvé"
💰 "ROI: 8.5x - On fait ça pour gagner!"
🏆 "Dans 6 mois, on sera les meilleurs"
🍺 "Vendredi 18h = Bières de victoire!"
```

### Anti-Burnout Rules
1. **Pas de code après 19h** (sauf urgence)
2. **Pauses obligatoires** toutes les 2h
3. **Lunch ensemble** = team building
4. **Vendredi PM** = code léger only
5. **Weekend** = REPOS (on-call rotation)

### Récompenses Hebdomadaires
- **Bug Hunter**: Le plus de bugs fixés
- **Performance Hero**: Meilleure optimisation
- **Test Champion**: Meilleure coverage
- **Clean Coder**: Code le plus propre
- **Team Player**: Meilleure collaboration

---

## 🆘 NUMÉROS D'URGENCE

```
Support Infra 24/7:     +33 1 23 45 67 89
Database Admin:         +33 1 23 45 67 90
Security Team:          +33 1 23 45 67 91
CTO Mobile:            +33 6 12 34 56 78
Product Owner:         +33 6 12 34 56 79

AWS Support:           (Si compte Enterprise)
GitHub Support:        support@github.com
```

---

## ✅ DAILY MANTRA

```bash
#!/bin/bash
echo "☕ Coffee: CHECK"
echo "🧪 Tests: GREEN"
echo "📊 Metrics: IMPROVING"
echo "🚀 Deploy: CONFIDENT"
echo "😊 Mood: POSITIVE"
echo ""
echo "Today, we transform chaos into excellence!"
echo "Let's go team! 💪"
```

---

**REMEMBER: On est dans le même bateau!**
**ENSEMBLE, on va réussir cette transformation!**
**Gardez ce guide à portée de main!**

*Dernière update: Début Semaine 1*
*Prochain update: Fin Semaine 1*