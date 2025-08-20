# HPA Helm Chart

A comprehensive Helm chart for deploying the HPA multi-tenant authentication system on Kubernetes.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.8+
- PV provisioner support in the underlying infrastructure (for PostgreSQL and Redis persistence)
- (Optional) cert-manager for automatic TLS certificate management
- (Optional) Prometheus Operator for monitoring

## Installation

### Add the Helm repository (if published)

```bash
helm repo add hpa https://charts.hpa.local
helm repo update
```

### Install the chart

```bash
# Create namespace
kubectl create namespace hpa

# Install with default values
helm install hpa ./hpa-chart --namespace hpa

# Install with custom values
helm install hpa ./hpa-chart --namespace hpa -f custom-values.yaml
```

## Configuration

The following table lists the configurable parameters and their default values.

### Global Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `global.environment` | Environment (development, staging, production) | `production` |
| `global.domain` | Domain for the application | `hpa.local` |
| `global.storageClass` | Storage class for persistent volumes | `standard` |
| `global.imagePullSecrets` | Image pull secrets | `[]` |

### Backend Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `backend.enabled` | Enable backend deployment | `true` |
| `backend.image.repository` | Backend image repository | `hpa/backend` |
| `backend.image.tag` | Backend image tag | `1.0.0` |
| `backend.replicaCount` | Number of backend replicas | `3` |
| `backend.autoscaling.enabled` | Enable HPA for backend | `true` |
| `backend.autoscaling.minReplicas` | Minimum replicas for HPA | `3` |
| `backend.autoscaling.maxReplicas` | Maximum replicas for HPA | `10` |
| `backend.resources.limits.cpu` | CPU limit | `1000m` |
| `backend.resources.limits.memory` | Memory limit | `1Gi` |
| `backend.env.LOG_LEVEL` | Log level | `info` |
| `backend.secrets.JWT_SECRET` | JWT secret key | `change-this-secret` |

### Frontend Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `frontend.enabled` | Enable frontend deployment | `true` |
| `frontend.image.repository` | Frontend image repository | `hpa/frontend` |
| `frontend.image.tag` | Frontend image tag | `1.0.0` |
| `frontend.replicaCount` | Number of frontend replicas | `2` |
| `frontend.autoscaling.enabled` | Enable HPA for frontend | `true` |
| `frontend.resources.limits.cpu` | CPU limit | `500m` |
| `frontend.resources.limits.memory` | Memory limit | `512Mi` |

### PostgreSQL Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `postgresql.enabled` | Enable PostgreSQL | `true` |
| `postgresql.auth.database` | Database name | `hpa_db` |
| `postgresql.auth.username` | Database username | `hpa_admin` |
| `postgresql.auth.password` | Database password | `change-this-password` |
| `postgresql.primary.persistence.size` | PVC size | `10Gi` |

### Redis Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `redis.enabled` | Enable Redis | `true` |
| `redis.auth.password` | Redis password | `change-this-redis-password` |
| `redis.master.persistence.size` | PVC size for master | `2Gi` |

### Ingress Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `ingress.enabled` | Enable Ingress | `true` |
| `ingress.className` | Ingress class | `nginx` |
| `ingress.hosts[0].host` | Hostname | `hpa.local` |
| `ingress.tls[0].secretName` | TLS secret name | `hpa-tls` |

## Building Docker Images

### Backend Image

```bash
cd /home/voseghale/projects/hpa
docker build -f backend/Dockerfile -t hpa/backend:1.0.0 ./backend
docker push hpa/backend:1.0.0
```

### Frontend Image

```bash
cd /home/voseghale/projects/hpa
docker build -f helm/Dockerfile.frontend -t hpa/frontend:1.0.0 .
docker push hpa/frontend:1.0.0
```

## Upgrading

```bash
# Upgrade with new values
helm upgrade hpa ./hpa-chart --namespace hpa -f custom-values.yaml

# Upgrade with new image tags
helm upgrade hpa ./hpa-chart --namespace hpa \
  --set backend.image.tag=1.1.0 \
  --set frontend.image.tag=1.1.0
```

## Uninstallation

```bash
helm uninstall hpa --namespace hpa
kubectl delete namespace hpa
```

## Monitoring

The chart includes:
- Prometheus ServiceMonitor for metrics collection
- Grafana dashboards (when enabled)
- Health and readiness probes
- Resource metrics for HPA

### Access Metrics

```bash
# Port-forward to backend metrics
kubectl port-forward -n hpa service/hpa-backend 9090:9090

# View metrics
curl http://localhost:9090/metrics
```

## Security Features

- **RBAC**: Role-based access control for service accounts
- **Network Policies**: Restrict pod-to-pod communication
- **Pod Security Context**: Run containers as non-root user
- **TLS**: Automatic TLS with cert-manager
- **Secrets Management**: Sensitive data stored in Kubernetes secrets
- **Security Headers**: Configured in nginx for frontend

## Backup and Restore

### Database Backup

```bash
# Manual backup
kubectl exec -n hpa hpa-postgresql-0 -- pg_dump -U hpa_admin hpa_db > backup.sql

# Restore
kubectl exec -n hpa -i hpa-postgresql-0 -- psql -U hpa_admin hpa_db < backup.sql
```

### Automated Backups

Configure the `backup` section in values.yaml to enable automated backups to S3.

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -n hpa
kubectl describe pod <pod-name> -n hpa
kubectl logs <pod-name> -n hpa
```

### Database Connection Issues

```bash
# Test database connection
kubectl run -n hpa test-pg --rm -it --image=postgres:15 -- \
  psql -h hpa-postgresql -U hpa_admin -d hpa_db
```

### Check Ingress

```bash
kubectl get ingress -n hpa
kubectl describe ingress hpa -n hpa
```

## Development

### Local Development with Minikube

```bash
# Start Minikube
minikube start --memory=4096 --cpus=2

# Enable ingress
minikube addons enable ingress

# Build images locally
eval $(minikube docker-env)
docker build -f backend/Dockerfile -t hpa/backend:dev ./backend
docker build -f helm/Dockerfile.frontend -t hpa/frontend:dev .

# Install with development values
helm install hpa ./hpa-chart --namespace hpa \
  --set backend.image.tag=dev \
  --set backend.image.pullPolicy=Never \
  --set frontend.image.tag=dev \
  --set frontend.image.pullPolicy=Never

# Get Minikube IP
minikube ip

# Add to /etc/hosts
echo "$(minikube ip) hpa.local" | sudo tee -a /etc/hosts
```

### Running Tests

```bash
# Run helm tests
helm test hpa --namespace hpa

# Check test results
kubectl logs -n hpa hpa-test
```

## Production Considerations

1. **Secrets Management**: Use external secret management (e.g., Sealed Secrets, External Secrets Operator)
2. **High Availability**: Ensure multiple replicas across availability zones
3. **Monitoring**: Set up comprehensive monitoring and alerting
4. **Backup Strategy**: Implement regular automated backups
5. **Resource Limits**: Fine-tune resource requests and limits based on load testing
6. **Network Policies**: Implement strict network policies
7. **Image Scanning**: Scan container images for vulnerabilities
8. **Audit Logging**: Enable audit logging for compliance

## Support

For issues and questions:
- GitHub Issues: https://github.com/victoralfred/hpa-backend/issues
- Documentation: https://github.com/victoralfred/hpa-backend/blob/development/doc

## License

Apache 2.0