import { ethers } from 'ethers';
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from 'bip39';
import HDKey from 'hdkey';
import { EncryptionService } from './EncryptionService.js';

/**
 * HD Wallet Manager - Generate and manage HD wallets from BIP39 mnemonic
 */
export class HDWalletManager {
  /**
   * Generate a new mnemonic (12 or 24 words)
   */
  static generateMnemonic(strength = 128) {
    // strength 128 = 12 words, 256 = 24 words
    return generateMnemonic(strength);
  }

  /**
   * Validate mnemonic
   */
  static validateMnemonic(mnemonic) {
    return validateMnemonic(mnemonic);
  }

  /**
   * Derive wallet from mnemonic at specific index
   */
  static deriveWalletFromMnemonic(mnemonic, index = 0) {
    if (!this.validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic');
    }

    // Standard Ethereum path: m/44'/60'/0'/0/{index}
    const seed = mnemonicToSeedSync(mnemonic);
    const hdKey = HDKey.fromMasterSeed(seed);
    const path = `m/44'/60'/0'/0/${index}`;
    const derivedKey = hdKey.derive(path);

    const privateKey = '0x' + derivedKey.privateKey.toString('hex');
    const wallet = new ethers.Wallet(privateKey);

    return {
      index,
      path,
      address: wallet.address,
      publicKey: wallet.publicKey,
      privateKey,
    };
  }

  /**
   * Generate multiple wallets from mnemonic
   */
  static generateWalletsFromMnemonic(mnemonic, count = 10) {
    if (!this.validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic');
    }

    const wallets = [];
    for (let i = 0; i < count; i++) {
      wallets.push(this.deriveWalletFromMnemonic(mnemonic, i));
    }
    return wallets;
  }

  /**
   * Create wallet from private key
   */
  static createWalletFromPrivateKey(privateKey) {
    try {
      const wallet = new ethers.Wallet(privateKey);
      return {
        address: wallet.address,
        publicKey: wallet.publicKey,
        privateKey,
      };
    } catch (error) {
      throw new Error('Invalid private key');
    }
  }

  /**
   * Create a random wallet
   */
  static createRandomWallet() {
    const wallet = ethers.Wallet.createRandom();
    return {
      mnemonic: wallet.mnemonic.phrase,
      address: wallet.address,
      publicKey: wallet.publicKey,
      privateKey: wallet.privateKey,
    };
  }

  /**
   * Export wallet data (without private key by default)
   */
  static exportWallet(wallet, includePrivateKey = false) {
    const exported = {
      address: wallet.address,
      publicKey: wallet.publicKey,
      name: wallet.name || '',
      imported: wallet.imported || false,
      createdAt: wallet.createdAt,
    };

    if (includePrivateKey) {
      exported.privateKey = wallet.privateKey;
    }

    return exported;
  }
}

/**
 * Wallet Service - Application-level wallet operations
 */
export class WalletService {
  /**
   * Create wallet from encrypted mnemonic
   */
  static createWalletFromEncryptedMnemonic(encryptedMnemonic, index, walletName) {
    const mnemonic = EncryptionService.decrypt(encryptedMnemonic);
    const walletData = HDWalletManager.deriveWalletFromMnemonic(mnemonic, index);
    
    return {
      ...walletData,
      name: walletName || `Wallet ${index + 1}`,
      encryptedMnemonic,
      mnemonicIndex: index,
      imported: false,
    };
  }

  /**
   * Import wallet from private key
   */
  static importWalletFromPrivateKey(privateKey, walletName) {
    const wallet = HDWalletManager.createWalletFromPrivateKey(privateKey);
    const encryptedPrivateKey = EncryptionService.encrypt(privateKey);

    return {
      address: wallet.address,
      publicKey: wallet.publicKey,
      privateKey: encryptedPrivateKey,
      name: walletName || 'Imported Wallet',
      imported: true,
    };
  }

  /**
   * Import wallet from mnemonic
   */
  static importWalletFromMnemonic(mnemonic, startIndex = 0, count = 10, walletNamePrefix = 'Imported') {
    if (!HDWalletManager.validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic phrase');
    }

    const encryptedMnemonic = EncryptionService.encrypt(mnemonic);
    const wallets = HDWalletManager.generateWalletsFromMnemonic(mnemonic, startIndex + count);

    return wallets.slice(startIndex).map((wallet, idx) => ({
      ...wallet,
      name: `${walletNamePrefix} ${startIndex + idx + 1}`,
      encryptedMnemonic,
      mnemonicIndex: startIndex + idx,
      imported: true,
    }));
  }

  /**
   * Decrypt private key for transaction signing
   */
  static getDecryptedPrivateKey(encryptedPrivateKey) {
    return EncryptionService.decrypt(encryptedPrivateKey);
  }
}
