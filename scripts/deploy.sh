#!/bin/bash

# Comprehensive Deployment Script for Workflow Automation Platform
# Supports Docker Compose, Kubernetes, and cloud deployments

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOYMENT_TYPE="${DEPLOYMENT_TYPE:-docker-compose}"
ENVIRONMENT="${ENVIRONMENT:-production}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $*${NC}"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $*${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $*${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $*${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    local missing_tools=()
    
    case "$DEPLOYMENT_TYPE" in
        docker-compose)
            command -v docker >/dev/null 2>&1 || missing_tools+=("docker")
            command -v docker-compose >/dev/null 2>&1 || missing_tools+=("docker-compose")
            ;;
        kubernetes)
            command -v kubectl >/dev/null 2>&1 || missing_tools+=("kubectl")
            command -v helm >/dev/null 2>&1 || missing_tools+=("helm")
            ;;
        aws)
            command -v aws >/dev/null 2>&1 || missing_tools+=("aws-cli")
            command -v kubectl >/dev/null 2>&1 || missing_tools+=("kubectl")
            ;;
    esac
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        error "Missing required tools: ${missing_tools[*]}"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Setup environment files
setup_environment() {
    log "Setting up environment configuration..."
    
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    
    if [ ! -f "$env_file" ]; then
        if [ -f "$PROJECT_ROOT/.env.example" ]; then
            cp "$PROJECT_ROOT/.env.example" "$env_file"
            warn "Created $env_file from template. Please review and update values."
        else
            error "No environment template found"
            exit 1
        fi
    fi
    
    # Generate secrets if they don't exist
    if ! grep -q "JWT_SECRET=" "$env_file" || [ "$(grep JWT_SECRET= "$env_file" | cut -d= -f2)" = "" ]; then
        local jwt_secret=$(openssl rand -base64 32)
        sed -i "s/JWT_SECRET=.*/JWT_SECRET=$jwt_secret/" "$env_file"
        log "Generated JWT secret"
    fi
    
    if ! grep -q "ENCRYPTION_KEY=" "$env_file" || [ "$(grep ENCRYPTION_KEY= "$env_file" | cut -d= -f2)" = "" ]; then
        local encryption_key=$(openssl rand -base64 32)
        sed -i "s/ENCRYPTION_KEY=.*/ENCRYPTION_KEY=$encryption_key/" "$env_file"
        log "Generated encryption key"
    fi
    
    success "Environment setup completed"
}

# Docker Compose deployment
deploy_docker_compose() {
    log "Deploying with Docker Compose..."
    
    cd "$PROJECT_ROOT"
    
    # Build images
    log "Building Docker images..."
    docker-compose build --parallel
    
    # Start services
    log "Starting services..."
    docker-compose up -d
    
    # Wait for services to be ready
    log "Waiting for services to be ready..."
    local max_attempts=60
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f http://localhost:3000/health >/dev/null 2>&1; then
            success "Application is ready!"
            break
        fi
        
        attempt=$((attempt + 1))
        sleep 5
        
        if [ $attempt -eq $max_attempts ]; then
            error "Application failed to start within expected time"
            docker-compose logs
            exit 1
        fi
    done
    
    # Run database migrations
    log "Running database migrations..."
    docker-compose exec app npm run migrate || warn "Migration failed or not available"
    
    success "Docker Compose deployment completed"
    log "Application URL: http://localhost:3000"
    log "API URL: http://localhost:3001"
    log "Grafana URL: http://localhost:3003 (admin/admin123)"
}

# Kubernetes deployment
deploy_kubernetes() {
    log "Deploying to Kubernetes..."
    
    local k8s_dir="$PROJECT_ROOT/k8s"
    
    # Check if connected to cluster
    if ! kubectl cluster-info >/dev/null 2>&1; then
        error "Not connected to Kubernetes cluster"
        exit 1
    fi
    
    # Apply namespace and basic resources
    log "Creating namespace and basic resources..."
    kubectl apply -f "$k8s_dir/namespace.yaml"
    
    # Apply secrets and configmaps
    log "Applying configuration..."
    kubectl apply -f "$k8s_dir/configmap.yaml"
    
    # Deploy databases
    log "Deploying databases..."
    kubectl apply -f "$k8s_dir/postgres.yaml"
    kubectl apply -f "$k8s_dir/redis.yaml"
    
    # Wait for databases to be ready
    log "Waiting for databases..."
    kubectl wait --for=condition=ready pod -l app=postgres -n workflow-automation --timeout=300s
    kubectl wait --for=condition=ready pod -l app=redis -n workflow-automation --timeout=300s
    
    # Deploy application
    log "Deploying application..."
    kubectl apply -f "$k8s_dir/deployment.yaml"
    
    # Wait for application
    log "Waiting for application deployment..."
    kubectl wait --for=condition=available deployment/workflow-app -n workflow-automation --timeout=300s
    
    # Apply ingress
    log "Setting up ingress..."
    kubectl apply -f "$k8s_dir/ingress.yaml"
    
    # Deploy monitoring
    log "Deploying monitoring stack..."
    kubectl apply -f "$k8s_dir/monitoring.yaml"
    
    success "Kubernetes deployment completed"
    
    # Display access information
    local ingress_ip=$(kubectl get ingress workflow-ingress -n workflow-automation -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")
    log "Ingress IP: $ingress_ip"
    log "Update your DNS to point to this IP address"
}

# AWS EKS deployment
deploy_aws() {
    log "Deploying to AWS EKS..."
    
    local cluster_name="${AWS_CLUSTER_NAME:-workflow-cluster}"
    local region="${AWS_REGION:-us-west-2}"
    
    # Update kubeconfig
    log "Updating kubeconfig for EKS cluster..."
    aws eks update-kubeconfig --region "$region" --name "$cluster_name"
    
    # Deploy to Kubernetes
    deploy_kubernetes
    
    # Setup AWS Load Balancer Controller if needed
    if ! helm list -A | grep -q aws-load-balancer-controller; then
        log "Installing AWS Load Balancer Controller..."
        
        # Add helm repo
        helm repo add eks https://aws.github.io/eks-charts
        helm repo update
        
        # Install controller
        helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
            -n kube-system \
            --set clusterName="$cluster_name" \
            --set serviceAccount.create=false \
            --set serviceAccount.name=aws-load-balancer-controller
    fi
    
    success "AWS EKS deployment completed"
}

# Health check
health_check() {
    log "Performing health check..."
    
    local health_url="http://localhost:3000/health"
    
    case "$DEPLOYMENT_TYPE" in
        kubernetes)
            # Port forward to check health
            kubectl port-forward svc/workflow-app-service 3000:80 -n workflow-automation &
            local port_forward_pid=$!
            sleep 5
            ;;
    esac
    
    if curl -f "$health_url" >/dev/null 2>&1; then
        success "Health check passed"
    else
        error "Health check failed"
        return 1
    fi
    
    # Clean up port forward if used
    if [ ! -z "${port_forward_pid:-}" ]; then
        kill $port_forward_pid 2>/dev/null || true
    fi
}

