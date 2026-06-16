#!/bin/bash

set -e

NAMESPACE="${NAMESPACE:-qadash}"
ENVIRONMENT="${ENVIRONMENT:-staging}"
REVISION="${REVISION:-}"

if [ -z "$KUBECONFIG" ]; then
  echo "Error: KUBECONFIG environment variable is required"
  exit 1
fi

echo "========================================"
echo "QADash Rollback Script"
echo "========================================"
echo "Namespace: $NAMESPACE"
echo "Environment: $ENVIRONMENT"
echo "Target Revision: $REVISION"
echo "========================================"

rollback_deployment() {
  local deployment=$1
  echo ""
  echo "Rolling back $deployment..."
  
  if [ -n "$REVISION" ]; then
    kubectl rollout undo deployment/"$deployment" -n "$NAMESPACE" --to-revision="$REVISION"
  else
    kubectl rollout undo deployment/"$deployment" -n "$NAMESPACE"
  fi
  
  kubectl rollout status deployment/"$deployment" -n "$NAMESPACE" --timeout=300s
  echo "✓ $deployment rolled back successfully"
}

check_health() {
  local service=$1
  local endpoint=$2
  
  echo "Checking $service health..."
  
  for i in {1..10}; do
    if curl -sf --max-time 10 "$endpoint" > /dev/null 2>&1; then
      echo "✓ $service is healthy"
      return 0
    fi
    echo "  Attempt $i/10 failed, retrying..."
    sleep 5
  done
  
  echo "✗ $service health check failed"
  return 1
}

create_backup() {
  local backup_file="/tmp/rollback-backup-$(date +%Y%m%d-%H%M%S).json"
  
  echo "Creating deployment backup..."
  
  kubectl get deployment backend frontend nginx -n "$NAMESPACE" -o json > "$backup_file"
  
  echo "✓ Backup saved to $backup_file"
  echo "$backup_file" > /tmp/rollback_backup_file
}

rollback_all() {
  echo ""
  echo "Starting rollback process..."
  
  create_backup
  
  rollback_deployment "backend"
  rollback_deployment "frontend"
  rollback_deployment "nginx"
  
  echo ""
  echo "Waiting for all services to be ready..."
  sleep 30
  
  local api_url="${API_URL:-http://localhost:3001}"
  local frontend_url="${FRONTEND_URL:-http://localhost:3000}"
  
  check_health "Backend API" "$api_url/health"
  check_health "Frontend" "$frontend_url"
  
  echo ""
  echo "========================================"
  echo "Rollback completed successfully!"
  echo "========================================"
}

case "$1" in
  backend)
    rollback_deployment "backend"
    ;;
  frontend)
    rollback_deployment "frontend"
    ;;
  nginx)
    rollback_deployment "nginx"
    ;;
  all)
    rollback_all
    ;;
  *)
    echo "Usage: $0 {backend|frontend|nginx|all}"
    echo ""
    echo "Environment variables:"
    echo "  NAMESPACE - Kubernetes namespace (default: qadash)"
    echo "  ENVIRONMENT - Environment name (default: staging)"
    echo "  REVISION - Specific revision to rollback to"
    echo "  API_URL - API health check endpoint"
    echo "  FRONTEND_URL - Frontend health check endpoint"
    echo ""
    echo "Example:"
    echo "  NAMESPACE=qadash-staging REVISION=5 $0 all"
    exit 1
    ;;
esac