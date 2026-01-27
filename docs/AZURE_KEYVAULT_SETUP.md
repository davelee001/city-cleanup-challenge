# Azure Key Vault Setup Guide

## Prerequisites

1. Azure Subscription
2. Azure CLI installed
3. Appropriate permissions to create resources

## Setup Steps

### 1. Create Resource Group

```bash
az group create \
  --name city-cleanup-rg \
  --location eastus
```

### 2. Create Azure Key Vault

```bash
az keyvault create \
  --name city-cleanup-keyvault \
  --resource-group city-cleanup-rg \
  --location eastus \
  --enable-rbac-authorization false
```

### 3. Create Service Principal

```bash
az ad sp create-for-rbac \
  --name city-cleanup-sp \
  --role contributor \
  --scopes /subscriptions/{subscription-id}/resourceGroups/city-cleanup-rg
```

Save the output:
- `appId` -> AZURE_CLIENT_ID
- `password` -> AZURE_CLIENT_SECRET
- `tenant` -> AZURE_TENANT_ID

### 4. Grant Key Vault Permissions

```bash
az keyvault set-policy \
  --name city-cleanup-keyvault \
  --spn {appId} \
  --secret-permissions get list set delete
```

### 5. Add Secrets to Key Vault

```bash
# Database password
az keyvault secret set \
  --vault-name city-cleanup-keyvault \
  --name DATABASE-PASSWORD \
  --value "your-secure-password"

# JWT secret
az keyvault secret set \
  --vault-name city-cleanup-keyvault \
  --name JWT-SECRET \
  --value "your-jwt-secret-key"

# Maps API key
az keyvault secret set \
  --vault-name city-cleanup-keyvault \
  --name MAPS-API-KEY \
  --value "your-maps-api-key"

# Email password
az keyvault secret set \
  --vault-name city-cleanup-keyvault \
  --name SMTP-PASS \
  --value "your-email-password"
```

### 6. Configure Environment Variables

Add to your `.env` or GitHub Secrets:

```env
AZURE_CLIENT_ID=<appId>
AZURE_CLIENT_SECRET=<password>
AZURE_TENANT_ID=<tenant>
AZURE_KEY_VAULT_URL=https://city-cleanup-keyvault.vault.azure.net/
```

### 7. For AKS with Managed Identity

```bash
# Enable managed identity on AKS
az aks update \
  --resource-group city-cleanup-rg \
  --name city-cleanup-aks \
  --enable-managed-identity

# Get the identity
IDENTITY_CLIENT_ID=$(az aks show \
  --resource-group city-cleanup-rg \
  --name city-cleanup-aks \
  --query identityProfile.kubeletidentity.clientId \
  --output tsv)

# Grant Key Vault access
az keyvault set-policy \
  --name city-cleanup-keyvault \
  --object-id $IDENTITY_CLIENT_ID \
  --secret-permissions get list
```

### 8. Install CSI Secrets Driver (for Kubernetes)

```bash
# Add Helm repo
helm repo add csi-secrets-store-provider-azure \
  https://azure.github.io/secrets-store-csi-driver-provider-azure/charts

# Install the driver
helm install csi-secrets-store-provider-azure/csi-secrets-store-provider-azure \
  --generate-name \
  --namespace kube-system
```

## Usage in Application

```javascript
const secretsManager = require('./services/secrets-manager');

// Initialize
await secretsManager.initialize();

// Get a secret
const dbPassword = await secretsManager.get('DATABASE-PASSWORD');

// Get multiple secrets
const secrets = await secretsManager.getMultiple([
  'JWT-SECRET',
  'MAPS-API-KEY',
  'SMTP-PASS'
]);
```

## GitHub Actions Integration

Add to GitHub repository secrets:
- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET`
- `AZURE_TENANT_ID`
- `AZURE_KEY_VAULT_URL`

The CI/CD pipeline will automatically use these for deployments.

## Security Best Practices

1. **Rotate secrets regularly**
   ```bash
   az keyvault secret set \
     --vault-name city-cleanup-keyvault \
     --name SECRET-NAME \
     --value "new-value"
   ```

2. **Enable soft delete**
   ```bash
   az keyvault update \
     --name city-cleanup-keyvault \
     --enable-soft-delete true \
     --enable-purge-protection true
   ```

3. **Monitor access**
   ```bash
   az monitor diagnostic-settings create \
     --resource /subscriptions/{sub-id}/resourceGroups/city-cleanup-rg/providers/Microsoft.KeyVault/vaults/city-cleanup-keyvault \
     --name KeyVaultDiagnostics \
     --logs '[{"category": "AuditEvent","enabled": true}]'
   ```

4. **Use managed identities** when possible instead of service principals

5. **Set expiration dates** on secrets
   ```bash
   az keyvault secret set \
     --vault-name city-cleanup-keyvault \
     --name SECRET-NAME \
     --value "value" \
     --expires "2027-01-01T00:00:00Z"
   ```

## Troubleshooting

### Cannot access Key Vault
- Verify service principal has correct permissions
- Check firewall rules
- Verify AZURE_KEY_VAULT_URL is correct

### Secrets not updating
- Clear cache: `secretsManager.refreshCache()`
- Check secret version
- Verify permissions

### Performance issues
- Secrets are cached for 5 minutes by default
- Adjust cache timeout in `azure-keyvault.js`
- Use batch operations for multiple secrets

## Cost Optimization

- Standard tier: ~$0.03 per 10,000 operations
- Monitor usage with Azure Cost Management
- Use caching to reduce API calls
- Consider secret versions carefully
