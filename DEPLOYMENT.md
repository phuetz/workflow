# Deployment Guide

This guide covers deploying WorkflowBuilder Pro to various hosting platforms.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Deployment Platforms](#deployment-platforms)
  - [Vercel](#vercel)
  - [Netlify](#netlify)
  - [Docker](#docker)
  - [AWS](#aws)
- [Post-Deployment](#post-deployment)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying, ensure you have:

- ✅ Supabase project created
- ✅ Database migrations applied
- ✅ Environment variables configured
- ✅ Build tested locally (`npm run build`)
- ✅ All tests passing (`npm run test`)

## Environment Variables

### Required Variables

```env
# Supabase (REQUIRED)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# App Configuration
VITE_APP_URL=https://your-domain.com
NODE_ENV=production
```

### Optional Variables

```env
# OAuth Providers
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_GITHUB_CLIENT_ID=your-github-client-id
VITE_MICROSOFT_CLIENT_ID=your-microsoft-client-id

# Security
ENCRYPTION_KEY=your-32-byte-hex-key
JWT_SECRET=your-jwt-secret

# Monitoring
VITE_SENTRY_DSN=https://your-sentry-dsn

# Analytics
VITE_ENABLE_ANALYTICS=true
```

## Database Setup

### 1. Create Supabase Project

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref
```

### 2. Apply Migrations

```bash
# Apply all migrations
npm run db:migrate

# Or manually
supabase db push
```

### 3. Verify Tables

Check that all tables are created:
- user_profiles
- organizations
- workflows
- executions
- credentials
- webhooks
- audit_logs
- etc.

## Deployment Platforms

### Vercel

#### Using Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

#### Using GitHub Integration

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Configure environment variables
5. Deploy

#### Vercel Configuration

Create `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
```

### Netlify

#### Using Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
```

#### Netlify Configuration

Create `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "SAMEORIGIN"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

### Docker

#### Dockerfile

Create `Dockerfile`:

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### nginx.conf

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;
}
```

#### Build and Run

```bash
# Build image
docker build -t workflowbuilder-pro .

# Run container
docker run -p 80:80 \
  -e VITE_SUPABASE_URL=your-url \
  -e VITE_SUPABASE_ANON_KEY=your-key \
  workflowbuilder-pro
```

#### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "80:80"
    environment:
      - VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
      - VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
    restart: unless-stopped
```

Run with:

```bash
docker-compose up -d
```

### AWS

#### S3 + CloudFront

1. **Build the app**:
   ```bash
   npm run build
   ```

2. **Create S3 bucket**:
   ```bash
   aws s3 mb s3://workflowbuilder-pro
   ```

3. **Upload files**:
   ```bash
   aws s3 sync dist/ s3://workflowbuilder-pro --delete
   ```

4. **Configure bucket for static hosting**:
   ```bash
   aws s3 website s3://workflowbuilder-pro \
     --index-document index.html \
     --error-document index.html
   ```

5. **Create CloudFront distribution** for HTTPS and caching

#### Elastic Beanstalk

1. Create `Dockerrun.aws.json`:
   ```json
   {
     "AWSEBDockerrunVersion": "1",
     "Image": {
       "Name": "your-docker-registry/workflowbuilder-pro:latest"
     },
     "Ports": [
       {
         "ContainerPort": 80
       }
     ]
   }
   ```

2. Deploy:
   ```bash
   eb init
   eb create production
   eb deploy
   ```

## Post-Deployment

### 1. Verify Deployment

```bash
# Check HTTP status
curl -I https://your-domain.com

# Check if app loads
curl https://your-domain.com

# Test API endpoints
curl https://your-domain.com/api/health
```

### 2. Run Smoke Tests

```bash
# Run E2E tests against production
PLAYWRIGHT_BASE_URL=https://your-domain.com npm run test:e2e
```

### 3. Configure DNS

Point your domain to the deployment:

- **Vercel**: Add custom domain in Vercel dashboard
- **Netlify**: Add custom domain in Netlify dashboard
- **AWS**: Create Route53 records

### 4. SSL Certificate

Most platforms handle SSL automatically. If not:

```bash
# Using Let's Encrypt with certbot
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 5. Set up CDN

For better performance, use a CDN:
- Cloudflare
- AWS CloudFront
- Fastly

## Monitoring

### Application Monitoring

#### Sentry

1. Create Sentry project
2. Add DSN to environment variables
3. Sentry will automatically capture errors

#### Custom Monitoring

Monitor these metrics:
- Response times
- Error rates
- User activity
- Workflow executions
- Database performance

### Logs

Enable logging for:
- Application errors
- Security events
- Performance issues
- User actions

### Uptime Monitoring

Use services like:
- UptimeRobot
- Pingdom
- StatusCake

## Troubleshooting

### Build Failures

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run typecheck

# Try building locally
npm run build
```

### Environment Variables Not Working

1. Check variable names start with `VITE_` for frontend
2. Rebuild after changing env vars
3. Restart deployment

### Database Connection Issues

```bash
# Test Supabase connection
curl -H "apikey: YOUR_ANON_KEY" \
  https://your-project.supabase.co/rest/v1/
```

### Performance Issues

1. Enable caching
2. Use CDN
3. Optimize images
4. Enable gzip compression
5. Review bundle size

### CORS Errors

Update Supabase CORS settings:
- Add your domain to allowed origins
- Include subdomains if needed

## Rollback Procedure

### Vercel

```bash
# List deployments
vercel list

# Rollback to specific deployment
vercel rollback [deployment-url]
```

### Docker

```bash
# Use previous image
docker pull workflowbuilder-pro:previous-tag
docker run -d workflowbuilder-pro:previous-tag
```

### Database

```bash
# Restore from backup
supabase db dump > backup.sql
supabase db restore backup.sql
```

## Security Checklist

- [ ] HTTPS enabled
- [ ] Environment variables secured
- [ ] Database credentials rotated
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Security headers set
- [ ] XSS protection enabled
- [ ] CSRF protection enabled
- [ ] Content Security Policy configured
- [ ] Audit logging enabled

## Performance Checklist

- [ ] Bundle size optimized
- [ ] Images optimized
- [ ] CDN configured
- [ ] Caching enabled
- [ ] Gzip/Brotli compression enabled
- [ ] Lazy loading implemented
- [ ] Code splitting configured
- [ ] Service Worker active

## Backup Strategy

### Database Backups

```bash
# Daily automated backups with Supabase
# Or manual backup
supabase db dump > backup-$(date +%Y%m%d).sql
```

### File Backups

- Back up uploaded files to S3
- Keep multiple versions
- Test restore procedure

## Support

Need help with deployment?

- 📖 [Documentation](./README.md)
- 💬 [Discord Community](https://discord.gg/workflow)
- 📧 Email: support@workflowbuilder.app
- 🐛 [GitHub Issues](https://github.com/org/workflowbuilder-pro/issues)

---

**Happy Deploying! 🚀**
