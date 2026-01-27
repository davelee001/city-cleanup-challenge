# Quick Start Guide - DevOps Infrastructure

## Running Locally with Docker Compose

### Development Mode

1. **Start all services:**
   ```bash
   docker-compose up -d
   ```

2. **Access the application:**
   - Frontend: http://localhost
   - Backend API: http://localhost:3001
   - API Health: http://localhost:3001/api/health

3. **View logs:**
   ```bash
   docker-compose logs -f
   ```

4. **Stop services:**
   ```bash
   docker-compose down
   ```

### With Development Frontend (Expo)

```bash
docker-compose --profile dev up
```

Access at: http://localhost:19006

### With Database (PostgreSQL)

```bash
docker-compose --profile postgres up
```

### With Redis Cache

```bash
docker-compose --profile cache up
```

## Running Tests

### Backend Tests

```bash
cd backend

# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### E2E Tests

```bash
# Install Playwright
npm install -D @playwright/test
npx playwright install

# Run tests
npx playwright test

# With UI
npx playwright test --ui

# Specific browser
npx playwright test --project=chromium
```

## Kubernetes Deployment

### Quick Deploy to AKS

1. **Set up kubectl context:**
   ```bash
   az aks get-credentials \
     --resource-group city-cleanup-rg \
     --name city-cleanup-aks
   ```

2. **Deploy all manifests:**
   ```bash
   kubectl apply -f k8s/
   ```

3. **Check status:**
   ```bash
   kubectl get all -n city-cleanup
   ```

4. **Access the app:**
   ```bash
   kubectl get ingress -n city-cleanup
   ```

## Environment Setup

### Backend

1. **Copy example env:**
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Edit .env with your values**

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Start server:**
   ```bash
   npm run dev
   ```

### Frontend

1. **Copy example env:**
   ```bash
   cd city-cleanup-challenge
   cp .env.example .env
   ```

2. **Edit .env with your values**

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Start Expo:**
   ```bash
   npx expo start --web
   ```

## CI/CD Setup

### GitHub Secrets Required

Add these secrets to your GitHub repository:

```
ACR_USERNAME
ACR_PASSWORD
AZURE_CREDENTIALS
AZURE_CLIENT_ID
AZURE_CLIENT_SECRET
AZURE_TENANT_ID
AZURE_KEY_VAULT_URL
```

### Trigger Deployment

Push to main branch:
```bash
git push origin main
```

Or manually trigger:
1. Go to Actions tab
2. Select "CI/CD Pipeline"
3. Click "Run workflow"

## Azure Key Vault Setup

### Quick Setup

```bash
# Create Key Vault
az keyvault create \
  --name city-cleanup-kv \
  --resource-group city-cleanup-rg \
  --location eastus

# Add a secret
az keyvault secret set \
  --vault-name city-cleanup-kv \
  --name JWT-SECRET \
  --value "your-secret"

# Get vault URL
az keyvault show \
  --name city-cleanup-kv \
  --query properties.vaultUri \
  --output tsv
```

Add the URL to your environment variables.

## Troubleshooting

### Docker Issues

**Port already in use:**
```bash
# Find process
lsof -i :3001  # Mac/Linux
netstat -ano | findstr :3001  # Windows

# Kill process or change port in docker-compose.yml
```

**Container won't start:**
```bash
docker-compose logs backend
docker-compose logs frontend
```

### Test Failures

**Clear cache and reinstall:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Database issues:**
```bash
rm backend/data/*.db
npm run dev  # Recreates database
```

### Kubernetes Issues

**Pod not starting:**
```bash
kubectl describe pod <pod-name> -n city-cleanup
kubectl logs <pod-name> -n city-cleanup
```

**Service unreachable:**
```bash
kubectl port-forward svc/backend 3001:3001 -n city-cleanup
```

## Next Steps

1. Review [DEVOPS_INFRASTRUCTURE.md](./DEVOPS_INFRASTRUCTURE.md) for detailed docs
2. Set up [Azure Key Vault](./AZURE_KEYVAULT_SETUP.md)
3. Configure monitoring and logging
4. Set up custom domain and SSL
5. Configure backup and disaster recovery

## Common Commands

### Docker

```bash
# Build images
docker-compose build

# Rebuild without cache
docker-compose build --no-cache

# Remove all containers and volumes
docker-compose down -v

# View resource usage
docker stats
```

### Kubernetes

```bash
# Scale deployment
kubectl scale deployment backend --replicas=5 -n city-cleanup

# Update image
kubectl set image deployment/backend backend=new-image:tag -n city-cleanup

# Rollback deployment
kubectl rollout undo deployment/backend -n city-cleanup

# View logs
kubectl logs -f deployment/backend -n city-cleanup
```

### Testing

```bash
# Run specific test file
npx jest backend/tests/unit/events.unit.test.js

# Run E2E on specific browser
npx playwright test --project=firefox

# Debug E2E test
npx playwright test --debug
```
