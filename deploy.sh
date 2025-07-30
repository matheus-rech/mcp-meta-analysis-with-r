#!/bin/bash
# Deployment script for MCP Meta-Analysis Server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
DEPLOYMENT_TYPE=${1:-"single"}  # single, scale, kubernetes
BUILD_TYPE=${2:-"production"}   # development, production

print_status "Starting MCP Meta-Analysis Server deployment..."
print_status "Deployment type: $DEPLOYMENT_TYPE"
print_status "Build type: $BUILD_TYPE"

# Pre-deployment checks
print_status "Running pre-deployment checks..."

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if ports are available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port $port is already in use"
        return 1
    fi
    return 0
}

# Build application
print_status "Building TypeScript application..."
npm run build

# Create necessary directories
print_status "Creating directory structure..."
mkdir -p user_sessions/{shared_resources,templates}
mkdir -p logs
mkdir -p nginx/ssl

# Generate self-signed SSL certificates if they don't exist
if [ ! -f "nginx/ssl/cert.pem" ]; then
    print_status "Generating self-signed SSL certificates..."
    openssl req -x509 -newkey rsa:4096 -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
fi

# Deployment based on type
case $DEPLOYMENT_TYPE in
    "single")
        print_status "Deploying single server instance..."
        
        # Check ports for single deployment
        if ! check_port 80 || ! check_port 3001 || ! check_port 9090; then
            print_warning "Some ports may be in use. Continuing anyway..."
        fi
        
        # Build and start single instance
        docker-compose down --remove-orphans
        docker-compose build
        docker-compose up -d
        
        print_status "Single server deployment completed!"
        print_status "Services available at:"
        print_status "  - Nginx Load Balancer: http://localhost"
        print_status "  - Grafana Dashboard: http://localhost:3001"
        print_status "  - Prometheus: http://localhost:9090"
        ;;
        
    "scale")
        print_status "Deploying scaled server instances..."
        
        # Use scaling configuration
        docker-compose -f docker-compose.scale.yml down --remove-orphans
        docker-compose -f docker-compose.scale.yml build
        docker-compose -f docker-compose.scale.yml up -d
        
        print_status "Scaled deployment completed!"
        print_status "Services available at:"
        print_status "  - Load Balanced Servers: http://localhost"
        print_status "  - Grafana Dashboard: http://localhost:3001"
        print_status "  - Prometheus: http://localhost:9090"
        print_status "  - PostgreSQL: localhost:5432"
        print_status "  - Redis: localhost:6379"
        ;;
        
    "kubernetes")
        print_status "Deploying to Kubernetes..."
        
        # Check if kubectl is available
        if ! command -v kubectl &> /dev/null; then
            print_error "kubectl is not installed. Please install kubectl first."
            exit 1
        fi
        
        # Apply Kubernetes configurations
        kubectl apply -f k8s/
        
        print_status "Kubernetes deployment initiated!"
        print_status "Check deployment status with: kubectl get pods -n meta-analysis"
        ;;
        
    *)
        print_error "Unknown deployment type: $DEPLOYMENT_TYPE"
        print_error "Available types: single, scale, kubernetes"
        exit 1
        ;;
esac

# Post-deployment health checks
print_status "Running post-deployment health checks..."

sleep 30  # Wait for services to start

case $DEPLOYMENT_TYPE in
    "single"|"scale")
        # Check if nginx is responding
        if curl -f -s http://localhost/health > /dev/null 2>&1; then
            print_status "✅ Load balancer health check passed"
        else
            print_warning "⚠️ Load balancer health check failed"
        fi
        
        # Check if Grafana is responding
        if curl -f -s http://localhost:3001 > /dev/null 2>&1; then
            print_status "✅ Grafana health check passed"
        else
            print_warning "⚠️ Grafana health check failed"
        fi
        ;;
esac

print_status "Deployment completed successfully!"

# Show logs command
print_status "To view logs, use:"
case $DEPLOYMENT_TYPE in
    "single")
        print_status "  docker-compose logs -f"
        ;;
    "scale")
        print_status "  docker-compose -f docker-compose.scale.yml logs -f"
        ;;
    "kubernetes")
        print_status "  kubectl logs -f deployment/meta-analysis-server -n meta-analysis"
        ;;
esac

# Show cleanup command
print_status "To stop and cleanup, use:"
case $DEPLOYMENT_TYPE in
    "single")
        print_status "  docker-compose down --volumes --remove-orphans"
        ;;
    "scale")
        print_status "  docker-compose -f docker-compose.scale.yml down --volumes --remove-orphans"
        ;;
    "kubernetes")
        print_status "  kubectl delete -f k8s/"
        ;;
esac