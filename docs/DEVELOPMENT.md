# 🛠️ Development Guide

This guide provides comprehensive information for developers working on the Workflow Automation Platform.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Development Setup](#development-setup)
3. [Project Structure](#project-structure)
4. [Architecture Overview](#architecture-overview)
5. [Development Workflow](#development-workflow)
6. [Testing Strategy](#testing-strategy)
7. [Performance Guidelines](#performance-guidelines)
8. [Security Considerations](#security-considerations)
9. [Debugging](#debugging)
10. [Contributing](#contributing)

## 🔧 Prerequisites

### Required Software
- **Node.js 18+** - JavaScript runtime
- **npm 9+** - Package manager
- **Docker 24+** - Containerization
- **Docker Compose 2.0+** - Multi-container orchestration
- **PostgreSQL 15+** - Primary database
- **Redis 7+** - Caching and sessions
- **Git 2.30+** - Version control

### Recommended Tools
- **VS Code** with extensions:
  - TypeScript and JavaScript Language Features
  - ESLint
  - Prettier
  - GitLens
  - Thunder Client (API testing)
  - Docker
- **Postman** or **Insomnia** - API testing
- **TablePlus** or **pgAdmin** - Database management
- **RedisInsight** - Redis management

## 🚀 Development Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/your-org/workflow-automation.git
cd workflow-automation

# Install dependencies
npm install

# Install Playwright browsers (for E2E tests)
npx playwright install
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env.development

# Edit the configuration
nano .env.development
```

Required environment variables:
```bash
NODE_ENV=development
DATABASE_URL=postgresql://workflow:workflow123@localhost:5432/workflow_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-jwt-secret-key
ENCRYPTION_KEY=dev-32-character-encryption-key
```

### 3. Database Setup

```bash
# Start PostgreSQL and Redis
docker-compose -f docker-compose.dev.yml up -d postgres redis

# Run database migrations
npm run migrate

# Seed development data
npm run seed
```

### 4. Start Development Server

```bash
# Start the development server
npm run dev

# Or start with debugging
npm run dev:debug
```

The application will be available at:
- Frontend: http://localhost:3000
- API: http://localhost:3001
- GraphQL Playground: http://localhost:3001/graphql
- WebSocket: ws://localhost:3002

## 📁 Project Structure

```
workflow-automation/
├── src/                          # Source code
│   ├── components/               # React components
│   │   ├── ui/                   # Reusable UI components
│   │   ├── workflow/             # Workflow-specific components
│   │   └── pages/                # Page components
│   ├── services/                 # Business logic services
│   │   ├── api/                  # API service layers
│   │   ├── auth/                 # Authentication services
│   │   └── workflow/             # Workflow execution engine
│   ├── store/                    # State management
│   ├── types/                    # TypeScript type definitions
│   ├── utils/                    # Utility functions
│   ├── hooks/                    # Custom React hooks
│   ├── backend/                  # Node.js backend
│   │   ├── api/                  # Express routes
│   │   ├── services/             # Backend services
│   │   ├── database/             # Database layer
│   │   └── websocket/            # WebSocket handlers
│   └── styles/                   # CSS and styling
├── public/                       # Static assets
├── docs/                         # Documentation
├── scripts/                      # Build and deployment scripts
├── tests/                        # Test files
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   └── e2e/                      # End-to-end tests
├── k8s/                         # Kubernetes manifests
├── monitoring/                   # Monitoring configurations
└── nginx/                       # NGINX configurations
```

## 🏗️ Architecture Overview

### Frontend Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌────────────────┐
│   React App     │────│  Zustand Store   │────│  Local Storage │
└─────────────────┘    └──────────────────┘    └────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌──────────────────┐
│  ReactFlow      │    │  Service Layer   │
│  (Visual Editor)│    │  (API Calls)     │
└─────────────────┘    └──────────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │  Backend APIs    │
                    └──────────────────┘
```

### Backend Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌────────────────┐
│   Express API   │────│   GraphQL API    │────│   WebSocket    │
└─────────────────┘    └──────────────────┘    └────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌────────────────┐
│ Service Layer   │────│ Workflow Engine  │────│ Event System   │
└─────────────────┘    └──────────────────┘    └────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌──────────────────┐
│   PostgreSQL    │    │      Redis       │
│   (Primary DB)  │    │   (Cache/Queue)  │
└─────────────────┘    └──────────────────┘
```

### Key Components

#### Frontend Components

**ModernWorkflowEditor.tsx**
- Main visual workflow editor
- Handles node drag-and-drop
- Manages workflow state
- Integrates with ReactFlow

**CustomNode.tsx**  
- Individual workflow node component
- Handles node configuration
- Manages input/output connections
- Supports custom node types

**ExecutionViewer.tsx**
- Real-time workflow execution monitoring
- Shows execution progress
- Displays node results and errors
- Live updates via WebSocket

#### Backend Services

**WorkflowExecutor** (`src/components/ExecutionEngine.ts`)
- Core workflow execution engine
- Handles node-by-node execution
- Manages data flow between nodes
- Supports parallel and conditional execution

**RealTimeCollaborationService**
- Manages multi-user editing
- Operational transformation for conflict resolution
- Presence awareness and cursor tracking
- Real-time synchronization

**GraphQLService**
- Provides GraphQL API
- Handles queries, mutations, subscriptions
- Integrates with authentication
- Real-time updates via subscriptions

## 🔄 Development Workflow

### 1. Feature Development

```bash
# Create feature branch
git checkout -b feature/new-integration

# Make changes
# ... develop your feature

# Run tests
npm run test
npm run test:integration

# Check code quality
npm run lint
npm run typecheck

# Commit changes
git add .
git commit -m "feat: add new integration for Slack"

# Push and create PR
git push origin feature/new-integration
```

### 2. Code Standards

#### TypeScript Standards
```typescript
// Use explicit types
interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, any>;
}

// Use proper error handling
try {
  const result = await executeWorkflow(workflow);
  return result;
} catch (error) {
  logger.error('Workflow execution failed:', error);
  throw new WorkflowExecutionError('Failed to execute workflow', error);
}

// Use proper async/await
const processNode = async (node: WorkflowNode): Promise<NodeResult> => {
  const executor = getNodeExecutor(node.type);
  return await executor.execute(node.data);
};
```

#### React Component Standards
```tsx
// Use proper component structure
interface WorkflowNodeProps {
  node: WorkflowNode;
  onUpdate: (nodeId: string, data: any) => void;
  isSelected?: boolean;
}

export const WorkflowNode: React.FC<WorkflowNodeProps> = ({ 
  node, 
  onUpdate, 
  isSelected = false 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleUpdate = useCallback((data: any) => {
    onUpdate(node.id, data);
  }, [node.id, onUpdate]);

  return (
    <div className={`workflow-node ${isSelected ? 'selected' : ''}`}>
      {/* Component content */}
    </div>
  );
};
```

### 3. State Management

Using Zustand for global state:

```typescript
// stores/workflowStore.ts
interface WorkflowState {
  workflows: Workflow[];
  currentWorkflow: Workflow | null;
  isExecuting: boolean;
  
  // Actions
  addWorkflow: (workflow: Workflow) => void;
  updateWorkflow: (id: string, updates: Partial<Workflow>) => void;
  executeWorkflow: (id: string) => Promise<void>;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflows: [],
  currentWorkflow: null,
  isExecuting: false,
  
  addWorkflow: (workflow) => 
    set((state) => ({ workflows: [...state.workflows, workflow] })),
    
  updateWorkflow: (id, updates) =>
    set((state) => ({
      workflows: state.workflows.map(w => 
        w.id === id ? { ...w, ...updates } : w
      )
    })),
    
  executeWorkflow: async (id) => {
    set({ isExecuting: true });
    try {
      const workflow = get().workflows.find(w => w.id === id);
      if (workflow) {
        await workflowExecutor.execute(workflow);
      }
    } finally {
      set({ isExecuting: false });
    }
  }
}));
```

## 🧪 Testing Strategy

### Unit Tests
```typescript
// __tests__/services/WorkflowExecutor.test.ts
import { WorkflowExecutor } from '../services/WorkflowExecutor';

describe('WorkflowExecutor', () => {
  let executor: WorkflowExecutor;

  beforeEach(() => {
    executor = new WorkflowExecutor();
  });

  it('should execute simple workflow', async () => {
    const workflow = createTestWorkflow();
    const result = await executor.execute(workflow);
    
    expect(result.status).toBe('completed');
    expect(result.nodes).toHaveLength(3);
  });

  it('should handle node execution errors', async () => {
    const workflow = createFailingWorkflow();
    
    await expect(executor.execute(workflow))
      .rejects.toThrow('Node execution failed');
  });
});
```

### Integration Tests
```typescript
// __tests__/integration/api.test.ts
import request from 'supertest';
import { app } from '../src/backend/app';

describe('Workflow API', () => {
  it('should create workflow', async () => {
    const response = await request(app)
      .post('/api/workflows')
      .send({
        name: 'Test Workflow',
        nodes: [],
        edges: []
      })
      .expect(201);

    expect(response.body.workflow).toHaveProperty('id');
  });
});
```

### E2E Tests
```typescript
// tests/e2e/workflow-creation.spec.ts
import { test, expect } from '@playwright/test';

test('should create and execute workflow', async ({ page }) => {
  await page.goto('/');
  
  // Create new workflow
  await page.click('[data-testid="new-workflow"]');
  await page.fill('[data-testid="workflow-name"]', 'Test Workflow');
  
  // Add nodes
  await page.dragAndDrop('[data-testid="http-node"]', '[data-testid="canvas"]');
  
  // Configure node
  await page.click('[data-testid="node-config"]');
  await page.fill('[data-testid="url-input"]', 'https://api.example.com');
  
  // Execute workflow
  await page.click('[data-testid="execute-workflow"]');
  
  // Verify execution
  await expect(page.locator('[data-testid="execution-status"]'))
    .toContainText('Completed');
});
```

## ⚡ Performance Guidelines

### Frontend Performance
```typescript
// Use React.memo for expensive components
export const WorkflowNode = React.memo<WorkflowNodeProps>(({ node, onUpdate }) => {
  // Component implementation
});

// Use useMemo for expensive calculations
const processedNodes = useMemo(() => {
  return nodes.map(node => ({
    ...node,
    executionTime: calculateExecutionTime(node)
  }));
}, [nodes]);

// Use useCallback for event handlers
const handleNodeUpdate = useCallback((nodeId: string, data: any) => {
  updateWorkflow(workflowId, { nodes: updatedNodes });
}, [workflowId, updateWorkflow]);
```

### Backend Performance
```typescript
// Use connection pooling
const pool = new Pool({
  host: 'localhost',
  database: 'workflow',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Use caching strategically
const getCachedWorkflow = async (id: string): Promise<Workflow> => {
  const cached = await redis.get(`workflow:${id}`);
  if (cached) {
    return JSON.parse(cached);
  }
  
  const workflow = await db.workflow.findUnique({ where: { id } });
  await redis.setex(`workflow:${id}`, 300, JSON.stringify(workflow));
  return workflow;
};

// Use streaming for large datasets
const streamWorkflowResults = async (workflowId: string) => {
  const stream = new PassThrough();
  
  const results = await db.workflowExecution.findMany({
    where: { workflowId },
    orderBy: { createdAt: 'desc' }
  });
  
  for (const result of results) {
    stream.write(JSON.stringify(result) + '\n');
  }
  
  stream.end();
  return stream;
};
```

## 🔒 Security Considerations

### Authentication & Authorization
```typescript
// JWT middleware
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// RBAC check
const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.permissions.includes(permission)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
```

### Input Validation
```typescript
// Use Joi for validation
const workflowSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500),
  nodes: Joi.array().items(nodeSchema).required(),
  edges: Joi.array().items(edgeSchema).required()
});

const validateWorkflow = (data: any) => {
  const { error, value } = workflowSchema.validate(data);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }
  return value;
};
```

### SQL Injection Prevention
```typescript
// Use parameterized queries
const getUserWorkflows = async (userId: string) => {
  return await db.workflow.findMany({
    where: {
      userId: userId, // Prisma handles parameterization
      deleted: false
    },
    include: {
      executions: {
        take: 10,
        orderBy: { createdAt: 'desc' }
      }
    }
  });
};
```

## 🐛 Debugging

### Frontend Debugging
```typescript
// React DevTools debugging
useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Workflow state updated:', workflow);
  }
}, [workflow]);

// Performance debugging
const ProfiledWorkflowEditor = process.env.NODE_ENV === 'development'
  ? React.Profiler.wrap(WorkflowEditor, 'WorkflowEditor')
  : WorkflowEditor;
```

### Backend Debugging
```typescript
// Debug logging
import debug from 'debug';
const log = debug('workflow:execution');

const executeNode = async (node: WorkflowNode) => {
  log('Executing node %s of type %s', node.id, node.type);
  
  try {
    const result = await nodeExecutor.execute(node);
    log('Node %s completed successfully', node.id);
    return result;
  } catch (error) {
    log('Node %s failed: %s', node.id, error.message);
    throw error;
  }
};
```

### Development Tools

**VS Code Launch Configuration** (`.vscode/launch.json`):
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/backend/server.js",
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "workflow:*"
      },
      "console": "integratedTerminal"
    }
  ]
}
```

## 🤝 Contributing

### Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow coding standards
   - Add tests for new functionality
   - Update documentation

3. **Quality Checks**
   ```bash
   npm run lint
   npm run typecheck
   npm run test
   npm run test:integration
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: description of your changes"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### Code Review Checklist

- [ ] Code follows TypeScript best practices
- [ ] All tests pass and coverage is maintained
- [ ] Documentation is updated
- [ ] No security vulnerabilities introduced
- [ ] Performance impact is considered
- [ ] Accessibility guidelines followed
- [ ] Mobile responsiveness maintained

### Release Process

1. **Version Bump**
   ```bash
   npm version patch|minor|major
   ```

2. **Create Release**
   ```bash
   git tag -a v1.2.3 -m "Release v1.2.3"
   git push origin v1.2.3
   ```

3. **Deploy**
   - Staging deployment automatically triggered
   - Manual production deployment after approval

---

For more specific development topics, see:
- [API Documentation](./API.md)
- [Custom Node Development](./CUSTOM_NODES.md)
- [Plugin Development](./PLUGINS.md)
- [Testing Guide](./TESTING.md)