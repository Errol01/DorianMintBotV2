import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.VITE_ENCRYPTION_KEY || 'default-unsafe-key-change-in-production';

/**
 * Encryption Service - Handle AES-256 encryption/decryption
 */
export class EncryptionService {
  /**
   * Encrypt text using AES-256
   */
  static encrypt(text) {
    if (!text) return null;
    
    try {
      return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
    } catch (error) {
      console.error('[Encryption] Error encrypting text:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt text using AES-256
   */
  static decrypt(encryptedText) {
    if (!encryptedText) return null;

    try {
      const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      
      if (!decrypted) {
        throw new Error('Decryption resulted in empty string');
      }
      
      return decrypted;
    } catch (error) {
      console.error('[Encryption] Error decrypting text:', error);
      throw new Error('Decryption failed - invalid key or corrupted data');
    }
  }

  /**
   * Hash text using SHA-256
   */
  static hash(text) {
    return CryptoJS.SHA256(text).toString();
  }

  /**
   * Verify hash
   */
  static verifyHash(text, hash) {
    return this.hash(text) === hash;
  }
}

/**
 * Random utilities
 */
export class RandomService {
  /**
   * Generate random hex string
   */
  static generateRandomHex(length = 32) {
    return CryptoJS.lib.WordArray.random(length / 2).toString();
  }

  /**
   * Generate random number between min and max
   */
  static generateRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
