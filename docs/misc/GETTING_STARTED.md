# Getting Started with WorkflowBuilder Pro

Welcome to WorkflowBuilder Pro! This guide will help you get up and running in minutes.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: >= 20.0.0 (Vite 7.0 requires Node 20+)
- **npm**: >= 9.0.0
- **PostgreSQL**: 15+ (for database)
- **Redis**: 7+ (optional, for caching and queues)
- **Docker**: Latest version (optional, for containerized deployment)

### Verify Prerequisites

```bash
# Check Node.js version
node --version  # Should be v20.x.x or higher

# Check npm version
npm --version   # Should be 9.x.x or higher

# Check PostgreSQL (if installed locally)
psql --version  # Should be 15.x or higher

# Check Redis (if installed locally)
redis-cli --version  # Should be 7.x or higher

# Check Docker (optional)
docker --version
```

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/workflow-automation.git
cd workflow-automation
```

### 2. Install Dependencies

```bash
npm install
```

This will install all necessary dependencies for both frontend and backend.

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

**CRITICAL**: Generate secure secrets for production:

```bash
# Generate JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate Encryption Key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Generate Session Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Edit `.env` and configure at minimum:

```bash
# Security (REQUIRED - use generated secrets above)
JWT_SECRET=your-jwt-secret-generated
JWT_REFRESH_SECRET=your-refresh-secret-generated
SESSION_SECRET=your-session-secret-generated
ENCRYPTION_MASTER_KEY=your-encryption-key-generated

# Database (REQUIRED)
DATABASE_URL=postgresql://user:password@localhost:5432/workflow_db

# Redis (REQUIRED for production, optional for dev)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password

# Application
NODE_ENV=development
PORT=3000
BACKEND_PORT=4000
```

For complete environment setup, see [docs/ENVIRONMENT_SETUP.md](docs/ENVIRONMENT_SETUP.md).

### 4. Start Database Services

#### Option A: Using Docker (Recommended)

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Verify services are running
docker-compose ps
```

#### Option B: Local Installation

Ensure PostgreSQL and Redis are running on your system:

```bash
# Start PostgreSQL (varies by OS)
sudo systemctl start postgresql  # Linux
brew services start postgresql   # macOS

# Start Redis (varies by OS)
sudo systemctl start redis       # Linux
brew services start redis        # macOS
```

### 5. Setup Database

```bash
# Run database migrations
npm run migrate

# Seed initial data (optional)
npm run seed
```

### 6. Start Development Server

```bash
# Start both frontend and backend
npm run dev

# Or start separately:
npm run dev:frontend  # Frontend on http://localhost:3000
npm run dev:backend   # Backend on http://localhost:4000
```

The application should now be running:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **GraphQL Playground**: http://localhost:4000/graphql

## First Steps

### 1. Access the Application

Open your browser and navigate to http://localhost:3000

### 2. Create Your First Workflow

1. **Click "New Workflow"** from the dashboard
2. **Drag a Trigger node** from the sidebar (e.g., "Webhook" or "Schedule")
3. **Add action nodes** by dragging them onto the canvas
4. **Connect nodes** by dragging from output to input ports
5. **Configure each node** by clicking on it
6. **Save your workflow** using the Save button in the header

### 3. Test Your Workflow

#### Using Test Data

1. Click on any node
2. Go to the "Test Data" tab in the config panel
3. Add sample JSON data
4. Click "Pin Data" to use this data during testing

#### Execute Workflow

1. Click the "Execute" button in the header
2. Watch the execution flow in real-time
3. Check node outputs by clicking on executed nodes
4. Review execution logs in the Debug Panel

### 4. Example: Simple HTTP to Slack Workflow

Create a workflow that fetches data from an API and sends it to Slack:

```
Webhook Trigger → HTTP Request → Transform → Slack Message
```

**Step-by-step:**

1. Add a **Webhook** trigger node
2. Add an **HTTP Request** node:
   - URL: `https://api.github.com/users/octocat`
   - Method: GET
