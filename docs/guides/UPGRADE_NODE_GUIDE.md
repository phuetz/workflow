# Guide Rapide: Upgrade Node.js vers 22.16.0

## ⚡ Quick Start (Recommandé)

### Option 1: Avec NVM (Node Version Manager)

```bash
# 1. Installer NVM si pas déjà fait
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# 2. Recharger le shell
source ~/.bashrc
# OU pour zsh:
source ~/.zshrc

# 3. Installer Node.js 22.16.0
nvm install 22.16.0

# 4. Utiliser cette version
nvm use 22.16.0

# 5. Définir comme version par défaut
nvm alias default 22.16.0

# 6. Vérifier
node --version  # Devrait afficher v22.16.0
```

### Option 2: Installation Manuelle (WSL2/Ubuntu)

```bash
# 1. Ajouter le repository NodeSource pour Node 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -

# 2. Installer Node.js
sudo apt-get install -y nodejs

# 3. Vérifier
node --version
npm --version
```

### Option 3: Avec n (Alternative à NVM)

```bash
# 1. Installer n
sudo npm install -g n

# 2. Installer Node 22.16.0
sudo n 22.16.0

# 3. Vérifier
node --version
```

---

## 🔄 Après l'Upgrade

### 1. Réinstaller les Dépendances

```bash
# Nettoyer l'ancien cache
rm -rf node_modules package-lock.json

# Réinstaller
npm install
```

### 2. Démarrer l'Application

```bash
# Option A: Frontend et Backend ensemble
npm run dev

# Option B: Séparer les processus
# Terminal 1:
npm run dev:backend

# Terminal 2:
npm run dev:frontend
```

### 3. Vérifier que Tout Fonctionne

```bash
# Backend (devrait déjà fonctionner)
curl http://localhost:3001/health

# Frontend (devrait maintenant fonctionner)
# Ouvrir http://localhost:3000 dans le navigateur
```

---

## 🐛 Dépannage

### Problème: "nvm: command not found"

**Solution:**
```bash
# Installer NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Ajouter à .bashrc ou .zshrc
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# Recharger
source ~/.bashrc
```

### Problème: "Permission denied"

**Solution:**
```bash
# Si utilisation de sudo, donner les bonnes permissions
sudo chown -R $USER:$USER ~/.nvm
```

### Problème: Frontend ne démarre toujours pas

**Solutions:**
1. Vérifier la version de Node:
   ```bash
   node --version  # Doit être >= 22.12.0
   ```

2. Nettoyer complètement:
   ```bash
   rm -rf node_modules package-lock.json .vite
   npm install
   ```

3. Vérifier les logs:
   ```bash
   npm run dev:frontend 2>&1 | tee frontend.log
   ```

### Problème: Conflits de versions

**Solution:**
```bash
# Forcer l'utilisation de Node 22
nvm use 22.16.0

# Ou mettre à jour .nvmrc
echo "22.16.0" > .nvmrc

# Puis utiliser automatiquement
nvm use
```

---

## 📋 Vérification Post-Installation

Exécutez ce script pour vérifier que tout est OK:

```bash
#!/bin/bash

echo "=== Vérification Node.js ==="
node --version

echo -e "\n=== Vérification npm ==="
npm --version

echo -e "\n=== Vérification Backend ==="
curl -s http://localhost:3001/health | head -5

echo -e "\n=== Test Frontend ==="
curl -s http://localhost:3000 | grep -o "<title>.*</title>"

echo -e "\n✅ Vérification terminée!"
```

---

## 🎯 Versions Testées

| Package | Version Minimum | Version Testée | Status |
|---------|----------------|----------------|--------|
| Node.js | 20.19.0 | 22.16.0 | ✅ |
| npm | 9.0.0 | 10.x | ✅ |
| Vite | 7.0.6 | 7.0.6 | ✅ |
| React | 18.3.x | 18.3.x | ✅ |

---

## 💡 Conseils

1. **Utiliser .nvmrc**: Le projet contient déjà un fichier `.nvmrc` avec la version 22.16.0
   ```bash
   # Auto-switch à chaque fois que vous entrez dans le dossier
   nvm use
   ```

2. **Automatiser avec shell hook**:
   Ajouter à votre `.bashrc` ou `.zshrc`:
   ```bash
   # Auto-load NVM dans les projets
   autoload -U add-zsh-hook
   load-nvmrc() {
     if [[ -f .nvmrc && -r .nvmrc ]]; then
       nvm use
     fi
   }
   add-zsh-hook chpwd load-nvmrc
   load-nvmrc
   ```

3. **Performance**: Node 22 est ~20% plus rapide que Node 18 pour les builds Vite

---

## ✅ Checklist

- [ ] NVM installé
- [ ] Node.js 22.16.0 installé
- [ ] Version vérifiée (`node --version`)
- [ ] Dépendances réinstallées (`npm install`)
- [ ] Backend démarre sur port 3001
- [ ] Frontend démarre sur port 3000
- [ ] Application accessible dans le navigateur
- [ ] Aucune erreur dans la console

---

## 📚 Ressources

- [Node.js Downloads](https://nodejs.org/en/download/)
- [NVM GitHub](https://github.com/nvm-sh/nvm)
- [Vite Requirements](https://vitejs.dev/guide/#scaffolding-your-first-vite-project)
- [Project Documentation](./CLAUDE.md)

---

**Besoin d'aide?** Consultez `TESTS_AUTONOMES_RAPPORT.md` pour voir le statut complet du projet.