# Rollback function
rollback() {
    local version="${1:-previous}"
    
    warn "Rolling back to $version..."
    
    case "$DEPLOYMENT_TYPE" in
        docker-compose)
            cd "$PROJECT_ROOT"
            docker-compose down
            # Restore from backup if needed
            ;;
        kubernetes)
            kubectl rollout undo deployment/workflow-app -n workflow-automation
            kubectl rollout status deployment/workflow-app -n workflow-automation
            ;;
    esac
    
    success "Rollback completed"
}

# Cleanup function
cleanup() {
    log "Cleaning up..."
    
    case "$DEPLOYMENT_TYPE" in
        docker-compose)
            cd "$PROJECT_ROOT"
            docker-compose down --volumes --remove-orphans
            docker system prune -f
            ;;
        kubernetes)
            kubectl delete namespace workflow-automation --ignore-not-found=true
            ;;
    esac
    
    success "Cleanup completed"
}

# Show status
show_status() {
    log "Deployment Status:"
    
    case "$DEPLOYMENT_TYPE" in
        docker-compose)
            docker-compose ps
            ;;
        kubernetes)
            kubectl get all -n workflow-automation
            ;;
    esac
}

# Show logs
show_logs() {
    local service="${1:-app}"
    
    case "$DEPLOYMENT_TYPE" in
        docker-compose)
            docker-compose logs -f "$service"
            ;;
        kubernetes)
            kubectl logs -f deployment/workflow-app -n workflow-automation
            ;;
    esac
}

# Scale application
scale() {
    local replicas="${1:-3}"
    
    log "Scaling application to $replicas replicas..."
    
    case "$DEPLOYMENT_TYPE" in
        docker-compose)
            docker-compose up -d --scale app="$replicas"
            ;;
        kubernetes)
            kubectl scale deployment workflow-app --replicas="$replicas" -n workflow-automation
            kubectl rollout status deployment/workflow-app -n workflow-automation
            ;;
    esac
    
    success "Scaling completed"
}

# Main deployment function
deploy() {
    log "Starting deployment (Type: $DEPLOYMENT_TYPE, Environment: $ENVIRONMENT)"
    
    check_prerequisites
    setup_environment
    
    case "$DEPLOYMENT_TYPE" in
        docker-compose)
            deploy_docker_compose
            ;;
        kubernetes)
            deploy_kubernetes
            ;;
        aws)
            deploy_aws
            ;;
        *)
            error "Unknown deployment type: $DEPLOYMENT_TYPE"
            exit 1
            ;;
    esac
    
    # Run health check
    if health_check; then
        success "Deployment completed successfully!"
    else
        error "Deployment completed but health check failed"
        exit 1
    fi
}

# Command line interface
case "${1:-deploy}" in
    deploy)
        deploy
        ;;
    rollback)
        rollback "${2:-}"
        ;;
    health)
        health_check
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs "${2:-}"
        ;;
    scale)
        scale "${2:-3}"
        ;;
    cleanup)
        cleanup
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|health|status|logs|scale|cleanup}"
        echo ""
        echo "Commands:"
        echo "  deploy   - Deploy the application"
        echo "  rollback - Rollback to previous version"
        echo "  health   - Check application health"
        echo "  status   - Show deployment status"
        echo "  logs     - Show application logs"
        echo "  scale    - Scale application replicas"
        echo "  cleanup  - Clean up deployment"
        echo ""
        echo "Environment Variables:"
        echo "  DEPLOYMENT_TYPE - docker-compose, kubernetes, aws (default: docker-compose)"
        echo "  ENVIRONMENT     - development, staging, production (default: production)"
        echo "  AWS_CLUSTER_NAME - EKS cluster name (for AWS deployment)"
        echo "  AWS_REGION      - AWS region (default: us-west-2)"
        exit 1
        ;;
esac