3. Add a **Transform** node:
   - Expression: `{{ $json.login }} has {{ $json.public_repos }} public repos`
4. Add a **Slack** node:
   - Channel: #general
   - Message: `{{ $json.result }}`
5. Connect all nodes in sequence
6. Click Execute to test

## Common Tasks

### Starting the Application

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm run start:prod
```

### Running Tests

```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- path/to/file.test.ts

# Run with coverage
npm run test:coverage

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e
```

### Code Quality

```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run typecheck

# Format code
npm run format
```

### Database Operations

```bash
# Create new migration
npm run migrate:dev

# Deploy migrations to production
npm run migrate

# Open Prisma Studio (database GUI)
npm run studio

# Seed database
npm run seed
```

## Next Steps

Now that you have the application running, explore these resources:

- **[User Guide](docs/USER_GUIDE.md)**: Learn how to use all features
- **[API Documentation](API_REFERENCE.md)**: Explore the REST and GraphQL APIs
- **[Creating Workflows](docs/tutorials/02-creating-first-workflow.md)**: Detailed workflow tutorial
- **[Expression System](docs/tutorials/03-using-expressions.md)**: Learn dynamic expressions
- **[Node Library](docs/nodes/NODE_LIBRARY.md)**: Browse all 500+ available nodes
- **[Plugin Development](docs/PLUGIN_DEVELOPMENT.md)**: Create custom nodes

## Getting Help

### Documentation

- **[Full Documentation](docs/README.md)**: Complete documentation index
- **[Troubleshooting](TROUBLESHOOTING.md)**: Common issues and solutions
- **[FAQ](docs/FAQ.md)**: Frequently asked questions

### Community & Support

- **GitHub Issues**: [Report a bug](https://github.com/your-org/workflow-automation/issues)
- **GitHub Discussions**: [Ask questions](https://github.com/your-org/workflow-automation/discussions)
- **Discord**: Join our community server
- **Email**: support@workflowbuilder.com

## Development Environment

### Recommended IDE Setup

- **Visual Studio Code** with extensions:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features
  - Tailwind CSS IntelliSense
  - GraphQL
  - Prisma

### Project Structure

```
workflow-automation/
├── src/
│   ├── components/       # React components
│   ├── backend/          # Backend services
│   ├── types/            # TypeScript types
│   ├── store/            # State management (Zustand)
│   ├── services/         # Business logic services
│   ├── utils/            # Utility functions
│   └── workflow/         # Workflow-specific code
├── docs/                 # Documentation
├── public/               # Static assets
├── prisma/               # Database schema
├── tests/                # Test files
└── .github/              # GitHub Actions CI/CD
```

### Available Scripts

See [CLAUDE.md](CLAUDE.md) for a complete list of all available npm scripts.

## Production Deployment

For production deployment instructions, see:
- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)**: Comprehensive deployment guide
- **[Kubernetes Guide](docs/KUBERNETES_DEPLOYMENT_GUIDE.md)**: Deploy with Kubernetes
- **[Docker Guide](docker/README.md)**: Deploy with Docker

## Security Notes

**IMPORTANT**:
- Never commit `.env` files with real secrets
- Always generate unique secrets for each environment
- Use different secrets for dev, staging, and production
- Rotate secrets every 90 days in production
- Enable 2FA for all production accounts

## What's Next?

Explore these advanced features:
- **Multi-Agent AI**: Orchestrate multiple AI agents
- **Human-in-the-Loop**: Add approval workflows
- **Compliance**: Enable SOC2, GDPR, HIPAA controls
- **Environment Isolation**: Separate dev/staging/prod
- **Real-time Collaboration**: Work with your team
- **Plugin SDK**: Build custom integrations

---

**Need Help?** Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) or [open an issue](https://github.com/your-org/workflow-automation/issues).

Happy automating!
