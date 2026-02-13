# Troubleshooting Guide

Common issues and solutions for WorkflowBuilder Pro.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Database Issues](#database-issues)
- [Redis Issues](#redis-issues)
- [Build Issues](#build-issues)
- [Runtime Issues](#runtime-issues)
- [Performance Issues](#performance-issues)
- [Authentication Issues](#authentication-issues)
- [Workflow Execution Issues](#workflow-execution-issues)
- [Docker Issues](#docker-issues)
- [Testing Issues](#testing-issues)

---

## Installation Issues

### Node.js Version Error

**Error:**
```
Error: The engine "node" is incompatible with this module
```

**Solution:**
```bash
# Check current Node.js version
node --version

# Install Node.js 20+ using nvm
nvm install 20
nvm use 20

# Verify version
node --version  # Should be v20.x.x
```

### npm Install Fails

**Error:**
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall with legacy peer deps
npm install --legacy-peer-deps

# Or use force
npm install --force
```

### Vite 7 Compatibility

**Error:**
```
Error: Vite requires Node.js 20+
```

**Solution:**
Vite 7.0 requires Node.js 20 or higher. Upgrade Node.js:

```bash
# Using nvm
nvm install 20
nvm use 20

# Or downgrade Vite (not recommended)
npm install vite@6.x.x
```

---

## Database Issues

### Cannot Connect to PostgreSQL

**Error:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**

1. Check if PostgreSQL is running:
```bash
# Linux
sudo systemctl status postgresql

# macOS
brew services list | grep postgresql

# Docker
docker ps | grep postgres
```

2. Start PostgreSQL:
```bash
# Linux
sudo systemctl start postgresql

# macOS
brew services start postgresql

# Docker
docker-compose up -d postgres
```

3. Verify DATABASE_URL in `.env`:
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/workflow_db
```

### Migration Fails

**Error:**
```
Error: Migration failed to apply
```

**Solution:**

1. Reset database (development only):
```bash
npm run migrate:reset
npm run migrate
npm run seed
```

2. Check migration status:
```bash
npx prisma migrate status
```

3. Force migration (use with caution):
```bash
npx prisma migrate resolve --applied "migration_name"
```

### Database Access Denied

**Error:**
```
Error: password authentication failed for user "postgres"
```

**Solution:**

1. Verify credentials in `.env`:
```bash
DATABASE_URL=postgresql://correct_user:correct_password@localhost:5432/workflow_db
```

2. Reset PostgreSQL password:
```bash
sudo -u postgres psql
ALTER USER postgres PASSWORD 'newpassword';
\q
```

---

## Redis Issues

### Cannot Connect to Redis

**Error:**
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solution:**

1. Check if Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

2. Start Redis:
```bash
# Linux
sudo systemctl start redis

# macOS
brew services start redis

# Docker
docker-compose up -d redis
```

3. Verify REDIS_URL in `.env`:
```bash
REDIS_URL=redis://localhost:6379
```

### Redis Authentication Failed

**Error:**
```
Error: NOAUTH Authentication required
```

**Solution:**

Update `.env` with Redis password:
```bash
REDIS_URL=redis://:your-password@localhost:6379
# or
REDIS_PASSWORD=your-password
```

---

## Build Issues

### TypeScript Errors

**Error:**
```
TS2304: Cannot find name 'xxx'
TS2322: Type 'xxx' is not assignable to type 'yyy'
```

**Solution:**

1. Run type checking:
```bash
npm run typecheck
```

2. Install missing type definitions:
```bash
npm install --save-dev @types/missing-package
```

3. Clear TypeScript cache:
```bash
rm -rf node_modules/.cache
rm -rf dist
npm run build
```

### Build Out of Memory

**Error:**
```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

**Solution:**

Increase Node.js memory limit:
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

Or add to package.json:
```json
{
  "scripts": {
    "build": "NODE_OPTIONS='--max-old-space-size=4096' vite build"
  }
}
```

### Vite Build Fails

**Error:**
```
Error: Could not resolve entry module
```

**Solution:**

1. Check file paths in `vite.config.ts`
2. Clear Vite cache:
```bash
rm -rf node_modules/.vite
npm run dev
```

---

## Runtime Issues

### Port Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**

1. Find and kill process using the port:
```bash
# Linux/macOS
lsof -i :3000
kill -9 PID

# Or use
npx kill-port 3000
```

2. Use a different port:
```bash
PORT=3001 npm run dev
```

### Module Not Found

**Error:**
```
Error: Cannot find module 'xxx'
```

**Solution:**

1. Reinstall dependencies:
```bash
rm -rf node_modules
npm install
```

2. Check import paths (case-sensitive)
3. Verify file exists and has correct extension

### Environment Variables Not Loaded

**Error:**
```
Error: process.env.SOME_VAR is undefined
```

**Solution:**

1. Verify `.env` file exists and has correct variables
2. Restart dev server:
```bash
npm run dev
```

3. Check that variables are loaded:
```javascript
console.log(process.env.NODE_ENV)
```

4. For frontend variables, prefix with `VITE_`:
```bash
VITE_API_URL=http://localhost:4000
```

---

## Performance Issues

### Slow Application Startup

**Symptoms:** App takes >5 seconds to start

**Solution:**

1. Enable lazy loading:
```typescript
// Use dynamic imports
const Component = lazy(() => import('./Component'))
```

2. Optimize bundle size:
```bash
npm run analyze
npm run optimize
```

3. Use production build:
```bash
npm run build
npm run preview
```

### High Memory Usage

**Symptoms:** Application uses >500MB RAM

**Solution:**

1. Check for memory leaks:
```bash
npm run test:memory
```

2. Enable React strict mode (already enabled)
3. Review useEffect cleanup functions
4. Limit stored data in Zustand store

### Slow Workflow Execution

**Symptoms:** Workflows take longer than expected

**Solution:**

1. Enable debug mode to identify bottlenecks
2. Check node execution times in Debug Panel
3. Optimize HTTP request nodes (use connection pooling)
4. Enable caching for repeated operations
5. Use parallel execution where possible

---

## Authentication Issues

### Invalid JWT Token

**Error:**
```
Error: jwt malformed
Error: invalid signature
```

**Solution:**

1. Clear local storage and login again:
```javascript
localStorage.clear()
window.location.reload()
```

2. Verify JWT_SECRET in `.env` matches backend
3. Check token expiration (default: 1 hour)

### Session Expired

**Error:**
```
Error: Session expired
```

**Solution:**

1. Refresh token automatically (implemented)
2. Login again if refresh fails
3. Check SESSION_SECRET in `.env`

### OAuth2 Callback Error

**Error:**
```
Error: state mismatch
Error: invalid_grant
```

**Solution:**

1. Verify OAuth2 credentials in `.env`:
```bash
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

2. Check redirect URI matches OAuth2 app settings
3. Clear cookies and try again

---

## Workflow Execution Issues

### Workflow Won't Execute

**Symptoms:** Execute button does nothing

**Solution:**

1. Check browser console for errors
2. Verify all nodes are properly configured
3. Ensure workflow is saved
4. Check backend logs:
```bash
npm run dev:backend
```

### Node Execution Fails

**Error:**
```
Error: Node execution failed: xxx
```

**Solution:**

1. Check node configuration
2. Verify credentials are set correctly
3. Enable debug mode for detailed error logs
4. Check node-specific documentation

### Webhook Not Triggered

**Symptoms:** Webhook workflow doesn't execute

**Solution:**

1. Verify webhook URL is correct
2. Check webhook authentication method
3. Test webhook manually:
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}' \
  https://api.workflowbuilder.com/webhook/your-path
```

4. Check webhook logs in Dashboard

### Expression Evaluation Error

**Error:**
```
Error: Invalid expression: {{ xxx }}
```

**Solution:**

1. Check expression syntax:
```javascript
// Correct
{{ $json.field }}
{{ $node["NodeName"].json.value }}

// Incorrect
{{ json.field }}  // Missing $
{{ $json.field }  // Missing closing brace
```

2. Use Expression Builder for complex expressions
3. Check available context variables

---

## Docker Issues

### Docker Build Fails

**Error:**
```
Error: failed to solve with frontend dockerfile.v0
```

**Solution:**

1. Update Docker:
```bash
docker --version  # Should be 20.10+
```

2. Clear Docker cache:
```bash
docker system prune -a
docker builder prune
```

3. Build with no cache:
```bash
docker-compose build --no-cache
```

### Container Won't Start

**Error:**
```
Error: Container exits immediately
```

**Solution:**

1. Check container logs:
```bash
docker-compose logs app
docker logs container_name
```

2. Verify environment variables in docker-compose.yml
3. Check for port conflicts
4. Ensure database and redis containers are running

### Cannot Access Application in Docker

**Symptoms:** Can't reach http://localhost:3000

**Solution:**

1. Check port mapping in docker-compose.yml:
```yaml
ports:
  - "3000:3000"
```

2. Verify container is running:
```bash
docker-compose ps
```

3. Check firewall settings
4. Use container IP directly:
```bash
docker inspect container_name | grep IPAddress
```

---

## Testing Issues

### Tests Fail to Run

**Error:**
```
Error: Cannot find module '@testing-library/react'
```

**Solution:**

1. Install test dependencies:
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom
```

2. Clear test cache:
```bash
npx vitest --clearCache
```

### Tests Timeout

**Error:**
```
Error: Test exceeded timeout of 5000ms
```

**Solution:**

1. Increase timeout in test file:
```typescript
test('my test', async () => {
  // ...
}, { timeout: 10000 })
```

2. Or in vitest.config.ts:
```typescript
export default {
  test: {
    testTimeout: 10000
  }
}
```

### Database Tests Fail

**Error:**
```
Error: Cannot connect to test database
```

**Solution:**

1. Create separate test database:
```bash
createdb workflow_test
```

2. Set DATABASE_URL for tests:
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/workflow_test npm run test
```

3. Run migrations on test database:
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/workflow_test npm run migrate
```

---

## Common FAQ

### Q: How do I reset everything and start fresh?

**A:**
```bash
# Stop all services
docker-compose down

# Remove all data
rm -rf node_modules dist coverage
docker volume prune -f

# Reinstall
npm install

# Restart
docker-compose up -d
npm run migrate
npm run seed
npm run dev
```

### Q: How do I enable debug logging?

**A:**
Add to `.env`:
```bash
NODE_ENV=development
LOG_LEVEL=debug
DEBUG=true
```

### Q: Where are the logs located?

**A:**
- Development: Console output
- Production: `logs/` directory
- Docker: `docker-compose logs -f app`

### Q: How do I check application version?

**A:**
```bash
# Check package.json
npm run version

# Or via API
curl http://localhost:4000/health
```

### Q: How do I update to the latest version?

**A:**
```bash
# Pull latest code
git pull origin main

# Update dependencies
npm install

# Run migrations
npm run migrate

# Rebuild
npm run build
```

---

## Getting More Help

If your issue isn't listed here:

1. **Check Documentation**: [docs/README.md](docs/README.md)
2. **Search Issues**: [GitHub Issues](https://github.com/your-org/workflow-automation/issues)
3. **Ask Community**: [GitHub Discussions](https://github.com/your-org/workflow-automation/discussions)
4. **Discord**: Join our community server
5. **Contact Support**: support@workflowbuilder.com

### When Reporting Issues

Please include:

- Operating System and version
- Node.js version (`node --version`)
- npm version (`npm --version`)
- Steps to reproduce
- Error messages (full stack trace)
- Relevant logs
- Screenshots (if applicable)

### Quick Diagnostics

Run this command to generate a diagnostic report:

```bash
npm run diagnostics
```

This will check:
- Node.js and npm versions
- Database connectivity
- Redis connectivity
- Environment variables
- Port availability
- Disk space

---

## Emergency Recovery

### Complete Reset (Nuclear Option)

If nothing else works:

```bash
# Backup important data first!
./scripts/backup.sh

# Stop everything
docker-compose down -v
killall node

# Remove all generated files
rm -rf node_modules dist coverage .vite logs
rm .env

# Fresh install
cp .env.example .env
# Edit .env with your secrets
npm install
docker-compose up -d
npm run migrate
npm run seed
npm run dev
```

### Rollback to Previous Version

```bash
# Find previous working commit
git log --oneline

# Rollback (replace COMMIT_HASH)
git checkout COMMIT_HASH

# Or create rollback branch
git checkout -b rollback-to-working
```

---

## Prevention Tips

1. **Always backup** before major changes
2. **Use version control** (git)
3. **Test in development** before production
4. **Keep dependencies updated** regularly
5. **Monitor logs** for early warnings
6. **Document custom changes**
7. **Use .env.example** as template
8. **Never commit secrets** to git

---

**Still stuck?** Open an issue on GitHub with the `help-wanted` label.
