/**
 * JWT Secret Manager
 * Persists JWT_SECRET to file to prevent regeneration on restart
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class JWTSecretManager {
  constructor(userDataPath) {
    this.secretFile = path.join(userDataPath, '.jwt-secret');
    this.userDataPath = userDataPath;
  }

  /**
   * Get or generate JWT secret
   * If secret exists in file, use it. Otherwise, generate and save.
   */
  getOrCreateSecret() {
    try {
      // Ensure user data directory exists
      if (!fs.existsSync(this.userDataPath)) {
        fs.mkdirSync(this.userDataPath, { recursive: true });
      }

      // Try to read existing secret
      if (fs.existsSync(this.secretFile)) {
        try {
          const secret = fs.readFileSync(this.secretFile, 'utf8').trim();
          if (secret && secret.length >= 32) {
            return secret;
          }
        } catch (error) {
          console.warn('Failed to read JWT secret file, generating new one:', error.message);
        }
      }

      // Generate new secret
      const secret = crypto.randomBytes(64).toString('hex');
      
      // Save to file
      try {
        fs.writeFileSync(this.secretFile, secret, { mode: 0o600 }); // Read/write for owner only
        return secret;
      } catch (error) {
        console.warn('Failed to save JWT secret to file:', error.message);
        // Return secret anyway (will regenerate on restart)
        return secret;
      }
    } catch (error) {
      console.error('JWT secret manager error:', error.message);
      // Fallback: generate temporary secret
      return crypto.randomBytes(64).toString('hex');
    }
  }

  /**
   * Validate secret format
   */
  validateSecret(secret) {
    return secret && typeof secret === 'string' && secret.length >= 32;
  }
}

module.exports = JWTSecretManager;

