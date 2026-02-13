# Architecture Documentation

## System Overview

Workflow is a visual workflow automation platform built with a modern, scalable architecture designed for high performance and extensibility.

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐  │
│  │   Editor   │  │ Dashboard  │  │   Node Configs       │  │
│  │ (ReactFlow)│  │            │  │                      │  │
│  └────────────┘  └────────────┘  └──────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          State Management (Zustand)                   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ WebSocket (Socket.io)
                            │ REST API (Axios)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Node.js/Express)                 │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐  │
│  │  REST API  │  │  GraphQL   │  │  WebSocket Server    │  │
│  └────────────┘  └────────────┘  └──────────────────────┘  │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐  │
│  │ Exec Engine│  │ Queue Mgr  │  │  Auth Manager        │  │
│  └────────────┘  └────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                            │
│  ┌────────────────┐         ┌──────────────────────────┐   │
│  │   PostgreSQL   │         │        Redis             │   │
│  │   (Prisma ORM) │         │  (Cache & Queues)        │   │
│  └────────────────┘         └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### Frontend Architecture

**Technology Stack:**
- React 18.3 with TypeScript 5.5
- Vite 7.0 for build tooling
- ReactFlow 11.11 for visual editor
- Zustand for state management
- Tailwind CSS for styling
- Socket.io-client for real-time updates

**Key Components:**

1. **ModernWorkflowEditor** (`src/components/ModernWorkflowEditor.tsx`)
   - Visual workflow canvas using ReactFlow
   - Drag-and-drop node creation
   - Auto-layout with Dagre algorithm
   - Real-time execution visualization
   - 3 view modes: Compact, Normal, Detailed

2. **WorkflowStore** (`src/store/workflowStore.ts`)
   - Centralized state management with Zustand
   - Persistent storage with localStorage
   - Undo/redo functionality (50 actions history)
   - Multi-selection and grouping
   - Real-time sync with backend

3. **Node Configuration System** (`src/workflow/nodes/config/`)
   - 400+ dedicated configuration components
   - Dynamic form generation
   - Expression editor integration
   - Credential management

### Backend Architecture

**Technology Stack:**
- Node.js with Express
- TypeScript for type safety
- Prisma ORM for database access
- Bull/BullMQ for job queues
- Socket.io for WebSockets
- JWT for authentication

**Core Services:**

1. **Execution Engine** (`src/components/ExecutionEngine.ts`)
   - Modular architecture (2.0)
   - Node-by-node execution
   - Error handling with retry logic
   - Conditional branching
   - Sub-workflow support

2. **Queue Manager** (`src/backend/queue/QueueManager.ts`)
   - Redis-based job queues
   - 5 priority queues
   - Retry with backoff
   - Dead letter queue
   - Real-time metrics

3. **Auth Manager** (`src/backend/auth/AuthManager.ts`)
   - JWT token management
   - OAuth2 (Google, GitHub, Microsoft)
   - RBAC (Role-Based Access Control)
   - Session persistence
   - Account security (lockout, 2FA)

4. **GraphQL API** (`src/backend/api/`)
   - Type-safe GraphQL schema
   - Query optimization
   - Real-time subscriptions
   - Field-level permissions

### Database Schema

**PostgreSQL (via Prisma):**

```prisma
model User {
  id                String   @id @default(uuid())
  email             String   @unique
  passwordHash      String
  role              Role     @default(USER)
  status            UserStatus @default(ACTIVE)
  emailVerified     Boolean  @default(false)
  createdAt         DateTime @default(now())
  workflows         Workflow[]
  executions        Execution[]
}

model Workflow {
  id          String   @id @default(uuid())
  name        String
  description String?
  nodes       Json
  edges       Json
  status      WorkflowStatus @default(DRAFT)
  version     Int      @default(1)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdBy   User     @relation(fields: [userId], references: [id])
  userId      String
  executions  Execution[]
}

model Execution {
  id            String   @id @default(uuid())
  workflowId    String
  workflow      Workflow @relation(fields: [workflowId], references: [id])
  status        ExecutionStatus
  startedAt     DateTime
  completedAt   DateTime?
  duration      Int?
  nodeResults   Json
  input         Json?
  output        Json?
  error         String?
}

model Credential {
  id        String   @id @default(uuid())
  name      String
  type      String
  data      String   // Encrypted
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
}
```

