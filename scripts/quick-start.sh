#!/bin/bash

# PLAN C - Quick Start Script
# Démarrage rapide de l'infrastructure de scalabilité
# Ultra Think methodology - One-click deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logo
echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║     🚀 WORKFLOW AUTOMATION PLATFORM - PLAN C                ║"
echo "║            Scalability Infrastructure v1.0                   ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to print colored messages
print_info() {
    echo -e "${BLUE}ℹ ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ required. Current: $(node -v)"
        exit 1
    fi
    print_success "Node.js $(node -v) found"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    print_success "npm $(npm -v) found"
    
    # Check Docker (optional)
    if command -v docker &> /dev/null; then
        print_success "Docker found (optional)"
        DOCKER_AVAILABLE=true
    else
        print_warning "Docker not found (optional for full stack)"
        DOCKER_AVAILABLE=false
    fi
    
    # Check kubectl (optional)
    if command -v kubectl &> /dev/null; then
        print_success "kubectl found (optional)"
        KUBECTL_AVAILABLE=true
    else
        print_warning "kubectl not found (optional for K8s deployment)"
        KUBECTL_AVAILABLE=false
    fi
}

# Install dependencies
install_dependencies() {
    print_info "Installing dependencies..."
    
    if [ ! -d "node_modules" ]; then
        npm ci || npm install
        print_success "Dependencies installed"
    else
        print_success "Dependencies already installed"
    fi
}

# Build the project
build_project() {
    print_info "Building the project..."
    
    # TypeScript check
    print_info "Running TypeScript check..."
    npm run typecheck || print_warning "TypeScript check failed (non-blocking)"
    
    # Build
    npm run build
    print_success "Project built successfully"
}

# Start services based on environment
start_services() {
    local ENV=${1:-development}
    
    print_info "Starting services for $ENV environment..."
    
    case $ENV in
        development)
            print_info "Starting development server..."
            npm run dev &
            DEV_PID=$!
            print_success "Development server started on http://localhost:3000"
            print_info "Process ID: $DEV_PID"
            ;;
            
        docker)
            if [ "$DOCKER_AVAILABLE" = true ]; then
                print_info "Starting Docker stack..."
                docker-compose -f docker/docker-compose.scalability.yml up -d
                print_success "Docker stack started"
                print_info "Services:"
                echo "  - App: http://localhost:3000"
                echo "  - API: http://localhost:4000"
                echo "  - RabbitMQ: http://localhost:15672"
                echo "  - Grafana: http://localhost:3001"
                echo "  - Prometheus: http://localhost:9090"
                echo "  - Jaeger: http://localhost:16686"
            else
                print_error "Docker is not available"
                exit 1
            fi
            ;;
            
        kubernetes)
            if [ "$KUBECTL_AVAILABLE" = true ]; then
                print_info "Deploying to Kubernetes..."
                kubectl apply -f k8s/namespace.yaml || true
                kubectl apply -f k8s/scalability-infrastructure.yaml
                kubectl apply -f k8s/scalability-deployment.yaml
                kubectl apply -f k8s/scalability-monitoring.yaml
                print_success "Deployed to Kubernetes"
                print_info "Check status: kubectl get all -n workflow-scalability"
            else
                print_error "kubectl is not available"
                exit 1
            fi
            ;;
            
        production)
            print_info "Building for production..."
            npm run build
            print_info "Starting production server..."
            NODE_ENV=production node dist/index.js &
            PROD_PID=$!
            print_success "Production server started"
            print_info "Process ID: $PROD_PID"
            ;;
            
        *)
            print_error "Unknown environment: $ENV"
            echo "Available: development, docker, kubernetes, production"
            exit 1
            ;;
    esac
}

# Health check
health_check() {
    print_info "Performing health check..."
    
    sleep 5
    
    if curl -f http://localhost:3000/health &> /dev/null; then
        print_success "Application is healthy"
    else
        print_warning "Health check failed (app may still be starting)"
    fi
}

# Show menu
show_menu() {
    echo ""
    echo "Choose deployment option:"
    echo "  1) Development (npm run dev)"
    echo "  2) Docker Stack (full infrastructure)"
    echo "  3) Kubernetes (production deployment)"
    echo "  4) Production (optimized build)"
    echo "  5) Run tests"
    echo "  6) Fix lint errors"
    echo "  7) Clean & reinstall"
    echo "  8) Exit"
    echo ""
    read -p "Enter choice [1-8]: " choice
    
    case $choice in
        1)
            start_services development
            health_check
            ;;
        2)
            start_services docker
            ;;
        3)
            start_services kubernetes
            ;;
        4)
            start_services production
            health_check
            ;;
        5)
            print_info "Running tests..."
            npm test
            ;;
        6)
            print_info "Fixing lint errors..."
            npm run lint -- --fix || true
            print_success "Lint fixes applied"
            ;;
        7)
            print_info "Cleaning project..."
            rm -rf node_modules dist
            npm cache clean --force
            install_dependencies
            build_project
            print_success "Project cleaned and rebuilt"
            ;;
        8)
            print_info "Exiting..."
            exit 0
            ;;
        *)
            print_error "Invalid choice"
            show_menu
            ;;
    esac
}

# Trap cleanup
cleanup() {
    print_info "Cleaning up..."
    if [ ! -z "$DEV_PID" ]; then
        kill $DEV_PID 2>/dev/null || true
    fi
    if [ ! -z "$PROD_PID" ]; then
        kill $PROD_PID 2>/dev/null || true
    fi
    print_success "Cleanup complete"
}

trap cleanup EXIT

# Main execution
main() {
    check_prerequisites
    install_dependencies
    
    if [ $# -eq 0 ]; then
        show_menu
    else
        case $1 in
            dev|development)
                start_services development
                health_check
                ;;
            docker)
                start_services docker
                ;;
            k8s|kubernetes)
                start_services kubernetes
                ;;
            prod|production)
                start_services production
                health_check
                ;;
            test)
                npm test
                ;;
            lint)
                npm run lint -- --fix || true
                ;;
            build)
                build_project
                ;;
            *)
                print_error "Unknown command: $1"
                echo "Usage: $0 [dev|docker|k8s|prod|test|lint|build]"
                exit 1
                ;;
        esac
    fi
    
    # Keep script running if service was started
    if [ ! -z "$DEV_PID" ] || [ ! -z "$PROD_PID" ]; then
        print_info "Press Ctrl+C to stop"
        wait
    fi
}

# Run main function
main "$@"