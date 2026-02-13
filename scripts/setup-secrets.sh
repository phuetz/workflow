#!/bin/bash

#############################################################
# Secrets Setup Script
#
# Quick setup script for local development secrets
# This creates a .env.local file with secure random secrets
#############################################################

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔐 Secrets Setup for Local Development${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

#############################################################
# Check if .env.local already exists
#############################################################
if [ -f ".env.local" ]; then
    echo -e "${YELLOW}⚠️  .env.local already exists${NC}"
    read -p "Overwrite? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
    mv .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "${GREEN}✅ Backed up existing .env.local${NC}"
fi

#############################################################
# Generate secure random secrets
#############################################################
echo -e "\n${BLUE}Generating secure random secrets...${NC}"

# Check if openssl is available
if ! command -v openssl &> /dev/null; then
    echo -e "${YELLOW}⚠️  openssl not found, using Node.js crypto instead${NC}"
    USE_NODE=1
else
    USE_NODE=0
fi

generate_secret() {
    local length=$1
    if [ $USE_NODE -eq 1 ]; then
        node -e "console.log(require('crypto').randomBytes($length).toString('base64'))"
    else
        openssl rand -base64 $length
    fi
}

JWT_SECRET=$(generate_secret 64)
JWT_REFRESH_SECRET=$(generate_secret 64)
SESSION_SECRET=$(generate_secret 64)
ENCRYPTION_KEY=$(generate_secret 32)

echo -e "${GREEN}✅ Secrets generated${NC}"

#############################################################
# Create .env.local
#############################################################
echo -e "\n${BLUE}Creating .env.local...${NC}"

cat > .env.local << EOF
# ===========================================
# LOCAL DEVELOPMENT ENVIRONMENT
# Auto-generated on $(date)
# ===========================================
# ⚠️  DO NOT COMMIT THIS FILE TO GIT
# ⚠️  DO NOT SHARE THESE SECRETS
# ===========================================

# Application
NODE_ENV=development
PORT=3000
API_PORT=3001

# Database (Local PostgreSQL)
DATABASE_URL=postgresql://workflow_user:$(generate_secret 16 | tr '+/' '-_')@localhost:5432/workflow_dev
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=workflow_dev
DATABASE_USER=workflow_user
DATABASE_PASSWORD=$(generate_secret 24 | tr '+/' '-_')
DATABASE_SSL=false

# Redis (Local)
REDIS_URL=redis://localhost:6379/0
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=$(generate_secret 24 | tr '+/' '-_')
REDIS_DB=0

# JWT Configuration (Development)
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
JWT_ISSUER=workflow-app-dev
JWT_AUDIENCE=workflow-users

# Session Configuration
SESSION_SECRET=${SESSION_SECRET}
SESSION_MAX_AGE=86400000
SESSION_SECURE=false
SESSION_SAME_SITE=lax

# Encryption
ENCRYPTION_MASTER_KEY=${ENCRYPTION_KEY}
ENCRYPTION_ALGORITHM=aes-256-gcm
HASH_SALT_ROUNDS=10

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
CORS_METHODS=GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS
CORS_CREDENTIALS=true

# Rate Limiting (Relaxed for development)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Vite Frontend
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_GRAPHQL_URL=http://localhost:3001/api/v1/graphql
VITE_WS_URL=ws://localhost:3001/ws
VITE_APP_URL=http://localhost:3000
VITE_DEBUG=true

# OAuth2 (Use test credentials)
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GITHUB_CLIENT_ID=your-github-client-id-here
GITHUB_CLIENT_SECRET=your-github-client-secret-here

# Email (Use test SMTP or Mailtrap)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=

# External APIs (Use test keys)
OPENAI_API_KEY=sk-test-key-here
ANTHROPIC_API_KEY=test-key-here
GOOGLE_AI_API_KEY=test-key-here

# Feature Flags (Enable for development)
FEATURE_AI_ASSISTANT=true
FEATURE_DEBUGGING=true
FEATURE_BETA_FEATURES=true

# Logging
LOG_LEVEL=debug
DEBUG=true

# Timeouts (Longer for debugging)
TIMEOUT_API_REQUEST=60000
TIMEOUT_WORKFLOW_EXECUTION=600000
EOF

chmod 600 .env.local

echo -e "${GREEN}✅ .env.local created with secure permissions (600)${NC}"

#############################################################
# Create .env.test if needed
#############################################################
if [ ! -f ".env.test" ]; then
    echo -e "\n${BLUE}Creating .env.test...${NC}"

    cat > .env.test << EOF
# Test Environment Configuration
NODE_ENV=test

# Test Database (In-memory or separate test DB)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/workflow_test
REDIS_URL=redis://localhost:6379/15

# Test Secrets (Simplified for faster tests)
JWT_SECRET=test-jwt-secret-$(generate_secret 16 | tr '+/' '-_')
JWT_REFRESH_SECRET=test-refresh-secret-$(generate_secret 16 | tr '+/' '-_')
SESSION_SECRET=test-session-secret-$(generate_secret 16 | tr '+/' '-_')
ENCRYPTION_MASTER_KEY=$(generate_secret 32)

# Test Timeouts (Faster)
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=1d
TIMEOUT_API_REQUEST=5000
TIMEOUT_WORKFLOW_EXECUTION=30000

# Disable external services
OPENAI_API_KEY=test-key
ANTHROPIC_API_KEY=test-key
SMTP_HOST=localhost
SMTP_PORT=1025

# Test logging
LOG_LEVEL=error
DEBUG=false

# Disable rate limiting
RATE_LIMIT_MAX_REQUESTS=100000
EOF

    chmod 600 .env.test
    echo -e "${GREEN}✅ .env.test created${NC}"
fi

#############################################################
# Verify .gitignore
#############################################################
echo -e "\n${BLUE}Verifying .gitignore...${NC}"

if ! grep -q "^\.env\.local$" .gitignore 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Adding .env.local to .gitignore${NC}"
    echo ".env.local" >> .gitignore
fi

if ! grep -q "^\.env\.test$" .gitignore 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Adding .env.test to .gitignore${NC}"
    echo ".env.test" >> .gitignore
fi

echo -e "${GREEN}✅ .gitignore updated${NC}"

#############################################################
# Setup database (optional)
#############################################################
echo -e "\n${BLUE}Database Setup${NC}"
read -p "Create local PostgreSQL database? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Extract database credentials from .env.local
    DB_USER=$(grep "^DATABASE_USER=" .env.local | cut -d'=' -f2)
    DB_PASS=$(grep "^DATABASE_PASSWORD=" .env.local | cut -d'=' -f2)
    DB_NAME=$(grep "^DATABASE_NAME=" .env.local | cut -d'=' -f2)

    if command -v psql &> /dev/null; then
        echo "Creating database and user..."

        # Create user
        sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';" 2>/dev/null || echo "User may already exist"

        # Create database
        sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" 2>/dev/null || echo "Database may already exist"

        # Grant privileges
        sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"

        echo -e "${GREEN}✅ Database created${NC}"
    else
        echo -e "${YELLOW}⚠️  PostgreSQL not found. Install it or create the database manually.${NC}"
    fi
fi

#############################################################
# Summary and next steps
#############################################################
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Secrets setup complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Files created:${NC}"
echo "  • .env.local (your development secrets)"
echo "  • .env.test (test environment secrets)"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Review .env.local and update external API keys if needed"
echo "  2. Start the development server: npm run dev"
echo "  3. Run tests: npm test"
echo ""
echo -e "${YELLOW}⚠️  Important Security Notes:${NC}"
echo "  • NEVER commit .env.local or .env.test to git"
echo "  • These are LOCAL secrets only - use a secrets manager for production"
echo "  • See SECRETS_MANAGEMENT_URGENT_GUIDE.md for production setup"
echo ""
