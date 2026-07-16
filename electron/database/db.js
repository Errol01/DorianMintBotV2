import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

let db = null;

/**
 * Initialize SQLite database
 */
export function initializeDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'app.db');
  
  // Ensure directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(dbPath);
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');

  // Create tables
  createTables();
  
  console.log('[DB] Database initialized at:', dbPath);
  return db;
}

/**
 * Get database instance
 */
export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase first.');
  }
  return db;
}

/**
 * Create database schema
 */
function createTables() {
  // Wallets table
  db.exec(`
    CREATE TABLE IF NOT EXISTS wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT UNIQUE NOT NULL,
      publicKey TEXT NOT NULL,
      privateKey TEXT NOT NULL,
      encryptedMnemonic TEXT,
      mnemonicIndex INTEGER,
      name TEXT,
      imported BOOLEAN DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Master Mnemonic table (one per app)
  db.exec(`
    CREATE TABLE IF NOT EXISTS master_mnemonic (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      encryptedMnemonic TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      type TEXT DEFAULT 'string',
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // RPC Endpoints table
  db.exec(`
    CREATE TABLE IF NOT EXISTS rpc_endpoints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT UNIQUE NOT NULL,
      chainId INTEGER,
      isActive BOOLEAN DEFAULT 1,
      isPrimary BOOLEAN DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Transactions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fromAddress TEXT NOT NULL,
      toAddress TEXT NOT NULL,
      amount TEXT NOT NULL,
      gasPrice TEXT,
      gasLimit TEXT,
      nonce INTEGER,
      data TEXT,
      status TEXT DEFAULT 'pending',
      transactionHash TEXT,
      blockNumber INTEGER,
      error TEXT,
      retryCount INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      sentAt DATETIME,
      confirmedAt DATETIME,
      FOREIGN KEY (fromAddress) REFERENCES wallets(address)
    )
  `);

  // Activity Log table
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      status TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('[DB] Database schema created');
}

/**
 * Close database connection
 */
export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    console.log('[DB] Database connection closed');
  }
}
