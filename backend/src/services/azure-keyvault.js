/**
 * Azure Key Vault Integration Module
 * Securely manages secrets using Azure Key Vault
 */

const { SecretClient } = require('@azure/keyvault-secrets');
const { DefaultAzureCredential, ClientSecretCredential } = require('@azure/identity');

class AzureKeyVaultService {
  constructor() {
    this.client = null;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Initialize Azure Key Vault client
   */
  async initialize() {
    try {
      const keyVaultUrl = process.env.AZURE_KEY_VAULT_URL;
      
      if (!keyVaultUrl) {
        console.warn('Azure Key Vault URL not configured. Secrets management disabled.');
        return false;
      }

      let credential;
      
      // Use client credentials if provided
      if (process.env.AZURE_CLIENT_ID && 
          process.env.AZURE_CLIENT_SECRET && 
          process.env.AZURE_TENANT_ID) {
        credential = new ClientSecretCredential(
          process.env.AZURE_TENANT_ID,
          process.env.AZURE_CLIENT_ID,
          process.env.AZURE_CLIENT_SECRET
        );
      } else {
        // Use managed identity or default Azure credential
        credential = new DefaultAzureCredential();
      }

      this.client = new SecretClient(keyVaultUrl, credential);
      console.log('Azure Key Vault initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Azure Key Vault:', error.message);
      return false;
    }
  }

  /**
   * Get secret from Azure Key Vault
   * @param {string} secretName - Name of the secret
   * @param {boolean} useCache - Whether to use cached value
   * @returns {Promise<string>} Secret value
   */
  async getSecret(secretName, useCache = true) {
    try {
      // Check cache first
      if (useCache && this.cache.has(secretName)) {
        const cached = this.cache.get(secretName);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.value;
        }
      }

      if (!this.client) {
        // Fallback to environment variables if Key Vault not initialized
        return process.env[secretName] || null;
      }

      const secret = await this.client.getSecret(secretName);
      const value = secret.value;

      // Cache the value
      this.cache.set(secretName, {
        value,
        timestamp: Date.now()
      });

      return value;
    } catch (error) {
      console.error(`Failed to get secret ${secretName}:`, error.message);
      // Fallback to environment variable
      return process.env[secretName] || null;
    }
  }

  /**
   * Set secret in Azure Key Vault
   * @param {string} secretName - Name of the secret
   * @param {string} secretValue - Value of the secret
   * @returns {Promise<boolean>} Success status
   */
  async setSecret(secretName, secretValue) {
    try {
      if (!this.client) {
        throw new Error('Azure Key Vault not initialized');
      }

      await this.client.setSecret(secretName, secretValue);
      
      // Update cache
      this.cache.set(secretName, {
        value: secretValue,
        timestamp: Date.now()
      });

      console.log(`Secret ${secretName} updated successfully`);
      return true;
    } catch (error) {
      console.error(`Failed to set secret ${secretName}:`, error.message);
      return false;
    }
  }

  /**
   * Delete secret from Azure Key Vault
   * @param {string} secretName - Name of the secret
   * @returns {Promise<boolean>} Success status
   */
  async deleteSecret(secretName) {
    try {
      if (!this.client) {
        throw new Error('Azure Key Vault not initialized');
      }

      const poller = await this.client.beginDeleteSecret(secretName);
      await poller.pollUntilDone();
      
      // Remove from cache
      this.cache.delete(secretName);

      console.log(`Secret ${secretName} deleted successfully`);
      return true;
    } catch (error) {
      console.error(`Failed to delete secret ${secretName}:`, error.message);
      return false;
    }
  }

  /**
   * Get multiple secrets at once
   * @param {string[]} secretNames - Array of secret names
   * @returns {Promise<Object>} Object with secret names as keys
   */
  async getSecrets(secretNames) {
    const secrets = {};
    
    await Promise.all(
      secretNames.map(async (name) => {
        secrets[name] = await this.getSecret(name);
      })
    );

    return secrets;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * List all secret names
   * @returns {Promise<string[]>} Array of secret names
   */
  async listSecrets() {
    try {
      if (!this.client) {
        throw new Error('Azure Key Vault not initialized');
      }

      const secretNames = [];
      for await (const secretProperties of this.client.listPropertiesOfSecrets()) {
        secretNames.push(secretProperties.name);
      }

      return secretNames;
    } catch (error) {
      console.error('Failed to list secrets:', error.message);
      return [];
    }
  }
}

// Export singleton instance
const keyVaultService = new AzureKeyVaultService();

module.exports = keyVaultService;
