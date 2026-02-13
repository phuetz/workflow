# n8n Operational Features

## Monitoring and Logging

### Standard Logging
- Execution logs for post-run debugging
- Input/output logging for nodes
- Error logging with stack traces
- Configurable log levels

### Log Environment Variables
- `N8N_LOG_LEVEL`: Set logging verbosity
- `N8N_LOG_OUTPUT`: Output destination
- Various log configuration options

### Log Streaming (Enterprise)
Stream events from n8n to logging tools:
- Available in Self-hosted Enterprise tier
- Real-time event streaming
- Integration with external platforms

### Supported Logging Platforms

#### Direct Integrations
| Platform | Integration Method |
|----------|-------------------|
| Datadog | HTTP Request node, API |
| Splunk | Webhook, HTTP integration |
| Elasticsearch | HTTP/API integration |
| CloudWatch | AWS integration |
| Loggly | HTTP integration |

#### ELK Stack
- Elasticsearch for storage
- Logstash for processing
- Kibana for visualization
- Full log observability

### Logging Best Practices
1. Always enable execution logs
2. Log LLM node input/output (OpenAI, HuggingFace)
3. Set up alerts via error workflows
4. Use tagging for log filtering
5. Integrate with observability tools (Grafana, Prometheus)

### Metrics and Observability
- Prometheus-compatible metrics
- Grafana dashboards
- Custom metric endpoints
- Performance monitoring

### Health Check Endpoints

#### Main Instance
- `/healthz`: Instance health status

#### Worker Processes
- `/healthz`: Worker up status (requires `QUEUE_HEALTH_CHECK_ACTIVE`)
- `/healthz/readiness`: DB and Redis connection status

## Queue Management

### Queue Mode Architecture

#### Components
1. **Editor Process**: UI, API, scheduling; writes jobs to Redis
2. **Redis**: Temporary job storage (the queue)
3. **Workers**: Pull and execute jobs from Redis

#### Data Flow
```
User/Trigger -> Editor Process -> Redis Queue -> Worker -> Execution
```

### Enabling Queue Mode
```bash
# Environment variable
EXECUTIONS_MODE=queue
```

### Requirements
- PostgreSQL 13+ (recommended)
- Redis for job queue
- Same `N8N_ENCRYPTION_KEY` across all processes
- SQLite NOT recommended for queue mode

### Concurrency Control

#### In Queue Mode
```bash
# Control concurrent jobs per worker
--concurrency <number>
```

#### Environment Variable
```bash
N8N_CONCURRENCY_PRODUCTION_LIMIT=<number>
```
Controls both regular and queue mode concurrency.

### Queue Configuration Best Practices
- Don't expose Redis publicly
- Enable HTTPS via reverse proxy
- Secure .env files
- Use PostgreSQL over SQLite
- Consider S3 for binary data

### Common Queue Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Jobs hang forever | Redis unreachable or insufficient workers | Check Redis, add workers |
| Wrong webhook URLs | Missing proxy headers or WEBHOOK_URL | Configure properly |
| Database bloat | Old execution logs | Enable pruning settings |

## Scaling Options

### Horizontal Scaling (Workers)

#### Adding Workers
```bash
docker compose up -d --scale worker=3
```

#### Scaling Guidelines
- Start with 2-3 workers
- Scale based on workload
- Monitor before adding more
- Small multiple workers > one big worker

### Performance Benchmarks
- Up to **220 executions/second** on single instance
- Scale beyond with queue mode + workers
- Parallel processing across CPUs

### Autoscaling

#### Configuration Parameters
| Parameter | Description |
|-----------|-------------|
| MAX_REPLICAS | Maximum worker containers |
| SCALE_UP_QUEUE_THRESHOLD | Queue length to trigger scale up |
| SCALE_DOWN_QUEUE_THRESHOLD | Queue length to trigger scale down |
| POLLING_INTERVAL_SECONDS | Queue check frequency |
| COOLDOWN_PERIOD_SECONDS | Time between scaling actions |

#### Kubernetes Autoscaling
- Auto-scale worker pods
- Based on queue length or CPU usage
- Optimal performance during peaks
- Cost reduction during low activity

### Scaling Considerations
- Increasing workers can pressure PostgreSQL
- Monitor database performance
- Redis CPU affects request speed
- Monitor queue length and latency

## Deployment Options

### Self-Hosted Options

#### 1. Docker (Recommended)
```yaml
# docker-compose.yml structure
services:
  n8n:
    image: docker.n8n.io/n8nio/n8n
    ports:
      - "5678:5678"
    volumes:
      - /home/node/.n8n
  postgres:
    image: postgres:15
  redis:
    image: redis:7
  nginx:
    # Reverse proxy for HTTPS
```

Features:
- Consistent, reliable setup
- Non-root user (node:node) since v1.0
- Port 5678 exposed
- Volume mount at `/home/node/.n8n`

#### 2. Kubernetes
Deployment components:
- n8n application pods
- PostgreSQL database
- Redis (for queue mode)
- Persistent volumes
- Ingress controller

Benefits:
- Auto-scaling capabilities
- High availability
- Resource management
- Rolling updates

Deployment options:
- Helm charts
- Custom manifests
- Managed Kubernetes services

#### 3. npm Installation
```bash
npm install -g n8n
n8n start
```

#### 4. Cloud Platforms

| Platform | Options |
|----------|---------|
| AWS | EC2, ECS, EKS |
| Azure | Container Instances, VMs, AKS |
| Google Cloud | GCE, GKE, Cloud Run |
| DigitalOcean | Droplets, Kubernetes |

### n8n Cloud (Managed)
- Official hosted version
- No infrastructure management
- Automatic updates
- Encrypted credential storage
- Workflow versioning
- Execution history
- Pricing from $24/month (2.5K executions)

### Production Configuration

#### Database
- PostgreSQL 13+ recommended
- Persistent volume for data
- Regular backups

#### Security
- Docker Secrets for sensitive data
- HTTPS via reverse proxy
- Secure environment files
- Network isolation

#### Storage
- Volume mounts for persistence
- External storage for binary data (S3)
- Database for workflow definitions

### Production Checklist

#### Infrastructure
- [ ] PostgreSQL database configured
- [ ] Redis for queue mode (if needed)
- [ ] Reverse proxy with HTTPS
- [ ] Persistent storage volumes
- [ ] Backup strategy

#### Security
- [ ] N8N_ENCRYPTION_KEY set and secured
- [ ] Database credentials secured
- [ ] Network firewall configured
- [ ] SSL/TLS certificates
- [ ] Regular security updates

#### Monitoring
- [ ] Health check endpoints enabled
- [ ] Metrics collection configured
- [ ] Log aggregation setup
- [ ] Alerting configured

#### Scaling
- [ ] Queue mode enabled (if high volume)
- [ ] Worker scaling configured
- [ ] Database connection pooling
- [ ] Resource limits set

### Deployment Patterns

#### Single Instance
- Simple setup
- Good for small workloads
- Limited scaling

#### Queue Mode (Distributed)
- Editor + Workers
- Horizontal scaling
- High availability

#### Kubernetes Cluster
- Full orchestration
- Auto-scaling
- Enterprise-grade

### Version Management
- New minor version most weeks
- Stable version for production
- Test updates in staging first
- Rollback capability

### Self-Hosting Considerations
- Expert users recommended
- Risk of data loss, security issues, downtime if inexperienced
- n8n Cloud recommended for less technical users
- Community support available
