/**
 * Secrets Manager
 * Provides abstraction layer for secret management
 * Supports Azure Key Vault and environment variables
 */

const keyVaultService = require('./azure-keyvault');

class SecretsManager {
  constructor() {
    this.initialized = false;
    this.useKeyVault = false;
  }

  /**
   * Initialize secrets manager
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    // Try to initialize Azure Key Vault
    this.useKeyVault = await keyVaultService.initialize();
    this.initialized = true;

    if (this.useKeyVault) {
      console.log('Using Azure Key Vault for secrets management');
    } else {
      console.log('Using environment variables for secrets management');
    }
  }

  /**
   * Get secret value
   * @param {string} key - Secret key/name
   * @param {string} defaultValue - Default value if secret not found
   * @returns {Promise<string>} Secret value
   */
  async get(key, defaultValue = null) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.useKeyVault) {
      const value = await keyVaultService.getSecret(key);
      return value || defaultValue;
    }

    return process.env[key] || defaultValue;
  }

  /**
   * Get multiple secrets
   * @param {string[]} keys - Array of secret keys
   * @returns {Promise<Object>} Object with keys and values
   */
  async getMultiple(keys) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.useKeyVault) {
      return await keyVaultService.getSecrets(keys);
    }

    const secrets = {};
    keys.forEach(key => {
      secrets[key] = process.env[key];
    });
    return secrets;
  }

  /**
   * Set secret value (only works with Key Vault)
   * @param {string} key - Secret key/name
   * @param {string} value - Secret value
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.useKeyVault) {
      return await keyVaultService.setSecret(key, value);
    }

    console.warn('Cannot set secrets in environment variable mode');
    return false;
  }

  /**
   * Delete secret (only works with Key Vault)
   * @param {string} key - Secret key/name
   * @returns {Promise<boolean>} Success status
   */
  async delete(key) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.useKeyVault) {
      return await keyVaultService.deleteSecret(key);
    }

    console.warn('Cannot delete secrets in environment variable mode');
    return false;
  }

  /**
   * Check if using Azure Key Vault
   * @returns {boolean}
   */
  isUsingKeyVault() {
    return this.useKeyVault;
  }

  /**
   * Refresh secrets cache
   */
  refreshCache() {
    if (this.useKeyVault) {
      keyVaultService.clearCache();
    }
  }
}

// Export singleton instance
const secretsManager = new SecretsManager();

module.exports = secretsManager;