**Redis Data Structures:**

1. **Job Queues:**
   - `bull:workflow-execution:*` - Workflow jobs
   - `bull:webhook-processing:*` - Webhook jobs
   - `bull:email-sending:*` - Email jobs

2. **Cache:**
   - `cache:user:{userId}` - User data (TTL: 1h)
   - `cache:workflow:{id}` - Workflow data (TTL: 30m)
   - `cache:execution:{id}` - Execution results (TTL: 24h)

3. **Session:**
   - `session:{sessionId}` - User sessions (TTL: 7d)
   - `token:revoked:{jti}` - Revoked JWT tokens

## Data Flow

### Workflow Execution Flow

```
1. User clicks "Execute" in UI
   ↓
2. Frontend sends POST /api/workflows/:id/execute
   ↓
3. Backend validates workflow and user permissions
   ↓
4. Job added to workflow-execution queue (Redis)
   ↓
5. Worker picks up job from queue
   ↓
6. ExecutionEngine processes workflow:
   - Topological sort of nodes
   - Execute nodes in dependency order
   - Handle errors and conditional branches
   - Store results in PostgreSQL
   ↓
7. WebSocket updates sent to frontend in real-time
   ↓
8. Final results returned to client
```

### Authentication Flow

```
1. User submits login credentials
   ↓
2. POST /auth/login endpoint validates credentials
   ↓
3. Password verified with bcrypt (auto-rehash if needed)
   ↓
4. Check account lockout status
   ↓
5. Generate JWT tokens (access + refresh)
   ↓
6. Store session in Redis (TTL: 7 days)
   ↓
7. Return tokens to client
   ↓
8. Client stores tokens in localStorage
   ↓
9. Auto-refresh timer started (5 min before expiry)
   ↓
10. All subsequent requests include Bearer token
```

### Real-time Collaboration Flow

```
1. User A opens workflow editor
   ↓
2. WebSocket connection established
   ↓
3. Subscribe to workflow channel: "workflow:{id}"
   ↓
4. User A makes changes (add node, edit connection)
   ↓
5. Changes sent via WebSocket to server
   ↓
6. Server broadcasts changes to all connected clients
   ↓
7. User B receives updates in real-time
   ↓
8. Conflict resolution using operational transforms
   ↓
9. UI updates with collaborative cursors
```

## Security Architecture

### Authentication & Authorization

**JWT Token Structure:**
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "usr_1234567890",
    "email": "user@example.com",
    "role": "user",
    "permissions": ["workflow.create", "workflow.read"],
    "jti": "unique_token_id",
    "iat": 1698148800,
    "exp": 1698152400
  }
}
```

**Permission System:**

- Admin: Full system access
- User: Create/edit own workflows
- Viewer: Read-only access

**Security Features:**

1. **Password Security:**
   - bcrypt hashing (cost factor: 12)
   - Auto-rehash on login
   - Password strength validation
   - Account lockout (5 failed attempts)

2. **API Security:**
   - Rate limiting (60 req/min per user)
   - CORS with whitelist
   - Helmet.js security headers
   - CSRF protection
   - Input validation with Joi

3. **Data Encryption:**
   - Credentials: AES-256-GCM at rest
   - TLS 1.3 in transit
   - Encrypted backups

4. **Webhook Security:**
   - 7 authentication methods
   - HMAC signature verification
   - IP whitelisting
   - Request timestamp validation

## Scalability

### Horizontal Scaling

**Frontend:**
- Static assets served via CDN
- Multiple instances behind load balancer
- Session affinity not required

**Backend:**
- Stateless API servers
- Redis for shared session state
- Queue workers scale independently
- Database connection pooling (20 connections per instance)

### Performance Optimizations

1. **Database:**
   - Indexes on frequently queried fields
   - Connection pooling (Prisma)
   - Query optimization with EXPLAIN
   - Read replicas for analytics

2. **Caching:**
   - Redis for hot data (1h-24h TTL)
   - React Query for frontend caching
   - Memoization of expensive computations
   - CDN for static assets

3. **Queue Processing:**
   - Concurrency tuning per queue type
   - Priority-based job scheduling
   - Backpressure handling
   - Dead letter queue for failed jobs

### Monitoring & Observability

**Metrics (Prometheus):**
- Request rate and latency (p50, p95, p99)
- Error rate by endpoint
- Queue depth and processing time
- Database connection pool usage
- Memory and CPU utilization

**Logging (Structured JSON):**
- Request/response logging
- Error tracking with stack traces
- Audit trail for sensitive operations
- Performance profiling

**Tracing (OpenTelemetry):**
- Distributed request tracing
- Database query tracking
- External API call monitoring

**Alerting:**
- High error rate (>5%)
- API latency >1s
- Queue backlog >1000 jobs
- Database connection exhaustion
- Memory usage >80%

## Deployment Architecture

### Production Environment

```
┌─────────────────────────────────────────────────────────┐
│                    Load Balancer (Nginx)                 │
│                   SSL Termination (TLS 1.3)              │
└─────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
┌────────────────────┐          ┌────────────────────┐
│  Frontend Servers  │          │  Backend Servers   │
│   (3 instances)    │          │   (5 instances)    │
│   - React SPA      │          │   - Node.js/Express│
│   - Served via     │          │   - Auto-scaling   │
│     Nginx          │          │   - Health checks  │
└────────────────────┘          └────────────────────┘
                                           │
                    ┌──────────────────────┼──────────────────┐
                    ▼                      ▼                  ▼
         ┌────────────────┐    ┌────────────────┐  ┌─────────────────┐
         │   PostgreSQL   │    │     Redis      │  │  Queue Workers  │
         │   (Primary +   │    │   (Cluster)    │  │  (10 instances) │
         │    2 Replicas) │    │   - Sessions   │  │  - Job          │
         │   - Backups    │    │   - Cache      │  │    Processing   │
         │     (Daily)    │    │   - Queues     │  │                 │
         └────────────────┘    └────────────────┘  └─────────────────┘
