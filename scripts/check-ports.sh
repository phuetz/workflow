#!/bin/bash
# Script de vérification des ports pour l'application workflow

echo "=== Vérification des ports ==="
echo ""

# Fonction pour vérifier un port
check_port() {
  local port=$1
  local name=$2
  local pid=$(lsof -ti:$port 2>/dev/null)

  if [ -n "$pid" ]; then
    local process=$(ps -p $pid -o comm= 2>/dev/null)
    echo "❌ Port $port ($name): OCCUPÉ par PID $pid ($process)"
    return 1
  else
    echo "✅ Port $port ($name): LIBRE"
    return 0
  fi
}

# Vérifier chaque port
check_port 3000 "Frontend Vite"
frontend_status=$?

check_port 3001 "Backend Express"
backend_status=$?

check_port 8080 "WebSocket"
websocket_status=$?

echo ""

# Résumé
if [ $frontend_status -eq 0 ] && [ $backend_status -eq 0 ] && [ $websocket_status -eq 0 ]; then
  echo "✅ Tous les ports sont libres - Prêt à démarrer"
  exit 0
else
  echo "⚠️  Certains ports sont occupés - Exécutez ./cleanup-ports.sh"
  exit 1
fi
