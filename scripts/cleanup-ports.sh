#!/bin/bash
# Script de nettoyage des ports pour l'application workflow

echo "=== Nettoyage des processus de développement ==="

# Fonction pour tuer les processus sur un port spécifique
kill_port() {
  local port=$1
  local pids=$(lsof -ti:$port 2>/dev/null)

  if [ -n "$pids" ]; then
    echo "🔄 Arrêt des processus sur port $port (PIDs: $pids)"
    kill -9 $pids 2>/dev/null || true
    echo "✅ Port $port libéré"
  else
    echo "✅ Port $port déjà libre"
  fi
}

# Tuer les processus par nom
echo ""
echo "🔄 Arrêt des processus par nom..."
pkill -9 -f "tsx --tsconfig" 2>/dev/null || true
pkill -9 -f "nodemon" 2>/dev/null || true
pkill -9 -f "vite --host" 2>/dev/null || true
pkill -9 -f "npm run dev" 2>/dev/null || true
echo "✅ Processus par nom arrêtés"

# Attendre un peu
sleep 1

# Tuer les processus par port
echo ""
echo "🔄 Libération des ports..."
kill_port 3000  # Frontend Vite
kill_port 3001  # Backend Express
kill_port 8080  # WebSocket

echo ""
echo "=== Nettoyage terminé ==="
echo ""
