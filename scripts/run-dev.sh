#!/bin/bash
# Script to run the application with Node.js 22.16.0

# Set Node.js 22.16.0 as the active version
export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"

# Clean up ports before starting
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/cleanup-ports.sh" ]; then
  echo "🧹 Nettoyage des ports avant démarrage..."
  bash "$SCRIPT_DIR/cleanup-ports.sh"
  echo ""
fi

# Verify Node version
echo "Using Node.js: $(node --version)"
echo "Using npm: $(npm --version)"
echo ""

# Run the requested command
if [ "$1" == "backend" ]; then
  echo "Starting backend..."
  npm run dev:backend
elif [ "$1" == "frontend" ]; then
  echo "Starting frontend..."
  npm run dev:frontend
elif [ "$1" == "both" ] || [ "$1" == "" ]; then
  echo "Starting both frontend and backend..."
  npm run dev
else
  echo "Running custom command: npm run $@"
  npm run "$@"
fi
