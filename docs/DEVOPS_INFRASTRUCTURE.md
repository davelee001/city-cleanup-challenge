# DevOps & Infrastructure Documentation

## Overview

This document provides comprehensive documentation for the DevOps and infrastructure setup of the City Cleanup Challenge application.

## Table of Contents

1. [Docker Setup](#docker-setup)
2. [Docker Compose](#docker-compose)
3. [Kubernetes Deployment](#kubernetes-deployment)
4. [CI/CD Pipeline](#cicd-pipeline)
5. [Testing Infrastructure](#testing-infrastructure)
6. [Environment Configuration](#environment-configuration)
7. [Azure Key Vault](#azure-key-vault)
8. [Monitoring & Logging](#monitoring--logging)

## Docker Setup

### Backend Dockerfile

Located at: `backend/Dockerfile`

**Features:**
- Node.js 18 Alpine base image
- Production dependencies only
- Health check enabled
- SQLite data directory creation
- Port 3001 exposed

**Build:**
```bash
docker build -t city-cleanup-backend ./backend
```

**Run:**
```bash
docker run -p 3001:3001 -v $(pwd)/data:/app/data city-cleanup-backend
```

### Frontend Dockerfile

Located at: `city-cleanup-challenge/Dockerfile`

**Features:**
- Multi-stage build
- Expo web export
- Nginx for serving
- Health check endpoint
- Gzip compression

**Build:**
```bash
docker build -t city-cleanup-frontend ./city-cleanup-challenge
```

**Run:**
```bash
docker run -p 80:80 city-cleanup-frontend
```

## Docker Compose

### Development Setup

**Start all services:**
```bash
docker-compose up -d
```

**Services:**
- `backend` - API server on port 3001
- `frontend` - Web app on port 80
- `frontend-dev` - Expo dev server on port 19006 (profile: dev)
- `postgres` - PostgreSQL database (profile: postgres)
- `redis` - Redis cache (profile: redis)
- `nginx` - Reverse proxy (profile: proxy)

**Start with specific profiles:**
```bash
# Development with Expo
docker-compose --profile dev up

# With PostgreSQL
docker-compose --profile postgres up

# With Redis cache
docker-compose --profile cache up
```

### Production Setup

**File:** `docker-compose.prod.yml`

**Deploy:**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

**Features:**
- Multiple replicas
- Resource limits
- Overlay networking
- Azure Key Vault integration

## Kubernetes Deployment

### Prerequisites

1. Kubernetes cluster (AKS recommended)
2. kubectl configured
3. Azure Container Registry
4. Helm (optional, for cert-manager)

### Deployment Steps

**1. Create namespace:**
```bash
kubectl apply -f k8s/namespace.yaml
```

**2. Configure secrets:**
```bash
# Update k8s/secrets.yaml with your values
kubectl apply -f k8s/secrets.yaml
```

**3. Apply configurations:**
```bash
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/persistent-volume.yaml
```

**4. Deploy applications:**
```bash
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
```

**5. Configure ingress:**
```bash
# Install cert-manager first
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Apply ingress
kubectl apply -f k8s/ingress.yaml
```

**6. Verify deployment:**
```bash
kubectl get pods -n city-cleanup
kubectl get services -n city-cleanup
kubectl get ingress -n city-cleanup
```

### Kubernetes Features

- **Horizontal Pod Autoscaling:** 2-10 replicas based on CPU/memory
- **Health Checks:** Liveness and readiness probes
- **Resource Limits:** CPU and memory constraints
- **Persistent Storage:** Azure managed disks
- **SSL/TLS:** Automatic certificate management
- **Azure Key Vault:** CSI driver integration

### Scaling

**Manual scaling:**
```bash
kubectl scale deployment backend --replicas=5 -n city-cleanup
```

**Autoscaling is configured** with:
- Min replicas: 2
- Max replicas: 10
- CPU target: 70%
- Memory target: 80%

## CI/CD Pipeline

### GitHub Actions Workflows

**Main Pipeline:** `.github/workflows/ci-cd.yml`

**Triggers:**
- Push to main/develop branches
- Pull requests
- Manual workflow dispatch

**Jobs:**

1. **Code Quality** - ESLint checks
2. **Unit Tests** - Jest tests with coverage
3. **Integration Tests** - API integration tests
4. **Build & Push** - Docker images to ACR
5. **Security Scan** - Trivy vulnerability scanning
6. **Deploy** - Deploy to AKS
7. **E2E Tests** - Playwright end-to-end tests
8. **Notify** - Deployment status notifications

**Pull Request Pipeline:** `.github/workflows/pr-checks.yml`

- Runs on PR open/update
- Linting, testing, build validation
- No deployment

### Required GitHub Secrets

```
ACR_USERNAME - Azure Container Registry username
ACR_PASSWORD - Azure Container Registry password
AZURE_CREDENTIALS - Azure service principal credentials
AZURE_CLIENT_ID - Service principal app ID
AZURE_CLIENT_SECRET - Service principal password
AZURE_TENANT_ID - Azure tenant ID
AZURE_KEY_VAULT_URL - Key Vault URL
```

### Setting up Azure Credentials

```bash
az ad sp create-for-rbac \
  --name city-cleanup-github \
  --role contributor \
  --scopes /subscriptions/{subscription-id}/resourceGroups/city-cleanup-rg \
  --sdk-auth
```

Add the entire JSON output as `AZURE_CREDENTIALS` secret.

## Testing Infrastructure

### Unit Tests

**Location:** `backend/tests/unit/`

**Run:**
```bash
cd backend
npm run test:unit
```

**Coverage:**
```bash
npm run test:coverage
```

### Integration Tests

**Location:** `backend/tests/integration/`

**Run:**
```bash
cd backend
npm run test:integration
```

**Features:**
- API endpoint testing
- Database operations
- Error handling

### E2E Tests

**Location:** `tests/e2e/`

**Run:**
```bash
npx playwright test
```

**Run with UI:**
```bash
npx playwright test --ui
```

**Features:**
- Cross-browser testing (Chrome, Firefox, Safari)
- Mobile device testing
- Screenshot on failure
- Video recording
- Parallel execution

**Configuration:** `playwright.config.js`

### Test Reports

- HTML report: `playwright-report/index.html`
- JSON results: `test-results/results.json`
- JUnit XML: `test-results/junit.xml`

## Environment Configuration

### Backend Environment Variables

**Development:** `backend/.env.example`
**Production:** `backend/.env.production`

**Key variables:**
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port
- `DATABASE_PATH` - SQLite database path
- `CORS_ORIGIN` - Allowed origins
- `JWT_SECRET` - JWT signing key
- `AZURE_KEY_VAULT_URL` - Key Vault URL

### Frontend Environment Variables

**Development:** `city-cleanup-challenge/.env.example`
**Production:** `city-cleanup-challenge/.env.production`

**Key variables:**
- `REACT_APP_API_URL` - Backend API URL
- `REACT_APP_MAPS_API_KEY` - Maps API key
- `REACT_APP_ENABLE_ANALYTICS` - Analytics toggle

### Configuration Module

**File:** `backend/src/config.js`

**Usage:**
```javascript
const config = require('./config');

console.log(config.port); // 3001
console.log(config.database.path);
console.log(config.features.analytics);
```

## Azure Key Vault

### Setup

See detailed guide: `docs/AZURE_KEYVAULT_SETUP.md`

### Usage in Code

```javascript
const secretsManager = require('./services/secrets-manager');

// Initialize (done automatically on app start)
await secretsManager.initialize();

// Get single secret
const apiKey = await secretsManager.get('MAPS-API-KEY');

// Get multiple secrets
const secrets = await secretsManager.getMultiple([
  'JWT-SECRET',
  'DATABASE-PASSWORD'
]);

// Set secret (Key Vault only)
await secretsManager.set('NEW-SECRET', 'value');
```

### Features

- Automatic fallback to environment variables
- 5-minute caching
- Batch operations
- Managed identity support
- Client credentials support

## Monitoring & Logging

### Application Logging

**Backend uses Morgan:**
- Development: `dev` format
- Production: `combined` format

**Log levels:**
- `debug` - Development only
- `info` - General information
- `warn` - Warning messages
- `error` - Error messages

### Health Checks

**Endpoints:**
- `/api/health` - Application health
- `/api/ready` - Readiness check

**Kubernetes probes configured** for:
- Liveness: Restart if unhealthy
- Readiness: Remove from load balancer if not ready

### Recommended Monitoring Tools

1. **Azure Monitor** - Cloud-native monitoring
2. **Application Insights** - APM and logging
3. **Prometheus** - Metrics collection
4. **Grafana** - Visualization
5. **ELK Stack** - Log aggregation

### Setting up Application Insights

```bash
# Create Application Insights
az monitor app-insights component create \
  --app city-cleanup-insights \
  --location eastus \
  --resource-group city-cleanup-rg

# Get instrumentation key
az monitor app-insights component show \
  --app city-cleanup-insights \
  --resource-group city-cleanup-rg \
  --query instrumentationKey
```

Add to environment:
```env
APPINSIGHTS_INSTRUMENTATIONKEY=<key>
```

## Deployment Checklist

### Pre-deployment

- [ ] Update version numbers
- [ ] Run all tests locally
- [ ] Build Docker images
- [ ] Update environment variables
- [ ] Review resource limits
- [ ] Check database migrations
- [ ] Update documentation

### Deployment

- [ ] Merge to main branch
- [ ] Monitor GitHub Actions pipeline
- [ ] Verify Docker images pushed
- [ ] Check Kubernetes deployment status
- [ ] Run smoke tests
- [ ] Verify health endpoints

### Post-deployment

- [ ] Monitor application logs
- [ ] Check resource usage
- [ ] Verify all features working
- [ ] Update deployment documentation
- [ ] Notify team of deployment

## Troubleshooting

### Docker Issues

**Container won't start:**
```bash
docker logs <container-id>
docker inspect <container-id>
```

**Build fails:**
```bash
docker build --no-cache -t image-name .
```

### Kubernetes Issues

**Pod crashes:**
```bash
kubectl logs <pod-name> -n city-cleanup
kubectl describe pod <pod-name> -n city-cleanup
```

**Service unreachable:**
```bash
kubectl get endpoints -n city-cleanup
kubectl port-forward svc/backend 3001:3001 -n city-cleanup
```

### CI/CD Issues

**Pipeline fails:**
- Check GitHub Actions logs
- Verify secrets are set
- Check Azure credentials
- Review workflow YAML syntax

**Deployment fails:**
- Verify Kubernetes cluster access
- Check image tags
- Review resource quotas
- Check namespace permissions

## Best Practices

1. **Security**
   - Never commit secrets
   - Use Key Vault for production
   - Rotate credentials regularly
   - Enable RBAC
   - Use network policies

2. **Performance**
   - Use multi-stage builds
   - Optimize image sizes
   - Configure resource limits
   - Enable caching
   - Use CDN for static assets

3. **Reliability**
   - Implement health checks
   - Configure autoscaling
   - Use readiness probes
   - Set up monitoring
   - Plan for disaster recovery

4. **Development**
   - Use Docker Compose locally
   - Run tests before committing
   - Follow semantic versioning
   - Document changes
   - Use feature flags

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Azure AKS Documentation](https://docs.microsoft.com/azure/aks/)
- [GitHub Actions Documentation](https://docs.github.com/actions)
- [Playwright Documentation](https://playwright.dev/)

## Support

For issues or questions:
1. Check this documentation
2. Review logs and error messages
3. Search existing issues
4. Create new issue with details
5. Contact DevOps team