```

### Container Orchestration (Kubernetes)

**Deployment:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: workflow-backend
spec:
  replicas: 5
  selector:
    matchLabels:
      app: workflow-backend
  template:
    spec:
      containers:
      - name: backend
        image: workflow/backend:latest
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
```

**Auto-scaling:**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: workflow-backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: workflow-backend
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Technology Decisions

### Why React + Vite?

- Fast development with HMR
- Modern build tooling
- Excellent TypeScript support
- Large ecosystem
- Production-ready

### Why Zustand over Redux?

- Simpler API
- Less boilerplate
- Better TypeScript inference
- Smaller bundle size
- Easier to learn

### Why PostgreSQL?

- ACID compliance
- Rich query capabilities
- JSON support for flexible schemas
- Mature ecosystem
- Excellent performance

### Why Redis?

- In-memory speed
- Multiple data structures
- Pub/sub for real-time
- Battle-tested at scale
- Simple cluster setup

### Why Prisma?

- Type-safe database access
- Auto-generated client
- Migration management
- Excellent developer experience
- Multi-database support

## Development Workflow

### Local Development

```bash
# Install dependencies
npm install

# Start PostgreSQL and Redis (Docker)
docker-compose up -d postgres redis

# Run database migrations
npm run migrate:dev

# Start development servers
npm run dev  # Runs frontend + backend concurrently

# Run tests
npm run test

# Type checking
npm run typecheck
```

### CI/CD Pipeline

```
1. Push to GitHub
   ↓
2. GitHub Actions triggered
   ↓
3. Lint & Type Check
   ↓
4. Run Unit Tests
   ↓
5. Run Integration Tests
   ↓
6. Build Docker images
   ↓
7. Push to Container Registry
   ↓
8. Deploy to Staging
   ↓
9. Run E2E Tests
   ↓
10. Manual approval
   ↓
11. Deploy to Production
   ↓
12. Health checks
   ↓
13. Rollback if needed
```

## Future Enhancements

### Q1 2026
- Serverless execution (AWS Lambda, Cloudflare Workers)
- Advanced AI features (workflow generation from NLP)
- Mobile app (React Native)

### Q2 2026
- Edge computing support
- Multi-region deployment
- Blockchain integrations (Web3)

### Q3 2026
- Enterprise SSO (SAML, LDAP)
- Advanced compliance (SOC2, HIPAA)
- White-label solution

---

**Last Updated:** October 24, 2025
**Architecture Version:** 1.0.0
