import { getDatabase } from './db.js';

/**
 * Wallet Repository - Database operations for wallets
 */
export class WalletRepository {
  /**
   * Create a new wallet
   */
  static create(walletData) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO wallets (address, publicKey, privateKey, encryptedMnemonic, mnemonicIndex, name, imported)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      walletData.address,
      walletData.publicKey,
      walletData.privateKey,
      walletData.encryptedMnemonic || null,
      walletData.mnemonicIndex !== undefined ? walletData.mnemonicIndex : null,
      walletData.name || '',
      walletData.imported ? 1 : 0
    );

    return this.findById(result.lastInsertRowid);
  }

  /**
   * Find wallet by ID
   */
  static findById(id) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM wallets WHERE id = ?');
    return stmt.get(id);
  }

  /**
   * Find wallet by address
   */
  static findByAddress(address) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM wallets WHERE address = ?');
    return stmt.get(address);
  }

  /**
   * Get all wallets
   */
  static getAll() {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM wallets ORDER BY createdAt DESC');
    return stmt.all();
  }

  /**
   * Get paginated wallets
   */
  static getPaginated(page = 1, limit = 50) {
    const db = getDatabase();
    const offset = (page - 1) * limit;
    const stmt = db.prepare(`
      SELECT * FROM wallets ORDER BY createdAt DESC LIMIT ? OFFSET ?
    `);
    return stmt.all(limit, offset);
  }

  /**
   * Get wallet count
   */
  static getCount() {
    const db = getDatabase();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM wallets');
    const result = stmt.get();
    return result.count;
  }

  /**
   * Update wallet
   */
  static update(id, updates) {
    const db = getDatabase();
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }

    fields.push('updatedAt = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = db.prepare(`UPDATE wallets SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.findById(id);
  }

  /**
   * Delete wallet
   */
  static delete(id) {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM wallets WHERE id = ?');
    return stmt.run(id);
  }

  /**
   * Delete all wallets
   */
  static deleteAll() {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM wallets');
    return stmt.run();
  }

  /**
   * Bulk create wallets
   */
  static bulkCreate(walletsList) {
    const db = getDatabase();
    const insert = db.transaction((wallets) => {
      for (const wallet of wallets) {
        this.create(wallet);
      }
    });

    return insert(walletsList);
  }
}

/**
 * Master Mnemonic Repository
 */
export class MnemonicRepository {
  /**
   * Save or update master mnemonic
   */
  static saveMaster(encryptedMnemonic) {
    const db = getDatabase();
    
    // Check if exists
    const exists = db.prepare('SELECT id FROM master_mnemonic WHERE id = 1').get();
    
    if (exists) {
      const stmt = db.prepare('UPDATE master_mnemonic SET encryptedMnemonic = ? WHERE id = 1');
      stmt.run(encryptedMnemonic);
    } else {
      const stmt = db.prepare(`
        INSERT INTO master_mnemonic (id, encryptedMnemonic) VALUES (1, ?)
      `);
      stmt.run(encryptedMnemonic);
    }

    return this.getMaster();
  }

  /**
   * Get master mnemonic
   */
  static getMaster() {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM master_mnemonic WHERE id = 1');
    return stmt.get();
  }

  /**
   * Delete master mnemonic
   */
  static deleteMaster() {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM master_mnemonic WHERE id = 1');
    return stmt.run();
  }
}

/**
 * Settings Repository
 */
export class SettingsRepository {
  /**
   * Set a setting
   */
  static set(key, value, type = 'string') {
    const db = getDatabase();
    const exists = db.prepare('SELECT key FROM settings WHERE key = ?').get(key);

    if (exists) {
      const stmt = db.prepare('UPDATE settings SET value = ?, type = ? WHERE key = ?');
      stmt.run(value, type, key);
    } else {
      const stmt = db.prepare('INSERT INTO settings (key, value, type) VALUES (?, ?, ?)');
      stmt.run(key, value, type);
    }

    return this.get(key);
  }

  /**
   * Get a setting
   */
  static get(key) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM settings WHERE key = ?');
    return stmt.get(key);
  }

  /**
   * Get all settings
   */
  static getAll() {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM settings');
    return stmt.all();
  }

  /**
   * Delete a setting
   */
  static delete(key) {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM settings WHERE key = ?');
    return stmt.run(key);
  }
}

/**
 * RPC Endpoints Repository
 */
