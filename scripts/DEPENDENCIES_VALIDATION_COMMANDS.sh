#!/bin/bash
# Validation commands for dependency updates
# Run these commands to verify the updates

echo "=== DEPENDENCIES VALIDATION COMMANDS ==="
echo ""

echo "1. Verify updated versions:"
npm list prisma @prisma/client bcryptjs nodemailer dompurify
echo ""

echo "2. Check security vulnerabilities:"
npm audit
echo ""

echo "3. Validate Prisma schema:"
npx prisma validate
echo ""

echo "4. Check Prisma client generation:"
npx prisma generate
echo ""

echo "5. Run tests:"
npm run test -- --run
echo ""

echo "6. Try backend build:"
npm run build:backend
echo ""

echo "7. Try frontend build:"
npx vite build
echo ""

echo "=== ROLLBACK COMMANDS (if needed) ==="
echo "cp package.json.backup-deps-update package.json"
echo "cp package-lock.json.backup-deps-update package-lock.json"
echo "npm install"
echo "npx prisma generate"