export class RpcRepository {
  /**
   * Create RPC endpoint
   */
  static create(rpcData) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO rpc_endpoints (name, url, chainId, isActive, isPrimary)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      rpcData.name,
      rpcData.url,
      rpcData.chainId || null,
      rpcData.isActive !== false ? 1 : 0,
      rpcData.isPrimary ? 1 : 0
    );

    return this.findById(result.lastInsertRowid);
  }

  /**
   * Get all RPC endpoints
   */
  static getAll() {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM rpc_endpoints ORDER BY isPrimary DESC, createdAt ASC');
    return stmt.all();
  }

  /**
   * Get active RPC endpoints
   */
  static getActive() {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM rpc_endpoints WHERE isActive = 1 ORDER BY isPrimary DESC');
    return stmt.all();
  }

  /**
   * Get primary RPC endpoint
   */
  static getPrimary() {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM rpc_endpoints WHERE isPrimary = 1 AND isActive = 1 LIMIT 1');
    return stmt.get();
  }

  /**
   * Find RPC by ID
   */
  static findById(id) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM rpc_endpoints WHERE id = ?');
    return stmt.get(id);
  }

  /**
   * Update RPC endpoint
   */
  static update(id, updates) {
    const db = getDatabase();
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }

    values.push(id);
    const stmt = db.prepare(`UPDATE rpc_endpoints SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.findById(id);
  }

  /**
   * Delete RPC endpoint
   */
  static delete(id) {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM rpc_endpoints WHERE id = ?');
    return stmt.run(id);
  }
}

/**
 * Transactions Repository
 */
export class TransactionRepository {
  /**
   * Create transaction
   */
  static create(txData) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO transactions (fromAddress, toAddress, amount, gasPrice, gasLimit, nonce, data, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      txData.fromAddress,
      txData.toAddress,
      txData.amount,
      txData.gasPrice || null,
      txData.gasLimit || null,
      txData.nonce || null,
      txData.data || null,
      txData.status || 'pending'
    );

    return this.findById(result.lastInsertRowid);
  }

  /**
   * Get all transactions
   */
  static getAll() {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM transactions ORDER BY createdAt DESC');
    return stmt.all();
  }

  /**
   * Get transactions by status
   */
  static getByStatus(status) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM transactions WHERE status = ? ORDER BY createdAt DESC');
    return stmt.all(status);
  }

  /**
   * Get transactions by wallet address
   */
  static getByAddress(address) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM transactions WHERE fromAddress = ? ORDER BY createdAt DESC');
    return stmt.all(address);
  }

  /**
   * Find transaction by ID
   */
  static findById(id) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM transactions WHERE id = ?');
    return stmt.get(id);
  }

  /**
   * Find transaction by hash
   */
  static findByHash(hash) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM transactions WHERE transactionHash = ?');
    return stmt.get(hash);
  }

  /**
   * Update transaction
   */
  static update(id, updates) {
    const db = getDatabase();
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }

    values.push(id);
    const stmt = db.prepare(`UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.findById(id);
  }

  /**
   * Delete transaction
   */
  static delete(id) {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM transactions WHERE id = ?');
    return stmt.run(id);
  }
}

/**
 * Activity Log Repository
 */
export class ActivityLogRepository {
  /**
   * Create activity log
   */
  static create(logData) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO activity_logs (type, action, details, status)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      logData.type,
      logData.action,
      logData.details || null,
      logData.status || 'info'
    );

    return this.findById(result.lastInsertRowid);
  }

  /**
   * Get all activity logs
   */
  static getAll() {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM activity_logs ORDER BY createdAt DESC');
    return stmt.all();
  }

  /**
   * Get activity logs by type
   */
  static getByType(type) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM activity_logs WHERE type = ? ORDER BY createdAt DESC');
    return stmt.all(type);
  }

  /**
   * Get paginated activity logs
   */
  static getPaginated(page = 1, limit = 50) {
    const db = getDatabase();
    const offset = (page - 1) * limit;
    const stmt = db.prepare(`
      SELECT * FROM activity_logs ORDER BY createdAt DESC LIMIT ? OFFSET ?
    `);
    return stmt.all(limit, offset);
  }

  /**
   * Find activity log by ID
   */
  static findById(id) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM activity_logs WHERE id = ?');
    return stmt.get(id);
  }

  /**
   * Delete old logs (older than days)
   */
  static deleteOldLogs(days = 30) {
    const db = getDatabase();
    const stmt = db.prepare(`
      DELETE FROM activity_logs 
      WHERE createdAt < datetime('now', '-' || ? || ' days')
    `);
    return stmt.run(days);
  }
}
